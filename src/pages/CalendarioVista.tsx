import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventDropArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { ChevronLeft, ChevronRight, X, Loader2, Clock, User, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { PROFESIONALES, CATEGORIAS, SERVICIOS } from '../data/bookingData'
import type { Servicio, Profesional } from '../data/bookingData'
import { supabase } from '../lib/supabase'
import { crearCitaForzada, updateAppointmentInGHL, updateAppointmentStatus } from '../lib/ghl'
import { diaCerrado } from '../lib/festivos'
import ContactSearch from '../components/ContactSearch'

interface CitaRow {
  id: string
  start_time: string
  end_time: string
  titulo: string
  cliente_nombre: string
  cliente_telefono?: string
  contact_id: string
  profesional_id: string
  profesional_nombre: string
  status: string
}

// Vista piloto tipo Google Calendar. No reemplaza la Agenda actual — es una
// vista adicional. Usa la version gratuita de FullCalendar: en vez de la
// funcion de "recursos" (columnas por profesional, que es premium de pago),
// se dibuja un calendario independiente y gratuito por cada profesional,
// puestos en fila — visualmente equivalente, sin costo de licencia.
const PALETA = ['#C9A84C', '#8A7B6E', '#B89A7E', '#C9A084']

export default function CalendarioVista() {
  const navigate = useNavigate()
  const [fecha, setFecha] = useState(new Date())
  const [citas, setCitas] = useState<CitaRow[]>([])
  const [ventasIds, setVentasIds] = useState<Set<string>>(new Set())
  const [filtroProfesionalId, setFiltroProfesionalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaRow | null>(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalInicio, setModalInicio] = useState<Date | null>(null)
  const [profesionalColumna, setProfesionalColumna] = useState<Profesional | null>(null)
  const [categoria, setCategoria] = useState<string | null>(null)
  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [profesional, setProfesional] = useState<Profesional | null>(null)
  const [cliente, setCliente] = useState<{ nombre: string; telefono: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  useEffect(() => { cargar() }, [fecha])

  async function cargar() {
    setLoading(true)
    const fechaStr = format(fecha, 'yyyy-MM-dd')
    const { data } = await supabase
      .from('citas')
      .select('*')
      .eq('fecha', fechaStr)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })
    const citasList = data || []
    setCitas(citasList)

    if (citasList.length > 0) {
      const ids = citasList.map(c => c.id)
      const { data: ventas } = await supabase
        .from('ventas')
        .select('appointment_id')
        .in('appointment_id', ids)
      setVentasIds(new Set((ventas || []).map(v => v.appointment_id)))
    } else {
      setVentasIds(new Set())
    }
    setLoading(false)
  }

  async function marcarAsistio(id: string) {
    await supabase.from('citas').update({ status: 'showed' }).eq('id', id)
    updateAppointmentStatus(id, 'showed')
    setCitaSeleccionada(null)
    cargar()
  }

  async function marcarNoShow(id: string) {
    await supabase.from('citas').update({ status: 'noshow' }).eq('id', id)
    updateAppointmentStatus(id, 'noshow')
    setCitaSeleccionada(null)
    cargar()
  }

  function cancelarCita(id: string) {
    if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return
    supabase.from('citas').update({ status: 'cancelled' }).eq('id', id).then(() => {
      updateAppointmentStatus(id, 'cancelled')
      setCitaSeleccionada(null)
      cargar()
    })
  }

  const profesionalesAMostrar = filtroProfesionalId
    ? PROFESIONALES.filter(p => p.userId === filtroProfesionalId)
    : PROFESIONALES

  function colorPorId(id: string) {
    const idx = PROFESIONALES.findIndex(p => p.userId === id)
    return idx >= 0 ? PALETA[idx % PALETA.length] : '#9a8b7a'
  }

  function eventosDe(profesionalId: string) {
    return citas.filter(c => c.profesional_id === profesionalId).map(c => {
      const color = c.status === 'blocked' ? '#9a8b7a' : colorPorId(profesionalId)
      const editable = c.status !== 'blocked' && c.status !== 'showed' && c.status !== 'cancelled' && c.status !== 'noshow'
      return {
        id: c.id,
        title: c.cliente_nombre,
        start: c.start_time,
        end: c.end_time,
        backgroundColor: color,
        borderColor: color,
        editable,
        durationEditable: editable,
        startEditable: editable,
      }
    })
  }

  function handleEventClick(arg: EventClickArg) {
    const cita = citas.find(c => c.id === arg.event.id)
    if (!cita || cita.status === 'blocked') return
    setCitaSeleccionada(cita)
  }

  async function handleEventDrop(arg: EventDropArg) {
    const cita = citas.find(c => c.id === arg.event.id)
    if (!cita || !arg.event.start || !arg.event.end) return
    const startISO = toColombiaISO(arg.event.start)
    const endISO = toColombiaISO(arg.event.end)
    const { error } = await supabase.from('citas').update({ start_time: startISO, end_time: endISO }).eq('id', cita.id)
    if (error) { alert('No se pudo mover la cita: ' + error.message); arg.revert(); return }
    try {
      await updateAppointmentInGHL(cita.id, { startTime: startISO, endTime: endISO })
    } catch (e) {
      console.error('No se pudo sincronizar el movimiento con GHL:', e)
    }
    cargar()
  }

  async function handleEventResize(arg: EventResizeDoneArg) {
    const cita = citas.find(c => c.id === arg.event.id)
    if (!cita || !arg.event.start || !arg.event.end) return
    const startISO = toColombiaISO(arg.event.start)
    const endISO = toColombiaISO(arg.event.end)
    const { error } = await supabase.from('citas').update({ start_time: startISO, end_time: endISO }).eq('id', cita.id)
    if (error) { alert('No se pudo cambiar la duración: ' + error.message); arg.revert(); return }
    try {
      await updateAppointmentInGHL(cita.id, { startTime: startISO, endTime: endISO })
    } catch (e) {
      console.error('No se pudo sincronizar la duración con GHL:', e)
    }
    cargar()
  }

  function toColombiaISO(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00-05:00`
  }

  function abrirModalCrear(inicio: Date, prof?: Profesional) {
    setModalInicio(inicio)
    setProfesionalColumna(prof || null)
    setCategoria(null)
    setServicio(null)
    setProfesional(prof || null)
    setCliente(null)
    setErrorModal('')
    setModalAbierto(true)
  }

  function elegirServicio(s: Servicio) {
    setServicio(s)
    const elegible = profesionalColumna && (!s.profesionales || s.profesionales.includes(profesionalColumna.userId))
    setProfesional(elegible ? profesionalColumna : null)
  }

  const profesionalesDisponibles = servicio
    ? (servicio.profesionales ? PROFESIONALES.filter(p => servicio.profesionales!.includes(p.userId)) : PROFESIONALES)
    : []

  async function crearDesdeModal() {
    if (!modalInicio || !servicio || !profesional || !cliente) return
    const cerrado = diaCerrado(format(modalInicio, 'yyyy-MM-dd'))
    if (cerrado.cerrado) {
      setErrorModal(`No se puede agendar ese día: es ${cerrado.motivo}.`)
      return
    }
    setGuardando(true)
    setErrorModal('')
    try {
      const startISO = toColombiaISO(modalInicio)
      const endDate = new Date(modalInicio.getTime() + (servicio.duracion || 30) * 60000)
      const endISO = toColombiaISO(endDate)
      const titulo = `${servicio.nombre} - ${cliente.nombre}`
      const tel = cliente.telefono.startsWith('+') ? cliente.telefono : '+57' + cliente.telefono.replace(/\D/g, '')

      const res = await crearCitaForzada({
        calendarId: servicio.calendarId,
        userId: profesional.userId,
        startISO,
        endISO,
        titulo,
        nombre: cliente.nombre,
        telefono: tel,
        status: 'confirmed',
      })

      await supabase.from('citas').insert({
        id: res.id,
        fecha: format(modalInicio, 'yyyy-MM-dd'),
        start_time: startISO,
        end_time: endISO,
        titulo,
        cliente_nombre: cliente.nombre,
        cliente_telefono: tel,
        contact_id: res.contactId,
        profesional_id: profesional.userId,
        profesional_nombre: profesional.nombre,
        calendar_id: servicio.calendarId,
        status: 'confirmed',
        precio: servicio.precio || null,
        origen: 'calendario_piloto',
        ghl_event_id: res.id,
      })

      setModalAbierto(false)
      cargar()
    } catch (e) {
      setErrorModal('No se pudo crear la cita: ' + (e instanceof Error ? e.message : String(e)))
    }
    setGuardando(false)
  }

  const esHoy = format(fecha, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-24">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-3">
          <button onClick={() => setFecha(d => addDays(d, -1))} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="font-semibold text-lg capitalize text-[#1a1a1a]">
              {esHoy ? 'Hoy — ' : ''}{format(fecha, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-xs text-[#8a7a6a] mt-0.5">Vista calendario (piloto) — arrastra para mover/estirar, clic en un espacio vacío para crear</p>
          </div>
          <button onClick={() => setFecha(d => addDays(d, 1))} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="max-w-5xl mx-auto flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroProfesionalId('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filtroProfesionalId === '' ? 'bg-[#C9A84C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {PROFESIONALES.map((p, i) => (
            <button
              key={p.userId}
              onClick={() => setFiltroProfesionalId(filtroProfesionalId === p.userId ? '' : p.userId)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filtroProfesionalId === p.userId ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={filtroProfesionalId === p.userId ? { backgroundColor: PALETA[i % PALETA.length] } : {}}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: PALETA[i % PALETA.length] }} />
              {p.nombre.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-5">
        {loading ? (
          <div className="text-center py-16 text-[#8a7a6a]">
            <div className="animate-pulse text-sm">Cargando...</div>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            profesionalesAMostrar.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' :
            profesionalesAMostrar.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            'grid-cols-1 md:grid-cols-3'
          }`}>
            {profesionalesAMostrar.map((p, i) => (
              <div key={p.userId} className="bg-white rounded-2xl p-3 shadow-sm min-w-0">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETA[i % PALETA.length] }} />
                  <h3 className="font-semibold text-sm text-[#1a1a1a]">{p.nombre}</h3>
                </div>
                <FullCalendar
                  plugins={[timeGridPlugin, interactionPlugin]}
                  initialView="timeGridDay"
                  initialDate={fecha}
                  headerToolbar={false}
                  locale="es"
                  allDaySlot={false}
                  slotMinTime="08:00:00"
                  slotMaxTime="20:00:00"
                  slotDuration="00:15:00"
                  height="auto"
                  nowIndicator
                  editable
                  eventResizableFromStart={false}
                  selectable
                  select={(arg) => abrirModalCrear(arg.start, p)}
                  dateClick={(arg) => abrirModalCrear(arg.date, p)}
                  events={eventosDe(p.userId)}
                  eventClick={handleEventClick}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventResize}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">
                Nueva cita — {modalInicio && format(modalInicio, "d 'de' MMMM, h:mm a", { locale: es })}
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-[#8a7a6a] mb-1">Categoría</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIAS.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategoria(cat); setServicio(null); setProfesional(null) }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        categoria === cat ? 'bg-[#C9A84C] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {categoria && (
                <div>
                  <p className="text-xs text-[#8a7a6a] mb-1">Servicio</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {(SERVICIOS[categoria] || []).map(s => (
                      <button
                        key={s.nombre}
                        onClick={() => elegirServicio(s)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                          servicio?.nombre === s.nombre ? 'border-[#C9A84C] bg-[#faf6ee]' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-medium">{s.nombre}</span>
                        <span className="text-gray-400 ml-2">{s.duracion} min · {s.precio}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {servicio && (
                <div>
                  <p className="text-xs text-[#8a7a6a] mb-1">Profesional</p>
                  <div className="grid grid-cols-3 gap-2">
                    {profesionalesDisponibles.map((p, i) => (
                      <button
                        key={p.userId}
                        onClick={() => setProfesional(p)}
                        className={`py-2 px-2 rounded-xl text-xs font-medium text-center transition-all ${
                          profesional?.userId === p.userId ? 'text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                        style={profesional?.userId === p.userId ? { backgroundColor: PALETA[i % PALETA.length] } : {}}
                      >
                        {p.nombre.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {profesional && (
                <div>
                  <p className="text-xs text-[#8a7a6a] mb-1">Clienta</p>
                  <ContactSearch onSelect={c => setCliente({ nombre: `${c.nombres} ${c.apellidos || ''}`.trim(), telefono: c.telefono })} />
                </div>
              )}

              {errorModal && <p className="text-xs text-red-500">{errorModal}</p>}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalAbierto(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={crearDesdeModal}
                disabled={!servicio || !profesional || !cliente || guardando}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-40"
              >
                {guardando && <Loader2 size={14} className="animate-spin" />}
                {guardando ? 'Creando...' : 'Crear cita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {citaSeleccionada && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCitaSeleccionada(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-[#8a7a6a]" />
                <span className="text-xs font-semibold text-[#1a1a1a]">
                  {format(new Date(citaSeleccionada.start_time), 'h:mm a')} – {format(new Date(citaSeleccionada.end_time), 'h:mm a')}
                </span>
              </div>
              <button onClick={() => setCitaSeleccionada(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <User size={13} className="text-[#8a7a6a]" />
              <span className="text-sm font-medium text-[#1a1a1a]">{citaSeleccionada.cliente_nombre}</span>
            </div>
            <p className="text-xs text-[#8a7a6a] mb-4 ml-5">{citaSeleccionada.titulo} · {citaSeleccionada.profesional_nombre}</p>

            {citaSeleccionada.status === 'showed' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1 py-1.5 bg-green-50 rounded-xl text-xs font-medium text-green-600">
                  <CheckCircle size={12} /> Asistió ✓
                </div>
                {ventasIds.has(citaSeleccionada.id) ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 rounded-xl text-xs font-medium text-emerald-600 border border-emerald-200">
                      <CheckCircle size={12} /> Venta registrada ✓
                    </div>
                    <button
                      onClick={() => navigate('/editar-venta', { state: { appointmentId: citaSeleccionada.id, clienteNombre: citaSeleccionada.cliente_nombre } })}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      title="Editar venta"
                    >
                      <Pencil size={13} className="text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate('/venta', {
                      state: {
                        appointmentId: citaSeleccionada.id,
                        contactId: citaSeleccionada.contact_id,
                        clienteNombre: citaSeleccionada.cliente_nombre,
                        clienteTelefono: citaSeleccionada.cliente_telefono,
                        profesionalId: citaSeleccionada.profesional_id,
                        servicioNombre: citaSeleccionada.titulo,
                      }
                    })}
                    className="w-full flex items-center justify-center gap-1 py-2 bg-[#C9A84C] text-white rounded-xl text-xs font-medium hover:bg-[#b8963e] transition-colors"
                  >
                    💰 Registrar venta
                  </button>
                )}
              </div>
            ) : citaSeleccionada.status === 'noshow' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-50 rounded-xl text-xs font-medium text-red-400">
                  <XCircle size={12} /> No asistió
                </div>
                <button
                  onClick={() => cancelarCita(citaSeleccionada.id)}
                  className="p-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  title="Cancelar cita"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <button
                    onClick={() => marcarAsistio(citaSeleccionada.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 text-white rounded-xl text-xs font-medium hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle size={12} /> Asistió
                  </button>
                  <button
                    onClick={() => marcarNoShow(citaSeleccionada.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-400 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    <XCircle size={12} /> No asistió
                  </button>
                </div>
                <button
                  onClick={() => cancelarCita(citaSeleccionada.id)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 bg-gray-50 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <Trash2 size={11} /> Cancelar cita
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
