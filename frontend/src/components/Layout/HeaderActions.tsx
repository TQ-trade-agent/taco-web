import { Badge, Button, Drawer, Empty, Segmented, Space, Tag } from 'antd'
import {
  BellOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  SunOutlined
} from '@ant-design/icons'
import { useEffect, useState } from 'react'

import { useAppStore, useIsDarkTheme } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

export default function HeaderActions() {
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const isDark = useIsDarkTheme()
  const authToken = useAuthStore((s) => s.token)

  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const items = useNotificationStore((s) => s.items)
  const drawerVisible = useNotificationStore((s) => s.drawerVisible)
  const refreshUnreadCount = useNotificationStore((s) => s.refreshUnreadCount)
  const connect = useNotificationStore((s) => s.connect)
  const disconnect = useNotificationStore((s) => s.disconnect)
  const loadList = useNotificationStore((s) => s.loadList)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const markRead = useNotificationStore((s) => s.markRead)
  const setDrawerVisible = useNotificationStore((s) => s.setDrawerVisible)

  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [fullscreen, setFs] = useState(false)

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    void refreshUnreadCount()
    connect()
    const t = window.setInterval(() => void refreshUnreadCount(), 30000)
    return () => {
      window.clearInterval(t)
      disconnect()
    }
  }, [connect, disconnect, refreshUnreadCount])

  useEffect(() => {
    if (authToken) connect()
  }, [authToken, connect])

  useEffect(() => {
    let listTimer: number | undefined
    if (drawerVisible) {
      void loadList(filter)
      listTimer = window.setInterval(() => void loadList(filter), 60000)
    }
    return () => {
      if (listTimer !== undefined) window.clearInterval(listTimer)
    }
  }, [drawerVisible, filter, loadList])

  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  function typeLabel(t: string) {
    return t === 'analysis' ? '分析' : t === 'alert' ? '预警' : '系统'
  }
  function tagColor(t: string) {
    return t === 'analysis' ? 'success' : t === 'alert' ? 'warning' : 'default'
  }
  function toLocal(iso: string) {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button
        type="text"
        shape="circle"
        icon={isDark ? <SunOutlined /> : <MoonOutlined />}
        aria-label="切换主题"
        onClick={toggleTheme}
      />
      <Button
        type="text"
        shape="circle"
        icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        onClick={toggleFs}
        aria-label="全屏"
      />
      <Badge count={unreadCount}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined />}
          onClick={() => setDrawerVisible(true)}
          aria-label="通知"
        />
      </Badge>
      <Button
        type="text"
        shape="circle"
        icon={<QuestionCircleOutlined />}
        aria-label="帮助"
        onClick={() =>
          window.open('https://mp.weixin.qq.com/s/ppsYiBncynxlsfKFG8uEbw', '_blank')
        }
      />

      <Drawer title="消息中心" open={drawerVisible} onClose={() => setDrawerVisible(false)} width={360}>
        <Space direction="vertical" style={{ width: '100%', marginBottom: 8 }}>
          <Segmented
            value={filter}
            options={[
              { label: '全部', value: 'all' },
              { label: '未读', value: 'unread' }
            ]}
            onChange={(v) => setFilter(v as 'all' | 'unread')}
          />
          <Button type="link" disabled={unreadCount === 0} onClick={() => void markAllRead()}>
            全部已读
          </Button>
        </Space>
        {!items?.length ? (
          <Empty description="暂无通知" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  border: '1px solid var(--el-border-color-lighter)',
                  background: n.status === 'unread' ? 'var(--el-fill-color-light)' : undefined
                }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Tag color={tagColor(n.type)}>{typeLabel(n.type)}</Tag>
                  <span style={{ fontSize: 12, color: '#888' }}>{toLocal(n.created_at)}</span>
                </Space>
                <div
                  role="presentation"
                  style={{ fontWeight: 600, marginTop: 4, cursor: n.link ? 'pointer' : 'default' }}
                  onClick={() => n.link && window.open(n.link, '_blank')}
                >
                  {n.title}
                </div>
                {n.content ? <div style={{ fontSize: 12, marginTop: 4 }}>{n.content}</div> : null}
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type="link"
                    disabled={!n.link}
                    onClick={() => n.link && window.open(n.link, '_blank')}
                  >
                    查看
                  </Button>
                  {n.status === 'unread' ? (
                    <Button type="link" onClick={() => void markRead(n.id)}>
                      标记已读
                    </Button>
                  ) : null}
                </Space>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  )
}
