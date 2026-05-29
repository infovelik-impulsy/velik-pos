const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc';

function get(path) {
  return new Promise(res => {
    const r = https.request({ hostname: 'santiagon8nmejia.dominadoresia.com', path, headers: { 'X-N8N-API-KEY': N8N_KEY } }, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => res(JSON.parse(d)));
    }); r.end();
  });
}
function put(path, body) {
  return new Promise(res => {
    const b = JSON.stringify(body);
    const r = https.request({ hostname: 'santiagon8nmejia.dominadoresia.com', path, method: 'PUT', headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => res(JSON.parse(d)));
    }); r.write(b); r.end();
  });
}

const PROFS = { 'Bn1QrO4ITpYI7wSohG9r': 'Carolina Paz', 'DEeqUttYKgjjsfNaS1XY': 'Laura Vanessa', 'UzLj5T8ZOrJ8reSig5os': 'Luz Aida' };

const supaCode = `
const all = $input.all();
const ghlItem = all.find(i => i.json.id || i.json.appointmentId) || all[0];
const ghlResp = ghlItem.json;
const apptId = ghlResp.id || ghlResp.appointmentId;
if (!apptId) return [{ json: { skipped: true } }];

const profMap = ${JSON.stringify(PROFS)};
let startTime, endTime, titulo, clienteName, clientePhone, contactId, assignedUserId, calendarId, precio;
for (const item of all) {
  const j = item.json;
  if (j.startTime) startTime = j.startTime;
  if (j.endTime) endTime = j.endTime;
  if (j.title) titulo = j.title;
  if (j.clienteName || j.name) clienteName = j.clienteName || j.name;
  if (j.phone) clientePhone = j.phone;
  if (j.contactId) contactId = j.contactId;
  if (j.assignedUserId) assignedUserId = j.assignedUserId;
  if (j.calendarId) calendarId = j.calendarId;
  if (j.precio) precio = j.precio;
}

const profNombre = profMap[assignedUserId] || '';
const fecha = (startTime || new Date().toISOString()).slice(0, 10);

return [{ json: { id: apptId, fecha, start_time: startTime, end_time: endTime, titulo: titulo || '', cliente_nombre: clienteName || '', cliente_telefono: clientePhone || '', contact_id: contactId || '', profesional_id: assignedUserId || '', profesional_nombre: profNombre, calendar_id: calendarId || '', precio: precio || '', status: 'confirmed' } }];
`;

async function run() {
  const wf = await get('/api/v1/workflows/3UMIZGQy4HCmBN6v');
  const nodes = wf.nodes || [];

  const supaNode = nodes.find(n => n.name === 'Preparar Supabase');
  if (supaNode) {
    supaNode.parameters.jsCode = supaCode;
    console.log('Updated Preparar Supabase node');
  } else {
    console.log('Node not found!');
    return;
  }

  const r = await put('/api/v1/workflows/3UMIZGQy4HCmBN6v', { name: wf.name, nodes, connections: wf.connections, settings: wf.settings || {} });
  console.log('Result:', r.name || r.message);
}
run();
