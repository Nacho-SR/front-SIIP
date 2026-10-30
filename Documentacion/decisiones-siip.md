# Registro operativo de decisiones SIIP (copia para Codex)

**Actualizado al 27/10/2026.** Basado en `SIIP_Registro_de_Decisiones_v0_2.docx` y los acuerdos posteriores del equipo. DEC-001..025 conservan sus acuerdos funcionales. DEC-026 queda sustituida por DEC-027; DEC-028 registra PostgreSQL como motor propuesto, sin aprobación del esquema. La aprobación formal del cliente puede seguir pendiente. Las propuestas PROP-BD y PROP-TEC NO se convierten en decisiones aprobadas por documentarlas. Si existe discrepancia futura entre acuerdos confirmados, solicitar conciliación antes de cambiar su interpretación.

| ID | Estado | Decisión |
|---|---|---|
| DEC-001 | Equipo: confirmada | Jerarquía agrupación temática → familia → indicador, con un único padre para cada entidad. |
| DEC-002 | Equipo: confirmada | No hay varias dependencias aportando a una misma variable en MVP; sí variables distintas del mismo indicador. |
| DEC-003 | Equipo: confirmada | Fórmula textual almacenada para la ficha; sin editor de expresiones arbitrarias en MVP. |
| DEC-004 | Equipo: confirmada; precisada por DEC-030/031 el 30/10/2026 | Los cambios de regla no recalculan resultados/colores publicados. Una captura en revisión conserva su regla; capturas atrasadas y reaperturas usan la regla del periodo correspondiente. |
| DEC-005 | Equipo: confirmada | Roles exclusivos Captura, Revisión, Administrador. |
| DEC-006 | Equipo: confirmada | Una cuenta de captura por dependencia prevista inicialmente. |
| DEC-007 | Equipo: confirmada | No hay borradores; capturas completas y válidas. |
| DEC-008 | Equipo: confirmada | Hilos de revisión por ciclo, cerrados pero preservados para auditoría. |
| DEC-009 | Equipo: confirmada; precisada por DEC-033 | No hay plazos máximos que bloqueen capturas o validaciones atrasadas. Captura desde el alta con asignación; validar/publicar solo al cierre del periodo o después. |
| DEC-010 | Equipo: confirmada | Consulta autenticada; Captura ve dependencias asignadas y Revisión todo. |
| DEC-011 | Equipo: confirmada | Publicación automática después de validar. |
| DEC-012 | Equipo: confirmada | Reapertura solo por administrador, con nuevo ciclo validable y trazabilidad. |
| DEC-013 | Equipo: confirmada 22/10/2026 | Corte mensual con periodicidades mixtas; último periodo **completo y exigible**, sin reemplazo por periodos viejos si falta el esperado. |
| DEC-014 | Equipo: confirmada | Si falta histórico para semaforizar, se publica valor validado sin color, fuera del temático. |
| DEC-015 | Equipo: confirmada | Indicadores por colonia se capturan municipalmente; desglose queda en evidencia. |
| DEC-016 | Equipo: confirmada | Última versión validada permanece publicada durante reapertura, hasta nueva validación. |
| DEC-017 | Equipo: confirmada | Aviso siete días antes de fin de periodo y señalización de atraso sin bloqueo. |
| DEC-018 | Equipo: confirmada | Metas porcentuales respetan formato/origen de Excel; 1 en celda porcentual representa 100%. |
| DEC-019 | Equipo: confirmada; ajustada por DEC-023 | Administrador gestiona usuarios, dependencias, indicadores, variables, asignaciones, catálogos específicos y reaperturas, sin validar por sí mismo. La importación se retiró del alcance. |
| DEC-020 | Equipo: confirmada | En semáforo temático solo participan resultados publicados con color calculable; mostrar cobertura. |
| DEC-021 | Equipo: confirmada 22/10/2026 | Semáforo temático: verde=1, amarillo=0.5, rojo=0; índice=sumatoria de pesos/N evaluables. Verde si índice >=0.80; amarillo si >=0.50 y <0.80; rojo si <0.50. Sin evaluables: sin índice ni color. Denominador de cobertura y cobertura mínima siguen pendientes. |
| DEC-022 | Equipo: confirmada 22/10/2026 | Los cortes históricos muestran las versiones publicadas actualmente para los periodos esperados; no reconstruyen lo que se conocía en la fecha del corte. Se mantiene DEC-013, sin arrastrar otros periodos. |
| DEC-023 | Equipo: confirmada 22/10/2026 | No habrá importación. Sustituye las menciones previas a importación dentro del MVP y de las facultades del administrador. Reportes y notificaciones continúan en alcance. |
| DEC-024 | Equipo: confirmada 22/10/2026; precisada por DEC-034 | Las evidencias serán PDF. El equipo elige Supabase Storage como dirección de implementación. Límites, conservación y mecanismo final de descarga siguen por definir. |
| DEC-025 | Equipo: confirmada 22/10/2026 | Conservar el valor utilizado y la configuración aplicada para auditoría. Las variables fijas aún no están definidas; preparar su soporte por vigencia sin asumir valores, reutilización automática ni política de recálculo aprobados. |
| DEC-026 | Histórica; sustituida por DEC-027 el 27/10/2026 | El 26/10 se eligió Laravel y se confirmó PHP/Composer operativos. Se conserva el antecedente; ya no define el backend vigente. No hubo aplicación Laravel instalada ni aprobación del esquema por este acuerdo. |
| DEC-027 | Equipo: confirmada 27/10/2026 | Frontend Vue + TypeScript y backend Node.js + TypeScript. Sustituye Laravel de DEC-026. No selecciona framework HTTP, ORM, driver, almacén de sesión ni herramienta de migraciones. No cambia las decisiones funcionales del MVP. |
| DEC-028 | Dirección tecnológica indicada por el equipo 27/10/2026; motor propuesto | Mantener PostgreSQL como motor propuesto y la posibilidad de cambiar de proveedor para producción. No aprueba el borrador de 13 tablas ni autoriza generar migraciones. Las menciones anteriores a PostgreSQL confirmado no deben interpretarse como aprobación definitiva del esquema. |
| DEC-029 | Equipo: confirmada 30/10/2026 | Base backend Node.js 22 + TypeScript + Fastify 5; `pg`, Drizzle ORM y Drizzle Kit instalados. Se acepta autenticación con Argon2id, sesión revocable en servidor, cookie HttpOnly/Secure/SameSite y CSRF, con persistencia propuesta en PostgreSQL. Se autoriza la instalación y el arranque HTTP básico. No aprueba tablas de negocio ni técnicas, migraciones o despliegue; autenticación y almacén de sesiones aún no implementados. |
| DEC-030 | Equipo: confirmada 30/10/2026; precisada por DEC-031 | Cambiar una regla no recalcula ni altera resultados ni semaforización ya publicados. Los nuevos resultados usan las reglas correspondientes; DEC-031 precisa ciclos en revisión, atrasados y reaperturas. Falta explicitar la entrada en vigor de una nueva versión dentro de un periodo y el alcance sobre agregados temáticos bajo demanda (P-13). Un cambio de regla por sí solo no sustituye una publicación; se mantienen DEC-016/022 y la corrección con nueva versión validada. |
| DEC-031 | Equipo: confirmada 30/10/2026 | Una captura ya en revisión conserva la regla anterior si esta cambia. Una captura atrasada o reapertura de un periodo antiguo usa la regla de ese periodo, no la vigente al enviar o corregir. La configuración histórica debe ser recuperable aunque no existiera captura previa. Falta explicitar a qué periodo se asigna una modificación realizada a mitad de un periodo abierto. |
| DEC-032 | Equipo: confirmada 30/10/2026 | Cada dependencia envía su parte cuando aporta variables distintas; Revisión valida el conjunto cuando todas las aportaciones requeridas están revisadas. En reapertura solo se reenvía la aportación que requiere corrección. Se conserva la última publicación hasta nueva validación. Tratar aportes de una misma variable como variables distintas es propuesta del usuario por evaluar; no modifica DEC-002 ni aprueba consolidación automática. |
| DEC-033 | Equipo: confirmada y precisada 30/10/2026 | Se usan periodos calendario naturales: mensual, trimestral, semestral y anual, con corte al fin del mes correspondiente. Un trimestral dado de alta con asignación el 10 de febrero tiene primer corte el 31 de marzo, no el 30 de abril. Captura desde el registro/publicación con dependencia asignada; validar y publicar solo al cierre o después. Zona America/Mexico_City. «Bimestral» fue un ejemplo: no se añade frecuencia. Se mantiene DEC-013 y el no arrastre. Falta definir cobertura de datos del primer periodo cuando el alta es intermedia y autorización de periodos anteriores al alta; no inventar prorrateos. |
| DEC-034 | Dirección tecnológica elegida por el equipo 30/10/2026 | Preparar la integración de evidencias con Supabase Storage. Se recomienda bucket privado, acceso autorizado por la API SIIP y objetos versionados sin sobrescritura. No autoriza crear recursos, contratar planes o migrar BD; usar también PostgreSQL de Supabase en lugar de la propuesta Neon requiere concretarse por separado. Se mantiene la autenticación propia de DEC-029. |
| DEC-035 | Equipo: implementación solicitada 30/10/2026 | Se autoriza el esqueleto por módulos con controllers, services, repositories, schemas y guards, y comenzar autenticación. El equipo confirma que todavía no tiene BD y pide preparar código y SQL sin ejecutarlo. Se implementan los tres endpoints de sesión de DEC-029 y adaptador PostgreSQL; SQL mínimo de autenticación propuesto para revisión, sin aprobar las demás tablas del MVP. Las pruebas usan dobles sintéticos; no hay verificación de PostgreSQL real ni recursos creados. |

