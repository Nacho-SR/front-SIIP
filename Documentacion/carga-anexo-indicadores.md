# Carga técnica del anexo — 20/11/2026

DEC-046: el usuario solicita subir todos los indicadores del archivo local
`Anexo 3_4 SIIP Sist(2).xlsx`. Es una carga técnica inicial del catálogo documental,
sin añadir una pantalla o API de importación al MVP (DEC-023).

## Fuente y validación previa

Se utiliza la versión guardada en disco, sin modificar el libro abierto en Excel.
Hoja IPSM: 63 fichas, 63 claves únicas, ocho agrupaciones y 54 familias; las claves
coinciden con las 63 reservadas del catálogo de referencia. SHA-256 de la versión
revisada: `6c4575cb0b9b5e128f77f016106499e275603ce7747fdfc428d1c7465f6c7498`.

Las 63 fichas cumplen `createIndicatorSchema`. Se conserva la información documental
del Excel: 33 campos, incluyendo fórmulas, variables, semáforos, responsables como
texto, ceros, ausencias/«Por definir» y desagregación de origen. Las ocho fichas que
dicen Colonia conservan ese antecedente; no habilitan captura submunicipal.

- Se interpretan 53 celdas porcentuales según su formato de Excel (0 % o 0.00 %),
  no según el tamaño del número. Ejemplos: 0.2 → 20 %, 1 → 100 %, y la línea base
  0.073899999999999993 → 7.39 % mediante su formato 0.00 %. Los números generales
  no se multiplican por 100 ni se cambian los textos que ya contienen unidades.
- Se normaliza únicamente la frecuencia «trimestral» a «Trimestral», en la fila 54,
  clave SIIP.07.F45.002. Distribución final: 6 mensuales, 35 trimestrales,
  16 semestrales y 6 anuales.
- El consecutivo de origen «39 B» de SIIP.02.F14.001 se conserva como procedencia.
  Los consecutivos de SIIP continúan siendo internos, generados por PostgreSQL;
  no se sobrescriben IDs ni se reinician secuencias para imitar la numeración Excel.
- Cantidad de dependencias y Combo son auxiliares del libro. No generan relaciones,
  dependencias, usuarios ni permisos. No se deducen asignaciones de la ficha textual.

## Comportamiento preparado

Carga de hasta 63 fichas nuevas, inactivas, en una sola transacción. Cada alta tiene
auditoría con el Administrador activo ID 1 y procedencia: archivo, hash, hoja, fila
y consecutivo originales. No se crean variables operativas, metodologías,
activaciones, periodos, capturas, evidencias ni publicaciones.

Se comprueban todas las fichas existentes y catálogos antes de insertar. Las claves
idénticas se conservan sin nuevo evento; cualquier diferencia o clasificación
ausente/inactiva detiene la carga completa. Se conservan también los cuatro ejemplos
130–133 y el estado/configuración del ejemplo 130. Una repetición no duplica fichas.
Un fallo de auditoría revierte todas las altas del lote.

La carga técnica se limita a las 63 claves reservadas. El POST normal continúa
rechazándolas. Se permite editar por la API una ficha base ya persistida conservando
su propia clave; otra ficha no puede apropiarse de esa clave y siguen vigentes las
restricciones metodológicas para indicadores activos.

## Estado

El usuario autorizó la prueba aislada y la carga el 20/11/2026. Aplicado únicamente
en SIIP local, localhost:5432/public, con el Administrador activo ID 1. Se crearon
63 fichas inactivas, sin conflictos ni fichas base preexistentes. Total de indicadores:
4 → 67. IDs nuevos 5–67 y consecutivos internos 134–196; los consecutivos originales
se conservaron en la procedencia auditada. No se reiniciaron secuencias.

La prueba real pasó en un esquema temporal ya eliminado: carga de 63 fichas,
reversión de todo el lote por fallo de auditoría, repetición sin duplicados/eventos
extra y conservación de los cuatro ejemplos. La repetición en public confirmó
63 fichas idénticas y cero nuevas inserciones. Se contrastaron los 33 campos de
cada ficha y se comprobó que cada registro anterior permaneciera íntegro.

Las 11 pruebas de alta, permisos, repositorio y edición de claves base pasaron;
comprobación TypeScript y compilación correctas. No se modificó el frontend.
[Constancia de carga](../../QA-final-2026-11-09/carga-anexo-2026-11-20/resultado-carga.json).

La carga se detiene si el archivo cambia respecto del hash revisado. El libro
original y su archivo temporal de Excel no se modificaron. No asumir que esta
carga está aplicada en otras bases ni que un cambio de rama aísla SIIP local.
