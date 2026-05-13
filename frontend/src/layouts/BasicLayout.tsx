import { useEffect, useState } from 'react'
import { FloatButton, Button } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Outlet } from 'react-router-dom'

import AppFooter from '@/components/Layout/AppFooter'
import BreadcrumbNav from '@/components/Layout/Breadcrumb'
import HeaderActions from '@/components/Layout/HeaderActions'
import SidebarMenu from '@/components/Layout/SidebarMenu'
import UserProfile from '@/components/Layout/UserProfile'
import { useAppStore, useActualSidebarWidth } from '@/stores/app'

import './BasicLayout.scss'

function useWindowWidth() {
  const [width, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const onResize = () => setW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return width
}

export default function BasicLayout() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const sidebarW = useActualSidebarWidth()
  const width = useWindowWidth()
  const isMobile = width < 768

  useEffect(() => {
    if (width < 768 && !sidebarCollapsed) {
      setSidebarCollapsed(true)
    }
  }, [width, sidebarCollapsed, setSidebarCollapsed])

  const handleMainClick = () => {
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true)
    }
  }

  return (
    <div className="basic-layout">
      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{ width: sidebarW }}
      >
        <div className="sidebar-header">
          <div className="logo">
            <img src="/logo.svg" alt="TradingAgents-CN" />
            {!sidebarCollapsed && <span className="logo-text">TradingAgents-CN</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          <SidebarMenu />
        </nav>

        <div className="sidebar-footer">
          <UserProfile />
        </div>
      </aside>

      {isMobile && !sidebarCollapsed && (
        <div
          className="sidebar-overlay"
          aria-hidden="true"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <div
        className="main-container"
        style={{ marginLeft: isMobile ? 0 : sidebarW }}
        role="presentation"
        onClick={handleMainClick}
      >
        <header className="header">
          <div className="header-left">
            <Button
              type="text"
              aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
              className="sidebar-toggle"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                toggleSidebar()
              }}
            />
            <BreadcrumbNav />
          </div>

          <div className="header-right">
            <HeaderActions />
          </div>
        </header>

        <main className="main-content">
          <div className="content-wrapper fade-page">
            <Outlet />
          </div>
        </main>

        <footer className="footer">
          <AppFooter />
        </footer>
      </div>

      <FloatButton.BackTop style={{ bottom: 40, right: 40 }} />
    </div>
  )
}
