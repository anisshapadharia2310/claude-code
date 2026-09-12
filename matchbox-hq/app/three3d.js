// ── WebGL renderer ──────────────────────────────────────────────────
// Physically-based materials, procedural textures, image-based lighting.
import * as THREE from './three.module.min.js';
import { DESKS } from './layout.js';
import { woodMap, woodRough, floorMap, corkMap, juteMap, leopardMap,
         plasterMap, leatherMap, clippingsMap, amberMap, checkerMap, artMap, mapleMap } from './textures.js';

const hex = h => { const n = parseInt(String(h).replace('#',''), 16);
  return [(n>>16)&255, (n>>8)&255, n&255]; };
// a texture already carries its own colour, so tint only by the ratio
// between the colour asked for and the texture's base — otherwise the
// map multiplies the colour twice and everything goes muddy.
function tintFor(target, base){
  const t = hex(target), b = hex(base);
  const c = new THREE.Color();
  c.setRGB(Math.min(1, t[0]/b[0]), Math.min(1, t[1]/b[1]), Math.min(1, t[2]/b[2]));
  return c;
}
const BASE = { wood:'#B8804A', floor:'#BE8850', cork:'#C39A63',
               jute:'#C0AE88', leopard:'#D8B375', leather:'#A8703F' };

const WOOD  = new Set(['kitchen','shelf','crate','board','counter']);
const MAPLE = new Set(['desk','table','stool','drawers']);

