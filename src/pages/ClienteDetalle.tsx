import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Venta {
  id: string
  fecha_cita: string
  hora_cita: string
  servicios: { nombre: string; precio: number }[]
  total: number
  metodo_pago: string
  profesional_nombre: string
  notas?: string
}

interface Abono {
  id: string
  monto: number
  fecha: string
  notas: string
  profesional_nombre: string
}

interface Ficha {
  notas: string
  alergias: string
  formula_color: string
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
  de_la_casa: 'De la casa',
}

function fmtDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function ClienteDetalle({ rol = 'admin' }: { rol?: string }) {
  const { telefono } = useParams<{ telefono: string }>()
  const { state } = useLocation() as { state: { nombre: string; telefono: string; visitas: number; total_gastado: number } }
  const navigate = useNavigate()

  const tel = decodeURIComponent(telefono || '')
  const nombre = state?.nombre || tel
  const esAdmin = rol === 'admin'

  const [ventas, setVentas] = useState<Venta[]>([])
  const [abonos, setAbonos] = useState<Abono[]>([])
  const [ficha, setFicha] = useState<Ficha>({ notas: '', alergias: '', formula_color: '' })
  const [, setFichaId] = useState<string | null>(null)
  const [tab, setTab] = useState<'historial' | 'ficha' | 'abonos'>('historial')
  const [loading, setLoading] = useState(true)
  const [guardandoFicha, setGuardandoFicha] = useState(false)
  const [fichaGuardada, setFichaGuardada] = useState(false)

  // Nuevo abono
  const [nuevoAbono, setNuevoAbono] = useState({ monto: '', fecha: new Date().toISOString().split('T')[0], notas: '' })
  const [guardandoAbono, setGuardandoAbono] = useState(false)

  useEffect(() => { cargar() }, [tel])

  async function cargar() {
    setLoading(true)
    const [ventasRes, fichaRes, abonosRes] = await Promise.all([
      supabase.from('ventas').select('*').eq('cliente_telefono', tel).order('fecha_cita', { ascending: false }),
      supabase.from('fichas_tecnicas').select('*').eq('cliente_telefono', tel).maybeSingle(),
      supabase.from('abonos').select('*').eq('cliente_telefono', tel).order('fecha', { ascending: false }),
    ])
    console.log('tel:', tel, 'ficha:', fichaRes.data, 'error:', fichaRes.error)

    setVentas((ventasRes.data || []) as Venta[])
    if (fichaRes.data) {
      setFicha({ notas: fichaRes.data.notas || '', alergias: fichaRes.data.alergias || '', formula_color: fichaRes.data.formula_color || '' })
      setFichaId(fichaRes.data.id)
    }
    setAbonos((abonosRes.data || []) as Abono[])
    setLoading(false)
  }

  async function guardarFicha() {
    setGuardandoFicha(true)
    const { error } = await supabase
      .from('fichas_tecnicas')
      .upsert({ cliente_telefono: tel, cliente_nombre: nombre, ...ficha, updated_at: new Date().toISOString() }, { onConflict: 'cliente_telefono' })
      .select()
      .single()
    if (error) {
      alert('Error guardando ficha: ' + error.message)
      setGuardandoFicha(false)
      return
    }
    setGuardandoFicha(false)
    setFichaGuardada(true)
    setTimeout(() => setFichaGuardada(false), 2000)
    await cargar()
  }

  async function agregarAbono() {
    if (!nuevoAbono.monto || !nuevoAbono.fecha) return
    setGuardandoAbono(true)
    await supabase.from('abonos').insert({
      cliente_telefono: tel,
      cliente_nombre: nombre,
      monto: parseFloat(nuevoAbono.monto.replace(/\D/g, '')),
      fecha: nuevoAbono.fecha,
      notas: nuevoAbono.notas,
    })
    setNuevoAbono({ monto: '', fecha: new Date().toISOString().split('T')[0], notas: '' })
    setGuardandoAbono(false)
    await cargar()
  }

  async function eliminarAbono(id: string) {
    await supabase.from('abonos').delete().eq('id', id)
    setAbonos(prev => prev.filter(a => a.id !== id))
  }

  const totalAbonos = abonos.reduce((s, a) => s + (a.monto || 0), 0)
  const totalGastado = ventas.filter(v => v.metodo_pago !== 'de_la_casa').reduce((s, v) => s + (v.total || 0), 0)

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/clientes')} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="font-serif text-lg font-light">{nombre}</h2>
          {esAdmin && <p className="text-xs text-[#8a7a6a]">{tel}</p>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-2xl font-serif font-light text-[#C9A84C]">{ventas.length}</p>
          <p className="text-xs text-[#8a7a6a] mt-0.5">Visitas</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-lg font-semibold text-[#1a1a1a]">${(totalGastado / 1000).toFixed(0)}k</p>
          <p className="text-xs text-[#8a7a6a] mt-0.5">Total gastado</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-lg font-semibold text-[#C9A84C]">${(totalAbonos / 1000).toFixed(0)}k</p>
          <p className="text-xs text-[#8a7a6a] mt-0.5">En abonos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mb-4 bg-white rounded-2xl p-1 shadow-sm">
        {(['historial', 'ficha', 'abonos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize ${tab === t ? 'bg-[#1a1a1a] text-white' : 'text-[#8a7a6a] hover:text-[#1a1a1a]'}`}>
            {t === 'historial' ? 'Historial' : t === 'ficha' ? 'Ficha Técnica' : 'Abonos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#8a7a6a]" /></div>
      ) : (
        <div className="px-4">

          {/* HISTORIAL */}
          {tab === 'historial' && (
            <div className="space-y-3">
              {ventas.length === 0 ? (
                <p className="text-center text-sm text-[#8a7a6a] py-10">Sin visitas registradas</p>
              ) : ventas.map(v => (
                <div key={v.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a1a]">{fmtDate(v.fecha_cita)} {v.hora_cita && `· ${v.hora_cita}`}</p>
                      <p className="text-xs text-[#8a7a6a]">{v.profesional_nombre} · {METODO_LABEL[v.metodo_pago] || v.metodo_pago}</p>
                    </div>
                    <span className={`text-sm font-bold ${v.metodo_pago === 'de_la_casa' ? 'text-purple-500' : 'text-[#C9A84C]'}`}>
                      ${(v.total || 0).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {(v.servicios || []).map((s, i) => (
                      <div key={i} className="flex justify-between text-xs text-[#8a7a6a]">
                        <span>{s.nombre}</span>
                        <span>${(s.precio || 0).toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                  {v.notas && <p className="text-xs text-gray-400 mt-2 italic">"{v.notas}"</p>}
                </div>
              ))}
            </div>
          )}

          {/* FICHA TÉCNICA */}
          {tab === 'ficha' && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] block mb-2">Alergias / Contraindicaciones</label>
                <textarea
                  value={ficha.alergias}
                  onChange={e => setFicha(f => ({ ...f, alergias: e.target.value }))}
                  rows={2}
                  placeholder="Ej: alérgica al amoniaco, sensibilidad en cuero cabelludo..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] block mb-2">Fórmula de color / Técnica</label>
                <textarea
                  value={ficha.formula_color}
                  onChange={e => setFicha(f => ({ ...f, formula_color: e.target.value }))}
                  rows={3}
                  placeholder="Ej: Rubio 7.3 + 20vol, mechas con papel aluminio, tiempo 35min..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] block mb-2">Notas generales / Preferencias</label>
                <textarea
                  value={ficha.notas}
                  onChange={e => setFicha(f => ({ ...f, notas: e.target.value }))}
                  rows={3}
                  placeholder="Ej: prefiere secado natural, le gustan las uñas cortas, clienta frecuente de Laura..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>
              <button
                onClick={guardarFicha}
                disabled={guardandoFicha}
                className="w-full py-3 bg-[#1a1a1a] text-white rounded-2xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50"
              >
                {guardandoFicha ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {fichaGuardada ? '¡Guardado!' : 'Guardar ficha'}
              </button>
            </div>
          )}

          {/* ABONOS */}
          {tab === 'abonos' && (
            <div className="space-y-3">
              {/* Nuevo abono */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Registrar abono</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5">
                      <span className="text-sm text-[#8a7a6a] mr-1">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={nuevoAbono.monto}
                        onChange={e => setNuevoAbono(a => ({ ...a, monto: e.target.value.replace(/\D/g, '') }))}
                        placeholder="Monto"
                        className="w-full text-sm focus:outline-none"
                      />
                    </div>
                    <input
                      type="date"
                      value={nuevoAbono.fecha}
                      onChange={e => setNuevoAbono(a => ({ ...a, fecha: e.target.value }))}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <input
                    type="text"
                    value={nuevoAbono.notas}
                    onChange={e => setNuevoAbono(a => ({ ...a, notas: e.target.value }))}
                    placeholder="Notas (opcional)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                  />
                  <button
                    onClick={agregarAbono}
                    disabled={guardandoAbono || !nuevoAbono.monto}
                    className="w-full py-3 bg-[#C9A84C] text-white rounded-2xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#b8963e] disabled:opacity-40"
                  >
                    {guardandoAbono ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Agregar abono
                  </button>
                </div>
              </div>

              {/* Lista abonos */}
              {abonos.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-gray-50">
                    <p className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a]">Historial de abonos</p>
                    <p className="text-sm font-bold text-[#C9A84C]">Total: ${totalAbonos.toLocaleString('es-CO')}</p>
                  </div>
                  {abonos.map(a => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-[#C9A84C]">${(a.monto || 0).toLocaleString('es-CO')}</p>
                        <p className="text-xs text-[#8a7a6a]">{fmtDate(a.fecha)}{a.notas ? ` · ${a.notas}` : ''}</p>
                      </div>
                      <button onClick={() => eliminarAbono(a.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {abonos.length === 0 && (
                <p className="text-center text-sm text-[#8a7a6a] py-8">Sin abonos registrados</p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
