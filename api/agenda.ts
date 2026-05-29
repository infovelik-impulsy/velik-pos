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
    console.log(`userId=${userId} status=${r.status} raw=${JSON.stringify(data).slice(0,300)}`)
    return { events: data.events || [], raw: data, status: r.status }
  } catch (e) {
    console.error(`userId=${userId} error:`, e)
    return []
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  // Colombia = UTC-5: midnight COT = 05:00 UTC, 23:59:59 COT = next day 04:59:59 UTC
  const [y, m, dd2] = String(date).split('-').map(Number)
  const start = String(Date.UTC(y, m - 1, dd2, 5, 0, 0, 0))
  const end = String(Date.UTC(y, m - 1, dd2 + 1, 4, 59, 59, 999))

  const results = await Promise.all(
    PROFESIONALES.map(p => fetchByUser(p.id, start, end))
  )

  const rawResponses = results.map((r: any, i) => ({ userId: PROFESIONALES[i].id, status: r.status, raw: r.raw }))
  const all = results.flatMap((r: any) => r.events)
  const unique = Array.from(new Map(all.map((e: any) => [e.id, e])).values())
  const active = (unique as any[]).filter((e: any) => !e.deleted && e.appointmentStatus !== 'cancelled')

  res.json({ events: active, _debug: { start, end, keyPresent: !!GHL_KEY, total: all.length, rawResponses } })
}
