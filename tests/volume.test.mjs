import test from 'node:test';
import assert from 'node:assert/strict';
import { CrystalWorld, VOLUME_MODES } from '../src/growth.js';
import { buildCrystalMesh, buildVolumeMesh } from '../src/body3d.js';
import { renderVolumeProjection } from '../src/volume.js';

function grow(mode='volumeNeedle',steps=70,seed=3459){
  const w=new CrystalWorld(180);w.randomize(seed);w.seed(90,86,.37,undefined,mode);
  for(let i=0;i<steps;i++)w.step();return w;
}
const rgb=new Uint8Array(256*3).map((_,i)=>(i*37)%256);

test('all three genuine volumetric growth families are available for planting',()=>{
  assert.deepEqual(Object.keys(VOLUME_MODES),['volumeNeedle','volumeOcta','volumeCoral']);
  for(const mode of Object.keys(VOLUME_MODES)){
    const w=grow(mode,80),s=w.volume.stats();
    assert.ok(s.volumeCells>250,mode+' should grow 3D mineral');
    assert.ok(s.volumeDepthSlices>7,mode+' must occupy several distinct Z depths');
    assert.ok(w.volume.owner.some(x=>x===1));
    assert.equal(w.crystal.some(Boolean),false,'3D material is independent from 2D occupancy');
    assert.equal(w.grains[0].morphology,mode);
  }
});
test('volume morphologies have distinct spatial evolution under same seed',()=>{
  const a=grow('volumeNeedle',75),b=grow('volumeOcta',75),c=grow('volumeCoral',75);
  assert.notDeepEqual(a.volume.owner,b.volume.owner);
  assert.notDeepEqual(a.volume.owner,c.volume.owner);
});
test('same seed and settings reproduce exact x/y/z solids, nutrients and history',()=>{
  const a=grow('volumeCoral',85,1234),b=grow('volumeCoral',85,1234);
  assert.deepEqual(a.volume.snapshot(),b.volume.snapshot());
  assert.equal(a.rngState,b.rngState);
});
test('3D solute diffusion remains nonnegative, finite and excludes occupied crystal cells',()=>{
  const w=grow('volumeOcta',55);
  w.config.volumeDiffusion=.16;w.volume.diffuse();
  for(let i=0;i<w.volume.nutrient.length;i++){
    const c=w.volume.nutrient[i];assert.ok(Number.isFinite(c)&&c>=0&&c<=1);
    if(w.volume.owner[i])assert.equal(c,0);
  }
});
test('zero volume growth speed arrests deposition while preserving existing voxels',()=>{
  const w=grow('volumeNeedle',22),before=w.volume.owner.slice();
  w.config.volumeGrowth=0;
  for(let i=0;i<40;i++)w.step();
  assert.deepEqual(w.volume.owner,before);
});
test('new volume grain receives a different persistent Z depth',()=>{
  const w=new CrystalWorld(340);w.randomize(12);
  w.config.volumeSeedDepth=10;w.seed(80,80,0,undefined,'volumeNeedle');
  w.config.volumeSeedDepth=90;w.seed(220,220,.5,undefined,'volumeOcta');
  assert.ok(w.grains[0].z < w.grains[1].z);
  assert.ok(w.volume.owner.includes(1)&&w.volume.owner.includes(2));
});
test('volume brush melting hollows through Z, preserves other material and grows again',()=>{
  const w=grow('volumeCoral',85),before=w.volume.stats().volumeCells;
  const removed=w.volume.meltColumn(90,86,20);
  assert.ok(removed>0);assert.ok(w.volume.stats().volumeCells<before);
  const afterMelt=w.volume.stats().volumeCells;
  for(let i=0;i<35;i++)w.step();
  assert.ok(w.volume.stats().volumeCells>afterMelt,'live frontier recrystallizes open cavity');
});
test('snapshot and undo restore exact volume occupancy and nutrient state',()=>{
  const w=grow('volumeNeedle',45),snap=w.snapshot(),original=w.volume.snapshot();
  w.melt(90,86,16);for(let i=0;i<8;i++)w.step();
  w.restore(snap);
  const restored=w.volume.snapshot();
  assert.deepEqual(restored.owner,original.owner);
  assert.deepEqual(restored.birth,original.birth);
  assert.deepEqual(restored.nutrient,original.nutrient);
  assert.deepEqual(restored.frontier,original.frontier);
});
test('3D mesh includes surfaces and perpendicular normals from real voxel occupancy',()=>{
  const w=grow('volumeNeedle',70),m=buildVolumeMesh(w.volume);
  assert.ok(m.voxels>300);
  assert.ok(m.exposedFaces>0&&m.triangles===m.exposedFaces*4);
  const seen=new Set();
  for(let i=0;i<m.vertices.length;i+=9){
    const pos=m.vertices.slice(i,i+3),normal=m.vertices.slice(i+3,i+6);
    assert.ok(pos.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-4);
    seen.add(Math.round(pos[2]*10));
  }
  assert.ok(seen.size>4,'3D geometry spans independent Z planes');
});
test('combined 3D body retains legacy extrusion and independently grown volume',()=>{
  const w=grow('volumeOcta',60);
  w.seed(32,29,.3,undefined,'phase6');for(let i=0;i<30;i++)w.step();
  const before=w.snapshot(),m=buildCrystalMesh(w);
  assert.ok(m.volumeVoxels>100&&m.volumeTriangles>0);
  assert.ok(m.topTriangles>0&&m.wallTriangles>0);
  assert.equal(m.triangles,m.topTriangles+m.bottomTriangles+m.wallTriangles+m.volumeTriangles);
  assert.deepEqual(w.snapshot(),before,'mesh must never modify growth history or random state');
});
test('diagnostic projection shows all Z layers and slice view is selective',()=>{
  const w=grow('volumeOcta',68);
  const all=renderVolumeProjection(w.volume,rgb,{view:'projection'});
  const slice=renderVolumeProjection(w.volume,rgb,{view:'slice',slice:50});
  assert.ok(all.data.some(Boolean));assert.ok(slice.data.some(Boolean));
  assert.notDeepEqual(all.data,slice.data);
  assert.equal(all.width,w.volume.size);assert.equal(all.data.length,w.volume.area*4);
});
test('diagnostic projection and 3D mesh do not mutate the simulation',()=>{
  const w=grow('volumeCoral',50),before=w.snapshot();
  renderVolumeProjection(w.volume,rgb);
  buildVolumeMesh(w.volume);
  assert.deepEqual(w.snapshot(),before);
});
