/* The actual presentation elements assemble as the next section enters view. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else api.mount();
})(globalThis, function() {
  function pose(top, height, viewport, index) {
    if (![top,height,viewport,index].every(Number.isFinite) || viewport <= 0 || height <= 0) return {spread:0,x:0,y:0,z:0,rotate:0,clip:0};
    const enter = Math.min(1, Math.max(0, (top - viewport * .46) / (viewport * .46)));
    const exit = Math.min(1, Math.max(0, (viewport * .08 - (top + height)) / (viewport * .36)));
    const spread = Math.max(enter, exit), direction = index % 2 ? 1 : -1;
    if (spread === 0) return {spread:0,x:0,y:0,z:0,rotate:0,clip:0};
    return {spread,x:direction*spread*76,y:enter*68-exit*48,z:-spread*150,rotate:direction*spread*13,clip:spread*12};
  }
  function mount() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let page = null, sections = [], frame = 0;
    const selector = '.cf-brand-reveal>span,.cf-brand-benefit,.landing-intro>p,.landing-hero-actions,.cf-finance-orbit,.landing-benefits>h2,.landing-benefits>p,.app-feature-cards>article,.landing-section-heading,.landing-plan-card,.landing-login-copy';
    function clear(element) {
      ['transform','clip-path','opacity','will-change'].forEach(name => element.style.removeProperty(name));
      element.removeAttribute('data-rebuild-piece');
    }
    function measure() {
      sections.forEach(section => section.pieces.forEach(piece => clear(piece.element)));
      sections = page ? [...page.querySelectorAll('.landing-hero,.landing-benefits,.landing-plans-section,.landing-login-section')].map(element => {
        const origin = element.getBoundingClientRect().top;
        return {element,pieces:[...element.querySelectorAll(selector)].filter(node => node.getClientRects().length).map((node,index) => ({element:node,index,offset:node.getBoundingClientRect().top-origin,height:node.offsetHeight}))};
      }) : [];
      schedule();
    }
    function draw() {
      frame = 0;
      const enabled = !reduced.matches && document.documentElement.dataset.screenMotion !== 'off';
      sections.forEach(section => {
        const rect = section.element.getBoundingClientRect();
        const editing = section.element.contains(document.activeElement) && document.activeElement.matches('input,textarea,select');
        section.pieces.forEach(piece => {
          const element = piece.element;
          if (!enabled || editing) {clear(element);return;}
          const p = pose(rect.top+piece.offset,piece.height,innerHeight,piece.index);
          element.dataset.rebuildPiece = '1';
          element.style.transform = `perspective(1100px) translate3d(${p.x}px,${p.y}px,${p.z}px) rotateY(${p.rotate}deg) rotateX(${p.spread*9}deg) rotateZ(${(piece.index%2?1:-1)*p.spread*7}deg) scale(${1-p.spread*.08})`;
          element.style.clipPath = p.spread===0 ? 'none' : `inset(${p.clip}% ${p.clip*.3}% ${p.clip*.45}% ${p.clip*.3}%)`;
          element.style.opacity = String(1-p.spread*.4);
          if(p.spread>0 && p.spread<1) element.style.willChange='transform,clip-path';
          else element.style.removeProperty('will-change');
        });
      });
    }
    function schedule() {if(!frame && document.visibilityState==='visible') frame=requestAnimationFrame(draw);}
    function sync() {const next=document.querySelector('.landing-page');if(next!==page){page=next;measure();}}
    new MutationObserver(sync).observe(document.getElementById('app'),{childList:true,subtree:true});
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-screen-motion']});
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);
    document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){cancelAnimationFrame(frame);frame=0;}else schedule();});
    reduced.addEventListener('change',schedule);
    document.fonts?.ready.then(()=>{if(page)measure();});
    sync();
  }
  return {pose,mount};
});
