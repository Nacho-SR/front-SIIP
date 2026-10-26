# Borrador del modelo PostgreSQL del SIIP

**Versión:** 0.1. **Fecha:** 23/10/2026. **Estado:** propuesta técnica para revisión, sin aprobación del esquema ni migraciones ejecutadas.

Este documento propone 13 tablas para operar el MVP con integridad, revisión, resultados publicados e historia. Separa lo confirmado de los detalles de implementación que todavía requieren revisión. La cantidad de tablas no constituye una restricción de negocio.

## 1. Fuentes y clasificación

- **Confirmado por el equipo:** DEC-001..025 de [decisiones-siip.md](decisiones-siip.md). PostgreSQL, 63 indicadores iniciales, 8 agrupaciones, familias, captura municipal, tres roles exclusivos, sin borradores ni fechas límite bloqueantes, publicación tras validación y conservación de la publicación durante reapertura.
- **Confirmado por el equipo:** pesos temáticos 1/0.5/0 y umbrales 0.80/0.50, consulta histórica de publicaciones actuales, PDF como evidencia y ausencia de importación.
- **Pendiente de cliente:** asignaciones por variable, variables fijas y sus vigencias, primer periodo exigible y conciliación multidependencia de `SIIP.02.F13.002` y `SIIP.02.F16.002`. También siguen abiertos cobertura, política de cambios de reglas y detalles documentados en [pendientes-siip.md](pendientes-siip.md).
- **Recomendación técnica:** todas las tablas, columnas, tipos, claves, estados, índices y algoritmos de operación de este borrador. La unidad de envío por dependencia y validación conjunta NO se considera aprobada.
- **Fuera de MVP:** importación, chat, captura por colonia/localidad/UGAT, varias dependencias sobre una misma variable según DEC-002 vigente, fórmulas arbitrarias, permisos genéricos y arquitectura distribuida.

Fuentes inspeccionadas: `modelo_base_de_datos/Diagrama 2drawio.html`, `documentacion/Anexo 3_4 SIIP Sist(2).xlsx` (IPSM), `documentacion/A. SIIP Sist - Fórmulas y captura VF.xlsx`, `documentacion/05 Arquitectura del sistema.docx` y el alcance Word v0.2. Los acuerdos posteriores están en Markdown y en [alcance-mvp.md](alcance-mvp.md). El consultor y el Excel auxiliar no sustituyen decisiones confirmadas.

El anexo contiene 63 códigos únicos, 54 familias con un solo padre, 6 indicadores mensuales, 35 trimestrales, 16 semestrales y 6 anuales. Se verificaron 6 metas y 55 líneas base sin definir; cero es un valor válido.

## 2. Convenciones

- `NN`: NOT NULL. `NULL`: ausencia permitida; nunca equivale automáticamente a cero.
- Cada `id` es `bigint GENERATED ALWAYS AS IDENTITY`, PK y NN, salvo la PK compuesta de `valores_captura`.
- FK: clave foránea. Las tablas usadas históricamente no se eliminan en cascada; se desactivan cuando corresponda.
- `numeric(24,8)` para entradas y resultados, evitando coma flotante. Los límites y el redondeo de presentación se comprueban por indicador. Solo se admiten números finitos.
- `date` para periodos; ambos extremos son inclusivos. `timestamptz` para acciones; la zona horaria de operación aún debe formalizarse. No usar la zona del servidor como regla implícita.
- `creado_en` y fechas automáticas usan `DEFAULT now()` cuando se indique. No hay un `updated_at` universal: en configuración la auditoría registra cambios; los valores enviados conservan versiones.
- Los ENUM siguientes son nombres propuestos, no tipos ya existentes en una BD. No necesitan tablas de catálogo independientes.
- Las filas de configuración pueden existir incompletas; eso no autoriza capturas incompletas ni la operación de un indicador sin configuración suficiente.

### Dominios propuestos

| Tipo PostgreSQL propuesto | Valores |
|---|---|
| `rol_usuario` | `captura`, `revision`, `administrador` |
| `periodicidad_indicador` | `mensual`, `trimestral`, `semestral`, `anual` |
| `sentido_indicador` | `ascendente`, `descendente`, `mantenimiento`, `constante` |
| `tipo_calculo_indicador` | `directo`, `cociente`, `variacion`, `complemento`, `suma` |
| `papel_variable` | `entrada`, `numerador`, `denominador`, `actual`, `anterior`, `base`, `parte`, `sumando` |
| `tipo_dato_variable` | `entero`, `decimal` |
| `estado_expediente` | `abierto`, `validado` |
| `estado_captura` | `en_revision`, `observada`, `revisada`, `sustituida` |
| `color_semaforo` | `verde`, `amarillo`, `rojo` |

Son estados técnicos propuestos. Las acciones revisar y validar permanecen separadas aunque las realice el mismo rol. El tipo de regla individual usa un código `varchar(60)` validado contra las implementaciones disponibles, porque su lista todavía debe verificarse ficha por ficha.

## 3. Diccionario de entidades

### 3.1 agrupaciones_tematicas

Representa un ámbito temático y permite organizar las familias. Conserva las ocho agrupaciones iniciales sin fijar ese número mediante una restricción.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador interno. |
| `codigo` | `varchar(40)` | NN, UNIQUE | Código estable de agrupación. |
| `nombre` | `text` | NN, no vacío | Nombre de la agrupación. |
| `activo` | `boolean` | NN, DEFAULT true | Permite desactivar sin borrar historia. |

Relación: una agrupación tiene cero o muchas familias; cada familia tiene exactamente una agrupación.

### 3.2 familias

Representa una familia de indicadores dentro de una agrupación.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador interno. |
| `agrupacion_id` | `bigint` | NN, FK → agrupaciones_tematicas.id | Único padre. |
| `codigo` | `varchar(40)` | NN, UNIQUE | Código estable, p. ej. F01. |
| `nombre` | `text` | NN, no vacío | Nombre de familia. |
| `activo` | `boolean` | NN, DEFAULT true | Desactivación conservando referencias. |

