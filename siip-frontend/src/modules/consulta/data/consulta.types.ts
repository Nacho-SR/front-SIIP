export interface FichaConsulta {
  id: string; activo: boolean; clave: string; nombre: string;
  definicion: string; objetivo: string; nivelObjetivo: string;
  tipologia: string; ambito: string; dimension: string;
  agrupacion: string; familia: string; unidad: string;
  desagregacion: string; frecuencia: string; fuente: string;
  sentido: string; algoritmo: string; condicionAcumulacion: string;
  lineaBase: string; periodoLineaBase: string; meta: string;
  periodoCumplimiento: string; semaforizacion: string;
}

export interface CatalogoConsulta { indicadores: FichaConsulta[] }
