import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, User, CheckCircle, PlusCircle, XCircle, Pencil, Trash2, Ban } from 'lucide-react'
import { PROFESIONALES, METODOS_PAGO, type ServicioVendido } from '../types'
import { supabase } from '../lib/supabase'
import { updateAppointmentStatus, eliminarBloqueoGHL } from '../lib/ghl'
import ServiceSelector from '../components/ServiceSelector'

const METODO_ICONO: Record<string, string> = {
  efectivo: '💵',
  transferencia: '🏦',
  tarjeta: '💳',
  mixto: '🔀',
  de_la_casa: '🏠',
}

function parsePrecio(p?: string): number {
  if (!p) return 0
  return Number(p.replace(/[$.\s]/g, '')) || 0
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700' },
  new: { label: 'Nueva', cls: 'bg-yellow-100 text-yellow-700' },
  showed: { label: 'Atendida', cls: 'bg-green-100 text-green-700' },
  noshow: { label: 'No asistió', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500' },
  blocked: { label: 'Bloqueado', cls: 'bg-gray-200 text-gray-600' },
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
  ghl_event_id?: string
}

export default function Agenda() {
  const [fecha, setFecha] = useState(new Date())
  const [citas, setCitas] = useState<CitaEnriquecida[]>([])
  const [ventasIds, setVentasIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [citaACancelar, setCitaACancelar] = useState<CitaEnriquecida | null>(null)
  const [citaVentaRapida, setCitaVentaRapida] = useState<CitaEnriquecida | null>(null)
  const [metodoPagoRapido, setMetodoPagoRapido] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'mixto' | 'de_la_casa'>('efectivo')
  const [serviciosRapidos, setServiciosRapidos] = useState<ServicioVendido[]>([])
  const [mostrarSelectorRapido, setMostrarSelectorRapido] = useState(false)
  const [pagadoEfectivoRapido, setPagadoEfectivoRapido] = useState(0)
  const [guardandoVentaRapida, setGuardandoVentaRapida] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { load() }, [fecha])

  async function eliminarBloqueo(cita: CitaEnriquecida) {
    if (!window.confirm('¿Quitar este bloqueo de horario?')) return
    try {
      if (cita.ghl_event_id) await eliminarBloqueoGHL(cita.ghl_event_id)
    } catch (e) {
      console.error('No se pudo eliminar el bloqueo en GHL:', e)
    }
    await supabase.from('citas').delete().eq('id', cita.id)
    load()
  }

  async function marcarNoShow(id: string) {
    await supabase.from('citas').update({ status: 'noshow' }).eq('id', id)
    updateAppointmentStatus(id, 'noshow')
    load()
  }

  function pedirCancelarCita(id: string) {
    const cita = citas.find(c => c.id === id)
    if (!cita) return

    const ahora = new Date()
    const inicioCita = new Date(cita.start_time)
    const horasRestantes = (inicioCita.getTime() - ahora.getTime()) / (1000 * 60 * 60)
    const esMenos24h = horasRestantes < 24 && horasRestantes > -48 // cita futura o reciente

    if (esMenos24h) {
      setCitaACancelar(cita)
    } else {
      if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return
      confirmarCancelacion(id, false)
    }
  }

  async function confirmarCancelacion(id: string, registrarDeposito: boolean) {
    const cita = citas.find(c => c.id === id)
    if (registrarDeposito && cita) {
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
    }

    await supabase.from('citas').update({ status: 'cancelled' }).eq('id', id)
    updateAppointmentStatus(id, 'cancelled')
    setCitaACancelar(null)
    load()
  }

  async function marcarAsistio(id: string) {
    await supabase.from('citas').update({ status: 'showed' }).eq('id', id)
    updateAppointmentStatus(id, 'showed')
    load()
  }

  function abrirVentaRapida(cita: CitaEnriquecida) {
    setCitaVentaRapida(cita)
    setMetodoPagoRapido('efectivo')
    setServiciosRapidos([{ nombre: cita.titulo, precio: parsePrecio(cita.precio) }])
    setMostrarSelectorRapido(false)
    setPagadoEfectivoRapido(0)
  }

  function actualizarPrecioServicioRapido(i: number, precio: number) {
    setServiciosRapidos(s => s.map((sv, idx) => idx === i ? { ...sv, precio } : sv))
  }

  function quitarServicioRapido(i: number) {
    setServiciosRapidos(s => s.filter((_, idx) => idx !== i))
  }

  async function confirmarVentaRapida() {
    const total = serviciosRapidos.reduce((s, sv) => s + (sv.precio || 0), 0)
    if (!citaVentaRapida || serviciosRapidos.length === 0 || total <= 0) return
    setGuardandoVentaRapida(true)
    const cita = citaVentaRapida
    const prof = PROFESIONALES.find(p => p.id === cita.profesional_id)
    const comision = total * 0.4
    const efectivo = metodoPagoRapido === 'efectivo' ? total : metodoPagoRapido === 'mixto' ? pagadoEfectivoRapido : 0
    const digital = metodoPagoRapido === 'transferencia' || metodoPagoRapido === 'tarjeta' ? total : metodoPagoRapido === 'mixto' ? (total - pagadoEfectivoRapido) : 0

    const { error } = await supabase.from('ventas').insert({
      appointment_id: cita.id,
      contact_id: cita.contact_id,
      cliente_nombre: cita.cliente_nombre,
      cliente_telefono: cita.cliente_telefono || '',
      profesional_id: cita.profesional_id,
      profesional_nombre: prof?.nombre || cita.profesional_nombre,
      fecha_cita: cita.start_time ? cita.start_time.split('T')[0] : format(fecha, 'yyyy-MM-dd'),
      hora_cita: format(new Date(cita.start_time), 'HH:mm'),
      servicios: serviciosRapidos,
      productos: [],
      total,
      metodo_pago: metodoPagoRapido,
      pagado_efectivo: efectivo,
      pagado_digital: digital,
      comision_profesional: comision,
      comision_velik: total - comision,
    })

    if (error) {
      if (error.code === '23505' || error.message.includes('ventas_appointment_id_unique')) {
        alert('Esta cita ya tenía una venta registrada (probablemente desde otra pantalla). No se duplicó — actualizando la ficha.')
        await supabase.from('citas').update({ status: 'showed' }).eq('id', cita.id)
        updateAppointmentStatus(cita.id, 'showed')
        setCitaVentaRapida(null)
        setGuardandoVentaRapida(false)
        load()
        return
      }
      alert('Error al registrar la venta: ' + error.message)
      setGuardandoVentaRapida(false)
      return
    }

    await supabase.from('citas').update({ status: 'showed', precio: `$${total.toLocaleString('es-CO')}` }).eq('id', cita.id)
    updateAppointmentStatus(cita.id, 'showed')
    setCitaVentaRapida(null)
    setGuardandoVentaRapida(false)
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
            onClick={() => navigate('/bloquear-horario')}
            className="flex-shrink-0 ml-auto flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors border border-gray-200"
          >
            <Ban size={13} /> Bloquear horario
          </button>
          <button
            onClick={() => navigate('/nueva-cita')}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] text-white rounded-xl text-xs font-medium hover:bg-black transition-colors"
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
                    if (cita.status === 'blocked') {
                      return (
                        <div key={cita.id} className="bg-gray-50 rounded-2xl p-4 shadow-sm border-l-4 border-gray-300">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Ban size={12} className="text-gray-400 flex-shrink-0" />
                                <span className="text-xs font-semibold text-gray-600">
                                  {format(new Date(cita.start_time), 'h:mm a')} – {format(new Date(cita.end_time), 'h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-600 truncate">{cita.cliente_nombre}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${st.cls}`}>{st.label}</span>
                          </div>
                          <button
                            onClick={() => eliminarBloqueo(cita)}
                            className="mt-3 w-full flex items-center justify-center gap-1 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-medium text-red-400 transition-colors"
                          >
                            <Trash2 size={12} /> Quitar bloqueo
                          </button>
                        </div>
                      )
                    }
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
                                  onClick={() => pedirCancelarCita(cita.id)}
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
                                  onClick={() => pedirCancelarCita(cita.id)}
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
                              onClick={() => pedirCancelarCita(cita.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                              title="Cancelar cita"
                            >
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        ) : citaVentaRapida?.id === cita.id ? (
                          <div className="mt-3 space-y-2 bg-[#faf6ee] rounded-xl p-3 border border-[#e8dfc8]">
                            <p className="text-xs font-medium text-[#8a7a6a]">Registrar venta y marcar asistió</p>
                            <div className="space-y-1.5">
                              {serviciosRapidos.map((sv, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-gray-100">
                                  <span className="text-xs text-gray-600 flex-1 truncate">{sv.nombre}</span>
                                  <span className="text-xs text-[#8a7a6a]">$</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={sv.precio === 0 ? '' : sv.precio.toLocaleString('es-CO')}
                                    onChange={e => actualizarPrecioServicioRapido(i, parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                    placeholder="Precio"
                                    className="text-sm border-b border-[#C9A84C] bg-transparent px-1 py-0.5 w-24 focus:outline-none"
                                  />
                                  {serviciosRapidos.length > 1 && (
                                    <button onClick={() => quitarServicioRapido(i)} className="text-red-400 hover:text-red-600 p-0.5" title="Quitar servicio">
                                      <XCircle size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {mostrarSelectorRapido ? (
                              <div className="bg-white rounded-lg border border-gray-100 p-2 max-h-64 overflow-y-auto">
                                <ServiceSelector
                                  onSelect={(s) => {
                                    setServiciosRapidos(prev => [...prev, { nombre: s.nombre, precio: s.precio }])
                                    setMostrarSelectorRapido(false)
                                  }}
                                />
                                <button
                                  onClick={() => setMostrarSelectorRapido(false)}
                                  className="w-full mt-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setMostrarSelectorRapido(true)}
                                className="w-full py-1.5 rounded-lg text-xs font-medium text-[#C9A84C] border border-dashed border-[#C9A84C] hover:bg-[#faf6ee] transition-colors"
                              >
                                + Agregar otro servicio
                              </button>
                            )}
                            <div className="flex justify-between items-center pt-1 border-t border-[#e8dfc8]">
                              <span className="text-xs text-[#8a7a6a]">Total</span>
                              <span className="text-sm font-semibold text-[#C9A84C]">
                                ${serviciosRapidos.reduce((s, sv) => s + (sv.precio || 0), 0).toLocaleString('es-CO')}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {METODOS_PAGO.filter(m => m.value !== 'de_la_casa').map(m => (
                                <button
                                  key={m.value}
                                  onClick={() => setMetodoPagoRapido(m.value as typeof metodoPagoRapido)}
                                  className={`py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                                    metodoPagoRapido === m.value ? 'bg-[#C9A84C] text-white border-[#C9A84C]' : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'
                                  }`}
                                >
                                  {METODO_ICONO[m.value]} {m.label}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setMetodoPagoRapido('de_la_casa')}
                              className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all ${
                                metodoPagoRapido === 'de_la_casa' ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                              }`}
                            >
                              🏠 De la casa
                            </button>
                            {metodoPagoRapido === 'mixto' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 flex-shrink-0">Efectivo $</span>
                                <input
                                  type="number"
                                  value={pagadoEfectivoRapido || ''}
                                  onChange={e => setPagadoEfectivoRapido(Number(e.target.value))}
                                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
                                />
                              </div>
                            )}
                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={() => setCitaVentaRapida(null)}
                                className="flex-1 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                              >
                                Volver
                              </button>
                              <button
                                onClick={confirmarVentaRapida}
                                disabled={guardandoVentaRapida || serviciosRapidos.reduce((s, sv) => s + (sv.precio || 0), 0) <= 0}
                                className="flex-[2] py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                              >
                                {guardandoVentaRapida ? 'Guardando...' : '✓ Confirmar venta'}
                              </button>
                            </div>
                            <button
                              onClick={() => { marcarAsistio(cita.id); setCitaVentaRapida(null) }}
                              className="w-full text-center text-[11px] text-[#8a7a6a] underline hover:text-[#5c4a3a] pt-0.5"
                            >
                              Marcar asistió sin registrar venta ahora
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-1.5">
                            <div className="flex gap-2">
                              <button
                                onClick={() => abrirVentaRapida(cita)}
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
                                onClick={() => pedirCancelarCita(cita.id)}
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

      {/* Modal cancelar cita con menos de 24h */}
      {citaACancelar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <h3 className="font-semibold text-sm">Cancelación con menos de 24 horas</h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{citaACancelar.cliente_nombre}</strong> — {citaACancelar.titulo}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Si la clienta pagó un depósito de $30.000, no es reembolsable y debe registrarse como ingreso. Si nunca abonó nada, cancela sin registrar nada.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => confirmarCancelacion(citaACancelar.id, true)}
                className="w-full py-3 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#b8963e] transition-colors"
              >
                Sí pagó depósito — cancelar y registrar $30.000
              </button>
              <button
                onClick={() => confirmarCancelacion(citaACancelar.id, false)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                No pagó nada — cancelar sin registrar
              </button>
              <button
                onClick={() => setCitaACancelar(null)}
                className="w-full py-2.5 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
              >
                No cancelar, volver
              </button>
            </div>
          </div>
        </div>
      )}
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
