// ── The office, as DATA ─────────────────────────────────────────────
// Both renderers (WebGL and 2D canvas) read this same list, so the
// 3D office and the 2D fallback can never drift apart.
// 70s loft: olive and mustard plaster, honey wood, amber glass, cork,
// jute, tan leather, grey plaster and exposed pipes in one corner.
export const C = {
  floor:'#B8804A', floorAlt:'#C08D55',
  wall:'#565C38',            // olive plaster, back wall
  wallSide:'#9C7328',        // mustard plaster, left wall
  wallGrey:'#827D74',        // grey plaster, the pipe corner
  skirt:'#4A4632',
  wood:'#C9A86F', woodDark:'#8E6134', woodTop:'#D9C09A', cork:'#C39A63',
  maple:'#D9C09A',
  black:'#1E1C1A', blackSoft:'#2B2724', metal:'#6E6A63', pipe:'#7C776E',
  pink:'#F08AAE', pinkDeep:'#C8506F', pinkPale:'#F2CBD6',
  mustard:'#C8963E', olive:'#6E7A4A', rust:'#A85A32',
  leaf:'#5F8A55', leafDark:'#4A6E44', pot:'#A8703F',
  glass:'#C8862E',           // amber glass dividers
  paper:'#F2E9D8', screen:'#1A2422',
  sofa:'#A8703F', sofaDark:'#8E5A30',   // tan leather
  rug:'#C0AE88', rugPink:'#D8B375',     // jute, and the leopard corner
  counter:'#E4D9C4', crate:'#A8823F',
  lampRed:'#C4452E', lampWhite:'#EFE7D8',
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

function coneLamp(x, z, shade){
  box(x, .12, z, 2.2, .24, 2.2, C.blackSoft, 'lamp');
  box(x, 3.4, z, .22, 6.4, .22, C.metal, 'lamp');
  P.push({ k:'cone', x, y:7.2, z, w:2.6, h:2.2, d:2.6, c:shade, tag:'coneshade' });
  P.push({ k:'bulb', x, y:6.5, z, w:.6, h:.6, d:.6, c:'#FFD9A0', tag:'bulb' });
}

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
  box(x, 4.1, z-1.9, 8.2, 1.9, .22, color, 'dividerpost');
  P.push({ k:'amber', x, y:5.6, z:z-1.9, w:8.2, h:2.6, d:.14, c:C.glass, tag:'divider' });
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
  box(0, .3, -hz+.35, hx*2, .6, .7, C.skirt, 'skirt');
  box(-hx+.35, .3, 0, .7, .6, hz*2, C.skirt, 'skirt');

  win(-15.5, 6.6, -hz+.32, 9, 6, 'z');
  win( 15.5, 6.6, -hz+.32, 9, 6, 'z');
  win(-hx+.32, 6.6, 2, 8, 6.5, 'x');
  win(-hx+.32, 6.6, -8.5, 5, 6.5, 'x');

  P.push({ k:'rug', x:0, y:.03, z:4.5, w:34, h:.06, d:16, c:C.rug, tex:'checker' });
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

  // framed canvases
  P.push({ k:'art', seed:0, x:-hx+.42, y:7.2, z:-1.5, w:5.2, h:6.2, d:.12, c:'#8E9A5B', face:'x' });
  box(-hx+.3, 7.2, -1.5, .2, 6.8, 5.8, '#2B2724', 'frame');
  P.push({ k:'art', seed:1, x:-hx+.42, y:7, z:8.5, w:4.6, h:5.6, d:.12, c:'#D8C7A0', face:'x' });
  box(-hx+.3, 7, 8.5, .2, 6.2, 5.2, '#2B2724', 'frame');
  P.push({ k:'art', seed:2, x:17.5, y:7.4, z:-hz+.42, w:4.4, h:5.2, d:.12, c:'#C9784A', face:'z' });
  box(17.5, 7.4, -hz+.3, 5, 5.8, .2, '#2B2724', 'frame');

  // speaker on cinder blocks (reference 01)
  for (const [dz, by] of [[-1.1, 1], [1.1, 1], [-1.1, 2.85], [1.1, 2.85]])
    box(19, by, 3.4 + dz, 3.2, 1.75, 2.0, '#B9B3A6', 'block');
  box(19, 5.6, 3.4, 4.0, 3.6, 3.2, '#E8E2D4', 'speaker');
  P.push({ k:'cone', x:19, y:5.6, z:5.1, w:2.2, h:.45, d:2.2, c:'#2B2724', tag:'driver' });

  // grey plaster corner with exposed pipes (front-left of the open floor)
  box(-hx+.9, 6, 13.5, .6, 12, 7, C.wallGrey, 'plaster');
  for (const [py, pz] of [[9.2, 11.2],[9.9, 11.2]])
    P.push({ k:'pipe', x:-hx+1.5, y:py, z:pz, w:.5, h:.5, d:7.5, c:C.pipe, tag:'pipe' });
  P.push({ k:'pipe', x:-hx+1.5, y:6.5, z:15.4, w:.42, h:6, d:.42, c:C.pipe, tag:'pipe' });

  // record shelf + books, against the right-hand open edge
  box(20.6, 3.2, -.5, 1.8, 6.4, 9, C.woodDark, 'shelf');
  for (let r = 0; r < 3; r++)
    box(20.6, 1.2 + r*2.1, -.5, 1.9, .22, 9, C.wood, 'shelf');
  const spines = [C.mustard, C.rust, C.olive, '#D8C7A0', C.pinkDeep, '#3E5A6E'];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 14; i++)
      box(20.6, 2.1 + r*2.1, -4.4 + i*.62, 1.5, 1.6, .5,
          spines[(i + r*3) % spines.length], 'book');

  // cone floor lamps
  coneLamp(-3.5, -8.2, C.lampRed);
  coneLamp(19.2, 11.5, C.lampWhite);

  // leopard rug, one corner only
  P.push({ k:'rug', x:-14.5, y:.04, z:13.2, w:9, h:.06, d:6.5, c:C.rugPink, tex:'leopard' });

  // ceiling track + pendants
  box(0, 11.7, 4.5, 38, .18, .3, C.blackSoft, 'track');
  [-14, 0, 14].forEach(x => {
    box(x, 10.6, 4.5, .1, 2.2, .1, C.blackSoft, 'pendant');
    P.push({ k:'saucer', x, y:9.3, z:4.5, w:4.2, h:.42, d:4.2, c:'#B08D4F', tag:'saucer' });
    P.push({ k:'saucer', x, y:9.05, z:4.5, w:2.6, h:.3, d:2.6, c:'#C9A463', tag:'saucer' });
    P.push({ k:'chrome', x, y:8.55, z:4.5, w:.85, h:.85, d:.85, c:'#D8D2C6', tag:'chrome' });
  });

  return P.slice();
}
