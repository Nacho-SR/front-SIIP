# Evaluación

## Aritmética separada del semáforo — punto 3, 23/11/2026

`services/calculo.service.ts` contiene cuatro funciones puras. Reciben todos sus
operandos explícitos, no dependen de Fastify, sesión, reloj o BD y no asignan color.
No interpretan la fórmula textual ni buscan antecedentes, población o inflación.

| Función | Entradas (cadenas decimales) | Operación |
|---|---|---|
| `calcularCociente` | `numerador`, `denominador`, `factor` | numerador / denominador × factor |
| `calcularVariacion` | `actual`, `anterior`, `factor` | (actual − anterior) / anterior × factor |
| `calcularComplemento` | `base`, `parte`, `factor` | (base − parte) / base × factor |
| `calcularCrecimientoReal` | `actual`, `anterior`, `inflacionPorcentual` | [(actual / anterior) / (1 + inflación / 100) − 1] × 100 |

Ejemplo: `calcularCrecimientoReal({actual: '121', anterior: '100',
inflacionPorcentual: '10'})` devuelve `{valor: '10', motivo: null}`. La inflación
`'10'` significa 10 %, no 0.10. Los importes deben estar en una base compatible;
la función no detecta importes previamente deflactados ni autoriza su uso.

Referencias algebraicas de la revisión de `Anexo 3_4 SIIP Sist.xlsx`: cociente
SIIP.01.F02.002, variación SIIP.01.F01.002, complemento SIIP.05.F34.003 (AP es la
base/divisor, AF la parte) y crecimiento real SIIP.08.F52.002. Los ejemplos de
prueba son sintéticos, no cifras operativas ni configuraciones autorizadas.

## Contrato y precisión técnica

- Resultado calculable: `{valor: string, motivo: null}`. La cadena no usa notación
  científica y no se limita a 0–100: una variación negativa es un resultado válido.
- Divisor cero en cociente/complemento: `{valor: null, motivo: 'DENOMINADOR_CERO'}`.
- Antecedente cero en variación/crecimiento real: motivo `BASE_CERO`.
- Inflación −100 % con antecedente no nulo: motivo `AJUSTE_INFLACION_CERO`, porque
  el divisor de ajuste es cero. Si ambos divisores son cero, se informa primero
  `BASE_CERO`.
- Un resultado nulo no es cero, rojo, gris ni decisión de publicación. Estos
  motivos describen la imposibilidad matemática; el tratamiento de negocio de
  esos casos sigue pendiente de respuesta.
- Todos los campos son obligatorios, sin valores implícitos ni parámetros extra.
  Se rechazan números JS, null, vacíos, comas, espacios, notación científica,
  NaN/Infinity y expresiones. La entrada se valida con Zod antes de operar.
- Se usa decimal.js ya instalado, con contexto local de 100 dígitos significativos.
  Tope técnico: 32 dígitos en total por entrada, contando parte entera y fraccionaria
  (incluidos ceros), sin contar signo/punto. No cambia la configuración global de
  Decimal. Se multiplican/restan operandos antes de dividir para conservar cifras.
  Las divisiones periódicas se aproximan a esa precisión con ROUND_HALF_UP; no se
  aplica un redondeo de presentación o una escala de persistencia de negocio.

Estos límites son del módulo matemático interno, no una aprobación de campos de
captura. Signos, rangos por variable, factor permitido, unidades, correspondencia
de periodos, origen de referencias, horizonte, acumulación y redondeo final
deberán validarse en el contexto de cada metodología conciliada. La aritmética
admite signos/factores finitos sin declarar que sean válidos para un indicador.

## Integración y alcance pendiente

El simulador administrativo existente `simularPorcentaje` reutiliza
`calcularCociente` con factor 100. Conserva sus restricciones de parte/total:
conteos enteros seguros no negativos, N ≤ D, color por productos antes de redondear,
contexto decimal local de 40 dígitos para esas comparaciones y presentación de
cuatro decimales. No cambia los umbrales 75/90 del ejemplo 130, el contrato HTTP,
los snapshots ni las versiones persistidas.

No se amplía la selección ni la activación de metodologías en UI/API, no se añaden
endpoints/SQL, no se leen o modifican datos reales y no se calculan publicaciones.
Resolver referencias e historia, semaforizar tendencias, acumular, datos directos,
sumas y evaluación temática siguen pendientes de sus pasos y acuerdos respectivos.
Solo se habilitarán indicadores completos, compatibles y probados; estas funciones
no acreditan por sí mismas la compatibilidad de las 63 fichas.

Pruebas en `test/calculo.test.mjs`: ejemplos, factores, ceros, negativos, precisión,
rechazo de entradas inválidas y ausencia de efectos laterales. Las pruebas de
metodología existentes comprueban que se conserva la simulación y sus permisos.
