# Preguntas abiertas y decisiones bloqueantes — SIIP

**No resolverlas unilateralmente en código.** Se puede avanzar con diseño mínimo sin comprometer las alternativas hasta tener respuestas.

## Prioridad después del cuestionario recibido

Actualización 24/11/2026: [conciliación de las 103 preguntas](conciliacion-respuestas-cuestionario.md).
Hay 66 respuestas sustantivas, pero varias son parciales o contradicen acuerdos;
37 preguntas y las 63 autorizaciones de ficha siguen pendientes. La sección 10 y
la identidad/fecha de quien responde siguen sin completar. Los complementos del
Excel son evidencia documental, no aprobación institucional.

Priorizar CR-01 (captura tardía y correcciones), CR-03 (propagación de referencias),
CR-08/09 (acceso y retención de documentos), CR-10 (motivos de gris/sin color) y
CR-11 (retiro expreso propuesto del semáforo temático). CR-02/04/05/06/07/12
completan metodología, validaciones, fechas, justificación, archivos e histórico.
La matriz contiene la respuesta recibida, impacto y precisión concreta de cada uno.

G04 y M07 siguen vacías; T04 selecciona A sin proporcionar los colores solicitados,
T05 no distingue meta actual de cumplida alguna vez y G05 no fija decimales ni
momento del redondeo. H03 declara población femenina adulta: no equivale a PM de
todas las mujeres de F08 ni a población adulta de ambos sexos. F02–F36 no tienen
respuesta institucional; I01–I63 siguen sin autorizar.

Los acuerdos y avances históricos de las secciones siguientes se conservan con
esta advertencia. Un pendiente con respuesta parcial no se vuelve resuelto ni
autoriza tablas, endpoints, permisos o datos reales.

| Clave | Prioridad | Pregunta pendiente | Riesgo en BD/software |
|---|---|---|---|
| P-01 | Alta; condicionada a CR-11 | E05–E07 proponen retirar el semáforo temático. Validar ese cambio frente a DEC-020/021 y qué estadísticas permanecen. | No implementar umbrales/cobertura agregados ni eliminar funciones antes de conciliar el alcance. |
| P-07 | Inicio resuelto por DEC-045 y respuesta R04; precisión de acumulación pendiente | Siguiente periodo natural completo, sin periodo parcial ni retroactivo. M01/O01 no fijan fechas por indicador ni reinicios. El ejemplo antiguo de alta intermedia DEC-033 es histórico. | No elegir el periodo en curso por cercanía ni asumir acumulación desde una fecha de salida aún no fijada. CR-05. |
| P-08 | Opción resuelta por DEC-052/R11; campos pendientes CR-02 | No editar metodología activa; otra alta independiente sin reemplazo/vínculo. G01/G02/M06 deben separar campos bloqueados, Variables editables, metas futuras y universo. | Preservar configuración e historia; no habilitar edición, reasignación o recálculo por una respuesta ambigua. |
| P-09 | Acuerdo previo del equipo; en cotejo con E08 | DEC-022 usa publicaciones actuales para los periodos esperados. E08 pide conservar histórico sin recálculo, pero no precisa si se refiere a corte, reporte emitido o versión individual. | Conservar el criterio existente hasta resolver CR-12/P-13; no inferir reconstrucción histórica ni snapshots nuevos. |
| P-10 | Alta; condicionada a CR-11 | Definir si se conserva cobertura numérica u otras estadísticas después del retiro temático propuesto en E05–E07. | No confundir ausencia de color agregado con ausencia de catálogo, familias o estadísticas individuales. |
| P-11 | Parcial; E09/O11 | Se piden periodo, fecha, meta, fuente y semaforización; faltan visibilidad por perfil y distinción gris/sin color/revisión. | Proyecciones y leyendas dependen de CR-08/10; sin ampliar acceso a insumos. |
| P-12 | Calendario confirmado; cierre en conciliación | DEC-045/R04 precisan inicio en siguiente periodo completo para mensual/trimestral/semestral/anual, America/Mexico_City. R05 propone cifras tardías y O05 correcciones acotadas. | Conservar calendario implementado; no cambiar permisos de escritura/cierre hasta CR-01/05. |
| P-13 | Media; respuesta E08 parcial y cambio CR-12 | Histórico sin recálculo requiere precisar objeto ante retiro temático propuesto: corte consultado, reporte emitido o publicación individual. | No deducir snapshots ni cambiar DEC-022 sin autorización concreta. |
| P-14 | Parcial; E04/O12 | Reportes incompletos identificados; avisos del indicador en observaciones y generales por correo. Faltan formatos, columnas, perfiles, destinatarios, eventos y condiciones del aviso preventivo. | No conceder exportaciones ni crear tablas/canales por inferencia. Sin importación. |

