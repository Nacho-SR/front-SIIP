# Registro operativo de decisiones SIIP (copia para Codex)

**Actualizado al 24/11/2026 con conciliación de respuestas.** Basado en `SIIP_Registro_de_Decisiones_v0_2.docx` y los acuerdos posteriores del equipo. Los acuerdos anteriores conservan su historia; DEC-038 sustituye el alcance de roles de DEC-005 y DEC-039 el permiso de captura tardía de DEC-009/017. DEC-040 fija Hostinger VPS KVM 1 para frontend/API/PostgreSQL y DEC-041 sustituye Supabase Storage por Cloudflare R2. DEC-026 queda sustituida por DEC-027; DEC-028 registra PostgreSQL como motor propuesto, sin aprobación del esquema. La aprobación formal del cliente puede seguir pendiente. Las propuestas PROP-BD y PROP-TEC NO se convierten en decisiones aprobadas por documentarlas. Si existe discrepancia futura entre acuerdos confirmados, solicitar conciliación antes de cambiar su interpretación.

## Cuestionario recibido y cambios pendientes de validación

El 24/11/2026 se coteja el Word recibido con respuestas el 23/11 y la copia
complementada con Menús. La [matriz de conciliación](conciliacion-respuestas-cuestionario.md)
identifica fuente/hash, respuestas literales, 21 compatibles, 31 parciales, 14 con
cambios o conflictos y 37 preguntas sin respuesta. Compatible no equivale a
autorización formal. G01 incluye sus cuatro párrafos; las 63 fichas I siguen sin
autorizar. No se atribuye la respuesta al director por el solo hecho de que R01
lo nombre: identificación del respondiente y sección 10 siguen incompletas.

| Acuerdos que deben cotejarse | Respuesta recibida y estado |
|---|---|
| DEC-039 y reaperturas DEC-012/016 | R05 permite cifras tardías; O05 acepta corrección acotada de envíos completos. Separar ambos flujos y resolver CR-01 antes de modificar bloqueo/gris. |
| DEC-043/049/052 | G01 bloquea campos/dependencia pero deja Variables editables; G02 admite metas futuras y M06 actualizar universo. Campos, valores, asignaciones y excepciones requieren CR-02. |
| DEC-025/030/031/049/050/052 | G11/H06 proponen actualización automática; H05 arrastre/retroactividad. R10/R12 mantienen vigencia inicial y no recálculo. Resolver CR-03; no sobrescribir historia. |
| Contrato implementado del ejemplo 130 y DEC-045 | G05/G06 no bastan para cambiar redondeo/rangos. R04 ratifica siguiente periodo completo; M01/O01 deben precisar cercanía e inicio. CR-04/05. |
| DEC-039 y permisos de justificación | O09 señala seguimiento como posible aportante; validar rol/acción exactos y controles. CR-06. |
| DEC-024/038/041 y conservación DEC-008/016/025 | E01 propone ZIP/120 mb; E02 acceso a documentos para Consulta y omite Captura; E03 conservación hasta siguiente periodo. Son cambios pendientes CR-07/08/09, sin autorización para cargas, descargas nuevas ni borrado. |
| DEC-014/039/048 | E09/G10 amplían gris; R08/T06 y G07/G08 distinguen historia insuficiente y causa no calculable. CR-10. |
| DEC-020/021 y pendientes P-01/P-10 | E05–E07 retiran expresamente el semáforo temático conservando el individual. Cambio de alcance pendiente CR-11; no seguir tratándolo solo como falta de cobertura mínima. |
| DEC-022 y P-13 | E08 pide histórico sin recálculo en pregunta sobre temático; precisar objeto y alcance frente al retiro propuesto. CR-12. |

Las respuestas compatibles registran coincidencias y las parciales precisiones
recibidas; todavía no se incorporan nuevas DEC aprobadas. Tras autorización
identificada se anotará cada sustitución con alcance/fecha y se actualizarán sus
requisitos derivados. Esta conciliación no implementa las respuestas ni modifica
los Word, el anexo o la BD.

## Registro de acuerdos anteriores del equipo

