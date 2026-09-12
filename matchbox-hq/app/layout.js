// ── The office, as DATA ─────────────────────────────────────────────
// Both renderers (WebGL and 2D canvas) read this same list, so the
// 3D office and the 2D fallback can never drift apart.
export const C = {
  floor:'#BE8D5F', floorAlt:'#C89A69', wall:'#EFE3D2', wallSide:'#E3D4C0', skirt:'#D8C7B0',
  wood:'#C2915E', woodDark:'#A0764A', woodTop:'#D0A472', cork:'#C9A26B',
  black:'#2B282E', blackSoft:'#3A363D', metal:'#6E6A70',
  pink:'#F08AAE', pinkDeep:'#D9557F', pinkPale:'#F9D2DF',
  leaf:'#6E9C63', leafDark:'#557A4E', pot:'#B5705A',
  glass:'#BFD8DC', paper:'#FBF6EC', screen:'#24414A',
  sofa:'#8E8A93', sofaDark:'#7E7A85', rug:'#D9C7B2', rugPink:'#F2D9E1',
  counter:'#E9DFD0', crate:'#B08C5E',
};

export const DESKS = [
  { id:'prodops',  name:'Production & Ops', color:'#E0714B', x:-16.5, z:-0.5 },
  { id:'supplier', name:'Supplier Scout',   color:'#F0A63C', x: -5.5, z:-0.5 },
  { id:'legal',    name:'Legal & Setup',    color:'#5B9BE8', x:  5.5, z:-0.5 },
  { id:'brand',    name:'Brand & Content',  color:'#F08AAE', x: 16.5, z:-0.5 },
  { id:'website',  name:'Website Builder',  color:'#A98AE8', x:-11.0, z: 8.5 },
  { id:'launch',   name:'Sales & PR',       color:'#62C285', x:  0.0, z: 8.5 },
  { id:'finance',  name:'Finance',          color:'#46BFB0', x: 11.0, z: 8.5 },
];

export const ROOM = { hx:22, hz:16, wallH:12 };
export const MEET  = { x0:-22, x1:-9, z0:-16, z1:-5 };
export const CORNER= { x0:  9, x1:22, z0:-16, z1:-5 };
// where a character stands when they come to see you, and where meetings happen
export const SPOTS = {
  founderDoor: { x: 11.5, z: -3.5 },
  founderDesk: { x: 15.5, z: -9.5 },
  meetSeats: [
    {x:-18.5,z:-13.7},{x:-15.5,z:-13.7},{x:-12.5,z:-13.7},
    {x:-18.5,z:-7.3},{x:-15.5,z:-7.3},{x:-12.5,z:-7.3},{x:-11,z:-10.5},
  ],
  coffee: { x:-18.5, z: 10 },
  printer: { x: 17, z: -3 },
};

const P = [];
const box = (x,y,z,w,h,d,c,tag) => P.push({ k:'box', x,y,z,w,h,d,c,tag });
const glass = (x,y,z,w,h,d) => P.push({ k:'glass', x,y,z,w,h,d,c:C.glass });
const rug = (x,z,w,d,c) => P.push({ k:'rug', x,y:0.03,z,w,h:0.06,d,c });
const sign = (text,x,y,z,w,h,face,c,weight) => P.push({ k:'sign', text,x,y,z,w,h,face,c,weight:weight||700 });
const win = (x,y,z,w,h,face) => P.push({ k:'window', x,y,z,w,h,face });