export function createThree3D(canvas, prims, opts){
  const evening = !!opts.evening;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = evening ? .92 : .95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(evening ? 0x100E14 : 0xA1937C);

  // ── image-based lighting, built from a procedural room ────────────
  (function environment(){
    const env = new THREE.Scene();
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 64;
    const g = cv.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 64);
    if (evening){ grd.addColorStop(0,'#2A2434'); grd.addColorStop(.6,'#3D3040'); grd.addColorStop(1,'#1A1620'); }
    else { grd.addColorStop(0,'#F0E4CE'); grd.addColorStop(.55,'#E4CEA6'); grd.addColorStop(1,'#7A6244'); }
    g.fillStyle = grd; g.fillRect(0,0,8,64);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(120,120,120),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
    env.add(shell);
    // the windows, as the bright source things actually reflect
    const glow = new THREE.MeshBasicMaterial({ color: evening ? 0x53406A : 0xFFE7C4 });
    [[-40, 12, -58], [30, 12, -58], [-58, 12, 6]].forEach(([x,y,z]) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(46, 26), glow);
      p.position.set(x,y,z);
      if (x === -58) p.rotation.y = Math.PI/2;
      env.add(p);
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromScene(env, .03).texture;
    scene.environmentIntensity = evening ? .35 : .55;
  })();

  const camera = new THREE.OrthographicCamera(-1,1,1,-1, .1, 420);
  const cam = { tx:0, tz:2, zoom:1, azimuth: Math.PI/4, elevation:.56 };
  const RADIUS = 130;
  function applyCamera(){
    const F = 48 / cam.zoom;
    const a = Math.max(.35, canvas.clientWidth / canvas.clientHeight);
    camera.left = -F*a/2; camera.right = F*a/2; camera.top = F/2; camera.bottom = -F/2;
    const t = new THREE.Vector3(cam.tx, 3, cam.tz);
    camera.position.set(
      t.x + RADIUS * Math.cos(cam.elevation) * Math.cos(cam.azimuth),
      t.y + RADIUS * Math.sin(cam.elevation),
      t.z + RADIUS * Math.cos(cam.elevation) * Math.sin(cam.azimuth));
    camera.lookAt(t); camera.updateProjectionMatrix();
  }

  // ── light: low afternoon sun through the black-frame windows ──────
  scene.add(new THREE.HemisphereLight(0xFFE0BC, 0x4A3C2A, evening ? .16 : .22));
  const sun = new THREE.DirectionalLight(evening ? 0x6A5A8C : 0xFFBE78, evening ? .28 : 3.6);
  sun.position.set(34, 26, 14); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left:-46, right:46, top:44, bottom:-38, near:1, far:180 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(evening ? 0x9B84C4 : 0xE8C49A, evening ? .42 : .3);
  fill.position.set(-28, 18, -22); scene.add(fill);
  if (evening) [[-14,4.5],[0,4.5],[14,4.5],[-3.5,-8.2],[19.2,11.5]].forEach(([x,z]) => {
    const p = new THREE.PointLight(0xFFC07A, 22, 32, 2); p.position.set(x, 7.6, z); scene.add(p);
  });

  const BOX = new THREE.BoxGeometry(1,1,1);
  const cache = new Map();
  function physical(key, opts){
    if (!cache.has(key)) cache.set(key, new THREE.MeshPhysicalMaterial(opts));
    return cache.get(key);
  }

  function materialFor(o){
    const t = o.tag || '', k = o.k;
    if (k === 'floor')
      return physical('floor', { map: floorMap(), roughness:.42, metalness:0,
        clearcoat:.35, clearcoatRoughness:.42, envMapIntensity:.55 });
    if (k === 'rug'){
      if (o.tex === 'leopard') return physical('leopard', { map: leopardMap(), roughness:.98 });
      if (o.tex === 'checker') return physical('checker', { map: checkerMap(), roughness:1 });
      return physical('jute'+o.c, { map: juteMap(), color: tintFor(o.c, BASE.jute), roughness:1 });
    }
    if (k === 'art') return physical('art'+o.seed, { map: artMap(o.seed), roughness:.85 });
    if (k === 'saucer') return physical('brass'+o.c, { color:o.c, roughness:.22, metalness:.95,
      envMapIntensity:1.8, clearcoat:.4 });
    if (k === 'chrome') return physical('chrome', { color:0xE8E4DA, roughness:.06, metalness:1,
      envMapIntensity:2.2, emissive:0xFFD9A0, emissiveIntensity: evening ? 1.4 : .35 });
    if (k === 'amber')
      return physical('amberStriped', { map: amberMap(), transparent:true, opacity:.6, roughness:.12,
        metalness:0, transmission:.5, thickness:.6, ior:1.5, envMapIntensity:1.4 });
    if (k === 'glass')
      return physical('glass', { color:0xD9C8A8, transparent:true, opacity:.14, roughness:.03,
        metalness:0, envMapIntensity:1.6 });
    if (k === 'bulb') return physical('bulb', { color:0xFFE3B0,
      emissive:0xFFD9A0, emissiveIntensity: evening ? 2.6 : .7, roughness:.4 });
    if (k === 'dome' || k === 'cone' || t === 'pendantShade' || t === 'coneshade')
      return physical('lac'+o.c, { color:o.c, roughness:.16, metalness:.05,
        clearcoat:.9, clearcoatRoughness:.08, envMapIntensity:1.2, side:THREE.DoubleSide });
    if (k === 'pipe' || t === 'pipe')
      return physical('pipe', { color:0x8C877D, roughness:.38, metalness:.85, envMapIntensity:1.1 });
    if (t === 'plaster' || t === 'wall' || t === 'skirt')
      return physical('plaster'+o.c, { map: plasterMap(o.c), roughness:.92, metalness:0, envMapIntensity:.4 });
    if (t === 'pinboard')
      return physical('cork'+o.c, { map: o.c === '#C39A63' ? clippingsMap() : corkMap(),
        color: tintFor(o.c, BASE.cork), roughness:.95 });
    if (t === 'sofa')
      return physical('leather'+o.c, { map: leatherMap(), color: tintFor(o.c, BASE.leather),
        roughness:.46, clearcoat:.3, clearcoatRoughness:.5, envMapIntensity:.8 });
    if (MAPLE.has(t))
      return physical('maple'+o.c, { map: mapleMap(), roughnessMap: woodRough(),
        color: tintFor(o.c, '#D6BC92'), roughness:.55, clearcoat:.35,
        clearcoatRoughness:.3, envMapIntensity:.6 });
    if (WOOD.has(t))
      return physical('wood'+o.c, { map: woodMap(), roughnessMap: woodRough(),
        color: tintFor(o.c, BASE.wood), roughness:.62, clearcoat:.3,
        clearcoatRoughness:.35, envMapIntensity:.55 });
    if (t === 'screen')
      return physical('screen', { color:0x1A2422, roughness:.12, metalness:.2,
        emissive:0x13312F, emissiveIntensity: evening ? .7 : .35, envMapIntensity:1.4 });
    if (t === 'mon' || t === 'chair' || t === 'blackSoft')
      return physical('soft'+o.c, { color:o.c, roughness:.5, metalness:.15, envMapIntensity:.7 });
    if (t === 'lamp' || t === 'metal')
      return physical('metal'+o.c, { color:o.c, roughness:.3, metalness:.8, envMapIntensity:1 });
    return physical('std'+o.c, { color:o.c, roughness:.78, metalness:.02, envMapIntensity:.5 });
  }

  function textTexture(o){
    const cv = document.createElement('canvas');
    cv.width = Math.max(64, Math.round(o.w * 90)); cv.height = Math.max(32, Math.round(o.h * 90));
    const g = cv.getContext('2d');
    g.fillStyle = o.c;
    g.font = `${o.weight} ${Math.round(cv.height*.74)}px Archivo, "Arial Black", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(o.text, cv.width/2, cv.height/2);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  const leaves = [];
  const office = new THREE.Group(); scene.add(office);

  for (const o of prims){
    let m;
    if (o.k === 'sign'){
      m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h),
        new THREE.MeshBasicMaterial({ map: textTexture(o), transparent:true }));
      m.position.set(o.x, o.y, o.z);
      if (o.face === 'x') m.rotation.y = Math.PI/2;
      office.add(m); continue;
    }
    if (o.k === 'window'){
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96;
      const g = cv.getContext('2d');
      const gr = g.createLinearGradient(0,0,0,96);
      if (evening){ gr.addColorStop(0,'#171A33'); gr.addColorStop(.6,'#3A2A46'); gr.addColorStop(1,'#6B3E4E'); }
      else { gr.addColorStop(0,'#AFCDE4'); gr.addColorStop(.6,'#F2DCBC'); gr.addColorStop(1,'#E0A76F'); }
      g.fillStyle = gr; g.fillRect(0,0,64,96);
      if (evening){ for (let i=0;i<70;i++){ g.fillStyle='rgba(255,210,150,'+(.3+Math.random()*.6)+')';
        g.fillRect(Math.random()*64, 44+Math.random()*46, 2, 3); } }
      else { g.fillStyle='rgba(150,128,104,.4)'; for (let x=0;x<64;x+=9) g.fillRect(x, 64+(x*5%14), 7, 32); }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), new THREE.MeshBasicMaterial({ map:tex }));
      m.position.set(o.x, o.y, o.z);
      if (o.face === 'x') m.rotation.y = Math.PI/2;
      office.add(m);
      // slim black frame, the loft detail
      const frameMat = physical('frame', { color:0x1E1C1A, roughness:.35, metalness:.6, envMapIntensity:.9 });
      const mk = (w,h,d,x,y,z) => { const f = new THREE.Mesh(BOX, frameMat);
        f.scale.set(w,h,d); f.position.set(x,y,z); f.castShadow = true; office.add(f); };
      const ax = o.face === 'x';
      const W = ax ? .26 : o.w + .5, D = ax ? o.w + .5 : .26;
      mk(W, .26, D, o.x, o.y + o.h/2, o.z);
      mk(W, .26, D, o.x, o.y - o.h/2, o.z);
      mk(ax ? .26 : .26, o.h, ax ? .26 : .26, o.x + (ax?0:-o.w/2), o.y, o.z + (ax?-o.w/2:0));
      mk(.26, o.h, .26, o.x + (ax?0:o.w/2), o.y, o.z + (ax?o.w/2:0));
      // multi-pane grid
      for (let i = 1; i <= 2; i++){
        const f = -o.w/2 + (o.w * i / 3);
        mk(ax ? .16 : .16, o.h, ax ? .16 : .16, o.x + (ax ? 0 : f), o.y, o.z + (ax ? f : 0));
      }
      for (let j = 1; j <= 2; j++){
        const f = -o.h/2 + (o.h * j / 3);
        mk(ax ? .16 : o.w, .16, ax ? o.w : .16, o.x, o.y + f, o.z);
      }
      continue;
    }
    let geo = BOX, sx = o.w, sy = o.h, sz = o.d;
    if (o.k === 'pipe' && o.d > o.h){ geo = new THREE.CylinderGeometry(.5,.5,1,14); sy = o.d; }
    else if (o.k === 'pipe'){ geo = new THREE.CylinderGeometry(.5,.5,1,14); }
    else if (o.k === 'bulb') geo = new THREE.SphereGeometry(.5, 14, 10);
    else if (o.k === 'cone') geo = new THREE.ConeGeometry(.5, 1, 20, 1, true);
    else if (o.k === 'dome') geo = new THREE.SphereGeometry(.5, 22, 12, 0, Math.PI*2, 0, Math.PI/2);
    else if (o.k === 'saucer') geo = new THREE.CylinderGeometry(.5, .42, 1, 28);
    else if (o.k === 'chrome') geo = new THREE.SphereGeometry(.5, 18, 14);
    else if (o.k === 'art'){
      geo = new THREE.PlaneGeometry(o.w, o.h); sx = sy = sz = 1;
    }
    m = new THREE.Mesh(geo, materialFor(o));
    m.scale.set(sx, sy, sz);
    m.position.set(o.x, o.y, o.z);
    if (o.k === 'pipe' && o.d > o.h) m.rotation.x = Math.PI/2;
    if (o.k === 'art' && o.face === 'x') m.rotation.y = Math.PI/2;
    if (o.k === 'dome') m.rotation.x = Math.PI;
    m.castShadow = !['floor','rug','glass','amber','bulb','art','chrome'].includes(o.k);
    m.receiveShadow = !['bulb'].includes(o.k);
    if (o.tag === 'leaf'){ m.userData.sway = o.sway; leaves.push(m); }
    office.add(m);
  }

  // ── people ──
  const groups = new Map();
  function personGroup(p){
    const g = new THREE.Group();
    const add = (w,h,d,y,c,r) => { const mm = new THREE.Mesh(BOX,
      physical('ppl'+c+(r||''), { color:c, roughness:r ?? .72, metalness:.02, envMapIntensity:.6 }));
      mm.scale.set(w,h,d); mm.position.y = y; mm.castShadow = true; mm.receiveShadow = true; g.add(mm); return mm; };
    add(1.5, 3.0, 1.1, 1.5, p.shirt);
    add(1.9, .5, 1.2, 2.6, p.color, .45);
    add(1.15, .7, 1.0, 3.35, p.skin, .68);
    add(1.3, .95, 1.15, 4.0, p.hair, .85);
    scene.add(g); return g;
  }
  function render(people, t){
    for (const p of people){
      let g = groups.get(p.id);
      if (!g){ g = personGroup(p); groups.set(p.id, g); }
      const bob = p.path.length ? Math.abs(Math.sin(p.bob)) * .22 : 0;
      g.position.set(p.x, bob, p.z);
      g.rotation.y = p.facing === 'e' ? -Math.PI/2 : p.facing === 'w' ? Math.PI/2 : p.facing === 's' ? Math.PI : 0;
    }
    leaves.forEach(l => { l.rotation.x = Math.sin(t*.5 + l.userData.sway) * .05; });
    applyCamera();
    renderer.render(scene, camera);
  }
  function project(x,y,z){
    const v = new THREE.Vector3(x,y,z).project(camera);
    return { x:(v.x*.5+.5)*canvas.clientWidth, y:(-v.y*.5+.5)*canvas.clientHeight };
  }
  function pick(cx, cy){
    let best = null, bd = 1e9;
    for (const d of DESKS){ const p = project(d.x, 3.2, d.z);
      const dist = Math.hypot(p.x-cx, p.y-cy); if (dist < bd){ bd = dist; best = d; } }
    return bd < 56 * cam.zoom ? best : null;
  }
  function panBy(dx, dy){
    const f = (48 / cam.zoom) / Math.max(1, canvas.clientHeight) * 1.6;
    cam.tx -= (-Math.sin(cam.azimuth) * dx + Math.cos(cam.azimuth) * dy) * f;
    cam.tz -= ( Math.cos(cam.azimuth) * dx + Math.sin(cam.azimuth) * dy) * f;
  }
  function resize(){ renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); applyCamera(); }
  resize();
  return { cam, render, project, pick, panBy, resize, kind:"3D", scene, renderer };
}
