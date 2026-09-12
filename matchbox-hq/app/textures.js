// ── Procedural materials ────────────────────────────────────────────
// Every texture is drawn here in code. Nothing is downloaded — the
// network blocks asset CDNs, and a phone shouldn't pull 20MB of maps.
import * as THREE from './three.module.min.js';

const cache = new Map();
function make(name, w, h, draw, repeat){
  if (cache.has(name)) return cache.get(name);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  cache.set(name, t);
  return t;
}
// a greyscale sibling of a colour map, used for roughness
function rough(name, w, h, draw, repeat){
  const key = name + ':rough';
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  cache.set(key, t);
  return t;
}

const rnd = (s => () => (s = s * 16807 % 2147483647) / 2147483647)(42);

// ── pale maple: the desks in reference 02 ───────────────────────────
export const mapleMap = (repeat=[1,1]) => make('maple', 512, 512, (g,w,h) => {
  g.fillStyle = '#D6BC92'; g.fillRect(0,0,w,h);
  for (let i = 0; i < 200; i++){
    const y = rnd() * h;
    g.strokeStyle = `rgba(${168+rnd()*30|0},${138+rnd()*26|0},${96+rnd()*24|0},${.05+rnd()*.12})`;
    g.lineWidth = .5 + rnd() * 2;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin((x+i*40)/95) * (1.5 + rnd()*2.5));
    g.stroke();
  }
  const v = g.createLinearGradient(0,0,w,h);
  v.addColorStop(0,'rgba(255,244,220,.14)'); v.addColorStop(1,'rgba(150,118,74,.10)');
  g.fillStyle = v; g.fillRect(0,0,w,h);
}, repeat);

// ── honey wood: long grain, knots, a little varnish variation ───────
export const woodMap = (repeat=[1,1]) => make('wood', 512, 512, (g,w,h) => {
  g.fillStyle = '#B8804A'; g.fillRect(0,0,w,h);
  for (let i = 0; i < 240; i++){                     // grain
    const y = rnd() * h;
    g.strokeStyle = `rgba(${90+rnd()*50|0},${58+rnd()*30|0},${28+rnd()*20|0},${.05+rnd()*.14})`;
    g.lineWidth = .6 + rnd() * 2.4;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin((x+i*40)/90) * (2 + rnd()*3));
    g.stroke();
  }
  for (let k = 0; k < 5; k++){                        // knots
    const kx = rnd()*w, ky = rnd()*h;
    for (let r = 13; r > 0; r -= 2){
      g.strokeStyle = `rgba(78,48,24,${.05 + (13-r)*.022})`;
      g.lineWidth = 1.6;
      g.beginPath(); g.ellipse(kx, ky, r*1.7, r, .5, 0, Math.PI*2); g.stroke();
    }
  }
  const v = g.createLinearGradient(0,0,w,h);          // varnish sheen
  v.addColorStop(0,'rgba(255,225,180,.09)'); v.addColorStop(1,'rgba(90,60,30,.09)');
  g.fillStyle = v; g.fillRect(0,0,w,h);
}, repeat);

export const woodRough = (repeat=[1,1]) => rough('wood', 256, 256, (g,w,h) => {
  g.fillStyle = '#6a6a6a'; g.fillRect(0,0,w,h);
  for (let i = 0; i < 150; i++){
    g.strokeStyle = `rgba(255,255,255,${.03+rnd()*.09})`;
    g.lineWidth = 1 + rnd()*2;
    const y = rnd()*h;
    g.beginPath(); g.moveTo(0,y); g.lineTo(w, y + rnd()*6 - 3); g.stroke();
  }
}, repeat);

// ── floorboards: wide honey planks ──────────────────────────────────
export const floorMap = () => make('floor', 512, 512, (g,w,h) => {
  const shades = ['#BE8850','#B07B46','#C08D55','#A9743F','#B9834B'];
  for (let row = 0; row < 8; row++){
    const y = row * 64;
    g.fillStyle = shades[row % shades.length];
    g.fillRect(0, y, w, 62);
    g.strokeStyle = 'rgba(60,36,16,.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, y+63); g.lineTo(w, y+63); g.stroke();
    const off = (row % 2) * 256;
    for (const bx of [off, off + 256]){
      g.beginPath(); g.moveTo(bx, y); g.lineTo(bx, y+62); g.stroke();
    }
    for (let i = 0; i < 28; i++){
      g.strokeStyle = `rgba(70,42,18,${.04+rnd()*.1})`;
      g.lineWidth = .7 + rnd()*1.6;
      const gy = y + 4 + rnd()*54;
      g.beginPath(); g.moveTo(0, gy);
      for (let x = 0; x <= w; x += 48) g.lineTo(x, gy + Math.sin(x/70+i)*1.6);
      g.stroke();
    }
  }
}, [7, 6]);

