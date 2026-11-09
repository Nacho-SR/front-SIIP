# Backend SIIP

Node.js 22, TypeScript y Fastify 5. Ejecuta los comandos desde `siip-backend`.

```powershell
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Si ya existe `.env`, consérvalo. No lo subas a Git.

La configuración valida `NODE_ENV`, `HOST`, `PORT`, `FRONTEND_ORIGIN`,
`DATABASE_URL` y `SESSION_SECRET`.
El origen debe ser HTTP(S) sin ruta ni barra final, por ejemplo `http://localhost:5173`.
Las variables del proceso tienen prioridad sobre `.env`.

`GET http://127.0.0.1:3000/api/v1/salud` devuelve `{"estado":"ok"}`.
La ruta solo comprueba que la API responde; no verifica PostgreSQL ni autenticación.

```powershell
npm run typecheck
npm test
npm run build
npm start
```

`src/app.ts` construye la aplicación y permite probarla sin abrir un puerto.
`src/server.ts` carga el entorno, abre el puerto y cierra la API con SIGINT/SIGTERM.
`src/env.ts` define la validación. En módulos NodeNext, los imports locales usan
extensión `.js` para que también funcionen después de compilar.

La base registra Helmet, CORS con credenciales para el origen configurado y un
límite inicial de 100 peticiones por IP por minuto. CORS no sustituye permisos ni
CSRF. El límite vive en memoria por proceso; habrá que coordinarlo si se despliegan
varias instancias y revisar `trustProxy` cuando se elija el proxy/hosting.

## Organización

```text
src/
  app.ts                  composición de módulos y manejo de errores
  server.ts               entorno, pool, arranque y cierre
  env.ts                  validación de configuración
  database/pool.ts        conexión PostgreSQL
  shared/http-error.ts    errores de aplicación
  modules/
    auth/
      auth.routes.ts      rutas y registro de seguridad en el ámbito API
      controllers/        traducción HTTP y gestión de la sesión
      services/           autenticación y consulta de cuenta vigente
      repositories/       consultas de usuarios y almacén PostgreSQL de sesiones
      schemas/            validación, tipos y respuestas públicas
      guards/             permisos por rol
    administracion/       altas auditadas de usuarios y dependencias
    indicadores/          responsabilidad documentada; implementación pendiente
    operacion/            responsabilidad documentada; implementación pendiente
    evaluacion/           responsabilidad documentada; implementación pendiente
sql/001_auth_propuesta.sql SQL de autenticación preparado, NO ejecutado
sql/002_auditoria_configuracion.sql bitácora transaccional de altas
src/scripts/create-admin.ts bootstrap del primer administrador
docs/SIIP-auth.postman_collection.json recorrido importable en Postman
```

Los módulos nuevos se registran dentro del ámbito `/api/v1` en `app.ts`, después
de `registerAuth`. Ahí comparten sesión, control de Origin/CSRF para escrituras y
`api.requireSession`. Las rutas privadas
usan ese guard; para una acción de Revisión se añade `requireRoles('revision')`.
Administrador no hereda permisos de Captura/Revisión. Estos guards no sustituyen
los filtros y permisos por objeto/dependencia que deberá implementar cada módulo.
Consulta es un cuarto rol exclusivo, sin dependencia, para lectura de información
publicada; puede haber varias cuentas. No administra ni captura/revisa/valida.
Salud queda fuera de ese ámbito: no consulta sesiones ni usuarios.

