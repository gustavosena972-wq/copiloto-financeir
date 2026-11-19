/* Daily service receipts and a twelve-month run-rate scenario. */
(function(){
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let shortcut=new URLSearchParams(location.search).get('open')==='services';
  const busy=new Set();
  function openShortcut(){
    if(!shortcut||!S.fam||!S.mes||!S.espaco)return;
    shortcut=false;
    if(S.internalTester&&S.espaco.modo==='negocio'){S.view='negocio';S.businessArea='services';}
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
    if(!currentMonth())return start+'<h2>Atendimentos de hoje</h2><p>Selecione o mês atual para acompanhar seu dia.</p></section>';
    const d=todayTotals(),fmt=n=>brl(n/100);
    const buttons=canEdit()&&mesAberto()?(S.servicos||[]).filter(x=>Number(x.preco)>0).map(x=>
      '<button data-act="negocio-atender" data-id="'+esc(x.id)+'">'+esc(x.nome)+' · Recebi '+brl(x.preco)+'</button>').join(''):'';
    return start+'<h2>Atendimentos de hoje</h2><p>Toque quando concluir e receber. A venda entra na planilha com o preço do catálogo.</p><div class="cf-business-actions">'+buttons+'</div>'+
      '<dl class="cf-plan-values"><div><dt>Serviços recebidos</dt><dd>'+d.count+'</dd></div><div><dt>Faturamento</dt><dd>'+fmt(d.sales)+'</dd></div><div><dt>Custos diretos estimados</dt><dd>'+fmt(d.cost)+'</dd></div><div><dt>Após custos diretos</dt><dd>'+fmt(d.sales-d.cost)+'</dd></div></dl>'+
      '<p class="mu">Custos diretos incluem materiais, trabalho e taxas do catálogo na hora da venda. Para corrigir uma venda, abra Movimentações.</p>'+
      (d.count?'<h3>Se este dia se repetir</h3><p>Compare o ritmo de hoje com um cenário de 20% menos atendimentos. A projeção cobre um mês típico e os próximos 12 meses.</p><div class="cf-plan-fields"><label>Dias de atendimento por mês<input id="at-dias" type="number" min="1" max="31" step="1" value="20"></label><label>Custos fixos mensais (R$)<input id="at-fixos" type="number" min="0" step="0.01" placeholder="Inclua aluguel e demais fixos"></label></div><button data-act="negocio-projetar-atendimentos">Comparar cenários</button><div id="at-cenarios" role="status"></div>':'<p class="mu">O primeiro serviço recebido libera a projeção de faturamento, gastos e lucro.</p>')+'</section>';
  }
  function project(){
    const fixed=CFMoney.cents(document.getElementById('at-fixos').value),days=Number(document.getElementById('at-dias').value);
    const totals=todayTotals();
    if(fixed===null||!Number.isInteger(days)||days<1||days>31||!totals.count)throw Error('Informe os custos fixos e de 1 a 31 dias de atendimento.');
    const fmt=n=>brl(n/100);
    document.getElementById('at-cenarios').innerHTML=[100,80].map(rate=>{
      const p=CFBusiness.serviceForecast(totals,days,fixed,rate);
      return '<h3>'+(rate===100?'Ritmo de hoje':'20% menos atendimentos')+'</h3><table><thead><tr><th>Estimativa</th><th>Mês</th><th>12 meses</th></tr></thead><tbody>'+
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
      toast('Atendimento registrado na planilha.');
    } finally {busy.delete(key);button.disabled=false;}
  }
  window.CFServiceDesk={view,record,project,openShortcut};
})();
