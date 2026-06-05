// Migración de citas de AgendaPro → GHL + Supabase
const GHL_KEY = 'pit-8372873c-1348-4b71-948e-80b860032966'
const LOCATION_ID = '0zeAaf3V1WrlkbyD4tJo'
const SUPABASE_URL = 'https://aqoztzznsxhvczkanorr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc'

const CP = 'Bn1QrO4ITpYI7wSohG9r'   // Carolina Paz
const LV = 'DEeqUttYKgjjsfNaS1XY'   // Laura Vanessa
const LA = 'UzLj5T8ZOrJ8reSig5os'   // Luz Aida

// Colombia = UTC-5
function toUTC(fecha, hora) {
  const [y, m, d] = fecha.split('-').map(Number)
  const [h, min] = hora.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, h + 5, min))
}

const CITAS = [
  // ── HOY 4 junio ──
  {
    fecha: '2026-06-04', hora: '10:00', duracion: 60,
    cliente: { nombre: 'Olga Lucia', telefono: '+573005446916' },
    servicio: 'Manos Semipermanente', calendarId: 'EDiqwAb54xY6nID5yzB8',
    profesionalId: LV, profesionalNombre: 'Laura Vanessa', precio: '$60.000',
  },
  {
    fecha: '2026-06-04', hora: '13:00', duracion: 60,
    cliente: { nombre: 'María José Becerra', telefono: '+573165000275' },
    servicio: 'Lifting de Pestañas', calendarId: 'Z7WKPMSF94iQoA8Mf9ne',
    profesionalId: CP, profesionalNombre: 'Carolina Paz', precio: '$120.000',
    nota: 'Abona $30.000 el 21 mayo por transferencia',
  },
  {
    fecha: '2026-06-04', hora: '18:30', duracion: 15,
    cliente: { nombre: 'Clara Salazar', telefono: '+573143310912' },
    servicio: 'Depilación de Cejas con Hilo', calendarId: 'ozLRNZ5V55zBOpGxcygz',
    profesionalId: CP, profesionalNombre: 'Carolina Paz', precio: '$30.000',
  },
  // ── 5 junio ──
  {
    fecha: '2026-06-05', hora: '11:15', duracion: 45,
    cliente: { nombre: 'Catalina Salazar', email: 'catysalazar_@hotmail.com', telefono: '+573113840060' },
    servicio: 'Tradicional Pies', calendarId: 'XbxF4HF4VH3KNB16sNBU',
    profesionalId: LV, profesionalNombre: 'Laura Vanessa', precio: '$40.000',
  },
  // ── 6 junio ──
  {
    fecha: '2026-06-06', hora: '09:00', duracion: 80,
    cliente: { nombre: 'Danna Castro', telefono: '+573216731542' },
    servicio: 'Retoque Press On', calendarId: 'rSP0C1qAAvA82qSGwSsz',
    profesionalId: LV, profesionalNombre: 'Laura Vanessa', precio: '$85.000',
  },
  {
    fecha: '2026-06-06', hora: '09:00', duracion: 35,
    cliente: { nombre: 'Daniela Meneses', telefono: '+573183834814' },
    servicio: 'Corte en Capas', calendarId: 'cYESJstUsKOBcrKLfI61',
    profesionalId: CP, profesionalNombre: 'Carolina Paz', precio: '$70.000',
  },
  {
    fecha: '2026-06-06', hora: '12:00', duracion: 45,
    cliente: { nombre: 'Yessica Ospina', email: 'ospinaoperaciones22@gmail.com', telefono: '+573159333366' },
    servicio: 'Manos Tradicional', calendarId: 'ItIbYfgFYYvZYQ6Oje0B',
    profesionalId: LA, profesionalNombre: 'Luz Aida', precio: '$35.000',
  },
  {
    fecha: '2026-06-06', hora: '12:00', duracion: 45,
    cliente: { nombre: 'Yessica Ospina', email: 'ospinaoperaciones22@gmail.com', telefono: '+573159333366' },
    servicio: 'Tradicional Pies', calendarId: 'XbxF4HF4VH3KNB16sNBU',
    profesionalId: LV, profesionalNombre: 'Laura Vanessa', precio: '$40.000',
  },
  {
    fecha: '2026-06-06', hora: '12:45', duracion: 45,
    cliente: { nombre: 'Yessica Ospina', email: 'ospinaoperaciones22@gmail.com', telefono: '+573159333366' },
    servicio: 'Tradicional Pies', calendarId: 'XbxF4HF4VH3KNB16sNBU',
    profesionalId: LA, profesionalNombre: 'Luz Aida', precio: '$40.000',
  },
  // ── 10 junio ──
  {
    fecha: '2026-06-10', hora: '09:30', duracion: 70,
    cliente: { nombre: 'Susana Bohorquez', email: 'susanabo1008@gmail.com', telefono: '+573054712245' },
    servicio: 'Pedicura Semi + Pedi Spa', calendarId: '1OpkJJuQoNlATF5hd9Zi',
    profesionalId: LV, profesionalNombre: 'Laura Vanessa', precio: '$105.000',
  },
  // ── 13 junio ──
  {
    fecha: '2026-06-13', hora: '14:00', duracion: 60,
    cliente: { nombre: 'Amalia Cardona', email: 'amaliacardonahg@gmail.com', telefono: '+573225123364' },
    servicio: 'Pies Semi Permanente', calendarId: 'szaDqVWMTKAFCVcYjgTh',
    profesionalId: CP, profesionalNombre: 'Carolina Paz', precio: '$60.000',
  },
  {
    fecha: '2026-06-13', hora: '15:00', duracion: 80,
    cliente: { nombre: 'Miguel Jaramillo', telefono: '+573169991030' },
    servicio: 'Evolution (Manos y Pies)', calendarId: 'ZLEVvENlOAsJdUVyyLGf',
    profesionalId: LV, profesionalNombre: 'Laura Vanessa', precio: '$85.000',
  },
  {
    fecha: '2026-06-13', hora: '15:00', duracion: 60,
    cliente: { nombre: 'Miguel Jaramillo', telefono: '+573169991030' },
    servicio: 'Masaje Relajación Piedras Volcánicas + Velas', calendarId: 'q2Iz4gfTyoB3JkRNZ4CZ',
    profesionalId: LA, profesionalNombre: 'Luz Aida', precio: '$140.000',
  },
]

