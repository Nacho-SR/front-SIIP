import { Decimal } from 'decimal.js';
import { simulacionMetodologiaSchema } from '../schemas/metodologia.schema.js';
import type { SimulacionMetodologia } from '../schemas/metodologia.schema.js';
import { calcularCociente } from '../../evaluacion/services/calculo.service.js';
const ExactDecimal = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export function simularPorcentaje(input: SimulacionMetodologia) {
  const data = simulacionMetodologiaSchema.parse(input);
  const calculo = calcularCociente({ numerador: String(data.numerador), denominador: String(data.denominador), factor: '100' });
  if (calculo.valor === null) return { ...calculo, semaforo: null };
  // Compara productos exactos: el redondeo de presentación no cambia el color.
  const parte = new ExactDecimal(data.numerador).times(100);
  const semaforo = parte.gte(new ExactDecimal(data.regla.verdeDesde).times(data.denominador)) ? 'verde' as const
    : parte.gte(new ExactDecimal(data.regla.amarilloDesde).times(data.denominador)) ? 'amarillo' as const : 'rojo' as const;
  return { valor: new ExactDecimal(calculo.valor).toFixed(4), semaforo, motivo: null };
}
