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
    indicadores/          responsabilidad documentada; implementación pendiente
    operacion/            responsabilidad documentada; implementación pendiente
    evaluacion/           responsabilidad documentada; implementación pendiente
sql/001_auth_propuesta.sql SQL de autenticación preparado, NO ejecutado
```

Los módulos nuevos se registran dentro del ámbito `/api/v1` en `app.ts`, después
de `registerAuth`. Ahí comparten sesión, control de Origin/CSRF para escrituras y
`api.requireSession`. Las rutas privadas
usan ese guard; para una acción de Revisión se añade `requireRoles('revision')`.
Administrador no hereda permisos de Captura/Revisión. Estos guards no sustituyen
los filtros y permisos por objeto/dependencia que deberá implementar cada módulo.
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

Por instrucción del equipo todavía no se dispone de BD y **no se ejecutó SQL**.
`sql/001_auth_propuesta.sql` contiene únicamente dependencias, usuarios y sesiones
para revisión. La tabla técnica de sesiones guarda JSON, generación para actualización
atómica y vencimiento; evita recrear sesiones revocadas desde solicitudes obsoletas.
Las consultas iniciales usan `pg` parametrizado, incluido el compare-and-set; Drizzle
queda instalado para el esquema que se apruebe. No hay sincronización automática,
migración al arrancar, registros o contraseñas predeterminadas.

Para una prueba real: revisar/aprobar el SQL, preparar una BD de desarrollo vacía,
aplicarlo con credenciales de migración y crear la cuenta inicial con hash Argon2id.
Después configurar `.env`. El usuario de ejecución necesita SELECT en usuarios y
dependencias, y SELECT/INSERT/UPDATE/DELETE en sesiones; no necesita crear esquema.
No usar credenciales de producción ni las del propietario como usuario diario.

shortcut: la limpieza de filas expiradas está documentada en el SQL pero aún no
programada; configurar la tarea antes de un despliegue persistente. Las sesiones
expiradas se rechazan aunque su fila todavía no se haya eliminado.

Las pruebas usan cuentas y almacén en memoria solo como dobles de prueba. Cubren
HTTP, CSRF, rotación/revocación, expiración, permisos, validación, errores y contrato
del adaptador de persistencia. No verifican ejecución SQL ni conectividad PostgreSQL
real. No se implementaron subida PDF, registro público o recuperación de contraseña.
