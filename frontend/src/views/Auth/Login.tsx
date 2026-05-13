import { useState } from 'react'
import { Button, Card, Checkbox, Form, Input, Typography, message } from 'antd'
import { Navigate, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/stores/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loginFn = useAuthStore((s) => s.login)
  const loginLoadingStore = useAuthStore((s) => s.loginLoading)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onFinish = async (vals: { username: string; password: string; rememberMe?: boolean }) => {
    if (loading || loginLoadingStore) return
    try {
      setLoading(true)
      const ok = await loginFn({
        username: vals.username,
        password: vals.password,
        remember_me: vals.rememberMe
      })
      if (ok) {
        message.success('登录成功')
        const path = useAuthStore.getState().getAndClearRedirectPath()
        navigate(path, { replace: true })
      } else {
        message.error('用户名或密码错误')
      }
    } catch (e: unknown) {
      console.error(e)
      message.error('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24, color: '#fff' }}>
          <img src="/logo.svg" alt="TradingAgents-CN" style={{ width: 64, height: 64 }} />
          <Typography.Title style={{ color: '#fff', marginTop: 12 }} level={2}>
            TradingAgents-CN
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.9)' }}>
            多智能体股票分析学习平台
          </Typography.Text>
        </div>

        <Card>
          <Form layout="vertical" size="large" onFinish={onFinish}>
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入用户名" autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码长度不能少于6位' }
              ]}
            >
              <Input.Password placeholder="请输入密码" autoComplete="current-password" />
            </Form.Item>
            <Form.Item name="rememberMe" valuePropName="checked">
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading || loginLoadingStore}>
                登录
              </Button>
            </Form.Item>
            <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
              开源版使用默认账号：admin / admin123
            </Typography.Text>
          </Form>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#fff', fontSize: 12, lineHeight: 1.6 }}>
          <div>© 2025 TradingAgents-CN. All rights reserved.</div>
          <div style={{ marginTop: 8, maxWidth: 800, margin: '8px auto 0' }}>
            TradingAgents-CN 是一个 AI 多 Agents 的股票分析学习平台。平台中的分析结论、观点和“投资建议”均由 AI
            自动生成，仅用于学习、研究与交流，不构成任何形式的投资建议或承诺。
          </div>
        </div>
      </div>
    </div>
  )
}
