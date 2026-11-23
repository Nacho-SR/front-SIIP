import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';
import { AxiosError } from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createServer } from 'vite';

// Esta suite requiere las dependencias de ambas aplicaciones, sin conectarse a PostgreSQL.
const backendRequire = createRequire(new URL('../../siip-backend/package.json', import.meta.url));
const { register } = backendRequire('tsx/esm/api');
const loader = register({ namespace: 'siip-permisos-flujo' });
const { buildApp } = await loader.import('../../siip-backend/src/app.ts', import.meta.url);
const { envSchema } = await loader.import('../../siip-backend/src/env.ts', import.meta.url);
const { createBandejaRepository } = await loader.import('../../siip-backend/src/modules/operacion/repositories/bandeja.repository.ts', import.meta.url);
const session = backendRequire('@fastify/session');
const { hash } = backendRequire('argon2');
const password = 'Synthetic-flow-password-2026!';
const password_hash = await hash(password);
const origin = 'http://localhost:5173';
const dependencies = [
  { id: '7', clave: 'DGSM', nombre: 'Servicios Municipales', activo: true },
  { id: '8', clave: 'DOP', nombre: 'Obras Públicas', activo: true },
  { id: '9', clave: 'VACIA', nombre: 'Dependencia sin asignaciones', activo: true },
];
const shared = { indicadorId: '9007199254740993', clave: 'SIIP.05.F35.004', nombre: 'Indicador compartido',
  agrupacion: '05. Servicios públicos', familia: 'F35. Alumbrado', frecuencia: 'Mensual', activo: true,
  primerPeriodo: '2026-12-01', unidadMedida: 'luminarias', tipoDato: 'entero' };
const rows = [
  { ...shared, dependenciaId: '7', variableId: '1', codigo: 'N', descripcion: 'VARIABLE_PROPIA_DGSM' },
  { ...shared, dependenciaId: '8', variableId: '2', codigo: 'D', descripcion: 'VARIABLE_PRIVADA_OBRAS' },
  { ...shared, dependenciaId: '8', indicadorId: '2', clave: 'SIIP.05.F35.005', nombre: 'INDICADOR_EXCLUSIVO_OBRAS',
    variableId: '3', codigo: 'M', descripcion: 'MEDICION_PRIVADA_OBRAS', activo: false, primerPeriodo: null },
];
const adminReads = ['usuarios', 'dependencias', 'indicadores', 'agrupaciones', 'familias',
  'indicadores/1/variables', 'indicadores/1/metodologia', 'indicadores/1/activacion'];
let vite, api, router, auth, useAuthStore, CaptureView, app, accounts, cookie, sqlCalls, adminCalls;

before(async () => {
  vite = await createServer({ cacheDir: 'node_modules/.vite-permisos-flujo-test',
    server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom',
    plugins: [{ name: 'test-memory-history', transform(code, id) {
      if (id.endsWith('/src/router/index.ts')) return code.replaceAll('createWebHistory', 'createMemoryHistory');
    } }],
  });
  ({ default: api } = await vite.ssrLoadModule('/src/core/api.ts'));
  ({ default: router } = await vite.ssrLoadModule('/src/router/index.ts'));
  ({ useAuthStore } = await vite.ssrLoadModule('/src/store/auth.store.ts'));
  ({ default: CaptureView } = await vite.ssrLoadModule('/src/modules/capture/CaptureView.vue'));
  for (const route of router.getRoutes()) if (route.components) route.components.default = { render: () => null };
});
after(async () => { await vite?.close(); await loader.unregister(); });