function chair(x,z,facing,c){
  box(x, 2.35, z, 2, .3, 2, c, 'chair');
  const bx = facing === 'n' ? 0 : facing === 's' ? 0 : facing === 'e' ? -.85 : .85;
  const bz = facing === 'n' ? .85 : facing === 's' ? -.85 : 0;
  const bw = (facing === 'e' || facing === 'w') ? .3 : 2;
  const bd = (facing === 'e' || facing === 'w') ? 2 : .3;
  box(x+bx, 3.6, z+bz, bw, 2.4, bd, c, 'chair');
  box(x, 1.15, z, .4, 2.2, .4, C.metal, 'chair');
  box(x, .12, z, 1.8, .22, 1.8, C.metal, 'chair');
}
function monitor(x,y,z){
  box(x, y+1.85, z, 3.0, 1.75, .16, C.blackSoft, 'mon');
  box(x, y+1.85, z+.1, 2.78, 1.55, .06, C.screen, 'screen');
  box(x, y+.5, z, .34, .95, .34, C.metal, 'mon');
  box(x, y+.09, z, 1.3, .14, .8, C.metal, 'mon');
}
function mug(x,y,z,c){ box(x, y+.32, z, .66, .62, .66, c, 'mug'); }
function lamp(x,y,z){
  box(x, y+.07, z, 1, .14, 1, C.blackSoft, 'lamp');
  box(x, y+1.2, z, .2, 2.3, .2, C.blackSoft, 'lamp');
  box(x+.55, y+2.35, z, 1.3, .2, .2, C.blackSoft, 'lamp');
  box(x+1.1, y+2.05, z, .95, .7, .95, C.pinkDeep, 'lampshade');
}
function matchbox(x,y,z,variant){
  box(x, y+.25, z, 1.5, .5, 1.0, variant === 'pink' ? C.pinkPale : C.black, 'mbox');
  box(x, y+.27, z, 1.52, .22, 1.02, variant === 'pink' ? C.pinkDeep : '#141317', 'mbox');
}
function plant(x,z,s){
  s = s || 1;
  box(x, .75*s, z, 1.9*s, 1.5*s, 1.9*s, C.pot, 'plant');
  box(x, 1.5*s, z, 2.1*s, .3*s, 2.1*s, '#A0604C', 'plant');
  for (let i = 0; i < 5; i++){
    const a = (i/5) * Math.PI*2 + .4, h = (2.4 + (i%3)*.8) * s;
    P.push({ k:'box', x: x + Math.cos(a)*.9*s, y: (1.6*s + h/2), z: z + Math.sin(a)*.9*s,
      w:.5*s, h, d:1.5*s, c: i%2 ? C.leaf : C.leafDark, tag:'leaf', sway:i });
  }
}
function desk(d){
  const { x, z, color } = d;
  box(x, 3, z, 8, .35, 3.8, C.woodTop, 'desk');
  box(x-3.6, 1.5, z, .45, 3, 3.6, C.wood, 'desk');
  box(x+3.6, 1.5, z, .45, 3, 3.6, C.wood, 'desk');
  box(x, 4.1, z-1.9, 8.2, 1.9, .28, color, 'divider');
  monitor(x-1.3, 3.18, z-.6);
  lamp(x+3.05, 3.18, z-1);
  mug(x+1.6, 3.18, z+.9, color);
  chair(x-.4, z+2.8, 'n', C.black);
  box(x+2.6, 1.2, z+1.1, 2, 2.4, 2.6, C.blackSoft, 'drawers');
  box(x-3, 3.38, z+.8, 1.6, .2, 2, C.paper, 'paper');
  box(x+.4, 3.25, z-.2, .7, .06, .7, '#F5D96B', 'sticky');
  box(x+.9, 3.25, z+.1, .7, .06, .7, '#A7DCC0', 'sticky');
  matchbox(x+2.2, 3.3, z-.6, d.id === 'brand' ? 'pink' : 'black');
}

