/* The approved plan portrait is the voice control and conversation backdrop.
   No live 3D renderer is mounted inside the conversation. */
(() => {
  function state(){try{return S}catch(_){return {}}}
  function decorate(){
    const root=document.querySelector('#cf-tm-root'),head=root?.querySelector('.cf-tm-head');if(!head)return;
    const tier=state().fam?.plano||'pro';root.dataset.portrait=tier;
    const voice=root.querySelector('.cf-tm-icon');
    if(voice&&!voice.dataset.planFace){voice.dataset.planFace='1';voice.replaceChildren();const face=document.createElement('span');face.className='cf-plan-face';face.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent='Fala comigo';voice.append(face,label);voice.setAttribute('aria-label','Fala comigo — ditar mensagem');voice.title='Toque para ditar; toque novamente para cancelar. Revise antes de enviar.';}
    const body=root.querySelector('.cf-tm-body');
    if(body&&!body.querySelector('.cf-chat-face')){const face=document.createElement('div');face.className='cf-chat-face';face.setAttribute('aria-hidden','true');face.innerHTML='<i></i><i></i><i></i>';body.prepend(face);}
    const side=root.querySelector('.cf-chat-sidebar'),welcome=root.querySelector('.cf-chat-welcome');
    if(side&&welcome&&!welcome.dataset.focused){
      welcome.dataset.focused='1';
      const setup=welcome.querySelector('.cf-introduce');if(setup){setup.classList.add('cf-side-setup');setup.textContent='Configure seu app';side.querySelector('nav').after(setup);}
      const choices=welcome.querySelector('.cf-chat-suggestions');if(choices)side.append(choices);
      const settings=root.querySelector('.cf-voice-settings');if(settings)side.append(settings);
      welcome.querySelector('h2').textContent='O que vamos organizar hoje?';
      welcome.querySelector('p').textContent='Pode falar do seu jeito. As ferramentas ficam no menu lateral.';
    }
    const compose=root.querySelector('.cf-tm-compose');
    if(compose&&!compose.querySelector('.cf-chat-privacy-link')){const link=document.createElement('button');link.className='cf-chat-privacy-link';link.type='button';link.dataset.act='legal';link.dataset.t='privacidade';link.textContent='Como seus dados são usados';compose.append(link);}
  }
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});decorate();
})();
