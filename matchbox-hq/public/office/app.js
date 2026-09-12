// ── Matchbox HQ · camera, light, controls, UI ───────────────────────
import { THREE, CONFIG, C } from './build.js';
import { buildOffice, pendants, PODS } from './scene.js';

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

// evening after 7pm local — or forced with the toggle
const hour = new Date().getHours();
const forcedTime = new URL(location.href).searchParams.get('time');
const evening = forcedTime ? forcedTime === 'evening'
                           : (hour >= CONFIG.EVENING_FROM_HOUR || hour < 6);

scene.background = new THREE.Color(evening ? 0x171520 : 0xE8DCCB);
scene.fog = new THREE.Fog(evening ? 0x171520 : 0xE8DCCB, 90, 190);

// ── camera rig: true isometric, orthographic ────────────────────────
const camera = new THREE.OrthographicCamera(-1,1,1,-1, .1, 400);
const view = { target: new THREE.Vector3(0,2,1), zoom: 1, azimuth: Math.PI/4, elevation: .62 };
const want = { target: view.target.clone(), zoom: 1, azimuth: view.azimuth, elevation: view.elevation };
const RADIUS = 120;

function applyCamera(){
  const F = 52 / view.zoom;
  const a = canvas.clientWidth / canvas.clientHeight;
  camera.left = -F*a/2; camera.right = F*a/2; camera.top = F/2; camera.bottom = -F/2;
  camera.position.set(
    view.target.x + RADIUS * Math.cos(view.elevation) * Math.cos(view.azimuth),
    view.target.y + RADIUS * Math.sin(view.elevation),
    view.target.z + RADIUS * Math.cos(view.elevation) * Math.sin(view.azimuth));
  camera.lookAt(view.target);
  camera.updateProjectionMatrix();
}

// ── light: late afternoon, warm ─────────────────────────────────────
const hemi = new THREE.HemisphereLight(0xFFE6C8, 0x7A6250, evening ? .40 : .62);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xFFD2A0, evening ? .35 : 2.3);
key.position.set(30, 30, 16);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -42; key.shadow.camera.right = 42;
key.shadow.camera.top = 40; key.shadow.camera.bottom = -34;
key.shadow.camera.near = 1; key.shadow.camera.far = 160;
key.shadow.bias = -0.0004; key.shadow.normalBias = .035;
key.shadow.radius = 3;
scene.add(key);
scene.add(key.target);

// bounce from the windows behind, so nothing goes flat black
const bounce = new THREE.DirectionalLight(evening ? 0xA892D8 : 0xFFC58A, evening ? .62 : .75);
bounce.position.set(-30, 16, -24);
scene.add(bounce);

// ── build it ────────────────────────────────────────────────────────
const office = buildOffice(scene, evening);
const lights = pendants(office, evening);

// warm pools of light in the evening
const pointLights = [];
if (evening) {
  lights.forEach(l => {
    const p = new THREE.PointLight(0xFFC98A, 26, 34, 2);
    p.position.set(l.group.position.x, 8, l.group.position.z);
    scene.add(p); pointLights.push(p);
  });
}

// ── controls: drag to pan, wheel to zoom, drag-right to turn ────────
let dragging = null, lastX = 0, lastY = 0;
const PAN = 0.055;

function panBy(dx, dy){
  const f = PAN / view.zoom * 52 / 52;
  const right = new THREE.Vector3(Math.sin(view.azimuth) * -1, 0, Math.cos(view.azimuth));
  const fwd = new THREE.Vector3(Math.cos(view.azimuth), 0, Math.sin(view.azimuth));
  want.target.addScaledVector(right, dx * f * 2.2);
  want.target.addScaledVector(fwd, dy * f * 2.2);
  want.target.x = THREE.MathUtils.clamp(want.target.x, -34, 34);
  want.target.z = THREE.MathUtils.clamp(want.target.z, -28, 28);
}

canvas.addEventListener('pointerdown', e => {
  dragging = (e.button === 2 || e.shiftKey) ? 'turn' : 'pan';
  lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) { hoverTest(e); return; }
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  if (dragging === 'turn'){
    want.azimuth += dx * .006;
    want.elevation = THREE.MathUtils.clamp(want.elevation - dy * .004, .28, 1.25);
  } else panBy(-dx, -dy);
});
addEventListener('pointerup', e => { dragging = null; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  want.zoom = THREE.MathUtils.clamp(want.zoom * (e.deltaY > 0 ? .9 : 1.11), .55, 4.5);
}, { passive:false });

