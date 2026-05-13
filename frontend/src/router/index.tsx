import { lazy, Suspense, useEffect, useState } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  useMatches,
  useNavigate,
  useParams
} from 'react-router-dom'
import axios from 'axios'
import NProgress from 'nprogress'

import BasicLayout from '@/layouts/BasicLayout'
import ConfigWizard from '@/components/ConfigWizard'
import NetworkStatus from '@/components/NetworkStatus'
import { configApi } from '@/api/config'
import { message } from 'antd'
import { setAppNavigate } from '@/lib/navigate'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { setupTokenRefreshTimer } from '@/utils/auth'

NProgress.configure({ showSpinner: false, minimum: 0.2, easing: 'ease', speed: 500 })

function RouteProgressAndTitle() {
  const location = useLocation()
  const matches = useMatches()
  const leaf = matches[matches.length - 1]
  const leafId = leaf?.id ?? ''
  const title = (leaf?.handle as { title?: string } | undefined)?.title

  useEffect(() => {
    NProgress.done()
    document.title = title ? `${title} - TradingAgents-CN` : 'TradingAgents-CN'

    useAppStore.getState().setCurrentRoute({
      pathname: location.pathname,
      search: location.search,
      title
    })
  }, [location.pathname, location.search, leafId, title])

  useEffect(() => {
    NProgress.start()
    const id = window.setTimeout(() => NProgress.done(), 480)
    return () => window.clearTimeout(id)
  }, [location.pathname, location.search])

  return null
}

function NavigateBinder() {
  const navigate = useNavigate()
  useEffect(() => {
    setAppNavigate(navigate)
  }, [navigate])
  return null
}

