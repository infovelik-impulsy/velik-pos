import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react'

interface KPICardsProps {
  totalIncome: number
  totalComisiones: number
  transactionCount: number
  averageTransaction: number
  loading: boolean
}

export default function KPICards({
  totalIncome,
  totalComisiones,
  transactionCount,
  averageTransaction,
  loading,
}: KPICardsProps) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const cards = [
    {
      title: 'Ingresos Totales',
      value: formatMoney(totalIncome),
      icon: DollarSign,
      color: 'bg-[#C9A84C]',
    },
    {
      title: 'Comisiones Profesionales',
      value: formatMoney(totalComisiones),
      icon: TrendingUp,
      color: 'bg-[#8B7355]',
    },
    {
      title: 'Transacciones',
      value: transactionCount.toString(),
      icon: ShoppingCart,
      color: 'bg-[#A0856C]',
    },
    {
      title: 'Ticket Promedio',
      value: formatMoney(averageTransaction),
      icon: DollarSign,
      color: 'bg-[#9a8b7a]',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[#8a7a6a] uppercase tracking-widest">
                {card.title}
              </h3>
              <div className={`${card.color} text-white p-2 rounded-lg`}>
                <Icon size={18} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {loading ? '—' : card.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}
