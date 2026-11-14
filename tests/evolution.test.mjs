import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeVolumeShape,EVOLUTION_DEFAULTS,validatedGoals,noveltyOf,scoreEvolution,rankEvolution} from '../src/evolution.js';
import {createSiblingRecipes,evaluateSibling,exportNursery,importNursery} from '../src/nursery.js';
import {BREEDING_PRESETS} from '../src/breeding.js';

function field(n=14){
 const owner=new Uint8Array(n*n*n), index=(x,y,z)=>z*n*n+y*n+x;
 return {size:n,owner,index,add(x,y,z){owner[index(x,y,z)]=1;}};
}
function cube(hollow=false){
 const v=field();for(let z=3;z<=9;z++)for(let y=3;y<=9;y++)for(let x=3;x<=9;x++){
  if(hollow && x>=5&&x<=7 && y>=5&&y<=7 && z>=5&&z<=7)continue;
  v.add(x,y,z);
 }return v;
}
function specimen(id,shape,genes=[4,3,3]){return {id,metrics:{shape,genes}};}

test('A.16 solid cube has no enclosed cavern and finite bounded geometry scores',()=>{
 const s=analyzeVolumeShape(cube());assert.equal(s.enclosedVoxels,0);assert.equal(s.hollow,0);
 for(const key of ['spikes','branching','asymmetry'])assert.ok(s[key]>=0&&s[key]<=1);
 assert.deepEqual(s.spans,[7,7,7]);assert.equal(s.voxels,343);
});
test('A.16 3D flood fill detects truly sealed internal cavity',()=>{
 const hollow=analyzeVolumeShape(cube(true)),solid=analyzeVolumeShape(cube());
 assert.equal(hollow.enclosedVoxels,27);assert.ok(hollow.hollow>solid.hollow);
});
test('A.16 open tunnel is NOT counted as enclosed cavern',()=>{
 const v=cube(true);for(let z=3;z<=4;z++)v.owner[v.index(6,6,z)]=0;
 assert.equal(analyzeVolumeShape(v).enclosedVoxels,0);
});
test('A.16 mirrored cubic symmetry measures lower than asymmetric protrusion',()=>{
 const baseline=cube(),base=analyzeVolumeShape(baseline);
 baseline.add(10,4,4);baseline.add(11,4,4);baseline.add(12,4,4);
 const modified=analyzeVolumeShape(baseline);
 assert.ok(modified.asymmetry>base.asymmetry);
 assert.ok(modified.spikes>base.spikes);
});
test('A.16 no material gives sensible zero measurements',()=>{
 const s=analyzeVolumeShape(field());assert.equal(s.voxels,0);assert.equal(s.spikes,0);assert.equal(s.hollow,0);
});
test('A.16 artist weights actually reverse preferred candidate',()=>{
 const low={spikes:.2,branching:.15,hollow:.9,asymmetry:.1},high={spikes:.95,branching:.85,hollow:.1,asymmetry:.4};
 const a=specimen('spiky',high),b=specimen('hollow',low);
 let goals={spikes:100,branching:80,hollow:0,asymmetry:0,novelty:0};
 assert.equal(rankEvolution([a,b],goals,[a,b])[0].record.id,'spiky');
 goals={spikes:0,branching:0,hollow:100,asymmetry:0,novelty:0};
 assert.equal(rankEvolution([a,b],goals,[a,b])[0].record.id,'hollow');
});
test('A.16 ranking remains deterministic and never mutates specimens',()=>{
 const base={spikes:.4,branching:.6,hollow:.2,asymmetry:.5};
 const items=[specimen('B',base),specimen('A',base)];const before=structuredClone(items);
 const first=rankEvolution(items,EVOLUTION_DEFAULTS,items).map(v=>v.record.id);
 assert.deepEqual(first,rankEvolution(items,EVOLUTION_DEFAULTS,items).map(v=>v.record.id));
 assert.deepEqual(items,before);assert.equal(first[0],'A');
});
test('A.16 scores novelty against real metrics, not palette',()=>{
 const a=specimen('A',{spikes:.1,branching:.15,hollow:0,asymmetry:.1});
 const b=specimen('B',{spikes:.85,branching:.8,hollow:.2,asymmetry:.9},[0,0,10]);
 assert.equal(noveltyOf(a,[]),.5);assert.ok(noveltyOf(a,[b])>.5);
 assert.equal(scoreEvolution(a,{spikes:100,branching:0,hollow:0,asymmetry:0,novelty:0}).score,10);
});
test('A.16 zero goals and out-of-range settings rejected, legacy unsco red',()=>{
 assert.throws(()=>validatedGoals({spikes:0,branching:0,hollow:0,asymmetry:0,novelty:0}),/at least one/);
 assert.throws(()=>validatedGoals({spikes:-1}),/between/);
 assert.equal(scoreEvolution({id:'legacy',metrics:{genes:[1,2,3]}},EVOLUTION_DEFAULTS),null);
});
test('A.16 actual grown specimen scores from 3D occupancy and survives nursery archive',()=>{
 const recipes=createSiblingRecipes(BREEDING_PRESETS,[40,35,25],{count:1,seed:780018});
 const trial=evaluateSibling(recipes[0],{steps:35,worldSeed:1701});
 const shape=trial.metrics.shape;
 assert.ok(shape.voxels===trial.metrics.cells);
 assert.ok(shape.exposedFaces>0 && shape.spans.every(v=>v>0));
 const r={id:'G1-1',generation:1,kept:true,recipe:recipes[0],...trial};
 const score=scoreEvolution(r,EVOLUTION_DEFAULTS,[r]);assert.ok(score.score>0);
 const imported=importNursery(JSON.parse(JSON.stringify(exportNursery([r],1))));
 assert.deepEqual(imported.specimens[0].metrics.shape,shape);
});
test('A.16 malformed imported shape is rejected without damaging original archive',()=>{
 const recipes=createSiblingRecipes(BREEDING_PRESETS,[40,35,25],{count:1,seed:234});
 const trial=evaluateSibling(recipes[0],{steps:28});
 const packet=exportNursery([{id:'example',generation:1,kept:true,recipe:recipes[0],...trial}]);
 packet.specimens[0].metrics.shape.hollow=Infinity;
 assert.throws(()=>importNursery(packet),/Invalid shape metrics/);
 delete packet.specimens[0].metrics.shape;
 const legacy=importNursery(packet);assert.ok(!('shape' in legacy.specimens[0].metrics));
});
