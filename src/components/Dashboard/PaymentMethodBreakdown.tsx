import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { PaymentBreakdown } from '../../lib/billing-queries'

interface PaymentMethodBreakdownProps {
  data: PaymentBreakdown
  loading: boolean
}

export default function PaymentMethodBreakdown({
  data,
  loading,
}: PaymentMethodBreakdownProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
        <p className="text-center text-[#8a7a6a]">Cargando datos...</p>
      </div>
    )
  }

  const chartData = [
    {
      name: 'Efectivo',
      value: data.efectivo,
      color: '#C9A84C',
    },
    {
      name: 'Transferencia',
      value: data.transferencia,
      color: '#8B7355',
    },
    {
      name: 'Tarjeta',
      value: data.tarjeta,
      color: '#A0856C',
    },
    {
      name: 'Mixto',
      value: data.mixto,
      color: '#9a8b7a',
    },
  ].filter(item => item.value > 0)

  const total = data.total_dinero

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
        <p className="text-center text-[#8a7a6a]">Sin datos</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
      <h3 className="text-sm font-medium text-[#8a7a6a] uppercase tracking-widest mb-4">
        💳 Métodos de Pago
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(value)
              }
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Detalles */}
        <div className="space-y-3">
          {chartData.map((item, i) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    ${item.value.toLocaleString('es-CO')} ({percentage}%)
                  </p>
                </div>
              </div>
            )
          })}

          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Total</p>
              <p className="text-lg font-semibold text-[#C9A84C]">
                ${total.toLocaleString('es-CO')}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.total_transacciones} transacciones
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