function MetaAuthOutlet() {
  const matches = useMatches()
  const leaf = matches[matches.length - 1]
  const requiresAuth =
    ((leaf?.handle as { requiresAuth?: boolean } | undefined)?.requiresAuth ?? true) === true

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  const setRedirectPath = useAuthStore((s) => s.setRedirectPath)

  if (requiresAuth && !isAuthenticated) {
    const full = `${location.pathname}${location.search}`
    setRedirectPath(full === '/' ? '/dashboard' : full)
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

/** Vue: `/paper/:name.md` → `/learning/article/:name` */
function PaperMarkdownRedirect() {
  const { '*': splat } = useParams()
  const slug = (splat ?? '').replace(/\.md$/i, '')
  return <Navigate to={`/learning/article/${slug}`} replace />
}

function suspense(el: JSX.Element) {
  return <Suspense fallback={<div style={{ padding: 48 }}>加载中...</div>}>{el}</Suspense>
}

const LoginPage = lazy(() => import('@/views/Auth/Login'))
const AboutPage = lazy(() => import('@/views/About/index'))

const DashboardPage = lazy(() => import('@/views/Dashboard/index'))
const SingleAnalysisPage = lazy(() => import('@/views/Analysis/SingleAnalysis'))
const BatchAnalysisPage = lazy(() => import('@/views/Analysis/BatchAnalysis'))
const ScreeningPage = lazy(() => import('@/views/Screening/index'))
const FavoritesPage = lazy(() => import('@/views/Favorites/index'))
const LearningHome = lazy(() => import('@/views/Learning/index'))
const LearningCategory = lazy(() => import('@/views/Learning/Category'))
const LearningArticle = lazy(() => import('@/views/Learning/Article'))
const StockDetail = lazy(() => import('@/views/Stocks/Detail'))
const TaskCenter = lazy(() => import('@/views/Tasks/TaskCenter'))
const ReportsHome = lazy(() => import('@/views/Reports/index'))
const ReportDetail = lazy(() => import('@/views/Reports/ReportDetail'))
const TokenStatistics = lazy(() => import('@/views/Reports/TokenStatistics'))

const SettingsHome = lazy(() => import('@/views/Settings/index'))
const ConfigManagement = lazy(() => import('@/views/Settings/ConfigManagement'))
const CacheManagement = lazy(() => import('@/views/Settings/CacheManagement'))
const UsageStatistics = lazy(() => import('@/views/Settings/UsageStatistics'))

const DatabaseManagement = lazy(() => import('@/views/System/DatabaseManagement'))
const OperationLogs = lazy(() => import('@/views/System/OperationLogs'))
const LogManagement = lazy(() => import('@/views/System/LogManagement'))
const MultiSourceSync = lazy(() => import('@/views/System/MultiSourceSync'))
const SchedulerManagement = lazy(() => import('@/views/System/SchedulerManagement'))

const PaperTrading = lazy(() => import('@/views/PaperTrading/index'))
const NotFound = lazy(() => import('@/views/Error/404'))

function AppBoot() {
  useEffect(() => {
    const appStore = useAppStore.getState()
    console.log('初始化应用状态...')
    appStore.applyTheme()

    const onOnline = () => {
      console.log('网络已连接')
      appStore.setOnlineStatus(true)
      void appStore.checkApiConnection()
    }
    const onOffline = () => {
      console.log('网络已断开')
      appStore.setOnlineStatus(false)
      appStore.setApiConnected(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    let cancelled = false
    ;(async () => {
      console.log('检查API连接...')
      const ok = await appStore.checkApiConnection()
      if (cancelled) return

      if (ok) {
        try {
          await Promise.race([
            useAuthStore.getState().checkAuthStatus(),
            new Promise((_, rej) =>
              window.setTimeout(() => rej(new Error('认证检查超时')), 5000)
            )
          ])
          if (useAuthStore.getState().isAuthenticated) {
            setupTokenRefreshTimer()
          }
        } catch (e) {
          console.warn('⚠️ 认证检查跳过:', e)
        }
      } else {
        console.log('API连接失败，跳过认证检查')
      }
    })()

    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return null
}

function WizardHost() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function checkFirst() {
      try {
        const done = localStorage.getItem('config_wizard_completed')
        if (done === 'true') return

        const response = await axios.get('/api/system/config/validate')
        if (!response.data?.success) return

        const result = response.data.data
        if (!result.success && result.missing_required?.length > 0) {
          window.setTimeout(() => setOpen(true), 1000)
        }
      } catch (e) {
        console.error('检查配置失败:', e)
      }
    }
    void checkFirst()
  }, [])

  const handleComplete = async (data: any) => {
    try {
      if (data.llm?.provider && data.llm?.apiKey) {
        try {
          const providerMap: Record<string, { name: string; base_url?: string }> = {
            deepseek: { name: 'DeepSeek', base_url: 'https://api.deepseek.com' },
            dashscope: { name: '通义千问', base_url: 'https://dashscope.aliyuncs.com/api/v1' },
            openai: { name: 'OpenAI', base_url: 'https://api.openai.com/v1' },
            google: { name: 'Google Gemini', base_url: 'https://generativelanguage.googleapis.com/v1' }
          }

          const providerInfo = providerMap[data.llm.provider]

          if (providerInfo) {
            try {
              await configApi.addLLMProvider({
                id: data.llm.provider,
                name: data.llm.provider,
                display_name: providerInfo.name,
                default_base_url: providerInfo.base_url,
                is_active: true,
                supported_features: ['chat', 'completion']
              })
            } catch {
              console.log('厂家可能已存在')
            }

            if (data.llm.modelName) {
              await configApi.updateLLMConfig({
                provider: data.llm.provider,
                model_name: data.llm.modelName,
                enabled: true
              })
              await configApi.setDefaultLLM(data.llm.modelName)
            }
          }
        } catch {
          message.warning('大模型配置保存失败，请稍后在配置管理中手动配置')
        }
      }

      if (data.datasource?.type) {
        try {
          const dsConfig: Record<string, unknown> = {
            name: data.datasource.type,
            type: data.datasource.type,
            enabled: true
          }
          if (data.datasource.type === 'tushare' && data.datasource.token) {
            dsConfig.api_key = data.datasource.token
          }
          if (data.datasource.type === 'finnhub' && data.datasource.apiKey) {
            dsConfig.api_key = data.datasource.apiKey
          }
          await configApi.addDataSourceConfig(dsConfig as any)
          await configApi.setDefaultDataSource(data.datasource.type)
        } catch {
          message.warning('数据源配置保存失败，请稍后在配置管理中手动配置')
        }
      }

      localStorage.setItem('config_wizard_completed', 'true')
      message.success({ content: '配置完成！欢迎使用 TradingAgents-CN', duration: 3 })
    } catch (e) {
      console.error(e)
      message.error('保存配置失败，请稍后重试')
    }
  }

  return <ConfigWizard open={open} onOpenChange={setOpen} onComplete={handleComplete} />
}

function RootOutlet() {
  return (
    <>
      <AppBoot />
      <NavigateBinder />
      <RouteProgressAndTitle />
      <NetworkStatus />
      <Outlet />
      <WizardHost />
    </>
  )
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootOutlet />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },

        /**
         * 兼容旧路由：将 `/paper/foo.md` 作为 splat：`paper/*.md`
         * RR6 中用 `paper/*`，splat = `foo.md`
         */
        { path: 'paper/*', element: <PaperMarkdownRedirect /> },
        { path: 'queue', element: <Navigate to="/tasks" replace /> },
        { path: 'analysis/history', element: <Navigate to="/tasks?tab=completed" replace /> },

        { path: 'login', handle: {}, element: suspense(<LoginPage />) },

        {
          path: 'about',
          handle: { title: '关于', requiresAuth: false },
          element: suspense(<AboutPage />)
        },

        {
          path: 'dashboard',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '仪表板', requiresAuth: true },
                  element: suspense(<DashboardPage />)
                }
              ]
            }
          ]
        },

        {
          path: 'analysis',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                { index: true, element: <Navigate to="single" replace /> },
                {
                  path: 'single',
                  handle: { title: '单股分析', requiresAuth: true },
                  element: suspense(<SingleAnalysisPage />)
                },
                {
                  path: 'batch',
                  handle: { title: '批量分析', requiresAuth: true },
                  element: suspense(<BatchAnalysisPage />)
                }
              ]
            }
          ]
        },

        {
          path: 'screening',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '股票筛选', requiresAuth: true },
                  element: suspense(<ScreeningPage />)
                }
              ]
            }
          ]
        },

        {
          path: 'favorites',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '我的自选股', requiresAuth: true },
                  element: suspense(<FavoritesPage />)
                }
              ]
            }
          ]
        },

        {
          path: 'learning',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '学习中心', requiresAuth: false },
                  element: suspense(<LearningHome />)
                },
                {
                  path: ':category',
                  handle: { title: '学习分类', requiresAuth: false },
                  element: suspense(<LearningCategory />)
                },
                {
                  path: 'article/:id',
                  handle: { title: '文章详情', requiresAuth: false },
                  element: suspense(<LearningArticle />)
                }
              ]
            }
          ]
        },

        {
          path: 'stocks',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  path: ':code',
                  handle: { title: '股票详情', requiresAuth: true },
                  element: suspense(<StockDetail />)
                }
              ]
            }
          ]
        },

        {
          path: 'tasks',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '任务中心', requiresAuth: true },
                  element: suspense(<TaskCenter />)
                }
              ]
            }
          ]
        },

        {
          path: 'reports',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '分析报告', requiresAuth: true },
                  element: suspense(<ReportsHome />)
                },
                {
                  path: 'view/:id',
                  handle: { title: '报告详情', requiresAuth: true },
                  element: suspense(<ReportDetail />)
                },
                {
                  path: 'token',
                  handle: { title: 'Token统计', requiresAuth: true },
                  element: suspense(<TokenStatistics />)
                }
              ]
            }
          ]
        },

        {
          path: 'settings',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '设置', requiresAuth: true },
                  element: suspense(<SettingsHome />)
                },
                {
                  path: 'config',
                  handle: { title: '配置管理', requiresAuth: true },
                  element: suspense(<ConfigManagement />)
                },
                {
                  path: 'database',
                  handle: { title: '数据库管理', requiresAuth: true },
                  element: suspense(<DatabaseManagement />)
                },
                {
                  path: 'logs',
                  handle: { title: '操作日志', requiresAuth: true },
                  element: suspense(<OperationLogs />)
                },
                {
                  path: 'system-logs',
                  handle: { title: '系统日志', requiresAuth: true },
                  element: suspense(<LogManagement />)
                },
                {
                  path: 'sync',
                  handle: { title: '多数据源同步', requiresAuth: true },
                  element: suspense(<MultiSourceSync />)
                },
                {
                  path: 'cache',
                  handle: { title: '缓存管理', requiresAuth: true },
                  element: suspense(<CacheManagement />)
                },
                {
                  path: 'usage',
                  handle: { title: '使用统计', requiresAuth: true },
                  element: suspense(<UsageStatistics />)
                },
                {
                  path: 'scheduler',
                  handle: { title: '定时任务', requiresAuth: true },
                  element: suspense(<SchedulerManagement />)
                }
              ]
            }
          ]
        },

        {
          path: 'paper',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '模拟交易', requiresAuth: true },
                  element: suspense(<PaperTrading />)
                }
              ]
            }
          ]
        },

        {
          path: '*',
          element: <BasicLayout />,
          children: [
            {
              path: '',
              element: <MetaAuthOutlet />,
              children: [
                {
                  index: true,
                  handle: { title: '页面不存在', requiresAuth: true },
                  element: suspense(<NotFound />)
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  { basename: import.meta.env.BASE_URL }
)
