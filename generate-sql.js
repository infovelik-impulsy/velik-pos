import fs from 'fs';

async function generateSQL() {
  console.log('📝 Generando SQL con todos los datos...\n');

  // Leer contactos
  const csvContactos = fs.readFileSync('C:\\Users\\scmej\\Downloads\\clientes_312993_1781025012.csv', 'latin1');
  const linesContactos = csvContactos.split('\n').slice(1).filter(l => l.trim());

  const contactos = [];
  for (const line of linesContactos) {
    try {
      const parts = line.split(';');
      const email = (parts[0] || '').trim() || null;
      const nombres = (parts[1] || '').trim();
      const apellidos = (parts[2] || '').trim() || null;
      const telefono = (parts[5] || '').trim();
      const fecha = (parts[15] || '').trim();

      if (!nombres || nombres === '-' || nombres === '.' || nombres.length < 2) continue;
      if (!telefono || telefono.length < 5) continue;

      contactos.push({
        email: email ? `'${email.replace(/'/g, "''")}'` : 'NULL',
        nombres: `'${nombres.replace(/'/g, "''")}'`,
        apellidos: apellidos ? `'${apellidos.replace(/'/g, "''")}'` : 'NULL',
        telefono: `'${telefono.replace(/'/g, "''")}'`,
        fecha_creacion: `'${fecha || '2026-06-05'}'`
      });
    } catch (e) {
      // Skip
    }
  }

  // Leer servicios
  const csvServicios = fs.readFileSync('C:\\Users\\scmej\\Downloads\\services_report_312993_1781025712.csv', 'latin1');
  const linesServicios = csvServicios.split('\n').slice(1).filter(l => l.trim());

  const servicios = [];
  for (const line of linesServicios) {
    try {
      const parts = line.split(';');
      const service_id = (parts[0] || '').trim();
      const nombre = (parts[1] || '').trim();
      const precio = parseFloat((parts[2] || '0').trim()) || 0;
      const duracion = parseInt((parts[3] || '0').trim()) || 0;
      const categoria = (parts[4] || '').trim();

      if (!nombre || nombre.length < 2) continue;

      servicios.push({
        service_id: `'${service_id.replace(/'/g, "''")}'`,
        nombre: `'${nombre.replace(/'/g, "''")}'`,
        precio: precio,
        duracion: duracion,
        categoria: `'${(categoria || 'Otros').replace(/'/g, "''")}'`
      });
    } catch (e) {
      // Skip
    }
  }

  // Generar SQL
  let sql = '-- SQL para cargar todos los contactos y servicios\n\n';
  sql += 'TRUNCATE TABLE contactos CASCADE;\n';
  sql += 'TRUNCATE TABLE servicios CASCADE;\n\n';

  // Contactos
  sql += '-- INSERTAR CONTACTOS\n';
  sql += 'INSERT INTO contactos (email, nombres, apellidos, telefono, fecha_creacion) VALUES\n';

  const contactosSQL = contactos.map((c, idx) => {
    return `(${c.email}, ${c.nombres}, ${c.apellidos}, ${c.telefono}, ${c.fecha_creacion})`;
  }).join(',\n');

  sql += contactosSQL + ';\n\n';

  // Servicios
  sql += '-- INSERTAR SERVICIOS\n';
  sql += 'INSERT INTO servicios (service_id, nombre, precio, duracion, categoria) VALUES\n';

  const serviciosSQL = servicios.map((s, idx) => {
    return `(${s.service_id}, ${s.nombre}, ${s.precio}, ${s.duracion}, ${s.categoria})`;
  }).join(',\n');

  sql += serviciosSQL + ';\n\n';

  sql += `SELECT '✅ CARGADOS ${contactos.length} contactos + ${servicios.length} servicios' AS resultado;\n`;

  // Guardar SQL a archivo
  fs.writeFileSync('C:\\Users\\scmej\\Downloads\\velik-pos\\load-all-data.sql', sql, 'utf8');

  console.log(`✅ SQL generado exitosamente`);
  console.log(`\n📊 Datos preparados:`);
  console.log(`  • ${contactos.length} contactos`);
  console.log(`  • ${servicios.length} servicios`);
  console.log(`\n📋 Archivo: load-all-data.sql`);
  console.log(`\n✂️ INSTRUCCIONES:`);
  console.log(`  1. Abre: C:\\Users\\scmej\\Downloads\\velik-pos\\load-all-data.sql`);
  console.log(`  2. Copia TODO el contenido`);
  console.log(`  3. Ve a Supabase → SQL Editor`);
  console.log(`  4. Pega y ejecuta`);
  console.log(`  5. ¡Listo! 🚀\n`);
}

generateSQL().catch(console.error);
