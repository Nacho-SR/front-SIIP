# Registro operativo de decisiones SIIP (copia para Codex)

**Actualizado al 23/10/2026.** Basado en `SIIP_Registro_de_Decisiones_v0_2.docx` y los acuerdos posteriores del equipo. Las decisiones DEC-001..025 se consideran **confirmadas por el equipo**; la aprobación formal del cliente puede seguir pendiente. Las propuestas PROP-BD de este archivo NO están aprobadas. Si existe discrepancia futura entre acuerdos confirmados, solicitar conciliación antes de cambiar su interpretación.

| ID | Estado | Decisión |
|---|---|---|
| DEC-001 | Equipo: confirmada | Jerarquía agrupación temática → familia → indicador, con un único padre para cada entidad. |
| DEC-002 | Equipo: confirmada | No hay varias dependencias aportando a una misma variable en MVP; sí variables distintas del mismo indicador. |
| DEC-003 | Equipo: confirmada | Fórmula textual almacenada para la ficha; sin editor de expresiones arbitrarias en MVP. |
| DEC-004 | Equipo: confirmada | Reglas individuales de semaforización pueden cambiar; política histórica pendiente. |
| DEC-005 | Equipo: confirmada | Roles exclusivos Captura, Revisión, Administrador. |
| DEC-006 | Equipo: confirmada | Una cuenta de captura por dependencia prevista inicialmente. |
| DEC-007 | Equipo: confirmada | No hay borradores; capturas completas y válidas. |
| DEC-008 | Equipo: confirmada | Hilos de revisión por ciclo, cerrados pero preservados para auditoría. |
| DEC-009 | Equipo: confirmada | Periodos habilitados automáticamente, sin plazos bloqueantes para captura/validación. |
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
| DEC-024 | Equipo: confirmada 22/10/2026 | Las evidencias serán PDF. Almacenamiento externo planteado por el equipo; proveedor, privacidad y mecanismo de descarga todavía son recomendaciones por revisar. |
| DEC-025 | Equipo: confirmada 22/10/2026 | Conservar el valor utilizado y la configuración aplicada para auditoría. Las variables fijas aún no están definidas; preparar su soporte por vigencia sin asumir valores, reutilización automática ni política de recálculo aprobados. |

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
| PROP-BD-003 | Pendiente de cliente/equipo | Envíos completos por dependencia y validación conjunta del expediente; cada reapertura exige un conjunto completo de nuevos envíos. Revisar reutilización de aportaciones sin cambios y conflictos F13.002/F16.002 antes de implementar. |
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
