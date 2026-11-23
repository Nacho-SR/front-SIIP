import { HttpError } from '../../../shared/http-error.js';
import { z } from 'zod';

const meses = { Mensual: 1, Trimestral: 3, Semestral: 6, Anual: 12 } as const;
export const ZONA_HORARIA = 'America/Mexico_City';
const fechaCalendario = z.iso.date().refine(fecha => fecha >= '1900-01-01');
export type Frecuencia = keyof typeof meses;
export function fechaMexico(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function inicio(year: number, month: number) {
  const date = new Date(Date.UTC(year, month, 1));
  if (date.getUTCFullYear() > 9999) throw new HttpError(422, 'PERIODO_FUERA_DE_RANGO', 'El periodo excede el calendario soportado.');
  return date.toISOString().slice(0, 10);
}
export function periodoNatural(fecha: string, frecuencia: Frecuencia) {
  if (!fechaCalendario.safeParse(fecha).success || !Object.hasOwn(meses, frecuencia)) {
    throw new HttpError(422, 'PERIODO_INVALIDO', 'Indica una fecha válida desde 1900 y una frecuencia mensual, trimestral, semestral o anual.');
  }
  const [year, month] = fecha.split('-').map(Number);
  const size = meses[frecuencia];
  const firstMonth = Math.floor((month! - 1) / size) * size;
  return {
    inicio: inicio(year!, firstMonth),
    fin: new Date(Date.UTC(year!, firstMonth + size, 0)).toISOString().slice(0, 10),
  };
}
export function siguientePeriodo(fecha: string, frecuencia: Frecuencia) {
  const [year, month] = periodoNatural(fecha, frecuencia).inicio.split('-').map(Number);
  return inicio(year!, month! - 1 + meses[frecuencia]);
}
export function inicioPeriodoValido(fecha: string, frecuencia: Frecuencia) {
  if (!fechaCalendario.safeParse(fecha).success || !Object.hasOwn(meses, frecuencia)) return false;
  const [year, month, day] = fecha.split('-').map(Number);
  return year! >= 1900 && year! <= 9999 && month! >= 1 && month! <= 12 && day === 1 && (month! - 1) % meses[frecuencia] === 0;
}
export function minimoInicio(frecuencia: Frecuencia, now: Date) {
  return siguientePeriodo(fechaMexico(now), frecuencia);
}
