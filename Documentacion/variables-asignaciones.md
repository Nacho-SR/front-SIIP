# Variables, dependencias y cuatro ejemplos iniciales — 10/11/2026

Solicitud del equipo (DEC-043): cargar los ejemplos ficticios 130–133 y configurar
entradas/asignaciones desde Administrador. No habilita la captura operativa ni el
cálculo o publicación de resultados.

## Ejemplos seleccionados

| Origen | Clave | Tema | Entradas |
| --- | --- | --- | --- |
| 130 | SIIP.05.F35.004 | Luminarias reparadas dentro del plazo | N y D, conteos de reportes |
| 131 | SIIP.07.F49.004 | Anexos digitales accesibles | N y D, conteos de respuestas |
| 132 | SIIP.08.F54.004 | Bienes muebles localizados | N y D, conteos de bienes |
| 133 | SIIP.04.F31.004 | Restauración con seguimiento fotográfico | N y D, conteos de sitios |

Se contrastaron claves, nombres y definiciones de las entradas con `prueba.xlsx`.
Las fichas conservan su advertencia de ejemplo ficticio. Se cargan inactivas y las
ocho entradas quedan sin dependencia asignada. P es resultado, no una entrada.
No se cargan valores de prueba como capturas, periodos exigibles o publicaciones.
Los casos 134–135 permanecen fuera de esta carga.

## Modelo acotado

SQL 006 requiere 001, 002 y 005. Añade únicamente `variables_indicador` y el contador
`indicadores.version_variables`. Cada entrada tiene ID, indicador, código único
dentro del indicador, descripción, unidad, tipo entero/decimal y una FK nullable
de dependencia. No se añaden catálogos genéricos ni relaciones muchos a muchos.

Las entradas de este alcance son periódicas, siguen el periodo del indicador y
todavía no reciben valores. Variables fijas, vigencias y reutilización siguen sin
implementación. No se ejecuta la fórmula textual ni se configura el motor de cálculo.

Una variable tiene una dependencia responsable o queda sin asignar. Los registros
existentes conservan ID, código, descripción, unidad y tipo; se puede cambiar su
dependencia. Se pueden añadir entradas nuevas, pero no eliminar las registradas.
La pantalla permite quitar filas nuevas antes de guardarlas. Las modificaciones
de definiciones o de indicadores activos requieren un flujo posterior de metodología.

## Interfaz y contrato

En Administración → Indicadores, cada ficha tiene **Variables y dependencias**,
con URL `/administrador/indicadores/{id}/variables`. Se muestran la clave y nombre
del indicador y la definición de cada entrada. Se elige una dependencia activa
por fila y se guarda el conjunto. La carga/guardado usa exclusivamente la API.

| Método | Ruta relativa a `/api/v1` | Resultado |
| --- | --- | --- |
| GET | `/administracion/indicadores/{id}/variables` | `{indicadorId, version, variables}` |
| PUT | `/administracion/indicadores/{id}/variables` | Guarda altas/asignaciones y devuelve la configuración confirmada. |

Solo Administrador; cookie y sesión vigentes. PUT exige Origin y CSRF. IDs se
conservan como cadenas y las respuestas usan `Cache-Control: no-store`.

El cuerpo de PUT contiene `version` y entre 1 y 50 `variables`: `id` solo para las
ya existentes, `codigo`, `descripcion`, `unidadMedida`, `tipoDato` y `dependenciaId`
(un ID o null). Cada registro de respuesta añade `dependenciaNombre` y
`dependenciaActiva`, ambos null para una entrada sin asignación.

El backend bloquea el indicador durante el guardado, comprueba su estado inactivo,
la versión enviada, la pertenencia de todos los IDs y las dependencias activas.
No admite códigos/IDs repetidos, variables ajenas, asignaciones múltiples o la
omisión de entradas persistidas. Bloquea las dependencias leídas hasta confirmar.