export function buildLayout(CFG){
  P.length = 0;
  const { hx, hz, wallH } = ROOM;

  // shell
  P.push({ k:'floor', x:0, y:0, z:0, w:hx*2, h:.1, d:hz*2, c:C.floor });
  box(0, wallH/2, -hz, hx*2, wallH, .5, C.wall, 'wall');
  box(-hx, wallH/2, 0, .5, wallH, hz*2, C.wallSide, 'wall');
  box(0, .3, -hz+.35, hx*2, .6, .7, C.skirt, 'wall');
  box(-hx+.35, .3, 0, .7, .6, hz*2, C.skirt, 'wall');

  win(-15.5, 6.6, -hz+.32, 9, 6, 'z');
  win( 15.5, 6.6, -hz+.32, 9, 6, 'z');
  win(-hx+.32, 6.6, 2, 8, 6.5, 'x');
  win(-hx+.32, 6.6, -8.5, 5, 6.5, 'x');

  rug(0, 4.5, 34, 16, C.rug);
  rug(0, -10.5, 14, 8, C.rugPink);

  // ── meeting room ──
  const mcx = (MEET.x0+MEET.x1)/2, mcz = (MEET.z0+MEET.z1)/2;
  glass(MEET.x1, 4, mcz, .16, 8, 11);
  glass(mcx+2.7, 4, MEET.z1, 7.5, 8, .16);
  sign(CFG.DROP_NAME, mcx+2.7, 5.9, MEET.z1+.14, 5.6, 1.4, 'z', C.black, 800);
  sign(CFG.DROP_SUB,  mcx+2.7, 4.7, MEET.z1+.14, 5.0, .8,  'z', C.pinkDeep, 600);
  sign('MEETING ROOM', mcx+2.7, 7.3, MEET.z1+.14, 3.4, .5, 'z', '#8A8590', 600);
  box(mcx, 2.9, mcz, 11, .35, 4.6, C.woodTop, 'table');
  box(mcx-3, 1.45, mcz, 1.1, 2.9, 1.1, C.metal, 'table');
  box(mcx+3, 1.45, mcz, 1.1, 2.9, 1.1, C.metal, 'table');
  SPOTS.meetSeats.slice(0,6).forEach((s,i) => chair(s.x, s.z, i < 3 ? 'n' : 's', C.black));
  box(mcx, 6.4, MEET.z0+.42, 9.4, 5, .2, C.blackSoft, 'board');
  box(mcx, 6.4, MEET.z0+.55, 9, 4.6, .1, C.paper, 'board');
  for (let i=0;i<4;i++) box(mcx-1.6+i*.3, 7.8-i*.9, MEET.z0+.62, 4.6-i*.7, .16, .06, '#8A8590', 'ink');
  box(mcx+2.4, 5.2, MEET.z0+.62, 2.2, .16, .06, C.pinkDeep, 'ink');

  // ── founder's corner office ──
  const fcx = (CORNER.x0+CORNER.x1)/2, fcz = (CORNER.z0+CORNER.z1)/2;
  glass(CORNER.x0, 4, fcz, .16, 8, 11);
  glass(fcx-2.7, 4, CORNER.z1, 7.5, 8, .16);
  box(fcx-2.7, 5.9, CORNER.z1+.04, 4.6, 1.3, .16, C.blackSoft, 'plate');
  sign(CFG.FOUNDER, fcx-2.7, 5.9, CORNER.z1+.15, 4.0, .92, 'z', C.pinkPale, 800);
  sign('CORNER OFFICE', fcx-2.7, 7.3, CORNER.z1+.14, 3.2, .46, 'z', '#8A8590', 600);
  box(fcx, 3, fcz-1, 8, .35, 3.6, C.woodTop, 'desk');
  box(fcx-3.6, 1.5, fcz-1, .5, 3, 3.4, C.wood, 'desk');
  box(fcx+3.6, 1.5, fcz-1, .5, 3, 3.4, C.wood, 'desk');
  chair(fcx, fcz-3.4, 's', C.black);
  monitor(fcx-1.4, 3.18, fcz-1.6);
  mug(fcx+1.9, 3.18, fcz-.4, C.pinkDeep);
  box(fcx+2.8, 3.3, fcz-1.6, 1.7, .28, 2.2, C.paper, 'paper');
  matchbox(fcx+.6, 3.3, fcz-.2, 'pink');
  lamp(fcx-3.1, 3.18, fcz-2.2);
  box(fcx+1, .75, CORNER.z1-2.4, 4.4, 1.5, 2.2, '#B98D93', 'sofa');
  box(fcx+1, 1.6, CORNER.z1-3.3, 4.4, 1.6, .6, '#A97D84', 'sofa');
  rug(fcx, fcz, 10, 8, '#D8C3AE');
  plant(CORNER.x1-2.2, CORNER.z0+2.6, 1.1);

  // ── reception wall: brand sign, pinboard, supplier map ──
  sign(CFG.COMPANY, 0, 9, -hz+.34, 14, 2.6, 'z', C.black, 800);
  sign(CFG.CITY + ' · SINCE 2026', 0, 7.4, -hz+.34, 6, .6, 'z', C.pinkDeep, 600);
  box(-5.4, 4.4, -hz+.28, 8, 5.2, .14, C.woodDark, 'pinboard');
  box(-5.4, 4.4, -hz+.37, 7.6, 4.8, .22, C.cork, 'pinboard');
  [C.pink,'#2B282E',C.pinkDeep,'#3A363D',C.pinkPale,'#201E24'].forEach((col,i) => {
    const px = -7.6 + (i%3)*2.2, py = 5.6 - Math.floor(i/3)*2.1;
    box(px, py, -hz+.5, 1.5, 1.5, .1, col, 'design');
    box(px, py-.45, -hz+.52, 1.5, .32, .12, i%2 ? C.pinkPale : C.pinkDeep, 'design');
  });
  [[-8.6,2.6,'#F5D96B'],[-2.6,2.5,'#A7DCC0'],[-8.2,7.1,'#F5B0C4']].forEach(([sx,sy,sc]) =>
    box(sx, sy, -hz+.5, .85, .85, .08, sc, 'sticky'));
  box(5.6, 4.4, -hz+.28, 6.8, 5.2, .14, C.blackSoft, 'map');
  box(5.6, 4.4, -hz+.37, 6.4, 4.8, .22, '#E7DAC6', 'map');
  sign('SIVAKASI', 5.6, 6.4, -hz+.5, 2.6, .5, 'z', '#6E6A70', 600);
  [[0,-1.4,1.6],[.3,-.8,2.2],[0,-.3,2.6],[-.2,.2,2.4],[-.1,.7,1.8],[.1,1.2,1.1]].forEach(([ox,oy,ow]) =>
    box(5.6+ox, 4.2+oy, -hz+.48, ow, .5, .08, '#CBBBA2', 'map'));
  [[5.0,3.3],[5.9,3.6],[6.4,3.1],[5.4,4.0],[6.0,2.9]].forEach(([px,py],i) =>
    box(px, py, -hz+.58, .24, .24, .3, i<2 ? C.pinkDeep : '#8A8590', 'pin'));
  box(0, .65, -12.4, 7, 1.3, 2.6, C.sofa, 'sofa');
  box(0, 1.55, -13.4, 7, 1.8, .7, C.sofaDark, 'sofa');
  box(0, 1.1, -9.6, 3.4, .3, 1.8, C.woodTop, 'table');
  matchbox(.4, 1.28, -9.6, 'black'); matchbox(-.6, 1.28, -9.4, 'pink');

  // ── desks ──
  DESKS.forEach(desk);

  // ── kitchen, breakout, printer, plants ──
  const kx = -hx + 1.6;
  box(kx, 1.5, 12, 3, 3, 8, C.wood, 'kitchen');
  box(kx, 3.1, 12, 3.3, .3, 8.4, C.counter, 'kitchen');
  box(kx, 8.6, 12, 3.2, 1.8, 8.2, C.woodDark, 'kitchen');
  box(kx, 4.15, 9.6, 1.6, 1.8, 1.6, '#33303A', 'coffee');
  box(kx+.1, 5.2, 9.6, 1.2, .5, 1.2, C.pinkDeep, 'coffee');
  mug(kx+.3, 3.28, 13.2, C.pinkPale); mug(kx+.3, 3.28, 14.3, C.counter);
  box(17, 1.3, -3, 3.4, 2.6, 2.6, '#D8D2C8', 'printer');
  box(17, 2.75, -3, 3.6, .5, 2.8, '#BDB6AB', 'printer');
  box(18.2, 2.2, -1.75, .22, .22, .1, '#62C285', 'printerLight');
  box(13, 3.1, 15, 4.4, .3, 4.4, C.woodTop, 'table');
  box(13, 1.5, 15, .6, 3, .6, C.metal, 'table');
  [[-3.2,0],[3.2,.4],[0,3.2]].forEach(([ox,oz]) => {
    box(13+ox, .95, 15+oz, 1.8, 1.9, 1.8, C.blackSoft, 'stool');
    box(13+ox, 1.95, 15+oz, 1.9, .25, 1.9, C.pinkDeep, 'stool');
  });
  matchbox(13.5, 3.3, 15, 'pink');
  box(19.4, 1.6, 14, 1.6, 3.2, 1.6, '#DCD6CC', 'cooler');
  box(19.4, 4.1, 14, 1.6, 1.8, 1.6, '#AFCBD4', 'cooler');
  box(4.5, 1.1, 15.5, 3, 2.2, 3, C.cork, 'crate');
  box(4.5, 3.3, 15.5, 3, 2.2, 3, C.cork, 'crate');
  box(4.5, 4.5, 15.5, 3.2, .3, 3.2, C.crate, 'crate');
  matchbox(4.5, 4.65, 15.5, 'pink');
  plant(-20.5, -3); plant(20.5, 6, 1.15); plant(7, 12.5, .9); plant(-6, 14.5, 1.05);

  // ceiling track + pendants
  box(0, 11.7, 4.5, 38, .18, .3, C.blackSoft, 'track');
  [-14,0,14].forEach(x => {
    box(x, 10.3, 4.5, .16, 2.6, .16, C.blackSoft, 'pendant');
    box(x, 8.6, 4.5, 2.3, .95, 2.3, '#33303A', 'pendantShade');
  });

  return P.slice();
}
