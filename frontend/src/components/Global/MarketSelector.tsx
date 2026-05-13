import { Select, type SelectProps } from 'antd'

interface Market {
  code: string
  label: string
  flag: string
}

const markets: Market[] = [
  { code: 'CN', label: 'A股', flag: '🇨🇳' },
  { code: 'HK', label: '港股', flag: '🇭🇰' },
  { code: 'US', label: '美股', flag: '🇺🇸' }
]

export interface MarketSelectorProps {
  value?: string
  placeholder?: string
  size?: SelectProps['size']
  disabled?: boolean
  allowClear?: boolean
  onChange?: (value: string) => void
}

export default function MarketSelector({
  value = 'CN',
  placeholder = '选择市场',
  size = 'middle',
  disabled,
  allowClear,
  onChange
}: MarketSelectorProps) {
  return (
    <Select
      className="market-selector"
      style={{ minWidth: 120 }}
      value={value}
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      allowClear={allowClear}
      options={markets.map((m) => ({
        value: m.code,
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{m.flag}</span>
            <span>{m.label}</span>
          </span>
        )
      }))}
      onChange={(v) => v && onChange?.(String(v))}
    />
  )
}
