const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

function req(method, path, body) {
  return new Promise(res => {
    const b = body ? JSON.stringify(body) : null;
    const opts = { hostname: 'santiagon8nmejia.dominadoresia.com', path, method, headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' } };
    if (b) opts.headers['Content-Length'] = Buffer.byteLength(b);
    const r = https.request(opts, resp => { let d=''; resp.on('data',c=>d+=c); resp.on('end',()=>{ try{res(JSON.parse(d));}catch{res(d);} }); });
    if (b) r.write(b); r.end();
  });
}

async function run() {
  const wf = await req('GET', '/api/v1/workflows/3UMIZGQy4HCmBN6v');
  const parsearNode = wf.nodes.find(n => n.name === 'Parsear Datos');

  // Fix STAFF_MAP to include full names and partials
  let code = parsearNode.parameters.jsCode;

  const oldMap = `const STAFF_MAP = {"carolina":"Bn1QrO4ITpYI7wSohG9r","laura":"DEeqUttYKgjjsfNaS1XY","luz":"UzLj5T8ZOrJ8reSig5os","vanesa":"DEeqUttYKgjjsfNaS1XY","vanessa":"DEeqUttYKgjjsfNaS1XY"};
const profRaw2 = (q.profesional || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim();
const userId = STAFF_MAP[profRaw2] || undefined;`;

  const newMap = `const STAFF_MAP = {
  "carolina":"Bn1QrO4ITpYI7wSohG9r","carolina paz":"Bn1QrO4ITpYI7wSohG9r",
  "laura":"DEeqUttYKgjjsfNaS1XY","laura vanessa":"DEeqUttYKgjjsfNaS1XY","vanesa":"DEeqUttYKgjjsfNaS1XY","vanessa":"DEeqUttYKgjjsfNaS1XY",
  "luz":"UzLj5T8ZOrJ8reSig5os","luz aida":"UzLj5T8ZOrJ8reSig5os","aida":"UzLj5T8ZOrJ8reSig5os"
};
const profRaw2 = (q.profesional || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim();
// Also try first word only if full name not found
const userId = STAFF_MAP[profRaw2] || STAFF_MAP[profRaw2.split(' ')[0]] || undefined;`;

  if (code.includes('STAFF_MAP')) {
    code = code.replace(
      /const STAFF_MAP = \{.*?\};\nconst profRaw2.*?\nconst userId.*?;/s,
      newMap
    );
    parsearNode.parameters.jsCode = code;
    console.log('Updated STAFF_MAP');
  } else {
    console.log('STAFF_MAP not found in code!');
    return;
  }

  const result = await req('PUT', '/api/v1/workflows/3UMIZGQy4HCmBN6v', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {}
  });
  console.log('Saved:', result.name || result.message);
}
run();
