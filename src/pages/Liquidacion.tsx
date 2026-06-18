import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PROFESIONALES } from '../types'
import { CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface ProfResumen {
  profesional_id: string
  nombre: string
  color: string
  total_ventas: number
  comision: number
  count: number
}

interface Liquidacion {
  id: string
  fecha_inicio: string
  fecha_fin: string
  fecha_liquidacion: string
  detalle: ProfResumen[]
  total_general: number
  total_comisiones: number
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-CO')
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function Liquidacion() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [pendiente, setPendiente] = useState<ProfResumen[]>([])
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)

    // Cargar liquidaciones pasadas
    const { data: liq } = await supabase
      .from('liquidaciones')
      .select('*')
      .order('fecha_fin', { ascending: false })

    const historial = (liq || []) as Liquidacion[]
    setLiquidaciones(historial)

    // Calcular período pendiente
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 0)
    const hasta = hoy.toISOString().split('T')[0]

    let desde = '2024-01-01'
    if (historial.length > 0) {
      // El día siguiente al último cierre
      const lastEnd = new Date(historial[0].fecha_fin + 'T00:00:00')
      lastEnd.setDate(lastEnd.getDate() + 1)
      desde = lastEnd.toISOString().split('T')[0]
    }

    setFechaInicio(desde)
    setFechaFin(hasta)

    // Calcular ventas del período pendiente
    const { data: ventas } = await supabase
      .from('ventas')
      .select('profesional_id, profesional_nombre, total, comision_profesional, metodo_pago')
      .gte('fecha_cita', desde)
      .lte('fecha_cita', hasta)

    const map = new Map<string, ProfResumen>()
    ;(ventas || []).forEach(v => {
      if (v.metodo_pago === 'de_la_casa') return
      const prof = PROFESIONALES.find(p => p.id === v.profesional_id)
      if (!map.has(v.profesional_id)) {
        map.set(v.profesional_id, {
          profesional_id: v.profesional_id,
          nombre: v.profesional_nombre || prof?.nombre || 'Desconocido',
          color: prof?.color || '#888',
          total_ventas: 0,
          comision: 0,
          count: 0,
        })
      }
      const cur = map.get(v.profesional_id)!
      cur.total_ventas += v.total || 0
      cur.comision += v.comision_profesional || 0
      cur.count += 1
    })

    setPendiente(Array.from(map.values()).sort((a, b) => b.total_ventas - a.total_ventas))
    setLoading(false)
    setExito(false)
  }

  async function liquidar() {
    if (!pendiente.length) return
    setGuardando(true)

    const total_general = pendiente.reduce((s, p) => s + p.total_ventas, 0)
    const total_comisiones = pendiente.reduce((s, p) => s + p.comision, 0)

    const { error } = await supabase.from('liquidaciones').insert({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      fecha_liquidacion: new Date().toISOString(),
      detalle: pendiente,
      total_general,
      total_comisiones,
    })

    setGuardando(false)
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    setExito(true)
    setTimeout(() => cargar(), 1200)
  }

  const totalPendiente = pendiente.reduce((s, p) => s + p.total_ventas, 0)
  const comisionPendiente = pendiente.reduce((s, p) => s + p.comision, 0)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <h2 className="font-serif text-2xl font-light mb-6">💰 Liquidación</h2>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#8a7a6a]">
          <Loader2 size={24} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <>
          {/* Período pendiente */}
          <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#8a7a6a]">Período pendiente</p>
                <p className="text-sm font-medium text-[#1a1a1a] mt-0.5">
                  {fmtDate(fechaInicio)} → {fmtDate(fechaFin)}
                </p>
              </div>
              {exito && (
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle size={16} /> Liquidado
                </div>
              )}
            </div>

            {pendiente.length === 0 ? (
              <p className="text-sm text-[#8a7a6a] text-center py-4">No hay ventas pendientes de liquidar</p>
            ) : (
              <>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="text-xs text-[#8a7a6a] uppercase tracking-wider border-b border-gray-100">
                      <th className="text-left pb-2">Profesional</th>
                      <th className="text-right pb-2">Servicios</th>
                      <th className="text-right pb-2">Total ventas</th>
                      <th className="text-right pb-2 text-[#C9A84C]">A pagar (50%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendiente.map(p => (
                      <tr key={p.profesional_id} className="border-b border-gray-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="font-medium">{p.nombre}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-[#8a7a6a]">{p.count}</td>
                        <td className="py-3 text-right">{fmt(p.total_ventas)}</td>
                        <td className="py-3 text-right font-semibold text-[#C9A84C]">{fmt(p.comision)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="pt-3 font-semibold text-[#1a1a1a]">Total</td>
                      <td />
                      <td className="pt-3 text-right font-semibold">{fmt(totalPendiente)}</td>
                      <td className="pt-3 text-right font-bold text-[#C9A84C] text-base">{fmt(comisionPendiente)}</td>
                    </tr>
                  </tfoot>
                </table>

                <button
                  onClick={liquidar}
                  disabled={guardando || exito}
                  className="w-full py-4 bg-[#1a1a1a] text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-black transition-colors"
                >
                  {guardando
                    ? <><Loader2 size={16} className="animate-spin" /> Procesando...</>
                    : exito
                    ? <><CheckCircle size={16} /> ¡Liquidado!</>
                    : `✅ Liquidar período — pagar ${fmt(comisionPendiente)}`}
                </button>
              </>
            )}
          </div>

          {/* Historial */}
          {liquidaciones.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8a7a6a]">Historial de liquidaciones</p>
              {liquidaciones.map(liq => (
                <div key={liq.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandido(expandido === liq.id ? null : liq.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#1a1a1a]">
                        {fmtDate(liq.fecha_inicio)} → {fmtDate(liq.fecha_fin)}
                      </p>
                      <p className="text-xs text-[#8a7a6a] mt-0.5">
                        Liquidado el {fmtDate(liq.fecha_liquidacion.split('T')[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-[#8a7a6a]">Total ventas</p>
                        <p className="text-sm font-semibold">{fmt(liq.total_general)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#8a7a6a]">Comisiones</p>
                        <p className="text-sm font-bold text-[#C9A84C]">{fmt(liq.total_comisiones)}</p>
                      </div>
                      {expandido === liq.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {expandido === liq.id && (
                    <div className="px-5 pb-4 border-t border-gray-100">
                      <table className="w-full text-sm mt-3">
                        <thead>
                          <tr className="text-xs text-[#8a7a6a] uppercase tracking-wider">
                            <th className="text-left pb-2">Profesional</th>
                            <th className="text-right pb-2">Ventas</th>
                            <th className="text-right pb-2 text-[#C9A84C]">Pagado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(liq.detalle || []).map(d => (
                            <tr key={d.profesional_id} className="border-t border-gray-50">
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color || '#888' }} />
                                  {d.nombre}
                                </div>
                              </td>
                              <td className="py-2 text-right">{fmt(d.total_ventas)}</td>
                              <td className="py-2 text-right font-semibold text-[#C9A84C]">{fmt(d.comision)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
