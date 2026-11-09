export type ColorDesempeno = 'verde' | 'amarillo' | 'rojo';
export type ColorSemaforo = ColorDesempeno | 'gris';
export type EstadoConsulta = 'publicado' | 'validacion_local' | 'en_revision' | 'incumplido' | 'sin_publicacion';

export interface PublicacionConsulta {
  valor: number;
  semaforo: ColorDesempeno | null;
  version: string;
  versionRegla: string;
  publicadaEn: string;
}

export interface ResultadoConsulta {
  indicadorClave: string;
  periodo: string;
  estado: EstadoConsulta;
  valor: number | null;
  semaforo: ColorSemaforo | null;
  versionPublicacion: string | null;
  versionRegla: string | null;
  publicadaEn: string | null;
  actualizadoEn: string;
}

interface RegistroLocal {
  indicadorClave: string;
  periodo: string;
  estado: string;
  valor: number | null;
  actualizadoEn: string;
  publicacion?: PublicacionConsulta;
  cumplimientoCierre?: 'completo' | 'incumplido';
}

// El adaptador descarta variables, evidencias y observaciones internas.
export function proyectarResultadoConsulta(registro: RegistroLocal): ResultadoConsulta {
  const base: ResultadoConsulta = {
    indicadorClave: registro.indicadorClave, periodo: registro.periodo,
    estado: 'sin_publicacion', valor: null, semaforo: null,
    versionPublicacion: null, versionRegla: null, publicadaEn: null,
    actualizadoEn: registro.actualizadoEn,
  };
  if (registro.cumplimientoCierre === 'incumplido') {
    return { ...base, estado: 'incumplido', semaforo: 'gris' };
  }
  const publicacion = registro.publicacion;
  if (publicacion && Number.isFinite(publicacion.valor)
    && [null, 'verde', 'amarillo', 'rojo'].includes(publicacion.semaforo)
    && typeof publicacion.version === 'string' && publicacion.version.trim()
    && typeof publicacion.versionRegla === 'string' && publicacion.versionRegla.trim()
    && typeof publicacion.publicadaEn === 'string'
    && Number.isFinite(Date.parse(publicacion.publicadaEn))) {
    return { ...base, estado: 'publicado', valor: publicacion.valor,
      semaforo: publicacion.semaforo, versionPublicacion: publicacion.version,
      versionRegla: publicacion.versionRegla, publicadaEn: publicacion.publicadaEn };
  }
  if (registro.estado === 'Validada') {
    return { ...base, estado: 'validacion_local',
      valor: typeof registro.valor === 'number' && Number.isFinite(registro.valor) ? registro.valor : null };
  }
  if (['En revisión', 'Revisada'].includes(registro.estado)) {
    return { ...base, estado: 'en_revision' };
  }
  return base;
}

export function ultimoCorteCerrado(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit',
  }).formatToParts(ahora);
  const anio = Number(partes.find(parte => parte.type === 'year')?.value);
  const mes = Number(partes.find(parte => parte.type === 'month')?.value);
  return `${mes === 1 ? anio - 1 : anio}-${String(mes === 1 ? 12 : mes - 1).padStart(2, '0')}`;
}

// El corte representa el último día del mes, no la fecha de publicación.
export function periodoEsperado(frecuencia: string, corte: string): string | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(corte)) return null;
  const anio = Number(corte.slice(0, 4));
  const mes = Number(corte.slice(5));
  if (anio < 2) return null;
  switch (frecuencia.trim().toLowerCase()) {
    case 'mensual': return corte;
    case 'trimestral': return `${mes < 3 ? anio - 1 : anio}-T${Math.floor(mes / 3) || 4}`;
    case 'semestral': return `${mes < 6 ? anio - 1 : anio}-S${Math.floor(mes / 6) || 2}`;
    case 'anual': return String(mes < 12 ? anio - 1 : anio);
    default: return null;
  }
}

export function resultadoDelCorte(resultados: ResultadoConsulta[], clave: string, frecuencia: string, corte: string) {
  const esperado = periodoEsperado(frecuencia, corte);
  if (!esperado) return null;
  const candidatos = resultados.filter(resultado => resultado.indicadorClave === clave && resultado.periodo === esperado);
  const incumplido = candidatos.find(resultado => resultado.estado === 'incumplido');
  if (incumplido) return incumplido;
  // DEC-016/022: una reapertura no retira la publicación; se consulta la versión vigente hoy.
  const publicaciones = candidatos.filter(resultado => resultado.estado === 'publicado')
    .sort((a, b) => Date.parse(b.publicadaEn!) - Date.parse(a.publicadaEn!));
  return publicaciones[0] ?? candidatos.sort((a, b) => Date.parse(b.actualizadoEn) - Date.parse(a.actualizadoEn))[0] ?? null;
}

export function resumenTematico(colores: (ColorSemaforo | null)[]) {
  const conteo = {
    verde: colores.filter(color => color === 'verde').length,
    amarillo: colores.filter(color => color === 'amarillo').length,
    rojo: colores.filter(color => color === 'rojo').length,
    gris: colores.filter(color => color === 'gris').length,
    sinColor: colores.filter(color => color === null).length,
  };
  const evaluables = conteo.verde + conteo.amarillo + conteo.rojo;
  const indice = evaluables ? (conteo.verde + 0.5 * conteo.amarillo) / evaluables : null;
  const colorReferencia: ColorDesempeno | null = indice === null ? null
    : indice >= 0.8 ? 'verde' : indice >= 0.5 ? 'amarillo' : 'rojo';
  return { conteo, evaluables, indice, colorReferencia };
}

export const mensajesEstado: Record<EstadoConsulta, string> = {
  publicado: 'Resultado publicado',
  validacion_local: 'Validación local sin publicación versionada',
  en_revision: 'En proceso de revisión; sin publicación',
  incumplido: 'Incumplimiento al cierre; gris sin evaluación de desempeño',
  sin_publicacion: 'Sin publicación del periodo esperado; cumplimiento no confirmado',
};
