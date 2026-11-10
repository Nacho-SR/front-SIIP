import { Decimal } from 'decimal.js';
import { simulacionMetodologiaSchema } from '../schemas/metodologia.schema.js';
import type { SimulacionMetodologia } from '../schemas/metodologia.schema.js';
const ExactDecimal = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export function simularPorcentaje(input: SimulacionMetodologia) {
  const data = simulacionMetodologiaSchema.parse(input);
  if (data.denominador === 0) return { valor: null, semaforo: null, motivo: 'DENOMINADOR_CERO' as const };
  // Compara productos exactos: el redondeo de presentación no cambia el color.
  const parte = new ExactDecimal(data.numerador).times(100);
  const semaforo = parte.gte(new ExactDecimal(data.regla.verdeDesde).times(data.denominador)) ? 'verde' as const
    : parte.gte(new ExactDecimal(data.regla.amarilloDesde).times(data.denominador)) ? 'amarillo' as const : 'rojo' as const;
  return { valor: parte.dividedBy(data.denominador).toFixed(4), semaforo, motivo: null };
}
