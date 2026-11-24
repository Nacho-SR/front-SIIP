import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { createPinia, setActivePinia } from 'pinia';
import { createServer } from 'vite';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

let vite, modelo, ConsultaView, FichaTecnicaModal, seguimiento, catalogo, api, router, useAuthStore;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom',
    plugins: [{ name: 'memory-history', transform(code, id) {
      if (id.endsWith('/src/router/index.ts')) return code.replaceAll('createWebHistory', 'createMemoryHistory');
    } }],
  });
  modelo = await vite.ssrLoadModule('/src/modules/consulta/data/consulta.ts');
  seguimiento = await vite.ssrLoadModule('/src/modules/review/data/seguimiento.store.ts');
  ({ default: ConsultaView } = await vite.ssrLoadModule('/src/modules/consulta/ConsultaView.vue'));
  ({ default: FichaTecnicaModal } = await vite.ssrLoadModule('/src/modules/consulta/components/FichaTecnicaModal.vue'));
  ({ default: catalogo } = await vite.ssrLoadModule('/src/modules/consulta/data/indicadores-siip.json'));
  ({ default: api } = await vite.ssrLoadModule('/src/core/api.ts'));
  ({ default: router } = await vite.ssrLoadModule('/src/router/index.ts'));
  ({ useAuthStore } = await vite.ssrLoadModule('/src/store/auth.store.ts'));
  for (const route of router.getRoutes()) if (route.components) route.components.default = { render: () => null };
});
after(async () => { await vite?.close(); });
beforeEach(() => {
  setActivePinia(createPinia());
  Object.assign(useAuthStore(), { initialized: true, user: {
    id: '1', nombre: 'Consulta', correo: 'consulta@example.test', rol: 'consulta', dependencia_id: null,
  } });
  api.defaults.adapter = async () => assert.fail('Configurar respuesta HTTP');
});
const fichasPrueba = () => catalogo.map((ficha, i) => ({ ...ficha, id: String(i + 1), activo: false,
  condicionAcumulacion: 'No acumulable', lineaBase: '0', periodoLineaBase: '2026',
  meta: '0', periodoCumplimiento: '2027', semaforizacion: 'REGLA_DOCUMENTAL' }));

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
  const app = createSSRApp(ConsultaView).use(router);
  app.mixin({ created() {
    if (this.$parent) return;
    state = this.$.setupState;
    state.corteMaximo = '2026-10';
    state.periodoElegido = '2026-09';
    state.cargando = false;
    state.indicadoresCatalogo = fichasPrueba();
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

test('Consulta lee solo su API, conserva fichas inactivas y nunca resultados del almacenamiento local', async () => {
  const { state } = await vista();
  const data = { indicadores: [{ ...fichasPrueba()[0], id: '9007199254740993', nombre: 'REGISTRO_REAL_API' }] };
  const requests = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem() { assert.fail('No leer resultados del prototipo'); }, setItem() { assert.fail('Solo lectura'); },
  } });
  try {
    api.defaults.adapter = async config => { requests.push(config); return { status: 200, data, headers: {}, config }; };
    await state.cargarCatalogo();
    assert.deepEqual(state.indicadoresCatalogo, data.indicadores);
    const { html, state: loaded } = await vista(s => {
      s.indicadoresCatalogo = state.indicadoresCatalogo; s.gruposAbiertos = [data.indicadores[0].agrupacion];
    });
    assert.match(html, /REGISTRO_REAL_API/);
    assert.match(html, /Sin activar/);
    assert.match(html, /Sin resultados publicados disponibles/);
    assert.doesNotMatch(html, /Datos de demostración|índice informativo|Color temático pendiente/);
    assert.equal(loaded.indicadores[0].valorValidado, null);
    assert.equal(loaded.indicadores[0].semaforo, null);
    assert.equal(loaded.alertasGenerales.gris, 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/consulta/indicadores');
    assert.equal(requests[0].method, 'get');
    assert.equal(requests[0].params, undefined);
    const modal = await vista(s => { s.indicadoresCatalogo = state.indicadoresCatalogo; s.abrirFicha(s.indicadores[0]); });
    assert.equal(modal.state.fichaSeleccionada.nombre, 'REGISTRO_REAL_API');
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
  }
});

test('búsqueda sin acentos y filtros conservan los grupos y el total del catálogo recibido', async () => {
  const data = fichasPrueba().slice(0, 3);
  data[0].nombre = 'Atención pública';
  const { state } = await vista(s => { s.indicadoresCatalogo = data; });
  state.filtros.busqueda = 'ATENCION';
  assert.equal(state.indicadoresFiltrados.length, 1);
  assert.equal(state.agrupaciones[0].total, 3);
  assert.equal(state.totalIndicadores, 3);
  state.limpiarFiltros();
  state.filtros.tipologia = 'inexistente';
  assert.equal(state.totalVisibles, 0);
  state.limpiarFiltros();
  state.filtros.ambito = data[0].ambito;
  state.filtros.desagregacion = data[0].desagregacion;
  assert.equal(state.indicadoresFiltrados.every(i => i.ambito === data[0].ambito && i.desagregacion === data[0].desagregacion), true);
  assert.deepEqual(state.opciones('tipologia'), [...new Set(data.map(i => i.tipologia))].sort((a, b) => a.localeCompare(b, 'es')));
});

test('distingue carga, vacío, ausencia de asignación y filtros sin coincidencias', async () => {
  assert.match((await vista(s => { s.cargando = true; s.indicadoresCatalogo = []; })).html, /Cargando el catálogo/);
  assert.match((await vista(s => { s.indicadoresCatalogo = []; })).html, /Todavía no hay indicadores registrados/);
  assert.match((await vista(s => { s.filtros.busqueda = 'inexistente'; })).html, /No se encontraron indicadores/);
  useAuthStore().user = { id: '2', rol: 'captura', dependencia_id: '7' };
  assert.match((await vista(s => { s.indicadoresCatalogo = []; })).html, /No hay indicadores asignados a tu dependencia/);
});

test('el error limpia catálogo/ficha previa, escapa detalles y permite reintentar sin sustitución por JSON', async () => {
  const { state } = await vista(s => s.abrirFicha(s.indicadores[0]));
  api.defaults.adapter = async () => { throw { isAxiosError: true, response: { status: 503, data: { detail: 'Servicio <privado>' } } }; };
  await state.cargarCatalogo();
  assert.deepEqual(state.indicadoresCatalogo, []);
  assert.equal(state.fichaSeleccionada, null);
  const { html } = await vista(s => { s.indicadoresCatalogo = []; s.error = state.error; });
  assert.match(html, /Servicio &lt;privado&gt;/);
  assert.match(html, /Reintentar/);
  assert.doesNotMatch(html, /No se encontraron indicadores|Todavía no hay indicadores registrados/);
  api.defaults.adapter = async config => ({ status: 200, data: { indicadores: fichasPrueba().slice(0, 1) }, headers: {}, config });
  await state.cargarCatalogo();
  assert.equal(state.error, '');
  assert.equal(state.indicadoresCatalogo.length, 1);
});

test('no mezcla respuestas atrasadas o datos de una sesión anterior', async () => {
  const pending = [];
  api.defaults.adapter = config => new Promise(resolve => pending.push(data => resolve({ status: 200, data, headers: {}, config })));
  const { state } = await vista();
  const first = state.cargarCatalogo(); await setImmediate();
  const second = state.cargarCatalogo(); await setImmediate();
  pending[1]({ indicadores: [fichasPrueba()[1]] }); await second;
  pending[0]({ indicadores: [fichasPrueba()[0]] }); await first;
  assert.equal(state.indicadoresCatalogo[0].id, '2');
  const third = state.cargarCatalogo(); await setImmediate();
  useAuthStore().user = null;
  pending[2]({ indicadores: fichasPrueba() }); await third;
  assert.deepEqual(state.indicadoresCatalogo, []);
});

test('la ficha muestra fórmula textual, valor cero, periodo y versiones sin insumos internos', async () => {
  for (const seccion of ['metodologia', 'fuentes']) {
    const indicador = { ...fichasPrueba()[0], algoritmo: 'FORMULA_PUBLICA = A / B × 100',
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
    if (seccion === 'metodologia') {
      assert.match(html, /FORMULA_PUBLICA = A \/ B × 100/);
      assert.match(html, /LÍNEA BASE DE LA FICHA[\s\S]*?<strong[^>]*>0<\/strong>/);
      assert.match(html, /META DE LA FICHA[\s\S]*?<strong[^>]*>0<\/strong>/);
      assert.match(html, /REGLA_DOCUMENTAL/);
      assert.match(html, /No acumulable/);
    }
    else {
      assert.match(html, /Periodo de referencia: 2026-09/);
      assert.match(html, /Valor: 0 /);
      assert.match(html, /publicacion-1/);
      assert.match(html, /regla-1/);
      assert.match(html, /Sin color publicado/);
    }
  }
});
