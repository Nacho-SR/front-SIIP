# Activación controlada — 17/11/2026

Actualización de interfaz del 24/11/2026: la misma ruta incorpora el [panel de
preparación](preparacion-indicadores.md), con variables, responsables y requisitos
existentes. El catálogo ofrece Ver preparación para activos e inactivos. No cambia
los contratos ni la validación del backend; distingue versión guardada de la
aplicada e inicio por elegir de inicio registrado. Sin SQL ni escrituras reales.

DEC-045: implementación solicitada por el usuario (punto 2). Confirma que una
activación comienza como mínimo en el **siguiente periodo natural completo**,
incluida una reactivación. No se activa en el periodo en curso ni retroactivamente.
Un mensual activado el 17/11/2026 puede iniciar desde el 01/12/2026; un trimestral,
semestral o anual, desde el 01/01/2027. Se puede elegir un periodo posterior.
El primer periodo parcial no se genera. P-07 para otros casos y P-08 para cambios
de metodología con ciclos abiertos no se consideran resueltos.

## Integración necesaria de la rama

El develop encontrado el 17/11 no contenía DEC-044: se recuperan de 45df06e sus
archivos de metodología, SQL 007, pruebas y pantalla, sin cambiar de rama ni
reemplazar el trabajo actual de edición/clasificaciones. Se restablecen también
los registros de rutas/repositorios de variables faltantes en app/server, y PUT
en CORS. SQL 007 ya fue aplicado con autorización el 10/11 únicamente en SIIP local;
no se vuelve a aplicar automáticamente ni se supone presente en otras bases.

## Interfaz y API

Administración → Indicadores → Activar abre una pantalla de comprobación. También
se llega desde Cálculo y semáforo → Revisar activación e inicio. Se muestran la
metodología preparada, requisitos pendientes, frecuencia, inicio mínimo e historia.
La fecha se elige explícitamente y requiere confirmación. No se escribe al abrir.
Errores/conflictos conservan la fecha y exigen confirmar otra vez; una recarga fallida
bloquea escrituras. No hay éxito hasta recibir confirmación de la API.

| Método | Ruta relativa a /api/v1 | Contrato |
|---|---|---|
| GET | /administracion/indicadores/{id}/activacion | Preparación, pendientes, inicio mínimo e historial. |
| POST | /administracion/indicadores/{id}/activacion | `{metodologiaId, primerPeriodo: 'YYYY-MM-DD'}`; devuelve estado confirmado. |

Solo Administrador y sesión; no-store; Origin/CSRF para POST, límite 4 KiB, IDs como
cadenas. 404 inexistente; 409 por estado, configuración incompleta o versión obsoleta;
422 por periodo inválido; 503 si faltan PostgreSQL o SQL 007/008.

## Comprobaciones y conservación de la historia

Se comprueban nuevamente dentro de una transacción:

- Indicador inactivo; metodología preparada más reciente y del indicador.
- Dos conteos compatibles con porcentaje parte/total, umbrales válidos y contexto
  igual al guardado: versión/definiciones de variables, responsables y ficha.
- Cada variable asignada a una dependencia activa; familia/agrupación activas y
  coherentes con la clave. No se inventan responsables ni usuarios.
- Fecha de inicio natural según frecuencia, posterior al periodo actual de
  America/Mexico_City. El reloj del navegador no determina la elegibilidad.

El contexto de metodología incorpora clave, fórmula y semáforo documentales.
Una versión anterior sin esos campos se conserva, pero debe guardarse una versión
nueva antes de activar. No se interpreta la fórmula textual como código. La selección
de operandos y umbrales sigue siendo una configuración explícita del administrador.

SQL 008 añade una sola tabla, `activaciones_indicador`, con FK compuesta para
garantizar que la metodología pertenece al indicador, fecha de primer periodo,
actor/fecha de activación y actor/fecha de desactivación. Solo puede existir un
registro abierto por indicador. No duplica valores, resultados ni periodos.
La activación, el estado y la auditoría de indicadores se confirman juntos.

Desactivar cierra el registro abierto sin borrarlo. Reactivar crea otro registro y
vuelve a aplicar el calendario/configuración; no reutiliza periodos pasados. Una
activación futura cancelada puede conservar el mismo inicio en otro registro si
todavía cumple el siguiente periodo completo. Los registros cerrados no son prueba
de que existan capturas o publicaciones. Las ventanas de exigibilidad/captura se
implementarán en el módulo operativo.

Se bloquea en el repositorio la antigua activación genérica con `{activo:true}`.
PATCH de estado conserva la desactivación auditada y cierra su registro. Con el
indicador activo también se protegen frecuencia, unidad, sentido, acumulación y
variables documentales, además de clave, clasificación, fórmula y semáforo.

## Límites y puesta en marcha

Una activación con fecha futura deja el indicador activo administrativamente y
conserva su inicio registrado; no habilita capturas antes de esa fecha. En esta
etapa Captura/Seguimiento continúan sin escrituras de negocio. No se crean periodos,
atrasos grises, envíos, PDFs, publicaciones ni agregados temáticos.

SQL 008 se aplicó con autorización expresa el 17/11/2026 solo en SIIP local,
localhost:5432/public. Las integraciones de metodología y activación pasaron antes
de aplicar SQL a public; los dos esquemas temporales se eliminaron. Se comprobaron
restricciones, auditoría/rollback, concurrencia, contexto, desactivación e historia.
El SQL no se ejecuta al iniciar ni activa ejemplos por sí solo.
Los dispositivos físicos y el hosting no forman parte de esta comprobación.

Comprobaciones previas a PostgreSQL: compilaciones correctas; 59 pruebas frontend y
73 backend aprobadas, con integraciones reales excluidas de esa pasada. Navegador
aprobado con repositorios sintéticos: confirmación, conflicto sin pérdida de fecha,
recarga, activación persistida, desactivación con foco contenido y reactivación
conservando historia; cuatro perfiles y 1440/768/390/320 px sin desbordamiento.
[Evidencia](../../QA-final-2026-11-09/activacion/resultado.json).


## Resultado aplicado con autorización

El usuario autorizó SQL 008 y la activación del ejemplo 130 desde diciembre.
Indicador ID 1 (SIIP.05.F35.004): activo, primer periodo 01/12/2026, activación ID 1,
metodología ID 4 / versión 2. Se actualizó el contexto de ficha sin cambiar el
cálculo N/D × 100 ni umbrales amarillo 75 % / verde 90 %. La versión 1 se conserva.
N/D mantienen sus responsables DGSM; no se modificaron cuentas ni asignaciones,
ni se crearon capturas o publicaciones. Actor: Administrador activo ID 1.
No asumir aplicación en otros entornos ni que Git aísla la base de datos.
[Constancia de aplicación](../../QA-final-2026-11-09/activacion/sql-008-aplicado.json).
