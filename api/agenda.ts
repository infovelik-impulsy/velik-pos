import type { VercelRequest, VercelResponse } from '@vercel/node'

const GHL_KEY = (process.env.GHL_API_KEY || process.env.VITE_GHL_API_KEY)!
const BASE = 'https://services.leadconnectorhq.com'

const CALENDAR_IDS = [
  "EDiqwAb54xY6nID5yzB8","ItIbYfgFYYvZYQ6Oje0B","uyBy6KxStea3tyJXkxvE","58aCvkqxbMBcFFPgZmyk",
  "HhrSGv6kTKZOtLwLtLaO","yVTJ5MuqOiTIG6aW4Zzu","5FzBoBw7GCdwViMPesPC","MmI8fIlxThj3dg3qXB5E",
  "JuHPG8vMNXKSOiyVNzjR","g7a3uGcoBdAdrffowsY1","DIDIge2ItuyDQU3hfjqA","CwNB6YUweNhSrYOTFElB",
  "rSP0C1qAAvA82qSGwSsz","UdfCTzTMPNhYuemDnWsb","54RoAHSPDVzWjfk4N2cR","CUY39YrfaRmiHvMdGTol",
  "KDdZgv19rQYsaxXNeIMB","NbDO7tF3rTsVlsNAqweR","yENMASOfLO8JTFgjW23z","74JOMcKwGJTEqfgqo2Ra",
  "ZIeJPQLAeo3bM3tLDL8z","Oi2Dn1v3MpIR3wn06LyY","szaDqVWMTKAFCVcYjgTh","MPv75km6l8sal1NKHqtV",
  "1OpkJJuQoNlATF5hd9Zi","tKn5Hy3A7pKqg7nhVpgC","XbxF4HF4VH3KNB16sNBU","FJDuHD0L2DqBLPUeYsqM",
  "rcuBG3bPRNwG11VFqgH2","0jYIRtI8bl33hIyhVJC1","xpyrWObNXPeV2kMJtlIy","zfKlMG4wsoLWam1yRQCl",
  "OYVNrcCxrbSYEd1SbV3f","z6VLaBzxm2hxO4JglzOI","ZLEVvENlOAsJdUVyyLGf","iAOrgphopFSqRQt5dxTm",
  "FMTaDks9JBTh1hXZ9k2U","fcpxmqMktM3vzoyrhumR","tYgB9RKWsWnAY6yzHbzo","YsyBC5BKtrnN8YQYRDBm",
  "aO1pbT4UQDyqLJwXnPqX","NFFYkmfD3gwaVACAOBxq","tdu7sEKcoUaJGN6TS5dR","XEmC3LZdNFLzri44z5fe",
  "SZnHg7E8gOsBB0CxxpAk","HXfDgBJXCdD5xD7rqgmW","AFzeRInudMfQvytS7rYI","BhjqV08NlQwTyAer5Rah",
  "zxVN8YcfF9nQh3uOhLcD","IM2RYaBSfWNytuAmACml","eSmQWFTgnrsIhICBidoF","pyw2lCLu7OmMz5i1Xj0i",
  "cYESJstUsKOBcrKLfI61","4aMo5CLViO46g2Q6jnip","6V88WbxYuumHKt5RBfGO","gJhd4efPJ7Zs7Ogybq95",
  "7G42EdlizK39sGWSRTWO","Z7WKPMSF94iQoA8Mf9ne","JGZXM08wqm28dl4qfp9T","KuZ6tseSF1WIC3wmAwGj",
  "dry2VkC24zeouSdN4VEm","dbxPJAla6tTHNv73eo1l","4O1RVMdKaXEUaHqQqVP1","yuikssBrbkVHsArQoe65",
  "zT9oLreL1DCiwWDmO1Dx","VYpzK2GHuBJ63aO2lSaV","ozLRNZ5V55zBOpGxcygz","n49lc4VkUvtvdtCRcgTB",
  "GcGJ59uvGEDf3LZCyrg2","cmyFlDKVr8UemAn9N71W","eRj3f8o8CLcD7i0rIgm3","mfXJuW1bdCIPV4GgCSx3",
  "1vn5jyzI6R8TstZCZhOI","mSw9Swdz68i0hC5cqNme","9HqMBn6P9DBAsMqZmFit","woQv67dSOZkRipYxGaXm",
  "UKZG99bvj0QCeFJaLNk7","eHXH3nwnTLLoacCnQKeh","9M1FFJKZmz9tPhwEitAb","whI104AHCNJGaV35yii2",
  "ZdfgP31Jmj4hWCEezhda","hKENNyPe7hZhcz5HGHny","71J4eTC3TIEuDXfsP1Iw","hdrmUKbZXwO4tbNVsIkb",
  "PelRqVASPHp0QEu7P5Xs","OybBhb6gij304Vromp7n","wAwK46EAzP7OMVbVZ4Na","q2Iz4gfTyoB3JkRNZ4CZ",
  "kjgB0Whm8mjpYv8I075K","8iU9qGnCM5nT6816pEAh","uajeiWuAmnwZ9BPA4RlT","9PiZEDHNec91qK58o3de",
  "xU7HfkiIbhZwHo1EnrTz","vxUBF94v8PKqobjUBeZc","fz9614uqbCIz8bLDXYNR","6Gq72d3MJ8FqYsWYEeWD",
]

async function fetchCalendar(calendarId: string, startTime: string, endTime: string) {
  const url = `${BASE}/calendars/events?calendarId=${calendarId}&startTime=${startTime}&endTime=${endTime}`
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
    CALENDAR_IDS.map(id => fetchCalendar(id, start, end))
  )

  const all = results.flat()
  const unique = Array.from(new Map(all.map(e => [e.id, e])).values())
  const active = unique.filter(e => !e.deleted && e.appointmentStatus !== 'cancelled')
  active.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  res.json({ events: active })
}
