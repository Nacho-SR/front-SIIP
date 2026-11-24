# Matriz de permisos del SIIP

Versión 0.3 · 24/11/2026 · Permisos anteriores con respuestas del cuestionario en conciliación; sin cambios de autorización en código.

## Permisos recibidos que requieren validación

La [matriz de respuestas](conciliacion-respuestas-cuestionario.md) conserva el
texto recibido y los acuerdos afectados. E02 propone acceso a documentos para
Administrador, Revisión y Consulta y omite Captura. O09 menciona seguimiento
como posible aportante de justificación. O11 limita Captura a definición,
fórmula, periodo, fijas y su entrada; no resuelve la información interna visible
a Consulta. R03 no ratifica expresamente toda la matriz de roles.

Resolver CR-06/08 antes de cambiar las filas de lectura de envíos/PDF, subir
justificación o descargar. Una lectura global de fichas no otorga acceso global
a expedientes. Seguimiento es una vista del rol Revisión, no un rol nuevo.
La validación por IMPLAN de G03 identifica una institución; no concede validación
operativa a Administrador. E04/O12 no conceden exportación ni escritura en
observaciones a perfiles nuevos por el solo hecho de elegir un canal.

R05/O05 cambian condiciones de escritura posterior al cierre (CR-01); G01 limita
edición/asignaciones, en tensión con G02/M06 (CR-02). La tabla siguiente conserva
facultades anteriores y propuestas identificadas. Esos puntos en conflicto no
son aprobación para ampliar ni retirar permisos, y los contratos existentes se
conservan. Autoría/fecha y autorización final del Word siguen sin completar.

Roles exclusivos: `captura`, `revision`, `administrador`, `consulta` (DEC-038, 06/11/2026). No existe un rol validador adicional. Consulta permite varias cuentas sin dependencia y lectura global de fichas, resultados publicados y estadísticas. Una cuenta Administrador no hereda permisos de Captura/Revisión. Identidad, rol y dependencia proceden de la sesión y cuenta vigente, no de campos enviados por cliente.

DEC-037 (04/11/2026): Captura y Revisión requieren dependencia activa; si esta se desactiva, la cuenta no puede autenticar ni conservar su sesión. La pertenencia de Revisión no reduce la consulta global ya acordada. Solo Administrador consulta el catálogo para las altas y crea usuarios/dependencias.

Leyenda: **Sí** = facultad confirmada; **No** = no autorizada por el alcance; **Propuesto** = precisión técnica por revisar; **Pendiente** = no conceder antes de definirla. Toda acción depende también de objeto, estado y alcance. No basta ocultar botones.

