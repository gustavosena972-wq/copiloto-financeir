/* A bounded particle sculpture follows the presentation scroll. No global
   animation loop, no scroll interception, and no household data in the canvas. */
(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let host=null,canvas=null,frame=0,started=0;
  const points=Array.from({length:560},(_,i)=>{
    const a=i*2.3999632297,b=i*.323;
    const ring=1+.28*Math.cos(b);
    return {x:ring*Math.cos(a),y:.28*Math.sin(b),z:ring*Math.sin(a),seed:i%19/19};
  });
  function draw(now){
    frame=0;if(!host?.isConnected||document.visibilityState!=='visible')return;
    const rect=host.getBoundingClientRect();
    if(rect.bottom<0||rect.top>innerHeight)return;
    const w=host.clientWidth,h=host.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    const c=canvas.getContext('2d');if(!c||!w||!h)return;
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const still=reduced.matches||document.documentElement.dataset.screenMotion==='off';
    const intro=still?1:Math.min(1,(now-started)/700);
    const progress=still?0:Math.max(0,Math.min(1,-rect.top/Math.max(1,h)));
    const scatter=(1-intro)*1.7+progress*.9;
    const turn=.4+progress*1.5,scale=Math.min(w,h)*.34;
    points.forEach((p,i)=>{
      const x=p.x*Math.cos(turn)-p.z*Math.sin(turn),z=p.x*Math.sin(turn)+p.z*Math.cos(turn);
      const y=p.y*.8-z*.55;
      const drift=(p.seed-.5)*scatter*scale*2.2;
      c.fillStyle=i%5===0?'#466fff':i%3===0?'#f1e5d8':'#b58165';
      c.globalAlpha=.35+(z+1.3)/3*.65;
      c.beginPath();c.arc(w*.5+x*scale+drift,h*.46+y*scale+drift*.6,Math.max(.65,(z+2)*.65),0,Math.PI*2);c.fill();
    });c.globalAlpha=1;
    if(intro<1)schedule();
  }
  function schedule(){if(!frame&&document.visibilityState==='visible')frame=requestAnimationFrame(draw);}
  function mount(){const next=document.querySelector('.landing-page .cf-finance-orbit');if(next===host)return;host=next;canvas=null;if(!host)return;canvas=document.createElement('canvas');canvas.className='cf-finance-particles';canvas.setAttribute('aria-hidden','true');host.append(canvas);host.dataset.particleSculpture='1';started=performance.now();schedule();}
  new MutationObserver(mount).observe(document.getElementById('app'),{childList:true,subtree:true});
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){cancelAnimationFrame(frame);frame=0;}else schedule();});
  reduced.addEventListener('change',schedule);mount();
})();
