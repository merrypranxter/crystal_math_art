/**
 * A.6 Mineral Flesh: a deterministic 2.5D surface/material projection.
 * Material is derived from actual solid fraction, grain identity, facet direction,
 * and the timestamp at which a cell first solidified. This module never changes
 * simulation state. It is ARTISTIC RELIEF/INTERFERENCE, not measured mineral optics.
 */
export const MINERAL_FINISHES = Object.freeze(['mineral','strata','prism','obsidian','archive']);
const PI2=Math.PI*2;
const limit=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const hypot=Math.hypot;

/** Two-pass chamfer distance into a connected solid mask; cells outside remain 0. */
export function reliefField(field) {
  const n=field.size, len=n*n;
  const d=new Float32Array(len), height=new Float32Array(len);
  const phi=field.phi, owner=field.owner;
  const diag=1.41421356237;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=y*n+x;
    d[i]=(x===0||y===0||x===n-1||y===n-1||!owner[i]||phi[i]<.52)?0:999;
  }
  for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
    const i=y*n+x;
    if(!d[i])continue;
    d[i]=Math.min(d[i],d[i-1]+1,d[i-n]+1,d[i-n-1]+diag,d[i-n+1]+diag);
  }
  for(let y=n-2;y>0;y--)for(let x=n-2;x>0;x--){
    const i=y*n+x;
    if(!d[i])continue;
    d[i]=Math.min(d[i],d[i+1]+1,d[i+n]+1,d[i+n+1]+diag,d[i+n-1]+diag);
  }
  for(let i=0;i<len;i++)height[i]=limit(phi[i])*(1-Math.exp(-d[i]*.19));
  return {distance:d,height};
}

function samplePalette(lut, location) {
  const t=((location%1)+1)%1;
  const k=Math.floor(t*255)*3;
  return [lut[k],lut[k+1],lut[k+2]];
}

