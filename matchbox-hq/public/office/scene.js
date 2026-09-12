// ── Matchbox HQ · office scene ──────────────────────────────────────
import { THREE, CONFIG, C, GEO, mat, b, cyl, signMesh, plankTexture, matchbox } from './build.js';

export const PODS = [
  { id:'supplier', name:'Supplier Scout',  color:0xF0A63C, x:-14, z: 0 },
  { id:'legal',    name:'Legal & Setup',   color:0x5B9BE8, x:  0, z: 0 },
  { id:'brand',    name:'Brand & Content', color:0xF08AAE, x: 14, z: 0 },
  { id:'website',  name:'Website Builder', color:0xA98AE8, x:-14, z: 9 },
  { id:'launch',   name:'Launch & Sales',  color:0x62C285, x:  0, z: 9 },
  { id:'finance',  name:'Finance',         color:0x46BFB0, x: 14, z: 9 },
];

const HALF_X = 22, HALF_Z = 16, WALL_H = 12, WALL_T = .5;

export function buildOffice(scene, evening){
  const root = new THREE.Group();
  scene.add(root);

  floorAndWalls(root);
  meetingRoom(root);
  founderOffice(root);
  lounge(root);
  kitchen(root);
  PODS.forEach(p => deskPod(root, p));
  printer(root, 18, -4.2);
  plant(root, -20.5, -3);   plant(root, 20.5, 14, 1.15);
  plant(root, 6.5, 14.5, .9); plant(root, -6, 15, 1.05);
  breakout(root, 13, 15);
  rug(root, 0, -10.5, 14, 8, C.pinkPale);
  rug(root, 0, 4.5, 34, 16, 0xD9C7B2);
  windows(root, evening);
  return root;
}

// ── shell ───────────────────────────────────────────────────────────
function floorAndWalls(root){
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF_X*2, HALF_Z*2),
    new THREE.MeshStandardMaterial({ map: plankTexture(), roughness:.85 }));
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  root.add(floor);

  // back wall (z = -16) and left wall (x = -22); front + right stay open (diorama cut)
  b(root, HALF_X*2, WALL_H, WALL_T, 0, WALL_H/2, -HALF_Z, C.wall, { cast:false });
  b(root, WALL_T, WALL_H, HALF_Z*2, -HALF_X, WALL_H/2, 0, C.wallShade, { cast:false });
  // skirting
  b(root, HALF_X*2, .6, .7, 0, .3, -HALF_Z+.1, C.skirting, { cast:false });
  b(root, .7, .6, HALF_Z*2, -HALF_X+.1, .3, 0, C.skirting, { cast:false });
  // floor edge trim so the diorama reads as a solid slab
  b(root, HALF_X*2, .6, .6, 0, -.3, HALF_Z, C.woodDark, { cast:false });
  b(root, .6, .6, HALF_Z*2, HALF_X, -.3, 0, C.woodDark, { cast:false });
}

function glassWall(root, w, h, x, y, z, rotY=0){
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, .12),
    new THREE.MeshPhysicalMaterial({ color:C.glass, transparent:true, opacity:.17,
      roughness:.05, metalness:0, transmission:0, side:THREE.DoubleSide }));
  g.position.set(x,y,z); g.rotation.y = rotY;
  root.add(g);
  // frame
  const f = new THREE.Group();
  b(f, w, .16, .22, 0, h/2, 0, C.blackSoft, { cast:false });
  b(f, w, .16, .22, 0, -h/2, 0, C.blackSoft, { cast:false });
  b(f, .16, h, .22, -w/2, 0, 0, C.blackSoft, { cast:false });
  b(f, .16, h, .22,  w/2, 0, 0, C.blackSoft, { cast:false });
  f.position.set(x,y,z); f.rotation.y = rotY;
  root.add(f);
  return g;
}

