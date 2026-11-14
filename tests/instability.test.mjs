import test from 'node:test';
import assert from 'node:assert/strict';
import {CrystalWorld} from '../src/growth.js';
import {materialNoise} from '../src/phase.js';

const make = (instability=.88, mode='phase6') => {
  const w=new CrystalWorld(180);w.randomize(82173);
  w.config.phaseInstability=instability;
  w.config.phaseWavelength=.78;
  w.config.phaseCapillarity=.4;
  w.seed(90,90,.23,undefined,mode);
  return w;
};
const advance=(w,n=75)=>{for(let i=0;i<n;i++)w.step();};
function perimeter(w){const n=w.phase.size,phi=w.phase.phi;let count=0;
 for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){
   const i=y*n+x;if(phi[i]<.58)continue;
   if(phi[i-1]<.58||phi[i+1]<.58||phi[i-n]<.58||phi[i+n]<.58)count++;
 }
 return count;
}

test('zero instability preserves smooth A.4 mode without assisted front leaders',()=>{
 const w=make(0);advance(w);
 assert.equal(w.phase.stats().phaseSprouts,0);
 assert.equal(w.phase.stats().phaseBranches,0);
 assert.ok(w.phase.stats().phaseCells>30);
});

test('strong instability creates real protrusions and tip splitting on the phase fraction',()=>{
 const flat=make(0),wild=make(1);
 advance(flat);advance(wild);
 assert.ok(wild.phase.stats().phaseBranches>4,'expected irreversible tip split events');
 assert.ok(wild.phase.stats().phaseSprouts>4,'live growth front leaders present');
 assert.ok(perimeter(wild)>perimeter(flat)*1.2,'unstable front has genuinely more structural boundary');
 assert.notDeepEqual(wild.phase.phi,flat.phase.phi);
 assert.ok(wild.crystal.some(x=>x===1));
});

test('correlated micro-heterogeneity is stable for the seed and bounded',()=>{
 const v=materialNoise(20.5,12.3,889,6);
 assert.equal(v,materialNoise(20.5,12.3,889,6));
 assert.ok(v>=-1&&v<=1);
 assert.notEqual(v,materialNoise(21.5,12.3,889,6));
 const w=make(.75),h=w.phase;
 advance(w,6);const spot=materialNoise(15,25,w.seedValue,7);
 w.rand();w.rand();assert.equal(materialNoise(15,25,w.seedValue,7),spot);
});

test('same seed and controls produce exactly reproducible branch histories',()=>{
 const a=make(.9),b=make(.9);advance(a,50);advance(b,50);
 assert.deepEqual(a.phase.phi,b.phase.phi);
 assert.deepEqual(a.phase.sprouts,b.phase.sprouts);
 assert.deepEqual(a.phase.owner,b.phase.owner);
 assert.deepEqual(a.crystal,b.crystal);
 assert.equal(a.seedValue,b.seedValue);
});

test('melting erases sprout state only locally, undo restores all fields',()=>{
 const w=make(1);advance(w,55);
 const before=w.snapshot();
 const count=w.phase.sprouts.length;
 const t=w.phase.sprouts[Math.floor(count/2)];
 w.melt(t.x*w.phase.scale,t.y*w.phase.scale,13);
 assert.ok(w.phase.sprouts.length<count);
 w.restore(before);
 assert.deepEqual(w.phase.sprouts,before.phase.sprouts);
 assert.deepEqual(w.phase.phi,before.phase.phi);
 assert.equal(w.phase.branchEvents,before.phase.branchEvents);
 assert.deepEqual(w.crystal,before.crystal);
});

test('phase mobility 0 stops all active protrusions while other engines may run',()=>{
 const w=make(1);advance(w,18);
 const before=w.phase.snapshot();
 w.config.phaseMobility=0;advance(w,8);
 assert.deepEqual(w.phase.phi,before.phi);
 assert.deepEqual(w.phase.sprouts,before.sprouts);
});

test('instability growth remains finite, bounded and capped across all phase species',()=>{
 for(const species of ['phase4','phase6','phase8']){
   const w=make(1,species);advance(w,70);
   assert.ok(w.phase.sprouts.length<=128);
   for(const v of w.phase.phi)assert.ok(v>=0&&v<=1&&Number.isFinite(v));
   for(const t of w.phase.sprouts)assert.ok(Number.isFinite(t.x)&&Number.isFinite(t.y));
 }
});
