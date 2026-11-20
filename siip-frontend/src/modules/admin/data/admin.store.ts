import { reactive } from 'vue';
import api from '../../../core/api';
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
  const { data } = await api.post<IndicadorAdmin>('/administracion/indicadores', datos);
  adminState.indicadores.unshift(data);
  return data;
}

export async function obtenerIndicadorAdmin(id: string): Promise<IndicadorAdmin> {
  const { data } = await api.get<IndicadorAdmin>('/administracion/indicadores/' + encodeURIComponent(id));
  return data;
}


export async function actualizarIndicador(
  id: string,
  campos: Record<string, string>
) {
  const {
    consecutivo: _consecutivo,
    ...datos
  } = campos;

  const { data } = await api.patch<IndicadorAdmin>(
    `/administracion/indicadores/${encodeURIComponent(id)}`,
    datos
  );

  const index = adminState.indicadores.findIndex(
    item => item.id === id
  );

  if (index >= 0) {
    adminState.indicadores[index] = data;
  }

  return data;
}
