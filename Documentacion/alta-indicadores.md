# Alta persistente de indicadores — 09/11/2026

Actualización 10/11/2026: [DEC-043](variables-asignaciones.md) añade configuración
estructurada de entradas/asignaciones y carga los cuatro ejemplos 130–133 en SIIP
local, conservándolos inactivos. Los límites de este documento describen el alcance
original DEC-042; Captura y cálculo todavía no se habilitan.

Solicitud del equipo: sustituir el guardado demostrativo por un alta de ficha en PostgreSQL.
Este alcance autoriza preparar su implementación; no aprueba el resto del modelo de negocio.

## Alcance implementado

- Administrador crea, lista y consulta fichas. Otros perfiles no acceden a estas rutas administrativas.
- El formulario conserva sus cinco apartados y 34 campos visibles. El servidor asigna el consecutivo; recibe 33 campos documentales y rechaza propiedades adicionales.
- Ficha y evento `crear` de `auditoria_configuracion` se guardan en la misma transacción. Si falla cualquiera, no se confirma el alta.
- El ID interno y el consecutivo se devuelven como cadenas. El código SIIP es independiente y único, sin distinción de mayúsculas.
- Se reservan las claves de las 63 fichas base. No se copian ni alteran esas fichas; permanecen en el catálogo de referencia del frontend.
- Se valida que familia y agrupación existan, estén activas, pertenezcan entre sí y coincidan con los segmentos de la clave.
- Cada alta queda `activo=false`. No crea capturas, variables operativas, asignaciones, resultados, periodos exigibles ni publicaciones.
- Consulta de ficha en modo lectura. Edición, activación y cambio de metodología siguen pendientes de sus contratos y vigencias.

## API

| Método | Ruta relativa a `/api/v1` | Resultado |
| --- | --- | --- |
| POST | `/administracion/indicadores` | 201 y ficha confirmada. Cookie, Origin autorizado y CSRF obligatorios. |
| GET | `/administracion/indicadores` | Array de fichas nuevas persistidas, ordenado por consecutivo descendente, sin paginación. |
| GET | `/administracion/indicadores/{id}` | Ficha por ID interno; 404 si no existe. |

Las tres requieren sesión vigente de Administrador y responden `Cache-Control: no-store`.
422 por datos inválidos, relación familia/agrupación o clave incoherentes; 409 por clave
duplicada/reservada; 503 si faltan configuración o tablas. No hay éxito simulado ni
respaldo automático en localStorage cuando la API falla.

La respuesta tiene `id`, `campos`, `activo`, `creadoEn` y `actualizadoEn`. `campos`
incluye el consecutivo asignado y los 33 campos del formulario, descritos en OpenAPI.

## SQL 005 y diferencias delimitadas frente al borrador

`siip-backend/sql/005_alta_indicadores.sql` requiere SQL 001 y 002. Crea únicamente:

1. `agrupaciones_tematicas`: código, nombre y habilitación del catálogo.
2. `familias`: código, nombre, habilitación y FK al único padre temático.
3. `indicadores`: FK de familia, campos documentales explícitos, ID, consecutivo,
   estado inactivo y fechas. No duplica la agrupación del indicador.

Carga como referencia las ocho agrupaciones y 54 familias del anexo base. No carga
indicadores reales ni los ejemplos ficticios. El SQL es transaccional, no contiene
DROP, no modifica usuarios ni se ejecuta al iniciar la aplicación. Si ya existe
una tabla con esos nombres, se detiene; no mezcla esquemas silenciosamente.

Se implementa una parte documental del borrador de 13 tablas. No se crean las otras
entidades ni sus ENUM. Algoritmo, variables y semaforización se conservan como texto
de ficha, sin evaluar expresiones. Línea base, meta, condición de acumulación y
periodo de cumplimiento conservan el texto con unidad, incluso valores no definidos.
Los futuros parámetros numéricos del cálculo deberán configurarse y validarse por
separado. No se deduce una regla ejecutable de esos textos.

El consecutivo de nuevas altas empieza en 130 y puede tener saltos, por ejemplo
tras una transacción fallida. No garantiza coincidir con el consecutivo de un Excel.
No sustituye al ID interno ni al código SIIP. Los ceros y porcentajes no se convierten
automáticamente: escribir `90 %` conserva ese texto; no transformar `0.9` sin su unidad.

Las fichas de demostración antiguas en localStorage no se borran ni se importan.
La nueva pantalla muestra exclusivamente fichas confirmadas por la base. No existe
función de importación del Excel ni incorporación automática a Consulta o Estadísticas.

## Verificación y puesta en marcha

- Fixtures de pruebas: las seis fichas ficticias 130–135 de `prueba.xlsx`, con sus
  porcentajes interpretados según el formato original. No se insertan en la base
  de trabajo durante pruebas sintéticas.
- Pruebas HTTP: alta/consulta, cuatro perfiles, CSRF/Origin, datos inválidos, claves
  base reservadas, duplicados, 404 y 503.
- Pruebas de repositorio: parámetros SQL, relación familiar, bloqueo compartido,
  confirmación atómica de auditoría, rollback y IDs fuera del rango seguro de Number.
- `npm run test:integration`, con `TEST_DATABASE_URL` autorizado, crea un esquema
  temporal `siip_test_*`, aplica 001/002/005, crea seis fichas sintéticas y verifica
  lectura tras reiniciar la API. Elimina solo ese esquema. No usa DATABASE_URL
  automáticamente para pruebas.

Para habilitar el alta local se debe autorizar/aplicar SQL 005 en la base concreta
configurada en el backend. Reiniciar la API si se ejecuta la compilación anterior.
Desde Administrador → Indicadores: Nuevo indicador, completar apartados, Guardar indicador,
comprobar confirmación y consecutivo, regresar al listado y recargar/ver la ficha.

El usuario autorizó expresamente SQL 005 y la prueba aislada el 09/11/2026.
Aplicado únicamente en `SIIP`, `localhost:5432`, esquema `public`. Comprobación:
ocho agrupaciones, 54 familias y cero indicadores nuevos. No se modificaron cuentas.
No asumirlo aplicado en otros entornos.

Resultados de aceptación:

- Frontend: 47 pruebas aprobadas y compilación correcta.
- Backend: 55 pruebas sintéticas aprobadas y compilación correcta. En la pasada
  general se omitieron las dos integraciones reales; después se ejecutó y aprobó
  específicamente `indicadores.integration.test.mjs` contra PostgreSQL local.
- PostgreSQL real: seis fichas en esquema aislado, duplicados 409, auditoría y lectura
  tras reiniciar la API. Esquema temporal eliminado al terminar. No se cargaron esas
  fichas en `public` ni se aplicaron los SQL de prueba a las tablas de trabajo.
- Navegador: diez comprobaciones aprobadas a 1440/390/320 px; alta HTTP, ficha tras
  recarga, estado inactivo en listado, duplicado sin perder datos y sin desbordamiento
  horizontal del documento. Los repositorios del navegador son sintéticos.
- OpenAPI analizado como YAML sin claves duplicadas y con 33 campos de entrada,
  20 obligatorios. `git diff --check` correcto.
- Persiste la advertencia conocida del chunk de gráficas mayor de 500 kB.

Evidencias locales: [navegador](../../QA-final-2026-11-09/indicadores-smoke/resultado.json)
y [aplicación de SQL 005](../../QA-final-2026-11-09/sql-005-aplicado.json).