// ── cork: dense speckle ─────────────────────────────────────────────
export const corkMap = (repeat=[2,2]) => make('cork', 256, 256, (g,w,h) => {
  g.fillStyle = '#C39A63'; g.fillRect(0,0,w,h);
  for (let i = 0; i < 4200; i++){
    const s = .8 + rnd()*3.4;
    g.fillStyle = `rgba(${120+rnd()*70|0},${85+rnd()*50|0},${45+rnd()*35|0},${.18+rnd()*.5})`;
    g.beginPath(); g.ellipse(rnd()*w, rnd()*h, s, s*(.6+rnd()*.7), rnd()*3, 0, Math.PI*2); g.fill();
  }
}, repeat);

// ── jute: woven crosshatch ──────────────────────────────────────────
export const juteMap = (repeat=[6,6]) => make('jute', 256, 256, (g,w,h) => {
  g.fillStyle = '#C0AE88'; g.fillRect(0,0,w,h);
  const cell = 32;
  for (let y = 0; y < h; y += cell)
    for (let x = 0; x < w; x += cell){
      const flip = ((x/cell + y/cell) % 2) === 0;
      for (let i = 0; i < cell; i += 4){
        g.strokeStyle = `rgba(${150+rnd()*40|0},${132+rnd()*34|0},${96+rnd()*30|0},.75)`;
        g.lineWidth = 3;
        g.beginPath();
        if (flip){ g.moveTo(x+i, y); g.lineTo(x+i, y+cell); }
        else { g.moveTo(x, y+i); g.lineTo(x+cell, y+i); }
        g.stroke();
      }
    }
}, repeat);

// ── leopard: the one loud rug ───────────────────────────────────────
export const leopardMap = (repeat=[2,2]) => make('leopard', 256, 256, (g,w,h) => {
  g.fillStyle = '#D8B375'; g.fillRect(0,0,w,h);
  for (let i = 0; i < 90; i++){
    const x = rnd()*w, y = rnd()*h, r = 7 + rnd()*10;
    g.fillStyle = 'rgba(168,116,52,.85)';
    g.beginPath(); g.ellipse(x, y, r, r*.78, rnd()*3, 0, Math.PI*2); g.fill();
    g.fillStyle = 'rgba(46,32,20,.92)';
    for (let k = 0; k < 4; k++){
      const a = (k/4)*Math.PI*2 + rnd();
      g.beginPath();
      g.ellipse(x + Math.cos(a)*r*.72, y + Math.sin(a)*r*.62, r*.3, r*.22, a, 0, Math.PI*2);
      g.fill();
    }
  }
}, repeat);

// ── plaster: mottled, for the olive and grey walls ──────────────────
export const plasterMap = (tint='#6E6E4A', repeat=[3,2]) => make('plaster'+tint, 256, 256, (g,w,h) => {
  g.fillStyle = tint; g.fillRect(0,0,w,h);
  for (let i = 0; i < 2600; i++){
    const s = 2 + rnd()*13;
    g.fillStyle = rnd() > .5 ? `rgba(255,250,235,${.012+rnd()*.05})` : `rgba(20,18,12,${.012+rnd()*.05})`;
    g.beginPath(); g.ellipse(rnd()*w, rnd()*h, s, s*.7, rnd()*3, 0, Math.PI*2); g.fill();
  }
  for (let i = 0; i < 45; i++){          // trowel strokes
    g.strokeStyle = `rgba(255,248,232,${.02+rnd()*.045})`;
    g.lineWidth = 5 + rnd()*14;
    g.beginPath();
    const x = rnd()*w, y = rnd()*h;
    g.moveTo(x, y); g.lineTo(x + 30 + rnd()*70, y + rnd()*26 - 13);
    g.stroke();
  }
}, repeat);

// ── tan leather: pebbled grain ──────────────────────────────────────
export const leatherMap = (repeat=[3,3]) => make('leather', 256, 256, (g,w,h) => {
  g.fillStyle = '#A8703F'; g.fillRect(0,0,w,h);
  for (let i = 0; i < 2800; i++){
    const s = 1.6 + rnd()*3.4;
    g.fillStyle = rnd() > .5 ? `rgba(210,150,96,${.1+rnd()*.28})` : `rgba(88,52,24,${.1+rnd()*.3})`;
    g.beginPath(); g.ellipse(rnd()*w, rnd()*h, s, s*.85, rnd()*3, 0, Math.PI*2); g.fill();
  }
  const v = g.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.75);
  v.addColorStop(0,'rgba(255,210,160,.12)'); v.addColorStop(1,'rgba(60,32,12,.18)');
  g.fillStyle = v; g.fillRect(0,0,w,h);
}, repeat);

