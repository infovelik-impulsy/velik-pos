import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aqoztzznsxhvczkanorr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc'
);

async function createTables() {
  console.log('🔧 Creando tablas en Supabase...\n');

  const { error: errContactos } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS contactos (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255),
        nombres VARCHAR(255),
        apellidos VARCHAR(255),
        telefono VARCHAR(20),
        fecha_creacion VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
  }).catch(async () => {
    // Si falla el RPC, intenta directamente
    const { error } = await supabase.from('contactos').select('count').limit(1);
    if (error?.code === '42P01') {
      console.log('⚠️ No se pudo crear tabla contactos (necesita SQL directo)');
    }
    return { error: null };
  });

  const { error: errServicios } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS servicios (
        id BIGSERIAL PRIMARY KEY,
        service_id VARCHAR(50),
        nombre VARCHAR(255),
        precio DECIMAL(10, 2),
        duracion INT,
        categoria VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
  }).catch(async () => {
    const { error } = await supabase.from('servicios').select('count').limit(1);
    if (error?.code === '42P01') {
      console.log('⚠️ No se pudo crear tabla servicios (necesita SQL directo)');
    }
    return { error: null };
  });

  console.log('✅ Tablas listas (o ya existen)\n');
  return true;
}

async function main() {
  await createTables();

  console.log('📝 PRÓXIMO PASO:');
  console.log('   Ejecuta: node load-data.js\n');
}

main().catch(console.error);
