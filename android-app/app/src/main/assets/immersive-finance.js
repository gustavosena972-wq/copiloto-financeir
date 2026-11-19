/* Reference-inspired liquid navigation. Only geometry is animated, never data. */
(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let previous=0;
  function decorate(){
    const nav=document.querySelector('.mobile-bottom-nav');
    if(!nav||nav.dataset.liquid)return;
    nav.dataset.liquid='1';
    const items=[...nav.querySelectorAll('button')];
    const active=Math.max(0,items.findIndex(b=>b.getAttribute('aria-current')==='page'));
    const track=document.createElement('div');track.className='cf-liquid-track';track.setAttribute('aria-hidden','true');
    track.innerHTML='<svg viewBox="0 0 100 70"><path d="M0 28C18 28 18 3 35 3H65C82 3 82 28 100 28V70H0Z"/></svg>';
    track.style.transform=`translateX(${active*100}%)`;
    nav.prepend(track);
    if(!reduced.matches&&document.documentElement.dataset.screenMotion!=='off'&&previous!==active){
      track.animate([{transform:`translateX(${previous*100}%) scaleX(1.22)`},{transform:`translateX(${active*100}%) scaleX(1)`}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
    }
    previous=active;
  }
  new MutationObserver(decorate).observe(document.getElementById('app'),{childList:true,subtree:true});
  decorate();
})();
