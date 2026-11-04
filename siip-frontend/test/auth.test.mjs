import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { AxiosError } from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { createServer } from 'vite';

const usuario = {
  id: '9007199254740993', nombre: 'Cuenta de prueba', correo: 'captura@example.test',
  rol: 'captura', dependencia_id: '7',
};
const anonymous = { usuario: null, csrf_token: 'csrf-anonimo-de-prueba' };
const authenticated = { usuario, csrf_token: 'csrf-autenticado-de-prueba' };
let vite, api, router, useAuthStore, auth, requests, responses;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: 'custom',
    plugins: [{
      name: 'test-memory-history',
      transform(code, id) {
        // Las pruebas usan las rutas y guards reales sin necesitar un DOM.
        if (id.endsWith('/src/router/index.ts')) {
          return code.replaceAll('createWebHistory', 'createMemoryHistory');
        }
      },
    }],
  });
  ({ useAuthStore } = await vite.ssrLoadModule('/src/store/auth.store.ts'));
  ({ default: api } = await vite.ssrLoadModule('/src/core/api.ts'));
  ({ default: router } = await vite.ssrLoadModule('/src/router/index.ts'));
  for (const route of router.getRoutes()) {
    if (route.components) route.components.default = { render: () => null };
  }
});

after(async () => { await vite?.close(); });

beforeEach(async () => {
  setActivePinia(createPinia());
  auth = useAuthStore();
  auth.initialized = true;
  await router.replace('/login');
  auth.$reset();
  requests = [];
  responses = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    assert.ok(responses.length, `Solicitud inesperada: ${config.method} ${config.url}`);
    const { status = 200, data } = responses.shift();
    const response = { status, data, config, statusText: '', headers: {} };
    if (status >= 400) throw new AxiosError(data.detail, undefined, config, undefined, response);
    return response;
  };
});

test('login hace bootstrap, envía cookie/CSRF y conserva IDs como cadenas', async () => {
  responses.push({ data: anonymous }, { data: authenticated });
  await auth.login(usuario.correo, 'contraseña-de-prueba');
  assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
    ['get', '/auth/sesion'], ['post', '/auth/sesion'],
  ]);
  assert.equal(requests[0].headers.get('X-CSRF-Token'), undefined);
  assert.equal(requests[1].headers.get('X-CSRF-Token'), anonymous.csrf_token);
  assert.deepEqual(JSON.parse(requests[1].data), {
    correo: usuario.correo, password: 'contraseña-de-prueba',
  });
  for (const request of requests) {
    assert.equal(request.withCredentials, true);
    assert.equal(request.headers.get('Authorization'), undefined);
  }
  assert.deepEqual(auth.user, usuario);
  assert.equal(auth.user.id, '9007199254740993');
  assert.equal(auth.csrfToken, authenticated.csrf_token);
  assert.equal(auth.isAuthenticated, true);
});

test('el guard espera la recuperación de sesión al entrar a una ruta protegida', async () => {
  responses.push({ data: authenticated });
  await router.replace('/captura');
  assert.equal(requests.length, 1);
  assert.equal(router.currentRoute.value.name, 'Captura');
  assert.equal(auth.isCapturista, true);
});

test('sesión anónima o backend sin configurar no habilitan rutas protegidas', async () => {
  responses.push({ data: anonymous });
  await router.replace('/administrador');
  assert.equal(router.currentRoute.value.name, 'Login');
  assert.equal(auth.isAuthenticated, false);

  auth.$reset();
  responses.push(
    { status: 503, data: { codigo: 'AUTENTICACION_NO_CONFIGURADA', detail: 'Falta configurar PostgreSQL.' } },
    { status: 503, data: { codigo: 'AUTENTICACION_NO_CONFIGURADA', detail: 'Falta configurar PostgreSQL.' } },
  );
  await router.replace('/captura');
  assert.equal(router.currentRoute.value.name, 'Login');
  assert.equal(auth.initialized, false);
});

