# Flujos de negocio del SIIP

Versión 0.1 · 26/10/2026 · Borrador para revisión. No autoriza implementación, migraciones ni aprobación del modelo.

## 1. Fuentes, contradicciones y estado de los acuerdos

Se leyeron AGENTS.md y los archivos actuales decisiones-siip.md, alcance-mvp.md, pendientes-siip.md y modelo-datos-mvp-borrador.md. La documentación se encuentra ahora en `SIIP-code/Documentacion`, dentro del repositorio Git. Se conserva esa carpeta; no se crea otra paralela con diferente capitalización.

| ID | Hallazgo | Tratamiento en estos contratos |
|---|---|---|
| C-01 | DEC-007 prohíbe borradores; el modelo permite un expediente abierto, incluso sin capturas tras reapertura. | No hay contradicción si expediente es el ciclo administrativo y captura es un envío completo. Nunca guardar formulario parcial. Esa distinción y el envío por dependencia son propuestas técnicas. |
| C-02 | DEC-008/011 exigen revisión, validación y publicación; el modelo solo tiene abierto/validado en expediente y revisada en captura. | Acciones separadas: revisar una captura no valida el expediente. Validar publica automáticamente; sin endpoint de publicación manual. Estados persistidos son propuesta, no decisiones funcionales nuevas. |
| C-03 | El envío por dependencia y la validación conjunta del modelo parecen operativos, pero PROP-BD-003 los mantiene pendientes. | Contratos de escritura condicionados; primer recorrido propuesto para indicador con una dependencia y configuración conciliada. No habilitar multidependencia por la sola existencia del YAML. |
| C-04 | DEC-002 y el auxiliar contradicen la consolidación de PA/PO en SIIP.02.F13.002 y de IE/IP en SIIP.02.F16.002. | Mantener DEC-002. Asignaciones y modalidad de estos indicadores pendientes de cliente; sin sumas entre dependencias ni asignaciones de ejemplo tomadas como reales. |
| C-05 | Pesos/umbrales aprobados; cobertura, N pequeño y primer periodo siguen pendientes. | Diferenciar índice, color y cobertura. No inventar Y ni exigir fechas ficticias; informar configuración pendiente. |
| C-06 | DEC-022 elige publicaciones actuales para cortes históricos; P-08 sigue abierto. | No filtrar validado_en por fecha del corte. Conservar color/configuración de cada publicación; no aplicar una regla nueva a historia sin decisión. |
| C-07 | El modelo recomienda enlaces temporales para PDF; proveedor y modalidad no están aprobados. | API propone descarga autenticada por streaming, sin exponer storage_key. Es una alternativa técnica documentada en impacto, no un cambio silencioso del modelo. |
| C-08 | El frontend usa seguimiento y consulta como roles, permite captura/revisión al administrador y simula sesión; Axios trata 403 como cierre de sesión. | Contrato usa solo captura/revision/administrador. 401 es falta de autenticación y 403 falta de permiso/CSRF. No modificar frontend en esta tarea. |
| C-09 | No hay backend ni autenticación elegidos; las 13 tablas no incluyen sesiones. | Sesión opaca con cookie y CSRF es propuesta técnica; persistencia estándar del framework separada del dominio, pendiente de elegir backend/hosting. No prometer logout revocable con un JWT sin estado. |
| C-10 | Derivar participantes de variables actuales puede reinterpretar ciclos anteriores. | Autorización a indicador según vínculo vigente; envíos según dependencia del actor y asignaciones aplicadas al ciclo. Reasignaciones e historia pendientes de detalle; no dar acceso a insumos ajenos por leer un expediente compartido. |

**Confirmado por equipo:** DEC-001..025, tres roles, captura completa municipal, revisión distinta de validación, publicación automática, reapertura conservando la publicación, mezcla de frecuencias según DEC-013 y exclusión de no evaluables.

**Propuesta técnica:** transporte de autenticación, estados del esquema, agrupamiento por dependencia, validación conjunta, multipart, códigos HTTP, paginación y descarga por streaming. El YAML entero es v0.1; ningún contrato es definitivo.

**Pendiente de cliente/equipo:** P-07/08/10/12/13/14, responsables por variable, unidad multidependencia, variables fijas, límites PDF, reportes y canales. **Fuera de MVP:** importación, chat, captura submunicipal, editor de fórmulas, roles múltiples y CRUD genérico de tablas.

