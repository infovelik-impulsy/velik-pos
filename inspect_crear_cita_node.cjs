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
  const wf = await get('/api/v1/workflows/3UMIZGQy4HCmBN6v');
  const crearNode = wf.nodes.find(n => n.name === 'Crear Cita GHL');
  const parsearNode = wf.nodes.find(n => n.name === 'Parsear Datos');

  console.log('=== Crear Cita GHL ===');
  console.log(JSON.stringify(crearNode?.parameters, null, 2));

  console.log('\n=== Parsear Datos (full code) ===');
  console.log(parsearNode?.parameters?.jsCode);
}
run();
