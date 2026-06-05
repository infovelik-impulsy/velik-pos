const https = require('https');

const SUPA_URL = 'aqoztzznsxhvczkanorr.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc';

const sql = `
ALTER TABLE citas ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE citas ALTER COLUMN end_time DROP NOT NULL;
`;

function post(path, body) {
  return new Promise(res => {
    const b = JSON.stringify(body);
    const r = https.request({
      hostname: SUPA_URL, path, method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(b)
      }
    }, resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => { console.log('Status:', resp.statusCode); console.log(d); res(d); });
    });
    r.write(b); r.end();
  });
}

post('/rest/v1/rpc/exec_sql', { query: sql }).catch(() => {
  // Try alternative endpoint
  post('/rest/v1/rpc/query', { sql });
});
