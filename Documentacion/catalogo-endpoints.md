# Catálogo de endpoints del SIIP

Versión 0.1 · 26/10/2026 · API de negocio propuesta; autenticación y altas iniciales implementadas en código. Base relativa `/api/v1`. Se conserva la carpeta real `Documentacion`; las rutas HTTP son independientes de esa capitalización.

P0: primer recorrido con configuración conciliada de una dependencia. P1: observaciones/corrección, reapertura, evaluación temática y avisos. P2: administración y reportes después de cerrar contratos específicos; diferidos no significa fuera de MVP.

Todos los contratos son borradores. `T` = propuesta técnica; `C` = contrato condicionado por pendientes de negocio/configuración. En OpenAPI se indican mediante `x-estado-contrato`, `x-pendientes`, `x-roles` y `x-prioridad`. El YAML contiene las 21 operaciones P0/P1 siguientes, no todos los candidatos P2.

## Autenticación

| Método | Ruta | Propósito | Roles | Prioridad | Estado |
|---|---|---|---|---|---|
| GET | /auth/sesion | Bootstrap CSRF y usuario actual o null. | Público técnico / sesión propia | P0 | T; transporte por revisar |
| POST | /auth/sesion | Autenticar y rotar sesión/CSRF. | Público técnico con CSRF/origen válido | P0 | T |
| DELETE | /auth/sesion | Invalidar sesión propia. | Cuatro roles | P0 | T |

Cookie opaca HttpOnly/Secure/SameSite y token CSRF son la alternativa propuesta. No se añaden JWT, refresh, registro público o CRUD de sesiones. El almacén técnico de sesiones depende del framework/hosting y no es una entidad de negocio confirmada.

## Indicadores y captura

| Método | Ruta | Propósito | Roles | Prioridad | Estado |
|---|---|---|---|---|---|
| GET | /indicadores | Listar catálogo visible; Captura solo asignados. | Cuatro roles | P0 | T; alcance por DEC-010 |
| GET | /indicadores/{indicadorId} | Ficha visible; Consulta sin entradas operativas. | Cuatro roles | P0 | T |
| GET | /indicadores/{indicadorId}/periodos | Calendario y cumplimiento al cierre, o configuración pendiente. | Cuatro roles | P0 | C: P-07/P-12 |
| POST | /indicadores/{indicadorId}/capturas | Enviar todos los valores y PDF de su ámbito. | Captura | P0 | C: PROP-BD-003, asignaciones, calendario y PDF |
| GET | /capturas/{capturaId} | Consultar envío, valores y evidencia autorizados. | Tres roles | P0 | T; segregación por dependencia |
| POST | /capturas/{capturaId}/correcciones | Nuevo envío completo y respuestas a observaciones. | Captura | P1 | C: unidad de envío / PDF |
| GET | /evidencias/{evidenciaId}/descarga | Entregar PDF tras autorización por objeto. | Tres roles | P0 | T; streaming propuesto / R2 seleccionado DEC-041 |

## Revisión, validación y reapertura

| Método | Ruta | Propósito | Roles | Prioridad | Estado |
|---|---|---|---|---|---|
| GET | /expedientes | Bandeja filtrada por permisos, estado e indicador opcional. | Tres roles | P0 | T |
| GET | /expedientes/{expedienteId} | Contexto del ciclo y envíos visibles. | Tres roles | P0 | T |
| GET | /expedientes/{expedienteId}/eventos | Hilo cronológico autorizado y paginado. | Tres roles | P0 | T |
| POST | /capturas/{capturaId}/observaciones | Registrar observación y pasar a observada. | Revisión | P1 | T; estados propuestos |
| POST | /capturas/{capturaId}/revision | Resolver observaciones aceptadas y marcar revisada. | Revisión | P0 | T; no valida ni publica |
| POST | /expedientes/{expedienteId}/validacion | Calcular, validar y publicar el conjunto revisado explícito. | Revisión | P0 | C: PROP-BD-003, P-08 y reglas conciliadas |
| POST | /expedientes/{expedienteId}/reaperturas | Crear otro ciclo justificado y preservar publicación. | Administrador | P1 | C: P-08 y reutilización de aportaciones |

## Consulta de resultados y avisos

