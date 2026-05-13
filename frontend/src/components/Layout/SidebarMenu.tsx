import { useEffect, useMemo } from 'react'
import { Menu, type MenuProps } from 'antd'
import {
  BookOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAppStore } from '@/stores/app'

type Item = Required<MenuProps>['items'][number]

const menuKeys = [
  '/dashboard',
  '/learning',
  '/analysis/single',
  '/analysis/batch',
  '/reports',
  '/tasks',
  '/screening',
  '/favorites',
  '/paper',
  '/settings',
  '/settings/config',
  '/settings/cache',
  '/settings/database',
  '/settings/logs',
  '/settings/system-logs',
  '/settings/sync',
  '/settings/scheduler',
  '/settings/usage',
  '/settings?tab=appearance',
  '/settings?tab=analysis',
  '/settings?tab=notifications',
  '/settings?tab=security',
  '/about'
]

export default function SidebarMenu() {
  const navigate = useNavigate()
  const location = useLocation()
  const collapsed = useAppStore((s) => s.sidebarCollapsed)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      useAppStore.getState().setSidebarCollapsed(true)
    }
  }, [location.pathname, location.search])

  const selectedKeys = useMemo(() => {
    const base = `${location.pathname}${location.search}`
    const p = location.pathname

    const candidates = [base, p, p === '/' ? '/dashboard' : p]
    if (p.startsWith('/settings')) candidates.push(`/settings`)

    return [candidates.find((x) => menuKeys.includes(x)) || p || '/dashboard']
  }, [location.pathname, location.search])

  const items: Item[] = useMemo(
    () => [
      { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表板' },
      { key: '/learning', icon: <BookOutlined />, label: '学习中心' },
      {
        key: 'sub-analysis',
        icon: <LineChartOutlined />,
        label: '股票分析',
        children: [
          { key: '/analysis/single', label: '单股分析' },
          { key: '/analysis/batch', label: '批量分析' },
          { key: '/reports', label: '分析报告' }
        ]
      },
      { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务中心' },
      { key: '/screening', icon: <SearchOutlined />, label: '股票筛选' },
      { key: '/favorites', icon: <StarOutlined />, label: '我的自选股' },
      { key: '/paper', icon: <CreditCardOutlined />, label: '模拟交易' },
      {
        key: 'sub-settings',
        icon: <SettingOutlined />,
        label: '设置',
        children: [
          {
            key: 'sub-settings-personal',
            label: '个人设置',
            children: [
              { key: '/settings', label: '通用设置' },
              { key: '/settings?tab=appearance', label: '外观设置' },
              { key: '/settings?tab=analysis', label: '分析偏好' },
              { key: '/settings?tab=notifications', label: '通知设置' },
              { key: '/settings?tab=security', label: '安全设置' }
            ]
          },
          {
            key: 'sub-settings-config',
            label: '系统配置',
            children: [
              { key: '/settings/config', label: '配置管理' },
              { key: '/settings/cache', label: '缓存管理' }
            ]
          },
          {
            key: 'sub-settings-admin',
            label: '系统管理',
            children: [
              { key: '/settings/database', label: '数据库管理' },
              { key: '/settings/logs', label: '操作日志' },
              { key: '/settings/system-logs', label: '系统日志' },
              { key: '/settings/sync', label: '多数据源同步' },
              { key: '/settings/scheduler', label: '定时任务' },
              { key: '/settings/usage', label: '使用统计' }
            ]
          }
        ]
      },
      { key: '/about', icon: <InfoCircleOutlined />, label: '关于' }
    ],
    []
  )

  const onClick: MenuProps['onClick'] = (e) => {
    navigate(e.key)
  }

  return (
    <Menu
      theme="light"
      mode="inline"
      inlineCollapsed={collapsed}
      selectedKeys={selectedKeys}
      defaultOpenKeys={['sub-analysis', 'sub-settings', 'sub-settings-personal']}
      items={items}
      onClick={onClick}
      style={{
        border: 'none',
        background: 'transparent',
        flex: 1,
        minHeight: 0
      }}
      className="sidebar-menu-ant"
    />
  )
}