beforeEach(async t => {
  accounts = [
    ['1', 'captura', '7'], ['2', 'captura', '8'], ['3', 'revision', '7'],
    ['4', 'administrador', null], ['5', 'consulta', null], ['6', 'captura', '9'],
  ].map(([id, rol, dependencia_id]) => ({ id, rol, dependencia_id, nombre: `Cuenta ${id}`,
    correo: `cuenta${id}@example.test`, password_hash, activo: true, dependencia_activa: dependencia_id ? true : null }));
  sqlCalls = []; adminCalls = []; cookie = '';
  // Doble de PostgreSQL: no ejecuta SQL; comprueba sus filtros y devuelve filas de varias dependencias.
  const pool = { async query(sql, params) {
    sqlCalls.push({ sql, params });
    assert.equal(params.length, 1);
    if (sql.includes('FROM dependencias WHERE')) {
      assert.match(sql, /WHERE id = \$1 AND activo/);
      return { rows: dependencies.filter(d => d.id === params[0]).map(({ activo, ...d }) => d) };
    }
    assert.match(sql, /WHERE v.dependencia_id = \$1/);
    assert.match(sql, /JOIN dependencias d ON d.id = v.dependencia_id AND d.activo/);
    assert.doesNotMatch(sql, /INSERT|UPDATE|DELETE/);
    return { rows: rows.filter(row => row.dependenciaId === params[0]) };
  } };
  const read = (name, data) => async () => { adminCalls.push(name); return data; };
  app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-flow-secret-with-more-than-32-characters' }), {
    repository: { async findByCorreo(correo) { return accounts.find(a => a.correo === correo) ?? null; },
      async findById(id) { return accounts.find(a => a.id === id) ?? null; } },
    sessionStore: new session.MemoryStore(),
    bandeja: createBandejaRepository(pool, () => new Date('2026-11-23T12:00:00Z')),
    users: { listUsers: read('usuarios', []), listDependencies: read('dependencias', dependencies) },
    indicators: { list: read('indicadores', []) },
    classifications: { listAgrupaciones: read('agrupaciones', []), listFamilias: read('familias', []) },
    variables: { find: read('variables', { indicadorId: '1', version: 0, variables: [] }) },
    metodologias: { find: read('metodologia', { indicadorId: '1', version: 0, metodologias: [] }) },
    activaciones: { find: read('activacion', { indicadorId: '1', activo: false, metodologiaId: null, versionMetodologia: 0,
      frecuencia: 'Mensual', minimoInicio: '2026-12-01', puedeActivar: false, pendientes: ['Sin configurar'], historial: [] }) },
  });
  app.log.level = 'silent'; t.after(() => app.close());
  setActivePinia(createPinia()); auth = useAuthStore(); auth.initialized = true;
  await router.replace('/login');
  // Solo se adapta el transporte. Login, cookie/CSRF, guards, serialización y repositorio son los reales.
  api.defaults.adapter = async config => {
    const headers = { ...config.headers.toJSON(), origin, ...(cookie ? { cookie } : {}) };
    // Como el adaptador XHR de Axios, omite Content-Type cuando no existe cuerpo.
    if (config.data === undefined) delete headers['Content-Type'];
    const response = await app.inject({ method: config.method.toUpperCase(), url: `/api/v1${api.getUri({ ...config, baseURL: '' })}`,
      headers, ...(config.data ? { payload: config.data } : {}) });
    const setCookie = response.headers['set-cookie'];
    if (setCookie) cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0];
    const result = { status: response.statusCode, data: response.body ? response.json() : null,
      headers: response.headers, config, statusText: '' };
    if (result.status >= 400) throw new AxiosError(`${config.method} ${config.url}: ${result.status} ${result.data.codigo}: ${result.data.detail}`, undefined, config, undefined, result);
    return result;
  };
});

async function login(id) {
  await auth.login(`cuenta${id}@example.test`, password);
  assert.equal(auth.user.id, id);
}
async function render(preparar) {
  let state;
  const component = createSSRApp(CaptureView).use(router);
  component.mixin({ created() { if (!this.$parent) { state = this.$.setupState; preparar?.(state); } } });
  return { html: await renderToString(component), state };
}
const denied = error => error.response?.status === 403 && error.response.data.codigo === 'NO_PERMITIDO';

test('login → API → repositorio → bandeja: dos dependencias comparten indicador sin compartir variables', async () => {
  await login('1'); await router.replace('/captura');
  assert.equal(router.currentRoute.value.name, 'Captura');
  const first = await render(); await first.state.cargarBandeja();
  const dataA = first.state.bandeja;
  assert.equal(dataA.dependencia.id, '7');
  assert.equal(dataA.indicadores.length, 1);
  assert.deepEqual(dataA.indicadores[0].variables.map(v => v.codigo), ['N']);
  assert.equal(dataA.fechaServidor, '2026-11-23');
  assert.deepEqual(dataA.indicadores[0].periodoActual, { inicio: '2026-11-01', fin: '2026-11-30' });
  const viewA = await render(s => { s.cargando = false; s.bandeja = dataA; });
  assert.match(viewA.html, /VARIABLE_PROPIA_DGSM/);
  assert.doesNotMatch(viewA.html, /PRIVADA_OBRAS|EXCLUSIVO_OBRAS|password_hash/);
  const cookieA = cookie;
  await auth.logout(); await login('2');
  const second = await render(); await second.state.cargarBandeja();
  assert.equal(second.state.bandeja.dependencia.id, '8');
  assert.equal(second.state.bandeja.indicadores.length, 2);
  assert.deepEqual(second.state.bandeja.indicadores.flatMap(i => i.variables.map(v => v.codigo)), ['D', 'M']);
  const viewB = await render(s => { s.cargando = false; s.bandeja = second.state.bandeja; });
  assert.doesNotMatch(viewB.html, /VARIABLE_PROPIA_DGSM/);
  assert.match(viewB.html, /VARIABLE_PRIVADA_OBRAS/);
  assert.equal((await app.inject({ url: '/api/v1/captura/indicadores', headers: { cookie: cookieA } })).statusCode, 401);
});