No se duplica `agrupacion_id` en indicadores. La agrupación se consulta mediante la familia. La unicidad global de código coincide con las 54 familias observadas; revisar si se modifica la convención de códigos.

### 3.3 dependencias

Catálogo de dependencias responsables de aportar información. No se crean automáticamente 26 dependencias a partir de las denominaciones sin depurar del Excel.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador interno. |
| `clave` | `varchar(40)` | NN, UNIQUE | Clave normalizada. |
| `nombre` | `text` | NN, no vacío | Denominación acordada. |
| `activo` | `boolean` | NN, DEFAULT true | Desactivación sin borrar capturas. |

Una dependencia puede tener muchos usuarios históricos y muchas variables asignadas. Se propone como máximo un usuario activo de Captura por dependencia.

### 3.4 usuarios

Cuenta autenticada con un solo rol. La pertenencia actual no sustituye la dependencia y el rol que se conservaron en las acciones históricas.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador interno. |
| `dependencia_id` | `bigint` | NULL; FK → dependencias.id | Obligatoria para rol Captura mediante CHECK. |
| `nombre` | `text` | NN, no vacío | Nombre mostrado. |
| `correo` | `varchar(255)` | NN, no vacío | Unicidad sobre `lower(trim(correo))`. |
| `password_hash` | `text` | NN | Hash creado por el mecanismo de autenticación; nunca contraseña original. |
| `rol` | `rol_usuario` | NN | Un único rol. |
| `activo` | `boolean` | NN, DEFAULT true | Impide nuevos accesos; no elimina acciones. |
| `creado_en` | `timestamptz` | NN, DEFAULT now() | Alta de cuenta. |

Índice único parcial propuesto sobre `dependencia_id` donde `rol='captura' AND activo`. Una FK a usuario no garantiza por sí sola su rol: las acciones autorizadas se verifican en backend. Desactivar una cuenta no vuelve inválida una captura anterior.

### 3.5 indicadores

Ficha técnica y configuración actual. La información documental conserva el origen; los campos de cálculo controlan únicamente operaciones soportadas. La configuración aplicada a un expediente se copia para auditoría.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador interno. |
| `familia_id` | `bigint` | NN, FK → familias.id | Única familia. |
| `codigo` | `varchar(60)` | NN, UNIQUE | Código oficial del indicador, antes `id_`. |
| `nombre` | `text` | NN, no vacío | Denominación de ficha. |
| `definicion` | `text` | NULL | Definición documental. |
| `objetivo` | `text` | NULL | Objetivo de ficha. |
| `ipsm_origen` | `varchar(8)` | NULL | Marca IPSM original; sin usarla como permiso. |
| `nivel_objetivo` | `text` | NULL | Clasificación documental. |
| `tipo_indicador` | `text` | NULL | Tipología original. |
| `ambito_desempeno` | `text` | NULL | Ámbito de desempeño. |
| `dimension_desempeno` | `text` | NULL | Dimensión de desempeño. |
| `transversalidad` | `text` | NULL | Transversalidad de ficha. |
| `funcion_indicador` | `text` | NULL | Función del indicador. |
| `procedencia` | `text` | NULL | Origen del indicador. |
| `ids_origen` | `text` | NULL | Identificadores en fuentes originales; no FK operativa. |
| `justificacion` | `text` | NULL | Justificación de ficha. |
| `formula_texto` | `text` | NULL hasta configuración | Algoritmo original para consulta; no se ejecuta como código. |
| `unidad_medida` | `text` | NULL hasta configuración | Unidad del resultado. |
| `acumulable` | `boolean` | NULL hasta clasificación | No implica sumar automáticamente periodos. |
| `sentido` | `sentido_indicador` | NULL hasta clasificación | Sentido esperado. |
| `desagregacion_origen` | `text` | NULL | Municipal o Colonia en ficha; captura final siempre municipal. |
| `periodicidad` | `periodicidad_indicador` | NULL hasta configuración | Frecuencia de medición. |
| `primer_periodo_exigible` | `date` | NULL hasta decisión | Inicio del primer periodo exigible; no tiene DEFAULT ficticio. |
| `linea_base` | `numeric(24,8)` | NULL | Ausente si no se ha definido; cero se conserva. |
| `periodo_linea_base` | `text` | NULL | Referencia original, como año o mes/año; no inventa precisión. |
| `medio_verificacion` | `text` | NULL | Respaldo esperado según ficha. |
| `unidad_responsable_texto` | `text` | NULL | Denominación documental; no otorga permisos. |
| `criterio_interpretacion` | `text` | NULL | Interpretación de resultados. |
| `meta` | `numeric(24,8)` | NULL | Valor esperado, con unidad consistente. |
| `anio_meta` | `smallint` | NULL; CHECK entre 1 y 9999 | Las metas observadas tienen año de cumplimiento. |
| `regla_semaforo_texto` | `text` | NULL hasta configuración | Regla original, con sus ambigüedades identificadas. |
| `observaciones_limitaciones` | `text` | NULL | Limitaciones de ficha. |
| `tipo_calculo` | `tipo_calculo_indicador` | NULL hasta configuración | Operación implementada. |
| `factor_calculo` | `numeric(24,8)` | NULL hasta configuración | Factor explícito, como 1, 100, 1000 o 100000; positivo y finito. |
| `tipo_regla_semaforo` | `varchar(60)` | NULL hasta revisión | Código de una regla implementada en backend. |
| `parametros_semaforo` | `jsonb` | NULL hasta revisión | Objeto con parámetros delimitados; no expresiones ejecutables. |
| `activo` | `boolean` | NN, DEFAULT false | Alta inicial como configuración inactiva. |

