/* One conversation workspace; its history remains inside the same private root. */
(() => {
  const $=s=>document.querySelector(s);
  function current(){try{return S}catch(_){return {}}}
  function decorate(){
    const root=$('#cf-tm-root'),panel=root?.querySelector('.cf-tm-panel');if(!panel)return;
    if(!panel.dataset.workspace){
      panel.dataset.workspace='1';
      const side=document.createElement('aside');side.className='cf-chat-sidebar';side.setAttribute('aria-label','Conversas e ferramentas do Tamanduá');
      side.innerHTML='<div class="cf-side-brand"><img src="tamandua-mark.svg" alt=""><div><strong>Tamanduá</strong><small>Seu espaço financeiro</small></div></div><nav aria-label="Ferramentas da conversa"><button type="button" data-chat-tool="chat">Conversar</button><button type="button" data-chat-tool="sim">Planejar um cenário</button><button type="button" class="cf-side-preferences">Memória e lembretes</button></nav><div class="cf-history-title"><h2>Conversas salvas</h2><button type="button" class="cf-history-refresh" aria-label="Atualizar conversas">Atualizar</button></div><label class="cf-history-search">Buscar no histórico<input type="search" placeholder="Encontre uma conversa"></label>';
      const tabs=document.createElement('div');
      tabs.className='cf-sidebar-tabs';
      tabs.setAttribute('role','group');
      tabs.setAttribute('aria-label','Conteúdo da lateral');
      tabs.innerHTML='<button type="button" data-side-mode="conversas">Conversas</button><button type="button" data-side-mode="tarefas">Ferramentas</button>';
      side.querySelector('.cf-side-brand').after(tabs);
      const setMode=mode=>{
        side.dataset.mode=mode;
        tabs.querySelectorAll('button').forEach(button=>{
          button.setAttribute('aria-pressed',String(button.dataset.sideMode===mode));
        });
      };
      tabs.querySelectorAll('button').forEach(button=>button.onclick=()=>setMode(button.dataset.sideMode));
      setMode('conversas');
      const history=panel.querySelector('.cf-tm-view[data-v="history"]');if(history)side.append(history);
      const footer=document.createElement('p');footer.className='cf-side-private';footer.textContent='Seu histórico é da sua conta, dentro da sua família.';side.append(footer);panel.prepend(side);
      const drawer=document.createElement('dialog');drawer.id='cf-chat-sidebar-dialog';drawer.className='cf-chat-sidebar-dialog';drawer.innerHTML='<form method="dialog"><button aria-label="Fechar menu do Tamanduá">Fechar</button></form>';panel.append(drawer);
      const close=()=>{if(drawer.open)drawer.close();};
      drawer.addEventListener('close',()=>{if(panel.isConnected)panel.prepend(side);});
      const menu=document.createElement('button');menu.type='button';menu.className='cf-chat-menu';menu.setAttribute('aria-label','Conversas e ferramentas');menu.textContent='Conversas';menu.onclick=()=>{drawer.append(side);drawer.showModal();};
      panel.querySelector('.cf-tm-head').append(menu);
      side.querySelectorAll('[data-chat-tool]').forEach(button=>button.onclick=()=>{panel.querySelector('[data-t="'+button.dataset.chatTool+'"]')?.click();close();});
      side.querySelector('.cf-side-preferences').onclick=()=>{close();window.dispatchEvent(new Event('copiloto:tamandua-preferences'));};
      side.querySelector('.cf-history-refresh').onclick=()=>window.dispatchEvent(new Event('copiloto:tamandua-history-refresh'));
      side.querySelector('input').oninput=event=>{const query=event.target.value.toLocaleLowerCase('pt-BR');side.querySelectorAll('.cf-tm-conv').forEach(button=>button.hidden=!button.textContent.toLocaleLowerCase('pt-BR').includes(query));};
      side.addEventListener('click',event=>{if(event.target.closest('.cf-tm-conv'))close();});
    }
    const state=current();if(state.view==='tamandua'&&state.user?.id&&state.fam?.id&&!root.dataset.historyLoaded){
      root.dataset.historyLoaded='1';window.dispatchEvent(new Event('copiloto:tamandua-history-refresh'));
    }
  }
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});decorate();
})();
