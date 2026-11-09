import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { AxiosError } from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { createServer } from 'vite';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

const usuario = {
  id: '9007199254740993', nombre: 'Cuenta de prueba', correo: 'captura@example.test',
  rol: 'captura', dependencia_id: '7',
};
const anonymous = { usuario: null, csrf_token: 'csrf-anonimo-de-prueba' };
const authenticated = { usuario, csrf_token: 'csrf-autenticado-de-prueba' };
let vite, api, router, useAuthStore, auth, requests, responses, AdminView, MainLayout, LoginView;

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
  ({ default: AdminView } = await vite.ssrLoadModule('/src/modules/admin/AdminView.vue'));
  ({ default: MainLayout } = await vite.ssrLoadModule('/src/layouts/MainLayout.vue'));
  ({ default: LoginView } = await vite.ssrLoadModule('/src/modules/auth/LoginView.vue'));
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
  for (const rol of ['captura', 'revision', 'administrador', 'consulta']) {
    auth.user = { ...usuario, rol };
    assert.equal(auth.isCapturista, rol === 'captura');
    assert.equal(auth.isRevisor, rol === 'revision');
    assert.equal(auth.isAdmin, rol === 'administrador');
    for (const [path, allowed] of [
      ['/captura', 'captura'], ['/seguimiento', 'revision'],
      ['/seguimiento/7', 'revision'], ['/administrador', 'administrador'],
      ['/administrador/indicadores/nuevo', 'administrador'],
    ]) {
      await router.replace(path);
      assert.equal(router.currentRoute.value.path, rol === allowed ? path : '/');
    }
  }
});

test('Consulta recupera su sesión sin dependencia y accede a las rutas de lectura', async () => {
  responses.push({ data: { ...authenticated, usuario: { ...usuario, rol: 'consulta', dependencia_id: null } } });
  for (const path of ['/', '/estadisticas', '/estadisticas/analisis']) {
    await router.replace(path);
    assert.equal(router.currentRoute.value.path, path);
  }
  assert.equal(requests.length, 1);
  assert.equal(auth.user.rol, 'consulta');
  assert.equal(auth.user.dependencia_id, null);
  assert.equal(auth.isCapturista || auth.isRevisor || auth.isAdmin, false);
});

async function renderComponent(component) {
  let state;
  const app = createSSRApp(component).use(router);
  app.mixin({ created() { if (!this.$parent) state = this.$.setupState; } });
  const html = await renderToString(app);
  return { state, html };
}

test('el menú lateral conserva el diseño y muestra solo las opciones del perfil', async () => {
  auth.initialized = true;
  for (const rol of ['captura', 'revision', 'administrador', 'consulta']) {
    auth.user = { ...usuario, rol, dependencia_id: rol === 'consulta' ? null : '7' };
    const { state, html } = await renderComponent(MainLayout);
    const expected = ['Estadísticas', 'Consulta'];
    if (rol === 'captura') expected.push('Captura');
    if (rol === 'revision') expected.push('Seguimiento');
    if (rol === 'administrador') expected.push('Administrador');
    assert.deepEqual(state.opcionesVisibles.map(({ label }) => label), expected);
    assert.match(html, /class="sidebar-nav"/);
    assert.match(html, /Cuenta de prueba/);
    for (const label of ['Captura', 'Seguimiento', 'Administrador']) {
      assert.equal(html.includes(`>${label}</span>`), expected.includes(label));
    }
  }
});

test('el formulario visual muestra el error del backend y permite reintentar sin acceso simulado', async () => {
  auth.initialized = true;
  const { state: form } = await renderComponent(LoginView);
  form.email = usuario.correo;
  form.password = 'incorrecta';
  responses.push({ data: anonymous }, {
    status: 401, data: { codigo: 'CREDENCIALES_INVALIDAS', detail: 'Correo o contraseña incorrectos.' },
  });
  await form.handleLogin();
  assert.equal(form.errorMsg, 'Correo o contraseña incorrectos.');
  assert.equal(form.cargando, false);
  assert.equal(auth.isAuthenticated, false);
  assert.equal(router.currentRoute.value.name, 'Login');
  form.password = 'contraseña-de-prueba';
  responses.push({ data: anonymous }, { data: authenticated });
  await form.handleLogin();
  assert.equal(auth.isAuthenticated, true);
  assert.equal(form.password, '');
  assert.equal(form.errorMsg, '');
  assert.equal(router.currentRoute.value.name, 'Estadisticas');
});

