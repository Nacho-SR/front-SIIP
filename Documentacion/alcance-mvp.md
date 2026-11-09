# Alcance del MVP del SIIP Salamanca

**Versión:** 0.4. **Fecha:** 06/11/2026. **Estado:** incorpora DEC-038 y el cierre acordado con el director (DEC-039). No ratifica automáticamente los acuerdos anteriores.

Esta versión Markdown actualiza el alcance operativo del Word `SIIP_01_Alcance_MVP_borrador_v0_2.docx` con los acuerdos posteriores del equipo. El Word se conserva como antecedente sin modificaciones. En caso de diferencia, consultar este documento y el registro vigente de decisiones, sin presentar las propuestas técnicas como requisitos aprobados.

## 1. Objetivo y universo

Gestionar fichas e indicadores municipales de Salamanca, capturar variables y PDF por periodo, revisar y validar, conservar historia y consultar resultados publicados.

- PostgreSQL; 63 indicadores iniciales, 8 agrupaciones temáticas y 54 familias observadas.
- Jerarquía confirmada: agrupación → familia → indicador, con único padre.
- 6 mensuales, 35 trimestrales, 16 semestrales y 6 anuales.
- 24 acumulables y 39 no acumulables. La acumulación no autoriza sumar automáticamente totales de distintos periodos.
- 55 fichas municipales y 8 de origen Colonia; captura final exclusivamente municipal. El detalle territorial se aporta como evidencia cuando aplique.
- Anexo verificado: 6 metas y 55 líneas base sin definir. Cero es un dato válido. Las 26 denominaciones de responsables aún requieren depuración.

## 2. Alcance confirmado por el equipo

- Administrar usuarios, dependencias, familias, indicadores, variables y asignaciones, con catálogos delimitados.
- Un rol por cuenta: Captura, Revisión, Administrador o Consulta (DEC-038). Consulta permite varias cuentas sin dependencia y acceso global de lectura. Revisar y validar son acciones distintas del mismo rol Revisión.
- DEC-037 (04/11/2026): Captura y Revisión tienen una dependencia obligatoria y activa; la pertenencia de Revisión no reduce su consulta global. Las altas de estos usuarios y dependencias se realizan desde Administrador.
- Una cuenta de Captura por dependencia prevista para la operación inicial; el cliente entregará asignaciones oficiales por variable.
- Guardar solo capturas completas y válidas, sin borradores.
- DEC-033: periodos naturales, captura desde registro con asignación y validación/publicación al cierre o después, con cierre de captura al terminar el último día del periodo (DEC-039). Aviso preventivo siete días antes y gris para los faltantes/incompletos al cierre. Los envíos completos continúan en revisión. La reapertura por incumplimiento permite solo PDF de justificación y conserva el gris. Primer corte: fin del periodo natural del alta; cobertura inicial y periodos previos siguen pendientes.
- Observaciones y respuestas por indicador/periodo/ciclo, cerradas al validar y conservadas para auditoría; no chat.
- Publicación automática tras validación. Solo Consulta autenticada y autorizada.
- Reapertura justificada por Administrador, nuevo ciclo y nueva validación. Última versión validada sigue publicada hasta reemplazo validado del mismo periodo.
- Valores validados sin historial suficiente pueden publicarse sin color; no participan en el índice temático.
- PDF como formato de evidencia, alojado en Cloudflare R2 (DEC-041). Privacidad, retención y modalidad final de descarga siguen por concretar.
- Conservar valores utilizados y configuración aplicada para auditoría. DEC-030/031: cambios de regla no alteran publicaciones; en revisión se conserva la regla, y atrasos/reaperturas usan la correspondiente al periodo. Falta precisar la vigencia de cambios a mitad de periodo.
- Reportes y notificaciones forman parte del MVP; formatos, canales y detalles permanecen pendientes.
- **No habrá importación** (DEC-023).

## 3. Roles y límites

