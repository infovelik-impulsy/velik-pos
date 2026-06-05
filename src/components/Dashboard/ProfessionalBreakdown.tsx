import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ProfessionalMetrics } from '../../lib/billing-queries'

interface ProfessionalBreakdownProps {
  data: ProfessionalMetrics[]
  loading: boolean
}

export default function ProfessionalBreakdown({ data, loading }: ProfessionalBreakdownProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
        <p className="text-center text-[#8a7a6a]">Cargando datos...</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
        <p className="text-center text-[#8a7a6a]">Sin datos</p>
      </div>
    )
  }

  const chartData = data.map(prof => ({
    nombre: prof.nombre.split(' ')[0],
    total: prof.total,
    comision: prof.comision,
  }))

  return (
    <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
      <h3 className="text-sm font-medium text-[#8a7a6a] uppercase tracking-widest mb-4">
        👩‍💼 Ingresos por Profesional
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" stroke="#8a7a6a" />
          <YAxis dataKey="nombre" type="category" stroke="#8a7a6a" width={80} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', borderColor: '#C9A84C' }}
            formatter={(value: any) =>
              new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
              }).format(Number(value) || 0)
            }
          />
          <Legend />
          <Bar dataKey="total" fill="#C9A84C" name="Total Ventas" />
          <Bar dataKey="comision" fill="#8B7355" name="Comisión" />
        </BarChart>
      </ResponsiveContainer>

      {/* Tabla detallada debajo */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200">
            <tr className="text-left text-xs font-medium text-[#8a7a6a] uppercase tracking-widest">
              <th className="pb-3 px-3">Profesional</th>
              <th className="pb-3 px-3 text-right">Servicios</th>
              <th className="pb-3 px-3 text-right">Total Ventas</th>
              <th className="pb-3 px-3 text-right">Comisión</th>
            </tr>
          </thead>
          <tbody>
            {data.map((prof, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-3 font-medium text-gray-900">{prof.nombre}</td>
                <td className="py-3 px-3 text-right text-gray-600">{prof.servicios_count}</td>
                <td className="py-3 px-3 text-right font-semibold text-gray-900">
                  ${prof.total.toLocaleString('es-CO')}
                </td>
                <td className="py-3 px-3 text-right text-[#C9A84C] font-semibold">
                  ${prof.comision.toLocaleString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