test('cuatro perfiles: URL directa y API mantienen Captura y Administración exclusivas', async () => {
  for (const id of ['1', '3', '4', '5']) {
    await login(id);
    const rol = auth.user.rol;
    for (const [path, permitido] of [['/captura', 'captura'], ['/seguimiento/1', 'revision'],
      ['/administrador/indicadores/1/variables', 'administrador'], ['/administrador/indicadores/1/metodologia', 'administrador'],
      ['/administrador/indicadores/1/activacion', 'administrador'], ['/administrador/agrupaciones', 'administrador'],
      ['/administrador/familias', 'administrador']]) {
      await router.replace(path);
      assert.equal(router.currentRoute.value.path, rol === permitido ? path : '/');
    }
    const before = sqlCalls.length;
    if (rol === 'captura') await api.get('/captura/indicadores');
    else {
      await assert.rejects(api.get('/captura/indicadores'), denied);
      assert.equal(sqlCalls.length, before);
    }
    for (const path of adminReads) {
      const count = adminCalls.length;
      if (rol === 'administrador') assert.equal((await api.get(`/administracion/${path}`)).status, 200);
      else {
        await assert.rejects(api.get(`/administracion/${path}`), denied);
        assert.equal(adminCalls.length, count);
      }
    }
    if (rol !== 'administrador') {
      for (const [method, path] of [['post', 'usuarios'], ['post', 'indicadores'], ['put', 'indicadores/1/variables'],
        ['put', 'indicadores/1/metodologia'], ['post', 'indicadores/1/activacion']]) {
        await assert.rejects(api[method](`/administracion/${path}`, {}), denied);
      }
    }
  }
});

test('ni parámetros, cabeceras ni un rol manipulado en Pinia sustituyen la autoridad de la sesión', async () => {
  await login('1');
  for (const params of [{ dependenciaId: '8' }, { dependencia_id: '8' }, { id: '2' }]) {
    await assert.rejects(api.get('/captura/indicadores', { params }), error => error.response.status === 422);
  }
  assert.equal(sqlCalls.length, 0);
  const response = await api.get('/captura/indicadores', { headers: { 'X-Dependencia-Id': '8', 'X-Rol': 'administrador' } });
  assert.equal(response.data.dependencia.id, '7');
  assert.doesNotMatch(JSON.stringify(response.data), /PRIVADA_OBRAS|EXCLUSIVO_OBRAS/);
  auth.user.rol = 'administrador';
  await assert.rejects(api.get('/administracion/usuarios'), denied);
  assert.equal(adminCalls.length, 0);
  assert.equal((await app.inject('/api/v1/captura/indicadores')).statusCode, 401);
});

test('bandeja vacía y revocación: no conserva asignaciones al desactivar cuenta o dependencia', async () => {
  await login('6');
  const empty = await render(); await empty.state.cargarBandeja();
  assert.deepEqual(empty.state.bandeja.indicadores, []);
  assert.match((await render(s => { s.cargando = false; s.bandeja = empty.state.bandeja; })).html, /Aún no hay variables asignadas/);
  for (const field of ['activo', 'dependencia_activa']) {
    accounts[0][field] = true;
    await login('1'); await router.replace('/captura');
    const view = await render(); await view.state.cargarBandeja();
    assert.equal(view.state.bandeja.indicadores.length, 1);
    const count = sqlCalls.length;
    accounts[0][field] = false;
    const redirected = new Promise(resolve => {
      const remove = router.afterEach(to => { if (to.name === 'Login') { remove(); resolve(); } });
    });
    await view.state.cargarBandeja();
    assert.equal(sqlCalls.length, count);
    assert.equal(view.state.bandeja, null);
    assert.equal(auth.user, null);
    await redirected;
    assert.equal(router.currentRoute.value.name, 'Login');
    accounts[0][field] = true;
  }
});
