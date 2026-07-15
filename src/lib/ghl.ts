const LOC = import.meta.env.VITE_GHL_LOCATION_ID
const PROXY = '/api/ghl'

export interface GHLAppointment {
  id: string
  title: string
  startTime: string
  endTime: string
  appointmentStatus: string
  contactId: string
  assignedUserId: string
}

export async function getAppointmentsForDay(date: Date): Promise<GHLAppointment[]> {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const r = await fetch(`https://santiagon8nmejia.dominadoresia.com/webhook/velik-agenda?date=${yyyy}-${mm}-${dd}`)
  const data = await r.json()
  return data.events || []
}

export async function getContact(contactId: string) {
  const params = new URLSearchParams({ path: `contacts/${contactId}` })
  const r = await fetch(`${PROXY}?${params}`)
  const data = await r.json()
  return data.contact || null
}

export async function searchContacts(query: string) {
  const params = new URLSearchParams({ path: 'contacts/', locationId: LOC, query })
  const r = await fetch(`${PROXY}?${params}`)
  const data = await r.json()
  return data.contacts || []
}

export async function updateAppointmentStatus(appointmentId: string, status: 'showed' | 'noshow' | 'cancelled') {
  try {
    await fetch('https://santiagon8nmejia.dominadoresia.com/webhook/velik-cita-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, status }),
    })
  } catch (e) {
    console.error('Error actualizando estado en GHL:', e)
  }
}

export async function getContactAppointments(contactId: string) {
  const params = new URLSearchParams({ path: `contacts/${contactId}/appointments` })
  const r = await fetch(`${PROXY}?${params}`)
  const data = await r.json()
  return data.events || []
}

// ── Creación forzada (salta validación de slot / hora) ───────────────────────
// Permite agendar en cualquier hora libre (incluida hoy, aunque ya pasó la hora
// o no cabría antes del cierre), a diferencia del webhook booking/crear que sí
// valida disponibilidad. Escribe directo en el calendario de GHL.

async function ghlRequest(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const params = new URLSearchParams({ path })
  const r = await fetch(`${PROXY}?${params}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data }
}

async function ghlPost(path: string, body: unknown) {
  return ghlRequest('POST', path, body)
}

// Sincroniza a GHL los cambios hechos en "Editar Cita" del POS (profesional,
// fecha/hora, título). Sin esto, editar una cita solo actualiza Supabase y el
// calendario de GHL queda desactualizado (causa real de un caso real: la
// profesional aparecía distinta en GHL vs POS tras reasignar desde el POS).
export async function updateAppointmentInGHL(appointmentId: string, updates: {
  assignedUserId?: string
  startTime?: string // ISO con offset -05:00
  endTime?: string
  title?: string
}): Promise<{ ok: boolean }> {
  const res = await ghlRequest('PUT', `calendars/events/appointments/${appointmentId}`, updates)
  return { ok: res.ok }
}

async function upsertContactoGHL(nombre: string, telefono: string): Promise<string | null> {
  const tel = telefono.startsWith('+') ? telefono : '+57' + telefono.replace(/\D/g, '')
  const [firstName, ...rest] = nombre.trim().split(/\s+/)
  const res = await ghlPost('contacts/upsert', {
    locationId: LOC,
    firstName,
    lastName: rest.join(' '),
    phone: tel,
    source: 'POS - Velik Beauty',
  })
  const contact = res.data?.contact as { id?: string } | undefined
  return contact?.id || null
}

export interface CrearCitaForzadaInput {
  calendarId: string
  userId: string
  startISO: string   // ej: 2026-07-08T17:30:00-05:00 (conservar offset -05:00)
  endISO: string
  titulo: string
  nombre: string
  telefono: string
  contactId?: string // si ya se conoce el contactId de GHL, se evita el upsert
  status?: 'confirmed' | 'showed'
}

export async function crearCitaForzada(input: CrearCitaForzadaInput): Promise<{ id: string; contactId: string }> {
  let contactId = input.contactId
  if (!contactId) {
    contactId = (await upsertContactoGHL(input.nombre, input.telefono)) || undefined
  }
  if (!contactId) throw new Error('No se pudo obtener/crear el contacto en GHL')

  const res = await ghlPost('calendars/events/appointments', {
    calendarId: input.calendarId,
    locationId: LOC,
    contactId,
    startTime: input.startISO,
    endTime: input.endISO,
    title: input.titulo,
    appointmentStatus: input.status || 'confirmed',
    assignedUserId: input.userId,
    ignoreDateRange: true,
    ignoreFreeSlotValidation: true,
    toNotify: false,
  })
  const id = res.data?.id as string | undefined
  if (!res.ok || !id) throw new Error((res.data?.message as string) || `GHL appointment ${res.status}`)
  return { id, contactId }
}
