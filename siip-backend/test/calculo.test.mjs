import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Decimal } from 'decimal.js';
import { calcularCociente, calcularVariacion, calcularComplemento, calcularCrecimientoReal } from '../src/modules/evaluacion/services/calculo.service.ts';

test('cociente: factor explícito, decimales exactos, cero válido y resultados sin recorte a 100', () => {
  for (const [numerador, denominador, factor, esperado] of [
    ['1', '4', '1', '0.25'], ['25', '100', '100', '25'], ['3', '8', '1000', '375'],
    ['7', '1000', '100000', '700'], ['0.3', '0.2', '100', '150'], ['0', '100', '100', '0'],
    ['200', '100', '100', '200'], ['-5', '10', '100', '-50'], ['5', '10', '0', '0'],
  ]) assert.deepEqual(calcularCociente({ numerador, denominador, factor }), { valor: esperado, motivo: null });
});
test('variación: diferencia sobre el anterior, aumentos, descensos y valores fuera de 0–100', () => {
  for (const [actual, anterior, factor, esperado] of [
    ['120', '100', '100', '20'], ['80', '100', '100', '-20'], ['100', '100', '100', '0'],
    ['0', '100', '100', '-100'], ['400', '100', '100', '300'], ['0.3', '0.2', '100', '50'],
    ['120', '100', '1', '0.2'],
  ]) assert.deepEqual(calcularVariacion({ actual, anterior, factor }), { valor: esperado, motivo: null });
});
test('complemento: base menos parte, dividido por la misma base', () => {
  for (const [base, parte, factor, esperado] of [
    ['100', '30', '100', '70'], ['10', '0', '100', '100'], ['10', '10', '100', '0'],
    ['10', '12', '100', '-20'], ['100', '30', '1', '0.7'],
  ]) assert.deepEqual(calcularComplemento({ base, parte, factor }), { valor: esperado, motivo: null });
});
test('crecimiento real: inflación en puntos porcentuales, ajuste único y resultados negativos', () => {
  for (const [actual, anterior, inflacionPorcentual, esperado] of [
    ['110', '100', '10', '0'], ['121', '100', '10', '10'], ['114', '100', '20', '-5'],
    ['95', '100', '-5', '0'], ['100', '100', '0', '0'], ['0', '100', '10', '-100'],
    ['200', '100', '0', '100'], ['100.1', '100', '0.1', '0'],
  ]) assert.deepEqual(calcularCrecimientoReal({ actual, anterior, inflacionPorcentual }), { valor: esperado, motivo: null });
});
test('divisiones indefinidas dan causa matemática y nunca cero, NaN, infinito o color', () => {
  const casos = [
    [() => calcularCociente({ numerador: '1', denominador: '0', factor: '100' }), 'DENOMINADOR_CERO'],
    [() => calcularCociente({ numerador: '0', denominador: '-0', factor: '0' }), 'DENOMINADOR_CERO'],
    [() => calcularVariacion({ actual: '100', anterior: '0', factor: '100' }), 'BASE_CERO'],
    [() => calcularComplemento({ base: '0', parte: '1', factor: '100' }), 'DENOMINADOR_CERO'],
    [() => calcularCrecimientoReal({ actual: '100', anterior: '0', inflacionPorcentual: '5' }), 'BASE_CERO'],
    [() => calcularCrecimientoReal({ actual: '100', anterior: '100', inflacionPorcentual: '-100' }), 'AJUSTE_INFLACION_CERO'],
  ];
  for (const [calcular, motivo] of casos) assert.deepEqual(calcular(), { valor: null, motivo });
});
test('no pierde cifras al convertir a Number ni redondea a cuatro decimales para futuros cálculos', () => {
  assert.deepEqual(calcularCociente({ numerador: '9007199254740993', denominador: '1', factor: '1' }), { valor: '9007199254740993', motivo: null });
  assert.deepEqual(calcularVariacion({ actual: '10000000000000000.000000000000001', anterior: '10000000000000000', factor: '100' }),
    { valor: `0.${'0'.repeat(28)}1`, motivo: null });
  assert.deepEqual(calcularCociente({ numerador: '1', denominador: '3', factor: '1' }), { valor: `0.${'3'.repeat(100)}`, motivo: null });
  assert.deepEqual(calcularCociente({ numerador: '1', denominador: '100000000', factor: '1' }), { valor: '0.00000001', motivo: null });
  const grande = '9'.repeat(32);
  assert.equal(calcularCociente({ numerador: grande, denominador: '1', factor: grande }).valor, (BigInt(grande) ** 2n).toString());
});
test('el contrato exige todos los operandos como cadenas decimales y rechaza conversiones implícitas', () => {
  for (const dato of [null, undefined, '', ' ', ' 1', '1 ', '1,5', '.5', '1.', '+1', '01', '1e3', 'NaN', 'Infinity',
    Number.NaN, Number.POSITIVE_INFINITY, 1, false, {}, '1'.repeat(33), '0.' + '1'.repeat(32)]) {
    assert.throws(() => calcularCociente({ numerador: dato, denominador: '10', factor: '100' }));
    assert.throws(() => calcularVariacion({ actual: '1', anterior: dato, factor: '100' }));
    assert.throws(() => calcularComplemento({ base: '10', parte: dato, factor: '100' }));
    assert.throws(() => calcularCrecimientoReal({ actual: '10', anterior: '10', inflacionPorcentual: dato }));
  }
  assert.throws(() => calcularCociente({ numerador: '1', denominador: '2' }));
  assert.throws(() => calcularVariacion({ actual: '1', anterior: '2', factor: '' }));
});
test('no acepta fórmula ejecutable, parámetros de semáforo ni asignaciones; no muta entradas o Decimal global', () => {
  const casos = [
    [calcularCociente, { numerador: '1', denominador: '2', factor: '100' }],
    [calcularVariacion, { actual: '120', anterior: '100', factor: '100' }],
    [calcularComplemento, { base: '100', parte: '30', factor: '100' }],
    [calcularCrecimientoReal, { actual: '121', anterior: '100', inflacionPorcentual: '10' }],
  ];
  const precision = Decimal.precision, rounding = Decimal.rounding;
  for (const [calcular, datos] of casos) {
    for (const extra of [{ semaforo: 'verde' }, { formula: 'process.exit()' }, { dependenciaId: '2' }]) {
      assert.throws(() => calcular({ ...datos, ...extra }));
    }
    const original = structuredClone(datos);
    const resultado = calcular(Object.freeze(datos));
    assert.deepEqual(datos, original);
    assert.deepEqual(Object.keys(resultado).sort(), ['motivo', 'valor']);
  }
  assert.equal(Decimal.precision, precision);
  assert.equal(Decimal.rounding, rounding);
});
