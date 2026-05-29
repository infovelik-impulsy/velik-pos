const GHL_KEY = import.meta.env.VITE_GHL_API_KEY
const LOC = import.meta.env.VITE_GHL_LOCATION_ID
const BASE = 'https://services.leadconnectorhq.com'

const headers = {
  Authorization: `Bearer ${GHL_KEY}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
}

export interface GHLAppointment {
  id: string
  title: string
  startTime: string
  endTime: string
  appointmentStatus: string
  contactId: string
  assignedUserId: string
  contact?: { name: string; phone: string; email: string }
}

export async function getAppointmentsForDay(date: Date): Promise<GHLAppointment[]> {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const params = new URLSearchParams({
    locationId: LOC,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  })

  const r = await fetch(`${BASE}/calendars/events?${params}`, { headers })
  const data = await r.json()
  return data.events || []
}

export async function getContact(contactId: string) {
  const r = await fetch(`${BASE}/contacts/${contactId}`, { headers })
  const data = await r.json()
  return data.contact || null
}

export async function searchContacts(query: string) {
  const params = new URLSearchParams({ locationId: LOC, query })
  const r = await fetch(`${BASE}/contacts/?${params}`, { headers })
  const data = await r.json()
  return data.contacts || []
}

export async function getContactAppointments(contactId: string) {
  const r = await fetch(`${BASE}/contacts/${contactId}/appointments`, { headers })
  const data = await r.json()
  return data.events || []
}
