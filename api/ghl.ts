import type { VercelRequest, VercelResponse } from '@vercel/node'

const GHL_KEY = process.env.VITE_GHL_API_KEY!
const LOC = process.env.VITE_GHL_LOCATION_ID!
const BASE = 'https://services.leadconnectorhq.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path, ...query } = req.query
  const pathStr = Array.isArray(path) ? path.join('/') : path || ''

  const params = new URLSearchParams()
  Object.entries(query).forEach(([k, v]) => {
    if (v) params.set(k, String(v))
  })

  const url = `${BASE}/${pathStr}${params.toString() ? '?' + params.toString() : ''}`

  const r = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${GHL_KEY}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  })

  const data = await r.json()
  res.status(r.status).json(data)
}