// ── meeting room (top-left) ─────────────────────────────────────────
function meetingRoom(root){
  const x0 = -HALF_X, x1 = -9, z0 = -HALF_Z, z1 = -5;
  const cx = (x0+x1)/2, cz = (z0+z1)/2;
  // glass wall facing the floor, with the drop name on it
  glassWall(root, 11, 8, x1, 4, cz, Math.PI/2);
  glassWall(root, 7.5, 8, cx+2.7, 4, z1);           // front glass, door gap at left
  signMesh(root, CONFIG.DROP_NAME, 5.6, 1.4, cx+2.7, 5.9, z1+.12, {
    fg:'#2B282E', font:'700 96px Archivo, Arial Black, sans-serif', w:640, h:160, letterSpacing:'4px' });
  signMesh(root, CONFIG.DROP_SUB, 5.0, .8, cx+2.7, 4.7, z1+.12, {
    fg:'#D9557F', font:'600 50px Archivo, Arial, sans-serif', w:700, h:110, letterSpacing:'3px' });
  signMesh(root, 'MEETING ROOM', 3.4, .5, cx+2.7, 7.3, z1+.12, {
    fg:'#8A8590', font:'600 40px Archivo, Arial, sans-serif', w:700, h:90, letterSpacing:'9px' });

  // table + chairs
  b(root, 11, .35, 4.6, cx, 2.9, cz, C.woodTop);
  cyl(root, .55, 2.9, cx-3, 1.45, cz, C.metal, { low:true });
  cyl(root, .55, 2.9, cx+3, 1.45, cz, C.metal, { low:true });
  b(root, 3.4, .2, 1.6, cx-3, .1, cz, C.blackSoft);
  b(root, 3.4, .2, 1.6, cx+3, .1, cz, C.blackSoft);
  for (const [ox,oz,r] of [[-3.4,-3.2,0],[0,-3.2,0],[3.4,-3.2,0],[-3.4,3.2,Math.PI],[0,3.2,Math.PI],[3.4,3.2,Math.PI]])
    chair(root, cx+ox, cz+oz, r, C.black);

  // whiteboard on the back wall
  b(root, 9, 4.6, .25, cx, 6.4, z0+.4, C.paper, { cast:false });
  b(root, 9.4, 5, .16, cx, 6.4, z0+.3, C.blackSoft, { cast:false });
  // scribbles
  for (let i=0;i<4;i++) b(root, 4.6 - i*.7, .16, .06, cx-1.6+i*.3, 7.8-i*.9, z0+.53, 0x8A8590, { cast:false });
  b(root, 2.2, .16, .06, cx+2.4, 5.2, z0+.53, C.pinkDeep, { cast:false });
  matchbox(root, cx+3.6, 3.2, cz-1.2, 'pink', .9, .5);
  matchbox(root, cx+4.3, 3.2, cz-.6, 'black', .9, -.3);
}

// ── founder corner office (top-right) ───────────────────────────────
function founderOffice(root){
  const x0 = 9, x1 = HALF_X, z0 = -HALF_Z, z1 = -5;
  const cx = (x0+x1)/2, cz = (z0+z1)/2;
  glassWall(root, 11, 8, x0, 4, cz, Math.PI/2);
  glassWall(root, 7.5, 8, cx-2.7, 4, z1);

  // nameplate beside the door
  b(root, 4.6, 1.3, .16, cx-2.7, 5.9, z1+.02, C.blackSoft, { cast:false });
  signMesh(root, CONFIG.FOUNDER, 4.0, .92, cx-2.7, 5.9, z1+.13, {
    fg:'#F9D2DF', font:'700 72px Archivo, Arial Black, sans-serif', w:520, h:120, letterSpacing:'6px' });
  signMesh(root, 'CORNER OFFICE', 3.2, .46, cx-2.7, 7.3, z1+.12, {
    fg:'#8A8590', font:'600 40px Archivo, Arial, sans-serif', w:700, h:90, letterSpacing:'9px' });

  // desk facing out, chair behind
  b(root, 8, .35, 3.6, cx, 3, cz-1, C.woodTop);
  b(root, .5, 3, 3.4, cx-3.6, 1.5, cz-1, C.wood);
  b(root, .5, 3, 3.4, cx+3.6, 1.5, cz-1, C.wood);
  b(root, 7.6, 1.4, .3, cx, 2.1, cz-2.7, C.wood);
  chair(root, cx, cz-3.4, 0, C.black, true);
  monitor(root, cx-1.4, 3.18, cz-1.6, .25);
  mug(root, cx+1.9, 3.18, cz-.4, C.pinkDeep);
  // stacked paper + a matchbox the founder keeps on the desk
  b(root, 1.7, .28, 2.2, cx+2.8, 3.3, cz-1.6, C.paper);
  matchbox(root, cx+.6, 3.3, cz-.2, 'pink', 1, .4);
  lamp(root, cx-3.1, 3.18, cz-2.2);
  plant(root, x1-2.2, z0+2.6, 1.1);
  // small sofa + side table
  b(root, 4.4, 1.5, 2.2, cx+1, .75, z1-2.4, 0xB98D93);
  b(root, 4.4, 1.6, .6, cx+1, 1.6, z1-3.3, 0xA97D84);
  rug(root, cx, cz, 10, 8, 0xD8C3AE);
}