// touch pinch
let pinch = 0;
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 2) pinch = Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
}, { passive:true });
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && pinch){
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    want.zoom = THREE.MathUtils.clamp(want.zoom * (d / pinch), .55, 4.5);
    pinch = d;
  }
}, { passive:true });

// ── hover + double-click a pod ──────────────────────────────────────
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const tip = document.getElementById('tip');

function podAt(e){
  const r = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(office.children, true);
  for (const h of hits){
    let o = h.object;
    while (o) { if (o.userData && o.userData.pod) return o.userData.pod; o = o.parent; }
  }
  return null;
}
function hoverTest(e){
  const pod = podAt(e);
  if (pod){
    tip.hidden = false;
    tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px';
    tip.innerHTML = '<b>' + pod.name + '</b><span>double-click to zoom in</span>';
    canvas.style.cursor = 'pointer';
  } else { tip.hidden = true; canvas.style.cursor = 'grab'; }
}
canvas.addEventListener('dblclick', e => {
  const pod = podAt(e);
  if (!pod) return;
  want.target.set(pod.x, 2.5, pod.z);
  want.zoom = 2.9;
  document.getElementById('escHint').hidden = false;
});
addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    want.target.set(0, 2, 1); want.zoom = 1;
    want.azimuth = Math.PI/4; want.elevation = .62;
    document.getElementById('escHint').hidden = true;
  }
});

// ── subtle life ─────────────────────────────────────────────────────
const plants = [];
office.traverse(o => { if (o.userData && o.userData.isPlant) plants.push(o); });
let printerLight = null;
office.traverse(o => { if (o.name === 'printerLight') printerLight = o; });

const clock = new THREE.Clock();
function tick(){
  const t = clock.getElapsedTime();
  // ease camera
  view.target.lerp(want.target, .12);
  view.zoom += (want.zoom - view.zoom) * .12;
  view.azimuth += (want.azimuth - view.azimuth) * .12;
  view.elevation += (want.elevation - view.elevation) * .12;
  applyCamera();
  // plants breathe
  plants.forEach((p, i) => p.children.forEach((leaf, j) => {
    if (!leaf.userData.sway) return;
    leaf.rotation.x = leaf.userData.sway.base + Math.sin(t * .5 + i + j * .7) * .035;
  }));
  // printer ticks over
  if (printerLight) printerLight.material.color.setHex(
    Math.sin(t * 1.1) > .6 ? 0xF0A63C : 0x62C285);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function resize(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  applyCamera();
}
addEventListener('resize', resize);
resize();
tick();

// ── UI ──────────────────────────────────────────────────────────────
document.querySelectorAll('[data-brand]').forEach(el => el.textContent = CONFIG.COMPANY);
document.title = CONFIG.COMPANY + ' · Matchbox HQ';
document.getElementById('dropName').textContent = CONFIG.DROP_NAME;

const rupee = n => '₹' + Number(n||0).toLocaleString('en-IN');
function setStrip(state){
  const b = state?.budget || { total:20000, lines:[] };
  const spent = (b.lines||[]).reduce((s,l) => s + (+l.committed||0), 0);
  document.getElementById('sBudget').textContent = rupee(b.total - spent);
  const days = Math.ceil((new Date(CONFIG.DROP_DATE) - Date.now()) / 86400000);
  document.getElementById('sDays').textContent = days > 0 ? days : '—';
  const open = (state?.decisions?.decisions || []).filter(d => d.status === 'open').length;
  document.getElementById('sDecisions').textContent = open;
  const working = (state?.agents?.agents || []).filter(a => a.status === 'working').length;
  document.getElementById('sAgents').textContent = working + ' / 6';
}
fetch('/api/state').then(r => r.json()).then(setStrip)
  .catch(() => setStrip(window.__HQ_STATE__ || null));

// evening toggle
document.getElementById('timeBtn').onclick = () => {
  const url = new URL(location.href);
  url.searchParams.set('time', evening ? 'day' : 'evening');
  location.href = url;
};
document.getElementById('timeBtn').textContent = evening ? '\u2600 Switch to daytime' : '\u263D Switch to evening';

// ambient sound, off by default, fully synthesised (no audio files)
let audio = null;
document.getElementById('soundBtn').onclick = async (e) => {
  const btn = e.currentTarget;
  if (audio) { audio.ctx.close(); audio = null; btn.textContent = '🔇 Sound off'; btn.classList.remove('on'); return; }
  const { startAmbience } = await import('./sound.js');
  audio = startAmbience();
  btn.textContent = '🔊 Sound on'; btn.classList.add('on');
};

document.getElementById('loading').classList.add('gone');
