/** A.17 Evolutionary Ecosystems: THREE separate heritable mineral bloodlines
 * growing in ONE shared 3D nutrient volume. Their fronts contest the same
 * empty voxels, and the volume's global nutrient solver couples all lineages.
 * Species/fitness language is artistic; this is not calibrated ecology.
 */
import {CrystalWorld} from './growth.js';
import {breedThreeParents,normalizeGenome,captureVolumeGenome} from './breeding.js';

export const ECOSYSTEM_SCHEMA='mathemagical-crystal-ecosystem/v1';
const clampEco=(x,a,b)=>Math.max(a,Math.min(b,x));
const uintEco=v=>(Number(v)>>>0)||1;
const cloneEco=x=>JSON.parse(JSON.stringify(x));
const POSITIONS=Object.freeze([[.39,.41,46],[.61,.41,46],[.50,.63,46]]);

/** True 6-face touching grain contacts, plus 26-neighbor contested frontiers. */
export function ecosystemMetrics(volume){
  const n=volume.size,owner=volume.owner,counts=[0,0,0],touch=[0,0,0];
  let contacts=0,scarce=0,available=0;
  for(let z=2;z<n-2;z++)for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){
    const i=volume.index(x,y,z),id=owner[i];
    if(id>0 && id<=3){counts[id-1]++;
      for(const j of [i+1,i+n,i+volume.area])if(owner[j]&&owner[j]!==id){contacts++;touch[id-1]++;if(owner[j]<=3)touch[owner[j]-1]++;}
    }else if(!id){available++;if(volume.nutrient[i]<.3)scarce++;}
  }
  let contested=0;const frontierByLineage=[0,0,0];
  for(const contenders of volume.frontier.values()){
    if(contenders.size>1)contested++;
    for(const grain of contenders)if(grain>0&&grain<=3)frontierByLineage[grain-1]++;
  }
  return {counts,contacts,contactsByLineage:touch,frontierByLineage,contested,starvedFraction:available?scarce/available:0,
    freeCells:available,occupied:counts.reduce((a,b)=>a+b,0)};
}

/** Up to 3,000 exposed 3D cells, preserving owner identity in the projection. */
export function ecosystemCloud(volume){
  const n=volume.size,cloud=[];
  for(let z=2;z<n-2;z++)for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){
    const i=volume.index(x,y,z),id=volume.owner[i];if(!id)continue;
    if([i+1,i+n,i+volume.area].every(j=>volume.owner[j]===id))continue;
    cloud.push([x,y,z,id,volume.gene[i],volume.birth[i]%256]);
  }
  cloud.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
  const stride=Math.max(1,Math.ceil(cloud.length/3000));
  return cloud.filter((_,i)=>i%stride===0).flat();
}

