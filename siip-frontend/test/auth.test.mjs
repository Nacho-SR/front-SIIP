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
let vite, api, router, useAuthStore, auth, requests, responses, AdminUsuariosView, AdminDependenciasView, AdminView, AdminIndicadoresView, MainLayout, LoginView, DashboardView;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
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
  ({ default: AdminUsuariosView } = await vite.ssrLoadModule('/src/modules/admin/AdminUsuariosView.vue'));
  ({ default: AdminDependenciasView } = await vite.ssrLoadModule('/src/modules/admin/AdminDependenciasView.vue'));
  ({ default: AdminView } = await vite.ssrLoadModule('/src/modules/admin/AdminView.vue'));
  ({ default: AdminIndicadoresView } = await vite.ssrLoadModule('/src/modules/admin/AdminIndicadoresView.vue'));
  ({ default: MainLayout } = await vite.ssrLoadModule('/src/layouts/MainLayout.vue'));
  ({ default: LoginView } = await vite.ssrLoadModule('/src/modules/auth/LoginView.vue'));
  ({ default: DashboardView } = await vite.ssrLoadModule('/src/modules/dashboard/DashboardView.vue'));
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
      ['/administrador/usuarios', 'administrador'], ['/administrador/dependencias', 'administrador'],
      ['/administrador/indicadores', 'administrador'],
      ['/administrador/indicadores/nuevo', 'administrador'],
    ]) {
      await router.replace(path);
      assert.equal(router.currentRoute.value.path, rol === allowed
        ? path === '/administrador' ? '/administrador/usuarios' : path : '/');
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

async function renderComponent(component, preparar) {
  let state;
  const app = createSSRApp(component).use(router);
  app.mixin({ created() {
    if (!this.$parent) { state = this.$.setupState; preparar?.(state); }
  } });
  const html = await renderToString(app);
  return { state, html };
}

test('seleccionar una agrupación conserva las otras ocho opciones del selector', async () => {
  const { state, html } = await renderComponent(DashboardView, state => { state.agrupacionSeleccionada = 1; });
  assert.equal(state.agrupacionesFiltradas.length, 1);
  const selector = html.match(/<select[^>]*id="filtro-agrupacion"[^>]*>[\s\S]*?<\/select>/)?.[0];
  assert.ok(selector);
  assert.equal((selector.match(/<option\b/g) ?? []).length, 9);
  assert.match(selector, /value="2"/);
});

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
  const { state: form, html } = await renderComponent(LoginView);
  assert.match(html, /Acceso con cuenta registrada/);
  assert.doesNotMatch(html, /autenticación real se integrará/);
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
  return (await renderComponent(AdminUsuariosView)).state;
}

test('alta de dependencia actualiza el selector y permite crear Revisión con esa dependencia', async () => {
  const dependenciesForm = (await renderComponent(AdminDependenciasView)).state;
  const dependency = { id: '9007199254740993', clave: 'REV', nombre: 'Planeación', activo: true };
  auth.csrfToken = authenticated.csrf_token;
  responses.push({ data: [] });
  await dependenciesForm.loadDependencies();
  Object.assign(dependenciesForm.dependencyForm, { clave: 'REV', nombre: 'Planeación' });
  responses.push({ status: 201, data: dependency });
  await dependenciesForm.createDependency();
  assert.deepEqual(dependenciesForm.dependencies, [dependency]);
  assert.equal(dependenciesForm.dependenciaCreada.id, dependency.id);
  assert.equal(dependenciesForm.dependencyForm.clave, '');
  const form = await adminForm();
  responses.push({ data: [dependency] });
  await form.loadDependencies();
  form.userForm.dependencia_id = dependency.id;
  await form.nuevoUsuario();
  assert.equal(form.userForm.dependencia_id, dependency.id);

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

  const dependenciesForm = (await renderComponent(AdminDependenciasView)).state;
  responses.push({ data: [dependency] });
  await dependenciesForm.loadDependencies();
  Object.assign(dependenciesForm.dependencyForm, { clave: 'REV', nombre: 'Revisión' });
  responses.push({ status: 409, data: { detail: 'Ya existe una dependencia con esa clave.' } });
  await dependenciesForm.createDependency();
  assert.equal(dependenciesForm.dependencyError, 'Ya existe una dependencia con esa clave.');
  assert.equal(dependenciesForm.dependencyForm.clave, 'REV');
  assert.equal(dependenciesForm.dependencies.length, 1);
});

