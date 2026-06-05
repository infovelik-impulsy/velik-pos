const https = require('https');
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2M4MDliMS0yYjkzLTQ5ZTAtOGIzOS0xYTAyZmI5YjQxYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjhlYjE2OTUtMGU1MC00Zjk3LTg3YTctMTFkN2RmMDkxYzAzIiwiaWF0IjoxNzc5NTYwOTIzfQ.6lxRrJY8otM7ZOK14U66RJZXGsDU901nkqz6ZLODJV8';

// calendarId → precio map (from bookingData.ts)
const PRECIOS = {
  "EDiqwAb54xY6nID5yzB8":"$60.000","ItIbYfgFYYvZYQ6Oje0B":"$45.000","uyBy6KxStea3tyJXkxvE":"$45.000",
  "58aCvkqxbMBcFFPgZmyk":"$120.000","HhrSGv6kTKZOtLwLtLaO":"$170.000","yVTJ5MuqOiTIG6aW4Zzu":"$60.000",
  "5FzBoBw7GCdwViMPesPC":"$150.000","MmI8fIlxThj3dg3qXB5E":"$150.000","JuHPG8vMNXKSOiyVNzjR":"$110.000",
  "g7a3uGcoBdAdrffowsY1":"$100.000","DIDIge2ItuyDQU3hfjqA":"$70.000","CwNB6YUweNhSrYOTFElB":"$90.000",
  "rSP0C1qAAvA82qSGwSsz":"$80.000","UdfCTzTMPNhYuemDnWsb":"$20.000","54RoAHSPDVzWjfk4N2cR":"$30.000",
  "CUY39YrfaRmiHvMdGTol":"$15.000","KDdZgv19rQYsaxXNeIMB":"$20.000","NbDO7tF3rTsVlsNAqweR":"$30.000",
  "yENMASOfLO8JTFgjW23z":"$30.000","74JOMcKwGJTEqfgqo2Ra":"$7.000","ZIeJPQLAeo3bM3tLDL8z":"$10.000",
  "Oi2Dn1v3MpIR3wn06LyY":"$0","HowlM3DRvUNe4H9AeSLV":"$15.000","IaeOZwQoDAm6m1Ysvz41":"$10.000",
  "fnJgqRtJlV8VAbEp2veA":"$30.000",
  // Pedicure
  "szaDqVWMTKAFCVcYjgTh":"$60.000","MPv75km6l8sal1NKHqtV":"$60.000","1OpkJJuQoNlATF5hd9Zi":"$70.000",
  "tKn5Hy3A7pKqg7nhVpgC":"$40.000","XbxF4HF4VH3KNB16sNBU":"$45.000","FJDuHD0L2DqBLPUeYsqM":"$20.000",
  "rcuBG3bPRNwG11VFqgH2":"$30.000",
  // Manos y Pies
  "0jYIRtI8bl33hIyhVJC1":"$90.000","xpyrWObNXPeV2kMJtlIy":"$120.000","zfKlMG4wsoLWam1yRQCl":"$100.000",
  "OYVNrcCxrbSYEd1SbV3f":"$100.000","z6VLaBzxm2hxO4JglzOI":"$120.000","ZLEVvENlOAsJdUVyyLGf":"$80.000",
  "iAOrgphopFSqRQt5dxTm":"$120.000","FMTaDks9JBTh1hXZ9k2U":"$60.000","fcpxmqMktM3vzoyrhumR":"$30.000",
  // Cabello
  "tYgB9RKWsWnAY6yzHbzo":"$300.000","YsyBC5BKtrnN8YQYRDBm":"$300.000","aO1pbT4UQDyqLJwXnPqX":"$300.000",
  "NFFYkmfD3gwaVACAOBxq":"$300.000","1yG992Jgff0sTUyGHzfQ":"$300.000","tdu7sEKcoUaJGN6TS5dR":"$60.000",
  "XEmC3LZdNFLzri44z5fe":"$60.000","SZnHg7E8gOsBB0CxxpAk":"$90.000","HXfDgBJXCdD5xD7rqgmW":"$90.000",
  "AFzeRInudMfQvytS7rYI":"$30.000","BhjqV08NlQwTyAer5Rah":"$40.000","zxVN8YcfF9nQh3uOhLcD":"$45.000",
  "IM2RYaBSfWNytuAmACml":"$60.000","eSmQWFTgnrsIhICBidoF":"$40.000","pyw2lCLu7OmMz5i1Xj0i":"$45.000",
  "cYESJstUsKOBcrKLfI61":"$35.000","4aMo5CLViO46g2Q6jnip":"$30.000","6V88WbxYuumHKt5RBfGO":"$30.000",
  "gJhd4efPJ7Zs7Ogybq95":"$20.000","7G42EdlizK39sGWSRTWO":"$20.000",
  // Cejas y Pestañas
  "Z7WKPMSF94iQoA8Mf9ne":"$60.000","JGZXM08wqm28dl4qfp9T":"$50.000","KuZ6tseSF1WIC3wmAwGj":"$70.000",
  "dry2VkC24zeouSdN4VEm":"$70.000","dbxPJAla6tTHNv73eo1l":"$90.000","4O1RVMdKaXEUaHqQqVP1":"$90.000",
  "yuikssBrbkVHsArQoe65":"$60.000","zT9oLreL1DCiwWDmO1Dx":"$45.000","VYpzK2GHuBJ63aO2lSaV":"$10.000",
  "ozLRNZ5V55zBOpGxcygz":"$15.000","n49lc4VkUvtvdtCRcgTB":"$10.000","GcGJ59uvGEDf3LZCyrg2":"$25.000",
  // Depilación
  "cmyFlDKVr8UemAn9N71W":"$90.000","eRj3f8o8CLcD7i0rIgm3":"$60.000","mfXJuW1bdCIPV4GgCSx3":"$45.000",
  "1vn5jyzI6R8TstZCZhOI":"$60.000","mSw9Swdz68i0hC5cqNme":"$18.000","9HqMBn6P9DBAsMqZmFit":"$60.000",
  "woQv67dSOZkRipYxGaXm":"$20.000","UKZG99bvj0QCeFJaLNk7":"$10.000","eHXH3nwnTLLoacCnQKeh":"$10.000",
  "9M1FFJKZmz9tPhwEitAb":"$10.000","whI104AHCNJGaV35yii2":"$20.000","ZdfgP31Jmj4hWCEezhda":"$20.000",
  "hKENNyPe7hZhcz5HGHny":"$30.000",
  // Maquillaje
  "71J4eTC3TIEuDXfsP1Iw":"$60.000","hdrmUKbZXwO4tbNVsIkb":"$60.000","PelRqVASPHp0QEu7P5Xs":"$60.000",
  "OybBhb6gij304Vromp7n":"$15.000",
  // Corporal
  "wAwK46EAzP7OMVbVZ4Na":"$60.000","q2Iz4gfTyoB3JkRNZ4CZ":"$60.000","kjgB0Whm8mjpYv8I075K":"$45.000",
  "8iU9qGnCM5nT6816pEAh":"$45.000","uajeiWuAmnwZ9BPA4RlT":"$45.000","9PiZEDHNec91qK58o3de":"$40.000",
  "xU7HfkiIbhZwHo1EnrTz":"$120.000","vxUBF94v8PKqobjUBeZc":"$90.000","fz9614uqbCIz8bLDXYNR":"$60.000",
  "6Gq72d3MJ8FqYsWYEeWD":"$30.000",
};