// ── reception / lounge, pinboard + supplier map ─────────────────────
function lounge(root){
  const z0 = -HALF_Z;
  // company sign, big, on the back wall
  signMesh(root, CONFIG.COMPANY, 14, 2.6, 0, 9, z0+.32, {
    fg:'#2B282E', font:'700 150px Archivo, Arial Black, sans-serif', w:1400, h:260, letterSpacing:'10px' });
  signMesh(root, CONFIG.CITY + ' · SINCE 2026', 6, .6, 0, 7.4, z0+.32, {
    fg:'#D9557F', font:'600 44px Archivo, Arial, sans-serif', w:900, h:90, letterSpacing:'8px' });

  // pinboard with Drop 01 box designs
  b(root, 7.6, 4.8, .22, -5.4, 4.4, z0+.35, C.cork, { cast:false });
  b(root, 8, 5.2, .14, -5.4, 4.4, z0+.26, C.woodDark, { cast:false });
  const designs = [C.pink, 0x2B282E, C.pinkDeep, 0x3A363D, C.pinkPale, 0x201E24];
  designs.forEach((col, i) => {
    const px = -7.6 + (i % 3) * 2.2, py = 5.6 - Math.floor(i/3) * 2.1;
    b(root, 1.5, 1.5, .1, px, py, z0+.48, col, { cast:false, rotZ:(i%2?1:-1)*.05 });
    b(root, 1.5, .32, .12, px, py-.45, z0+.5, i%2 ? 0xF9D2DF : 0xD9557F, { cast:false, rotZ:(i%2?1:-1)*.05 });
  });
  // sticky notes
  [[-8.6,2.6,0xF5D96B],[-2.6,2.5,0xA7DCC0],[-8.2,7.1,0xF5B0C4]].forEach(([sx,sy,sc]) =>
    b(root, .85,.85,.08, sx, sy, z0+.48, sc, { cast:false, rotZ:.12 }));

  // Sivakasi supplier map board
  b(root, 6.4, 4.8, .22, 5.6, 4.4, z0+.35, 0xE7DAC6, { cast:false });
  b(root, 6.8, 5.2, .14, 5.6, 4.4, z0+.26, C.blackSoft, { cast:false });
  signMesh(root, 'SIVAKASI', 2.6, .5, 5.6, 6.4, z0+.48, {
    fg:'#6E6A70', font:'600 44px Archivo, Arial, sans-serif', w:520, h:90, letterSpacing:'6px' });
  // crude India outline in blocks + supplier pins
  const outline = [[0,-1.4,1.6,.5],[.3,-.8,2.2,.5],[0,-.3,2.6,.5],[-.2,.2,2.4,.5],[-.1,.7,1.8,.5],[.1,1.2,1.1,.5]];
  outline.forEach(([ox,oy,ow,oh]) => b(root, ow, oh, .08, 5.6+ox, 4.2+oy, z0+.47, 0xCBBBA2, { cast:false }));
  const pins = [[5.0,3.3],[5.9,3.6],[6.4,3.1],[5.4,4.0],[6.0,2.9]];
  pins.forEach(([px,py], i) => {
    cyl(root, .11, .3, px, py, z0+.56, i < 2 ? C.pinkDeep : 0x8A8590, { rotX: Math.PI/2, low:true, cast:false });
  });

  // sofa + coffee table
  b(root, 7, 1.3, 2.6, 0, .65, -12.4, 0x8E8A93);
  b(root, 7, 1.8, .7, 0, 1.55, -13.4, 0x7E7A85);
  b(root, .8, 1.5, 2.6, -3.4, 1.2, -12.4, 0x7E7A85);
  b(root, .8, 1.5, 2.6,  3.4, 1.2, -12.4, 0x7E7A85);
  b(root, 3.4, .3, 1.8, 0, 1.1, -9.6, C.woodTop);
  cyl(root, .18, 1.1, -1.2, .55, -9.6, C.metal, { low:true });
  cyl(root, .18, 1.1,  1.2, .55, -9.6, C.metal, { low:true });
  matchbox(root, .4, 1.32, -9.6, 'black', 1, .3);
  matchbox(root, -.6, 1.32, -9.4, 'pink', 1, -.5);
}

