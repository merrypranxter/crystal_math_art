/**
 * A.8 Chromatic Heresy — discrete radial-fibril colony front with persistent
 * per-cell optical director, growth chronology and inter-grain collision seams.
 * NOT a calibrated polycrystalline phase-field or birefringence solver.
 * Existing phase-field, tip and accretion engines remain independent.
 */
export const SPHERULITE_MODES=Object.freeze({
  spherulite:Object.freeze({name:'SPHERULITE · RADIAL SILK',sectors:0,ring:0,twist:.2}),
  rosette:Object.freeze({name:'ROSETTE · CONCENTRIC SPECTRUM',sectors:0,ring:1,twist:1.25}),
  starSpherulite:Object.freeze({name:'ASTRAL SPHERULITE · FACETED FANS',sectors:9,ring:.35,twist:.22}),
});
const TAU_S=Math.PI*2;
const clampS=(x,a,b)=>Math.max(a,Math.min(b,x));
const NEIGHBORS_S=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];

export class SpheruliteField{
  constructor(world){
    this.world=world;this.size=Math.ceil(world.size/2);this.scale=world.size/this.size;
    const count=this.size*this.size;
    this.owner=new Uint8Array(count);
    this.director=new Float32Array(count); // local fibril axis in radians
    this.birth=new Uint32Array(count);
    this.ring=new Float32Array(count); // signed ring identity, encoded into optical material
    this.boundary=new Uint8Array(count); // recorded grain-to-grain contact
    this.frontier=new Map(); // liquid cell -> Set(grain ID); contenders do not overwrite
    this.deposited=0;this.version=0;this.active=false;
  }
  mainIndex(x,y){const w=this.world,s=w.size;return Math.min(s-2,Math.max(1,Math.floor(y*this.scale)))*s+Math.min(s-2,Math.max(1,Math.floor(x*this.scale)));}
  available(x,y,grain){
    const n=this.size,i=y*n+x,w=this.world;
    if(x<2||y<2||x>=n-2||y>=n-2||this.owner[i])return false;
    const existing=w.crystal[this.mainIndex(x,y)];
    return !existing||existing===grain;
  }
  writeSolid(x,y,grain,solid){
    const w=this.world,s=w.size,x0=Math.floor(x*this.scale),y0=Math.floor(y*this.scale);
    for(let yy=y0;yy<Math.min(s,Math.ceil((y+1)*this.scale));yy++)for(let xx=x0;xx<Math.min(s,Math.ceil((x+1)*this.scale));xx++){
      const k=yy*s+xx;
      if(solid){if(!w.crystal[k]||w.crystal[k]===grain){w.crystal[k]=grain;w.nutrient[k]=0;}}
      else if(w.crystal[k]===grain)w.crystal[k]=0;
    }
  }
  noteBoundary(x,y){
    const n=this.size,i=y*n+x,g=this.owner[i];if(!g)return;
    for(const [dx,dy] of NEIGHBORS_S){
      const px=x+dx,py=y+dy;
      if(px<1||py<1||px>=n-1||py>=n-1)continue;
      const j=py*n+px;
      if(this.owner[j]&&this.owner[j]!==g){this.boundary[i]=this.boundary[j]=1;}
    }
  }
  queueNeighbors(x,y,grain){
    const n=this.size;
    for(const [dx,dy] of NEIGHBORS_S){
      const px=x+dx,py=y+dy;
      if(!this.available(px,py,grain)){
        if(px>1&&py>1&&px<n-2&&py<n-2&&this.owner[py*n+px]!==grain)this.noteBoundary(x,y);
        continue;
      }
      const i=py*n+px;
      let candidates=this.frontier.get(i);
      if(!candidates){candidates=new Set();this.frontier.set(i,candidates);}
      candidates.add(grain);
    }
  }
  deposit(x,y,grain){
    if(!this.available(x,y,grain))return false;
    const i=y*this.size+x,g=this.world.grains[grain-1];if(!g)return false;
    const mode=SPHERULITE_MODES[g.morphology];if(!mode)return false;
    const radius=Math.hypot(x-g.x/this.scale,y-g.y/this.scale);
    const bearing=Math.atan2(y-g.y/this.scale,x-g.x/this.scale);
    const wobble=this.world.config.spherWobble??.32;
    const twist=mode.twist*wobble*(radius*.075);
    const microscopic=(Math.sin((x*1.73+y*.91+grain*4.13)) + Math.cos(x*.61-y*1.17+grain))*.015*wobble;
    this.director[i]=bearing+twist+microscopic;
    this.ring[i]=Math.sin(radius*(.52+(.7*(this.world.config.spherBands??.52)))+grain*.73);
    this.owner[i]=grain;this.birth[i]=this.world.ticks+1;
    this.writeSolid(x,y,grain,true);this.frontier.delete(i);
    this.noteBoundary(x,y);this.queueNeighbors(x,y,grain);
    this.deposited++;this.version++;return true;
  }
  nucleate(x,y,grain){
    const cx=Math.round(x/this.scale),cy=Math.round(y/this.scale);
    let placed=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(dx*dx+dy*dy>2)continue;
      if(this.deposit(cx+dx,cy+dy,grain))placed++;
    }
    if(placed)this.active=true;
    return placed;
  }
  candidateWeight(i,grain){
    const n=this.size,x=i%n,y=(i/n)|0,w=this.world,g=w.grains[grain-1];
    if(!g||!SPHERULITE_MODES[g.morphology]||!this.available(x,y,grain))return 0;
    const mode=SPHERULITE_MODES[g.morphology];
    const r=Math.hypot(x-g.x/this.scale,y-g.y/this.scale),a=Math.atan2(y-g.y/this.scale,x-g.x/this.scale)-g.angle;
    const source=w.nutrient[this.mainIndex(x,y)];
    if(source<.08||w.heat[this.mainIndex(x,y)]>.35)return 0;
    let attached=0;
    for(const [dx,dy] of NEIGHBORS_S){
      const px=x+dx,py=y+dy;
      if(px<2||py<2||px>=n-2||py>=n-2)continue;
      if(this.owner[py*n+px]===grain)attached++;
    }
    if(!attached)return 0;
    const sector=mode.sectors?( .30 + .70*Math.pow(Math.max(0,.5+.5*Math.cos(mode.sectors*a)),2)) :1;
    const rings=mode.ring ? (.55+.45*(.5+.5*Math.cos(r*(.52+(w.config.spherBands??.52)*.7)+grain*.73))*mode.ring) :1;
    const radialFiber=.71+.29*Math.cos(a*16+Math.sin(r*.28+grain))**2;
    return clampS(source*(.30+.50*attached/3)*sector*rings*radialFiber,0,1.2);
  }
  advance(){
    if(!this.active||!this.frontier.size)return;
    const w=this.world,rate=clampS(w.config.spherGrowth??.65,0,1);
    if(rate<=0)return;
    const budget=2+Math.floor(22*rate);
    const grains=w.grains.filter(g=>SPHERULITE_MODES[g.morphology]).map(g=>g.id);
    if(!grains.length)return;
    // IMPORTANT: distribute deposition turns fairly across colonies. A global
    // highest-score tournament starves a young grain when an older grain owns
    // more exposed frontier sites, preventing contact and misrepresenting
    // actual competing crystallization.
    let pool=new Map();
    const repool=()=>{
      pool=new Map(grains.map(g=>[g,[]]));
      for(const [i,ids] of this.frontier)for(const g of ids)pool.get(g)?.push(i);
    };
    repool();
    let changed=false;
    for(let pass=0;pass<budget && this.frontier.size;pass++){
      if(pass%4===0)repool();
      const grain=grains[(w.ticks+pass)%grains.length];
      const cells=pool.get(grain);
      if(!cells?.length)continue;
      let best=-1,bestScore=0;
      for(let q=0;q<Math.min(24,cells.length);q++){
        const i=cells[Math.floor(w.rand()*cells.length)];
        if(!this.frontier.get(i)?.has(grain))continue;
        const score=this.candidateWeight(i,grain)*(.42+.58*w.rand());
        if(score>bestScore){bestScore=score;best=i;}
      }
      if(best<0)continue;
      const x=best%this.size,y=(best/this.size)|0;
      if(this.deposit(x,y,grain))changed=true;
    }
    if(changed)w.modified++;
  }
  melt(x,y,worldRadius){
    const n=this.size,cx=x/this.scale,cy=y/this.scale,r=worldRadius/this.scale,r2=r*r;
    let cut=0;
    for(let yy=Math.max(2,Math.floor(cy-r));yy<=Math.min(n-3,Math.ceil(cy+r));yy++)for(let xx=Math.max(2,Math.floor(cx-r));xx<=Math.min(n-3,Math.ceil(cx+r));xx++){
      if((xx-cx)**2+(yy-cy)**2>=r2)continue;
      const i=yy*n+xx,g=this.owner[i];if(!g)continue;
      this.writeSolid(xx,yy,g,false);
      this.owner[i]=0;this.director[i]=0;this.birth[i]=0;this.ring[i]=0;this.boundary[i]=0;cut++;
    }
    if(cut){this.rebuild();this.version++;this.world.modified++;}
    return cut;
  }
  rebuild(){
    this.frontier.clear();this.boundary.fill(0);
    const n=this.size;
    for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){
      const id=this.owner[y*n+x];if(id){this.noteBoundary(x,y);this.queueNeighbors(x,y,id);}
    }
    this.active=this.owner.some(Boolean);
    this.version++;
  }
  snapshot(){return {owner:this.owner.slice(),director:this.director.slice(),birth:this.birth.slice(),ring:this.ring.slice(),boundary:this.boundary.slice(),frontier:[...this.frontier].map(([i,owners])=>[i,[...owners]]),deposited:this.deposited,version:this.version,active:this.active};}
  restore(s){if(!s)return;this.owner=s.owner.slice();this.director=s.director.slice();this.birth=s.birth.slice();this.ring=s.ring.slice();this.boundary=s.boundary.slice();this.frontier=new Map(s.frontier.map(([i,ids])=>[i,new Set(ids)]));this.deposited=s.deposited;this.version=s.version+1;this.active=s.active;}
  stats(){let cells=0,boundaries=0;for(const c of this.owner)if(c)cells++;for(const b of this.boundary)if(b)boundaries++;return {spherCells:cells,spherFront:this.frontier.size,spherContacts:boundaries,spherDeposits:this.deposited};}
}

