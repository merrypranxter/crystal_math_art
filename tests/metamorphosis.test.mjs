import test from 'node:test';
import assert from 'node:assert/strict';
import { CrystalWorld } from '../src/growth.js';
import { buildVolumeMesh, buildSmoothVolumeMesh, buildCrystalMesh, volumeThickness } from '../src/body3d.js';

function setup(seed=421,steps=75){
  const world=new CrystalWorld(140);
  world.randomize(seed);world.config.morphology='volumeCoral';world.config.volumeGrowth=1;
  world.seed(70,70,0,undefined,'volumeCoral');
  for(let i=0;i<steps;i++)world.step();
  return world;
}
function solids(w){return w.volume.stats().volumeCells;}

test('A.12 fractures carve genuinely 3D occupied mineral and record old birth dates',()=>{
  const w=setup(),v=w.volume,before=solids(w);
  w.config.volumeFractureDepth=50;w.config.volumeFractureReach=.7;
  const removed=w.fracture(70,70,24);
  assert.ok(removed>0,'fracture must cut occupied 3D cells');
  assert.equal(before-solids(w),removed);
  const scars=v.scar.reduce((n,x)=>n+(x?1:0),0);
  assert.equal(scars,removed);
  const strata=new Set();
  for(let i=0;i<v.count;i++)if(v.scar[i]){
    assert.equal(v.owner[i],0);assert.equal(v.birth[i],0);
    assert.ok(v.fossilBirth[i]>0,'old formation time survives the cut');
    assert.ok(v.nutrient[i]>.5);
    strata.add(Math.floor(i/v.area));
  }
  assert.ok(strata.size>=3,'fracture spans several real Z layers');
});

test('fracture reach truly changes the 3D extent, not a decorative image parameter',()=>{
  const small=setup(),large=setup();
  small.config.volumeFractureReach=.05;large.config.volumeFractureReach=.95;
  const lo=small.volume.fractureShear(70,70,24,50,.05);
  const hi=large.volume.fractureShear(70,70,24,50,.95);
  assert.ok(hi>lo,`${hi} should exceed ${lo}`);
});

test('recrystallization fills old fractures with new timestamps and generation count',()=>{
  const w=setup(),v=w.volume;
  const cut=v.fractureShear(70,70,24,50,.7);
  assert.ok(cut>0);
  const t=w.ticks;
  for(let i=0;i<70;i++)w.step();
  const st=v.stats();
  assert.ok(st.volumeRegrown>0,'exposed cracks recruit living growth fronts');
  for(let i=0;i<v.count;i++)if(v.generation[i]>0&&v.owner[i]){
    assert.ok(v.fossilBirth[i]>0);
    assert.ok(v.birth[i]>t);
    assert.equal(v.scar[i],0);
  }
});

test('snapshot Undo exactly restores the 3D history and RNG state after fracture and regrowth',()=>{
  const w=setup(),orig=w.snapshot();
  const birth=orig.volume.birth.slice(),previous=orig.volume.fossilBirth.slice(),gens=orig.volume.generation.slice(),scar=orig.volume.scar.slice();
  w.fracture(70,70,24);for(let i=0;i<35;i++)w.step();
  w.restore(orig);
  assert.deepEqual(w.volume.owner,orig.volume.owner);
  assert.deepEqual(w.volume.birth,birth);
  assert.deepEqual(w.volume.fossilBirth,previous);
  assert.deepEqual(w.volume.generation,gens);
  assert.deepEqual(w.volume.scar,scar);
  assert.deepEqual(w.volume.nutrient,orig.volume.nutrient);
  assert.equal(w.rngState,orig.rngState);
});

test('both sharp facet and smooth isosurface produce distinct real 3D geometry',()=>{
  const w=setup();const facets=buildVolumeMesh(w.volume),smooth=buildSmoothVolumeMesh(w.volume);
  assert.ok(facets.triangles>50);assert.ok(smooth.triangles>50);
  assert.notEqual(facets.triangles,smooth.triangles);
  assert.equal(smooth.vertices.length%27,0);
  assert.ok(smooth.vertices.every(Number.isFinite));
  assert.ok(smooth.vertices.some((_,i)=>i%9===2&&Math.abs(smooth.vertices[i])>.08));
});

test('smooth normals are unit-length and vary with the local 3D surface',()=>{
  const m=buildSmoothVolumeMesh(setup().volume),directions=new Set();
  for(let i=0;i<m.vertices.length;i+=9){
    const norm=[m.vertices[i+3],m.vertices[i+4],m.vertices[i+5]];
    assert.ok(Math.abs(Math.hypot(...norm)-1)<.0001);
    directions.add(norm.map(x=>Math.round(x*5)).join(':'));
  }
  assert.ok(directions.size>15,`needs curved multi-axis normals, got ${directions.size}`);
});

test('isosurface is deterministic and mesh creation never edits crystal physics',()=>{
  const w=setup(),before=w.snapshot();
  const a=buildSmoothVolumeMesh(w.volume),b=buildSmoothVolumeMesh(w.volume);
  assert.deepEqual(a.vertices,b.vertices);
  const combined=buildCrystalMesh(w,{surface:'smooth',depth:.7,detail:'fast'});
  assert.equal(combined.volumeTriangles,a.triangles);
  assert.ok(combined.triangles>=a.triangles);
  assert.deepEqual(w.snapshot(),before);
});

test('smooth and sharp surfaces both expose the same real 3D mineral cells',()=>{
  const w=setup();
  const a=buildCrystalMesh(w,{surface:'facets'}),b=buildCrystalMesh(w,{surface:'smooth'});
  assert.equal(a.volumeVoxels,solids(w));assert.equal(b.volumeVoxels,solids(w));
  assert.equal(b.surface,'smooth');assert.equal(a.surface,'facets');
});

test('thickness proxy changes when internal material is excavated and is bounded',()=>{
  const w=setup(),v=w.volume,old=volumeThickness(v);
  assert.ok(old.some(x=>x>0));assert.ok(old.every(x=>x>=0&&x<=1));
  v.fractureShear(70,70,24,50,.85);
  const next=volumeThickness(v);
  assert.ok(next.some((v,i)=>v<old[i]));
});

test('body rendering on empty world preserves an empty mesh and safe finite data',()=>{
  const w=new CrystalWorld(90);w.randomize(9);
  const m=buildSmoothVolumeMesh(w.volume);
  assert.equal(m.triangles,0);assert.equal(m.voxels,0);
  assert.ok(m.vertices.length===0);
});