test('fallo al cargar dependencias bloquea altas hasta que se reintenta', async () => {
  const form = await adminForm();
  responses.push({ status: 503, data: { detail: 'Servicio no disponible.' } });
  await form.loadDependencies();
  await form.createUser();
  assert.equal(requests.length, 1);
  assert.equal(form.dependenciesError, 'Servicio no disponible.');
  responses.push({ data: [] });
  await form.loadDependencies();
  assert.equal(form.dependenciesError, '');
  assert.equal(form.loadingDependencies, false);
});

test('Consulta se crea sin dependencia incluso si falla el catálogo y no se guarda en localStorage', async () => {
  const form = await adminForm();
  responses.push({ status: 503, data: { detail: 'No disponible.' } });
  await form.loadDependencies();
  Object.assign(form.userForm, {
    nombre: 'Consulta Presidencia', correo: 'consulta@example.test',
    password: 'contraseña-sintética-2026', rol: 'consulta', dependencia_id: '7',
  });
  const consulta = { ...usuario, nombre: form.userForm.nombre, correo: form.userForm.correo, rol: 'consulta', dependencia_id: null };
  responses.push({ status: 201, data: consulta });
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem() { assert.fail('Las altas no leen localStorage'); },
      setItem() { assert.fail('Las altas no escriben localStorage'); } },
  });
  try {
    await form.createUser();
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  }
  assert.deepEqual(JSON.parse(requests.at(-1).data), {
    nombre: consulta.nombre, correo: consulta.correo, password: 'contraseña-sintética-2026',
    rol: 'consulta', dependencia_id: null,
  });
  assert.deepEqual(form.users, [{ ...consulta, activo: true, dependencia_nombre: null }]);
  assert.equal(form.users[0].id, usuario.id);
  assert.equal(form.userForm.password, '');
  assert.match(form.userSuccess, /creado/);
  const reopened = await adminForm();
  responses.push({ data: form.users });
  await reopened.loadUsers();
  assert.deepEqual(reopened.users, form.users);
});

test('el alta pendiente evita duplicados y solo el éxito del servidor cierra el modal', async () => {
  const form = await adminForm();
  responses.push({ data: [{ id: '7', clave: 'REV', nombre: 'Revisión', activo: true }] });
  await form.loadDependencies();
  await form.nuevoUsuario();
  Object.assign(form.userForm, { nombre: usuario.nombre, correo: usuario.correo,
    dependencia_id: usuario.dependencia_id, password: 'contraseña-sintética-2026', rol: 'revision' });
  responses.push({ status: 422, data: { detail: 'La dependencia ya no está activa.' } });
  const pending = form.createUser();
  assert.equal(form.savingUser, true);
  await form.createUser();
  await form.cerrarModal();
  assert.equal(form.modalAbierto, true);
  await pending;
  assert.equal(requests.length, 2);
  assert.equal(form.modalAbierto, true);
  assert.equal(form.userError, 'La dependencia ya no está activa.');
  assert.equal(form.userSuccess, '');
  assert.equal(form.userForm.nombre, usuario.nombre);
  assert.equal(form.userForm.password, '');
  assert.equal(form.users.length, 0);

  form.userForm.password = 'otra-contraseña-sintética';
  responses.push({ status: 201, data: { ...usuario, rol: 'revision' } });
  await form.createUser();
  assert.equal(form.modalAbierto, false);
  assert.equal(form.users.length, 1);
  assert.equal(form.userError, '');
});

