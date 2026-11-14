import test from 'node:test';
import assert from 'node:assert/strict';
import {BREEDING_PRESETS} from '../src/breeding.js';
import {startEcosystem,advanceEcosystem,ecosystemMetrics,ecosystemStatus,ecosystemCloud,nextEcosystemGeneration,exportEcosystem,ECOSYSTEM_SCHEMA} from '../src/ecosystem.js';

const originals=()=>BREEDING_PRESETS.map(x=>({...x,laws:[...x.laws],angles:[...x.angles]}));

test('three genomic parents occupy genuinely independent cells in one shared 3D field',()=>{
 const s=startEcosystem(originals(),{seed:9821,scarcity:.6});
 const st=ecosystemStatus(s);assert.deepEqual(st.counts,[19,19,19]);
 assert.equal(s.world.grains.length,3);
 assert.equal(s.world.volume.owner.length,s.world.volume.size**3);
 assert.equal(s.world.volume.nutrient.length,s.world.volume.owner.length);
 assert.equal(s.world.volume.frontier.size>0,true);
 assert.equal(st.occupied,57);
});

test('shared-domain nutrient depletion and contested frontiers are measured from physics state',()=>{
 const s=startEcosystem(originals(),{seed:1029,scarcity:.9});
 const m=advanceEcosystem(s,96);
 assert.equal(m.counts.every(x=>x>19),true);
 assert.ok(m.contacts>0,'true 6-face contacts');
 assert.ok(m.contested>0,'overlapping 26-neighbor frontiers');
 assert.ok(m.starvedFraction>.4,'nutrient becomes depleted under intense growth');
 assert.ok(s.world.volume.nutrient.some(x=>x<.3));
});

test('no cross-lineage overwriting; occupied cells remain under original owners as fronts collide',()=>{
 const s=startEcosystem(originals(),{seed:20217,scarcity:.55});
 advanceEcosystem(s,52);const before=s.world.volume.owner.slice();
 advanceEcosystem(s,48);const after=s.world.volume.owner;
 for(let i=0;i<before.length;i++)if(before[i])assert.equal(after[i],before[i]);
 assert.ok(ecosystemMetrics(s.world.volume).contacts>0);
});

test('seasons are deterministic for identical DNA, seed and environment',()=>{
 const a=startEcosystem(originals(),{seed:17293,scarcity:.72});
 const b=startEcosystem(originals(),{seed:17293,scarcity:.72});
 advanceEcosystem(a,72);advanceEcosystem(b,72);
 assert.deepEqual([...a.world.volume.owner],[...b.world.volume.owner]);
 assert.deepEqual([...a.world.volume.gene],[...b.world.volume.gene]);
 assert.deepEqual(ecosystemMetrics(a.world.volume),ecosystemMetrics(b.world.volume));
});

test('different scarcity changes the same crystal ecosystem nutrient conditions',()=>{
 const a=startEcosystem(originals(),{seed:729,scarcity:.05});
 const b=startEcosystem(originals(),{seed:729,scarcity:1});
 advanceEcosystem(a,72);advanceEcosystem(b,72);
 assert.ok(ecosystemMetrics(a.world.volume).starvedFraction < ecosystemMetrics(b.world.volume).starvedFraction);
});

test('next-generation DNA comes from measured survivors rather than original presets',()=>{
 const s=startEcosystem(originals(),{seed:9011,scarcity:.65});
 assert.throws(()=>nextEcosystemGeneration(s),/season/);
 advanceEcosystem(s,80);
 const samples=ecosystemStatus(s).samples;
 const next=nextEcosystemGeneration(s);
 assert.equal(next.generation,2);
 assert.equal(next.recipes.length,3);
 assert.equal(next.seasons,0);
 assert.equal(next.world.volume.active,true);
 assert.equal(next.history.some(row=>row.event==='selection'),true);
 for(const recipe of next.recipes) {
  assert.equal(recipe.source,'tri-parent-breeding');
  assert.ok(recipe.parents.some(p=>samples.some(s=>p.name===s.name)));
 }
 advanceEcosystem(next,24);
 assert.ok(ecosystemStatus(next).counts.every(c=>c>19));
});

test('3D isometric cloud contains only actual occupied owner identity and bounded array',()=>{
 const s=startEcosystem(originals(),{seed:1122,scarcity:.6});advanceEcosystem(s,50);
 const cloud=ecosystemCloud(s.world.volume);assert.equal(cloud.length%6,0);
 assert.ok(cloud.length<=18000);
 const ids=new Set();for(let k=0;k<cloud.length;k+=6){
  const [x,y,z,id,law]=cloud.slice(k,k+5);ids.add(id);
  const index=s.world.volume.index(x,y,z);
  assert.equal(s.world.volume.owner[index],id);
  assert.equal(s.world.volume.gene[index],law);
 }
 assert.deepEqual([...ids].sort(),[1,2,3]);
});

test('export report omits heavy voxel arrays and preserves survival lineage history',()=>{
 const s=startEcosystem(originals(),{seed:1997,scarcity:.4});advanceEcosystem(s,35);
 const doc=exportEcosystem(s);
 assert.equal(doc.schema,ECOSYSTEM_SCHEMA);
 assert.deepEqual(doc.metrics.counts,ecosystemStatus(s).counts);
 assert.equal(doc.recipes.length,3);assert.equal(doc.survivors.length,3);
 assert.equal(doc.history.length,1);
 assert.equal(JSON.stringify(doc).includes('nutrient'),false);
 assert.ok(JSON.stringify(doc).length<30000);
});

test('simulated ecosystem and next generation never change independent live world',async()=>{
 const {CrystalWorld}=await import('../src/growth.js');
 const live=new CrystalWorld(172);live.randomize(817);live.seed(90,90,0,undefined,'volumeNeedle');
 const snapshot=live.snapshot();
 const s=startEcosystem(originals(),{seed:817,scarcity:.5});advanceEcosystem(s,48);nextEcosystemGeneration(s);
 assert.deepEqual(live.snapshot().volume.owner,snapshot.volume.owner);
 assert.equal(live.ticks,snapshot.ticks);
});
