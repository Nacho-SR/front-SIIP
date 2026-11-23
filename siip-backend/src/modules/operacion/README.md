# Operación

## Bandeja propia de Captura — 23/11/2026

`GET /api/v1/captura/indicadores` requiere sesión y exclusivamente rol Captura.
La dependencia se obtiene de la cuenta vigente; no se aceptan parámetros de
consulta para elegir otra. Devuelve la dependencia activa y los indicadores con
al menos una variable asignada a ella, incluyendo únicamente sus propias variables.
Administrador, Revisión y Consulta no heredan este acceso.

La respuesta contiene clave/nombre, agrupación, familia, frecuencia, estado de
activación, inicio de la activación vigente y código/descripción/unidad/tipo de
cada variable propia. Las fichas inactivas asignadas se muestran en preparación;
una fecha futura de inicio no se interpreta como permiso de captura. Los datos
proceden de las tablas existentes, sin migraciones, importación ni escrituras.
Una dependencia sin asignaciones recibe una lista vacía. La respuesta no se cachea.

El frontend sustituye el formulario de ejemplo por esta bandeja de solo lectura,
con búsqueda, filtro temático, actualización y estados de carga/error/vacío.
No usa expedientes de sessionStorage ni el catálogo JSON como respaldo.

## Calendario natural de referencia — 23/11/2026

La misma respuesta añade `fechaServidor` (fecha local `YYYY-MM-DD`),
`zonaHoraria: 'America/Mexico_City'` y `periodoActual: {inicio, fin}` en cada
indicador. Los extremos son fechas inclusivas, sin hora. Una sola lectura del
reloj del servidor determina toda la respuesta; el navegador solo presenta las
fechas y no puede elegir el reloj ni la zona mediante parámetros.

`periodoNatural(fecha, frecuencia)` amplía el servicio existente de periodos.
Calcula el intervalo que contiene una fecha válida entre 1900 y 9999:

| Frecuencia | Intervalos naturales |
|---|---|
| Mensual | Primer día al último día del mismo mes. |
| Trimestral | Enero–marzo, abril–junio, julio–septiembre, octubre–diciembre. |
| Semestral | Enero–junio y julio–diciembre. |
| Anual | 1 de enero a 31 de diciembre. |

`siguientePeriodo` reutiliza ese cálculo, conservando la activación desde el
siguiente periodo completo. Febrero respeta años bisiestos, incluidos los siglos.
El fin incluye todo el último día local; los intervalos se calculan con fechas
UTC internas para no depender de la zona del proceso, después de obtener la
fecha local de México. No se fija un desplazamiento horario UTC constante.

La UI muestra fecha/zona de la consulta y el intervalo de cada indicador como
referencia. Se actualizan al cargar, recuperar foco o pulsar Actualizar asignaciones.
El periodo natural actual puede anteceder al inicio de aplicación: no es por sí
mismo un periodo exigible. No genera historia, atrasos, permisos de envío,
estados abiertos/cerrados ni semáforos, y no resuelve las preguntas metodológicas.

Envíos, observaciones, revisión, validación, publicación, calendario operativo y
reapertura siguen pendientes. Las operaciones que publican o corrigen resultados
deberán usar transacciones y conservar versiones anteriores. La consulta actual
de asignaciones no sustituye la autorización por indicador/periodo de esos flujos.

Verificación: pruebas de límites de las cuatro frecuencias, medianoche de México,
febrero/bisiestos, continuidad, rango y entradas inválidas; pruebas HTTP con sesiones
en memoria, dobles del repositorio y renderizado SSR del frontend. Se conserva
la comprobación de activación y permisos existentes. No se consultó PostgreSQL real. La revisión visual
en escritorio/móvil quedó pendiente porque el navegador integrado no alcanzó
localhost y Computer Use detuvo el acceso a Chrome al no poder verificar su URL.
