const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../android-app/app/src/main/assets/tamandua-enhancements.js'),'utf8');
const voice=source.slice(source.indexOf('function voice(){'),source.indexOf('function simulate(){'));
test('Android dictation uses the native bridge instead of Web Speech permissions',()=>{
 const calls=[];const context={window:{CopilotoVoice:{postMessage:x=>calls.push(JSON.parse(x))},SpeechRecognition:()=>{throw Error('Web Speech must not start')}},sessionGate:{ticket:()=>({})},currentState:()=>({}),$:()=>({setAttribute(){}}),voiceStatus(){},voiceLanguage:()=> 'pt',nativeVoiceTicket:null,nativeVoiceSerial:0,Date,JSON};
 vm.runInNewContext(voice+';voice()',context);assert.equal(calls[0].action,'recognize');assert.equal(calls[0].language,'pt');
 vm.runInNewContext('voice()',context);assert.equal(calls[1].action,'stop');
});
test('Android without a native bridge explains recovery without starting unsupported Web Speech',()=>{
 let status;vm.runInNewContext(voice+';voice()',{window:{SpeechRecognition:()=>{throw Error('unsupported')}},location:{hostname:'appassets.androidplatform.net'},sessionGate:{ticket:()=>({})},currentState:()=>({}),$:()=>({}),voiceStatus:x=>status=x});assert.match(status,/Android System WebView/);
});
