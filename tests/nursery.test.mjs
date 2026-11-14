import test from 'node:test';
import assert from 'node:assert/strict';
import {CrystalWorld} from '../src/growth.js';
import {BREEDING_PRESETS,normalizeGenome,breedThreeParents} from '../src/breeding.js';
import {createSiblingRecipes,evaluateSibling,phenotypeMap,nurseryPixels,exportNursery,importNursery,NURSERY_SCHEMA} from '../src/nursery.js';

const opts={count:4,seed:73499,variation:.43,mutation:.17,crossover:.26};
const recipes=()=>createSiblingRecipes(BREEDING_PRESETS,[40,35,25],opts);

test('A.15 deterministic sibling batches have four distinct seeds and repeat exactly',()=>{
 const a=recipes(),b=recipes();assert.deepEqual(a,b);assert.equal(a.length,4);
 assert.equal(new Set(a.map(r=>r.seed)).size,4);
 for(const r of a)assert.ok(Math.abs(r.laws.reduce((x,y)=>x+y,0)-1)<.00001);
});

test('A.15 sibling generation never alters parent genomes',()=>{
 const parents=BREEDING_PRESETS.map(normalizeGenome),before=structuredClone(parents);
 createSiblingRecipes(parents,[40,35,25],opts);
 assert.deepEqual(parents,before);
});

test('A.15 rejects invalid sibling and parent configurations',()=>{
 assert.throws(()=>createSiblingRecipes(BREEDING_PRESETS,[1,1,1],{count:9}),/1–8/);
 assert.throws(()=>createSiblingRecipes(BREEDING_PRESETS,[0,0,0],opts),/nonzero|contribute/);
 assert.throws(()=>createSiblingRecipes(BREEDING_PRESETS,[10,10],opts),/Three parent/);
});

test('A.15 actual independent 3D trial fills multiple Z layers with inherited genes',()=>{
 const t=evaluateSibling(recipes()[0],{steps:48,worldSeed:1234});
 assert.ok(t.metrics.cells>200);assert.ok(t.metrics.depth>3);
 assert.equal(t.metrics.genes.reduce((a,b)=>a+b,0),t.metrics.cells);
 assert.equal(t.preview.pixels.length,t.preview.size*t.preview.size*3);
 assert.equal(t.phenotype.laws.length,3);
});

test('A.15 trials are perfectly reproducible from same recipe and trial seed',()=>{
 const recipe=recipes()[1],cfg={steps:40,worldSeed:663311};
 assert.deepEqual(evaluateSibling(recipe,cfg),evaluateSibling(recipe,cfg));
});

test('A.15 changing parent law changes actual grown 3D occupied geometry',()=>{
 const a=breedThreeParents(BREEDING_PRESETS,[100,0,0],{seed:5541,mutation:0,crossover:0});
 const b=breedThreeParents(BREEDING_PRESETS,[0,100,0],{seed:5541,mutation:0,crossover:0});
 const one=evaluateSibling(a,{steps:58,worldSeed:8759});
 const two=evaluateSibling(b,{steps:58,worldSeed:8759});
 assert.notDeepEqual(one.preview.pixels,two.preview.pixels);
 assert.notDeepEqual(one.metrics.genes,two.metrics.genes);
});

test('A.15 trials never change artist live CrystalWorld',()=>{
 const artist=new CrystalWorld(170);artist.seed(90,89,0,undefined,'volumeNeedle');artist.step();
 const before=artist.snapshot();
 evaluateSibling(recipes()[1],{steps:30});
 assert.deepEqual(artist.snapshot(),before);
});

test('A.15 palette re-render changes preview pixels without changing phenotype map',()=>{
 const t=evaluateSibling(recipes()[2],{steps:30});
 const before=structuredClone(t.preview);
 const lutA=new Uint8ClampedArray(256*3),lutB=new Uint8ClampedArray(256*3);
 for(let i=0;i<256;i++){lutA[i*3]=240;lutA[i*3+1]=10;lutA[i*3+2]=10;lutB[i*3]=20;lutB[i*3+1]=230;lutB[i*3+2]=210;}
 const a=nurseryPixels(t.preview,lutA),b=nurseryPixels(t.preview,lutB);
 assert.notDeepEqual(a.data,b.data);assert.deepEqual(t.preview,before);
});

test('A.15 export includes only KEEP specimens; import retains DNA and phenotype',()=>{
 const r=recipes()[0],t=evaluateSibling(r,{steps:30});
 const saved={id:'G1-1-1',generation:1,kept:true,recipe:r,...t};
 const draft={...saved,id:'G1-1-2',kept:false};
 const packet=exportNursery([saved,draft],2);
 assert.equal(packet.schema,NURSERY_SCHEMA);assert.equal(packet.specimens.length,1);
 const restored=importNursery(JSON.parse(JSON.stringify(packet)));
 assert.equal(restored.generation,2);assert.equal(restored.specimens.length,1);
 assert.deepEqual(restored.specimens[0].preview,t.preview);
 assert.deepEqual(restored.specimens[0].phenotype,t.phenotype);
});

test('A.15 malformed external nursery archives are rejected',()=>{
 assert.throws(()=>importNursery({schema:'unsupported',specimens:[]}),/supported nursery archive/i);
 assert.throws(()=>importNursery({schema:NURSERY_SCHEMA,specimens:new Array(37).fill({})}),/supported nursery archive/i);
 assert.throws(()=>importNursery({schema:NURSERY_SCHEMA,specimens:[{recipe:{laws:[1,0,0]},phenotype:{laws:[1,0,0]},preview:{size:4,pixels:[]}}]}),/Invalid nursery preview/);
});

test('A.15 can promote a measured child phenotype into future three-parent recombination',()=>{
 const trial=evaluateSibling(recipes()[0],{steps:42});
 const inherited=breedThreeParents([trial.phenotype,...BREEDING_PRESETS.slice(1)], [60,25,15],{seed:5566,mutation:.1,crossover:.2});
 assert.ok(inherited.laws.every(v=>v>=0));
 const evolved=evaluateSibling(inherited,{steps:28});
 assert.ok(evolved.metrics.cells>0);
});

test('A.15 isometric thumbnails contain only exposed real 3D occupied voxels',()=>{
  const record=evaluateSibling(recipes()[0],{steps:35});
  const cloud=record.preview.cloud,n=record.preview.size;
  assert.ok(cloud.length>50&&cloud.length%5===0&&cloud.length<=11000);
  for(let k=0;k<cloud.length;k+=5){
    for(let j=0;j<3;j++)assert.ok(cloud[k+j]>=0&&cloud[k+j]<n);
    assert.ok(cloud[k+3]>=1&&cloud[k+3]<=3);
  }
});

test('A.15 import rejects maliciously large or malformed isometric geometry',()=>{
  const r=recipes()[0],t=evaluateSibling(r,{steps:30});
  const saved=exportNursery([{id:'g-1',generation:1,kept:true,recipe:r,...t}]);
  saved.specimens[0].preview.cloud=[1,2,3,4,999];
  assert.throws(()=>importNursery(saved),/Invalid 3D nursery geometry/);
});
