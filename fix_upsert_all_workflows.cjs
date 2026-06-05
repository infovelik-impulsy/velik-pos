const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';
const NEW_GHL_KEY = 'pit-b1ad6877-d75b-47cf-9a03-1242163264f8';

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
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => {
        try { res(JSON.parse(d)); } catch { res(d); }
      });
    });
    if (b) r.write(b);
    r.end();
  });
}

function fixNode(node) {
  let changed = false;
  const params = node.parameters || {};

  // Fix Authorization header value (old key -> new key)
  const headers = params.headerParameters?.parameters || params.options?.headers?.parameters || [];
  for (const h of headers) {
    if (h.name === 'Authorization' && h.value && h.value.includes('pit-') && !h.value.includes('pit-b1ad6877')) {
      console.log(`  Fixing Authorization in "${node.name}": ${h.value.slice(0, 30)}... -> new key`);
      h.value = 'Bearer ' + NEW_GHL_KEY;
      changed = true;
    }
    if (h.name === 'Version' && h.value === '2021-04-15') {
      // Check if this node hits contacts endpoint
      const url = params.url || '';
      if (url.includes('contacts') || url.includes('contact')) {
        console.log(`  Fixing Version in "${node.name}": 2021-04-15 -> 2021-07-28`);
        h.value = '2021-07-28';
        changed = true;
      }
    }
  }

  // Also check top-level authentication/credential if using GHL node type
  // Check for hardcoded bearer in sendHeaders style
  const sendHeaders = params.sendHeaders;
  if (sendHeaders && params.headerParameters) {
    const hparams = params.headerParameters.parameters || [];
    for (const h of hparams) {
      if (h.name === 'Authorization' && h.value && h.value.includes('pit-') && !h.value.includes('pit-b1ad6877')) {
        console.log(`  Fixing Authorization (sendHeaders) in "${node.name}"`);
        h.value = 'Bearer ' + NEW_GHL_KEY;
        changed = true;
      }
      if (h.name === 'Version' && h.value === '2021-04-15') {
        const url = params.url || '';
        if (url.includes('contacts') || url.includes('contact')) {
          console.log(`  Fixing Version (sendHeaders) in "${node.name}": 2021-04-15 -> 2021-07-28`);
          h.value = '2021-07-28';
          changed = true;
        }
      }
    }
  }

  return changed;
}

async function run() {
  console.log('Fetching all workflows...');
  const list = await req('GET', '/api/v1/workflows?limit=100');
  const workflows = list.data || list;
  console.log(`Found ${workflows.length} workflows`);

  for (const wfSummary of workflows) {
    const wf = await req('GET', `/api/v1/workflows/${wfSummary.id}`);
    const nodes = wf.nodes || [];
    let wfChanged = false;

    for (const node of nodes) {
      if (node.type && node.type.includes('httpRequest')) {
        const url = (node.parameters?.url || '').toLowerCase();
        if (url.includes('contacts') || url.includes('contact')) {
          console.log(`\nWorkflow "${wf.name}" (${wf.id}) - node: "${node.name}"`);
          console.log(`  URL: ${node.parameters?.url}`);
          const changed = fixNode(node);
          if (changed) wfChanged = true;
        }
      }
    }

    if (wfChanged) {
      console.log(`Saving "${wf.name}"...`);
      const result = await req('PUT', `/api/v1/workflows/${wf.id}`, {
        name: wf.name, nodes, connections: wf.connections, settings: wf.settings || {}
      });
      console.log('Saved:', result.name || result.message || JSON.stringify(result).slice(0, 100));
    }
  }
  console.log('\nDone.');
}
run();
