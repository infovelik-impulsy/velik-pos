import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Ban, Trash2, CalendarDays } from 'lucide-react'
import { PROFESIONALES } from '../types'
import { supabase } from '../lib/supabase'
import { bloquearHorarioGHL, eliminarBloqueoGHL } from '../lib/ghl'

interface BloqueoRow {
  id: string
  fecha: string
  start_time: string
  end_time: string
  cliente_nombre: string
  profesional_id: string
  profesional_nombre: string
  ghl_event_id?: string
}

export default function BloquearHorario() {
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [profesionalId, setProfesionalId] = useState(PROFESIONALES[0]?.id || '')
  const [horaInicio, setHoraInicio] = useState('12:00')
  const [horaFin, setHoraFin] = useState('13:00')
  const [motivo, setMotivo] = useState('Almuerzo')
  const [guardando, setGuardando] = useState(false)
  const [bloqueos, setBloqueos] = useState<BloqueoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargarBloqueos() }, [])

  async function cargarBloqueos() {
    setLoading(true)
    const hoy = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('citas')
      .select('id, fecha, start_time, end_time, cliente_nombre, profesional_id, profesional_nombre, ghl_event_id')
      .eq('status', 'blocked')
      .gte('fecha', hoy)
      .order('start_time', { ascending: true })
    setBloqueos(data || [])
    setLoading(false)
  }

  async function crearBloqueo() {
    if (!profesionalId || !fecha || !horaInicio || !horaFin) return
    setGuardando(true)
    try {
      const startISO = `${fecha}T${horaInicio}:00-05:00`
      const endISO = `${fecha}T${horaFin}:00-05:00`
      const prof = PROFESIONALES.find(p => p.id === profesionalId)
      const { id: ghlEventId } = await bloquearHorarioGHL({
        userId: profesionalId,
        startISO,
        endISO,
        motivo: motivo || 'Bloqueado',
      })
      const { error } = await supabase.from('citas').insert({
        id: ghlEventId,
        fecha,
        start_time: startISO,
        end_time: endISO,
        titulo: motivo || 'Bloqueado',
        cliente_nombre: motivo || 'Bloqueado',
        contact_id: '',
        profesional_id: profesionalId,
        profesional_nombre: prof?.nombre || '',
        status: 'blocked',
        origen: 'bloqueo_manual',
        ghl_event_id: ghlEventId,
      })
      if (error) throw error
      setMotivo('Almuerzo')
      cargarBloqueos()
    } catch (e) {
      alert('No se pudo bloquear el horario: ' + (e instanceof Error ? e.message : String(e)))
    }
    setGuardando(false)
  }

  async function eliminarBloqueo(b: BloqueoRow) {
    if (!window.confirm('¿Quitar este bloqueo de horario?')) return
    try {
      if (b.ghl_event_id) await eliminarBloqueoGHL(b.ghl_event_id)
    } catch (e) {
      console.error('No se pudo eliminar el bloqueo en GHL:', e)
    }
    await supabase.from('citas').delete().eq('id', b.id)
    cargarBloqueos()
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gray-100 rounded-xl">
          <Ban size={20} className="text-gray-600" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-light">Bloquear Horario</h2>
          <p className="text-xs text-[#8a7a6a]">Reserva tiempo para almuerzo, permisos u otros pendientes de Zuly y Juliana</p>
        </div>
      </div>

      {/* Formulario */}
      <section className="bg-white rounded-2xl p-4 mb-6 space-y-4">
        <div>
          <p className="text-xs text-[#8a7a6a] mb-2 uppercase tracking-widest font-medium">Profesional</p>
          <div className="grid grid-cols-3 gap-2">
            {PROFESIONALES.map(p => (
              <button
                key={p.id}
                onClick={() => setProfesionalId(p.id)}
                className={`py-3 px-2 rounded-xl text-xs font-medium text-center transition-all ${
                  profesionalId === p.id ? 'text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={profesionalId === p.id ? { backgroundColor: p.color } : {}}
              >
                {p.nombre.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-[#8a7a6a] mb-2 uppercase tracking-widest font-medium">Día</p>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#8a7a6a] mb-2 uppercase tracking-widest font-medium">Desde</p>
            <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <p className="text-xs text-[#8a7a6a] mb-2 uppercase tracking-widest font-medium">Hasta</p>
            <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
        </div>

        <div>
          <p className="text-xs text-[#8a7a6a] mb-2 uppercase tracking-widest font-medium">Motivo</p>
          <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Almuerzo, permiso personal..."
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]" />
        </div>

        <button onClick={crearBloqueo} disabled={guardando}
          className="w-full py-3.5 bg-[#1a1a1a] text-white rounded-2xl font-medium text-sm disabled:opacity-40 hover:bg-black transition-all active:scale-[0.99]">
          {guardando ? 'Bloqueando...' : 'Bloquear horario'}
        </button>
      </section>

      {/* Bloqueos existentes */}
      <section>
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Bloqueos programados</h3>
        {loading ? (
          <p className="text-sm text-[#8a7a6a] text-center py-8">Cargando...</p>
        ) : bloqueos.length === 0 ? (
          <div className="text-center py-10 text-[#8a7a6a]">
            <CalendarDays className="mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-sm">No hay bloqueos programados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bloqueos.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-gray-300 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{b.cliente_nombre}</p>
                  <p className="text-xs text-[#8a7a6a] mt-0.5 capitalize">
                    {format(new Date(b.start_time), "EEEE d 'de' MMMM", { locale: es })} · {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                  </p>
                  <p className="text-xs text-[#8a7a6a] mt-0.5">{b.profesional_nombre}</p>
                </div>
                <button
                  onClick={() => eliminarBloqueo(b)}
                  className="p-2 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex-shrink-0"
                  title="Quitar bloqueo"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
