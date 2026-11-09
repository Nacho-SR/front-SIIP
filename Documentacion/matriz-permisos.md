# Matriz de permisos del SIIP

Versión 0.2 · 06/11/2026 · Incorpora DEC-038/039; detalles pendientes explícitos.

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
