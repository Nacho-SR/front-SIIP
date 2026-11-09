import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

let vite, modelo, ConsultaView, FichaTecnicaModal, seguimiento, catalogo;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' });
  modelo = await vite.ssrLoadModule('/src/modules/consulta/data/consulta.ts');
  seguimiento = await vite.ssrLoadModule('/src/modules/review/data/seguimiento.store.ts');
  ({ default: ConsultaView } = await vite.ssrLoadModule('/src/modules/consulta/ConsultaView.vue'));
  ({ default: FichaTecnicaModal } = await vite.ssrLoadModule('/src/modules/consulta/components/FichaTecnicaModal.vue'));
  ({ default: catalogo } = await vite.ssrLoadModule('/src/modules/consulta/data/indicadores-siip.json'));
});
after(async () => { await vite?.close(); });

function registro(cambios = {}) {
  return {
    id: 'envio-1', indicadorClave: 'SIIP.01.F01.002', periodo: '2026-09',
    estado: 'Validada', valor: 999, actualizadoEn: '2026-10-02T12:00:00Z',
    publicacion: { valor: 0, semaforo: 'rojo', version: 'publicacion-1',
      versionRegla: 'regla-1', publicadaEn: '2026-10-01T12:00:00Z' },
    ...cambios,
  };
}

async function vista(preparar) {
  let state;
  const app = createSSRApp(ConsultaView);
  app.mixin({ created() {
    if (this.$parent) return;
    state = this.$.setupState;
    state.corteMaximo = '2026-10';
    state.periodoElegido = '2026-09';
    preparar?.(state);
  } });
  const html = await renderToString(app);
  return { state, html };
}

test('el corte mensual resuelve periodos naturales de las cuatro frecuencias', () => {
  for (const [corte, trimestral, semestral, anual] of [
    ['2026-01', '2025-T4', '2025-S2', '2025'],
    ['2026-02', '2025-T4', '2025-S2', '2025'],
    ['2026-03', '2026-T1', '2025-S2', '2025'],
    ['2026-04', '2026-T1', '2025-S2', '2025'],
    ['2026-06', '2026-T2', '2026-S1', '2025'],
    ['2026-09', '2026-T3', '2026-S1', '2025'],
    ['2026-11', '2026-T3', '2026-S1', '2025'],
    ['2026-12', '2026-T4', '2026-S2', '2026'],
  ]) {
    assert.equal(modelo.periodoEsperado('Mensual', corte), corte);
    assert.equal(modelo.periodoEsperado('Trimestral', corte), trimestral);
    assert.equal(modelo.periodoEsperado('Semestral', corte), semestral);
    assert.equal(modelo.periodoEsperado('Anual', corte), anual);
  }
  assert.equal(modelo.periodoEsperado('Bimestral', '2026-09'), null);
  for (const corte of ['', '2026-00', '2026-13', '2026-9', '2026-T3']) {
    assert.equal(modelo.periodoEsperado('Mensual', corte), null);
  }
});

test('el último mes cerrado respeta America/Mexico_City, incluido el cambio de año', () => {
  assert.equal(modelo.ultimoCorteCerrado(new Date('2027-01-01T05:59:59.999Z')), '2026-11');
  assert.equal(modelo.ultimoCorteCerrado(new Date('2027-01-01T06:00:00Z')), '2026-12');
  assert.equal(modelo.ultimoCorteCerrado(new Date('2024-03-01T06:00:00Z')), '2024-02');
});

test('un periodo esperado ausente no arrastra valores anteriores ni de otra frecuencia', () => {
  const anterior = modelo.proyectarResultadoConsulta(registro({ periodo: '2026-08' }));
  assert.equal(modelo.resultadoDelCorte([anterior], anterior.indicadorClave, 'Mensual', '2026-09'), null);
  assert.equal(modelo.resultadoDelCorte([anterior], anterior.indicadorClave, 'Bimestral', '2026-09'), null);
  const trimestral = modelo.proyectarResultadoConsulta(registro({ periodo: '2026-T3' }));
  assert.equal(modelo.resultadoDelCorte([anterior, trimestral], anterior.indicadorClave, 'Trimestral', '2026-09'), trimestral);
});

