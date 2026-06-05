const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

function get(path) {
  return new Promise(res => {
    const r = https.request({ hostname: 'santiagon8nmejia.dominadoresia.com', path, headers: { 'X-N8N-API-KEY': N8N_KEY } }, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } });
    }); r.end();
  });
}

async function run() {
  const execs = await get('/api/v1/executions?workflowId=3UMIZGQy4HCmBN6v&limit=3');
  const list = execs.data || execs;
  const last = list[0];
  console.log('Last exec:', last.id, last.status, last.startedAt);

  const detail = await get(`/api/v1/executions/${last.id}`);
  console.log('Detail keys:', Object.keys(detail));

  // Try to find any stored data
  const rd = detail.data?.resultData?.runData || detail.resultData?.runData || {};
  console.log('Nodes with data:', Object.keys(rd));
  for (const [name, runs] of Object.entries(rd)) {
    const run = Array.isArray(runs) ? runs[0] : runs;
    const items = run?.data?.main?.[0] || [];
    if (items.length) {
      console.log(`\n--- ${name} ---`);
      console.log(JSON.stringify(items[0].json).slice(0, 300));
    }
  }
}
run();
