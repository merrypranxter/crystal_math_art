/**
 * Black Ice Cathedral — physics-inspired, resource-coupled branching crystal tips.
 * This is NOT a phase-field solver or a physical DLA solver. Tip motion, branching,
 * solid occupancy, competition for dissolved nutrient, melting and regrowth are
 * persistent state changes, not precomputed animation or shader-only movement.
 */
import { AccretionFront, FRONT_MODES } from './front.js';
import { PhaseField, PHASE_MODES } from './phase.js';
import { SpheruliteField, SPHERULITE_MODES } from './spherulite.js';
import { VolumeField, VOLUME_MODES } from './volume.js';
export { PHASE_MODES } from './phase.js';
export { SPHERULITE_MODES } from './spherulite.js';
export { VOLUME_MODES } from './volume.js';
export { FRONT_MODES } from './front.js';
export const SIZE = 340;
export const ANATOMIES = Object.freeze({
  cathedral: Object.freeze({ axes: 6, length: 1.0, drift: .9, fork: 1.0, needle: .62, spread: 1.0 }),
  feather: Object.freeze({ axes: 4, length: 1.1, drift: .65, fork: 1.15, needle: 1.5, spread: 1.08 }),
  starburst: Object.freeze({ axes: 8, length: .88, drift: .55, fork: 1.20, needle: .85, spread: .70 }),
  wild: Object.freeze({ axes: 0, length: 1.03, drift: 2.9, fork: .95, needle: 1.0, spread: 1.50 }),
});
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function cloneTip(t) { return { ...t }; }

