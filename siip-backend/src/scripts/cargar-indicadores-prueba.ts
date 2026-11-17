import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';
import { createPool } from '../database/pool.js';
import { idSchema } from '../modules/auth/schemas/auth.schema.js';
import { createIndicatorsRepository } from '../modules/indicadores/repositories/indicadores.repository.js';
import { createIndicatorsService } from '../modules/indicadores/services/indicadores.service.js';
import { createVariablesRepository } from '../modules/indicadores/repositories/variables.repository.js';
import { saveVariablesSchema } from '../modules/indicadores/schemas/variables.schema.js';
import { createIndicatorSchema } from '../modules/indicadores/schemas/indicadores.schema.js';
import { z } from 'zod';

config({ quiet: true });
if (process.env.NODE_ENV === 'production') throw new Error('Los ejemplos ficticios no se cargan en producción.');
const aplicar = process.argv.includes('--aplicar');
const actorArg = process.argv.find(arg => arg.startsWith('--actor='))?.slice(8);
const url = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Este cargador es exclusivo de desarrollo local.');
const pool = createPool(url.toString());
try {
  const source = z.object({ fichas: z.array(z.object({ consecutivoOrigen: z.string(), campos: createIndicatorSchema })) })
    .parse(JSON.parse(await readFile(new URL('../../test/fixtures/indicadores-prueba.json', import.meta.url), 'utf8')));
  const fichas = source.fichas.filter(ficha => ['130', '131', '132', '133'].includes(ficha.consecutivoOrigen));
  if (fichas.length !== 4) throw new Error('Deben existir exactamente las cuatro fichas de prueba 130–133.');
  const admins = (await pool.query<{ id: string }>("SELECT id::text FROM usuarios WHERE rol = 'administrador' AND activo ORDER BY id")).rows;
  if (!actorArg && admins.length !== 1) throw new Error('Selecciona un administrador activo mediante --actor=ID.');
  const actorId = idSchema.parse(actorArg ?? (admins.length === 1 ? admins[0]!.id : undefined));
  if (!admins.some(admin => admin.id === actorId)) throw new Error('Selecciona un administrador activo mediante --actor=ID.');
  const indicators = createIndicatorsService(createIndicatorsRepository(pool));
  const variables = createVariablesRepository(pool);
  const existing = await indicators.list();
  const units = ['reportes', 'respuestas', 'bienes', 'sitios'];
  const summary: { clave: string; accion: string; id?: string; variables?: number }[] = [];
  for (const [index, ficha] of fichas.entries()) {
    const found = existing.find(item => item.campos.clave === ficha.campos.clave);
    if (found) {
      if (found.activo || Object.entries(ficha.campos).some(([key, value]) => found.campos[key as keyof typeof ficha.campos] !== value)) {
        throw new Error('La ficha existente difiere del ejemplo; no se modificó: ' + ficha.campos.clave);
      }
    }
    if (!aplicar) {
      summary.push({ clave: ficha.campos.clave, accion: found ? 'conservar y comprobar variables' : 'crear ficha inactiva con N y D' });
      continue;
    }
    const indicator = found ?? await indicators.create(ficha.campos, actorId);
    const current = await variables.find(indicator.id);
    const definitions = ['N', 'D'].map(codigo => {
      const description = ficha.campos.variables.split('\n').find(line => line.startsWith(codigo + ':'))?.slice(2).trim();
      if (!description) throw new Error('Falta la definición de ' + codigo + ' en ' + ficha.campos.clave);
      return { codigo, descripcion: description, unidadMedida: units[index]!, tipoDato: 'entero' as const, dependenciaId: null };
    });
    if (!current.variables.length) {
      await variables.save(indicator.id, saveVariablesSchema.parse({ version: current.version, variables: definitions }), actorId);
    } else if (current.variables.length !== 2 || !definitions.every(definition => current.variables.some(variable =>
      variable.codigo === definition.codigo && variable.descripcion === definition.descripcion
      && variable.unidadMedida === definition.unidadMedida && variable.tipoDato === definition.tipoDato))) {
      throw new Error('El indicador ya tiene otras variables; no se sobrescribieron: ' + ficha.campos.clave);
    }
    summary.push({ clave: ficha.campos.clave, accion: found ? 'conservado' : 'creado', id: indicator.id, variables: 2 });
  }
  console.log(JSON.stringify({ aplicar, base: decodeURIComponent(url.pathname.slice(1)), actorId, fichas: summary }, null, 2));
} catch (error) {
  console.error(error instanceof Error && !('code' in error) ? error.message : 'No se pudo completar la carga. Revisa SQL 005/006 y la conexión local.');
  process.exitCode = 1;
} finally { await pool.end(); }
