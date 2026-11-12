/* Chat artwork and shortcuts, independent of the conversation and voice controls. */
(() => {
  function state(){try{return S}catch(_){return {}}}
  function mountBackdrop(body){
    if(!body||body.querySelector('.cf-chat-backdrop'))return;
    const backdrop=document.createElement('div');
    backdrop.className='cf-chat-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    const tiles=document.createElement('div');
    tiles.className='cf-chat-tiles';
    for(let i=0;i<9;i++){
      const tile=document.createElement('span');
      tile.style.setProperty('--tile-x',((i%3)-1)*44+'px');
      tile.style.setProperty('--tile-y',(Math.floor(i/3)-1)*44+'px');
      tile.style.setProperty('--tile-delay',i*16+'ms');
      tiles.append(tile);
    }
    backdrop.append(tiles);
    body.prepend(backdrop);

    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    body.addEventListener('click',event=>{
      if(event.target.closest('.cf-tm-msg,button,input,select,textarea,a,form')||window.getSelection()?.toString())return;
      if(reducedMotion.matches||document.documentElement.dataset.screenMotion==='off')return;
      tiles.getAnimations({subtree:true}).forEach(animation=>{
        if(animation.animationName==='cf-chat-assemble'){animation.currentTime=0;animation.play();}
      });
    });
  }
  function decorate(){
    const root=document.querySelector('#cf-tm-root'),head=root?.querySelector('.cf-tm-head');if(!head)return;
    const tier=state().fam?.plano||'pro';root.dataset.portrait=tier;
    const voice=root.querySelector('.cf-tm-icon');
    if(voice&&!voice.dataset.planFace){voice.dataset.planFace='1';voice.replaceChildren();const face=document.createElement('span');face.className='cf-plan-face';face.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent='Fala comigo';voice.append(face,label);voice.setAttribute('aria-label','Fala comigo — ditar mensagem');voice.title='Toque para ditar; toque novamente para cancelar. Revise antes de enviar.';}
    mountBackdrop(root.querySelector('.cf-tm-body'));
    const side=root.querySelector('.cf-chat-sidebar'),welcome=root.querySelector('.cf-chat-welcome');
    if(side&&welcome&&!welcome.dataset.focused){
      welcome.dataset.focused='1';
      const setup=welcome.querySelector('.cf-introduce');if(setup){setup.classList.add('cf-side-setup');setup.textContent='Configure seu app';side.querySelector('nav').after(setup);}
      const choices=welcome.querySelector('.cf-chat-suggestions');if(choices)side.append(choices);
      const settings=root.querySelector('.cf-voice-settings');if(settings)side.append(settings);
      welcome.querySelector('h2').textContent='O que vamos organizar hoje?';
      welcome.querySelector('p').textContent='Pode falar do seu jeito. As ferramentas ficam no menu lateral.';
      const help=document.createElement('button');help.type='button';help.className='cf-portrait-help';
      help.innerHTML='<span class="cf-plan-face" aria-hidden="true"></span><span>Vamos começar juntos<span>Configurar meu Tamanduá e encontrar tarefas</span></span>';
      help.onclick=()=>{
        if(!state().tamanduaProfile?.savedAt){root.querySelector('.cf-side-setup')?.click();return;}
        if(matchMedia('(max-width:760px)').matches)root.querySelector('.cf-chat-menu')?.click();
        root.querySelector('[data-side-mode="tarefas"]')?.click();
        root.querySelector('.cf-side-tasks button')?.focus();
      };
      welcome.append(help);
    }
    const compose=root.querySelector('.cf-tm-compose');
    if(compose&&!compose.querySelector('.cf-chat-privacy-link')){const link=document.createElement('button');link.className='cf-chat-privacy-link';link.type='button';link.dataset.act='legal';link.dataset.t='privacidade';link.textContent='Como seus dados são usados';compose.append(link);}
  }
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});decorate();
})();

