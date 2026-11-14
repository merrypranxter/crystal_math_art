import test from 'node:test';
import assert from 'node:assert/strict';
import {CrystalWorld} from '../src/growth.js';
import {BREEDING_PRESETS,normalizeGenome,captureVolumeGenome,breedThreeParents,plantOffspring} from '../src/breeding.js';
const make=(seed=54218)=>{const w=new CrystalWorld(200);w.randomize(seed);w.config.volumeGrowth=.97;return w;};
const steps=(w,n)=>{for(let i=0;i<n;i++)w.step();};
const breed=(weights=[40,35,25],opt={})=>breedThreeParents(BREEDING_PRESETS,weights,{...opt,seed:8917});

test('three archetype parents blend exactly with normalized artist weights',()=>{
  const r=breed([45,30,25],{mutation:0,crossover:0});
  for(let i=0;i<3;i++)assert.ok(Math.abs(r.laws[i]-[.45,.30,.25][i])<1e-12);
  assert.equal(r.parents.length,3);
  assert.equal(r.parentWeights.reduce((a,b)=>a+b,0),1);
  assert.deepEqual(r.parents.map(p=>p.cells),[0,0,0]);
});

test('weights are normalized, duplicate sources permitted, zero total rejected',()=>{
  const r=breed([80,0,20],{mutation:0});
  assert.deepEqual(r.laws,[.8,0,.2]);
  assert.throws(()=>breed([0,0,0]),/nonzero/);
  const same=breedThreeParents([BREEDING_PRESETS[0],BREEDING_PRESETS[0],BREEDING_PRESETS[0]],[1,3,7],{seed:17,mutation:0});
  assert.deepEqual(same.laws,[1,0,0]);
});

test('capture from REAL GROWN MINERAL copies DNA with orientation and shape roughness',()=>{
  const w=make();w.seed(100,100,.33,undefined,'volumeOcta');steps(w,70);
  const sample=captureVolumeGenome(w.volume,1);
  assert.ok(sample.cells>150);
  assert.ok(sample.laws[1]>.99);
  assert.ok(Math.abs(sample.angles[1]-.33)<.03);
  assert.ok(sample.roughness>0&&sample.roughness<=1);
  assert.equal(sample.source,'captured-voxel-phenotype');
  assert.equal(captureVolumeGenome(w.volume,99),null);
});

test('three-parent child creates a real mixed 3D EMBRYO with independent offspring grain',()=>{
  const w=make();const r=breed([36,37,27],{mutation:0,crossover:.2});
  const born=plantOffspring(w,r);
  assert.ok(born?.grainId===1);
  const s=w.volume.stats();
  assert.equal(s.volumeHybrids,1);
  assert.equal(s.volumeChimeras,1);
  assert.ok(s.volumeNeedleCells>0&&s.volumeOctaCells>0&&s.volumeCoralCells>0,JSON.stringify(s));
  assert.ok(w.volume.hybrids.get(1)?.laws[2]>.26);
});

test('offspring inherits multiple kinetics into new growth while old grains are untouched',()=>{
  const w=make();w.seed(45,46,.13,undefined,'volumeNeedle');steps(w,18);
  const oldOwners=w.volume.owner.slice();const child=plantOffspring(w,breed([20,35,45],{mutation:.1,crossover:.4}));
  assert.equal(child.grainId,2);
  const idBefore=w.volume.owner.filter(g=>g===2).length;
  steps(w,110);
  const idAfter=w.volume.owner.filter(g=>g===2).length;
  assert.ok(idAfter>idBefore+40,`${idBefore}->${idAfter}`);
  assert.ok(w.volume.gene.some((g,i)=>g===3&&w.volume.owner[i]===2));
  assert.ok(w.volume.gene.some((g,i)=>g===2&&w.volume.owner[i]===2));
  assert.ok(w.volume.gene.some((g,i)=>g===1&&w.volume.owner[i]===2));
  assert.ok(oldOwners.some(Boolean));
});

test('offspring snapshot and restore recover hybrid DNA, actual voxels and RNG',()=>{
  const w=make();plantOffspring(w,breed([10,60,30],{mutation:.5,crossover:.6}));
  steps(w,30);const snap=w.snapshot();
  const json=JSON.stringify([...w.volume.hybrids]);
  steps(w,15);w.volume.mutateFronts({primary:'volumeCoral',partner:'volumeNeedle',mix:.9,rotation:49});
  w.restore(snap);
  assert.deepEqual(w.volume.owner,snap.volume.owner);
  assert.deepEqual(w.volume.gene,snap.volume.gene);
  assert.deepEqual(w.volume.lineage,snap.volume.lineage);
  assert.equal(JSON.stringify([...w.volume.hybrids]),json);
  const mirror=make();plantOffspring(mirror,breed([10,60,30],{mutation:.5,crossover:.6}));steps(mirror,30);
  steps(w,23);steps(mirror,23);
  assert.deepEqual(w.volume.owner,mirror.volume.owner);
  assert.deepEqual(w.volume.gene,mirror.volume.gene);
});

test('three-parent offspring changes actual 3D geometry when the parent weights change',()=>{
  const a=make(7521),b=make(7521);
  plantOffspring(a,breed([100,0,0],{mutation:0,crossover:.24}));
  plantOffspring(b,breed([0,0,100],{mutation:0,crossover:.24}));
  steps(a,115);steps(b,115);
  let diff=0;for(let i=0;i<a.volume.count;i++)if(a.volume.owner[i]!==b.volume.owner[i])diff++;
  assert.ok(diff>75,`Expected materially different 3D body, found ${diff} changed voxel sites`);
});

test('recombination is reproducible with same seeds and weights',()=>{
  const a=make(518),b=make(518);
  for(const w of [a,b]){plantOffspring(w,breed([35,30,35],{mutation:.39,crossover:.7}));steps(w,65);}
  for(const k of ['owner','gene','geneAngle','lineage','nutrient'])assert.deepEqual(a.volume[k],b.volume[k]);
});

test('genome recipes are plain validateable JSON and reject malformed samples',()=>{
  const r=breed([32,25,43]);
  const clone=JSON.parse(JSON.stringify(r));
  assert.deepEqual(normalizeGenome(clone).laws,clone.laws);
  assert.throws(()=>normalizeGenome({laws:[.3,.7]}),/exactly three/);
  assert.throws(()=>normalizeGenome({laws:[-2,1,1]}),/nonnegative/);
  assert.throws(()=>normalizeGenome({laws:[0,0,0]}),/no viable/);
  assert.throws(()=>normalizeGenome({laws:[Infinity,1,1]}),/finite/);
});

test('breeding does not alter unrelated older 2D growth engines or the palette catalog',()=>{
  const w=make();w.seed(50,51,.1,undefined,'cathedral');w.seed(146,80,.2,undefined,'phase6');
  const before=w.grains.map(g=>g.morphology);const existing=w.phase.owner.slice();
  plantOffspring(w,breed([22,55,23]));
  assert.deepEqual(w.grains.slice(0,2).map(g=>g.morphology),before);
  assert.deepEqual(w.phase.owner,existing);
});