// ── kitchen nook (bottom-left, along the left wall) ─────────────────
function kitchen(root){
  const x = -HALF_X + 1.6;
  b(root, 3, 3, 8, x, 1.5, 12, C.wood);                 // counter body
  b(root, 3.3, .3, 8.4, x, 3.1, 12, 0xE9DFD0);          // counter top
  b(root, 3.2, 1.8, 8.2, x, 8.6, 12, C.woodDark, { cast:false }); // upper cabinet
  // coffee machine
  b(root, 1.6, 1.8, 1.6, x, 4.15, 9.6, 0x33303A);
  b(root, 1.2, .5, 1.2, x+.1, 5.2, 9.6, C.pinkDeep);
  cyl(root, .2, .5, x+.2, 3.5, 10.6, 0x33303A, { low:true });
  // mugs on the counter
  mug(root, x+.3, 3.28, 13.2, C.pinkPale);
  mug(root, x+.3, 3.28, 14.3, 0xE9DFD0);
  mug(root, x-.4, 3.28, 12.2, C.pinkDeep);
  // a crate of stock matchboxes waiting to go out
  b(root, 3.4, 2, 3.4, x+4.6, 1, 15.2, C.cork);
  b(root, 3.6, .3, 3.6, x+4.6, 2.1, 15.2, 0xB08C5E);
  matchbox(root, x+4.1, 2.4, 14.6, 'pink', 1, .2);
  matchbox(root, x+5.1, 2.4, 15.4, 'black', 1, -.4);
  matchbox(root, x+4.4, 2.4, 15.8, 'pink', 1, .9);
}

function breakout(root, x, z){
  // small round table people actually stand around
  cyl(root, 2.2, .3, x, 3.1, z, C.woodTop);
  cyl(root, .3, 3, x, 1.5, z, C.metal, { low:true });
  cyl(root, 1.2, .25, x, .12, z, C.metal, { low:true });
  for (const [ox,oz] of [[-3.2,0],[3.2,.4],[0,3.2]]){
    cyl(root, .9, 1.9, x+ox, .95, z+oz, C.blackSoft, { low:true });
    cyl(root, .95, .25, x+ox, 1.95, z+oz, C.pinkDeep, { low:true });
  }
  matchbox(root, x+.5, 3.3, z, 'pink', 1, .6);
  matchbox(root, x-.6, 3.3, z+.5, 'black', 1, -.2);
  // water cooler
  b(root, 1.6, 3.2, 1.6, x+6.4, 1.6, z-1, 0xDCD6CC);
  cyl(root, .8, 1.8, x+6.4, 4.1, z-1, 0xAFCBD4, { low:true });
  // stock crates waiting by the door
  b(root, 3, 2.2, 3, x-8.5, 1.1, z+.5, C.cork);
  b(root, 3, 2.2, 3, x-8.5, 3.3, z+.5, C.cork);
  b(root, 3.2, .3, 3.2, x-8.5, 4.5, z+.5, 0xB08C5E);
  matchbox(root, x-8.5, 4.8, z+.5, 'pink', 1.1, .3);
  return root;
}

// ── furniture pieces ────────────────────────────────────────────────
function chair(root, x, z, rotY, color, big=false){
  const g = new THREE.Group();
  const w = big ? 2.4 : 2;
  b(g, w, .3, w, 0, 2.2, 0, color);
  b(g, w, big ? 3 : 2.4, .3, 0, 3.6, -w/2+.15, color);
  cyl(g, .18, 2.2, 0, 1.1, 0, C.metal, { low:true });
  b(g, 1.8, .2, .3, 0, .1, 0, C.metal);
  b(g, .3, .2, 1.8, 0, .1, 0, C.metal);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  root.add(g);
  return g;
}

function monitor(root, x, y, z, tilt=0){
  const g = new THREE.Group();
  b(g, 3.0, 1.75, .14, 0, 1.85, 0, C.blackSoft);
  b(g, 2.78, 1.55, .06, 0, 1.85, .09, C.screen, { emissive:0x24414A, emissiveIntensity:.55 });
  cyl(g, .16, .95, 0, .48, 0, C.metal, { low:true });
  b(g, 1.3, .12, .8, 0, .08, 0, C.metal);
  g.position.set(x, y, z); g.rotation.y = tilt;
  root.add(g);
  return g;
}

function mug(root, x, y, z, color){
  const g = new THREE.Group();
  cyl(g, .32, .62, 0, .31, 0, color, { low:true });
  cyl(g, .12, .18, .38, .34, 0, color, { low:true, rotZ:Math.PI/2 });
  cyl(g, .26, .06, 0, .6, 0, 0x4A3428, { low:true, cast:false });
  g.position.set(x,y,z);
  root.add(g);
  return g;
}

