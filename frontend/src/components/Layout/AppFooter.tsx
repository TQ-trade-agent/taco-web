export default function AppFooter() {
  return (
    <div className="app-footer" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          color: 'var(--el-text-color-regular)',
          fontSize: 14,
          padding: '12px 16px',
          textAlign: 'center'
        }}
      >
        <div>
          <span>© 2025 TradingAgents-CN v1.0.1</span>
          <span style={{ marginLeft: 4 }}>All rights reserved.</span>
        </div>
        <div
          style={{
            color: 'var(--el-text-color-secondary)',
            fontSize: 12,
            lineHeight: 1.6,
            maxWidth: 1100
          }}
        >
          TradingAgents-CN 是一个 AI 多智能体股票分析辅助工具，不具备证券投资咨询资质。平台中的所有分析结果、评分、参考意见均由
          AI 基于历史数据自动生成，仅供学习、研究与技术交流使用，不构成任何投资建议或决策依据。股票投资存在市场风险、流动性风险、政策风险等多种风险，可能导致本金损失。用户应基于自身风险承受能力独立决策，使用本工具产生的任何投资行为及其后果由用户自行承担。市场有风险，投资需谨慎。
        </div>
      </div>
    </div>
  )
}