Actualización técnica del 30/10/2026: DEC-029/035 completan la selección inicial de DEC-027. Hay arranque, validación de entorno, cabeceras, CORS, límites por IP y código de autenticación modular. Sesión con cookie/CSRF y Argon2id; expiración absoluta inicial de 30 minutos y 5 intentos de login/IP/minuto como valores técnicos revisables. Se relee cuenta/rol/dependencia vigentes; cambios de hash invalidan sesiones previas mediante huella HMAC. El almacén de sesiones usa generación y compare-and-set para impedir sobrescrituras obsoletas tras rotación/revocación. Sin DATABASE_URL, auth responde 503 y salud sigue disponible. El SQL no se ejecuta al iniciar ni se ha aplicado; PostgreSQL real sigue pendiente de prueba.

## Infraestructura vigente — actualización del 27/10/2026

- Solo el backend Node.js necesita conexión directa a PostgreSQL durante la operación; los usuarios de la aplicación acceden mediante la API, sin credenciales de BD en el frontend. Migraciones y respaldos son accesos técnicos separados.
- El equipo confirma Hostinger Web Premium y ningún VPS activo. Ese hosting no aloja PostgreSQL según la documentación oficial de Hostinger; la BD necesita otro servicio o un VPS. No se ha contratado, instalado ni expuesto una BD remota.
- El equipo propone Neon Free para desarrollo remoto; producción puede utilizar otro proveedor PostgreSQL compatible. No se contratan servicios ni se crean bases remotas todavía.
- El hosting de la API Node.js sigue pendiente: Premium no figura entre las opciones actuales de aplicaciones Node.js documentadas por Hostinger. Ver fuentes y criterios en [arquitectura-tecnologica.md](arquitectura-tecnologica.md).

