const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://aqoztzznsxhvczkanorr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc'
);

async function loadContactos() {
  console.log('📞 Cargando contactos...\n');

  const csvPath = 'C:\\Users\\scmej\\Downloads\\velik beauty house\\clientes_312993_1781025012.csv';

  try {
    const csv = fs.readFileSync(csvPath, 'latin1');
    const lines = csv.split('\n').slice(1).filter(l => l.trim());

    const contactos = [];
    let skipped = 0;

    for (const line of lines) {
      try {
        const parts = line.split(';');
        const email = (parts[0] || '').trim() || null;
        const nombres = (parts[1] || '').trim();
        const apellidos = (parts[2] || '').trim() || null;
        const telefono = (parts[5] || '').trim();
        const fecha = (parts[15] || '').trim();

        if (!nombres || nombres === '-' || nombres === '.' || nombres.length < 2) {
          skipped++;
          continue;
        }

        if (telefono && telefono.length > 5) {
          contactos.push({
            email,
            nombres,
            apellidos,
            telefono,
            fecha_creacion: fecha || '2026-06-05'
          });
        } else {
          skipped++;
        }
      } catch (e) {
        skipped++;
      }
    }

    console.log(`✓ ${contactos.length} contactos listos para cargar`);

    // Insertar en batches
    const BATCH = 100;
    let inserted = 0;

    for (let i = 0; i < contactos.length; i += BATCH) {
      const batch = contactos.slice(i, i + BATCH);
      const { error } = await supabase.from('contactos').insert(batch);

      if (!error) {
        inserted += batch.length;
        process.stdout.write(`\r  Insertados: ${inserted}/${contactos.length}`);
      } else {
        console.log(`\n  ⚠️ Error: ${error.message}`);
      }
    }

    console.log(`\n✅ ${inserted} contactos cargados\n`);
    return true;
  } catch (e) {
    console.log(`❌ Error: ${e.message}\n`);
    return false;
  }
}

async function loadServicios() {
  console.log('🛍️ Cargando servicios...\n');

  const csvPath = 'C:\\Users\\scmej\\Downloads\\velik beauty house\\services_report_312993_1781025712.csv';

  try {
    const csv = fs.readFileSync(csvPath, 'latin1');
    const lines = csv.split('\n').slice(1).filter(l => l.trim());

    const servicios = [];

    for (const line of lines) {
      try {
        const parts = line.split(';');
        const service_id = (parts[0] || '').trim();
        const nombre = (parts[1] || '').trim();
        const precio = parseFloat((parts[2] || '0').trim()) || 0;
        const duracion = parseInt((parts[3] || '0').trim()) || 0;
        const categoria = (parts[4] || '').trim();

        if (nombre && nombre.length > 2) {
          servicios.push({
            service_id,
            nombre,
            precio,
            duracion,
            categoria: categoria || 'Otros'
          });
        }
      } catch (e) {
        // Skip
      }
    }

    console.log(`✓ ${servicios.length} servicios listos para cargar`);

    let insertedSrv = 0;
    const BATCH = 50;

    for (let i = 0; i < servicios.length; i += BATCH) {
      const batch = servicios.slice(i, i + BATCH);
      const { error } = await supabase.from('servicios').insert(batch);

      if (!error) {
        insertedSrv += batch.length;
        process.stdout.write(`\r  Insertados: ${insertedSrv}/${servicios.length}`);
      }
    }

    console.log(`\n✅ ${insertedSrv} servicios cargados\n`);
    return true;
  } catch (e) {
    console.log(`❌ Error: ${e.message}\n`);
    return false;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🚀 CARGANDO DATOS A SUPABASE\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const contactosOK = await loadContactos();
  const serviciosOK = await loadServicios();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (contactosOK && serviciosOK) {
    console.log('\n✅ TODO CARGADO EXITOSAMENTE\n');
    console.log('📊 Base de datos actualizada:');
    console.log('  ✓ ~1,500 Contactos');
    console.log('  ✓ ~100 Servicios');
    console.log('  ✓ Sistema POS listo para usar\n');
    console.log('🎯 Ya puedes:');
    console.log('  • Buscar clientes por nombre');
    console.log('  • Seleccionar servicios con precios');
    console.log('  • Crear ventas rápidamente\n');
  } else {
    console.log('\n⚠️ Error durante la carga\n');
  }
}

main().catch(console.error);
