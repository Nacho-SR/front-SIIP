# Impacto de la API sobre el borrador de datos

Versión 0.1 · 26/10/2026 · Evaluación documental. El modelo de 13 tablas, las decisiones y el alcance originales NO se modifican en esta tarea. Ninguna recomendación se convierte en aprobación.

Actualización técnica del 27/10/2026: DEC-027 confirma Node.js + TypeScript; [arquitectura-tecnologica.md](arquitectura-tecnologica.md) define el stack vigente y las propuestas de operación. Se corrigen referencias al backend sin alterar el modelo ni los contratos OpenAPI.

## 1. Conclusión

**Actualización de requisitos — 30/10/2026, DEC-031..034:** se confirman regla conservada en revisión y regla del periodo para atrasos/reaperturas, envío por dependencia, validación conjunta y corrección solo de la aportación necesaria. El diseño anterior que exige envíos nuevos de todas las dependencias en cada ciclo debe revisarse: se propone referenciar versiones revisadas anteriores para entradas sin cambios. Es análisis de impacto, no un ajuste ya aprobado del esquema ni del OpenAPI. DEC-033 confirma periodos naturales, captura desde registro con asignación, zona America/Mexico_City y validación/publicación al cierre o después. No se añade bimestral. Quedan pendientes la cobertura inicial de altas intermedias y periodos anteriores al alta; Supabase Storage es la dirección elegida para evidencias. Convertir aportaciones de una misma variable en variables distintas sigue siendo una propuesta por evaluar, sin aprobar agregación automática.

El recorrido de dominio propuesto cabe en las 13 tablas sin nuevas entidades de negocio: autenticación usa usuarios y un mecanismo técnico de sesión; envío/revisión/validación usan expedientes, capturas, valores, evidencias y eventos. Los resultados son una proyección del mayor ciclo validado por periodo. La API no se implementa ni el esquema se ejecuta para comprobarlo.

La conclusión es condicional: el modelo no resuelve por sí solo la unidad multidependencia, calendario, reasignaciones, variables fijas o vigencias. La autenticación necesita elegir un almacén técnico de sesiones; no se declara existente una tabla que el borrador no tiene.

## 2. Trazabilidad por recurso

| Recurso / operaciones | Tablas utilizadas | Condición o detalle |
|---|---|---|
| Sesión y usuario | usuarios, dependencias | Cookie/sesiones del framework como propuesta; almacén técnico fuera del esquema de negocio. |
| Indicadores, ficha y asignados | indicadores, familias, agrupaciones_tematicas, variables_indicador, dependencias | Proyecciones por rol; no exponer JSONB internos ni crear tabla de permisos genéricos. |
| Periodos | indicadores y expedientes_indicador históricos | Generación derivada solo con calendario definido; sin catálogo global de periodos. |
| Expediente / bandeja | expedientes_indicador, capturas y sus relaciones | Un ciclo abierto, filtrado por dependencia, anteriores validados conservados. |
| Envío / corrección | capturas, valores_captura, evidencias, eventos_revision, expedientes_indicador | Operación atómica; estado sustituida conserva los envíos anteriores. |
| Observaciones y revisión | eventos_revision, capturas | responde_a_id registra respuesta y resolución. Sin tabla comentarios o chat. |
| Validación | expedientes_indicador y todos los insumos del ciclo | Copia de configuración, antecedentes, validador/fecha, evento y publicación en una transacción. |
| Resultados / corte temático | expedientes_indicador, indicadores, familias, agrupaciones_tematicas | Mayor ciclo validado del intervalo esperado, sin arrastre. Cálculo bajo demanda propuesto; P-13 pendiente. |
| Reapertura | expedientes_indicador, eventos_revision | Nueva fila con expediente_anterior_id; la anterior no cambia a abierta. |
| Descarga PDF | evidencias → capturas → expediente/indicador | Referencia estable interna; servicio externo no es tabla nueva. |
| Avisos | notificaciones, usuarios, indicadores | Destinatario propio y lectura; canal/proceso de emisión por definir. |
| Administración diferida | Tablas de configuración + auditoria_configuracion | Solo contratos candidatos; edición metodológica depende de vigencia. |

## 3. Ajustes de implementación propuestos sin alterar el diccionario

| ID | Ajuste | ¿Tabla/columna nueva? | Motivo y estado |
|---|---|---|---|
| AJ-API-01 | Comprobar exactamente capturas_revisadas_ids bajo bloqueo de expediente. Toda escritura de sus hijos toma el mismo bloqueo. | No | Detecta cambios entre lectura y validación sin inventar un contador de versión. Propuesta técnica. |
| AJ-API-02 | Añadir UNIQUE parcial en expediente_anterior_id cuando no es null. | No; índice propuesto | Refuerza como máximo un sucesor por ciclo, que el borrador dejaba al backend. Numeración/estado del predecesor siguen comprobados transaccionalmente. |
| AJ-API-03 | Resolver observaciones mediante eventos resolver_observacion enlazados al evento observar. | No | Contar observaciones sin resolución en todo el ciclo/dependencia, incluidas las de envíos sustituidos. No depender de un booleano resuelta inexistente. |
| AJ-API-04 | Autorizar con ámbito de usuario y asignación aplicada; serializar únicamente lo visible. | No | Un expediente compartido no autoriza PDF/valores ajenos. Reasignaciones ambiguas se bloquean hasta decidir política. |
| AJ-API-05 | Recibir PDF junto al envío completo y transmitirlo por descarga autenticada. | No | Evita staging persistente o tabla de uploads. Cambia la recomendación anterior de enlace temporal por alternativa streaming, todavía por revisar. |
| AJ-API-06 | IDs y decimales como cadenas en JSON; convertirlos de forma validada en el límite del backend. | No | Evita pérdida de precisión de bigint/numeric en el cliente; no cambia sus tipos PostgreSQL. |
| AJ-API-07 | Lista paginada de publicaciones y proyecciones de eventos. | No | No duplicar tablas para cada respuesta o módulo. |

