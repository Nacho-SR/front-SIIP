import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createServer } from 'vite';

let vite, calendario, seguimiento, admin, catalogo, CaptureView, ReviewDetailView, NuevoIndicadorView, ConsultaView, router, useAuthStore, api;
before(async () => {
  vite = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom',
    plugins: [{ name: 'test-memory-history', transform(code, id) {
      if (id.endsWith('/src/router/index.ts')) return code.replaceAll('createWebHistory', 'createMemoryHistory');
    } }],
  });
  calendario = await vite.ssrLoadModule('/src/core/operacion-pendiente.ts');
  seguimiento = await vite.ssrLoadModule('/src/modules/review/data/seguimiento.store.ts');
  admin = await vite.ssrLoadModule('/src/modules/admin/data/admin.store.ts');
  ({ default: api } = await vite.ssrLoadModule('/src/core/api.ts'));
  ({ default: catalogo } = await vite.ssrLoadModule('/src/modules/consulta/data/indicadores-siip.json'));
  ({ default: CaptureView } = await vite.ssrLoadModule('/src/modules/capture/CaptureView.vue'));
  ({ default: ReviewDetailView } = await vite.ssrLoadModule('/src/modules/review/ReviewDetailView.vue'));
  ({ default: NuevoIndicadorView } = await vite.ssrLoadModule('/src/modules/admin/NuevoIndicadorView.vue'));
  ({ default: ConsultaView } = await vite.ssrLoadModule('/src/modules/consulta/ConsultaView.vue'));
  ({ default: router } = await vite.ssrLoadModule('/src/router/index.ts'));
  ({ useAuthStore } = await vite.ssrLoadModule('/src/store/auth.store.ts'));
  for (const route of router.getRoutes()) if (route.components) route.components.default = { render: () => null };
});
after(async () => { await vite?.close(); });
beforeEach(() => {
  setActivePinia(createPinia());
  const auth = useAuthStore();
  auth.initialized = true;
  auth.user = { id: '1', nombre: 'Revisión de prueba', correo: 'revision@example.test', rol: 'revision', dependencia_id: '7' };
  admin.adminState.indicadores = [];
  admin.adminState.error = '';
  admin.adminState.cargando = false;
});

async function render(component, preparar) {
  let state;
  const app = createSSRApp(component).use(router);
  app.mixin({ created() {
    if (this.$parent) return;
    state = this.$.setupState;
    preparar?.(state);
  } });
  return { html: await renderToString(app), state };
}

function expediente(cambios = {}) {
  return {
    id: 'envio-original', indicadorClave: catalogo[0].clave, indicadorNombre: 'Ejemplo',
    frecuencia: 'Mensual', periodo: '2026-09', estado: 'Observada', valor: 8,
    variablesCaptura: { A: 8 }, evidenciaNombre: 'EVIDENCIA_PRIVADA.pdf', descripcion: 'Descripción original',
    actualizadoEn: '2026-10-01T12:00:00Z', historial: [{ comentario: 'OBSERVACION_PRIVADA' }],
    publicacion: { valor: 7, semaforo: 'amarillo', version: 'v1', versionRegla: 'r1', publicadaEn: '2026-10-01T12:00:00Z' },
    ...cambios,
  };
}

async function conAlmacenamiento(nombre, almacenamiento, ejecutar) {
  const original = Object.getOwnPropertyDescriptor(globalThis, nombre);
  Object.defineProperty(globalThis, nombre, { configurable: true, value: almacenamiento });
  try { return await ejecutar(); }
  finally {
    if (original) Object.defineProperty(globalThis, nombre, original);
    else delete globalThis[nombre];
  }
}

test('el calendario incluye el último día local y cierra al iniciar el siguiente periodo', () => {
  for (const [frecuencia, periodo, antes, despues] of [
    ['Mensual', '2026-03', '2026-04-01T05:59:59.999Z', '2026-04-01T06:00:00Z'],
    ['Trimestral', '2026-T1', '2026-04-01T05:59:59.999Z', '2026-04-01T06:00:00Z'],
    ['Semestral', '2026-S1', '2026-07-01T05:59:59.999Z', '2026-07-01T06:00:00Z'],
    ['Anual', '2026', '2027-01-01T05:59:59.999Z', '2027-01-01T06:00:00Z'],
  ]) {
    assert.equal(calendario.estadoPeriodo(frecuencia, periodo, new Date(antes)), 'abierto');
    assert.equal(calendario.estadoPeriodo(frecuencia, periodo, new Date(despues)), 'cerrado');
  }
  assert.equal(calendario.estadoPeriodo('Trimestral', '2026-T2', new Date('2026-03-31T12:00:00Z')), 'futuro');
  for (const [frecuencia, periodo] of [['Bimestral', '2026-B1'], ['Mensual', '2026-13'], ['Anual', '0000'], ['Semestral', '2026-S3'], [null, '2026'], ['Anual', undefined]]) {
    assert.equal(calendario.estadoPeriodo(frecuencia, periodo), 'invalido');
  }
});