**Configuración incompleta no es borrador de captura.** Para recibir capturas deben estar definidas las entradas obligatorias, unidades, cálculo y asignaciones. El backend también comprueba que familia/agrupación y dependencias estén habilitadas. Un indicador puede conservar metadatos faltantes que no sean indispensables para calcular; no se inventan metas, líneas base o responsables para activarlo.

Sin primer periodo exigible se suprimen automatismos de atraso/aviso y no se presume su elegibilidad temática. La captura explícita de un intervalo requiere las comprobaciones temporales acordadas. El calendario y apertura exactos siguen pendientes.

No se guardan `cantidad_dependencias`, `combo` ni un `periodo` ambiguo como campos operativos: los participantes se derivan de asignaciones y los periodos están en expedientes. El consecutivo de Excel no sustituye ni al código oficial ni a la PK. La marca auxiliar Territorial no habilita captura submunicipal. El texto Variables se representa con las definiciones de entradas y la fórmula del resultado.

Cambiar frecuencia, pertenencia temática o método con historia existente requiere revisar su impacto histórico. Este borrador conserva la copia aplicada, pero no aprueba una política retroactiva ni habilita cambios silenciosos sobre ciclos abiertos.

### 3.6 variables_indicador

Entrada de un indicador; fusiona las dos tablas de variables del ERD anterior. El resultado calculado no es una entrada capturable.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador de entrada. |
| `indicador_id` | `bigint` | NN, FK → indicadores.id | Indicador propietario. |
| `codigo` | `varchar(80)` | NN, no vacío | Símbolo, p. ej. QP. UNIQUE(indicador_id, codigo). |
| `descripcion` | `text` | NN, no vacía | Nombre/definición de entrada. |
| `unidad_medida` | `text` | NULL hasta configuración | Unidad de la entrada, que puede diferir del resultado. |
| `tipo_dato` | `tipo_dato_variable` | NULL hasta clasificación | Entero para conteos; decimal cuando corresponda. |
| `papel_calculo` | `papel_variable` | NULL hasta configuración | Numerador, denominador u otro operando. |
| `dependencia_id` | `bigint` | NULL hasta respuesta; FK → dependencias.id | Un único responsable de esa entrada en la configuración actual. |
| `obligatoria` | `boolean` | NN, DEFAULT true | Si se exige para el envío; un operando del cálculo siempre es obligatorio. |
| `orden` | `smallint` | NN; CHECK > 0 | Orden de presentación. |
| `activo` | `boolean` | NN, DEFAULT true | Desactivación sin borrar valores anteriores. |

Todas las entradas de las fórmulas actuales pueden modelarse como obligatorias. Se propone unicidad `(indicador_id, papel_calculo)` para variables activas, excepto `sumando`, que permite varias. Cada tipo de cálculo exige el número y los papeles correctos; esta completitud es una validación entre filas del backend.

No se añade asignación directa a usuario por anticipación. Se deriva de dependencia y cuenta activa de Captura; el autor real queda registrado al enviar. Si el cliente exige asignación personal adicional, deberá aprobarse ese ajuste. Las reasignaciones posteriores no reescriben los responsables conservados en ciclos anteriores.

### 3.7 expedientes_indicador

Un expediente corresponde a un indicador, intervalo y ciclo. Agrupa insumos y almacena el resultado de su validación. Se crea en la misma transacción del primer envío completo o por una reapertura administrativa justificada; no sirve para guardar formularios incompletos.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador del ciclo. |
| `indicador_id` | `bigint` | NN, FK → indicadores.id | Indicador evaluado. |
| `periodo_inicio` | `date` | NN | Inicio inclusivo del intervalo. |
| `periodo_fin` | `date` | NN; CHECK >= periodo_inicio | Fin inclusivo. |
| `numero_ciclo` | `integer` | NN; CHECK > 0 | 1 para original; siguiente para reapertura. |
| `expediente_anterior_id` | `bigint` | NULL en ciclo 1; FK al expediente anterior | Origen de una reapertura del mismo indicador y periodo. |
| `estado` | `estado_expediente` | NN, DEFAULT abierto | Abierto o validado. |
| `configuracion_aplicada` | `jsonb` | NN, objeto | Copia del método, unidades, entradas, dependencias, frecuencia, meta y regla utilizados. |
| `antecedentes_aplicados` | `jsonb` | NULL antes de validar; arreglo al validar | Referencias y valores exactos usados para evaluar tendencias. Arreglo vacío si no se requieren. |
| `valor_resultado` | `numeric(24,8)` | NULL mientras abierto; NN al validar | Valor final. No se persiste un resultado preliminar en este campo. |
| `color` | `color_semaforo` | NULL permitido al validar | Falta de antecedentes no equivale a rojo. |
| `motivo_sin_color` | `text` | NULL si hay color; requerido al validar sin color | Explicación identificable de la falta de evaluación. |
| `creado_por` | `bigint` | NN, FK → usuarios.id | Usuario del primer envío o administrador que reabre. |
| `creado_en` | `timestamptz` | NN, DEFAULT now() | Inicio del ciclo. |
| `validado_por` | `bigint` | NULL mientras abierto; FK → usuarios.id | Usuario de rol Revisión que valida. |
| `validado_en` | `timestamptz` | NULL mientras abierto | Momento de publicación automática. |

Restricciones propuestas:

- UNIQUE(indicador_id, periodo_inicio, periodo_fin, numero_ciclo).
- Índice único parcial `(indicador_id, periodo_inicio)` WHERE estado='abierto'. El backend exige un intervalo canónico idéntico en todos los ciclos de ese periodo y asigna el siguiente ciclo bajo bloqueo.
- CHECK: abierto implica resultado/color/motivo/validación/antecedentes NULL; validado implica resultado, validador, fecha y antecedentes presentes. Si validado no tiene color, requiere motivo no vacío; con color, motivo NULL.
- CHECK: ciclo 1 sin predecesor; ciclos posteriores con predecesor, distinto de sí mismo. La secuencia exige por backend un predecesor validado y el siguiente número de ciclo.
- FK compuesta del predecesor por `(expediente_anterior_id, indicador_id, periodo_inicio, periodo_fin)` hacia una clave UNIQUE equivalente del expediente anterior. Evita apuntar a otro indicador o intervalo.
- UNIQUE(id, indicador_id), usada por capturas; UNIQUE(id, indicador_id, periodo_inicio, periodo_fin), usada por el predecesor. Son claves auxiliares de integridad.

