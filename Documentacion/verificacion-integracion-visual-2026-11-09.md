# Verificación de la integración visual — 09/11/2026

**Actualización posterior al merge, 09/11/2026:** se añadió `GET /administracion/usuarios`
y su carga en Administración para mostrar también las cuentas anteriores, activas
e inactivas, con nombre de dependencia y sin secretos. Esto sustituye el límite de
«solo altas en esta vista» descrito más abajo como parte de la aceptación original.
Se confirmó por lectura de metadatos que la base local `SIIP` en `localhost:5432`
no contenía `consulta` en `rol_usuario`. Con autorización expresa del usuario se
aplicó únicamente SQL 004 y se comprobó que el tipo ya incluye los cuatro roles.
No se crearon ni modificaron cuentas para esa comprobación.

Validación posterior: 46 pruebas del frontend y 46 del backend aprobadas, con la
integración de PostgreSQL omitida (`TEST_DATABASE_URL=''`); ambas
compilaciones correctas. OpenAPI comprobado como YAML sin claves duplicadas.
La prueba enfocada de Chrome cubre carga al montar, cuentas anteriores e inactivas,
búsqueda por dependencia histórica, alta de Consulta, permanencia al recargar y
duplicado 409, a 1440/390/320 px. Usa repositorios sintéticos; el único cambio en
la base real fue SQL 004. [Evidencia](../../QA-final-2026-11-09/usuarios-smoke/resultado.json).

**Resultado:** comprobación visual y funcional superada para integrar el diseño. No habilita los módulos operativos ni acredita un despliegue de producción. No se hizo merge, commit, push, despliegue ni ejecución de SQL.

## Evidencia de aceptación

| Comprobación | Resultado |
| --- | --- |
| Chrome 156.0.8078.81, motor real en modo headless | 209 comprobaciones aprobadas, 0 fallos, 0 errores de aplicación/consola/recursos locales en la pasada `release`. |
| Ajuste final del texto de acceso | 3 comprobaciones adicionales aprobadas a 320, 390 y 1440 px; 0 errores. |
| Capturas y medidas | 57 capturas y 66 mediciones de ancho en `release`, más 3 capturas/mediciones del acceso actualizado. |
| Frontend: `npm test` | 43 pruebas aprobadas, 0 fallidas. Incluye regresión del filtro de agrupaciones. |
| Frontend: `npm run build` | Correcto con Node 22.23.4 / npm 10.9.9. Persiste la advertencia de un chunk de gráficas superior a 500 kB; no impide compilar. |
| Backend: `npm run build` y `npm test` | Compilación correcta; 44 pruebas aprobadas, 0 fallidas y 1 integración con PostgreSQL omitida explícitamente mediante `TEST_DATABASE_URL=''`. |
| Dependencias de producción del frontend | `npm ls --omit=dev --depth=0` correcto. PrimeVue se retiró del código, manifiesto y lockfile. |
| Higiene del cambio | `git diff --check` correcto. |

La aceptación se ejecutó sobre `develop` en HEAD `4e7bf44`, incluyendo los cambios locales sin commit de los pasos 4 y final. Referencia de `main`: `d776709`. Backend, SQL y pruebas del backend conservan el contenido funcional de `main`.

### Tamaños y pantallas

- Los cuatro perfiles: escritorio **1440 × 900** y móvil **390 × 844**.
- Comprobaciones adicionales de Consulta, Análisis y Administración: **320, 768, 850, 851 y 1024 px** de ancho. Se cubre ambos lados del punto de cambio del menú lateral (850/851).
- Acceso: escritorio y tamaños 320/390/768; el texto final se volvió a comprobar a 320/390/1440.
- Pantallas: acceso, Estadísticas, Análisis, Consulta, ficha técnica, Captura de referencia, Seguimiento y detalle de expediente, Administración, alta de usuario y ficha demostrativa de indicador.
- No se detectó desplazamiento horizontal del documento en los casos medidos. Las tablas anchas conservan su desplazamiento interno; el botón de ficha se alcanzó también en móvil.
- Se comprobó el contenido desplazable de la ficha con teclado, incluyendo la fórmula, además de Tab/Shift+Tab, Escape y retorno del foco. Menú móvil cerrado fuera del tabulador; menú abierto y diálogos contienen el foco. Menú lateral contraído conserva nombres accesibles.

### Cuatro perfiles

| Perfil | Pantallas comunes comprobadas | Pantalla propia | Restricciones comprobadas |
| --- | --- | --- | --- |
| Captura | Estadísticas, Análisis, Consulta/ficha de demostración | Captura en vista previa sin envíos | Sin Seguimiento ni Administración por URL; API administrativa responde 403. No se carga la bandeja local compartida. |
| Revisión | Estadísticas, Análisis, Consulta/ficha de demostración | Seguimiento y expediente de solo lectura | Sin Captura ni Administración por URL; API administrativa responde 403. Revisar/observar/validar permanecen deshabilitados. |
| Administrador | Estadísticas, Análisis, Consulta/ficha de demostración | Altas de usuarios/dependencias; ficha de indicador demostrativa | No hereda Captura/Seguimiento. Consulta se crea con dependencia nula. Duplicado 409 conserva sesión y datos, borra contraseña y no anuncia éxito. Nueva dependencia actualiza el selector. |
| Consulta | Estadísticas, Análisis, Consulta y ficha | Ninguna acción operativa | Sin Captura, Seguimiento, detalle ni Administración por URL; API administrativa responde 403. |

