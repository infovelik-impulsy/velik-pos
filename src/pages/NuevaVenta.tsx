import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Trash2, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PROFESIONALES, METODOS_PAGO, type ServicioVendido } from '../types'
import ContactSearch from '../components/ContactSearch'
import ServiceSelector from '../components/ServiceSelector'

interface LocationState {
  appointmentId?: string
  contactId?: string
  clienteNombre?: string
  clienteTelefono?: string
  profesionalId?: string
  servicioNombre?: string
  precioCita?: string
}

function parsePrecio(p?: string): number {
  if (!p) return 0
  return Number(p.replace(/[$.\s]/g, '')) || 0
}

export default function NuevaVenta() {
  const { state } = useLocation() as { state: LocationState | null }
  const navigate = useNavigate()

  const [clienteNombre, setClienteNombre] = useState(state?.clienteNombre || '')
  const [clienteTelefono, setClienteTelefono] = useState(state?.clienteTelefono || '')
  const [profesionalId, setProfesionalId] = useState(state?.profesionalId || '')
  const [servicios, setServicios] = useState<ServicioVendido[]>(
    state?.servicioNombre
      ? [{ nombre: state.servicioNombre, precio: parsePrecio(state.precioCita) }]
      : [{ nombre: '', precio: 0 }]
  )
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'mixto' | 'de_la_casa'>('efectivo')
  const [pagadoEfectivo, setPagadoEfectivo] = useState(0)
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  const total = servicios.reduce((s, sv) => s + (sv.precio || 0), 0)
  const pagadoDigital = metodoPago === 'mixto' ? total - pagadoEfectivo : 0

  function removeServicio(i: number) {
    setServicios(s => s.filter((_, idx) => idx !== i))
  }

  async function guardar() {
    if (!clienteNombre || !profesionalId || servicios.some(s => !s.nombre || !s.precio)) return
    setGuardando(true)

    const prof = PROFESIONALES.find(p => p.id === profesionalId)
    const comision = total * 0.5

    const efectivo = metodoPago === 'efectivo' ? total : metodoPago === 'mixto' ? pagadoEfectivo : 0
    const digital = metodoPago === 'transferencia' || metodoPago === 'tarjeta' ? total : metodoPago === 'mixto' ? pagadoDigital : 0
    // de_la_casa: cliente paga $0, Velik absorbe el costo

    const { error } = await supabase.from('ventas').insert({
      appointment_id: state?.appointmentId,
      contact_id: state?.contactId,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      profesional_id: profesionalId,
      profesional_nombre: prof?.nombre || '',
      servicios,
      total,
      metodo_pago: metodoPago,
      pagado_efectivo: efectivo,
      pagado_digital: digital,
      comision_profesional: comision,
      comision_velik: comision,
      notas,
    })

    setGuardando(false)
    if (error) {
      console.error('Error guardando venta:', error)
      alert('Error al guardar: ' + error.message)
      return
    }

    if (state?.appointmentId) {
      const { error: errorCita } = await supabase.from('citas').update({
        status: 'showed',
        precio: total
      }).eq('id', state.appointmentId)

      if (errorCita) {
        console.error('Error actualizando cita:', errorCita)
      }
    }

    setExito(true)
    setTimeout(() => navigate('/'), 1500)
  }

  if (exito) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <CheckCircle size={64} className="text-[#C9A84C] mb-4" />
        <h2 className="font-serif text-3xl font-light mb-2">¡Venta registrada!</h2>
        <p className="text-[#8a7a6a]">Total: <strong>${total.toLocaleString('es-CO')}</strong></p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <h2 className="font-serif text-2xl font-light mb-6">Nueva Venta</h2>

      {/* Cliente */}
      <section className="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a]">Cliente *</h3>
        <ContactSearch
          selectedName={clienteNombre}
          onSelect={(contact) => {
            setClienteNombre(`${contact.nombres} ${contact.apellidos || ''}`.trim())
            setClienteTelefono(contact.telefono)
          }}
        />
      </section>

      {/* Profesional */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Profesional *</h3>
        <div className="grid grid-cols-3 gap-2">
          {PROFESIONALES.map(p => (
            <button
              key={p.id}
              onClick={() => setProfesionalId(p.id)}
              className={`py-3 px-2 rounded-xl text-xs font-medium text-center transition-all ${
                profesionalId === p.id
                  ? 'text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              style={profesionalId === p.id ? { backgroundColor: p.color } : {}}
            >
              {p.nombre.split(' ')[0]}
            </button>
          ))}
        </div>
      </section>

      {/* Servicios Seleccionados */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Servicios Seleccionados *</h3>
        <div className="space-y-2 mb-4">
          {servicios.map((sv, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">{sv.nombre}</p>
                <p className="text-xs text-gray-500">${sv.precio.toLocaleString('es-CO')}</p>
              </div>
              {servicios.length > 1 && (
                <button onClick={() => removeServicio(i)} className="text-red-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-[#8a7a6a] uppercase tracking-widest font-medium mb-3">Elegir Servicio</p>
          <ServiceSelector
            onSelect={(service) => {
              setServicios([...servicios, { nombre: service.nombre, precio: service.precio }])
            }}
          />
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm text-[#8a7a6a]">Total</span>
          <span className="text-xl font-semibold text-[#C9A84C]">${total.toLocaleString('es-CO')}</span>
        </div>
      </section>

      {/* Pago */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Método de pago *</h3>
        <div className="grid grid-cols-2 gap-2">
          {METODOS_PAGO.filter(m => m.value !== 'de_la_casa').map(m => (
            <button
              key={m.value}
              onClick={() => setMetodoPago(m.value as typeof metodoPago)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                metodoPago === m.value
                  ? 'bg-[#C9A84C] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMetodoPago('de_la_casa')}
          className={`mt-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            metodoPago === 'de_la_casa'
              ? 'bg-purple-500 text-white'
              : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
          }`}
        >
          🏠 De la casa — Velik asume el costo
        </button>
        {metodoPago === 'mixto' && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-28">Efectivo:</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={pagadoEfectivo || ''}
                  onChange={e => setPagadoEfectivo(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-28">Digital:</span>
              <span className="text-sm font-medium">${pagadoDigital.toLocaleString('es-CO')}</span>
            </div>
          </div>
        )}
      </section>

      {/* Notas */}
      <section className="bg-white rounded-2xl p-4 mb-6">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Notas (opcional)</h3>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          placeholder="Observaciones del servicio..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none"
        />
      </section>

      {/* Comisiones preview */}
      {total > 0 && (
        metodoPago === 'de_la_casa' ? (
          <div className="bg-purple-50 rounded-2xl p-4 mb-6 text-sm border border-purple-100">
            <p className="text-xs font-medium uppercase tracking-widest text-purple-400 mb-2">De la casa</p>
            <div className="flex justify-between">
              <span className="text-gray-600">Profesional (a pagar)</span>
              <span className="font-medium">${(total * 0.5).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Velik asume</span>
              <span className="font-medium text-purple-600">-${total.toLocaleString('es-CO')}</span>
            </div>
          </div>
        ) : (
          <div className="bg-[#f9f6ee] rounded-2xl p-4 mb-6 text-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-2">Distribución 50/50</p>
            <div className="flex justify-between">
              <span className="text-gray-600">Profesional</span>
              <span className="font-medium">${(total * 0.5).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Velik</span>
              <span className="font-medium">${(total * 0.5).toLocaleString('es-CO')}</span>
            </div>
          </div>
        )
      )}

      <button
        onClick={guardar}
        disabled={guardando || !clienteNombre || !profesionalId || servicios.some(s => !s.nombre || !s.precio)}
        className="w-full py-4 bg-[#C9A84C] text-white rounded-2xl font-medium text-sm disabled:opacity-40 hover:bg-[#b8963e] transition-all active:scale-[0.99]"
      >
        {guardando ? 'Guardando...' : 'Confirmar venta'}
      </button>
    </div>
  )
}
