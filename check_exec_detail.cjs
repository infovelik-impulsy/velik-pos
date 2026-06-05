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
  const detail = await get('/api/v1/executions/201190');
  const runData = detail.data?.resultData?.runData || {};

  for (const [nodeName, nodeRuns] of Object.entries(runData)) {
    const last = nodeRuns[nodeRuns.length - 1];
    if (!last?.data?.main?.[0]?.[0]) continue;
    const json = last.data.main[0][0].json;
    console.log(`\n=== ${nodeName} ===`);
    console.log(JSON.stringify(json, null, 2).slice(0, 500));
  }
}
run();
