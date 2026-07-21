import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, CheckCircle, ChevronLeft, FileText } from 'lucide-react'
import { generarFacturaAlegra } from '../lib/alegra'
import { supabase } from '../lib/supabase'
import { updateAppointmentStatus, crearCitaForzada } from '../lib/ghl'
import { diaCerrado } from '../lib/festivos'
import { SERVICIOS } from '../data/bookingData'
import { PROFESIONALES, METODOS_PAGO, type ServicioVendido } from '../types'

// Índice nombre-de-servicio → calendario de GHL (para poder crear la cita en GHL
// desde una venta directa; los servicios de la venta no traen calendarId propio).
const CAL_INDEX: Record<string, { calendarId: string; duracion: number }> = (() => {
  const idx: Record<string, { calendarId: string; duracion: number }> = {}
  Object.values(SERVICIOS).flat().forEach(s => {
    idx[s.nombre.toLowerCase().trim()] = { calendarId: s.calendarId, duracion: s.duracion }
  })
  return idx
})()
function buscarCalendario(nombre: string) {
  return CAL_INDEX[nombre.toLowerCase().trim()] || null
}
import ContactSearch from '../components/ContactSearch'
import ServiceSelector from '../components/ServiceSelector'
import ProductoSelector from '../components/ProductoSelector'
import CafeteriaSelector, { type ItemCafeteriaCarrito } from '../components/CafeteriaSelector'
import MixtoSelector, { calcularMontosMixto, type MixtoValue } from '../components/MixtoSelector'

interface ProductoCarrito {
  nombre: string
  precio: number
}

interface LocationState {
  appointmentId?: string
  contactId?: string
  clienteNombre?: string
  clienteTelefono?: string
  profesionalId?: string
  servicioNombre?: string
  precioCita?: string
  fechaCita?: string
  horaCita?: string
  fromPro?: boolean
}

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

