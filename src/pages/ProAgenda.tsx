import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SERVICIOS, CREAR_URL } from '../data/bookingData'
import { LogOut, Plus, Lock, ChevronLeft, ChevronRight, Clock, User, X, CheckCircle, XCircle, Loader2, Calendar, Trash2 } from 'lucide-react'
import { updateAppointmentStatus } from '../lib/ghl'

interface Cita {
  id: string
  fecha: string
  start_time: string
  end_time: string
  titulo: string
  cliente_nombre: string
  cliente_telefono: string | null
  status: string
  ghl_event_id?: string | null
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

const VAPID_PUBLIC = 'BCEePlXRzxGGdMBwAIxLtL6NcWaX1j6kLi9MIa9963VqwB9A57ZZ6MTt6kyyPVUxwRAU4prFTZqMZBYRHr3nh4s'
const GHL_TOKEN = 'pit-022a5206-1196-4066-8957-50cf5634da09'
const GHL_LOC   = '0zeAaf3V1WrlkbyD4tJo'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function ProAgenda({ profesionalId, nombre, onLogout }: Props) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaLocal(new Date()))
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'nueva_cita' | 'bloquear' | null>(null)
  const [pushActivo, setPushActivo] = useState(false)

  useEffect(() => { cargarCitas() }, [fechaSeleccionada])
  useEffect(() => { registrarPush() }, [profesionalId])

  async function registrarPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return

      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
      })

      // Save subscription to Supabase
      await supabase.from('push_subscriptions').upsert({
        profesional_id: profesionalId,
        subscription: sub.toJSON(),
      }, { onConflict: 'profesional_id,subscription' })

      setPushActivo(true)
    } catch (e) {
      console.warn('Push no disponible:', e)
    }
  }

  async function eliminarBloqueo(cita: Cita) {
    if (!confirm('¿Eliminar este bloqueo?')) return
    try {
      // Eliminar en GHL si tenemos el event ID
      if (cita.ghl_event_id) {
        await fetch(`https://services.leadconnectorhq.com/calendars/events/block-slots/${cita.ghl_event_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${GHL_TOKEN}`,
            'Version': '2021-04-15',
          },
        })
      }
      // Eliminar en Supabase
      await supabase.from('citas').delete().eq('id', cita.id)
      cargarCitas()
    } catch (e) {
      alert('Error al eliminar: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function marcarAsistio(id: string) {
    await supabase.from('citas').update({ status: 'showed' }).eq('id', id)
    updateAppointmentStatus(id, 'showed')
    cargarCitas()
  }

  async function marcarNoShow(id: string) {
    await supabase.from('citas').update({ status: 'noshow' }).eq('id', id)
    updateAppointmentStatus(id, 'noshow')
    cargarCitas()
  }

  async function cargarCitas() {
    setLoading(true)
    const { data } = await supabase
      .from('citas')
      .select('id, fecha, start_time, end_time, titulo, cliente_nombre, cliente_telefono, status, ghl_event_id')
      .eq('profesional_id', profesionalId)
      .eq('fecha', fechaSeleccionada)
      .neq('status', 'cancelled')
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
    if (s === 'noshow') return 'bg-red-100 text-red-500'
    if (s === 'cancelled') return 'bg-red-100 text-red-600'
    if (s === 'blocked') return 'bg-gray-100 text-gray-500'
    return 'bg-amber-50 text-amber-700'
  }

  function statusLabel(s: string) {
    if (s === 'showed') return 'Asistió'
    if (s === 'noshow') return 'No asistió'
    if (s === 'cancelled') return 'Cancelada'
    if (s === 'blocked') return 'Bloqueado'
    if (s === 'confirmed') return 'Confirmada'
    if (s === 'new') return 'Nueva'
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
        <div className="flex items-center gap-2">
          {pushActivo && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">🔔 Notif. activas</span>}
          <button onClick={onLogout} className="p-2 rounded-xl hover:bg-gray-100 text-[#8a7a6a]">
            <LogOut size={18} />
          </button>
        </div>
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
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-[#8a7a6a]">
                    <Clock size={11} />
                    <span>{formatHora(c.start_time)} — {formatHora(c.end_time)}</span>
                  </div>
                  {c.status === 'blocked' && (
                    <button onClick={() => eliminarBloqueo(c)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={12} /> Eliminar
                    </button>
                  )}
                </div>
                {(c.status === 'confirmed' || c.status === 'new') && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => marcarAsistio(c.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 text-white rounded-xl text-xs font-medium hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle size={13} /> Asistió
                    </button>
                    <button
                      onClick={() => marcarNoShow(c.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-400 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <XCircle size={13} /> No asistió
                    </button>
                  </div>
                )}
                {c.status === 'showed' && (
                  <div className="mt-3 flex items-center justify-center gap-1 py-2 bg-green-50 rounded-xl text-xs font-medium text-green-600">
                    <CheckCircle size={13} /> Asistió ✓
                  </div>
                )}
                {c.status === 'noshow' && (
                  <div className="mt-3 flex items-center justify-center gap-1 py-2 bg-red-50 rounded-xl text-xs font-medium text-red-400">
                    <XCircle size={13} /> No asistió
                  </div>
                )}
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

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function SelectorFecha({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [anio, mes, dia] = value.split('-').map(Number)
  const hoy = new Date()
  const anioActual = hoy.getFullYear()
  const diasEnMes = new Date(anio, mes, 0).getDate()

  function update(nuevoAnio: number, nuevoMes: number, nuevoDia: number) {
    const maxDia = new Date(nuevoAnio, nuevoMes, 0).getDate()
    const diaFinal = Math.min(nuevoDia, maxDia)
    onChange(`${nuevoAnio}-${String(nuevoMes).padStart(2,'0')}-${String(diaFinal).padStart(2,'0')}`)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select value={dia} onChange={e => update(anio, mes, Number(e.target.value))}
        className="px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C9A84C]">
        {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select value={mes} onChange={e => update(anio, Number(e.target.value), dia)}
        className="px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C9A84C]">
        {MESES_ES.map((m, i) => (
          <option key={i+1} value={i+1}>{m}</option>
        ))}
      </select>
      <select value={anio} onChange={e => update(Number(e.target.value), mes, dia)}
        className="px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C9A84C]">
        {[anioActual, anioActual + 1].map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  )
}

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

      // 1. Bloquear en GHL para que aparezca en el calendario
      const ghlRes = await fetch('https://services.leadconnectorhq.com/calendars/events/block-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-04-15',
        },
        body: JSON.stringify({
          locationId: GHL_LOC,
          startTime: startISO,
          endTime: endISO,
          title: `Bloqueado - ${motivo}`,
          assignedUserId: profesionalId,
        }),
      })
      if (!ghlRes.ok) {
        const ghlData = await ghlRes.json().catch(() => ({}))
        throw new Error(ghlData?.message || `GHL error ${ghlRes.status}`)
      }
      const ghlData = await ghlRes.json()
      const ghlEventId = ghlData?.id || ghlData?.event?.id || null

      // 2. Guardar en Supabase para que aparezca en el panel
      const { error: sbErr } = await supabase.from('citas').insert({
        id: crypto.randomUUID(),
        fecha,
        start_time: startISO,
        end_time: endISO,
        titulo: `🔒 ${motivo}`,
        cliente_nombre: '',
        profesional_id: profesionalId,
        profesional_nombre: profesionalNombre,
        status: 'blocked',
        origen: 'bloqueo',
        ghl_event_id: ghlEventId,
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
            <SelectorFecha value={fecha} onChange={setFecha} />
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
