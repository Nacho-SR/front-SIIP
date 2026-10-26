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
- Los roles son **Captura**, **Revisión** y **Administrador**; un usuario tiene un solo rol. El rol Revisión realiza las acciones de revisar y validar; son acciones distintas, no un cuarto rol.
- La fórmula textual se conserva para la ficha técnica; la implementación del cálculo puede limitarse a los tipos reales soportados por los 63 indicadores.
- Las reglas de semaforización individual pueden cambiar; su vigencia/reproceso histórico **sigue pendiente**.
- La evaluación temática usa **cortes mensuales con periodicidades mixtas**, decisión DEC-013.
- No hay borradores de captura. No existen fechas límite que bloqueen captura/validación.
- Solo se publican resultados validados; reaperturas administrativas mantienen visible la última versión validada hasta sustituirla por otra validada.
- Deben existir reportes y notificaciones; sus detalles aún se definen. No habrá importación ni chat (ajuste de alcance confirmado por el equipo el 22/10/2026).

## Forma de colaborar
- Para análisis del esquema, primero produce diagnóstico y alternativas mínimas con pros/contras; **no modifiques código ni esquemas** hasta que la persona usuaria lo solicite explícitamente.
- Prioriza las tablas realmente necesarias para operación, relaciones, auditoría, versiones de resultados y restricciones de integridad; justifica cada tabla nueva.
- Si un cambio modifica requisitos o reglas, actualiza la documentación después de recibir aprobación.
- Nunca inventes respuestas del cliente ni presentes el documento del consultor como especificación definitiva.
- No ejecutes migraciones destructivas, no hagas deploy, no envíes cambios al remoto y no modifiques datos productivos sin autorización.
- Mantén secretos, contraseñas, tokens y archivos `.env` fuera del control de versiones.
