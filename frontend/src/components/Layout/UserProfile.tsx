import { Avatar, Dropdown, type MenuProps } from 'antd'
import { SettingOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

export default function UserProfile() {
  const navigate = useNavigate()
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const items: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings')
    },
    { type: 'divider' },
    {
      key: 'logout',
      danger: true,
      label: '退出登录',
      onClick: async () => {
        await logout()
        navigate('/login')
      }
    }
  ]

  return (
    <div
      style={{
        padding: collapsed ? 8 : 12,
        textAlign: collapsed ? 'center' : 'initial'
      }}
    >
      <Dropdown menu={{ items }} trigger={['click']}>
        <div
          role="presentation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            padding: 8,
            borderRadius: 6,
            justifyContent: collapsed ? 'center' : undefined
          }}
        >
          <Avatar size={32} src={user?.avatar} icon={<UserOutlined />} />
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {user?.username || '未登录'}
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>{user ? '用户' : '未登录'}</div>
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  )
}
