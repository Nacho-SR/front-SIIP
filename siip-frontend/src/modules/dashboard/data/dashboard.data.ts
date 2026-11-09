
export interface AgrupacionTematica {
  id: number;
  nombre: string;
  indicadores: number;
}

export const agrupacionesTematicas: AgrupacionTematica[] = [
  {
    id: 1,
    nombre: 'Seguridad pública, justicia cívica y protección civil',
    indicadores: 16
  },
  {
    id: 2,
    nombre: 'Bienestar y desarrollo social',
    indicadores: 7
  },
  {
    id: 3,
    nombre: 'Desarrollo económico y empleo',
    indicadores: 7
  },
  {
    id: 4,
    nombre: 'Territorio, desarrollo urbano y medio ambiente',
    indicadores: 9
  },
  {
    id: 5,
    nombre: 'Servicios públicos municipales',
    indicadores: 7
  },
  {
    id: 6,
    nombre: 'Movilidad y accesibilidad',
    indicadores: 5
  },
  {
    id: 7,
    nombre: 'Gobierno y gestión institucional',
    indicadores: 8
  },
  {
    id: 8,
    nombre: 'Finanzas públicas y gestión de recursos',
    indicadores: 4
  }
];

export const resumenCatalogo = {
  agrupaciones: 8,
  familias: 54,
  indicadores: 63,
  ambitoCaptura: 'Municipal'
};