test('Salir espera al servidor, evita duplicados y permite reintentar un cierre fallido', async () => {
  auth.initialized = true;
  auth.user = usuario;
  await router.replace('/captura');
  const { state: layout } = await renderComponent(MainLayout);
  responses.push({ data: authenticated }, { status: 503, data: { detail: 'Servicio no disponible.' } });
  const pending = layout.handleLogout();
  assert.equal(layout.isLoggingOut, true);
  await layout.handleLogout();
  await pending;
  assert.equal(requests.length, 2);
  assert.equal(layout.logoutError, 'Servicio no disponible.');
  assert.equal(layout.isLoggingOut, false);
  assert.equal(auth.isAuthenticated, true);
  assert.equal(router.currentRoute.value.name, 'Captura');
  responses.push({ data: authenticated }, { status: 204 }, { data: anonymous });
  await layout.handleLogout();
  assert.equal(layout.logoutError, '');
  assert.equal(auth.isAuthenticated, false);
  assert.equal(router.currentRoute.value.name, 'Login');
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

async function adminForm() {
  let state;
  const app = createSSRApp(AdminView);
  app.mixin({ created() { state = this.$.setupState; } });
  await renderToString(app);
  return state;
}

test('alta de dependencia actualiza el selector y permite crear Revisión con esa dependencia', async () => {
  const form = await adminForm();
  const dependency = { id: '9007199254740993', clave: 'REV', nombre: 'Planeación', activo: true };
  auth.csrfToken = authenticated.csrf_token;
  responses.push({ data: [] });
  await form.loadDependencies();
  Object.assign(form.dependencyForm, { clave: 'REV', nombre: 'Planeación' });
  responses.push({ status: 201, data: dependency });
  await form.createDependency();
  assert.deepEqual(form.dependencies, [dependency]);
  assert.equal(form.userForm.dependencia_id, dependency.id);
  assert.equal(form.dependencyForm.clave, '');

  Object.assign(form.userForm, { nombre: 'Revisión de prueba', correo: 'revision@example.test',
    password: 'contraseña-sintética-2026', rol: 'revision' });
  responses.push({ status: 201, data: { ...usuario, nombre: form.userForm.nombre, rol: 'revision', dependencia_id: dependency.id } });
  await form.createUser();
  const request = requests.at(-1);
  assert.equal(request.url, '/administracion/usuarios');
  assert.equal(request.headers.get('X-CSRF-Token'), authenticated.csrf_token);
  assert.deepEqual(JSON.parse(request.data), { nombre: 'Revisión de prueba', correo: 'revision@example.test',
    password: 'contraseña-sintética-2026', rol: 'revision', dependencia_id: dependency.id });
  assert.equal(form.userForm.password, '');
  assert.match(form.userSuccess, /creado/);
});

test('altas sin dependencia o con error del servidor no muestran éxito', async () => {
  const form = await adminForm();
  responses.push({ data: [] });
  await form.loadDependencies();
  await form.createUser();
  assert.equal(requests.length, 1);
  assert.match(form.userError, /dependencia activa/);
  const dependency = { id: '7', clave: 'REV', nombre: 'Revisión', activo: true };
  form.dependencies.push(dependency);
  Object.assign(form.userForm, { dependencia_id: '7', password: 'contraseña-sintética-2026' });
  responses.push({ status: 409, data: { detail: 'Ya existe una cuenta con ese correo.' } });
  await form.createUser();
  assert.equal(form.userError, 'Ya existe una cuenta con ese correo.');
  assert.equal(form.userSuccess, '');
  assert.equal(form.userForm.password, '');
  assert.equal(form.savingUser, false);

  Object.assign(form.dependencyForm, { clave: 'REV', nombre: 'Revisión' });
  responses.push({ status: 409, data: { detail: 'Ya existe una dependencia con esa clave.' } });
  await form.createDependency();
  assert.equal(form.dependencyError, 'Ya existe una dependencia con esa clave.');
  assert.equal(form.dependencyForm.clave, 'REV');
  assert.equal(form.dependencies.length, 1);
});

test('fallo al cargar dependencias bloquea altas hasta que se reintenta', async () => {
  const form = await adminForm();
  responses.push({ status: 503, data: { detail: 'Servicio no disponible.' } });
  await form.loadDependencies();
  await form.createUser();
  await form.createDependency();
  assert.equal(requests.length, 1);
  assert.equal(form.dependenciesError, 'Servicio no disponible.');
  responses.push({ data: [] });
  await form.loadDependencies();
  assert.equal(form.dependenciesError, '');
  assert.equal(form.loadingDependencies, false);
});
