# Panel de preparación de indicadores

**Fecha:** 24/11/2026. **Estado:** punto 2 solicitado por el usuario. Amplía la pantalla de activación existente para consultar preparación técnica; no añade reglas metodológicas ni aprueba fichas del cuestionario.

## Acceso desde Administración

En Administración → Indicadores, cada fila activa o inactiva ofrece **Ver preparación** debajo de su estado. Conserva las acciones de variables, edición y activación/desactivación; no añade otra columna ni una consulta de requisitos por cada fila del catálogo.

El enlace abre la ruta existente `/administrador/indicadores/:id/activacion`, titulada **Preparación y activación del indicador**. Desde ahí se puede consultar la ficha documental, ir a Variables y dependencias o a Cálculo y semáforo. No se crea una vista paralela ni otro menú administrativo.

## Información que reúne

| Apartado | Información presentada | Límite |
|---|---|---|
| Variables para captura | Cantidad registrada y detalle desplegable de código, descripción, unidad y tipo de dato. | El texto de variables de la ficha no crea entradas operativas. Las fijas/referencias pendientes no se declaran implementadas. |
| Dependencias responsables | Cantidad con responsable activo, sin asignar y con responsable inactivo/no disponible; nombre y estado por variable. | Describe las asignaciones actuales; no las modifica ni infiere responsables del texto de la ficha. |
| Metodología guardada | Versión preparada o ausencia de configuración. | Guardada no significa compatible ni autorizada: los requisitos del servidor indican discrepancias de ficha, responsables, clasificación y contexto. |
| Inicio de operación | En inactivos: por elegir al activar y primer inicio permitido por servidor. En activos: inicio y versión metodológica del único registro abierto de activación. | No usa la última versión guardada como sustituta de la aplicada ni asigna una fecha de inicio por defecto. El historial de desactivaciones se conserva. |

La preparación distingue **Preparación incompleta**, **Puede elegir el periodo inicial**, **Activación registrada** y **Activación por revisar**. El último caso aparece si un indicador figura activo y no se identifica exactamente una activación abierta; no se elige silenciosamente una entre varias ni se presenta el mínimo permitido como inicio registrado.

El panel muestra los pendientes textuales que devuelve el backend para un indicador inactivo. No los interpreta por coincidencias de palabras ni reproduce sus reglas de compatibilidad en el frontend. La autorización para activar sigue siendo `puedeActivar` del contrato existente, junto con carga completa, sesión Administrador, fecha elegida y confirmación. Un estado técnico favorable no sustituye la autorización metodológica de IMPLAN.

## Lecturas y protección del flujo

Al abrir o actualizar un indicador se consultan en paralelo tres recursos existentes:

- `GET /api/v1/administracion/indicadores/:id` para su ficha.
- `GET /api/v1/administracion/indicadores/:id/activacion` para requisitos, mínimo de inicio e historial.
- `GET /api/v1/administracion/indicadores/:id/variables` para definiciones y responsables actuales.

Todos siguen protegidos exclusivamente para Administrador. El panel no lee el catálogo de usuarios/dependencias completo ni recorre todos los indicadores. No crea endpoints, tablas, migraciones, dependencias de paquetes o solicitudes de escritura por abrir la pantalla.

Una recarga limpia el resumen anterior, la selección de fecha y la confirmación; si falla cualquiera de las lecturas, no se muestra un panel parcialmente comprobado ni se permite activar. Se comprueban los IDs y el estado activo entre las respuestas; cambios de indicador/cuenta o respuestas atrasadas no repueblan otra vista. La petición de ficha usa el cliente existente; las otras dos lecturas pueden cancelarse. Tras salir se invalidan las respuestas pendientes.

La lectura paralela no es una transacción de BD ni promete una instantánea indivisible. Los valores describen lo leído al comprobar; el servidor vuelve a validar configuración, responsables y fecha dentro de la activación existente. La confirmación conserva el POST y la auditoría anteriores. Un conflicto de activación conserva la fecha y exige nueva confirmación; una recarga descarta esa selección.

La tabla de variables tiene desplazamiento horizontal propio y acceso por teclado. El resumen pasa a una columna en pantallas estrechas, sin colocar los controles fuera de su contenedor. La comprobación visual en navegador sigue pendiente; estos ajustes y el HTML renderizado se han comprobado por compilación y pruebas automatizadas.

## Comprobación y alcance pendiente

- `test/auth.test.mjs`: conserva las pruebas de confirmación/POST/conflicto/permisos de activación y añade casos de preparación sin variables, asignaciones activas/faltantes/inactivas, metadatos históricos, carga parcial, respuestas de otra ficha, navegación/cambio de cuenta y acceso desde el catálogo sin consultas en lote.
- `integration/permisos-flujo.mjs`: añade un recorrido de Administrador con cliente/router/API/Fastify, tres GET protegidos y repositorios sintéticos. Una preparación incompleta no dispara activación. Los recorridos anteriores de los cuatro roles conservan su cobertura.
- Verificación de esta tarea: 80 pruebas de frontend y 11 de integración frontend–API aprobadas; compilación de frontend aprobada. El backend y su esquema no se modificaron; no se repite una integración de PostgreSQL real por este cambio de presentación. Se conserva la advertencia de bundle superior a 500 kB, sin bloquear la compilación.

No se consultó ni modificó una BD real, no se activó ningún indicador y no se sincronizaron los anexos. Siguen pendientes la revisión visual de escritorio/móvil y las decisiones de [conciliación del cuestionario](conciliacion-respuestas-cuestionario.md), especialmente reglas compatibles, campos bloqueados, metas, referencias y acumulación. La mera presencia de variables o metodología no acredita aprobación ni operación de captura/publicación.