test('reintentar el catálogo invalida una selección eliminada o inactiva', async () => {
  const form = await adminForm();
  responses.push({ data: [{ id: '7', clave: 'REV', nombre: 'Revisión', activo: true }] });
  await form.loadDependencies();
  form.userForm.dependencia_id = '7';
  responses.push({ data: [] });
  await form.loadDependencies();
  assert.equal(form.userForm.dependencia_id, '');
  assert.equal(form.dependencyUnavailable, true);
  await form.createUser();
  assert.match(form.userError, /dependencia activa/);
  form.dependencies.push({ id: '7', clave: 'REV', nombre: 'Revisión', activo: false });
  form.userForm.dependencia_id = '7';
  await form.createUser();
  assert.equal(requests.length, 2);
  assert.equal(form.users.length, 0);
});

test('cancelar el modal borra la contraseña sin registrar una cuenta', async () => {
  const form = await adminForm();
  await form.nuevoUsuario();
  form.userForm.password = 'contraseña-sintética-2026';
  form.userError = 'Error previo';
  await form.cerrarModal();
  assert.equal(form.modalAbierto, false);
  assert.equal(form.userForm.password, '');
  assert.equal(form.userError, '');
  assert.equal(requests.length, 0);
});

test('el modal muestra contraseña inicial y dependencia solo para Captura y Revisión', async () => {
  for (const rol of ['captura', 'revision', 'consulta']) {
    const app = createSSRApp(AdminUsuariosView).use(router);
    app.mixin({ created() {
      if (this.$parent) return;
      this.$.setupState.modalAbierto = true;
      this.$.setupState.userForm.rol = rol;
    } });
    const context = {};
    const html = await renderToString(app, context);
    const modal = context.teleports.body;
    assert.match(modal, /role="dialog" aria-modal="true"/);
    assert.match(modal, /type="password" required minlength="15" maxlength="1024"/);
    assert.match(modal, /value="revision"/);
    assert.doesNotMatch(modal, /value="seguimiento"|Usuario activo|Editar usuario/);
    assert.equal(modal.includes('Selecciona una dependencia activa del catálogo institucional.'), rol !== 'consulta');
    assert.match(html, /Se muestran las cuentas registradas, incluidas las inactivas/);
  }
});

test('carga cuentas anteriores desde la API, conserva IDs y filtra por rol y dependencia histórica', async () => {
  const form = await adminForm();
  const previous = { ...usuario, activo: false, dependencia_nombre: 'Dependencia histórica' };
  const consulta = { ...usuario, id: '9007199254740994', rol: 'consulta',
    dependencia_id: null, activo: true, dependencia_nombre: null };
  responses.push({ data: [previous, consulta] });
  await form.loadUsers();
  assert.equal(requests.at(-1).url, '/administracion/usuarios');
  assert.equal(requests.at(-1).method, 'get');
  assert.deepEqual(form.users, [previous, consulta]);
  form.busqueda = 'histórica';
  assert.deepEqual(form.usuariosFiltrados, [previous]);
  form.busqueda = 'consulta';
  assert.deepEqual(form.usuariosFiltrados, [consulta]);
  const reopened = await adminForm();
  responses.push({ data: [previous, consulta] });
  await reopened.loadUsers();
  assert.deepEqual(reopened.users, form.users);
});

test('el listado informa un fallo, permite reintentar y no duplica peticiones pendientes', async () => {
  const form = await adminForm();
  responses.push({ status: 503, data: { detail: 'Listado no disponible.' } });
  const pending = form.loadUsers();
  assert.equal(form.loadingUsers, true);
  await form.loadUsers();
  await form.createUser();
  await pending;
  assert.equal(requests.length, 1);
  assert.equal(form.usersError, 'Listado no disponible.');
  assert.equal(form.loadingUsers, false);
  responses.push({ data: [{ ...usuario, activo: true, dependencia_nombre: 'Planeación' }] });
  await form.loadUsers();
  assert.equal(form.usersError, '');
  assert.equal(form.users.length, 1);
});