Otras verificaciones pendientes:
- Consulta real, 24/11/2026: catálogo/fichas conectados a API con proyección propia y alcance por sesión; cuatro perfiles comprobados con dobles y flujo cliente–API. Esta pantalla no usa JSON ni resultados locales. Corte/semáforo deshabilitados sin publicaciones; no hay gris inferido ni sincronización del anexo. Pendientes PostgreSQL real autorizado y revisión visual escritorio/móvil: navegador local agotó conexión y Computer Use se detuvo por URL no verificable. [Estado y contrato](consulta-indicadores.md). Análisis/Seguimiento y las API operativas restantes conservan sus límites previos.
- Punto 4, 23/11/2026: preparada y comprobada integración cliente/frontend–Fastify con cuatro perfiles, dos dependencias y un indicador compartido. Sin bypass en los recorridos comprobados; ver `matriz-permisos.md`. No conecta a PostgreSQL ni verifica navegador. Permanecen pendientes BD real autorizada, revisión visual y permisos por objeto/periodo de las API operativas aún no implementadas. Las vistas de demostración no acreditan esos flujos.
- Punto 3, 23/11/2026: aritmética pura implementada y probada para cociente con factor, variación, complemento y crecimiento real. El simulador de parte/total reutiliza el cociente conservando umbrales y contrato. No habilita nuevas reglas de UI/API: siguen pendientes fuentes/periodos de historia y referencias, rangos por variable, precisión/redondeo de negocio, acumulación y semáforos conciliados. Cero divisor/base devuelve causa matemática sin asignar color ni resolver su tratamiento operativo. Contratos técnicos en `siip-backend/src/modules/evaluacion/README.md`.
- Punto 2, 23/11/2026: calendario natural de referencia implementado en el servicio compartido y la bandeja propia. Inicio/fin inclusivos para las cuatro frecuencias, una fecha del servidor en America/Mexico_City y pruebas de bisiestos, medianoche y cambio de año. No genera periodos exigibles ni clasifica incumplimientos; el calendario operativo de escritura/cierre sigue pendiente. Sin SQL nuevo ni consultas a la BD real.
- 23/11/2026: implementada bandeja propia de Captura de solo lectura por API, con aislamiento por dependencia/variables, frecuencia e inicio vigente. No hay nuevas migraciones ni carga de datos. Pruebas con dobles/SSR; queda comprobarla con PostgreSQL autorizado y revisar escritorio/móvil (acceso del navegador local bloqueado en esta sesión). Envíos, evidencia, autorización por periodo, cierre y semáforo siguen pendientes; mostrar asignaciones inactivas no las habilita.
- Revisión repetida con `Anexo 3_4 SIIP Sist.xlsx` indicado por el usuario: 63 fichas, 117 entradas, 25 con tendencia/meta y 29 con antecedentes. Sustituye los conteos iniciales de 116/24/28 para el análisis vigente. Predial ya incorpora inflación; definir año, fuente y método de I. Presupuesto ya dice Ascendente; no queda resuelto el sobreejercicio. MiPyMEs ahora es Acumulable con tendencia/meta: definir intervalo, reinicio y beneficiarios únicos entre cortes. Panteones es No acumulable (corregir descripción residual CEI); vida útil se define en años (confirmar fuente de proyección VP). Medio de Verificación de SIIP.01.F07.003 está vacío. No se ha actualizado la BD cargada desde `(2)` ni se autoriza hacerlo por esta revisión.
- Acuerdos DEC-047 a DEC-052 registrados sin atribuirlos al director. Siguen pendientes: secuencias mixtas/prioridad de colores, ceros en denominadores y bases, acumulación/stock/ventanas, metas relativas y horizontes, precisión de datos, correcciones de antecedentes y autoridad para ratificar reglas nuevas. No activar una metodología contradictoria por aproximación.
- Otras discrepancias por conciliar en la fuente designada: SIIP.03.F22.001 (promedio anual frente a variación semestral y meta +2 empresas); SIIP.04.F30.001 (espacios atendidos frente a intervenciones integrales); SIIP.04.F33.002 (suficiencia 100 %, verde 50 %, meta 70 %). También resolver cohortes y universos F49/F51 y F47/F54, y límites ambiguos F01.003/F17.002/F26.002. Vida útil conserva bandas explícitas y umbral de gestión de 3 años; confirmar proyección VP. La lista no reemplaza el detalle de la matriz. No seguir presentando inflación omitida, sentido Constante o definición en proporción de vida útil como defectos de esta fuente.
- DEC-046 (20/11/2026): preparadas 63 fichas del anexo y carga documental atómica. Prueba aislada aprobada y esquema eliminado; carga de 63 fichas inactivas autorizada/aplicada el 20/11/2026 solo en SIIP local, total 67 con ejemplos intactos. Después siguen la conciliación metodológica, configuración de variables/asignaciones y activación individual; la carga no las aprueba. [Estado](carga-anexo-indicadores.md).
- DEC-045 (17/11/2026): activación preparada con fecha explícita desde el siguiente periodo natural completo (confirmado por el usuario). SQL 008 aplicado con autorización solo en SIIP local tras dos integraciones reales aisladas aprobadas. Ejemplo 130 activo desde 01/12/2026 con metodología v2 (75/90 % y DGSM conservados). No habilita Captura ni resuelve cambios con ciclos abiertos. [Estado](activacion-indicadores.md).
- DEC-043 (10/11/2026): ya existe la vista para definir entradas/asignar dependencias en indicadores inactivos. SQL 006 y cuatro ejemplos 130–133 aplicados con autorización expresa en SIIP local; ocho entradas sin responsable asignado. Falta que el equipo elija las dependencias reales en pantalla. No asignar automáticamente por el texto de la ficha. Variables fijas, vigencias, activación, captura y cálculo siguen pendientes. [Estado](variables-asignaciones.md).
- DEC-037 (04/11/2026): altas desde Administrador y dependencia obligatoria para Revisión implementadas. Preparado SQL 003, sin ejecutar: si existen revisores sin dependencia, asignarles una real antes de validar la nueva restricción. Verificar altas y auth contra PostgreSQL; no se inventan asignaciones ni se cambian permisos globales de Revisión.
- El cliente entregará las asignaciones de dependencia/usuario por variable; la estructura se puede proponer antes de tenerlas. Depurar denominaciones sin inventar responsables.
- Conciliar `SIIP.02.F13.002` (Desarrollo Económico/DIF: PA y PO) y `SIIP.02.F16.002` (Obras Públicas/CMAPAS: IE e IP). DEC-032 confirma envío por dependencia y validación conjunta, pero convertir aportaciones compartidas en variables distintas sigue como propuesta. Verificar universos, solapamientos y consolidación; no aprobar sumas por el solo cambio de nombre. Alternativas: componentes formalmente distintos y agregación explícita; responsable único que consolida fuera del sistema; o aportaciones a una variable común (cambia DEC-002 y amplía modelo).
- Metas y líneas base ausentes: conteo verificado de 6 y 55, respectivamente; preservar los ceros existentes.
- Se puede preparar estructura y validación de definiciones sin un indicador completamente conciliado; antes de habilitar un indicador real, comprobar operaciones, variables, reglas y evidencia con ejemplos aprobados. No inventar parámetros faltantes ni un motor de fórmulas arbitrarias.
- Evidencias exclusivamente PDF: Cloudflare R2 seleccionado (DEC-041); sustituye Supabase Storage de DEC-034. Faltan tamaño máximo, cantidad por envío, retención, permisos y modalidad final de descarga. Bucket privado y objetos sin sobrescritura son recomendaciones. No se han creado recursos ni elegido un plan.
- Referencias y antecedentes (DEC-049/050): autoridad y selección temporal resueltas: Administrador registra/autoriza y se usa la referencia aplicable al inicio del periodo. Faltan fuentes, cifras, año y ámbito de poblaciones femenina/adulta, contratos, persistencia y resolución automática. Antecedentes iniciales documentados permitidos; no habilita importador ni altera captura vencida.
- DEC-029/035: existe base modular y código de autenticación Argon2id con sesión revocable, cookie/CSRF y adaptador PostgreSQL. `siip-backend/sql/001_auth_propuesta.sql` propone dependencias, usuarios y una tabla técnica de sesiones para revisión. Actualización 04/11/2026, DEC-036: el equipo ya creó una base vacía. Están preparados el CLI admin:create, altas administrativas y SQL 002 de auditoría. Faltan configurar DATABASE_URL, aplicar SQL 001/002, ejecutar el bootstrap con datos del administrador y verificar PostgreSQL real. No se aplicó SQL desde este chat. El esquema restante del negocio sigue sin aprobarse.
- PostgreSQL continúa como motor propuesto y el esquema sigue pendiente de aprobación (DEC-028). DEC-040 selecciona frontend/API/PostgreSQL en el mismo Hostinger VPS KVM 1 y sustituye Neon. Ya no está pendiente el proveedor; sí contratación, región, operación, separación de entornos y prueba real. El antecedente Web Premium no acredita contratación del VPS. No se crean servicios desde esta actualización.
- Revisar PROP-TEC-002..006 de [arquitectura-tecnologica.md](arquitectura-tecnologica.md): bases/secretos independientes para desarrollo, staging y producción; conexión TLS, mínimo privilegio, respaldos y salida de proveedor. Presupuesto, retención y objetivos propuestos RPO <= 1 h/RTO <= 4 h requieren acuerdo y prueba antes de producción. Comprobar cupos y funciones reales del plan seleccionado.
- El backend ya excluye `.env` de Git y dispone de `.env.example`. Faltan variables protegidas en hosting/CI y usuarios separados para ejecución, migraciones y respaldos. Revisar Node del workflow actual y almacenamiento de sesiones; no confundir GitHub Pages con un despliegue integral de API.
- Determinar qué configuraciones puede modificar el administrador desde UI y cuáles requieren intervención técnica.

