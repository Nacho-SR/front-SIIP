# Arquitectura tecnológica y entornos del SIIP Salamanca

**Versión:** 0.1 · **Fecha:** 27/10/2026 · **Estado:** stack indicado por el equipo y estrategia operativa propuesta para revisión. No autoriza contratación, creación de recursos, implementación ni migraciones.

## 1. Decisiones vigentes y alcance de esta actualización

| Tema | Estado | Definición |
|---|---|---|
| Frontend | Confirmado por el equipo, DEC-027 | Vue + TypeScript. El repositorio ya contiene Vue, Vite y Pinia; no se cambian dependencias. |
| Backend | Confirmado por el equipo, DEC-027 | Node.js + TypeScript. Sustituye Laravel de DEC-026; PHP/Composer dejan de ser requisitos del backend previsto. |
| Base de datos | Motor propuesto, DEC-028 | PostgreSQL. El borrador de 13 tablas sigue sin aprobación definitiva. |
| Desarrollo remoto | Propuesta del equipo, PROP-TEC-001 | Neon Free, utilizando PostgreSQL convencional y conservando la posibilidad de cambiar de proveedor para producción. No hay autorización para crear recursos. |
| Hosting definitivo | Pendiente | Elegir alojamiento de API, frontend, PostgreSQL y PDF con los criterios de la sección 8. Neon Free no queda elegido para producción. |
| Framework HTTP, acceso a datos y migraciones | Pendiente técnico | Node.js + TypeScript no selecciona automáticamente framework, ORM ni herramienta de migraciones. |

Se mantienen las decisiones funcionales DEC-001..025 y el [alcance del MVP](alcance-mvp.md): tres roles con restricciones por dependencia, revisión y validación separadas, publicación automática, disponibilidad del resultado publicado durante reapertura y corte mensual con periodicidades mixtas. No se resuelven unilateralmente calendario, cobertura, vigencias ni unidad multidependencia.

Este documento es la referencia tecnológica actual. Los Word del consultor y de acuerdos v0.2 se conservan como antecedentes; no se editan ni se consideran arquitectura ejecutable. El [modelo PostgreSQL](modelo-datos-mvp-borrador.md) y [OpenAPI](api/openapi.yaml) siguen siendo borradores.

## 2. Estructura mínima propuesta

**Dirección de almacenamiento — 30/10/2026, DEC-034:** preparar evidencias para Supabase Storage. Se recomienda bucket privado, autorización por la API SIIP y objetos nuevos por versión en lugar de sobrescritura. Límites de PDF, retención, permisos finales y modalidad de descarga siguen pendientes. No se crea ningún recurso ni se adopta Supabase Auth; la sesión propia de DEC-029 se mantiene. El uso del PostgreSQL de Supabase en lugar de la propuesta Neon es una decisión adicional por concretar.

**Actualización de implementación — 30/10/2026, DEC-029:** el equipo autorizó y ya dispone de una base Node.js 22 + TypeScript + Fastify 5 en `siip-backend`. Están instalados `pg`, Drizzle ORM y Drizzle Kit. DEC-035 incorpora código de autenticación Argon2id, cookie/CSRF y adaptador PostgreSQL con compare-and-set. El SQL mínimo está propuesto para revisión, sin ejecutarlo; aún no hay BD y las pruebas usan dobles sintéticos. El resto del modelo continúa pendiente de aprobación. El arranque valida el entorno y registra Helmet, CORS y un límite inicial de 100 solicitudes por IP por minuto, en memoria por proceso. `GET /api/v1/salud` comprueba únicamente respuesta HTTP. No se conecta PostgreSQL, crean tablas ni ejecutan migraciones. El [README del backend](../siip-backend/README.md) describe los comandos y límites actuales. Las referencias siguientes al estado del 27/10 se conservan como antecedente; DEC-029 actualiza las selecciones técnicas pendientes de esa fecha.

Un frontend Vue consume una API REST Node.js escrita en TypeScript. La API concentra autenticación, permisos por objeto/dependencia, transacciones, validación y cálculos delimitados. Solo la API accede a PostgreSQL durante la operación; las tareas técnicas autorizadas usan credenciales separadas. El navegador nunca recibe credenciales de BD.

