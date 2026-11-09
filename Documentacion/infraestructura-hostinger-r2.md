# Alojamiento y costos del SIIP

**Selección confirmada por el usuario:** 06/11/2026. **Precios públicos comprobados:** 06/11/2026, mercado México para Hostinger. Decisiones DEC-040 y DEC-041. La selección no acredita contratación, configuración ni despliegue.

## Distribución seleccionada

| Componente | Alojamiento | Forma de operación prevista |
|---|---|---|
| Frontend Vue + TypeScript | Hostinger VPS **KVM 1** | Compilar con Vite y servir los archivos estáticos mediante el servidor web. |
| Backend Node.js + TypeScript/Fastify | El mismo VPS KVM 1 | Proceso persistente detrás de un proxy HTTPS. Se conserva la autenticación propia con sesión y CSRF. |
| Base PostgreSQL y sesiones | El mismo VPS KVM 1 | Instancia autoadministrada, accesible por la API mediante localhost. No abrir PostgreSQL directamente a Internet. |
| Archivos PDF, evidencias y justificaciones | **Cloudflare R2** | Objetos privados, con autorización del SIIP y claves nuevas para cada archivo, sin sobrescribir la historia. |

El nombre comercial verificado es **KVM 1**, correspondiente al plan mencionado como «mvk1». La configuración inicial reúne frontend, backend y PostgreSQL en un VPS; no son tres mensualidades de hosting. R2 se factura por separado según uso. Sustituye la propuesta de Neon y la selección anterior de Supabase Storage.

**Compatibilidad comprobada documentalmente:** Hostinger admite Node.js y PostgreSQL en VPS. Servir el frontend compilado junto con la API y la BD es una propuesta de configuración compatible, no una prueba de capacidad del SIIP. Fuentes: [Node.js en Hostinger](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/) y [bases de datos en Hostinger](https://www.hostinger.com/support/which-databases-and-data-tools-are-supported-at-hostinger/).

R2 ofrece API compatible con S3 y un [ejemplo oficial para JavaScript/Node.js](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/). La [compatibilidad S3](https://developers.cloudflare.com/r2/api/s3/api/) no implica que todas las funciones de Amazon S3 existan en R2. Los [buckets son privados por defecto](https://developers.cloudflare.com/r2/buckets/public-buckets/). La propuesta conserva la descarga autenticada por la API; no obliga a hacer públicos los PDF ni a contratar Workers.

## Hostinger KVM 1: precio publicado en MXN

| Concepto | Importe | Condición |
|---|---:|---|
| Promoción, mensual equivalente | **MXN 104.99** | Corresponde a la contratación mostrada de 24 meses. |
| Total inicial publicado | **MXN 2,519.76** | 24 meses. La mensualidad equivalente no es un cobro mensual independiente. |
| Renovación, mensual equivalente | **MXN 210.99** | La página indica renovación por el mismo plazo. |
| Renovación por 24 meses, calculada | **MXN 5,063.76** | 210.99 × 24, manteniendo la tarifa consultada. |

Recursos anunciados: **1 vCPU, 4 GB RAM, 50 GB NVMe y 4 TB de ancho de banda**. Incluye respaldos semanales del VPS. La instalación, actualización y operación de la aplicación/PostgreSQL quedan a cargo del equipo. [Fuente oficial de plan, precio y condiciones](https://www.hostinger.com/mx/vps-hosting).

Los recursos se comparten entre sistema operativo, web, API, PostgreSQL, sesiones, logs y tareas. Debe medirse el consumo antes de afirmar capacidad para una cantidad de usuarios. Un solo VPS es un punto de fallo compartido; R2 separa los archivos, pero no aporta redundancia a la API o a PostgreSQL. Un respaldo semanal no demuestra los objetivos propuestos de recuperación de una hora/cuatro horas.

## Cloudflare R2 Standard: precio publicado en USD

Standard es la clase propuesta para presupuestar el uso inicial. No se selecciona Infrequent Access, cuyas condiciones son diferentes.

| Concepto | Cuota mensual gratuita | Tarifa de excedente |
|---|---:|---:|
| Almacenamiento | 10 GB-mes | **USD 0.015 por GB-mes** |
| Operaciones clase A, como escribir/listar | 1 millón | **USD 4.50 por millón** |
| Operaciones clase B, como leer | 10 millones | **USD 0.36 por millón** |
| Salida de datos desde R2 a Internet | Sin cargo de egress | **USD 0** |

Cloudflare redondea el consumo a la siguiente unidad facturable. GB-mes mide almacenamiento a lo largo del mes. Las cuotas gratuitas aplican a Standard. [Fuente oficial de precios y facturación](https://developers.cloudflare.com/r2/pricing/).

Ejemplos calculados, suponiendo operaciones dentro de las cuotas gratuitas y almacenamiento constante durante todo el mes:

| Almacenamiento facturado como consumo mensual | Costo de almacenamiento R2 |
|---|---:|
| 10 GB-mes | USD 0.00 |
| 100 GB-mes | USD 1.35 |
| 500 GB-mes | USD 7.35 |

Los ejemplos descuentan 10 GB-mes gratuitos. Si otras cargas de la cuenta consumen las cuotas o se exceden las operaciones, el cargo será mayor. No equivalen a un presupuesto fijo ni a una estimación del volumen real de archivos del SIIP.

## Presupuesto y gastos por concretar

- **Base inicial:** MXN 2,519.76 por los primeros 24 meses del VPS, más R2 en USD según consumo. Si R2 permanece dentro de las cuotas gratuitas, su cargo de consumo es USD 0.
- **Base de renovación:** MXN 5,063.76 por 24 meses, calculada con el precio publicado hoy, más consumo de R2.
- No se añade una suscripción separada de Render, Neon o Supabase a esta arquitectura. PostgreSQL corre dentro del VPS.
- Se deben confirmar en la contratación impuestos aplicables, condiciones finales de pago, tipo de cambio/cargos bancarios de R2, dominio y su renovación, correo, monitoreo, respaldo independiente y cualquier entorno o servicio adicional. No se ha revisado el carrito ni la cuenta de IMPLAN. No se presupone que el Web Premium existente cubra o descuente el VPS.
- El tráfico servido por el VPS sigue sujeto al plan de Hostinger. Egress gratuito de R2 no elimina límites ni cargos de otros servicios.

## Estado y siguiente comprobación

Está confirmada la **selección de proveedores**. Pendientes: titularidad y pago institucional, región, dominio/HTTPS, responsable y suplente de operación, presupuesto de respaldo/retención, separación de entornos y pruebas de restauración/carga. La selección no aprueba el borrador de tablas ni autoriza migraciones.

No se han contratado servicios, creado buckets, configurado secretos, conectado la base ni desplegado la aplicación desde esta actualización. La integración de archivos con R2 sigue pendiente de implementar. Las cuentas, límites de PDF y acceso a justificaciones conservan las reglas y pendientes funcionales vigentes.
