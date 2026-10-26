# Contexto de trabajo — SIIP Salamanca

**Corte de contexto:** 23 de octubre de 2026.
**Origen:** conversación de requisitos entre equipo desarrollador y ChatGPT, Word del consultor, Excel de fichas técnicas, diagrama ERD de draw.io.  
**Naturaleza:** resumen de trabajo; **no es transcripción literal completa de la conversación** ni evidencia de aprobación formal por parte del cliente.

## 1. Objetivo
Sistema Integrado de Indicadores de Planeación de Salamanca, Guanajuato: administrar indicadores municipales y sus fichas, capturar variables/evidencias por periodo, revisar y validar, calcular resultados y semáforos, conservar historia y consultar información publicada.

## 2. Fuentes originales del proyecto
Buscar dentro del repositorio (los archivos pueden estar en distintas subcarpetas):
- `05 Arquitectura del sistema.docx` — consultor, documento funcional de ~80 páginas; no equivale a especificación técnica terminada. Contiene comentarios de revisión del equipo.
- `Anexo 3_4 SIIP Sist(2).xlsx` — hoja `IPSM`, 63 indicadores y 36 columnas de ficha técnica.
- `Diagrama 2drawio.html` — modelo ERD inicial, editable en diagrams.net, **borrador**, no contrato definitivo.
- `SIIP_01_Alcance_MVP_borrador_v0_2.docx` y `SIIP_Registro_de_Decisiones_v0_2.docx` — versiones actualizadas de acuerdos y pendientes (copias incorporadas en este paquete).
- `alcance-mvp.md` — actualización de trabajo v0.3 del 23/10/2026, con acuerdos posteriores al Word y bitácora de diferencias para revisión.
- `modelo-datos-mvp-borrador.md` — propuesta PostgreSQL v0.1 con 13 entidades, tipos, relaciones y restricciones; todavía no aprobada.

Usa datos y fórmulas reales del Excel al diseñar el esquema. No conviertas automáticamente en MVP todas las capacidades imaginadas en el Word.

## 3. Indicadores y estructura
- 63 indicadores, 8 agrupaciones, 54 familias en Excel. Cada indicador pertenece exactamente a una familia; cada familia a una sola agrupación.
- 6 indicadores mensuales, 35 trimestrales, 16 semestrales, 6 anuales.
- 24 acumulables, 39 no acumulables.
- 55 fichas con desagregación municipal de origen y 8 rotuladas «Colonia». En el MVP todas las capturas finales son **municipales**; el capturista prepara previamente las operaciones por colonia y adjunta el detalle como evidencia cuando aplique.
- 3 indicadores aparecen multidependencia en las columnas auxiliares del Excel. Varias dependencias pueden aportar **variables distintas** del mismo indicador; en MVP **no** habrá varias dependencias aportando a una sola variable.
- Hay 26 denominaciones de responsables, no necesariamente 26 dependencias únicas; requieren normalización.
- Verificado en el anexo local de 63 fichas: 6 metas y 55 líneas base vacías o «Por definir». Sustituye el conteo previo de 8 y 59; los valores cero son datos válidos.
- Algunos algoritmos / semáforos usan tendencias o varios periodos, por lo que hay casos de valor validado publicable **sin color**.

## 4. Operación confirmada
### Roles
- **Captura:** un capturista por dependencia previsto para MVP; ingresa datos completos y válidos, responde observaciones y consulta resultados e históricos exclusivamente de indicadores relacionados con su dependencia.
- **Revisión:** revisa, emite observaciones, valida; puede consultar todos los indicadores y generar reportes. Revisar y validar son acciones distintas, aunque del mismo rol.
- **Administrador:** gestiona cuentas, dependencias, familias, indicadores, variables, asignaciones, catálogos delimitados, reaperturas justificadas, historial y supervisión. No reemplaza el flujo ordinario de revisión/validación. No habrá importación (DEC-023).

### Capturas, revisión, histórico
- No existen borradores: se registra una captura únicamente cuando todos los campos obligatorios están completos y son válidos.
- Los periodos se habilitan automáticamente conforme a la periodicidad; no hay límite bloqueante para capturar o validar.
- Señalización preventiva siete días antes del fin del periodo y señalización cuando acaba y queda pendiente. Primer periodo exigible por indicador: por decidir.
- El hilo de observaciones por indicador + periodo + ciclo se cierra al validar, pero se conserva con autor, rol, fecha, acción y comentario. Reapertura crea otro ciclo; no borra anteriores.
- Resultado validado se publica automáticamente. El último publicado continúa visible cuando el administrador lo reabre; al validarse la corrección, se reemplaza la versión publicada y se conserva la anterior para auditoría.
- Vista Consulta siempre autenticada y filtrada por permisos.

