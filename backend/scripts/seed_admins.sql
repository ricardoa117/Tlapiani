-- ============================================================
-- TLAPIANI — Inserción de Administradores de Prueba
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================

-- Insertar administrador de Tehuacán
INSERT INTO productores (
  folio, 
  nombre, 
  password, 
  rol, 
  activo, 
  municipio_id, 
  idioma_preferido, 
  tipo_acceso
)
VALUES (
  'admin-teh', 
  'Admin Tehuacán', 
  'admin123', 
  'admin', 
  true, 
  (SELECT id FROM municipios WHERE nombre ILIKE '%tehuacán%' LIMIT 1), 
  'es', 
  'smartphone'
);

-- Insertar administrador de Zacatlán
INSERT INTO productores (
  folio, 
  nombre, 
  password, 
  rol, 
  activo, 
  municipio_id, 
  idioma_preferido, 
  tipo_acceso
)
VALUES (
  'admin-zac', 
  'Admin Zacatlán', 
  'admin123', 
  'admin', 
  true, 
  (SELECT id FROM municipios WHERE nombre ILIKE '%zacatlán%' LIMIT 1), 
  'es', 
  'smartphone'
);
