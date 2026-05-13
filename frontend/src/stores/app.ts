import { create } from 'zustand'

export interface AppRouteInfo {
  pathname: string
  search: string
  title?: string
}

export interface AppState {
  loading: boolean
  loadingProgress: number
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  isOnline: boolean
  apiConnected: boolean
  lastApiCheck: number
  sidebarCollapsed: boolean
  sidebarWidth: number
  currentRoute: AppRouteInfo | null
  preferences: {
    defaultMarket: 'A股' | '美股' | '港股'
    defaultDepth: '1' | '2' | '3' | '4' | '5'
    autoRefresh: boolean
    refreshInterval: number
    showWelcome: boolean
  }
  version: string
  buildTime: string
  apiVersion: string
}

type AppPreferences = AppState['preferences']

const defaultPreferences: AppPreferences = {
  defaultMarket: 'A股',
  defaultDepth: '3',
  autoRefresh: true,
  refreshInterval: 30,
  showWelcome: true
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key)
  if (v === null) return fallback
  return v === 'true'
}

function readNum(key: string, fallback: number): number {
  const v = localStorage.getItem(key)
  if (v === null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isDarkThemeValue(theme: AppState['theme']): boolean {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return theme === 'dark'
}

export interface AppActions {
  setLoading: (loading: boolean, progress?: number) => void
  setLoadingProgress: (progress: number) => void
  toggleTheme: () => void
  setTheme: (theme: AppState['theme']) => void
  applyTheme: () => void
  setLanguage: (language: AppState['language']) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
  setCurrentRoute: (route: AppRouteInfo) => void
  updatePreferences: (preferences: Partial<AppPreferences>) => void
  resetPreferences: () => void
  setOnlineStatus: (isOnline: boolean) => void
  setApiConnected: (connected: boolean) => void
  checkApiConnection: () => Promise<boolean>
  fetchApiVersion: () => Promise<void>
  resetAppState: () => void
}

const initialTheme = (localStorage.getItem('app-theme') as AppState['theme']) || 'auto'
const initialLanguage = (localStorage.getItem('app-language') as AppState['language']) || 'zh-CN'

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  loading: false,
  loadingProgress: 0,
  theme: initialTheme,
  language: initialLanguage,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  apiConnected: false,
  lastApiCheck: 0,
  sidebarCollapsed: readBool('sidebar-collapsed', false),
  sidebarWidth: readNum('sidebar-width', 240),
  currentRoute: null,
  preferences: readJSON<AppPreferences>('user-preferences', defaultPreferences),
  version: '0.1.16',
  buildTime: new Date().toISOString(),
  apiVersion: '',

  setLoading: (loading, progress = 0) => set({ loading, loadingProgress: progress }),
  setLoadingProgress: (progress) =>
    set({ loadingProgress: Math.max(0, Math.min(100, progress)) }),

  toggleTheme: () => {
    const themes: Array<AppState['theme']> = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(get().theme)
    const next = themes[(currentIndex + 1) % themes.length]
    get().setTheme(next)
  },

  setTheme: (theme) => {
    set({ theme })
    localStorage.setItem('app-theme', theme)
    get().applyTheme()
  },

  applyTheme: () => {
    const isDark = isDarkThemeValue(get().theme)
    document.documentElement.classList.toggle('dark', isDark)
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? '#1f2937' : '#409EFF')
    }
  },

  setLanguage: (language) => {
    set({ language })
    document.documentElement.lang = language
    localStorage.setItem('app-language', language)
  },

  toggleSidebar: () => {
    const collapsed = !get().sidebarCollapsed
    set({ sidebarCollapsed: collapsed })
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  },

  setSidebarWidth: (width) => {
    const w = Math.max(200, Math.min(400, width))
    set({ sidebarWidth: w })
    localStorage.setItem('sidebar-width', String(w))
  },

  setCurrentRoute: (route) => set({ currentRoute: route }),

  updatePreferences: (preferences) => {
    const next = { ...get().preferences, ...preferences }
    set({ preferences: next })
    localStorage.setItem('user-preferences', JSON.stringify(next))
  },

  resetPreferences: () => {
    set({ preferences: { ...defaultPreferences } })
  },

  setOnlineStatus: (isOnline) => set({ isOnline }),

  setApiConnected: (connected) => set({ apiConnected: connected, lastApiCheck: Date.now() }),

  checkApiConnection: async () => {
    try {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 3000)
      const response = await fetch('/api/health', { method: 'GET', signal: controller.signal })
      window.clearTimeout(timeoutId)
      const connected = response.ok
      get().setApiConnected(connected)
      return connected
    } catch (error) {
      const err = error as Error
      if (err.name === 'AbortError') {
        console.warn('API连接检查超时')
      } else {
        console.warn('API连接检查失败:', err)
      }
      get().setApiConnected(false)
      return false
    }
  },

  fetchApiVersion: async () => {
    try {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 3000)
      const response = await fetch('/api/health', { signal: controller.signal })
      window.clearTimeout(timeoutId)
      if (response.ok) {
        const data = (await response.json()) as { version?: string }
        set({ apiVersion: data.version || 'unknown' })
        get().setApiConnected(true)
      } else {
        get().setApiConnected(false)
      }
    } catch (error) {
      const err = error as Error
      if (err.name === 'AbortError') {
        console.warn('获取API版本超时')
      } else {
        console.warn('获取API版本失败:', err)
      }
      set({ apiVersion: 'unknown' })
      get().setApiConnected(false)
    }
  },

  resetAppState: () => set({ loading: false, loadingProgress: 0, currentRoute: null })
}))

export function useIsDarkTheme(): boolean {
  const theme = useAppStore((s) => s.theme)
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return theme === 'dark'
}

export function useActualSidebarWidth(): number {
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const width = useAppStore((s) => s.sidebarWidth)
  return collapsed ? 64 : width
}
