# Catálogo de endpoints del SIIP

Versión 0.1 · 26/10/2026 · API propuesta, sin backend implementado. Base relativa `/api/v1`. Se conserva la carpeta real `Documentacion`; las rutas HTTP son independientes de esa capitalización.

P0: primer recorrido con configuración conciliada de una dependencia. P1: observaciones/corrección, reapertura, evaluación temática y avisos. P2: administración y reportes después de cerrar contratos específicos; diferidos no significa fuera de MVP.

Todos los contratos son borradores. `T` = propuesta técnica; `C` = contrato condicionado por pendientes de negocio/configuración. En OpenAPI se indican mediante `x-estado-contrato`, `x-pendientes`, `x-roles` y `x-prioridad`. El YAML contiene las 21 operaciones P0/P1 siguientes, no todos los candidatos P2.

## Autenticación

| Método | Ruta | Propósito | Roles | Prioridad | Estado |
|---|---|---|---|---|---|
| GET | /auth/sesion | Bootstrap CSRF y usuario actual o null. | Público técnico / sesión propia | P0 | T; transporte por revisar |
| POST | /auth/sesion | Autenticar y rotar sesión/CSRF. | Público técnico con CSRF/origen válido | P0 | T |
| DELETE | /auth/sesion | Invalidar sesión propia. | Tres roles | P0 | T |

Cookie opaca HttpOnly/Secure/SameSite y token CSRF son la alternativa propuesta. No se añaden JWT, refresh, registro público o CRUD de sesiones. El almacén técnico de sesiones depende del framework/hosting y no es una entidad de negocio confirmada.

## Indicadores y captura

| Método | Ruta | Propósito | Roles | Prioridad | Estado |
|---|---|---|---|---|---|
| GET | /indicadores | Listar catálogo visible; Captura solo asignados. | Tres roles | P0 | T; alcance por DEC-010 |
| GET | /indicadores/{indicadorId} | Ficha y entradas visibles del indicador. | Tres roles | P0 | T |
| GET | /indicadores/{indicadorId}/periodos | Calendario conocido o configuración pendiente. | Tres roles | P0 | C: P-07/P-12 |
| POST | /indicadores/{indicadorId}/capturas | Enviar todos los valores y PDF de su ámbito. | Captura | P0 | C: PROP-BD-003, asignaciones, calendario y PDF |
| GET | /capturas/{capturaId} | Consultar envío, valores y evidencia autorizados. | Tres roles | P0 | T; segregación por dependencia |
| POST | /capturas/{capturaId}/correcciones | Nuevo envío completo y respuestas a observaciones. | Captura | P1 | C: unidad de envío / PDF |
| GET | /evidencias/{evidenciaId}/descarga | Entregar PDF tras autorización por objeto. | Tres roles | P0 | T; streaming propuesto / proveedor pendiente |

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
| GET | /indicadores/{indicadorId}/resultados | Historia con la última publicación actual por intervalo. | Tres roles, alcance autorizado | P0 | T; DEC-011/016/022 |
| GET | /agrupaciones/{agrupacionId}/evaluacion | Corte mensual, fuentes y evaluación sin arrastre. | Revisión, Administrador | P1 | C: P-07/10/12/13; sin acceso global de Captura |
| GET | /notificaciones | Avisos del destinatario autenticado. | Tres roles | P1 | C: bandeja interna y P-14 |
| POST | /notificaciones/{notificacionId}/lectura | Marcar como leída una notificación propia. | Tres roles | P1 | C: P-14; repetición devuelve el mismo estado |

## Candidatos P2 aún sin contrato OpenAPI

| Método / ruta candidata | Propósito de negocio | Roles | Pendiente que impide cerrarlo |
|---|---|---|---|
| GET, POST /administracion/usuarios; PATCH /administracion/usuarios/{id} | Dar altas, actualizar rol/dependencia y desactivar cuentas. | Administrador | Alta inicial, entrega de credenciales, campos editables y protección de acceso administrativo. Sin DELETE de historia. |
| GET, POST /administracion/dependencias; PATCH /administracion/dependencias/{id} | Mantener el catálogo responsable depurado. | Administrador | Denominaciones y tratamiento de cambios con asignaciones. |
| GET /administracion/indicadores/{id}/configuracion; PATCH sobre el mismo recurso | Configurar ficha, operaciones soportadas y reglas delimitadas. | Administrador | P-08, catálogos editables y validación de cada regla. Sin expresiones arbitrarias. |
| PUT /administracion/indicadores/{id}/asignaciones | Asignar dependencias a las entradas del indicador de forma atómica. | Administrador | Asignaciones del cliente y efecto temporal. No crea una entidad asignacion por existir la ruta. |
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
