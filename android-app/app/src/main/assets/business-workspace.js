/* Android business pilot. Every write uses the authenticated family and RLS. */
(function(){
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>brl(value/100);
  const modes={pessoal:'Individual',familiar:'Em família',negocio:'Negócio'};
  const priceFields=['materiais','minutos','custo_hora','custo_fixo','taxas','margem'];
  const priceIds=['preco-material','preco-minutos','preco-hora','preco-fixo','preco-taxas','preco-margem'];
  const section=area=>window.CFBusinessReports?.section(area)||'<section class="card">';
  function mode(){return S.espaco?.modo||'familiar'}
  async function loadServices(){
    S.servicos=[];
    if(mode()!=='negocio'||!S.internalTester)return;
    S.servicos=await q(sb.from('negocio_servicos').select('id,nome,materiais,minutos,custo_hora,custo_fixo,taxas,margem,preco')
      .eq('familia_id',S.fam.id).eq('ativo',true).order('nome').limit(200));
  }
  function catalog(){
    const ed=canEdit(),rows=(S.servicos||[]).map(row=>'<li><div><strong>'+escape(row.nome)+'</strong><small>'+escape(row.minutos)+' min · '+brl(row.preco)+'</small></div>'+
      (ed&&mesAberto()?'<button data-act="negocio-usar-servico" data-id="'+escape(row.id)+'">Preparar lançamento</button>':'')+
      (ed?'<details class="cf-service-options"><summary>Opções do serviço</summary><div class="cf-business-actions"><button class="sec" data-act="negocio-editar-servico" data-id="'+escape(row.id)+'">Editar preço e custos</button><button class="sec" data-act="negocio-arquivar-servico" data-id="'+escape(row.id)+'">Arquivar serviço</button></div></details>':'')+'</li>').join('');
    return (window.CFServiceDesk?.view()||'')+section('services')+'<h2>Produtos e serviços</h2><p class="mu">Cadastre mercadorias com seu custo de compra e serviços com materiais e tempo de trabalho. Para revenda, use zero nos campos de tempo. Preparar um lançamento abre a Planilha para você conferir e salvar.</p><ul class="cf-business-list">'+
      (rows||'<li>Nenhum item salvo. Calcule o preço na ferramenta abaixo e salve o primeiro.</li>')+'</ul><button class="sec" data-act="negocio-atualizar-servicos">Atualizar catálogo</button></section>';
  }
  function options(selected='familiar'){
    return '<div class="cf-space-options">'+Object.entries(modes).map(([value,title])=>
      '<label><input type="radio" name="espaco-modo" value="'+value+'" '+(selected===value?'checked':'')+
      (value==='negocio'&&!S.internalTester?'disabled':'')+'><span><strong>'+title+'</strong><small style="display:block">'+
      ({pessoal:'Seu orçamento, suas contas e objetivos.',familiar:'Uma planilha compartilhada por convite.',negocio:'Caixa e serviços em um espaço dedicado. Piloto Alpha.'})[value]+'</small></span></label>').join('')+'</div>';
  }
  function settings(){
    if(S.me?.papel!=='dono')return '';
    return '<section class="cf-family-area"><div class="cf-family-area-body"><details><summary>Como você usa o Copiloto</summary><p>Escolha a organização deste espaço. Um negócio precisa de um espaço dedicado e vazio antes do primeiro registro.</p>'+
      options(mode())+'<label class="cf-space-segment">Ramo do negócio (opcional)<input id="espaco-segmento" list="cf-ramos" maxlength="80" value="'+escape(S.espaco?.segmento||'')+'" placeholder="Escolha ou escreva seu ramo"><datalist id="cf-ramos"><option>Salão de manicure</option><option>Cabeleireiro</option><option>Loja de roupas</option><option>Escritório de serviços</option><option>Alimentação</option><option>Comércio online</option></datalist></label>'+
      '<button data-act="salvar-espaco">Salvar organização</button></details></div></section>';
  }
  function view(){
    if(mode()!=='negocio'||!S.internalTester)return '<section class="card"><h2>Negócios no Alpha</h2><p>O piloto é configurado em Espaço e ajustes por quem administra um espaço dedicado ao negócio.</p></section>';
    const rows=(S.lanc||[]).map(r=>({...r,categoria:S.cats?.find(c=>c.id===r.categoria_id)?.nome||'Sem categoria'}));
    const d=CFBusiness.summary(rows,localFinancialDate(),CFMoney),ed=canEdit()&&mesAberto();
    const overdue=d.pendingIncome.filter(row=>row.due&&row.due<d.today);
    const overdueCents=overdue.reduce((total,row)=>total+row.cents,0);
    const pending=d.pendingIncome.slice(0,30).map(row=>'<li><div><strong>'+escape(row.descricao)+'</strong><small>'+
      (row.due?row.due.split('-').reverse().join('/')+(row.due<d.today?' · Em atraso':''):'Sem vencimento informado')+
      '</small></div><span>'+money(row.cents)+'</span>'+(ed?'<button class="sec" data-act="negocio-recebido" data-id="'+escape(row.id)+'">Conferir recebimento</button>':'')+'</li>').join('');
    return '<div class="cf-business">'+(window.CFBusinessReports?.nav()||'')+section('overview')+'<h2>Caixa do negócio</h2><p class="mu">Mês selecionado. '+escape(S.espaco.segmento||'Pequeno negócio')+'.</p>'+
      '<dl class="cf-plan-values"><div><dt>Recebido</dt><dd>'+money(d.received)+'</dd></div><div><dt>Pago</dt><dd>'+money(d.paid)+'</dd></div><div><dt>A receber</dt><dd>'+money(d.receivable)+'</dd></div><div><dt>A pagar</dt><dd>'+money(d.payable)+'</dd></div></dl>'+
      '<p class="mu">Movimentações registradas. A diferença entre receitas e despesas não inclui custos ainda não lançados.</p><div class="cf-business-actions">'+
      (ed?'<button data-act="mobileadd" data-tipo="receita" data-origem="negocio">Registrar venda ou serviço</button><button class="sec" data-act="mobileadd" data-tipo="despesa" data-origem="negocio">Registrar custo</button>':'')+
      '<button class="sec" data-act="negocio-perfil">Meu perfil empresarial</button><button class="sec" data-act="negocio-ajuda">Analisar com o Tamanduá</button></div></section>'+
      section('receivables')+'<h2>Recebimentos pendentes</h2>'+
      (overdue.length?'<p role="status">'+overdue.length+' recebimento(s) com data vencida, somando '+money(overdueCents)+'. Confira se já recebeu antes de atualizar.</p>':'')+
      '<ul class="cf-business-list">'+(pending||'<li>Nenhum recebimento pendente neste mês.</li>')+'</ul>'+
      (d.pendingIncome.length>30?'<p>Mostrando 30 itens. Consulte os demais na Planilha.</p>':'')+'</section>'+
      catalog()+
      section('services')+'<h2>Formação de preço</h2>'+
      '<details id="negocio-servico-form" class="cf-plan-form"><summary>Preço de um produto ou serviço</summary><div class="cf-plan-expand-body"><p class="mu">Inclua os custos e escolha uma margem. Revise o resultado antes de usar o preço.</p><input id="servico-id" type="hidden"><div class="cf-plan-fields">'+
      [['preco-material','Materiais e mercadoria (R$)'],['preco-minutos','Tempo de trabalho (minutos)'],['preco-hora','Custo da hora de trabalho (R$)'],['preco-fixo','Custos fixos por venda (R$)'],['preco-taxas','Taxas e tributos estimados (%)'],['preco-margem','Margem desejada sobre o preço (%)']].map(([id,label])=>'<label>'+label+'<input id="'+id+'" type="number" min="0" step="'+(id==='preco-minutos'?'1':'0.01')+'" value="0"></label>').join('')+
      '<button class="cf-plan-wide" data-act="negocio-preco">Calcular preço</button></div><div id="negocio-preco-resultado" role="status"></div>'+
      (canEdit()?'<label>Nome do produto ou serviço<input id="servico-nome" maxlength="120" placeholder="Ex.: corte e finalização"></label><div class="cf-business-actions"><button data-act="negocio-salvar-servico">Salvar item no catálogo</button><button class="sec" data-act="negocio-limpar-servico">Novo item</button></div><p class="mu">Salvar o catálogo não registra uma venda nem altera lançamentos anteriores.</p>':'')+'</div></details></section>'+section('planning')+'<h2>Fluxo de caixa e conferência</h2>'+
      '<details class="cf-plan-form"><summary>Previsão de caixa em 30 dias</summary><div class="cf-plan-expand-body"><p class="mu">Informe o saldo disponível de hoje. Vou buscar os vencimentos registrados para os próximos 30 dias.</p>'+
      '<label>Saldo de hoje (R$)<input id="negocio-saldo" type="number" min="0" step="0.01"></label><button data-act="negocio-prever">Calcular cenário</button><div id="negocio-previsao" role="status"></div></div></details>'+
      '<details class="cf-plan-form"><summary>Planilha e fechamento do período</summary><div class="cf-plan-expand-body"><p class="mu">Revise lançamentos antes de exportar. A planilha contém os dados registrados e serve de apoio à revisão com sua contabilidade.</p><button class="sec" data-act="view" data-v="planilha">Abrir planilha</button></div></details></section>'+
      (window.CFBusinessReports?.view()||'')+section('overview')+'<h2>Plano Negócios</h2><p>Preço proposto de R$ 69,90 por 30 dias. Caixa, recebimentos, formação de preço e apoio do Tamanduá. Disponível para avaliação no Alpha.</p><p class="mu">A contratação será liberada após a configuração e validação do produto na Google Play.</p></section></div>';
  }
  function assertBusiness(){if(mode()!=='negocio'||!S.internalTester)throw Error('Recurso disponível no piloto Negócios.');}
  async function loadRows(){
    assertBusiness();
    const rows=[];
    for(let from=0;from<=10000;from+=500){
      const page=await q(sb.from('lancamentos').select('*').eq('familia_id',S.fam.id).eq('mes_id',S.mes.id)
        .order('data_vencimento',{nullsFirst:false}).order('criado_em').order('id').range(from,from+499));
      rows.push(...page);
      if(rows.length>10000)throw Error('Este mês excede 10 mil registros. Solicite apoio para analisar o período completo; um relatório parcial não será exibido.');
      if(page.length<500)return rows;
    }
  }
  async function handle(action,button){
    if(action==='salvar-espaco'){
      if(S.me?.papel!=='dono')return;
      const choice=document.querySelector('[name="espaco-modo"]:checked')?.value;
      S.espaco=await q(sb.rpc('configurar_meu_espaco',{p_modo:choice,p_segmento:document.getElementById('espaco-segmento')?.value||''}));
      render();toast('Organização do espaço salva.');return;
    }
    assertBusiness();
    if(action==='negocio-projetar-atendimentos')return window.CFServiceDesk.project();
    if(action==='negocio-perfil'){window.dispatchEvent(new Event('copiloto:perfil-empresarial'));return;}
    if(action==='negocio-barra'){
      const scope=JSON.stringify([S.user.id,S.fam.id]);
      const enabled=button.dataset.enabled==='true';
      if(enabled&&!await window.requestCopilotoNotificationPermission?.())throw Error('Permita notificações do Copiloto nos ajustes do Android.');
      if(scope!==JSON.stringify([S.user?.id,S.fam?.id]))return;
      window.CopilotoAlerts.postMessage(JSON.stringify({action:'businessBar',scope,enabled}));return;
    }
    if(action==='negocio-atender')return window.CFServiceDesk.record(button);
    if(action.startsWith('negocio-relatorio-'))return window.CFBusinessReports.handle(action,button);
    if(action==='negocio-atualizar-servicos'){await loadServices();render();toast('Catálogo atualizado.');return;}
    if(action==='negocio-salvar-servico'){
      if(!canEdit())return;
      const values=priceIds.map(id=>Number(document.getElementById(id).value));
      const name=document.getElementById('servico-nome').value.trim();
      if(!name||!CFBusiness.price(...values)||!Number.isInteger(values[1])||values[1]>1440||values.some((n,i)=>i!==1&&(n>1000000||Math.abs(n*100-Math.round(n*100))>1e-6)))
        throw Error('Informe o nome, minutos inteiros de 0 a 1440 e custos com até duas casas decimais. Taxas e margem devem somar menos de 100%.');
      const args={p_familia:S.fam.id,p_nome:name,p_id:document.getElementById('servico-id').value||null};
      priceFields.forEach((field,i)=>args['p_'+field]=values[i]);
      await q(sb.rpc('salvar_servico_negocio',args));await loadServices();render();toast('Serviço salvo no catálogo.');return;
    }
    if(action==='negocio-limpar-servico'){
      document.getElementById('servico-id').value='';document.getElementById('servico-nome').value='';
      priceIds.forEach(id=>document.getElementById(id).value='0');document.getElementById('negocio-preco-resultado').textContent='Novo item. Preencha os custos.';return;
    }
    if(['negocio-editar-servico','negocio-arquivar-servico','negocio-usar-servico'].includes(action)){
      if(!canEdit())return;
      const row=(S.servicos||[]).find(x=>x.id===button.dataset.id);
      if(!row)throw Error('Atualize o catálogo para encontrar este serviço.');
      if(action==='negocio-editar-servico'){
        S.businessArea='services';render();
        document.getElementById('negocio-servico-form').open=true;
        document.getElementById('servico-id').value=row.id;document.getElementById('servico-nome').value=row.nome;
        priceIds.forEach((id,i)=>document.getElementById(id).value=row[priceFields[i]]);
        document.getElementById('negocio-preco-resultado').textContent='Editando '+row.nome+'. Preço salvo: '+brl(row.preco)+'.';
        document.getElementById('servico-nome').focus();return;
      }
      if(action==='negocio-arquivar-servico'){
        if(!confirm('Arquivar '+row.nome+'? Os lançamentos anteriores serão preservados.'))return;
        await q(sb.rpc('arquivar_servico_negocio',{p_familia:S.fam.id,p_id:row.id}));await loadServices();render();toast('Serviço arquivado.');return;
      }
      if(!mesAberto())return;
      if(Number(row.preco)<=0)throw Error('Este serviço está sem preço de venda. Edite o preço antes de preparar o lançamento.');
      S.view='planilha';S.mobileMore=false;S.mobileAddOpen=true;S.mobileAddType='receita';render();
      document.getElementById('n_desc').value=row.nome;document.getElementById('n_valor').value=Number(row.preco).toFixed(2);
      document.getElementById('n_tipo').value='receita';document.getElementById('n_status').value='pendente';
      document.getElementById('n_desc').focus();toast('Confira valor, vencimento e recebimento antes de salvar.');return;
    }
    if(action==='negocio-ajuda'){
      S.view='tamandua';S.mobileMore=false;render();
      window.dispatchEvent(new CustomEvent('copiloto:tamandua-draft',{detail:'Analise o mês do meu negócio. Separe o recebido do que ainda espero receber, mostre os vencimentos que merecem atenção e diga de quais dados precisa para o próximo passo.'}));return;
    }
    if(action==='negocio-preco'){
      const result=CFBusiness.price(...priceIds.map(id=>Number(document.getElementById(id).value)));
      const host=document.getElementById('negocio-preco-resultado');
      host.textContent=result?'Preço calculado: '+brl(result.total)+'. Base de custos: '+brl(result.base)+'. Margem estimada: '+brl(result.margin)+'. Todos os custos dependem dos valores que você informou.':'Confira os valores: minutos inteiros até 1440, custos até um milhão com duas casas e taxas mais margem abaixo de 100%.';return;
    }
    if(action==='negocio-recebido'||action==='negocio-quitar'){
      if(!canEdit()||!mesAberto())return;
      const kind=action==='negocio-recebido'?'receita':'despesa';
      const row=S.lanc.find(x=>x.id===button.dataset.id&&x.tipo===kind&&x.status!=='pago');
      if(!row||!confirm('Confirmar '+(kind==='receita'?'recebimento':'pagamento')+' de '+brl(row.valor)+' — '+row.descricao+'? Isso atualiza o registro; não movimenta dinheiro.'))return;
      const changed=await q(sb.from('lancamentos').update({status:'pago',data_pagamento:dataLocalISO()})
        .eq('id',row.id).eq('familia_id',S.fam.id).eq('mes_id',S.mes.id).eq('tipo',kind).neq('status','pago').select('id').maybeSingle());
      await loadMes();toast(changed?'Registro atualizado.':'Esse lançamento já foi atualizado.');return;
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
  window.CFBusinessUI={mode,options,settings,view,handle,loadServices,loadRows};
})();
