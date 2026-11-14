import test from 'node:test';
import assert from 'node:assert/strict';
import { CrystalWorld } from '../src/growth.js';
import { buildCrystalMesh } from '../src/body3d.js';

const live=(seed=8321)=>{const w=new CrystalWorld(144);w.randomize(seed);w.seed(40,54,.21,undefined,'phase6');w.seed(97,96,.45,undefined,'rosette');for(let i=0;i<50;i++)w.step();return w;};
const mesh=(w,settings={})=>buildCrystalMesh(w,{detail:'balanced',depth:.75,...settings});

test('3D mesh is empty before any solid crystal is planted',()=>{
 const w=new CrystalWorld(90);w.randomize(22);const m=mesh(w);
 assert.equal(m.occupied,0);assert.equal(m.triangles,0);assert.equal(m.vertices.length,0);
});
test('live growth becomes actual top triangles, walls, AND underside',()=>{
 const w=live(),m=mesh(w);
 assert.ok(m.occupied>30);
 assert.equal(m.topTriangles,m.occupied*2);
 assert.equal(m.bottomTriangles,m.occupied*2);
 assert.ok(m.wallTriangles>0);
 assert.equal(m.triangles,m.topTriangles+m.wallTriangles+m.bottomTriangles);
 assert.equal(m.vertices.length,m.triangles*27);
});
test('extrusion has finite vertical height and a real bottom plane',()=>{
 const m=mesh(live());
 let low=Infinity,high=-Infinity;
 for(let i=2;i<m.vertices.length;i+=9){low=Math.min(low,m.vertices[i]);high=Math.max(high,m.vertices[i]);}
 assert.ok(low<0,`Missing back face: minimum ${low}`);
 assert.ok(high>.1,`Missing raised volume: max ${high}`);
 assert.ok(high-low>.15);
});
test('thickness slider genuinely changes the geometry, not merely shader parameters',()=>{
 const w=live(),lo=mesh(w,{depth:0}),hi=mesh(w,{depth:1});
 assert.equal(lo.triangles,hi.triangles);
 assert.notDeepEqual(lo.heights,hi.heights);
 assert.notDeepEqual(lo.vertices,hi.vertices);
});
test('mesh generation is deterministic and does not touch physics, diffusion or RNG state',()=>{
 const w=live(),before=w.snapshot();
 const a=mesh(w),b=mesh(w);
 assert.deepEqual(a.vertices,b.vertices);
 assert.deepEqual(w.snapshot(),before);
});
test('different detail levels bound mesh size for iPhone while preserving visible solids',()=>{
 const w=live();const fast=mesh(w,{detail:'fast'}),balanced=mesh(w),fine=mesh(w,{detail:'fine'});
 assert.ok(fast.occupied>0&&balanced.occupied>0&&fine.occupied>0);
 assert.ok(fine.grid>balanced.grid&&balanced.grid>fast.grid);
 assert.ok(fine.triangles>fast.triangles);
});
test('open mineral is removed from the corresponding 3D mesh after melting',()=>{
 const w=live(),before=mesh(w);
 w.melt(40,54,27);
 const after=mesh(w);
 assert.ok(after.occupied<before.occupied,`${before.occupied} vs ${after.occupied}`);
});
test('four older crystal growth engines are included in the 3D body',()=>{
 const morphs=['cathedral','coral','phase4','spherulite'];
 const w=new CrystalWorld(180);w.randomize(122);
 const seeds=[[30,30],[145,34],[30,140],[139,141]];
 for(let j=0;j<4;j++)w.seed(...seeds[j],.3,undefined,morphs[j]);
 for(let i=0;i<65;i++)w.step();
 const m=mesh(w,{detail:'fine'});
 for(const g of w.grains){assert.ok(m.owners.includes(g.id),`${g.morphology} was missing from 3D geometry`);}
});
test('mesh normals and pigment coordinates remain finite at all sampled vertices',()=>{
 const m=mesh(live(),{detail:'fine'});
 for(let i=0;i<m.vertices.length;i+=9){
  for(let j=0;j<9;j++)assert.ok(Number.isFinite(m.vertices[i+j]));
  assert.ok(Math.abs(Math.hypot(m.vertices[i+3],m.vertices[i+4],m.vertices[i+5])-1)<1e-5);
  assert.ok(m.vertices[i+6]>=0&&m.vertices[i+6]<=1);
 }
});