async function upsertContacto(cliente) {
  const body = {
    locationId: LOCATION_ID,
    firstName: cliente.nombre.split(' ')[0],
    lastName: cliente.nombre.split(' ').slice(1).join(' ') || '',
    phone: cliente.telefono,
  }
  if (cliente.email) body.email = cliente.email

  const res = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GHL_KEY}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return data.contact?.id || data.id
}

async function crearCitaGHL(cita, contactId) {
  const startTime = toUTC(cita.fecha, cita.hora)
  const endTime = new Date(startTime.getTime() + cita.duracion * 60000)

  const body = {
    calendarId: cita.calendarId,
    locationId: LOCATION_ID,
    contactId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    title: cita.servicio,
    appointmentStatus: 'confirmed',
    assignedUserId: cita.profesionalId,
    ignoreDateRange: true,
    toNotify: false,
  }

  const res = await fetch('https://services.leadconnectorhq.com/calendars/events/appointments', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GHL_KEY}`, 'Version': '2021-04-15', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return data.id || data.event?.id
}

async function crearCitaSupabase(cita, contactId, ghlId) {
  const startTime = toUTC(cita.fecha, cita.hora)
  const endTime = new Date(startTime.getTime() + cita.duracion * 60000)

  const { randomUUID } = require('crypto')
  const body = {
    id: randomUUID(),
    fecha: cita.fecha,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    titulo: cita.servicio,
    cliente_nombre: cita.cliente.nombre,
    cliente_telefono: cita.cliente.telefono,
    contact_id: contactId || '',
    profesional_id: cita.profesionalId,
    profesional_nombre: cita.profesionalNombre,
    precio: cita.precio,
    status: 'confirmed',
    origen: 'manual',
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/citas`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  return res.status
}

async function main() {
  console.log(`\nMigrando ${CITAS.length} citas...\n`)

  for (const cita of CITAS) {
    process.stdout.write(`[${cita.fecha} ${cita.hora}] ${cita.cliente.nombre} — ${cita.servicio} (${cita.profesionalNombre})... `)

    try {
      // 1. Upsert contacto en GHL
      const contactId = await upsertContacto(cita.cliente)

      // 2. Crear cita en GHL
      const ghlId = await crearCitaGHL(cita, contactId)

      // 3. Crear cita en Supabase
      const sbStatus = await crearCitaSupabase(cita, contactId, ghlId)

      console.log(`✅ GHL: ${ghlId || 'ok'} | Supabase: ${sbStatus}`)
    } catch (e) {
      console.log(`❌ Error: ${e.message}`)
    }

    // Pausa para no saturar la API
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n✅ Migración completada')
}

main()
