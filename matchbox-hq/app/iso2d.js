// ── 2D isometric renderer ───────────────────────────────────────────
// The fallback that always works: plain canvas, no WebGL, no GPU.
// Same layout data, same warm studio look.
import { DESKS } from './layout.js';

const COS = Math.cos(Math.PI/6);   // 0.866 — true 30° isometric
const BASE = 13;                   // pixels per world unit at zoom 1

const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const shadeCache = new Map();
function shade(hex, k){
  const key = hex + k;
  if (shadeCache.has(key)) return shadeCache.get(key);
  const [r,g,b] = hex2rgb(hex);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  const out = `rgb(${f(r)},${f(g)},${f(b)})`;
  shadeCache.set(key, out);
  return out;
}

export function createIso2D(canvas, prims, opts){
  const ctx = canvas.getContext('2d');
  const evening = !!opts.evening;
  const cam = { tx: 0, tz: 1, zoom: 1 };
  let W = 0, H = 0, u = BASE, ox = 0, oy = 0;

  // face brightness: light falls from up and to the right
  const TOP = evening ? .78 : 1.0, RIGHT = evening ? .60 : .84, FRONT = evening ? .44 : .66;
  const AMBIENT = evening ? .72 : 1;

  function layout(){
    W = canvas.width  = Math.floor(canvas.clientWidth  * Math.min(devicePixelRatio, 2));
    H = canvas.height = Math.floor(canvas.clientHeight * Math.min(devicePixelRatio, 2));
    ctx.setTransform(1,0,0,1,0,0);
  }
  function updateOrigin(){
    const dpr = Math.min(devicePixelRatio, 2);
    u = BASE * cam.zoom * dpr;
    ox = W/2 - (cam.tx - cam.tz) * COS * u;
    oy = H/2 - ((cam.tx + cam.tz) * .5 * u - 3 * u);
  }
  const sx = (x,z) => ox + (x - z) * COS * u;
  const sy = (x,y,z) => oy + (x + z) * .5 * u - y * u;

  // world point -> CSS pixels (for HTML speech bubbles)
  function project(x, y, z){
    const dpr = Math.min(devicePixelRatio, 2);
    return { x: sx(x,z) / dpr, y: sy(x,y,z) / dpr };
  }

  function quad(p){
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  function cuboid(o){
    const x0 = o.x - o.w/2, x1 = o.x + o.w/2;
    const z0 = o.z - o.d/2, z1 = o.z + o.d/2;
    const y0 = o.y - o.h/2, y1 = o.y + o.h/2;
    const c = o.c;
    // front face (+z)
    ctx.fillStyle = shade(c, FRONT * AMBIENT);
    quad([[sx(x0,z1), sy(x0,y1,z1)], [sx(x1,z1), sy(x1,y1,z1)],
          [sx(x1,z1), sy(x1,y0,z1)], [sx(x0,z1), sy(x0,y0,z1)]]);
    // right face (+x)
    ctx.fillStyle = shade(c, RIGHT * AMBIENT);
    quad([[sx(x1,z0), sy(x1,y1,z0)], [sx(x1,z1), sy(x1,y1,z1)],
          [sx(x1,z1), sy(x1,y0,z1)], [sx(x1,z0), sy(x1,y0,z0)]]);
    // top face
    ctx.fillStyle = shade(c, TOP * AMBIENT);
    quad([[sx(x0,z0), sy(x0,y1,z0)], [sx(x1,z0), sy(x1,y1,z0)],
          [sx(x1,z1), sy(x1,y1,z1)], [sx(x0,z1), sy(x0,y1,z1)]]);
  }

  function flat(o){   // rugs and the floor
    const x0 = o.x - o.w/2, x1 = o.x + o.w/2, z0 = o.z - o.d/2, z1 = o.z + o.d/2;
    ctx.fillStyle = shade(o.c, TOP * AMBIENT);
    quad([[sx(x0,z0), sy(x0,o.y,z0)], [sx(x1,z0), sy(x1,o.y,z0)],
          [sx(x1,z1), sy(x1,o.y,z1)], [sx(x0,z1), sy(x0,o.y,z1)]]);
  }

  function floorBoards(o){
    flat(o);
    ctx.strokeStyle = 'rgba(90,60,35,.16)';
    ctx.lineWidth = Math.max(1, u * .05);
    const x0 = o.x - o.w/2, x1 = o.x + o.w/2, z0 = o.z - o.d/2, z1 = o.z + o.d/2;
    for (let z = z0; z <= z1; z += 2){
      ctx.beginPath();
      ctx.moveTo(sx(x0,z), sy(x0,o.y,z)); ctx.lineTo(sx(x1,z), sy(x1,o.y,z));
      ctx.stroke();
    }
  }

  // text painted onto a wall, skewed to sit flat on the face
  function sign(o){
    const px = sx(o.x, o.z), py = sy(o.x, o.y, o.z);
    ctx.save();
    if (o.face === 'z') ctx.setTransform(COS*u, .5*u, 0, -u, px, py);
    else                ctx.setTransform(-COS*u, .5*u, 0, -u, px, py);
    const size = o.h * .78;
    ctx.font = `${o.weight} ${size}px Archivo, "Arial Black", system-ui, sans-serif`;
    ctx.fillStyle = evening ? shade(o.c, .85) : o.c;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.scale(1, 1);
    ctx.fillText(o.text, 0, 0);
    ctx.restore();
    ctx.setTransform(1,0,0,1,0,0);
  }

  function windowPane(o){
    const half = o.w/2, y0 = o.y - o.h/2, y1 = o.y + o.h/2;
    const pts = o.face === 'z'
      ? [[o.x-half, o.z], [o.x+half, o.z]]
      : [[o.x, o.z-half], [o.x, o.z+half]];
    const [a, bb] = pts;
    const g = ctx.createLinearGradient(0, sy(a[0],y1,a[1]), 0, sy(a[0],y0,a[1]));
    if (evening){ g.addColorStop(0,'#1B1B33'); g.addColorStop(.6,'#3A2A4A'); g.addColorStop(1,'#6B3E4E'); }
    else { g.addColorStop(0,'#BBD9EC'); g.addColorStop(.62,'#F2D9BC'); g.addColorStop(1,'#E9B98C'); }
    ctx.fillStyle = g;
    quad([[sx(a[0],a[1]), sy(a[0],y1,a[1])], [sx(bb[0],bb[1]), sy(bb[0],y1,bb[1])],
          [sx(bb[0],bb[1]), sy(bb[0],y0,bb[1])], [sx(a[0],a[1]), sy(a[0],y0,a[1])]]);
    if (evening){
      ctx.fillStyle = 'rgba(255,217,160,.85)';
      for (let i = 0; i < 26; i++){
        const t = Math.random(), yy = y0 + Math.random() * o.h * .55;
        const px = a[0] + (bb[0]-a[0])*t, pz = a[1] + (bb[1]-a[1])*t;
        ctx.fillRect(sx(px,pz), sy(px,yy,pz), Math.max(1,u*.08), Math.max(1,u*.12));
      }
    }
    // frame
    ctx.strokeStyle = '#3A363D'; ctx.lineWidth = Math.max(1.5, u*.16);
    ctx.beginPath();
    ctx.moveTo(sx(a[0],a[1]), sy(a[0],y1,a[1]));
    ctx.lineTo(sx(bb[0],bb[1]), sy(bb[0],y1,bb[1]));
    ctx.lineTo(sx(bb[0],bb[1]), sy(bb[0],y0,bb[1]));
    ctx.lineTo(sx(a[0],a[1]), sy(a[0],y0,a[1]));
    ctx.closePath(); ctx.stroke();
    const mx = (a[0]+bb[0])/2, mz = (a[1]+bb[1])/2;
    ctx.beginPath();
    ctx.moveTo(sx(mx,mz), sy(mx,y1,mz)); ctx.lineTo(sx(mx,mz), sy(mx,y0,mz)); ctx.stroke();
  }

  function glassPane(o){
    ctx.globalAlpha = .22;
    cuboid({ ...o, c:'#CFE6EA' });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#3A363D'; ctx.lineWidth = Math.max(1.2, u*.1);
    const x0=o.x-o.w/2, x1=o.x+o.w/2, z0=o.z-o.d/2, z1=o.z+o.d/2, y0=o.y-o.h/2, y1=o.y+o.h/2;
    ctx.beginPath();
    ctx.moveTo(sx(x0,z1), sy(x0,y1,z1)); ctx.lineTo(sx(x1,z0===z1?z1:z1), sy(x1,y1,z1));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx(x0,z1), sy(x0,y0,z1)); ctx.lineTo(sx(x1,z1), sy(x1,y0,z1));
    ctx.stroke();
  }

  // ── people ──
  function person(p, t){
    const bob = p.path.length ? Math.abs(Math.sin(p.bob)) * .22 : 0;
    const y = bob;
    const parts = [
      { x:p.x, y:y+1.5, z:p.z, w:1.5, h:3.0, d:1.1, c:p.shirt },       // torso
      { x:p.x, y:y+3.35,z:p.z, w:1.15,h:.7,  d:1.0, c:p.skin  },        // neck+face
      { x:p.x, y:y+4.0, z:p.z, w:1.3, h:.95, d:1.15,c:p.hair  },        // hair
      { x:p.x, y:y+2.6, z:p.z, w:1.9, h:.5,  d:1.2, c:p.color },        // collar in their colour
    ];
    parts.forEach(cuboid);
    // shadow
    ctx.fillStyle = 'rgba(60,40,30,.16)';
    quad([[sx(p.x-.7,p.z-.5), sy(p.x-.7,.02,p.z-.5)], [sx(p.x+.7,p.z-.5), sy(p.x+.7,.02,p.z-.5)],
          [sx(p.x+.7,p.z+.5), sy(p.x+.7,.02,p.z+.5)], [sx(p.x-.7,p.z+.5), sy(p.x-.7,.02,p.z+.5)]]);
  }

  // sort by each object's back-bottom corner. Using the front corner makes
  // the floor (huge) sort after the desks (small) and paint over them.
  const key = o => (o.x - (o.w||0)/2) + (o.z - (o.d||0)/2) + ((o.y||0) - (o.h||0)/2) * .9;
  const statics = prims.slice().sort((a,b) => key(a) - key(b));

  function render(people, t){
    updateOrigin();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = evening ? '#171520' : '#E8DCCB';
    ctx.fillRect(0,0,W,H);

    const dyn = people.map(p => ({ k:'person', p, x:p.x, y:1.5, z:p.z, w:1.2, h:3, d:.9 }));
    const all = statics.concat(dyn).sort((a,b) => key(a) - key(b));

    for (const o of all){
      switch (o.k){
        case 'floor':  floorBoards(o); break;
        case 'rug':    flat(o); break;
        case 'sign':   sign(o); break;
        case 'window': windowPane(o); break;
        case 'glass':  glassPane(o); break;
        case 'person': person(o.p, t); break;
        case 'box':
          if (o.tag === 'leaf'){
            const s = Math.sin(t * .5 + o.sway) * .12;
            cuboid({ ...o, x: o.x + s * .3 });
          } else cuboid(o);
          break;
      }
    }
  }

  function pick(cssX, cssY){
    let best = null, bestD = 1e9;
    for (const d of DESKS){
      const p = project(d.x, 3.2, d.z);
      const dist = Math.hypot(p.x - cssX, p.y - cssY);
      if (dist < bestD){ bestD = dist; best = d; }
    }
    return bestD < 46 * cam.zoom ? best : null;
  }

  function panBy(dx, dy){          // screen pixels -> world, inverse of the iso projection
    const U = BASE * cam.zoom;
    const a = dx / (COS * U), b = dy / (.5 * U);
    cam.tx -= (a + b) / 2;
    cam.tz -= (b - a) / 2;
  }
  layout();
  return { cam, render, project, pick, panBy, resize: layout, kind: '2D' };
}
