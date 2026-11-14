import test from 'node:test';
import assert from 'node:assert/strict';
import {CrystalWorld, SPHERULITE_MODES} from '../src/growth.js';
import {renderSpherulites} from '../src/spherulite.js';
const steps=(w,n)=>{for(let i=0;i<n;i++)w.step();};
const make=(mode='spherulite',seed=1821)=>{const w=new CrystalWorld(142);w.randomize(seed);w.seed(59,69,.12,undefined,mode);return w;};
const lut=Uint8Array.from({length:768},(_,i)=>(i*37)%255);

test('three real spherulite anatomy families are exposed',()=>{
 assert.deepEqual(Object.keys(SPHERULITE_MODES),['spherulite','rosette','starSpherulite']);
});
for(const mode of Object.keys(SPHERULITE_MODES)){
 test(mode+' advances a persistent radial crystal front, consumes solute and stores directors',()=>{
  const w=make(mode);const initial=w.spherulite.stats().spherCells;steps(w,43);
  const f=w.spherulite,s=f.stats();
  assert.ok(s.spherCells>initial+200,JSON.stringify(s));
  assert.ok(s.spherFront>5);
  assert.equal(w.grains[0].morphology,mode);
  assert.ok(f.director.some(x=>x!==0));assert.ok(f.birth.some(Boolean));
  assert.ok(w.nutrient.some(x=>x<.5));assert.equal(w.phase.stats().phaseCells,0);
 });
}
test('seeded runs are reproducible, including growth orientation and boundaries',()=>{
 const a=make('rosette',333),b=make('rosette',333);steps(a,55);steps(b,55);
 assert.deepEqual(a.spherulite.snapshot(),b.spherulite.snapshot());
 assert.deepEqual(a.crystal,b.crystal);assert.deepEqual(a.stats(),b.stats());
});
test('two radial grains collide without overwriting one another; contacts persist',()=>{
 const w=make('spherulite',77);w.seed(82,69,.85,undefined,'rosette');steps(w,62);
 const f=w.spherulite;assert.ok(f.stats().spherContacts>0);
 assert.ok(f.owner.includes(1)&&f.owner.includes(2));
 for(let i=0;i<f.owner.length;i++)if(f.boundary[i]){
  assert.ok(f.owner[i]);
  assert.equal(w.crystal[f.mainIndex(i%f.size,Math.floor(i/f.size))],f.owner[i]);
 }
});
test('new seeds coexist with older morphology without remapping existing director field',()=>{
 const w=make('spherulite',98);steps(w,12);const before=w.spherulite.director.slice();
 w.config.morphology='starSpherulite';w.seed(102,98,0,undefined,'starSpherulite');
 for(let i=0;i<before.length;i++)if(before[i]!==0)assert.equal(w.spherulite.director[i],before[i]);
});
test('melt clears local radial mineral and rebuilds an active regrowth boundary',()=>{
 const w=make();steps(w,56);const f=w.spherulite,before=f.stats().spherCells;
 const cut=w.spherulite.melt(59,69,16);assert.ok(cut>0);
 assert.ok(f.stats().spherCells<before);assert.ok(f.frontier.size>0);
 steps(w,35);assert.ok(f.stats().spherCells>before-cut);
});
test('full snapshot undo restores local orientation, frontier ownership and crystal occupancy',()=>{
 const w=make('rosette',817);steps(w,18);const state=w.snapshot();
 w.melt(59,69,14);steps(w,19);
 w.restore(state);const f=w.spherulite;
 assert.deepEqual(f.owner,state.spherulite.owner);
 assert.deepEqual(f.director,state.spherulite.director);
 assert.deepEqual(f.birth,state.spherulite.birth);
 assert.deepEqual([...f.frontier].map(([i,x])=>[i,[...x]]),state.spherulite.frontier);
 assert.deepEqual(w.crystal,state.crystal);
});
test('optical analyzer and polarizer contrast change render output without changing growth state',()=>{
 const w=make();steps(w,28);const f=w.spherulite,before=f.snapshot();
 const one=renderSpherulites(f,w,lut,{analyzer:0,retardance:.5,contrast:1});
 const two=renderSpherulites(f,w,lut,{analyzer:45,retardance:.5,contrast:1});
 assert.notDeepEqual(one.data,two.data);
 assert.deepEqual(f.snapshot(),before);
});
test('zero radial-growth rate stops deposition but preserves existing crystals',()=>{
 const w=make();w.config.spherGrowth=0;const before=w.spherulite.stats();steps(w,20);
 assert.deepEqual(w.spherulite.stats(),before);
});