| ID | Estado | Decisión |
|---|---|---|
| DEC-001 | Equipo: confirmada | Jerarquía agrupación temática → familia → indicador, con un único padre para cada entidad. |
| DEC-002 | Equipo: confirmada | No hay varias dependencias aportando a una misma variable en MVP; sí variables distintas del mismo indicador. |
| DEC-003 | Equipo: confirmada | Fórmula textual almacenada para la ficha; sin editor de expresiones arbitrarias en MVP. |
| DEC-004 | Equipo: confirmada; precisada por DEC-030/031 el 30/10/2026 | Los cambios de regla no recalculan resultados/colores publicados. Una captura en revisión conserva su regla; capturas atrasadas y reaperturas usan la regla del periodo correspondiente. |
| DEC-005 | Histórica; sustituida por DEC-038 el 06/11/2026 | Roles exclusivos Captura, Revisión, Administrador en el alcance anterior. |
| DEC-006 | Equipo: confirmada | Una cuenta de captura por dependencia prevista inicialmente. |
| DEC-007 | Equipo: confirmada | No hay borradores; capturas completas y válidas. |
| DEC-008 | Equipo: confirmada | Hilos de revisión por ciclo, cerrados pero preservados para auditoría. |
| DEC-009 | Histórica en captura tardía; sustituida por DEC-039. Validación posterior al cierre se conserva | No hay plazos máximos que bloqueen capturas o validaciones atrasadas. Captura desde el alta con asignación; validar/publicar solo al cierre del periodo o después. |
| DEC-010 | Equipo: confirmada | Consulta autenticada; Captura ve dependencias asignadas y Revisión todo. |
| DEC-011 | Equipo: confirmada | Publicación automática después de validar. |
| DEC-012 | Equipo: confirmada | Reapertura solo por administrador, con nuevo ciclo validable y trazabilidad. |
| DEC-013 | Equipo: confirmada 22/10/2026 | Corte mensual con periodicidades mixtas; último periodo **completo y exigible**, sin reemplazo por periodos viejos si falta el esperado. |
| DEC-014 | Equipo: confirmada | Si falta histórico para semaforizar, se publica valor validado sin color, fuera del temático. |
| DEC-015 | Equipo: confirmada | Indicadores por colonia se capturan municipalmente; desglose queda en evidencia. |
| DEC-016 | Equipo: confirmada | Última versión validada permanece publicada durante reapertura, hasta nueva validación. |
| DEC-017 | Precisada por DEC-039 el 06/11/2026 | Se conserva el aviso preventivo de siete días. El cierre ahora bloquea nuevos datos y marca en gris los faltantes/incompletos. |
| DEC-018 | Equipo: confirmada | Metas porcentuales respetan formato/origen de Excel; 1 en celda porcentual representa 100%. |
| DEC-019 | Equipo: confirmada; ajustada por DEC-023 | Administrador gestiona usuarios, dependencias, indicadores, variables, asignaciones, catálogos específicos y reaperturas, sin validar por sí mismo. La importación se retiró del alcance. |
| DEC-020 | Equipo: confirmada | En semáforo temático solo participan resultados publicados con color calculable; mostrar cobertura. |
| DEC-021 | Equipo: confirmada 22/10/2026 | Semáforo temático: verde=1, amarillo=0.5, rojo=0; índice=sumatoria de pesos/N evaluables. Verde si índice >=0.80; amarillo si >=0.50 y <0.80; rojo si <0.50. Sin evaluables: sin índice ni color. Denominador de cobertura y cobertura mínima siguen pendientes. |
| DEC-022 | Equipo: confirmada 22/10/2026 | Los cortes históricos muestran las versiones publicadas actualmente para los periodos esperados; no reconstruyen lo que se conocía en la fecha del corte. Se mantiene DEC-013, sin arrastrar otros periodos. |
| DEC-023 | Equipo: confirmada 22/10/2026 | No habrá importación. Sustituye las menciones previas a importación dentro del MVP y de las facultades del administrador. Reportes y notificaciones continúan en alcance. |
| DEC-024 | Equipo: confirmada 22/10/2026; proveedor actualizado por DEC-041 | Las evidencias serán PDF. Cloudflare R2 sustituye la selección anterior de Supabase Storage. Límites, conservación y mecanismo final de descarga siguen por definir. |
| DEC-025 | Equipo: confirmada 22/10/2026 | Conservar el valor utilizado y la configuración aplicada para auditoría. Las variables fijas aún no están definidas; preparar su soporte por vigencia sin asumir valores, reutilización automática ni política de recálculo aprobados. |
| DEC-026 | Histórica; sustituida por DEC-027 el 27/10/2026 | El 26/10 se eligió Laravel y se confirmó PHP/Composer operativos. Se conserva el antecedente; ya no define el backend vigente. No hubo aplicación Laravel instalada ni aprobación del esquema por este acuerdo. |
| DEC-027 | Equipo: confirmada 27/10/2026 | Frontend Vue + TypeScript y backend Node.js + TypeScript. Sustituye Laravel de DEC-026. No selecciona framework HTTP, ORM, driver, almacén de sesión ni herramienta de migraciones. No cambia las decisiones funcionales del MVP. |
| DEC-028 | Dirección tecnológica indicada por el equipo 27/10/2026; motor propuesto | Mantener PostgreSQL como motor propuesto y la posibilidad de cambiar de proveedor para producción. No aprueba el borrador de 13 tablas ni autoriza generar migraciones. Las menciones anteriores a PostgreSQL confirmado no deben interpretarse como aprobación definitiva del esquema. |
| DEC-029 | Equipo: confirmada 30/10/2026 | Base backend Node.js 22 + TypeScript + Fastify 5; `pg`, Drizzle ORM y Drizzle Kit instalados. Se acepta autenticación con Argon2id, sesión revocable en servidor, cookie HttpOnly/Secure/SameSite y CSRF, con persistencia propuesta en PostgreSQL. Se autoriza la instalación y el arranque HTTP básico. No aprueba tablas de negocio ni técnicas, migraciones o despliegue; autenticación y almacén de sesiones aún no implementados. |
| DEC-030 | Equipo: confirmada 30/10/2026; precisada por DEC-031 | Cambiar una regla no recalcula ni altera resultados ni semaforización ya publicados. Los nuevos resultados usan las reglas correspondientes; DEC-031 precisa ciclos en revisión, atrasados y reaperturas. Falta explicitar la entrada en vigor de una nueva versión dentro de un periodo y el alcance sobre agregados temáticos bajo demanda (P-13). Un cambio de regla por sí solo no sustituye una publicación; se mantienen DEC-016/022 y la corrección con nueva versión validada. |
| DEC-031 | Equipo: confirmada 30/10/2026 | Una captura ya en revisión conserva la regla anterior si esta cambia. Una captura atrasada o reapertura de un periodo antiguo usa la regla de ese periodo, no la vigente al enviar o corregir. La configuración histórica debe ser recuperable aunque no existiera captura previa. Falta explicitar a qué periodo se asigna una modificación realizada a mitad de un periodo abierto. |
| DEC-032 | Equipo: confirmada 30/10/2026 | Cada dependencia envía su parte cuando aporta variables distintas; Revisión valida el conjunto cuando todas las aportaciones requeridas están revisadas. En reapertura solo se reenvía la aportación que requiere corrección. Se conserva la última publicación hasta nueva validación. Tratar aportes de una misma variable como variables distintas es propuesta del usuario por evaluar; no modifica DEC-002 ni aprueba consolidación automática. |
| DEC-033 | Equipo: confirmada y precisada 30/10/2026 | Se usan periodos calendario naturales: mensual, trimestral, semestral y anual, con corte al fin del mes correspondiente. Un trimestral dado de alta con asignación el 10 de febrero tiene primer corte el 31 de marzo, no el 30 de abril. Captura desde el registro/publicación con dependencia asignada; validar y publicar solo al cierre o después. Zona America/Mexico_City. «Bimestral» fue un ejemplo: no se añade frecuencia. Se mantiene DEC-013 y el no arrastre. Falta definir cobertura de datos del primer periodo cuando el alta es intermedia y autorización de periodos anteriores al alta; no inventar prorrateos. |
| DEC-034 | Histórica; almacenamiento sustituido por DEC-041 el 06/11/2026 | Preparar la integración de evidencias con Supabase Storage. Se recomienda bucket privado, acceso autorizado por la API SIIP y objetos versionados sin sobrescritura. No autoriza crear recursos, contratar planes o migrar BD; usar también PostgreSQL de Supabase en lugar de la propuesta Neon requiere concretarse por separado. Se mantiene la autenticación propia de DEC-029. |
| DEC-035 | Equipo: implementación solicitada 30/10/2026 | Se autoriza el esqueleto por módulos con controllers, services, repositories, schemas y guards, y comenzar autenticación. El equipo confirma que todavía no tiene BD y pide preparar código y SQL sin ejecutarlo. Se implementan los tres endpoints de sesión de DEC-029 y adaptador PostgreSQL; SQL mínimo de autenticación propuesto para revisión, sin aprobar las demás tablas del MVP. Las pruebas usan dobles sintéticos; no hay verificación de PostgreSQL real ni recursos creados. |
| DEC-036 | Equipo: implementación solicitada 04/11/2026 | El equipo confirma una base PostgreSQL vacía, sin SQL aplicado ni conexión configurada. Se implementa script CLI para el primer administrador y POST protegidos de altas de Captura/Revisión y dependencias. Sin alta HTTP de administradores ni sobrescritura de cuentas. Se prepara SQL de auditoría para altas atómicas y colección Postman; no se ejecuta SQL desde el chat. La prueba real requiere configurar una conexión de desarrollo o TEST_DATABASE_URL aislada. |
| DEC-037 | Equipo: confirmada e implementación solicitada 04/11/2026 | Los usuarios de Revisión también pertenecen a una dependencia, obligatoria y activa como en Captura. Esto no cambia su consulta global de DEC-010 ni las acciones exclusivas de cada rol. Se habilitan formularios de altas de usuarios/dependencias desde Administrador y consulta del catálogo activo para asignación. No se crean administradores por HTTP. Se prepara SQL 003 para exigir dependencia a Captura/Revisión; cuentas anteriores sin dependencia requieren asignación real antes de aplicarlo. No se ejecuta SQL ni se reasignan cuentas desde el chat. |