Se verificaron credenciales incorrectas, cookie HttpOnly/SameSite=Lax, ausencia de token de autenticación en localStorage, envío de CSRF en altas y revocación de sesión al salir y recargar. Estas comprobaciones usan las rutas, guards, Argon2id, cookies y control de Origin/CSRF reales del backend, con repositorios de cuentas/dependencias y sesiones exclusivamente sintéticos en memoria. No existe conexión a PostgreSQL ni modificación de datos reales.

El alcance por indicador/dependencia y permisos por objeto del negocio siguen pendientes del servidor. Esta matriz no concede a Captura lectura global de datos reales ni acredita permisos de módulos operativos aún inexistentes.

## Correcciones realizadas en la revisión

1. El selector de Estadísticas conserva las ocho agrupaciones al seleccionar una; ya no obliga a volver a «Todas» para cambiar. Se añadió prueba de regresión.
2. Menú móvil cerrado inerte, foco contenido al abrir, cierre con Escape y retorno al botón; botón Salir con nombre accesible también cuando se oculta su texto.
3. Ficha y alta de usuario comparten gestión de foco y restauración del scroll. El cuerpo de la ficha se puede enfocar y desplazar con teclado para alcanzar el contenido largo.
4. El filtro del Análisis tiene nombre accesible y foco visible. Se retiraron el encabezado duplicado de gráficas y una comilla sobrante en su plantilla.
5. Se retiró PrimeVue, sin componentes usados en estas pantallas, que generaba el aviso visible «Invalid PrimeUI License». No se ocultó el aviso por CSS ni se alteró el control de licencia de la biblioteca.
6. Se retiró el archivo de tipos/permisos ilustrativos sin consumidores que conservaba el rol obsoleto `seguimiento`.
7. Se corrigió el texto de acceso que aún afirmaba que la autenticación real se integraría después.
8. Se recuperaron de `main` decisiones, matriz de permisos, contratos documentales, cierre/gris, Hostinger VPS KVM 1, Cloudflare R2 y colección Postman de 18 solicitudes. Los precios conservan su comprobación original del **06/11/2026**; no se actualizó la cotización en esta revisión. Las notas de los pasos visuales se concentran en este informe.
9. El workflow existente usa Node 22 para coincidir con el entorno verificado. Su disparador de GitHub Pages por push a `main` no se cambió ni se ejecutó; no equivale al futuro despliegue en Hostinger.

## Preparación del merge

Se hizo una comparación de tres versiones **solo de lectura**, mediante `git merge-file -p` con copias temporales normalizadas, sobre los archivos modificados en ambas ramas respecto a la base común. No es un merge real ni modifica el índice o las ramas.

Resultado: 22 archivos idénticos a `main`, 3 combinables automáticamente y **2 conflictos de texto previstos**:

| Archivo | Resolución preparada |
| --- | --- |
| `siip-frontend/src/modules/admin/AdminView.vue` | Conservar la versión actual revisada: diseño nuevo, API real de altas, Consulta sin dependencia, dependencia activa para Captura/Revisión y límites del prototipo explícitos. |
| `siip-frontend/test/auth.test.mjs` | Conservar la versión actual ampliada: mantiene las comprobaciones de Consulta/altas y las nuevas regresiones de diseño, sesión, permisos y errores. |

Las copias de referencia están en `../../QA-final-2026-11-09/resoluciones/`. Antes de integrar deben incluirse en un commit todos los cambios locales y los archivos nuevos (incluidos los de los pasos anteriores). Al hacer el merge se revisarán estos dos conflictos y se repetirán los checks tras resolverlos; no se debe aceptar a ciegas un lado completo para todo el repositorio.

**Criterio:** el diseño y los contratos ya implementados superan la aceptación probada. El merge requiere resolver esos dos conflictos de texto; Captura/Seguimiento continuarán sin operación real. Hacer push a `main` activa el workflow actual de Pages: el despliegue y su `VITE_API_URL` deben tratarse por separado, sin asumir que esa publicación incluya API, PostgreSQL o R2.

## Evidencias y límites

En este workspace están disponibles:

- [Resultado completo de navegador](../../QA-final-2026-11-09/release/resultado.json), [revisión final del acceso](../../QA-final-2026-11-09/login-smoke/resultado.json) y [chequeo de combinación de textos](../../QA-final-2026-11-09/merge-check/resultado.json).
- [Script local de reproducción](../../QA-final-2026-11-09/verificar.mjs). Usa Playwright incluido en el runtime de Codex, Chrome instalado y rutas de este equipo; no añade dependencias de navegador al proyecto ni es un job de CI portable.
- [Escritorio](../../QA-final-2026-11-09/release/captura-1440-estadisticas.png), [ficha en móvil](../../QA-final-2026-11-09/release/consulta-390-ficha.png), [alta de Consulta en móvil](../../QA-final-2026-11-09/release/administrador-390-alta-consulta.png) y [acceso actualizado a 320 px](../../QA-final-2026-11-09/login-smoke/login-320.png).