Altas/asignaciones y auditoría son una transacción. Guarda antes/después por variable
con el actor administrativo; incrementa la versión una vez por conjunto modificado.
Sin cambios no incrementa ni genera eventos. Un fallo revierte todo. Una versión
obsoleta devuelve 409; el formulario conserva los cambios y ofrece recargar de
forma explícita, descartando lo no guardado. 422 por entradas/asignaciones inválidas,
404 por indicador inexistente y 503 por configuración SQL faltante.

## Carga técnica de ejemplos

`npm run indicadores:cargar-prueba` prepara una vista previa de las cuatro fichas.
`npm run indicadores:cargar-prueba -- --aplicar --actor=ID` las carga mediante los
servicios/repositorios de alta y variables, con auditoría. Si hay un solo Administrador
activo puede omitirse `--actor`; con varios debe elegirse. El script es exclusivo
de desarrollo local y rechaza NODE_ENV=production. Necesita el repositorio con
`test/fixtures/indicadores-prueba.json` y SQL 005/006 en esa base.

Repetirlo no duplica fichas ni elimina asignaciones. Si encuentra una ficha o
definición diferente, se detiene sin sobrescribirla. Cada ficha y su configuración
son operaciones confirmadas separadamente: si hay un fallo posterior, pueden quedar
ejemplos anteriores ya cargados o una ficha todavía sin entradas. Corregir la causa
y repetir completa lo faltante. No borra las altas previas. No es una función de
importación de Excel disponible a usuarios.

## Comprobación y estado

Pruebas sintéticas de HTTP, permisos de los cuatro perfiles, CSRF/Origin,
validación, auditoría, versiones, rollback y comportamiento del formulario.
Prueba real preparada en `variables.integration.test.mjs`: esquema temporal aislado,
SQL 001/002/005/006, carga repetida de cuatro fichas, ocho entradas, asignaciones,
escrituras concurrentes, auditoría fallida y lectura tras reiniciar la API.

El usuario autorizó SQL 006, la prueba aislada y la carga el 10/11/2026. Se aplicó
únicamente en SIIP local, localhost:5432/public, con actor administrativo ID 1.
Se verificaron cuatro fichas inactivas y ocho entradas N/D sin dependencia asignada.
IDs internos de los indicadores: 1 (130), 2 (131), 3 (132) y 4 (133). No se cambiaron
cuentas, capturas, resultados ni asignaciones previas. No asumir aplicación en otros
entornos ni aislamiento de la base por cambiar de rama Git.

Resultados: 52 pruebas frontend y 62 backend aprobadas. Tres integraciones se omitieron
en la pasada general; después se ejecutó y aprobó la integración específica de
variables en PostgreSQL real con esquema temporal aislado, ya eliminado. Incluyó
carga repetida, concurrencia, rollback y lectura tras reiniciar la API.
Ambas compilaciones correctas; persiste el aviso conocido del chunk de gráficas >500 kB.
OpenAPI analizado sin claves duplicadas y `git diff --check` correcto.

Navegador: 14 comprobaciones aprobadas, 0 fallos, a 1440/1024/768/390/320 px; asignación,
recarga, conflicto con conservación de cambios, alta de entrada nueva, cambio de
indicador y permisos de los cuatro perfiles. Usó repositorios sintéticos, sin escribir
asignaciones de prueba en public. No se probaron dispositivos móviles físicos.
[Evidencia de navegador](../../QA-final-2026-11-09/variables/resultado.json) y
[constancia de aplicación/carga](../../QA-final-2026-11-09/sql-006-carga-aplicada.json).

Actualización DEC-044 (10/11/2026): el ejemplo 130 ya tiene N/D asignadas a DGSM
(Dirección General de Servicios Municipales, ID 3), por indicación y autorización
expresa del usuario. Se guardó metodología v1 parte/total con umbrales 75/90 %,
sin vigencia ni activación. Los ejemplos 131–133 no se modificaron.
[Detalle y comprobaciones](metodologia-indicadores.md).
