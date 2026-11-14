/** Unmodified MATHEMAGICAL palette recipes plus five legacy crystal finishes. */
import { MATHEMAGICAL_VAULT } from './palette-vault.js';

const STUDIO = [
  {id:'silver',name:'BLACK ICE · SILVER',source:'crystal-studio',colors:['#c1e1f1','#dbeef8','#81abc3','#92b8c5'],bg:'#0c1b27'},
  {id:'spectrum',name:'SPECTRAL WITCHCRAFT',source:'crystal-studio',colors:['#ea88ca','#9af0eb','#9382fd','#f7bb5f'],bg:'#12112a'},
  {id:'violet',name:'ULTRAVIOLET VEINS',source:'crystal-studio',colors:['#b07bff','#74e2f4','#f38fff','#6774ff'],bg:'#101024'},
  {id:'fire',name:'MOLTEN FRACTURE',source:'crystal-studio',colors:['#f7c281','#f17159','#ffd99c','#cb5d8f'],bg:'#201017'},
  {id:'ivory',name:'IVORY MICROSCOPE',source:'crystal-studio',colors:['#2f4151','#456072','#626f7a','#768089'],bg:'#eee8dc'},
];
const HEX = /^#[a-f\d]{6}$/i;
function cleanColor(x){return HEX.test(x) ? x.toLowerCase():null;}
export const PALETTES = Object.freeze([...STUDIO, ...MATHEMAGICAL_VAULT.palettes.map(p=>({
  id:p.id,name:p.name,source:p.source || p.id.split('/')[0],bg:p.bg,
  colors:[...p.colors],
}))]);
export const PALETTE_MAP = new Map(PALETTES.map(p=>[p.id,p]));
export function basePalette(id){return PALETTE_MAP.get(id)||STUDIO[0];}
export function originalStops(id){return [...basePalette(id).colors];}
export function hexToRgb(hex){const s=cleanColor(hex)||'#000000';return [1,3,5].map(n=>parseInt(s.slice(n,n+2),16));}
export function buildColorLUT(stops, size=256){
  const valid=stops.map(cleanColor).filter(Boolean).map(hexToRgb);
  if (!valid.length)valid.push([255,255,255]);
  const lut=new Uint8Array(size*3);
  for(let k=0;k<size;k++){
    const t=(size===1?0:k/(size-1))*(valid.length-1);
    const i=Math.min(valid.length-1,Math.floor(t)),j=Math.min(valid.length-1,i+1),f=t-i;
    for(let ch=0;ch<3;ch++)lut[3*k+ch]=Math.round(valid[i][ch]*(1-f)+valid[j][ch]*f);
  }
  return lut;
}
export function paletteSources(){return [...new Set(PALETTES.map(p=>p.source))].sort((a,b)=>a.localeCompare(b));}
export function randomColor(){
  const hue=Math.floor(Math.random()*360),sat=70+Math.random()*30,light=39+Math.random()*31;
  const c=(1-Math.abs(2*light/100-1))*(sat/100),x=c*(1-Math.abs((hue/60)%2-1)),m=light/100-c/2;
  const rgb = hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];
  return '#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
}
