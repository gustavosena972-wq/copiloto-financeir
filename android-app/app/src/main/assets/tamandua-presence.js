/* A visible, rotatable character; voice still asks for deliberate user input. */
(() => {
  function decorate() {
    const root=document.querySelector('#cf-tm-root'),head=root?.querySelector('.cf-tm-head');
    if(!head) return;
    if(!head.querySelector('.cf-companion-presence')) {
      const presence=document.createElement('div');presence.className='cf-companion-presence';
      presence.innerHTML='<div class="cf-inline-character" role="group" aria-label="Personagem Tamanduá 3D"><div class="cf-character-fallback" role="img" aria-label="Tamanduá com roupa formal"></div><span role="status">Preparando seu Tamanduá…</span></div><div class="cf-presence-copy"><strong>Estou por aqui.</strong><p>Gire meu personagem ou me conte o que quer organizar.</p><button type="button" data-act="explore3d">Ampliar personagem</button></div>';
      head.append(presence);
      const host=presence.querySelector('.cf-inline-character');
      import('./financial-world.js').then(world=>world.mountCharacter(host)).catch(()=>{if(host.isConnected){host.querySelector('[role="status"]')?.remove();presence.querySelector('p').textContent='Converse comigo por texto ou voz. O 3D não carregou neste dispositivo.';}});
    }
    const voice=root.querySelector('.cf-tm-icon');
    const input=root.querySelector('.cf-tm-input');if(input)input.placeholder='Escreva aqui…';
    if(voice && !voice.dataset.faceVoice) {
      voice.dataset.faceVoice='1';voice.innerHTML='<img src="tamandua-mark.svg" alt=""><span>Fala comigo</span>';
      voice.setAttribute('aria-label','Fala comigo — ditar mensagem');voice.title='Toque para ditar. Revise o texto antes de enviar.';
    }
    const compose=root.querySelector('.cf-tm-compose');
    if(compose && !compose.querySelector('.cf-chat-privacy-link')) {
      const link=document.createElement('button');link.className='cf-chat-privacy-link';link.type='button';link.dataset.act='legal';link.dataset.t='privacidade';link.textContent='Como seus dados são usados';compose.append(link);
    }
  }
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});decorate();
})();
