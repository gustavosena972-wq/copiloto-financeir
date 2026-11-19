const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pose}=require('../android-app/app/src/main/assets/presentation-rebuild.js');
test('content is fully assembled in the reading area',()=>{
 const p=pose(200,250,800,0);assert.equal(p.spread,0);assert.equal(p.clip,0);assert.equal(p.x,0);assert.equal(p.z,0);
});
test('incoming pieces reconstruct from opposite sides and remain bounded',()=>{
 const left=pose(700,200,800,0),right=pose(700,200,800,1),closer=pose(500,200,800,0);
 assert.ok(left.spread>closer.spread);assert.ok(left.x<0);assert.ok(right.x>0);assert.equal(left.x,-right.x);
 for(const top of [-10000,-300,0,600,10000]){const p=pose(top,250,800,0);assert.ok(p.spread>=0&&p.spread<=1);assert.ok(p.clip<=12);assert.ok(Math.abs(p.x)<=76);}
});
test('long panels do not dismantle while their content is being read',()=>{
 assert.equal(pose(-500,1800,800,0).spread,0);
 assert.ok(pose(-1900,1800,800,0).spread>0);
 assert.equal(pose(NaN,100,800,0).spread,0);
});
