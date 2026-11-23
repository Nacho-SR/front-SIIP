import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fechaMexico, periodoNatural, siguientePeriodo, inicioPeriodoValido, minimoInicio, ZONA_HORARIA } from '../src/modules/indicadores/services/periodos.service.ts';

test('periodos naturales: fecha inicial y último día inclusivos para las cuatro frecuencias', () => {
  const casos = [
    ['2026-01-01', 'Mensual', '2026-01-01', '2026-01-31'],
    ['2026-04-30', 'Mensual', '2026-04-01', '2026-04-30'],
    ['2026-03-31', 'Trimestral', '2026-01-01', '2026-03-31'],
    ['2026-04-01', 'Trimestral', '2026-04-01', '2026-06-30'],
    ['2026-08-15', 'Trimestral', '2026-07-01', '2026-09-30'],
    ['2026-12-31', 'Trimestral', '2026-10-01', '2026-12-31'],
    ['2026-06-30', 'Semestral', '2026-01-01', '2026-06-30'],
    ['2026-07-01', 'Semestral', '2026-07-01', '2026-12-31'],
    ['2026-01-01', 'Anual', '2026-01-01', '2026-12-31'],
    ['2026-12-31', 'Anual', '2026-01-01', '2026-12-31'],
  ];
  for (const [fecha, frecuencia, inicio, fin] of casos) {
    assert.deepEqual(periodoNatural(fecha, frecuencia), { inicio, fin });
    assert.deepEqual(periodoNatural(inicio, frecuencia), { inicio, fin });
    assert.deepEqual(periodoNatural(fin, frecuencia), { inicio, fin });
  }
});
test('febrero y bisiestos: 1900/2100 no son bisiestos y 2000/2028 sí', () => {
  for (const [year, fin] of [[1900, '28'], [2000, '29'], [2026, '28'], [2028, '29'], [2100, '28']]) {
    assert.deepEqual(periodoNatural(`${year}-02-15`, 'Mensual'), { inicio: `${year}-02-01`, fin: `${year}-02-${fin}` });
  }
  assert.deepEqual(periodoNatural('2028-02-29', 'Mensual'), { inicio: '2028-02-01', fin: '2028-02-29' });
});
test('el cambio de periodo sigue la medianoche de México, no UTC ni la zona del proceso', () => {
  assert.equal(ZONA_HORARIA, 'America/Mexico_City');
  for (const [antes, despues, frecuencia, inicioAntes, inicioDespues] of [
    ['2028-03-01T05:59:59.999Z', '2028-03-01T06:00:00.000Z', 'Mensual', '2028-02-01', '2028-03-01'],
    ['2027-04-01T05:59:59.999Z', '2027-04-01T06:00:00.000Z', 'Trimestral', '2027-01-01', '2027-04-01'],
    ['2027-07-01T05:59:59.999Z', '2027-07-01T06:00:00.000Z', 'Semestral', '2027-01-01', '2027-07-01'],
    ['2027-01-01T05:59:59.999Z', '2027-01-01T06:00:00.000Z', 'Anual', '2026-01-01', '2027-01-01'],
  ]) {
    assert.equal(periodoNatural(fechaMexico(new Date(antes)), frecuencia).inicio, inicioAntes);
    assert.equal(periodoNatural(fechaMexico(new Date(despues)), frecuencia).inicio, inicioDespues);
    assert.equal(minimoInicio(frecuencia, new Date(antes)), inicioDespues);
  }
});
test('los periodos contiguos no se solapan ni dejan días fuera, incluido el cambio de año', () => {
  for (const frecuencia of ['Mensual', 'Trimestral', 'Semestral', 'Anual']) {
    for (const fecha of ['2026-12-31', '2028-02-29', '2028-06-30', '2028-09-30']) {
      const actual = periodoNatural(fecha, frecuencia);
      const siguiente = siguientePeriodo(fecha, frecuencia);
      const diaPosterior = new Date(`${actual.fin}T00:00:00Z`);
      diaPosterior.setUTCDate(diaPosterior.getUTCDate() + 1);
      assert.equal(siguiente, diaPosterior.toISOString().slice(0, 10));
      assert.equal(inicioPeriodoValido(siguiente, frecuencia), true);
      assert.equal(periodoNatural(siguiente, frecuencia).inicio, siguiente);
    }
  }
});
test('fechas imposibles, timestamps, frecuencias desconocidas y años fuera del rango se rechazan', () => {
  for (const fecha of ['2026-02-29', '1900-02-29', '2100-02-29', '2026-04-31', '2026-00-01', '2026-13-01',
    '1899-12-31', '10000-01-01', '2026-1-01', '2026-01-01T00:00:00Z', '', null]) {
    assert.throws(() => periodoNatural(fecha, 'Mensual'), { codigo: 'PERIODO_INVALIDO' });
    assert.throws(() => siguientePeriodo(fecha, 'Mensual'), { codigo: 'PERIODO_INVALIDO' });
    assert.equal(inicioPeriodoValido(fecha, 'Mensual'), false);
  }
  for (const frecuencia of ['Bimestral', 'toString', '__proto__', '', null]) {
    assert.throws(() => periodoNatural('2026-01-01', frecuencia), { codigo: 'PERIODO_INVALIDO' });
    assert.equal(inicioPeriodoValido('2026-01-01', frecuencia), false);
  }
  for (const frecuencia of ['Mensual', 'Trimestral', 'Semestral', 'Anual']) {
    assert.deepEqual(periodoNatural('1900-01-01', frecuencia).inicio, '1900-01-01');
    assert.equal(periodoNatural('9999-12-31', frecuencia).fin, '9999-12-31');
    assert.throws(() => siguientePeriodo('9999-12-31', frecuencia), { codigo: 'PERIODO_FUERA_DE_RANGO' });
  }
});
