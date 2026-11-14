/**
 * A.14 Crystal Breeding Chamber: artist-controlled 3-parent recipes for the
 * procedural x/y/z growth laws. Genetic language here is metaphorical.
 * Parents are immutable data snapshots captured from actual occupied 3D voxels.
 * The resulting mixture alters future attachment competition, NOT only color.
 * No network or paid backend is required.
 */
const clampB=(v,a,b)=>Math.min(b,Math.max(a,v));
const DEFAULT_LAWS=['NEEDLE STAR','OCTAHEDRAL','CAVERN CORAL'];
export const BREEDING_PRESETS=Object.freeze([
  Object.freeze({name:'NEEDLE STAR · ARCHETYPE',source:'preset',cells:0,laws:[1,0,0],angles:[.12,.12,.12],roughness:.18}),
  Object.freeze({name:'OCTAHEDRAL · ARCHETYPE',source:'preset',cells:0,laws:[0,1,0],angles:[.72,.72,.72],roughness:.36}),
  Object.freeze({name:'CAVERN CORAL · ARCHETYPE',source:'preset',cells:0,laws:[0,0,1],angles:[-.34,-.34,-.34],roughness:.82})
]);
export function normalizeGenome(input){
  if(!input || !Array.isArray(input.laws) || input.laws.length!==3)throw new Error('A mineral DNA sample needs exactly three kinetic law weights');
  const raw=input.laws.map(n=>Number(n));
  if(raw.some(n=>!Number.isFinite(n)||n<0))throw new Error('DNA weights must be finite and nonnegative');
  const sum=raw.reduce((a,b)=>a+b,0);
  if(sum<1e-8)throw new Error('DNA sample has no viable growth law');
  const lawAngles=Array.isArray(input.angles)&&input.angles.length===3?input.angles:[0,0,0];
  const angles=lawAngles.map(n=>Number.isFinite(Number(n))?Number(n):0);
  return {name:String(input.name||'UNNAMED MINERAL').slice(0,100),source:String(input.source||'saved').slice(0,48),
    grainId:Number(input.grainId)||0,cells:Math.max(0,Number(input.cells)||0),
    laws:raw.map(x=>x/sum),angles,
    roughness:clampB(Number.isFinite(Number(input.roughness))?Number(input.roughness):.5,0,1)};
}
/** Measure actual 3D material genotype and circular-average each law's director. */
export function captureVolumeGenome(volume,grainId){
  if(!Number.isInteger(grainId)||grainId<1)return null;
  const count=[0,0,0],sin=[0,0,0],cos=[0,0,0];
  let cells=0,exposed=0;
  const n=volume.size;
  for(let i=0;i<volume.count;i++){
    if(volume.owner[i]!==grainId)continue;
    const type=volume.gene[i]-1;
    if(type<0||type>2)continue;
    count[type]++;cells++;
    sin[type]+=Math.sin(volume.geneAngle[i]);cos[type]+=Math.cos(volume.geneAngle[i]);
    const x=i%n,y=Math.floor(i/n)%n,z=Math.floor(i/volume.area);
    for(const [dx,dy,dz] of [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]]){
      const px=x+dx,py=y+dy,pz=z+dz;
      if(px<0||py<0||pz<0||px>=n||py>=n||pz>=n||volume.owner[volume.index(px,py,pz)]!==grainId)exposed++;
    }
  }
  if(!cells)return null;
  const sourceGrain=volume.world.grains[grainId-1];
  const fallback=sourceGrain?.angle||0;
  return normalizeGenome({name:`SPECIMEN ${String(grainId).padStart(3,'0')} · ${sourceGrain?.morphology||'VOLUME'}`,
    source:'captured-voxel-phenotype',grainId,cells,laws:count,
    angles:count.map((v,i)=>v?Math.atan2(sin[i],cos[i]):fallback),
    roughness:clampB(exposed/(cells*6)*1.7,0,1)});
}
/** Weighted three-parent recombination: each per-law orientation is mixed
 * circularly. Mutation changes the offspring's FUTURE sampling rate, not
 * a captured parent's original DNA or the current mineral geometry.
 */
export function breedThreeParents(parents,weights=[40,35,25],{mutation=.12,crossover=.25,seed=1}={}){
  if(!Array.isArray(parents)||parents.length!==3)throw new Error('Breeding requires three parent samples');
  const sources=parents.map(normalizeGenome);
  const ws=weights.map(w=>clampB(Number(w)||0,0,100));
  const total=ws.reduce((a,b)=>a+b,0);
  if(total<=0)throw new Error('At least one parent needs a nonzero contribution');
  const fractions=ws.map(w=>w/total);
  const laws=[0,0,0],angles=[0,0,0];
  let roughness=0;
  for(let p=0;p<3;p++){
    roughness+=sources[p].roughness*fractions[p];
    for(let k=0;k<3;k++)laws[k]+=sources[p].laws[k]*fractions[p];
  }
  for(let k=0;k<3;k++){
    let x=0,y=0;
    for(let p=0;p<3;p++){
      const amount=fractions[p]*sources[p].laws[k];
      x+=Math.cos(sources[p].angles[k])*amount;y+=Math.sin(sources[p].angles[k])*amount;
    }
    angles[k]=Math.atan2(y,x);
  }
  const m=clampB(Number(mutation)||0,0,1);
  return {version:1,name:'TRI-PARENT MINERAL OFFSPRING',source:'tri-parent-breeding',
    parents:sources.map(s=>({name:s.name,grainId:s.grainId,cells:s.cells,laws:[...s.laws]})),
    parentWeights:fractions,seed:(Number(seed)>>>0)||1,
    laws:laws.map(v=>v*(1-.15*m)+.05*m),angles,
    roughness:clampB(roughness+.12*m,0,1),
    crossover:clampB(Number(crossover)||0,0,1),mutation:m};
}
export function describeGenome(genome){
  return genome.laws.map((fraction,i)=>({name:DEFAULT_LAWS[i],share:Math.round(fraction*100)}));
}
/** Plant offspring into existing world, leaving other grains untouched. */
export function plantOffspring(world,recipe){
  if(world.grains.length>=250)return null;
  const r=normalizeGenome(recipe);
  const modes=['volumeNeedle','volumeOcta','volumeCoral'];
  const dominant=r.laws.indexOf(Math.max(...r.laws));
  const n=world.size;
  let best=null,bestDist=-Infinity;
  for(let i=0;i<35;i++){
    const x=(.16+.68*world.rand())*n,y=(.16+.68*world.rand())*n;
    const distance=world.grains.filter(g=>g.z!==undefined).reduce((v,g)=>Math.min(v,Math.hypot(x-g.x,y-g.y)),Infinity);
    if(distance>bestDist){best={x,y};bestDist=distance;}
  }
  if(!best||!world.seed(best.x,best.y,world.rand()*Math.PI*2,undefined,modes[dominant]))return null;
  const id=world.grains.length;
  const planted=world.volume.imprintHybrid(id,recipe);
  if(!planted)throw new Error('Offspring nucleated without a viable 3D cell');
  return {grainId:id,seedX:best.x,seedY:best.y,initialCells:planted};
}
