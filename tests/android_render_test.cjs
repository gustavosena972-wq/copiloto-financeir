const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const source=readFileSync(require('node:path').join(__dirname,'../android-app/app/src/main/assets/mobile.html'),'utf8');
const brl=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function render(name,next,S){
 const body=source.slice(source.indexOf('function '+name+'('),source.indexOf('function '+next+'('));
 return vm.runInNewContext(body+'; '+name+'()',{
 S:{ano:{ano:2026,poupanca_inicial:0},fam:{meta_reducao_cartao:10},...S},canEdit:()=>true,brl,quickEditButton:()=>'',viewStatus:()=>'',barraAno:()=>'',MN:['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
 });
}
test('monthly expense grouping renders real records without removed indicator references',()=>{
 const result=render('viewGrupos','viewAno',{lanc:[{tipo:'receita',valor:1000},{tipo:'despesa',valor:250,categoria_id:'cat',status:'pago'}],cats:[{id:'cat',grupo:'fixas'}],plan:{dividas:[]}});
 assert.match(result,/Total de despesas/);
 assert.match(result,/250,00/);
});
test('annual mobile view renders category target for each populated month',()=>{
 const result=render('viewAno','viewImport',{resumo:[{mes:11,receita:1000,total_despesas:250,fixas:250,cartoes:0,retiradas:0,outras:0,saldo:750,poupanca_acumulada:750,pct_cartoes:0,status:'aberto'}],meta:[{mes:11,real:0,meta:100}]});
 assert.match(result,/Novembro/);
 assert.match(result,/mobile-year-item/);
 assert.match(result,/100,00/);
});
const CFMoney=require('../android-app/app/src/main/assets/finance-core.js');
function monthlyFunction(name,next,state){
 const body=source.slice(source.indexOf('function '+name+'('),source.indexOf('function '+next+'('));
 return vm.runInNewContext(body+'; '+name+'()',{
  S:state, CFMoney, brl, esc:v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])), canEdit:()=>true,mesAberto:()=>true,
  monthlyFinancialSnapshot:()=>CFMoney.summarize(state.lanc,'2026-11-08')
 });
}
test('monthly briefing distinguishes recorded result, cash flow and outstanding bills',()=>{
 const html=monthlyFunction('mobileSmartContext','viewPlanilha',{lanc:[
  {tipo:'receita',status:'pago',valor:'1000.00'},
  {tipo:'despesa',status:'pago',valor:'100.10'},
  {tipo:'despesa',status:'pendente',valor:'200.20'}
 ]});
 for(const value of ['1000.00','300.30','699.70','899.90','200.20'])assert.ok(html.includes(brl(value)));
 assert.match(html,/Não representam o saldo da sua conta bancária/);
});
test('attention rules ignore invalid dates and count only unpaid valid bills',()=>{
 const rows=[{tipo:'despesa',status:'pendente',valor:'100.10',data_vencimento:'2026-11-07'},
 {tipo:'despesa',status:'pendente',valor:'200.20',data_vencimento:'2026-11-15'},
 {tipo:'despesa',status:'pago',valor:'400.00',data_vencimento:'2026-11-01'},
 {tipo:'despesa',status:'pendente',valor:'50.00',data_vencimento:'2026-02-30'}];
 const result=monthlyFunction('mobileTamanduaProactiveInsights','mobileTamanduaProactiveCard',{lanc:rows,resumo:[]});
 assert.match(result[0].text,/1 conta/);assert.ok(result[0].text.includes(brl(100.10)));
 assert.match(result[1].text,/1 conta/);assert.ok(result[1].text.includes(brl(200.20)));
});
test('empty monthly briefing requests real records without inventing a forecast',()=>{
 const html=monthlyFunction('mobileSmartContext','viewPlanilha',{lanc:[]});
 assert.match(html,/0 movimentações/);assert.match(html,/Vamos começar pelo primeiro lançamento/);
 assert.doesNotMatch(html,/safeToSpend|smartHealthScore/);
});
