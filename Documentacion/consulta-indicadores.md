# Catálogo y fichas reales en Consulta

**Fecha:** 24/11/2026. **Estado:** implementación solicitada por el usuario, punto 1. Solo lectura de fichas persistidas; no resuelve las decisiones del cuestionario ni habilita resultados operativos.

La pantalla Consulta obtiene los indicadores de PostgreSQL mediante la API autenticada. Sustituye el catálogo JSON y los resultados del almacenamiento local únicamente en esta pantalla. Conserva búsqueda sin distinción de acentos, filtros de tipología/ámbito/desagregación, agrupaciones y apertura de ficha. El botón Actualizar catálogo vuelve a consultar la API; carga, error con reintento, catálogo vacío, dependencia sin asignaciones y filtros sin coincidencias tienen mensajes distintos.

## Contrato y alcance por perfil

`GET /api/v1/consulta/indicadores` devuelve `{ indicadores: [...] }` con `Cache-Control: no-store`. No admite parámetros de consulta ni métodos de escritura. No usa las rutas administrativas ni amplía sus permisos.

| Perfil | Indicadores documentales disponibles |
|---|---|
| Consulta | Catálogo global, con sesión válida; no requiere dependencia. |
| Revisión | Catálogo global, conservando su requisito de dependencia activa para sesión. |
| Administrador | Catálogo global, sin heredar acciones de Captura/Revisión. |
| Captura | Solo indicadores que tienen al menos una variable asignada a su dependencia activa actual. Sin asignaciones: lista vacía. |
| Sin sesión, cuenta inactiva o dependencia requerida inactiva | No se entrega el catálogo. |

Se incluyen fichas activas e inactivas dentro de ese ámbito documental. La interfaz distingue Activado y Sin activar. Activado representa el booleano persistido: no afirma que el primer periodo ya haya comenzado ni concede captura. Ver una ficha inactiva no implica aprobación metodológica ni publicación.

El alcance procede exclusivamente de la cuenta vigente consultada por autenticación. La API rechaza `dependenciaId`, `rol`, `id` y otros filtros enviados por cliente; tampoco usa cabeceras de rol/dependencia. El repositorio aplica `EXISTS` sobre asignaciones y dependencia activa, sin duplicar un indicador por tener varias entradas propias. Los IDs bigint se conservan como cadenas.

## Campos y límites de la ficha

La respuesta selecciona explícitamente `id`, `activo` y los campos documentales: clave, nombre, definición, objetivo, nivel de objetivo, tipología, ámbito, dimensión, agrupación, familia, unidad, desagregación de origen, frecuencia, medio de verificación, sentido, fórmula textual, acumulación, línea base/periodo, meta/horizonte y semaforización textual. Los campos documentales vacíos se muestran como No especificado en el catálogo; se conserva el texto `0` sin convertirlo en ausencia.

No devuelve valores capturados, definiciones/asignaciones operativas de variables, versiones de metodología, historial, auditoría, observaciones internas, archivos o claves de R2. El modal se abre con la ficha ya recibida dentro del ámbito autorizado; no existe un endpoint adicional de ficha por ID que conceda acceso distinto. La descripción de un medio de verificación no es una descarga de evidencia.

La consulta SQL usa columnas/alias definidos por constantes del backend y `$1` para la dependencia. No interpreta fórmulas textuales ni incorpora nombres de columnas, filtros o fragmentos HTTP al SQL. Se requieren las tablas existentes de indicadores/clasificaciones y variables/dependencias (SQL 005/006); no se añaden tablas ni migraciones. Esquema o dependencia de repositorio ausente produce 503; un fallo de consulta no se sustituye por fichas de ejemplo.

## Resultados y calendario

Todavía no existe un módulo operativo de publicaciones del que obtener valores y colores. La API nueva entrega exclusivamente fichas; esta pantalla deja valor, color y versiones en null y avisa Sin resultados publicados disponibles. No lee ni presenta publicaciones del prototipo, no calcula semáforos ni deduce gris por ausencia de datos. Los conteos de colores son cero y las fichas quedan en Sin color publicado; no son una evaluación de desempeño.

Los controles de corte y semáforo están deshabilitados, con texto explicativo y estilo gris. El último mes cerrado y el periodo correspondiente a cada frecuencia se conservan solo como referencia de calendario, sin determinar exigibilidad, apertura/cierre o incumplimiento. No sustituyen el calendario del servidor para operaciones. No se presenta índice/color temático en esta lectura sin publicaciones; ello no implementa por sí solo el retiro propuesto en E05–E07/CR-11.

La fórmula, línea base, meta y regla del modal son textos documentales persistidos, no configuración operativa ni autorización de la ficha. Se leen tal como están en la BD: este cambio no sincroniza la carga de `(2).xlsx` con el anexo revisado ni con Menús.

Al actualizar o cambiar de cuenta/rol/dependencia se limpian el catálogo anterior y la ficha abierta. Se cancelan solicitudes anteriores y se comprueban identidad y orden de respuesta para evitar repoblar la vista con datos de una sesión previa. La ausencia de sesión redirige por el interceptor existente; un 403 conserva la sesión.

## Comprobación y pendientes

- Backend: `test/consulta.test.mjs` verifica sesión, cuatro perfiles, ámbito derivado de sesión, inactividad de dependencia, proyección sin campos internos, bigints, parámetros rechazados, SQL parametrizado, ausencia de escritura, vacío/503/error y ausencia de datos fabricados.
- Frontend: `test/consulta.test.mjs` verifica la lectura HTTP, exclusión de sessionStorage, ficha inactiva, campos documentales, búsqueda/filtros, estados, reintento y respuestas atrasadas. Se conserva la prueba de cero en la ficha y se adapta la prueba de alta que antes esperaba 63 fichas estáticas.
- Integración: `integration/permisos-flujo.mjs` comprueba Axios/Pinia/router/Fastify y el repositorio real con un doble de PostgreSQL. Seis casos de cuenta cubren cuatro roles, dos dependencias con un indicador compartido y otra sin asignaciones. No usa BD ni cuentas reales.
- Comprobado: suite backend 121 aprobadas y 5 integraciones PostgreSQL omitidas; suite frontend 73 aprobadas; integración frontend–API 10 aprobadas; compilaciones de ambas aplicaciones. La advertencia de bundle superior a 500 kB en frontend se conserva y no bloquea la compilación.
- Pendiente: comprobación con PostgreSQL real en una base/operación autorizada y revisión visual de escritorio/móvil. Se intentó una instancia temporal sintética: el navegador integrado agotó conexión a localhost y Computer Use detuvo Chrome al no poder verificar su URL actual. No se modificaron controles de seguridad para continuar.

Las vistas de Análisis y Seguimiento y el selector documental del alta conservan sus consumidores actuales del JSON. Este paso no los convierte en flujos reales, no implementa publicación/captura/revisión ni cambia acceso a PDF, retención, captura tardía o recálculo de antecedentes. [Decisiones todavía en conciliación](conciliacion-respuestas-cuestionario.md).