test('el corte histórico muestra la publicación vigente, aunque se validara después del corte', () => {
  const anterior = modelo.proyectarResultadoConsulta(registro({ actualizadoEn: '2027-01-01T00:00:00Z' }));
  const actual = modelo.proyectarResultadoConsulta(registro({
    estado: 'En revisión', valor: 500,
    publicacion: { valor: 2, semaforo: 'amarillo', version: 'publicacion-2',
      versionRegla: 'regla-2', publicadaEn: '2026-11-01T12:00:00Z' },
  }));
  const elegido = modelo.resultadoDelCorte([anterior, actual], anterior.indicadorClave, 'Mensual', '2026-09');
  assert.equal(elegido, actual);
  assert.equal(elegido.valor, 2);
  assert.equal(elegido.semaforo, 'amarillo');
  assert.equal(elegido.versionRegla, 'regla-2');
});

test('valor y color conservados no dependen de la captura actual ni de su estado de reapertura', () => {
  const envio = registro();
  const original = modelo.proyectarResultadoConsulta(envio);
  envio.valor = -300;
  envio.estado = 'Observada';
  envio.variablesCaptura = { dato: 1000 };
  const reabierto = modelo.proyectarResultadoConsulta(envio);
  assert.deepEqual(reabierto, original);
  assert.equal(reabierto.valor, 0);
  assert.equal(reabierto.semaforo, 'rojo');
});

test('sin publicación versionada o sin color no se inventa un semáforo ni un incumplimiento', () => {
  const legacy = modelo.proyectarResultadoConsulta(registro({ publicacion: undefined }));
  assert.equal(legacy.estado, 'validacion_local');
  assert.equal(legacy.valor, 999);
  assert.equal(legacy.semaforo, null);
  for (const cambio of [{ versionRegla: '' }, { valor: Infinity }, { semaforo: 'gris' }, { publicadaEn: 'inválida' }]) {
    const origen = registro();
    Object.assign(origen.publicacion, cambio);
    assert.equal(modelo.proyectarResultadoConsulta(origen).semaforo, null);
  }
  const sinColor = registro();
  sinColor.publicacion.semaforo = null;
  assert.equal(modelo.proyectarResultadoConsulta(sinColor).estado, 'publicado');
  assert.equal(modelo.proyectarResultadoConsulta(sinColor).valor, 0);
  assert.equal(modelo.proyectarResultadoConsulta(sinColor).semaforo, null);
});

test('el gris confirmado persiste al justificar y los envíos completos siguen sin gris en revisión', () => {
  const incompleto = registro({ publicacion: undefined, estado: 'Borrador', cumplimientoCierre: 'incumplido' });
  const gris = modelo.proyectarResultadoConsulta(incompleto);
  incompleto.justificacionNombre = 'justificacion-privada.pdf';
  assert.deepEqual(modelo.proyectarResultadoConsulta(incompleto), gris);
  assert.equal(gris.semaforo, 'gris');
  assert.equal(gris.valor, null);
  for (const estado of ['En revisión', 'Revisada', 'Observada']) {
    const completo = modelo.proyectarResultadoConsulta(registro({ estado, publicacion: undefined, cumplimientoCierre: 'completo' }));
    assert.equal(completo.semaforo, null);
    assert.notEqual(completo.estado, 'incumplido');
  }
});

test('la proyección de consulta descarta variables, observaciones y PDF internos y solo lee almacenamiento', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem(key) {
      assert.equal(key, 'siip-capturas-prototipo-v1');
      return JSON.stringify([registro({ evidenciaNombre: 'EVIDENCIA_PRIVADA.pdf',
        variablesCaptura: { SECRETO: 123 }, historial: [{ comentario: 'OBSERVACION_PRIVADA' }] })]);
    },
    setItem() { assert.fail('Consulta no escribe expedientes'); },
  } });
  try {
    const resultados = seguimiento.obtenerResultadosConsulta();
    assert.equal(resultados[0].valor, 0);
    assert.doesNotMatch(JSON.stringify(resultados), /EVIDENCIA_PRIVADA|SECRETO|OBSERVACION_PRIVADA|variablesCaptura|historial/);
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
  }
});

