/* Reviewed tasks execute through the same authenticated RLS-protected tables
   as the ledger. Model output never becomes an executable database command. */
(() => {
 const core=window.CFTamanduaTaskCore;
 const current=()=>{try{return S}catch(_){return {}}};
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const snapshot=()=>{const s=current();return {...s,lanc:(s.lanc||[]).map(r=>({...r})),cats:(s.cats||[]).map(c=>({...c}))};};
 function dialog(title){
  document.querySelector('.cf-task-dialog')?.close();
  const d=document.createElement('dialog');d.className='cf-task-dialog';
  d.innerHTML='<form method="dialog" class="cf-task-heading"><h2>'+esc(title)+'</h2><button aria-label="Fechar tarefa">Fechar</button></form><div class="cf-task-content"></div>';
  document.body.append(d);d.addEventListener('close',()=>d.remove());d.addEventListener('cancel',e=>{if(d.dataset.busy==='1')e.preventDefault();});return d;
 }
 function organize(reply=()=>{}){
  const s=snapshot(),key=core.scope(s),rows=core.uncategorized(s),d=dialog('Organizar minha planilha'),host=d.querySelector('.cf-task-content');
  if(!core.editable(s)){host.textContent='Para organizar, entre como editor ou responsável e selecione um mês aberto.';d.showModal();return;}
  if(!rows.length){host.textContent='Os lançamentos carregados deste mês já têm categoria. Posso ajudar a registrar novos itens ou importar uma planilha pelo menu lateral.';d.showModal();return;}
  host.innerHTML='<p>Vou categorizar os itens que estão sem categoria neste mês. Mostro até 50 itens por vez. Confira as sugestões. Valores, datas e pagamentos permanecem iguais.</p><form class="cf-task-review">'+rows.map((row,i)=>'<label class="cf-task-row"><strong>'+esc(row.descricao)+'</strong><span>'+esc(row.tipo)+' · '+esc(row.valor)+'</span><select data-row="'+i+'" aria-label="Categoria de '+esc(row.descricao)+'"><option value="">Escolher categoria</option>'+core.categoryChoices(row,s.cats).map(c=>'<option value="'+esc(c.id)+'" '+(core.suggest(row,s.cats)===c.id?'selected':'')+'>'+esc(c.nome)+'</option>').join('')+'</select></label>').join('')+'<p role="status"></p><button type="submit">Confirmar categorias selecionadas</button></form>';
  const form=host.querySelector('form'),status=form.querySelector('[role="status"]'),button=form.querySelector('button');
  form.onsubmit=async event=>{
   event.preventDefault();if(button.disabled)return;button.disabled=true;d.dataset.busy='1';d.querySelector('.cf-task-heading button').disabled=true;
   try{
    const selections=[...form.querySelectorAll('select')].filter(x=>x.value).map(x=>({id:rows[Number(x.dataset.row)].id,categoryId:x.value}));
    if(!selections.length)throw Error('Escolha pelo menos uma categoria.');
    if(key!==core.scope(current()))throw Error('A conta ou o mês mudou. Abra a tarefa novamente.');
    status.textContent='Salvando as categorias revisadas…';
    const result=await core.applyCategories({snapshot:s,getState:current,selections,write:async(row,category)=>{
     let query=sb.from('lancamentos').update({categoria_id:category.id}).eq('id',row.id).eq('familia_id',s.fam.id).eq('mes_id',s.mes.id).is('categoria_id',null).eq('descricao',row.descricao).eq('valor',row.valor);
     if(row.atualizado_em)query=query.eq('atualizado_em',row.atualizado_em);
     const response=await query.select('id');if(response.error)throw response.error;return response.data?.length===1;
    }});
    if(key!==core.scope(current())){d.close();return;}
    const text=result.applied+' lançamento(s) categorizado(s).'+(result.skipped?' '+result.skipped+' item(ns) não foram alterados porque já mudaram ou estão indisponíveis.':'')+(result.failed?' A operação parou por uma falha; revise a planilha antes de tentar os restantes.':'');
    status.textContent=text;reply(text);
    form.querySelectorAll('select').forEach(x=>x.disabled=true);button.hidden=true;
    try{await loadMes();}catch(_){status.textContent+=' Não foi possível atualizar a visualização agora.';}
   }catch(error){status.textContent=error.message||'Não foi possível concluir. Revise a planilha.';}
   finally{delete d.dataset.busy;if(button.isConnected)button.disabled=false;const close=d.querySelector('.cf-task-heading button');if(close)close.disabled=false;}
  };d.showModal();
 }
 function entry(reply=()=>{}){
  const s=snapshot(),key=core.scope(s),d=dialog('Registrar com o Tamanduá'),host=d.querySelector('.cf-task-content');
  if(!core.editable(s)){host.textContent='Selecione um mês aberto e entre com permissão para editar.';d.showModal();return;}
  host.innerHTML='<p>Preencha os dados que você conhece. Vou registrar um lançamento pendente neste mês, após sua confirmação.</p><form class="cf-task-entry"><label>O que é?<input name="description" maxlength="160" required placeholder="Ex.: compra no mercado"></label><label>Tipo<select name="type"><option value="despesa">Despesa</option><option value="receita">Receita</option></select></label><label>Valor em reais<input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" required></label><label>Vencimento no mês selecionado<input name="date" type="date" required></label><p role="status"></p><button type="submit">Confirmar e registrar</button></form>';
  const form=host.querySelector('form'),status=form.querySelector('[role="status"]'),button=form.querySelector('button');let draftId=null,fingerprint=null;
  form.onsubmit=async event=>{
   event.preventDefault();if(button.disabled)return;button.disabled=true;d.dataset.busy='1';d.querySelector('.cf-task-heading button').disabled=true;
   try{
    if(key!==core.scope(current())||!core.editable(current()))throw Error('A conta, a permissão ou o mês mudou. Abra a tarefa novamente.');
    const data=new FormData(form),description=String(data.get('description')||'').trim(),amount=CFMoney.cents(data.get('amount')),date=CFMoney.day(data.get('date')),type=data.get('type');
    if(!description||description.length>160||!amount||!date||!['despesa','receita'].includes(type))throw Error('Confira descrição, tipo, valor e vencimento.');
    if(!date.startsWith(s.ano.ano+'-'+String(s.mes.mes).padStart(2,'0')+'-'))throw Error('O vencimento deve estar no mês selecionado. Troque o mês na planilha, se precisar.');
    const payload={familia_id:s.fam.id,mes_id:s.mes.id,descricao:description,valor:amount/100,tipo:type,status:'pendente',data_vencimento:date,criado_por:s.user.id};
    const hash=JSON.stringify(payload);if(hash!==fingerprint){fingerprint=hash;draftId=crypto.randomUUID();}
    status.textContent='Registrando…';const response=await sb.from('lancamentos').insert({id:draftId,...payload}).select('id');
    if(response.error&&response.error.code!=='23505')throw response.error;
    let saved=response.data?.length===1;
    if(response.error?.code==='23505'){const check=await sb.from('lancamentos').select('id').eq('id',draftId).eq('familia_id',s.fam.id).eq('mes_id',s.mes.id).eq('descricao',description).eq('valor',amount/100).eq('tipo',type).eq('data_vencimento',date);saved=!check.error&&check.data?.length===1;}
    if(key!==core.scope(current())){d.close();return;}
    if(!saved)throw Error('O servidor não confirmou o registro. Confira a planilha antes de tentar novamente.');
    status.textContent='Lançamento registrado como pendente. Nenhum pagamento foi executado.';reply(status.textContent);button.hidden=true;form.querySelectorAll('input,select').forEach(x=>x.disabled=true);
    try{await loadMes();}catch(_){status.textContent+=' Atualize a planilha para consultar o registro.';}
   }catch(error){status.textContent=error.message||'Não foi possível concluir o registro.';}finally{delete d.dataset.busy;button.disabled=false;const close=d.querySelector('.cf-task-heading button');if(close)close.disabled=false;}
  };d.showModal();
 }
 function importSheet(){const s=current();if(!core.editable(s)){organize();return;}s.view='planilha';render();queueMicrotask(()=>{const file=document.querySelector('#arq');if(file)file.click();else toast('Abra Ferramentas da planilha para importar um arquivo.',1);});}
 function handle(message,{reply=()=>{}}={}){const intent=core.intent(message);if(intent==='categorize'){organize(reply);return true;}if(intent==='entry'){entry(reply);return true;}if(intent==='import'){importSheet();return true;}return false;}
 window.CFTamanduaActions={handle};
 function decorate(){const side=document.querySelector('#cf-tm-root .cf-chat-sidebar');if(!side||side.querySelector('.cf-side-tasks'))return;const tools=document.createElement('nav');tools.className='cf-side-tasks';tools.setAttribute('aria-label','Tarefas que posso fazer');tools.innerHTML='<button type="button" data-task="categorize">Organizar minha planilha</button><button type="button" data-task="entry">Registrar receita ou despesa</button><button type="button" data-task="import">Trazer minha planilha</button>';tools.addEventListener('click',e=>{const task=e.target.closest('[data-task]')?.dataset.task;if(!task)return;document.querySelector('#cf-chat-sidebar-dialog[open]')?.close();if(task==='categorize')organize();if(task==='entry')entry();if(task==='import')importSheet();});side.querySelector('nav').after(tools);}
 new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});decorate();
})();