## Autenticación

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/api/v1/auth/sesion` | Usuario actual o `null`, más `csrf_token`. |
| POST | `/api/v1/auth/sesion` | Verifica `{ "correo": "...", "password": "..." }`, rota sesión/CSRF y devuelve usuario. |
| DELETE | `/api/v1/auth/sesion` | Revoca sesión, expira cookie y devuelve 204. |

Antes del login hay que ejecutar GET, conservar su cookie y enviar su token en
`X-CSRF-Token`. POST y DELETE exigen también `Origin` igual a `FRONTEND_ORIGIN`.
El navegador usa `credentials: 'include'` o Axios `withCredentials: true`.
En desarrollo usa el mismo hostname para frontend/API (por ejemplo localhost),
evitando mezclar localhost con 127.0.0.1 al trabajar con cookies SameSite.

Se usa Argon2id y cookie `siip_session`, HttpOnly, SameSite=Lax, Path=/api/v1 y
Secure en producción/HTTPS. Identificadores bigint se devuelven como cadenas.
El rol/dependencia se releen de la cuenta: desactivar usuario/dependencia impide
el acceso. Un cambio de hash de contraseña invalida las sesiones anteriores por
huella HMAC; no se guardan contraseñas ni hashes Argon2 en la sesión.

Valor técnico inicial: vencimiento absoluto de 30 minutos, sin renovación por
consultas; `SESSION_TTL_MS` lo define. El login admite 5 intentos/IP/minuto, además
del límite global. Son valores iniciales para revisar antes de operación. Los
límites viven en memoria por proceso y requieren coordinación si hay varias
instancias. Antes de desplegar se debe configurar HTTPS y el proxy confiable.

Los errores usan `application/problem+json` y `Cache-Control: no-store`.
Credenciales inválidas/cuenta inactiva tienen respuesta genérica; 401 requiere
autenticación, 403 indica origen/CSRF/permiso y no significa cerrar una sesión válida.

## PostgreSQL y puesta en operación pendiente

Con `DATABASE_URL` vacío se puede arrancar y consultar salud; autenticación devuelve
503 `AUTENTICACION_NO_CONFIGURADA`. No existe fallback a sesiones en memoria. En
producción se requieren BD, secreto de al menos 32 caracteres y origen HTTPS.
Las conexiones remotas verifican certificados TLS; solo localhost permite conexión
sin TLS. No mezclar opciones SSL adicionales en la URL; `sslmode` se retira para
aplicar la política TLS del backend. Una CA privada requeriría configurar su
certificado explícitamente antes de usar ese proveedor.

Al 04/11/2026 el equipo dispone de una base PostgreSQL vacía; todavía falta configurar
la conexión local. **No se ejecutó SQL desde este chat**. Aplicar explícitamente y en
orden `sql/001_auth_propuesta.sql`, `sql/002_auditoria_configuracion.sql`,
`sql/003_dependencia_revision.sql` y `sql/004_rol_consulta.sql` en la base
de desarrollo autorizada (por ejemplo, desde el editor SQL de PostgreSQL).
El primero crea dependencias, usuarios y sesiones; el segundo, auditoría administrativa.
El tercero exige dependencia para Captura y Revisión (DEC-037). Si ya existen
revisores sin dependencia, asignarles la correcta antes de aplicar SQL 003; la
validación falla sin inventar asignaciones ni cambiar cuentas. El backend rechaza
el acceso de cuentas de Revisión sin dependencia o con dependencia inactiva.
El cuarto SQL añade el rol Consulta y debe confirmarse antes de usar el nuevo valor
en otra transacción. Está preparado; no se ejecutó ni se modificaron cuentas.
La tabla técnica de sesiones guarda JSON, generación para actualización
atómica y vencimiento; evita recrear sesiones revocadas desde solicitudes obsoletas.
Las consultas iniciales usan `pg` parametrizado, incluido el compare-and-set; Drizzle
queda instalado para el esquema que se apruebe. No hay sincronización automática,
migración al arrancar, registros o contraseñas predeterminadas.

Después configurar `DATABASE_URL` en `.env` y crear la cuenta inicial con el script
de abajo. Aplicar SQL con credenciales de migración; el usuario de ejecución necesita
SELECT/INSERT en usuarios y dependencias, SELECT/INSERT/UPDATE/DELETE en sesiones,
INSERT en auditoria_configuracion y USAGE en las secuencias de altas. No necesita
crear esquema. El bootstrap usa un bloqueo asesor transaccional para serializar
intentos simultáneos mientras comprueba que no existe otro administrador.

El formato de `DATABASE_URL` es una URI PostgreSQL, por ejemplo:

```dotenv
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/NOMBRE_BD"
```

Reemplaza los valores por el usuario de PostgreSQL, su contraseña y el nombre real
de la base; no son las credenciales del administrador de SIIP. No uses la dirección
HTTP de pgAdmin, Supabase o la API. Si la contraseña contiene caracteres reservados,
codifícalos dentro de la URI: por ejemplo `@` como `%40` y `#` como `%23`.
No usar credenciales de producción ni las del propietario como usuario diario.

shortcut: la limpieza de filas expiradas está documentada en el SQL pero aún no
programada; configurar la tarea antes de un despliegue persistente. Las sesiones
expiradas se rechazan aunque su fila todavía no se haya eliminado.

Las pruebas habituales usan cuentas y almacén en memoria solo como dobles de prueba. Cubren
HTTP, CSRF, rotación/revocación, expiración, permisos, validación, errores y contrato
del adaptador de persistencia. No verifican ejecución SQL ni conectividad PostgreSQL
real salvo que se configure explícitamente la prueba de integración de abajo.
No se implementaron subida PDF, registro público o recuperación de contraseña.

## Primer administrador

`npm run admin:create` crea únicamente el primer Administrador, sin dependencia,
con Argon2id y auditoría en la misma transacción. Si ya hay cualquier cuenta de
Administrador (incluso inactiva), falla sin cambiarla. No es un reset de contraseña.