## 2. Vocabulario y estados

| Objeto | Estado | Significado |
|---|---|---|
| Ausencia de captura | Derivado, sin fila | No existe envío completo de esa dependencia para el ciclo. No es borrador ni cero. |
| Captura | en_revision | Envío completo e inmutable en sus datos, disponible para revisión. |
| Captura | observada | Revisión solicitó aclaración/corrección. No habilita PATCH de valores. |
| Captura | sustituida | Otro envío completo del mismo ciclo/dependencia la reemplaza para revisión; permanece auditable. |
| Captura | revisada | Revisión aceptó ese envío. Todavía no es una publicación por sí mismo. |
| Expediente | abierto | Ciclo en integración/revisión; sin resultado final persistido. |
| Expediente | validado | Resultado y configuración conservados; publicación automática y ciclo cerrado. |
| Publicación | Derivada | Mayor ciclo validado del mismo indicador e intervalo; no se añade columna publicado. |
| Desempeño | verde/amarillo/rojo o sin color | Valoración distinta del estado de captura. Sin color no equivale a pendiente de validación. |

## 3. Transiciones propuestas

| Origen | Acción / actor | Destino | Precondiciones y efectos |
|---|---|---|---|
| Sin envío | Enviar / Captura | Nueva captura en_revision | Indicador autorizado y configuración suficiente, intervalo habilitado según política acordada, todas sus entradas válidas y PDF. Crear expediente original y envío atómicamente, o contribuir al expediente abierto indicado. |
| en_revision u observada | Observar / Revisión | observada | Expediente abierto, envío efectivo. Comentario obligatorio; cada observación tiene ID y autor. |
| observada | Corregir y responder / Captura | Anterior sustituida; nueva en_revision | Mismo ciclo/dependencia, valores y PDF completos, respuestas a observaciones indicadas. Nunca sobrescribir el envío anterior. |
| en_revision | Revisar / Revisión | revisada | Evidencia/entradas correctas y observaciones pendientes resueltas explícitamente por Revisión. Puede registrar resoluciones y revisión en una transacción. |
| abierto | Validar / Revisión | validado | Conjunto exacto de envíos revisados vigente, todos los insumos y respaldos requeridos, sin observaciones abiertas, cálculo posible y regla implementada. Calcular, guardar y publicar atómicamente. |
| validado | Reabrir / Administrador | Anterior sigue validado; nuevo ciclo abierto | Motivo obligatorio, sin otro ciclo abierto, política de configuración aplicable resuelta. Registrar evento en el nuevo ciclo y referencia al anterior. |

No se permite observar/revisar un envío sustituido, corregir sin observación ni escribir dentro de un ciclo validado. Si se desea revisar de nuevo un envío revisado antes de validar, ese detalle debe aprobarse; v0.1 rechaza la transición en lugar de inventarla. Todos los cambios de estado se producen por acciones autorizadas, no por un PATCH de estado.

## 4. Recorrido inicial de implementación propuesto

### F-01 Autenticación

1. GET /auth/sesion devuelve usuario o null y token CSRF. Es bootstrap técnico; no crea capturas ni concede acceso.
2. POST /auth/sesion recibe correo/contraseña y X-CSRF-Token. Validar Origin y credenciales sin revelar si existe la cuenta. Rotar ID de sesión y CSRF al autenticar.
3. Cada operación consulta cuenta activa y rol vigentes; no confiar únicamente en datos antiguos de la sesión.
4. DELETE /auth/sesion invalida la sesión actual y expira la cookie. Sin registro público, refresh token ni administración de sesiones en esta versión.

Propuesta: cookie opaca `siip_session`, HttpOnly, Secure en HTTPS y SameSite=Lax, con almacenamiento servidor estándar del framework. Tiempo de sesión, CORS/orígenes y backend pendientes de configuración; no son plazos de captura. Todas las escrituras autenticadas exigen CSRF. Un 403 no obliga a cerrar la sesión válida.

### F-02 Indicadores y periodos

GET /indicadores filtra primero por permisos y después pagina. Captura obtiene únicamente indicadores vinculados a su dependencia; Revisión y Administrador tienen consulta global. El detalle ofrece ficha y las variables capturables de su ámbito; no expone configuracion_aplicada cruda ni entradas ajenas.

