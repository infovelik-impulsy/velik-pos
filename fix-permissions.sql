-- Deshabilitar RLS completamente
ALTER TABLE contactos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicios DISABLE ROW LEVEL SECURITY;

-- Dar permisos públicos
GRANT ALL ON contactos TO anon, authenticated;
GRANT ALL ON servicios TO anon, authenticated;

SELECT 'Permisos actualizados' AS resultado;
