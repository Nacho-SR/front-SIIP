
export type EstadoCaptura =
  | 'Borrador' // Solo compatibilidad con registros anteriores
  | 'En revisión'
  | 'Revisada'
  | 'Observada'
  | 'Validada';

export interface IndicadorCaptura {
  clave: string;
  nombre: string;
  agrupacion: string;
  familia: string;
  frecuencia: string;
  unidad: string;
  algoritmo: string;
  fuente: string;
  sentido: string;
  desagregacion: string;
}

export interface RegistroCaptura {
  id: string;
  indicadorClave: string;
  indicadorNombre: string;
  agrupacion: string;
  periodo: string;
  frecuencia: string;
  valor: number | null;
  unidad: string;
  descripcion: string;
  evidenciaNombre: string;
  estado: EstadoCaptura;
  actualizadoEn: string;

  // Variables originales utilizadas para calcular el indicador
  variablesCaptura?: Record<string, number>;
}
