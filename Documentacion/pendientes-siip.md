# Preguntas abiertas y decisiones bloqueantes — SIIP

**No resolverlas unilateralmente en código.** Se puede avanzar con diseño mínimo sin comprometer las alternativas hasta tener respuestas.

| Clave | Prioridad | Pregunta pendiente | Riesgo en BD/software |
|---|---|---|---|
| P-01 | Alta; parcialmente resuelta | Pesos y umbrales aprobados en DEC-021. Falta cobertura mínima para asignar color y tratamiento de N pequeño. | No asumir que aprobar el índice autoriza cualquier cobertura. |
| P-07 | Alta | Primer periodo exigible de cada indicador y carga histórica inicial. | Generación de periodos y cálculo de atraso. |
| P-08 | Alta | Al modificar semaforización individual: vigencia, versiones y recálculo o conservación de color histórico. | Versionado de reglas/resultados. |
| P-09 | Resuelta por el equipo | DEC-022: vista con resultados publicados actualmente para los periodos esperados. | No se requiere reconstrucción de lo conocido en la fecha del corte. |
| P-10 | Alta | Denominador de cobertura: todos los configurados o los ya vigentes/exigibles; condiciones para mostrar color con N pequeño. | Definición de cobertura, datos de UI. |
| P-11 | Media | Cómo presentar en UI periodo fuente, fecha de validación y advertencia de cobertura parcial. | Consultas y payload API. |
| P-12 | Media | Calendario concreto de períodos, zona horaria, fechas de apertura y tratamiento de registros históricos. No habrá importación (DEC-023). | Esquema temporal, tareas programadas. |
| P-13 | Media | Persistir snapshots de índice temático vs. cálculo bajo demanda. | Tablas derivadas y pruebas. |
| P-14 | Media | Catálogos exactos, formatos de reportes, canales/disparadores de notificaciones. | Persistencia de notificaciones y API. Sin tablas ni función de importación. |

Otras verificaciones pendientes:
- El cliente entregará las asignaciones de dependencia/usuario por variable; la estructura se puede proponer antes de tenerlas. Depurar denominaciones sin inventar responsables.
- Conciliar con el cliente `SIIP.02.F13.002` (Desarrollo Económico/DIF: PA y PO) y `SIIP.02.F16.002` (Obras Públicas/CMAPAS: IE e IP). El Excel auxiliar suma aportes a una misma variable, contrario a DEC-002 vigente. Dejar pendientes las asignaciones concretas y la unidad de envío y validación; no habilitar consolidación sin aprobación.
- Metas y líneas base ausentes: conteo verificado de 6 y 55, respectivamente; preservar los ceros existentes.
- Comprobar para cada uno de los 63 indicadores operaciones, variables, reglas y evidencia de respaldo requeridas.
- Evidencias exclusivamente PDF (DEC-024): definir tamaño máximo, cantidad por envío, servicio de almacenamiento, retención y permisos de descarga. Almacenamiento privado externo y referencias estables son recomendaciones, todavía no decisión de proveedor.
- Variables fijas aún por definir (DEC-025): conservar el valor utilizado; preparar soporte futuro de valores de referencia con vigencia. No asumir variables concretas ni reutilización automática.
- DEC-027 confirma Vue + TypeScript y Node.js + TypeScript, sustituyendo Laravel (DEC-026). Falta autorizar/inicializar el backend Node.js y elegir framework HTTP, versiones soportadas, acceso a datos, herramienta de migraciones y almacén de sesión. No implementar todavía ni agregar tablas técnicas sin justificar.
- PostgreSQL continúa como motor propuesto y el esquema sigue pendiente de aprobación (DEC-028). Neon Free es propuesta del equipo para desarrollo remoto; no crear servicios ni bases remotas todavía. Hostinger Web Premium sin VPS ya identificado: no aloja PostgreSQL ni figura como opción actual de API Node.js. Elegir hosting definitivo de API/BD y región con los criterios de arquitectura.
- Revisar PROP-TEC-002..006 de [arquitectura-tecnologica.md](arquitectura-tecnologica.md): bases/secretos independientes para desarrollo, staging y producción; conexión TLS, mínimo privilegio, respaldos y salida de proveedor. Presupuesto, retención y objetivos propuestos RPO <= 1 h/RTO <= 4 h requieren acuerdo y prueba antes de producción. Comprobar cupos y funciones reales del plan seleccionado.
- Antes de guardar credenciales al implementar: establecer exclusiones Git del backend, variables protegidas y usuarios separados para ejecución, migraciones y respaldos. Revisar Node del workflow actual y almacenamiento de sesiones; no confundir GitHub Pages con un despliegue integral de API.
- Determinar qué configuraciones puede modificar el administrador desde UI y cuáles requieren intervención técnica.

## Próxima actividad que no depende de todas las respuestas
Revisar [modelo-datos-mvp-borrador.md](modelo-datos-mvp-borrador.md), entregado como propuesta v0.1 el 23/10/2026, y PROP-BD-001..009 de decisiones-siip.md. El alcance actualizado y la bitácora están en [alcance-mvp.md](alcance-mvp.md). Mantener como recomendaciones los detalles del flujo aún no aprobados. No modificar el ERD ni el código, ni generar migraciones, hasta que se apruebe la propuesta y se solicite su implementación.

### Puntos técnicos añadidos a revisión del borrador

- Aprobar o ajustar la unidad de envío por dependencia y validación conjunta. Determinar si una reapertura exige reenvío de todas las aportaciones o permite referencias a envíos ya validados sin atribuir nuevas capturas ficticias.
- Revisar cinco tipos de cálculo, nomenclatura de operandos del complemento y escala porcentual; la clasificación inicial no sustituye revisar cada ficha.
- Política de cambios de frecuencia o pertenencia temática con historia y selección de configuración de ciclos nuevos/abiertos. Las copias para auditoría no resuelven esa vigencia.
- El borrador incluye notificaciones internas, cálculo temático bajo demanda y almacenamiento PDF privado como recomendaciones; no se consideran aprobados los canales, P-13 ni proveedor de almacenamiento.
