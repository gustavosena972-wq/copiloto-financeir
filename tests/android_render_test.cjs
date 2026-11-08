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
