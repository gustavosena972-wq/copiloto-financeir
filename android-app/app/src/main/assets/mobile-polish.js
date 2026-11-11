/* Android interface refinement. No financial mutations or background scheduling. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 const questions=[
  ['nome_preferido','Como você prefere ser chamado?'],
  ['objetivo','Qual é sua prioridade agora?',['Organizar contas','Reduzir dívidas','Guardar dinheiro','Entender gastos']],
  ['organizacao_atual','Como você organiza suas contas hoje?',['Planilha','Outro app','Papel ou anotações','Ainda não organizo']],
  ['ritmo_renda','Como a renda costuma chegar?',['Regular','Varia de mês a mês','Parte regular, parte variável']],
  ['dificuldade','O que mais atrapalha sua organização?',['Esquecer vencimentos','Separar gastos','Lidar com parcelas','Planejar o mês']],
  ['reserva','Como está sua reserva para imprevistos?',['Quero começar','Já estou montando','Quero manter']],
  ['frequencia','Com que frequência você quer revisar as contas?',['Durante a semana','Uma vez por mês','Quando precisar']],
  ['tipo_ajuda','Em que tarefa você quer ajuda primeiro?',['Importar planilha','Categorizar gastos','Revisar contas a pagar','Planejar uma meta']],
  ['estilo_resposta','Como prefere receber as explicações?',['Direto ao ponto','Passo a passo','Com exemplos']],
  ['proatividade','Quando prefere receber sugestões do Tamanduá?',['Quando eu pedir','Quando eu revisar o mês','Quando houver algo relevante']]
 ];
 function state(){try{return typeof S!=='undefined'?S:window.S||{}}catch(_){return {}}}
 function welcomeKey(){return window.CFTamanduaSession?.onboardingKey(state())||null;}
 function introduce(){
  const scope=welcomeKey();
  if(!scope||!$('.app-shell')||$('#cf-welcome'))return;
  const dialog=document.createElement('dialog');
  dialog.id='cf-welcome';
  dialog.className='cf-welcome';
  dialog.dataset.scope=scope;
  dialog.innerHTML=`<form method="dialog"><button class="cf-welcome-close" aria-label="Fechar apresentação">Fechar</button></form>
   <div class="cf-welcome-picture" role="img" aria-label="Tamanduá ilustrado de frente, usando blazer"></div>
   <div class="cf-welcome-copy">
     <h2>Prazer, sou o seu Tamanduá.</h2>
     <p>Conte como você prefere organizar seu dinheiro. Vou usar suas escolhas para adaptar a ajuda.</p>
     <div class="cf-welcome-choices">
       <button type="button" class="cf-configure">Configurar meu Tamanduá</button>
       <button type="button" class="cf-skip">Pular por enquanto</button>
     </div>
     <form id="cf-welcome-form" hidden>
       <p class="cf-question-count" aria-live="polite"></p>
       <label for="cf-question-answer" class="cf-question-label"></label>
       <div class="cf-question-field"></div>
       <p class="cf-private-note">Responda só o que quiser. Suas escolhas ficam vinculadas à sua conta.</p>
       <div class="cf-question-actions">
         <button type="button" class="cf-question-back">Voltar</button>
         <button type="button" class="cf-question-skip">Pular</button>
         <button type="submit" class="cf-question-next">Continuar</button>
       </div>
       <p role="status" class="cf-question-status"></p>
     </form>
   </div>`;
  const form=dialog.querySelector('#cf-welcome-form');
  const draft={};
  const previous=state().tamanduaProfile||{};
  for(const [key,,options] of questions){
   const value=previous[key];
   if(typeof value!=='string')continue;
   const answer=options?options.find(option=>option.toLowerCase()===value.toLowerCase()):value.slice(0,60);
   if(answer)draft[key]=answer;
  }
  let step=0;
  const count=form.querySelector('.cf-question-count');
  const label=form.querySelector('.cf-question-label');
  const field=form.querySelector('.cf-question-field');
  const back=form.querySelector('.cf-question-back');
  const skip=form.querySelector('.cf-question-skip');
  const next=form.querySelector('.cf-question-next');
  const status=form.querySelector('.cf-question-status');
  let answer,saving=false;
  function showQuestion(){
   const [key,prompt,options]=questions[step];
   count.textContent=`Pergunta ${step+1} de ${questions.length}`;
   label.textContent=prompt;
   if(options){
    answer=document.createElement('select');
    answer.add(new Option('Selecione uma opção',''));
    options.forEach(option=>answer.add(new Option(option,option)));
   }else{
    answer=document.createElement('input');
    answer.autocomplete='given-name';
    answer.maxLength=60;
    answer.placeholder='Seu primeiro nome';
   }
   answer.id='cf-question-answer';
   answer.value=draft[key]||'';
   field.replaceChildren(answer);
   status.textContent='';
   back.hidden=step===0;
   next.textContent=step===questions.length-1?'Salvar preferências':'Continuar';
   count.tabIndex=-1;
   count.focus();
  }
  function recordAnswer(value){
   const [key,,options]=questions[step];
   if(value&&(!options||options.includes(value)))draft[key]=value;
   else delete draft[key];
  }
  async function advance(){
   if(step<questions.length-1){step++;showQuestion();return;}
   if(saving||welcomeKey()!==scope)return;
   const profile={version:3,savedAt:new Date().toISOString(),...draft};
   if(draft.objetivo){
    profile.melhorar=[{'Organizar contas':'organizar','Reduzir dívidas':'dividas','Guardar dinheiro':'economizar','Entender gastos':'controle'}[draft.objetivo]];
   }
   saving=true;
   form.querySelectorAll('button,input,select').forEach(control=>control.disabled=true);
   status.textContent='Salvando suas preferências…';
   try{
    await mobileLearnFromInteraction(profile);
    if(welcomeKey()!==scope||!dialog.isConnected)return;
    state().tamanduaProfile=profile;
    dialog.close();
    if(typeof toast==='function')toast('Preferências do Tamanduá salvas.');
   }catch(_){
    status.textContent='Não foi possível salvar. Confira a conexão e tente novamente.';
   }finally{
    saving=false;
    form.querySelectorAll('button,input,select').forEach(control=>control.disabled=false);
   }
  }
  const choices=dialog.querySelector('.cf-welcome-choices');
  choices.querySelector('.cf-configure').onclick=()=>{
   choices.hidden=true;
   form.hidden=false;
   dialog.classList.add('cf-configuring');
   showQuestion();
  };
  choices.querySelector('.cf-skip').onclick=()=>dialog.close();
  form.onsubmit=event=>{event.preventDefault();recordAnswer(answer.value.trim());void advance();};
  skip.onclick=()=>{recordAnswer('');void advance();};
  back.onclick=()=>{recordAnswer(answer.value.trim());step--;showQuestion();};
  document.body.append(dialog);
  dialog.addEventListener('close',()=>{
   try{if(welcomeKey()===scope)localStorage.setItem(scope,'seen');}catch(_){}
   dialog.remove();
  });
  dialog.showModal();
 }
 function polish(){
  const key=welcomeKey(),existing=$('#cf-welcome');
  if(existing&&existing.dataset.scope!==key)existing.close();
  let seen=false;try{seen=key&&localStorage.getItem(key)==='seen';}catch(_){}
  if(window.CFTamanduaSession?.shouldIntroduce(state(),!!$('.app-shell'),seen))introduce();
  const panel=$('.cf-tm-panel');if(!panel||panel.dataset.refined)return;
  panel.dataset.refined='1';
  const header=panel.querySelector('.cf-tm-head');
  const back=document.createElement('button');back.type='button';back.className='cf-tm-back';back.dataset.act='view';back.dataset.v='inicio';back.setAttribute('aria-label','Voltar ao início');back.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';header.prepend(back);
  const fresh=document.createElement('button');fresh.type='button';fresh.className='cf-tm-new';fresh.setAttribute('aria-label','Nova conversa');fresh.title='Nova conversa';fresh.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';fresh.onclick=()=>window.dispatchEvent(new Event('copiloto:tamandua-new'));header.append(fresh);
  const composer=panel.querySelector('.cf-tm-input');composer.placeholder='Converse com seu Tamanduá';composer.maxLength=2000;composer.addEventListener('input',()=>{composer.style.height='auto';composer.style.height=Math.min(150,composer.scrollHeight)+'px';});
  const mic=panel.querySelector('.cf-tm-icon');mic.setAttribute('aria-label','Ditar mensagem');mic.title='Ditar uma mensagem e revisar antes de enviar';mic.setAttribute('aria-pressed','false');
  panel.querySelector('[data-t="history"]').textContent='Histórico';
  panel.setAttribute('aria-label','Conversa com o Tamanduá');const log=panel.querySelector('.cf-tm-messages');log?.setAttribute('role','log');log?.setAttribute('aria-live','polite');log?.setAttribute('aria-relevant','additions text');
  const head=panel.querySelector('.cf-tm-head-copy span');if(head)head.textContent='Seu copiloto financeiro';
  const intro=panel.querySelector('.cf-tm-view[data-v="chat"] .cf-tm-note');
  if(intro){intro.className='cf-chat-welcome';intro.innerHTML='<div class="cf-chat-portrait" role="img" aria-label="Tamanduá, seu companheiro financeiro"></div><h2>Por onde vamos começar?</h2><p>Posso ajudar a entender o mês, organizar suas contas e encontrar espaço para seus objetivos.</p><button type="button" class="cf-introduce">Conheça seu Tamanduá</button><div class="cf-chat-suggestions" aria-label="Sugestões para começar"><button data-prompt="Faça uma análise dos lançamentos deste mês, destacando o que posso melhorar.">Analisar meu mês</button><button data-prompt="Quais contas preciso conferir primeiro e por quê?">Revisar minhas contas</button><button data-prompt="Ajude-me a planejar uma economia mensal realista com base nos meus lançamentos.">Planejar uma economia</button></div><p class="cf-task-explanation">Posso conversar, explicar e preparar tarefas para você revisar.</p>';intro.querySelector('.cf-introduce').onclick=introduce;intro.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{const input=panel.querySelector('.cf-tm-input');input.value=b.dataset.prompt;input.focus();});}
  const language=panel.querySelector('#cf-tm-lang');if(language){const note=language.closest('.cf-tm-note');if(note&&!note.closest('details')){const details=document.createElement('details');details.className='cf-voice-settings';const summary=document.createElement('summary');summary.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l5-4v16l-5-4H4zM17 8a6 6 0 010 8"/></svg>Voz e idioma';note.before(details);details.append(summary,note);}}
 }
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;polish();});}).observe(document.body,{childList:true,subtree:true});polish();

})();
