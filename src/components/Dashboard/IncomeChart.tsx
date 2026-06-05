import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DailySalesData } from '../../lib/billing-queries'

interface IncomeChartProps {
  data: DailySalesData[]
  loading: boolean
}

export default function IncomeChart({ data, loading }: IncomeChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
        <p className="text-center text-[#8a7a6a]">Cargando gráfico...</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
        <p className="text-center text-[#8a7a6a]">Sin datos para este período</p>
      </div>
    )
  }

  const isLongPeriod = data.length > 30

  return (
    <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
      <h3 className="text-sm font-medium text-[#8a7a6a] uppercase tracking-widest mb-4">
        {isLongPeriod ? 'Tendencia de Ingresos' : 'Ingresos Diarios'}
      </h3>

      <ResponsiveContainer width="100%" height={400}>
        {isLongPeriod ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="fecha" stroke="#8a7a6a" />
            <YAxis stroke="#8a7a6a" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderColor: '#C9A84C' }}
              formatter={(value: number) =>
                new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(value)
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#C9A84C"
              strokeWidth={3}
              name="Total"
              dot={false}
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="fecha" stroke="#8a7a6a" />
            <YAxis stroke="#8a7a6a" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderColor: '#C9A84C' }}
              formatter={(value: number) =>
                new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(value)
              }
            />
            <Legend />
            <Bar dataKey="total" fill="#C9A84C" name="Total" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
