import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { CATEGORIAS, SERVICIOS, PROFESIONALES, SLOTS_URL, CREAR_URL } from '../data/bookingData'
import type { Servicio, Profesional } from '../data/bookingData'
import ContactSearch from '../components/ContactSearch'
import { supabase } from '../lib/supabase'
import { crearCitaForzada } from '../lib/ghl'

// forced = slot generado localmente para HOY (se agenda de forma forzada,
// saltando la validación del webhook: cualquier hora libre, aunque ya pasó)
interface Slot { label: string; date: string; slot: string; forced?: boolean }

// Horario del salón para generar la grilla de HOY
const SALON_OPEN_HOUR = 9
const SALON_CLOSE_HOUR = 19
const GRID_MIN = 30

function hoyStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export default function NuevaCita({ rol = 'admin' }: { rol?: string }) {
  const navigate = useNavigate()
  const [categoria, setCategoria] = useState<string | null>(null)
  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [profesional, setProfesional] = useState<Profesional | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [precioManual, setPrecioManual] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  const profesionalesDisponibles = servicio
    ? (servicio.profesionales
        ? PROFESIONALES.filter(p => servicio.profesionales!.includes(p.userId))
        : PROFESIONALES)
    : []

  async function crear() {
    if (!servicio || !profesional || !slot || !nombre || !telefono) return
    setGuardando(true); setError('')
    const tel = telefono.startsWith('+') ? telefono : '+57' + telefono.replace(/\D/g, '')
    const precio = servicio.precioEditable
      ? (precioManual ? `$${parseInt(precioManual.replace(/\D/g, '')).toLocaleString('es-CO')}` : '')
      : (servicio.precio || '')
    try {
      if (slot.forced) {
        // Slot de HOY generado localmente → creación forzada (GHL directo + Supabase).
        // No pasa por el webhook porque éste rechaza horas pasadas / que no caben.
        const start = new Date(slot.slot)
        const end = new Date(start.getTime() + (servicio.duracion || GRID_MIN) * 60000)
        const pad = (n: number) => String(n).padStart(2, '0')
        const endISO = `${slot.date}T${pad(end.getHours())}:${pad(end.getMinutes())}:00-05:00`
        const titulo = `${servicio.nombre} - ${nombre}`

        let ghlId: string | null = null
        let contactId: string | undefined
        try {
          const res = await crearCitaForzada({
            calendarId: servicio.calendarId,
            userId: profesional.userId,
            startISO: slot.slot,
            endISO,
            titulo,
            nombre,
            telefono: tel,
          })
          ghlId = res.id
          contactId = res.contactId
        } catch (e) {
          console.error('No se pudo crear en GHL (se guarda solo en el POS):', e)
        }

        const id = ghlId || crypto.randomUUID()
        const { error: sbErr } = await supabase.from('citas').insert({
          id,
          fecha: slot.date,
          start_time: slot.slot,
          end_time: endISO,
          titulo,
          cliente_nombre: nombre,
          cliente_telefono: tel,
          contact_id: contactId,
          profesional_id: profesional.userId,
          profesional_nombre: profesional.nombre,
          calendar_id: servicio.calendarId,
          status: 'confirmed',
          precio: precio || null,
          origen: 'manual_forzada',
          ghl_event_id: ghlId,
        })
        if (sbErr) throw new Error(sbErr.message)
      } else {
        // Slot futuro normal → webhook n8n (crea en GHL + Supabase + dispara confirmaciones)
        const r = await fetch(CREAR_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarId: servicio.calendarId,
            slot: slot.slot,
            nombre,
            telefono: tel,
            email: '',
            servicio: servicio.nombre,
            duracion: servicio.duracion,
            precio,
            userId: profesional.userId,
          }),
        })
        const data = await r.json()
        if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`)
      }
      setExito(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardando(false)
    }
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <CheckCircle size={56} className="text-green-500 mb-4" />
        <p className="text-lg font-medium text-[#1a1a1a]">¡Cita creada!</p>
        <p className="text-sm text-[#8a7a6a]">Ya aparece en la agenda y el calendario</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl bg-white shadow-sm hover:bg-gray-50">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-[#1a1a1a]">Nueva cita</h1>
      </div>

      {/* 1. Categoría */}
      <Seccion titulo="1. Categoría">
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map(c => (
            <Chip key={c} activo={categoria === c} onClick={() => { setCategoria(c); setServicio(null); setProfesional(null); setSlot(null) }}>
              {c}
            </Chip>
          ))}
        </div>
      </Seccion>

      {/* 2. Servicio */}
      {categoria && (
        <Seccion titulo="2. Servicio">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SERVICIOS[categoria].map(s => (
              <button
                key={s.calendarId}
                onClick={() => { setServicio(s); setProfesional(null); setSlot(null) }}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${
                  servicio?.calendarId === s.calendarId
                    ? 'border-[#C9A84C] bg-[#faf6ee]'
                    : 'border-gray-200 bg-white hover:border-[#C9A84C]/50'
                }`}
              >
                <p className="text-sm font-medium text-[#1a1a1a]">{s.nombre}</p>
                <p className="text-xs text-[#8a7a6a]">{s.duracion} min · {s.precio}</p>
              </button>
            ))}
          </div>
        </Seccion>
      )}

      {/* 3. Profesional */}
      {servicio && (
        <Seccion titulo="3. Profesional">
          <div className="flex flex-wrap gap-2">
            {profesionalesDisponibles.map(p => (
              <Chip key={p.userId} activo={profesional?.userId === p.userId} onClick={() => { setProfesional(p); setSlot(null) }}>
                {p.nombre}
              </Chip>
            ))}
          </div>
        </Seccion>
      )}

      {/* 4. Fecha y hora */}
      {servicio && profesional && (
        <Seccion titulo="4. Fecha y hora">
          <SlotPicker servicio={servicio} profesional={profesional} selected={slot} onSelect={setSlot} />
        </Seccion>
      )}

      {/* 5. Precio (solo para servicios de color) */}
      {servicio?.precioEditable && slot && (
        <Seccion titulo="5. Precio del servicio">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
            <p className="text-xs text-amber-700">El precio de este servicio se define según la valoración. Ingresa el valor acordado.</p>
          </div>
          <input
            value={precioManual}
            onChange={e => setPrecioManual(e.target.value.replace(/\D/g, ''))}
            placeholder={`Precio base: ${servicio.precio}`}
            inputMode="numeric"
            className="w-full px-4 py-3 rounded-xl border border-amber-300 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </Seccion>
      )}

      {/* 6. Datos clienta */}
      {slot && (
        <Seccion titulo={servicio?.precioEditable ? "6. Datos de la clienta" : "5. Datos de la clienta"}>
          <ContactSearch
            selectedName={nombre}
            ocultarTelefono={rol !== 'admin'}
            onSelect={c => {
              setNombre(`${c.nombres} ${c.apellidos || ''}`.trim())
              setTelefono(c.telefono || '')
            }}
          />
        </Seccion>
      )}

      {error && <p className="text-sm text-red-500 mb-4">Error: {error}</p>}

      {slot && nombre && telefono.replace(/\D/g, '').length >= 10 && (
        <button
          onClick={crear}
          disabled={guardando}
          className="w-full py-4 bg-[#C9A84C] text-white rounded-2xl font-medium hover:bg-[#b8963e] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {guardando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          {guardando ? 'Creando cita...' : `Confirmar cita · ${slot.label}`}
        </button>
      )}
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] mb-3">{titulo}</p>
      {children}
    </div>
  )
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        activo ? 'bg-[#C9A84C] text-white' : 'bg-white border border-gray-200 text-[#1a1a1a] hover:border-[#C9A84C]'
      }`}
    >
      {children}
    </button>
  )
}

function SlotPicker({ servicio, profesional, selected, onSelect }: {
  servicio: Servicio; profesional: Profesional; selected: Slot | null; onSelect: (s: Slot) => void
}) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fecha, setFecha] = useState<string | null>(null)
  // Rangos ocupados de HOY para esa profesional (para no ofrecer horas ya agendadas)
  const [ocupadoHoy, setOcupadoHoy] = useState<{ start: number; end: number }[]>([])

  const hoy = hoyStr()

  const fetchSlots = useCallback(async () => {
    setLoading(true); setError('')
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start); end.setDate(end.getDate() + 30)
    try {
      const r = await fetch(`${SLOTS_URL}?calendarId=${servicio.calendarId}&startDate=${start.getTime()}&endDate=${end.getTime()}&userId=${profesional.userId}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setSlots(data.slots || [])
    } catch (e) {
      // No es bloqueante: HOY se genera localmente aunque el webhook falle
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [servicio.calendarId, profesional.userId])

  // Citas ya agendadas HOY para la profesional → rangos ocupados
  const fetchOcupado = useCallback(async () => {
    const { data } = await supabase
      .from('citas')
      .select('start_time,end_time')
      .eq('fecha', hoy)
      .eq('profesional_id', profesional.userId)
      .neq('status', 'cancelled')
    setOcupadoHoy((data || []).map((c: { start_time: string; end_time: string }) => ({
      start: new Date(c.start_time).getTime(),
      end: new Date(c.end_time).getTime(),
    })))
  }, [hoy, profesional.userId])

  useEffect(() => { fetchSlots() }, [fetchSlots])
  useEffect(() => { fetchOcupado() }, [fetchOcupado])

  // Grilla de HOY: todas las franjas del horario del salón que estén libres,
  // sin importar que la hora ya pasó (la única condición es que no choque con otra cita).
  const slotsHoy = useMemo<Slot[]>(() => {
    const out: Slot[] = []
    const n = new Date()
    const dur = servicio.duracion || GRID_MIN
    const pad = (x: number) => String(x).padStart(2, '0')
    for (let h = SALON_OPEN_HOUR; h < SALON_CLOSE_HOUR; h++) {
      for (let m = 0; m < 60; m += GRID_MIN) {
        const start = new Date(n.getFullYear(), n.getMonth(), n.getDate(), h, m, 0)
        const startMs = start.getTime()
        const endMs = startMs + dur * 60000
        const choca = ocupadoHoy.some(o => startMs < o.end && endMs > o.start)
        if (choca) continue
        out.push({
          date: hoy,
          slot: `${hoy}T${pad(h)}:${pad(m)}:00-05:00`,
          label: start.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase(),
          forced: true,
        })
      }
    }
    return out
  }, [ocupadoHoy, servicio.duracion, hoy])

  if (loading) return <div className="flex items-center gap-2 text-sm text-[#8a7a6a] py-4"><Loader2 size={16} className="animate-spin" /> Buscando horarios...</div>

  // HOY siempre primero (grilla local); los demás días vienen del webhook
  const fechasWeb = [...new Set(slots.map(s => s.date))].filter(f => f !== hoy)
  const fechas = [hoy, ...fechasWeb]
  const slotsDelDia = fecha === hoy ? slotsHoy : fecha ? slots.filter(s => s.date === fecha) : []

  return (
    <div>
      {error && <p className="text-xs text-amber-600 mb-2">No se pudo cargar la disponibilidad futura ({error}). Puedes agendar para hoy.</p>}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {fechas.map(f => {
          const d = new Date(f + 'T12:00:00')
          const esHoy = f === hoy
          return (
            <button
              key={f}
              onClick={() => setFecha(f)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                fecha === f ? 'bg-[#C9A84C] text-white' : 'bg-white border border-gray-200 hover:border-[#C9A84C]'
              }`}
            >
              {esHoy ? 'Hoy' : d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
            </button>
          )
        })}
      </div>
      {fecha === hoy && (
        <p className="text-xs text-[#8a7a6a] mb-2">Horarios libres de hoy — se agenda de forma forzada aunque la hora ya haya pasado.</p>
      )}
      {fecha && (
        slotsDelDia.length === 0 ? (
          <p className="text-sm text-[#8a7a6a] py-2">No hay horarios libres este día.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slotsDelDia.map(s => (
              <button
                key={s.slot}
                onClick={() => onSelect(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-all ${
                  selected?.slot === s.slot ? 'bg-[#C9A84C] text-white' : 'bg-white border border-gray-200 hover:border-[#C9A84C]'
                }`}
              >
                <Clock size={12} /> {s.label}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}
