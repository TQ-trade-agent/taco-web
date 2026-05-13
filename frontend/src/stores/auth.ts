import { create } from 'zustand'
import { message } from 'antd'

import { authApi } from '@/api/auth'
import type { User, LoginForm, RegisterForm } from '@/types/auth'
import { appNavigate } from '@/lib/navigate'
import { useAppStore } from '@/stores/app'

export interface AuthState {
  isAuthenticated: boolean
  token: string | null
  refreshToken: string | null
  user: User | null
  permissions: string[]
  roles: string[]
  loginLoading: boolean
  redirectPath: string
}

function isValidToken(token: string | null): boolean {
  if (!token || typeof token !== 'string') return false
  if (token === 'mock-token' || token.startsWith('mock-')) {
    console.warn('⚠️ 检测到mock token，将被清除:', token)
    return false
  }
  return token.split('.').length === 3
}

function readUserFromStorage(validToken: string | null): User | null {
  if (!validToken) return null
  try {
    const raw = localStorage.getItem('user-info')
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function createInitialAuth(): AuthState {
  const token = localStorage.getItem('auth-token')
  const refreshToken = localStorage.getItem('refresh-token')

  const validToken = isValidToken(token) ? token : null
  const validRefreshToken = isValidToken(refreshToken) ? refreshToken : null

  if (!validToken || !validRefreshToken) {
    console.log('🧹 清除无效的认证信息')
    localStorage.removeItem('auth-token')
    localStorage.removeItem('refresh-token')
    localStorage.removeItem('user-info')
  }

  return {
    isAuthenticated: !!validToken,
    token: validToken,
    refreshToken: validRefreshToken,
    user: readUserFromStorage(validToken),
    permissions: [],
    roles: [],
    loginLoading: false,
    redirectPath: '/'
  }
}

type ThemePref = 'light' | 'dark' | 'auto'

function applyUserPrefs(user: User | null) {
  if (!user?.preferences) return
  const appStore = useAppStore.getState()
  const prefs = user.preferences

  if (prefs.ui_theme) {
    appStore.setTheme(prefs.ui_theme as ThemePref)
  }

  if (prefs.sidebar_width) {
    appStore.setSidebarWidth(Number(prefs.sidebar_width))
  }

  if (prefs.language) {
    appStore.setLanguage(prefs.language as 'zh-CN' | 'en-US')
  }

  if (
    prefs.default_market ||
    prefs.default_depth ||
    prefs.auto_refresh !== undefined ||
    prefs.refresh_interval
  ) {
    appStore.updatePreferences({
      defaultMarket: prefs.default_market as 'A股' | '美股' | '港股',
      defaultDepth: prefs.default_depth as '1' | '2' | '3' | '4' | '5',
      autoRefresh: prefs.auto_refresh,
      refreshInterval: prefs.refresh_interval
    })
  }

  console.log('✅ 用户偏好设置已同步到 appStore')
}

export interface AuthActions {
  setAuthInfo: (token: string, refreshToken?: string, user?: User) => void
  clearAuthInfo: () => void
  redirectToLogin: () => void
  setAuthHeader: (_token: string | null) => void
  login: (loginForm: LoginForm) => Promise<boolean>
  register: (registerForm: RegisterForm) => Promise<boolean>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<boolean>
  fetchUserInfo: () => Promise<boolean>
  fetchUserPermissions: () => Promise<boolean>
  updateUserInfo: (userInfo: Partial<User>) => Promise<boolean>
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  setRedirectPath: (path: string) => void
  getAndClearRedirectPath: () => string
  checkAuthStatus: () => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...createInitialAuth(),

  setAuthInfo: (token, refreshToken, user) => {
    set({
      token,
      isAuthenticated: true,
      refreshToken: refreshToken ?? get().refreshToken,
      user: user ?? get().user
    })

    localStorage.setItem('auth-token', token)
    if (refreshToken) localStorage.setItem('refresh-token', refreshToken)
    if (user) localStorage.setItem('user-info', JSON.stringify(user))

    console.log('✅ 认证信息已保存:', {
      token: token ? '已设置' : '未设置',
      refreshToken: refreshToken ? '已设置' : '未设置',
      user: user ? user.username : '未设置'
    })
  },

  clearAuthInfo: () => {
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      permissions: [],
      roles: []
    })
    localStorage.removeItem('auth-token')
    localStorage.removeItem('refresh-token')
    localStorage.removeItem('user-info')
  },

    redirectToLogin: () => {
      if (typeof window === 'undefined') return
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        console.log('🔄 跳转到登录页...')
        appNavigate('/login')
      }
    },

  setAuthHeader: () => {
    /* axios 在 request 中设置 */
  },

  login: async (loginForm) => {
    if (get().loginLoading) {
      console.log('⏭️ 登录请求进行中，跳过重复调用')
      return false
    }

    try {
      set({ loginLoading: true })

      const response = await authApi.login(loginForm)

      if (response.success) {
        const { access_token, refresh_token, user } = response.data
        get().setAuthInfo(access_token, refresh_token, user)
        set({ permissions: ['*'], roles: ['admin'] })
        applyUserPrefs(user)

        const { setupTokenRefreshTimer } = await import('@/utils/auth')
        setupTokenRefreshTimer()

        return true
      }
      return false
    } catch (error) {
      console.error('登录失败:', error)
      return false
    } finally {
      set({ loginLoading: false })
    }
  },

  register: async (registerForm) => {
    try {
      const response = await authApi.register(registerForm)

      if (response.success) {
        message.success('注册成功，请登录')
        return true
      }
      message.error(response.message || '注册失败')
      return false
    } catch (error: unknown) {
      console.error('注册失败:', error)
      const err = error as { message?: string }
      message.error(err.message || '注册失败，请重试')
      return false
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('登出API调用失败:', error)
    } finally {
      get().clearAuthInfo()
      console.log('✅ 用户已登出，认证信息已清除')
      appNavigate('/login')
    }
  },

  refreshAccessToken: async () => {
    try {
      console.log('🔄 开始刷新Token...')

      const rt = get().refreshToken

      if (!rt) {
        console.warn('❌ 没有refresh token，无法刷新')
        throw new Error('没有刷新令牌')
      }

      console.log('📝 Refresh token信息:', {
        length: rt.length,
        prefix: rt.substring(0, 10),
        isValid: rt.split('.').length === 3
      })

      if (rt.split('.').length !== 3) {
        console.error('❌ Refresh token格式无效')
        throw new Error('Refresh token格式无效')
      }

      const response = await authApi.refreshToken(rt)
      console.log('📨 刷新响应:', response)

      if (response.success) {
        const { access_token, refresh_token } = response.data
        console.log('✅ Token刷新成功')
        get().setAuthInfo(access_token, refresh_token)
        return true
      }

      console.error('❌ Token刷新失败:', response.message)
      throw new Error(response.message || 'Token刷新失败')
    } catch (error: unknown) {
      console.error('❌ Token刷新异常:', error)
      const err = error as { code?: string; response?: { status?: number } }

      if (err.code === 'NETWORK_ERROR' || (err.response?.status && err.response.status >= 500)) {
        console.warn('⚠️ 网络或服务器错误，保留认证信息')
        return false
      }

      console.log('🧹 清除认证信息并跳转登录')
      get().clearAuthInfo()
      get().redirectToLogin()
      return false
    }
  },

  fetchUserInfo: async () => {
    try {
      console.log('📡 正在获取用户信息...')
      const response = await authApi.getUserInfo()

      if (response.success) {
        set({ user: response.data })
        console.log('✅ 用户信息获取成功:', response.data?.username)
        applyUserPrefs(response.data)
        return true
      }
      console.warn('⚠️ 获取用户信息失败:', response.message)
      throw new Error(response.message || '获取用户信息失败')
    } catch (error) {
      console.error('❌ 获取用户信息失败:', error)
      throw error
    }
  },

  fetchUserPermissions: async () => {
    set({ permissions: ['*'], roles: ['admin'] })
    return true
  },

  updateUserInfo: async (userInfo) => {
    try {
      const response = await authApi.updateUserInfo(userInfo)

      if (response.success) {
        set({ user: { ...get().user!, ...response.data } })
        localStorage.setItem('user-info', JSON.stringify(get().user))
        applyUserPrefs(get().user)
        message.success('用户信息更新成功')
        return true
      }
      message.error(response.message || '更新失败')
      return false
    } catch (error: unknown) {
      console.error('更新用户信息失败:', error)
      const err = error as { message?: string }
      message.error(err.message || '更新失败，请重试')
      return false
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: newPassword
      })

      if (response.success) {
        message.success('密码修改成功')
        return true
      }
      message.error(response.message || '密码修改失败')
      return false
    } catch (error: unknown) {
      console.error('修改密码失败:', error)
      const err = error as { message?: string }
      message.error(err.message || '修改密码失败，请重试')
      return false
    }
  },

  setRedirectPath: (path) => set({ redirectPath: path }),

  getAndClearRedirectPath: () => {
    const path = get().redirectPath || '/dashboard'
    set({ redirectPath: '/dashboard' })
    return path
  },

  checkAuthStatus: async () => {
    const token = get().token

    if (token) {
      try {
        console.log('🔍 检查token有效性...')
        const valid = await get().fetchUserInfo()
        if (valid) {
          set({ isAuthenticated: true })
          await get().fetchUserPermissions()
          console.log('✅ 认证状态验证成功')
        } else {
          console.log('🔄 Token无效，尝试刷新...')
          await get().refreshAccessToken()
        }
      } catch (error) {
        const err = error as { code?: string; message?: string }
        console.error('❌ 检查认证状态失败:', err)
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          console.warn('⚠️ 网络超时，保留认证信息但标记为未认证状态')
          set({ isAuthenticated: false })
        } else {
          get().clearAuthInfo()
          get().redirectToLogin()
        }
      }
    } else {
      console.log('📝 没有token，跳过认证检查')
    }
  }
}))

export function useAuthUserDisplayName(): string {
  const user = useAuthStore((s) => s.user)
  return user?.username || user?.email || '未知用户'
}

export function useAuthIsAdmin(): boolean {
  const roles = useAuthStore((s) => s.roles)
  return roles.includes('admin')
}