La interfaz se sirvió con Vite; la compilación de producción se verificó por separado. No se probó PostgreSQL real, persistencia compartida, R2, límites finales de PDF, calendario del servidor, carga concurrente, HTTPS/proxy en Hostinger ni un despliegue real. Los tamaños móviles son viewports de Chrome en Windows, no dispositivos físicos ni Safari/Firefox. No es una auditoría formal de accesibilidad. Los servidores y perfiles de navegador de prueba se cerraron al terminar.

## Estado funcional conservado

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

Paso 3 (09/11/2026), Consulta: el selector elige un **mes/año de corte cerrado**,
independientemente de que haya resultados. Cada frecuencia resuelve su periodo
natural completo; septiembre de 2026 usa septiembre, T3, S1 y 2025 respectivamente.
Si falta ese periodo, no se arrastra otro. El total del catálogo no se presenta como
universo exigible: aún faltan alta, asignaciones y exigibilidad confirmadas.

El índice informativo es `(verdes + 0.5 × amarillos) / evaluables`, con umbrales
0.80/0.50 y sin índice cuando N=0. Gris y ausencia de color no entran en N. Se
mantiene pendiente la política de cobertura: el color de referencia del índice no
se presenta como color temático oficial. Los filtros no cambian el universo del grupo.

Consulta ya no recalcula colores con reglas actuales. La proyección de lectura
acepta un snapshot `publicacion` con `valor`, `semaforo` (verde/amarillo/rojo/null),
`version`, `versionRegla` y `publicadaEn`. Conserva ese snapshot durante reapertura
y escoge la publicación vigente hoy del periodo esperado (DEC-016/022/030).
Una validación local antigua sin snapshot muestra el valor sin color publicado;
no se fabrican versiones ni se migran colores calculados anteriormente.

El gris requiere `cumplimientoCierre: 'incumplido'`; no se infiere de la ausencia de
resultado. La justificación no lo retira. Un envío completo en revisión sigue sin
publicación, sin volverse gris. El adaptador local solo proyecta campos de consulta;
no entrega variables, observaciones ni nombres de PDF internos a la vista.
La fórmula textual del catálogo se muestra en Metodología; Fuentes y medición
muestra estado, valor, periodo esperado/fuente y versiones disponibles.

**Límite operativo:** la vista conserva datos sintéticos de sesión y lo indica.
Todavía no hay API ni productor de publicaciones/cierre que genere esos metadatos;
la proyección y sus casos se prueban con fixtures. El reloj del prototipo usa
America/Mexico_City; el calendario y las autorizaciones reales deben venir del
servidor. No hay cierre automático ni carga de justificaciones en este paso.
La separación de campos en frontend no sustituye autorización por objeto en API.

Paso 4 (09/11/2026), delimitación operativa: **Captura y Seguimiento son vistas
previas sin escrituras**. Se deshabilitaron envío, PDF, corrección, revisión,
observación y validación; sus funciones rechazan llamadas directas. No se sustituye
un envío, su evidencia, variables, historial ni publicación por otra versión local.
Los datos sintéticos existentes se conservan sin migrarlos ni eliminarlos.

Captura no carga la bandeja compartida del navegador: faltan las asignaciones por
dependencia/variable y una consulta propia autorizada. El catálogo y los campos se
pueden examinar como referencia, sin afirmar que estén asignados. El calendario de
vista previa distingue periodo en curso/cerrado/futuro y conserva el último día
local completo; no concede autorización de captura. La falta de resultado tampoco
genera automáticamente un incumplimiento.

Seguimiento conserva la lectura de ejemplos locales y la propuesta numérica
identificada como preliminar. Una metodología pendiente no habilita validación;
su falta de evaluación se identifica sin color, no como gris por incumplimiento.
No se fijó un límite de PDF ni se resolvieron correcciones posteriores al cierre.

Las fichas adicionales se guardan como **demostración**, sin activar indicadores
ni agregarlos al catálogo operativo. Familia se filtra por agrupación y se vuelve
a validar en el guardado. Si falla el almacenamiento de la ficha, el estado no
muestra un alta o edición que no se pudo persistir.

Para habilitar operación real hacen falta contexto y reloj del servidor,
indicadores/variables autorizados por dependencia, metodología conciliada y
versionada, envíos inmutables con actor y evidencia, validación conjunta de aportes,
publicaciones versionadas y cierre/justificación documental con autorización por
objeto. El esquema de negocio y esos contratos siguen por aprobarse; no se crean
endpoints, tablas, asignaciones ni reglas aprobadas ficticias desde estas vistas.