## Propuestas tecnológicas del 27/10/2026

El stack de DEC-027 sí está indicado por el equipo; los detalles operativos siguientes son propuestas para revisión. Su desarrollo y comprobación documental están en [arquitectura-tecnologica.md](arquitectura-tecnologica.md).

| ID | Estado | Propuesta |
|---|---|---|
| PROP-TEC-001 | Propuesta del equipo; sin provisionar | Neon Free para desarrollo remoto usando PostgreSQL convencional. No adoptar servicios propietarios ni elegir automáticamente Neon para producción. |
| PROP-TEC-002 | Recomendación técnica | Desarrollo local por integrante y modalidad remota compartida; staging y producción con bases, usuarios, secretos y almacenamiento independientes. Producción en proyecto/instancia separada recomendado. |
| PROP-TEC-003 | Recomendación técnica | Conexiones parametrizadas, TLS verificado, pool pequeño y credenciales de ejecución/migraciones/respaldo separadas. Secretos fuera de Git y frontend. Driver `pg` como opción por revisar; no instalado. |
| PROP-TEC-004 | Recomendación técnica; bloqueada por aprobación del esquema | Migraciones versionadas con una herramienta única, promoción local → staging → producción, un ejecutor y conexión directa. No generarlas ni ejecutarlas ahora. |
| PROP-TEC-005 | Recomendación técnica; objetivos por acordar | Respaldos independientes cifrados y pruebas de restauración; producción con PITR y exportación lógica. RPO <= 1 h, RTO <= 4 h y retención de 30 días son objetivos propuestos, no SLA aprobados. |
| PROP-TEC-006 | Recomendación técnica | Comparar costo total, disponibilidad, respaldos, seguridad, ubicación y recuperación antes de elegir hosting. Framework, versiones, presupuesto, región, proveedor y objetivos operativos siguen pendientes. |

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

