const https = require('https');
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc';

function get(path) {
  return new Promise(res => {
    const r = https.request({
      hostname: 'aqoztzznsxhvczkanorr.supabase.co',
      path,
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    }, resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } });
    }); r.end();
  });
}

async function run() {
  const citas = await get('/rest/v1/citas?select=id,fecha,start_time,titulo,cliente_nombre,profesional_nombre,status&order=fecha.desc&limit=20');
  console.log('All citas in Supabase:');
  if (Array.isArray(citas)) {
    for (const c of citas) {
      console.log(`  ${c.fecha} | ${c.start_time ? new Date(c.start_time).toLocaleString('es-CO', {timeZone:'America/Bogota'}) : 'NO TIME'} | ${c.profesional_nombre} | ${c.titulo} | ${c.status}`);
    }
  } else {
    console.log(JSON.stringify(citas));
  }
}
run();