export class CrystalWorld {
  constructor(size = SIZE) {
    this.size = size;
    this.amount = size * size;
    this.config = { phaseDrive:.7, phaseStiffness:.76, phaseMobility:.78, phaseInstability:.72, phaseWavelength:.66, phaseCapillarity:.52, fractureWidth:7, fractureSplinter:.38, fractureHeal:.55, speed: 3, branching: .7, anisotropy: .82, length: 1, diffusion: .22, recharge: .5, brush: 18, frost: .64, spread: .86, instability: .75, faceting: .70, spherGrowth:.65, spherBands:.52, spherWobble:.32, volumeGrowth:.64, volumeFacets:.78, volumeBranches:.55, volumeDiffusion:.12, volumeSupply:.4, volumeSeedDepth:50, volumeFractureDepth:50, volumeFractureReach:.70, volumeHealing:.65,
      mutationRadius:27,mutationDepth:50,mutationReach:.36,
      mutationPrimary:'volumeOcta',mutationPartner:'volumeCoral',mutationMix:.44,mutationRotation:44,
      morphology: 'cathedral'  };
    this.randomize(357321);
  }
  randomize(seed) {
    this.seedValue = seed >>> 0 || 1;
    this.rngState = this.seedValue;
    this.crystal = new Uint8Array(this.amount);
    this.nutrient = new Float32Array(this.amount).fill(1);
    this.nutrientNext = new Float32Array(this.amount).fill(1);
    this.heat = new Float32Array(this.amount);
    this.tips = [];
    this.grains = [];
    this.front = new AccretionFront(this);
    this.phase = new PhaseField(this);
    this.spherulite = new SpheruliteField(this);
    this.volume = new VolumeField(this);
    this.segments = [];
    this.newSegments = [];
    this.ticks = 0;
    this.fullRedraw = true;
    this.modified = 0;
  }
  rand() { // reproducible xorshift32
    let x = this.rngState;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.rngState = x >>> 0;
    return this.rngState / 4294967296;
  }
  index(x, y) { return Math.floor(y) * this.size + Math.floor(x); }
  seed(x, y, angle, count, morphology = this.config.morphology) {
    // Anatomy is a property of this individual grain. Future UI changes do not
    // retroactively transform already-grown colonies.
    morphology = (Object.hasOwn(ANATOMIES, morphology) || Object.hasOwn(FRONT_MODES, morphology) || Object.hasOwn(PHASE_MODES, morphology) || Object.hasOwn(SPHERULITE_MODES, morphology) || Object.hasOwn(VOLUME_MODES, morphology)) ? morphology : 'cathedral';
    const isFront=Object.hasOwn(FRONT_MODES, morphology);
    const isPhase=Object.hasOwn(PHASE_MODES, morphology);
    const isSpherulite=Object.hasOwn(SPHERULITE_MODES, morphology);
    const isVolume=Object.hasOwn(VOLUME_MODES, morphology);
    const anatomy = isFront ? FRONT_MODES[morphology] : isPhase ? PHASE_MODES[morphology] : isSpherulite ? SPHERULITE_MODES[morphology] : isVolume ? VOLUME_MODES[morphology] : ANATOMIES[morphology];
    count ??= anatomy.axes || 5;
    x = clamp(x, 3, this.size - 4);
    y = clamp(y, 3, this.size - 4);
    if (this.grains.length >= 250) return false;
    const id = this.grains.length + 1;
    const ori = angle ?? this.rand() * TAU;
    const z=isVolume?clamp(Math.round(this.volume.size*(.18+.64*(this.config.volumeSeedDepth??50)/100)),3,this.volume.size-4):undefined;
    const grain = { id, x, y, z, angle: ori, seededAt: this.ticks, morphology, axes: anatomy.axes||anatomy.symmetry||0 };
    this.grains.push(grain);
    if(isVolume) this.volume.nucleate(x,y,z,id);
    else if(isFront) this.front.nucleate(x,y,id);
    else if(isPhase) this.phase.nucleate(x,y,id);
    else if(isSpherulite) this.spherulite.nucleate(x,y,id);
    else {
      for (let i = 0; i < count; i++) {
        const a = ori + TAU * i / count;
        this.tips.push(this.makeTip(x, y, a, id, 0, this.rand() * 9));
      }
      this.markCrystal(x, y, id);
    }
    this.modified++;
    return true;
  }
  makeTip(x, y, angle, grain, level, drift = 0) {
    return { x, y, angle, grain, level, drift, traveled: 0, branchClock: 0,
      nextFork: 6 + this.rand() * 10, flip: this.rand() > .5 ? 1 : -1,
      microClock: this.rand() * 3, nextMicro: 2 + this.rand() * 5,
      lengthLimit: [160, 79, 37, 19, 11, 6][level] * this.config.length
        * (ANATOMIES[this.grains[grain-1]?.morphology || 'cathedral']?.length || 1)
        * (.83 + this.rand() * .38),
      lastCell: -1 };
  }
  markCrystal(x, y, grain) {
    const ix = Math.round(x), iy = Math.round(y), n = this.size;
    if (ix > 1 && ix < n - 2 && iy > 1 && iy < n - 2) {
      const idx = iy * n + ix;
      this.crystal[idx] = grain;
      this.nutrient[idx] *= .18;
      return idx;
    }
    return -1;
  }
  plantInitial() {
    // The asymmetric seeds demonstrate actual grain competition as the colonies meet.
    const n = this.size;
    this.seed(n * .46, n * .50, -.20, undefined, 'cathedral');
    this.seed(n * .79, n * .22, .32, undefined, 'feather');
    this.seed(n * .20, n * .80, -.09, undefined, 'wild');
    this.seed(n * .72, n * .69, .14, undefined, 'phase6');
    this.seed(n * .30, n * .25, .35, undefined, 'spherulite');
    this.seed(n * .43, n * .24, .17, undefined, 'rosette');
    for (let i = 0; i < 15; i++) this.step();
  }
  step() {
    this.ticks++;
    if (this.ticks % 3 === 0) this.diffuse();
    const born = [];
    const survived = [];
    const c = this.config;
    const n = this.size;
    for (let k = 0; k < this.tips.length; k++) {
      const t = this.tips[k];
      const oldX = t.x, oldY = t.y;
      const ix = Math.floor(oldX), iy = Math.floor(oldY);
      if (ix < 3 || iy < 3 || ix >= n - 3 || iy >= n - 3) continue;
      const idx = iy * n + ix;
      if (this.heat[idx] > .32) { survived.push(t); continue; }
      if (t.traveled >= t.lengthLimit) continue;
      // Resource competition: depleted liquid slows tips and limits side branching.
      const aheadX = clamp(Math.floor(oldX + Math.cos(t.angle) * 3), 1, n - 2);
      const aheadY = clamp(Math.floor(oldY + Math.sin(t.angle) * 3), 1, n - 2);
      const aheadIdx = aheadY * n + aheadX;
      const supply = this.nutrient[aheadIdx];
      if (supply < .065) { if (this.rand() < .025) survived.push(t); continue; }
      const grain = this.grains[t.grain - 1];
      if (!grain) continue;
      const anatomy = ANATOMIES[grain.morphology || 'cathedral'];
      // Pull tip direction towards the nearest grain-locked hexagonal growth axis.
      const phase = anatomy.axes ? TAU / anatomy.axes : 0;
      const axis = phase ? grain.angle + Math.round((t.angle - grain.angle) / phase) * phase : t.angle;
      const targetPull = Math.sin(axis - t.angle) * c.anisotropy * (t.level === 0 ? .13 : .025);
      // Spatially varying, smooth directional perturbation: no pre-baked paths.
      const curling = Math.sin((oldX * .047 + oldY * .031 + t.grain) + this.ticks * .008) * .006;
      t.angle += targetPull + curling * anatomy.drift + (this.rand() - .5)
        * (.014 + .07 * (1 - c.anisotropy) + .012 * t.level) * anatomy.drift;
      const lengthScale = [.94, .89, .81, .74, .69, .61][t.level];
      const distance = (.48 + .35 * supply) * lengthScale;
      const nx = oldX + Math.cos(t.angle) * distance;
      const ny = oldY + Math.sin(t.angle) * distance;
      const nextCell = this.index(nx, ny);
      // Same-crystal occupied cell is fine for the next subpixel stroke; a real
      // collision with a different grain arrests this tip.
      const occupied = this.crystal[nextCell];
      if (occupied && occupied !== t.grain) continue;
      if (occupied === t.grain && nextCell !== t.lastCell && t.traveled > 3 && this.rand() < .11) continue;
      t.x = nx; t.y = ny; t.traveled += distance; t.branchClock += distance; t.microClock += distance;
      const s = { x0: oldX, y0: oldY, x1: nx, y1: ny, grain: t.grain, level: t.level, stamp: this.ticks };
      this.segments.push(s); this.newSegments.push(s);
      t.lastCell = this.markCrystal(nx, ny, t.grain);
      // Attachment consumes solute locally. Diffusion brings more in from outside.
      this.nutrient[aheadIdx] = Math.max(0, supply - .075);
      if (ix > 2 && iy > 2 && ix < n - 3 && iy < n - 3) {
        this.nutrient[idx - 1] *= .985;
        this.nutrient[idx + 1] *= .985;
        this.nutrient[idx - n] *= .985;
        this.nutrient[idx + n] *= .985;
      }
      if (t.level < 3 && t.branchClock > t.nextFork && this.tips.length + born.length < 1850) {
        const branchingOdds = c.branching * anatomy.fork * [1, .66, .43, .24, .16][t.level] * clamp(supply * 1.35, .12, 1);
        if (this.rand() < branchingOdds) {
          const deviation = (.48 + this.rand() * .48) * c.spread * anatomy.spread * (t.flip);
          const child = this.makeTip(nx, ny, t.angle + deviation, t.grain, t.level + 1);
          born.push(child);
        }
        t.flip = -t.flip;
        t.branchClock = 0;
        t.nextFork = [8, 6, 4.7, 3.1, 2.4][t.level] + this.rand() * [7, 5, 4, 2.5, 1.8][t.level];
      }
      // Frost anatomy: genuine new growth fronts, not a cosmetic overlay.
      // Short needles grow from exposed parent segments and become persistent
      // material subject to future heat, solute competition and collisions.
      if (t.level <= 3 && t.microClock >= t.nextMicro && this.tips.length + born.length < 1850) {
        const chance = c.frost * anatomy.needle * clamp(supply * 1.15, 0, 1) * (t.level ? 1 : .4);
        if (this.rand() < chance) {
          const side = t.flip;
          const base = Math.max(4, t.level + 1);
          const spread = (1.0 + this.rand() * .48) * side * c.spread * anatomy.spread;
          born.push(this.makeTip(nx, ny, t.angle + spread, t.grain, base));
          // Feathery crystals often generate bilateral needle pairs.
          if (grain.morphology === 'feather' && this.rand() < .75 * c.frost && this.tips.length + born.length < 1850)
            born.push(this.makeTip(nx, ny, t.angle - spread, t.grain, base));
        }
        t.microClock = 0;
        t.nextMicro = (t.level === 0 ? 4.5 : 2.6) + this.rand() * (grain.morphology === 'feather' ? 2.5 : 5);
      }
      survived.push(t);
    }
    this.tips = survived.concat(born);
    this.front.advance();
    this.phase.advance();
    this.spherulite.advance();
    this.volume.advance();
    this.modified++;
  }
  diffuse() {
    const n = this.size, src = this.nutrient, dst = this.nutrientNext;
    const d = this.config.diffusion, restore = .001 + this.config.recharge * .007;
    const heat = this.heat;
    for (let y = 1; y < n - 1; y++) {
      const row = y * n;
      for (let x = 1; x < n - 1; x++) {
        const i = row + x;
        // Crystal is excluded from the transport medium and cannot refuel.
        if (this.crystal[i]) { dst[i] = 0; continue; }
        const flux = src[i - 1] + src[i + 1] + src[i - n] + src[i + n] - 4 * src[i];
        dst[i] = clamp(src[i] + d * flux + restore * (1 - src[i]), 0, 1);
        heat[i] = Math.max(0, heat[i] - .032);
      }
    }
    // Boundary reservoir is held at saturation (Dirichlet approximation).
    for (let i = 0; i < n; i++) {
      dst[i] = dst[(n - 1) * n + i] = 1;
      dst[i * n] = dst[i * n + n - 1] = 1;
    }
    this.nutrient = dst;
    this.nutrientNext = src;
  }
  fracture(x,y,r=this.config.fractureWidth){
    const phased=this.phase.fracture(x,y,r);
    const threeD=this.volume.active ? this.volume.fractureShear(
      x,y,r,this.config.volumeFractureDepth??50,this.config.volumeFractureReach??.7) : 0;
    return phased+threeD;
  }
  feed(x, y, r) {
    if(this.volume.active)this.volume.feedColumn(x,y,r);
    const n = this.size, r2 = r * r;
    for (let j = Math.max(1, Math.floor(y - r)); j < Math.min(n - 1, y + r); j++) {
      for (let i = Math.max(1, Math.floor(x - r)); i < Math.min(n - 1, x + r); i++) {
        const dd = (i-x)**2 + (j-y)**2;
        if (dd < r2 && !this.crystal[j*n+i]) this.nutrient[j*n+i] = 1;
      }
    }
    this.modified++;
  }
  melt(x, y, r) {
    if(this.volume.active)this.volume.meltColumn(x,y,r);
    const n = this.size, r2 = r * r;
    // Destroy only actual material under the brush, not the whole composition.
    for (let j = Math.max(1, Math.floor(y-r)); j < Math.min(n-1, y+r); j++) {
      for (let i = Math.max(1, Math.floor(x-r)); i < Math.min(n-1, x+r); i++) {
        const dd = (i-x)**2 + (j-y)**2;
        if (dd < r2) {
          const idx = j*n+i;
          this.crystal[idx] = 0;
          this.heat[idx] = 1;
          this.nutrient[idx] = .6;
        }
      }
    }
    this.tips = this.tips.filter(t => (t.x-x)**2 + (t.y-y)**2 > r2);
    const left = [];
    const rim = [];
    const minR2 = (r + 1)**2, maxR2 = (r + 6)**2;
    for (const s of this.segments) {
      const midx = (s.x0+s.x1)*.5, midy = (s.y0+s.y1)*.5;
      const dd = (midx-x)**2 + (midy-y)**2;
      if (dd < r2) continue;
      left.push(s);
      if (dd > minR2 && dd < maxR2 && s.level <= 2 && ANATOMIES[this.grains[s.grain-1]?.morphology]) rim.push(s);
    }
    this.segments = left;
    this.front.rebuild();
    this.phase.melt(x,y,r);
    this.spherulite.melt(x,y,r);
    // Surviving edge material becomes an exposed front, allowing regrowth.
    for (let k = 0; k < Math.min(12, rim.length); k++) {
      if (this.tips.length >= 1850 || rim.length === 0) break;
      const s = rim[Math.floor(this.rand() * rim.length)];
      const heading = Math.atan2(y-s.y1,x-s.x1) + (this.rand()-.5)*.55;
      const tip = this.makeTip(s.x1,s.y1,heading,s.grain,1);
      this.tips.push(tip);
    }
    this.fullRedraw = true;
    this.modified++;
  }
  snapshot() {
    return { seedValue:this.seedValue,rngState:this.rngState, crystal:this.crystal.slice(),nutrient:this.nutrient.slice(), nutrientNext:this.nutrientNext.slice(),
      heat:this.heat.slice(),tips:this.tips.map(cloneTip),grains:this.grains.map(x=>({...x})),segments:this.segments.map(x=>({...x})),front:this.front.snapshot(),phase:this.phase.snapshot(),spherulite:this.spherulite.snapshot(),volume:this.volume.snapshot(),ticks:this.ticks };
  }
  restore(s) {
    this.seedValue=s.seedValue||1;this.rngState = s.rngState; this.crystal = s.crystal; this.nutrient = s.nutrient; this.nutrientNext = s.nutrientNext;
    this.heat = s.heat; this.tips = s.tips; this.grains = s.grains; this.segments = s.segments;
    this.ticks = s.ticks; this.front.restore(s.front); this.phase.restore(s.phase); if(s.spherulite)this.spherulite.restore(s.spherulite); if(s.volume)this.volume.restore(s.volume); this.newSegments = []; this.fullRedraw = true; this.modified++;
  }
  stats() {
    let microSegments = 0;
    for (const s of this.segments) if (s.level >= 4) microSegments++;
    let crystalCount = 0;
    for (let i = 0; i < this.crystal.length; i++) if (this.crystal[i]) crystalCount++;
    return { grains:this.grains.length,tips:this.tips.length,segments:this.segments.length,coverage:100*crystalCount/this.amount,ticks:this.ticks,microSegments,frontDeposits:this.front.deposited,frontSites:this.front.candidates.size,...this.phase.stats(),...this.spherulite.stats(),...this.volume.stats() };
  }
}
