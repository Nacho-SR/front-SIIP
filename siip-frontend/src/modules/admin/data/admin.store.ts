import { reactive } from 'vue';
import api from '../../../core/api';
import catalogo from '../../consulta/data/indicadores-siip.json';

export function familiasDeAgrupacion(agrupacion: string): string[] {
  return [...new Set(catalogo.filter(indicador => indicador.agrupacion === agrupacion)
    .map(indicador => indicador.familia))].sort((a, b) => a.localeCompare(b, 'es'));
}
export interface IndicadorAdmin {
  id: string;
  campos: Record<string, string>;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}
export const adminState = reactive({ indicadores: [] as IndicadorAdmin[], cargando: false, error: '' });

export async function refrescarAdmin() {
  if (adminState.cargando) return;
  adminState.cargando = true;
  adminState.error = '';
  try {
    const { data } = await api.get<IndicadorAdmin[]>('/administracion/indicadores');
    adminState.indicadores = data;
  } catch (error) {
    adminState.indicadores = [];
    adminState.error = 'No se pudo cargar el catálogo de indicadores. Reintenta la carga.';
    throw error;
  } finally { adminState.cargando = false; }
}

export async function guardarIndicador(campos: Record<string, string>) {
  const { consecutivo: _consecutivo, ...datos } = campos;
  if (!familiasDeAgrupacion(datos.agrupacion ?? '').includes(datos.familia ?? '')) {
    throw new Error('Selecciona una familia que pertenezca a la agrupación temática.');
  }
  const { data } = await api.post<IndicadorAdmin>('/administracion/indicadores', datos);
  adminState.indicadores.unshift(data);
  return data;
}

export async function obtenerIndicadorAdmin(id: string): Promise<IndicadorAdmin> {
  const { data } = await api.get<IndicadorAdmin>('/administracion/indicadores/' + encodeURIComponent(id));
  return data;
}
