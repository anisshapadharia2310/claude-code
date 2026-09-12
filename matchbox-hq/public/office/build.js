// ── Matchbox HQ · the office diorama ────────────────────────────────
// Low-poly isometric office. Every object is generated geometry —
// no downloaded models, no image files.
import * as THREE from './three.module.min.js';
import { CONFIG } from './config.js';

// ── palette: warm neutrals, wood, soft pink, black ──────────────────
export const C = {
  floorA:0xC79A69, floorB:0xB98A5E,
  wall:   0xEFE3D2, wallShade:0xE3D4C0, skirting:0xD8C7B0,
  wood:   0xC2915E, woodDark:0xA0764A, woodTop:0xD0A472,
  black:  0x2B282E, blackSoft:0x3A363D, metal:0x6E6A70,
  pink:   0xF08AAE, pinkDeep:0xD9557F, pinkPale:0xF9D2DF,
  leaf:   0x6E9C63, leafDark:0x557A4E, pot:0xB5705A,
  glass:  0xBFD8DC, paper:0xFBF6EC, cork:0xC9A26B,
  sun:    0xFFD9A0, lamp:0xFFC98A, dusk:0x5A4A6A,
  screen: 0x1E2A2E, screenOn:0x243238,
};

export const GEO = {
  box: new THREE.BoxGeometry(1,1,1),
  cyl: new THREE.CylinderGeometry(0.5,0.5,1,12),
  cylLow: new THREE.CylinderGeometry(0.5,0.5,1,8),
  sphere: new THREE.SphereGeometry(0.5,10,8),
};

const matCache = new Map();
export function mat(color, opts={}){
  const key = color + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? .92, metalness: opts.metal ?? 0, ...opts.extra });
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? .3; }
  matCache.set(key, m);
  return m;
}

// box helper: b(parent, w,h,d, x,y,z, color, opts)
export function b(parent, w,h,d, x,y,z, color, opts={}){
  const m = new THREE.Mesh(GEO.box, opts.material || mat(color, opts));
  m.scale.set(w,h,d); m.position.set(x,y,z);
  m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false;
  if (opts.rotY) m.rotation.y = opts.rotY;
  if (opts.rotX) m.rotation.x = opts.rotX;
  if (opts.rotZ) m.rotation.z = opts.rotZ;
  parent.add(m);
  return m;
}
export function cyl(parent, r,h, x,y,z, color, opts={}){
  const m = new THREE.Mesh(opts.low ? GEO.cylLow : GEO.cyl, opts.material || mat(color, opts));
  m.scale.set(r*2,h,r*2); m.position.set(x,y,z);
  m.castShadow = true; m.receiveShadow = true;
  if (opts.rotZ) m.rotation.z = opts.rotZ;
  if (opts.rotX) m.rotation.x = opts.rotX;
  parent.add(m);
  return m;
}

// ── canvas-drawn signage (no image files) ───────────────────────────
export function textPlane(text, opts={}){
  const {
    w = 512, h = 128, bg = null, fg = '#2B282E', font = '700 72px Archivo, Arial Black, sans-serif',
    letterSpacing = '0px', align = 'center', pad = 0,
  } = opts;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0,0,w,h); }
  g.fillStyle = fg; g.font = font; g.textBaseline = 'middle';
  g.textAlign = align;
  if (g.letterSpacing !== undefined) g.letterSpacing = letterSpacing;
  g.fillText(text, align === 'left' ? pad : w/2, h/2);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function signMesh(parent, text, wUnits, hUnits, x,y,z, opts={}){
  const tex = textPlane(text, opts);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wUnits, hUnits),
    new THREE.MeshBasicMaterial({ map: tex, transparent: !opts.bg, color: 0xffffff }));
  m.position.set(x,y,z);
  if (opts.rotY) m.rotation.y = opts.rotY;
  if (opts.rotX) m.rotation.x = opts.rotX;
  parent.add(m);
  return m;
}

// ── floor texture: wood planks, drawn once ──────────────────────────
export function plankTexture(){
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#BE8D5F'; g.fillRect(0,0,256,256);
  for (let row = 0; row < 8; row++){
    const y = row * 32;
    const shade = ['#C89A69','#BB8B5C','#C4956A','#B58355'][row % 4];
    g.fillStyle = shade; g.fillRect(0, y, 256, 30);
    // plank seams
    g.strokeStyle = 'rgba(90,60,35,.35)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, y+31); g.lineTo(256, y+31); g.stroke();
    const off = (row % 2) * 128;
    for (const bx of [off, off + 128]) {
      g.beginPath(); g.moveTo(bx, y); g.lineTo(bx, y+31); g.stroke();
    }
    // grain
    g.strokeStyle = 'rgba(90,60,35,.10)';
    for (let i = 0; i < 5; i++){
      const gy = y + 5 + i*5;
      g.beginPath(); g.moveTo(0, gy); g.lineTo(256, gy + (i%2?1:-1)); g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ── matchbox prop: the product itself ───────────────────────────────
export function matchbox(parent, x,y,z, variant='pink', scale=1, rotY=0){
  const g = new THREE.Group();
  const headColor = variant === 'pink' ? C.pink : 0x201E24;
  b(g, 1.5, .5, 1.0, 0,0,0, variant === 'pink' ? C.pinkPale : C.black);
  // sleeve band
  b(g, 1.52, .22, 1.02, 0,.02,0, variant === 'pink' ? C.pinkDeep : 0x141317);
  // tiny match head peeking
  b(g, .12, .1, .12, .45,.28,.25, headColor, { cast:false });
  g.position.set(x,y,z); g.scale.setScalar(scale); g.rotation.y = rotY;
  parent.add(g);
  return g;
}

export { THREE, CONFIG };