function lamp(root, x, y, z){
  const g = new THREE.Group();
  cyl(g, .5, .12, 0, .06, 0, C.blackSoft, { low:true });
  cyl(g, .09, 2.4, 0, 1.2, 0, C.blackSoft, { low:true });
  cyl(g, .1, 1.4, .5, 2.3, 0, C.blackSoft, { low:true, rotZ:Math.PI/2.6 });
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.62, .8, 10, 1, true),
    mat(C.pinkDeep, { extra:{ side:THREE.DoubleSide } }));
  shade.position.set(1.05, 2.0, 0); shade.rotation.z = Math.PI + .5;
  shade.castShadow = true;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xFFD9A0 }));
  bulb.position.set(1.05, 1.72, 0); bulb.name = 'bulb';
  g.add(bulb);
  g.position.set(x,y,z);
  root.add(g);
  return g;
}

function plant(root, x, z, scale=1){
  const g = new THREE.Group();
  cyl(g, .95, 1.5, 0, .75, 0, C.pot, { low:true });
  cyl(g, 1.05, .3, 0, 1.5, 0, 0xA0604C, { low:true });
  const leafMat = mat(C.leaf), darkMat = mat(C.leafDark);
  for (let i = 0; i < 7; i++){
    const a = (i / 7) * Math.PI * 2 + .4;
    const h = 2.2 + (i % 3) * .8;
    const leaf = new THREE.Mesh(GEO.box, i % 2 ? leafMat : darkMat);
    leaf.scale.set(.5, h, 1.5);
    leaf.position.set(Math.cos(a) * .9, 1.6 + h/2, Math.sin(a) * .9);
    leaf.rotation.set(Math.cos(a) * .28, -a, Math.sin(a) * .28);
    leaf.castShadow = true;
    leaf.userData.sway = { a, base: leaf.rotation.x, phase: i };
    g.add(leaf);
  }
  g.position.set(x, 0, z); g.scale.setScalar(scale);
  g.userData.isPlant = true;
  root.add(g);
  return g;
}

function printer(root, x, z){
  const g = new THREE.Group();
  b(g, 3.4, 2.6, 2.6, 0, 1.3, 0, 0xD8D2C8);
  b(g, 3.6, .5, 2.8, 0, 2.75, 0, 0xBDB6AB);
  b(g, 2.4, .12, 1.6, 0, 3.06, .4, C.paper);
  const light = new THREE.Mesh(new THREE.BoxGeometry(.22,.22,.1),
    new THREE.MeshBasicMaterial({ color: 0x62C285 }));
  light.position.set(1.2, 2.2, 1.35); light.name = 'printerLight';
  g.add(light);
  b(g, 2.6, .1, 1.2, 0, 1.05, 1.45, C.paper, { cast:false }); // output tray page
  g.position.set(x, 0, z);
  g.userData.isPrinter = true;
  root.add(g);
  return g;
}

function rug(root, x, z, w, d, color){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { rough:1 }));
  m.rotation.x = -Math.PI/2; m.position.set(x, .02, z);
  m.receiveShadow = true;
  root.add(m);
  return m;
}

// ── one agent desk pod ──────────────────────────────────────────────
function deskPod(root, pod){
  const g = new THREE.Group();
  g.position.set(pod.x, 0, pod.z);
  g.userData.pod = pod;

  b(g, 8, .35, 3.8, 0, 3, 0, C.woodTop);
  b(g, .45, 3, 3.6, -3.6, 1.5, 0, C.wood);
  b(g, .45, 3, 3.6,  3.6, 1.5, 0, C.wood);
  b(g, 7.6, 1.2, .3, 0, 2.2, -1.75, C.wood);
  // low divider in the agent's colour — how you tell the pods apart
  b(g, 8.2, 1.9, .28, 0, 4.1, -1.9, pod.color, { cast:false });

  monitor(g, -1.3, 3.18, -.6, .18);
  lamp(g, 3.05, 3.18, -1);
  mug(g, 1.6, 3.18, .9, pod.color);
  chair(g, -.4, 2.8, Math.PI, C.black);
  // drawer unit
  b(g, 2, 2.4, 2.6, 2.6, 1.2, 1.1, C.blackSoft);
  for (let i=0;i<3;i++) b(g, 1.9, .1, .1, 2.6, .7 + i*.7, 2.42, C.metal, { cast:false });
  // props: paper, sticky notes, the product
  b(g, 1.6, .2, 2, -3, 3.28, .8, C.paper);
  b(g, .7, .06, .7, .4, 3.22, -.2, 0xF5D96B, { cast:false, rotY:.3 });
  b(g, .7, .06, .7, .9, 3.22, .1, 0xA7DCC0, { cast:false, rotY:-.2 });
  matchbox(g, 2.2, 3.3, -.6, pod.id === 'brand' ? 'pink' : 'black', .95, .35);

  root.add(g);
  return g;
}

