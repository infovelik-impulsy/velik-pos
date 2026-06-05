const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

function req(m,p,b){return new Promise(res=>{const bb=b?JSON.stringify(b):null;const o={hostname:'santiagon8nmejia.dominadoresia.com',path:p,method:m,headers:{'X-N8N-API-KEY':N8N_KEY,'Content-Type':'application/json'}};if(bb)o.headers['Content-Length']=Buffer.byteLength(bb);const r=https.request(o,resp=>{let d='';resp.on('data',c=>d+=c);resp.on('end',()=>{try{res(JSON.parse(d));}catch{res(d);}});});if(bb)r.write(bb);r.end();});}

async function run() {
  const wf = await req('GET', '/api/v1/workflows/3UMIZGQy4HCmBN6v');
  const node = wf.nodes.find(n => n.name === 'Parsear Datos');
  let code = node.parameters.jsCode;

  // Replace the broken end section
  const brokenEnd = `const cal = lookupService(servicio);
if (!cal) return [{ json: {
  calendarId: cal.id, servicio, duracion: cal.dur,
  precio: PRECIOS[cal.id] || '',
  startTime: slotNorm,
  endTime: endISO,
  nombre, telefono, email,
  ...(userId ? { userId } : {})
} }];;;`;

  const fixedEnd = `const cal = lookupService(servicio);
if (!cal) return [{ json: { error: 'Servicio no encontrado: ' + servicio } }];
if (!slotTime) return [{ json: { error: 'Falta slot_time. Usa verificar_disponibilidad primero.' } }];
if (!telefono) return [{ json: { error: 'Falta cliente_telefono para crear la cita.' } }];

const startDt = new Date(slotNorm);
if (isNaN(startDt)) return [{ json: { error: 'slot_time invalido: ' + slotTime } }];

const STAFF_MAP = {
  "carolina":"Bn1QrO4ITpYI7wSohG9r","carolina paz":"Bn1QrO4ITpYI7wSohG9r",
  "laura":"DEeqUttYKgjjsfNaS1XY","laura vanessa":"DEeqUttYKgjjsfNaS1XY","vanesa":"DEeqUttYKgjjsfNaS1XY","vanessa":"DEeqUttYKgjjsfNaS1XY",
  "luz":"UzLj5T8ZOrJ8reSig5os","luz aida":"UzLj5T8ZOrJ8reSig5os","aida":"UzLj5T8ZOrJ8reSig5os"
};
const profRaw2 = (q.profesional || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim();
const userId = STAFF_MAP[profRaw2] || STAFF_MAP[profRaw2.split(' ')[0]] || undefined;

const tzMatch = slotNorm.match(/([+-]\\d{2}:\\d{2})$/);
const tz = tzMatch ? tzMatch[1] : '-05:00';
const sign = tz[0] === '+' ? 1 : -1;
const [tzH, tzM] = tz.slice(1).split(':').map(Number);
const offsetMs = sign * (tzH * 60 + tzM) * 60000;
const endDt2 = new Date(startDt.getTime() + cal.dur * 60000 + offsetMs);
const pad = x => String(x).padStart(2,'0');
const endISO = endDt2.getUTCFullYear()+'-'+pad(endDt2.getUTCMonth()+1)+'-'+pad(endDt2.getUTCDate())+'T'+pad(endDt2.getUTCHours())+':'+pad(endDt2.getUTCMinutes())+':00'+tz;

return [{ json: {
  calendarId: cal.id, servicio, duracion: cal.dur,
  precio: PRECIOS[cal.id] || '',
  startTime: slotNorm,
  endTime: endISO,
  nombre, telefono, email,
  ...(userId ? { userId } : {})
} }];`;

  if (code.includes(brokenEnd)) {
    code = code.replace(brokenEnd, fixedEnd);
    console.log('Fixed end section');
  } else {
    console.log('Pattern not found exactly, trying partial match...');
    // Try replacing from the broken cal line to end
    const idx = code.lastIndexOf('const cal = lookupService(servicio);');
    if (idx !== -1) {
      code = code.slice(0, idx) + fixedEnd;
      console.log('Fixed by slicing from cal line');
    }
  }

  node.parameters.jsCode = code;
  const result = await req('PUT', '/api/v1/workflows/3UMIZGQy4HCmBN6v', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {}
  });
  console.log('Saved:', result.name || result.message);
}
run();