La copia de configuración se fija al iniciar el ciclo como recomendación técnica. Una modificación administrativa no la sustituye silenciosamente. Su selección temporal definitiva y el recálculo siguen pendientes de P-08; no se promete reconstruir automáticamente cualquier configuración histórica desde la configuración actual.

El conjunto de antecedentes incluye valor y versión consultados, no solo una referencia a la publicación que sea vigente después. No se usan esos JSONB para sustituir relaciones operativas ni para otorgar permisos.

La estructura de la copia debe ser explícita y validada por backend: versión del formato; identidad/ficha y familia/agrupación; periodicidad; lista de variables con ID, símbolo, unidad, tipo de dato, papel y dependencia; tipo/factor de cálculo y versión de su implementación; regla/parámetros y versión de su implementación; meta y línea base utilizadas. No contiene secretos. `antecedentes_aplicados` guarda los expedientes/periodos consultados, valores usados y ausencias relevantes para explicar un color o su falta. Conservar la versión de implementación permite identificar qué código produjo el resultado; no constituye un motor genérico de versiones.

### 3.8 capturas

Un envío completo por dependencia y ciclo es la unidad técnica propuesta, condicionada a la aprobación del flujo multidependencia.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador de envío. |
| `expediente_id` | `bigint` | NN | Ciclo propietario. |
| `indicador_id` | `bigint` | NN | Clave de ámbito para las FK compuestas; no elección independiente. |
| `dependencia_id` | `bigint` | NN, FK → dependencias.id | Aportante conservado históricamente. |
| `capturista_id` | `bigint` | NN, FK → usuarios.id | Autor real del envío. |
| `numero_envio` | `integer` | NN; CHECK > 0 | Consecutivo dentro de dependencia y expediente. |
| `estado` | `estado_captura` | NN, DEFAULT en_revision | Situación del envío. |
| `descripcion_avance` | `text` | NN, no vacía | Contexto del periodo. |
| `observaciones_captura` | `text` | NULL | Aclaraciones del capturista, separadas de revisión. |
| `enviada_en` | `timestamptz` | NN, DEFAULT now() | Fecha del envío completo. |

FK `(expediente_id, indicador_id)` → expedientes_indicador(id, indicador_id). UNIQUE(id, indicador_id) para valores y UNIQUE(id, expediente_id) para eventos. UNIQUE(expediente_id, dependencia_id, numero_envio). Índice único parcial `(expediente_id, dependencia_id)` WHERE estado <> 'sustituida'.

Una corrección crea otra captura y marca la anterior sustituida en una misma transacción. Se conservan sus valores y PDF; solo cambian el estado y los eventos autorizados. No se copian valores en nombre de un autor sin un nuevo envío real.

El backend comprueba cuenta activa, rol, dependencia al momento de enviar y asignaciones aplicadas al ciclo. No se exige que la pertenencia actual del usuario siga coincidiendo eternamente con una captura histórica. La revisión de un envío no publica por sí sola el indicador.

### 3.9 valores_captura

Un valor numérico por variable y envío. Copia el dato realmente utilizado, también si en el futuro procede de una referencia fija.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `captura_id` | `bigint` | NN, parte de PK | Envío propietario. |
| `variable_id` | `bigint` | NN, parte de PK | Entrada reportada. |
| `indicador_id` | `bigint` | NN | Ámbito comprobado por FK compuestas. |
| `valor` | `numeric(24,8)` | NN, finito | Dato real; nunca DEFAULT 0 para faltantes. |

PK(captura_id, variable_id). FK `(captura_id, indicador_id)` → capturas(id, indicador_id). FK `(variable_id, indicador_id)` → variables_indicador(id, indicador_id), que requiere UNIQUE(id, indicador_id) en variables.

El backend comprueba unidad, tipo entero/decimal, rangos acordados, responsable aplicado y completitud. El conjunto de valores solo se inserta junto con la captura completa. Se usa la definición aplicada al ciclo, no una reasignación posterior de la variable. Una variable con datos históricos no cambia de indicador propietario.

### 3.10 eventos_revision

Bitácora cronológica y hilo de observaciones. No es chat. Las observaciones conservan su autor, rol, fecha, objeto y relación con respuestas.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador de evento. |
| `expediente_id` | `bigint` | NN, FK → expedientes_indicador.id | Ciclo del hilo. |
| `captura_id` | `bigint` | NULL | Envío afectado, si aplica. |
| `autor_id` | `bigint` | NN, FK → usuarios.id | Actor real. |
| `rol_al_actuar` | `rol_usuario` | NN | Copia del rol, no obtenida del perfil actual al consultar historia. |
| `dependencia_al_actuar_id` | `bigint` | NULL, FK → dependencias.id | Dependencia del actor en ese momento. |
| `accion` | `varchar(40)` | NN, CHECK de lista | Acción definida abajo. |
| `estado_anterior` | `varchar(20)` | NULL | Estado del objeto al que apunta la acción. |
| `estado_nuevo` | `varchar(20)` | NULL | Nuevo estado de ese mismo objeto. |
| `comentario` | `text` | NULL según acción | Obligatorio y no vacío al observar, responder o reabrir. |
| `responde_a_id` | `bigint` | NULL | Evento original de respuesta o resolución. |
| `creado_en` | `timestamptz` | NN, DEFAULT now() | Fecha y hora. |

Lista inicial propuesta: `enviar`, `revisar`, `observar`, `responder`, `reenviar`, `resolver_observacion`, `validar`, `reabrir`. Con captura se documentan estados de captura; sin captura se documentan estados de expediente. El backend comprueba la pareja acción/objeto/estados.

