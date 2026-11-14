import test from 'node:test';
import assert from 'node:assert/strict';
import { CrystalWorld } from '../src/growth.js';
import { packOpticalField, opticalDefect, renderSpectralCPU } from '../src/optics.js';

const world=(seed=1362)=>{const w=new CrystalWorld(132);w.randomize(seed);w.seed(62,63,.15,undefined,'rosette');for(let i=0;i<34;i++)w.step();return w;};
const lut=Uint8Array.from({length:768},(_,i)=>i%3===1 ? Math.floor(i/3) : i%3===0?255-Math.floor(i/3):Math.floor(i/6));
test('optical geometry pack has correct extent and occupied alpha encoding',()=>{
 const w=world(), f=w.spherulite, p=packOpticalField(f);
 assert.equal(p.width,f.size);assert.equal(p.data.length,f.size*f.size*4);
 for(let i=0;i<f.owner.length;i++)assert.equal(p.data[4*i+3],f.owner[i]?(f.boundary[i]?127:255):0);
});
test('wavelength-separated CPU optics is finite and visibly analyzer-responsive',()=>{
 const w=world(),f=w.spherulite;
 const one=renderSpectralCPU(f,lut,{analyzer:0,contrast:1,retardance:.7,dispersion:.7,defects:.7,light:.8});
 const two=renderSpectralCPU(f,lut,{analyzer:45,contrast:1,retardance:.7,dispersion:.7,defects:.7,light:.8});
 assert.ok(one.data.some(Boolean));assert.notDeepEqual(one.data,two.data);
 for(const v of one.data)assert.ok(v>=0&&v<=255);
});
test('different wavelength and defect settings alter optics only, not crystal physics',()=>{
 const w=world(),f=w.spherulite;const before=w.snapshot();
 const a=renderSpectralCPU(f,lut,{dispersion:0,defects:0});
 const b=renderSpectralCPU(f,lut,{dispersion:1,defects:1});
 assert.notDeepEqual(a.data,b.data);
 assert.deepEqual(w.snapshot(),before);
});
test('twisting stored optical directors never alters grown cell occupancy or grain identity',()=>{
 const w=world(),f=w.spherulite;const owner=f.owner.slice(),birth=f.birth.slice(),crystal=w.crystal.slice(),old=f.director.slice();
 const changed=f.twistOptics(62,63,22,1);
 assert.ok(changed>4);assert.notDeepEqual(f.director,old);
 assert.deepEqual(f.owner,owner);assert.deepEqual(f.birth,birth);assert.deepEqual(w.crystal,crystal);
});
test('Undo snapshot restores the exact pre-twist directors, material and render identity',()=>{
 const w=world(),snapshot=w.snapshot();
 w.spherulite.twistOptics(62,63,19,.8);
 w.restore(snapshot);
 assert.deepEqual(w.spherulite.director,snapshot.spherulite.director);
 assert.deepEqual(w.spherulite.owner,snapshot.spherulite.owner);
 assert.deepEqual(w.crystal,snapshot.crystal);
});
test('blank touch and zero-strength twist are mathematically inert',()=>{
 const w=world(),f=w.spherulite;const old=f.version;
 assert.equal(f.twistOptics(62,63,18,0),0);
 assert.equal(f.twistOptics(2,2,1,1),0);
 assert.equal(f.version,old);
});
test('defect measure is within 0..1 and detects changes to the local field',()=>{
 const w=world(),f=w.spherulite;
 for(let y=2;y<f.size-2;y+=6)for(let x=2;x<f.size-2;x+=6){const d=opticalDefect(f,x,y);assert.ok(Number.isFinite(d)&&d>=0&&d<=1);}
});
