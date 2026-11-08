/* Android interface refinement. No financial mutations or background scheduling. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 function introduce(){
  if($('#cf-welcome'))return;
  const dialog=document.createElement('dialog');dialog.id='cf-welcome';dialog.className='cf-welcome';
  dialog.innerHTML='<form method="dialog"><button class="cf-welcome-close" aria-label="Fechar apresenta��o">Fechar</button></form><div class="cf-welcome-picture" role="img" aria-label="Tamandu� dando boas-vindas"></div><div class="cf-welcome-copy"><p class="cf-step">Vamos nos conhecer</p><h2>Prazer, sou o seu Tamandu�.</h2><p>Eu ajudo voc� a entender suas finan�as e escolher o pr�ximo passo. Voc� decide o que compartilhar.</p><form id="cf-welcome-form"><label>Como voc� prefere ser chamado?<input name="nome" autocomplete="given-name" maxlength="60" placeholder="Seu primeiro nome, se quiser"></label><fieldset><legend>O que voc� quer cuidar primeiro?</legend><label><input type="radio" name="objetivo" value="organizar contas">Organizar minhas contas</label><label><input type="radio" name="objetivo" value="reduzir d�vidas">Sair das d�vidas</label><label><input type="radio" name="objetivo" value="guardar dinheiro">Guardar dinheiro</label><label><input type="radio" name="objetivo" value="entender gastos">Entender meus gastos</label></fieldset><p class="cf-private-note">Tudo � opcional. Depois de criar sua conta, voc� poder� importar uma planilha e revisar os dados antes de salvar.</p><button type="submit">Ver meu pr�ximo passo</button></form><p id="cf-welcome-result" role="status"></p><small>Pr�via da apresenta��o. Estas respostas n�o ser�o gravadas.</small></div>';
  const form=dialog.querySelector('#cf-welcome-form');form.hidden=true;
  const choices=document.createElement('div');choices.className='cf-welcome-choices';
  choices.innerHTML='<button type="button" class="cf-configure">Configurar meu Tamandu�</button><button type="button" class="cf-skip">Pular por enquanto</button>';
  form.before(choices);choices.querySelector('.cf-configure').onclick=()=>{choices.hidden=true;form.hidden=false;form.querySelector('input').focus();};
  choices.querySelector('.cf-skip').onclick=()=>dialog.close();
  const enter=document.createElement('button');enter.type='button';enter.className='cf-enter-app';enter.textContent='Continuar para o aplicativo';enter.hidden=true;form.after(enter);enter.onclick=()=>dialog.close();
  form.addEventListener('submit',()=>{enter.hidden=false;});
  document.body.append(dialog);dialog.addEventListener('close',()=>{try{localStorage.setItem('cf_android_welcome_v1','seen');}catch(_){}dialog.remove();});
  $('#cf-welcome-form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget);const name=String(data.get('nome')||'').trim();const goal=String(data.get('objetivo')||'entender suas finan�as');$('#cf-welcome-result').textContent=(name?name+', vamos':'Vamos')+' come�ar por '+goal+'. O primeiro passo � conferir suas entradas e contas do m�s. Voc� poder� mudar esse objetivo depois.';};
  dialog.showModal();
 }
 function polish(){
  const badge=$('.cf-tester-badge');if(badge&&!badge.dataset.refined){badge.dataset.refined='1';badge.innerHTML='<span>Vers�o de teste</span><span>Sem cobran�as</span>';}
  const home=$('[data-current-view="inicio"] .v0-mobile-dashboard')||$('[data-current-view="inicio"] .app-content');
  if(home){const analysis=home.querySelector('.mobile-analysis'),open=home.querySelector('[data-v="planilha"]');if(analysis&&open&&analysis.nextElementSibling!==open)open.before(analysis);}
  const panel=$('.cf-tm-panel');if(!panel||panel.dataset.refined)return;
  panel.dataset.refined='1';panel.setAttribute('aria-label','Conversa com o Tamandu�');
  const head=panel.querySelector('.cf-tm-head-copy span');if(head)head.textContent='Seu companheiro para cuidar do dinheiro';
  const intro=panel.querySelector('.cf-tm-view[data-v="chat"] .cf-tm-note');
  if(intro){intro.className='cf-chat-welcome';intro.innerHTML='<div class="cf-chat-portrait" role="img" aria-label="Tamandu�, seu companheiro financeiro"></div><h2>Vamos cuidar do seu pr�ximo passo?</h2><p>Posso ajudar a entender o m�s, organizar suas contas e encontrar espa�o para seus objetivos.</p><button type="button" class="cf-introduce">Conhe�a seu Tamandu�</button><div class="cf-chat-suggestions" aria-label="Sugest�es para come�ar"><button data-prompt="Fa�a uma an�lise dos lan�amentos deste m�s, destacando o que posso melhorar.">Analisar meu m�s</button><button data-prompt="Quais contas preciso conferir primeiro e por qu�?">Revisar minhas contas</button><button data-prompt="Ajude-me a planejar uma economia mensal realista com base nos meus lan�amentos.">Planejar uma economia</button></div><p class="cf-task-explanation">Voc� pode pedir tarefas. Altera��es nos seus dados precisam ser revisadas e confirmadas antes da execu��o.</p>';intro.querySelector('.cf-introduce').onclick=introduce;intro.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{const input=panel.querySelector('.cf-tm-input');input.value=b.dataset.prompt;input.focus();});}
  const language=panel.querySelector('#cf-tm-lang');if(language){const note=language.closest('.cf-tm-note');if(note&&!note.closest('details')){const details=document.createElement('details');details.className='cf-voice-settings';const summary=document.createElement('summary');summary.textContent='Prefer�ncias de voz';note.before(details);details.append(summary,note);}}
 }
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;polish();});}).observe(document.body,{childList:true,subtree:true});polish();
 try{if(!localStorage.getItem('cf_android_welcome_v1'))introduce();}catch(_){introduce();}
})();
