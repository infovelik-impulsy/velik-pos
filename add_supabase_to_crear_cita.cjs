const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';
const SUPA_URL = 'https://aqoztzznsxhvczkanorr.supabase.co';
const SUPA_KEY = 'sb_publishable_4SmHQewYKJIv3-GUz4pvPA_jx1eY9U0';

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

// Walk back through items to find input data
let startTime, endTime, titulo, clienteName, clientePhone, contactId, assignedUserId, calendarId;
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
}

const profNombre = profMap[assignedUserId] || '';
const fecha = (startTime || new Date().toISOString()).slice(0, 10);

return [{ json: { id: apptId, fecha, start_time: startTime, end_time: endTime, titulo: titulo || '', cliente_nombre: clienteName || '', cliente_telefono: clientePhone || '', contact_id: contactId || '', profesional_id: assignedUserId || '', profesional_nombre: profNombre, calendar_id: calendarId || '', status: 'confirmed' } }];
`;

async function run() {
  const wf = await get('/api/v1/workflows/3UMIZGQy4HCmBN6v');
  const nodes = wf.nodes || [];
  console.log('Nodes:', nodes.map(n => n.name).join(', '));

  // Remove existing supabase nodes if any
  const cleanNodes = nodes.filter(n => n.name !== 'Preparar Supabase' && n.name !== 'Guardar en Supabase');

  cleanNodes.push({
    id: 'supa_prep', name: 'Preparar Supabase', type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [1600, 400], parameters: { jsCode: supaCode, mode: 'runOnceForAllItems' }
  });
  cleanNodes.push({
    id: 'supa_save', name: 'Guardar en Supabase', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [1800, 400],
    parameters: {
      method: 'POST', url: SUPA_URL + '/rest/v1/citas', sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: SUPA_KEY },
        { name: 'Authorization', value: 'Bearer ' + SUPA_KEY },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'resolution=merge-duplicates' }
      ]},
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json) }}', options: {}
    }
  });

  // Find GHL create node
  const ghlNode = nodes.find(n => n.type.includes('httpRequest') && (n.name.toLowerCase().includes('crear') || n.name.toLowerCase().includes('cita')));
  console.log('GHL node found:', ghlNode?.name);

  const connections = JSON.parse(JSON.stringify(wf.connections || {}));
  delete connections['Preparar Supabase'];
  delete connections['Guardar en Supabase'];

  if (ghlNode) {
    if (!connections[ghlNode.name]) connections[ghlNode.name] = { main: [[]] };
    if (!connections[ghlNode.name].main[0]) connections[ghlNode.name].main[0] = [];
    const alreadyLinked = connections[ghlNode.name].main[0].some(c => c.node === 'Preparar Supabase');
    if (!alreadyLinked) connections[ghlNode.name].main[0].push({ node: 'Preparar Supabase', type: 'main', index: 0 });
  }
  connections['Preparar Supabase'] = { main: [[{ node: 'Guardar en Supabase', type: 'main', index: 0 }]] };

  const r = await put('/api/v1/workflows/3UMIZGQy4HCmBN6v', { name: wf.name, nodes: cleanNodes, connections, settings: wf.settings || {} });
  console.log('Result:', r.name || r.message);
}
run();
