import { StrictMode, useEffect, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import zhCN from 'antd/locale/zh_CN'
import { ConfigProvider, App as AntApp, Spin, theme } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

import { router } from '@/router'
import { useAppStore } from '@/stores/app'
import '@/styles/index.scss'
import '@/styles/dark-theme.scss'
import '@/styles/element-compat.scss'

import 'nprogress/nprogress.css'

dayjs.locale('zh-cn')

function ThemeRoot({ children }: { children: React.ReactNode }) {
  const appTheme = useAppStore((s) => s.theme)
  useEffect(() => {
    useAppStore.getState().applyTheme()
  }, [appTheme])

  const prefersDark =
    appTheme === 'dark' ||
    (appTheme === 'auto' && typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: prefersDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#409EFF' }
      }}
    >
      <AntApp>
        <Suspense
          fallback={
            <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}>
              <Spin size="large" />
            </div>
          }
        >
          {children}
        </Suspense>
      </AntApp>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <ThemeRoot>
      <RouterProvider router={router} />
    </ThemeRoot>
  </StrictMode>
)

if (import.meta.env.DEV) {
  console.log('TradingAgents-CN 前端已启动 (React)')
}