| DEC-038 | Confirmada e implementación solicitada por el usuario 06/11/2026 | Cuatro roles exclusivos: Captura, Revisión, Administrador y Consulta. Consulta permite múltiples cuentas de lectura global, sin dependencia, pensadas inicialmente para Presidencia. Alta solo por Administrador. Acceso a fichas, resultados publicados y estadísticas; no concede captura, revisión, validación, administración ni expedientes/PDF internos. Permisos de exportación y PDF pendientes. Se actualizan auth, altas, UI y contratos. SQL 004 aplicado con autorización expresa el 09/11/2026 únicamente en la base local SIIP de localhost:5432, con el ENUM verificado y sin modificar cuentas; no acredita otros entornos. |
| DEC-039 | Acuerdo con el director comunicado y precisado por el usuario 06/11/2026 | Cierre de captura al fin del periodo natural en America/Mexico_City, último día incluido. Faltantes/incompletos quedan grises. Envíos completos conservan revisión y pueden validarse después. Administrador reabre solo para PDF de justificación, sin completar datos ni quitar el gris. Sustituye la captura tardía sin bloqueo de DEC-009/017. Gris no es rojo/cero ni evaluable temático. La corrección de publicaciones validadas sigue siendo otro flujo. Cierre y justificación aún sin implementación operativa. |