| Rol | Facultades confirmadas | Límites |
|---|---|---|
| Captura | Enviar/corregir información completa, responder observaciones y consultar indicadores de su dependencia. | No validar ni consultar información ajena a su alcance. |
| Revisión | Consultar globalmente, revisar, observar, resolver observaciones, validar y generar reportes. | No alterar silenciosamente datos del capturista. |
| Administrador | Configuración, cuentas, asignaciones, supervisión y reaperturas justificadas. | No sustituir el flujo ordinario de captura o validación ni editar auditoría. |
| Consulta | Lectura global de fichas, resultados publicados y estadísticas, sin dependencia. Múltiples cuentas. | Sin captura, revisión, validación ni administración. Expedientes internos, PDF y exportaciones no se conceden automáticamente. |

La expresión de la ficha «Unidad Responsable de Integrar y Validar el Dato» no crea un rol adicional ni sustituye la validación del rol Revisión dentro del SIIP.

## 4. Cortes y evaluación temática

El usuario selecciona mes/año. El corte es el último día del mes. Cada indicador aporta como máximo el resultado del último periodo completo y exigible que le corresponde. Si ese periodo no tiene publicación, no se arrastra otro más viejo. Reapertura permite conservar la publicación anterior del mismo periodo.

DEC-022 confirma que el corte histórico usa las versiones publicadas actualmente para esos periodos; no reconstruye lo conocido entonces.

DEC-021 aprueba el índice `(verdes + 0.5 × amarillos) / N evaluables`: verde >=0.80; amarillo >=0.50 y <0.80; rojo <0.50. Con N=0 no existe índice ni color. Se excluyen resultados sin valor publicado o sin color calculable y los grises por incumplimiento de DEC-039, sin convertirlos en cero. Debe mostrarse cobertura y periodo fuente.

**Pendiente:** denominador de cobertura, cobertura mínima y condiciones para mostrar color con pocos evaluables. Aprobar pesos y umbrales no resuelve estas condiciones.

Alojamiento seleccionado DEC-040 y DEC-041: frontend, backend y PostgreSQL en Hostinger VPS KVM 1; archivos en R2. [Costos vigentes](infraestructura-hostinger-r2.md). La selección no equivale a contratación ni aprobación del esquema.

## 5. Propuesta de modelo para revisión

El [borrador de modelo PostgreSQL v0.1](modelo-datos-mvp-borrador.md) detalla 13 entidades, tipos, relaciones y restricciones. Su entrega fue solicitada el 23/10/2026, pero su esquema no se considera aprobado ni implementado.

Recomendaciones sujetas a revisión:

- Fusionar las definiciones de variables y derivar participantes de sus asignaciones.
- Un expediente por indicador/periodo/ciclo; conservar resultado y configuración aplicada en él.
- Envío completo por dependencia, revisión de envíos y validación final conjunta del expediente. La unidad multidependencia sigue pendiente del cliente.
- Envíos sucesivos en correcciones; conservación de valores, PDF y eventos anteriores.
- Almacenamiento externo privado de PDF con clave estable y metadatos en BD, descarga autorizada temporal.
- Notificaciones inicialmente dentro del sistema; no se asume canal externo aprobado.
- Cálculo temático bajo demanda sin tabla de snapshots (P-13 todavía abierto).
- Cinco operaciones de cálculo soportadas y escala porcentual consistente por revisar.
- Soporte posterior de referencias fijas con vigencia al definirse las variables, conservando desde el inicio el valor efectivamente utilizado.

No se requiere resolver todos los datos iniciales para diseñar las relaciones. No se habilita operación con responsables ficticios, reglas ambiguas o datos obligatorios ausentes.

## 6. Pendientes de cliente o revisión del equipo

