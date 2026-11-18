/* Business views operate only on the currently authorized workspace/month. */
(function(){
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cash=cents=>brl(cents/100);
  const areas={overview:'Caixa',ledger:'Movimentações',receivables:'Vencimentos',results:'Resultados',planning:'Planejamento',services:'Serviços'};
  const area=()=>Object.hasOwn(areas,S.businessArea)?S.businessArea:'overview';
  const section=key=>'<section class="card" data-business-section="'+key+'" '+(key===area()?'':'hidden')+'>';
  function nav(){return '<nav class="cf-business-tabs" aria-label="Áreas do negócio">'+Object.entries(areas).map(([key,label])=>
    '<button type="button" class="sec" data-act="negocio-relatorio-area" data-area="'+key+'" '+(area()===key?'aria-current="page"':'')+'>'+label+'</button>').join('')+'</nav>';}
  function records(){return (S.lanc||[]).map(r=>({...r,categoria:S.cats?.find(c=>c.id===r.categoria_id)?.nome||'Sem categoria'}));}
  const review=()=>CFBusiness.review(records(),localFinancialDate(),CFMoney);
  function stats(items){return '<dl class="cf-plan-values">'+items.map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+value+'</dd></div>').join('')+'</dl>';}
  function aging(rows){return '<ul class="cf-business-list">'+rows.map(r=>'<li><span>'+esc(r.label)+' <small>'+r.count+' lançamento(s)</small></span><strong>'+cash(r.cents)+'</strong></li>').join('')+'</ul>';}
  function option(value,label,selected){return '<option value="'+esc(value)+'" '+(selected===value?'selected':'')+'>'+esc(label)+'</option>';}
  function ledger(d){
    const filters=S.businessFilters||{},r=CFBusiness.ledger(d,filters);
    const cats=(S.cats||[]).map(c=>option(c.id,c.nome,filters.categoria)).join('');
    return section('ledger')+'<h2>Movimentações do negócio</h2><p class="mu">Mês selecionado. Filtre os lançamentos para encontrar vendas, custos e pendências. Edite, importe ou exporte na Planilha.</p>'+
      '<div class="cf-plan-fields"><label>Buscar descrição<input id="negocio-busca" maxlength="120" value="'+esc(filters.query||'')+'" placeholder="Ex.: aluguel ou serviço"></label>'+
      '<label>Tipo<select id="negocio-filtro-tipo">'+[['','Todos'],['receita','Receitas'],['despesa','Despesas']].map(([v,l])=>option(v,l,filters.tipo)).join('')+'</select></label>'+
      '<label>Situação<select id="negocio-filtro-status">'+[['','Todas'],['pago','Recebidos ou pagos'],['pendente','Pendentes'],['overdue','Vencidos']].map(([v,l])=>option(v,l,filters.status)).join('')+'</select></label>'+
      '<label>Categoria<select id="negocio-filtro-categoria">'+option('','Todas',filters.categoria)+cats+'</select></label></div>'+
      '<div class="cf-business-actions"><button data-act="negocio-relatorio-filtrar">Aplicar filtros</button><button class="sec" data-act="negocio-relatorio-limpar">Limpar filtros</button><button class="sec" data-act="view" data-v="planilha">Gerenciar na Planilha</button></div>'+
      stats([['Receitas filtradas',cash(r.income)],['Despesas filtradas',cash(r.expense)],['Diferença dos registros',cash(r.income-r.expense)]])+
      '<p class="mu">'+r.count+' registro(s). Totais incluem todas as páginas do filtro; valores pagos e pendentes são considerados.</p><ul class="cf-business-list">'+
      (r.rows.map(row=>'<li><div><strong>'+esc(row.descricao||'Sem descrição')+'</strong><small>'+esc(row.categoria)+' · '+(row.due?row.due.split('-').reverse().join('/'):'Sem vencimento')+' · '+(row.status==='pago'?(row.tipo==='receita'?'Recebido':'Pago'):'Pendente')+'</small></div><span class="'+(row.tipo==='receita'?'pos':'neg')+'">'+(row.tipo==='receita'?'+ ':'− ')+cash(row.cents)+'</span><button class="sec" data-act="negocio-relatorio-abrir" data-id="'+esc(row.id)+'">Abrir lançamento</button></li>').join('')||'<li>Nenhum lançamento corresponde a esses filtros.</li>')+'</ul>'+
      '<div class="cf-business-actions"><button class="sec" data-act="negocio-relatorio-pagina" data-page="'+(r.page-1)+'" '+(r.page===1?'disabled':'')+'>Anterior</button><span class="cf-business-page" role="status">Página '+r.page+' de '+r.pages+'</span><button class="sec" data-act="negocio-relatorio-pagina" data-page="'+(r.page+1)+'" '+(r.page===r.pages?'disabled':'')+'>Próxima</button></div></section>';
  }
  function results(d){
    const missing=d.missingCategory.length,issues=[['Sem categoria',missing],['Pendentes sem vencimento',d.missingDue.length],['Possíveis repetições',d.duplicates.length],['Registros inválidos ignorados',d.ignored]];
    const bars=d.categories.map(([name,value])=>'<li><div><strong>'+esc(name)+'</strong><small>'+((value/Math.max(1,d.expense))*100).toFixed(1).replace('.',',')+'% das despesas registradas</small><div class="cf-business-bar" aria-hidden="true"><span style="width:'+Math.min(100,value/Math.max(1,d.expense)*100)+'%"></span></div></div><span>'+cash(value)+'</span></li>').join('');
    const warnings=issues.filter(([,n])=>n>0).map(([label,n])=>'<li><strong>'+label+'</strong><span>'+n+'</span></li>').join('');
    return section('results')+'<h2>Resultado dos registros</h2><p class="mu">Mês selecionado. Esta visão compara os lançamentos; aportes, empréstimos, retiradas e custos ausentes precisam ser revisados antes de apurar lucro.</p>'+
      stats([['Receitas registradas',cash(d.income)],['Despesas registradas',cash(d.expense)],['Diferença registrada',cash(d.competence)],['Entrada menos saída realizada',cash(d.cash)],['Lançamentos de receita',String(d.salesCount)],['Média por lançamento de receita',cash(d.salesCount?Math.round(d.income/d.salesCount):0)]])+
      '<p class="mu">A diferença realizada não é o saldo bancário. A diferença dos registros não substitui uma DRE contábil.</p><h3>Onde estão os custos</h3><ul class="cf-business-list">'+(bars||'<li>Cadastre despesas com categoria para comparar os custos.</li>')+'</ul>'+
      '<h3>Revisão dos dados</h3><ul class="cf-business-list">'+(warnings||'<li>Nenhuma pendência encontrada nestas verificações. Isso não comprova que todos os custos foram registrados.</li>')+'</ul><p class="mu">Possíveis repetições têm descrição, tipo, valor, vencimento e categoria iguais. Confira antes de alterar; podem ser transações diferentes.</p>'+
      '<div class="cf-business-actions"><button class="sec" data-act="view" data-v="planilha">Revisar na Planilha</button><button data-act="negocio-ajuda">Revisar com o Tamanduá</button></div></section>';
  }
  function planning(){
    const fields=[['fixed','Custos fixos mensais (R$)'],['sales','Faturamento previsto (R$)'],['variable','Custos variáveis sobre as vendas (%)'],['tax','Taxas e tributos estimados (%)'],['target','Resultado mensal desejado (R$)'],['days','Dias de trabalho no mês']];
    const input=S.businessScenario||{},p=S.businessScenario?CFBusiness.plan(input,CFMoney):null;
    return section('planning')+'<h2>Plano de rendimento do negócio</h2><p class="mu">Simule quanto precisa faturar para cobrir os custos e buscar seu objetivo. Use valores estimados de toda a operação e evite contar a mesma taxa duas vezes.</p><div class="cf-plan-fields">'+
      fields.map(([key,label])=>'<label>'+label+'<input id="negocio-plano-'+key+'" type="number" min="'+(key==='days'?'1':'0')+'" '+(key==='days'?'max="31"':'')+' step="'+(key==='days'?'1':'0.01')+'" value="'+esc(input[key]??'')+'"></label>').join('')+'</div>'+
      '<button data-act="negocio-relatorio-simular">Calcular plano de rendimento</button><p class="mu">Simulação mantida apenas nesta sessão. Não cria vendas, não altera o caixa e não garante resultado.</p>'+
      '<div role="status">'+(p?stats([['Margem de contribuição estimada',p.contributionRate.toFixed(2).replace('.',',')+'%'],['Faturamento para cobrir custos',cash(p.breakEven)],['Faturamento para buscar o objetivo',cash(p.targetRevenue)],['Meta por dia de trabalho',cash(p.dailyTarget)],['Resultado no cenário informado',cash(p.estimatedResult)],['Faturamento adicional necessário',cash(p.gap)]])+
      '<p>O cálculo desconta custos variáveis e taxas do faturamento e depois os custos fixos. '+(p.estimatedResult<0?'O cenário informado não cobre os custos. Revise preço, volume de vendas e gastos antes de assumir novos compromissos.':'Confira se os custos fixos incluem remuneração, aluguel e demais despesas da operação.')+'</p>':'Preencha os valores para calcular o cenário.')+'</div>'+
      '<button class="sec" data-act="view" data-v="plan">Abrir metas do negócio</button></section>';
  }
  function view(){
    const d=review();
    const payable=d.rows.filter(x=>x.tipo==='despesa'&&x.status!=='pago').sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
    const late=d.receivableAging.filter(x=>['1-7','8-30','31+'].includes(x.key)).reduce((sum,x)=>sum+x.cents,0);
    const priorities=[];
    if(late)priorities.push(['receivables','Conferir recebimentos vencidos',cash(late)+' aguardam conferência. Se já recebeu, atualize o registro; caso contrário, planeje a cobrança.']);
    if(d.missingDue.length)priorities.push(['ledger','Completar vencimentos',d.missingDue.length+' pendência(s) sem data ficam fora da previsão de caixa.']);
    if(d.missingCategory.length||d.duplicates.length||d.ignored)priorities.push(['results','Revisar a qualidade dos registros','Categorias ausentes, possíveis repetições e dados inválidos reduzem a confiança da análise.']);
    if(d.categories.length)priorities.push(['results','Examinar o maior grupo de custos',d.categories[0][0]+' soma '+cash(d.categories[0][1])+'. Confira composição e necessidade antes de buscar redução.']);
    priorities.push(['planning','Definir o próximo objetivo','Calcule o faturamento necessário para cobrir os custos e buscar seu resultado mensal.']);
    const next=section('overview')+'<h2>Próximas ações do negócio</h2><p class="mu">Prioridades calculadas a partir dos registros deste mês.</p><ul class="cf-business-list">'+priorities.map(([key,title,hint])=>'<li><div><strong>'+esc(title)+'</strong><small>'+esc(hint)+'</small></div><button class="sec" data-act="negocio-relatorio-area" data-area="'+key+'">Abrir área</button></li>').join('')+'</ul></section>';
    return next+ledger(d)+results(d)+planning()+section('receivables')+'<h2>Prazos de recebimento e pagamento</h2><p class="mu">Mês selecionado. Vencimentos comparados com a data de hoje; itens sem data precisam de conferência.</p><div class="cf-business-columns"><div><h3>A receber por atraso</h3>'+aging(d.receivableAging)+'</div><div><h3>A pagar por atraso</h3>'+aging(d.payableAging)+'</div></div><h3>Próximos pagamentos e atrasos</h3><ul class="cf-business-list">'+
      (payable.slice(0,30).map(row=>'<li><div><strong>'+esc(row.descricao||'Sem descrição')+'</strong><small>'+(row.due?row.due.split('-').reverse().join('/'):'Sem vencimento')+(row.due&&row.due<d.today?' · Em atraso':'')+'</small></div><span>'+cash(row.cents)+'</span>'+
      (canEdit()&&mesAberto()?'<button class="sec" data-act="negocio-quitar" data-id="'+esc(row.id)+'">Conferir pagamento</button>':'')+'</li>').join('')||'<li>Nenhuma despesa pendente neste mês.</li>')+'</ul>'+(payable.length>30?'<p>Mostrando 30 despesas. Consulte as demais em Movimentações.</p>':'')+'</section>';
  }
  async function handle(action,button){
    if(action==='negocio-relatorio-abrir'){
      const id=button.dataset.id;
      if(!(S.lanc||[]).some(row=>row.id===id))throw Error('Atualize o mês para encontrar este lançamento.');
      S.view='planilha';S.mobileMore=false;render();
      const rows=[...document.querySelectorAll('tr[data-id]')].filter(row=>row.dataset.id===id);
      const row=rows.find(node=>node.getClientRects().length>0);
      if(row){const details=row.querySelector('details');if(details)details.open=true;row.scrollIntoView({block:'center'});row.querySelector('[data-f="descricao"]')?.focus({preventScroll:true});}
      return;
    }
    if(action==='negocio-relatorio-area'){
      if(!Object.hasOwn(areas,button.dataset.area))return;
      S.businessArea=button.dataset.area;
      document.querySelectorAll('[data-business-section]').forEach(node=>node.hidden=node.dataset.businessSection!==area());
      document.querySelectorAll('.cf-business-tabs button').forEach(node=>{
        if(node.dataset.area===area())node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');
      });return;
    }
    if(action==='negocio-relatorio-filtrar'){
      const val=id=>document.getElementById(id).value;
      S.businessFilters={query:val('negocio-busca'),tipo:val('negocio-filtro-tipo'),status:val('negocio-filtro-status'),categoria:val('negocio-filtro-categoria'),page:1};render();return;
    }
    if(action==='negocio-relatorio-limpar'){S.businessFilters={};render();return;}
    if(action==='negocio-relatorio-pagina'){S.businessFilters={...S.businessFilters,page:Number(button.dataset.page)};render();return;}
    if(action==='negocio-relatorio-simular'){
      const input=Object.fromEntries(['fixed','sales','variable','tax','target','days'].map(k=>[k,document.getElementById('negocio-plano-'+k).value]));
      if(!CFBusiness.plan(input,CFMoney))throw Error('Confira todos os campos: valores com até duas casas, percentuais somando menos de 100% e de 1 a 31 dias de trabalho.');
      S.businessScenario=input;render();
    }
  }
  window.CFBusinessReports={area,section,nav,view,handle};
})();
