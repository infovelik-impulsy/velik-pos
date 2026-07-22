import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronLeft, Loader2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { updateAppointmentInGHL } from '../lib/ghl'
import { PROFESIONALES } from '../types'
import ServiceSelector from '../components/ServiceSelector'
import { verificarSolape } from '../lib/disponibilidad'

interface LocationState { citaId: string }

export default function EditarCita() {
  const location = useLocation()
  const state = (location.state || {}) as LocationState
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [fechaCita, setFechaCita] = useState('')
  const [horaCita, setHoraCita] = useState('')
  const [servicioNombre, setServicioNombre] = useState('')
  const [servicioPrecio, setServicioPrecio] = useState(0)
  const [profesionalId, setProfesionalId] = useState('')
  const [duracionMin, setDuracionMin] = useState(60)

  useEffect(() => { loadCita() }, [])

  async function loadCita() {
    if (!state.citaId) {
      navigate('/')
      return
    }
    const { data } = await supabase.from('citas').select('*').eq('id', state.citaId).maybeSingle()
    if (data) {
      setClienteNombre(data.cliente_nombre || '')
      setClienteTelefono(data.cliente_telefono || '')
      setFechaCita(data.fecha || '')
      if (data.start_time) {
        const d = new Date(data.start_time)
        const h = String(d.getHours()).padStart(2, '0')
        const m = String(d.getMinutes()).padStart(2, '0')
        setHoraCita(`${h}:${m}`)
      }
      setServicioNombre(data.titulo || '')
      setProfesionalId(data.profesional_id || '')
      if (data.start_time && data.end_time) {
        const mins = Math.round((new Date(data.end_time).getTime() - new Date(data.start_time).getTime()) / 60000)
        if (mins > 0) setDuracionMin(mins)
      }
    }
    setLoading(false)
  }

  async function guardar() {
    if (!fechaCita || !horaCita || !profesionalId) return

    const prof = PROFESIONALES.find(p => p.id === profesionalId)
    const startISO = `${fechaCita}T${horaCita}:00-05:00`
    const endDate = new Date(`${fechaCita}T${horaCita}:00`)
    endDate.setMinutes(endDate.getMinutes() + duracionMin)
    const endH = String(endDate.getHours()).padStart(2, '0')
    const endM = String(endDate.getMinutes()).padStart(2, '0')
    const endISO = `${fechaCita}T${endH}:${endM}:00-05:00`

    const solape = await verificarSolape(profesionalId, startISO, endISO, state.citaId)
    if (solape.solapa) {
      alert(`${prof?.nombre || 'La profesional'} ya tiene una cita en ese horario: ${solape.detalle}.`)
      return
    }

    setGuardando(true)

    const updates: Record<string, unknown> = {
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      fecha: fechaCita,
      start_time: startISO,
      end_time: endISO,
      profesional_id: profesionalId,
      profesional_nombre: prof?.nombre || '',
    }
    if (servicioNombre) updates.titulo = servicioNombre
    if (servicioPrecio > 0) updates.precio = `$${servicioPrecio.toLocaleString('es-CO')}`

    const { error } = await supabase.from('citas').update(updates).eq('id', state.citaId)

    if (!error) {
      try {
        await updateAppointmentInGHL(state.citaId, {
          assignedUserId: profesionalId,
          startTime: startISO,
          endTime: endISO,
          title: servicioNombre || undefined,
        })
      } catch (e) {
        // No bloquea el guardado en el POS: si GHL falla, queda solo actualizado ahí
        console.error('No se pudo sincronizar el cambio con GHL:', e)
      }
    }

    setGuardando(false)
    if (error) { alert('Error: ' + error.message); return }
    setExito(true)
    setTimeout(() => navigate('/'), 1500)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
    </div>
  )

  if (exito) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <CheckCircle size={64} className="text-[#C9A84C] mb-4" />
      <h2 className="font-serif text-3xl font-light">¡Cita actualizada!</h2>
    </div>
  )

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h2 className="font-serif text-2xl font-light">Editar Cita</h2>
      </div>

      {/* Cliente */}
      <section className="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a]">Cliente</h3>
        <input type="text" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
          placeholder="Nombre del cliente"
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]" />
        <input type="tel" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
          placeholder="Teléfono (opcional)"
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]" />
      </section>

      {/* Profesional */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Profesional *</h3>
        <div className="grid grid-cols-3 gap-2">
          {PROFESIONALES.map(p => (
            <button key={p.id} onClick={() => setProfesionalId(p.id)}
              className={`py-3 px-2 rounded-xl text-xs font-medium text-center transition-all ${
                profesionalId === p.id ? 'text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              style={profesionalId === p.id ? { backgroundColor: p.color } : {}}>
              {p.nombre.split(' ')[0]}
            </button>
          ))}
        </div>
      </section>

      {/* Fecha y Hora */}
      <section className="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a]">Fecha y Hora *</h3>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={fechaCita} onChange={e => setFechaCita(e.target.value)}
            className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#C9A84C]" />
          <input type="time" value={horaCita} onChange={e => setHoraCita(e.target.value)}
            className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#C9A84C]" />
        </div>
      </section>

      {/* Servicio */}
      <section className="bg-white rounded-2xl p-4 mb-6">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Servicio</h3>
        {servicioNombre ? (
          <div className="flex items-center justify-between p-3 bg-[#faf6ee] border border-[#e8d99a] rounded-xl mb-3">
            <div>
              <p className="text-sm font-semibold text-[#1a1a1a]">{servicioNombre}</p>
              {servicioPrecio > 0 && <p className="text-xs text-[#C9A84C] font-medium">${servicioPrecio.toLocaleString('es-CO')}</p>}
            </div>
            <button onClick={() => { setServicioNombre(''); setServicioPrecio(0) }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <X size={15} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-[#8a7a6a] mb-3">Selecciona el nuevo servicio (opcional)</p>
        )}
        <ServiceSelector onSelect={s => { setServicioNombre(s.nombre); setServicioPrecio(s.precio); if (s.duracion) setDuracionMin(s.duracion) }} />
      </section>

      <button onClick={guardar} disabled={guardando || !profesionalId || !fechaCita || !horaCita}
        className="w-full py-4 bg-[#C9A84C] text-white rounded-2xl font-medium text-sm disabled:opacity-40 hover:bg-[#b8963e] transition-all active:scale-[0.99]">
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
