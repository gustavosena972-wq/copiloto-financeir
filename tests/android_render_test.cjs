const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const source=readFileSync(require('node:path').join(__dirname,'../android-app/app/src/main/assets/mobile.html'),'utf8');
const brl=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
test('family area actions never expose an undefined label',()=>{const start=source.indexOf('function familyAreaHeader('),end=source.indexOf('function viewFamilia()',start);const header=vm.runInNewContext(source.slice(start,end)+';familyAreaHeader',{S:{familyAreas:{}}});const result=header('categorias','Categorias e grupos','Organize suas categorias');assert.doesNotMatch(result,/undefined/);assert.match(result,/Gerenciar área/);assert.match(result,/data-act="editcategories"/);});
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
function monthlyFunction(name,next,state,editable=true,monthOpen=true){
 const body=source.slice(source.indexOf('function '+name+'('),source.indexOf('function '+next+'('));
 return vm.runInNewContext(body+'; '+name+'()',{
  S:state, CFMoney, brl, esc:v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])), canEdit:()=>editable,mesAberto:()=>monthOpen,
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
test('home offers only the missing entry types and respects read-only and closed months',()=>{
 const summary=(lanc,editable=true,open=true)=>monthlyFunction('mobileSmartContext','viewPlanilha',{lanc},editable,open);
 assert.match(summary([]),/data-tipo="receita" data-origem="inicio"/);
 assert.match(summary([]),/data-tipo="despesa" data-origem="inicio"/);
 const expense={tipo:'despesa',status:'pendente',valor:'30.00'};
 assert.match(summary([expense]),/Falta registrar o que entra/);
 assert.doesNotMatch(summary([expense]),/data-tipo="despesa"/);
 assert.doesNotMatch(summary([expense,{tipo:'receita',status:'pago',valor:'70.00'}]),/data-origem="inicio"/);
 assert.doesNotMatch(summary([],false),/data-origem="inicio"/);
 assert.doesNotMatch(summary([],true,false),/data-origem="inicio"/);
 assert.match(summary([],false),/Nenhum lançamento disponível neste mês/);
 assert.doesNotMatch(summary([],true,false),/Escolha o que você tem em mãos/);
});

test('the first-entry shortcut opens the correct form and cannot open a locked month',()=>{
 const start=source.indexOf("  else if(a==='mobileadd')")+7;
 const end=source.indexOf("  else if(a==='planilha-ajuda')",start);
 const action=source.slice(start,end);
 const run=(tipo,allowed,open,origem='inicio')=>{
   const S={view:origem==='inicio'?'inicio':'planilha',mobileAddOpen:origem!=='inicio',mobileMore:true};
   const messages=[];
   const renders=[];
   const focus=[];
   vm.runInNewContext('(function(){'+action+'})()',{
     S,a:'mobileadd',b:{dataset:{tipo,origem}},canEdit:()=>allowed,mesAberto:()=>open,
     toast:message=>messages.push(message),render:()=>renders.push(S.view),atualizarParcelamento:()=>{},
     $:selector=>({focus:()=>focus.push(selector)}),
   });
   return {S,messages,renders,focus};
 };
 for(const tipo of ['receita','despesa']){
   const {S,renders,focus}=run(tipo,true,true);
   assert.deepEqual(S,{view:'planilha',mobileAddOpen:true,mobileMore:false,mobileAddType:tipo});
   assert.deepEqual(renders,['planilha']);
   assert.deepEqual(focus,['#n_desc']);
 }
 assert.equal(run('despesa',true,true,'planilha').S.mobileAddOpen,false);
 for(const [allowed,open] of [[false,true],[true,false]]){
   const {S,messages,renders}=run('receita',allowed,open);
   assert.equal(S.view,'inicio');
   assert.equal(S.mobileAddOpen,false);
   assert.equal(messages.length,1);
   assert.deepEqual(renders,[]);
 }
});

