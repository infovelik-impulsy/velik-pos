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
