/**
 * A.4 experimental Allen–Cahn-like phase-field crystallization (2D, coarse-grid).
 * The phase fraction phi evolves by an explicit finite-difference PDE:
 *   phi_t = mobility * [kappa(theta) Laplacian(phi)
 *          - 2*barrier*phi*(1-phi)*(1-2*phi)
 *          + 6*drive*c*phi*(1-phi)] - melt*heat*phi.
 * kappa(theta) uses a 9-point isotropic Laplacian and a positive,
 * orientation-dependent stiffness factor
 * 1 - (n^2-1)*epsilon*cos(n*theta) from gamma=1+epsilon*cos(n*theta).
 * It is a *local-stiffness approximation*, not the complete variational
 * derivative of anisotropic interfacial energy. The nutrient field comes
 * from the legacy liquid transport model; this is NOT quantitatively
 * calibrated solidification, thermal phase field or faithful 3D crystallography.
 * A.5 adds deliberately simplified transport-driven interfacial destabilization:
 * nutrient exposure at the liquid-facing normal, persistent fine-scale
 * material heterogeneity, and reduced capillary smoothing. This is a
 * morphology experiment, NOT a calibrated Mullins-Sekerka stability solver.
 * No shader or decorative animation creates the solid/liquid boundary.
 */
export const PHASE_MODES = Object.freeze({
  phase4: Object.freeze({ axes: 4, name: 'FOURFOLD PHASE · SQUARE ICE' }),
  phase6: Object.freeze({ axes: 6, name: 'SIXFOLD PHASE · SNOW CRYSTAL' }),
  phase8: Object.freeze({ axes: 8, name: 'EIGHTFOLD PHASE · EXPERIMENTAL' }),
});
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
// Fast, seeded 2D correlated heterogeneity; unchanged by frame count.
function hash2(x,y,seed) {
  let h=Math.imul(x, 0x27d4eb2d)^Math.imul(y,0x165667b1)^Math.imul(seed,0x9e3779b1);
  h^=h>>>15;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;
  return (h>>>0)/4294967295;
}
export function materialNoise(x,y,seed,scale=9){
  const cx=Math.floor(x/scale), cy=Math.floor(y/scale), fx=x/scale-cx, fy=y/scale-cy;
  const a=fx*fx*(3-2*fx), b=fy*fy*(3-2*fy);
  const p=hash2(cx,cy,seed)*(1-a)+hash2(cx+1,cy,seed)*a;
  const q=hash2(cx,cy+1,seed)*(1-a)+hash2(cx+1,cy+1,seed)*a;
  return (p*(1-b)+q*b)*2-1; // [-1,+1]
}
export class PhaseField {
  constructor(world) {
    this.world=world;
    this.size=Math.ceil(world.size/2);
    this.scale=world.size/this.size;
    this.phi=new Float32Array(this.size*this.size);
    this.next=new Float32Array(this.phi.length);
    this.owner=new Uint8Array(this.phi.length);
    this.nextOwner=new Uint8Array(this.owner.length);
    this.birth=new Uint32Array(this.phi.length); // first solidification tick+1; 0 means liquid or never solidified
    this.deposited=0;
    this.active=false;
    this.version=0;
    // Growth-front instability leaders are stateful *phase material*, not
    // rendered segments. They perturb the evolving PDE interface directly.
    this.sprouts=[];
    this.sproutedGrains=[];
    this.branchEvents=0;
  }
  index(x,y){return Math.floor(y)*this.size+Math.floor(x);}
  mainIndex(x,y){
    const w=this.world;
    return Math.min(w.size-2,Math.max(1,Math.floor(y*this.scale)))*w.size+
      Math.min(w.size-2,Math.max(1,Math.floor(x*this.scale)));
  }
  nucleate(x,y,grain){
    const n=this.size;
    const cx=Math.round(x/this.scale),cy=Math.round(y/this.scale);
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const ix=cx+dx,iy=cy+dy, r=Math.hypot(dx,dy);
      if(ix<2||iy<2||ix>=n-2||iy>=n-2||r>3)continue;
      const i=iy*n+ix, center=this.mainIndex(ix,iy);
      if(this.world.crystal[center]&&this.world.crystal[center]!==grain)continue;
      const v=r<=2?1:r<=2.7?.64:.13;
      if(this.phi[i]<v){this.phi[i]=v;this.owner[i]=grain;}
      if(v>=.58){this.writeSolid(ix,iy,grain,true); if(!this.birth[i])this.birth[i]=this.world.ticks+1;}
    }
    this.active=true;this.version++;
  }
  // The coarse phase field maps to occupancy in each underlying 2x2 block.
  writeSolid(x,y,grain,solid){
    const w=this.world, s=w.size;
    const x0=Math.floor(x*this.scale),y0=Math.floor(y*this.scale);
    const x1=Math.min(s-1,Math.ceil((x+1)*this.scale));
    const y1=Math.min(s-1,Math.ceil((y+1)*this.scale));
    for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){
      const i=yy*s+xx;
      if(solid){
        if(!w.crystal[i]||w.crystal[i]===grain){w.crystal[i]=grain;w.nutrient[i]=0;}
      } else if(w.crystal[i]===grain) w.crystal[i]=0;
    }
  }
  /** Explicit phase-field integration; no effect if no phase seeds exist. */
  advance(){
    if(!this.active)return;
    const w=this.world,n=this.size, p=this.phi, q=this.next;
    const owner=this.owner, no=this.nextOwner;
    const c=w.config;
    const mobility=clamp(c.phaseMobility,0,1);
    const strength=.92*clamp(c.phaseStiffness,0,1);
    const drive=1.25*clamp(c.phaseDrive,0,1);
    const instability=clamp(c.phaseInstability ?? 0,0,1);
    const wavelength=clamp(c.phaseWavelength ?? .50,0,1);
    const smoothing=clamp(c.phaseCapillarity ?? 1,0,1);
    // Smaller capillary coefficient increases competition among existing
    // protrusions, while the correlated impurity field supplies perturbations.
    // Bounded well below explicit 9-point diffusion's conservative limit.
    const diffusion=.18*(1-instability*(.50+.46*(1-smoothing)));
    const textureScale=3+Math.round(22*(1-wavelength));
    const barrier=.50, dt=.42;
    q.fill(0);no.fill(0);
    let changed=false;
    for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){
      const i=y*n+x;
      const v=p[i],l=p[i-1],r=p[i+1],u=p[i-n],d=p[i+n];
      if(v+l+r+u+d<.00001)continue;
      let grain=owner[i];
      if(!grain){
        let best=0;
        const j0=i-1,j1=i+1,j2=i-n,j3=i+n;
        if(p[j0]>best){best=p[j0];grain=owner[j0];}
        if(p[j1]>best){best=p[j1];grain=owner[j1];}
        if(p[j2]>best){best=p[j2];grain=owner[j2];}
        if(p[j3]>best){best=p[j3];grain=owner[j3];}
      }
      if(!grain)continue;
      const g=w.grains[grain-1];
      if(!g||!PHASE_MODES[g.morphology])continue;
      const main=this.mainIndex(x,y);
      if(w.crystal[main]&&w.crystal[main]!==grain) continue;
      const folds=PHASE_MODES[g.morphology].axes;
      // Gradient direction is the local interface normal (zero inside a grain).
      // Nine-point isotropic Laplacian and Sobel-like normal reduce
      // spurious diamond/square artifacts from the Cartesian grid.
      const ul=p[i-n-1],ur=p[i-n+1],dl=p[i+n-1],dr=p[i+n+1];
      const gx=(2*(r-l)+(ur+dr)-(ul+dl))/4;
      const gy=(2*(d-u)+(dl+dr)-(ul+ur))/4;
      const cosTerm=(gx*gx+gy*gy>1e-9)
        ? Math.cos(folds*(Math.atan2(gy,gx)-g.angle)) : 0;
      const stiffness=1-strength*cosTerm; // bounded [.08,1.92], positive.
      const lap=(4*(l+r+u+d)+ul+ur+dl+dr-20*v)/6;
      const nutrient=clamp(w.nutrient[main],0,1);
      let growthGain=1;
      // Only the LIQUID-facing moving interface receives destabilizing
      // transport: a high nutrient reservoir ahead of a depleted interface
      // favors exposed tips over recessed, shielded cells.
      if(instability>0 && v>.015 && v<.985){
        const mag=Math.hypot(gx,gy);
        let exposure=0;
        if(mag>1e-5){
          // Gradient of phase fraction points into solid. Look OUTWARD.
          const ux=-gx/mag,uy=-gy/mag;
          const ax=clamp(Math.round(x+ux*2),1,n-2),ay=clamp(Math.round(y+uy*2),1,n-2);
          const far=clamp(w.nutrient[this.mainIndex(ax,ay)],0,1);
          exposure=clamp((far-nutrient)*2.0,0,1);
        }
        // Quenched (fixed, seeded) heterogeneity is *not* time-animated noise:
        // changed nutrient and interface geometry decide which variations grow.
        const disorder=materialNoise(x,y,(g.id*73856093)^(w.seedValue>>>0),textureScale);
        const alignment=(cosTerm+1)*.5;
        growthGain=clamp(1+instability*(-.74 + .27*disorder + .32*exposure +
          .28*(alignment-.5)),.08,1.8);
      }
      const source=6*drive*nutrient*growthGain*v*(1-v);
      const dw=-2*barrier*v*(1-v)*(1-2*v);
      const heat=clamp(w.heat[main],0,1);
      const value=clamp(v + dt*mobility*(diffusion*stiffness*lap+dw+source)-.23*heat*v,0,1);
      q[i]=value<.00001?0:value;
      no[i]=q[i]?grain:0;
      if((v>=.58)!==(q[i]>=.58)){
        this.writeSolid(x,y,grain,q[i]>=.58);
        if(q[i]>=.58){this.deposited++; if(!this.birth[i])this.birth[i]=w.ticks+1;}
        else this.birth[i]=0;
        changed=true;
      }
      // Uptake is tied to positive change in solid fraction, not merely time.
      if(q[i]>v){
        const consumed=clamp((q[i]-v)*.8,0,.5);
        if(consumed) {
          const sy=Math.floor(main/w.size), sx=main%w.size;
          for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
            const target=(sy+dy)*w.size+sx+dx;
            if(target<w.amount&&!w.crystal[target])w.nutrient[target]=Math.max(0,w.nutrient[target]-consumed);
          }
        }
      }
    }
    this.phi=q;this.next=p;
    this.owner=no;this.nextOwner=owner;
    if(mobility>0 && instability>.015) this.advanceInstability(instability,wavelength);
    this.version++;
    if(changed)w.modified++;
  }

  /**
   * Surface-instability assistant. The A.4 PDE remains responsible for
   * smoothing and advancing *phase fraction*. Exposed tips here deposit
   * phase material and introduce hierarchical perturbations that the PDE
   * subsequently evolves. This is an artistic hybrid model and NOT a
   * faithful Mullins-Sekerka eigenmode solver / atomistic dendrite model.
   */
  advanceInstability(strength,wavelength){
    const w=this.world,n=this.size;
    for(const g of w.grains){
      if(!PHASE_MODES[g.morphology] || this.sproutedGrains.includes(g.id))continue;
      // Spawn from the REAL seed and oriented interface, never from a drawn
      // decorative snowflake template. New grains keep their own orientation.
      const folds=PHASE_MODES[g.morphology].axes;
      if(this.sprouts.length+folds>128)break;
      for(let k=0;k<folds;k++){
        const a=g.angle+Math.PI*2*k/folds, ux=Math.cos(a),uy=Math.sin(a);
        const cx=g.x/this.scale,cy=g.y/this.scale;
        // Search the CURRENT real solid boundary. This allows the artist to
        // turn instability on after a seed has already grown for a while.
        let radius=3;
        for(let r=3;r<Math.min(n*.46,75);r+=.8){
          const ix=Math.round(cx+ux*r),iy=Math.round(cy+uy*r);
          if(ix<3||iy<3||ix>=n-3||iy>=n-3)break;
          const i=iy*n+ix;
          if(this.owner[i]!==g.id||this.phi[i]<.57)break;
          radius=r;
        }
        const x=cx+(radius+.4)*ux,y=cy+(radius+.4)*uy;
        this.sprouts.push({x,y,angle:a,grain:g.id,level:0,traveled:0,nextFork:4+w.rand()*4,sign:k%2?1:-1});
      }
      this.sproutedGrains.push(g.id);
    }
    const born=[],survived=[];
    const maxTips=128;
    const branchScale=3+Math.floor((1-wavelength)*14);
    for(const t of this.sprouts){
      if(t.traveled>Math.min(n*.42,11+51*strength) || survived.length+born.length>=maxTips)continue;
      const xi=Math.round(t.x),yi=Math.round(t.y);
      if(xi<3||yi<3||xi>=n-3||yi>=n-3)continue;
      const ii=this.mainIndex(xi,yi);
      if(w.heat[ii]>.28){survived.push(t);continue;}
      const g=w.grains[t.grain-1];if(!g)continue;
      const leadX=clamp(Math.round(t.x+Math.cos(t.angle)*2.8),2,n-3);
      const leadY=clamp(Math.round(t.y+Math.sin(t.angle)*2.8),2,n-3);
      const current=w.nutrient[this.mainIndex(leadX,leadY)];
      if(current<.025){survived.push(t);continue;}
      const noise=materialNoise(t.x,t.y,t.grain*733+w.seedValue,Math.max(2,Math.round(branchScale*.75)));
      const bend=(noise*.052 + Math.sin(t.x*.074+t.y*.041+t.grain)*.008)*strength;
      t.angle+=bend;
      const distance=(.36+.41*Math.min(1,current))*Math.max(.5,strength);
      const nx=t.x+Math.cos(t.angle)*distance,ny=t.y+Math.sin(t.angle)*distance;
      const ax=Math.round(nx),ay=Math.round(ny);
      if(ax<3||ay<3||ax>=n-3||ay>=n-3)continue;
      const i=ay*n+ax;
      if(this.owner[i] && this.owner[i]!==t.grain)continue;
      const main=this.mainIndex(ax,ay);
      if(w.crystal[main] && w.crystal[main]!==t.grain)continue;
      t.x=nx;t.y=ny;t.traveled+=distance;
      // Depositing phase fraction modifies actual state. The continuous
      // solver thickens each filament and can erode it under local heat.
      if(this.phi[i]<.90){
        this.phi[i]=.90;this.owner[i]=t.grain;
        this.writeSolid(ax,ay,t.grain,true);
        this.deposited++;
        if(!this.birth[i])this.birth[i]=w.ticks+1;
      }
      const shoulders=[[1,0],[-1,0],[0,1],[0,-1]];
      for(const [dx,dy] of shoulders){
        const px=ax+dx,py=ay+dy,j=py*n+px,under=this.mainIndex(px,py);
        if((!this.owner[j]||this.owner[j]===t.grain) && (!w.crystal[under]||w.crystal[under]===t.grain)){
          this.phi[j]=Math.max(this.phi[j],.22+.13*strength);
          this.owner[j]=t.grain;
        }
      }
      // Screened resource: solidifying protrusions draw from surrounding
      // dissolved matter, so competing branches can shade one another.
      const consumed=.06+.09*strength;
      for(const idx of [main,main-1,main+1,main-w.size,main+w.size])
        if(idx>=0&&idx<w.amount&&!w.crystal[idx])w.nutrient[idx]=Math.max(0,w.nutrient[idx]-consumed);
      if(t.level<3 && t.traveled>t.nextFork && this.sprouts.length+born.length<maxTips){
        const chance=strength*(t.level===0?.76:t.level===1?.49:.34)*Math.min(1,current*1.8);
        if(w.rand()<chance){
          const sign=t.sign;
          const childAngle=t.angle+sign*(.46+w.rand()*.60);
          born.push({x:nx,y:ny,angle:childAngle,grain:t.grain,level:t.level+1,
            traveled:0,nextFork:2.5+w.rand()*branchScale*.60,sign:-sign});
          this.branchEvents++;
        }
        t.sign=-t.sign;
        t.nextFork=t.traveled+Math.max(2,branchScale*(.75+w.rand()*.6));
      }
      survived.push(t);
    }
    this.sprouts=survived.concat(born);
  }

  /** Melt is a real phase change. Other seeds outside the brush are untouched. */
  melt(x,y,r){
    const n=this.size,cx=x/this.scale,cy=y/this.scale,rad=r/this.scale;
    const minX=Math.max(2,Math.floor(cx-rad)),maxX=Math.min(n-3,Math.ceil(cx+rad));
    const minY=Math.max(2,Math.floor(cy-rad)),maxY=Math.min(n-3,Math.ceil(cy+rad));
    for(let yy=minY;yy<=maxY;yy++)for(let xx=minX;xx<=maxX;xx++){
      if((xx-cx)**2+(yy-cy)**2>rad*rad)continue;
      const i=yy*n+xx,grain=this.owner[i];
      if(grain){this.phi[i]=0;this.next[i]=0;this.owner[i]=0;this.nextOwner[i]=0;
        this.birth[i]=0;this.writeSolid(xx,yy,grain,false);}
    }
    this.sprouts=this.sprouts.filter(t=>(t.x-cx)**2+(t.y-cy)**2>(rad+1)**2);
    this.version++;
  }
  snapshot(){return {birth:this.birth.slice(),phi:this.phi.slice(),next:this.next.slice(),owner:this.owner.slice(),nextOwner:this.nextOwner.slice(),deposited:this.deposited,active:this.active,version:this.version,sprouts:this.sprouts.map(t=>({...t})),sproutedGrains:[...this.sproutedGrains],branchEvents:this.branchEvents};}
  restore(v){
    if(!v)return;
    this.phi=v.phi.slice();this.birth=v.birth?v.birth.slice():new Uint32Array(this.phi.length);this.next=v.next.slice();this.owner=v.owner.slice();this.nextOwner=v.nextOwner.slice();
    this.deposited=v.deposited;this.active=v.active;this.version=v.version+1;
    this.sprouts=(v.sprouts||[]).map(t=>({...t}));
    this.sproutedGrains=[...(v.sproutedGrains||[])];this.branchEvents=v.branchEvents||0;
  }
  stats(){
    let mass=0,occupied=0;
    for(const p of this.phi){mass+=p;if(p>=.58)occupied++;}
    return {phaseMass:mass,phaseCells:occupied,phaseDeposits:this.deposited,phaseSprouts:this.sprouts.length,phaseBranches:this.branchEvents};
  }
}