| DEC-040 | Selección confirmada por el usuario 06/11/2026 | Frontend Vue compilado, backend Node.js/Fastify y la base PostgreSQL en el mismo Hostinger VPS KVM 1 (nombre comercial verificado del plan referido como mvk1). Sustituye la propuesta de Neon y cierra la elección de alojamiento de esos componentes. PostgreSQL será autoadministrado, no una BD administrada incluida. Capacidad real por medir. La selección no acredita compra, migración o despliegue ni aprueba el esquema de negocio. Costos vigentes y fuentes en infraestructura-hostinger-r2.md. |
| DEC-041 | Selección confirmada por el usuario 06/11/2026 | Archivos, evidencias y justificaciones PDF en Cloudflare R2. Sustituye Supabase Storage de DEC-034. Se conserva autenticación propia SIIP y autorización por objeto. R2 Standard es recomendación técnica para el presupuesto inicial, con cuota gratuita y excedentes por consumo. No autoriza crear buckets, contratar servicios ni exponer archivos públicamente. Límites PDF, retención, descarga final y respaldo siguen por concretar. |

Actualización técnica del 30/10/2026: DEC-029/035 completan la selección inicial de DEC-027. Hay arranque, validación de entorno, cabeceras, CORS, límites por IP y código de autenticación modular. Sesión con cookie/CSRF y Argon2id; expiración absoluta inicial de 30 minutos y 5 intentos de login/IP/minuto como valores técnicos revisables. Se relee cuenta/rol/dependencia vigentes; cambios de hash invalidan sesiones previas mediante huella HMAC. El almacén de sesiones usa generación y compare-and-set para impedir sobrescrituras obsoletas tras rotación/revocación. Sin DATABASE_URL, auth responde 503 y salud sigue disponible. El SQL no se ejecuta al iniciar ni se ha aplicado; PostgreSQL real sigue pendiente de prueba.

## Conciliación de las 63 fichas — 20/11/2026

Acuerdos del equipo obtenidos en entrevista; no se atribuyen al director sin ratificación expresa. Esta actualización es documental: no implementa reglas operativas ni modifica SQL, datos o fuentes originales.

| ID | Estado | Decisión |
|---|---|---|
| DEC-047 | Equipo: confirmada 20/11/2026 | En SIIP.02.F17.002, asistentes a eventos culturales, comparar el mismo semestre del año anterior: enero–junio de 2027 contra enero–junio de 2026. Prevalece esa definición sobre la expresión «semestre previo» de AP. |
| DEC-048 | Equipo: confirmada 20/11/2026 | Conservar las condiciones de tendencia escritas en cada ficha. Verde puede obtenerse al cumplir la meta en su propia unidad o mediante dos incrementos consecutivos (tres valores). No inventar amarillo residual para secuencias mixtas; casos sin regla inequívoca quedan pendientes. Usar periodos calendario contiguos, sin saltar huecos: informar historia insuficiente y mantener la vía por meta si aplica. |
| DEC-049 | Equipo: confirmada 20/11/2026; precisa DEC-025 | Administrador registra y autoriza por sí mismo las referencias externas: valor, fuente y vigencia. Captura las ve en solo lectura y se conserva el valor y versión utilizados. Usar la referencia aplicable al inicio del periodo; un cambio durante este aplica desde el siguiente periodo completo, salvo excepción metodológica explícita. Fuente, año y cifras concretas siguen pendientes. No concede validación de resultados operativos al Administrador. |
| DEC-050 | Equipo: confirmada 20/11/2026; precisa DEC-014/025 | Se permiten antecedentes iniciales documentados y autorizados por Administrador, con valor, periodo, unidad y fuente, en solo lectura para el cálculo. No crear publicaciones históricas ficticias, importador ni reapertura de capturas vencidas. Un valor numérico validado puede ser antecedente aunque carezca de color; no usar borradores sin validar. |
| DEC-051 | Equipo: confirmada 20/11/2026 | Permitir ficha documental inactiva cuando su regla aún no exista. Registrar el requerimiento y bloquear la activación hasta desarrollar y probar una combinación compatible. Administrador puede configurar tipos y parámetros ya soportados sin cambios de código. No habilita fórmulas arbitrarias ni implica que esta capacidad ya esté implementada. |
| DEC-052 | Equipo: confirmada y precisada 20/11/2026; restringe DEC-030/031 y resuelve su vigencia de cambios en indicadores activos | No habilitar modificación de la metodología de un indicador activo. Para una metodología distinta se dará de alta otro indicador independiente, sin relación de sustitución ni traslado automático de historial. Conservar configuración e historia del anterior y no recalcular publicaciones. DEC-030/031 mantienen la recuperación de la configuración histórica, sin autorizar cambios futuros de metodología activa. |

