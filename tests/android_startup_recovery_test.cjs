const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../android-app/app/src/main/assets/mobile.html'),'utf8');
const restore=source.slice(source.indexOf('async function restoreSessionAndBoot()'),source.indexOf('(async()=>{',source.indexOf('async function restoreSessionAndBoot()')));
test('retry restores the current session before loading account data',async()=>{
 const S={user:{id:'old'}};let bootUser;
 const run=vm.runInNewContext(restore+';restoreSessionAndBoot',{S,sb:{auth:{getSession:async()=>({data:{session:{user:{id:'current'}}},error:null})}},boot:async()=>{bootUser=S.user.id;}});
 await run();assert.equal(bootUser,'current');
});
test('an expired session error cannot load old private account data',async()=>{
 let called=false;const error=new Error('session expired');
 const run=vm.runInNewContext(restore+';restoreSessionAndBoot',{S:{user:{id:'old'}},sb:{auth:{getSession:async()=>({data:{session:null},error})}},boot:()=>{called=true;}});
 await assert.rejects(run(),/session expired/);assert.equal(called,false);
});
