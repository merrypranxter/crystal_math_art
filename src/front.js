/**
 * A.3 — stochastic diffusion-coupled interface accretion.
 * Real persistent occupancy with attachment from a diffusing solute field.
 * NOT a calibrated phase-field PDE, full DLA, or atomistic crystal solver.
 * Screening comes from diffusion/solute depletion and power-law selection
 * of locally available concentration at the advancing solid/liquid front.
 */
export const FRONT_MODES = Object.freeze({
  facet: Object.freeze({ axes: 4, kinetic: 3.6, compactness: 1.12, fingers: .46 }),
  skeletal: Object.freeze({ axes: 6, kinetic: 5.5, compactness: .53, fingers: 1.70 }),
  coral: Object.freeze({ axes: 0, kinetic: .65, compactness: .78, fingers: 1.34 }),
});
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DELTAS = Object.freeze([[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]);

export class AccretionFront {
  constructor(world) {
    this.world = world;
    this.candidates = new Map(); // solid-adjacent liquid cells -> grain ID
    this.deposited = 0;
  }
  addNeighbors(x, y, grain) {
    const w=this.world, n=w.size;
    for(const [dx,dy] of DELTAS){
      const px=x+dx, py=y+dy;
      if(px<2||py<2||px>=n-2||py>=n-2) continue;
      const i=py*n+px;
      if(!w.crystal[i] && !this.candidates.has(i)) this.candidates.set(i,grain);
    }
  }
  nucleate(x, y, grain) {
    const w=this.world, ix=Math.round(x),iy=Math.round(y);
    // A seed is solid state, rather than a visual sprite.
    w.markCrystal(ix,iy,grain);
    this.addNeighbors(ix,iy,grain);
  }
  /** Drop dangling links after a melt; deliberately preserve surviving fronts. */
  rebuild() {
    const w=this.world,n=w.size;
    this.candidates.clear();
    for(let y=2;y<n-2;y++) for(let x=2;x<n-2;x++) {
      const grain=w.crystal[y*n+x];
      if(grain && FRONT_MODES[w.grains[grain-1]?.morphology]) this.addNeighbors(x,y,grain);
    }
  }
  /** Score an exposed liquid site; all existing material stays unchanged. */
  score(i, grain) {
    const w=this.world,n=w.size, m=FRONT_MODES[w.grains[grain-1]?.morphology];
    if(!m||w.crystal[i]||w.heat[i]>.24) return 0;
    const x=i%n,y=Math.floor(i/n),g=w.grains[grain-1];
    let neighbors=0, competing=0, free=0, sumFree=0;
    for(const [dx,dy] of DELTAS){
      const j=(y+dy)*n+x+dx;
      if(w.crystal[j]===grain) neighbors++;
      else if(w.crystal[j]) competing++;
      else { free++; sumFree+=w.nutrient[j]; }
    }
    if(neighbors===0 || competing>0) return 0;
    const nutrient=w.nutrient[i];
    if(nutrient<.015) return 0;
    // The liquid concentration near the interface is a cheap proxy for flux;
    // raised to a user-controlled exponent it accentuates protruding tips.
    // It is NOT a numerically solved harmonic-measure density.
    const flux=clamp(.75*nutrient+.25*(free ? sumFree/free : 0),.001,1);
    const instability=.65+w.config.instability*2.7;
    const screening=Math.pow(flux,instability);
    const angle=Math.atan2(y-g.y,x-g.x)-g.angle;
    const alignment=m.axes ? Math.pow(.5+.5*Math.cos(m.axes*angle), m.kinetic) : .52+.14*Math.sin(angle*7 + grain);
    const facet=clamp(w.config.faceting,0,1);
    const directional=(1-facet)*.72+facet*(.10+1.55*alignment);
    // Low-neighbor, high-supply locations stay active as dendritic fingers;
    // faceted species reward near-neighbor attachment for compact planes.
    const exposed=(free/8);
    const structural=(m.compactness*(neighbors/8)+m.fingers*exposed);
    return screening*directional*(.3+structural)*clamp(nutrient*1.75,.15,1);
  }
  advance() {
    const w=this.world;
    if(!this.candidates.size) return;
    const n=w.size;
    const modeCount=w.grains.filter(g=>!!FRONT_MODES[g.morphology]).length;
    if(!modeCount) return;
    // Prune occupied candidates so their stale entries do not grow unbounded.
    if(w.ticks % 25 === 0) for(const i of this.candidates.keys()) {
      if(w.crystal[i]) this.candidates.delete(i);
    }
    const sites=Array.from(this.candidates.entries());
    const positions=new Map(sites.map(([i],at)=>[i,at]));
    // Bounded stochastic tournament (not a scan of every pixel every frame).
    // Sampling is deterministic for a given RNG seed and update sequence.
    const deposits=Math.min(25,6+Math.floor(Math.sqrt(sites.length)/2));
    for(let k=0;k<deposits;k++) {
      let pick=-1,grain=0,best=0;
      for(let j=0;j<Math.min(42,sites.length);j++) {
        const entry=sites[Math.floor(w.rand()*sites.length)];
        if(!entry)continue;
        const [idx,owner]=entry;
        const weight=this.score(idx,owner);
        const value=weight*(.55+.9*w.rand());
        if(value>best){best=value;pick=idx;grain=owner;}
      }
      if(pick<0 || best<=0)break;
      this.candidates.delete(pick);
      // Stop this site being selected a second time in this same step.
      const selected=positions.get(pick);
      if(selected!==undefined){
        const last=sites[sites.length-1];
        sites[selected]=last;
        positions.set(last[0],selected);
        sites.pop();positions.delete(pick);
      }
      if(w.crystal[pick])continue;
      const x=pick%n,y=Math.floor(pick/n);
      let parent=-1, parentDist=10;
      for(const [dx,dy] of DELTAS){
        const px=x+dx,py=y+dy;
        if(px<1||py<1||px>=n-1||py>=n-1)continue;
        const j=py*n+px;
        if(w.crystal[j]!==grain)continue;
        const distance=dx*dx+dy*dy;
        if(distance<parentDist){parentDist=distance;parent=j;}
      }
      if(parent<0)continue;
      const supply=w.nutrient[pick];
      w.markCrystal(x,y,grain);
      w.nutrient[pick]=0;
      const s={x0:parent%n,y0:Math.floor(parent/n),x1:x,y1:y,
        grain,level:parentDist>1?2:1,stamp:w.ticks,front:true};
      w.segments.push(s);w.newSegments.push(s);
      this.deposited++;
      // Consume neighboring dissolved material; recovery is from diffusion.
      for(const [dx,dy] of DELTAS){
        const px=x+dx,py=y+dy,j=py*n+px;
        if(!w.crystal[j])w.nutrient[j]=Math.max(0,w.nutrient[j]-.025*supply);
      }
      this.addNeighbors(x,y,grain);
      // A front from another grain can approach but cannot cross occupied cells.
      w.modified++;
    }
  }
  snapshot() {return {candidates:Array.from(this.candidates.entries()),deposited:this.deposited};}
  restore(s){this.candidates=new Map(s?.candidates||[]);this.deposited=s?.deposited||0;}
}