Diagnóstico inicial sobre `(2).xlsx`, sustituido para la conciliación vigente por la revisión siguiente: 63 fichas, 116 entradas identificadas, cinco grupos algebraicos de cálculo y cuatro familias de semaforización. Veinticuatro fichas usan tendencia o meta y 28 necesitan antecedentes para cálculo o color. La agrupación no acredita compatibilidad metodológica. El compendio Word coincidía en los 63 algoritmos de esa versión tras normalizar espacios; contiene diferencias textuales y truncamientos en otros campos.

Antecedente de la entrevista: el usuario solicitó dejar pendientes predial SIIP.08.F52.002 y presupuesto SIIP.08.F53.002, por aparente corrección en otra versión. Después indicó la nueva fuente, ya cotejada en la actualización siguiente. Los hallazgos iniciales no se conservan como defectos actuales cuando la corrección documental está verificada.

Recomendación técnica pendiente de implementación: separar cálculo, semaforización y resolución de orígenes; usar funciones acotadas y versionadas, con contratos, unidades, operadores de límites y casos de aceptación. Conservar las versiones técnicas necesarias para resultados anteriores no supone permitir cambiar la metodología activa. Las fuentes históricas/referencias serán resueltas por backend; la interfaz no podrá sustituirlas. No cambiar el ejemplo 130 ni sus umbrales 75/90 por similitud con las fichas originales.

### Nueva fuente indicada por el usuario — revisión repetida el 20/11/2026

El usuario identifica **Anexo 3_4 SIIP Sist.xlsx** como archivo actualizado y solicita repetir el proceso. Se revisan de nuevo sus 63 claves. La copia en Documentacion y la del Entregable 3 tienen SHA-256 idéntico: `24b7a60abba6210c3cd0a24d5b23d2216c5addf12b406b08236f383eb6c66b79`. Esta fuente guía la nueva conciliación; el archivo `(2)` se conserva como antecedente y procedencia de la carga de DEC-046, sin sustituir archivos ni actualizar registros de BD desde esta revisión.

Cambios verificados respecto a `(2)`:

- Predial SIIP.08.F52.002 incorpora `TCR=[(RA/RP)/(1+I/100)−1]×100` y la entrada I (inflación anual). Se retira el hallazgo de inflación omitida; faltan fuente, método y correspondencia temporal de I. Se propone un tipo de crecimiento real distinto de variación nominal, sin doble deflación.
- Presupuesto SIIP.08.F53.002 ahora tiene sentido Ascendente, consistente con su tendencia; siguen pendientes sobreejercicio >100 %, momento contable y presupuesto aprobado/modificado. La nueva fuente no determina por sí sola esos tratamientos.
- MiPyMEs SIIP.03.F21.002 pasa a Acumulable y a tendencia/meta; dejan de aplicarle las bandas anteriores 225/270. Falta precisar acumulación, reinicio y deduplicación entre cortes.
- Panteones SIIP.05.F37.001 pasa a No acumulable, coherente con disponibilidad al cierre. Persiste «acumulable» en la descripción del resultado CEI y falta concretar su meta relativa.
- Vida útil SIIP.05.F36.002 define años, ya no proporción. La nota sobre planear acciones al llegar a 3 años está en Observaciones. Conservar sus bandas explícitas; no convertir el umbral de gestión en verde por meta.
- Incidencia delictiva SIIP.01.F01.002 corrige meta de +20 % a −20 %.
- Plataforma del Juzgado Cívico SIIP.01.F07.003 deja vacío Medio de Verificación. La evidencia propuesta en `(2)` no se convierte en acuerdo por estar escrita allí.

