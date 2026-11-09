-- DEC-038: rol Consulta. Preparado, NO se aplica automáticamente.
-- Ejecutar después de SQL 001, 002 y 003 en una base de desarrollo autorizada.
-- El nuevo valor debe confirmarse antes de utilizarlo en otra transacción.
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'consulta';
