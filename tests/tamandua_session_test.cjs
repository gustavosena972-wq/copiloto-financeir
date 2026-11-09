const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSessionGate}=require('../android-app/app/src/main/assets/tamandua-session.js');
const state=(user,family)=>({user:user?{id:user}:null,fam:family?{id:family}:null});
test('anonymous sessions cannot issue tickets',()=>{const g=createSessionGate();assert.equal(g.ticket(state(null,null)),null);});
test('switching family invalidates an in-flight answer',()=>{const g=createSessionGate();const a=g.ticket(state('ana','one'));assert.equal(g.accepts(a,state('ana','two')),false);});
test('another user in the same family cannot inherit a conversation',()=>{const g=createSessionGate();const a=g.ticket(state('ana','one'));assert.equal(g.accepts(a,state('bia','one')),false);});
test('logging out and returning to the same identity rejects old replies',()=>{let resets=0;const g=createSessionGate(()=>resets++);const a=g.ticket(state('ana','one'));g.update(state(null,null));g.update(state('ana','one'));assert.equal(g.accepts(a,state('ana','one')),false);assert.equal(resets,3);});
test('rendering the same identity preserves the current ticket',()=>{const g=createSessionGate();const a=g.ticket(state('ana','one'));g.update(state('ana','one'));assert.equal(g.accepts(a,state('ana','one')),true);});
test('identity separators cannot collide',()=>{const g=createSessionGate();const a=g.ticket(state('a:b','c'));assert.equal(g.accepts(a,state('a','b:c')),false);});
test('welcome starts only after login in the financial workspace',()=>{
 const api=require('../android-app/app/src/main/assets/tamandua-session.js');
 assert.equal(api.shouldIntroduce({},true,false),false);
 assert.equal(api.shouldIntroduce({user:{id:'one'},fam:{id:'family'}},false,false),false);
 assert.equal(api.shouldIntroduce({user:{id:'one'},fam:{id:'family'}},true,false),true);
 assert.equal(api.shouldIntroduce({user:{id:'one'},fam:{id:'family'}},true,true),false);
 assert.notEqual(api.onboardingKey({user:{id:'one'},fam:{id:'family'}}),api.onboardingKey({user:{id:'two'},fam:{id:'family'}}));
});
