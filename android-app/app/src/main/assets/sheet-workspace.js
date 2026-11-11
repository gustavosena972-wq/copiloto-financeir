/* Keep the ledger for records; file and month tools open in a side drawer. */
(() => {
 function decorate(){
  const shell=document.querySelector('.app-shell'),tools=shell?.querySelector('.cf-sheet-tools');
  if(tools&&!tools.dataset.drawer){
   tools.dataset.drawer='1';
   const drawer=document.createElement('dialog');drawer.id='cf-sheet-drawer';drawer.className='cf-sheet-drawer';drawer.setAttribute('aria-label','Ferramentas da planilha');
   drawer.innerHTML='<form method="dialog" class="cf-sheet-drawer-head"><h2>Sua planilha</h2><button aria-label="Fechar ferramentas da planilha">Fechar</button></form><section><h3>Importar e exportar</h3><p>Traga seus dados ou salve uma cópia no formato que preferir.</p><div class="cf-sheet-file-actions"></div></section><section><h3>Organizar o mês</h3><div class="cf-sheet-month-actions"></div></section><details class="cf-sheet-advanced"><summary>Ações avançadas</summary><p>Confira o período e as permissões antes de alterar registros.</p><div></div></details>';
   const files=drawer.querySelector('.cf-sheet-file-actions');[...tools.querySelectorAll('button')].forEach(button=>files.append(button));
   const old=shell.querySelector('.mobile-actions-menu');
   if(old){
    const input=old.querySelector('#arq');if(input)drawer.append(input);
    old.querySelectorAll('button').forEach(button=>{
     if(['imp','xlsx','csv'].includes(button.dataset.act))return;
     const advanced=/apagar|pagarano|pagartudo/.test(button.dataset.act||'');
     drawer.querySelector(advanced?'.cf-sheet-advanced>div':'.cf-sheet-month-actions').append(button);
    });old.remove();
   }
   const opener=document.createElement('button');opener.type='button';opener.className='cf-sheet-tools-open';opener.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM9 4v16M13 9h4M13 14h4"/></svg><span>Ferramentas da planilha<small>Arquivos e organização do mês</small></span>';
   opener.setAttribute('aria-controls',drawer.id);opener.setAttribute('aria-expanded','false');
   const open=()=>{drawer.showModal();opener.setAttribute('aria-expanded','true');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)drawer.animate([{transform:'translateX(100%)'},{transform:'translateX(0)'}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});};
   opener.onclick=open;tools.replaceChildren(opener);shell.append(drawer);
   drawer.addEventListener('close',()=>opener.setAttribute('aria-expanded','false'));
   drawer.addEventListener('click',event=>{if(event.target===drawer||event.target.closest('button[data-act]'))drawer.close();});
  }

 }
 new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});decorate();
})();
