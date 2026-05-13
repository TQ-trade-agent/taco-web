import { create } from 'zustand'

import { notificationsApi, type NotificationItem } from '@/api/notifications'
import { useAuthStore } from '@/stores/auth'

export interface NotificationState {
  items: NotificationItem[]
  unreadCount: number
  loading: boolean
  drawerVisible: boolean
  wsConnected: boolean
}

export interface NotificationActions {
  refreshUnreadCount: () => Promise<void>
  loadList: (status?: 'unread' | 'all') => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  addNotification: (
    n: Omit<NotificationItem, 'id' | 'status' | 'created_at'> & {
      id?: string
      created_at?: string
      status?: 'unread' | 'read'
    }
  ) => void
  connect: () => void
  disconnect: () => void
  connectWebSocket: () => void
  disconnectWebSocket: () => void
  setDrawerVisible: (v: boolean) => void
}

let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null
let wsReconnectAttempts = 0
const maxReconnectAttempts = 10
let socketRef: WebSocket | null = null

function getToken(): string {
  return useAuthStore.getState().token || localStorage.getItem('auth-token') || ''
}

function handleWebSocketMessage(msg: { type?: string; data?: unknown }, actions: NotificationActions) {
  console.log('[WS] 收到消息:', msg)

  switch (msg.type) {
    case 'connected':
      console.log('[WS] 连接确认:', msg.data)
      break
    case 'notification': {
      const d = msg.data as NotificationItem | undefined
      if (d && d.title && d.type) {
        actions.addNotification({
          id: d.id as string | undefined,
          title: d.title,
          content: d.content,
          type: d.type,
          link: d.link,
          source: d.source,
          created_at: d.created_at as string | undefined,
          status: (d.status as 'unread' | 'read') || 'unread'
        })
      }
      break
    }
    case 'heartbeat':
      break
    default:
      console.warn('[WS] 未知消息类型:', msg.type)
  }
}

export const useNotificationStore = create<NotificationState & NotificationActions>((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  drawerVisible: false,
  wsConnected: false,

  refreshUnreadCount: async () => {
    try {
      const res = await notificationsApi.getUnreadCount()
      set({ unreadCount: res?.data?.count ?? 0 })
    } catch {
      /* noop */
    }
  },

  loadList: async (status = 'all') => {
    set({ loading: true })
    try {
      const res = await notificationsApi.getList({ status, page: 1, page_size: 20 })
      set({ items: res?.data?.items ?? [] })
    } catch {
      set({ items: [] })
    } finally {
      set({ loading: false })
    }
  },

  markRead: async (id) => {
    await notificationsApi.markRead(id)
    const items = get().items.map((x) => (x.id === id ? { ...x, status: 'read' as const } : x))
    let unread = get().unreadCount
    if (unread > 0) unread -= 1
    set({ items, unreadCount: Math.max(0, unread) })
  },

  markAllRead: async () => {
    await notificationsApi.markAllRead()
    set({
      items: get().items.map((x) => ({ ...x, status: 'read' as const })),
      unreadCount: 0
    })
  },

  addNotification: (n) => {
    const id = n.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const created_at = n.created_at || new Date().toISOString()
    const item: NotificationItem = {
      id,
      title: n.title,
      content: n.content,
      type: n.type,
      status: n.status ?? 'unread',
      created_at,
      link: n.link,
      source: n.source
    }
    set((s) => ({
      items: [item, ...s.items],
      unreadCount: item.status === 'unread' ? s.unreadCount + 1 : s.unreadCount
    }))
  },

  connectWebSocket: () => {
    try {
      if (socketRef) {
        try {
          socketRef.close()
        } catch {
          /* noop */
        }
        socketRef = null
      }
      if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer)
        wsReconnectTimer = null
      }

      const token = getToken()
      if (!token) {
        console.warn('[WS] 未找到 token，无法连接 WebSocket')
        return
      }

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${wsProtocol}//${host}/api/ws/notifications?token=${encodeURIComponent(token)}`

      console.log('[WS] 连接到:', wsUrl)

      const socket = new WebSocket(wsUrl)
      socketRef = socket

      socket.onopen = () => {
        console.log('[WS] 连接成功')
        set({ wsConnected: true })
        wsReconnectAttempts = 0
      }

      socket.onclose = (event) => {
        console.log('[WS] 连接关闭:', event.code, event.reason)
        set({ wsConnected: false })
        socketRef = null

        if (wsReconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000)
          console.log(`[WS] ${delay}ms 后重连 (尝试 ${wsReconnectAttempts + 1}/${maxReconnectAttempts})`)
          wsReconnectTimer = setTimeout(() => {
            wsReconnectAttempts += 1
            get().connectWebSocket()
          }, delay)
        } else {
          console.error('[WS] 达到最大重连次数，停止重连')
        }
      }

      socket.onerror = (error) => {
        console.error('[WS] 连接错误:', error)
        set({ wsConnected: false })
      }

      socket.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data) as { type?: string; data?: NotificationItem }
          handleWebSocketMessage(messageData, get())
        } catch (error) {
          console.error('[WS] 解析消息失败:', error)
        }
      }
    } catch (error) {
      console.error('[WS] 连接失败:', error)
      set({ wsConnected: false })
    }
  },

  disconnectWebSocket: () => {
    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer)
      wsReconnectTimer = null
    }
    if (socketRef) {
      try {
        socketRef.close()
      } catch {
        /* noop */
      }
      socketRef = null
    }
    set({ wsConnected: false })
    wsReconnectAttempts = 0
  },

  connect: () => {
    console.log('[Notifications] 开始连接...')
    get().connectWebSocket()
  },

  disconnect: () => {
    console.log('[Notifications] 断开连接...')
    get().disconnectWebSocket()
  },

  setDrawerVisible: (v) => set({ drawerVisible: v })
}))
