/**
 * A.11 Volumetric Crystallization — a separately evolving, honest 3D solid
 * occupancy and dissolved-material model. Material attaches in x, y AND z.
 * 6-neighbor explicit nutrient diffusion and a grain-fair stochastic
 * 26-neighbor interface deposition are physics-inspired approximations,
 * NOT a thermodynamic 3D phase-field PDE, DLA harmonic measure, or atomistics.
 * All edits and optical projections are deterministic for a fixed world seed.
 */
export const VOLUME_MODES = Object.freeze({
  volumeNeedle: Object.freeze({ name:'VOLUME · SIX-AXIS NEEDLE STAR', symmetry:6, focus:2.4 }),
  volumeOcta: Object.freeze({ name:'VOLUME · OCTAHEDRAL FACETS', symmetry:8, focus:2.0 }),
  volumeCoral: Object.freeze({ name:'VOLUME · MUTANT CAVERN CORAL', symmetry:0, focus:.45 }),
});
const VOLUME_NEIGHBORS=[];
for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(x||y||z)VOLUME_NEIGHBORS.push([x,y,z]);
const VOLUME_AXIAL=[[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
const clampV=(v,a,b)=>Math.max(a,Math.min(b,v));
export const GENE_LAWS=Object.freeze({volumeNeedle:1,volumeOcta:2,volumeCoral:3});
export const GENE_NAMES=Object.freeze(['none','NEEDLE STAR','OCTAHEDRAL','CAVERN CORAL']);
// Deterministic position-only hash; no global RNG change when using a mutation brush.
function geneHash(x,y,z,seed=0){
  let v=(Math.imul(x+1,73856093)^Math.imul(y+1,19349663)^Math.imul(z+1,83492791)^(seed>>>0))>>>0;
  v=Math.imul(v^(v>>>16),2246822507)>>>0;
  return ((v^(v>>>13))>>>0)/4294967296;
}
function angleDifference(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}

export class VolumeField {
  constructor(world){
    this.world=world;
    this.size=clampV(Math.round(world.size/7.7),18,44);
    this.scale=world.size/this.size;
    this.area=this.size*this.size;
    this.count=this.area*this.size;
    this.owner=new Uint8Array(this.count);
    this.nutrient=new Float32Array(this.count).fill(1);
    this.nextNutrient=new Float32Array(this.count).fill(1);
    this.birth=new Uint32Array(this.count);
    this.fossilBirth=new Uint32Array(this.count); // previous mineral generation
    this.generation=new Uint16Array(this.count); // how often this voxel refilled
    this.scar=new Uint8Array(this.count); // cut rock; visible in slice mode
    this.gene=new Uint8Array(this.count); // per-voxel phenotype (1 needle / 2 octa / 3 coral)
    this.geneAngle=new Float32Array(this.count); // inheritable orientation of growth law
    this.lineage=new Uint32Array(this.count); // identity of the mutation event that founded this tissue
    this.mutationSerial=0;this.mutationEvents=0;this.lastMutationEvent=0;
    this.hybrids=new Map(); // per-grain reproducible three-parent growth recipes

    this.frontier=new Map();
    this.deposited=0;
    this.version=0;
    this.active=false;
  }
  index(x,y,z){return z*this.area+y*this.size+x;}
  xyz(i){return [i%this.size,Math.floor(i/this.size)%this.size,Math.floor(i/this.area)];}
  valid(x,y,z){const n=this.size;return x>=2&&y>=2&&z>=2&&x<n-2&&y<n-2&&z<n-2;}
  addNeighbors(x,y,z,grain){
    for(const [dx,dy,dz] of VOLUME_NEIGHBORS){
      const px=x+dx,py=y+dy,pz=z+dz;
      if(!this.valid(px,py,pz))continue;
      const i=this.index(px,py,pz);
      if(this.owner[i])continue;
      let contenders=this.frontier.get(i);
      if(!contenders){contenders=new Set();this.frontier.set(i,contenders);}
      contenders.add(grain);
    }
  }
  /** Choose a local parent gene from material bordering this growth site.
   * This makes multiple laws COMPETE inside one owner grain. A future daughter
   * inherits its winning parent's law and orientation, not the founder's law.
   */
  growthParent(i,grain){
    const [x,y,z]=this.xyz(i),g=this.world.grains[grain-1];
    if(!g)return null;
    const focus=clampV(this.world.config.volumeFacets??.76,0,1);
    const origin=[g.x/this.scale,g.y/this.scale,g.z];
    let winner=null;
    for(const [dx,dy,dz] of VOLUME_NEIGHBORS){
      const px=x+dx,py=y+dy,pz=z+dz;
      if(!this.valid(px,py,pz))continue;
      const j=this.index(px,py,pz);
      if(this.owner[j]!==grain)continue;
      const law=this.gene[j]||GENE_LAWS[g.morphology]||1;
      const ang=this.geneAngle[j];
      const rx=x-origin[0],ry=y-origin[1],rz=z-origin[2],len=Math.hypot(rx,ry,rz)||1;
      const co=Math.cos(ang),si=Math.sin(ang);
      const ux=Math.abs((rx*co+ry*si)/len),uy=Math.abs((-rx*si+ry*co)/len),uz=Math.abs(rz/len);
      const aligned=Math.max(ux,uy,uz);
      const diagonal=Math.min(ux,uy,uz)*Math.sqrt(3);
      const axialStep=Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz));
      const direction=law===1?aligned:law===2?diagonal:.45;
      const shape=law===3?.70:(.20+.80*focus*Math.pow(direction,2.2+focus*7));
      const variation=geneHash(x+px,y+py,z+pz,this.world.seedValue)*.13;
      // Prefer local connectivity and an exposed advancing face; the fixed
      // microscopic bias prevents ties from favoring iteration order.
      const attachment=(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)===1?1:.88);
      const score=shape*attachment*(.90+variation);
      if(!winner||score>winner.score)winner={gene:law,angle:ang,lineage:this.lineage[j],score,parent:j};
    }
    return winner;
  }
  deposit(x,y,z,grain,inherited=null){
    if(!this.valid(x,y,z))return false;
    const i=this.index(x,y,z);
    if(this.owner[i])return false;
    const g=this.world.grains[grain-1];
    const geneSource=inherited || this.growthParent(i,grain);
    this.owner[i]=grain;
    this.gene[i]=geneSource?.gene||GENE_LAWS[g?.morphology]||1;
    this.geneAngle[i]=geneSource?.angle??g?.angle??0;
    this.lineage[i]=geneSource?.lineage||0;
    // A.14: parent-sensitive CROSSOVER samples a weighted gene law from the
    // implanted recipe. Most daughters still inherit their local growth front;
    // this occasionally resurrects a recessive parent on a new exposed face.
    const genome=this.hybrids.get(grain);
    if(genome && geneSource){
      const crossoverHash=geneHash(x,y,z,(genome.seed^this.world.seedValue)^981733);
      const m=genome.mutation;
      if(crossoverHash<genome.crossover){
        let r=geneHash(x+19,y+37,z+11,(genome.seed^grain)^78967);
        let law=2;
        for(let k=0;k<3;k++){r-=genome.laws[k];if(r<=0){law=k;break;}}
        this.gene[i]=law+1;
        this.geneAngle[i]=genome.angles[law];
        this.lineage[i]=genome.lineage;
      }
      if(m>0 && geneHash(x+7,y+9,z+13,genome.seed^9277)<m*.11){
        this.gene[i]=1+Math.floor(3*geneHash(x+3,y+5,z+31,genome.seed^grain));
        this.geneAngle[i]=genome.angles[this.gene[i]-1]+(geneHash(x+17,y+41,z+3,genome.seed^577)-.5)*m*1.8;
        this.lineage[i]=genome.lineage;
      }
    }
    this.birth[i]=this.world.ticks+1;
    if(this.fossilBirth[i])this.generation[i]=Math.min(65535,this.generation[i]+1);
    this.scar[i]=0;
    this.nutrient[i]=0;
    this.frontier.delete(i);
    this.addNeighbors(x,y,z,grain);
    this.deposited++;this.version++;
    return true;
  }
  nucleate(x,y,z,grain){
    const n=this.size;
    const cx=clampV(Math.round(x/this.scale),3,n-4);
    const cy=clampV(Math.round(y/this.scale),3,n-4);
    const cz=clampV(Math.round(z),3,n-4);
    let count=0;
    for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(dx*dx+dy*dy+dz*dz>2)continue;
      if(this.deposit(cx+dx,cy+dy,cz+dz,grain))count++;
    }
    this.active=this.active||count>0;
    return count;
  }
  /** Install a three-parent phenotype in an already-planted volume grain.
   * Genes are distributed spatially through its existing 3D embryo, not
   * painted into the final image. These cells become parents to future voxels.
   */
  imprintHybrid(grain,recipe){
    if(!this.world.grains[grain-1] || !Array.isArray(recipe.laws) || recipe.laws.length!==3)return 0;
    const ids=[];
    for(let i=0;i<this.count;i++)if(this.owner[i]===grain)ids.push(i);
    if(!ids.length)return 0;
    const raw=recipe.laws.map(v=>Math.max(0,Number(v)||0));
    const total=raw.reduce((a,b)=>a+b,0);if(total<=0)return 0;
    const laws=raw.map(v=>v/total);
    const token=this.newMutationEpoch();
    const seed=(Number(recipe.seed)>>>0)||1;
    const hybrid={laws,angles:recipe.angles.map(v=>Number(v)||0),
      crossover:clampV(Number(recipe.crossover)||0,0,1),
      mutation:clampV(Number(recipe.mutation)||0,0,1),
      roughness:clampV(Number(recipe.roughness)||0,0,1),seed,lineage:token,
      parents:(recipe.parents||[]).map(p=>({name:String(p.name),grainId:p.grainId||0}))};
    // Allocate quotas with a largest-remainder pass and ensure that any
    // meaningful parent has at least one founding cell (when space permits).
    const quotas=laws.map(p=>p*ids.length);
    const counts=quotas.map(v=>Math.floor(v));
    let remaining=ids.length-counts.reduce((a,b)=>a+b,0);
    const fractional=[0,1,2].sort((a,b)=>(quotas[b]-counts[b])-(quotas[a]-counts[a]));
    for(let k=0;k<remaining;k++)counts[fractional[k%3]]++;
    for(let k=0;k<3;k++)if(laws[k]>.04&&counts[k]===0&&ids.length>=3){
      const donor=counts.indexOf(Math.max(...counts));if(counts[donor]>1){counts[donor]--;counts[k]++;}
    }
    ids.sort((a,b)=>{
      const [ax,ay,az]=this.xyz(a),[bx,by,bz]=this.xyz(b);
      return geneHash(ax,ay,az,seed^7919)-geneHash(bx,by,bz,seed^7919);
    });
    let cursor=0;
    for(let law=0;law<3;law++)for(let q=0;q<counts[law];q++){
      const i=ids[cursor++];if(i===undefined)break;
      const [x,y,z]=this.xyz(i);
      this.gene[i]=law+1;
      this.geneAngle[i]=hybrid.angles[law]+(geneHash(x,y,z,seed^887)-.5)*hybrid.mutation*.9;
      this.lineage[i]=token;
    }
    this.hybrids.set(grain,hybrid);this.recordMutation(token);
    this.version++;this.world.modified++;
    return ids.length;
  }
  /** One lineage ID per logical edit gesture. Pass the token to each drag
   * sample so crossing the same voxel doesn't create dozens of new generations.
   */
  newMutationEpoch(){return ++this.mutationSerial;}
  mutationSettings({primary='volumeOcta',partner='volumeCoral',mix=.42,rotation=30}={}){
    return {primary:GENE_LAWS[primary]||2,partner:GENE_LAWS[partner]||3,
      mix:clampV(Number(mix)||0,0,1),rotation:(Number(rotation)||0)*Math.PI/180};
  }
  applyMutation(i,options,epoch){
    const grain=this.world.grains[this.owner[i]-1];if(!grain)return false;
    const [x,y,z]=this.xyz(i);
    const choosingPartner=geneHash(x,y,z,this.world.seedValue+1299827)<options.mix;
    const law=choosingPartner?options.partner:options.primary;
    const angle=grain.angle+options.rotation;
    const changed=this.gene[i]!==law||Math.abs(angleDifference(this.geneAngle[i],angle))>.0002;
    if(!changed)return false;
    this.gene[i]=law;this.geneAngle[i]=angle;this.lineage[i]=epoch;
    return true;
  }
  recordMutation(token){
    if(token!==this.lastMutationEvent){this.mutationEvents++;this.lastMutationEvent=token;}
    this.mutationSerial=Math.max(this.mutationSerial,token);
  }
  /** Paint DNA into EXISTING 3D material at an explicit Z center. Owner/grain
   * and occupancy are not changed. Descendants inherit the new law through
   * growthParent(), and can compete with unmodified neighboring surfaces.
   */
  mutateRegion(x,y,r,{zPercent=50,reach=.22,epoch=0,...parameters}={}){
    if(!this.active)return 0;
    const settings=this.mutationSettings(parameters),n=this.size;
    const px=x/this.scale,py=y/this.scale,rr=Math.max(.75,r/this.scale);
    const z0=clampV(Math.round(zPercent/100*(n-1)),2,n-3);
    const half=Math.max(1,Math.round((.02+clampV(reach,0,1)*.38)*n));
    const token=epoch||this.newMutationEpoch();
    let changed=0;
    for(let z=Math.max(2,z0-half);z<=Math.min(n-3,z0+half);z++)
    for(let y0=Math.max(2,Math.floor(py-rr));y0<=Math.min(n-3,Math.ceil(py+rr));y0++)
    for(let x0=Math.max(2,Math.floor(px-rr));x0<=Math.min(n-3,Math.ceil(px+rr));x0++){
      if((x0-px)**2+(y0-py)**2>rr*rr)continue;
      const i=this.index(x0,y0,z);if(!this.owner[i])continue;
      if(this.applyMutation(i,settings,token))changed++;
    }
    if(changed){this.recordMutation(token);this.version++;this.world.modified++;}
    return changed;
  }
  /** Switch the living exposed fronts of all grown volume grains without
   * changing their old interiors. Ideal for mid-life metamorphosis.
   */
  mutateFronts({epoch=0,...parameters}={}){
    if(!this.active)return 0;
    const settings=this.mutationSettings(parameters),token=epoch||this.newMutationEpoch();
    const n=this.size;let changed=0;
    for(let z=2;z<n-2;z++)for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){
      const i=this.index(x,y,z);if(!this.owner[i])continue;
      let exposed=false;
      for(const [dx,dy,dz] of VOLUME_AXIAL){
        const xx=x+dx,yy=y+dy,zz=z+dz;
        if(this.valid(xx,yy,zz)&&!this.owner[this.index(xx,yy,zz)]){exposed=true;break;}
      }
      if(exposed&&this.applyMutation(i,settings,token))changed++;
    }
    if(changed){this.recordMutation(token);this.version++;this.world.modified++;}
    return changed;
  }
  diffuse(){
    const n=this.size,a=this.area,src=this.nutrient,dst=this.nextNutrient;
    // 3D explicit 6-neighbor Laplacian has positive-stencil bound d <= 1/6.
    const d=clampV(this.world.config.volumeDiffusion??.12,0,1/6);
    const replenish=.0005+(this.world.config.volumeSupply??.35)*.004;
    for(let z=1;z<n-1;z++)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
      const i=z*a+y*n+x;
      if(this.owner[i]){dst[i]=0;continue;}
      const lap=src[i-1]+src[i+1]+src[i-n]+src[i+n]+src[i-a]+src[i+a]-6*src[i];
      dst[i]=clampV(src[i]+d*lap+replenish*(1-src[i]),0,1);
    }
    // The outer domain acts as a held-saturation nutrient reservoir.
    for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      if(x!==0&&y!==0&&z!==0&&x!==n-1&&y!==n-1&&z!==n-1)continue;
      dst[z*a+y*n+x]=1;
    }
    this.nutrient=dst;this.nextNutrient=src;
  }
  candidateWeight(i,grain,detailed=false){
    const [x,y,z]=this.xyz(i);
    if(this.owner[i]||!this.valid(x,y,z))return detailed?null:0;
    const fuel=this.nutrient[i];if(fuel<.055)return detailed?null:0;
    const parent=this.growthParent(i,grain);if(!parent)return detailed?null:0;
    const turbulence=(Math.sin(x*1.318+z*.713+grain*3.17)*Math.cos(y*.931-z*.42+grain));
    const disorder=(this.world.config.volumeBranches??.55);
    const wiggle=1+turbulence*(.10+.32*disorder)*(parent.gene===3?1.2:.6);
    let aligned=0;
    for(const [dx,dy,dz] of VOLUME_AXIAL){
      const xx=x+dx,yy=y+dy,zz=z+dz;
      if(this.valid(xx,yy,zz)&&this.owner[this.index(xx,yy,zz)]===grain)aligned++;
    }
    const healing=this.scar[i]?1+clampV(this.world.config.volumeHealing??.65,0,1)*1.4:1;
    const weight=Math.max(0,fuel*(.37+.23*Math.min(4,aligned))*parent.score*wiggle*healing);
    return detailed?{weight,...parent}:weight;
  }
  advance(){
    if(!this.active)return;
    if(this.world.ticks%3===0)this.diffuse();
    const speed=clampV(this.world.config.volumeGrowth??.62,0,1);
    if(speed<=0||!this.frontier.size)return;
    const grains=this.world.grains.filter(g=>VOLUME_MODES[g.morphology]).map(g=>g.id);
    if(!grains.length)return;
    const budget=Math.max(1,Math.floor(speed*33));
    let pool=new Map();
    const repool=()=>{
      pool=new Map(grains.map(id=>[id,[]]));
      for(const [i,ids] of this.frontier)for(const id of ids)pool.get(id)?.push(i);
    };
    repool();
    let changed=false;
    for(let pass=0;pass<budget;pass++){
      if(pass%5===0)repool();
      const grain=grains[(this.world.ticks+pass)%grains.length];
      const cells=pool.get(grain);if(!cells?.length)continue;
      let best=-1,quality=0;
      for(let k=0;k<Math.min(24,cells.length);k++){
        const i=cells[Math.floor(this.world.rand()*cells.length)];
        if(!this.frontier.get(i)?.has(grain))continue;
        const q=this.candidateWeight(i,grain)*(.35+.65*this.world.rand());
        if(q>quality){quality=q;best=i;}
      }
      if(best<0)continue;
      const [x,y,z]=this.xyz(best);
      const inherited=this.candidateWeight(best,grain,true);
      if(inherited&&this.deposit(x,y,z,grain,inherited))changed=true;
    }
    if(changed)this.world.modified++;
  }
  /** Actual three-axis, finite-depth fracture: removes occupied voxels.
   * Touch X/Y locates the cut, selected Z determines its center, reach sets
   * depth. The shear displaces the channel across Z. No image overlay involved.
   * Every removed voxel retains its previous birth for later recrystallization.
   */
  fractureShear(x,y,r,zPercent=50,reach=.65){
    const n=this.size, px=x/this.scale,py=y/this.scale;
    const z0=clampV(Math.round(zPercent/100*(n-1)),2,n-3);
    const halfExtent=Math.max(1,Math.round((.08+clampV(reach,0,1)*.37)*n));
    const rr=Math.max(.6,r/this.scale);
    let removed=0;
    for(let z=Math.max(2,z0-halfExtent);z<=Math.min(n-3,z0+halfExtent);z++){
      const depth=(z-z0)/halfExtent;
      const cx=px+depth*(.8+rr*.65),cy=py-depth*(.6+rr*.50);
      // Crystalline shear: a narrow fissure with deterministic side splinters.
      const splinter=.20*(this.world.config.volumeBranches??.5)*Math.sin(z*1.73+px*.23);
      const rad=rr*(.42+.26*(1-Math.abs(depth))+splinter);
      for(let yy=Math.max(2,Math.floor(cy-rad-1));yy<=Math.min(n-3,Math.ceil(cy+rad+1));yy++)
      for(let xx=Math.max(2,Math.floor(cx-rad-1));xx<=Math.min(n-3,Math.ceil(cx+rad+1));xx++){
        if((xx-cx)**2+(yy-cy)**2>rad*rad)continue;
        const i=this.index(xx,yy,z);
        if(!this.owner[i])continue;
        this.fossilBirth[i]=this.birth[i];
        this.scar[i]=255;
        this.owner[i]=0;this.birth[i]=0;
        this.gene[i]=0;this.geneAngle[i]=0;this.lineage[i]=0;
        this.nutrient[i]=.92;
        removed++;
      }
    }
    if(removed){this.deposited=Math.max(0,this.deposited-removed);this.rebuild();this.world.modified++;}
    return removed;
  }
  meltColumn(x,y,r){
    const px=x/this.scale,py=y/this.scale,rr=r/this.scale,rr2=rr*rr;
    let removed=0;
    // A 2D touch forms a true bore-through-Z excavation, not a flat decal.
    for(let z=2;z<this.size-2;z++)for(let yy=Math.max(2,Math.floor(py-rr));yy<=Math.min(this.size-3,Math.ceil(py+rr));yy++)for(let xx=Math.max(2,Math.floor(px-rr));xx<=Math.min(this.size-3,Math.ceil(px+rr));xx++){
      if((xx-px)**2+(yy-py)**2>rr2)continue;
      const i=this.index(xx,yy,z);
      if(this.owner[i]){this.owner[i]=0;this.birth[i]=0;this.gene[i]=0;this.geneAngle[i]=0;this.lineage[i]=0;this.nutrient[i]=.75;removed++;}
    }
    if(removed){this.deposited=Math.max(0,this.deposited-removed);this.rebuild();this.world.modified++;}
    return removed;
  }
  feedColumn(x,y,r){
    const px=x/this.scale,py=y/this.scale,rr2=(r/this.scale)**2;
    for(let z=2;z<this.size-2;z++)for(let yy=Math.max(2,Math.floor(py-r/this.scale));yy<=Math.min(this.size-3,Math.ceil(py+r/this.scale));yy++)for(let xx=Math.max(2,Math.floor(px-r/this.scale));xx<=Math.min(this.size-3,Math.ceil(px+r/this.scale));xx++){
      if((xx-px)**2+(yy-py)**2<rr2){let i=this.index(xx,yy,z);if(!this.owner[i])this.nutrient[i]=1;}
    }
    this.version++;this.world.modified++;
  }
  rebuild(){
    this.frontier.clear();const n=this.size;
    for(let z=2;z<n-2;z++)for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){
      const i=this.index(x,y,z),grain=this.owner[i];
      if(grain)this.addNeighbors(x,y,z,grain);
    }
    this.active=this.owner.some(v=>v!==0);this.version++;
  }
  slice(level=50){
    const z=clampV(Math.round(clampV(level,0,100)/100*(this.size-1)),0,this.size-1);
    return this.owner.slice(z*this.area,(z+1)*this.area);
  }
  stats(){
    let scars=0,regrown=0,mutated=0,needle=0,octa=0,coral=0;
    const perGrain=new Map();
    for(let i=0;i<this.count;i++){
      if(this.scar[i]&&!this.owner[i])scars++;
      if(this.generation[i]>0&&this.owner[i])regrown++;
      if(this.owner[i]){
        if(this.lineage[i])mutated++;
        if(this.gene[i]===1)needle++;
        else if(this.gene[i]===2)octa++;
        else if(this.gene[i]===3)coral++;
        perGrain.set(this.owner[i],(perGrain.get(this.owner[i])||0)|(1<<this.gene[i]));
      }
    }
    let cells=0,slabs=new Set();let minZ=this.size,maxZ=-1;
    for(let i=0;i<this.owner.length;i++)if(this.owner[i]){
      cells++;const z=Math.floor(i/this.area);slabs.add(z);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
    }
    return {volumeHybrids:this.hybrids.size,volumeCells:cells,volumeDepthSlices:slabs.size,volumeFrontier:this.frontier.size,volumeDeposits:this.deposited,volumeSpan:minZ<=maxZ?maxZ-minZ+1:0,volumeScars:scars,volumeRegrown:regrown,
      volumeMutants:mutated,volumeNeedleCells:needle,volumeOctaCells:octa,volumeCoralCells:coral,
      volumeChimeras:[...perGrain.values()].filter(bits=>(bits&(bits-1))!==0).length,
      volumeMutations:this.mutationEvents};
  }
  snapshot(){return {owner:this.owner.slice(),nutrient:this.nutrient.slice(),nextNutrient:this.nextNutrient.slice(),birth:this.birth.slice(),fossilBirth:this.fossilBirth.slice(),generation:this.generation.slice(),scar:this.scar.slice(),gene:this.gene.slice(),geneAngle:this.geneAngle.slice(),lineage:this.lineage.slice(),
      hybrids:[...this.hybrids].map(([id,g])=>[id,JSON.parse(JSON.stringify(g))]),
      mutationSerial:this.mutationSerial,mutationEvents:this.mutationEvents,lastMutationEvent:this.lastMutationEvent,
      frontier:[...this.frontier].map(([i,ids])=>[i,[...ids]]),deposited:this.deposited,version:this.version,active:this.active};}
  restore(state){
    if(!state)return;
    this.owner=state.owner.slice();this.nutrient=state.nutrient.slice();this.nextNutrient=state.nextNutrient.slice();this.birth=state.birth.slice();
    this.fossilBirth=state.fossilBirth?.slice()||new Uint32Array(this.count);
    this.generation=state.generation?.slice()||new Uint16Array(this.count);
    this.scar=state.scar?.slice()||new Uint8Array(this.count);
    this.gene=state.gene?.slice()||new Uint8Array(this.count);
    this.geneAngle=state.geneAngle?.slice()||new Float32Array(this.count);
    this.lineage=state.lineage?.slice()||new Uint32Array(this.count);
    this.hybrids=new Map((state.hybrids||[]).map(([id,g])=>[id,JSON.parse(JSON.stringify(g))]));
    this.mutationSerial=state.mutationSerial||0;
    this.mutationEvents=state.mutationEvents||0;this.lastMutationEvent=state.lastMutationEvent||0;
    this.frontier=new Map(state.frontier.map(([i,ids])=>[i,new Set(ids)]));
    this.deposited=state.deposited;this.version=state.version+1;this.active=state.active;
  }
}
/**
 * A cheap 2D diagnostic of a GENUINE 3D field. The optional slice view
 * samples exactly one Z layer; projection traverses all Z layers. No changes
 * to crystal physics or RNG. The WebGL body uses its own surface mesh.
 */