Una sola aplicación backend con módulos de negocio y una instancia inicial es suficiente como propuesta para el MVP. No se añaden microservicios, Redis, colas ni motor genérico de fórmulas. Las evidencias PDF conservan la propuesta de almacenamiento externo privado; proveedor, descarga y retención siguen pendientes. Ningún servicio adicional de Neon se adopta por elegir su PostgreSQL.

Para staging/producción se recomienda un mismo origen HTTPS para frontend y `/api/v1`, mediante el alojamiento o un proxy sencillo. Reduce configuración de cookies/orígenes, pero no elimina CSRF ni autorización. DEC-029/035 eligen sesión revocable con cookie/CSRF y preparan un almacén PostgreSQL para Fastify; falta aplicar/aprobar el SQL y probarlo con una BD real. No existe fallback a memoria de proceso en la aplicación; ese almacén se usa exclusivamente como doble de prueba. Una tabla técnica de sesiones, si resulta necesaria, se justificará aparte de las 13 entidades de negocio.

Situación real del repositorio al 27/10/2026:

- `siip-frontend` contiene la aplicación Vue/TypeScript. El workflow actual despliega solo ese frontend en GitHub Pages; no representa un staging integral ni aloja la API.
- `siip-backend` contiene archivos iniciales vacíos de estructura PHP y no una aplicación Node.js inicializada. No se renombran ni eliminan en esta entrega.
- La versión de Node.js/TypeScript del backend se elegirá al inicializarlo, comprobando compatibilidad con frontend, dependencias y CI. Se propone una versión de Node con soporte vigente, fijada en el proyecto; el workflow actual declara Node 20 y debe revisarse antes de reutilizarlo para el nuevo backend.

## 3. Entornos y aislamiento propuestos — PROP-TEC-002

Son tres entornos. El desarrollo remoto es una modalidad de desarrollo compartido, adicional a la base local de cada desarrollador, no un cuarto nivel de despliegue.

| Entorno / modalidad | Ejecución de aplicaciones | Base propuesta | Datos y acceso |
|---|---|---|---|
| Desarrollo local | Vue y API en la computadora del desarrollador | PostgreSQL local, `siip_local`, una copia independiente por desarrollador | Datos sintéticos; credenciales locales. PostgreSQL ligado a localhost. Instalación nativa o contenedor, sin exigir ambos. |
| Desarrollo compartido remoto | API local conectada por TLS; frontend consume esa API | `siip_desarrollo` en un proyecto Neon Free propuesto | Datos sintéticos. Integración del equipo, sin ejecutar cambios de esquema simultáneos ni pruebas destructivas. |
| Staging | Vue y API desplegados para pruebas previas | `siip_staging`, distinta de todas las bases de desarrollo y producción | Datos sintéticos o anonimizados; acceso del equipo y personas autorizadas para aceptación. Nunca credenciales de producción. |
| Producción | Aplicación destinada a usuarios reales | `siip_produccion`, en proveedor pendiente | Datos oficiales y acceso operativo. Credenciales, respaldos y almacenamiento PDF independientes. |

Separar bases, usuarios de BD, secretos, cookies y ubicaciones de PDF por entorno. Dos esquemas dentro de una misma base no satisfacen esta separación. Desarrollo y staging podrían compartir infraestructura si el proveedor permite bases y permisos independientes; producción debería usar proyecto/instancia separada para limitar errores y fallos compartidos. Es recomendación, no contratación aprobada.

No clonar producción hacia Neon Free o laptops con datos personales/evidencias reales. La anonimización y autorización deben definirse antes de cualquier copia. Las ramas de Neon son opcionales y no forman parte del flujo requerido; no sustituyen el aislamiento ni los respaldos.

Se propone fijar la misma versión mayor soportada de PostgreSQL en los entornos, cuando se elija el servicio. No se establece una versión a partir del nombre del proveedor. Mantener nombres de base en configuración, nunca en SQL de negocio. El frontend debe identificar claramente staging/desarrollo para evitar capturas accidentales en producción.

