const {test} = require('node:test');
const assert = require('node:assert/strict');
const money = require('../android-app/app/src/main/assets/finance-core.js');
const date = '2026-11-08';
const row = (tipo, valor, status='pago', extra={}) => ({tipo,valor,status,...extra});
test('decimal amounts are exact in cents and malformed amounts are rejected', () => {
  assert.equal(money.cents('0.10') + money.cents('0.20'), 30);
  for (const v of ['1,00', '', null, Infinity, '1e3', '-1', '1.005']) assert.equal(money.cents(v), null);
});
test('pending expenses are subtracted once and pending income is not cash', () => {
  const s = money.summarize([row('receita','1000'),row('receita','500','pendente'),row('despesa','200'),row('despesa','300','pendente')],date);
  assert.equal(s.cash,80000);
  assert.equal(s.afterPayables,50000);
  assert.equal(s.projected,100000);
  assert.equal(s.competence,100000);
});
test('transfers do not inflate income or expense', () => {
  const s = money.summarize([row('transferencia',2000),row('receita',100)],date);
  assert.equal(s.income,10000); assert.equal(s.expense,0);
});
test('invalid dates are excluded from forecasts and not guessed', () => {
  assert.equal(money.day('2026-02-30'),null);
  const s = money.summarize([row('despesa',100,'pendente',{data_vencimento:'2026-02-30'})],date);
  assert.equal(s.payable,10000); assert.equal(s.due.length,0);
});
test('overdue is based on the supplied local reference date', () => {
  const s=money.summarize([row('despesa',10,'pendente',{data_vencimento:'2026-11-07'}),row('despesa',20,'pendente',{data_vencimento:date})],date);
  assert.equal(s.overdue.length,1);
});
test('cash forecast identifies a deficit before a later receipt', () => {
  const s=money.summarize([row('despesa',100,'pendente',{id:'bill',data_vencimento:'2026-11-10'}),row('receita',200,'pendente',{id:'pay',data_vencimento:'2026-11-15'})],date);
  const f=money.forecast(s,5000);
  assert.equal(f.firstNegative,'2026-11-10'); assert.equal(f.balance,15000); assert.equal(f.points[0].sourceId,'bill');
});
test('unknown opening balance must not be represented as a bank balance', () => {
  assert.throws(()=>money.forecast(money.summarize([],date),null));
});
test('goal contributions round up without promising returns', () => {
  assert.equal(money.goalContribution('100','0',3),3334);
  assert.equal(money.goalContribution('100','110',3),0);
});
test('savings scenario is linear, bounded and never mutates source data', () => {
  assert.equal(money.simulateReduction('300',6).at(-1).cents,180000);
  assert.throws(()=>money.simulateReduction('300',0));
});
test('invalid rows are disclosed rather than silently becoming zero', () => {
  const s=money.summarize([row('despesa','x'),row('despesa',100,'unknown')],date);
  assert.equal(s.ignored,2); assert.equal(s.rows.length,0);
});

