/* Android interface refinement. No financial mutations or background scheduling. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 let pendingProfile=null,savingProfile=false;
 function state(){try{return typeof S!=='undefined'?S:window.S||{}}catch(_){return {}}}
 async function persistProfile(){
  const current=state(),user=current.user?.id,family=current.fam?.id;
  if(!pendingProfile||!user)return;
  if((pendingProfile.owner&&pendingProfile.owner!==user)||(pendingProfile.family&&pendingProfile.family!==family)){pendingProfile=null;return;}
  pendingProfile.owner=user;
  if(!family||savingProfile||typeof mobileLearnFromInteraction!=='function')return;
  savingProfile=true;const draft=pendingProfile,scope=JSON.stringify([user,family]);
  try{
   const profile={version:2,savedAt:new Date().toISOString()};
   if(draft.name)profile.nome_preferido=draft.name;
   if(draft.goal){profile.objetivo=draft.goal;profile.melhorar=[{'organizar contas':'organizar','reduzir dívidas':'dividas','guardar dinheiro':'economizar','entender gastos':'controle'}[draft.goal]];}
   await mobileLearnFromInteraction(profile);
   if(JSON.stringify([state().user?.id,state().fam?.id])===scope)state().tamanduaProfile=profile;
   if(pendingProfile===draft)pendingProfile=null;
  }catch(_){if(pendingProfile===draft)pendingProfile=null;if(typeof toast==='function')toast('Não foi possível salvar suas preferências. Você pode configurar o Tamanduá novamente.',1);}
  finally{savingProfile=false;}
 }
 function welcomeKey(){return window.CFTamanduaSession?.onboardingKey(state())||null;}
 function introduce(){
  const scope=welcomeKey();if(!scope||!$('.app-shell')||$('#cf-welcome'))return;
  const dialog=document.createElement('dialog');dialog.id='cf-welcome';dialog.className='cf-welcome';dialog.dataset.scope=scope;
  dialog.innerHTML='<form method="dialog"><button class="cf-welcome-close" aria-label="Fechar apresentação">Fechar</button></form><div class="cf-welcome-picture" role="img" aria-label="Tamanduá dando boas-vindas"></div><div class="cf-welcome-copy"><p class="cf-step">Vamos nos conhecer</p><h2>Prazer, sou o seu Tamanduá.</h2><p>Eu ajudo você a entender suas finanças e escolher o próximo passo. Você decide o que compartilhar.</p><form id="cf-welcome-form"><label>Como você prefere ser chamado?<input name="nome" autocomplete="given-name" maxlength="60" placeholder="Seu primeiro nome, se quiser"></label><fieldset><legend>O que você quer cuidar primeiro?</legend><label><input type="radio" name="objetivo" value="organizar contas">Organizar minhas contas</label><label><input type="radio" name="objetivo" value="reduzir dívidas">Sair das dívidas</label><label><input type="radio" name="objetivo" value="guardar dinheiro">Guardar dinheiro</label><label><input type="radio" name="objetivo" value="entender gastos">Entender meus gastos</label></fieldset><p class="cf-private-note">Tudo é opcional. Você pode importar uma planilha na aba Planilha e revisar os dados antes de salvar.</p><button type="submit">Ver meu próximo passo</button></form><p id="cf-welcome-result" role="status"></p><small>Configuração opcional. Suas preferências ficam vinculadas à sua própria conta.</small></div>';
  const form=dialog.querySelector('#cf-welcome-form');form.hidden=true;
  const choices=document.createElement('div');choices.className='cf-welcome-choices';
  choices.innerHTML='<button type="button" class="cf-configure">Configurar meu Tamanduá</button><button type="button" class="cf-skip">Pular por enquanto</button>';
  form.before(choices);choices.querySelector('.cf-configure').onclick=()=>{choices.hidden=true;form.hidden=false;form.querySelector('input').focus();};
  choices.querySelector('.cf-skip').onclick=()=>dialog.close();
  const enter=document.createElement('button');enter.type='button';enter.className='cf-enter-app';enter.textContent='Continuar para o aplicativo';enter.hidden=true;form.after(enter);enter.onclick=()=>dialog.close();
  form.addEventListener('submit',()=>{enter.hidden=false;});
  document.body.append(dialog);dialog.addEventListener('close',()=>{try{if(welcomeKey()===scope)localStorage.setItem(scope,'seen');}catch(_){}dialog.remove();});
  $('#cf-welcome-form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget);const name=String(data.get('nome')||'').trim().slice(0,60);const selected=String(data.get('objetivo')||'');const goal=['organizar contas','reduzir dívidas','guardar dinheiro','entender gastos'].includes(selected)?selected:'';pendingProfile={name,goal,owner:state().user?.id||null,family:state().fam?.id||null};$('#cf-welcome-result').textContent=(name?name+', vamos':'Vamos')+' começar por '+(goal||'entender suas finanças')+'. Suas preferências opcionais serão guardadas no seu próprio perfil.';persistProfile();};
  dialog.showModal();
 }
 function polish(){
  const key=welcomeKey(),existing=$('#cf-welcome');
  if(existing&&existing.dataset.scope!==key)existing.close();
  let seen=false;try{seen=key&&localStorage.getItem(key)==='seen';}catch(_){}
  if(window.CFTamanduaSession?.shouldIntroduce(state(),!!$('.app-shell'),seen))introduce();
  persistProfile();
  const badge=$('.cf-tester-badge');if(badge&&!badge.dataset.refined){badge.dataset.refined='1';badge.innerHTML='<span>Versão de teste</span><span>Sem cobranças</span>';}
  const home=$('[data-current-view="inicio"] .v0-mobile-dashboard')||$('[data-current-view="inicio"] .app-content');
  if(home){const analysis=home.querySelector('.mobile-analysis'),open=home.querySelector('[data-v="planilha"]');if(analysis&&open&&analysis.nextElementSibling!==open)open.before(analysis);}
  const panel=$('.cf-tm-panel');if(!panel||panel.dataset.refined)return;
  panel.dataset.refined='1';
  const header=panel.querySelector('.cf-tm-head');
  const back=document.createElement('button');back.type='button';back.className='cf-tm-back';back.dataset.act='view';back.dataset.v='inicio';back.setAttribute('aria-label','Voltar ao início');back.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';header.prepend(back);
  const fresh=document.createElement('button');fresh.type='button';fresh.className='cf-tm-new';fresh.setAttribute('aria-label','Nova conversa');fresh.title='Nova conversa';fresh.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';fresh.onclick=()=>window.dispatchEvent(new Event('copiloto:tamandua-new'));header.append(fresh);
  const composer=panel.querySelector('.cf-tm-input');composer.placeholder='Converse com seu Tamanduá';composer.addEventListener('input',()=>{composer.style.height='auto';composer.style.height=Math.min(150,composer.scrollHeight)+'px';});
  const mic=panel.querySelector('.cf-tm-icon');mic.setAttribute('aria-label','Ditar mensagem');mic.title='Ditar uma mensagem e revisar antes de enviar';mic.setAttribute('aria-pressed','false');
  panel.querySelector('[data-t="history"]').textContent='Histórico';
  panel.setAttribute('aria-label','Conversa com o Tamanduá');const log=panel.querySelector('.cf-tm-messages');log?.setAttribute('role','log');log?.setAttribute('aria-live','polite');log?.setAttribute('aria-relevant','additions text');
  const head=panel.querySelector('.cf-tm-head-copy span');if(head)head.textContent='Seu copiloto financeiro';
  const intro=panel.querySelector('.cf-tm-view[data-v="chat"] .cf-tm-note');
  if(intro){intro.className='cf-chat-welcome';intro.innerHTML='<div class="cf-chat-portrait" role="img" aria-label="Tamanduá, seu companheiro financeiro"></div><h2>Por onde vamos começar?</h2><p>Posso ajudar a entender o mês, organizar suas contas e encontrar espaço para seus objetivos.</p><button type="button" class="cf-introduce">Conheça seu Tamanduá</button><div class="cf-chat-suggestions" aria-label="Sugestões para começar"><button data-prompt="Faça uma análise dos lançamentos deste mês, destacando o que posso melhorar.">Analisar meu mês</button><button data-prompt="Quais contas preciso conferir primeiro e por quê?">Revisar minhas contas</button><button data-prompt="Ajude-me a planejar uma economia mensal realista com base nos meus lançamentos.">Planejar uma economia</button></div><p class="cf-task-explanation">Posso analisar e orientar. Por enquanto, as alterações nos dados são feitas na Planilha.</p>';intro.querySelector('.cf-introduce').onclick=introduce;intro.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{const input=panel.querySelector('.cf-tm-input');input.value=b.dataset.prompt;input.focus();});}
  const language=panel.querySelector('#cf-tm-lang');if(language){const note=language.closest('.cf-tm-note');if(note&&!note.closest('details')){const details=document.createElement('details');details.className='cf-voice-settings';const summary=document.createElement('summary');summary.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l5-4v16l-5-4H4zM17 8a6 6 0 010 8"/></svg>Voz e idioma';note.before(details);details.append(summary,note);}}
 }
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;polish();});}).observe(document.body,{childList:true,subtree:true});polish();

})();
