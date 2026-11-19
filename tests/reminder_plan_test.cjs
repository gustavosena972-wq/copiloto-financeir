const {test}=require('node:test');const assert=require('node:assert/strict');const plan=require('../android-app/app/src/main/assets/reminder-plan.js');
test('only real unpaid expense dates produce bounded reminders',()=>{
 const rows=[{tipo:'despesa',status:'pendente',data_vencimento:'2026-11-11',descricao:'private',valor:'230.00'},{tipo:'despesa',status:'pago',data_vencimento:'2026-11-12'},{tipo:'receita',status:'pendente',data_vencimento:'2026-11-13'},{tipo:'despesa',status:'pendente',data_vencimento:'2026-02-30'}];
 assert.deepEqual(plan.planDays(rows,'2026-11-09'),['2026-11-11']);
 assert.equal(JSON.stringify(plan.planDays(rows,'2026-11-09')).includes('private'),false);
});
test('overdue reminders expire after seven days and do not multiply per bill',()=>{
 const result=plan.planDays([{tipo:'despesa',status:'pendente',data_vencimento:'2026-11-01'},{tipo:'despesa',status:'atrasado',data_vencimento:'2026-11-02'}],'2026-11-09');
 assert.equal(result.length,7);assert.equal(result[0],'2026-11-10');assert.equal(result[6],'2026-11-16');assert.equal(new Set(result).size,7);
});
test('invalid references and no bills cannot invent notifications',()=>{
 assert.deepEqual(plan.planDays([],'2026-11-09'),[]);assert.deepEqual(plan.planDays([{tipo:'despesa',data_vencimento:'2026-11-11'}],'bad'),[]);
});
