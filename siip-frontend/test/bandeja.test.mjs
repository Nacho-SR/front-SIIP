import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { createSSRApp } from 'vue';
import { setImmediate } from 'node:timers/promises';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import { createServer } from 'vite';

let vite, CaptureView, api, router, useAuthStore;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom',
    plugins: [{ name: 'memory-history', transform(code, id) {
      if (id.endsWith('/src/router/index.ts')) return code.replaceAll('createWebHistory', 'createMemoryHistory');
    } }],
  });
  ({ default: CaptureView } = await vite.ssrLoadModule('/src/modules/capture/CaptureView.vue'));
  ({ default: api } = await vite.ssrLoadModule('/src/core/api.ts'));
  ({ default: router } = await vite.ssrLoadModule('/src/router/index.ts'));
  ({ useAuthStore } = await vite.ssrLoadModule('/src/store/auth.store.ts'));
  for (const route of router.getRoutes()) if (route.components) route.components.default = { render: () => null };
});
after(async () => { await vite?.close(); });
beforeEach(() => {
  setActivePinia(createPinia());
  Object.assign(useAuthStore(), { initialized: true, user: {
    id: '1', nombre: 'Captura', correo: 'captura@example.test', rol: 'captura', dependencia_id: '7',
  } });
  api.defaults.adapter = async () => assert.fail('La prueba debe configurar su respuesta HTTP');
});
const variable = { id: '9007199254740995', codigo: 'N', descripcion: 'Luminarias reparadas', unidadMedida: 'luminarias', tipoDato: 'entero' };
const indicador = { id: '9007199254740994', clave: 'SIIP.05.F35.004', nombre: 'Alumbrado', agrupacion: '05. Servicios públicos',
  familia: 'F35. Alumbrado público', frecuencia: 'Mensual', activo: true, primerPeriodo: '2026-12-01',
  periodoActual: { inicio: '2026-11-01', fin: '2026-11-30' }, variables: [variable] };
const data = { dependencia: { id: '7', clave: 'DGSM', nombre: 'Dirección General de Servicios Municipales' },
  fechaServidor: '2026-11-23', zonaHoraria: 'America/Mexico_City', indicadores: [indicador,
  { ...indicador, id: '8', clave: 'SIIP.06.F36.001', nombre: 'Movilidad', agrupacion: '06. Movilidad', activo: false, primerPeriodo: null }] };
async function render(preparar) {
  let state;
  const app = createSSRApp(CaptureView).use(router);
  app.mixin({ created() { if (!this.$parent) { state = this.$.setupState; preparar?.(state); } } });
  return { html: await renderToString(app), state };
}
function response(config, value = data) { return { status: 200, headers: {}, config, data: value }; }