| Método | Ruta | Propósito | Roles | Prioridad | Estado |
|---|---|---|---|---|---|
| GET | /indicadores/{indicadorId}/resultados | Historia con la última publicación actual por intervalo. | Cuatro roles, alcance autorizado | P0 | T; DEC-011/016/022 |
| GET | /agrupaciones/{agrupacionId}/evaluacion | Corte mensual, fuentes y evaluación sin arrastre. | Revisión, Administrador, Consulta | P1 | C: P-07/10/12/13; sin acceso global de Captura |
| GET | /notificaciones | Avisos del destinatario autenticado. | Tres roles | P1 | C: bandeja interna y P-14 |
| POST | /notificaciones/{notificacionId}/lectura | Marcar como leída una notificación propia. | Tres roles | P1 | C: P-14; repetición devuelve el mismo estado |

## Altas administrativas iniciales — 04/11/2026, DEC-036

| Método | Ruta | Propósito | Acceso | Estado |
|---|---|---|---|---|
| POST | /administracion/usuarios | Crear Captura/Revisión con dependencia activa o Consulta sin dependencia; contraseña Argon2id y alta auditada. | Administrador con sesión, Origin y CSRF | Implementado en código/UI; preparar SQL 001/002/003/004 y configurar BD. |
| GET | /administracion/usuarios | Listar todas las cuentas registradas, activas e inactivas, con rol y nombre de dependencia; sin secretos y ordenadas por nombre e ID. Array sin paginación. | Administrador con sesión | Implementado en código/UI; carga al abrir la pantalla y permite actualizar. |
| GET | /administracion/dependencias | Catálogo completo de dependencias activas para el selector de altas, ordenado por nombre e ID; array sin paginación. | Administrador con sesión | Implementado; no concede acceso a otros roles. |
| POST | /administracion/dependencias | Registrar dependencia para asignar usuarios de Captura o Revisión. | Administrador con sesión, Origin y CSRF | Implementado en código/UI; alta y auditoría atómicas. |

El primer administrador se crea por `npm run admin:create`, nunca por endpoint público. El script no modifica cuentas existentes. Colección importable en `../siip-backend/docs/SIIP-auth.postman_collection.json`.

## Fichas persistentes de indicadores — 09/11/2026, DEC-042

| Método | Ruta | Propósito | Acceso |
| --- | --- | --- | --- |
| POST | /administracion/indicadores | Crear ficha inactiva y auditoría en una transacción. Consecutivo del servidor, código único y clasificación válida. | Administrador con sesión, Origin y CSRF |
| GET | /administracion/indicadores | Listar fichas nuevas persistidas, por consecutivo descendente, sin paginación. | Administrador con sesión |
| GET | /administracion/indicadores/{id} | Consultar ficha por ID interno. | Administrador con sesión |

Implementado en código/UI. Requiere SQL 005 en la base autorizada. No carga las
63 fichas base ni activa indicadores. [Alcance y diferencias del borrador](alta-indicadores.md).

## Candidatos P2 aún sin contrato OpenAPI

Actualización 10/11/2026, DEC-043: GET/PUT
`/administracion/indicadores/{id}/variables` implementados para Administrador.
PUT registra entradas nuevas y sus dependencias o cambia asignaciones existentes,
con versión y auditoría transaccional. No activa indicadores ni edita definiciones
registradas. [Contrato y límites](variables-asignaciones.md).

| Método / ruta candidata | Propósito de negocio | Roles | Pendiente que impide cerrarlo |
|---|---|---|---|
| PATCH /administracion/usuarios/{id} | Actualizar rol/dependencia y desactivar cuentas. | Administrador | Campos editables y protección de acceso administrativo. Sin DELETE de historia. |
| GET /administracion/dependencias; PATCH /administracion/dependencias/{id} | Mantener el catálogo responsable depurado. | Administrador | Denominaciones y tratamiento de cambios con asignaciones. |
| GET /administracion/indicadores/{id}/configuracion; PATCH sobre el mismo recurso | Configurar ficha, operaciones soportadas y reglas delimitadas. | Administrador | P-08, catálogos editables y validación de cada regla. Sin expresiones arbitrarias. |
| PUT /administracion/indicadores/{id}/asignaciones | Absorbido por GET/PUT /administracion/indicadores/{id}/variables (DEC-043), sin ruta duplicada. | Administrador | Las asignaciones para indicadores activos y su efecto temporal requieren el flujo posterior de metodología. |
| GET /administracion/auditoria | Consultar cambios administrativos. | Administrador | Filtros y retención; excluir secretos. |
| GET /reportes/resultados | Exportar resultados autorizados. | Revisión; Administrador pendiente | Formato, filtros, tamaño y modo de entrega. No se promete PDF/XLSX ni jobs asíncronos. |