### Reglas y metas
- Fórmula original del indicador persistida como dato de ficha técnica, no necesariamente ejecutada como texto arbitrario. Backend solo necesita operaciones comprobadas contra casos reales.
- Las reglas individuales de semaforización pueden modificarse; la política de vigencia y afectación de históricos está pendiente.
- Metas porcentuales del Excel pueden aparecer como `1` en su valor interno aunque Excel renderice `100 %`. Interpretar **formato y unidad** del dato; NO aplicar una conversión global ingenua `si <=1 multiplicar por 100` sin comprobar la ficha.

## 5. Decisión DEC-013: mezcla de periodos por corte mensual
- Usuario elige mes/año; corte = último día del mes.
- Para cada indicador se identifica **su último periodo calendario completo y exigible** según frecuencia y fecha de corte.
- Solo contribuye al semáforo temático la **versión validada/publicada** de ese periodo esperado que tenga color calculable.
- Si falta ese periodo, aunque uno previo esté publicado, **no** se arrastra el anterior.
- Máximo 1 resultado por indicador por corte; no se suman, interpolan ni promedian valores para forzar igualdad entre frecuencias.
- Ejemplo corte 30/sept/2026 (si esos periodos son exigibles): mensual sep/2026, trimestral jul–sep/2026, semestral ene–jun/2026, anual ene–dic/2025.
- No evaluables: sin captura, pendiente, observados, sin valor validado o sin semáforo por falta de antecedente. No se tratan como rojos ni como cero.
- Mostrar cobertura (evaluables / universo aplicable) y periodo fuente individual. **Denominador exacto y umbral mínimo de cobertura no aprobados**.

## 6. Semáforo temático aprobado por el equipo (DEC-021)
Confirmado por el equipo el 22/10/2026: verdes=1, amarillos=0.5, rojos=0; índice=sumatoria de pesos/N evaluables. Umbrales: verde >=0.80; amarillo >=0.50 y <0.80; rojo <0.50. Si N=0, no existe índice ni color. Siguen pendientes el denominador de cobertura y las condiciones para mostrar color con cobertura parcial o N pequeño; la aprobación de pesos y umbrales no resuelve esos puntos.

### Acuerdos posteriores a la revisión inicial
- DEC-022: los cortes históricos consultan las publicaciones actuales de los periodos esperados, sin reconstrucción de lo conocido entonces y sin arrastre de otros periodos.
- DEC-023: no habrá importación; reportes y notificaciones siguen en alcance.
- DEC-024: evidencias en PDF; proveedor externo y mecanismo de descarga aún por definir.
- DEC-025: conservar valores utilizados y configuración aplicada. Variables fijas y sus vigencias aún por definir; no asumir reutilización automática ni política de recálculo.
- El cliente entregará responsables por variable. Se puede modelar la estructura antes de contar con esas asignaciones.
- Conflicto pendiente con DEC-002: el Excel auxiliar consolida las mismas variables entre dependencias en `SIIP.02.F13.002` y `SIIP.02.F16.002`. Mantener la decisión vigente y dejar sin aprobar la unidad de envío/validación hasta conciliar con el cliente.
- Preparar el primer periodo exigible sin asignar fechas ficticias ni generar atrasos derivados de ellas.

## 7. Lineamientos técnicos
- PostgreSQL confirmado. El resto del stack debe verificarse en los archivos/repo; NO asumir React/Vite u otras tecnologías sin comprobarlas para ESTE repositorio.
- Modelo de datos mínimo: preferir ENUM simples frente a catálogos separados cuando no se necesite operar sobre registros de catálogo.
- Separar entidades indispensables de funciones accesorias. Incluye integridad, historial operacional, publicación y auditoría sin sobreingeniería.
- Las tablas que existían en el borrador al revisarlo: `usuarios`, `agrupacion_tematica`, `familias`, `indicadores`, `capturas`, `variables_indicadores`, `catalogo_variables`, `dependencia`, `indicador_dependencia`, `valores_variables_captura`. **Verificar contra la última versión local del ERD.**

## 8. Artefactos de desarrollo planeados
1) Alcance/MVP; 2) SRS con historias, RF/RNF y reglas; 3) flujos y matriz de permisos; 4) arquitectura/stack/Git/CI-CD; 5) ERD+diccionario SQL; 6) API OpenAPI; 7) UI/UX; 8) pruebas y aceptación; 9) despliegue/operación. Mantener registro de decisiones; no duplicar información innecesaria.

## 9. Trabajo actual
La revisión inicial del ERD y las fuentes está realizada. Se entrega el borrador PostgreSQL solicitado en `modelo-datos-mvp-borrador.md`, con 13 entidades, tipos, relaciones, restricciones y pendientes. `alcance-mvp.md` actualiza el MVP en Markdown y `decisiones-siip.md` registra PROP-BD-001..009 como recomendaciones por revisar. La propuesta de tablas, campos y flujo no está aprobada todavía; no se han modificado el ERD HTML, los Word ni el código, ni generado migraciones.
