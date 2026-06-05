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
  const wf = await get('/api/v1/workflows/lRc6MNdkw7wRK6Kj');
  console.log('Workflow:', wf.name);
  console.log('Nodes:');
  for (const n of wf.nodes) {
    console.log(`\n--- ${n.name} (${n.type}) ---`);
    if (n.parameters) {
      const p = n.parameters;
      if (p.jsCode) console.log('jsCode:', p.jsCode.slice(0, 500));
      if (p.url) console.log('url:', p.url);
      if (p.jsonBody) console.log('jsonBody:', JSON.stringify(p.jsonBody).slice(0, 500));
      if (p.bodyParameters) console.log('bodyParameters:', JSON.stringify(p.bodyParameters).slice(0, 500));
      if (p.specifyBody && p.jsonBody) console.log('jsonBody:', p.jsonBody.slice ? p.jsonBody.slice(0, 500) : JSON.stringify(p.jsonBody).slice(0, 500));
    }
  }
  console.log('\nConnections:', JSON.stringify(wf.connections, null, 2).slice(0, 2000));
}
run();