Agrupaciones y familias viajan en el catálogo de indicadores del primer recorrido; no necesitan endpoints CRUD solo para llenar selectores. Las altas/ediciones de esos catálogos se concretarán cuando se delimite su administración. No hay endpoints de importación, chat, tablas de valores aisladas, publicación manual, borrado de capturas ni modificación libre del estado.

## Convenciones de contrato

- OpenAPI 3.1.1, esquemas JSON Schema compatibles con 2020-12. Los roles son anotaciones `x-roles`; OpenAPI no los hace cumplir por sí solo.
- IDs bigint representados como cadenas decimales; valores numeric(24,8) como cadenas decimales para preservar precisión en JavaScript. No son opciones del usuario sobre la fórmula.
- Objetos de respuesta directos; listas con items/pagina/por_pagina/total, orden estable. Paginación propuesta: página inicial 1, 20 por página y máximo técnico 100, no un límite al historial consultable.
- No aceptar autor, rol, dependencia, estado, color o fechas de auditoría en los comandos de captura/validación. Los esquemas de petición usan additionalProperties=false.
- Sesión, errores, datos pendientes y PDF privados: Cache-Control: no-store. POST autenticados y DELETE exigen X-CSRF-Token; también login tras bootstrap. Verificar origen.
- 404 para objeto inexistente o fuera de ámbito; 403 para función/CSRF no autorizado. Filtrar antes de contar/paginar.
- 409 para estado/configuración pendiente y 422 para datos inválidos. application/problem+json según RFC 9457, con codigo y errores por campo. 413/415 para cargas, 503 para almacenamiento y 500 sin detalles internos.
- El servidor serializa operaciones por expediente. Validación incluye los IDs exactos revisados y rechaza un conjunto que cambió; no se añade columna de revisión solo para la API.
- Ejemplos sintéticos con códigos DEMO, no asignaciones ni reglas nuevas de indicadores reales.

### Ejemplo del envío multipart

La parte `datos`, con Content-Type application/json, contiene:

```json
{
  "periodo": {"inicio": "2026-09-01", "fin": "2026-09-30"},
  "expediente_id": null,
  "descripcion_avance": "Reporte municipal completo del periodo de demostración.",
  "observaciones_captura": null,
  "valores": [{"variable_id": "11", "valor": "80"}, {"variable_id": "12", "valor": "100"}]
}
```

Se adjuntan los PDF reales en `evidencias`; no cadenas de URL ni un archivo falso de ejemplo. Respuesta 201: un CapturaDetalle con IDs asignados, estado en_revision y evidencia. Después Revisión envía `{"observaciones_resueltas_ids": []}` a la acción revision. Validación posterior: `{"capturas_revisadas_ids": ["101"]}`. La respuesta contiene el resultado calculado y publicado, nunca suministrado por cliente. Las correspondencias de datos de ejemplo están en [api/openapi.yaml](api/openapi.yaml).

Ver [flujos](flujos-negocio.md), [permisos](matriz-permisos.md) e [impacto sobre el modelo](impacto-api-modelo-datos.md).

## Ajustes del 06/11/2026

DEC-038: Consulta no se agrega a los permisos de expedientes, capturas, eventos o descargas PDF privadas. Las menciones «Tres roles» de esos recursos se refieren exclusivamente a Captura/Revisión/Administrador, con sus restricciones previas. Los reportes y avisos de Consulta requieren definición de alcance.

DEC-039: el servidor deberá rechazar nuevos datos después del cierre, incluso con formulario abierto previamente. La revisión de envíos completos continúa. Se requieren contratos nuevos para abrir y adjuntar una justificación de incumplimiento por indicador/periodo, aun sin captura previa. Están pendientes de diseño operativo y se documentan en flujos; no se reutiliza la reapertura de una publicación validada ni se declaran endpoints implementados.

Actualización de alojamiento DEC-040 y DEC-041 (06/11/2026): frontend/API/PostgreSQL en Hostinger VPS KVM 1 y archivos en Cloudflare R2. Proveedores ya seleccionados, sin contratar o desplegar desde esta actualización. El proveedor no modifica la aprobación pendiente del esquema ni los permisos de archivos. [Costos vigentes](infraestructura-hostinger-r2.md).
