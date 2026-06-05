// Migración histórica AgendaPro → Supabase (solo, no GHL)
const fs = require('fs')
const { randomUUID } = require('crypto')

const SUPABASE_URL = 'https://aqoztzznsxhvczkanorr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc'

const PROF_MAP = {
  'carolina paz':                  { id: 'Bn1QrO4ITpYI7wSohG9r', nombre: 'Carolina Paz' },
  'laura vanessa ramirez jimenez': { id: 'DEeqUttYKgjjsfNaS1XY', nombre: 'Laura Vanessa' },
  'luz aida ramirez':              { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Luz Aida' },
  'estefania arias':               { id: 'estefania_arias',       nombre: 'Estefania Arias' },
  'jesica zambrano':               { id: 'jesica_zambrano',       nombre: 'Jesica Zambrano' },
  'daniela':                       { id: 'daniela',               nombre: 'Daniela' },
  'mayerli':                       { id: 'mayerli',               nombre: 'Mayerli' },
}

const STATUS_MAP = {
  'asiste':     'showed',
  'no asiste':  'noshow',
  'cancelado':  'cancelled',
  'reservado':  'confirmed',
  'confirmado': 'confirmed',
  'en espera':  'confirmed',
  'pendiente':  'confirmed',
}

function parseDateTime(str) {
  const [datePart, timePart] = str.trim().split(' ')
  if (!datePart || !timePart) throw new Error('bad date: ' + str)
  const [dd, mm, yyyy] = datePart.split('/')
  const [hh, mi] = timePart.split(':')
  const d = new Date(Date.UTC(Number(yyyy), Number(mm)-1, Number(dd), Number(hh)+5, Number(mi)))
  if (isNaN(d.getTime())) throw new Error('invalid date: ' + str)
  return d
}

function formatPrecio(val) {
  const n = Number(val)
  if (!n) return '$0'
  return '$' + n.toLocaleString('es-CO')
}

// Parse CSV (semicolon separated)
const raw = fs.readFileSync('./reservas_312993_enero_abril.csv', 'latin1')
const lines = raw.split('\n').filter(l => l.trim())
const headers = lines[0].split(';').map(h => h.trim())

const rows = lines.slice(1).map(line => {
  const vals = line.split(';')
  const obj = {}
  headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim() })
  return obj
})

console.log(`Total filas en CSV: ${rows.length}`)

// Build citas
const citas = []
let skipped = 0

for (const row of rows) {
  const fechaStr = row['Fecha de realización']
  if (!fechaStr) { skipped++; continue }

  const profKey = (row['Prestador'] || '').toLowerCase().trim()
  const prof = PROF_MAP[profKey]
  if (!prof) {
    // Unknown professional — use raw name
    const nombre = row['Prestador'] || 'Desconocido'
    var profId = nombre.toLowerCase().replace(/\s+/g, '_')
    var profNombre = nombre
  } else {
    var profId = prof.id
    var profNombre = prof.nombre
  }

  const statusRaw = (row['Estado'] || '').toLowerCase().trim()
  const status = STATUS_MAP[statusRaw] || 'confirmed'

  let startTime, endTime, fecha
  try {
    startTime = parseDateTime(fechaStr)
    endTime = new Date(startTime.getTime() + 60 * 60000) // +60min default
    fecha = fechaStr.split(' ')[0].split('/').reverse().join('-') // DD/MM/YYYY → YYYY-MM-DD
  } catch(e) {
    skipped++; continue
  }

  const clienteNombre = [row['Nombre'], row['Apellido']].filter(Boolean).join(' ').trim() || 'Sin nombre'
  const precio = formatPrecio(row['Precio real'] || row['Precio lista'] || '0')

  citas.push({
    id: randomUUID(),
    fecha,
    start_time: startTime.toISOString(),
    end_time:   endTime.toISOString(),
    titulo:     row['Servicio'] || '',
    cliente_nombre:   clienteNombre,
    cliente_telefono: row['Teléfono'] || '',
    contact_id:       '',
    profesional_id:   profId,
    profesional_nombre: profNombre,
    precio,
    status,
    origen: row['Origen']?.toLowerCase() === 'online' ? 'web' : 'manual',
  })
}

console.log(`Citas a insertar: ${citas.length} | Saltadas: ${skipped}`)

// Insert in batches of 200
async function insertBatch(batch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/citas`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(batch),
  })
  return res.status
}

async function main() {
  const BATCH = 200
  let inserted = 0
  for (let i = 0; i < citas.length; i += BATCH) {
    const batch = citas.slice(i, i + BATCH)
    const status = await insertBatch(batch)
    if (status === 201) {
      inserted += batch.length
      process.stdout.write(`\r Insertadas: ${inserted}/${citas.length}`)
    } else {
      console.log(`\n❌ Error en batch ${i}-${i+BATCH}: status ${status}`)
    }
  }
  console.log(`\n✅ Migración completa: ${inserted} citas históricas cargadas`)
}

main()
