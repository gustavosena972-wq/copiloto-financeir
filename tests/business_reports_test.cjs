const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assets=path.join(__dirname,'../android-app/app/src/main/assets');
const core=require(path.join(assets,'business-core.js')),money=require(path.join(assets,'finance-core.js'));
function setup(overrides={},extra={}){
 const S={espaco:{modo:'negocio'},internalTester:true,fam:{id:'own-family'},mes:{id:'own-month'},me:{papel:'dono'},
  cats:[{id:'c',nome:'Custos <loja>'}],lanc:[{id:'l1',categoria_id:'c',descricao:'Aluguel <loja>',tipo:'despesa',valor:300,status:'pendente',data_vencimento:'2026-11-01'}],...overrides};
 let renders=0;const window={};
 const context={S,window,CFBusiness:core,CFMoney:money,brl:n=>Number(n).toFixed(2),localFinancialDate:()=>'2026-11-18',
  canEdit:()=>S.me.papel!=='leitor',mesAberto:()=>true,render:()=>renders++,toast:()=>{},...extra};
 vm.createContext(context);
 for(const file of ['business-reports.js','business-workspace.js'])vm.runInContext(fs.readFileSync(path.join(assets,file),'utf8'),context);
 return {S,window,renders:()=>renders};
}
test('business sections are independent, escape financial descriptions and name the category from the authorized workspace',()=>{
 const {window}=setup({businessArea:'ledger'}),html=window.CFBusinessUI.view();
 assert.match(html,/data-business-section="ledger" >/);
 assert.match(html,/data-business-section="planning" hidden/);
 assert.match(html,/Custos &lt;loja&gt;/);assert.match(html,/Aluguel &lt;loja&gt;/);
 assert.doesNotMatch(html,/<loja>/);assert.match(html,/data-act="negocio-relatorio-abrir" data-id="l1"/);
 assert.match(html,/data-v="plan"/);assert.doesNotMatch(html,/data-v="metas"/);
});
test('switching business areas preserves the existing forms instead of recreating the page',async()=>{
 const sections=[{dataset:{businessSection:'overview'}},{dataset:{businessSection:'planning'}}];
 const buttons=['overview','planning'].map(area=>({dataset:{area},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]}}));
 const {S,window,renders}=setup({}, {document:{querySelectorAll:s=>s==='[data-business-section]'?sections:buttons}});
 await window.CFBusinessUI.handle('negocio-relatorio-area',{dataset:{area:'planning'}});
 assert.equal(S.businessArea,'planning');assert.equal(sections[0].hidden,true);assert.equal(sections[1].hidden,false);
 assert.equal(buttons[1]['aria-current'],'page');assert.equal(renders(),0);
});
test('readers get analysis without controls that record a receipt or payment',()=>{
 const html=setup({me:{papel:'leitor'}}).window.CFBusinessUI.view();
 assert.match(html,/Plano de rendimento do negócio/);assert.doesNotMatch(html,/data-act="negocio-quitar"/);
 for(const change of [{internalTester:false},{espaco:{modo:'pessoal'}}])assert.doesNotMatch(setup(change).window.CFBusinessUI.view(),/negocio-relatorio-simular/);
});
test('payment confirmation only updates the current workspace, month and expense',async()=>{
 const filters=[],writes=[];let refreshed=0;
 const query={eq(k,v){filters.push([k,v]);return this},neq(k,v){filters.push([k,v]);return this},select(){return this},maybeSingle(){return Promise.resolve({data:{id:'l1'}})}};
 const sb={from(table){assert.equal(table,'lancamentos');return {update(values){writes.push(values);return query}}}};
 const base={sb,q:async p=>(await p).data,confirm:()=>true,dataLocalISO:()=>'2026-11-18',loadMes:async()=>refreshed++};
 const {window}=setup({},base);
 await window.CFBusinessUI.handle('negocio-quitar',{dataset:{id:'l1'}});
 assert.deepEqual(filters,[['id','l1'],['familia_id','own-family'],['mes_id','own-month'],['tipo','despesa'],['status','pago']]);
 assert.equal(writes.length,1);assert.equal(writes[0].status,'pago');assert.equal(refreshed,1);
 const denied=setup({me:{papel:'leitor'}},base);
 await denied.window.CFBusinessUI.handle('negocio-quitar',{dataset:{id:'l1'}});assert.equal(writes.length,1);
 const cancelled=setup({}, {...base,confirm:()=>false});
 await cancelled.window.CFBusinessUI.handle('negocio-quitar',{dataset:{id:'l1'}});assert.equal(writes.length,1);
});
test('opening a missing ledger id cannot navigate to a different record',async()=>{
 const {window,S}=setup();
 await assert.rejects(window.CFBusinessUI.handle('negocio-relatorio-abrir',{dataset:{id:'outside'}}),/Atualize o mês/);
 assert.equal(S.view,undefined);
});

test('business reports load beyond the first database page and scope every page to the current family and month',async()=>{
 const ranges=[],scopes=[];
 const records=Array.from({length:1201},(_,i)=>({id:String(i)}));
 const sb={from(table){assert.equal(table,'lancamentos');return {select(){return this},eq(k,v){scopes.push([k,v]);return this},order(){return this},range(a,b){ranges.push([a,b]);return Promise.resolve({data:records.slice(a,b+1)})}}}};
 const {window}=setup({}, {sb,q:async p=>(await p).data});
 const result=await window.CFBusinessUI.loadRows();
 assert.equal(result.length,1201);assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499]]);
 assert.deepEqual(scopes,[['familia_id','own-family'],['mes_id','own-month'],['familia_id','own-family'],['mes_id','own-month'],['familia_id','own-family'],['mes_id','own-month']]);
});
