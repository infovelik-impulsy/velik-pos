import type { VercelRequest, VercelResponse } from '@vercel/node'

// Nota: la key en VITE_GHL_API_KEY del .env (pit-b1ad6877…) está rechazada (401).
// Se prioriza GHL_API_KEY de Vercel y, como respaldo, la key válida vigente.
const GHL_KEY = process.env.GHL_API_KEY || 'pit-022a5206-1196-4066-8957-50cf5634da09'
const LOC = (process.env.GHL_LOCATION_ID || process.env.VITE_GHL_LOCATION_ID)!
const BASE = 'https://services.leadconnectorhq.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path, ...query } = req.query
  const pathStr = Array.isArray(path) ? path.join('/') : path || ''

  const params = new URLSearchParams()
  Object.entries(query).forEach(([k, v]) => {
    if (v) params.set(k, String(v))
  })

  const url = `${BASE}/${pathStr}${params.toString() ? '?' + params.toString() : ''}`
  console.log('GHL proxy →', url)
  console.log('Key present:', !!GHL_KEY, '| LOC:', LOC)

  const version = pathStr.startsWith('calendars') || pathStr.startsWith('contacts') && pathStr.includes('appointments') ? '2021-04-15' : '2021-07-28'

  try {
    const r = await fetch(url, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${GHL_KEY}`,
        Version: version,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    })

    const data = await r.json()
    console.log('GHL response status:', r.status, JSON.stringify(data).slice(0, 200))
    res.status(r.status).json(data)
  } catch (e) {
    console.error('GHL proxy error:', e)
    res.status(500).json({ error: String(e) })
  }
}
