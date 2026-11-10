const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assets=path.join(__dirname,'../android-app/app/src/main/assets');

test('presentation batches layout reads before writing animated styles',()=>{
 const source=fs.readFileSync(path.join(assets,'presentation-rebuild.js'),'utf8');
 const events=[],frames=[],listeners={};let record=false;
 const style=new Proxy({removeProperty(){}},{set(o,k,v){if(record)events.push('write');o[k]=v;return true;}});
 const piece={style,dataset:{},offsetHeight:200,getClientRects:()=>[1],removeAttribute(){},getBoundingClientRect:()=>({top:650})};
 const sections=[0,1].map(()=>({contains:()=>false,querySelectorAll:()=>[piece],getBoundingClientRect(){if(record)events.push('read');return{top:650,bottom:1000};}}));
 const page={querySelectorAll:()=>sections};
 const context={matchMedia:()=>({matches:false,addEventListener(){}}),MutationObserver:class{observe(){}},document:{querySelector:()=>page,getElementById:()=>({}),documentElement:{dataset:{}},visibilityState:'visible',activeElement:null,addEventListener(){},fonts:null},innerHeight:800,innerWidth:390,addEventListener:(n,f)=>listeners[n]=f,requestAnimationFrame:f=>(frames.push(f),frames.length),cancelAnimationFrame(){}};
 vm.runInNewContext(source,context);record=true;frames.shift()();
 assert.ok(events.includes('write'));
 assert.equal(events.lastIndexOf('read')<events.indexOf('write'),true,'interleaved reads/writes force repeated layout during scrolling');
 events.length=0;listeners.scroll();frames.shift()();
 assert.equal(events.filter(x=>x==='write').length,0,'unchanged poses must not repaint while stationary');
});
