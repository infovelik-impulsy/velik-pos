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
  // Get last 5 executions of VELIK - Crear Cita
  const execs = await get('/api/v1/executions?workflowId=3UMIZGQy4HCmBN6v&limit=5');
  const list = execs.data || execs;
  console.log('Last executions:');
  for (const e of list) {
    console.log(`\nID: ${e.id} | Status: ${e.status} | Started: ${e.startedAt}`);
    if (e.status === 'error') {
      // Get full execution details
      const detail = await get(`/api/v1/executions/${e.id}`);
      const data = detail.data?.resultData?.runData || {};
      for (const [nodeName, nodeData] of Object.entries(data)) {
        const lastRun = nodeData[nodeData.length - 1];
        if (lastRun?.error) {
          console.log(`  ERROR in "${nodeName}":`, lastRun.error.message?.slice(0, 200));
        }
      }
    }
  }
}
run();
