import { CrystalWorld, SIZE } from './growth.js';

const $ = id => document.getElementById(id);
const crystalCanvas = $('crystal');
const display = crystalCanvas.getContext('2d', { alpha: false });
const world = new CrystalWorld();
world.plantInitial();
let playing = true;
let activeTool = 'seed';
let currentTab = 'growth';
let palette = 'silver';
let finish = 'frost';
let luminosity = .62;
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
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));

function colors(grain, level) {
  const key = (grain - 1) % 7;
  const palettes = {
    silver: [[193,225,241],[219,238,248],[129,171,195],[146,184,197]],
    spectrum: [[234,136,202],[154,240,235],[147,130,253],[247,187,95]],
    violet: [[176,123,255],[116,226,244],[243,143,255],[103,116,255]],
    fire: [[247,194,129],[241,113,89],[255,217,156],[203,93,143]],
    ivory: [[47,65,81],[69,96,114],[98,111,122],[118,128,137]]
  };
  const list = palettes[palette] || palettes.silver;
  if (palette === 'silver' || palette === 'ivory') return list[Math.min(level,3)];
  return list[(key + level) % list.length];
}
function strokeSegment(ctx, s, scale) {
  const col = colors(s.grain, s.level);
  const a = clamp(.40 + luminosity * .58 - s.level * .028, .27, 1);
  const lw = [2.16,1.53,1.05,.73,.44,.27][s.level] * scale;
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
  if (finish === 'glass') { ctx.shadowBlur=2.5*scale;ctx.shadowColor=palette==='violet'?'#8c53df':'#60b9e5'; }
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
  ctx.save();
  ctx.fillStyle=ivory?'#e6e2d8':'#05090d';ctx.fillRect(0,0,size,size);
  const g=ctx.createRadialGradient(size*.55,size*.44,size*.02,size*.52,size*.54,size*.78);
  if (ivory) { g.addColorStop(0,'#f7f4e8');g.addColorStop(1,'#c9ccca'); }
  else {g.addColorStop(0, palette==='violet'?'#101024':palette==='fire'?'#201017':'#101c27');g.addColorStop(1,'#020407');}
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
  display.drawImage(layer,0,0,size,size);
  // Draw only active growth points; these glints move because the tips advance.
  if (playing && world.tips.length) {
    for(let i=0;i<world.tips.length;i+=Math.max(1,Math.floor(world.tips.length/85))){
      const t=world.tips[i],x=t.x/SIZE*size,y=t.y/SIZE*size;
      const c=colors(t.grain,t.level);
      display.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},.68)`;
      display.beginPath();display.arc(x,y,Math.max(.55,size*.00083),0,Math.PI*2);display.fill();
    }
  }
  if(editing && recentPoint && activeTool !== 'seed') {
    display.strokeStyle=activeTool==='melt'?'rgba(255,143,135,.75)':'rgba(129,244,203,.75)';
    display.lineWidth=Math.max(1,size*.0013);
    display.setLineDash([5,5]);display.beginPath();
    display.arc(recentPoint.x/SIZE*size,recentPoint.y/SIZE*size,world.config.brush/SIZE*size,0,Math.PI*2);display.stroke();display.setLineDash([]);
  }
  display.restore();
}
function setTool(tool) {
  activeTool=tool;
  for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('selected',b.dataset.tool===tool);
  $('toolHint').textContent={seed:'TAP TO PLANT CRYSTAL SEEDS',melt:'DRAG TO MELT · SURVIVING EDGES CAN REGROW',feed:'DRAG TO RESTORE DISSOLVED MATERIAL'}[tool];
}
function pointFromEvent(ev){
  const rect=crystalCanvas.getBoundingClientRect();
  const size=Math.min(rect.width,rect.height), ox=(rect.width-size)/2,oy=(rect.height-size)/2;
  return {x:clamp((ev.clientX-rect.left-ox)/size*SIZE,1,SIZE-2),y:clamp((ev.clientY-rect.top-oy)/size*SIZE,1,SIZE-2)};
}
function saveUndo() { undoStack.push(world.snapshot()); if(undoStack.length>6)undoStack.shift();$('undo').disabled=false; }
function doBrush(p){
  if(activeTool==='melt') world.melt(p.x,p.y,world.config.brush);
  else if(activeTool==='feed')world.feed(p.x,p.y,world.config.brush);
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
    const steps=Math.min(15,Math.max(1,Math.ceil(dist/(world.config.brush*.75))));
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
const configs={frost:{value:v=>v+'%',transform:v=>v/100},spread:{value:v=>v+'%',transform:v=>v/100},speed:{value:v=>String(v),transform:v=>v},branching:{value:v=>v+'%',transform:v=>v/100},anisotropy:{value:v=>v+'%',transform:v=>v/100},length:{value:v=>v+'%',transform:v=>v/100},diffusion:{value:v=>v+'%',transform:v=>v/100},recharge:{value:v=>v+'%',transform:v=>v/100},brush:{value:v=>String(v),transform:v=>v}};
for(const [id,setting] of Object.entries(configs)){
  $(id).addEventListener('input',ev=>{const v=Number(ev.target.value);world.config[id]=setting.transform(v);$(id+'-value').textContent=setting.value(v);});
}
$('morphology').addEventListener('change',ev=>{world.config.morphology=ev.target.value;});
$('palette').addEventListener('change',ev=>{palette=ev.target.value;forceFull=true;});
$('finish').addEventListener('change',ev=>{finish=ev.target.value;forceFull=true;});
$('luminosity').addEventListener('input',ev=>{luminosity=Number(ev.target.value)/100;$('luminosity-value').textContent=ev.target.value+'%';forceFull=true;});
function setPlaying(p){playing=p;$('toggle').textContent=p?'Ⅱ PAUSE':'▶ RESUME';$('runState').textContent=p?'LIVE GROWTH':'GROWTH PAUSED';document.querySelector('.alive').classList.toggle('paused',!p);}
$('toggle').addEventListener('click',()=>setPlaying(!playing));
$('step').addEventListener('click',()=>{setPlaying(false);world.step();});
$('undo').addEventListener('click',()=>{
  const s=undoStack.pop();if(!s)return;world.restore(s);$('undo').disabled=undoStack.length===0;forceFull=true;
});
const dialog=$('resetDialog');
$('new').addEventListener('click',()=>dialog.showModal());
dialog.addEventListener('close',()=>{
  if(dialog.returnValue!=='reset')return;
  saveUndo();world.randomize((Date.now()^Math.floor(Math.random()*0x7fffffff))>>>0);
  world.plantInitial();forceFull=true;
});
$('save').addEventListener('click',async()=>{
  const button=$('save');button.disabled=true;button.textContent='RENDERING HIGH-RES SPECIMEN…';
  try{
    const size=2400,output=document.createElement('canvas');output.width=output.height=size;
    const ctx=output.getContext('2d',{alpha:false});paintBackdrop(ctx,size);drawSegments(ctx,world.segments,size/SIZE);
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
  $('seedMetric').textContent=s.grains;$('tipMetric').textContent=s.tips.toLocaleString();$('branchMetric').textContent=s.segments.toLocaleString();$('microMetric').textContent=s.microSegments.toLocaleString();
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
window.crystalDebug={world,get running(){return playing;},get tool(){return activeTool;},setTool,setPlaying};
requestAnimationFrame(loop);
