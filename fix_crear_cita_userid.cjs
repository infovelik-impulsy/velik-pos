const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';
const GHL_KEY = 'pit-b1ad6877-d75b-47cf-9a03-1242163264f8';

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

  const crearNode = nodes.find(n => n.name === 'Crear Cita GHL');
  if (!crearNode) { console.log('Node not found'); return; }

  // Switch to JSON body mode to avoid the bodyParameters concatenation bug
  // and to conditionally include userId only when valid
  crearNode.parameters = {
    method: 'POST',
    url: 'https://services.leadconnectorhq.com/calendars/events/appointments',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'Authorization', value: 'Bearer ' + GHL_KEY },
        { name: 'Version', value: '2021-04-15' },
        { name: 'Content-Type', value: 'application/json' },
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ (() => {
  const base = {
    calendarId: $('Parsear Datos').item.json.calendarId,
    locationId: "0zeAaf3V1WrlkbyD4tJo",
    contactId: $json.contact ? $json.contact.id : $json.id,
    startTime: $('Parsear Datos').item.json.startTime,
    endTime: $('Parsear Datos').item.json.endTime,
    title: $('Parsear Datos').item.json.servicio + ' - ' + $('Parsear Datos').item.json.nombre,
    appointmentStatus: "confirmed"
  };
  const validUsers = new Set(['Bn1QrO4ITpYI7wSohG9r','DEeqUttYKgjjsfNaS1XY','UzLj5T8ZOrJ8reSig5os']);
  const uid = $('Parsear Datos').item.json.userId;
  if (uid && validUsers.has(uid)) base.userId = uid;
  return JSON.stringify(base);
})() }}`,
    options: {}
  };

  console.log('Fixed Crear Cita GHL node (removed contactId bug, JSON body mode)');

  const result = await req('PUT', '/api/v1/workflows/3UMIZGQy4HCmBN6v', {
    name: wf.name, nodes, connections: wf.connections, settings: wf.settings || {}
  });
  console.log('Saved:', result.name || result.message);
}
run();