test('solo consulta su endpoint; muestra dependencia, variables y fechas sin formularios ni semáforo', async () => {
  const requests = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem() { assert.fail('No leer expedientes locales'); }, setItem() { assert.fail('No escribir capturas'); },
  } });
  try {
    api.defaults.adapter = async config => { requests.push(config); return response(config); };
    const { state, html: loading } = await render();
    assert.match(loading, /Cargando tus asignaciones/);
    await state.cargarBandeja();
    assert.deepEqual(state.bandeja, data);
    const { html } = await render(s => { s.bandeja = state.bandeja; s.cargando = false; });
    assert.match(html, /Dirección General de Servicios Municipales/);
    assert.match(html, /Luminarias reparadas/);
    assert.match(html, /Número entero/);
    assert.match(html, /01\/12\/2026/);
    assert.match(html, /Sin activar/);
    assert.match(html, /Sin inicio registrado/);
    assert.match(html, /2 indicadores.*2 variables asignadas/);
    assert.match(html, /Todavía no se pueden enviar datos ni evidencias/);
    assert.doesNotMatch(html, /<form|type="submit"|type="file"|Incumplido|semaforo|Observada/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/captura/indicadores');
    assert.equal(requests[0].method, 'get');
    assert.equal(requests[0].params, undefined);
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
  }
});
test('distingue ausencia de asignaciones, filtros sin resultados y filtra por variables y agrupación', async () => {
  const empty = await render(s => { s.cargando = false; s.bandeja = { ...data, indicadores: [] }; });
  assert.match(empty.html, /Aún no hay variables asignadas/);
  const { state } = await render(s => { s.cargando = false; s.bandeja = data; });
  state.busqueda = ' REPARADAS ';
  assert.equal(state.indicadores.length, 2);
  state.agrupacion = '06. Movilidad';
  assert.equal(state.indicadores.length, 1);
  assert.equal(state.indicadores[0].id, '8');
  state.busqueda = 'SIIP.05';
  assert.equal(state.indicadores.length, 0);
  const filtered = await render(s => { s.cargando = false; s.bandeja = data; s.busqueda = 'sin coincidencias'; });
  assert.match(filtered.html, /No hay coincidencias/);
  assert.doesNotMatch(filtered.html, /Aún no hay variables asignadas/);
});
test('fallo limpia datos anteriores y permite reintentar; el detalle se escapa en HTML', async () => {
  const { state } = await render(s => { s.cargando = false; s.bandeja = data; });
  api.defaults.adapter = async () => { throw { isAxiosError: true, response: { status: 503, data: { detail: 'Servicio <privado>' } } }; };
  await state.cargarBandeja();
  assert.equal(state.bandeja, null);
  assert.equal(state.cargando, false);
  const { html } = await render(s => { s.cargando = false; s.error = state.error; });
  assert.match(html, /Servicio &lt;privado&gt;/);
  assert.match(html, /Reintentar/);
  api.defaults.adapter = async config => response(config);
  await state.cargarBandeja();
  assert.equal(state.error, '');
  assert.deepEqual(state.bandeja, data);
  api.defaults.adapter = async () => { throw new Error('Error interno'); };
  await state.cargarBandeja();
  assert.match(state.error, /No se pudieron cargar tus asignaciones/);
  assert.equal(state.bandeja, null);
});
test('otros perfiles no consultan la bandeja aunque se instancie directamente la vista', async () => {
  for (const rol of ['consulta', 'revision', 'administrador', null]) {
    useAuthStore().user = rol ? { id: '2', rol, dependencia_id: '7' } : null;
    const { state, html } = await render();
    await state.cargarBandeja();
    assert.equal(state.bandeja, null);
    assert.match(html, /disponible para cuentas de Captura/);
    assert.doesNotMatch(html, /Actualizar asignaciones/);
  }
});
test('una respuesta atrasada no sustituye una actualización más reciente ni cruza identidades', async () => {
  const pending = [];
  api.defaults.adapter = config => new Promise(resolve => pending.push(() => resolve(response(config))));
  const { state } = await render();
  const first = state.cargarBandeja();
  await setImmediate();
  const second = state.cargarBandeja();
  await setImmediate();
  assert.equal(pending.length, 2);
  pending[1](); await second;
  assert.deepEqual(state.bandeja, data);
  pending[0](); await first;
  assert.deepEqual(state.bandeja, data);
  const third = state.cargarBandeja();
  await setImmediate();
  useAuthStore().user = null;
  pending[2](); await third;
  assert.equal(state.bandeja, null);
});

test('el calendario muestra las fechas del servidor sin calcular exigibilidad ni depender del día del navegador', async () => {
  const { html } = await render(s => {
    s.cargando = false;
    s.bandeja = { ...data, fechaServidor: '2028-02-29', indicadores: [{ ...indicador,
      primerPeriodo: '2028-03-01', periodoActual: { inicio: '2028-02-01', fin: '2028-02-29' } }] };
  });
  assert.match(html, /Fecha del servidor: 29\/02\/2028/);
  assert.match(html, /America\/Mexico_City/);
  assert.match(html, /Periodo natural actual/);
  assert.match(html, /datetime="2028-02-01"[^>]*>01\/02\/2028/);
  assert.match(html, /datetime="2028-02-29"[^>]*>29\/02\/2028/);
  assert.match(html, /01\/03\/2028/);
  assert.match(html, /no indican apertura de captura ni incumplimiento/);
  assert.doesNotMatch(html, /Periodo abierto|Periodo cerrado|Incumplido|type="submit"|<form/);
});
