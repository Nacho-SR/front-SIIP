# Preguntas abiertas y decisiones bloqueantes — SIIP

**No resolverlas unilateralmente en código.** Se puede avanzar con diseño mínimo sin comprometer las alternativas hasta tener respuestas.

| Clave | Prioridad | Pregunta pendiente | Riesgo en BD/software |
|---|---|---|---|
| P-01 | Alta; parcialmente resuelta | Pesos y umbrales aprobados en DEC-021. Falta cobertura mínima para asignar color y tratamiento de N pequeño. | No asumir que aprobar el índice autoriza cualquier cobertura. |
| P-07 | Calendario y primer corte resueltos por DEC-033; cobertura inicial pendiente | Periodos naturales: alta trimestral el 10 de febrero, primer corte el 31 de marzo. Falta precisar si los datos del primer periodo cubren todo el intervalo natural o solo desde el alta, y autorización de periodos anteriores al registro. | No asumir prorrateo ni generar exigencias previas al alta. |
| P-08 | Núcleo resuelto por DEC-030/031; precisión de vigencia pendiente | Publicaciones sin recálculo; en revisión se conserva la regla; atrasos/reaperturas usan la del periodo. Falta explicitar a qué periodo se asigna una modificación a mitad de un periodo abierto. | Recuperar versiones históricas incluso sin captura previa; no usar simplemente la regla actual. |
| P-09 | Resuelta por el equipo | DEC-022: vista con resultados publicados actualmente para los periodos esperados. | No se requiere reconstrucción de lo conocido en la fecha del corte. |
| P-10 | Alta | Denominador de cobertura: todos los configurados o los ya vigentes/exigibles; condiciones para mostrar color con N pequeño. | Definición de cobertura, datos de UI. |
| P-11 | Media | Cómo presentar en UI periodo fuente, fecha de validación y advertencia de cobertura parcial. | Consultas y payload API. |
| P-12 | Resuelta por el equipo, DEC-033 | Periodos calendario naturales, zona America/Mexico_City, captura desde alta con asignación y validación/publicación al cierre o después. Solo mensual, trimestral, semestral y anual; no se añade bimestral. Cobertura inicial y periodos previos quedan en P-07. | Separar habilitación de captura y habilitación de validación; no cambiar reglas por fecha de envío tardío. |
| P-13 | Media | Persistir snapshots de índice temático vs. cálculo bajo demanda; aclarar si DEC-030 congela también evaluaciones temáticas ya consultadas/publicadas. | No confundir conservar resultados individuales publicados con congelar un agregado calculado bajo demanda. |
| P-14 | Media | Catálogos exactos, formatos de reportes, canales/disparadores de notificaciones. | Persistencia de notificaciones y API. Sin tablas ni función de importación. |

Otras verificaciones pendientes:
- DEC-044 (10/11/2026): preparados cálculo/semáforo parte-total, simulación y versiones
  para fichas inactivas. El usuario confirma Dirección General de Servicios Municipales
  para N/D del ejemplo 130; el inicio se fijará al activar. SQL 007 y prueba real
  aislada aprobados/aplicados con autorización solo en SIIP local. DGSM creada,
  N/D asignadas y metodología v1 (75/90 %) guardada. Falta la activación y su periodo;
  no dar por vigentes estas reglas ni habilitar Captura. [Estado](metodologia-indicadores.md).
- DEC-043 (10/11/2026): ya existe la vista para definir entradas/asignar dependencias en indicadores inactivos. SQL 006 y cuatro ejemplos 130–133 aplicados con autorización expresa en SIIP local; ocho entradas sin responsable asignado. Falta que el equipo elija las dependencias reales en pantalla. No asignar automáticamente por el texto de la ficha. DEC-044 añade metodología preparada y asignación explícita para el ejemplo 130; los otros tres siguen pendientes. Variables fijas, vigencias, activación, captura y cálculo operativo siguen pendientes. [Estado](variables-asignaciones.md).
- DEC-037 (04/11/2026): altas desde Administrador y dependencia obligatoria para Revisión implementadas. Preparado SQL 003, sin ejecutar: si existen revisores sin dependencia, asignarles una real antes de validar la nueva restricción. Verificar altas y auth contra PostgreSQL; no se inventan asignaciones ni se cambian permisos globales de Revisión.
- El cliente entregará las asignaciones de dependencia/usuario por variable; la estructura se puede proponer antes de tenerlas. Depurar denominaciones sin inventar responsables.
- Conciliar `SIIP.02.F13.002` (Desarrollo Económico/DIF: PA y PO) y `SIIP.02.F16.002` (Obras Públicas/CMAPAS: IE e IP). DEC-032 confirma envío por dependencia y validación conjunta, pero convertir aportaciones compartidas en variables distintas sigue como propuesta. Verificar universos, solapamientos y consolidación; no aprobar sumas por el solo cambio de nombre. Alternativas: componentes formalmente distintos y agregación explícita; responsable único que consolida fuera del sistema; o aportaciones a una variable común (cambia DEC-002 y amplía modelo).
- Metas y líneas base ausentes: conteo verificado de 6 y 55, respectivamente; preservar los ceros existentes.
- Se puede preparar estructura y validación de definiciones sin un indicador completamente conciliado; antes de habilitar un indicador real, comprobar operaciones, variables, reglas y evidencia con ejemplos aprobados. No inventar parámetros faltantes ni un motor de fórmulas arbitrarias.
- Evidencias exclusivamente PDF: Cloudflare R2 seleccionado (DEC-041); sustituye Supabase Storage de DEC-034. Faltan tamaño máximo, cantidad por envío, retención, permisos y modalidad final de descarga. Bucket privado y objetos sin sobrescritura son recomendaciones. No se han creado recursos ni elegido un plan.
- Variables fijas aún por definir (DEC-025): conservar el valor utilizado; preparar soporte futuro de valores de referencia con vigencia. No asumir variables concretas ni reutilización automática.
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
- **P-15:** precisar correcciones de envíos observados después del cierre. Conservar la revisión no autoriza automáticamente completar o cambiar datos fuera de plazo.
- **P-16:** precisar destinatarios/visibilidad del PDF de justificación, si requiere revisión/aprobación y condiciones para dar por terminada la apertura documental. No afecta la permanencia del gris.
- **Pendiente técnico:** implementar calendario, bloqueo servidor, estado gris por indicador/periodo y justificación sin exigir captura previa. Los módulos de negocio aún no tienen rutas, tablas ni persistencia. Adaptar el borrador antes de crear SQL de negocio. No confundir esta reapertura con corregir una publicación validada.
- Los antecedentes sobre capturas atrasadas se conservan como historia de versiones de reglas, no como permiso vigente para enviar fuera de plazo. P-07/08/10/13/14 siguen abiertos en sus precisiones no resueltas.
