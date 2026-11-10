# Preparación de cálculo y semáforo — 10/11/2026

DEC-044: el usuario solicita el punto 1 de la preparación operativa. Confirma que
N y D del ejemplo 130 corresponden a **Dirección General de Servicios Municipales**
y que el periodo de inicio se elegirá al implementar la activación. El indicador
permanece inactivo. No se resuelven P-07/P-08 ni se habilitan capturas.

## Alcance implementado

Desde Administración → Indicadores → Variables y dependencias → **Cálculo y
semáforo**, Administrador configura explícitamente numerador, denominador y dos
umbrales. Se muestran los textos de la ficha como referencia, sin interpretarlos
como código ni deducir responsables de ellos. No se añaden botones a la tabla.

La primera operación soportada es porcentaje parte/total: `P = N / D × 100`,
ascendente, no acumulable, con exactamente dos entradas enteras de igual unidad.
Ambas pertenecen al indicador y son distintas. No cubre tasas, complementos,
tendencias, acumulaciones, variables fijas ni fórmulas arbitrarias. Los ejemplos
130–133 son candidatos a esta operación, sujetos a configuración explícita.

Reglas: conteos enteros no negativos hasta 9007199254740991; `N <= D`.
Con `N = D = 0`, valor y color son null, con motivo DENOMINADOR_CERO: no equivale
a incumplimiento gris, rojo ni cero. Con total positivo, cero sí es un valor válido.
Umbrales finitos entre 0 y 100, amarillo estrictamente menor que verde. Rojo bajo
amarillo; amarillo desde su umbral hasta antes del verde; verde desde su umbral.
La simulación compara productos decimales antes de redondear y presenta cuatro
decimales. Usa decimal.js ya instalado, con precisión local de 40 dígitos.

El ejemplo 130 conserva sus parámetros fuente: amarillo desde 75 %, verde desde
90 %, mensual, no acumulable. Los valores 75/90 se expresan en porcentaje, no
como los valores internos 0.75/0.9 del Excel. Las asignaciones confirmadas por el
usuario prevalecen sobre la denominación documental «Servicios Públicos Municipales».
No se modifica por ello la ficha original ni se crea una dependencia automáticamente.

## Persistencia y versiones

SQL 007 prepara una sola tabla: `metodologias_indicador`. Conserva una versión
consecutiva por indicador, operación soportada, IDs de operandos, umbrales y un
snapshot de frecuencia, unidad, sentido, acumulación, versión de variables,
definiciones y responsables. Actor y fecha quedan registrados. Las versiones
se añaden: no se exponen edición ni eliminación de una versión guardada.

Solo se guarda en fichas inactivas; se comprueban versión esperada de metodología,
versión de variables, compatibilidad y responsables activos si están asignados.
Se puede preparar una regla con asignaciones pendientes. Cambiar variables o
responsables obliga a conservar un snapshot nuevo antes de una futura activación.
Guardar sin cambios no genera versión ni evento.

Guardado y auditoría son una transacción; se bloquea el indicador para serializar
guardados y cambios de variables. SQL 007 amplía únicamente el CHECK de entidades
auditables para incluir metodologías, sin eliminar eventos anteriores.

Una versión preparada no es una versión vigente. No hay fechas inventadas,
primer periodo exigible, selección automática de reglas históricas ni publicación.
La activación futura deberá fijar su versión, periodo y asignaciones aplicables.

## API

Rutas relativas a `/api/v1`; solo Administrador, sesión, no-store; escrituras y
simulación requieren Origin y CSRF. IDs como cadenas. Cuerpos limitados a 8 KiB.

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/administracion/indicadores/{id}/metodologia` | `{indicadorId, version, metodologias}`, versiones descendentes. |
| PUT | `/administracion/indicadores/{id}/metodologia` | `{version, versionVariables, regla}`; devuelve configuración confirmada. |
| POST | `/administracion/indicadores/{id}/metodologia/simular` | `{versionVariables, regla, numerador, denominador}`; devuelve `{valor, semaforo, motivo}`, sin escrituras. |

Regla: `{tipo: 'porcentaje_parte_total', numeradorId, denominadorId,
amarilloDesde, verdeDesde}`. 409 por versiones obsoletas/indicador activo; 422 por
regla, operandos o contexto incompatible; 404 si no existe; 503 si falta configuración
de PostgreSQL/tablas. Un conflicto o fallo de red conserva el formulario; recargar
descarta cambios solo mediante acción explícita. Una recarga fallida bloquea guardado
y simulación para no usar contexto viejo. Cambiar parámetros borra la prueba anterior.

## Comprobaciones y aplicación

Pruebas sintéticas: cuatro perfiles, CSRF/Origin, fronteras y cero, precisión,
operandos ajenos, responsables inactivos, concurrencia mediante versiones, versiones
sin cambios, auditoría/rollback y formulario. Integración PostgreSQL preparada en
`metodologia.integration.test.mjs`: SQL 001/002/005/006/007 en esquema temporal,
reglas sucesivas, concurrencia, fallos de auditoría, snapshots y lectura tras
reconectar. No debe ejecutarse sin autorización de la base concreta.

**Aplicación autorizada el 10/11/2026:** SQL 007 aplicado únicamente en SIIP local,
localhost:5432/public, después de aprobar la integración real en esquema temporal
aislado, ya eliminado. El usuario autorizó también crear DGSM si no existía, asignar
N/D y guardar la regla con el Administrador activo ID 1. No se modificaron cuentas
ni se crearon capturas/publicaciones.

Se creó la dependencia ID 3, clave DGSM, nombre Dirección General de Servicios
Municipales. Indicador 130 (ID 1): N ID 1 y D ID 2 asignadas a DGSM; versión de
variables 2. Metodología ID 1, versión 1, amarillo desde 75 %, verde desde 90 %,
mensual, no acumulable, sin vigencia y con el indicador inactivo. La simulación
comprobó 74/100 rojo, 75/100 amarillo, 90/100 verde y 0/0 sin dato/color.
No asumir aplicación en otras bases ni que cambiar de rama aísla la BD.
[Constancia](../../QA-final-2026-11-09/metodologia/sql-007-aplicado.json).

Comprobación previa a PostgreSQL: 56 pruebas frontend y 69 backend aprobadas;
las integraciones PostgreSQL se excluyeron de esta pasada. Compilaciones correctas,
con el aviso conocido del chunk de gráficas >500 kB. Recorrido real de navegador
con repositorios sintéticos aprobado: asignación, simulación sin escritura, cero,
prueba obsoleta, guardado/recarga, historial, conflicto conservando cambios y cuatro
perfiles; sin errores JavaScript ni desbordamiento a 1440/768/390/320 px.
La integración específica PostgreSQL también pasó: versiones, concurrencia,
rollback de auditoría, snapshots y persistencia al reconectar. No se comprobaron
dispositivos físicos.
[Evidencia](../../QA-final-2026-11-09/metodologia/resultado.json).
