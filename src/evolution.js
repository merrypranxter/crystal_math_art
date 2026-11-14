/**
 * A.16 Selective Evolution — objective and bounded 3D phenotype measurements.
 * Scores describe the occupied voxel geometry; no optics or palette enters them.
 * They are artist-controlled selection heuristics, not universal measures of beauty.
 */
const clampE=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const EVOLUTION_TRAITS=Object.freeze([
  Object.freeze({key:'spikes',name:'Spikes & needles'}),
  Object.freeze({key:'branching',name:'Branchy skeletons'}),
  Object.freeze({key:'hollow',name:'Internal caverns'}),
  Object.freeze({key:'asymmetry',name:'Broken symmetry'}),
  Object.freeze({key:'novelty',name:'Strange relatives'})
]);
export const EVOLUTION_DEFAULTS=Object.freeze({spikes:70,branching:75,hollow:30,asymmetry:35,novelty:60});
const signedNeighbors=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

/** Analyze the full solid x/y/z lattice, NOT a picture of the specimen.
 * Cavity counts use flood-fill of empty voxels from outside a padded bounding box.
 * Ratios use stable bounded mappings so the different objectives are comparable.
 */
export function analyzeVolumeShape(volume){
  const n=volume.size, solid=volume.owner;
  if(!Number.isInteger(n)||n<3||!solid||solid.length!==n*n*n)throw Error('Invalid solid 3D volume');
  const ix=(x,y,z)=>z*n*n+y*n+x;
  let count=0,min=[n,n,n],max=[-1,-1,-1],mass=[0,0,0];
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    if(!solid[ix(x,y,z)])continue;
    count++;const v=[x,y,z];
    for(let a=0;a<3;a++){min[a]=Math.min(min[a],v[a]);max[a]=Math.max(max[a],v[a]);mass[a]+=v[a];}
  }
  if(!count)return {spikes:0,branching:0,hollow:0,asymmetry:0,surfaceToVolume:0,exposedFaces:0,tips:0,enclosedVoxels:0,voxels:0,spans:[0,0,0]};
  const spans=max.map((v,i)=>v-min[i]+1);
  let exposedFaces=0,exposedCells=0,tips=0,mirrorMismatch=0;
  for(let z=min[2];z<=max[2];z++)for(let y=min[1];y<=max[1];y++)for(let x=min[0];x<=max[0];x++){
    if(!solid[ix(x,y,z)])continue;
    let bonds=0;
    for(const [dx,dy,dz] of signedNeighbors){
      const xx=x+dx,yy=y+dy,zz=z+dz;
      if(xx<0||yy<0||zz<0||xx>=n||yy>=n||zz>=n||!solid[ix(xx,yy,zz)])exposedFaces++;
      else bonds++;
    }
    if(bonds<6)exposedCells++;
    if(bonds<=2)tips++;
    if(!solid[ix(min[0]+max[0]-x,y,z)])mirrorMismatch++;
    if(!solid[ix(x,min[1]+max[1]-y,z)])mirrorMismatch++;
    if(!solid[ix(x,y,min[2]+max[2]-z)])mirrorMismatch++;
  }
  // Padded-box flood fill: every empty voxel connected to the outer boundary
  // belongs to the exterior, not an internal cavern.
  const sx=spans[0]+2,sy=spans[1]+2,sz=spans[2]+2,area=sx*sy,total=area*sz;
  const outside=new Uint8Array(total),queue=new Int32Array(total);
  const id=(x,y,z)=>z*area+y*sx+x;
  let read=0,write=0;
  outside[0]=1;queue[write++]=0;
  while(read<write){
    const key=queue[read++],z=Math.floor(key/area),y=Math.floor(key%area/sx),x=key%sx;
    for(const [dx,dy,dz] of signedNeighbors){
      const xx=x+dx,yy=y+dy,zz=z+dz;
      if(xx<0||yy<0||zz<0||xx>=sx||yy>=sy||zz>=sz)continue;
      const t=id(xx,yy,zz);if(outside[t])continue;
      if(xx>0&&yy>0&&zz>0&&xx<sx-1&&yy<sy-1&&zz<sz-1&&solid[ix(min[0]+xx-1,min[1]+yy-1,min[2]+zz-1)])continue;
      outside[t]=1;queue[write++]=t;
    }
  }
  let enclosedVoxels=0;
  for(let z=1;z<sz-1;z++)for(let y=1;y<sy-1;y++)for(let x=1;x<sx-1;x++){
    if(!outside[id(x,y,z)]&&!solid[ix(min[0]+x-1,min[1]+y-1,min[2]+z-1)])enclosedVoxels++;
  }
  const exposedRatio=exposedFaces/Math.max(1,6*count);
  const tipRatio=tips/Math.max(1,exposedCells);
  const longest=Math.max(...spans),shortest=Math.max(1,Math.min(...spans));
  const elongation=clampE((longest/shortest-1)/2.6);
  const shapeCenter=mass.map((v,i)=>v/count-(min[i]+max[i])/2);
  const offCenter=Math.hypot(...shapeCenter.map((v,i)=>v/Math.max(1,spans[i])));
  const asymmetry=clampE(.84*mirrorMismatch/(3*count)+.22*offCenter);
  return {
    spikes:clampE(.65*tipRatio*3.5+.35*elongation),
    branching:clampE(Math.max(0,(exposedRatio-.28)*2.5)+.18*tipRatio),
    hollow:clampE(enclosedVoxels/Math.max(1,count+enclosedVoxels)*9),
    asymmetry,
    surfaceToVolume:Number((exposedFaces/count).toFixed(4)),
    exposedFaces,tips,enclosedVoxels,voxels:count,spans
  };
}
export function validatedGoals(input=EVOLUTION_DEFAULTS){
  const next={};for(const {key} of EVOLUTION_TRAITS){const v=Number(input[key]??0);if(!Number.isFinite(v)||v<0||v>100)throw Error('Evolution weight must be between 0 and 100');next[key]=v;}
  if(!Object.values(next).some(Boolean))throw Error('Choose at least one selection goal');
  return next;
}
function features(record){
  const m=record?.metrics,s=m?.shape;
  if(!s||!['spikes','branching','hollow','asymmetry'].every(k=>Number.isFinite(s[k])))return null;
  const denom=Math.max(1,(m.genes||[]).reduce((a,b)=>a+b,0));
  return [s.spikes,s.branching,s.hollow,s.asymmetry,...(m.genes||[0,0,0]).map(v=>v/denom)];
}
/** Difference from the closest distinct specimen, using shape AND gene ratios.
 * No reference records => neutral 0.5, not a fraudulent promise of novelty.
 */
