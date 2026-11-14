import { CrystalWorld, SIZE, FRONT_MODES, PHASE_MODES, SPHERULITE_MODES } from './growth.js';
import { DEFAULT_COMPOSITION, startComposition, addRandomColony, freshSeed } from './compositions.js';
import { PALETTES, PALETTE_MAP, basePalette, originalStops, hexToRgb, buildColorLUT, randomColor } from './palettes.js';
import { renderMineral, MINERAL_FINISHES } from './mineral.js';
import { renderSpherulites } from './spherulite.js';

const $ = id => document.getElementById(id);
const crystalCanvas = $('crystal');
const display = crystalCanvas.getContext('2d', { alpha: false });
const world = new CrystalWorld();
let composition = {...DEFAULT_COMPOSITION};
startComposition(world, composition);
let playing = true;
let activeTool = 'seed';
let currentTab = 'growth';
let palette = 'silver';
let activeStops = originalStops(palette);
let paletteLUT = buildColorLUT(activeStops);
let paletteRevision = 0;
let finish = 'frost';
let luminosity = .62;
let materialDepth=.74, materialBands=.55, materialLight=315, materialSpectral=.55, archiveReveal=.68;
let materialRevision=0;
let analyzerAngle=28,opticalRetardance=.65,polarizerContrast=.80,polarRevision=0;
let editing = false;
let recentPoint = null;
let lastPaint = -Infinity;
let undoStack = [];
let lastStatsAt = 0;
let lastFrameTime = 0;
let frameAccumulator = 0;
let renderVersion = -1;
let forceFull = true;
const layer = document.createElement('canvas');
layer.width = layer.height = SIZE * 3;
const layerCtx = layer.getContext('2d', { alpha:true });
const phaseLayer=document.createElement('canvas');
phaseLayer.width=phaseLayer.height=world.phase.size;
const phaseCtx=phaseLayer.getContext('2d', {alpha:true});
const spherLayer=document.createElement('canvas');
spherLayer.width=spherLayer.height=world.spherulite.size;
const spherCtx=spherLayer.getContext('2d',{alpha:true});
let spherRenderVersion=-1,spherPaletteRevision=-1,spherFinish='',spherPolarRevision=-1,spherLuminosity=-1;
let phaseRenderVersion=-1, phasePalette='', phaseFinish='', phaseLuminosity=-1, phasePaletteRevision=-1, phaseMaterialRevision=-1;
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));