test('rutas de captura, revisión y administración mantienen roles exclusivos', async () => {
  auth.initialized = true;
  for (const rol of ['captura', 'revision', 'administrador']) {
    auth.user = { ...usuario, rol };
    assert.equal(auth.isCapturista, rol === 'captura');
    assert.equal(auth.isRevisor, rol === 'revision');
    assert.equal(auth.isAdmin, rol === 'administrador');
    for (const [path, allowed] of [
      ['/captura', 'captura'], ['/seguimiento', 'revision'],
      ['/seguimiento/7', 'revision'], ['/administrador', 'administrador'],
    ]) {
      await router.replace(path);
      assert.equal(router.currentRoute.value.path, rol === allowed ? path : '/');
    }
  }
});

test('403 de permisos o CSRF conserva la sesión y no intenta logout', async () => {
  auth.user = usuario;
  auth.csrfToken = authenticated.csrf_token;
  auth.initialized = true;
  for (const codigo of ['NO_PERMITIDO', 'CSRF_INVALIDO']) {
    responses.push({ status: 403, data: { codigo, detail: 'Solicitud rechazada.' } });
    await assert.rejects(api.post('/prueba', {}), (error) => error.response.status === 403);
    assert.equal(auth.isAuthenticated, true);
    assert.equal(auth.csrfToken, authenticated.csrf_token);
  }
  assert.equal(requests.length, 2);
});

test('credenciales incorrectas conservan CSRF y permiten reintentar el login', async () => {
  responses.push({ data: anonymous }, {
    status: 401, data: { codigo: 'CREDENCIALES_INVALIDAS', detail: 'Correo o contraseña incorrectos.' },
  });
  await assert.rejects(auth.login(usuario.correo, 'incorrecta'), (error) => {
    assert.equal(error.response.data.detail, 'Correo o contraseña incorrectos.');
    return true;
  });
  assert.equal(auth.isAuthenticated, false);
  assert.equal(auth.csrfToken, anonymous.csrf_token);
  responses.push({ data: anonymous }, { data: authenticated });
  await auth.login(usuario.correo, 'correcta');
  assert.equal(auth.isAuthenticated, true);
});

test('401 de sesión expirada limpia identidad y redirige al login sin DELETE', async () => {
  auth.user = usuario;
  auth.csrfToken = authenticated.csrf_token;
  auth.initialized = true;
  await router.replace('/captura');
  const redirected = new Promise((resolve) => {
    const remove = router.afterEach((to) => {
      if (to.name === 'Login') { remove(); resolve(); }
    });
  });
  responses.push(
    { status: 401, data: { codigo: 'NO_AUTENTICADO', detail: 'Debes iniciar sesión.' } },
    { data: anonymous },
  );
  await assert.rejects(api.get('/prueba'));
  await redirected;
  assert.equal(auth.isAuthenticated, false);
  assert.equal(router.currentRoute.value.name, 'Login');
  assert.equal(requests.some(({ method }) => method === 'delete'), false);
});

test('logout renueva CSRF y revoca la sesión antes de limpiar el estado', async () => {
  auth.user = usuario;
  auth.csrfToken = 'csrf-anterior';
  responses.push({ data: authenticated }, { status: 204 });
  await auth.logout();
  assert.equal(requests[1].method, 'delete');
  assert.equal(requests[1].url, '/auth/sesion');
  assert.equal(requests[1].headers.get('X-CSRF-Token'), authenticated.csrf_token);
  assert.equal(auth.user, null);
  assert.equal(auth.csrfToken, null);
  assert.equal(auth.initialized, false);
});

test('logout fallido no simula haber cerrado la sesión del servidor', async () => {
  auth.user = usuario;
  responses.push({ data: authenticated }, { status: 503, data: { detail: 'Servicio no disponible.' } });
  await assert.rejects(auth.logout());
  assert.equal(auth.isAuthenticated, true);

  responses.push({ data: anonymous });
  await auth.logout();
  assert.equal(auth.isAuthenticated, false);
  assert.equal(requests.filter(({ method }) => method === 'delete').length, 1);
});
