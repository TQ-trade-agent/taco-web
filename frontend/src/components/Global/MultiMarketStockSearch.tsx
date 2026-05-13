import { Empty, Input, Spin, Tag, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useCallback, useState } from 'react'

import { searchStocks, type StockInfo } from '@/api/multiMarket'

import MarketSelector from '@/components/Global/MarketSelector'

interface MultiMarketStockSearchProps {
  onSelect?: (stock: StockInfo) => void
}

export default function MultiMarketStockSearch({ onSelect }: MultiMarketStockSearchProps) {
  const [selectedMarket, setSelectedMarket] = useState('CN')
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<StockInfo[]>([])
  const [loading, setLoading] = useState(false)

  const placeholders: Record<string, string> = {
    CN: '输入股票代码或名称（如：000001 或 平安银行）',
    HK: '输入股票代码或名称（如：00700 或 腾讯）',
    US: '输入股票代码或名称（如：AAPL 或 Apple）'
  }

  const getMarketLabel = (market: string) => {
    const labels: Record<string, string> = { CN: 'A股', HK: '港股', US: '美股' }
    return labels[market] || market
  }

  const formatStockCode = (stock: StockInfo) => {
    if (stock.market === 'HK') return stock.code.padStart(5, '0')
    return stock.code
  }

  const performSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q) return
    setLoading(true)
    try {
      const response = await searchStocks(selectedMarket, q, 20)
      setResults(response.data?.stocks || [])
    } catch (e: unknown) {
      console.error('搜索失败:', e)
      const err = e as { message?: string }
      message.error(err.message || '搜索失败')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedMarket])

  let timer: ReturnType<typeof setTimeout> | null = null

  const onInputChange = (v: string) => {
    setSearchQuery(v)
    if (timer) clearTimeout(timer)
    if (!v.trim()) {
      setResults([])
      return
    }
    timer = setTimeout(() => {
      void performSearch()
    }, 500)
  }

  return (
    <div className="multi-market-stock-search" style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <MarketSelector value={selectedMarket} onChange={(next) => {
          setSelectedMarket(next)
          setResults([])
          setSearchQuery('')
        }} />
        <Input
          style={{ flex: 1 }}
          prefix={<SearchOutlined />}
          placeholder={placeholders[selectedMarket] || '输入股票代码或名称'}
          value={searchQuery}
          allowClear
          onChange={(e) => onInputChange(e.target.value)}
          onClear={() => setResults([])}
        />
      </div>

      {loading ? (
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spin />
          <span>搜索中...</span>
        </div>
      ) : results.length > 0 ? (
        <div
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            border: '1px solid var(--el-border-color)',
            borderRadius: 4
          }}
        >
          {results.map((stock) => (
            <div
              role="presentation"
              key={`${stock.market}-${stock.code}`}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--el-border-color-lighter)'
              }}
              onClick={() => {
                onSelect?.(stock)
                setSearchQuery('')
                setResults([])
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{formatStockCode(stock)}</span>
                <span>{stock.name}</span>
                {stock.name_en ? <span style={{ fontSize: 12, color: '#888' }}>{stock.name_en}</span> : null}
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Tag>{getMarketLabel(stock.market)}</Tag>
                {stock.industry ? <Tag>{stock.industry}</Tag> : null}
                {stock.pe != null ? <span style={{ fontSize: 12 }}>PE: {stock.pe.toFixed(2)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery.trim() ? (
        <Empty description="未找到相关股票" imageStyle={{ height: 80 }} />
      ) : null}
    </div>
  )
}
