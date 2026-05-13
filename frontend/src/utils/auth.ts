/**
 * 认证工具函数
 * 统一处理认证相关的逻辑
 */

import { message as antdMessage } from 'antd'

import { useAuthStore } from '@/stores/auth'
import { appNavigate } from '@/lib/navigate'

/**
 * 检查是否是认证错误
 */
export const isAuthError = (error: any): boolean => {
  if (!error) return false

  // 检查 HTTP 状态码
  if (error.response?.status === 401) {
    return true
  }

  // 检查业务错误码
  const code = error.code || error.response?.data?.code
  if (code === 401 || code === 40101 || code === 40102 || code === 40103) {
    return true
  }

  // 检查错误消息
  const message = error.message || error.response?.data?.message || ''
  const authKeywords = [
    '认证失败',
    '登录已过期',
    '未授权',
    'unauthorized',
    'token',
    'Token',
    'TOKEN',
    '请重新登录'
  ]

  return authKeywords.some(keyword => message.includes(keyword))
}

/**
 * 处理认证错误
 * 清除认证信息并跳转到登录页
 */
export const handleAuthError = (error?: any, showMessage = true): void => {
  console.log('🔒 处理认证错误:', error)

  const authStore = useAuthStore()

  // 清除认证信息
  authStore.clearAuthInfo()

  // 显示错误消息
  if (showMessage) {
    const text = error?.message || error?.response?.data?.message || '登录已过期，请重新登录'
    antdMessage.error(text)
  }

  const currentPath = `${window.location.pathname}${window.location.search}`
  if (currentPath !== '/login') {
    authStore.setRedirectPath(currentPath)
    appNavigate('/login')
  }
}

/**
 * 检查 token 是否有效
 */
export const isTokenValid = (token: string | null): boolean => {
  if (!token || typeof token !== 'string') {
    return false
  }

  // 检查是否是 mock token
  if (token === 'mock-token' || token.startsWith('mock-')) {
    console.warn('⚠️ 检测到 mock token')
    return false
  }

  // JWT token 应该有 3 个部分，用 . 分隔
  const parts = token.split('.')
  if (parts.length !== 3) {
    console.warn('⚠️ Token 格式无效')
    return false
  }

  // 尝试解析 token payload
  try {
    const payload = JSON.parse(atob(parts[1]))
    
    // 检查是否过期
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp < now) {
        console.warn('⚠️ Token 已过期')
        return false
      }
    }

    return true
  } catch (error) {
    console.warn('⚠️ Token 解析失败:', error)
    return false
  }
}

/**
 * 从 token 中提取用户信息
 */
export const parseToken = (token: string): any => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (error) {
    console.error('❌ Token 解析失败:', error)
    return null
  }
}

/**
 * 获取 token 剩余有效时间（秒）
 */
export const getTokenRemainingTime = (token: string): number => {
  const payload = parseToken(token)
  if (!payload || !payload.exp) {
    return 0
  }

  const now = Math.floor(Date.now() / 1000)
  const remaining = payload.exp - now

  return Math.max(0, remaining)
}

/**
 * 检查 token 是否即将过期（默认 5 分钟）
 */
export const isTokenExpiringSoon = (token: string, thresholdSeconds = 300): boolean => {
  const remaining = getTokenRemainingTime(token)
  return remaining > 0 && remaining < thresholdSeconds
}

/**
 * 自动刷新 token（如果即将过期）
 */
export const autoRefreshToken = async (): Promise<boolean> => {
  const authStore = useAuthStore()

  if (!authStore.token) {
    return false
  }

  // 检查 token 是否即将过期
  if (isTokenExpiringSoon(authStore.token)) {
    console.log('🔄 Token 即将过期，自动刷新...')
    try {
      const success = await authStore.refreshAccessToken()
      if (success) {
        console.log('✅ Token 自动刷新成功')
        return true
      } else {
        console.log('❌ Token 自动刷新失败')
        return false
      }
    } catch (error) {
      console.error('❌ Token 自动刷新异常:', error)
      return false
    }
  }

  return true
}

/**
 * 设置定时刷新 token
 */
export const setupTokenRefreshTimer = (): void => {
  // 每分钟检查一次
  setInterval(() => {
    autoRefreshToken()
  }, 60000)

  console.log('✅ Token 自动刷新定时器已启动')
}

