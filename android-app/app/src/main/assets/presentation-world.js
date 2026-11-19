import {Scene,Group,Mesh,Shape,ExtrudeGeometry,TorusGeometry,MeshPhysicalMaterial,PerspectiveCamera,WebGLRenderer,AmbientLight,DirectionalLight,ACESFilmicToneMapping,SRGBColorSpace,MathUtils,RoomEnvironment,PMREMGenerator} from './vendor/financial-scene-three.js';

// A continuous public scene. It has no access to account state or financial data.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer,scene,camera,parts=[],frame=0,last=0,active=false,editing=false,progress=0,pointer=0,failed=false;
const colors=[0x5fc8ed,0xb19beb,0xffbb73];
function bar(width,height){
 const shape=new Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,height);shape.lineTo(-width/2,height);shape.closePath();
 return new ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:3,steps:1});
}
function initialize(){
 if(renderer||failed)return;
 try{
  renderer=new WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.domElement.className='cf-presentation-canvas';renderer.domElement.setAttribute('aria-hidden','true');document.body.prepend(renderer.domElement);
  scene=new Scene();camera=new PerspectiveCamera(37,1,.1,30);
  const pmrem=new PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
  scene.add(new AmbientLight(0xe9edff,1.25));
  const key=new DirectionalLight(0xe7f5ff,3);key.position.set(2,4,5);scene.add(key);
  const edge=new DirectionalLight(0xd7b8ff,2.4);edge.position.set(-3,1,-2);scene.add(edge);
  colors.forEach((color,i)=>{
   const material=new MeshPhysicalMaterial({color,metalness:.2,roughness:.27,clearcoat:1,clearcoatRoughness:.16});
   const ring=new Mesh(new TorusGeometry(.78,.19,16,40,Math.PI*2/3-.045),material);ring.userData={kind:'ring',i};scene.add(ring);parts.push(ring);
   const column=new Mesh(bar(.28,.5+i*.29),material);column.userData={kind:'bar',i};scene.add(column);parts.push(column);
  });
  document.documentElement.classList.add('cf-presentation-ready');resize();
 }catch(_){failed=true;renderer?.dispose();renderer?.domElement.remove();document.documentElement.classList.add('cf-presentation-fallback');}
}
function resize(){if(!renderer)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();draw(performance.now(),true);}
function measure(){
 const sections=[...document.querySelectorAll('.landing-hero,.landing-benefits,.landing-plans-section,.landing-login-section')].filter(n=>n.getClientRects().length);
 let stage=0;for(let i=0;i<sections.length;i++){const rect=sections[i].getBoundingClientRect();if(rect.top<innerHeight*.5)stage=i+Math.min(1,Math.max(0,-rect.top/Math.max(1,rect.height)));}
 progress=Math.min(3.6,stage);
}
function draw(now,force=false){
 frame=0;if(!renderer||failed||!active||document.visibilityState!=='visible')return;
 if(force||now-last>=32){
  const dt=Math.min(.08,Math.max(.001,(now-last)/1000));last=now;
  const phone=innerWidth<=760,phase=reduced.matches?0:progress,explode=Math.sin(Math.min(1,phase%1)*Math.PI),mode=Math.floor(phase);
  parts.forEach(part=>{
   const {kind,i}=part.userData;let x,y,z,rx,ry,rz,scale;
   if(kind==='ring'){
    const angle=i*Math.PI*2/3,spread=explode*.58;
    x=Math.cos(angle)*spread;y=.9+Math.sin(angle)*spread;z=i*.06+explode*(i-1)*.22;
    rx=.55+phase*.17;ry=(mode%2?-.5:.1)+pointer*.07;rz=angle+phase*.8;scale=mode===1?.85:1;
   }else{
    x=(i-1)*.52;y=-.48-explode*.28;z=-.55+i*.08;rx=.08;ry=-.32+phase*.18;rz=0;scale=mode===1?1.2:.65;
   }
   const damp=reduced.matches?1000:8;
   part.position.x=MathUtils.damp(part.position.x,x,damp,dt);part.position.y=MathUtils.damp(part.position.y,y,damp,dt);part.position.z=MathUtils.damp(part.position.z,z,damp,dt);
   part.rotation.x=MathUtils.damp(part.rotation.x,rx,damp,dt);part.rotation.y=MathUtils.damp(part.rotation.y,ry,damp,dt);part.rotation.z=MathUtils.damp(part.rotation.z,rz,damp,dt);
   part.scale.setScalar(MathUtils.damp(part.scale.x,scale,damp,dt));
  });
  camera.position.set(phone?-.15:-1.1,.8,phone?6.4:5.2);camera.lookAt(phone?0:-.6,phone?2.4:.6,0);
  renderer.domElement.style.opacity=phone?(progress<.6?'0.92':'.42'):'0.95';
  renderer.render(scene,camera);
 }
 if(!reduced.matches&&!editing&&!frame)frame=requestAnimationFrame(draw);
}
function sync(){active=!!document.querySelector('.landing-page');if(active&&!renderer&&!failed)initialize();if(renderer){renderer.domElement.style.display=active?'block':'none';measure();if(active&&!frame)draw(performance.now(),true);if(!active){cancelAnimationFrame(frame);frame=0;}}}
new MutationObserver(sync).observe(document.getElementById('app'),{childList:true,subtree:true});
addEventListener('scroll',()=>{measure();if(reduced.matches)draw(performance.now(),true);},{passive:true});addEventListener('resize',()=>{measure();resize();});
addEventListener('pointermove',e=>{pointer=(e.clientX/innerWidth-.5)*2;},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){cancelAnimationFrame(frame);frame=0;}else sync();});reduced.addEventListener('change',sync);sync();

document.addEventListener('focusin',event=>{if(event.target.matches('input,select,textarea')){editing=true;cancelAnimationFrame(frame);frame=0;}});document.addEventListener('focusout',()=>{editing=false;sync();});
