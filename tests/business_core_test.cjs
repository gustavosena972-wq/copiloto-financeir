const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../android-app/app/src/main/assets/business-core.js');
const money=require('../android-app/app/src/main/assets/finance-core.js');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('a service price covers materials, working time, overhead, fees and desired margin',()=>{
 const p=core.price(10,60,20,5,5,20);
 assert.equal(p.total,46.67);
 assert.equal(p.labor,20);
 assert.equal(p.base,35);
 assert.equal(p.margin,9.33);
 assert.ok(p.total*0.75>=35);
 for(const args of [[10,60,20,5,10,90],[-1,0,0,0,0,0],[NaN,0,0,0,0,0]])
   assert.equal(core.price(...args),null);
});
test('pending revenue is separated from received cash and transfers do not inflate sales',()=>{
 const s=core.summary([
  {id:'paid',tipo:'receita',status:'pago',valor:50},
  {id:'late',tipo:'receita',status:'pendente',valor:30,data_vencimento:'2026-11-01'},
  {id:'future',tipo:'receita',status:'pendente',valor:40,data_vencimento:'2026-12-01'},
  {tipo:'transferencia',status:'pago',valor:1000},
  {tipo:'despesa',status:'pago',valor:10},
 ],'2026-11-17',money);
 assert.equal(s.received,5000);
 assert.equal(s.receivable,7000);
 assert.equal(s.cash,4000);
 assert.equal(s.salesCount,3);
 assert.equal(s.pendingIncome[0].id,'late');
 assert.equal(s.rows.length,4);
});

function ui(state){
 const window={};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../android-app/app/src/main/assets/business-workspace.js'),'utf8'),{
   window,S:{lanc:[],...state},CFBusiness:core,CFMoney:money,
   canEdit:()=>state.me?.papel!=='leitor',mesAberto:()=>true,
   localFinancialDate:()=>'2026-11-17',brl:x=>Number(x).toFixed(2),
 });
 return window.CFBusinessUI;
}
test('business controls follow the selected mode and reader permission',()=>{
 const base={espaco:{modo:'negocio',segmento:'Salão'},internalTester:true,me:{papel:'dono'},
   lanc:[{id:'income',descricao:'<cliente>',tipo:'receita',status:'pendente',valor:50,data_vencimento:'2026-11-01'}]};
 const editable=ui(base).view();
 assert.match(editable,/50.00/);
 assert.match(editable,/&lt;cliente&gt;/);
 assert.match(editable,/data-act="negocio-recebido"/);
 assert.match(editable,/data-act="mobileadd" data-tipo="receita" data-origem="negocio"/);
 assert.doesNotMatch(ui({...base,me:{papel:'leitor'}}).view(),/data-act="negocio-recebido"/);
 assert.doesNotMatch(ui({...base,internalTester:false}).view(),/id="negocio-saldo"/);
 assert.doesNotMatch(ui({...base,espaco:{modo:'pessoal'}}).view(),/id="negocio-saldo"/);
});
test('space configuration is shown only to the owner',()=>{
 assert.equal(ui({me:{papel:'leitor'}}).settings(),'');
 const owner=ui({me:{papel:'dono'},internalTester:true,espaco:{modo:'pessoal'}});
 assert.match(owner.settings(),/value="pessoal" checked/);
 assert.match(owner.settings(),/data-act="salvar-espaco"/);
});
