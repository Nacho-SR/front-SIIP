# Reglas de trabajo — SIIP Salamanca

Este repositorio corresponde al **Sistema Integrado de Indicadores de Planeación (SIIP), Salamanca, Guanajuato**.

## Antes de actuar
- Cuando la tarea sea el modelo de datos, lee `documentacion/contexto-siip.md`, `documentacion/decisiones-siip.md` y `documentacion/pendientes-siip.md`; consulta los documentos originales del cliente y el ERD del repositorio.
- Inspecciona primero la estructura real del repositorio; no supongas tecnologías, rutas ni tablas que no existan.
- Distingue en cada propuesta: **confirmado por el equipo**, **pendiente de cliente**, **recomendación técnica**, **fuera de MVP**. Una propuesta no equivale a una aprobación del cliente.
- No cambies decisiones confirmadas sin explicitar su impacto y obtener aprobación.

## Alcance y criterios
- MVP inicial: 63 indicadores, 8 agrupaciones temáticas, familias y PostgreSQL. Captura territorial **solo municipal**.
- Equipo: una persona de backend y una de frontend, nivel junior. Privilegia arquitectura y tablas mínimas, relaciones/constraints claras, migraciones comprensibles y código mantenible.
- Evita microservicios, event sourcing, CQRS, abstracciones innecesarias y motores de fórmulas arbitrarias salvo necesidad demostrada y aprobación.
- DEC-038 (06/11/2026): los roles exclusivos son **Captura**, **Revisión**, **Administrador** y **Consulta**; un usuario tiene un solo rol. Consulta permite varias cuentas sin dependencia para lectura global de fichas, resultados publicados y estadísticas. No concede captura, revisión, validación, administración ni acceso automático a expedientes/PDF internos. Revisar y validar siguen como acciones de Revisión.
- DEC-037 (04/11/2026): Captura y Revisión requieren una dependencia activa. La pertenencia de Revisión no restringe su consulta global ni concede captura; Administrador no hereda sus acciones. Las altas desde UI/API solo las realiza Administrador. SQL 003 preparado, no aplicado automáticamente; no inventar dependencia para cuentas existentes.
- La fórmula textual se conserva para la ficha técnica; la implementación del cálculo puede limitarse a los tipos reales soportados por los 63 indicadores.
- DEC-030/031: cambios de regla no recalculan publicaciones; una captura en revisión conserva su regla y atrasos/reaperturas usan la del periodo. No usar la regla actual como sustituto de una versión histórica faltante. Precisar la vigencia de cambios a mitad de periodo.
- DEC-032: envío por dependencia y validación conjunta; en reapertura solo se reenvía la aportación necesaria. La consolidación de una misma variable entre dependencias sigue sin aprobarse; renombrar entradas no resuelve solapamientos.
- DEC-033: periodos calendario naturales (mensual, trimestral, semestral y anual), captura desde alta con asignación, validación/publicación solo al cierre o después y zona America/Mexico_City. Alta trimestral el 10 de febrero: primer corte el 31 de marzo. No se añade bimestral. Cobertura de datos del primer periodo parcial y periodos previos siguen por definir.
- DEC-040 y DEC-041 (06/11/2026): frontend compilado, API Node.js y PostgreSQL en el mismo Hostinger VPS **KVM 1**; archivos/evidencias/justificaciones PDF en **Cloudflare R2**. Sustituye la propuesta de Neon y la dirección Supabase Storage de DEC-034. El usuario escribió «mvk1»; el nombre comercial comprobado es KVM 1. Costos y fuentes vigentes en Documentacion/infraestructura-hostinger-r2.md. Selección confirmada, sin contratación/despliegue acreditados. No crear recursos, aplicar SQL ni desplegar por este acuerdo documental.
- DEC-035: hay esqueleto modular y código de autenticación con SQL mínimo propuesto. Al 04/11/2026 el equipo tiene una BD vacía; DEC-036 añade script de administrador inicial y altas de Captura/Revisión/dependencias con auditoría. La conexión y aplicación explícita del SQL siguen pendientes; no se ejecuta SQL automáticamente. No afirmar pruebas de PostgreSQL real; no ejecutar el SQL ni migraciones sin nueva autorización.
- La evaluación temática usa **cortes mensuales con periodicidades mixtas**, decisión DEC-013.
- DEC-039 (06/11/2026, acuerdo con el director comunicado por el usuario) sustituye la captura tardía sin bloqueo de DEC-009/017: cierre al fin del periodo natural en America/Mexico_City, último día incluido. Faltantes/incompletos quedan en gris; envíos completos conservan revisión y pueden validarse después. Administrador reabre solo para adjuntar justificación PDF, sin completar datos ni quitar el gris. No hay borradores ni gris equivalente a rojo/cero. Distinguir de corregir publicaciones validadas (DEC-012/016). Correcciones de observaciones después del cierre requieren precisión del cliente.
- Consulta está implementado en auth/altas/UI. SQL 004 se aplicó con autorización expresa el 09/11/2026 únicamente en la base local `SIIP` de `localhost:5432`; se verificaron los cuatro valores de `rol_usuario`, sin modificar cuentas. No asumirlo aplicado en otros entornos. Cierre automático y justificación PDF son requisitos confirmados pero el módulo operativo aún no existe. No afirmar su funcionamiento ni ejecutar SQL sin autorización de la base concreta.
- Solo se publican resultados validados; reaperturas administrativas mantienen visible la última versión validada hasta sustituirla por otra validada.
- Deben existir reportes y notificaciones; sus detalles aún se definen. No habrá importación ni chat (ajuste de alcance confirmado por el equipo el 22/10/2026).

## Forma de colaborar
- Para análisis del esquema, primero produce diagnóstico y alternativas mínimas con pros/contras; **no modifiques código ni esquemas** hasta que la persona usuaria lo solicite explícitamente.
- Prioriza las tablas realmente necesarias para operación, relaciones, auditoría, versiones de resultados y restricciones de integridad; justifica cada tabla nueva.
- Si un cambio modifica requisitos o reglas, actualiza la documentación después de recibir aprobación.
- Nunca inventes respuestas del cliente ni presentes el documento del consultor como especificación definitiva.
- No ejecutes migraciones destructivas, no hagas deploy, no envíes cambios al remoto y no modifiques datos productivos sin autorización.
- Mantén secretos, contraseñas, tokens y archivos `.env` fuera del control de versiones.

## Integración visual en develop — 09/11/2026

- En `develop`, Captura y Seguimiento son vistas previas sin escrituras (paso 4, 09/11/2026). No reactivar el guardado local como sustituto de la API de negocio: faltan asignaciones, calendario del servidor, metodología conciliada, versiones inmutables y autorización por objeto. Las fichas adicionales de Administrador son demostrativas; no activan indicadores. Auth y altas de usuarios/dependencias sí conservan su integración con el backend.
- No inferir incumplimiento gris sin exigibilidad y estado de cierre confirmados. La falta de publicación y el envío completo aún en revisión se muestran por separado.
