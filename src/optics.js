/**
 * A.9 Optical Heresy: wavelength-separated interference, director-defect scattering
 * and WebGL2 rendering with a deterministic Canvas 2D/CPU fallback.
 * Purely visual: no optics operation here ever mutates the growth simulation.
 * Deliberately an artistic crossed-polarizer approximation, NOT measured crystal optics.
 */
const TWO_PI_O=Math.PI*2;
const boundO=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const phaseO=(v)=>((v%1)+1)%1;

export function packOpticalField(field) {
  const n=field.size;
  const data=new Uint8Array(n*n*4);
  for(let i=0;i<field.owner.length;i++){
    if(!field.owner[i])continue;
    const angle=phaseO(field.director[i]/TWO_PI_O);
    const radial=boundO(field.ring[i]*.5+.5);
    const base=phaseO(field.owner[i]*.097+field.birth[i]*.0027+field.director[i]/TWO_PI_O*.27+field.ring[i]*.15);
    const j=i*4;
    data[j]=Math.round(angle*255);
    data[j+1]=Math.round(radial*255);
    data[j+2]=Math.round(base*255);
    data[j+3]=field.boundary[i]?127:255;
  }
  return {width:n,height:n,data};
}

/** Deterministic material-defect metric; director differences have pi-periodic equivalence. */
export function opticalDefect(field,x,y){
  const n=field.size, i=y*n+x;
  if(x<1||y<1||x>=n-1||y>=n-1||!field.owner[i])return 0;
  let sum=0,count=0;
  for(const j of [i-1,i+1,i-n,i+n]) {
    if(!field.owner[j]||field.owner[j]!==field.owner[i])continue;
    // sin(angle difference) is unchanged by +pi director equivalence.
    const delta=field.director[i]-field.director[j];
    sum+=Math.abs(Math.sin(delta));count++;
  }
  return count?boundO(sum/count*4):0;
}

/** Fully portable pixel path for browsers without WebGL2 (and for numerical QA). */
export function renderSpectralCPU(field,lut,settings={}){
  const n=field.size,out=new Uint8ClampedArray(n*n*4);
  const analyzer=(settings.analyzer??28)*Math.PI/180;
  const contrast=boundO(settings.contrast??.8),ret=boundO(settings.retardance??.65);
  const dispersion=boundO(settings.dispersion??.52),reveal=boundO(settings.defects??.5);
  const light=boundO(settings.light??.62);
  const wavelengths=[.69,.545,.45];
  for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
    const i=y*n+x,g=field.owner[i];if(!g)continue;
    const director=field.director[i],radial=field.ring[i];
    const cross=Math.sin(2*(director-analyzer))**2;
    const thickness=.53+.47*(.5+.5*radial);
    const defect=opticalDefect(field,x,y),seam=field.boundary[i]?1:0;
    const base=phaseO(g*.097+field.birth[i]*.0027+director/TWO_PI_O*.27+radial*.15);
    const brightness=(.37+.63*light);
    const q=i*4;
    for(let c=0;c<3;c++){
      const k=Math.min(255,Math.floor(phaseO(base+dispersion*(c-1)*.095+defect*.06*reveal)*255))*3;
      const delta=TWO_PI_O*(.12+ret*2.65*thickness)/wavelengths[c];
      const wave=Math.sin(delta*.5)**2;
      const polar=(1-contrast)*.56+contrast*(.10+1.26*cross*wave);
      const scatter=.28+.72*polar;
      out[q+c]=boundO(lut[k+c]*scatter*brightness+155*reveal*defect*.14+120*seam*(.25+.6*reveal),0,255);
    }
    out[q+3]=255;
  }
  return {width:n,height:n,data:out};
}