FK `(captura_id, expediente_id)` → capturas(id, expediente_id), y FK `(responde_a_id, expediente_id)` → eventos_revision(id, expediente_id), con UNIQUE(id, expediente_id). Una respuesta no apunta a otro ciclo. Se comprueba por backend que responde a un evento anterior y que Revisión es quien resuelve una observación.

`reabrir` se registra en el nuevo ciclo y referencia el predecesor mediante el expediente; no se añade conversación a un hilo validado y cerrado. Los eventos son de solo adición: no se borran ni reescriben para corregir la historia.

### 3.11 evidencias

PDF de respaldo asociado al envío concreto, no únicamente al indicador. Permite uno o varios por captura; la cantidad máxima queda pendiente.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador de evidencia. |
| `captura_id` | `bigint` | NN, FK → capturas.id | Envío respaldado. |
| `clave_almacenamiento` | `text` | NN, UNIQUE | Clave estable del objeto en el servicio configurado. |
| `nombre_original` | `text` | NN, no vacío | Nombre presentado al usuario. |
| `mime_type` | `varchar(100)` | NN, CHECK = application/pdf | Tipo comprobado por servidor. |
| `tamano_bytes` | `bigint` | NN, CHECK > 0 | Tamaño comprobado. |
| `sha256` | `char(64)` | NN, CHECK hexadecimal | Hash calculado por servidor para identificar el contenido. No es UNIQUE. |
| `subida_en` | `timestamptz` | NN, DEFAULT now() | Registro de la evidencia. |

**Recomendación técnica, proveedor pendiente:** almacenamiento privado externo. El contenedor/proveedor único se configura en backend; no se construye un catálogo de proveedores. El API genera una URL temporal después de comprobar acceso a la captura. No se persisten tokens, URLs firmadas ni credenciales.

Se valida contenido PDF y límite de tamaño, no solo extensión/MIME declarado. No se sobreescribe el objeto de una evidencia enviada. Un nuevo archivo usa otra clave. El PDF puede incluir el desglose por colonia como respaldo sin añadir captura territorial.

La carga externa y la transacción PostgreSQL no son una sola transacción distribuida. Primero se verifica una carga temporal del usuario y después se guarda captura/valores/evidencias/evento de forma atómica en BD. Si falla la BD, el objeto no asociado se limpia según una política de temporales; no se registra una captura incompleta. La retención y el respaldo de PDF deben acompañar a los respaldos de BD.

### 3.12 auditoria_configuracion

Registra cambios administrativos; no sustituye el hilo de revisión ni sirve para reconstruir automáticamente todo el estado de la aplicación.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador de evento administrativo. |
| `actor_id` | `bigint` | NN, FK → usuarios.id | Usuario que autoriza la acción. |
| `entidad` | `varchar(40)` | NN, CHECK de lista | usuarios, dependencias, agrupaciones_tematicas, familias, indicadores o variables_indicador. |
| `registro_id` | `bigint` | NN | Identificador del objeto auditado. |
| `accion` | `varchar(30)` | NN, CHECK de lista | crear, modificar, activar o desactivar. |
| `antes` | `jsonb` | NULL al crear | Valores relevantes anteriores. |
| `despues` | `jsonb` | NN, objeto | Nuevos valores relevantes. |
| `creado_en` | `timestamptz` | NN, DEFAULT now() | Momento del cambio. |

`registro_id` es un localizador de auditoría y NO una FK genérica a seis tablas. Se conserva junto a los datos anteriores/nuevos. Las relaciones operativas sí usan FK específicas. No se agregan seis FK opcionales para esta bitácora.

No se copian `password_hash`, contraseñas, tokens, enlaces firmados ni secretos a `antes`/`despues`. El backend conserva actor, objeto y tipo de cambio de seguridad sin duplicar material sensible. La aplicación no ofrece edición ni borrado ordinario de esta tabla.

### 3.13 notificaciones

Persistencia mínima propuesta para avisos dentro del sistema. Canales externos, destinatarios exactos y disparadores adicionales siguen pendientes. No se supone correo electrónico aprobado.

| Campo | Tipo | Nulabilidad / regla | Significado |
|---|---|---|---|
| `id` | `bigint identity` | PK, NN | Identificador del aviso. |
| `usuario_id` | `bigint` | NN, FK → usuarios.id | Destinatario. |
| `indicador_id` | `bigint` | NN, FK → indicadores.id | Indicador relacionado. |
| `periodo_inicio` | `date` | NN | Periodo al que corresponde el aviso. |
| `periodo_fin` | `date` | NN, CHECK >= periodo_inicio | Fin del periodo. |
| `tipo` | `varchar(40)` | NN, validado por backend | Tipo delimitado, como aviso preventivo, pendiente u observación. |
| `mensaje` | `text` | NN, no vacío | Texto mostrado, sin datos ajenos al destinatario. |
| `clave_evento` | `text` | NN | Identidad estable para no repetir el mismo aviso. |
| `creada_en` | `timestamptz` | NN, DEFAULT now() | Emisión. |
| `leida_en` | `timestamptz` | NULL hasta lectura | Acuse dentro del sistema. |

UNIQUE(usuario_id, clave_evento). La clave incluye indicador, periodo, tipo y, para avisos de revisión, el evento que los originó. No hay FK obligatoria a expediente: puede faltar toda captura y seguir siendo necesario el aviso. La periodicidad se consulta desde configuración para periodos nuevos; no se genera atraso sin primer periodo exigible conocido.

## 4. Relaciones y cardinalidades