// ── a paper/clippings sheet for the pinboard ────────────────────────
export const clippingsMap = () => make('clippings', 256, 256, (g,w,h) => {
  g.fillStyle = '#C39A63'; g.fillRect(0,0,w,h);
  const papers = ['#F2E9D8','#EFE2CB','#E8DCC6','#F5EFE2'];
  for (let i = 0; i < 26; i++){
    const pw = 34 + rnd()*54, ph = 30 + rnd()*54;
    const x = rnd()*(w-pw), y = rnd()*(h-ph);
    g.save();
    g.translate(x+pw/2, y+ph/2); g.rotate((rnd()-.5)*.24);
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(-pw/2+2, -ph/2+3, pw, ph);
    g.fillStyle = papers[i % papers.length]; g.fillRect(-pw/2, -ph/2, pw, ph);
    g.fillStyle = 'rgba(60,52,40,.5)';
    for (let l = 0; l < 3 + rnd()*4; l++)
      g.fillRect(-pw/2+5, -ph/2+7+l*7, pw - 10 - rnd()*16, 2);
    if (rnd() > .6){ g.fillStyle = ['#C8963E','#A8703F','#6E7A4A'][i%3];
      g.fillRect(-pw/2+5, -ph/2+5, pw-10, ph*.35); }
    g.restore();
  }
}, [1,1]);

// ── striped amber resin, the desk dividers in reference 02 ──────────
export const amberMap = (repeat=[1,1]) => make('amber', 128, 256, (g,w,h) => {
  g.fillStyle = '#C8862E'; g.fillRect(0,0,w,h);
  for (let y = 0; y < h; y += 4){
    const t2 = Math.sin(y * .13) * .5 + .5;
    g.fillStyle = `rgba(${190 + t2*55|0},${100 + t2*70|0},${26 + t2*40|0},${.35 + t2*.45})`;
    g.fillRect(0, y, w, 2 + t2 * 2.4);
  }
  for (let i = 0; i < 70; i++){          // resin flaws, so it is not a gradient
    g.fillStyle = `rgba(255,214,150,${.05 + Math.random()*.16})`;
    g.fillRect(0, Math.random()*h, w, 1);
  }
}, repeat);

// ── checkerboard jute, reference 04 ─────────────────────────────────
export const checkerMap = (repeat=[4,4]) => make('checker', 256, 256, (g,w,h) => {
  const cell = 64;
  for (let y = 0; y < h; y += cell)
    for (let x = 0; x < w; x += cell){
      const dark = ((x/cell + y/cell) % 2) === 0;
      g.fillStyle = dark ? '#8A5A44' : '#C9B893';
      g.fillRect(x, y, cell, cell);
      for (let i = 0; i < cell; i += 3){   // weave
        g.strokeStyle = dark ? 'rgba(60,34,22,.3)' : 'rgba(150,132,96,.45)';
        g.lineWidth = 1.6;
        g.beginPath();
        if ((x/cell) % 2){ g.moveTo(x+i, y); g.lineTo(x+i, y+cell); }
        else { g.moveTo(x, y+i); g.lineTo(x+cell, y+i); }
        g.stroke();
      }
    }
}, repeat);

// ── framed art, the abstract canvases in references 02 and 04 ───────
export const artMap = (seed=0) => make('art'+seed, 192, 232, (g,w,h) => {
  const grounds = ['#8E9A5B','#D8C7A0','#C9784A','#6E7A8A'];
  g.fillStyle = grounds[seed % grounds.length]; g.fillRect(0,0,w,h);
  const inks = ['#C4452E','#2B4A6E','#E4A93C','#F2E9D8','#3F5A3A'];
  for (let i = 0; i < 5 + (seed % 3); i++){
    g.fillStyle = inks[(i + seed) % inks.length];
    g.globalAlpha = .75 + Math.random()*.25;
    if ((i + seed) % 2){
      g.beginPath();
      g.ellipse(Math.random()*w, Math.random()*h, 18 + Math.random()*46,
                14 + Math.random()*40, Math.random()*3, 0, Math.PI*2);
      g.fill();
    } else {
      g.lineWidth = 5 + Math.random()*9; g.strokeStyle = g.fillStyle;
      g.beginPath();
      g.moveTo(Math.random()*w, Math.random()*h);
      g.bezierCurveTo(Math.random()*w, Math.random()*h, Math.random()*w,
                      Math.random()*h, Math.random()*w, Math.random()*h);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
}, [1,1]);