const VERT_O=`#version 300 es
precision highp float;
out vec2 uv;
void main(){
  vec2 p=vec2((gl_VertexID << 1) & 2,gl_VertexID & 2);
  uv=p;
  gl_Position=vec4(p*2.0-1.0,0.0,1.0);
}`;
const FRAG_O=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 frag;
uniform sampler2D material;
uniform sampler2D paletteTex;
uniform float analyzer;
uniform float retardance;
uniform float contrast;
uniform float dispersion;
uniform float defects;
uniform float light;
uniform vec2 texel;
const float TAU=6.28318530718;
void main(){
  // Pixel-uploaded texture stores top-to-bottom rows; WebGL framebuffer is bottom-up.
  vec2 q=vec2(uv.x,1.0-uv.y);
  vec4 m=texture(material,q);
  if(m.a<0.1){frag=vec4(0.);return;}
  float theta=m.r*TAU, r=(m.g*2.0-1.0);
  float seam=step(0.20,m.a)* (1.0-step(0.78,m.a));
  float cross=pow(sin(2.0*(theta-analyzer)),2.0);
  float thick=.53+.47*(.5+.5*r);
  float diff=0.0;
  vec4 other;
  other=texture(material,q+vec2(texel.x,0));
  if(other.a>0.1)diff+=abs(sin(theta-other.r*TAU));
  other=texture(material,q-vec2(texel.x,0));
  if(other.a>0.1)diff+=abs(sin(theta-other.r*TAU));
  other=texture(material,q+vec2(0,texel.y));
  if(other.a>0.1)diff+=abs(sin(theta-other.r*TAU));
  other=texture(material,q-vec2(0,texel.y));
  if(other.a>0.1)diff+=abs(sin(theta-other.r*TAU));
  float defect=clamp(diff,0.,1.);
  vec3 waves=vec3(.69,.545,.45);
  vec3 phase=TAU*(.12+retardance*2.65*thick)/waves;
  vec3 intensity=pow(sin(phase*.5),vec3(2.0));
  vec3 polar=(1.0-contrast)*.56+contrast*(.10+1.26*cross*intensity);
  vec3 offsets=vec3(-1.,0.,1.)*dispersion*.095;
  vec3 dye;
  for(int c=0;c<3;c++){
    float index=fract(m.b+offsets[c]+defect*.06*defects);
    vec3 col=texture(paletteTex,vec2(index,.5)).rgb;
    dye[c]=col[c];
  }
  vec3 rgb=clamp(dye*(.28+.72*polar)*(.37+.63*light)+vec3(155./255.*defects*defect*.14 +120./255.*seam*(.25+.6*defects)),0.,1.);
  frag=vec4(rgb,1.0);
}`;

function makeShader(gl,kind,source){
  const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const err=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(`Optics shader: ${err}`);
  }return shader;
}
/** Synchronous WebGL2 renderer. No network fetch, no shader/CDN dependency. */
export class SpectralGPU{
  constructor(size,createCanvas){
    this.canvas=createCanvas();this.canvas.width=this.canvas.height=size;
    this.gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
    if(!this.gl)throw Error('WebGL2 unavailable');
    const gl=this.gl,program=gl.createProgram();
    const vs=makeShader(gl,gl.VERTEX_SHADER,VERT_O),fs=makeShader(gl,gl.FRAGMENT_SHADER,FRAG_O);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(`Optics link: ${gl.getProgramInfoLog(program)}`);
    gl.deleteShader(vs);gl.deleteShader(fs);this.program=program;
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    this.dataTex=gl.createTexture();this.colorTex=gl.createTexture();
    this.size=size;this.lutRevision=-1;this.fieldRevision=-1;
    this.locations=Object.fromEntries(['material','paletteTex','analyzer','retardance','contrast','dispersion','defects','light','texel'].map(k=>[k,gl.getUniformLocation(program,k)]));
    this.canvas.addEventListener('webglcontextlost',ev=>{ev.preventDefault();this.lost=true;});
  }
  texture(unit,handle,width,height,pixels){
    const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,handle);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  }
  render(field,lut,settings,paletteRevision){
    if(this.lost)throw Error('WebGL2 context lost');
    const gl=this.gl,n=field.size;
    if(this.canvas.width!==n){this.canvas.width=this.canvas.height=n;this.fieldRevision=-1;this.size=n;}
    if(this.fieldRevision!==field.version){const packed=packOpticalField(field);this.texture(0,this.dataTex,n,n,packed.data);this.fieldRevision=field.version;}
    if(this.lutRevision!==paletteRevision){
      const p=new Uint8Array(256*4);for(let i=0;i<256;i++){p[i*4]=lut[i*3];p[i*4+1]=lut[i*3+1];p[i*4+2]=lut[i*3+2];p[i*4+3]=255;}
      this.texture(1,this.colorTex,256,1,p);this.lutRevision=paletteRevision;
    }
    gl.viewport(0,0,n,n);gl.useProgram(this.program);gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.dataTex);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.colorTex);
    gl.uniform1i(this.locations.material,0);gl.uniform1i(this.locations.paletteTex,1);
    gl.uniform1f(this.locations.analyzer,(settings.analyzer??28)*Math.PI/180);
    for(const key of ['retardance','contrast','dispersion','defects','light'])gl.uniform1f(this.locations[key],settings[key]);
    gl.uniform2f(this.locations.texel,1/n,1/n);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
    if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL2 optical draw failure');
    return this.canvas;
  }
}
