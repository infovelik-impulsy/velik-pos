const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';
const GHL_KEY = 'pit-b1ad6877-d75b-47cf-9a03-1242163264f8';

// Known valid GHL user IDs for Velik professionals
const VALID_USER_IDS = new Set([
  'Bn1QrO4ITpYI7wSohG9r',  // Carolina Paz
  'DEeqUttYKgjjsfNaS1XY',  // Laura Vanessa
  'UzLj5T8ZOrJ8reSig5os',  // Luz Aida
]);

const newParsearDatosCode = `
const body = $('Webhook').first().json.body;
const contactId = $json.contact?.id || $json.id;

let slotNorm = (body.slot || '').replace(' ', 'T');
if (!/[+-]\\d{2}:\\d{2}$/.test(slotNorm)) slotNorm += '-05:00';
const tzMatch = slotNorm.match(/([+-]\\d{2}:\\d{2})$/);
const tz = tzMatch ? tzMatch[1] : '-05:00';
const sign = tz[0] === '+' ? 1 : -1;
const [tzH, tzM] = tz.slice(1).split(':').map(Number);
const offsetMs = sign * (tzH * 60 + tzM) * 60000;
const startDt = new Date(slotNorm);
const duracion = parseInt(body.duracion) || 60;
const endLocal = new Date(startDt.getTime() + duracion * 60000 + offsetMs);
const pad = x => String(x).padStart(2,'0');
const endISO = endLocal.getUTCFullYear()+'-'+pad(endLocal.getUTCMonth()+1)+'-'+pad(endLocal.getUTCDate())+'T'+pad(endLocal.getUTCHours())+':'+pad(endLocal.getUTCMinutes())+':00'+tz;

// Validate userId — must be a known Velik professional, NOT the contactId
const VALID_USERS = new Set(['Bn1QrO4ITpYI7wSohG9r','DEeqUttYKgjjsfNaS1XY','UzLj5T8ZOrJ8reSig5os']);
const rawUserId = body.userId;
const userId = VALID_USERS.has(rawUserId) ? rawUserId : null;

return [{ json: {
  calendarId: body.calendarId,
  contactId,
  startTime: slotNorm,
  endTime: endISO,
  titulo: body.servicio + ' - ' + body.nombre,
  userId
} }];
`;

// New Crear Cita GHL that uses JSON body and conditionally includes userId
const newCrearCitaJsonBody = `={
  "calendarId": "{{ $json.calendarId }}",
  "locationId": "0zeAaf3V1WrlkbyD4tJo",
  "contactId": "{{ $json.contactId }}",
  "startTime": "{{ $json.startTime }}",
  "endTime": "{{ $json.endTime }}",
  "title": "{{ $json.titulo }}",
  "appointmentStatus": "confirmed"
  {{ $json.userId ? ', "userId": "' + $json.userId + '"' : '' }}
}`;

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
  const wf = await req('GET', '/api/v1/workflows/lRc6MNdkw7wRK6Kj');
  const nodes = wf.nodes;

  // Fix Parsear Datos
  const parsearNode = nodes.find(n => n.name === 'Parsear Datos');
  if (parsearNode) {
    parsearNode.parameters.jsCode = newParsearDatosCode;
    console.log('Fixed Parsear Datos');
  }

  // Fix Crear Cita GHL — switch to JSON body mode
  const crearNode = nodes.find(n => n.name === 'Crear Cita GHL');
  if (crearNode) {
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
    calendarId: $json.calendarId,
    locationId: "0zeAaf3V1WrlkbyD4tJo",
    contactId: $json.contactId,
    startTime: $json.startTime,
    endTime: $json.endTime,
    title: $json.titulo,
    appointmentStatus: "confirmed"
  };
  if ($json.userId) base.userId = $json.userId;
  return JSON.stringify(base);
})() }}`,
      options: {}
    };
    console.log('Fixed Crear Cita GHL (JSON body + conditional userId + new API key)');
  }

  const result = await req('PUT', '/api/v1/workflows/lRc6MNdkw7wRK6Kj', {
    name: wf.name, nodes, connections: wf.connections, settings: wf.settings || {}
  });
  console.log('Saved:', result.name || result.message || JSON.stringify(result).slice(0, 200));
}
run();
