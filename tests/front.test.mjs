import test from 'node:test';
import assert from 'node:assert/strict';
import { CrystalWorld, FRONT_MODES } from '../src/growth.js';

const frontWorld = (mode, seed=771) => {
  const w=new CrystalWorld(140);
  w.randomize(seed);
  w.config.instability=.85;
  w.config.faceting=.90;
  w.seed(65,63,.14,undefined,mode);
  return w;
};

for(const mode of Object.keys(FRONT_MODES)) {
  test(`${mode} grows as an actual cell-attachment front with solute depletion`,()=>{
    const w=frontWorld(mode);
    const before=w.stats();
    for(let i=0;i<62;i++)w.step();
    const after=w.stats();
    assert.equal(after.grains,1);
    assert.equal(after.tips,0);
    assert.ok(after.frontDeposits>300,`${mode}: deposits ${after.frontDeposits}`);
    assert.ok(after.coverage>before.coverage);
    assert.ok(w.segments.some(s=>s.front===true));
    assert.ok(w.nutrient.some(x=>x<.5));
    assert.ok(w.crystal[w.index(65,63)]===1);
  });
  test(`${mode} reproduces exact front occupancy and history with same random seed`,()=>{
    const a=frontWorld(mode),b=frontWorld(mode);
    for(let i=0;i<48;i++){a.step();b.step();}
    assert.deepEqual(a.crystal,b.crystal);
    assert.deepEqual(a.segments,b.segments);
    assert.deepEqual(a.front.snapshot(),b.front.snapshot());
  });
}

test('anatomy species evolve distinctly and keep persistent per-seed identities',()=>{
  const signatures=[];
  for (const mode of ['facet','skeletal','coral']) {
    const w=frontWorld(mode,243);
    for(let i=0;i<90;i++)w.step();
    signatures.push(Buffer.from(w.crystal).toString('base64'));
  }
  assert.equal(new Set(signatures).size,3);
  const w=new CrystalWorld(155);
  w.randomize(212);
  w.seed(40,40,.1,undefined,'facet');
  w.seed(111,100,.3,undefined,'coral');
  w.seed(80,65,.1,undefined,'cathedral');
  for(let i=0;i<75;i++)w.step();
  assert.deepEqual(w.grains.map(g=>g.morphology),['facet','coral','cathedral']);
  assert.ok(w.segments.some(s=>s.front));
  assert.ok(w.segments.some(s=>!s.front));
  assert.ok(w.crystal.every(v=>v>=0&&v<=3));
});

test('front melt removes actual material and recovers via adjacent surviving solid',()=>{
  const w=frontWorld('skeletal');
  for(let i=0;i<95;i++)w.step();
  const before=w.stats();
  const r=11;
  w.melt(65,63,r);
  assert.ok(w.stats().coverage<before.coverage);
  assert.ok(w.heat[w.index(65,63)]>.9);
  assert.ok(w.segments.length<before.segments);
  const meltedCount=w.front.deposited;
  for(let i=0;i<75;i++)w.step();
  assert.ok(w.front.deposited>meltedCount, 'Survivors produce new solid after a melt');
  assert.ok(w.stats().coverage>0);
});

test('snapshot and undo restore front candidates, solute and occupancy',()=>{
  const w=frontWorld('facet');
  for(let i=0;i<65;i++)w.step();
  const snap=w.snapshot(),stats=w.stats();
  w.melt(65,63,10);
  for(let i=0;i<28;i++)w.step();
  w.restore(snap);
  assert.deepEqual(w.stats(),stats);
  assert.deepEqual(w.front.snapshot(),snap.front);
  assert.deepEqual(w.crystal,snap.crystal);
  assert.deepEqual(w.nutrient,snap.nutrient);
});

test('higher instability exponent changes deposition pattern without changing earlier state',()=>{
  const a=frontWorld('skeletal'),b=frontWorld('skeletal');
  for(let i=0;i<25;i++){a.step();b.step()}
  assert.deepEqual(a.crystal,b.crystal);
  b.config.instability=0;
  a.config.instability=1;
  for(let i=0;i<85;i++){a.step();b.step()}
  assert.notDeepEqual(a.crystal,b.crystal);
});

test('facet parameter changes attachment probabilities, not existing history',()=>{
  const w=frontWorld('facet');
  for(let i=0;i<40;i++)w.step();
  const old=w.segments.map(x=>({...x}));
  w.config.faceting=0;
  assert.deepEqual(w.segments,old);
  for(let i=0;i<20;i++)w.step();
  assert.ok(w.segments.length>old.length);
});