test('el formulario de Consulta conserva datos ante correo duplicado y permite otro correo sin dependencia', async () => {
  const form = await adminForm();
  Object.assign(form.userForm, { nombre: 'Consulta', correo: 'existe@example.test',
    password: 'contraseña-sintética-2026', rol: 'consulta' });
  form.modalAbierto = true;
  responses.push({ status: 409, data: { codigo: 'CORREO_YA_REGISTRADO', detail: 'Ya existe una cuenta con ese correo.' } });
  await form.createUser();
  assert.equal(form.userError, 'Ya existe una cuenta con ese correo.');
  assert.equal(form.modalAbierto, true);
  assert.equal(form.userForm.correo, 'existe@example.test');
  assert.equal(form.userForm.rol, 'consulta');
  assert.equal(form.userForm.password, '');
  assert.equal(form.users.length, 0);
  Object.assign(form.userForm, { correo: 'nueva@example.test', password: 'contraseña-sintética-2026' });
  responses.push({ status: 201, data: { ...usuario, correo: form.userForm.correo, rol: 'consulta', dependencia_id: null } });
  await form.createUser();
  assert.equal(form.users.length, 1);
  assert.equal(form.modalAbierto, false);
  assert.equal(JSON.parse(requests.at(-1).data).dependencia_id, null);
});

test('la navegación administrativa reconoce la sección de indicadores al crear o consultar una ficha', async () => {
  auth.initialized = true;
  auth.user = { ...usuario, rol: 'administrador', dependencia_id: null };
  await router.replace('/administrador');
  assert.equal(router.currentRoute.value.name, 'AdministradorUsuarios');
  await router.replace('/administrador/indicadores/nuevo?ver=1');
  const { state, html } = await renderComponent(AdminView);
  assert.equal(state.activa('/administrador/indicadores'), true);
  assert.equal(state.activa('/administrador/usuarios'), false);
  assert.deepEqual(state.secciones.map(s => s.nombre), ['Usuarios', 'Dependencias', 'Indicadores']);
  assert.match(html, /aria-label="Secciones de administración"/);
  assert.match(html, /administrador\/usuarios/);
  assert.match(html, /administrador\/dependencias/);
  assert.match(html, /administrador\/indicadores/);
  assert.equal(requests.length, 0);
});

test('Dependencias gestiona sus errores y ofrece crear usuario solo después de confirmar el alta', async () => {
  const form = (await renderComponent(AdminDependenciasView)).state;
  responses.push({ status: 503, data: { detail: 'Catálogo no disponible.' } });
  await form.loadDependencies();
  await form.createDependency();
  assert.equal(requests.length, 1);
  assert.equal(form.dependenciesError, 'Catálogo no disponible.');
  responses.push({ data: [] });
  await form.loadDependencies();
  Object.assign(form.dependencyForm, { clave: 'PLAN', nombre: 'Planeación' });
  const dependency = { id: '7', clave: 'PLAN', nombre: 'Planeación', activo: true };
  responses.push({ status: 201, data: dependency });
  await form.createDependency();
  const { html } = await renderComponent(AdminDependenciasView, state => {
    state.dependenciaCreada = form.dependenciaCreada;
    state.dependencySuccess = form.dependencySuccess;
  });
  assert.match(html, /usuarios\?dependencia=7/);
  assert.match(html, /Crear usuario en esta dependencia/);
  assert.ok(requests.every(request => request.url === '/administracion/dependencias'));
});

test('Indicadores carga su catálogo sin consultar usuarios ni dependencias', async () => {
  const { state } = await renderComponent(AdminIndicadoresView);
  responses.push({ data: [] });
  await state.cargarIndicadores();
  assert.deepEqual(requests.map(request => request.url), ['/administracion/indicadores']);
});