/** Polarized-light-inspired shading; visualization only. No dependence on time. */
export function renderSpherulites(field,world,lut,{analyzer=28,retardance=.65,contrast=.8,light=.62,finish='polarized'}={}){
  const n=field.size,data=new Uint8ClampedArray(n*n*4);
  const a=analyzer*Math.PI/180;
  for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
    const i=y*n+x,g=field.owner[i];if(!g)continue;
    const director=field.director[i];
    const grain=world.grains[g-1];
    const rr=Math.hypot(x-grain.x/field.scale,y-grain.y/field.scale);
    const aa=Math.atan2(y-grain.y/field.scale,x-grain.x/field.scale);
    const fibers=.5+.5*Math.cos(aa*54 + 1.5*Math.sin(rr*.23+g*1.7));
    const relative=director-a;
    // Crossed-polarizer approximation: sin²(2 theta) sin²(delta / 2).
    // delta is a stylized radial thickness proxy, NOT measured retardation.
    const radial=field.ring[i];
    const delta=Math.PI*(.2+2.35*retardance*(.65+.35*radial));
    const polarization=Math.sin(2*relative)**2*Math.sin(delta*.5)**2;
    const p=g*.097+field.birth[i]*.0027+director/TAU_S*.27+radial*.15+(finish==='polarized'?polarization*.42:0);
    const stop=((Math.floor(((p%1+1)%1)*255)))*3;
    const rim=field.boundary[i]?1:0;
    const scatter=(finish==='polarized' ? .30+.88*polarization*contrast+.24*(1-contrast) : .65+.22*(.5+.5*radial))*(.62+.38*light)*(.77+.23*fibers);
    const edge=rim?(.50+.45*contrast):0;
    const q=i*4;
    for(let c=0;c<3;c++)data[q+c]=Math.min(255,lut[stop+c]*scatter+edge*190);
    data[q+3]=255;
  }
  return {width:n,height:n,data};
}
