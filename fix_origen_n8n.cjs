const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

function req(m,p,b){return new Promise(res=>{const bb=b?JSON.stringify(b):null;const o={hostname:'santiagon8nmejia.dominadoresia.com',path:p,method:m,headers:{'X-N8N-API-KEY':N8N_KEY,'Content-Type':'application/json'}};if(bb)o.headers['Content-Length']=Buffer.byteLength(bb);const r=https.request(o,resp=>{let d='';resp.on('data',c=>d+=c);resp.on('end',()=>{try{res(JSON.parse(d));}catch{res(d);}});});if(bb)r.write(bb);r.end();});}

async function addOrigen(wfId, nodeName, origenValue) {
  const wf = await req('GET', `/api/v1/workflows/${wfId}`);
  const node = wf.nodes.find(n => n.name === nodeName);
  if (!node) { console.log(`Node "${nodeName}" not found in ${wf.name}`); return; }

  // Add origen to the return statement
  let code = node.parameters.jsCode;
  if (code.includes("origen:")) { console.log(`${wf.name} - ${nodeName}: already has origen`); return; }

  // Insert origen before status field
  code = code.replace(
    "status:            'confirmed'",
    `status:            'confirmed',\n  origen:            '${origenValue}'`
  );

  node.parameters.jsCode = code;
  const result = await req('PUT', `/api/v1/workflows/${wfId}`, {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {}
  });
  console.log(`${wf.name} - ${nodeName}: ${result.name ? 'saved' : result.message}`);
}

async function run() {
  // WhatsApp workflow - Preparar Supabase
  await addOrigen('3UMIZGQy4HCmBN6v', 'Preparar Supabase', 'whatsapp');
  // Web booking workflow - Preparar Supabase Web
  await addOrigen('lRc6MNdkw7wRK6Kj', 'Preparar Supabase Web', 'web');
  console.log('Done.');
}
run();
