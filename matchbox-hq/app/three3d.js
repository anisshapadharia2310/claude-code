// ── WebGL renderer ──────────────────────────────────────────────────
// Same layout data as the 2D fallback, with real light and shadow.
import * as THREE from './three.module.min.js';
import { DESKS } from './layout.js';

export function createThree3D(canvas, prims, opts){
  const evening = !!opts.evening;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(evening ? 0x171520 : 0xE8DCCB);

  const camera = new THREE.OrthographicCamera(-1,1,1,-1, .1, 420);
  const cam = { tx:0, tz:1, zoom:1, azimuth: Math.PI/4, elevation:.62 };
  const RADIUS = 130;

  function applyCamera(){
    const F = 58 / cam.zoom;
    const a = Math.max(.35, canvas.clientWidth / canvas.clientHeight);
    camera.left = -F*a/2; camera.right = F*a/2; camera.top = F/2; camera.bottom = -F/2;
    const tgt = new THREE.Vector3(cam.tx, 3, cam.tz);
    camera.position.set(
      tgt.x + RADIUS * Math.cos(cam.elevation) * Math.cos(cam.azimuth),
      tgt.y + RADIUS * Math.sin(cam.elevation),
      tgt.z + RADIUS * Math.cos(cam.elevation) * Math.sin(cam.azimuth));
    camera.lookAt(tgt);
    camera.updateProjectionMatrix();
  }

  scene.add(new THREE.HemisphereLight(0xFFE6C8, 0x7A6250, evening ? .42 : .64));
  const key = new THREE.DirectionalLight(0xFFD2A0, evening ? .35 : 2.3);
  key.position.set(30, 32, 18); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left:-44, right:44, top:42, bottom:-36, near:1, far:170 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = .035; key.shadow.radius = 3;
  scene.add(key);
  const bounce = new THREE.DirectionalLight(evening ? 0xA892D8 : 0xFFC58A, evening ? .62 : .75);
  bounce.position.set(-30, 16, -24); scene.add(bounce);
  if (evening) [-14,0,14].forEach(x => {
    const p = new THREE.PointLight(0xFFC98A, 26, 34, 2); p.position.set(x, 8, 4.5); scene.add(p);
  });

  const BOX = new THREE.BoxGeometry(1,1,1);
  const matCache = new Map();
  const mat = (c, o={}) => {
    const k = c + JSON.stringify(o);
    if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color:c, roughness:.92, metalness:0, ...o }));
    return matCache.get(k);
  };

  function textTexture(o){
    const cv = document.createElement('canvas');
    const pxPerUnit = 90;
    cv.width = Math.max(64, Math.round(o.w * pxPerUnit));
    cv.height = Math.max(32, Math.round(o.h * pxPerUnit));
    const g = cv.getContext('2d');
    g.fillStyle = o.c;
    g.font = `${o.weight} ${Math.round(cv.height * .74)}px Archivo, "Arial Black", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(o.text, cv.width/2, cv.height/2);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  const leaves = [];
  const office = new THREE.Group(); scene.add(office);

  for (const o of prims){
    if (o.k === 'sign'){
      const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h),
        new THREE.MeshBasicMaterial({ map: textTexture(o), transparent:true }));
      m.position.set(o.x, o.y, o.z);
      if (o.face === 'x') m.rotation.y = Math.PI/2;
      office.add(m); continue;
    }
    if (o.k === 'window'){
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96;
      const g = cv.getContext('2d');
      const grad = g.createLinearGradient(0,0,0,96);
      if (evening){ grad.addColorStop(0,'#1B1B33'); grad.addColorStop(.6,'#3A2A4A'); grad.addColorStop(1,'#6B3E4E'); }
      else { grad.addColorStop(0,'#BBD9EC'); grad.addColorStop(.62,'#F2D9BC'); grad.addColorStop(1,'#E9B98C'); }
      g.fillStyle = grad; g.fillRect(0,0,64,96);
      if (evening){ for (let i=0;i<60;i++){ g.fillStyle='rgba(255,217,160,'+(.3+Math.random()*.6)+')';
        g.fillRect(Math.random()*64, 45+Math.random()*45, 2, 3); } }
      else { g.fillStyle='rgba(180,150,130,.45)'; for (let x=0;x<64;x+=9) g.fillRect(x, 66+(x*5%12), 7, 30); }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), new THREE.MeshBasicMaterial({ map:tex }));
      m.position.set(o.x, o.y, o.z);
      if (o.face === 'x') m.rotation.y = Math.PI/2;
      office.add(m);
      const f = new THREE.Mesh(BOX, mat('#3A363D'));
      f.scale.set(o.face === 'x' ? .3 : o.w+.6, o.h+.6, o.face === 'x' ? o.w+.6 : .3);
      f.position.set(o.x, o.y, o.z);
      office.add(f); continue;
    }
    const isGlass = o.k === 'glass';
    const m = new THREE.Mesh(BOX, isGlass
      ? new THREE.MeshStandardMaterial({ color:o.c, transparent:true, opacity:.17, roughness:.05 })
      : mat(o.c));
    m.scale.set(o.w, o.h, o.d);
    m.position.set(o.x, o.y, o.z);
    m.castShadow = !isGlass && o.k !== 'floor' && o.k !== 'rug';
    m.receiveShadow = true;
    if (o.tag === 'leaf'){ m.userData.sway = o.sway; leaves.push(m); }
    if (o.k === 'floor' || o.k === 'rug') m.castShadow = false;
    office.add(m);
  }

  // people
  const peopleGroups = new Map();
  function personGroup(p){
    const g = new THREE.Group();
    const add = (w,h,d,y,c) => { const m = new THREE.Mesh(BOX, mat(c)); m.scale.set(w,h,d); m.position.y = y;
      m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(1.5, 3.0, 1.1, 1.5, p.shirt);
    add(1.9, .5, 1.2, 2.6, p.color);
    add(1.15, .7, 1.0, 3.35, p.skin);
    add(1.3, .95, 1.15, 4.0, p.hair);
    scene.add(g);
    return g;
  }

  function render(people, t){
    for (const p of people){
      let g = peopleGroups.get(p.id);
      if (!g){ g = personGroup(p); peopleGroups.set(p.id, g); }
      const bob = p.path.length ? Math.abs(Math.sin(p.bob)) * .22 : 0;
      g.position.set(p.x, bob, p.z);
      g.rotation.y = p.facing === 'e' ? -Math.PI/2 : p.facing === 'w' ? Math.PI/2 : p.facing === 's' ? Math.PI : 0;
    }
    leaves.forEach(l => { l.rotation.x = Math.sin(t * .5 + l.userData.sway) * .05; });
    applyCamera();
    renderer.render(scene, camera);
  }

  function project(x, y, z){
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: (v.x * .5 + .5) * canvas.clientWidth, y: (-v.y * .5 + .5) * canvas.clientHeight };
  }
  function pick(cssX, cssY){
    let best = null, bestD = 1e9;
    for (const d of DESKS){
      const p = project(d.x, 3.2, d.z);
      const dist = Math.hypot(p.x - cssX, p.y - cssY);
      if (dist < bestD){ bestD = dist; best = d; }
    }
    return bestD < 56 * cam.zoom ? best : null;
  }
  function resize(){
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    applyCamera();
  }
  function panBy(dx, dy){
    const f = (58 / cam.zoom) / Math.max(1, canvas.clientHeight) * 1.6;
    const rx = -Math.sin(cam.azimuth), rz = Math.cos(cam.azimuth);
    const fx =  Math.cos(cam.azimuth), fz = Math.sin(cam.azimuth);
    cam.tx -= (rx * dx + fx * dy) * f;
    cam.tz -= (rz * dx + fz * dy) * f;
  }
  resize();
  return { cam, render, project, pick, panBy, resize, kind:'3D' };
}
