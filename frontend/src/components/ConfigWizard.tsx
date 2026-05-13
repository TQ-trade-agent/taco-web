import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Steps,
  Typography,
  message
} from 'antd'
import { CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'

export interface WizardCompleteData {
  mongodb: { host: string; port: number; database: string }
  redis: { host: string; port: number }
  llm: { provider: string; apiKey: string; modelName: string }
  datasource: { type: string; token: string; apiKey: string }
}

const modelsByProvider: Record<string, Array<{ label: string; value: string }>> = {
  deepseek: [
    { label: 'deepseek-chat', value: 'deepseek-chat' },
    { label: 'deepseek-coder', value: 'deepseek-coder' }
  ],
  dashscope: [
    { label: 'qwen-turbo', value: 'qwen-turbo' },
    { label: 'qwen-plus', value: 'qwen-plus' },
    { label: 'qwen-max', value: 'qwen-max' }
  ],
  openai: [
    { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
    { label: 'gpt-4', value: 'gpt-4' },
    { label: 'gpt-4-turbo', value: 'gpt-4-turbo' }
  ],
  google: [
    { label: 'gemini-pro', value: 'gemini-pro' },
    { label: 'gemini-2.5-pro', value: 'gemini-2.5-pro' }
  ]
}

interface ConfigWizardProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onComplete?: (data: WizardCompleteData) => void | Promise<void>
}

export default function ConfigWizard({ open, onOpenChange, onComplete }: ConfigWizardProps) {
  const [step, setStep] = useState(0)
  const [saving] = useState(false)

  const [data, setData] = useState<WizardCompleteData>({
    mongodb: { host: 'localhost', port: 27017, database: 'tradingagents' },
    redis: { host: 'localhost', port: 6379 },
    llm: { provider: '', apiKey: '', modelName: '' },
    datasource: { type: 'akshare', token: '', apiKey: '' }
  })

  const modelOptions = useMemo(
    () => modelsByProvider[data.llm.provider] || [],
    [data.llm.provider]
  )

  const providerLabels: Record<string, string> = {
    deepseek: 'DeepSeek',
    dashscope: '通义千问',
    openai: 'OpenAI',
    google: 'Google Gemini'
  }

  const helpUrl: Record<string, string> = {
    deepseek: 'https://platform.deepseek.com/',
    dashscope: 'https://dashscope.aliyun.com/',
    openai: 'https://platform.openai.com/',
    google: 'https://ai.google.dev/'
  }

  const dsLabels: Record<string, string> = {
    akshare: 'AKShare',
    tushare: 'Tushare',
    finnhub: 'FinnHub'
  }

  const handleClose = () => {
    setStep(0)
    onOpenChange(false)
  }

  const next = async () => {
    if (step === 2) {
      if (!data.llm.provider) {
        message.warning('请选择大模型提供商')
        return
      }
      if (!data.llm.apiKey) {
        message.warning('请输入 API 密钥')
        return
      }
    }
    setStep((s) => Math.min(s + 1, 4))
  }

  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const footer = (
    <Space>
      {step > 0 && step < 4 ? <Button onClick={prev}>上一步</Button> : null}
      {step === 0 ? (
        <Button onClick={() => handleClose()}>跳过向导</Button>
      ) : null}
      {step < 4 ? (
        <Button type="primary" loading={saving && step >= 3} onClick={() => void next()}>
          {step === 0 ? '开始配置' : '下一步'}
        </Button>
      ) : (
        <Button
          type="primary"
          onClick={async () => {
            await onComplete?.({ ...data, datasource: { ...data.datasource } })
            handleClose()
          }}
        >
          完成
        </Button>
      )}
    </Space>
  )

  return (
    <Modal
      title="配置向导"
      open={open}
      footer={footer}
      onCancel={() => handleClose()}
      width={840}
      closable={step > 0}
      maskClosable={false}
      keyboard={step > 0}
      destroyOnClose
      afterClose={() => setStep(0)}
    >
      <Steps
        style={{ marginBottom: 24 }}
        current={step}
        items={[
          { title: '欢迎' },
          { title: '数据库' },
          { title: '大模型' },
          { title: '数据源' },
          { title: '完成' }
        ]}
      />

      {step === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <SettingOutlined style={{ fontSize: 64, color: '#409EFF' }} />
          <Typography.Title level={4} style={{ marginTop: 16 }}>
            欢迎使用 TradingAgents-CN
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            我们将通过数个步骤完成初始化配置，您可随时在「配置管理」中更改。
          </Typography.Paragraph>
          <Alert
            style={{ textAlign: 'left', marginTop: 16 }}
            type="info"
            showIcon
            message={
              <>
                <div>您可以跳过此向导，稍后在系统中配置数据源与大模型。</div>
              </>
            }
          />
        </div>
      ) : null}

      {step === 1 ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary">
            数据库需在服务端 .env 中配置；此处仅作为记录与环境确认。
          </Typography.Paragraph>
          <Divider orientation="left">MongoDB</Divider>
          <Form layout="vertical">
            <Form.Item label="主机">
              <Input
                value={data.mongodb.host}
                onChange={(e) =>
                  setData((d) => ({ ...d, mongodb: { ...d.mongodb, host: e.target.value } }))
                }
              />
            </Form.Item>
            <Form.Item label="端口">
              <InputNumber
                style={{ width: '100%' }}
                value={data.mongodb.port}
                onChange={(v) =>
                  setData((d) => ({ ...d, mongodb: { ...d.mongodb, port: Number(v) || 0 } }))
                }
              />
            </Form.Item>
            <Form.Item label="数据库名">
              <Input
                value={data.mongodb.database}
                onChange={(e) =>
                  setData((d) => ({ ...d, mongodb: { ...d.mongodb, database: e.target.value } }))
                }
              />
            </Form.Item>
          </Form>
          <Divider orientation="left">Redis</Divider>
          <Form layout="vertical">
            <Form.Item label="主机">
              <Input
                value={data.redis.host}
                onChange={(e) =>
                  setData((d) => ({ ...d, redis: { ...d.redis, host: e.target.value } }))
                }
              />
            </Form.Item>
            <Form.Item label="端口">
              <InputNumber
                style={{ width: '100%' }}
                value={data.redis.port}
                onChange={(v) =>
                  setData((d) => ({ ...d, redis: { ...d.redis, port: Number(v) || 0 } }))
                }
              />
            </Form.Item>
          </Form>
          <Alert type="warning" showIcon message="生产环境请务必通过安全方式保管连接串与密码。" />
        </Space>
      ) : null}

      {step === 2 ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Form layout="vertical">
            <Form.Item label="提供商" required>
              <Select
                placeholder="请选择大模型提供商"
                value={data.llm.provider || undefined}
                onChange={(provider) =>
                  setData((d) => {
                    const first = modelsByProvider[provider]?.[0]?.value || ''
                    return { ...d, llm: { ...d.llm, provider, modelName: first } }
                  })
                }
                options={[
                  { label: 'DeepSeek', value: 'deepseek' },
                  { label: '通义千问', value: 'dashscope' },
                  { label: 'OpenAI', value: 'openai' },
                  { label: 'Google Gemini', value: 'google' }
                ]}
              />
            </Form.Item>
            <Form.Item label="API Key" required>
              <Input.Password
                placeholder="密钥仅用于服务端配置"
                value={data.llm.apiKey}
                onChange={(e) =>
                  setData((d) => ({ ...d, llm: { ...d.llm, apiKey: e.target.value } }))
                }
              />
            </Form.Item>
            <Form.Item label="模型">
              <Select
                options={modelOptions}
                value={data.llm.modelName || undefined}
                onChange={(modelName) =>
                  setData((d) => ({ ...d, llm: { ...d.llm, modelName } }))
                }
                disabled={modelOptions.length === 0}
              />
            </Form.Item>
          </Form>
          {data.llm.provider ? (
            <Alert
              showIcon
              type="info"
              message={`获取 ${providerLabels[data.llm.provider] || ''} API 密钥`}
              description={
                <a href={helpUrl[data.llm.provider]} target="_blank" rel="noreferrer">
                  前往官网 →
                </a>
              }
            />
          ) : null}
        </Space>
      ) : null}

      {step === 3 ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Form layout="vertical">
            <Form.Item label="默认数据源">
              <Select
                value={data.datasource.type}
                onChange={(type) =>
                  setData((d) => ({
                    ...d,
                    datasource: { ...d.datasource, type, token: '', apiKey: '' }
                  }))
                }
                options={[
                  { label: 'AKShare（推荐）', value: 'akshare' },
                  { label: 'Tushare', value: 'tushare' },
                  { label: 'FinnHub', value: 'finnhub' }
                ]}
              />
            </Form.Item>
            {data.datasource.type === 'tushare' ? (
              <Form.Item label="Tushare Token">
                <Input
                  value={data.datasource.token}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      datasource: { ...d.datasource, token: e.target.value }
                    }))
                  }
                />
              </Form.Item>
            ) : null}
            {data.datasource.type === 'finnhub' ? (
              <Form.Item label="FinnHub API Key">
                <Input
                  value={data.datasource.apiKey}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      datasource: { ...d.datasource, apiKey: e.target.value }
                    }))
                  }
                />
              </Form.Item>
            ) : null}
          </Form>
          {data.datasource.type === 'akshare' ? (
            <Alert type="success" showIcon message="AKShare 为免费数据源，无需密钥即可使用。" />
          ) : (
            <Alert type="info" showIcon message="请确保在后端可用的网络环境下校验数据源连通性。" />
          )}
        </Space>
      ) : null}

      {step === 4 ? (
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <Typography.Title level={4}>配置完成</Typography.Title>
          <Typography.Paragraph type="secondary">
            系统将保存您选择的模型与数据源偏好，可随时在后台调整。
          </Typography.Paragraph>
          <Typography.Paragraph>
            <strong>摘要</strong>
            <div>MongoDB: {data.mongodb.host}:{data.mongodb.port}</div>
            <div>
              大模型: {providerLabels[data.llm.provider] || '—'} ({data.llm.modelName})
            </div>
            <div>数据源: {dsLabels[data.datasource.type] || data.datasource.type}</div>
          </Typography.Paragraph>
        </Space>
      ) : null}
    </Modal>
  )
}
