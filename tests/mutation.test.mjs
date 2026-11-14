import test from 'node:test';
import assert from 'node:assert/strict';
import { CrystalWorld } from '../src/growth.js';
import { GENE_LAWS, GENE_NAMES } from '../src/volume.js';
import { buildVolumeMesh, buildSmoothVolumeMesh } from '../src/body3d.js';

const make=(type='volumeNeedle',seed=73291)=>{
  const w=new CrystalWorld(200);w.randomize(seed);w.config.volumeGrowth=.95;
  w.seed(100,100,.13,undefined,type);for(let i=0;i<52;i++)w.step();return w;
};
const steps=(w,n)=>{for(let i=0;i<n;i++)w.step();};
const geneOptions={primary:'volumeOcta',partner:'volumeCoral',mix:.46,rotation:51};

test('the physical 3D volume stores a growth law and orientation in every occupied cell',()=>{
  assert.equal(GENE_NAMES.length,4);
  for(const [type,gene] of Object.entries(GENE_LAWS)){
    const w=make(type),v=w.volume;
    assert.ok(v.stats().volumeCells>200);
    for(let i=0;i<v.count;i++)if(v.owner[i]){
      assert.equal(v.gene[i],gene);
      assert.ok(Number.isFinite(v.geneAngle[i]));
      assert.equal(v.lineage[i],0);
    }
  }
});

test('mutating exposed fronts changes inherited genes but not occupied mineral, grain ownership or birth',()=>{
  const w=make(),v=w.volume;
  const beforeOwner=v.owner.slice(),beforeBirth=v.birth.slice(),beforeNutrient=v.nutrient.slice();
  const beforeCount=v.stats().volumeCells,epoch=v.newMutationEpoch();
  const altered=v.mutateFronts({...geneOptions,epoch});
  assert.ok(altered>20,`Expected exposed mutation; got ${altered}`);
  assert.deepEqual(v.owner,beforeOwner);
  assert.deepEqual(v.birth,beforeBirth);
  assert.deepEqual(v.nutrient,beforeNutrient);
  assert.equal(v.stats().volumeCells,beforeCount);
  assert.equal(v.mutationSerial,epoch);
  assert.ok(v.gene.some(g=>g===GENE_LAWS.volumeCoral));
  assert.ok(v.gene.some(g=>g===GENE_LAWS.volumeOcta));
  assert.ok(v.gene.some(g=>g===GENE_LAWS.volumeNeedle));
});

test('two distinct kinetic laws coexist in the SAME grain and propagate into newly deposited matter',()=>{
  const w=make(),v=w.volume;
  const altered=v.mutateFronts({...geneOptions,epoch:v.newMutationEpoch()});
  const before=v.stats(),ids=w.grains.filter(g=>g.morphology.startsWith('volume'));
  assert.equal(ids.length,1);
  assert.ok(altered>0);
  assert.ok(before.volumeChimeras>=1);
  steps(w,55);
  const after=v.stats();
  assert.ok(after.volumeCells>before.volumeCells);
  assert.ok(after.volumeMutants>before.volumeMutants,
    `Expected daughter voxels to inherit mutated gene; ${before.volumeMutants} -> ${after.volumeMutants}`);
  assert.ok(after.volumeOctaCells>0);
  assert.ok(after.volumeCoralCells>0);
  assert.ok(after.volumeNeedleCells>0);
});

test('Z-targeted genetic paint changes only material near the brush region',()=>{
  const w=make('volumeNeedle'),v=w.volume;
  const occupied=[...v.owner].findIndex((g,i)=>g&&v.xyz(i)[2]>2);
  assert.ok(occupied>=0);
  const [x,y,z]=v.xyz(occupied),oldOwner=v.owner.slice(),oldBirth=v.birth.slice(),oldGene=v.gene.slice();
  const token=v.newMutationEpoch();
  const changed=v.mutateRegion(x*v.scale,y*v.scale,v.scale*4,{
    primary:'volumeOcta',partner:'volumeCoral',mix:0,rotation:-50,
    zPercent:100*z/(v.size-1),reach:.06,epoch:token
  });
  assert.ok(changed>0);
  assert.deepEqual(v.owner,oldOwner);assert.deepEqual(v.birth,oldBirth);
  let outsideChanged=0;
  for(let i=0;i<v.count;i++)if(v.gene[i]!==oldGene[i]&&Math.abs(v.xyz(i)[2]-z)>3)outsideChanged++;
  assert.equal(outsideChanged,0,'Narrow Z mutation should not change distant layers');
});

