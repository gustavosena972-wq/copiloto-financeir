/* Android business pilot. Every write uses the authenticated family and RLS. */
(function(){
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>brl(value/100);
  const modes={pessoal:'Individual',familiar:'Em família',negocio:'Negócio'};
  function mode(){return S.espaco?.modo||'familiar'}
  function options(selected='familiar'){
    return '<div class="cf-space-options">'+Object.entries(modes).map(([value,title])=>
      '<label><input type="radio" name="espaco-modo" value="'+value+'" '+(selected===value?'checked':'')+
      (value==='negocio'&&!S.internalTester?'disabled':'')+'><span><strong>'+title+'</strong><small style="display:block">'+
      ({pessoal:'Seu orçamento, suas contas e objetivos.',familiar:'Uma planilha compartilhada por convite.',negocio:'Caixa e serviços em um espaço dedicado. Piloto Alpha.'})[value]+'</small></span></label>').join('')+'</div>';
  }
  function settings(){
    if(S.me?.papel!=='dono')return '';
    return '<section class="cf-family-area"><div class="cf-family-area-body"><details><summary>Como você usa o Copiloto</summary><p>Escolha a organização deste espaço. Um negócio precisa de um espaço dedicado e vazio antes do primeiro registro.</p>'+
      options(mode())+'<label class="cf-space-segment">Ramo do negócio (opcional)<input id="espaco-segmento" maxlength="80" value="'+escape(S.espaco?.segmento||'')+'" placeholder="Ex.: salão ou comércio"></label>'+
      '<button data-act="salvar-espaco">Salvar organização</button></details></div></section>';
  }
  function view(){
    if(mode()!=='negocio'||!S.internalTester)return '<section class="card"><h2>Negócios no Alpha</h2><p>O piloto é configurado em Espaço e ajustes por quem administra um espaço dedicado ao negócio.</p></section>';
    const d=CFBusiness.summary(S.lanc,localFinancialDate(),CFMoney),ed=canEdit()&&mesAberto();
    const overdue=d.pendingIncome.filter(row=>row.due&&row.due<d.today);
    const overdueCents=overdue.reduce((total,row)=>total+row.cents,0);
    const categoryRows=d.categories.slice(0,5).map(([name,amount])=>'<li><strong>'+escape(name)+'</strong><span>'+money(amount)+'</span></li>').join('');
    const pending=d.pendingIncome.slice(0,30).map(row=>'<li><div><strong>'+escape(row.descricao)+'</strong><small>'+
      (row.due?row.due.split('-').reverse().join('/')+(row.due<d.today?' · Em atraso':''):'Sem vencimento informado')+
      '</small></div><span>'+money(row.cents)+'</span>'+(ed?'<button class="sec" data-act="negocio-recebido" data-id="'+escape(row.id)+'">Conferir recebimento</button>':'')+'</li>').join('');
    return '<div class="cf-business"><section class="card"><h2>Caixa do negócio</h2><p class="mu">Mês selecionado. '+escape(S.espaco.segmento||'Pequeno negócio')+'.</p>'+
      '<dl class="cf-plan-values"><div><dt>Recebido</dt><dd>'+money(d.received)+'</dd></div><div><dt>Pago</dt><dd>'+money(d.paid)+'</dd></div><div><dt>A receber</dt><dd>'+money(d.receivable)+'</dd></div><div><dt>A pagar</dt><dd>'+money(d.payable)+'</dd></div></dl>'+
      '<p class="mu">Movimentações registradas. A diferença entre receitas e despesas não inclui custos ainda não lançados.</p><div class="cf-business-actions">'+
      (ed?'<button data-act="mobileadd" data-tipo="receita" data-origem="negocio">Registrar venda ou serviço</button><button class="sec" data-act="mobileadd" data-tipo="despesa" data-origem="negocio">Registrar custo</button>':'')+
      '<button class="sec" data-act="negocio-ajuda">Analisar com o Tamanduá</button></div></section>'+
      '<section class="card"><h2>Recebimentos pendentes</h2>'+
      (overdue.length?'<p role="status">'+overdue.length+' recebimento(s) com data vencida, somando '+money(overdueCents)+'. Confira se já recebeu antes de atualizar.</p>':'')+
      '<ul class="cf-business-list">'+(pending||'<li>Nenhum recebimento pendente neste mês.</li>')+'</ul>'+
      (d.pendingIncome.length>30?'<p>Mostrando 30 itens. Consulte os demais na Planilha.</p>':'')+'</section>'+
      '<section class="card"><h2>Vendas e custos do mês</h2><dl class="cf-plan-values"><div><dt>Vendas ou serviços registrados</dt><dd>'+d.salesCount+'</dd></div><div><dt>Média por lançamento de receita</dt><dd>'+money(d.salesCount?Math.round(d.income/d.salesCount):0)+'</dd></div></dl>'+
      '<h3>Maiores categorias de despesa</h3><ul class="cf-business-list">'+(categoryRows||'<li>Registre custos para ver a distribuição.</li>')+'</ul></section>'+
      '<section class="card"><h2>Ferramentas do negócio</h2>'+
      '<details class="cf-plan-form"><summary>Preço de um produto ou serviço</summary><div class="cf-plan-expand-body"><p class="mu">Inclua os custos e escolha uma margem. Revise o resultado antes de usar o preço.</p><div class="cf-plan-fields">'+
      [['preco-material','Materiais e mercadoria (R$)'],['preco-minutos','Tempo de trabalho (minutos)'],['preco-hora','Custo da hora de trabalho (R$)'],['preco-fixo','Custos fixos por venda (R$)'],['preco-taxas','Taxas e tributos estimados (%)'],['preco-margem','Margem desejada sobre o preço (%)']].map(([id,label])=>'<label>'+label+'<input id="'+id+'" type="number" min="0" step="0.01" value="0"></label>').join('')+
      '<button class="cf-plan-wide" data-act="negocio-preco">Calcular preço</button></div><div id="negocio-preco-resultado" role="status"></div></div></details>'+
      '<details class="cf-plan-form"><summary>Previsão de caixa em 30 dias</summary><div class="cf-plan-expand-body"><p class="mu">Informe o saldo disponível de hoje. Vou buscar os vencimentos registrados para os próximos 30 dias.</p>'+
      '<label>Saldo de hoje (R$)<input id="negocio-saldo" type="number" min="0" step="0.01"></label><button data-act="negocio-prever">Calcular cenário</button><div id="negocio-previsao" role="status"></div></div></details>'+
      '<details class="cf-plan-form"><summary>Planilha e fechamento do período</summary><div class="cf-plan-expand-body"><p class="mu">Revise lançamentos antes de exportar. A planilha contém os dados registrados e serve de apoio à revisão com sua contabilidade.</p><button class="sec" data-act="view" data-v="planilha">Abrir planilha</button></div></details></section>'+
      '<section class="card"><h2>Plano Negócios</h2><p>Preço proposto de R$ 69,90 por 30 dias. Caixa, recebimentos, formação de preço e apoio do Tamanduá. Disponível para avaliação no Alpha.</p><p class="mu">A contratação será liberada após a configuração e validação do produto na Google Play.</p></section></div>';
  }
  function assertBusiness(){if(mode()!=='negocio'||!S.internalTester)throw Error('Recurso disponível no piloto Negócios.');}
  async function handle(action,button){
    if(action==='salvar-espaco'){
      if(S.me?.papel!=='dono')return;
      const choice=document.querySelector('[name="espaco-modo"]:checked')?.value;
      S.espaco=await q(sb.rpc('configurar_meu_espaco',{p_modo:choice,p_segmento:document.getElementById('espaco-segmento')?.value||''}));
      render();toast('Organização do espaço salva.');return;
    }
    assertBusiness();
    if(action==='negocio-ajuda'){
      S.view='tamandua';S.mobileMore=false;render();
      window.dispatchEvent(new CustomEvent('copiloto:tamandua-draft',{detail:'Analise o mês do meu negócio. Separe o recebido do que ainda espero receber, mostre os vencimentos que merecem atenção e diga de quais dados precisa para o próximo passo.'}));return;
    }
    if(action==='negocio-preco'){
      const ids=['preco-material','preco-minutos','preco-hora','preco-fixo','preco-taxas','preco-margem'];
      const result=CFBusiness.price(...ids.map(id=>Number(document.getElementById(id).value)));
      const host=document.getElementById('negocio-preco-resultado');
      host.textContent=result?'Preço calculado: '+brl(result.total)+'. Base de custos: '+brl(result.base)+'. Margem estimada: '+brl(result.margin)+'. Todos os custos dependem dos valores que você informou.':'Confira os valores. Taxas e margem juntas precisam ser menores que 100%.';return;
    }
    if(action==='negocio-recebido'){
      if(!canEdit()||!mesAberto())return;
      const row=S.lanc.find(x=>x.id===button.dataset.id&&x.tipo==='receita'&&x.status!=='pago');
      if(!row||!confirm('Confirmar que recebeu '+brl(row.valor)+' de '+row.descricao+'?'))return;
      const changed=await q(sb.from('lancamentos').update({status:'pago',data_pagamento:dataLocalISO()})
        .eq('id',row.id).eq('familia_id',S.fam.id).eq('mes_id',S.mes.id).eq('tipo','receita').neq('status','pago').select('id').maybeSingle());
      await loadMes();toast(changed?'Recebimento registrado.':'Esse recebimento já foi atualizado.');return;
    }
    if(action==='negocio-prever'){
      const raw=document.getElementById('negocio-saldo').value,opening=CFMoney.cents(raw);
      const host=document.getElementById('negocio-previsao');
      if(raw===''||opening===null){host.textContent='Informe um saldo com até duas casas decimais.';return;}
      const day=localFinancialDate(),end=new Date(day+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+30);
      const rows=await q(sb.from('lancamentos').select('id,tipo,status,valor,data_vencimento')
        .eq('familia_id',S.fam.id).neq('status','pago').gte('data_vencimento',day).lte('data_vencimento',end.toISOString().slice(0,10)).order('data_vencimento').limit(501));
      if(!host.isConnected)return;
      if(rows.length>500){host.textContent='Há mais de 500 vencimentos. Revise por período na Planilha antes de simular.';return;}
      const summary=CFMoney.summarize(rows,day);
      if(summary.ignored){host.textContent='Há registros inválidos. Revise-os antes de calcular.';return;}
      const projection=CFMoney.forecast(summary,opening,30);
      host.textContent='Saldo final no cenário: '+money(projection.balance)+'. Menor saldo: '+money(projection.lowest)+'. '+
        (projection.firstNegative?'Primeira data abaixo de zero: '+projection.firstNegative.split('-').reverse().join('/')+'. ':'')+
        'Considera '+summary.rows.length+' lançamentos com vencimento de '+day.split('-').reverse().join('/')+' a '+end.toISOString().slice(0,10).split('-').reverse().join('/')+
        '. '+projection.assumption+' Valores já vencidos e receitas incertas precisam de revisão separada.';
    }
  }
  window.CFBusinessUI={mode,options,settings,view,handle};
})();