Desde PowerShell, en `siip-backend`, con `.env` configurado y los cuatro SQL aplicados:

```powershell
$env:ADMIN_NOMBRE = Read-Host 'Nombre del administrador'
$env:ADMIN_CORREO = Read-Host 'Correo del administrador'
$siipPassword = Read-Host 'Contraseña (mínimo 15 caracteres)' -AsSecureString
try {
    $env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $siipPassword).Password
    npm run admin:create
} finally {
    Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:ADMIN_NOMBRE -ErrorAction SilentlyContinue
    Remove-Item Env:ADMIN_CORREO -ErrorAction SilentlyContinue
    Remove-Variable siipPassword -ErrorAction SilentlyContinue
}
```

La contraseña se pide sin mostrarla y no queda escrita en el comando. El script
solo imprime el ID creado o un error sanitizado; no aplica SQL ni sobrescribe cuentas.

## Altas desde la API

Tras GET de bootstrap y POST de login del administrador, conservar cookie y usar
el CSRF NUEVO del login. Todas las altas exigen Origin autorizado, cookie, CSRF y
rol administrador vigente. Devuelven 201 con datos públicos, sin contraseña/hash.

`POST /api/v1/administracion/dependencias`:

```json
{ "clave": "CLAVE_REAL", "nombre": "Nombre de la dependencia" }
```

`POST /api/v1/administracion/usuarios` para Captura:

```json
{
  "nombre": "Nombre del capturista",
  "correo": "captura@example.test",
  "password": "ReemplazarPorUnaClavePrivada!",
  "rol": "captura",
  "dependencia_id": "ID_DEVUELTO_POR_EL_ALTA"
}
```

Para Revisión se usa el mismo endpoint, `rol: "revision"`, con `dependencia_id`
obligatoria, correspondiente a una dependencia activa, igual que para Captura.
La pertenencia de Revisión no limita su consulta global ni concede captura. La cuenta de Captura requiere dependencia activa
y solo puede existir una cuenta de Captura activa por dependencia. Los correos se
normalizan a minúsculas; duplicados responden 409. La contraseña inicial requiere
15–1024 caracteres; no se exige composición arbitraria. No se admite crear un
Administrador por HTTP ni imponer campos como `activo`, `creado_por` o hashes.

Para Consulta se usa el mismo endpoint con `rol: "consulta"` y `dependencia_id`
omitida o `null`. Una dependencia no nula se rechaza con 422. Se admiten varias
cuentas de Consulta; todas quedan sin permisos operativos ni administrativos.

El alta y su evento en `auditoria_configuracion` son atómicos. Si falla la bitácora,
se revierte el alta. El bootstrap se registra con el ID del nuevo administrador
como actor inicial. Los valores de auditoría no incluyen contraseñas o hashes.

`GET /api/v1/administracion/dependencias` devuelve el catálogo completo de dependencias
activas como array, ordenado por nombre e ID, sin paginación. Exige sesión de
Administrador y permite poblar el selector de ambas altas. En `develop` la pantalla
administrativa usa estos endpoints para cargar dependencias y crear dependencias y
usuarios de Captura, Revisión o Consulta. Las altas conservan validación y auditoría.
La tabla de usuarios del frontend solo muestra las altas de la vista actual: aún no
hay endpoints de listado, edición ni desactivación de usuarios.

## Probar el recorrido

Importa `docs/SIIP-auth.postman_collection.json`. Completa las variables locales
`adminCorreo`, `adminPassword`, `capturaPassword` y `revisionPassword`; ajusta
`baseUrl`/`origin` al entorno. Las contraseñas están vacías en el archivo del repo.
Con la API arrancada, ejecuta las 13 solicitudes en orden: bootstrap, login admin,
alta de dependencia, altas de Captura/Revisión y login/logout de los tres roles.
El cookie jar debe estar habilitado; la colección conserva CSRF y el ID de dependencia.
La dependencia DEMO es sintética y solo sirve para desarrollo. Para repetir el alta,
usa claves/correos nuevos; las cuentas existentes nunca se sobrescriben.

Para verificar también SQL y persistencia real, configura `TEST_DATABASE_URL` para
una base de pruebas separada y ejecuta `npm run test:integration`. La prueba crea
un esquema temporal con prefijo `siip_test_`, verifica su aislamiento, aplica los cuatro
SQL (incluidos dependencia obligatoria para Revisión y rol Consulta), recorre las altas y auth,
comprueba auditoría y elimina únicamente ese esquema.
Necesita permisos técnicos de crear esquemas en esa base. Sin `TEST_DATABASE_URL`
se omite; nunca reutiliza automáticamente `DATABASE_URL` para escribir pruebas.
