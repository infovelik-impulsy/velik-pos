const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

const PROFS = { 'Bn1QrO4ITpYI7wSohG9r': 'Carolina Paz', 'DEeqUttYKgjjsfNaS1XY': 'Laura Vanessa', 'UzLj5T8ZOrJ8reSig5os': 'Luz Aida' };

// Improved code that handles all GHL webhook formats and always has a fallback for start_time
const supaCode = `
const all = $input.all();

// Collect all fields from all items
let apptId, startTime, endTime, titulo, clienteName, clientePhone, contactId, assignedUserId, calendarId, precio;

for (const item of all) {
  const j = item.json;
  // Appointment ID - try multiple field names
  if (!apptId && (j.id || j.appointmentId)) apptId = j.id || j.appointmentId;
  // Times - try camelCase and snake_case
  if (!startTime && (j.startTime || j.start_time)) startTime = j.startTime || j.start_time;
  if (!endTime && (j.endTime || j.end_time)) endTime = j.endTime || j.end_time;
  // Service title
  if (!titulo && (j.title || j.titulo)) titulo = j.title || j.titulo;
  // Client info - multiple possible field names from GHL
  if (!clienteName && (j.clienteName || j.name || j.contactName || j.fullName))
    clienteName = j.clienteName || j.name || j.contactName || j.fullName;
  if (!clientePhone && (j.phone || j.phoneNumber || j.clientePhone))
    clientePhone = j.phone || j.phoneNumber || j.clientePhone;
  if (!contactId && (j.contactId || j.contact_id)) contactId = j.contactId || j.contact_id;
  if (!assignedUserId && (j.assignedUserId || j.userId)) assignedUserId = j.assignedUserId || j.userId;
  if (!calendarId && (j.calendarId || j.calendar_id)) calendarId = j.calendarId || j.calendar_id;
  if (!precio && j.precio) precio = j.precio;
}

if (!apptId) return [{ json: { skipped: true, reason: 'no appointment id' } }];

const profMap = ${JSON.stringify(PROFS)};
const profNombre = profMap[assignedUserId] || '';

// Use fecha from startTime, or today if missing
const now = new Date().toISOString();
const fecha = startTime ? startTime.slice(0, 10) : now.slice(0, 10);

// Fallback: if no startTime, use fecha at noon (so NOT NULL constraint is satisfied)
const safeStart = startTime || (fecha + 'T12:00:00Z');
const safeEnd = endTime || safeStart;

return [{ json: {
  id: apptId,
  fecha,
  start_time: safeStart,
  end_time: safeEnd,
  titulo: titulo || '',
  cliente_nombre: clienteName || '',
  cliente_telefono: clientePhone || '',
  contact_id: contactId || '',
  profesional_id: assignedUserId || '',
  profesional_nombre: profNombre,
  calendar_id: calendarId || '',
  precio: precio || '',
  status: 'confirmed'
} }];
`;

function req(method, path, body) {
  return new Promise(res => {
    const b = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'santiagon8nmejia.dominadoresia.com',
      path, method,
      headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' }
    };
    if (b) opts.headers['Content-Length'] = Buffer.byteLength(b);
    const r = https.request(opts, resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } });
    });
    if (b) r.write(b);
    r.end();
  });
}

const WORKFLOW_IDS = [
  '3UMIZGQy4HCmBN6v',  // VELIK - Crear Cita
  'lRc6MNdkw7wRK6Kj',  // VELIK - Booking Crear Cita (Web)
];

async function fixWorkflow(id) {
  const wf = await req('GET', `/api/v1/workflows/${id}`);
  const nodes = wf.nodes || [];
  const node = nodes.find(n => n.name === 'Preparar Supabase');
  if (!node) { console.log(`  No "Preparar Supabase" node in ${wf.name}`); return; }
  node.parameters.jsCode = supaCode;
  const result = await req('PUT', `/api/v1/workflows/${id}`, {
    name: wf.name, nodes, connections: wf.connections, settings: wf.settings || {}
  });
  console.log(`Fixed "${wf.name}":`, result.name || result.message || 'saved');
}

async function run() {
  for (const id of WORKFLOW_IDS) await fixWorkflow(id);
  console.log('Done.');
}
run();