// ── windows, sky, and the light that comes through them ─────────────
function skyTexture(evening){
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0,0,0,128);
  if (evening){
    grad.addColorStop(0, '#1B1B33'); grad.addColorStop(.55, '#3A2A4A'); grad.addColorStop(1, '#6B3E4E');
    g.fillStyle = grad; g.fillRect(0,0,128,128);
    // city lights
    for (let i = 0; i < 90; i++){
      g.fillStyle = ['#FFD9A0','#FFB86B','#FFE9C4'][i % 3];
      g.globalAlpha = .35 + Math.random() * .6;
      g.fillRect(Math.random()*128, 70 + Math.random()*55, 2, 2 + Math.random()*3);
    }
    g.globalAlpha = 1;
    // building silhouettes
    g.fillStyle = '#241B2E';
    for (let x = 0; x < 128; x += 14) g.fillRect(x, 78 + (x*7 % 22), 11, 60);
  } else {
    grad.addColorStop(0, '#BBD9EC'); grad.addColorStop(.6, '#F2D9BC'); grad.addColorStop(1, '#E9B98C');
    g.fillStyle = grad; g.fillRect(0,0,128,128);
    g.fillStyle = 'rgba(180,150,130,.5)';
    for (let x = 0; x < 128; x += 16) g.fillRect(x, 92 + (x*5 % 14), 13, 40);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function windowUnit(root, w, h, x, y, z, rotY, skyMat){
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), skyMat);
  pane.position.set(x,y,z); pane.rotation.y = rotY;
  root.add(pane);
  const f = new THREE.Group();
  b(f, w+.6, .5, .45, 0, h/2, 0, C.blackSoft, { cast:false });
  b(f, w+.6, .5, .45, 0, -h/2, 0, C.blackSoft, { cast:false });
  b(f, .45, h+.5, .45, -w/2, 0, 0, C.blackSoft, { cast:false });
  b(f, .45, h+.5, .45,  w/2, 0, 0, C.blackSoft, { cast:false });
  b(f, .3, h, .4, 0, 0, 0, C.blackSoft, { cast:false });
  b(f, w, .3, .4, 0, 0, 0, C.blackSoft, { cast:false });
  // sill
  b(f, w+.9, .35, 1.1, 0, -h/2-.3, .3, C.wall, { cast:false });
  f.position.set(x,y,z); f.rotation.y = rotY;
  root.add(f);
}

function windows(root, evening){
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture(evening) });
  // back wall: one big window in each corner room
  windowUnit(root, 9, 6, -15.5, 6.6, -HALF_Z+.32, 0, skyMat);
  windowUnit(root, 9, 6,  15.5, 6.6, -HALF_Z+.32, 0, skyMat);
  // left wall: two tall windows over the open floor
  windowUnit(root, 8, 6.5, -HALF_X+.32, 6.6, 2, Math.PI/2, skyMat);
  windowUnit(root, 5, 6.5, -HALF_X+.32, 6.6, -8.5, Math.PI/2, skyMat);
}

// ── pendant lights over the floor (glow in the evening) ─────────────
export function pendants(root, evening){
  const out = [];
  // ceiling track so the lamps hang off something real
  b(root, 38, .18, .3, 0, 11.7, 4.5, C.blackSoft, { cast:false });
  [[-14,4.5],[0,4.5],[14,4.5]].forEach(([x,z]) => {
    const g = new THREE.Group();
    cyl(g, .05, 2.6, 0, 10.3, 0, C.blackSoft, { low:true, cast:false });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.15, .95, 12, 1, true),
      mat(0x33303A, { extra:{ side:THREE.DoubleSide } }));
    shade.position.y = 8.6; shade.castShadow = true;
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8),
      new THREE.MeshBasicMaterial({ color: evening ? 0xFFD9A0 : 0xEFE3D2 }));
    bulb.position.y = 8.2;
    g.add(bulb);
    g.position.set(x, 0, z);
    root.add(g);
    out.push({ group:g, bulb });
  });
  return out;
}
