const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const CFMoney=require('../android-app/app/src/main/assets/finance-core.js');
test('chat uses the same exact totals, dates and category names as the ledger',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../android-app/app/src/main/assets/tamandua-enhancements.js'),'utf8');
 const part=source.slice(source.indexOf('const app='),source.indexOf('function css()'));
 const state={cats:[{id:'home',nome:'Casa'}],lanc:[{tipo:'receita',status:'pago',valor:'1000.00'},{tipo:'despesa',status:'pago',valor:'100.10',categoria_id:'home',data_vencimento:'2026-11-02'},{tipo:'despesa',status:'pendente',valor:'200.20',categoria_id:'home',data_vencimento:'2026-11-15'}]};
 const d=vm.runInNewContext(part+';data()',{window:{CFMoney},currentState:()=>state,Map,Date});
 assert.equal(d.receitas,1000);assert.equal(d.despesas,300.3);assert.equal(d.saldo,699.7);assert.equal(d.cash,899.9);assert.equal(d.pendentes,200.2);assert.equal(d.rows[2].data,'2026-11-15');assert.equal(d.categorias[0][0],'Casa');
});
