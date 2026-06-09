-- Limpiar servicios inválidos
DELETE FROM servicios WHERE nombre IS NULL OR nombre = '' OR nombre = 'SA' OR precio IS NULL;

-- Eliminar duplicados
DELETE FROM servicios a
WHERE a.id NOT IN (
  SELECT MIN(id) FROM servicios b 
  WHERE a.nombre = b.nombre AND a.precio = b.precio
);

SELECT 'Servicios limpiados' AS resultado;
