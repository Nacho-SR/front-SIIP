export const MOTIVO_OPERACION_PENDIENTE =
  'Vista previa: los envíos, correcciones, revisión y validación no están habilitados. Falta la operación autorizada del servidor.';

export function mesMexico(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit',
  }).formatToParts(ahora);
  return `${partes.find(parte => parte.type === 'year')!.value}-${partes.find(parte => parte.type === 'month')!.value}`;
}

// Solo calendario de la vista previa; no concede asignación ni sustituye el reloj del servidor.
export function estadoPeriodo(frecuencia: string, periodo: string, ahora = new Date()): 'abierto' | 'cerrado' | 'futuro' | 'invalido' {
  if (typeof frecuencia !== 'string' || typeof periodo !== 'string') return 'invalido';
  const mesActual = mesMexico(ahora);
  const anio = mesActual.slice(0, 4);
  const mes = Number(mesActual.slice(5));
  let actual: string;
  let patron: RegExp;
  switch (frecuencia.trim().toLowerCase()) {
    case 'mensual': actual = mesActual; patron = /^\d{4}-(0[1-9]|1[0-2])$/; break;
    case 'trimestral': actual = `${anio}-T${Math.ceil(mes / 3)}`; patron = /^\d{4}-T[1-4]$/; break;
    case 'semestral': actual = `${anio}-S${Math.ceil(mes / 6)}`; patron = /^\d{4}-S[1-2]$/; break;
    case 'anual': actual = anio; patron = /^\d{4}$/; break;
    default: return 'invalido';
  }
  if (!patron.test(periodo) || Number(periodo.slice(0, 4)) === 0) return 'invalido';
  return periodo === actual ? 'abierto' : periodo < actual ? 'cerrado' : 'futuro';
}