export function noveltyOf(record,reference=[]){
  const f=features(record);if(!f)return null;
  const others=reference.filter(r=>r!==record && r.id!==record.id).map(features).filter(Boolean);
  if(!others.length)return .5;
  const distance=other=>Math.sqrt(f.reduce((sum,v,i)=>sum+(v-other[i])**2,0)/f.length);
  return clampE(Math.min(...others.map(distance))*2.3);
}
export function scoreEvolution(record, goals=EVOLUTION_DEFAULTS, reference=[]){
  const weight=validatedGoals(goals),shape=record?.metrics?.shape;
  if(!features(record))return null; // A.15 imports without measured shape stay unscored
  const values={spikes:shape.spikes,branching:shape.branching,hollow:shape.hollow,asymmetry:shape.asymmetry,novelty:noveltyOf(record,reference)};
  const sum=Object.values(weight).reduce((a,b)=>a+b,0);
  const score=100*Object.keys(weight).reduce((acc,k)=>acc+weight[k]*values[k],0)/sum;
  return {score:Number(score.toFixed(1)),values};
}
export function rankEvolution(records,goals=EVOLUTION_DEFAULTS,reference=[]){
  validatedGoals(goals);
  return records.map(r=>({record:r,result:scoreEvolution(r,goals,reference)}))
    .filter(v=>v.result!==null).sort((a,b)=>b.result.score-a.result.score || String(a.record.id).localeCompare(String(b.record.id)));
}