export function renderVolumeProjection(volume,lut,{view='projection',slice=50,brightness=.85}={}){
  const n=volume.size,a=volume.area,pixels=new Uint8ClampedArray(a*4);
  const zSlice=clampV(Math.round(clampV(slice,0,100)/100*(n-1)),0,n-1);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    let occupied=0,frontZ=-1,backZ=-1,grain=0,birth=0;
    for(let z=0;z<n;z++){
      if(view==='slice'&&z!==zSlice)continue;
      const i=volume.index(x,y,z),id=volume.owner[i];
      if(!id)continue;
      occupied++;if(frontZ<0){frontZ=z;grain=id;birth=volume.birth[i];}backZ=z;
    }
    if(!occupied){
      if(view==='slice'){
        const j=volume.index(x,y,zSlice);
        if(volume.scar[j]&&volume.fossilBirth[j]){
          const t=((volume.fossilBirth[j]*.009+volume.generation[j]*.13)%1+1)%1;
          const color=Math.floor(t*255)*3,q=(y*n+x)*4;
          for(let c=0;c<3;c++)pixels[q+c]=Math.min(255,lut[color+c]*.42+35);
          pixels[q+3]=185;
        }
      }
      continue;
    }
    const site=volume.index(x,y,view==='slice'?zSlice:frontZ);
    const gene=volume.gene?.[site]||0,heritage=volume.lineage?.[site]||0;
    const pigment=((grain*.173 + birth*.0041 + (backZ-frontZ)*.026 + (volume.generation[site]||0)*.09
      + gene*.131 + (heritage%23)*.019)%1+1)%1;
    const k=Math.floor(pigment*255)*3,q=(y*n+x)*4;
    const shade=(.40+.52*clampV(brightness,0,1))*(.72+.28*Math.min(1,occupied/8));
    for(let c=0;c<3;c++)pixels[q+c]=clampV(lut[k+c]*shade+20*Math.min(1,occupied/10),0,255);
    pixels[q+3]=255;
  }
  return {width:n,height:n,data:pixels};
}