test('Captura no lee expedientes compartidos ni escribe al intentar enviar o corregir', async () => {
  let lecturas = 0;
  let escrituras = 0;
  await conAlmacenamiento('sessionStorage', {
    getItem() { lecturas++; return JSON.stringify([expediente()]); },
    setItem() { escrituras++; },
  }, async () => {
    const { state, html } = await render(CaptureView, state => {
      state.indicadorSeleccionado = catalogo[0].clave;
      state.anio = 2026;
      state.reloj = new Date('2026-11-09T12:00:00Z');
    });
    state.actualizarRegistros();
    state.guardarCaptura();
    state.corregirObservado(expediente());
    assert.equal(state.registros.length, 0);
    assert.match(state.errorCaptura, /Vista previa/);
    assert.equal(lecturas, 0);
    assert.equal(escrituras, 0);
    assert.doesNotMatch(html, /EVIDENCIA_PRIVADA|OBSERVACION_PRIVADA/);
    assert.match(html, /<fieldset disabled/);
    assert.match(html, /<button[^>]*type="submit"[^>]*disabled/);
    assert.doesNotMatch(html, /Máximo 10 MB/);
  });
});

test('la vista de Captura diferencia periodos cerrados y futuros sin conceder asignación', async () => {
  const mensual = catalogo.find(indicador => indicador.frecuencia === 'Mensual');
  const { state, html } = await render(CaptureView, state => {
    state.indicadorSeleccionado = mensual.clave;
    state.anio = 2026;
    state.reloj = new Date('2026-11-09T12:00:00Z');
  });
  assert.equal(state.periodosDisponibles.find(periodo => periodo.valor === '2026-10').estado, 'cerrado');
  assert.equal(state.periodosDisponibles.find(periodo => periodo.valor === '2026-11').estado, 'abierto');
  assert.equal(state.periodosDisponibles.find(periodo => periodo.valor === '2026-12').estado, 'futuro');
  assert.match(html, /No representa los indicadores ni las variables asignados a tu dependencia/);
});

test('las funciones de escritura rechazan cambios sin alterar valores, variables, PDF, historia o publicación', async () => {
  const original = JSON.stringify([expediente()]);
  let contenido = original;
  let escrituras = 0;
  await conAlmacenamiento('sessionStorage', {
    getItem() { return contenido; }, setItem(_key, value) { escrituras++; contenido = value; },
  }, async () => {
    for (const accion of ['revisar', 'observar', 'validar']) {
      assert.throws(() => seguimiento.actualizarExpediente('envio-original', accion, 'Comentario'), /Vista previa/);
    }
    assert.throws(() => seguimiento.reenviarCorreccion('envio-original', {
      valor: 9, variablesCaptura: { A: 9 }, evidenciaNombre: 'nuevo.pdf', descripcion: 'Cambio',
    }), /Vista previa/);
    assert.equal(escrituras, 0);
    assert.equal(contenido, original);
    assert.deepEqual(seguimiento.obtenerExpedientes(), JSON.parse(original));
  });
});

test('Seguimiento muestra validación deshabilitada para un periodo abierto y rechaza llamadas directas', async () => {
  const { state, html } = await render(ReviewDetailView, state => {
    state.expediente = expediente({ estado: 'Revisada', frecuencia: 'Anual', periodo: '2099' });
  });
  assert.match(state.avisoValidacion, /No se puede validar antes/);
  const boton = html.match(/<button[^>]*>\s*Validar expediente\s*<\/button>/)?.[0];
  assert.ok(boton);
  assert.match(boton, /disabled/);
  state.ejecutarAccion('validar');
  assert.match(state.error, /Vista previa/);
  assert.equal(state.expediente.estado, 'Revisada');
  assert.equal(state.expediente.publicacion.valor, 7);
});

