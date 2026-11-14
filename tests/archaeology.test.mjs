import test from 'node:test';
import assert from 'node:assert/strict';
import {CrystalWorld} from '../src/growth.js';
import {renderMineral} from '../src/mineral.js';
import {buildColorLUT} from '../src/palettes.js';

function make(seed=18012){
  const w=new CrystalWorld(120);w.randomize(seed);
  w.config.phaseInstability=0;
  w.config.phaseDrive=.97;w.config.phaseMobility=.95;
  w.seed(60,60,.17,undefined,'phase6');
  for(let i=0;i<110;i++)w.step();
  return w;
}
const center=w=>{const s=w.phase.size;return Math.floor(s/2)*s+Math.floor(s/2);};
const lut=buildColorLUT(['#051121','#d13afa','#31ffcd','#f9e5ad']);

test('fracturing a grown phase crystal creates open voids and preserves fossil timestamps',()=>{
  const w=make(),i=center(w),p=w.phase;
  assert.ok(p.birth[i]>0);
  const oldBirth=p.birth[i], oldGen=p.generation[i], outside=p.phi[13];
  const cut=w.fracture(60,60,8);
  assert.ok(cut>0);
  assert.equal(p.birth[i],0);assert.equal(p.phi[i],0);assert.equal(p.owner[i],0);
  assert.equal(p.fossilBirth[i],oldBirth);assert.equal(p.generation[i],oldGen);
  assert.equal(p.scar[i],255);assert.equal(p.phi[13],outside);
  assert.ok(p.stats().openCracks>0);
});

test('undo restores exact genealogy, scar and phase state',()=>{
  const w=make(),before=w.snapshot();
  w.fracture(60,60,12);
  w.restore(before);
  assert.deepEqual(w.phase.snapshot().birth,before.phase.birth);
  assert.deepEqual(w.phase.snapshot().fossilBirth,before.phase.fossilBirth);
  assert.deepEqual(w.phase.snapshot().generation,before.phase.generation);
  assert.deepEqual(w.phase.snapshot().scar,before.phase.scar);
  assert.deepEqual(w.phase.snapshot().phi,before.phase.phi);
});

test('zero fracture healing preserves the open fracture while simulation continues',()=>{
  const w=make(),i=center(w);w.config.fractureHeal=0;
  w.fracture(60,60,5);assert.equal(w.phase.phi[i],0);
  for(let k=0;k<100;k++)w.step();
  assert.equal(w.phase.phi[i],0);
  assert.equal(w.phase.scar[i],255);
});

test('with healing enabled, excavated material can recrystallize into a later generation',()=>{
  const w=make(),i=center(w);w.config.fractureHeal=1;
  const oldBirth=w.phase.birth[i],oldGen=w.phase.generation[i];
  w.fracture(60,60,4);
  for(let k=0;k<240;k++)w.step();
  const regen=w.phase.stats().recrystallized;
  assert.ok(regen>0,`Expected recrystallized cells, got ${regen}`);
  assert.ok(w.phase.generation.some(v=>v>1));
  assert.ok(w.phase.birth.some(v=>v>oldBirth));
  assert.ok(w.phase.generation[i]>=oldGen);
});

test('repeatable fracture paths and splits produce the same physical scars from same seed',()=>{
  const a=make(),b=make();a.config.fractureSplinter=.93;b.config.fractureSplinter=.93;
  for(const x of [51,55,60,65,70]){a.fracture(x,60,5);b.fracture(x,60,5);}
  assert.deepEqual(a.phase.scar,b.phase.scar);
  assert.deepEqual(a.phase.phi,b.phase.phi);
  assert.equal(a.rngState,b.rngState);
});

test('archaeology material derives old layers from simulation without mutating RNG',()=>{
  const w=make();w.fracture(60,60,10);
  const before=w.snapshot();
  const base=renderMineral(w.phase,w,lut,{finish:'mineral'});
  const archive=renderMineral(w.phase,w,lut,{finish:'archive',exposure:1});
  const ghost=renderMineral(w.phase,w,lut,{finish:'archive',exposure:0});
  assert.notDeepEqual(base.data,archive.data);
  assert.notDeepEqual(archive.data,ghost.data);
  assert.deepEqual(w.phase.scar,before.phase.scar);
  assert.deepEqual(w.phase.birth,before.phase.birth);
  assert.deepEqual(w.phase.fossilBirth,before.phase.fossilBirth);
  assert.equal(w.rngState,before.rngState);
});

test('fracture tool does not convert unrelated growth engines',()=>{
  const w=new CrystalWorld(130);w.randomize(100);
  w.seed(20,20,0,undefined,'feather');for(let k=0;k<25;k++)w.step();
  const tips=w.tips.length,grains=w.grains.length;
  assert.equal(w.fracture(20,20,8),0);
  assert.equal(w.tips.length,tips);assert.equal(w.grains.length,grains);
});
