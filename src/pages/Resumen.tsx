import { useEffect, useState } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import { PROFESIONALES } from '../types'
import type { Venta } from '../types'

type Periodo = 'hoy' | 'semana' | 'mes'

interface CitaOrigen {
  origen: string | null
  count: number
}

const fmt = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-CO')

function getRange(periodo: Periodo) {
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

export default function Resumen() {
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [origenes, setOrigenes] = useState<CitaOrigen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [periodo])

  async function load() {
    setLoading(true)
    const { desde, hasta } = getRange(periodo)
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from('ventas').select('*').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('citas').select('origen').gte('fecha', desde).lte('fecha', hasta).neq('status', 'cancelled'),
    ])
    setVentas(v || [])

    // Group citas by origen
    const map: Record<string, number> = {}
    for (const row of (c || [])) {
      const key = row.origen || 'manual'
      map[key] = (map[key] || 0) + 1
    }
    setOrigenes(Object.entries(map).map(([origen, count]) => ({ origen, count })))
    setLoading(false)
  }

  const totalVentas = ventas.reduce((s, v) => s + (v.total || 0), 0)
  const totalEfectivo = ventas.reduce((s, v) => s + (v.pagado_efectivo || 0), 0)
  const totalDigital = ventas.reduce((s, v) => s + (v.pagado_digital || 0), 0)
  const totalProfesionales = ventas.reduce((s, v) => s + (v.comision_profesional || 0), 0)
  const totalVelik = ventas.reduce((s, v) => s + (v.comision_velik || 0), 0)

  const porProfesional = PROFESIONALES.map(p => {
    const pVentas = ventas.filter(v => v.profesional_id === p.id)
    const total = pVentas.reduce((s, v) => s + (v.total || 0), 0)
    const aPagar = pVentas.reduce((s, v) => s + (v.comision_profesional || 0), 0)
    return { ...p, servicios: pVentas.length, total, aPagar }
  }).filter(p => p.servicios > 0)

  const totalCitas = origenes.reduce((s, o) => s + o.count, 0)
  const origenLabels: Record<string, string> = {
    whatsapp: 'WhatsApp (Bot)',
    web: 'Página web',
    manual: 'Manual (POS)',
  }
  const origenColors: Record<string, string> = {
    whatsapp: '#25D366',
    web: '#C9A84C',
    manual: '#8a7a6a',
  }

  const periodos: { value: Periodo; label: string }[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mes' },
  ]

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <h2 className="text-lg font-medium mb-4">Resumen</h2>

      {/* Periodo selector */}
      <div className="flex gap-2 mb-6">
        {periodos.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              periodo === p.value ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#8a7a6a]">Cargando...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-[#8a7a6a] mb-1">Total ventas</p>
              <p className="font-semibold text-sm">{fmt(totalVentas)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-[#8a7a6a] mb-1">A pagar</p>
              <p className="font-semibold text-sm text-amber-600">{fmt(totalProfesionales)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-[#8a7a6a] mb-1">Velik</p>
              <p className="font-semibold text-sm text-green-600">{fmt(totalVelik)}</p>
            </div>
          </div>

          {/* Liquidación por profesional */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <h3 className="font-medium text-sm mb-3">Liquidación por profesional</h3>
            {porProfesional.length === 0 ? (
              <p className="text-sm text-[#8a7a6a] text-center py-4">Sin ventas en este período</p>
            ) : (
              <div className="space-y-3">
                {porProfesional.map(p => (
                  <div key={p.id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-medium text-sm">{p.nombre}</span>
                        <span className="text-xs text-[#8a7a6a]">{p.servicios} servicio{p.servicios !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-xs font-medium text-[#C9A84C]">{fmt(p.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#8a7a6a]">
                      <span>Velik (50%): {fmt(p.total / 2)}</span>
                      <span className="font-semibold text-amber-700">A pagar: {fmt(p.aPagar || p.total / 2)}</span>
                    </div>
                  </div>
                ))}
                {/* Total */}
                <div className="flex justify-between pt-2 border-t border-gray-100 text-sm font-semibold">
                  <span>Total a pagar profesionales</span>
                  <span className="text-amber-600">{fmt(totalProfesionales)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <h3 className="font-medium text-sm mb-3">Método de pago</h3>
            <div className="space-y-2">
              {[
                { label: 'Efectivo', valor: totalEfectivo, color: '#22c55e' },
                { label: 'Digital (transferencia/tarjeta)', valor: totalDigital, color: '#3b82f6' },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8a7a6a]">{m.label}</span>
                      <span className="font-medium">{fmt(m.valor)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: m.color,
                          width: totalVentas > 0 ? `${(m.valor / totalVentas) * 100}%` : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Origen de reservas */}
          {totalCitas > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-medium text-sm mb-3">Origen de reservas</h3>
              <div className="space-y-2">
                {origenes.sort((a, b) => b.count - a.count).map(o => {
                  const key = o.origen || 'manual'
                  const pct = Math.round((o.count / totalCitas) * 100)
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: origenColors[key] || '#8a7a6a' }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#8a7a6a]">{origenLabels[key] || key}</span>
                          <span className="font-medium">{o.count} cita{o.count !== 1 ? 's' : ''} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ backgroundColor: origenColors[key] || '#8a7a6a', width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <p className="text-xs text-[#8a7a6a] text-right pt-1">{totalCitas} citas totales</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
