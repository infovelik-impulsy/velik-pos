const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

function get(path) {
  return new Promise(res => {
    const r = https.request({ hostname: 'santiagon8nmejia.dominadoresia.com', path, headers: { 'X-N8N-API-KEY': N8N_KEY } }, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => {
        try { res(JSON.parse(d)); } catch { res({ raw: d.slice(0, 300) }); }
      });
    }); r.end();
  });
}

async function run() {
  const detail = await get('/api/v1/executions/201190');
  console.log('Keys:', Object.keys(detail));
  const runData = detail.data?.resultData?.runData || detail.resultData?.runData || {};
  console.log('RunData keys:', Object.keys(runData));

  for (const [nodeName, nodeRuns] of Object.entries(runData)) {
    console.log(`\n=== ${nodeName} ===`);
    try {
      const last = Array.isArray(nodeRuns) ? nodeRuns[nodeRuns.length - 1] : nodeRuns;
      const items = last?.data?.main?.[0] || [];
      if (items.length > 0) {
        console.log(JSON.stringify(items[0].json, null, 2).slice(0, 400));
      } else if (last?.error) {
        console.log('ERROR:', last.error.message?.slice(0, 200));
      }
    } catch(e) {
      console.log('Parse error:', e.message);
    }
  }
}
run();
