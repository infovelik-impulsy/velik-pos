import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseAdmin } from '../lib/supabase'
import type { Venta, Gasto } from '../types'

export default function Caja({ rol = 'admin' }: { rol?: string }) {
  const navigate = useNavigate()
  const puedeGestionar = rol === 'admin' || rol === 'recepcion'
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showGasto, setShowGasto] = useState(false)
  const [gDesc, setGDesc] = useState('')
  const [gMonto, setGMonto] = useState('')
  const [gCat, setGCat] = useState('operativo')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: v }, { data: g }] = await Promise.all([
      supabase.from('ventas').select('*').eq('fecha', hoy).order('created_at', { ascending: false }),
      supabase.from('gastos').select('*').eq('fecha', hoy).order('created_at', { ascending: false }),
    ])
    setVentas(v || [])
    setGastos(g || [])
    setLoading(false)
  }

  async function agregarGasto() {
    if (!gDesc || !gMonto) return
    await supabase.from('gastos').insert({ descripcion: gDesc, monto: Number(gMonto), categoria: gCat })
    setGDesc(''); setGMonto(''); setShowGasto(false)
    load()
  }

  async function eliminarGasto(id: string) {
    const { error } = await supabaseAdmin.from('gastos').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar gasto: ' + error.message)
      return
    }
    load()
  }

  async function eliminarVenta(v: Venta) {
    if (!confirm(`¿Eliminar venta de ${v.cliente_nombre} por $${v.total.toLocaleString('es-CO')}? Esta acción no se puede deshacer.`)) return
    // Verify the row exists first
    const { data: check, error: checkErr } = await supabaseAdmin.from('ventas').select('id').eq('id', v.id).maybeSingle()
    if (checkErr) {
      alert('Error al verificar: ' + checkErr.message)
      return
    }
    if (!check) {
      alert('Diagnóstico: la fila NO existe para el service key.\nID buscado: ' + v.id + '\nEsto confirma problema de permisos o tabla incorrecta.')
      return
    }
    const { error } = await supabaseAdmin.from('ventas').delete().eq('id', v.id)
    if (error) {
      alert('Error al eliminar: ' + error.message + ' | código: ' + error.code)
      return
    }
    load()
  }

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0)
  const totalEfectivo = ventas.reduce((s, v) => s + v.pagado_efectivo, 0)
  const totalDigital = ventas.reduce((s, v) => s + v.pagado_digital, 0)
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const saldoNeto = totalVentas - totalGastos

  if (loading) return <div className="text-center py-12 text-[#8a7a6a]">Cargando...</div>

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-light">Caja del día</h2>
          <p className="text-xs text-[#8a7a6a] capitalize">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
        </div>
      </div>

      {/* Resumen cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <TrendingUp size={18} className="text-green-500 mx-auto mb-1" />
          <p className="text-lg font-semibold">${totalVentas.toLocaleString('es-CO')}</p>
          <p className="text-xs text-[#8a7a6a]">Ingresos</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <TrendingDown size={18} className="text-red-400 mx-auto mb-1" />
          <p className="text-lg font-semibold">${totalGastos.toLocaleString('es-CO')}</p>
          <p className="text-xs text-[#8a7a6a]">Gastos</p>
        </div>
        <div className={`rounded-2xl p-4 text-center shadow-sm ${saldoNeto >= 0 ? 'bg-[#C9A84C]' : 'bg-red-50'}`}>
          <Wallet size={18} className={`mx-auto mb-1 ${saldoNeto >= 0 ? 'text-white' : 'text-red-400'}`} />
          <p className={`text-lg font-semibold ${saldoNeto >= 0 ? 'text-white' : 'text-red-600'}`}>${saldoNeto.toLocaleString('es-CO')}</p>
          <p className={`text-xs ${saldoNeto >= 0 ? 'text-white/80' : 'text-red-400'}`}>Neto</p>
        </div>
      </div>

      {/* Método de pago breakdown */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Por método de pago</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">💵 Efectivo</span>
            <span className="font-medium">${totalEfectivo.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">📱 Digital (transfer/tarjeta)</span>
            <span className="font-medium">${totalDigital.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* Ventas del día */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">
          Ventas ({ventas.length})
        </h3>
        {ventas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Sin ventas registradas hoy</p>
        ) : (
          <div className="space-y-3">
            {ventas.map(v => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium">{v.cliente_nombre}</p>
                  <p className="text-xs text-[#8a7a6a]">{v.profesional_nombre} · {v.metodo_pago}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#C9A84C]">${v.total.toLocaleString('es-CO')}</span>
                  {puedeGestionar && (
                    <>
                      <button
                        onClick={() => navigate('/editar-venta', { state: { ventaId: v.id, clienteNombre: v.cliente_nombre } })}
                        className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => eliminarVenta(v)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gastos */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a]">Gastos ({gastos.length})</h3>
          <button onClick={() => setShowGasto(s => !s)} className="flex items-center gap-1 text-xs text-[#C9A84C] font-medium">
            <Plus size={14} /> Agregar
          </button>
        </div>

        {showGasto && (
          <div className="bg-[#f5f4f0] rounded-xl p-3 mb-3 space-y-2">
            <input
              value={gDesc}
              onChange={e => setGDesc(e.target.value)}
              placeholder="Descripción"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={gMonto}
                  onChange={e => setGMonto(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
                />
              </div>
              <select
                value={gCat}
                onChange={e => setGCat(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white"
              >
                <option value="operativo">Operativo</option>
                <option value="insumos">Insumos</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <button
              onClick={agregarGasto}
              className="w-full py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium"
            >
              Guardar gasto
            </button>
          </div>
        )}

        {gastos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Sin gastos registrados</p>
        ) : (
          <div className="space-y-2">
            {gastos.map(g => (
              <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm">{g.descripcion}</p>
                  <p className="text-xs text-[#8a7a6a]">{g.categoria}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-red-500">${g.monto.toLocaleString('es-CO')}</span>
                  <button onClick={() => eliminarGasto(g.id)} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