## Próxima actividad que no depende de todas las respuestas
Actualización 09/11/2026, DEC-042: el usuario solicita implementar el alta persistente
de fichas, exclusivamente inactivas. SQL 005 aplicado con autorización expresa solo
en SIIP local (localhost:5432/public), con ocho agrupaciones, 54 familias y ninguna
ficha ficticia en las tablas de trabajo. Integración real aislada aprobada. Este alcance
no aprueba las otras tablas ni habilita Captura/Seguimiento. Estado y contratos
en [alta-indicadores.md](alta-indicadores.md). Las restricciones siguientes se
conservan para el resto del modelo y sus decisiones abiertas.

Revisar [modelo-datos-mvp-borrador.md](modelo-datos-mvp-borrador.md), entregado como propuesta v0.1 el 23/10/2026, y PROP-BD-001..009 de decisiones-siip.md. El alcance actualizado y la bitácora están en [alcance-mvp.md](alcance-mvp.md). Mantener como recomendaciones los detalles del flujo aún no aprobados. No modificar el ERD ni el código, ni generar migraciones, hasta que se apruebe la propuesta y se solicite su implementación.

### Puntos técnicos añadidos a revisión del borrador

- DEC-032 confirma envío por dependencia, validación conjunta y reapertura con solo la aportación necesaria. Falta adaptar/aprobar el esquema y contratos para conservar referencias exactas a aportaciones anteriores sin cambios, sin atribuirlas a una nueva captura/revisión ficticia.
- Revisar cinco tipos de cálculo, nomenclatura de operandos del complemento y escala porcentual; la clasificación inicial no sustituye revisar cada ficha.
- Política de cambios de frecuencia o pertenencia temática con historia y selección de configuración de ciclos nuevos/abiertos. Las copias para auditoría no resuelven esa vigencia.
- El borrador incluye notificaciones internas, cálculo temático bajo demanda y almacenamiento PDF privado como recomendaciones; no se consideran aprobados los canales ni P-13. El proveedor de archivos quedó seleccionado después por DEC-041 (R2).