/** Fixed spatial arrangement; every bloodline shares the same environment. */
export function startEcosystem(recipes,{seed=112358,scarcity=.6,steps=0,generation=1}={}){
  if(!Array.isArray(recipes)||recipes.length!==3)throw Error('Ecosystem needs three genomic bloodlines');
  const dna=recipes.map(r=>({...cloneEco(r),...normalizeGenome(r)}));
  const world=new CrystalWorld(172);world.randomize(uintEco(seed));
  world.config.volumeGrowth=.80;
  world.config.volumeDiffusion=.12;
  world.config.volumeSupply=.04+(1-clampEco(scarcity,0,1))*.77;
  world.config.volumeBranches=.57;
  const initialFuel=1-.46*clampEco(scarcity,0,1);
  world.volume.nutrient.fill(initialFuel);world.volume.nextNutrient.fill(initialFuel);
  const modes=['volumeNeedle','volumeOcta','volumeCoral'];
  for(let i=0;i<3;i++){
    const genome=dna[i],mode=modes[genome.laws.indexOf(Math.max(...genome.laws))];
    const [sx,sy,depth]=POSITIONS[i];
    world.config.volumeSeedDepth=depth;
    if(!world.seed(world.size*sx,world.size*sy,genome.angles[i]||0,undefined,mode))throw Error('Could not seed ecosystem lineage '+(i+1));
    if(!world.volume.imprintHybrid(i+1,{...genome,seed:(uintEco(genome.seed)||uintEco(seed+i*73856093))>>>0,
       mutation:clampEco(Number(genome.mutation)||.11,0,1),crossover:clampEco(Number(genome.crossover)||.24,0,1),
       parents:[{name:genome.name}]}) )throw Error('Could not imprint lineages');
  }
  const session={world,recipes:dna,generation,seed:uintEco(seed),scarcity:clampEco(scarcity,0,1),seasons:0,history:[]};
  if(steps)advanceEcosystem(session,steps);
  return session;
}
export function advanceEcosystem(session,steps=24){
  if(!Number.isInteger(steps)||steps<1||steps>160)throw Error('Season length must be 1–160 steps');
  for(let i=0;i<steps;i++)session.world.step();
  session.seasons++;
  const metrics=ecosystemMetrics(session.world.volume);
  session.history.push({generation:session.generation,season:session.seasons,ticks:session.world.ticks,...cloneEco(metrics)});
  if(session.history.length>30)session.history.shift();
  return metrics;
}
export function ecosystemStatus(session){
  const vol=session.world.volume,m=ecosystemMetrics(vol);
  const samples=Array.from({length:3},(_,i)=>captureVolumeGenome(vol,i+1));
  return {generation:session.generation,season:session.seasons,ticks:session.world.ticks,
    ...m,samples,cloud:ecosystemCloud(vol),size:vol.size};
}
/** What survives an ecosystem season actually becomes the next generation's DNA.
 * We retain three extant lines, but weight contributions by measured occupancy
 * and favor diversity in crossover to avoid collapsing into a single cloneEco.
 * A dead lineage cannot be resurrected from its former recipe.
 */
export function nextEcosystemGeneration(session){
  if(session.seasons<1)throw Error('Run at least one season before selecting offspring');
  const state=ecosystemStatus(session);
  const survivors=state.samples.map((g,i)=>g?{...g,original:i}:null).filter(Boolean);
  if(survivors.length<2)throw Error('At least two surviving lineages are needed to breed');
  // Occupied mass matters, but the number of exposed legal growth sites also
  // measures a lineage's capacity to survive the next nutrient-limited season.
  // Round-robin deposition budgets make raw voxel counts nearly equal early on.
  const maxFront=Math.max(1,...state.frontierByLineage);
  const f=state.counts.map((c,i)=>Math.sqrt(c)*(.5+.5*state.frontierByLineage[i]/maxFront));
  const total=Math.max(1,f.reduce((a,b)=>a+b,0));
  const ranked=[0,1,2].sort((a,b)=>state.counts[b]-state.counts[a]);
  const next=[];
  for(let child=0;child<3;child++){
    const parentOrder=[ranked[child%ranked.length],ranked[(child+1)%ranked.length],ranked[(child+2)%ranked.length]];
    const parents=parentOrder.map(index=>state.samples[index]||survivors[0]);
    const weights=parentOrder.map((index,k)=>10+100*(f[index]/total)+(k===0?35:0));
    const seed=(session.seed^Math.imul(session.generation+1,0x9e3779b1)^Math.imul(child+1,0x85ebca6b))>>>0||1;
    next.push({...breedThreeParents(parents,weights,{mutation:.12+child*.055,crossover:.38+child*.09,seed}),
      name:`ECOSYSTEM G${session.generation+1} · DESCENDANT ${child+1}`});
  }
  const successor=startEcosystem(next,{seed:session.seed,scarcity:session.scarcity,generation:session.generation+1});
  successor.history=[...session.history,{event:'selection',generation:session.generation,counts:state.counts,
    parents:state.samples.map(s=>s?.name||null)}].slice(-30);
  return successor;
}
export function exportEcosystem(session){
  const state=ecosystemStatus(session);
  return {schema:ECOSYSTEM_SCHEMA,generation:session.generation,seed:session.seed,
    scarcity:session.scarcity,seasons:session.seasons,ticks:state.ticks,
    recipes:session.recipes.map(cloneEco),survivors:state.samples.map(s=>s?cloneEco(s):null),
    metrics:{counts:state.counts,frontierByLineage:state.frontierByLineage,contacts:state.contacts,contested:state.contested,
      starvedFraction:state.starvedFraction},history:session.history.map(cloneEco)};
}
