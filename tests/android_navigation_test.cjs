const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../android-app/app/src/main/assets/mobile.html'),'utf8');
function navigation(view){const start=source.indexOf('function mobileNavigation(){'),end=source.indexOf('function mobileMoreMenu(){',start);return vm.runInNewContext(source.slice(start,end)+';mobileNavigation()',{S:{view,mobileMore:false}});}
test('phone navigation has five destinations with a dedicated ledger and chat',()=>{const html=navigation('planilha');assert.equal((html.match(/<button /g)||[]).length,5);for(const name of ['Início','Planilha','Tamanduá','Metas','Mais'])assert.match(html,new RegExp('>'+name+'<'));assert.match(html,/data-v="planilha"[^>]*aria-current="page"/);assert.doesNotMatch(html,/data-v="ano"/);});
test('the chat is a distinct active destination and does not activate the ledger',()=>{const html=navigation('tamandua');assert.match(html,/data-v="tamandua"[^>]*aria-current="page"/);assert.doesNotMatch(html,/data-v="planilha"[^>]*aria-current="page"/);});
test('home presents the month analysis without duplicating the ledger navigation',()=>{
 const start=source.indexOf("body=(S.view==='inicio'");
 const home=source.slice(start,source.indexOf(":S.view==='tamandua'",start));
 assert.match(home,/Análise do mês/);
 assert.doesNotMatch(home,/data-v="planilha"/);
});

const drawerSource=fs.readFileSync(path.join(__dirname,'../android-app/app/src/main/assets/navigation-drawer.js'),'utf8');
function appMenuHandler(document,button,drawer){const start=drawerSource.indexOf('button.onclick = () => {')+'button.onclick = '.length;const end=drawerSource.indexOf('\n      };',start)+8;return vm.runInNewContext('('+drawerSource.slice(start,end)+')',{document,button,drawer,reduced:{matches:true}});}
test('chat navigation resolves the current drawer after a workspace redraw',()=>{let first=0,second=0;let current={isConnected:true,showModal:()=>first++};const old=current;const button={setAttribute:()=>{}};const handler=appMenuHandler({getElementById:()=>current},button,old);handler();old.isConnected=false;current={isConnected:true,showModal:()=>second++};handler();assert.equal(first,1);assert.equal(second,1);});
test('a retained chat button cannot open navigation after logout',()=>{let calls=0;const handler=appMenuHandler({getElementById:()=>null},{setAttribute:()=>{calls++}},{isConnected:false});handler();assert.equal(calls,0);});

function nextStepContext(family='family-a'){
  const start=source.indexOf('function parcelasDaMeta(');
  const end=source.indexOf('function viewPlan(){',start);
  assert.ok(start>=0&&end>start,'Android should include the planning journey');
  return vm.runInNewContext(source.slice(start,end)+';({parcelasDaMeta,viewProximoPasso,compararAportes})',{
    S:{fam:{id:family}},
    document:{addEventListener(){}},
    dataLocalISO:()=>'2026-11-17',
    brl:v=>'BRL '+v,
    esc:text=>String(text).replace(/</g,'&lt;'),
  });
}

test('goal simulation uses the amount still needed and rounds the monthly amount up',()=>{
  const {parcelasDaMeta}=nextStepContext();
  assert.equal(parcelasDaMeta(1200,'2027-05-17',0,'2026-11-17').valor,200);
  assert.equal(parcelasDaMeta(100,'2027-02-17',0,'2026-11-17').valor,33.34);
  assert.equal(parcelasDaMeta(1200,'2027-05-17',300,'2026-11-17').valor,150);
  assert.equal(parcelasDaMeta(240,'2027-05-16',0,'2026-11-17').meses,5);
  assert.equal(parcelasDaMeta(50,'2026-11-30',0,'2026-11-17').meses,1);
  assert.equal(parcelasDaMeta(50,'2026-11-17',0,'2026-11-17'),null);
  assert.equal(parcelasDaMeta(50,'2027-02-30',0,'2026-11-17'),null);
  assert.equal(parcelasDaMeta(50,'2027-01-17',50,'2026-11-17'),null);
});

test('planning welcomes an empty family without claiming its debts are paid',()=>{
  const {viewProximoPasso}=nextStepContext();
  const empty={metas:[],dividas:[]};
  const own=viewProximoPasso(empty,true,{familyId:'family-a'});
  assert.match(own,/Dívida marcada como quitada/);
  assert.match(own,/Montar reserva/);
  const other=viewProximoPasso(empty,true,{familyId:'family-b'});
  assert.doesNotMatch(other,/quitada/);
  assert.match(other,/Planejar uma meta/);
  assert.doesNotMatch(viewProximoPasso(empty,false),/data-act="focometa"/);
});

test('planning shows the amount still needed for an active goal and escapes the name',()=>{
  const {viewProximoPasso}=nextStepContext();
  const html=viewProximoPasso({metas:[
    {nome:'Concluída',valor_alvo:100,valor_atual:100},
    {id:'goal-a',nome:'<curso>',valor_alvo:100,valor_atual:40,prazo:'2027-02-17'},
  ],dividas:[]},true);
  assert.match(html,/&lt;curso>/);
  assert.match(html,/Ainda falta<\/dt><dd>BRL 60/);
  assert.match(html,/Já guardado<\/dt><dd>BRL 40/);
  assert.match(html,/BRL 20 por mês/);
  assert.match(html,/data-id="goal-a"/);
});

test('the next step prioritizes the nearest current goal and acknowledges a missed deadline',()=>{
  const {viewProximoPasso}=nextStepContext();
  const goal=(nome,prazo)=>({id:nome,nome,prazo,valor_alvo:500,valor_atual:10});
  const html=viewProximoPasso({metas:[goal('Viagem','2027-06-01'),goal('Curso','2027-02-01')],dividas:[]},true);
  assert.match(html,/>Curso</);
  assert.doesNotMatch(html,/>Viagem</);
  const overdue=viewProximoPasso({metas:[goal('Curso','2026-11-15')],dividas:[]},false);
  assert.match(overdue,/O prazo passou/);
  assert.doesNotMatch(overdue,/por mês/);
});

test('projection compares the same end-of-month deposits with zero, positive and negative returns',()=>{
  const {compararAportes}=nextStepContext();
  const positive=compararAportes(1000,200,12,0.005);
  assert.equal(positive.semRendimento,3400);
  assert.equal(positive.comRendimento,3528.79);
  assert.equal(compararAportes(1000,200,12,0).comRendimento,3400);
  assert.ok(compararAportes(1000,200,12,-0.005).comRendimento<3400);
  assert.equal(compararAportes(1000,200,0,0.005),null);
  assert.equal(compararAportes(1000,200,12,0.04),null);
});
