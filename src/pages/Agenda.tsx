import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, User, CheckCircle, PlusCircle } from 'lucide-react'
import { PROFESIONALES } from '../types'
import { supabase } from '../lib/supabase'

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
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [fecha])

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
      setCitas(data || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const citasPorProfesional = PROFESIONALES.map(p => ({
    profesional: p,
    citas: citas.filter(c => c.profesional_id === p.id),
  }))

  const totalDia = citas.length

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Date nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setFecha(d => subDays(d, 1))} className="p-2 rounded-xl hover:bg-white">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="font-medium capitalize">{format(fecha, "EEEE d 'de' MMMM", { locale: es })}</p>
          <p className="text-xs text-[#8a7a6a]">{totalDia} cita{totalDia !== 1 ? 's' : ''} del día</p>
        </div>
        <button onClick={() => setFecha(d => addDays(d, 1))} className="p-2 rounded-xl hover:bg-white">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Quick date chips */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[0, 1, 2, 3, 4, 5, 6].map(offset => {
          const d = addDays(new Date(), offset)
          const isActive = format(d, 'yyyy-MM-dd') === format(fecha, 'yyyy-MM-dd')
          return (
            <button
              key={offset}
              onClick={() => setFecha(d)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="capitalize">{offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : format(d, 'EEE d', { locale: es })}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#8a7a6a]">Cargando citas...</div>
      ) : citas.length === 0 ? (
        <div className="text-center py-12 text-[#8a7a6a]">
          <CalendarIcon />
          <p className="mt-2">Sin citas para este día</p>
        </div>
      ) : (
        <div className="space-y-6">
          {citasPorProfesional.filter(g => g.citas.length > 0).map(({ profesional, citas: cs }) => (
            <div key={profesional.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: profesional.color }} />
                <h3 className="font-medium text-sm">{profesional.nombre}</h3>
                <span className="text-xs text-gray-400">{cs.length} cita{cs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {cs.map(cita => {
                  const st = STATUS_LABEL[cita.status] || { label: cita.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <div
                      key={cita.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={13} className="text-[#8a7a6a]" />
                            <span className="text-sm font-medium">
                              {format(new Date(cita.start_time), 'HH:mm')} – {format(new Date(cita.end_time), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-[#8a7a6a]" />
                            <span className="text-sm">{cita.cliente_nombre}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-5">
                            <p className="text-xs text-[#8a7a6a]">{cita.titulo}</p>
                            {cita.precio && <span className="text-xs font-semibold text-[#C9A84C]">{cita.precio}</span>}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => navigate('/venta', {
                            state: {
                              appointmentId: cita.id,
                              contactId: cita.contact_id,
                              clienteNombre: cita.cliente_nombre,
                              clienteTelefono: cita.cliente_telefono,
                              profesionalId: cita.profesional_id,
                              servicioNombre: cita.titulo,
                            }
                          })}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#C9A84C] text-white rounded-xl text-xs font-medium hover:bg-[#b8963e] transition-colors"
                        >
                          <CheckCircle size={14} />
                          Registrar servicio
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/venta')}
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
