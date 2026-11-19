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
 assert.equal(core.price(0.1,0,0,0.2,0,0).total,0.3);
 assert.equal(core.price(10,30,20,5,5,20).total,33.34);
 for(const args of [[10,60,20,5,10,90],[-1,0,0,0,0,0],[NaN,0,0,0,0,0]])
   assert.equal(core.price(...args),null);
});

test('preparing a service opens a pending draft without inserting a ledger entry',async()=>{
 const state={espaco:{modo:'negocio'},internalTester:true,servicos:[{id:'s1',nome:'Corte',preco:'46.67'}]};
 const fields=Object.fromEntries(['n_desc','n_valor','n_tipo','n_status'].map(id=>[id,{value:'',focus(){}}]));
 let renders=0;
 const window={};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../android-app/app/src/main/assets/business-workspace.js'),'utf8'),{
   window,S:state,CFBusiness:core,canEdit:()=>true,mesAberto:()=>true,
   document:{getElementById:id=>fields[id]},render:()=>renders++,toast:()=>{},
   sb:{from(){throw Error('A draft must not write to the database')}},
 });
 await window.CFBusinessUI.handle('negocio-usar-servico',{dataset:{id:'s1'}});
 assert.equal(state.view,'planilha');assert.equal(state.mobileAddOpen,true);assert.equal(renders,1);
 assert.equal(fields.n_desc.value,'Corte');assert.equal(fields.n_valor.value,'46.67');
 assert.equal(fields.n_tipo.value,'receita');assert.equal(fields.n_status.value,'pendente');
 state.servicos[0].preco=0;
 await assert.rejects(window.CFBusinessUI.handle('negocio-usar-servico',{dataset:{id:'s1'}}),/sem preço/);
});

test('catalog safely escapes names and hides edit and prepare actions from readers',()=>{
 const state={espaco:{modo:'negocio'},internalTester:true,me:{papel:'leitor'},servicos:[{id:'s',nome:'<img src=x>',preco:30,minutos:60}]};
 const html=ui(state).view();
 assert.match(html,/&lt;img src=x&gt;/);
 for(const action of ['usar','editar','arquivar','salvar'])assert.doesNotMatch(html,new RegExp('data-act="negocio-'+action+'-servico"'));
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

test('business review separates aging, missing information and possible duplicates without editing records',()=>{
 const rows=[
  {id:'a',descricao:'Corte',categoria:'Serviços',tipo:'receita',valor:100,status:'pendente',data_vencimento:'2026-11-10'},
  {id:'b',descricao:'Corte',categoria:'Serviços',tipo:'receita',valor:100,status:'pendente',data_vencimento:'2026-11-10'},
  {id:'c',descricao:'Aluguel',tipo:'despesa',valor:50,status:'pendente'},
  {id:'d',tipo:'receita',valor:30,status:'pago'},
  {id:'e',tipo:'receita',valor:20,status:'pendente',data_vencimento:'2026-10-01'},
 ];
 const before=JSON.stringify(rows),r=core.review(rows,'2026-11-18',money);
 assert.equal(r.receivableAging.find(x=>x.key==='8-30').cents,20000);
 assert.equal(r.receivableAging.find(x=>x.key==='31+').cents,2000);
 assert.equal(r.payableAging.find(x=>x.key==='undated').cents,5000);
 assert.equal(r.missingDue.length,1);assert.equal(r.duplicates.length,2);
 assert.equal(r.missingCategory.length,3);assert.equal(JSON.stringify(rows),before);
});

test('business ledger combines filters, paginates and keeps totals for the complete filtered set',()=>{
 const rows=Array.from({length:60},(_,i)=>({id:String(i),descricao:'Serviço '+i,tipo:'receita',valor:10,status:'pendente',data_vencimento:'2026-11-01',categoria_id:'c'}));
 rows.push({id:'paid',descricao:'Serviço pago',tipo:'receita',valor:100,status:'pago'});
 const s=core.summary(rows,'2026-11-18',money);
 const r=core.ledger(s,{query:'serviço',status:'overdue',tipo:'receita',categoria:'c',page:2});
 assert.equal(r.count,60);assert.equal(r.rows.length,25);assert.equal(r.page,2);assert.equal(r.income,60000);
 assert.equal(core.ledger(s,{query:'inexistente'}).rows.length,0);
 assert.equal(core.ledger(s,{page:999}).page,3);
});

test('business planning calculates contribution, break-even and daily targets with integer cents',()=>{
 const p=core.plan({fixed:'3000',sales:'10000',variable:'30',tax:'10',target:'2000',days:'20'},money);
 assert.equal(p.contributionRate,60);assert.equal(p.breakEven,500000);
 assert.equal(p.targetRevenue,833334);assert.equal(p.dailyTarget,41667);
 assert.equal(p.estimatedResult,300000);assert.equal(p.gap,0);
 assert.equal(core.plan({fixed:'3000',sales:'4000',variable:'30',tax:'10',target:'2000',days:'20'},money).gap,433334);
 assert.equal(core.plan({fixed:'3000',sales:'4000',variable:'90',tax:'10',target:'0',days:'20'},money),null);
 assert.equal(core.plan({fixed:'1.001',sales:'0',variable:'0',tax:'0',target:'0',days:'0'},money),null);
});