/** RGBA pixels, directly compositable into a normal Canvas2D ImageData. */
export function renderMineral(field,world,paletteLUT,settings={}) {
  const n=field.size,len=n*n, out=new Uint8ClampedArray(len*4);
  const {distance,height}=reliefField(field);
  const finish=MINERAL_FINISHES.includes(settings.finish)?settings.finish:'mineral';
  const depth=limit(settings.depth??.74), bands=limit(settings.bands??.55), spectral=limit(settings.spectral??.55);
  const light=(settings.lightAngle??310)*Math.PI/180;
  const lx=Math.cos(light),ly=Math.sin(light);
  const birth=field.birth||new Uint32Array(len);
  const fossilBirth=field.fossilBirth||new Uint32Array(len);
  const generation=field.generation||new Uint16Array(len);
  const scar=field.scar||new Uint8Array(len);
  const exposure=limit(settings.exposure??.68);
  const crystals=world.grains;
  let rendered=0,peakDepth=0;
  for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){
    const i=y*n+x, alpha=limit(field.phi[i]), id=field.owner[i];
    if(!id||alpha<.015){
      // Archive view exposes the old buried crystal along an OPEN excavation.
      // No new material is created here: only a translucent ghost projection.
      if(finish==='archive' && scar[i] && fossilBirth[i]){
        const neighbor=Math.max(field.phi[i-1],field.phi[i+1],field.phi[i-n],field.phi[i+n]);
        const old=samplePalette(paletteLUT,(fossilBirth[i]*.007+generation[i]*.13)%1);
        const edge=neighbor>.52?1:.20;
        const k=i*4;
        for(let c=0;c<3;c++)out[k+c]=Math.min(255,old[c]*(.22+.28*edge)+34*edge);
        out[k+3]=Math.round(190*exposure*edge);
        rendered++;
      }
      continue;
    }
    const grain=crystals[id-1];
    if(!grain)continue;
    const ph=field.phi;
    const dhdx=(height[i+1]-height[i-1])*.5, dhdy=(height[i+n]-height[i-n])*.5;
    // The height field comes from the actual occupied interface. Its normal
    // is quantized toward real grain axes for a faceted, coherent appearance.
    let edgeAngle=Math.atan2(-dhdy,-dhdx);
    const folds=({phase4:4,phase6:6,phase8:8})[grain.morphology]||6;
    if(dhdx*dhdx+dhdy*dhdy<.000001)edgeAngle=grain.angle;
    const axisSize=PI2/folds;
    const quantized=grain.angle+Math.round((edgeAngle-grain.angle)/axisSize)*axisSize;
    const facetWeight=.20+.65*depth;
    const nx=Math.cos(edgeAngle)*(1-facetWeight)+Math.cos(quantized)*facetWeight;
    const ny=Math.sin(edgeAngle)*(1-facetWeight)+Math.sin(quantized)*facetWeight;
    const face=limit(.43+.57*(nx*lx+ny*ly)*.67,.05,1);
    const silhouette=limit(hypot(ph[i+1]-ph[i-1],ph[i+n]-ph[i-n])*.7,0,.9);
    const age=(birth[i]||1);
    const grainAge=Math.max(0,age-(grain.seededAt||0));
    // Growth-ring stripes follow *deposition time*, never canvas position.
    const layer=grainAge*.075;
    const ring=.5+.5*Math.cos(layer*PI2);
    const paletteShift=bands*(ring-.5)*.28 + spectral*(face-.5)*.19;
    const archiveShift=finish==='archive' ? generation[i]*.135 + (fossilBirth[i]?fossilBirth[i]*.006:0) : 0;
    const t=id*.161 + layer*.058 + paletteShift + archiveShift + (finish==='prism' ? spectral*(.42*face+.26*Math.sin(PI2*(height[i]*2.3+edgeAngle*.19))) : 0);
    let rgb=samplePalette(paletteLUT,t);
    const h=height[i], raised=limit(h*.80+.20,0,1);
    peakDepth=Math.max(peakDepth,h);
    let shade=(.35+.55*face)*(.78+.22*raised);
    let emission=.10+Math.pow(Math.max(0,face),6)*.45*depth;
    if(finish==='strata'){
      shade*=.72+.43*(ring-.5)*bands;
      emission*=.4;
    } else if(finish==='prism'){
      shade=.47+.39*face;
      emission=.09+.35*spectral*(.5+.5*Math.sin(PI2*(age*.028+height[i]*2.4+face)));
    } else if(finish==='obsidian'){
      shade=.055+.22*Math.pow(face,2);
      emission=.09+(.14+.74*spectral)*Math.pow(Math.max(0,face),9);
    } else if(finish==='archive'){
      // Chronology is measured by true solidification and previous deposition.
      const ghost=fossilBirth[i]>0?1:0;
      const layers=.50+.50*Math.cos((grainAge*.12+generation[i]*.82)*PI2);
      shade=(.34+.49*face)*(.63+.37*layers)+.13*ghost*exposure;
      emission=.08+.24*face+.23*(scar[i]/255)*exposure;
    }
    const k=i*4;
    for(let c=0;c<3;c++){
      const highlight=emission*(finish==='obsidian'?240:220)*(1-silhouette*.4)
        + (finish==='obsidian' ? 145*spectral*Math.pow(silhouette,1.7) : 0);
      const lowlight=finish==='obsidian'?rgb[c]*.18:rgb[c];
      out[k+c]=limit(lowlight*shade+highlight+silhouette*(20+depth*40),0,255);
    }
    if(finish==='archive' && scar[i]){
      const seam=scar[i]/255;
      out[k]=limit(out[k]+74*seam*exposure,0,255);
      out[k+1]=limit(out[k+1]+28*seam*exposure,0,255);
      out[k+2]=limit(out[k+2]+97*seam*exposure,0,255);
    }
    out[k+3]=Math.round(255*limit(alpha*(.67+.30*depth)+silhouette*.19));
    rendered++;
  }
  return {width:n,height:n,data:out,statistics:{cells:rendered,peakDepth}};
}
