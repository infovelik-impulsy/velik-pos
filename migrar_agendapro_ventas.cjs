// Migración AgendaPro → Supabase (tabla ventas)
const fs = require('fs')
const { randomUUID } = require('crypto')

const SUPABASE_URL = 'https://aqoztzznsxhvczkanorr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc'

// Mapeo de profesionales (agendapro → profesional_id)
const PROF_MAP = {
  'hanisha manicurista': 'UzLj5T8ZOrJ8reSig5os',
  'scarlet': 'DEeqUttYKgjjsfNaS1XY',
  'maiglorys manicurista': 'UzLj5T8ZOrJ8reSig5os',
  'luz aida ramirez': 'UzLj5T8ZOrJ8reSig5os',
  'yolanda estilista': 'Bn1QrO4ITpYI7wSohG9r',
  'maria c': 'DEeqUttYKgjjsfNaS1XY',
  'merari': 'UzLj5T8ZOrJ8reSig5os',
  'maiglory': 'UzLj5T8ZOrJ8reSig5os',
  'rumileth manicurista': 'Bn1QrO4ITpYI7wSohG9r',
  'luciana': 'DEeqUttYKgjjsfNaS1XY',
}

function parsePrecio(str) {
  if (!str) return 0
  return Number(str.replace(/[^0-9]/g, '')) || 0
}

function getProfesionalId(nombre) {
  const key = (nombre || '').toLowerCase().trim()
  return PROF_MAP[key] || 'UzLj5T8ZOrJ8reSig5os'
}

// Parse CSV (semicolon separated)
let raw = fs.readFileSync('../velik beauty house/reservas_312993_1780678501.csv', 'latin1')
// Remove BOM
raw = raw.replace(/^﻿/, '')
const lines = raw.split('\n').filter(l => l.trim())

// Índices de columnas
const headerLine = lines[0]
const getIndex = (name) => headerLine.split(';').findIndex(h => h.toLowerCase().includes(name.toLowerCase()))

// Índices específicos
const idx = {
  fecha: 0,
  nombre: 7,
  apellido: 8,
  telefono: 10,
  servicio: 12,
  precioReal: 14,
  prestador: 17,
  estado: 18,
  estadoPago: 19,
  origen: 25,
}

const rows = lines.slice(1).map(line => {
  const vals = line.split(';')
  return {
    fecha: vals[idx.fecha]?.trim() || '',
    nombre: vals[idx.nombre]?.trim() || '',
    apellido: vals[idx.apellido]?.trim() || '',
    telefono: vals[idx.telefono]?.trim() || '',
    servicio: vals[idx.servicio]?.trim() || '',
    precioReal: vals[idx.precioReal]?.trim() || '0',
    prestador: vals[idx.prestador]?.trim() || '',
    estado: vals[idx.estado]?.trim() || '',
    estadoPago: vals[idx.estadoPago]?.trim() || '',
    origen: vals[idx.origen]?.trim() || '',
  }
})

console.log(`Total filas en CSV: ${rows.length}`)

// Build ventas
const ventas = []
let skipped = 0
let totalIngresos = 0

for (const row of rows) {
  try {
    const nombre = `${row.nombre} ${row.apellido}`.trim()
    if (!nombre || nombre.length < 3) {
      skipped++
      continue
    }

    const precioReal = parsePrecio(row.precioReal)
    if (precioReal === 0) {
      skipped++
      continue
    }

    if (!row.fecha || row.fecha.length < 8) {
      skipped++
      continue
    }

    const [dia, mes, año] = row.fecha.split(' ')[0].split('/').map(Number)
    if (!dia || !mes || !año) {
      skipped++
      continue
    }

    const fecha = `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const estado = row.estado.toLowerCase()
    const estadoPago = row.estadoPago.toLowerCase()

    // Solo cargar si está "asiste" y "pago"
    if (estado !== 'asiste' || !estadoPago.includes('pago')) {
      skipped++
      continue
    }

    totalIngresos += precioReal

    ventas.push({
      fecha,
      cliente_nombre: nombre,
      cliente_telefono: row.telefono,
      profesional_id: getProfesionalId(row.prestador),
      profesional_nombre: row.prestador,
      servicios: [{ nombre: row.servicio, precio: precioReal }],
      total: precioReal,
      metodo_pago: 'efectivo',
      pagado_efectivo: precioReal,
      pagado_digital: 0,
      comision_profesional: Math.round(precioReal * 0.5),
      comision_velik: Math.round(precioReal * 0.5),
    })
  } catch (e) {
    skipped++
  }
}

console.log(`Ventas a insertar: ${ventas.length} | Saltadas: ${skipped}`)
console.log(`💰 Total de ingresos: $${totalIngresos.toLocaleString('es-CO')}`)

// Insert in batches
async function insertBatch(batch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ventas`, {
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
  if (ventas.length === 0) {
    console.log('⚠️ No hay ventas para cargar')
    return
  }

  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < ventas.length; i += BATCH) {
    const batch = ventas.slice(i, i + BATCH)
    const status = await insertBatch(batch)
    if (status === 201) {
      inserted += batch.length
      process.stdout.write(`\r Insertadas: ${inserted}/${ventas.length}`)
    } else {
      console.log(`\n❌ Error en batch ${i}-${i+BATCH}: status ${status}`)
    }
  }
  console.log(`\n✅ Migración completada: ${inserted} ventas cargadas`)
  console.log(`💵 Total de ingresos: $${totalIngresos.toLocaleString('es-CO')}`)
}

main()
