// Migración Completa AgendaPro → Supabase (18/12/2024 - 05/06/2026)
const fs = require('fs')
const { randomUUID } = require('crypto')

const SUPABASE_URL = 'https://aqoztzznsxhvczkanorr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc'

// Mapeo de profesionales
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
  'estefania arias': 'Bn1QrO4ITpYI7wSohG9r',
  'laura vanessa ramirez jimenez': 'DEeqUttYKgjjsfNaS1XY',
  'carolina paz': 'Bn1QrO4ITpYI7wSohG9r',
  'jesica zambrano': 'UzLj5T8ZOrJ8reSig5os',
  'fay': 'DEeqUttYKgjjsfNaS1XY',
  'katherine pinto': 'Bn1QrO4ITpYI7wSohG9r',
}

function parsePrecio(str) {
  if (!str) return 0
  return Number(str.replace(/[^0-9]/g, '')) || 0
}

function getProfesionalId(nombre) {
  const key = (nombre || '').toLowerCase().trim()
  return PROF_MAP[key] || 'UzLj5T8ZOrJ8reSig5os'
}

function procesarArchivo(csvPath) {
  console.log(`\n📂 Procesando: ${csvPath}`)

  let raw = fs.readFileSync(csvPath, 'latin1')
  raw = raw.replace(/^﻿/, '')
  const lines = raw.split('\n').filter(l => l.trim())

  const rows = lines.slice(1).map(line => {
    const vals = line.split(';')
    return {
      fecha: vals[0]?.trim() || '',
      nombre: vals[7]?.trim() || '',
      apellido: vals[8]?.trim() || '',
      telefono: vals[10]?.trim() || '',
      servicio: vals[12]?.trim() || '',
      precioReal: vals[14]?.trim() || '0',
      prestador: vals[17]?.trim() || '',
      estado: vals[18]?.trim() || '',
      estadoPago: vals[19]?.trim() || '',
    }
  })

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

  console.log(`  ✓ Ventas válidas: ${ventas.length}`)
  console.log(`  → Total: $${totalIngresos.toLocaleString('es-CO')}`)

  return { ventas, totalIngresos, skipped }
}

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

async function cargarArchivos() {
  const archivos = [
    '../velik beauty house/diciembre2024_18mayo2025.csv',
    '../velik beauty house/reservas_312993_1780676426.csv',
    '../velik beauty house/reservas_312993_1780676613.csv',
    '../velik beauty house/reservas_21septiembre_21diciembre.csv',
    '../velik beauty house/reservas_312993_1780678501.csv',
    '../velik beauty house/reservas_01abril_05junio_2026.csv',
  ]

  let ventasTotales = []
  let totalGeneralIngresos = 0
  let totalSkipped = 0

  console.log('🚀 INICIANDO MIGRACIÓN COMPLETA 18/12/2024 - 05/06/2026\n')

  for (const archivoPath of archivos) {
    try {
      const { ventas, totalIngresos, skipped } = procesarArchivo(archivoPath)
      ventasTotales = ventasTotales.concat(ventas)
      totalGeneralIngresos += totalIngresos
      totalSkipped += skipped
    } catch (e) {
      console.log(`❌ Error procesando ${archivoPath}: ${e.message}`)
    }
  }

  console.log(`\n📊 RESUMEN TOTAL:`)
  console.log(`  Registros válidos: ${ventasTotales.length}`)
  console.log(`  Registros saltados: ${totalSkipped}`)
  console.log(`  Total ingresos: $${totalGeneralIngresos.toLocaleString('es-CO')}\n`)

  if (ventasTotales.length === 0) {
    console.log('⚠️ No hay ventas para cargar')
    return
  }

  // Cargar a Supabase
  console.log('💾 Cargando a Supabase...')
  const BATCH = 100
  let inserted = 0

  for (let i = 0; i < ventasTotales.length; i += BATCH) {
    const batch = ventasTotales.slice(i, i + BATCH)
    const status = await insertBatch(batch)
    if (status === 201) {
      inserted += batch.length
      process.stdout.write(`\r  Insertadas: ${inserted}/${ventasTotales.length}`)
    } else {
      console.log(`\n❌ Error en batch ${i}-${i+BATCH}: status ${status}`)
    }
  }

  console.log(`\n\n✅ MIGRACIÓN COMPLETADA`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📅 Período: 18/12/2024 - 05/06/2026`)
  console.log(`💰 Total cargado: $${totalGeneralIngresos.toLocaleString('es-CO')}`)
  console.log(`📦 Registros insertados: ${inserted}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

cargarArchivos()
