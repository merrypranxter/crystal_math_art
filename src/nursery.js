/**
 * A.15 Mutation Nursery — bounded, deterministic, real 3D growth trials.
 * This module never mutates the artist's live world. It simulates a smaller
 * independent CrystalWorld for each sibling and records the resulting phenotype.
 * The DNA terms are procedural analogies, not biological genetics.
 */
import {CrystalWorld} from './growth.js';
import {breedThreeParents, normalizeGenome, plantOffspring, captureVolumeGenome} from './breeding.js';

export const NURSERY_SCHEMA='mathemagical-crystal-nursery/v1';
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
const uint=v=>(Number(v)>>>0)||1;
const clone=v=>JSON.parse(JSON.stringify(v));
function seeded(seed){
  let s=uint(seed);
  return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
}

/** Make recipe siblings with the SAME trial environment but distinct offspring DNA.
 * Parent variation is bounded; the original parent samples are untouched.
 */
export function createSiblingRecipes(parents, weights, {count=4, variation=.32, mutation=.12, crossover=.25, seed=1}={}){
  if(!Number.isInteger(count)||count<1||count>8)throw new Error('Nursery batch must have 1–8 siblings');
  if(!Array.isArray(weights)||weights.length!==3)throw new Error('Three parent weights required');
  const random=seeded(seed), v=clampN(Number(variation)||0,0,1);
  return Array.from({length:count},(_,i)=>{
    const perturbed=weights.map(w=>Math.max(0,Number(w)||0)*(1+(random()*2-1)*v*1.75));
    if(perturbed.every(w=>w===0))throw new Error('At least one parent must contribute');
    const childSeed=(Math.imul(uint(seed),0x9e3779b1) ^ Math.imul(i+1,0x85ebca6b) ^ Math.floor(random()*4294967295))>>>0;
    // Slight directional variation is inherited with this child, rather than a
    // post-hoc rotation of its rendered image.
    const sources=parents.map(p=>clone(normalizeGenome(p)));
    for(const p of sources)for(let k=0;k<3;k++)p.angles[k]+=(random()-.5)*v*.55;
    const recipe=breedThreeParents(sources,perturbed,{mutation:clampN(mutation+v*(random()-.5)*.18,0,1),
      crossover:clampN(crossover+v*(random()-.5)*.24,0,1),seed:childSeed||1});
    recipe.name=`SIBLING ${String(i+1).padStart(2,'0')}`;
    return recipe;
  });
}

/** Compact fallback phenotype map, 3 bytes per pixel: gene, birth phase, Z thickness.
 * Recolored when the artist changes palettes; this is simulation-derived data.
 */
export function phenotypeMap(volume){
  const n=volume.size,map=new Array(n*n*3).fill(0);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    let depth=0,representative=-1;
    for(let z=0;z<n;z++){
      const i=volume.index(x,y,z);
      if(volume.owner[i]){depth++;if(representative<0)representative=i;}
    }
    if(representative<0)continue;
    const k=(y*n+x)*3;
    map[k]=volume.gene[representative]||1;
    map[k+1]=volume.birth[representative]%256;
    map[k+2]=Math.min(255,depth);
  }
  return map;
}

/** Run ONE sibling's actual 3D mineral evolution in a disposable, independent world.
 * All sibling trials use the same world seed, specimen position and environment.
 */
export function evaluateSibling(recipe,{steps=56, worldSeed=6939151, size=172}={}){
  if(!Number.isInteger(steps)||steps<10||steps>130)throw Error('Nursery trials must be 10–130 steps');
  if(!Number.isInteger(size)||size<150||size>220)throw Error('Nursery world size must be 150–220');
  const world=new CrystalWorld(size);
  world.randomize(uint(worldSeed));
  world.config.volumeGrowth=.72;
  world.config.volumeSupply=.45;
  const child=plantOffspring(world,recipe);
  if(!child)throw Error('Could not nucleate trial offspring');
  for(let tick=0;tick<steps;tick++)world.step();
  const stats=world.volume.stats();
  const phenotype=captureVolumeGenome(world.volume,child.grainId);
  if(!phenotype)throw Error('Trial yielded no viable mineral');
  phenotype.name=`${recipe.name} · GROWN GENOME`;
  phenotype.source='nursery-grown-phenotype';
  const geneCounts=[stats.volumeNeedleCells,stats.volumeOctaCells,stats.volumeCoralCells];
  return {
    phenotype:clone(phenotype),
    metrics:{cells:stats.volumeCells,depth:stats.volumeDepthSlices,roughness:phenotype.roughness,
      genes:geneCounts,frontier:stats.volumeFrontier,steps},
    preview:{size:world.volume.size,pixels:phenotypeMap(world.volume),cloud:exposedVoxelCloud(world.volume)}
  };
}

