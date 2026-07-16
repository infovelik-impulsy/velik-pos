import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, User, CheckCircle, PlusCircle, XCircle, Pencil, Trash2 } from 'lucide-react'
import { PROFESIONALES } from '../types'
import { supabase } from '../lib/supabase'
import { updateAppointmentStatus } from '../lib/ghl'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700' },
  new: { label: 'Nueva', cls: 'bg-yellow-100 text-yellow-700' },
  showed: { label: 'Atendida', cls: 'bg-green-100 text-green-700' },
  noshow: { label: 'No asistió', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500' },
}

interface CitaEnriquecida {
  id: string
  start_time: string
  end_time: string
  titulo: string
  cliente_nombre: string
  cliente_telefono?: string
  contact_id: string
  profesional_id: string
  profesional_nombre: string
  precio?: string
  status: string
}

export default function Agenda() {
  const [fecha, setFecha] = useState(new Date())
  const [citas, setCitas] = useState<CitaEnriquecida[]>([])
  const [ventasIds, setVentasIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [fecha])

  async function marcarNoShow(id: string) {
    await supabase.from('citas').update({ status: 'noshow' }).eq('id', id)
    updateAppointmentStatus(id, 'noshow')
    load()
  }

  async function cancelarCita(id: string) {
    const cita = citas.find(c => c.id === id)
    if (!cita) return

    const ahora = new Date()
    const inicioCita = new Date(cita.start_time)
    const horasRestantes = (inicioCita.getTime() - ahora.getTime()) / (1000 * 60 * 60)
    const esMenos24h = horasRestantes < 24 && horasRestantes > -48 // cita futura o reciente

    if (esMenos24h) {
      const registrar = window.confirm(
        `⚠️ Esta cita se cancela con menos de 24 horas de anticipación.\n\n` +
        `El depósito de $30.000 NO es reembolsable.\n\n` +
        `¿Deseas registrar los $30.000 como ingreso del salón?`
      )
      if (registrar) {
        const hoy = new Date().toISOString().split('T')[0]
        const prof = PROFESIONALES.find(p => p.id === cita.profesional_id)
        await supabase.from('ventas').insert({
          appointment_id: id,
          contact_id: cita.contact_id,
          cliente_nombre: cita.cliente_nombre,
          cliente_telefono: cita.cliente_telefono || '',
          profesional_id: cita.profesional_id,
          profesional_nombre: prof?.nombre || cita.profesional_nombre,
          fecha_cita: cita.start_time ? cita.start_time.split('T')[0] : hoy,
          servicios: [{ nombre: 'Depósito no reembolsable (cancelación -24h)', precio: 30000 }],
          productos: [],
          total: 30000,
          metodo_pago: 'deposito',
          pagado_efectivo: 0,
          pagado_digital: 30000,
          comision_profesional: 0,
          comision_velik: 30000,
          notas: 'Depósito retenido por cancelación con menos de 24 horas de anticipación',
        })
      } else if (!window.confirm('¿Cancelar la cita sin registrar el depósito?')) {
        return
      }
    } else {
      if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return
    }

    await supabase.from('citas').update({ status: 'cancelled' }).eq('id', id)
    updateAppointmentStatus(id, 'cancelled')
    load()
  }

  async function marcarAsistio(id: string) {
    await supabase.from('citas').update({ status: 'showed' }).eq('id', id)
    updateAppointmentStatus(id, 'showed')
    load()
  }

  async function load() {
    setLoading(true)
    try {
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
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const idsActivos = new Set(PROFESIONALES.map(p => p.id))
  const idsInactivos = Array.from(new Set(
    citas.filter(c => !idsActivos.has(c.profesional_id)).map(c => c.profesional_id)
  ))
  const profesionalesInactivos = idsInactivos.map(id => {
    const cita = citas.find(c => c.profesional_id === id)
    return { id, nombre: cita?.profesional_nombre || 'Sin asignar', color: '#9a8b7a' }
  })
  const citasPorProfesional = [...PROFESIONALES, ...profesionalesInactivos].map(p => ({
    profesional: p,
    citas: citas.filter(c => c.profesional_id === p.id),
  })).filter(g => g.citas.length > 0)

  const totalDia = citas.length
  const esHoy = format(fecha, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-24">

      {/* Header de fecha */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => setFecha(d => subDays(d, 1))} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="font-semibold text-lg capitalize text-[#1a1a1a]">
              {esHoy ? 'Hoy — ' : ''}{format(fecha, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-xs text-[#8a7a6a] mt-0.5">{totalDia} cita{totalDia !== 1 ? 's' : ''} · {citasPorProfesional.length} profesional{citasPorProfesional.length !== 1 ? 'es' : ''}</p>
          </div>
          <button onClick={() => setFecha(d => addDays(d, 1))} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Quick date chips */}
        <div className="max-w-7xl mx-auto mt-3 flex gap-2 overflow-x-auto pb-1">
          {[0, 1, 2, 3, 4, 5, 6].map(offset => {
            const d = addDays(new Date(), offset)
            const isActive = format(d, 'yyyy-MM-dd') === format(fecha, 'yyyy-MM-dd')
            return (
              <button
                key={offset}
                onClick={() => setFecha(d)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive ? 'bg-[#C9A84C] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className="capitalize">{offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : format(d, 'EEE d', { locale: es })}</span>
              </button>
            )
          })}
          <button
            onClick={() => navigate('/nueva-cita')}
            className="flex-shrink-0 ml-auto flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] text-white rounded-xl text-xs font-medium hover:bg-black transition-colors"
          >
            <PlusCircle size={13} /> Nueva cita
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 pt-5">
        {loading ? (
          <div className="text-center py-16 text-[#8a7a6a]">
            <div className="animate-pulse text-sm">Cargando citas...</div>
          </div>
        ) : citas.length === 0 ? (
          <div className="text-center py-16 text-[#8a7a6a]">
            <CalendarIcon />
            <p className="mt-3 text-sm">Sin citas para este día</p>
          </div>
        ) : (
          /* Grid: 1 columna en móvil, una por profesional en desktop */
          <div className={`grid gap-5 ${
            citasPorProfesional.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' :
            citasPorProfesional.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {citasPorProfesional.map(({ profesional, citas: cs }) => (
              <div key={profesional.id} className="min-w-0">
                {/* Cabecera profesional */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: profesional.color }} />
                  <h3 className="font-semibold text-sm text-[#1a1a1a]">{profesional.nombre}</h3>
                  <span className="text-xs text-white px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: profesional.color }}>
                    {cs.length}
                  </span>
                </div>

                {/* Citas de esta profesional */}
                <div className="space-y-2">
                  {cs.map(cita => {
                    const st = STATUS_LABEL[cita.status] || { label: cita.status, cls: 'bg-gray-100 text-gray-600' }
                    return (
                      <div
                        key={cita.id}
                        className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${
                          cita.status === 'showed' ? 'border-green-400' :
                          cita.status === 'noshow' ? 'border-red-300' :
                          'border-[#C9A84C]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock size={12} className="text-[#8a7a6a] flex-shrink-0" />
                              <span className="text-xs font-semibold text-[#1a1a1a]">
                                {format(new Date(cita.start_time), 'h:mm a')} – {format(new Date(cita.end_time), 'h:mm a')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User size={12} className="text-[#8a7a6a] flex-shrink-0" />
                              <span className="text-sm font-medium text-[#1a1a1a] truncate">{cita.cliente_nombre}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 ml-4">
                              <p className="text-xs text-[#8a7a6a] truncate">{cita.titulo}</p>
                              {cita.precio && <span className="text-xs font-bold text-[#C9A84C] flex-shrink-0">{cita.precio}</span>}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${st.cls}`}>{st.label}</span>
                        </div>

                        {cita.status === 'showed' ? (
                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-center gap-1 py-1.5 bg-green-50 rounded-xl text-xs font-medium text-green-600">
                              <CheckCircle size={12} /> Asistió ✓
                            </div>
                            {ventasIds.has(cita.id) ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 rounded-xl text-xs font-medium text-emerald-600 border border-emerald-200">
                                  <CheckCircle size={12} /> Venta registrada ✓
                                </div>
                                <button
                                  onClick={() => navigate('/editar-venta', { state: { appointmentId: cita.id, clienteNombre: cita.cliente_nombre } })}
                                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                  title="Editar venta"
                                >
                                  <Pencil size={13} className="text-gray-500" />
                                </button>
                                <button
                                  onClick={() => cancelarCita(cita.id)}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                                  title="Cancelar cita"
                                >
                                  <Trash2 size={13} className="text-red-400" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => navigate('/venta', {
                                    state: {
                                      appointmentId: cita.id,
                                      contactId: cita.contact_id,
                                      clienteNombre: cita.cliente_nombre,
                                      clienteTelefono: cita.cliente_telefono,
                                      profesionalId: cita.profesional_id,
                                      servicioNombre: cita.titulo,
                                      precioCita: cita.precio,
                                    }
                                  })}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#C9A84C] text-white rounded-xl text-xs font-medium hover:bg-[#b8963e] transition-colors"
                                >
                                  💰 Registrar venta
                                </button>
                                <button
                                  onClick={() => navigate('/editar-cita', { state: { citaId: cita.id } })}
                                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                  title="Editar cita"
                                >
                                  <Pencil size={13} className="text-gray-500" />
                                </button>
                                <button
                                  onClick={() => cancelarCita(cita.id)}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                                  title="Cancelar cita"
                                >
                                  <Trash2 size={13} className="text-red-400" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : cita.status === 'noshow' ? (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-50 rounded-xl text-xs font-medium text-red-400">
                              <XCircle size={12} /> No asistió
                            </div>
                            <button
                              onClick={() => navigate('/editar-cita', { state: { citaId: cita.id } })}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                              title="Editar cita"
                            >
                              <Pencil size={13} className="text-gray-500" />
                            </button>
                            <button
                              onClick={() => cancelarCita(cita.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                              title="Cancelar cita"
                            >
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-1.5">
                            <div className="flex gap-2">
                              <button
                                onClick={() => marcarAsistio(cita.id)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 text-white rounded-xl text-xs font-medium hover:bg-green-600 transition-colors"
                              >
                                <CheckCircle size={12} /> Asistió
                              </button>
                              <button
                                onClick={() => marcarNoShow(cita.id)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-400 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors"
                              >
                                <XCircle size={12} /> No asistió
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate('/editar-cita', { state: { citaId: cita.id } })}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-50 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-100 transition-colors border border-gray-200"
                              >
                                <Pencil size={11} /> Editar cita
                              </button>
                              <button
                                onClick={() => cancelarCita(cita.id)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
                                title="Cancelar cita"
                              >
                                <Trash2 size={13} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB nueva cita */}
      <button
        onClick={() => navigate('/nueva-cita')}
        className="fixed bottom-20 right-4 bg-[#C9A84C] text-white rounded-full p-4 shadow-lg hover:bg-[#b8963e] transition-all active:scale-95"
      >
        <PlusCircle size={24} />
      </button>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg className="mx-auto text-gray-300" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
