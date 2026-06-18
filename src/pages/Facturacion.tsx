import { useState } from 'react'
import DateRangeFilter from '../components/Dashboard/DateRangeFilter'
import KPICards from '../components/Dashboard/KPICards'
import IncomeChart from '../components/Dashboard/IncomeChart'
import ProfessionalBreakdown from '../components/Dashboard/ProfessionalBreakdown'
import TopServices from '../components/Dashboard/TopServices'
import PaymentMethodBreakdown from '../components/Dashboard/PaymentMethodBreakdown'
import ExportButtons from '../components/Dashboard/ExportButtons'
import { useBillingData } from '../hooks/useBillingData'
import { PROFESIONALES } from '../types'

export default function Facturacion() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const toDateString = (d: Date) => d.toISOString().split('T')[0]

  const [dateRange, setDateRange] = useState({
    desde: toDateString(monthStart),
    hasta: toDateString(tomorrow),
  })
  const [profesionalId, setProfesionalId] = useState<string>('')

  const { data, loading, error } = useBillingData(dateRange.desde, dateRange.hasta, profesionalId || undefined)

  const handleDateChange = (desde: string, hasta: string) => setDateRange({ desde, hasta })

  const profSeleccionado = PROFESIONALES.find(p => p.id === profesionalId)

  if (error) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <h2 className="font-serif text-2xl font-light mb-4">Facturación</h2>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
          Error cargando datos: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24">
      <div id="dashboard-content">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-light">📊 Facturación</h2>
          <ExportButtons
            dateRange={dateRange}
            metrics={data?.metrics || { totalIncome: 0, totalComisiones: 0, transactionCount: 0, averageTransaction: 0 }}
            dailySales={data?.dailySales || []}
            professionals={data?.professionals || []}
            topServices={data?.topServices || []}
            paymentBreakdown={data?.paymentBreakdown || { efectivo: 0, transferencia: 0, tarjeta: 0, mixto: 0, de_la_casa: 0, total_transacciones: 0, total_dinero: 0 }}
          />
        </div>

        {/* Filtro por profesional */}
        <div className="bg-white rounded-2xl p-4 mb-4">
          <p className="text-xs font-medium text-[#8a7a6a] uppercase tracking-widest mb-3">Profesional</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setProfesionalId('')}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                profesionalId === '' ? 'bg-[#C9A84C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {PROFESIONALES.map(p => (
              <button
                key={p.id}
                onClick={() => setProfesionalId(profesionalId === p.id ? '' : p.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  profesionalId === p.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={profesionalId === p.id ? { backgroundColor: p.color } : {}}
              >
                {p.nombre.split(' ')[0]}
              </button>
            ))}
          </div>
          {profSeleccionado && (
            <p className="text-xs text-[#8a7a6a] mt-2">
              Mostrando solo ventas de <strong>{profSeleccionado.nombre}</strong>
            </p>
          )}
        </div>

        <DateRangeFilter onDateChange={handleDateChange} />

        <KPICards
          totalIncome={data?.metrics.totalIncome || 0}
          totalComisiones={data?.metrics.totalComisiones || 0}
          transactionCount={data?.metrics.transactionCount || 0}
          averageTransaction={data?.metrics.averageTransaction || 0}
          loading={loading}
        />

        <IncomeChart data={data?.dailySales || []} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfessionalBreakdown data={data?.professionals || []} loading={loading} />
          <PaymentMethodBreakdown
            data={data?.paymentBreakdown || { efectivo: 0, transferencia: 0, tarjeta: 0, mixto: 0, de_la_casa: 0, total_transacciones: 0, total_dinero: 0 }}
            loading={loading}
          />
        </div>

        <TopServices data={data?.topServices || []} loading={loading} />
      </div>
    </div>
  )
}