function paletteIndex(t) { return (Math.floor((((t % 1) + 1) % 1) * 255) * 3); }
function colors(grain, level, stamp=0) {
  // Sampling across deposition time, grain and depth incorporates all original
  // palette stops (including long 12-stop recipes), instead of truncating to 4.
  const k=paletteIndex(grain*.131 + level*.123 + stamp*.0033);
  return [paletteLUT[k],paletteLUT[k+1],paletteLUT[k+2]];
}
function invalidatePalette() {
  paletteLUT=buildColorLUT(activeStops);
  paletteRevision++;
  phaseRenderVersion=-1;
  spherRenderVersion=-1;
  forceFull=true;
}
function renderPalettePreview() {
  const area=$('palettePreview');area.replaceChildren();
  for(const hex of activeStops){const block=document.createElement('i');block.style.background=hex;block.title=hex;area.appendChild(block);}
}
function renderPaletteStops() {
  renderPalettePreview();
  const area=$('paletteStops');area.replaceChildren();
  for(const [i,hex] of activeStops.entries()){
    const label=document.createElement('label');label.title='Edit stop '+(i+1)+' · '+hex;
    const input=document.createElement('input');input.type='color';input.value=hex;input.setAttribute('aria-label','Edit color stop '+(i+1));
    input.addEventListener('input',()=>{activeStops[i]=input.value;label.title='Edit stop '+(i+1)+' · '+input.value;renderPalettePreview();invalidatePalette();});
    label.appendChild(input);label.appendChild(document.createTextNode(String(i+1)));
    area.appendChild(label);
  }
}
function renderPaletteOptions(query='') {
  const q=query.toLocaleLowerCase().trim();const select=$('palette'),groups=new Map();
  const found=PALETTES.filter(p=>!q || `${p.name} ${p.id} ${p.source}`.toLocaleLowerCase().includes(q));
  const visible=found.some(p=>p.id===palette)?found:[basePalette(palette),...found];
  for(const p of visible){
    const source=p.source==='crystal-studio'?'CRYSTAL STUDIO':String(p.source).replaceAll('_',' ').toUpperCase();
    if(!groups.has(source))groups.set(source,[]);
    groups.get(source).push(p);
  }
  select.replaceChildren();
  for(const [label,list] of groups){
    const group=document.createElement('optgroup');group.label=label;
    for(const p of list){const option=new Option(p.name,p.id);group.appendChild(option);}
    select.appendChild(group);
  }
  select.value=palette;
  $('paletteCount').textContent=q ? `${found.length} / ${PALETTES.length}` : `${PALETTES.length} palettes`;
}
function choosePalette(id){
  if(!PALETTE_MAP.has(id))return;
  palette=id;activeStops=originalStops(id);
  invalidatePalette();renderPaletteStops();renderPaletteOptions($('paletteSearch').value);
}
function changeStops(next){
  activeStops=[...next];renderPaletteStops();invalidatePalette();
}
function shuffleColors(stops){
  const copy=[...stops];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function updateCompositionLabel() {
  $('specimenSeed').textContent='SEED '+composition.seed.toString(16).padStart(8,'0').toUpperCase()+' · '+world.grains.length+' COLONIES';
}
function strokeSegment(ctx, s, scale) {
  const col = colors(s.grain, s.level, s.stamp);
  const a = clamp(.40 + luminosity * .58 - s.level * .028, .27, 1);
  const lw = [2.16,1.53,1.05,.73,.44,.27][s.level] * scale;
  const isMineral=MINERAL_FINISHES.includes(finish);
  if(isMineral){
    const dx=s.x1-s.x0,dy=s.y1-s.y0;
    const orientation=Math.atan2(dy,dx);
    const strike=Math.max(.07, .5 + .5*Math.sin(orientation - materialLight*Math.PI/180));
    const strata=.5+.5*Math.cos((s.stamp||0)*.105 + s.grain*.9);
    const spectral=finish==='prism' ? materialSpectral*(.18+.55*strike):0;
    const color=colors(s.grain,s.level,(s.stamp||0)+spectral*90+strata*materialBands*11);
    ctx.lineWidth=lw*(1+.32*materialDepth);
    ctx.strokeStyle=finish==='obsidian' ? 'rgba(1,6,13,.9)' : 'rgba(4,13,25,.82)';
    ctx.beginPath();ctx.moveTo(s.x0*scale+lw*.20,s.y0*scale+lw*.25);
    ctx.lineTo(s.x1*scale+lw*.20,s.y1*scale+lw*.25);ctx.stroke();
    ctx.lineWidth=lw*(finish==='obsidian'?.64:.91);
    const shade=finish==='obsidian'?.23:(.53+.47*strike);
    ctx.strokeStyle=`rgba(${Math.round(color[0]*shade)},${Math.round(color[1]*shade)},${Math.round(color[2]*shade)},${a})`;
    ctx.beginPath();ctx.moveTo(s.x0*scale,s.y0*scale);ctx.lineTo(s.x1*scale,s.y1*scale);ctx.stroke();
    if(s.level<=2 && materialDepth>.16){
      ctx.lineWidth=Math.max(.15*scale,lw*.17*materialDepth);
      const light=Math.round(200*strike);
      ctx.strokeStyle=`rgba(${light},${light},${light},${a*.36*materialDepth})`;
      ctx.beginPath();ctx.moveTo(s.x0*scale-lw*.13,s.y0*scale-lw*.13);
      ctx.lineTo(s.x1*scale-lw*.13,s.y1*scale-lw*.13);ctx.stroke();
    }
    return;
  }
  if (finish === 'metal' && s.level < 2) {
    ctx.lineWidth = lw * 1.42;
    ctx.strokeStyle = `rgba(6,15,23,${a*.8})`;
    ctx.beginPath();ctx.moveTo(s.x0*scale+lw*.16,s.y0*scale+lw*.16);ctx.lineTo(s.x1*scale+lw*.16,s.y1*scale+lw*.16);ctx.stroke();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
  ctx.beginPath();ctx.moveTo(s.x0*scale,s.y0*scale);ctx.lineTo(s.x1*scale,s.y1*scale);ctx.stroke();
  if (finish === 'glass' && s.level < 2) {
    ctx.lineWidth = lw * .34;
    ctx.strokeStyle = `rgba(248,252,255,${a*.48})`;
    ctx.beginPath();ctx.moveTo(s.x0*scale,s.y0*scale);ctx.lineTo(s.x1*scale,s.y1*scale);ctx.stroke();
  }
}
function drawSegments(ctx, segments, scale) {
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if (finish === 'glass') { ctx.shadowBlur=2.5*scale;ctx.shadowColor=activeStops.at(-1) || '#60b9e5'; }
  for (const s of segments) strokeSegment(ctx,s,scale);
  ctx.restore();
}
function redrawLayer() {
  layerCtx.setTransform(1,0,0,1,0,0);
  layerCtx.clearRect(0,0,layer.width,layer.height);
  drawSegments(layerCtx,world.segments,layer.width/SIZE);
  world.fullRedraw=false;
  world.newSegments=[];
  forceFull=false;
  renderVersion=world.modified;
}
function paintBackdrop(ctx,size) {
  const ivory = palette==='ivory';
  const rgb=hexToRgb(basePalette(palette).bg || activeStops[0]);
  ctx.save();
  ctx.fillStyle=ivory?'#e6e2d8':'#05090d';ctx.fillRect(0,0,size,size);
  const g=ctx.createRadialGradient(size*.55,size*.44,size*.02,size*.52,size*.54,size*.78);
  if (ivory) { g.addColorStop(0,'#f7f4e8');g.addColorStop(1,'#c9ccca'); }
  else {g.addColorStop(0,`rgb(${rgb.map(v=>Math.round(7+v*.28)).join(',')})`);g.addColorStop(1,'#020407');}
  ctx.fillStyle=g;ctx.fillRect(0,0,size,size);
  // Tiny fixed point inclusions suggest photographic depth without hijacking the growth.
  for(let k=0;k<90;k++) {
    const x=(((k*7927+1121)%2011)/2011)*size;
    const y=(((k*1153+647)%1999)/1999)*size;
    ctx.fillStyle=ivory?'rgba(54,70,79,.055)':'rgba(167,206,225,.065)';
    ctx.beginPath();ctx.arc(x,y,size*.0007,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function paintPhase(ctx, size) {
  const field=world.phase;
  if(!field.active)return;
  if(phaseRenderVersion!==field.version||phasePalette!==palette||phaseFinish!==finish||phaseLuminosity!==luminosity||phasePaletteRevision!==paletteRevision||phaseMaterialRevision!==materialRevision){
    const n=field.size;
    const img=phaseCtx.createImageData(n,n),data=img.data;
    if(MINERAL_FINISHES.includes(finish)){
      const painted=renderMineral(field,world,paletteLUT,{finish,depth:materialDepth,bands:materialBands,lightAngle:materialLight,spectral:materialSpectral,exposure:archiveReveal});
      data.set(painted.data);
    } else for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
      const i=y*n+x,v=field.phi[i],owner=field.owner[i];
      if(!owner||v<.025)continue;
      const edge=clamp(Math.abs(field.phi[i-1]-field.phi[i+1])+Math.abs(field.phi[i-n]-field.phi[i+n]),0,1);
      const colorIndex=paletteIndex(owner*.137 + x/n*.62 + y/n*.36);
      const rgb=[paletteLUT[colorIndex],paletteLUT[colorIndex+1],paletteLUT[colorIndex+2]];
      // Physically solved phase fractions give opacity/edges; these colors
      // remain an explicitly *artistic*, orientation-agnostic optical finish.
      const rim=finish==='glass' ? .79 : finish==='metal' ? .54 : .38;
      const shine=clamp(edge*rim,0,.8),fog=.18+.72*v;
      const idx=i*4;
      for(let ch=0;ch<3;ch++){
        const base=finish==='metal' ? rgb[ch]*.73 : rgb[ch];
        data[idx+ch]=clamp(base*fog+255*shine*luminosity,0,255);
      }
      data[idx+3]=Math.round(clamp(v*.96+edge*.35,0,1)*255);
    }
    phaseCtx.putImageData(img,0,0);
    phaseRenderVersion=field.version;phasePalette=palette;phaseFinish=finish;phaseLuminosity=luminosity;phasePaletteRevision=paletteRevision;phaseMaterialRevision=materialRevision;
  }
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(phaseLayer,0,0,size,size);ctx.restore();
}
function paintSpherulites(ctx,size){
  const f=world.spherulite;
  if(!f.active)return;
  if(spherRenderVersion!==f.version||spherPaletteRevision!==paletteRevision||spherFinish!==finish||spherPolarRevision!==polarRevision||spherLuminosity!==luminosity){
    const rendered=renderSpherulites(f,world,paletteLUT,{analyzer:analyzerAngle,retardance:opticalRetardance,contrast:polarizerContrast,light:luminosity,finish});
    const img=spherCtx.createImageData(f.size,f.size);img.data.set(rendered.data);spherCtx.putImageData(img,0,0);
    spherRenderVersion=f.version;spherPaletteRevision=paletteRevision;spherFinish=finish;spherPolarRevision=polarRevision;spherLuminosity=luminosity;
  }
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(spherLayer,0,0,size,size);ctx.restore();
}
function drawScreen() {
  const dpr=clamp(window.devicePixelRatio||1,1,2);
  const box=crystalCanvas.getBoundingClientRect();
  const w=Math.max(2,Math.floor(box.width*dpr)),h=Math.max(2,Math.floor(box.height*dpr));
  if(crystalCanvas.width!==w||crystalCanvas.height!==h){crystalCanvas.width=w;crystalCanvas.height=h;}
  display.setTransform(1,0,0,1,0,0);
  display.fillStyle='#05080c';display.fillRect(0,0,w,h);
  const size=Math.min(w,h),ox=(w-size)/2,oy=(h-size)/2;
  display.save(); display.translate(ox,oy);
  paintBackdrop(display,size);
  if (world.fullRedraw||forceFull) redrawLayer();
  else if (renderVersion!==world.modified) {
    drawSegments(layerCtx,world.newSegments,layer.width/SIZE);
    renderVersion=world.modified;
    world.newSegments=[];
  }
  paintPhase(display,size);
  paintSpherulites(display,size);
  display.drawImage(layer,0,0,size,size);
  // Draw only active growth points; these glints move because the tips advance.
  if (playing && world.tips.length) {
    for(let i=0;i<world.tips.length;i+=Math.max(1,Math.floor(world.tips.length/85))){
      const t=world.tips[i],x=t.x/SIZE*size,y=t.y/SIZE*size;
      const c=colors(t.grain,t.level,world.ticks);
      display.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},.68)`;
      display.beginPath();display.arc(x,y,Math.max(.55,size*.00083),0,Math.PI*2);display.fill();
    }
  }
  if(editing && recentPoint && activeTool !== 'seed') {
    display.strokeStyle=activeTool==='melt'?'rgba(255,143,135,.75)':activeTool==='fracture'?'rgba(232,119,245,.88)':'rgba(129,244,203,.75)';
    display.lineWidth=Math.max(1,size*.0013);
    display.setLineDash([5,5]);display.beginPath();
    display.arc(recentPoint.x/SIZE*size,recentPoint.y/SIZE*size,(activeTool==='fracture'?world.config.fractureWidth:world.config.brush)/SIZE*size,0,Math.PI*2);display.stroke();display.setLineDash([]);
  }
  display.restore();
}
function setTool(tool) {
  activeTool=tool;
  for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('selected',b.dataset.tool===tool);
  $('toolHint').textContent={seed:'TAP TO PLANT CRYSTAL SEEDS',melt:'DRAG TO MELT · SURVIVING EDGES CAN REGROW',feed:'DRAG TO RESTORE DISSOLVED MATERIAL',fracture:'DRAG TO CARVE REAL PHASE CRACKS · UNDO TO RESTORE'}[tool];
}
function pointFromEvent(ev){
  const rect=crystalCanvas.getBoundingClientRect();
  const size=Math.min(rect.width,rect.height), ox=(rect.width-size)/2,oy=(rect.height-size)/2;
  return {x:clamp((ev.clientX-rect.left-ox)/size*SIZE,1,SIZE-2),y:clamp((ev.clientY-rect.top-oy)/size*SIZE,1,SIZE-2)};
}
function saveUndo() { undoStack.push({state:world.snapshot(),composition:{...composition}}); if(undoStack.length>6)undoStack.shift();$('undo').disabled=false; }
function doBrush(p){
  if(activeTool==='melt') world.melt(p.x,p.y,world.config.brush);
  else if(activeTool==='feed')world.feed(p.x,p.y,world.config.brush);
  else if(activeTool==='fracture')world.fracture(p.x,p.y);
  recentPoint=p;
}
crystalCanvas.addEventListener('pointerdown',ev=>{
  if(ev.button!==0)return;
  ev.preventDefault();crystalCanvas.setPointerCapture(ev.pointerId);
  saveUndo();editing=true;recentPoint=pointFromEvent(ev);
  if(activeTool==='seed') world.seed(recentPoint.x,recentPoint.y);
  else doBrush(recentPoint);
});
crystalCanvas.addEventListener('pointermove',ev=>{
  if(!editing)return;ev.preventDefault();
  const now=performance.now();if(now-lastPaint<30)return;
  const next=pointFromEvent(ev);
  if(activeTool!=='seed'){
    // Interpolate brush position to avoid gaps during fast drags.
    const prev=recentPoint||next, dist=Math.hypot(next.x-prev.x,next.y-prev.y);
    const steps=Math.min(15,Math.max(1,Math.ceil(dist/((activeTool==='fracture'?world.config.fractureWidth:world.config.brush)*.75))));
    for(let k=1;k<=steps;k++){let t=k/steps;doBrush({x:prev.x+(next.x-prev.x)*t,y:prev.y+(next.y-prev.y)*t});}
  }
  recentPoint=next;lastPaint=now;
});
function endEdit(){editing=false;recentPoint=null;}
crystalCanvas.addEventListener('pointerup',endEdit);
crystalCanvas.addEventListener('pointercancel',endEdit);
crystalCanvas.addEventListener('lostpointercapture',endEdit);
for(const b of document.querySelectorAll('[data-tool]')) b.addEventListener('click',()=>setTool(b.dataset.tool));
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>{
  currentTab=b.dataset.tab;
  for(const t of document.querySelectorAll('[data-tab]')) {const on=t.dataset.tab===currentTab;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on));}
  for(const p of document.querySelectorAll('.panel')) {const on=p.id==='panel-'+currentTab;p.hidden=!on;p.classList.toggle('active',on);}
});
const configs={fractureWidth:{value:v=>String(v),transform:v=>v},fractureSplinter:{value:v=>v+'%',transform:v=>v/100},fractureHeal:{value:v=>v+'%',transform:v=>v/100},spherGrowth:{value:v=>v+'%',transform:v=>v/100},spherBands:{value:v=>v+'%',transform:v=>v/100},spherWobble:{value:v=>v+'%',transform:v=>v/100},phaseInstability:{value:v=>v+'%',transform:v=>v/100},phaseWavelength:{value:v=>v+'%',transform:v=>v/100},phaseCapillarity:{value:v=>v+'%',transform:v=>v/100},phaseDrive:{value:v=>v+'%',transform:v=>v/100},phaseStiffness:{value:v=>v+'%',transform:v=>v/100},phaseMobility:{value:v=>v+'%',transform:v=>v/100},instability:{value:v=>v+'%',transform:v=>v/100},faceting:{value:v=>v+'%',transform:v=>v/100},frost:{value:v=>v+'%',transform:v=>v/100},spread:{value:v=>v+'%',transform:v=>v/100},speed:{value:v=>String(v),transform:v=>v},branching:{value:v=>v+'%',transform:v=>v/100},anisotropy:{value:v=>v+'%',transform:v=>v/100},length:{value:v=>v+'%',transform:v=>v/100},diffusion:{value:v=>v+'%',transform:v=>v/100},recharge:{value:v=>v+'%',transform:v=>v/100},brush:{value:v=>String(v),transform:v=>v}};
for(const [id,setting] of Object.entries(configs)){
  $(id).addEventListener('input',ev=>{const v=Number(ev.target.value);world.config[id]=setting.transform(v);$(id+'-value').textContent=setting.value(v);});
}
function syncMorphologyControls() {
  const isFront=Object.hasOwn(FRONT_MODES,world.config.morphology);
  const isPhase=Object.hasOwn(PHASE_MODES,world.config.morphology);
  const isSpherulite=Object.hasOwn(SPHERULITE_MODES,world.config.morphology);
  $('tipControls').hidden=isFront||isPhase||isSpherulite;
  $('frontControls').hidden=!isFront;
  $('phaseControls').hidden=!isPhase;
  $('spherControls').hidden=!isSpherulite;
  $('structureRule').textContent=isSpherulite
    ? 'A separate radial-fibril front grows persistent material and local orientation. When colonies collide, contact seams survive. The colors follow those orientations; no physics state changes when you move the optical analyzer.'
    : isPhase
    ? 'The solid fraction evolves by a phase-field PDE. A.5 instability emphasizes nutrient-fed protrusions against capillary smoothing, with fixed correlated heterogeneity. Existing boundaries remain real state.'
    : isFront ? 'Solid cells attach along existing crystal boundaries; concentration and orientation bias change which interface cells advance.'
    : 'New side-branches inherit their parent direction, then compete for dissolved material. Existing arms do not move or rotate.';
}
$('morphology').addEventListener('change',ev=>{world.config.morphology=ev.target.value;syncMorphologyControls();});
syncMorphologyControls();
renderPaletteOptions();renderPaletteStops();updateCompositionLabel();
$('paletteSearch').addEventListener('input',ev=>renderPaletteOptions(ev.target.value));
$('palette').addEventListener('change',ev=>choosePalette(ev.target.value));
$('randomPalette').addEventListener('click',()=>choosePalette(PALETTES[Math.floor(Math.random()*PALETTES.length)].id));
$('shuffleStops').addEventListener('click',()=>changeStops(shuffleColors(activeStops)));
$('randomColors').addEventListener('click',()=>changeStops(activeStops.map(()=>randomColor())));
$('restorePalette').addEventListener('click',()=>changeStops(originalStops(palette)));
function syncMineralControls(){ $('mineralControls').hidden=!MINERAL_FINISHES.includes(finish);$('polarizedControls').hidden=finish!=='polarized'; }
$('finish').addEventListener('change',ev=>{finish=ev.target.value;forceFull=true;phaseRenderVersion=-1;syncMineralControls();});
syncMineralControls();
for(const [name,apply] of Object.entries({analyzerAngle:v=>analyzerAngle=v,opticalRetardance:v=>opticalRetardance=v/100,polarizerContrast:v=>polarizerContrast=v/100})){
  $(name).addEventListener('input',ev=>{const v=Number(ev.target.value);apply(v);$(name+'-value').textContent=v+(name==='analyzerAngle'?'°':'%');polarRevision++;spherRenderVersion=-1;});
}
const mineralSliders={archiveReveal:v=>{archiveReveal=v/100},materialDepth:v=>{materialDepth=v/100},materialBands:v=>{materialBands=v/100},materialLight:v=>{materialLight=v},materialSpectral:v=>{materialSpectral=v/100}};
for(const [name,apply] of Object.entries(mineralSliders)){
  $(name).addEventListener('input',ev=>{
    const v=Number(ev.target.value);apply(v);
    $(name+'-value').textContent=v+(name==='materialLight'?'°':'%');
    materialRevision++;forceFull=true;phaseRenderVersion=-1;
  });
}
$('luminosity').addEventListener('input',ev=>{luminosity=Number(ev.target.value)/100;$('luminosity-value').textContent=ev.target.value+'%';forceFull=true;});
function setPlaying(p){playing=p;$('toggle').textContent=p?'Ⅱ PAUSE':'▶ RESUME';$('runState').textContent=p?'LIVE GROWTH':'GROWTH PAUSED';document.querySelector('.alive').classList.toggle('paused',!p);}
$('toggle').addEventListener('click',()=>setPlaying(!playing));
$('step').addEventListener('click',()=>{setPlaying(false);world.step();});
$('undo').addEventListener('click',()=>{
  const entry=undoStack.pop();if(!entry)return;
  world.restore(entry.state);composition={...entry.composition};
  $('undo').disabled=undoStack.length===0;forceFull=true;phaseRenderVersion=-1;spherRenderVersion=-1;updateCompositionLabel();
});
function plantNewSeed() {
  if(world.grains.length>=250)return;
  saveUndo();addRandomColony(world,world.config.morphology);
  forceFull=true;updateCompositionLabel();
}
function resetComposition(kind) {
  saveUndo();
  if(kind==='refresh')composition={seed:freshSeed(),layout:'randomized',morphology:world.config.morphology};
  // Restart retains original seed, original colony anatomy and position layout.
  startComposition(world,composition);
  forceFull=true;phaseRenderVersion=-1;spherRenderVersion=-1;frameAccumulator=0;
  setPlaying(true);updateCompositionLabel();
}
let pendingReset='refresh';
const dialog=$('resetDialog');
function askReset(kind) {
  pendingReset=kind;
  const isRefresh=kind==='refresh';
  $('resetTitle').textContent=isRefresh?'Refresh with a completely new specimen?':'Restart this exact specimen?';
  $('resetMessage').textContent=isRefresh
    ? 'Your current crystals will be replaced with a new randomized composition in the selected anatomy. Your palette and finish remain unchanged. UNDO can restore the artwork.'
    : 'Replay your saved composition seed from the beginning, removing all growth and later planted colonies. Your palette stays unchanged, and UNDO can restore your artwork.';
  $('confirmReset').textContent=isRefresh?'YES, REFRESH':'YES, RESTART';
  dialog.showModal();
}
$('newSeed').addEventListener('click',plantNewSeed);
$('refresh').addEventListener('click',()=>askReset('refresh'));
$('restart').addEventListener('click',()=>askReset('restart'));
dialog.addEventListener('close',()=>{if(dialog.returnValue==='reset')resetComposition(pendingReset);});
$('save').addEventListener('click',async()=>{
  const button=$('save');button.disabled=true;button.textContent='RENDERING HIGH-RES SPECIMEN…';
  try{
    const size=2400,output=document.createElement('canvas');output.width=output.height=size;
    const ctx=output.getContext('2d',{alpha:false});paintBackdrop(ctx,size);paintPhase(ctx,size);paintSpherulites(ctx,size);drawSegments(ctx,world.segments,size/SIZE);
    const blob=await new Promise((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(Error('PNG encode failed')),'image/png'));
    const link=document.createElement('a');const url=URL.createObjectURL(blob);
    link.href=url;link.download=`crystallization-apocalypse-${world.rngState.toString(16)}-${world.ticks}.png`;
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    button.textContent='✓ PNG READY / SAVED';
  }catch(err){console.error(err);button.textContent='EXPORT FAILED — RETRY';}
  finally{button.disabled=false;setTimeout(()=>button.textContent='↓ EXPORT 2400 × 2400 PNG',2000);}
});
function refreshStats(now){if(now-lastStatsAt<350)return;lastStatsAt=now;
  const s=world.stats();$('stageReadout').textContent=s.coverage.toFixed(2)+'% SOLIDIFIED';
  $('stepCount').textContent='T+'+String(s.ticks).padStart(5,'0');
  $('seedMetric').textContent=s.grains;$('tipMetric').textContent=s.tips.toLocaleString();$('branchMetric').textContent=s.segments.toLocaleString();$('microMetric').textContent=s.microSegments.toLocaleString();$('frontMetric').textContent=s.frontDeposits.toLocaleString();$('sitesMetric').textContent=s.frontSites.toLocaleString();$('phaseMetric').textContent=s.phaseCells.toLocaleString();$('phaseMassMetric').textContent=Math.round(s.phaseMass).toLocaleString();$('phaseSproutMetric').textContent=s.phaseSprouts.toLocaleString();$('phaseBranchMetric').textContent=s.phaseBranches.toLocaleString();$('crackMetric').textContent=s.openCracks.toLocaleString();$('recrystalMetric').textContent=s.recrystallized.toLocaleString();$('spherMetric').textContent=s.spherCells.toLocaleString();$('boundaryMetric').textContent=s.spherContacts.toLocaleString();
}
function loop(now){
  const dt=lastFrameTime?Math.min(70,now-lastFrameTime):16.67;lastFrameTime=now;
  if(playing){
    frameAccumulator+=dt/16.667*world.config.speed*.25;
    let count=Math.min(12,Math.floor(frameAccumulator));frameAccumulator-=count;
    while(count-->0)world.step();
  }else frameAccumulator=0;
  drawScreen();refreshStats(now);
  requestAnimationFrame(loop);
}
// Named for test harnesses: no private user data or external connections.
window.crystalDebug={world,get running(){return playing;},get tool(){return activeTool;},get paletteId(){return palette;},get stops(){return [...activeStops];},get catalogSize(){return PALETTES.length;},get composition(){return {...composition};},setTool,setPlaying,choosePalette,plantNewSeed,resetComposition,get optics(){return {analyzerAngle,opticalRetardance,polarizerContrast}},renderSpherulites};
requestAnimationFrame(loop);
