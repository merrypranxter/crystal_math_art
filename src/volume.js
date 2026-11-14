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
  deposit(x,y,z,grain){
    if(!this.valid(x,y,z))return false;
    const i=this.index(x,y,z);
    if(this.owner[i])return false;
    this.owner[i]=grain;
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
  candidateWeight(i,grain){
    const [x,y,z]=this.xyz(i),g=this.world.grains[grain-1];
    if(!g||this.owner[i]||!this.valid(x,y,z))return 0;
    const mode=VOLUME_MODES[g.morphology];if(!mode)return 0;
    const fuel=this.nutrient[i];if(fuel<.055)return 0;
    const sx=g.x/this.scale,sy=g.y/this.scale,sz=g.z;
    const dx=x-sx,dy=y-sy,dz=z-sz,r=Math.hypot(dx,dy,dz)||1;
    const co=Math.cos(g.angle),si=Math.sin(g.angle);
    const ux=Math.abs((dx*co+dy*si)/r),uy=Math.abs((-dx*si+dy*co)/r),uz=Math.abs(dz/r);
    const axis=Math.max(ux,uy,uz);
    const diagonal=Math.min(ux,uy,uz)*Math.sqrt(3);
    const lock=mode.symmetry===6?axis:mode.symmetry===8?diagonal:.4;
    const focus=clampV(this.world.config.volumeFacets??.76,0,1);
    const anisotropy=mode.symmetry ? (.22+.78*Math.pow(lock,2.2+focus*8)*focus):.72;
    // Fixed spatial heterogeneity (no changing random field per simulation tick).
    const disorder=Math.sin(x*1.318+z*.713+grain*3.17)*Math.cos(y*.931-z*.42+grain);
    const turbulence=1+disorder*(.10+.32*(this.world.config.volumeBranches??.55))*(mode.symmetry? .6:1.2);
    let aligned=0;
    for(const [ax,ay,az] of VOLUME_AXIAL){
      const xx=x+ax,yy=y+ay,zz=z+az;
      if(this.valid(xx,yy,zz)&&this.owner[this.index(xx,yy,zz)]===grain)aligned++;
    }
    const detached=aligned===0?.56:1;
    // A.12 damaged mineral surfaces act as energetic reattachment sites.
    const scarAttract=this.scar[i]?1+clampV(this.world.config.volumeHealing??.65,0,1)*1.4:1;
    return Math.max(0,fuel*(.37+.23*Math.min(4,aligned))*detached*anisotropy*turbulence*scarAttract);
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
      if(this.deposit(x,y,z,grain))changed=true;
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
      if(this.owner[i]){this.owner[i]=0;this.birth[i]=0;this.nutrient[i]=.75;removed++;}
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
    let scars=0,regrown=0;
    for(let i=0;i<this.count;i++){
      if(this.scar[i]&&!this.owner[i])scars++;
      if(this.generation[i]>0&&this.owner[i])regrown++;
    }
    let cells=0,slabs=new Set();let minZ=this.size,maxZ=-1;
    for(let i=0;i<this.owner.length;i++)if(this.owner[i]){
      cells++;const z=Math.floor(i/this.area);slabs.add(z);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
    }
    return {volumeCells:cells,volumeDepthSlices:slabs.size,volumeFrontier:this.frontier.size,volumeDeposits:this.deposited,volumeSpan:minZ<=maxZ?maxZ-minZ+1:0,volumeScars:scars,volumeRegrown:regrown};
  }
  snapshot(){return {owner:this.owner.slice(),nutrient:this.nutrient.slice(),nextNutrient:this.nextNutrient.slice(),birth:this.birth.slice(),fossilBirth:this.fossilBirth.slice(),generation:this.generation.slice(),scar:this.scar.slice(),frontier:[...this.frontier].map(([i,ids])=>[i,[...ids]]),deposited:this.deposited,version:this.version,active:this.active};}
  restore(state){
    if(!state)return;
    this.owner=state.owner.slice();this.nutrient=state.nutrient.slice();this.nextNutrient=state.nextNutrient.slice();this.birth=state.birth.slice();
    this.fossilBirth=state.fossilBirth?.slice()||new Uint32Array(this.count);
    this.generation=state.generation?.slice()||new Uint16Array(this.count);
    this.scar=state.scar?.slice()||new Uint8Array(this.count);
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
    const pigment=((grain*.173 + birth*.0041 + (backZ-frontZ)*.026 + (volume.generation[site]||0)*.09)%1+1)%1;
    const k=Math.floor(pigment*255)*3,q=(y*n+x)*4;
    const shade=(.40+.52*clampV(brightness,0,1))*(.72+.28*Math.min(1,occupied/8));
    for(let c=0;c<3;c++)pixels[q+c]=clampV(lut[k+c]*shade+20*Math.min(1,occupied/10),0,255);
    pixels[q+3]=255;
  }
  return {width:n,height:n,data:pixels};
}
