import type { VercelRequest, VercelResponse } from '@vercel/node'

const GHL_KEY = (process.env.GHL_API_KEY || process.env.VITE_GHL_API_KEY)!
const BASE = 'https://services.leadconnectorhq.com'

const PROFESIONALES = [
  { id: 'Bn1QrO4ITpYI7wSohG9r', nombre: 'Carolina Paz' },
  { id: 'DEeqUttYKgjjsfNaS1XY', nombre: 'Laura Vanessa' },
  { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Luz Aida' },
]

async function fetchByUser(userId: string, startTime: string, endTime: string) {
  const url = `${BASE}/calendars/events?userId=${userId}&startTime=${startTime}&endTime=${endTime}`
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${GHL_KEY}`, Version: '2021-04-15' }
    })
    const data = await r.json()
    return data.events || []
  } catch {
    return []
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const d = new Date(String(date))
  d.setHours(0, 0, 0, 0)
  const start = String(d.getTime())
  d.setHours(23, 59, 59, 999)
  const end = String(d.getTime())

  const results = await Promise.all(
    PROFESIONALES.map(p => fetchByUser(p.id, start, end))
  )

  const all = results.flat()
  const unique = Array.from(new Map(all.map(e => [e.id, e])).values())
  const active = unique.filter(e => !e.deleted && e.appointmentStatus !== 'cancelled')
  active.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  res.json({ events: active })
}