| Acción de negocio | Captura | Revisión | Administrador | Consulta | Ámbito / condiciones |
| --- | --- | --- | --- | --- | --- |
| Iniciar/cerrar sesión y consultar identidad | Sí | Sí | Sí | Sí | Solo sesión propia; transporte cookie/CSRF propuesto. |
| Consultar indicadores/fichas/resultados publicados | Sí | Sí | Sí | Sí | Captura: indicadores vinculados a su dependencia; otros: global. |
| Consultar variables para captura | Sí | Sí | Sí | No | Captura recibe solo entradas asignadas a su dependencia; ficha textual no otorga acceso a insumos ajenos. |
| Consultar periodos y estado de calendario | Sí | Sí | Sí | Sí | Mismo alcance del indicador; no inventar exigibilidad. |
| Consultar expediente compartido | Propuesto | Sí | Sí | No | Captura: metadatos del ciclo, sus envíos y existencia general de pendientes; no nombres, valores ni PDF de otras dependencias. Administrador: supervisión de solo lectura. |
| Consultar valores/evidencias de envíos | Sí | Sí | Sí | No | Captura: solo dependencia del usuario e indicador autorizado, incluso al solicitar ID directo. Otros: global por revisión/supervisión. |
| Enviar captura completa | Sí | No | No | No | Variables propias, ciclo/periodo autorizados. Unidad por dependencia pendiente. |
| Responder y corregir un envío observado | Sí | No | No | No | Misma dependencia, ciclo abierto; nuevo envío completo. |
| Agregar observación | No | Sí | No | No | Envío efectivo del ciclo abierto. |
| Resolver observación y marcar revisada | No | Sí | No | No | Resolución explícita e historial; no es validación. |
| Validar expediente | No | Sí | No | No | Conjunto exacto de insumos revisados, sin observaciones abiertas. Validación conjunta propuesta. |
| Publicar resultado manualmente | No | No | No | No | Publicación automática como efecto de validación. |
| Reabrir resultado validado | No | No | Sí | No | Motivo, versión publicada vigente, sin otro ciclo abierto y configuración aplicable definida. |
| Editar/borrar valores enviados o auditoría | No | No | No | No | Corrección por nuevo envío; no CRUD de historia. |
| Consultar hilo de revisión | Sí | Sí | Sí | No | Captura: eventos de sus envíos y metadatos de validación/reapertura; sin comentarios de otras dependencias. |
| Consultar evaluación temática completa | Pendiente | Sí | Sí | Sí | No se concede a Captura una vista que revele indicadores ajenos; no se calcula un índice parcial silencioso. |
| Administrar cuentas/dependencias/configuración/asignaciones | No | No | Sí | No | Altas de Captura/Revisión/Consulta y dependencias implementadas con consulta del catálogo activo; otras operaciones administrativas diferidas. Edición metodológica con historia depende de P-08. |
| Consultar auditoría administrativa | No | No | Sí | No | Solo lectura y sin secretos; contrato diferido. |
| Generar reportes globales | No | Sí | Pendiente | Pendiente | Revisión confirmado; formatos y eventual permiso de Administrador por definir. Supervisión no implica permiso adicional automático. |
| Consultar/marcar avisos propios | Propuesto | Propuesto | Propuesto | Pendiente | Solo usuario destinatario. Bandeja interna no está aprobada como canal definitivo. |
| Importación o chat | No | No | No | No | Fuera de MVP. |

## Reglas de autorización por objeto

Implementación de lectura del 24/11/2026: `GET /api/v1/consulta/indicadores`
entrega fichas documentales activas/inactivas identificadas, globales para
Consulta/Revisión/Administrador y solo asignadas a la dependencia de Captura.
No acepta filtros de identidad, no devuelve entradas operativas ni archivos y
no concede acceso administrativo. El modal usa la ficha ya autorizada recibida.
No hay rutas de escritura ni resultados operativos en este contrato. [Detalle y
pruebas](consulta-indicadores.md). E02/O09 siguen en conciliación para documentos.

1. Comprobar sesión/cuenta activa y permiso de acción. Para función no permitida: 403.
2. Cargar el objeto ya restringido al ámbito del actor. Si no existe o queda fuera: 404 genérico. No revelar que pertenece a otra dependencia.
3. Para Captura, el vínculo vigente con el indicador habilita consultar su resultado. Para valores/envíos se exige además que captura.dependencia_id coincida con su dependencia actual. Un resultado agregado publicado no concede acceso a todos sus insumos.
4. El permiso de envío usa las asignaciones conservadas para el ciclo, no una sustitución silenciosa con las actuales. Si la reasignación deja ambigua la autorización, devolver CONFIGURACION_PENDIENTE; no conceder acceso adicional. La política histórica de reasignaciones necesita confirmación.
5. Filtrar listados, totales, eventos y adjuntos antes de serializar/paginar. No devolver configuracion_aplicada, antecedentes internos, hashes de contraseña, claves de almacenamiento ni datos ajenos. En eventos generales visibles para Captura se suprimen comentarios que no estén ligados a sus propios envíos.
6. El acceso a notificaciones exige usuario_id de la sesión, no solo rol. Un ID o PDF firmado conocido no sustituye esta comprobación.
7. Campos como autor, dependencia aportante, rol, estado, validación y resultado son asignados por servidor. Los esquemas de escritura rechazan propiedades extra.

## Compatibilidad y pendientes

Actualización técnica del 06/11/2026: el frontend usa `captura`, `revision`, `administrador` y `consulta`, con guards y navegación sin herencia de captura/revisión al administrador. `/seguimiento` se conserva como ruta del rol `revision` y Consulta es vista y también rol de lectura (DEC-038). La autorización de cada operación y objeto corresponde al backend. No se requiere una tabla genérica de roles/permisos para cuatro roles exclusivos.

Pendientes: asignaciones concretas del cliente, restricciones personales adicionales, reasignaciones e historia, visibilidad temática de Captura, reportes del administrador y canales de avisos. Las respuestas sintéticas de [api/openapi.yaml](api/openapi.yaml) no aprueban estos permisos.

