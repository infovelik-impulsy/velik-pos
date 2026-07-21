import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, CheckCircle, ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PROFESIONALES, METODOS_PAGO, type ServicioVendido } from '../types'
import ServiceSelector from '../components/ServiceSelector'
import ProductoSelector from '../components/ProductoSelector'
import MixtoSelector, { calcularMontosMixto, type MixtoValue } from '../components/MixtoSelector'

interface ProductoCarrito { nombre: string; precio: number }
interface LocationState { appointmentId?: string; ventaId?: string; clienteNombre?: string }

const METODO_ICONO: Record<string, string> = {
  efectivo: '💵',
  transferencia: '🏦',
  tarjeta: '💳',
  mixto: '🔀',
  de_la_casa: '🏠',
}

export default function EditarVenta() {
  const location = useLocation()
  const state = (location.state || {}) as LocationState
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [ventaId, setVentaId] = useState('')
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [ghlEventId, setGhlEventId] = useState<string | null>(null)

  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [profesionalId, setProfesionalId] = useState('')
  const [fechaCita, setFechaCita] = useState('')
  const [horaCita, setHoraCita] = useState('')
  const [servicios, setServicios] = useState<ServicioVendido[]>([])
  const [productos, setProductos] = useState<ProductoCarrito[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'mixto' | 'de_la_casa'>('efectivo')
  const [mixto, setMixto] = useState<MixtoValue>({ metodo1: 'efectivo', metodo2: 'transferencia', monto1: 0 })
  const [notas, setNotas] = useState('')

  useEffect(() => { loadVenta() }, [])

  async function loadVenta() {
    if (!state.ventaId && !state.appointmentId) {
      navigate('/')
      return
    }

    let query = supabase.from('ventas').select('*')
    if (state.ventaId) {
      query = query.eq('id', state.ventaId)
    } else if (state.appointmentId) {
      query = query.eq('appointment_id', state.appointmentId)
    }
    const { data } = await query.maybeSingle()
    if (data) {
      setVentaId(data.id)
      setClienteNombre(data.cliente_nombre || state.clienteNombre || '')
      setClienteTelefono(data.cliente_telefono || '')
      setAppointmentId(data.appointment_id || state.appointmentId || null)
      setProfesionalId(data.profesional_id || '')
      setFechaCita(data.fecha_cita || '')
      setHoraCita(data.hora_cita || '')
      setServicios(data.servicios || [])
      setProductos(data.productos || [])
      setMetodoPago(data.metodo_pago || 'efectivo')
      setMixto({ metodo1: 'efectivo', metodo2: 'transferencia', monto1: data.pagado_efectivo || 0 })
      setNotas(data.notas || '')

      // Load GHL event ID from citas if appointment exists
      if (data.appointment_id) {
        const { data: cita } = await supabase
          .from('citas')
          .select('ghl_event_id')
          .eq('id', data.appointment_id)
          .maybeSingle()
        if (cita?.ghl_event_id) setGhlEventId(cita.ghl_event_id)
      }
    }
    setLoading(false)
  }

  const totalServicios = servicios.reduce((s, sv) => s + (sv.precio || 0), 0)
  const totalProductos = productos.reduce((s, p) => s + (p.precio || 0), 0)
  const total = totalServicios + totalProductos

  async function guardar() {
    if (!ventaId) { alert('Error: no se encontró la venta'); return }
    if (!profesionalId) { alert('Selecciona una profesional'); return }
    if (!fechaCita) { alert('Selecciona la fecha'); return }
    if (servicios.length === 0) { alert('Agrega al menos un servicio'); return }
    setGuardando(true)

    const prof = PROFESIONALES.find(p => p.id === profesionalId)
    const comision = totalServicios * 0.4 + totalProductos * 0.05
    const mixtoCalc = metodoPago === 'mixto' ? calcularMontosMixto(total, mixto) : null
    const efectivo = metodoPago === 'efectivo' ? total : mixtoCalc ? mixtoCalc.efectivo : 0
    const transferencia = metodoPago === 'transferencia' ? total : mixtoCalc ? mixtoCalc.transferencia : 0
    const tarjeta = metodoPago === 'tarjeta' ? total : mixtoCalc ? mixtoCalc.tarjeta : 0
    const digital = transferencia + tarjeta
    const notasFinal = mixtoCalc ? [mixtoCalc.detalle, notas].filter(Boolean).join(' — ') : notas

    const { error } = await supabase.from('ventas').update({
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      profesional_id: profesionalId,
      profesional_nombre: prof?.nombre || '',
      fecha_cita: fechaCita,
      ...(horaCita ? { hora_cita: horaCita } : {}),
      servicios,
      productos,
      total,
      metodo_pago: metodoPago,
      pagado_efectivo: efectivo,
      pagado_digital: digital,
      pagado_transferencia: transferencia,
      pagado_tarjeta: tarjeta,
      comision_profesional: comision,
      comision_velik: total - comision,
      notas: notasFinal,
    }).eq('id', ventaId)

    if (!error && appointmentId) {
      const citaUpdate: Record<string, unknown> = {
        profesional_id: profesionalId,
        profesional_nombre: prof?.nombre || '',
        titulo: servicios.map(s => s.nombre).join(', '),
        precio: total,
      }
      if (fechaCita) {
        citaUpdate.fecha = fechaCita
        if (horaCita) {
          const startISO = `${fechaCita}T${horaCita}:00-05:00`
          const endDate = new Date(`${fechaCita}T${horaCita}:00`)
          endDate.setMinutes(endDate.getMinutes() + 30)
          const endH = String(endDate.getHours()).padStart(2, '0')
          const endM = String(endDate.getMinutes()).padStart(2, '0')
          const endISO = `${fechaCita}T${endH}:${endM}:00-05:00`
          citaUpdate.start_time = startISO
          citaUpdate.end_time = endISO
        }
      }
      await supabase.from('citas').update(citaUpdate).eq('id', appointmentId)

      // Sync GHL calendar event
      if (ghlEventId && fechaCita && horaCita) {
        const startISO = `${fechaCita}T${horaCita}:00-05:00`
        const endDate = new Date(`${fechaCita}T${horaCita}:00`)
        endDate.setMinutes(endDate.getMinutes() + 30)
        const endH = String(endDate.getHours()).padStart(2, '0')
        const endM = String(endDate.getMinutes()).padStart(2, '0')
        const endISO = `${fechaCita}T${endH}:${endM}:00-05:00`
        await fetch(`https://services.leadconnectorhq.com/calendars/events/appointments/${ghlEventId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_GHL_API_KEY}`,
            'Version': '2021-04-15',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            calendarId: undefined,
            startTime: startISO,
            endTime: endISO,
            title: servicios.map(s => s.nombre).join(', '),
            userId: profesionalId,
          }),
        }).catch(() => {})
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
      <h2 className="font-serif text-3xl font-light mb-2">¡Venta actualizada!</h2>
      <p className="text-[#8a7a6a]">Total: <strong>${total.toLocaleString('es-CO')}</strong></p>
    </div>
  )

  const pctPro = 40
  const pctVelik = 60
  const comProServ = totalServicios * (pctPro / 100)
  const comVelikServ = totalServicios * (pctVelik / 100)
  const comProProd = totalProductos * 0.05
  const comVelikProd = totalProductos * 0.95
  const totalPro = comProServ + comProProd
  const totalVelik = comVelikServ + comVelikProd

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="font-serif text-2xl font-light">Editar Venta</h2>
          {state.clienteNombre && <p className="text-xs text-[#8a7a6a]">{state.clienteNombre}</p>}
        </div>
      </div>

      {/* Cliente */}
      <section className="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a]">Cliente</h3>
        <input
          type="text"
          value={clienteNombre}
          onChange={e => setClienteNombre(e.target.value)}
          placeholder="Nombre del cliente"
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]"
        />
        <input
          type="tel"
          value={clienteTelefono}
          onChange={e => setClienteTelefono(e.target.value)}
          placeholder="Teléfono (opcional)"
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]"
        />
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

      {/* Servicios */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Servicios *</h3>
        <div className="space-y-2 mb-4">
          {servicios.map((sv, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{sv.nombre}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-[#8a7a6a]">$</span>
                  <input type="text" inputMode="numeric"
                    value={sv.precio === 0 ? '' : sv.precio.toLocaleString('es-CO')}
                    onChange={e => {
                      const raw = parseInt(e.target.value.replace(/\D/g, '')) || 0
                      const updated = [...servicios]
                      updated[i] = { ...updated[i], precio: raw }
                      setServicios(updated)
                    }}
                    className="text-sm border-b border-[#C9A84C] bg-transparent px-1 py-0.5 w-36 focus:outline-none" />
                </div>
              </div>
              <button onClick={() => setServicios(s => s.filter((_, idx) => idx !== i))}
                className="ml-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-[#8a7a6a] uppercase tracking-widest font-medium mb-3">Agregar servicio</p>
          <ServiceSelector onSelect={s => setServicios(prev => [...prev, { nombre: s.nombre, precio: s.precio }])} />
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm text-[#8a7a6a]">Subtotal servicios</span>
          <span className="text-base font-semibold text-[#C9A84C]">${totalServicios.toLocaleString('es-CO')}</span>
        </div>
      </section>

      {/* Productos */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Productos Authentic</h3>
        {productos.length > 0 && (
          <div className="space-y-2 mb-4">
            {productos.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{p.nombre}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-[#8a7a6a]">$</span>
                    <input type="text" inputMode="numeric"
                      value={p.precio === 0 ? '' : p.precio.toLocaleString('es-CO')}
                      onChange={e => {
                        const raw = parseInt(e.target.value.replace(/\D/g, '')) || 0
                        const updated = [...productos]
                        updated[i] = { ...updated[i], precio: raw }
                        setProductos(updated)
                      }}
                      className="text-sm border-b border-[#C9A84C] bg-transparent px-1 py-0.5 w-32 focus:outline-none" />
                  </div>
                </div>
                <button onClick={() => setProductos(prev => prev.filter((_, idx) => idx !== i))}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-2">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-[#8a7a6a] uppercase tracking-widest font-medium mb-3">Agregar producto</p>
          <ProductoSelector onSelect={p => setProductos(prev => [...prev, { nombre: p.nombre, precio: p.precio }])} />
        </div>
      </section>

      {/* Pago */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Método de pago *</h3>
        <div className="grid grid-cols-2 gap-3">
          {METODOS_PAGO.filter(m => m.value !== 'de_la_casa').map(m => (
            <button key={m.value} onClick={() => setMetodoPago(m.value as typeof metodoPago)}
              className={`flex flex-col items-center justify-center gap-1 py-4 rounded-xl text-sm font-medium transition-all border-2 ${
                metodoPago === m.value ? 'bg-[#C9A84C] text-white border-[#C9A84C]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-transparent'
              }`}>
              <span className="text-lg leading-none">{METODO_ICONO[m.value]}</span>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={() => setMetodoPago('de_la_casa')}
          className={`mt-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            metodoPago === 'de_la_casa' ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
          }`}>
          🏠 De la casa — Velik asume el costo
        </button>
        {metodoPago === 'mixto' && (
          <MixtoSelector total={total} value={mixto} onChange={setMixto} />
        )}
      </section>

      {/* Notas */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Notas (opcional)</h3>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          placeholder="Observaciones del servicio..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none" />
      </section>

      {/* Distribución */}
      {total > 0 && (
        metodoPago === 'de_la_casa' ? (
          <div className="bg-purple-50 rounded-2xl p-4 mb-6 text-sm border border-purple-100">
            <p className="text-xs font-medium uppercase tracking-widest text-purple-400 mb-2">De la casa</p>
            <div className="flex justify-between">
              <span className="text-gray-600">Profesional (a pagar)</span>
              <span className="font-medium">${totalPro.toLocaleString('es-CO')}</span>
            </div>
          </div>
        ) : (
          <div className="bg-[#f9f6ee] rounded-2xl p-4 mb-6 text-sm space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-2">Distribución</p>
            {totalServicios > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Servicios — Prof. {pctPro}% / Velik {pctVelik}%</span>
                <span>${comProServ.toLocaleString('es-CO')} / ${comVelikServ.toLocaleString('es-CO')}</span>
              </div>
            )}
            {totalProductos > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Productos — Prof. 5% / Velik 95%</span>
                <span>${comProProd.toLocaleString('es-CO')} / ${comVelikProd.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1 border-t border-[#e8dfc8] mt-1">
              <span className="text-gray-700">Total profesional</span>
              <span className="text-[#C9A84C]">${totalPro.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-gray-700">Total Velik</span>
              <span>${totalVelik.toLocaleString('es-CO')}</span>
            </div>
          </div>
        )
      )}

      <button onClick={guardar}
        disabled={guardando}
        className="w-full py-4 bg-[#C9A84C] text-white rounded-2xl font-medium text-sm disabled:opacity-40 hover:bg-[#b8963e] transition-all active:scale-[0.99]">
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
