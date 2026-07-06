const ALEGRA_USER = 'impulxn8n@gmail.com'
const ALEGRA_TOKEN = 'd9c293eecbc1240e6b73'
const ALEGRA_BASE = 'https://api.alegra.com/api/v1'
const ALEGRA_TEMPLATE_ID = '15' // Factura electrónica VEL
const CONSUMIDOR_FINAL_ID = 1   // Cliente genérico por defecto
const ITEM_SERVICIO_ID = 1      // Item genérico "Servicio de belleza"

function authHeader() {
  return 'Basic ' + btoa(`${ALEGRA_USER}:${ALEGRA_TOKEN}`)
}

export interface DatosFactura {
  clienteNombre: string
  clienteDoc?: string           // opcional — si no viene, usa Consumidor Final
  tipoDoc?: 'CC' | 'NIT' | 'CE' | 'PA'
  clienteEmail?: string
  items: { nombre: string; precio: number }[]
  metodoPago: string
  fecha: string
}

export async function generarFacturaAlegra(datos: DatosFactura): Promise<{ numero: string; id: string }> {
  let clienteId: number | string = CONSUMIDOR_FINAL_ID

  if (datos.clienteDoc?.trim()) {
    // 1. Buscar cliente existente
    const buscar = await fetch(
      `${ALEGRA_BASE}/contacts?identification=${encodeURIComponent(datos.clienteDoc.trim())}`,
      { headers: { Authorization: authHeader() } }
    )
    const lista = buscar.ok ? await buscar.json() : []
    const encontrado = Array.isArray(lista)
      ? lista.find((c: { identification?: string }) => c.identification === datos.clienteDoc!.trim())
      : null

    if (encontrado) {
      clienteId = encontrado.id
    } else {
      // 2. Crear cliente nuevo
      const crear = await fetch(`${ALEGRA_BASE}/contacts`, {
        method: 'POST',
        headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: datos.clienteNombre,
          nameObject: {
            firstName: datos.clienteNombre.split(' ')[0] || datos.clienteNombre,
            lastName: datos.clienteNombre.split(' ').slice(1).join(' ') || datos.clienteNombre.split(' ')[0],
          },
          identification: datos.clienteDoc.trim(),
          kindOfPerson: 'PERSON_ENTITY',
          identificationObject: { type: datos.tipoDoc || 'CC', number: datos.clienteDoc.trim() },
          type: ['client'],
          ...(datos.clienteEmail ? { email: datos.clienteEmail } : {}),
        }),
      })
      const nuevo = await crear.json()
      if (!nuevo.id) throw new Error(nuevo.message || 'No se pudo crear el cliente en Alegra')
      clienteId = nuevo.id
    }
  }

  const paymentForm = 'CASH'

  const res = await fetch(`${ALEGRA_BASE}/invoices`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: datos.fecha,
      dueDate: datos.fecha,
      status: 'open',
      numberTemplate: { id: ALEGRA_TEMPLATE_ID },
      client: { id: clienteId },
      items: datos.items.map(item => ({
        id: ITEM_SERVICIO_ID,
        name: item.nombre,
        description: item.nombre,
        price: item.precio,
        quantity: 1,
      })),
      paymentForm,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || `Error ${res.status}`)
  }

  const data = await res.json()
  const numero = data.numberTemplate?.fullNumber
    || (data.numberTemplate?.prefix
      ? `${data.numberTemplate.prefix}${data.numberTemplate.number}`
      : String(data.id))

  // Enviar por email si hay correo
  const email = datos.clienteEmail?.trim()
  if (email && data.id) {
    await fetch(`${ALEGRA_BASE}/invoices/${data.id}/email`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: [email] }),
    }).catch(() => {})
  }

  return { id: String(data.id), numero }
}
