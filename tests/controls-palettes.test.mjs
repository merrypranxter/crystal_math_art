import test from 'node:test';
import assert from 'node:assert/strict';
import {CrystalWorld} from '../src/growth.js';
import {DEFAULT_COMPOSITION, startComposition, addRandomColony} from '../src/compositions.js';
import {basePalette,PALETTES,originalStops,buildColorLUT,hexToRgb} from '../src/palettes.js';

test('restart replays same seed and same morphology/positions',()=>{
 const a=new CrystalWorld(130),b=new CrystalWorld(130);
 const settings={seed:123456,layout:'randomized',morphology:'feather'};
 startComposition(a,settings);startComposition(b,settings);
 assert.deepEqual(a.grains,b.grains);assert.deepEqual(a.segments,b.segments);
 for(let i=0;i<20;i++){a.step();b.step();}
 assert.deepEqual(a.stats(),b.stats());assert.deepEqual(a.crystal,b.crystal);
});
test('refresh seed changes the initial colony placements',()=>{
 const a=new CrystalWorld(150),b=new CrystalWorld(150);
 startComposition(a,{seed:333,layout:'randomized',morphology:'coral'});
 startComposition(b,{seed:444,layout:'randomized',morphology:'coral'});
 assert.notDeepEqual(a.grains,b.grains);
});
test('new seed adds a colony without deleting existing segments, and is reversible',()=>{
 const a=new CrystalWorld(130);startComposition(a,DEFAULT_COMPOSITION);
 const before=a.snapshot(), count=a.stats().segments, grains=a.grains.length;
 assert.equal(addRandomColony(a,'phase6'),true);
 assert.equal(a.grains.length,grains+1);assert.equal(a.stats().segments,count);
 a.restore(before);assert.equal(a.grains.length,grains);assert.equal(a.stats().segments,count);
});
test('palette recipes retain every stop even when they contain only two or twelve',()=>{
 const ids=new Set(PALETTES.map(p=>p.id));assert.equal(ids.size,PALETTES.length);
 const two=originalStops('strataclysm/0'),twelve=originalStops('itsamoire/spectrum');
 assert.equal(two.length,2);assert.equal(twelve.length,12);
 const lut=buildColorLUT(twelve);assert.equal(lut.length,256*3);
 assert.deepEqual([...lut.slice(0,3)],hexToRgb(twelve[0]));
 assert.deepEqual([...lut.slice(-3)],hexToRgb(twelve.at(-1)));
 assert.equal(basePalette('unknown').id,'silver');
});