| Padre | Hijo / FK | Cardinalidad |
|---|---|---|
| agrupaciones_tematicas | familias.agrupacion_id | 1 → 0..N; cada familia tiene 1 agrupación. |
| familias | indicadores.familia_id | 1 → 0..N; cada indicador tiene 1 familia. |
| dependencias | usuarios.dependencia_id | 1 → 0..N; un usuario tiene 0..1 dependencia actual. Captura requiere 1. |
| indicadores | variables_indicador.indicador_id | 1 → 0..N; para operar se exige el conjunto completo. |
| dependencias | variables_indicador.dependencia_id | 1 → 0..N; una variable tiene 0..1 durante configuración y 1 al operar. |
| indicadores | expedientes_indicador.indicador_id | 1 → 0..N periodos/ciclos. |
| expedientes_indicador | expedientes_indicador.expediente_anterior_id | Cadena de ciclos; 0..1 predecesor y como máximo un sucesor directo válido por backend. |
| expedientes_indicador | capturas.expediente_id | 1 → 0..N envíos de sus dependencias. |
| dependencias / usuarios | capturas.dependencia_id / capturista_id | Cada envío tiene 1 aportante y 1 autor. |
| capturas | valores_captura.captura_id | 1 → N valores al guardar; la completitud se verifica por backend. |
| variables_indicador | valores_captura.variable_id | 1 → 0..N valores históricos. |
| capturas | evidencias.captura_id | 1 → N evidencias al enviar, con límite pendiente. |
| expedientes_indicador | eventos_revision.expediente_id | 1 → N eventos; hilo conservado por ciclo. |
| capturas | eventos_revision.captura_id | 1 → 0..N; evento puede ser solo de expediente. |
| eventos_revision | eventos_revision.responde_a_id | 1 → 0..N respuestas o resoluciones del mismo ciclo. |
| usuarios | eventos_revision.autor_id / auditoria_configuracion.actor_id | Un actor puede originar muchos eventos. |
| usuarios / indicadores | notificaciones.usuario_id / indicador_id | Cada aviso tiene 1 destinatario y 1 indicador. |

`creado_por` y `validado_por` del expediente también referencian usuarios; la validación solo se autoriza al rol Revisión, y la reapertura al rol Administrador.

## 5. Flujos e integridad entre filas

### 5.1 Envío y corrección propuestos

1. Comprobar permisos, intervalo y configuración. Obtener/bloquear el expediente abierto; serializar su creación bloqueando el indicador y comprobando las claves únicas.
2. Verificar todas las variables obligatorias de la dependencia, datos válidos, evidencia PDF y descripción del avance. Las entradas necesarias para el cálculo no se hacen opcionales para permitir un envío parcial.
3. Guardar captura, valores, evidencias y evento en una única transacción. No se guarda un borrador antes de completar el conjunto.
4. Al corregir, exigir que el envío vigente esté observado; marcarlo sustituido e insertar el siguiente envío completo de forma atómica. Se conserva el anterior.
5. Revisión registra una acción distinta al validar. Observaciones y respuestas apuntan al envío y ciclo correspondientes.

Se puede haber recibido una captura completa de una dependencia mientras falta otra. Es un expediente aún no validable, no una captura incompleta permitida. Esta interpretación y la validación conjunta son recomendaciones pendientes de confirmar.

### 5.2 Validación y publicación

En una transacción, bloquear el expediente y sus envíos efectivos. Exigir un envío vigente revisado de cada dependencia requerida por la configuración aplicada, todas las entradas presentes, evidencia y ninguna observación pendiente. Revisión resuelve las observaciones explícitamente, mediante eventos enlazados; no basta con que Captura responda.

Calcular con los valores enviados; prevenir división entre cero, datos no finitos y unidades incompatibles. No convertir error de cálculo o ausencia de insumos en cero. Calcular color con regla y antecedentes verificables. Guardar valor, color o motivo de falta de color, antecedentes, usuario/fecha de validación y evento de validación. No hay endpoint para capturar manualmente el resultado calculado.

Una vez validado, bloquear nuevas capturas, sustituciones, cambios de valores, evidencias o conversación dentro del ciclo. Una consulta autorizada elige el mayor número de ciclo validado de ese indicador y periodo; no se necesita un booleano de publicado que pueda contradecirlo.

### 5.3 Reapertura

Administrador, con motivo obligatorio, crea un expediente abierto con siguiente ciclo y referencia al último validado. El anterior permanece validado, publicado e inmutable. Un segundo ciclo abierto simultáneo queda impedido por unicidad. El nuevo ciclo no se publica hasta su propia validación.

La propuesta más simple exige un conjunto completo de nuevos envíos para validar el nuevo ciclo, aunque el formulario pueda precargarse con datos previos. Si el cliente permite reutilizar aportaciones ya validadas sin reenvío, habrá que definir una referencia explícita a esos envíos antes de implementarlo. Nunca duplicar un envío atribuyéndolo al autor original sin su acción.

### 5.4 Qué garantiza cada capa

- **PostgreSQL:** PK/FK, unicidad y unicidad parcial, campos obligatorios, dominios, pares de validación, intervalos básicos, pertenencia al mismo indicador/ciclo y borrado restringido.
- **Backend transaccional:** rol y alcance, configuración lista, calendario canónico, asignaciones aplicadas, completitud, límites por variable, observaciones resueltas, operaciones matemáticas, transiciones y política de publicación.
- **Permisos de acceso a BD:** usuarios finales no escriben directamente; la aplicación no ofrece edición libre de auditoría ni de datos validados. Si se permiten otros escritores, revisar funciones/triggers específicos para mantener esas garantías.

No se simula una comprobación entre tablas mediante un CHECK: ese mecanismo no garantiza condiciones que dependen de otras filas. No se añaden triggers generales de flujo mientras el backend sea el único escritor; cualquier escritura administrativa directa debe respetar las mismas reglas.

## 6. Cálculo y semáforos

| tipo_calculo | Papeles exigidos | Operación propuesta |
|---|---|---|
| directo | Una entrada | entrada × factor_calculo, normalmente factor 1. |
| cociente | Un numerador y un denominador | numerador / denominador × factor_calculo. |
| variacion | Un actual y un anterior | (actual - anterior) / anterior × factor_calculo. |
| complemento | Una base y una parte | (base - parte) / base × factor_calculo. |
| suma | Una o más entradas sumando | suma de entradas × factor_calculo. No suma periodos por el solo hecho de ser acumulable. |

