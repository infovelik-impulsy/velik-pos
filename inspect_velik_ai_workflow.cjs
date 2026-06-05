const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

function get(path) {
  return new Promise(res => {
    const r = https.request({ hostname: 'santiagon8nmejia.dominadoresia.com', path, headers: { 'X-N8N-API-KEY': N8N_KEY } }, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => res(JSON.parse(d)));
    }); r.end();
  });
}

async function run() {
  // Check both the AI workflow and the Crear Cita workflow
  const workflows = [
    { id: 'oTWJ2XHBAZCINO7A', name: 'VELIK BEAUTY HOUSE - GHL' },
    { id: '3UMIZGQy4HCmBN6v', name: 'VELIK - Crear Cita' },
  ];

  for (const { id, name } of workflows) {
    const wf = await get(`/api/v1/workflows/${id}`);
    console.log(`\n========== ${wf.name} (${id}) ==========`);
    for (const n of wf.nodes) {
      const p = n.parameters || {};
      const url = (p.url || '').toLowerCase();
      const hasCalendar = url.includes('calendar') || url.includes('appointment');
      const hasHttp = n.type?.includes('httpRequest');

      if (hasHttp && hasCalendar) {
        console.log(`\n[HTTP - CALENDAR] Node: "${n.name}"`);
        console.log('  URL:', p.url);
        if (p.bodyParameters) console.log('  Body params:', JSON.stringify(p.bodyParameters).slice(0, 400));
        if (p.jsonBody) console.log('  JSON body:', typeof p.jsonBody === 'string' ? p.jsonBody.slice(0, 400) : JSON.stringify(p.jsonBody).slice(0, 400));
      }

      if (n.type?.includes('code')) {
        const code = (p.jsCode || '').toLowerCase();
        if (code.includes('calendar') || code.includes('userid') || code.includes('cita') || code.includes('slot')) {
          console.log(`\n[CODE - relevant] Node: "${n.name}"`);
          console.log('  Code snippet:', (p.jsCode || '').slice(0, 600));
        }
      }

      // Find any node that calls the booking webhook
      if (hasHttp && url.includes('crear') || url.includes('booking') || url.includes('webhook')) {
        console.log(`\n[HTTP - WEBHOOK/BOOKING] Node: "${n.name}"`);
        console.log('  URL:', p.url);
      }
    }
  }
}
run();