/** Exposed positive-X, positive-Y and positive-Z voxel faces for a truthful
 * isometric sibling render. 5 bytes per exposed cube: x,y,z,gene,birth.
 * Zero contribution from unoccupied or fully hidden interior cells.
 */
export function exposedVoxelCloud(volume){
  const n=volume.size,cloud=[];
  for(let z=1;z<n-1;z++)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
    const i=volume.index(x,y,z);if(!volume.owner[i])continue;
    const faces=[volume.index(x+1,y,z),volume.index(x,y+1,z),volume.index(x,y,z+1)];
    if(faces.every(j=>volume.owner[j]===volume.owner[i]))continue;
    cloud.push([x,y,z,volume.gene[i]||1,volume.birth[i]%256]);
  }
  cloud.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
  // Prefer the full contour; 12k bytes bounded, no GPU or external assets.
  const max=2200;
  const kept=cloud.length<=max?cloud:cloud.filter((_,i)=>i%Math.ceil(cloud.length/max)===0);
  return kept.flat();
}

/** Data-only palette renderer: no WebGL, and no mutation of crystal state. */
export function nurseryPixels(preview,lut){
  const n=preview.size,map=preview.pixels;
  if(!Number.isInteger(n)||n<1||n>48||!Array.isArray(map)||map.length!==n*n*3)throw Error('Malformed nursery thumbnail');
  const out=new Uint8ClampedArray(n*n*4);
  for(let i=0;i<n*n;i++){
    const p=i*3, gene=map[p],birth=map[p+1],depth=map[p+2];
    if(!gene)continue;
    const t=((gene*.176+birth*.0047+depth*.028)%1+1)%1;
    const k=Math.floor(t*255)*3,q=i*4;
    const shade=.48+.45*Math.min(1,depth/9);
    for(let c=0;c<3;c++)out[q+c]=Math.min(255,Math.round((lut[k+c]||0)*shade+12));
    out[q+3]=255;
  }
  return {width:n,height:n,data:out};
}

/** Curated gallery export is explicit, portable and does not rely on file:// storage. */
export function exportNursery(records, generation=1){
  return {schema:NURSERY_SCHEMA,generation:clampN(Math.trunc(generation)||1,1,999),
    specimens:records.filter(r=>r.kept).slice(0,36).map(r=>({
      id:String(r.id).slice(0,80),generation:clampN(Math.trunc(r.generation)||1,1,999),kept:true,
      recipe:clone(r.recipe),phenotype:clone(r.phenotype),metrics:clone(r.metrics),preview:clone(r.preview)}))};
}
export function importNursery(doc){
  if(!doc||doc.schema!==NURSERY_SCHEMA||!Array.isArray(doc.specimens)||doc.specimens.length>36)throw Error('Not a supported nursery archive');
  const specimens=doc.specimens.map((s,index)=>{
    if(!s||!s.recipe||!s.phenotype||!s.preview)throw Error('Incomplete specimen '+index);
    const phenotype=normalizeGenome(s.phenotype);
    const dna=normalizeGenome(s.recipe);
    const n=Number(s.preview.size),pixel=s.preview.pixels;
    const cloud=s.preview.cloud||[];
    if(!Array.isArray(cloud)||cloud.length%5!==0||cloud.length>11000||cloud.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Invalid 3D nursery geometry');
    if(!Number.isInteger(n)||n<1||n>48||!Array.isArray(pixel)||pixel.length!==n*n*3||pixel.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Invalid nursery preview');
    const m=s.metrics||{},genes=Array.isArray(m.genes)&&m.genes.length===3?m.genes:[0,0,0];
    return {id:String(s.id||`import-${index}`).slice(0,80),generation:clampN(Math.trunc(Number(s.generation))||1,1,999),kept:true,
      recipe:{...dna,seed:uint(s.recipe.seed),mutation:clampN(Number(s.recipe.mutation)||0,0,1),crossover:clampN(Number(s.recipe.crossover)||0,0,1)},
      phenotype,metrics:{cells:clampN(Math.trunc(Number(m.cells))||0,0,1e7),depth:clampN(Math.trunc(Number(m.depth))||0,0,48),roughness:clampN(Number(m.roughness)||0,0,1),genes:genes.map(v=>clampN(Math.trunc(Number(v))||0,0,1e7)),frontier:clampN(Math.trunc(Number(m.frontier))||0,0,1e7),steps:clampN(Math.trunc(Number(m.steps))||56,10,130)},
      preview:{size:n,pixels:pixel.slice(),cloud:cloud.slice()}};
  });
  return {generation:clampN(Math.trunc(Number(doc.generation))||1,1,999),specimens};
}