Clasificación inicial de las 63 expresiones: 47 cocientes con factor, 4 variaciones, 10 datos directos, 1 suma y 1 complemento. La semántica y los rangos de cada indicador deben revisarse antes de habilitarlo. No se infiere el cálculo a partir del texto con eval ni SQL dinámico.

Para `SIIP.05.F34.003`, el complemento es `(AP - AF) / AP × 100`; se proponen papel base para AP y parte para AF. Estos nombres evitan confundir el divisor real de esa operación con el denominador de un cociente simple, sin alterar la fórmula de ficha.

**Recomendación técnica pendiente:** usar puntos porcentuales 0..100 como escala de representación de valores porcentuales, metas y umbrales. Una variación puede ser negativa o superar 100; no se aplica CHECK universal 0..100. El valor interno 1 de una celda Excel porcentual representa 100%, pero un índice o conteo 1 conserva su unidad. Los porcentajes directos no se multiplican dos veces.

24 fichas contienen referencias a tendencias. Se conservan los resultados y versiones usados como antecedentes. Un valor validado puede publicarse sin color por falta de antecedentes; una regla ambigua o no implementada no se trata automáticamente como falta de historial: debe revisarse antes de operar ese indicador.

### Evaluación temática

Confirmado en DEC-013, DEC-020..022:

1. Obtener el último periodo completo y exigible de cada indicador para el mes consultado.
2. Buscar su mayor ciclo validado publicado actualmente. No limitar validado_en a la fecha del corte: se eligió la vista actual, no lo conocido entonces.
3. No sustituir el periodo esperado por otro más viejo. Durante reapertura sí permanece elegible la versión validada anterior DEL MISMO periodo si tiene color.
4. Con N evaluables: índice = (verdes + 0.5 × amarillos) / N. Verde >=0.80; amarillo >=0.50 y <0.80; rojo <0.50. Con N=0: sin índice ni color.
5. Mostrar periodo fuente y cobertura. El denominador Y, la cobertura mínima y condiciones de N pequeño siguen pendientes. No confundir N del índice con Y de cobertura.

**Recomendación técnica:** calcular bajo demanda, sin tabla de índices temáticos ni snapshots mensuales. El valor numérico del índice se puede obtener con los pesos aprobados; presentar un color con cobertura parcial requiere la política pendiente. Cambios de agrupación o frecuencia con historia deben definirse antes de permitirlos administrativamente.

## 7. Variables fijas y vigencia

**Confirmado:** las variables fijas concretas y la política de vigencia aún no están definidas. Se conserva en valores_captura el número realmente utilizado y en el expediente la definición aplicada.

No se agrega un campo global valor_actual ni se asume que un denominador es fijo. Tampoco se infieren vigencias de una línea base. La primera versión captura el conjunto completo de insumos; la clasificación/reutilización automática queda pendiente.

Si se confirma reutilización automática, la extensión mínima propuesta, FUERA DEL CONTEO INICIAL DE 13 TABLAS, sería `valores_referencia_variable`:

| Campo | Tipo | Regla propuesta |
|---|---|---|
| id | bigint identity | PK, NN. |
| variable_id | bigint | NN, FK → variables_indicador.id. |
| valor | numeric(24,8) | NN, finito. |
| vigente_desde | date | NN; inicio inclusivo. |
| vigente_hasta | date | NULL sin fin; fin exclusivo; mayor que inicio si existe. |
| referencia_fuente | text | NN; fuente y periodo de referencia. |
| registrado_por | bigint | NN, FK → usuarios.id. |
| registrado_en | timestamptz | NN, DEFAULT now(). |

Las vigencias de una variable no deben solaparse; se puede expresar con rangos/exclusión o una comprobación serializada por variable. La opción exacta se decidirá al implementar esa función, considerando extensiones disponibles. El criterio de elección para un periodo (inicio, fin u otra referencia) depende de la respuesta del cliente.

Al reutilizar una referencia, copiar su número a valores_captura y añadir el identificador de origen mediante una FK opcional `referencia_id bigint` en esa tabla; comprobar que pertenece a la misma variable. Esa columna se añadiría con la extensión, no ahora. Cambiar la referencia no reescribe capturas anteriores. La política de recálculo y selección de vigencias no se aprueba con esta previsión.

## 8. Índices iniciales

Además de las PK/UNIQUE y los índices parciales descritos:

| Tabla | Índice propuesto | Consulta o relación |
|---|---|---|
| familias | (agrupacion_id) | Navegación temática. |
| indicadores | (familia_id) | Catálogo por familia. |
| variables_indicador | (dependencia_id, indicador_id) | Asignaciones de captura. UNIQUE(indicador_id,codigo) ya cubre el inicio indicador_id. |
| usuarios | (dependencia_id) | Cuentas históricas y FK de dependencia; no cubiertas totalmente por el índice parcial. |
| expedientes_indicador | (indicador_id, periodo_inicio, periodo_fin, numero_ciclo DESC) WHERE estado='validado' | Última publicación de un periodo. |
| capturas | (dependencia_id, estado) | Bandeja de captura/revisión. |
| capturas | (capturista_id) | Historia del autor y FK. |
| valores_captura | (variable_id, indicador_id) | Valores por entrada y comprobación de FK. La PK comienza por captura_id. |
| eventos_revision | (expediente_id, creado_en, id) | Hilo cronológico estable incluso con fechas iguales. |
| eventos_revision | (captura_id) | Historia del envío. |
| evidencias | (captura_id) | Adjuntos de un envío. |
| auditoria_configuracion | (entidad, registro_id, creado_en, id) | Historia de configuración. |
| notificaciones | (usuario_id, creada_en DESC) WHERE leida_en IS NULL | Avisos pendientes. |