test('el índice usa pesos y umbrales acordados y excluye gris y falta de color', () => {
  const resumen = modelo.resumenTematico([...Array(9).fill('verde'), 'rojo', 'gris', null]);
  assert.equal(resumen.indice, 0.9);
  assert.equal(resumen.evaluables, 10);
  assert.equal(resumen.colorReferencia, 'verde');
  for (const [colores, indice, color] of [
    [['verde', 'verde', 'verde', 'verde', 'rojo'], 0.8, 'verde'],
    [['verde', 'rojo'], 0.5, 'amarillo'],
    [['amarillo', 'rojo'], 0.25, 'rojo'],
    [['gris', null], null, null],
  ]) {
    const resultado = modelo.resumenTematico(colores);
    assert.equal(resultado.indice, indice);
    assert.equal(resultado.colorReferencia, color);
  }
});

test('la vista mantiene el periodo esperado ausente, no declara gris y acepta cortes sin resultados', async () => {
  const mensual = catalogo.find(indicador => indicador.frecuencia === 'Mensual');
  const { state, html } = await vista(state => {
    state.resultados = [modelo.proyectarResultadoConsulta(registro({ indicadorClave: mensual.clave, periodo: '2026-08' }))];
    state.gruposAbiertos = [mensual.agrupacion];
  });
  const fila = state.indicadores.find(indicador => indicador.clave === mensual.clave);
  assert.equal(fila.periodoEsperado, '2026-09');
  assert.equal(fila.valorValidado, null);
  assert.equal(fila.periodoValidado, null);
  assert.equal(fila.semaforo, null);
  assert.equal(state.alertasGenerales.gris, 0);
  assert.match(html, /Mes y año de corte/);
  assert.match(html, /Sin publicación del periodo esperado/);
  assert.match(html, /Datos de demostración/);
  state.periodoElegido = '2026-12';
  assert.equal(state.periodoActivo, '');
  assert.equal(state.indicadores.every(indicador => indicador.valorValidado === null), true);
});

test('los filtros cambian filas, pero conservan índice y conteo del grupo completo', async () => {
  const primeros = catalogo.filter(indicador => indicador.agrupacion === catalogo[0].agrupacion).slice(0, 2);
  const { state, html } = await vista(state => {
    state.resultados = primeros.map((indicador, indice) => {
      const origen = registro({ indicadorClave: indicador.clave, periodo: modelo.periodoEsperado(indicador.frecuencia, '2026-09') });
      origen.publicacion.semaforo = indice ? 'rojo' : 'verde';
      return modelo.proyectarResultadoConsulta(origen);
    });
  });
  const antes = state.agrupaciones.find(grupo => grupo.nombreOriginal === primeros[0].agrupacion);
  assert.equal(antes.indice, 0.5);
  state.filtros.busqueda = primeros[0].clave;
  const despues = state.agrupaciones[0];
  assert.equal(despues.indicadores.length, 1);
  assert.equal(despues.indice, antes.indice);
  assert.deepEqual(despues.conteo, antes.conteo);
  assert.match(html, /índice informativo 0.50/);
  assert.match(html, /Color temático pendiente/);
});

test('la ficha muestra fórmula textual, valor cero, periodo y versiones sin insumos internos', async () => {
  for (const seccion of ['metodologia', 'fuentes']) {
    const indicador = { ...catalogo[0], algoritmo: 'FORMULA_PUBLICA = A / B × 100',
      variablesCaptura: { SECRETO: 100 }, evidenciaNombre: 'EVIDENCIA_PRIVADA.pdf' };
    const app = createSSRApp(FichaTecnicaModal, {
      indicador, semaforo: null, valorValidado: 0, periodoEsperado: '2026-09', periodoValidado: '2026-09',
      versionPublicacion: 'publicacion-1', versionRegla: 'regla-1', mensajeEstado: 'Resultado publicado sin color',
    });
    app.mixin({ created() { if (!this.$parent) this.$.setupState.seccionActiva = seccion; } });
    const context = {};
    await renderToString(app, context);
    const html = context.teleports.body;
    assert.doesNotMatch(html, /SECRETO|EVIDENCIA_PRIVADA/);
    if (seccion === 'metodologia') assert.match(html, /FORMULA_PUBLICA = A \/ B × 100/);
    else {
      assert.match(html, /Periodo esperado: 2026-09/);
      assert.match(html, /Valor: 0 /);
      assert.match(html, /publicacion-1/);
      assert.match(html, /regla-1/);
      assert.match(html, /Sin color publicado/);
    }
  }
});