El diagnóstico vigente identifica **117 entradas, seis grupos algebraicos de cálculo, cuatro familias de semáforo, 25 fichas con tendencia o meta y 29 que requieren antecedentes**; se mantienen 24 acumulables. Hay 176 diferencias de celda en las 63 fichas tras normalizar espacios, muchas editoriales: no son 176 cambios de regla. El compendio Word coincide en 62/63 algoritmos y conserva la fórmula anterior de predial. Los acuerdos DEC-047 a DEC-052 se mantienen; la excepción temporal de inflación y la acumulación de MiPyMEs están en entrevista. La matriz revisada conserva fuentes, diferencias, hallazgos y estado de cada decisión.

## Alta persistente de fichas — 09/11/2026

Actualización DEC-046 (20/11/2026): carga técnica del anexo solicitada y autorizada.
Se añadieron 63 fichas documentales inactivas en SIIP local, localhost:5432/public,
con auditoría del Administrador ID 1; total 67, conservando los cuatro ejemplos.
Prueba real aislada aprobada y esquema eliminado; repetición sin duplicados y
rollback completo verificados. Sin configuración/activación automática ni importación
UI/API. [Procedencia, formatos y comprobaciones](carga-anexo-indicadores.md).

DEC-046 (20/11/2026): el usuario solicita cargar todas las 63 fichas del anexo Excel.
Se prepara una carga técnica documental auditada, atómica e idempotente, sin
sobrescribir datos previos ni añadir importación al MVP. Porcentajes según formato,
frecuencia trimestral normalizada y consecutivo de origen conservado en auditoría.
Fichas inactivas, sin asignaciones/metodologías ni activación automática.
Prueba real y aplicación pendientes de autorización de SIIP concreta.
[Detalle](carga-anexo-indicadores.md).

Actualización DEC-045 (17/11/2026): el usuario solicita activación controlada y confirma
inicio como mínimo en el siguiente periodo natural completo. Se integra DEC-044
en develop y se prepara registro de activaciones, validaciones y bloqueo de la
activación genérica. SQL 008 aplicado con autorización expresa solo en SIIP local,
localhost:5432/public, tras dos integraciones reales aisladas aprobadas y esquemas
eliminados. Ejemplo 130 activado desde 01/12/2026 con metodología v2, 75/90 % y DGSM,
sin cambiar cuentas/responsables ni crear capturas/publicaciones.
[Estado y límites](activacion-indicadores.md).

Actualización DEC-043, implementación solicitada el 10/11/2026: cargar los cuatro
ejemplos ficticios 130–133 y configurar entradas/asignaciones desde Administrador.
Una dependencia activa o ninguna por variable, sin activar indicadores ni Captura.
Se añaden definiciones periódicas (entero/decimal) y se cambian sus dependencias;
se conservan definiciones e IDs ya registrados. Versiones contra sobrescrituras y
auditoría atómica. SQL 006 y carga de ejemplos requieren base concreta autorizada.
No aprueba variables fijas, vigencias ni consolidación de aportaciones a una misma
variable. [Detalle](variables-asignaciones.md).

Aplicación autorizada y comprobada el 10/11/2026: SQL 006 en SIIP local,
localhost:5432/public; cuatro fichas ficticias 130–133, ocho entradas N/D sin
dependencia y auditoría del Administrador ID 1. Prueba real aislada aprobada,
sin asignaciones de prueba en las tablas de trabajo. No acredita otros entornos.

DEC-042, implementación solicitada por el usuario: alta, listado y consulta de fichas
de indicadores desde Administrador con persistencia en PostgreSQL. Se sustituye
el guardado demostrativo local. Fichas inactivas, código único, clasificación
consistente y alta/auditoría atómicas. SQL 005 prepara agrupaciones, familias e
indicadores, sin aprobar ni crear el resto del esquema de negocio. La ficha
conserva textos y unidades; no ejecuta algoritmos ni asigna variables o permisos
por el texto del responsable. Edición, activación, operación y vigencias siguen
pendientes. Aplicación de SQL solo en base concreta autorizada. Alcance, contratos
y diferencias del borrador: [alta-indicadores.md](alta-indicadores.md).

Aplicación autorizada el 09/11/2026: SQL 005 solo en SIIP local, localhost:5432/public,
con ocho agrupaciones y 54 familias. Cero fichas ficticias en las tablas de trabajo.
Integración real de seis fichas aprobada en un esquema temporal aislado, ya eliminado.

## Infraestructura vigente — actualización del 06/11/2026

- Solo el backend Node.js necesita conexión directa a PostgreSQL durante la operación; los usuarios de la aplicación acceden mediante la API, sin credenciales de BD en el frontend. Migraciones y respaldos son accesos técnicos separados.
- Selección vigente DEC-040: Hostinger VPS KVM 1 para frontend, API y PostgreSQL, compartiendo recursos. El antecedente Web Premium no acredita que el VPS esté contratado; no se ha comprobado la cuenta ni desplegado desde esta actualización.
- Neon Free queda como propuesta histórica, sin recursos creados. Cloudflare R2 es el proveedor seleccionado para archivos (DEC-041), sustituyendo Supabase Storage.
- Alojamiento seleccionado; siguen pendientes compra, región, dominio, responsables, separación de entornos y recuperación. [Costos vigentes y comprobación de compatibilidad](infraestructura-hostinger-r2.md), consultados el 06/11/2026.

