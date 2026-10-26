# Primer mensaje sugerido para Codex

> Estamos trabajando en el SIIP Salamanca. Lee `AGENTS.md`, `documentacion/contexto-siip.md`, `documentacion/decisiones-siip.md` y `documentacion/pendientes-siip.md`. Luego **inspecciona en modo solo lectura** los documentos del consultor, el Excel de los 63 indicadores y el archivo local donde está el borrador de nuestra base de datos (puede llamarse `Diagrama 2drawio.html` u otra versión más reciente). Comprueba qué archivos y tecnologías existen actualmente. 
>
> Quiero que avancemos con **el modelo de datos PostgreSQL del MVP**, sin esperar a que el cliente conteste todas las preguntas pendientes. Compárame el ERD real con los requisitos confirmados y propón un diseño **mínimo, mantenible para una persona junior de backend y una de frontend**.
>
> Entrégame: (1) inventario de tablas y relaciones existentes, (2) omisiones que sí bloquean los flujos actuales, (3) tablas que se pueden evitar o fusionar, (4) claves, restricciones e índices indispensables, (5) alternativas y sus riesgos para los puntos pendientes, (6) dudas concretas que aún necesitan decisión. Distingue hecho confirmado, recomendación y pendiente. **No escribas migraciones, no edites archivos ni ejecutes comandos destructivos hasta que apruebe el esquema.**
