/* Daily service receipts and a twelve-month run-rate scenario. */
(function(){
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let shortcut=new URLSearchParams(location.search).get('open');
  const busy=new Set();
  function openShortcut(){
    if(!shortcut||!S.fam||!S.mes||!S.espaco)return;
    const destination=shortcut; shortcut=false;
    if(!['services','expense'].includes(destination))return;
    if(destination==='expense'&&S.internalTester&&S.espaco.modo==='negocio'&&canEdit()&&mesAberto()&&currentMonth()){S.view='planilha';S.mobileMore=false;S.mobileAddOpen=true;S.mobileAddType='despesa';queueMicrotask(()=>{const status=document.getElementById('n_status');if(status)status.value='pago';});return;}
    if(S.internalTester&&S.espaco.modo==='negocio'){S.view='negocio';S.businessArea='services';}
  }
  function monthly(){
    const groups=new Map();
    for(const row of S.lanc||[]){
      if(!row.servico_catalogo_id||row.tipo!=='receita')continue;
      const sale=CFMoney.cents(row.valor),cost=CFMoney.cents(row.servico_custo_direto);
      if(sale===null||cost===null)continue;
      const line=groups.get(row.servico_catalogo_id)||{name:row.descricao,count:0,sales:0,cost:0};
      line.count++;line.sales+=sale;line.cost+=cost;groups.set(row.servico_catalogo_id,line);
    }
    if(!groups.size)return '';
    const rows=[...groups.values()].sort((a,b)=>b.sales-a.sales);
    return '<h3>Vendas do catálogo no mês</h3><ul class="cf-business-list">'+rows.map(r=>
      '<li><div><strong>'+esc(r.name)+'</strong><small>'+r.count+' venda(s) · Faturamento '+brl(r.sales/100)+'</small><small>Custo direto estimado '+brl(r.cost/100)+' · Margem antes dos fixos '+brl((r.sales-r.cost)/100)+'</small></div></li>').join('')+'</ul>';
  }
  function todayTotals(){
    const today=localFinancialDate();
    let sales=0,cost=0,count=0;
    for(const row of S.lanc||[]){
      if(!row.servico_catalogo_id||row.tipo!=='receita'||row.status!=='pago'||row.data_pagamento!==today)continue;
      const price=CFMoney.cents(row.valor),direct=CFMoney.cents(row.servico_custo_direto);
      if(price===null||direct===null)continue;
      sales+=price;cost+=direct;count++;
    }
    return {sales,cost,count};
  }
  const currentMonth=()=>localFinancialDate().slice(0,7)===String(S.ano?.ano)+'-'+String(S.mes?.mes).padStart(2,'0');
  function view(){
    const start=window.CFBusinessReports.section('services');
    if(!currentMonth())return start+'<h2>Vendas de hoje</h2><p>Selecione o mês atual para acompanhar seu dia.</p>'+monthly()+'</section>';
    const d=todayTotals(),fmt=n=>brl(n/100);
    const buttons=canEdit()&&mesAberto()?(S.servicos||[]).filter(x=>Number(x.preco)>0).map(x=>
      '<button data-act="negocio-atender" data-id="'+esc(x.id)+'">'+esc(x.nome)+' · Recebi '+brl(x.preco)+'</button>').join(''):'';
    const bar=window.CopilotoAlerts&&canEdit()?'<details><summary>Barra de registro rápido no Android</summary><p>Mostra Recebi e Gastei sem exibir os valores. Cada ação abre o registro na sua conta.</p><div class="cf-business-actions"><button data-act="negocio-barra" data-enabled="true">Mostrar barra</button><button class="sec" data-act="negocio-barra" data-enabled="false">Ocultar barra</button></div></details>':'';
    return start+bar+'<h2>Vendas de hoje</h2><p>Toque no produto ou serviço que vendeu e recebeu. A venda entra na planilha com o preço do catálogo.</p><div class="cf-business-actions">'+buttons+'</div>'+
      '<dl class="cf-plan-values"><div><dt>Vendas recebidas</dt><dd>'+d.count+'</dd></div><div><dt>Faturamento</dt><dd>'+fmt(d.sales)+'</dd></div><div><dt>Custos diretos estimados</dt><dd>'+fmt(d.cost)+'</dd></div><div><dt>Após custos diretos</dt><dd>'+fmt(d.sales-d.cost)+'</dd></div></dl>'+
      '<p class="mu">Custos diretos incluem materiais, trabalho e taxas do catálogo na hora da venda. Para corrigir uma venda, abra Movimentações.</p>'+
      (d.count?'<h3>Se este dia se repetir</h3><p>Compare o ritmo de hoje com um cenário de 20% menos vendas. A projeção cobre um mês típico e os próximos 12 meses.</p><div class="cf-plan-fields"><label>Dias de atendimento por mês<input id="at-dias" type="number" min="1" max="31" step="1" value="20"></label><label>Custos fixos mensais (R$)<input id="at-fixos" type="number" min="0" step="0.01" placeholder="Inclua aluguel e demais fixos"></label></div><button data-act="negocio-projetar-atendimentos">Comparar cenários</button><div id="at-cenarios" role="status"></div>':'<p class="mu">A primeira venda recebida libera a projeção de faturamento, gastos e lucro.</p>')+monthly()+'</section>';
  }
  function project(){
    const fixed=CFMoney.cents(document.getElementById('at-fixos').value),days=Number(document.getElementById('at-dias').value);
    const totals=todayTotals();
    if(fixed===null||!Number.isInteger(days)||days<1||days>31||!totals.count)throw Error('Informe os custos fixos e de 1 a 31 dias de atendimento.');
    const fmt=n=>brl(n/100);
    document.getElementById('at-cenarios').innerHTML=[100,80].map(rate=>{
      const p=CFBusiness.serviceForecast(totals,days,fixed,rate);
      return '<h3>'+(rate===100?'Ritmo de hoje':'20% menos vendas')+'</h3><table><thead><tr><th>Estimativa</th><th>Mês</th><th>12 meses</th></tr></thead><tbody>'+
        [['Faturamento',p.sales],['Gastos',p.cost],['Lucro estimado',p.profit]].map(([label,v])=>'<tr><th>'+label+'</th><td>'+fmt(v)+'</td><td>'+fmt(v*12)+'</td></tr>').join('')+'</tbody></table>';
    }).join('')+'<p class="mu">Base de um único dia, possivelmente ainda em andamento. A estimativa mantém preços e composição dos serviços. Inclua todos os fixos uma só vez.</p>';
  }
  async function record(button){
    if(!S.internalTester||S.espaco?.modo!=='negocio'||!canEdit()||!mesAberto()||!currentMonth())throw Error('Abra o mês atual com permissão de edição.');
    const service=(S.servicos||[]).find(x=>x.id===button.dataset.id);
    if(!service)throw Error('Atualize o catálogo de serviços.');
    const day=localFinancialDate(),family=S.fam.id,user=S.user.id,month=S.mes.id;
    const key=['cf-service',user,family,month,day,service.id].join(':');
    if(busy.has(key))return;
    busy.add(key);button.disabled=true;
    try{
      const event=localStorage.getItem(key)||crypto.randomUUID();
      localStorage.setItem(key,event);
      await q(sb.rpc('registrar_atendimento',{p_familia:family,p_mes:month,p_servico:service.id,p_dia:day,p_evento:event}));
      if(S.user?.id!==user||S.fam?.id!==family||S.mes?.id!==month)return;
      await loadMes();
      localStorage.removeItem(key);
      toast('Venda registrada na planilha.');
    } finally {busy.delete(key);button.disabled=false;}
  }
  window.CFServiceDesk={view,record,project,openShortcut};
})();