test('the ledger saves the first bill in the selected family and the summary includes it exactly once',async()=>{
 const begin=source.indexOf("  else if(a==='add'){")+7;
 const end=source.indexOf("  else if(a==='del'){",begin);
 const fields={n_valor:'150.50',n_desc:'Energia',n_tipo:'despesa',n_data:'2026-11-17',n_status:'pendente',n_cat:'',n_mem:'member'};
 const lanc=[];
 const S={fam:{id:'family'},user:{id:'user'},ano:{ano:2026},mobileAddOpen:true};
 const event=vm.runInNewContext('(async function(){'+source.slice(begin,end)+'})()',{
   a:'add',S,canEdit:()=>true,mesAberto:()=>true,$:id=>id.slice(1) in fields?{value:fields[id.slice(1)]}:null,
   toast:()=>{},q:async result=>result,
   loadAno:async month=>assert.equal(month,11),
   sb:{
     rpc(name,args){
       assert.equal(name,'garantir_mes');
       assert.equal(args.p_fam,'family');
       assert.equal(args.p_mes,11);
       return 'month';
     },
     from(name){
       if(name==='lancamentos')return {insert(row){lanc.push(row)}};
       assert.equal(name,'anos');
       return {select(){return this},eq(){return this},order(){return [S.ano]}};
     },
   },
 });
 await event;
 assert.equal(S.mobileAddOpen,false);
 assert.equal(lanc.length,1);
 assert.equal(lanc[0].mes_id,'month');
 assert.equal(lanc[0].familia_id,'family');
 const html=monthlyFunction('mobileSmartContext','viewPlanilha',{lanc});
 assert.match(html,/1 movimentação</);
 assert.ok(html.includes(brl(150.50)));
 assert.match(html,/data-tipo="receita" data-origem="inicio"/);
});

test('an import preview separates the scrollable table from the confirmation controls',()=>{
 const periods=Array.from({length:24},(_,i)=>({mes:i%12+1,ano:2025+Math.floor(i/12),receita:0,itens:[]}));
 const declaration=source.slice(source.indexOf('function viewImport()'),source.indexOf('async function importar()'));
 const html=vm.runInNewContext(declaration+'; viewImport()',{S:{imp:periods},brl,MN:Array(12).fill('Mês')});
 assert.match(html,/<dialog[^>]+aria-labelledby="cf-import-title"/);
 assert.equal((html.match(/<tr>/g)||[]).length,25);
 assert.match(html,/<\/table>\s*<\/div>\s*<footer>[\s\S]*id="imp_modo"[\s\S]*data-act="impok"[^>]*>Importar planilha/);
});

function renderLedger(state, editable=true){
 const body=source.slice(source.indexOf('function viewPlanilha('),source.indexOf('function viewGrupos('));
 return vm.runInNewContext(body+';viewPlanilha(ed)',{
  S:{ano:{ano:2026,status:'aberto'},mes:{mes:8,status:'aberto'},me:{id:'p'},lanc:[],cats:[],membros:[],...state},
  ed:editable,brl,esc:String,canEdit:()=>editable,viewStatus:()=>'',quickEditButton:()=>'',
  MN:Array(12).fill('Mês'),window:{innerWidth:390},dataLocalISO:()=>'2026-11-15',
  tpOpts:type=>'<option selected>'+type+'</option>',catOpts:type=>'<option>'+type+'</option>',stOpts:()=>'',memOpts:()=>''
 });
}
test('an empty sheet offers a first entry and prefills a date in the selected month',()=>{
 const html=renderLedger({mobileAddType:'receita'});
 assert.match(html,/Monte sua planilha/);
 assert.match(html,/data-act="mobileadd" data-tipo="receita"/);
 assert.match(html,/id="n_data" value="2026-08-01"/);
 assert.match(html,/id="n_cat" data-tipo="receita"/);
 assert.equal((html.match(/data-act="imp"/g)||[]).length,1);
});
test('a populated sheet offers category review only while editing is allowed',()=>{
 const lanc=[{id:'expense',tipo:'despesa',valor:10,descricao:'Mercado',status:'pendente'}];
 const html=renderLedger({lanc});
 assert.match(html,/Melhore sua planilha/);
 assert.match(html,/data-act="smartgo" data-v="inicio">Ver o resumo do mês/);
 assert.match(html,/data-act="planilha-categorias"/);
 assert.doesNotMatch(html,/data-tipo="receita">Registrar uma entrada/);
 assert.doesNotMatch(renderLedger({lanc},false),/data-act="planilha-categorias"/);
 assert.doesNotMatch(renderLedger({lanc,mes:{mes:8,status:'fechado'}}),/data-act="planilha-categorias"/);
});