## Propuestas tecnológicas del 27/10/2026

El stack de DEC-027 sí está indicado por el equipo; los detalles operativos siguientes son propuestas para revisión. Su desarrollo y comprobación documental están en [arquitectura-tecnologica.md](arquitectura-tecnologica.md).

| ID | Estado | Propuesta |
|---|---|---|
| PROP-TEC-001 | Histórica; sustituida por DEC-040, sin provisionar | Neon Free para desarrollo remoto usando PostgreSQL convencional. No adoptar servicios propietarios ni elegir automáticamente Neon para producción. |
| PROP-TEC-002 | Recomendación técnica | Desarrollo local por integrante y modalidad remota compartida; staging y producción con bases, usuarios, secretos y almacenamiento independientes. Producción en proyecto/instancia separada recomendado. |
| PROP-TEC-003 | Recomendación técnica | Conexiones parametrizadas, TLS verificado, pool pequeño y credenciales de ejecución/migraciones/respaldo separadas. Secretos fuera de Git y frontend. Driver `pg` como opción por revisar; no instalado. |
| PROP-TEC-004 | Recomendación técnica; bloqueada por aprobación del esquema | Migraciones versionadas con una herramienta única, promoción local → staging → producción, un ejecutor y conexión directa. No generarlas ni ejecutarlas ahora. |
| PROP-TEC-005 | Recomendación técnica; objetivos por acordar | Respaldos independientes cifrados y pruebas de restauración; producción con PITR y exportación lógica. RPO <= 1 h, RTO <= 4 h y retención de 30 días son objetivos propuestos, no SLA aprobados. |
| PROP-TEC-006 | Recomendación técnica | Comparar costo total, disponibilidad, respaldos, seguridad, ubicación y recuperación antes de elegir hosting. Framework, versiones, presupuesto, región y objetivos operativos siguen pendientes; proveedores seleccionados por DEC-040 y DEC-041. |

### Cambios y revisión de esta actualización

- Sustituye explícitamente la elección tecnológica Laravel; no modifica DEC-001..025 ni convierte propuestas de modelo/API en requisitos aprobados.
- Añade arquitectura técnica Markdown y sincroniza contexto, pendientes y las referencias al backend en flujos/impacto API. Los Word del consultor se conservan como antecedentes.
- La revisión documental de las 13 tablas no detecta funciones exclusivas de proveedor ni extensiones obligatorias. La futura exclusión de vigencias podría requerir `btree_gist`; sigue condicional, con alternativa transaccional ya prevista.
- Sin cambios en el esquema original, OpenAPI, backend/frontend, dependencias, CI o secretos. No se crean recursos remotos ni migraciones.

## Aclaraciones del equipo del 22/10/2026
- Preparar el campo de primer periodo exigible; no generar atrasos a partir de fechas inventadas.
- El cliente entregará las asignaciones de dependencia/usuario por variable. Su ausencia no bloquea proponer la estructura; no asignar responsables ficticios.
- Mantener DEC-002 mientras el cliente concilia `SIIP.02.F13.002` y `SIIP.02.F16.002`: el Excel auxiliar suma aportes de distintas dependencias a las mismas variables. La unidad de envío y validación permanece pendiente de aprobación.
- Estos acuerdos posteriores actualizan las copias Markdown. Los documentos Word v0.2 conservan el estado previo y no se han editado.

## Reglas de implementación importantes
- Diferenciar estado de captura/revisión vs. color de desempeño.
- No transformar ausencia de dato en `0` ni rojo.
- Aplicar los pesos y umbrales temáticos de DEC-021; no asumir aprobados el denominador de cobertura ni un umbral mínimo de cobertura.
- No confundir «revisión y validación separadas como acciones» con un cuarto rol de validador.
- Ante resultado reabierto, preservar la versión publicada previa hasta reemplazo validado.
- Documentar siempre fecha/periodo fuente del corte mensual y el universo evaluable.

## Bandeja propia de Captura — avance técnico del 23/11/2026

Nota de implementación del 23/11/2026: a solicitud del usuario se conecta la
bandeja propia de Captura en modo de solo lectura, sin resolver preguntas del
cuestionario metodológico. Se consultan asignaciones existentes con la dependencia
de la sesión; solo se exponen sus variables y el inicio de la activación vigente.
Las asignaciones inactivas se distinguen como preparación. No se habilitan envíos,
calendario, cálculo ni publicación, ni se actualiza el Excel o la BD. Esto registra
un avance técnico, no una nueva decisión metodológica del cliente.

Punto 2 implementado en la misma fecha: se amplía el servicio de periodos para
inicio/fin naturales inclusivos y se expone en la bandeja la fecha local del
servidor, la zona America/Mexico_City y el intervalo actual por frecuencia. La
activación sigue desde el siguiente periodo completo. Es calendario de referencia;
no se resuelven por código las precisiones de exigibilidad, cierre ni semáforo.

