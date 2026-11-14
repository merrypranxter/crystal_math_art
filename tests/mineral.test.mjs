import test from 'node:test';
import assert from 'node:assert/strict';
import {CrystalWorld} from '../src/growth.js';
import {reliefField,renderMineral,MINERAL_FINISHES} from '../src/mineral.js';
import {buildColorLUT} from '../src/palettes.js';

const lut=buildColorLUT(['#080b14','#eb42e9','#18d9f4','#faf1b0']);
function make(mode='phase6') {
  const w=new CrystalWorld(140);
  w.randomize(32199);w.config.phaseInstability=.83;
  w.config.phaseWavelength=.74;w.config.phaseCapillarity=.38;
  w.seed(70,70,.21,undefined,mode);
  for(let t=0;t<60;t++)w.step();
  return w;
}
const snapshot=(w)=>JSON.stringify({phi:[...w.phase.phi],owner:[...w.phase.owner],birth:[...w.phase.birth],rng:w.rngState});
const sum=(out)=>out.data.reduce((v,x)=>v+x,0);

test('first-solidification timestamps are persistent, finite, nonnegative and reproducible',()=>{
  const a=make(),b=make();
  assert.deepEqual(a.phase.birth,b.phase.birth);
  assert.ok(a.phase.birth.some(x=>x>0));
  for(let i=0;i<a.phase.birth.length;i++)if(a.phase.birth[i])assert.ok(a.phase.birth[i]<=a.ticks+1);
});
test('melting clears local layer timestamps and undo restores the original history',()=>{
  const w=make();const c=Math.floor(w.phase.size/2),i=c*w.phase.size+c;
  assert.ok(w.phase.birth[i]>0,'seed interior is solid');
  const before=w.snapshot();
  w.melt(70,70,16);
  assert.equal(w.phase.birth[i],0);
  w.restore(before);
  assert.deepEqual(w.phase.birth,before.phase.birth);
});
test('relief comes from actual solid fraction and has no height outside crystals',()=>{
  const w=make(),r=reliefField(w.phase);
  assert.equal(r.height.length,w.phase.phi.length);
  assert.ok(r.distance.some(v=>v>1));
  assert.ok(r.height.some(v=>v>.25));
  for(let i=0;i<r.height.length;i++)if(w.phase.phi[i]<.001)assert.equal(r.height[i],0);
});
test('all four material finishes paint data without mutating the physics or RNG',()=>{
  const w=make(),pre=snapshot(w),signatures=new Set();
  assert.equal(MINERAL_FINISHES.length,4);
  for(const finish of MINERAL_FINISHES){
    const out=renderMineral(w.phase,w,lut,{finish,depth:.8,bands:.8,spectral:.7,lightAngle:280});
    assert.equal(out.data.length,w.phase.phi.length*4);
    assert.ok(out.statistics.cells>30);
    assert.ok(out.statistics.peakDepth>.05);
    assert.ok(out.data.every(v=>Number.isFinite(v)));
    signatures.add(sum(out));
  }
  assert.ok(signatures.size>=3,'material finishes must be visually different');
  assert.equal(snapshot(w),pre,'renderer must not change simulation state');
});
test('lighting and true crystallization chronology influence relief colors independently',()=>{
  const w=make(),v=Object.freeze({finish:'prism',depth:.9,bands:.8,spectral:.9});
  const a=renderMineral(w.phase,w,lut,{...v,lightAngle:40});
  const b=renderMineral(w.phase,w,lut,{...v,lightAngle:230});
  assert.notDeepEqual(a.data,b.data,'light must affect material shading');
  const c=renderMineral(w.phase,w,lut,{...v,lightAngle:40,bands:0});
  assert.notDeepEqual(a.data,c.data,'stored growth chronology must influence color');
});
test('melt and fresh growth can create younger material bands',()=>{
  const w=make();const before=w.phase.birth.slice();
  const center=Math.floor(w.phase.size/2),i=center*w.phase.size+center;
  assert.ok(before[i]>0);
  w.melt(70,70,10);
  assert.equal(w.phase.birth[i],0);
  for(let t=0;t<25;t++)w.step();
  assert.ok(w.phase.birth.some((t,j)=>t>w.ticks-26 && t>before[j]));
});
