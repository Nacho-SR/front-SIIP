# SIIP frontend

Vue 3, TypeScript y Pinia. Desde esta carpeta:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

La aplicación abre en `http://localhost:5173/front-SIIP/`. `VITE_API_URL` es la URL pública de la API incluyendo `/api/v1`; por defecto usa `http://localhost:3000/api/v1`. El archivo `.env` es local y no se versiona.

Para autenticar, inicia también `siip-backend` siguiendo su README, con PostgreSQL y `SESSION_SECRET` configurados. `FRONTEND_ORIGIN` del backend debe coincidir exactamente con el origen del navegador (`http://localhost:5173`, sin ruta ni barra final). Usa `localhost` en ambos; no lo mezcles con `127.0.0.1`. Sin PostgreSQL la autenticación responde 503 y el formulario muestra ese error; no hay usuarios demo ni login simulado. Preparar la base de datos requiere autorización aparte.

La sesión viaja en cookie HttpOnly y las escrituras envían `X-CSRF-Token`. `GET /auth/sesion` recupera identidad/CSRF al navegar inicialmente y antes de login/logout; `POST` autentica y rota CSRF; `DELETE` revoca la sesión. El frontend no guarda credenciales ni tokens en localStorage. Un 401 por sesión inválida redirige a login; 403 conserva la sesión. El rol `revision` usa la ruta `/seguimiento`; administrador no hereda captura/revisión.

En despliegue, define `VITE_API_URL` al compilar. Frontend y API deben usar HTTPS y compartir sitio para la cookie `SameSite=Lax`; el despliegue estático de GitHub Pages por sí solo no aloja el backend.

```powershell
npm test
npm run build
```

Las pruebas verifican store, cliente HTTP y guards reales con respuestas HTTP simuladas e historial en memoria. No conectan a PostgreSQL ni verifican cookies/CORS en un navegador.

Los cuatro perfiles (`captura`, `revision`, `administrador`, `consulta`) conservan
permisos exclusivos en rutas y menú. Consulta no requiere dependencia y accede a
Consulta, Estadísticas y su análisis. El soporte del backend se recuperó de `main`,
incluido SQL 004 preparado para este rol; no se aplicó SQL a ninguna base.

Estado de `develop`, pasos 1 y 2 (09/11/2026): se recuperaron compilación, sesión
real, cliente HTTP, permisos y altas administrativas conservando el diseño visual.
Las pruebas cubren también el formulario de acceso, el menú por perfil, el cierre
de sesión fallido y los errores/reintentos de altas.

En **Administrador → Dependencias**, crea la dependencia con clave y nombre.
El catálogo activo alimenta el selector de **Agregar usuario**. Captura y Revisión
requieren una dependencia activa; Consulta no la solicita y envía `null`, incluso
si el catálogo está vacío o no pudo cargarse. Las altas piden nombre, correo,
rol y contraseña inicial de 15–1024 caracteres. Solo se confirma éxito tras la
respuesta de la API; los errores conservan los datos y limpian la contraseña.
Cancelar también elimina la contraseña del formulario. No se crean administradores
por esta pantalla ni se envía un estado de activación arbitrario.

Las cuentas se persisten mediante la API, sin leer ni escribir usuarios en
localStorage. La tabla muestra únicamente las altas confirmadas desde que se abrió
la vista y así se identifica; no es el catálogo completo de usuarios. La API aún no
ofrece listado, edición ni desactivación de usuarios; se retiró la edición simulada.
No se borraron datos locales antiguos. El registro de indicadores sigue siendo un
prototipo local, pendiente de su propio paso de integración.
