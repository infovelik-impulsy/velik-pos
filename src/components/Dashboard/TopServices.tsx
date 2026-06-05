import type { ServiceMetric } from '../../lib/billing-queries'

interface TopServicesProps {
  data: ServiceMetric[]
  loading: boolean
}

export default function TopServices({ data, loading }: TopServicesProps) {
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

  const maxRevenue = Math.max(...data.map(d => d.revenue))

  return (
    <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
      <h3 className="text-sm font-medium text-[#8a7a6a] uppercase tracking-widest mb-4">
        🛍️ Servicios Más Vendidos
      </h3>

      <div className="space-y-3">
        {data.map((service, i) => {
          const percentage = (service.revenue / maxRevenue) * 100
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-gray-900 truncate">{service.nombre}</h4>
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#C9A84C]">
                    {service.count}× — ${service.revenue.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#C9A84C] h-full rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla alternativa */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200">
            <tr className="text-left text-xs font-medium text-[#8a7a6a] uppercase tracking-widest">
              <th className="pb-3 px-3">#</th>
              <th className="pb-3 px-3">Servicio</th>
              <th className="pb-3 px-3 text-right">Cantidad</th>
              <th className="pb-3 px-3 text-right">Ingresos</th>
              <th className="pb-3 px-3 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((service, i) => {
              const totalRevenue = data.reduce((sum, s) => sum + s.revenue, 0)
              const percentage = totalRevenue > 0 ? ((service.revenue / totalRevenue) * 100).toFixed(1) : '0'
              return (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3 text-center text-gray-500 font-medium">{i + 1}</td>
                  <td className="py-3 px-3 font-medium text-gray-900 max-w-xs truncate">
                    {service.nombre}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600">{service.count}</td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900">
                    ${service.revenue.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 px-3 text-right text-[#C9A84C] font-semibold">{percentage}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
