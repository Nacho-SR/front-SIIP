-- DEC-037: Captura y Revisión requieren una dependencia. Preparado, no ejecutado.
-- Si existen revisores sin dependencia, asignarles una real antes de aplicar este SQL.
-- No se inventan asignaciones ni se modifican cuentas automáticamente.
BEGIN;

ALTER TABLE usuarios ADD CONSTRAINT usuarios_dependencia_por_rol
    CHECK (rol NOT IN ('captura', 'revision') OR dependencia_id IS NOT NULL) NOT VALID;
ALTER TABLE usuarios VALIDATE CONSTRAINT usuarios_dependencia_por_rol;

COMMIT;
