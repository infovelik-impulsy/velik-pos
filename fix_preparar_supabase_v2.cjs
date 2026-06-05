const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

const PROFS = {
  'Bn1QrO4ITpYI7wSohG9r': 'Carolina Paz',
  'DEeqUttYKgjjsfNaS1XY': 'Laura Vanessa',
  'UzLj5T8ZOrJ8reSig5os': 'Luz Aida'
};

// Fixed code: reads slot times directly from 'Parsear Datos' node (reliable)
// and gets appointment ID from GHL response (current node input)
const newCode = `
const ghlResp = $input.first().json;

// GHL returns appointment under 'appointment' key or at root level
const appt = ghlResp.appointment || ghlResp;
const apptId = appt.id || appt.appointmentId;
if (!apptId) return [{ json: { skipped: true, reason: 'no appointment id in GHL response' } }];

// Read slot times from Parsear Datos node (always correct)
const pd = $('Parsear Datos').item.json;
const startTime = pd.startTime || appt.startTime;
const endTime   = pd.endTime   || appt.endTime;

// Cliente data from Parsear Datos
const clienteName  = pd.nombre    || appt.clienteName || '';
const clientePhone = pd.telefono  || appt.phone || '';
const contactId    = appt.contactId || '';
const assignedUserId = appt.assignedUserId || pd.userId || '';
const calendarId   = appt.calendarId || pd.calendarId || '';

const profMap = ${JSON.stringify(PROFS)};
const profNombre = profMap[assignedUserId] || '';
const fecha = startTime ? startTime.slice(0, 10) : new Date().toISOString().slice(0, 10);

return [{ json: {
  id: apptId,
  fecha,
  start_time: startTime || (fecha + 'T12:00:00Z'),
  end_time:   endTime   || startTime || (fecha + 'T12:00:00Z'),
  titulo:     pd.servicio ? (pd.servicio + ' - ' + pd.nombre) : (appt.title || ''),
  cliente_nombre:    clienteName,
  cliente_telefono:  clientePhone,
  contact_id:        contactId,
  profesional_id:    assignedUserId,
  profesional_nombre: profNombre,
  calendar_id:       calendarId,
  precio:            pd.precio || '',
  status:            'confirmed'
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

async function run() {
  const wf = await req('GET', '/api/v1/workflows/3UMIZGQy4HCmBN6v');
  const nodes = wf.nodes;
  const node = nodes.find(n => n.name === 'Preparar Supabase');
  if (!node) { console.log('Node not found'); return; }
  node.parameters.jsCode = newCode;
  const result = await req('PUT', '/api/v1/workflows/3UMIZGQy4HCmBN6v', {
    name: wf.name, nodes, connections: wf.connections, settings: wf.settings || {}
  });
  console.log('Saved:', result.name || result.message);
}
run();
