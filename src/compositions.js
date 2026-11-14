/** Intentional, deterministic composition operations, separate from appearance. */
export const DEFAULT_COMPOSITION = Object.freeze({seed:357321,layout:'original',morphology:null});
export function startComposition(world, {seed=DEFAULT_COMPOSITION.seed, layout='original', morphology=null} = {}) {
  world.randomize(seed >>> 0 || 1);
  if (layout === 'original') {
    world.plantInitial();
  } else {
    // One family per refresh: the chosen anatomy controls all three colonies.
    // The jitter and angles are seeded, allowing an exact replay on Restart.
    const anchors = [[.47,.51],[.79,.23],[.22,.79]];
    for (const [ax, ay] of anchors) {
      const x=(ax + (world.rand()-.5)*.12)*world.size;
      const y=(ay + (world.rand()-.5)*.12)*world.size;
      const angle=world.rand()*Math.PI*2;
      world.seed(x,y,angle,undefined,morphology || world.config.morphology);
    }
    for(let t=0;t<15;t++)world.step();
  }
  return world;
}
export function addRandomColony(world, morphology=world.config.morphology) {
  // Favor open territory; never erase existing colonies or front history.
  const n=world.size, min=n*.12, max=n*.88;
  let best=null, bestDistance=-Infinity;
  for(let k=0;k<25;k++){
    const x=min+world.rand()*(max-min),y=min+world.rand()*(max-min);
    const clearance=world.grains.reduce((closest,g)=>Math.min(closest,Math.hypot(x-g.x,y-g.y)),Infinity);
    if(clearance>bestDistance){best={x,y};bestDistance=clearance;}
  }
  return world.seed(best.x,best.y,world.rand()*Math.PI*2,undefined,morphology);
}
export function freshSeed() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'){
    const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0] || 1;
  }
  return (Date.now() ^ Math.floor(Math.random()*0xffffffff)) >>> 0 || 1;
}