GET /indicadores/{id}/periodos recibe un intervalo de consulta y devuelve periodos conocidos y estado del calendario. Si falta primer periodo o apertura acordada, informa `pendiente` y los pendientes P-07/P-12. No genera atrasos ni declara habilitados intervalos supuestos. Los registros históricos autorizados siguen consultables. Una escritura cuyo periodo no pueda comprobarse devuelve 409 CONFIGURACION_PENDIENTE, sin decidir unilateralmente un calendario.

### F-03 Captura completa

POST /indicadores/{id}/capturas usa multipart: parte `datos` JSON y parte `evidencias` con PDF. `datos` contiene intervalo, expediente_id explícito (null solo para solicitar el ciclo original), avance, aclaraciones opcionales y valores. La dependencia, autor, fecha, estado, número de envío y resultado los determina el servidor; no se aceptan en la petición.

Con expediente_id null, crear solo el ciclo original si no hay ninguno para ese intervalo. Si ya existe uno, responder 409 para que el cliente recupere el contexto; no incorporarlo silenciosamente a una reapertura. Para un ciclo abierto conocido, exigir su ID y coincidencia de indicador/intervalo. Si ya existe envío efectivo de esa dependencia, rechazar duplicado; la corrección usa otra acción.

Validar permisos por objeto, variables únicas y de su ámbito, datos finitos, enteros/rangos/unidades correspondientes, descripción y PDF reales. No aceptar una URL externa o storage_key arbitraria como evidencia. Los límites de cantidad/tamaño son pendientes explícitos, no cifras inventadas en el esquema.

Guardar captura, valores, evidencias y evento en una transacción; verificar el almacenamiento antes de confirmar. Un fallo revierte la BD y deja el objeto temporal para limpieza. No queda borrador persistido. Un reintento no autorizado por el estado produce 409; no se promete idempotencia general por cabecera.

### F-04 Revisión, observaciones y corrección

Revisión obtiene la bandeja de expedientes y el detalle de un envío; puede descargar sus PDF. POST /capturas/{id}/observaciones agrega una observación con comentario y pasa a observada. GET /expedientes/{id}/eventos conserva el hilo, con filtrado por dependencia para Captura.

Captura responde mediante POST /capturas/{id}/correcciones con un nuevo conjunto completo y respuestas enlazadas a eventos de observación del mismo ciclo y dependencia. El envío observado queda sustituido y el nuevo queda en_revision. No hay un endpoint de chat ni edición de eventos.

Revisión usa POST /capturas/{id}/revision con la lista explícita de observaciones que acepta como resueltas, incluso si estaban ancladas a un envío sustituido de la misma cadena. Cada resolución se registra como evento y luego se marca revisada. Si quedan observaciones de la dependencia/ciclo sin resolver, responder 409. Captura no puede autocerrar observaciones. No se borran comentarios.

### F-05 Validación y publicación

POST /expedientes/{id}/validacion recibe `capturas_revisadas_ids`, el conjunto de envíos que el revisor efectivamente consultó. Bajo bloqueo del expediente, exigir coincidencia exacta con el conjunto efectivo actual y estados revisada. Si cambió un envío desde la lectura, 409 ENVIO_VIGENTE_MODIFICADO; no validar datos nuevos sin revisión.

Comprobar observaciones, variables, PDF, unidades, algoritmo y configuración. Calcular valor; no aceptar resultado/color del cliente. Falta de antecedentes permite valor validado sin color según DEC-014. Regla ambigua, denominador cero o falta de operandos no se convierten en cero ni en una falsa falta de antecedentes: rechazar con error identificado.

Guardar cálculo, antecedentes, validador/fecha y evento de validación; publicar dentro de la misma transacción. No existe POST /publicaciones. Un fallo no cambia la publicación anterior. La serialización y claves únicas del modelo evitan carreras sin añadir una entidad de versiones de API.

### F-06 Consulta de resultados y cortes

GET /indicadores/{id}/resultados devuelve como máximo una versión publicada por intervalo, seleccionando el mayor ciclo validado actualmente. Una lista vacía es 200 con items=[], no un valor cero. La revisión en curso no hace desaparecer resultados validados.