## Cierre, gris y justificación — DEC-039

El cierre al terminar el periodo bloquea nuevos datos. Faltantes/incompletos quedan grises, sin convertirse en cero o desempeño rojo. Los envíos completos conservan revisión/validación posterior. Solo Administrador abre la recepción de justificación con motivo. Solo Captura adjunta el PDF de su dependencia, sin completar datos ni quitar el gris. Consulta observa el estado global, sin permiso automático de descargar PDF internos. No se conceden aprobación de justificación ni correcciones posteriores al cierre antes de definirlas. Véase [flujos de negocio](flujos-negocio.md).

La lectura global de Consulta no incluye expedientes, hilos, valores sin validar, auditoría, catálogos administrativos ni asignaciones internas. Ficha técnica y resultados publicados deben usar una proyección propia, sin variables_captura operativas. Los límites aplican también a solicitudes por ID directo.

## Comprobación de permisos e integración — punto 4, 23/11/2026

Suite reproducible: `siip-frontend/integration/permisos-flujo.mjs`.
Ejecutar `npm run test:integration` desde `siip-frontend`, con Node 22 y las
dependencias de frontend y backend instaladas. No lee `.env`, no conecta a una
base de datos, no aplica SQL ni crea cuentas reales.

Usa el cliente Axios, Pinia, los guards de Vue Router y Captura reales, conectados
mediante un adaptador de prueba a `buildApp`/Fastify, autenticación Argon2,
cookie/CSRF, guards, serialización y repositorio de bandeja reales. La sesión y
las cuentas son sintéticas/en memoria. PostgreSQL es un doble que comprueba el
filtro SQL por dependencia y devuelve filas de varias dependencias. El transporte
se inyecta en proceso; no sustituye una prueba de navegador, red, CORS o SQL real.

| Recorrido comprobado | Resultado esperado |
|---|---|
| Captura DGSM y Captura Obras con un indicador compartido | DGSM recibe N; Obras recibe D y otro indicador exclusivo. La respuesta y la vista no mezclan variables, indicadores exclusivos ni totales. |
| Captura sin asignaciones | Lista vacía y aviso propio, sin recurrir a ejemplos locales. |
| Calendario de la bandeja | Fecha local del servidor y límites del mes, sin habilitar envíos. |
| Revisión/Administrador/Consulta intentan API de Captura | 403 antes de consultar el repositorio. Administrador no hereda Captura. |
| URL directa de Captura, Seguimiento y configuración administrativa | Guards conservan sus roles exclusivos, incluidos metodología, activación, agrupaciones y familias. Seguimiento sigue siendo una vista previa. |
| Consultas de ocho recursos administrativos | Administrador recibe 200; los otros tres perfiles reciben 403 sin ejecutar sus consultas administrativas. |
| Alta de usuarios/indicadores y configuración de variables/metodología/activación por otros perfiles | 403 incluso con cookie y CSRF válidos, antes de validar o escribir el cuerpo. |
| Sustituir dependencia por query/cabecera o rol por cabecera/Pinia | El backend conserva la cuenta de la sesión; parámetros ajenos se rechazan y no se concede administración. |
| Sin cookie, cookie revocada al salir o cuenta/dependencia desactivada | 401, sin nuevas consultas de asignaciones. El cliente limpia identidad y bandeja y redirige al login al recibir 401. |

No se encontraron bypass en los recorridos comprobados. No fue necesario cambiar
permisos o código de producción. Se añadieron las pruebas de integración y su
comando, conservando independientes las pruebas habituales del frontend.
Resultado de esta comprobación: 111 pruebas de backend sin PostgreSQL, 70 pruebas
habituales de frontend y cuatro pruebas del recorrido integrado, todas aprobadas.

La comprobación no acredita toda la matriz funcional: Consulta/Estadísticas y
Seguimiento conservan sus datos de demostración. No existen todavía las API
operativas de envíos, revisión/validación, publicaciones y descargas privadas;
su autorización por indicador/periodo y asignaciones históricas sigue pendiente.
La integración contra PostgreSQL y la revisión visual escritorio/móvil tampoco
se ejecutaron en este paso. No se reutilizan autorizaciones antiguas de la BD.