test('Undo restores gene, angle, lineage, living frontier and RNG deterministically',()=>{
  const w=make('volumeOcta'),v=w.volume,save=w.snapshot();
  v.mutateFronts({primary:'volumeCoral',partner:'volumeNeedle',mix:.30,rotation:135,epoch:v.newMutationEpoch()});
  steps(w,12);
  assert.notDeepEqual(v.gene,save.volume.gene);
  w.restore(save);
  assert.deepEqual(v.gene,save.volume.gene);
  assert.deepEqual(v.geneAngle,save.volume.geneAngle);
  assert.deepEqual(v.lineage,save.volume.lineage);
  assert.deepEqual(v.owner,save.volume.owner);
  assert.equal(v.mutationSerial,save.volume.mutationSerial);
  assert.equal(v.mutationEvents,save.volume.mutationEvents);
  const mirror=make('volumeOcta');
  assert.deepEqual(v.gene,mirror.volume.gene);
  steps(w,8);steps(mirror,8);
  assert.deepEqual(v.gene,mirror.volume.gene);
  assert.deepEqual(v.owner,mirror.volume.owner);
});

test('same world and brush actions produce byte-identical future mutant growth',()=>{
  const a=make('volumeNeedle',529),b=make('volumeNeedle',529);
  for(const w of [a,b]){
    const v=w.volume;
    v.mutateFronts({...geneOptions,epoch:v.newMutationEpoch()});
    v.mutateRegion(101,98,22,{...geneOptions,zPercent:50,reach:.6,epoch:v.newMutationEpoch()});
    steps(w,30);
  }
  assert.deepEqual(a.volume.owner,b.volume.owner);
  assert.deepEqual(a.volume.gene,b.volume.gene);
  assert.deepEqual(a.volume.lineage,b.volume.lineage);
  assert.deepEqual(a.volume.nutrient,b.volume.nutrient);
});

test('original voxel and smooth 3D meshes reflect gene patterns without modifying material state',()=>{
  const w=make(),v=w.volume;
  const m=buildVolumeMesh(v),s=buildSmoothVolumeMesh(v);
  const snapshot=v.snapshot();
  v.mutateFronts({...geneOptions,epoch:v.newMutationEpoch()});
  const next=buildVolumeMesh(v),smooth=buildSmoothVolumeMesh(v);
  assert.notDeepEqual(next.vertices,m.vertices);
  assert.notDeepEqual(smooth.vertices,s.vertices);
  assert.deepEqual(v.owner,snapshot.owner);
  assert.deepEqual(v.birth,snapshot.birth);
  assert.ok(next.triangles>0&&smooth.triangles>0);
});

test('new mutation UI is safe without a pre-existing 3D volume',()=>{
  const w=new CrystalWorld(200);
  assert.equal(w.volume.mutateFronts(geneOptions),0);
  assert.equal(w.volume.mutateRegion(100,100,20,geneOptions),0);
  assert.equal(w.volume.stats().volumeChimeras,0);
});

test('switching genetic kinetics changes the subsequent SOLID GEOMETRY, not just the palette or light',()=>{
  const original=make('volumeNeedle',82743),mutant=make('volumeNeedle',82743);
  const count=mutant.volume.mutateFronts({primary:'volumeOcta',partner:'volumeCoral',mix:.50,rotation:58,epoch:mutant.volume.newMutationEpoch()});
  assert.ok(count>0);
  steps(original,55);steps(mutant,55);
  const plain=original.volume.owner,other=mutant.volume.owner;
  assert.equal(plain.length,other.length);
  let added=0,missing=0;
  for(let i=0;i<plain.length;i++){
    if(!plain[i]&&other[i])added++;
    if(plain[i]&&!other[i])missing++;
  }
  assert.ok(added+missing>50,`Expected a distinct mathematical solid, only ${added} added and ${missing} missing cells`);
});
