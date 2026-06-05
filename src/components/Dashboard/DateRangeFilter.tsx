import { useState } from 'react'
import { Calendar } from 'lucide-react'

type PeriodType =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'last90'
  | 'thisYear'
  | 'custom'

interface DateRange {
  desde: string
  hasta: string
}

function getDateRange(period: PeriodType): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const toDateString = (d: Date) => d.toISOString().split('T')[0]

  switch (period) {
    case 'today':
      return { desde: toDateString(today), hasta: toDateString(tomorrow) }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { desde: toDateString(yesterday), hasta: toDateString(today) }
    }
    case 'last7': {
      const last7 = new Date(today)
      last7.setDate(last7.getDate() - 7)
      return { desde: toDateString(last7), hasta: toDateString(tomorrow) }
    }
    case 'thisWeek': {
      const weekStart = new Date(today)
      const day = weekStart.getDay()
      weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
      return { desde: toDateString(weekStart), hasta: toDateString(tomorrow) }
    }
    case 'lastWeek': {
      const weekStart = new Date(today)
      const day = weekStart.getDay()
      weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1) - 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      return { desde: toDateString(weekStart), hasta: toDateString(weekEnd) }
    }
    case 'thisMonth': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { desde: toDateString(monthStart), hasta: toDateString(tomorrow) }
    }
    case 'lastMonth': {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth(), 1)
      return { desde: toDateString(monthStart), hasta: toDateString(monthEnd) }
    }
    case 'last90': {
      const last90 = new Date(today)
      last90.setDate(last90.getDate() - 90)
      return { desde: toDateString(last90), hasta: toDateString(tomorrow) }
    }
    case 'thisYear': {
      const yearStart = new Date(today.getFullYear(), 0, 1)
      return { desde: toDateString(yearStart), hasta: toDateString(tomorrow) }
    }
    case 'custom':
      return { desde: '', hasta: '' }
  }
}

interface DateRangeFilterProps {
  onDateChange: (desde: string, hasta: string) => void
}

export default function DateRangeFilter({ onDateChange }: DateRangeFilterProps) {
  const [period, setPeriod] = useState<PeriodType>('thisMonth')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod)
    if (newPeriod !== 'custom') {
      const range = getDateRange(newPeriod)
      onDateChange(range.desde, range.hasta)
    }
  }

  const handleCustomApply = () => {
    if (customDesde && customHasta) {
      onDateChange(customDesde, customHasta)
    }
  }

  const periods: { value: PeriodType; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'yesterday', label: 'Ayer' },
    { value: 'last7', label: 'Últimos 7 días' },
    { value: 'thisWeek', label: 'Esta semana' },
    { value: 'lastWeek', label: 'Semana pasada' },
    { value: 'thisMonth', label: 'Este mes' },
    { value: 'lastMonth', label: 'Mes pasado' },
    { value: 'last90', label: 'Últimos 90 días' },
    { value: 'thisYear', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' },
  ]

  return (
    <div className="bg-white rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={16} className="text-[#8a7a6a]" />
        <h3 className="text-sm font-medium text-[#8a7a6a] uppercase tracking-widest">
          Período
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {periods.slice(0, 8).map(p => (
          <button
            key={p.value}
            onClick={() => handlePeriodChange(p.value)}
            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              period === p.value
                ? 'bg-[#C9A84C] text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => handlePeriodChange('custom')}
        className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all mb-3 ${
          period === 'custom'
            ? 'bg-[#C9A84C] text-white'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
      >
        Personalizado
      </button>

      {period === 'custom' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={customDesde}
              onChange={e => setCustomDesde(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={customHasta}
              onChange={e => setCustomHasta(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
          <button
            onClick={handleCustomApply}
            disabled={!customDesde || !customHasta}
            className="w-full py-2 bg-[#C9A84C] text-white rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-[#b8963e] transition-all"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
