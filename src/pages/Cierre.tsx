import { useEffect, useState } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import { PROFESIONALES } from '../types'
import type { Venta, Gasto } from '../types'

type Periodo = 'hoy' | 'semana' | 'mes'

export default function Cierre() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [periodo])

  function getRange() {
    const now = new Date()
    if (periodo === 'hoy') {
      const d = format(now, 'yyyy-MM-dd')
      return { desde: d, hasta: d }
    }
    if (periodo === 'semana') {
      return {
        desde: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        hasta: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      }
    }
    return {
      desde: format(startOfMonth(now), 'yyyy-MM-dd'),
      hasta: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }

  async function load() {
    setLoading(true)
    const { desde, hasta } = getRange()
    const [{ data: v }, { data: g }] = await Promise.all([
      supabase.from('ventas').select('*').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('gastos').select('*').gte('fecha', desde).lte('fecha', hasta),
    ])
    setVentas(v || [])
    setGastos(g || [])
    setLoading(false)
  }

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0)
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const totalEfectivo = ventas.reduce((s, v) => s + v.pagado_efectivo, 0)
  const totalDigital = ventas.reduce((s, v) => s + v.pagado_digital, 0)
  const totalComisionVelik = ventas.reduce((s, v) => s + v.comision_velik, 0)
  const neto = totalComisionVelik - totalGastos

  const porProfesional = PROFESIONALES.map(p => {
    const vs = ventas.filter(v => v.profesional_id === p.id)
    return {
      profesional: p,
      ventas: vs.length,
      facturado: vs.reduce((s, v) => s + v.total, 0),
      comision: vs.reduce((s, v) => s + v.comision_profesional, 0),
    }
  }).filter(p => p.ventas > 0)

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <h2 className="font-serif text-2xl font-light mb-4">Cierre & Reportes</h2>

      {/* Periodo selector */}
      <div className="flex gap-2 mb-6">
        {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
              periodo === p ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#8a7a6a]">Cargando...</div>
      ) : (
        <>
          {/* Resumen general */}
          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-4">Resumen</h3>
            <div className="space-y-3">
              <Row label="Total facturado" value={totalVentas} color="text-green-600" />
              <Row label="💵 Efectivo" value={totalEfectivo} />
              <Row label="📱 Digital" value={totalDigital} />
              <div className="border-t border-gray-100 pt-3 mt-3">
                <Row label="Gastos del período" value={totalGastos} color="text-red-500" />
                <Row label="Comisión Velik (50%)" value={totalComisionVelik} />
              </div>
              <div className="border-t border-gray-100 pt-3 mt-3">
                <Row label="NETO Velik (comisión - gastos)" value={neto} color={neto >= 0 ? 'text-[#C9A84C] font-bold' : 'text-red-600 font-bold'} large />
              </div>
            </div>
          </div>

          {/* Por profesional */}
          {porProfesional.length > 0 && (
            <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
              <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-4">Por profesional</h3>
              <div className="space-y-4">
                {porProfesional.map(({ profesional, ventas: nv, facturado, comision }) => (
                  <div key={profesional.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: profesional.color }} />
                      <span className="font-medium text-sm">{profesional.nombre}</span>
                      <span className="text-xs text-gray-400 ml-auto">{nv} servicio{nv !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="ml-5 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Facturado</span>
                        <span>${facturado.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">A pagar (50%)</span>
                        <span className="font-semibold text-[#C9A84C]">${comision.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ventas.length === 0 && (
            <div className="text-center py-8 text-[#8a7a6a]">
              <p>Sin datos para este período</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Row({ label, value, color = 'text-[#1a1a1a]', large = false }: {
  label: string; value: number; color?: string; large?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm text-gray-600 ${large ? 'font-medium' : ''}`}>{label}</span>
      <span className={`${large ? 'text-base' : 'text-sm'} ${color}`}>
        ${value.toLocaleString('es-CO')}
      </span>
    </div>
  )
}