## 4. Conexión y credenciales — PROP-TEC-003

Convención documental para el futuro backend; no son archivos de configuración implementados:

| Variable | Uso y exposición |
|---|---|
| `APP_ENV` | `local`, `development`, `staging` o `production`. Complementa `NODE_ENV`; no basta para autorizar operaciones sobre una BD. |
| `DATABASE_URL` | Conexión del usuario de ejecución de la API; secreta y distinta en cada entorno. |
| `MIGRATION_DATABASE_URL` | Conexión directa con usuario de migraciones. Solo disponible para la tarea de despliegue autorizada, nunca para el proceso web. |
| `PGSSLROOTCERT` | Ruta de CA para herramientas libpq cuando el proveedor lo requiera. No asumir que el driver Node lee esta variable automáticamente. |
| `VITE_API_BASE_URL` | Dirección pública de la API, no un secreto. Nunca incluir una cadena PostgreSQL en variables `VITE_*`. |

Propuesta de acceso a datos: usar un driver PostgreSQL convencional, como `pg`, con consultas parametrizadas y un pool pequeño por proceso. Es una recomendación, no una dependencia instalada. Empezar con un máximo de cinco conexiones por proceso como valor por comprobar frente al cupo del proveedor; sumar todas las instancias y herramientas. Migraciones y respaldos usan conexión directa; un endpoint agrupado del proveedor para ejecución es opcional y exige comprobar compatibilidad transaccional. Neon documenta diferencias entre conexiones [agrupadas y directas](https://neon.com/docs/connect/connection-pooling).

Toda conexión remota requiere TLS con validación de certificado y nombre del servidor. La forma exacta depende del driver; no desactivar validación con `rejectUnauthorized: false`. Si se elige `pg`, evitar mezclar opciones SSL de la URL y un objeto `ssl` que puedan sobrescribirse; comprobar la configuración con la [documentación del driver](https://node-postgres.com/features/ssl). Usar conexión sin TLS solo para PostgreSQL local ligado a localhost. No publicar una BD local en Internet.

- En local, `.env` privado fuera de Git; `.env.example` futuro con nombres y valores ficticios. Antes de crear secretos, añadir/verificar exclusiones de `.env`, dumps y certificados privados; actualmente no hay `.gitignore` raíz que cubra el backend. No se modifica en esta entrega.
- En staging/producción, usar el almacén de secretos o variables protegidas del hosting/CI. Nunca cadenas completas en código, chat, logs, artefactos frontend o comandos guardados en historial.
- Usuario de ejecución: solo operaciones necesarias sobre tablas/secuencias; sin permisos de crear/eliminar esquema, administrar roles o superusuario. Las cuentas de Captura/Revisión/Administrador son roles de aplicación, no credenciales PostgreSQL para cada persona.
- Usuario de migraciones separado y limitado a la base/esquema del entorno. Cuenta de respaldo con permisos suficientes para todos los datos del alcance; no reutilizar el usuario privilegiado del proveedor como credencial diaria de la API.
- Credenciales distintas por entorno; cuentas personales para la consola del proveedor y MFA si está disponible. Compartir secretos mediante un gestor seguro y revocar/rotar ante exposición, salida de integrantes o cambio de proveedor.
- Permitir conectividad solo desde los hosts técnicos necesarios cuando el plan soporte restricciones de red. Verificar esa capacidad antes de contratar; no asumir que Neon Free incluye listas de IP o red privada.

El contrato ya representa `bigint` y `numeric` como cadenas JSON. Mantener esa precisión al integrar Node.js: no convertir indiscriminadamente a `Number`; elegir aritmética decimal exacta para cálculos y conservar reglas de redondeo por indicador. Es un requisito de integración, no un cambio del esquema.

## 5. Migraciones y promoción — PROP-TEC-004

No generar ni ejecutar migraciones hasta aprobar el esquema definitivo y solicitar su implementación. El cambio de stack no aprueba las 13 tablas ni sus propuestas complementarias.

Después de esa aprobación, se propone:

1. Elegir una sola herramienta de migraciones compatible con PostgreSQL y Node.js. Debe poder expresar SQL explícito para ENUM, FK compuestas e índices parciales, sin sustituirlos silenciosamente por restricciones más débiles.
2. Versionar los cambios en Git con orden y registro de aplicación. Una migración ya aplicada en entornos compartidos no se reescribe; se añade otra. No usar sincronización automática del ORM ni recreación de esquema fuera de bases locales desechables.
3. Ejecutar primero en base local vacía y con datos sintéticos representativos; revisar constraints, transacciones y concurrencia. Designar al backend para coordinar cambios en desarrollo compartido.
4. Aplicar exactamente los mismos archivos en staging, registrar revisión Git y versión de esquema, y comprobar el recorrido de API, permisos, precisión y publicación/reapertura.
5. Antes de producción, revisar respaldo recuperable, impacto de bloqueos y compatibilidad del despliegue. Aplicación manual autorizada o tarea protegida de CI, con un solo ejecutor, usando conexión directa y credenciales temporales/restringidas. Nunca ejecutar migraciones automáticamente al iniciar cada instancia web.
6. Preferir cambios compatibles y correcciones hacia adelante. Una migración inversa destructiva no es un plan de recuperación: ante fallo, detener escrituras y seguir un procedimiento de restauración probado, evaluando datos escritos después del respaldo.

Los datos sintéticos de desarrollo se mantienen separados de los catálogos oficiales revisados. Las transferencias técnicas de una BD entre proveedores no crean una función de importación de negocio; DEC-023 permanece intacta.

## 6. Respaldos y recuperación — PROP-TEC-005

La siguiente política es una propuesta operativa para revisar, no un SLA ni compromiso aprobado con el cliente. RPO es la pérdida máxima de datos aceptable; RTO es el tiempo objetivo para recuperar el servicio.

| Entorno | Propuesta inicial | Recuperación y limitación |
|---|---|---|
| Local | Reconstrucción con migraciones aprobadas y datos sintéticos versionados; copia antes de cambios que interese conservar | No almacenar información única del cliente solo en la laptop. |
| Desarrollo remoto | Exportación lógica diaria durante trabajo activo y antes de cambios de esquema; conservar siete copias diarias cifradas fuera del proveedor | Restaurar una copia al establecer el procedimiento y tras cambiar de versión/herramienta; no asumir recuperación ilimitada del plan gratuito. |
| Staging | Exportación antes de despliegues y diaria si contiene trabajo de aceptación que deba preservarse; siete copias diarias propuestas | Ensayar restauración antes de la primera salida a producción. |
| Producción | Respaldos automáticos administrados con recuperación a un punto en el tiempo (PITR), más exportación lógica diaria independiente; retención inicial propuesta de 30 días | Objetivos para acordar: RPO <= 1 hora y RTO <= 4 horas. Validar viabilidad/costo; no declararlos garantizados. Ensayo de restauración al menos trimestral y antes de cambios mayores. |

Usar `pg_dump` en formato custom y `pg_restore` para exportaciones lógicas portables; conexión directa, salida a archivo protegido y fallos visibles. Un dump de base no incluye roles globales ni PDF: documentar grants/roles sin contraseñas y respaldar los objetos por separado. Los respaldos lógicos complementan la recuperación administrada; no sustituyen PITR cuando se requiere recuperar cambios recientes. Véanse [respaldo lógico](https://www.postgresql.org/docs/current/backup-dump.html) y [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).

Mantener al menos una copia cifrada fuera del proveedor principal, con acceso restringido y claves recuperables por una persona autorizada de respaldo. El backend coordina ejecución/verificación y el otro integrante verifica el procedimiento y puede recuperarlo; comprobar éxito, fecha y alertas de fallo. La retención de backups no define la retención legal de evidencias/auditoría, que sigue pendiente.

Una restauración se ensaya en una base aislada. Verificar esquema, conteos, última versión validada, auditoría, hashes y referencias PDF; medir tiempo real, registrar resultado y solo después considerar cumplido el objetivo. Coordinar el punto de recuperación de BD y archivos para no dejar evidencia referenciada pero perdida. Nunca probar restauración sobrescribiendo producción.

Neon Free se propone para desarrollo por su costo inicial, no como política de continuidad. Sus cupos, suspensión por inactividad y ventana de restauración dependen del plan; comprobarlos al provisionar. La [tarifa oficial consultada el 27/10/2026](https://neon.com/pricing) ofrece Free sin tarjeta y muestra límites de recursos/recuperación. No se asumen disponibilidad garantizada ni respaldos suficientes para producción.

## 7. Revisión de portabilidad del borrador PostgreSQL

**Resultado documental:** no se encontraron dependencias exclusivas de Neon en las 13 tablas propuestas. No se modificó el modelo ni se ejecutó DDL. Portabilidad significa entre proveedores PostgreSQL compatibles; no se promete migrar sin cambios a MySQL u otros motores.

| Elemento revisado | Evaluación | Condición para conservar portabilidad |
|---|---|---|
| `bigint ... AS IDENTITY`, `numeric(24,8)`, texto, booleanos, `date`, `timestamptz` | Tipos/generación nativos de PostgreSQL | Mantener versión compatible y precisión; registrar zona de sesión/presentación sin resolver unilateralmente el calendario de negocio. |
| ENUM propuestos, `jsonb`, `now()` | Funciones nativas, sin servicio exclusivo | Llevar definiciones y cambios en migraciones propias. Validar estructura de snapshots en backend. |
| PK, FK simples/compuestas, CHECK, UNIQUE, borrado restringido | Restricciones nativas | No depender de superusuario ni omitir restricciones porque la herramienta no las soporte. |
| Índices únicos parciales y de expresión `lower(trim(correo))` | Funciones nativas | Preservar predicados, collation y normalización al restaurar; no necesitan `citext`. |
| Transacciones y bloqueo de filas | Mecanismos de PostgreSQL | Todas las consultas de una operación usan la misma conexión/transacción; no depender de estado de sesión persistente al usar pool transaccional. |
| Extensión futura de referencias con vigencia | Fuera de las 13 tablas; aún condicional | Rangos/exclusión son PostgreSQL nativo; combinar igualdad por variable en GiST puede requerir `btree_gist`, extensión no exclusiva pero a verificar. La alternativa serializada ya prevista evita imponerla ahora. |
| Clave y metadatos de evidencia | No vinculan el esquema a una API de almacenamiento | No guardar como referencia única una URL temporal ni acoplar reglas de negocio a un servicio de Neon. Proveedor de PDF sigue pendiente. |
| Sesiones y notificaciones | Ninguna exige Neon Auth, Realtime, Functions o branching | Mantener autenticación en la API; las notificaciones de negocio no requieren `LISTEN/NOTIFY` ni un servicio propietario. |

Se contrastó el borrador con la documentación oficial de [tipos](https://www.postgresql.org/docs/current/datatype.html), [identity](https://www.postgresql.org/docs/current/ddl-identity-columns.html), [restricciones](https://www.postgresql.org/docs/current/ddl-constraints.html), [índices parciales](https://www.postgresql.org/docs/current/indexes-partial.html) y [rangos](https://www.postgresql.org/docs/current/rangetypes.html). No requiere extensiones obligatorias en su núcleo actual. Falta comprobarlo mediante migración y restauración reales después de aprobar el esquema.

Ruta de salida propuesta al cambiar de proveedor:

1. Elegir destino PostgreSQL de versión mayor igual o compatible superior, revisar extensiones, collation/locale, permisos y conectividad. Preferir utilidades de dump/restore de la misma versión mayor del origen; no asumir restauración hacia versiones anteriores.
2. Ensayar exportación lógica y restauración en destino aislado, reasignando propietarios/grants a roles locales. No copiar roles internos del proveedor ni depender de permisos de superusuario. Validar constraints, secuencias identity, datos, precisión y recorrido funcional.
3. Para el MVP, proponer ventana de mantenimiento con escrituras detenidas, exportación final, restauración y comprobación. Duración por medir; no prometer migración sin interrupción ni añadir replicación por anticipación.
4. Cambiar secretos/configuración de la API y probar acceso autorizado. Conservar el origen protegido para reversión antes de reanudar escrituras; si ya hubo escrituras en destino, volver al origen exige reconciliación, no solo cambiar una URL. Revocar credenciales antiguas al cerrar la transición.

## 8. Criterios para el hosting definitivo — PROP-TEC-006

Evaluar API, PostgreSQL y archivos juntos, aunque se contraten por separado. Antes de decidir, comparar al menos dos alternativas usando cotización/condiciones vigentes y una prueba pequeña autorizada.

| Criterio | Qué registrar y comprobar |
|---|---|
| Costo | Total mensual de API, BD, almacenamiento PDF, backups, transferencias, logs, dominio y soporte; impuestos, moneda, renovación, límites/alertas y costo de crecer. Comparar costo operativo de administrar un VPS frente a servicio administrado. |
| Disponibilidad | SLA contractual, mantenimiento, suspensión por inactividad/cupos, reinicio de API, límites de conexiones, historial de incidentes y soporte. Distinguir redundancia real de una simple copia de respaldo. |
| Respaldos | Automatización, PITR, frecuencia, retención, cifrado, exportación independiente, costo y restauración probada. Debe permitir alcanzar el RPO acordado, no solo anunciar que tiene backups. |
| Seguridad | TLS comprobable, secretos protegidos, MFA/roles de consola, mínimo privilegio, aislamiento de entornos, restricciones de red y trazabilidad de accesos. Confirmar qué incluye el plan concreto. |
| Ubicación geográfica | Región real de API, BD y copias; latencia medida desde Salamanca y entre API/BD, residencia/transferencias de datos y requisitos que confirme el cliente. No asumir obligación ni región mexicana sin confirmación. |
| Recuperación ante fallos | Responsables, contactos, tiempo y procedimiento de restauración/reemplazo, disponibilidad regional, prueba de RTO y acceso a respaldos si cae o se suspende la cuenta principal. |
| Compatibilidad y salida | Node.js soportado con proceso persistente, HTTPS, límites de PDF/tiempos, tareas programadas para avisos, conectividad PostgreSQL, versión compatible y exportación completa sin SDK obligatorio. |

**Hostinger actual:** el equipo informó Web Premium y ningún VPS. La [documentación vigente sobre Node.js](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/) ofrece aplicaciones Node.js en Business/Cloud o VPS; Premium no figura como opción para la API propuesta. Su [documentación de bases](https://www.hostinger.com/support/which-databases-and-data-tools-are-supported-at-hostinger/) indica que PostgreSQL no se aloja en Web/Cloud. No se presupone una ampliación del plan ni que un hosting de frontend también aloje el backend.

No escoger producción solo por costo cero. Propuesta: priorizar una API y PostgreSQL administrados si el presupuesto cubre requisitos, para reducir trabajo operativo del equipo junior; un VPS sigue siendo alternativa si se asigna quién actualizará, vigilará y recuperará el servidor. Proveedor, presupuesto, SLA, región y objetivos RPO/RTO requieren revisión antes de contratar.

## 9. Trazabilidad y próximos pasos autorizables

- DEC-027 sustituye DEC-026; DEC-028 aclara PostgreSQL como motor propuesto. PROP-TEC-001..006 documentan las propuestas de este archivo en [decisiones](decisiones-siip.md).
- Se actualizan contexto y pendientes, además de referencias técnicas obsoletas en flujos/impacto de API. No se cambia OpenAPI, permisos, alcance funcional ni el borrador de tablas.
- Antes de implementar: aprobar esquema/ajustes API, elegir framework/driver/herramienta de migración y almacén de sesión, fijar versiones y coordinar inicialización del backend Node.js. La infraestructura puede revisarse en paralelo sin inventar datos o reglas del cliente.
- Antes de provisionar: autorizar expresamente el recurso/plan, definir accesos, región y datos permitidos. Antes de producción: aprobar presupuesto, RPO/RTO, retención y prueba de recuperación.

Esta entrega es documental: no instala dependencias, crea servicios/bases remotas, genera migraciones ni modifica código o secretos.
