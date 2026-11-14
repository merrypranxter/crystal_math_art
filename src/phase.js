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
 * No shader or decorative animation creates the solid/liquid boundary.
 */
export const PHASE_MODES = Object.freeze({
  phase4: Object.freeze({ axes: 4, name: 'FOURFOLD PHASE · SQUARE ICE' }),
  phase6: Object.freeze({ axes: 6, name: 'SIXFOLD PHASE · SNOW CRYSTAL' }),
  phase8: Object.freeze({ axes: 8, name: 'EIGHTFOLD PHASE · EXPERIMENTAL' }),
});
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export class PhaseField {
  constructor(world) {
    this.world=world;
    this.size=Math.ceil(world.size/2);
    this.scale=world.size/this.size;
    this.phi=new Float32Array(this.size*this.size);
    this.next=new Float32Array(this.phi.length);
    this.owner=new Uint8Array(this.phi.length);
    this.nextOwner=new Uint8Array(this.owner.length);
    this.deposited=0;
    this.active=false;
    this.version=0;
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
      if(v>=.58)this.writeSolid(ix,iy,grain,true);
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
    const diffusion=.18, barrier=.50, dt=.42;
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
      const source=6*drive*nutrient*v*(1-v);
      const dw=-2*barrier*v*(1-v)*(1-2*v);
      const heat=clamp(w.heat[main],0,1);
      const value=clamp(v + dt*mobility*(diffusion*stiffness*lap+dw+source)-.23*heat*v,0,1);
      q[i]=value<.00001?0:value;
      no[i]=q[i]?grain:0;
      if((v>=.58)!==(q[i]>=.58)){
        this.writeSolid(x,y,grain,q[i]>=.58);
        if(q[i]>=.58)this.deposited++;
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
    this.version++;
    if(changed)w.modified++;
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
        this.writeSolid(xx,yy,grain,false);}
    }
    this.version++;
  }
  snapshot(){return {phi:this.phi.slice(),next:this.next.slice(),owner:this.owner.slice(),nextOwner:this.nextOwner.slice(),deposited:this.deposited,active:this.active,version:this.version};}
  restore(v){
    if(!v)return;
    this.phi=v.phi.slice();this.next=v.next.slice();this.owner=v.owner.slice();this.nextOwner=v.nextOwner.slice();
    this.deposited=v.deposited;this.active=v.active;this.version=v.version+1;
  }
  stats(){
    let mass=0,occupied=0;
    for(const p of this.phi){mass+=p;if(p>=.58)occupied++;}
    return {phaseMass:mass,phaseCells:occupied,phaseDeposits:this.deposited};
  }
}