function req(method, path, body) {
  return new Promise(res => {
    const b = body ? JSON.stringify(body) : null;
    const opts = { hostname:'santiagon8nmejia.dominadoresia.com', path, method, headers:{'X-N8N-API-KEY':N8N_KEY,'Content-Type':'application/json'} };
    if (b) opts.headers['Content-Length'] = Buffer.byteLength(b);
    const r = https.request(opts, resp => { let d=''; resp.on('data',c=>d+=c); resp.on('end',()=>{ try{res(JSON.parse(d));}catch{res(d);} }); });
    if (b) r.write(b); r.end();
  });
}

const preciosJson = JSON.stringify(PRECIOS);

async function fixParsearDatos() {
  const wf = await req('GET', '/api/v1/workflows/3UMIZGQy4HCmBN6v');
  const node = wf.nodes.find(n => n.name === 'Parsear Datos');
  let code = node.parameters.jsCode;

  // Add PRECIOS map after RAW map closing brace
  if (!code.includes('PRECIOS')) {
    code = code.replace(
      'const CALENDARS = {};',
      `const PRECIOS = ${preciosJson};\nconst CALENDARS = {};`
    );
  }

  // Fix return to include precio
  code = code.replace(
    /return \[\{ json: \{[\s\S]*?\.\.\.(\(userId \? \{ userId \} : \{\}\))\s*\}\s*\}\];/,
    `return [{ json: {
  calendarId: cal.id, servicio, duracion: cal.dur,
  precio: PRECIOS[cal.id] || '',
  startTime: slotNorm,
  endTime: endISO,
  nombre, telefono, email,
  ...(userId ? { userId } : {})
} }];;`
  );

  node.parameters.jsCode = code;
  const result = await req('PUT', '/api/v1/workflows/3UMIZGQy4HCmBN6v', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {}
  });
  console.log('Parsear Datos (WhatsApp):', result.name || result.message);
}

async function fixPreparaSupabaseWeb() {
  // The web booking Preparar Supabase Web reads precio from wb.precio
  const wf = await req('GET', '/api/v1/workflows/lRc6MNdkw7wRK6Kj');
  const node = wf.nodes.find(n => n.name === 'Preparar Supabase Web');
  if (!node) { console.log('Preparar Supabase Web not found'); return; }

  // Add PRECIOS map to the code and use wb.precio or lookup by calendarId
  let code = node.parameters.jsCode;
  if (!code.includes('PRECIOS')) {
    const precioLookup = `const PRECIOS = ${preciosJson};\n`;
    code = precioLookup + code;
    // Fix precio line
    code = code.replace(
      "precio:            '',",
      "precio:            wb.precio || PRECIOS[appt.calendarId || pd.calendarId || wb.calendarId || ''] || '',"
    );
    node.parameters.jsCode = code;
    const result = await req('PUT', '/api/v1/workflows/lRc6MNdkw7wRK6Kj', {
      name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {}
    });
    console.log('Preparar Supabase Web:', result.name || result.message);
  } else {
    console.log('Preparar Supabase Web already has PRECIOS');
  }
}

async function run() {
  await fixParsearDatos();
  await fixPreparaSupabaseWeb();
  console.log('Done.');
}
run();
