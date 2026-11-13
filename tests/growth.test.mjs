import test from 'node:test';
import assert from 'node:assert/strict';
import { CrystalWorld } from '../src/growth.js';

function make() { const w = new CrystalWorld(200); w.seed(80, 91, 0); w.seed(146, 40, .37); return w; }

test('crystals develop as persistent state, not a time uniform', () => {
  const w = make();
  for(let i=0;i<90;i++)w.step();
  const stats=w.stats();
  assert.ok(stats.segments>200,`Expected real advancing segments, got ${stats.segments}`);
  assert.ok(stats.coverage>0);
  assert.equal(stats.grains,2);
  assert.ok(w.nutrient.some(x=>x<.95),'Growth should deplete surrounding nutrient');
  assert.equal(w.ticks,90);
});

test('same initial seed and environmental controls reproduce the same growth history', () => {
  const a=make(),b=make();
  for(let i=0;i<80;i++){a.step();b.step();}
  assert.deepEqual(a.stats(),b.stats());
  assert.deepEqual(a.segments,b.segments);
});

test('melting edits only local region and leaves surviving history', () => {
  const w=make();for(let i=0;i<150;i++)w.step();
  const before=w.segments.length;
  const initial=w.stats().coverage;
  w.melt(80,91,19);
  assert.ok(w.segments.length<before,'Melting must remove actual segments');
  assert.ok(w.segments.length>0,'Melting must not erase all other crystals');
  assert.ok(w.stats().coverage<initial,'Solid occupancy should change');
  assert.ok(w.heat[w.index(80,91)]>.9,'Heated field should have real state');
});

test('undo restores the previous growth, fluid and material fields exactly', () => {
  const w=make();for(let i=0;i<110;i++)w.step();
  const before=w.stats(),snapshot=w.snapshot();
  w.melt(80,91,14);w.feed(130,130,17);for(let i=0;i<12;i++)w.step();
  w.restore(snapshot);
  assert.deepEqual(w.stats(),before);
  assert.deepEqual(w.crystal,snapshot.crystal);
  assert.deepEqual(w.nutrient,snapshot.nutrient);
});

test('new seed increases grain count without resetting existing structures', () => {
  const w=make();for(let i=0;i<30;i++)w.step();
  const oldSegments=w.segments.length;
  w.seed(55,155,1.1);
  assert.equal(w.grains.length,3);
  assert.equal(w.segments.length,oldSegments);
});

test('new growth can advance from melt-exposed surviving edges after cooling', () => {
  const w=make();for(let i=0;i<125;i++)w.step();
  w.melt(80,91,12);
  const remnant=w.segments.length;
  for(let i=0;i<80;i++)w.step();
  assert.ok(w.segments.length>remnant,'After thermal recovery the fronts should resume growth');
});
