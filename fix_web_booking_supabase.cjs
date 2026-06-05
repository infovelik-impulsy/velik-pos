const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc';

const PROFS = {
  'Bn1QrO4ITpYI7wSohG9r': 'Carolina Paz',
  'DEeqUttYKgjjsfNaS1XY': 'Laura Vanessa',
  'UzLj5T8ZOrJ8reSig5os': 'Luz Aida'
};

const prepCode = `
const ghlResp = $input.first().json;
const appt = ghlResp.appointment || ghlResp;
const apptId = appt.id || appt.appointmentId;
if (!apptId) return [{ json: { skipped: true } }];

// Read from Parsear Datos (reliable slot times)
const pd = $('Parsear Datos').item.json;
const wb = $('Webhook').first().json.body;

const startTime = pd.startTime || appt.startTime;
const endTime   = pd.endTime   || appt.endTime;
const fecha = startTime ? startTime.slice(0, 10) : new Date().toISOString().slice(0, 10);

const assignedUserId = appt.assignedUserId || pd.userId || '';
const profMap = ${JSON.stringify(PROFS)};
const profNombre = profMap[assignedUserId] || '';

return [{ json: {
  id: apptId,
  fecha,
  start_time: startTime || (fecha + 'T12:00:00Z'),
  end_time:   endTime   || startTime || (fecha + 'T12:00:00Z'),
  titulo:     (wb.servicio || '') + ' - ' + (wb.nombre || ''),
  cliente_nombre:    wb.nombre || '',
  cliente_telefono:  wb.telefono || '',
  contact_id:        appt.contactId || '',
  profesional_id:    assignedUserId,
  profesional_nombre: profNombre,
  calendar_id:       appt.calendarId || pd.calendarId || wb.calendarId || '',
  precio:            '',
  status:            'confirmed'
} }];
`;

function req(method, path, body) {
  return new Promise(res => {
    const b = body ? JSON.stringify(body) : null;
    const opts = { hostname:'santiagon8nmejia.dominadoresia.com', path, method, headers:{'X-N8N-API-KEY':N8N_KEY,'Content-Type':'application/json'} };
    if (b) opts.headers['Content-Length'] = Buffer.byteLength(b);
    const r = https.request(opts, resp => { let d=''; resp.on('data',c=>d+=c); resp.on('end',()=>{ try{res(JSON.parse(d));}catch{res(d);} }); });
    if (b) r.write(b); r.end();
  });
}

async function run() {
  const wf = await req('GET', '/api/v1/workflows/lRc6MNdkw7wRK6Kj');
  const nodes = wf.nodes;
  const connections = wf.connections;

  // Remove old supabase nodes if any
  const clean = nodes.filter(n => n.name !== 'Preparar Supabase Web' && n.name !== 'Guardar Supabase Web');

  // Add new nodes
  clean.push({
    id: 'prep_supa_web', name: 'Preparar Supabase Web',
    type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [1800, 300],
    parameters: { jsCode: prepCode, mode: 'runOnceForAllItems' }
  });
  clean.push({
    id: 'save_supa_web', name: 'Guardar Supabase Web',
    type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [2000, 300],
    parameters: {
      method: 'POST',
      url: 'https://aqoztzznsxhvczkanorr.supabase.co/rest/v1/citas',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: SUPA_KEY },
        { name: 'Authorization', value: 'Bearer ' + SUPA_KEY },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'resolution=merge-duplicates' }
      ]},
      sendBody: true, specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json) }}',
      options: {}
    }
  });

  // Connect: Crear Cita GHL → Preparar Supabase Web → Guardar Supabase Web
  const newConn = JSON.parse(JSON.stringify(connections));
  const crearNode = nodes.find(n => n.name === 'Crear Cita GHL');
  if (crearNode) {
    if (!newConn[crearNode.name]) newConn[crearNode.name] = { main: [[]] };
    if (!newConn[crearNode.name].main[0]) newConn[crearNode.name].main[0] = [];
    const alreadyLinked = newConn[crearNode.name].main[0].some(c => c.node === 'Preparar Supabase Web');
    if (!alreadyLinked) newConn[crearNode.name].main[0].push({ node: 'Preparar Supabase Web', type: 'main', index: 0 });
  }
  newConn['Preparar Supabase Web'] = { main: [[{ node: 'Guardar Supabase Web', type: 'main', index: 0 }]] };

  const result = await req('PUT', '/api/v1/workflows/lRc6MNdkw7wRK6Kj', {
    name: wf.name, nodes: clean, connections: newConn, settings: wf.settings || {}
  });
  console.log('Saved:', result.name || result.message);
}
run();
