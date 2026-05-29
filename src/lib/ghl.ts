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
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const params = new URLSearchParams({
    path: 'calendars/events',
    locationId: LOC,
    startTime: String(start.getTime()),
    endTime: String(end.getTime()),
  })

  const r = await fetch(`${PROXY}?${params}`)
  const data = await r.json()
  console.log('GHL events response:', data)
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

export async function getContactAppointments(contactId: string) {
  const params = new URLSearchParams({ path: `contacts/${contactId}/appointments` })
  const r = await fetch(`${PROXY}?${params}`)
  const data = await r.json()
  return data.events || []
}
