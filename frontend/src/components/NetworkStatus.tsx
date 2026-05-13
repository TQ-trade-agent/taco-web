import { Alert, Button, Space } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import { useAppStore } from '@/stores/app'

export default function NetworkStatus() {
  const isOnline = useAppStore((s) => s.isOnline)
  const apiConnected = useAppStore((s) => s.apiConnected)
  const checkApiConnection = useAppStore((s) => s.checkApiConnection)
  const setOnlineStatus = useAppStore((s) => s.setOnlineStatus)

  const [retrying, setRetrying] = useState(false)

  const show = useMemo(() => !isOnline || !apiConnected, [isOnline, apiConnected])

  useEffect(() => {
    const on = () => {
      console.log('网络已连接')
      setOnlineStatus(true)
      void useAppStore.getState().checkApiConnection()
    }
    const off = () => {
      console.log('网络已断开')
      setOnlineStatus(false)
      useAppStore.getState().setApiConnected(false)
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [setOnlineStatus])

  useEffect(() => {
    const t = window.setInterval(() => {
      if (isOnline && !apiConnected) void checkApiConnection()
    }, 30000)
    return () => window.clearInterval(t)
  }, [apiConnected, checkApiConnection, isOnline])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        maxWidth: 400
      }}
    >
      {!isOnline ? (
        <Alert type="warning" showIcon message="网络连接已断开" description="请检查您的网络连接" />
      ) : (
        <Alert
          type="error"
          showIcon
          message="后端服务连接失败"
          description={
            <Space>
              <span>无法连接到后端服务，请检查服务是否正常运行</span>
              <Button
                type="primary"
                size="small"
                loading={retrying}
                onClick={async () => {
                  setRetrying(true)
                  try {
                    await checkApiConnection()
                  } finally {
                    setRetrying(false)
                  }
                }}
              >
                重试连接
              </Button>
            </Space>
          }
        />
      )}
    </div>
  )
}
