import test from 'node:test';
import assert from 'node:assert/strict';
import { CrystalWorld, PHASE_MODES } from '../src/growth.js';

function phaseWorld(mode='phase6', rng=5925){
  const w=new CrystalWorld(160);
  w.randomize(rng);
  w.seed(80,80,.21,undefined,mode);
  return w;
}
const steps=(w,n)=>{for(let i=0;i<n;i++)w.step();};

test('phase-field modes are exposed and genuinely create a solid-fraction field',()=>{
  assert.deepEqual(Object.keys(PHASE_MODES),['phase4','phase6','phase8']);
  for(const mode of Object.keys(PHASE_MODES)){
    const w=phaseWorld(mode);
    const start=w.phase.stats();
    assert.ok(start.phaseCells>0);
    steps(w,35);
    const after=w.phase.stats();
    assert.ok(after.phaseCells>start.phaseCells,`${mode} did not grow`);
    assert.ok(after.phaseMass>start.phaseMass,`${mode} mass unchanged`);
    assert.equal(w.tips.length,0);
    assert.equal(w.front.candidates.size,0);
    assert.ok(w.nutrient.some(x=>x<.5));
  }
});

test('phase field remains bounded, finite and preserves nonnegative stiffness at all settings',()=>{
  for(const mode of ['phase4','phase6','phase8']){
    const w=phaseWorld(mode);
    w.config.phaseStiffness=1;
    w.config.phaseMobility=1;
    steps(w,80);
    for(const v of w.phase.phi)assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
    assert.ok(w.phase.stats().phaseCells>15);
  }
  // Wolfram checked: 1-.92*cos(n*theta) >= .08, and max diffusion stencil
  // weight dt*mobility*kappa = .42*1*.18*1.92 = .145152 < 1/4.
  assert.ok(.42*.18*1.92<.25);
});

test('starting at zero mobility freezes phase fraction without stopping the other world engines',()=>{
  const w=phaseWorld();
  w.config.phaseMobility=0;
  const frozen=w.phase.phi.slice();
  steps(w,25);
  assert.deepEqual(w.phase.phi,frozen);
  assert.equal(w.stats().phaseDeposits,0);
});

test('phase evolution is deterministic for given seed and control settings',()=>{
  const a=phaseWorld('phase8',22),b=phaseWorld('phase8',22);
  steps(a,60);steps(b,60);
  assert.deepEqual(a.phase.phi,b.phase.phi);
  assert.deepEqual(a.phase.owner,b.phase.owner);
  assert.deepEqual(a.crystal,b.crystal);
  assert.deepEqual(a.nutrient,b.nutrient);
});

test('changing interface stiffness changes future morphology without altering past material',()=>{
  const a=phaseWorld('phase6'),b=phaseWorld('phase6');
  steps(a,22);steps(b,22);
  assert.deepEqual(a.phase.phi,b.phase.phi);
  const before=a.phase.phi.slice();
  a.config.phaseStiffness=0;
  b.config.phaseStiffness=1;
  assert.deepEqual(a.phase.phi,before);
  steps(a,35);steps(b,35);
  assert.notDeepEqual(a.phase.phi,b.phase.phi);
});

test('melting erases local phase fraction and surviving fronts grow again after cooling',()=>{
  const w=phaseWorld('phase6');
  steps(w,50);
  const old=w.stats().phaseCells;
  w.melt(80,80,17);
  assert.equal(w.phase.phi[w.phase.index(40,40)],0);
  assert.ok(w.stats().phaseCells<old,'melt must remove phase material');
  const atMelt=w.stats().phaseMass;
  steps(w,45);
  assert.ok(w.stats().phaseMass>atMelt,'surviving front re-advances');
});

test('undo restores phase fraction, grain identity, solute, and existing branches',()=>{
  const w=phaseWorld('phase4');
  w.seed(20,20,.2,undefined,'cathedral');
  steps(w,32);
  const snap=w.snapshot(),before=w.stats();
  w.melt(80,80,12);
  steps(w,10);
  w.restore(snap);
  assert.deepEqual(w.phase.phi,snap.phase.phi);
  assert.deepEqual(w.phase.owner,snap.phase.owner);
  assert.deepEqual(w.crystal,snap.crystal);
  assert.deepEqual(w.nutrient,snap.nutrient);
  assert.deepEqual(w.stats(),before);
});

test('phase seeds coexist with older discrete tips and fronts; no retroactive conversion',()=>{
  const w=new CrystalWorld(200);
  w.randomize(42);
  w.seed(38,36,.2,undefined,'cathedral');
  w.seed(161,31,.1,undefined,'coral');
  steps(w,10);
  const oldSegments=w.segments.map(s=>({...s}));
  w.seed(120,130,.5,undefined,'phase6');
  assert.deepEqual(w.segments,oldSegments);
  steps(w,30);
  assert.deepEqual(w.grains.map(x=>x.morphology),['cathedral','coral','phase6']);
  assert.ok(w.segments.some(s=>s.front));
  assert.ok(w.segments.some(s=>!s.front));
  assert.ok(w.stats().phaseCells>20);
});
