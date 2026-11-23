import { Decimal } from 'decimal.js';
import { z } from 'zod';

// Margen para operar hasta tres entradas de 32 dígitos antes de la división final.
const ExactDecimal = Decimal.clone({ precision: 100, rounding: Decimal.ROUND_HALF_UP });
const decimalSchema = z.string().max(34).regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  .refine(value => value.replace(/[-.]/g, '').length <= 32, 'Usa hasta 32 dígitos entre la parte entera y fraccionaria.')
  .transform(value => new ExactDecimal(value));
const cocienteSchema = z.strictObject({ numerador: decimalSchema, denominador: decimalSchema, factor: decimalSchema });
const variacionSchema = z.strictObject({ actual: decimalSchema, anterior: decimalSchema, factor: decimalSchema });
const complementoSchema = z.strictObject({ base: decimalSchema, parte: decimalSchema, factor: decimalSchema });
const crecimientoRealSchema = z.strictObject({ actual: decimalSchema, anterior: decimalSchema, inflacionPorcentual: decimalSchema });

function resultado(valor: Decimal) {
  return { valor: valor.toFixed(), motivo: null };
}

export function calcularCociente(input: z.input<typeof cocienteSchema>) {
  const { numerador, denominador, factor } = cocienteSchema.parse(input);
  if (denominador.isZero()) return { valor: null, motivo: 'DENOMINADOR_CERO' as const };
  return resultado(numerador.times(factor).dividedBy(denominador));
}

export function calcularVariacion(input: z.input<typeof variacionSchema>) {
  const { actual, anterior, factor } = variacionSchema.parse(input);
  if (anterior.isZero()) return { valor: null, motivo: 'BASE_CERO' as const };
  return resultado(actual.minus(anterior).times(factor).dividedBy(anterior));
}

export function calcularComplemento(input: z.input<typeof complementoSchema>) {
  const { base, parte, factor } = complementoSchema.parse(input);
  if (base.isZero()) return { valor: null, motivo: 'DENOMINADOR_CERO' as const };
  return resultado(base.minus(parte).times(factor).dividedBy(base));
}

export function calcularCrecimientoReal(input: z.input<typeof crecimientoRealSchema>) {
  const { actual, anterior, inflacionPorcentual } = crecimientoRealSchema.parse(input);
  if (anterior.isZero()) return { valor: null, motivo: 'BASE_CERO' as const };
  const ajuste = inflacionPorcentual.plus(100);
  if (ajuste.isZero()) return { valor: null, motivo: 'AJUSTE_INFLACION_CERO' as const };
  const baseAjustada = anterior.times(ajuste);
  // Equivale a ((actual/anterior)/(1+inflación/100)-1)*100, con una sola división.
  return resultado(actual.times(100).minus(baseAjustada).times(100).dividedBy(baseAjustada));
}