Para corte mensual, identificar primero el periodo completo/exigible; después buscar la publicación de ESE periodo. Nunca elegir primero el último resultado disponible. No filtrar por validado_en <= corte: DEC-022 exige las publicaciones actuales. Un anual 2025 puede ser fuente válida de sep-2026; un mensual agosto no sustituye septiembre ausente.

GET /agrupaciones/{id}/evaluacion?corte=2026-09 se propone solo para Revisión/Administrador: una agrupación completa puede revelar indicadores ajenos a Captura. No se inventa un índice de subconjunto para concederle acceso. Definir esa visibilidad si se solicita.

El índice aprobado usa N evaluables; no confundirlo con Y de cobertura. Si todos los calendarios necesarios están definidos y N>0, se puede informar el índice, pero con política de cobertura pendiente el color permanece null y estado politica_cobertura_pendiente. Si no se conoce el universo temporal, indice/color/cobertura quedan null y se informa calendario_pendiente. Con N=0: sin índice/color. Estos estados de respuesta son propuestas técnicas que no fijan cobertura mínima. La respuesta conserva el periodo fuente y motivo de exclusión de cada indicador.

### F-07 Reapertura

POST /expedientes/{id}/reaperturas, solo Administrador, exige motivo y un expediente validado que sea la publicación vigente del intervalo. No se admite reabrir una versión antigua ni crear un segundo ciclo abierto. Crear nuevo ciclo/evento con referencia al anterior; no desvalidar el anterior.

La política de configuración del ciclo nuevo y reutilización de aportaciones están pendientes: cuando no se pueda seleccionar configuración sin resolver P-08/PROP-BD-003, devolver 409 CONFIGURACION_PENDIENTE. La forma del contrato no aprueba exigir reenvío ni reutilizar automáticamente todos los insumos. La nueva validación vuelve a usar F-05 y sustituye la publicación solo al completarse.

## 5. Errores comunes y transacciones

| HTTP | Situación | Efecto |
|---|---|---|
| 400 | JSON/consulta/multipart mal formado | Sin cambios. |
| 401 | Credenciales inválidas o sesión ausente/expirada/inactiva | Sin información de la cuenta ajena. |
| 403 | Rol no autorizado, CSRF u origen inválido | No transforma una sesión válida en expirada. |
| 404 | Objeto inexistente o fuera del ámbito autorizado | Misma respuesta genérica para no revelar pertenencia. |
| 409 | Estado obsoleto, ciclo cerrado/duplicado, observaciones abiertas o configuración pendiente | Releer recurso o resolver pendiente; sin cambios parciales. |
| 413 / 415 | Límite configurado excedido / evidencia o tipo de contenido no permitido | No queda captura incompleta. |
| 422 | Datos semánticamente inválidos, variable duplicada/incorrecta, cálculo imposible | Errores por campo, sin datos ajenos. |
| 429 | Protección de intentos excesivos | Política técnica de infraestructura por configurar. |
| 500 / 503 | Fallo interno / almacenamiento temporalmente no disponible | Revertir transacción y conservar publicación anterior. |

Usar application/problem+json con codigo, detail y errores por campo, sin trazas, SQL, claves de almacenamiento ni secretos. Consultar [OpenAPI](api/openapi.yaml). Los contratos no garantizan idempotencia de POST; conflictos y lectura posterior permiten verificar si un envío quedó confirmado.

## 6. Criterios de aceptación documentales para implementar después

1. Captura no lista, descarga ni altera un objeto ajeno cambiando su ID; listados/contadores se filtran antes de paginar.
2. Envío incompleto no crea captura ni valores parciales; error de PDF revierte el conjunto.
3. Revisión no publica; Administrador no puede enviar/revisar/validar por su rol.
4. Corrección conserva envío, PDF y comentarios anteriores; solo un envío efectivo por dependencia/ciclo.
5. Validación rechaza un conjunto de IDs distinto del revisado, incluso ante una corrección concurrente.
6. Reapertura deja visible la publicación anterior; solo otra validación la sustituye.
7. Corte sin septiembre no usa agosto; sin color no participa; N=0 nunca divide entre cero.
8. Los ejemplos de la API son sintéticos: no atribuyen responsables reales a los 63 indicadores.

Referencias técnicas: [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html), [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html), [autorización por objeto OWASP](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/). Las decisiones del SIIP proceden de los documentos locales, no de estas referencias.
