import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PROFESIONALES, SERVICIOS, CREAR_URL } from '../data/bookingData'
import { LogOut, Plus, Lock, ChevronLeft, ChevronRight, Clock, User, X, CheckCircle, Loader2, Calendar } from 'lucide-react'

interface Cita {
  id: string
  fecha: string
  start_time: string
  end_time: string
  titulo: string
  cliente_nombre: string
  cliente_telefono: string | null
  status: string
}

interface Props {
  profesionalId: string
  nombre: string
  onLogout: () => void
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function toColombiaDate(date: Date) {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}

function fechaLocal(date: Date) {
  const d = toColombiaDate(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function ProAgenda({ profesionalId, nombre, onLogout }: Props) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaLocal(new Date()))
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'nueva_cita' | 'bloquear' | null>(null)


  useEffect(() => { cargarCitas() }, [fechaSeleccionada])

  async function cargarCitas() {
    setLoading(true)
    const { data } = await supabase
      .from('citas')
      .select('id, fecha, start_time, end_time, titulo, cliente_nombre, cliente_telefono, status')
      .eq('profesional_id', profesionalId)
      .eq('fecha', fechaSeleccionada)
      .order('start_time')
    setCitas(data || [])
    setLoading(false)
  }

  function moverDia(delta: number) {
    const d = new Date(fechaSeleccionada + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setFechaSeleccionada(fechaLocal(d))
  }

  const fechaObj = new Date(fechaSeleccionada + 'T12:00:00')
  const esHoy = fechaSeleccionada === fechaLocal(new Date())
  const labelFecha = esHoy ? 'Hoy' : `${DIAS[fechaObj.getDay()]} ${fechaObj.getDate()} de ${MESES[fechaObj.getMonth()]}`

  function formatHora(iso: string) {
    const d = new Date(iso)
    const co = toColombiaDate(d)
    const h = co.getHours()
    const m = String(co.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${m} ${ampm}`
  }

  function statusColor(s: string) {
    if (s === 'showed') return 'bg-green-100 text-green-700'
    if (s === 'cancelled') return 'bg-red-100 text-red-600'
    if (s === 'blocked') return 'bg-gray-100 text-gray-500'
    return 'bg-amber-50 text-amber-700'
  }

  function statusLabel(s: string) {
    if (s === 'showed') return 'Asistió'
    if (s === 'cancelled') return 'Cancelada'
    if (s === 'blocked') return 'Bloqueado'
    if (s === 'confirmed') return 'Confirmada'
    return s
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-light tracking-widest text-[#1a1a1a]">VELIK</h1>
          <p className="text-xs text-[#8a7a6a] mt-0.5">{nombre}</p>
        </div>
        <button onClick={onLogout} className="p-2 rounded-xl hover:bg-gray-100 text-[#8a7a6a]">
          <LogOut size={18} />
        </button>
      </div>

      {/* Semana rápida */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() + i)
            const f = fechaLocal(d)
            const activo = f === fechaSeleccionada
            return (
              <button
                key={f}
                onClick={() => setFechaSeleccionada(f)}
                className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs transition-all ${
                  activo ? 'bg-[#C9A84C] text-white' : 'bg-[#f5f4f0] text-[#8a7a6a] hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">{DIAS[d.getDay()]}</span>
                <span className="text-base font-semibold mt-0.5">{d.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navegación de fecha */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => moverDia(-1)} className="p-2 rounded-xl bg-white border border-gray-200 hover:border-[#C9A84C]">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-[#1a1a1a]">{labelFecha}</p>
          {!esHoy && <p className="text-xs text-[#8a7a6a]">{fechaObj.getDate()} de {MESES[fechaObj.getMonth()]} {fechaObj.getFullYear()}</p>}
        </div>
        <button onClick={() => moverDia(1)} className="p-2 rounded-xl bg-white border border-gray-200 hover:border-[#C9A84C]">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Lista de citas */}
      <div className="px-4 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#8a7a6a]">
            <Loader2 size={20} className="animate-spin mr-2" /> Cargando...
          </div>
        ) : citas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#8a7a6a]">
            <Calendar size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No hay citas para este día</p>
          </div>
        ) : (
          <div className="space-y-3">
            {citas.map(c => (
              <div key={c.id} className={`bg-white rounded-2xl p-4 border-l-4 shadow-sm ${
                c.status === 'blocked' ? 'border-gray-300' :
                c.status === 'cancelled' ? 'border-red-300' :
                c.status === 'showed' ? 'border-green-400' : 'border-[#C9A84C]'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-[#1a1a1a] text-sm">{c.titulo}</p>
                    {c.cliente_nombre && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-[#8a7a6a]">
                        <User size={11} />
                        <span>{c.cliente_nombre}</span>
                        {c.cliente_telefono && <span>· {c.cliente_telefono}</span>}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-[#8a7a6a]">
                  <Clock size={11} />
                  <span>{formatHora(c.start_time)} — {formatHora(c.end_time)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FABs */}
      <div className="fixed bottom-6 right-4 flex flex-col gap-3 items-end">
        <button
          onClick={() => setModal('bloquear')}
          className="flex items-center gap-2 bg-white border border-gray-200 text-[#8a7a6a] px-4 py-3 rounded-2xl shadow-md text-sm font-medium hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all"
        >
          <Lock size={16} /> Bloquear horario
        </button>
        <button
          onClick={() => setModal('nueva_cita')}
          className="flex items-center gap-2 bg-[#C9A84C] text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium hover:bg-[#b8963e] transition-all"
        >
          <Plus size={16} /> Nueva cita
        </button>
      </div>

      {/* Modal Nueva Cita */}
      {modal === 'nueva_cita' && (
        <ModalNuevaCita
          profesionalId={profesionalId}
          onClose={() => setModal(null)}
          onCreada={() => { setModal(null); cargarCitas() }}
        />
      )}

      {/* Modal Bloquear */}
      {modal === 'bloquear' && (
        <ModalBloquear
          profesionalId={profesionalId}
          profesionalNombre={nombre}
          fechaInicial={fechaSeleccionada}
          onClose={() => setModal(null)}
          onBloqueado={() => { setModal(null); cargarCitas() }}
        />
      )}
    </div>
  )
}

// ─── Modal Nueva Cita ────────────────────────────────────────────────────────

function ModalNuevaCita({ profesionalId, onClose, onCreada }: {
  profesionalId: string
  onClose: () => void; onCreada: () => void
}) {
  const [categoria, setCategoria] = useState('')
  const [servicio, setServicio] = useState<{ nombre: string; calendarId: string; duracion: number; precio: string } | null>(null)
  const [slots, setSlots] = useState<{ label: string; date: string; slot: string }[]>([])
  const [fechaSlot, setFechaSlot] = useState<string | null>(null)
  const [slotSel, setSlotSel] = useState<{ label: string; date: string; slot: string } | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const { SLOTS_URL } = { SLOTS_URL: 'https://santiagon8nmejia.dominadoresia.com/webhook/booking/slots' }

  const CATS = Object.keys(SERVICIOS).filter(cat =>
    SERVICIOS[cat].some(s => !s.profesionales || s.profesionales.includes(profesionalId))
  )

  async function fetchSlots(calendarId: string) {
    setLoadingSlots(true); setSlots([]); setFechaSlot(null); setSlotSel(null)
    const start = new Date(); start.setHours(0,0,0,0)
    const end = new Date(start); end.setDate(end.getDate() + 30)
    try {
      const r = await fetch(`${SLOTS_URL}?calendarId=${calendarId}&startDate=${start.getTime()}&endDate=${end.getTime()}&userId=${profesionalId}`)
      const data = await r.json()
      setSlots(data.slots || [])
    } catch { setError('Error al cargar horarios') }
    setLoadingSlots(false)
  }

  async function crear() {
    if (!servicio || !slotSel || !nombre || !telefono) return
    setGuardando(true); setError('')
    try {
      const r = await fetch(CREAR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: servicio.calendarId,
          slot: slotSel.slot,
          nombre,
          telefono: telefono.startsWith('+') ? telefono : '+57' + telefono.replace(/\D/g, ''),
          email: '',
          servicio: servicio.nombre,
          duracion: servicio.duracion,
          precio: servicio.precio || '',
          userId: profesionalId,
        }),
      })
      const data = await r.json()
      if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`)
      setExito(true)
      setTimeout(onCreada, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setGuardando(false) }
  }

  const fechas = [...new Set(slots.map(s => s.date))]
  const slotsDelDia = fechaSlot ? slots.filter(s => s.date === fechaSlot) : []
  const DIAS_LABEL = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const MESES_LABEL = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-[#f5f4f0] w-full max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-3xl">
          <h2 className="font-semibold text-[#1a1a1a]">Nueva cita</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {exito ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CheckCircle size={48} className="text-green-500 mb-3" />
            <p className="font-medium text-[#1a1a1a]">¡Cita creada!</p>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Categoría */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-2">Categoría</p>
              <div className="flex flex-wrap gap-2">
                {CATS.map(c => (
                  <button key={c} onClick={() => { setCategoria(c); setServicio(null); setSlots([]); setFechaSlot(null); setSlotSel(null) }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${categoria === c ? 'bg-[#C9A84C] text-white' : 'bg-white border border-gray-200 text-[#1a1a1a]'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Servicio */}
            {categoria && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-2">Servicio</p>
                <div className="grid grid-cols-1 gap-2">
                  {SERVICIOS[categoria]
                    .filter(s => !s.profesionales || s.profesionales.includes(profesionalId))
                    .map(s => (
                      <button key={s.calendarId}
                        onClick={() => { setServicio(s); fetchSlots(s.calendarId) }}
                        className={`text-left px-3 py-2.5 rounded-xl border transition-all ${servicio?.calendarId === s.calendarId ? 'border-[#C9A84C] bg-[#faf6ee]' : 'border-gray-200 bg-white'}`}>
                        <p className="text-sm font-medium">{s.nombre}</p>
                        <p className="text-xs text-[#8a7a6a]">{s.duracion} min · {s.precio}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Fecha y hora */}
            {servicio && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-2">Fecha y hora</p>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-[#8a7a6a] py-3"><Loader2 size={14} className="animate-spin" /> Buscando...</div>
                ) : (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                      {fechas.map(f => {
                        const d = new Date(f + 'T12:00:00')
                        return (
                          <button key={f} onClick={() => setFechaSlot(f)}
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${fechaSlot === f ? 'bg-[#C9A84C] text-white' : 'bg-white border border-gray-200'}`}>
                            {DIAS_LABEL[d.getDay()]} {d.getDate()} {MESES_LABEL[d.getMonth()]}
                          </button>
                        )
                      })}
                    </div>
                    {fechaSlot && (
                      <div className="flex flex-wrap gap-2">
                        {slotsDelDia.map(s => (
                          <button key={s.slot} onClick={() => setSlotSel(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-all ${slotSel?.slot === s.slot ? 'bg-[#C9A84C] text-white' : 'bg-white border border-gray-200'}`}>
                            <Clock size={11} /> {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Datos cliente */}
            {slotSel && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-2">Datos de la clienta</p>
                <div className="space-y-2">
                  <input value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Nombre y apellido"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C9A84C]" />
                  <input value={telefono} onChange={e => setTelefono(e.target.value)}
                    placeholder="Teléfono (ej: 3001234567)" inputMode="tel"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C9A84C]" />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500">Error: {error}</p>}

            {slotSel && nombre && telefono.replace(/\D/g,'').length >= 10 && (
              <button onClick={crear} disabled={guardando}
                className="w-full py-4 bg-[#C9A84C] text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {guardando ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : <><CheckCircle size={16} /> Confirmar · {slotSel.label}</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal Bloquear Horario ──────────────────────────────────────────────────

function ModalBloquear({ profesionalId, profesionalNombre, fechaInicial, onClose, onBloqueado }: {
  profesionalId: string; profesionalNombre: string; fechaInicial: string
  onClose: () => void; onBloqueado: () => void
}) {
  const [fecha, setFecha] = useState(fechaInicial)
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('10:00')
  const [motivo, setMotivo] = useState('Personal')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const MOTIVOS = ['Almuerzo', 'Personal', 'Vacaciones', 'Capacitación', 'Otro']

  async function bloquear() {
    setGuardando(true); setError('')
    try {
      const startISO = `${fecha}T${horaInicio}:00-05:00`
      const endISO   = `${fecha}T${horaFin}:00-05:00`

      // Guardar en Supabase para que aparezca en el panel
      const { error: sbErr } = await supabase.from('citas').insert({
        fecha,
        start_time: startISO,
        end_time: endISO,
        titulo: `🔒 ${motivo}`,
        cliente_nombre: '',
        profesional_id: profesionalId,
        profesional_nombre: profesionalNombre,
        status: 'blocked',
        origen: 'bloqueo',
      })
      if (sbErr) throw new Error(sbErr.message)
      onBloqueado()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setGuardando(false) }
  }

  const valido = fecha && horaInicio < horaFin

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-[#f5f4f0] w-full rounded-t-3xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-3xl">
          <h2 className="font-semibold text-[#1a1a1a]">Bloquear horario</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-2">Motivo</p>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS.map(m => (
                <button key={m} onClick={() => setMotivo(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${motivo === m ? 'bg-[#C9A84C] text-white' : 'bg-white border border-gray-200'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-2">Fecha</p>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-2">Desde</p>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-2">Hasta</p>
              <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C9A84C]" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button onClick={bloquear} disabled={guardando || !valido}
            className="w-full py-4 bg-[#1a1a1a] text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            {guardando ? <><Loader2 size={16} className="animate-spin" /> Bloqueando...</> : <><Lock size={16} /> Confirmar bloqueo</>}
          </button>
        </div>
      </div>
    </div>
  )
}