| Asunto | Estado e impacto |
|---|---|
| Primer periodo exigible y calendario | DEC-033 confirma periodos naturales, captura desde alta con asignación y validación/publicación al cierre o después, zona America/Mexico_City. Se mantienen las cuatro frecuencias actuales; no se añade bimestral. Falta definir cobertura del primer periodo con alta intermedia y periodos anteriores al alta. |
| Asignaciones por variable | El cliente entregará dependencia/usuario. Se propone asignación a dependencia y autor real en cada envío; restricción personal adicional aún por confirmar. |
| SIIP.02.F13.002 | Conciliar PA/PO de Desarrollo Económico y DIF: el auxiliar suma aportes a las mismas variables, contrario a DEC-002. |
| SIIP.02.F16.002 | Conciliar IE/IP de Obras Públicas y CMAPAS por el mismo conflicto. |
| Unidad de envío/validación y reapertura | DEC-032 confirma envío por dependencia, validación conjunta y reenvío solo de lo necesario. Adaptar/aprobar referencias a versiones revisadas sin cambios; no aprobar por ello sumas entre dependencias. |
| Semáforo individual e historia | DEC-030/031 resuelven conservación y uso de regla del periodo. Falta precisar vigencia de cambios a mitad de periodo y conciliar la parametrización de cada ficha antes de operarla. |
| Variables fijas | Aún no identificadas; definir fuente, selección de vigencia y reutilización antes de automatizar. |
| Cobertura temática | Denominador, mínimo y condiciones de N pequeño. |
| PDF | Cloudflare R2 seleccionado (DEC-041), sustituyendo Supabase Storage. Faltan tamaño/cantidad, permisos, retención, respaldo y modalidad final de descarga. |
| Reportes y notificaciones | Formatos, destinatarios, canales y disparadores específicos. |

## 7. Exclusiones del MVP

Sin importación, chat, captura submunicipal, roles múltiples por cuenta, consolidación de una misma variable entre varias dependencias bajo DEC-002 vigente, motor de expresiones arbitrarias, catálogos genéricos, microservicios, CQRS ni event sourcing. El índice temático no convierte ni promedia los valores de indicadores de distintas frecuencias.

## 8. Bitácora de cambios frente al Word v0.2

| ID de revisión | Fecha | Modificación | Sustento / estado |
|---|---|---|---|
| REV-MVP-001 | 23/10/2026 | Se retira importación del alcance y de las facultades administrativas. | Acuerdo previo DEC-023; no es una nueva propuesta. |
| REV-MVP-002 | 23/10/2026 | Se incorporan pesos y umbrales temáticos aprobados; cobertura sigue pendiente. | DEC-021. |
| REV-MVP-003 | 23/10/2026 | Corte histórico usa publicaciones actuales del intervalo esperado. | DEC-022; sin fotografía de lo conocido entonces. |
| REV-MVP-004 | 23/10/2026 | Evidencias PDF y conservación de valor/configuración aplicada. | DEC-024/025. Almacenamiento y vigencias concretas no aprobados. |
| REV-MVP-005 | 23/10/2026 | Conteos de faltantes corregidos de 8/59 a 6/55; se preservan ceros. | Verificación del anexo local. |
| REV-MVP-006 | 23/10/2026 | Se señalan los dos indicadores en conflicto y asignaciones aún pendientes. | Sin cambiar DEC-002 ni inventar respuesta de cliente. |
| REV-MVP-007 | 23/10/2026 | Se enlaza propuesta de 13 tablas con estados, claves y referencias de ciclo. | Recomendación técnica; pendiente de aprobación del modelo. |

Esta versión no ejecuta cambios sobre la BD, el ERD HTML, el frontend ni los documentos Word. La implementación y sus migraciones requieren una solicitud posterior sobre el diseño revisado.

Detalle vigente de DEC-039: [cierre y justificación en flujos de negocio](flujos-negocio.md#cierre-y-justificación--dec-039-06112026). Cierre al terminar el periodo, gris por faltantes, continuidad de revisión de envíos completos y reapertura exclusivamente documental. Implementación operativa pendiente.
