# SIIP frontend

Estado de la integración visual, límites operativos y verificación del 09/11/2026: [informe](../Documentacion/verificacion-integracion-visual-2026-11-09.md).

Corrección posterior al merge (09/11/2026): Administración carga las cuentas guardadas
mediante `GET /administracion/usuarios`, muestra rol, dependencia y estado, y permite
actualizar el listado. Ya no se limita a las altas realizadas mientras la vista está
abierta. Consulta requiere que SQL 004 esté aplicado en la base del backend; un
correo ya registrado devuelve 409 y no cambia el rol de la cuenta existente.

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

En **Administrador → Usuarios y dependencias**, crea primero la dependencia o elige
una existente en el catálogo activo. Después registra nombre, correo, rol,
dependencia y contraseña inicial (15–1024 caracteres). Captura y Revisión requieren
dependencia; Revisión mantiene la consulta global. Solo Administrador accede a estas
altas y no puede crear otros administradores por HTTP. Los duplicados se muestran
sin sobrescribir registros; la contraseña se limpia tras cada intento de alta.
Para persistir, el backend requiere los SQL 001/002/003 aplicados con autorización.

## Consulta — DEC-038, 06/11/2026

Rol exclusivo `consulta`, sin dependencia. Administrador lo elige en Alta de usuario: no se muestra el selector de dependencia ni se bloquea esta alta si el catálogo está vacío o falló. Se permiten varias cuentas. Inicia/cierra sesión con el mismo flujo y accede a Consulta/Estadísticas. Los guards impiden Captura, Seguimiento y Administrador, incluso por URL directa. El backend debe aplicar además permisos por recurso; las vistas de negocio siguen con datos de ejemplo.

El cierre y gris de DEC-039 están especificados en los contratos. No se afirma que los prototipos apliquen cierre, persistan justificaciones o publiquen indicadores.

## Alojamiento seleccionado — 06/11/2026

DEC-040: frontend compilado, API Node.js y PostgreSQL en el mismo Hostinger VPS KVM 1. DEC-041: evidencias y justificaciones PDF en Cloudflare R2, sustituyendo Supabase Storage. Se conserva autenticación SIIP. [Arquitectura, costos y fuentes vigentes](../Documentacion/infraestructura-hostinger-r2.md). Selección documental, sin despliegue ni integración R2 realizados.