## Actualización 06/11/2026 — DEC-038 y DEC-039

- **Resuelto:** existe rol Consulta, varias cuentas sin dependencia y lectura global de fichas, resultados publicados y estadísticas. Auth y altas implementadas; SQL 004 aplicado con autorización expresa el 09/11/2026 solo en la base local `SIIP` de `localhost:5432`, con los cuatro valores del ENUM verificados y sin modificar cuentas. Otros entornos requieren comprobación y autorización propias. Exportaciones y acceso a PDF/expedientes internos no se conceden por defecto.
- **Resuelto con el director:** cierre de captura al fin del periodo natural, gris por faltantes/incompletos, continuidad de revisión para envíos completos y reapertura solo para adjuntar justificación PDF conservando gris. Sustituye la captura tardía sin bloqueo.
- **P-15, actualización 24/11/2026:** O05 acepta correcciones acotadas de envíos completos recibidos en plazo, pero faltan autorizador, duración, campos y evidencia. R05 propone además completar cifras tardías de faltantes; resolver por separado en CR-01, sin considerar ratificado DEC-039 ni habilitar escrituras por esta nota.
- **P-16, actualización 24/11/2026:** O09 indica seguimiento como posible aportante, cierre por Administrador sin confirmación de recibido ni límite de recepción; faltan rol/acción exactos y versiones/observaciones. E02 cambia lectores y R05 puede cambiar cifras/gris. Resolver CR-01/06/08; no conceder nuevos permisos ni dar por aprobada la política completa.
- **Pendiente técnico:** implementar calendario, bloqueo servidor, estado gris por indicador/periodo y justificación sin exigir captura previa. Los módulos de negocio aún no tienen rutas, tablas ni persistencia. Adaptar el borrador antes de crear SQL de negocio. No confundir esta reapertura con corregir una publicación validada.
- Los antecedentes sobre capturas atrasadas se conservan como historia de versiones de reglas, no como permiso vigente para enviar fuera de plazo. P-07/08/10/13/14 siguen abiertos en sus precisiones no resueltas.