No duplicar índices ya cubiertos por PK/UNIQUE. Los índices secundarios de otras FK se añaden solo si las consultas o mantenimiento los justifican; no se promete que todas las FK estén indexadas por defecto. Sin particiones, índices GIN generales ni materializaciones para 63 indicadores.

## 9. Diferencias frente al ERD anterior

| Cambio | Motivo | Estado |
|---|---|---|
| Nombres consistentes en plural, id y *_id | Legibilidad y migraciones comprensibles. | Recomendación técnica. |
| Fusionar catalogo_variables y variables_indicadores | No se ha demostrado un catálogo global reutilizable; separar entradas de resultados. | Recomendación técnica. |
| Retirar indicador_dependencia | Participantes derivados de variables; coordinador independiente solo si se solicita. | Recomendación técnica. |
| Retirar agrupación directa del indicador y cantidad_dependencias | Evitar datos duplicados contradictorios. | Recomendación técnica. |
| Añadir expedientes_indicador | Periodo/ciclo, publicación y reapertura conservando versiones. | Necesidad confirmada; estructura propuesta. |
| Capturas por envío completo y valores versionados | Conservar información efectivamente revisada. | Estructura propuesta; unidad multidependencia pendiente. |
| Añadir eventos_revision | Hilo cronológico, autores, respuestas y acciones distintas. | Necesidad confirmada; estructura propuesta. |
| Evidencias separadas del enlace único en captura | Respaldo por envío y conservación de archivos. | PDF confirmado; almacenamiento y cardinalidad propuestos. |
| Añadir auditoria_configuracion | Cambios administrativos fuera del hilo de revisión. | Recomendación técnica. |
| Añadir notificaciones | Persistencia de avisos y lectura, sin duplicados. | Función confirmada; bandeja y campos propuestos. |
| Sin tablas de importación | Retirada expresa del alcance. | Confirmado, DEC-023. |
| Sin tabla de publicaciones, periodos globales o resultados temáticos | La versión validada y los intervalos del expediente resuelven el núcleo. | Recomendación técnica, P-13 abierto. |

## 10. Pendientes que no deben confundirse con aprobación

1. Unidad de envío por dependencia y validación final conjunta; tratamiento de aportaciones sin cambios en reapertura.
2. `SIIP.02.F13.002`: PA/PO de Desarrollo Económico y DIF; `SIIP.02.F16.002`: IE/IP de Obras Públicas y CMAPAS. El auxiliar suma aportes a una misma variable, contrario a DEC-002. No inventar responsables ni habilitar esa consolidación.
3. Asignaciones oficiales y, si aplica, restricción personal además de dependencia.
4. Primer periodo exigible, calendario y apertura exactos. Sin datos, no inventar atrasos.
5. Variables fijas, selección de vigencia y reutilización; recálculo de resultados y cambios de reglas, frecuencia o agrupación con historia.
6. Denominador/cobertura mínima temática y presentación de color con N pequeño.
7. Proveedor, tamaño/cantidad de PDF, permisos de descarga, retención y respaldos. La selección del servicio no está aprobada.
8. Formatos de reportes y canales/disparadores de notificaciones; cálculo bajo demanda de índices como recomendación.
9. Aprobación técnica de cinco tipos de cálculo, escala porcentual, campos requeridos de ficha y parametrización individual de las 63 reglas.

## 11. Comprobaciones al implementar después de aprobar

- Intentar mezclar variable de otro indicador o respuesta de otro ciclo: debe fallar por FK.
- Enviar incompleto o con PDF inválido: no debe quedar una captura registrada.
- Corregir un envío: valores y PDF anteriores siguen auditables; solo un envío efectivo por dependencia/ciclo.
- Revisar no publica; Administrador no valida; Captura no altera otra dependencia.
- Validar sin todas las entradas/observaciones resueltas: se rechaza sin cambios parciales.
- Dos solicitudes simultáneas de envío, validación o reapertura: no duplican ciclo ni publicación.
- Reapertura conserva publicación anterior; nueva validación la sustituye sin borrar historia.
- Valor validado sin antecedentes puede publicarse sin color; falta de dato no se vuelve cero o rojo.
- Corte con periodo esperado ausente no arrastra otro; corte histórico usa publicación actual del intervalo esperado.
- Índice temático con N=0 no divide entre cero; bordes 0.50 y 0.80 respetan DEC-021.
- Línea base/meta cero permanece cero; celda porcentual 1 se interpreta según formato/unidad.
- Cambio de configuración o antecedente no modifica las copias conservadas de una validación.

Esta lista es un criterio de pruebas futuras, no evidencia de ejecución. No se ha creado ni probado una BD con este esquema.

## 12. Bitácora de revisión

| Fecha | Cambio documental | Naturaleza |
|---|---|---|
| 23/10/2026 | Primer diccionario de las 13 entidades, tipos, nulabilidad, FK, claves, índices y flujos. | Propuesta técnica solicitada. |
| 23/10/2026 | Se explicita referencia al ciclo anterior, coherencia por FK compuestas y antecedentes usados para tendencias. | Detalle adicional de integridad frente a la explicación previa en chat; pendiente de aprobación. |
| 23/10/2026 | Se mantiene la unidad multidependencia, cobertura y vigencias como pendientes. | No cambia decisiones confirmadas. |
| 23/10/2026 | Se crea alcance-mvp.md v0.3 y se registran propuestas en decisiones-siip.md. | Sin modificar el ERD HTML, Word v0.2, código o datos. |

Referencias técnicas consultadas: [restricciones PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html), [índices parciales](https://www.postgresql.org/docs/current/indexes-partial.html), [rangos y vigencias](https://www.postgresql.org/docs/current/rangetypes.html). Las restricciones entre filas deben expresarse con FK/UNIQUE u operaciones transaccionales apropiadas, no con CHECK que consulte otras tablas. La implementación elegirá la versión PostgreSQL disponible; este documento no fija versión de servidor ni extensión obligatoria.