test('una advertencia metodológica no habilita validar ni se presenta como gris por incumplimiento', async () => {
  const { state, html } = await render(ReviewDetailView, state => {
    state.expediente = expediente({ indicadorClave: 'SIIP.08.F52.002', estado: 'Revisada', frecuencia: 'Anual', periodo: '2025' });
  });
  assert.match(state.avisoValidacion, /metodología presenta advertencias/);
  assert.equal(state.evaluacion.color, 'sin-color');
  assert.match(html, /Los datos y cálculos son ejemplos locales/);
  assert.match(html.match(/<button[^>]*>\s*Validar expediente\s*<\/button>/)[0], /disabled/);
});

test('cambiar agrupación filtra familias y borra una familia incompatible', async () => {
  useAuthStore().user.rol = 'administrador';
  const primero = catalogo[0];
  const otro = catalogo.find(indicador => indicador.agrupacion !== primero.agrupacion);
  const { html } = await render(NuevoIndicadorView, state => {
    state.formulario.agrupacion = primero.agrupacion;
    state.formulario.familia = primero.familia;
    assert.ok(state.familiasDisponibles.includes(primero.familia));
    assert.equal(state.familiasDisponibles.includes(otro.familia), false);
    state.formulario.agrupacion = otro.agrupacion;
    assert.equal(state.formulario.familia, '');
    assert.ok(state.familiasDisponibles.includes(otro.familia));
  });
  assert.match(html, /indicador inactivo/);
});

test('el guardado también rechaza una familia de otra agrupación sin escribir', async () => {
  const primero = catalogo[0];
  const otro = catalogo.find(indicador => indicador.agrupacion !== primero.agrupacion);
  let escrituras = 0;
  await conAlmacenamiento('localStorage', { setItem() { escrituras++; } }, async () => {
    await assert.rejects(admin.guardarIndicador({ clave: 'FICHA-PRUEBA', nombre: 'Ejemplo',
      agrupacion: primero.agrupacion, familia: otro.familia }), /familia que pertenezca/);
    assert.equal(escrituras, 0);
    assert.equal(admin.adminState.indicadores.length, 0);
  });
});

test('el alta espera al servidor y no escribe localStorage ni activa Consulta', async () => {
  const campos = { clave: 'FICHA-PRUEBA', nombre: 'Ejemplo', agrupacion: catalogo[0].agrupacion, familia: catalogo[0].familia };
  api.defaults.adapter = async () => { throw new Error('Sin conexión'); };
  await assert.rejects(admin.guardarIndicador(campos), /Sin conexión/);
  assert.equal(admin.adminState.indicadores.length, 0);
  const confirmado = { id: '9007199254740993', campos: { ...campos, consecutivo: '130' }, activo: false,
    creadoEn: '2026-11-09T12:00:00Z', actualizadoEn: '2026-11-09T12:00:00Z' };
  let enviado;
  api.defaults.adapter = async config => { enviado = config; return { status: 201, data: confirmado, config, headers: {} }; };
  await conAlmacenamiento('localStorage', { getItem() { assert.fail('No leer fichas demo'); }, setItem() { assert.fail('No guardar fichas locales'); } }, async () => {
    assert.deepEqual(await admin.guardarIndicador({ ...campos, consecutivo: '999' }), confirmado);
  });
  assert.equal(enviado.url, '/administracion/indicadores');
  assert.equal(JSON.parse(enviado.data).consecutivo, undefined);
  assert.equal(admin.adminState.indicadores.length, 1);
  const { state } = await render(ConsultaView);
  assert.equal(state.indicadores.length, 63);
  assert.equal(state.indicadores.some(indicador => indicador.clave === campos.clave), false);
});

test('el listado y la ficha se recuperan por API y los errores permiten reintentar', async () => {
  const confirmado = { id: '1', campos: { clave: 'SIIP.05.F35.004' }, activo: false };
  const urls = [];
  api.defaults.adapter = async config => { urls.push(config.url); return { status: 200, data: config.url.endsWith('/1') ? confirmado : [confirmado], config, headers: {} }; };
  await admin.refrescarAdmin();
  assert.deepEqual(admin.adminState.indicadores, [confirmado]);
  assert.deepEqual(await admin.obtenerIndicadorAdmin('1'), confirmado);
  assert.deepEqual(urls, ['/administracion/indicadores', '/administracion/indicadores/1']);
  api.defaults.adapter = async () => { throw new Error('Sin conexión'); };
  await assert.rejects(admin.refrescarAdmin());
  assert.deepEqual(admin.adminState.indicadores, []);
  assert.match(admin.adminState.error, /No se pudo cargar/);
  assert.equal(admin.adminState.cargando, false);
});