## Propuestas de modelo para revisión del 23/10/2026

La persona usuaria solicitó un borrador con entidades, tipos y relaciones en chat y Markdown, así como anotaciones de revisión en decisiones y MVP. Esto autoriza documentación del diseño; no implica aprobación de sus tablas ni autorización para ejecutar migraciones. Véanse [modelo-datos-mvp-borrador.md](modelo-datos-mvp-borrador.md) y [alcance-mvp.md](alcance-mvp.md), este último como actualización Markdown v0.3 del Word v0.2, conservado sin modificaciones.

| ID de propuesta | Estado | Diseño propuesto y diferencia |
|---|---|---|
| PROP-BD-001 | Recomendación técnica; por revisar | Núcleo de 13 tablas: agrupaciones, familias, dependencias, usuarios, indicadores, variables, expedientes, capturas, valores, eventos, evidencias, auditoría y notificaciones. Diccionario detallado en el borrador. |
| PROP-BD-002 | Recomendación técnica; por revisar | Fusionar catálogo y relación de variables, derivar participantes de las asignaciones y eliminar agrupación duplicada del indicador. No se aprueba coordinador independiente ni permisos personales adicionales. |
| PROP-BD-003 | Parcialmente confirmada por DEC-032; esquema por adaptar y aprobar | Envío por dependencia y validación conjunta confirmados. Se descarta exigir nuevos envíos de las partes sin cambios en reapertura. Propuesta técnica: referencias explícitas a versiones revisadas anteriores y nuevas versiones solo de lo corregido; validación final del conjunto efectivo completo. Conflictos F13.002/F16.002 siguen abiertos. |
| PROP-BD-004 | Recomendación técnica; por revisar | Expediente por indicador/intervalo/ciclo con resultado validado, copia de configuración, antecedentes utilizados y FK al ciclo anterior. Sin tabla separada de publicaciones. No resuelve P-08. |
| PROP-BD-005 | Recomendación técnica; por revisar | PDF privado externo; BD guarda clave estable, nombre, MIME, tamaño y SHA-256; backend autoriza y genera URL temporal. Proveedor, límites y retención pendientes. |
| PROP-BD-006 | Recomendación técnica; por revisar | Cinco tipos de cálculo y papeles de operandos; parámetros individuales delimitados y escala porcentual consistente. Sin ejecutar fórmula textual. |
| PROP-BD-007 | Recomendación técnica; por revisar | Índice temático calculado bajo demanda y avisos persistidos inicialmente dentro del sistema. Pesos aprobados; cobertura, P-13 y canales aún pendientes. |
| PROP-BD-008 | Extensión condicional; no incluida en 13 tablas | Tabla de referencias con vigencias al confirmarse variables fijas y reutilización automática; copia del valor utilizado desde el inicio. Sin asumir vigencias, responsables ni recálculo. |
| PROP-BD-009 | Recomendación técnica; por revisar | FK compuestas de ámbito, índices únicos parciales para ciclo abierto/envío efectivo, guardado transaccional y valores enviados inmutables. Revisión y validación permanecen acciones distintas. |

### Anotaciones de lo cambiado para revisión

- Se añadieron el diccionario PostgreSQL v0.1 y el alcance Markdown v0.3; no se modificaron los acuerdos DEC-001..025 para convertir recomendaciones en aprobaciones.
- El alcance actualizado integra los acuerdos del 22/10/2026 y corrige los conteos de faltantes del Word; su bitácora REV-MVP-001..007 identifica cada diferencia.
- El Word v0.2 y el ERD HTML siguen como antecedentes sin editar. La lectura operativa vigente debe incluir las versiones Markdown y los pendientes.
- Detalles nuevos respecto a la propuesta del chat: referencia explícita al ciclo anterior, antecedentes exactos del semáforo y FK compuestas entre indicador/ciclo/envío. Todos quedan como propuestas técnicas.