export default function NuevaVenta({ rol = 'admin' }: { rol?: string }) {
  const { state } = useLocation() as { state: LocationState | null }
  const navigate = useNavigate()

  const [clienteNombre, setClienteNombre] = useState(state?.clienteNombre || '')
  const [clienteTelefono, setClienteTelefono] = useState(state?.clienteTelefono || '')
  const [profesionalId, setProfesionalId] = useState(state?.profesionalId || '')
  const [fechaCita, setFechaCita] = useState(state?.fechaCita || '')
  const [horaCita, setHoraCita] = useState(state?.horaCita || '')
  const fromPro = state?.fromPro || false
  const [servicios, setServicios] = useState<ServicioVendido[]>(
    state?.servicioNombre
      ? [{ nombre: state.servicioNombre, precio: parsePrecio(state.precioCita) }]
      : []
  )
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'mixto' | 'de_la_casa'>('efectivo')
  const [mixto, setMixto] = useState<MixtoValue>({ metodo1: 'efectivo', metodo2: 'transferencia', monto1: 0 })
  const [productos, setProductos] = useState<ProductoCarrito[]>([])
  const [cafeteria, setCafeteria] = useState<ItemCafeteriaCarrito[]>([])
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [mostrarFactura, setMostrarFactura] = useState(false)
  const [facturaDoc, setFacturaDoc] = useState('')
  const [facturaTipo, setFacturaTipo] = useState<'CC' | 'NIT' | 'CE' | 'PA'>('CC')
  const [facturaEmail, setFacturaEmail] = useState('')
  const [facturaGenerando, setFacturaGenerando] = useState(false)
  const [facturaNumero, setFacturaNumero] = useState('')
  const [facturaEmailSent, setFacturaEmailSent] = useState(false)
  const [facturaEmitida, setFacturaEmitida] = useState(false)
  const [facturaError, setFacturaError] = useState('')

  const totalServicios = servicios.reduce((s, sv) => s + (sv.precio || 0), 0)
  const totalProductos = productos.reduce((s, p) => s + (p.precio || 0), 0)
  const totalCafeteria = cafeteria.reduce((s, c) => s + (c.precio * c.cantidad), 0)
  const total = totalServicios + totalProductos + totalCafeteria

  function removeServicio(i: number) {
    setServicios(s => s.filter((_, idx) => idx !== i))
  }

  async function crearContactoEnGHL() {
    try {
      const serviciosTexto = servicios.map(s => `${s.nombre} ($${s.precio.toLocaleString('es-CO')})`).join(', ')

      // Crear/actualizar contacto en GHL con info de la cita
      await fetch('https://api.leadconnectorhq.com/contacts/upsert', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer pit-022a5206-1196-4066-8957-50cf5634da09',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: clienteNombre,
          phone: clienteTelefono,
          source: 'POS - Velik Beauty',
          customFields: {
            'fecha_cita': fechaCita,
            'hora_cita': horaCita,
            'servicios': serviciosTexto,
            'total': `$${total.toLocaleString('es-CO')}`
          }
        })
      })
    } catch (err) {
      console.error('Error creando contacto en GHL:', err)
    }
  }

  async function guardar() {
    const hayItems = servicios.length > 0 || productos.length > 0 || cafeteria.length > 0
    if (!clienteNombre || !profesionalId || !fechaCita || !horaCita || !hayItems) return

    if (!state?.appointmentId) {
      const cerrado = diaCerrado(fechaCita)
      if (cerrado.cerrado) {
        alert(`No se puede crear una cita nueva ese día: es ${cerrado.motivo}.`)
        return
      }
    }

    setGuardando(true)

    // Verificar si ya existe una venta para esta cita agendada
    if (state?.appointmentId) {
      const { data: existente } = await supabase
        .from('ventas')
        .select('id')
        .eq('appointment_id', state.appointmentId)
        .maybeSingle()
      if (existente) {
        alert('Esta cita ya tiene una venta registrada. No se puede registrar dos veces.')
        setGuardando(false)
        return
      }
    }

    // Venta directa (sin cita previa): si esta misma clienta ya tiene otra venta
    // registrada hoy hace poco, es probable que sea el mismo servicio/visita y se
    // deba agregar como otro servicio a esa venta en vez de crear una cita/venta
    // nueva por separado (evita duplicar el valor en Facturacion).
    if (!state?.appointmentId && fechaCita) {
      const { data: recientes } = await supabase
        .from('ventas')
        .select('id, created_at, total')
        .eq('cliente_nombre', clienteNombre)
        .eq('fecha_cita', fechaCita)
        .order('created_at', { ascending: false })
        .limit(1)
      const ultima = recientes?.[0]
      if (ultima) {
        const minutos = (Date.now() - new Date(ultima.created_at).getTime()) / 60000
        if (minutos < 180) {
          const continuar = window.confirm(
            `⚠️ ${clienteNombre} ya tiene una venta registrada hace ${Math.round(minutos)} minutos (hoy).\n\n` +
            `Si es el mismo servicio/visita, cancela esto y agrégalo en "Editar Venta" de esa venta en vez de crear una nueva — así no se duplica en Facturación.\n\n` +
            `¿Seguro que quieres crear una venta NUEVA y SEPARADA para ${clienteNombre}?`
          )
          if (!continuar) { setGuardando(false); return }
        }
      }
    }

    const prof = PROFESIONALES.find(p => p.id === profesionalId)
    const comisionServicios = totalServicios * 0.4
    const comisionProductos = totalProductos * 0.05
    const comision = comisionServicios + comisionProductos

    const mixtoCalc = metodoPago === 'mixto' ? calcularMontosMixto(total, mixto) : null
    const efectivo = metodoPago === 'efectivo' ? total : mixtoCalc ? mixtoCalc.efectivo : 0
    const transferencia = metodoPago === 'transferencia' ? total : mixtoCalc ? mixtoCalc.transferencia : 0
    const tarjeta = metodoPago === 'tarjeta' ? total : mixtoCalc ? mixtoCalc.tarjeta : 0
    const digital = transferencia + tarjeta
    const notasFinal = mixtoCalc ? [mixtoCalc.detalle, notas].filter(Boolean).join(' — ') : notas

    // Si no viene de una cita agendada, creamos la cita en GHL (forzada) para que
    // quede también en el calendario oficial, y usamos su id para vincular venta ↔ cita.
    let ghlId: string | null = null
    let ghlContactId: string | undefined = state?.contactId
    if (!state?.appointmentId && servicios.length > 0 && fechaCita && horaCita) {
      const cal = buscarCalendario(servicios[0].nombre)
      if (cal) {
        try {
          const startISO = `${fechaCita}T${horaCita}:00-05:00`
          const endD = new Date(`${fechaCita}T${horaCita}:00`)
          endD.setMinutes(endD.getMinutes() + (cal.duracion || 30))
          const pad = (x: number) => String(x).padStart(2, '0')
          const endISO = `${fechaCita}T${pad(endD.getHours())}:${pad(endD.getMinutes())}:00-05:00`
          const res = await crearCitaForzada({
            calendarId: cal.calendarId,
            userId: profesionalId,
            startISO,
            endISO,
            titulo: `${servicios.map(s => s.nombre).join(', ')} - ${clienteNombre}`,
            nombre: clienteNombre,
            telefono: clienteTelefono,
            contactId: state?.contactId,
            status: 'showed',
          })
          ghlId = res.id
          ghlContactId = res.contactId
        } catch (e) {
          // No bloquea la venta: si GHL falla, la cita queda solo en el POS
          console.error('No se pudo crear la cita en GHL (se guarda solo en el POS):', e)
        }
      }
    }

    // Si no viene de una cita agendada, usamos el id de GHL (o uno local de respaldo)
    const appointmentId = state?.appointmentId || ghlId || crypto.randomUUID()

    // Merge cafeteria items into productos for storage
    const productosConCafeteria = [
      ...productos,
      ...cafeteria.map(c => ({ nombre: `[Cafetería] ${c.nombre}${c.cantidad > 1 ? ` x${c.cantidad}` : ''}`, precio: c.precio * c.cantidad }))
    ]

    const { error } = await supabase.from('ventas').insert({
      appointment_id: appointmentId,
      contact_id: state?.contactId,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      profesional_id: profesionalId,
      profesional_nombre: prof?.nombre || '',
      fecha_cita: fechaCita,
      hora_cita: horaCita,
      servicios,
      productos: productosConCafeteria,
      total,
      metodo_pago: metodoPago,
      pagado_efectivo: efectivo,
      pagado_digital: digital,
      comision_profesional: comision,
      comision_velik: total - comision,
      notas: notasFinal,
      pagado_transferencia: transferencia,
      pagado_tarjeta: tarjeta,
    })

    // Descontar stock cafetería
    if (!error && cafeteria.length > 0) {
      for (const item of cafeteria) {
        try { await supabase.rpc('decrementar_stock_cafeteria', { item_id: item.id, cantidad: item.cantidad }) } catch {}
      }
    }

    setGuardando(false)
    if (error) {
      console.error('Error guardando venta:', error)
      alert('Error al guardar: ' + error.message)
      return
    }

    await crearContactoEnGHL()

    if (state?.appointmentId) {
      // Actualizar cita existente a "atendida"
      await supabase.from('citas').update({ status: 'showed', precio: total }).eq('id', state.appointmentId)
      updateAppointmentStatus(state.appointmentId, 'showed')
    } else {
      // Crear entrada en el calendario para que aparezca en la agenda de la profesional
      const startISO = `${fechaCita}T${horaCita}:00-05:00`
      const endDate = new Date(`${fechaCita}T${horaCita}:00`)
      endDate.setMinutes(endDate.getMinutes() + 30)
      const endH = String(endDate.getHours()).padStart(2, '0')
      const endM = String(endDate.getMinutes()).padStart(2, '0')
      const endISO = `${fechaCita}T${endH}:${endM}:00-05:00`

      await supabase.from('citas').insert({
        id: appointmentId,
        fecha: fechaCita,
        start_time: startISO,
        end_time: endISO,
        titulo: servicios.map(s => s.nombre).join(', '),
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        contact_id: ghlContactId,
        profesional_id: profesionalId,
        profesional_nombre: prof?.nombre || '',
        calendar_id: buscarCalendario(servicios[0]?.nombre || '')?.calendarId,
        status: 'showed',
        precio: total,
        origen: 'venta_directa',
        ghl_event_id: ghlId,
      })
    }

    setExito(true)
  }

  async function handleGenerarFactura() {
    if (!facturaDoc.trim()) return
    setFacturaGenerando(true)
    setFacturaError('')
    try {
      const todosItems = [
        ...servicios.map(s => ({ nombre: s.nombre, precio: s.precio })),
        ...productos.map(p => ({ nombre: p.nombre, precio: p.precio })),
        ...cafeteria.map(c => ({ nombre: c.nombre, precio: c.precio * c.cantidad })),
      ]
      const result = await generarFacturaAlegra({
        clienteNombre,
        clienteDoc: facturaDoc.trim(),
        tipoDoc: facturaTipo,
        clienteEmail: facturaEmail.trim() || undefined,
        items: todosItems,
        metodoPago,
        fecha: fechaCita || new Date().toISOString().slice(0, 10),
      })
      setFacturaNumero(result.numero)
      setFacturaEmailSent(result.emailSent)
      setFacturaEmitida(result.emitida)
    } catch (err: unknown) {
      setFacturaError(err instanceof Error ? err.message : 'Error al generar factura')
    } finally {
      setFacturaGenerando(false)
    }
  }

  if (exito) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
        <CheckCircle size={64} className="text-[#C9A84C] mb-4" />
        <h2 className="font-serif text-3xl font-light mb-2">¡Venta registrada!</h2>
        <p className="text-[#8a7a6a] mb-8">Total: <strong>${total.toLocaleString('es-CO')}</strong></p>

        {/* Factura electrónica generada */}
        {facturaNumero ? (
          <div className="w-full bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-center">
            <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-800">Factura electrónica generada</p>
            <p className="text-green-700 text-lg font-mono mt-1">{facturaNumero}</p>
            <p className="text-green-600 text-xs mt-1">
              {facturaEmitida ? '✓ Timbrada ante la DIAN' : '⚠️ Creada, pendiente de emitir a la DIAN'}
            </p>
            <p className="text-green-600 text-xs">
              {facturaEmailSent
                ? `✓ Correo enviado${facturaEmail ? ` a ${facturaEmail}` : ' al cliente'}`
                : '⚠️ No se pudo enviar el correo'}
            </p>
          </div>
        ) : mostrarFactura ? (
          <div className="w-full bg-white border border-[#e8ddd5] rounded-2xl p-5 mb-6 text-left">
            <h3 className="font-semibold text-[#5c4a3a] mb-4 flex items-center gap-2">
              <FileText size={18} /> Datos para la factura
            </h3>
            <p className="text-xs text-gray-400 mb-3">Si el cliente no necesita factura a su nombre, deja el documento en blanco — se emite a <strong>Consumidor Final</strong>.</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-2/5">
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select
                    value={facturaTipo}
                    onChange={e => setFacturaTipo(e.target.value as 'CC' | 'NIT' | 'CE' | 'PA')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
                  >
                    <option value="CC">CC</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">CE</option>
                    <option value="PA">Pasaporte</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Número (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: 1234567890"
                    value={facturaDoc}
                    onChange={e => setFacturaDoc(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email (opcional)</label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={facturaEmail}
                  onChange={e => setFacturaEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
                />
              </div>
            </div>
            {facturaError && (
              <p className="text-red-500 text-xs mt-3">{facturaError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setMostrarFactura(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerarFactura}
                disabled={facturaGenerando}
                className="flex-1 py-2 rounded-xl bg-[#8A4B6F] text-white text-sm font-medium disabled:opacity-50"
              >
                {facturaGenerando ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setMostrarFactura(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#8A4B6F] text-[#8A4B6F] font-medium mb-3 hover:bg-[#f9f3f6] transition-colors"
          >
            <FileText size={18} /> Generar Factura Electrónica
          </button>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl bg-[#C9A84C] text-white font-medium hover:bg-[#b8943d] transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        {fromPro && (
          <button onClick={() => navigate('/')} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
            <ChevronLeft size={18} />
          </button>
        )}
        <h2 className="font-serif text-2xl font-light">Nueva Venta</h2>
      </div>

      {/* Cliente */}
      <section className="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a]">Cliente *</h3>
        <ContactSearch
          selectedName={clienteNombre}
          ocultarTelefono={rol !== 'admin'}
          onSelect={(contact) => {
            setClienteNombre(`${contact.nombres} ${contact.apellidos || ''}`.trim())
            setClienteTelefono(contact.telefono)
          }}
        />
      </section>

      {/* Profesional */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Profesional *</h3>
        {fromPro ? (
          <div className="py-3 px-4 rounded-xl text-sm font-medium text-white text-center"
            style={{ backgroundColor: PROFESIONALES.find(p => p.id === profesionalId)?.color || '#C9A84C' }}>
            {PROFESIONALES.find(p => p.id === profesionalId)?.nombre}
          </div>
        ) : (
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
        )}
      </section>

      {/* Fecha y Hora */}
      <section className="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a]">Fecha y Hora *</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={fechaCita}
            onChange={(e) => setFechaCita(e.target.value)}
            className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#C9A84C]"
          />
          <input
            type="time"
            value={horaCita}
            onChange={(e) => setHoraCita(e.target.value)}
            className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
      </section>

      {/* Servicios Seleccionados */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Servicios Seleccionados *</h3>
        <div className="space-y-2 mb-4">
          {servicios.map((sv, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm">{sv.nombre}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-[#8a7a6a]">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={sv.precio === 0 ? '' : sv.precio.toLocaleString('es-CO')}
                      onChange={e => {
                        const raw = parseInt(e.target.value.replace(/\D/g, '')) || 0
                        const updated = [...servicios]
                        updated[i] = { ...updated[i], precio: raw }
                        setServicios(updated)
                      }}
                      placeholder="Precio"
                      className="text-sm border-b border-[#C9A84C] bg-transparent px-1 py-0.5 w-36 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeServicio(i)}
                  className="ml-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Eliminar servicio"
                >
                  <X size={18} />
                </button>
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
          <span className="text-sm text-[#8a7a6a]">Subtotal servicios</span>
          <span className="text-base font-semibold text-[#C9A84C]">${totalServicios.toLocaleString('es-CO')}</span>
        </div>
      </section>

      {/* Productos */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Productos Authentic</h3>

        {/* Productos seleccionados */}
        {productos.length > 0 && (
          <div className="space-y-2 mb-4">
            {productos.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{p.nombre}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-[#8a7a6a]">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.precio === 0 ? '' : p.precio.toLocaleString('es-CO')}
                      onChange={e => {
                        const raw = parseInt(e.target.value.replace(/\D/g, '')) || 0
                        const updated = [...productos]
                        updated[i] = { ...updated[i], precio: raw }
                        setProductos(updated)
                      }}
                      className="text-sm border-b border-[#C9A84C] bg-transparent px-1 py-0.5 w-32 focus:outline-none"
                    />
                  </div>
                </div>
                <button onClick={() => setProductos(prev => prev.filter((_, idx) => idx !== i))}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-2">
                  <X size={16} />
                </button>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-sm text-[#8a7a6a]">Subtotal productos</span>
              <span className="font-semibold text-[#C9A84C]">${totalProductos.toLocaleString('es-CO')}</span>
            </div>
          </div>
        )}

        {/* Selector */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-[#8a7a6a] uppercase tracking-widest font-medium mb-3">Agregar producto</p>
          <ProductoSelector onSelect={p => setProductos(prev => [...prev, { nombre: p.nombre, precio: p.precio }])} />
        </div>
      </section>

      {/* Cafetería */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#4CAF50] mb-3">☕ Cafetería</h3>

        {cafeteria.length > 0 && (
          <div className="space-y-2 mb-4">
            {cafeteria.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.nombre}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Cant:</span>
                      <button onClick={() => setCafeteria(prev => prev.map((c, idx) => idx === i ? { ...c, cantidad: Math.max(1, c.cantidad - 1) } : c))}
                        className="w-5 h-5 rounded bg-gray-200 text-xs font-bold flex items-center justify-center">−</button>
                      <span className="text-sm font-medium w-5 text-center">{item.cantidad}</span>
                      <button onClick={() => setCafeteria(prev => prev.map((c, idx) => idx === i ? { ...c, cantidad: c.cantidad + 1 } : c))}
                        className="w-5 h-5 rounded bg-gray-200 text-xs font-bold flex items-center justify-center">+</button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">$</span>
                      <input type="text" inputMode="numeric"
                        value={item.precio === 0 ? '' : item.precio.toLocaleString('es-CO')}
                        onChange={e => {
                          const raw = parseInt(e.target.value.replace(/\D/g, '')) || 0
                          setCafeteria(prev => prev.map((c, idx) => idx === i ? { ...c, precio: raw } : c))
                        }}
                        placeholder="Precio"
                        className="text-sm border-b border-[#4CAF50] bg-transparent px-1 py-0.5 w-24 focus:outline-none" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {item.precio > 0 && (
                    <span className="text-[#4CAF50] font-semibold text-sm">
                      ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                    </span>
                  )}
                  <button onClick={() => setCafeteria(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">Subtotal cafetería</span>
              <span className="font-semibold text-[#4CAF50]">${totalCafeteria.toLocaleString('es-CO')}</span>
            </div>
          </div>
        )}

        <div className={cafeteria.length > 0 ? 'border-t border-gray-100 pt-4' : ''}>
          {cafeteria.length > 0 && <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">Agregar más</p>}
          <CafeteriaSelector onSelect={item => {
            setCafeteria(prev => {
              const idx = prev.findIndex(c => c.id === item.id)
              if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, cantidad: c.cantidad + 1 } : c)
              return [...prev, item]
            })
          }} />
        </div>
      </section>

      {/* Pago */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Método de pago *</h3>
        <div className="grid grid-cols-2 gap-3">
          {METODOS_PAGO.filter(m => m.value !== 'de_la_casa').map(m => (
            <button
              key={m.value}
              onClick={() => setMetodoPago(m.value as typeof metodoPago)}
              className={`flex flex-col items-center justify-center gap-1 py-4 rounded-xl text-sm font-medium transition-all border-2 ${
                metodoPago === m.value
                  ? 'bg-[#C9A84C] text-white border-[#C9A84C]'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-transparent'
              }`}
            >
              <span className="text-lg leading-none">{METODO_ICONO[m.value]}</span>
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
          <MixtoSelector
            total={total}
            value={mixto}
            onChange={setMixto}
          />
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
      {total > 0 && (() => {
        const pctPro = 40
        const pctVelik = 60
        const comProServ = totalServicios * (pctPro / 100)
        const comVelikServ = totalServicios * (pctVelik / 100)
        const comProProd = totalProductos * 0.05
        const comVelikProd = totalProductos * 0.95
        const totalPro = comProServ + comProProd
        const totalVelik = comVelikServ + comVelikProd
        return metodoPago === 'de_la_casa' ? (
          <div className="bg-purple-50 rounded-2xl p-4 mb-6 text-sm border border-purple-100">
            <p className="text-xs font-medium uppercase tracking-widest text-purple-400 mb-2">De la casa</p>
            <div className="flex justify-between">
              <span className="text-gray-600">Profesional (a pagar)</span>
              <span className="font-medium">${totalPro.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Velik asume</span>
              <span className="font-medium text-purple-600">-${total.toLocaleString('es-CO')}</span>
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
      })()}

      {guardando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 border-4 border-white border-t-[#C9A84C] rounded-full animate-spin" />
          <p className="text-white font-medium text-lg">Registrando venta...</p>
          <p className="text-white/70 text-sm">Por favor no cierres ni recargues</p>
        </div>
      )}
      <button
        onClick={guardar}
        disabled={guardando || !clienteNombre || !profesionalId || (servicios.length === 0 && productos.length === 0 && cafeteria.length === 0)}
        className="w-full py-4 bg-[#C9A84C] text-white rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-[#b8963e] transition-all active:scale-[0.99]"
      >
        {guardando ? 'Registrando...' : 'Confirmar venta'}
      </button>
    </div>
  )
}
