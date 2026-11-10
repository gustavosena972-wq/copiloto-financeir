const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../android-app/app/src/main/assets/mobile.html'),'utf8');
const body=source.slice(source.indexOf('async function autenticar(a){'),source.indexOf('async function recuperarConta(){'));
function setup(privacy){let calls=0,message='';const fields={'#nome':{value:'ana'},'#senha':{value:'senha-segura-123'},'#tipo-familia':{value:'criar'},'#aceite':{checked:true},'#confirmar-idade':{checked:true},'#privacy-ack':{checked:privacy}};
 const action=vm.runInNewContext(body+';autenticar',{$:s=>fields[s],normalizarUsuario:x=>x,aviso:x=>{message=x},document:{querySelectorAll:()=>[]},SB_URL:'https://example.invalid',SB_KEY:'test',fetch:async()=>{calls++;return {ok:false,json:async()=>({error:'test-stop'})}}});
 return {action,calls:()=>calls,message:()=>message};}
test('signup does not transmit credentials before privacy acknowledgement',async()=>{const t=setup(false);await t.action('cadastrar');assert.equal(t.calls(),0);assert.match(t.message(),/Política de Privacidade/);});
test('acknowledgement allows the signup request after the separate terms and age checks',async()=>{const t=setup(true);await t.action('cadastrar');assert.equal(t.calls(),1);assert.match(t.message(),/test-stop/);});
test('existing users are not forced through signup acknowledgement when logging in',async()=>{const t=setup(false);await t.action('entrar');assert.equal(t.calls(),1);});