Punto 3 implementado el 23/11/2026: aritmética separada del semáforo para cociente,
variación, complemento y crecimiento real de la fuente vigente. Las funciones
reciben valores explícitos y entregan valor o causa matemática de imposibilidad;
no deciden fuente/vigencia de inflación, tratamiento operativo de bases cero ni
umbrales. El simulador existente reutiliza el cociente con su contrato y colores
conservados. No se aprueban precisiones de negocio ni nuevas configuraciones de
indicadores; no se modifican datos, metodologías persistidas ni publicaciones.

## Propuestas de modelo para revisión del 23/10/2026

La persona usuaria solicitó un borrador con entidades, tipos y relaciones en chat y Markdown, así como anotaciones de revisión en decisiones y MVP. Esto autoriza documentación del diseño; no implica aprobación de sus tablas ni autorización para ejecutar migraciones. Véanse [modelo-datos-mvp-borrador.md](modelo-datos-mvp-borrador.md) y [alcance-mvp.md](alcance-mvp.md), este último como actualización Markdown v0.3 del Word v0.2, conservado sin modificaciones.

| ID de propuesta | Estado | Diseño propuesto y diferencia |
|---|---|---|
| PROP-BD-001 | Recomendación técnica; por revisar | Núcleo de 13 tablas: agrupaciones, familias, dependencias, usuarios, indicadores, variables, expedientes, capturas, valores, eventos, evidencias, auditoría y notificaciones. Diccionario detallado en el borrador. |
| PROP-BD-002 | Recomendación técnica; por revisar | Fusionar catálogo y relación de variables, derivar participantes de las asignaciones y eliminar agrupación duplicada del indicador. No se aprueba coordinador independiente ni permisos personales adicionales. |
| PROP-BD-003 | Parcialmente confirmada por DEC-032; esquema por adaptar y aprobar | Envío por dependencia y validación conjunta confirmados. Se descarta exigir nuevos envíos de las partes sin cambios en reapertura. Propuesta técnica: referencias explícitas a versiones revisadas anteriores y nuevas versiones solo de lo corregido; validación final del conjunto efectivo completo. Conflictos F13.002/F16.002 siguen abiertos. |
| PROP-BD-004 | Recomendación técnica; por revisar | Expediente por indicador/intervalo/ciclo con resultado validado, copia de configuración, antecedentes utilizados y FK al ciclo anterior. Sin tabla separada de publicaciones. No resuelve P-08. |
| PROP-BD-005 | Recomendación técnica; proveedor definido por DEC-041 | PDF privado en Cloudflare R2; BD guarda clave estable, nombre, MIME, tamaño y SHA-256; backend autoriza la descarga. Modalidad, límites y retención pendientes. |
| PROP-BD-006 | Recomendación técnica; por revisar | Cinco tipos de cálculo y papeles de operandos; parámetros individuales delimitados y escala porcentual consistente. Sin ejecutar fórmula textual. |
| PROP-BD-007 | Recomendación técnica; por revisar | Índice temático calculado bajo demanda y avisos persistidos inicialmente dentro del sistema. Pesos aprobados; cobertura, P-13 y canales aún pendientes. |
| PROP-BD-008 | Extensión condicional; no incluida en 13 tablas | Tabla de referencias con vigencias al confirmarse variables fijas y reutilización automática; copia del valor utilizado desde el inicio. Sin asumir vigencias, responsables ni recálculo. |
| PROP-BD-009 | Recomendación técnica; por revisar | FK compuestas de ámbito, índices únicos parciales para ciclo abierto/envío efectivo, guardado transaccional y valores enviados inmutables. Revisión y validación permanecen acciones distintas. |

### Anotaciones de lo cambiado para revisión

- Se añadieron el diccionario PostgreSQL v0.1 y el alcance Markdown v0.3; no se modificaron los acuerdos DEC-001..025 para convertir recomendaciones en aprobaciones.
- El alcance actualizado integra los acuerdos del 22/10/2026 y corrige los conteos de faltantes del Word; su bitácora REV-MVP-001..007 identifica cada diferencia.
- El Word v0.2 y el ERD HTML siguen como antecedentes sin editar. La lectura operativa vigente debe incluir las versiones Markdown y los pendientes.
- Detalles nuevos respecto a la propuesta del chat: referencia explícita al ciclo anterior, antecedentes exactos del semáforo y FK compuestas entre indicador/ciclo/envío. Todos quedan como propuestas técnicas.

Detalle vigente de DEC-039: [cierre y justificación en flujos de negocio](flujos-negocio.md#cierre-y-justificación--dec-039-06112026). Cierre al terminar el periodo, gris por faltantes, continuidad de revisión de envíos completos y reapertura exclusivamente documental. Implementación operativa pendiente.