No se añade una tabla de validaciones, publicaciones, revisiones, sesiones de negocio, archivos temporales o permisos por haber endpoints con esos nombres.

## 4. Límites que requieren decisión

### Autenticación técnica

Se propone sesión opaca revocable y cookie segura con CSRF. La tabla usuarios no basta para almacenar sesiones revocables: se requiere un almacén persistente compatible con el framework Node.js que se elija. No se presupone un almacén de archivos estándar ni memoria de proceso en producción. Si se propone tabla técnica de sesiones, se registra y justifica aparte; no se oculta dentro de las 13 entidades ni se fuerza un JWT sin revocación. Node.js + TypeScript está confirmado en DEC-027; autenticación, framework y almacén siguen por revisar.

### Escritura y multidependencia

Los contratos de envío, corrección, validación y reapertura llevan marca condicionada. El diseño por dependencia/validación conjunta es PROP-BD-003, no requisito aprobado. El primer recorrido se puede revisar con una dependencia y configuración explícita; la puesta en operación requiere aprobar ese flujo. Los indicadores SIIP.02.F13.002 y SIIP.02.F16.002 siguen bloqueados en su modalidad conflictiva hasta respuesta del cliente, sin autorizar consolidación de una misma variable.

### Calendario, reglas y variables fijas

P-07/P-12 impiden afirmar que un periodo desconocido está habilitado o atrasado. P-08 impide seleccionar automáticamente una configuración histórica o nueva ante un cambio metodológico. Guardar configuracion_aplicada no resuelve su selección temporal. Los endpoints no reciben un parámetro recalcular_historia que el cliente no aprobó.

La reutilización automática de variables fijas podría exigir valores_referencia_variable y FK de origen según la extensión ya prevista; no se incorpora hasta definirlas. Los valores utilizados ya se conservan por captura.

### Cobertura y temática

La API distingue N evaluables, total configurado y denominador Y pendiente. No expone X/Y con un Y inventado. Pesos y límites del índice están aprobados; color con cobertura parcial y N pequeño no. Las fuentes faltantes no se vuelven rojas ni usan publicaciones de otros periodos. No se incorporan tablas de snapshots sin resolver P-13.

### Archivos, reportes y notificaciones

El modelo guarda referencias PDF, pero proveedor, máximos, retención y política de limpieza/backup siguen pendientes. La carga externa no se integra mediante transacciones distribuidas. Reportes están en alcance pero no tienen formato contratado; no se crea un sistema de jobs. La lectura de notificaciones cabe en su tabla; no se afirma que exista un canal de correo o un scheduler configurado.

## 5. Contradicciones de integración fuera del esquema

- auth.store.ts declara seguimiento y consulta; contrato exige revision y tres roles. router/index.ts concede acciones de Captura/Revisión a Administrador: debe corregirse después de aprobar contratos.
- core/api.ts envía Bearer y cierra sesión tanto con 401 como con 403. Cookie/CSRF requerirá adaptar transporte; 403 no es sesión expirada. No se modifica ese código ahora.
- Modelo y catálogo propuestos no son DDL ni backend existente. Los archivos se movieron a SIIP-code/Documentacion y hay un ERD v02 adicional; no se presume que ese artefacto apruebe el modelo Markdown ni cambios de negocio.

## 6. Revisión necesaria antes de implementar

1. Aprobar el primer recorrido y representación de captura/expediente, junto con las asignaciones del indicador elegido.
2. Con Node.js + TypeScript confirmado, elegir framework, autenticación/almacén de sesión y configuración HTTPS/orígenes. Seguir la estrategia propuesta de entornos de arquitectura.
3. Cerrar calendario y regla individual para ese indicador; fijar límites y servicio PDF.
4. Implementar en orden P0 del [catálogo](catalogo-endpoints.md), con pruebas de acceso por objeto y transacciones; después observaciones/corrección y reapertura.
5. Confirmar multidependencia, cobertura y vigencias antes de habilitar lo condicionado. El YAML validado técnicamente no concede aprobación de negocio.

El registro de contradicciones completo está en [flujos-negocio.md](flujos-negocio.md); la autorización en [matriz-permisos.md](matriz-permisos.md). Las cinco entregas de esta tarea no modifican las decisiones ni el esquema original.

## 7. Verificación de esta entrega

Se validó la estructura OpenAPI 3.1.1 con openapi-spec-validator y los esquemas/ejemplos con JSON Schema 2020-12. El contrato contiene 21 operaciones (15 P0 y 6 P1), 42 esquemas reutilizables y ejemplos de ciclo validado, valor sin color, corte mixto mensual/trimestral/semestral/anual, ausencia de resultado sin arrastre y calendario pendiente.

Las comprobaciones negativas incluyen rechazo de dependencia enviada por cliente, ID numérico en lugar de cadena, NaN, precisión decimal excesiva, IDs repetidos en validación, color enviado por cliente, resultado sin color y sin motivo, e índice con cero evaluables. Se verifican también parámetros de ruta, anotaciones de roles, CSRF en escrituras, referencias locales y correspondencia catálogo/OpenAPI.

Los validadores y el constructor documental se ejecutan desde almacenamiento temporal fuera del repositorio; no se añadieron dependencias al proyecto. Estas son comprobaciones del contrato, no pruebas de un servidor ni garantías de autorización o transacciones ya implementadas. No se ejecutaron migraciones y no se modificaron backend/frontend ni el modelo original.
