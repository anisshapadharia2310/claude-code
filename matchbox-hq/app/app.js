// ── Matchbox HQ · the office ────────────────────────────────────────
import { CONFIG } from './config.js';
import { buildLayout, DESKS, SPOTS } from './layout.js';
import { createIso2D } from './iso2d.js';
import { createPeople, tick, callMeeting, endMeeting, syncFromState, say } from './people.js';

const canvas = document.getElementById('stage');
const hour = new Date().getHours();
const q = new URL(location.href).searchParams;
const forcedTime = q.get('time');
const evening = forcedTime ? forcedTime === 'evening'
                           : (hour >= CONFIG.EVENING_FROM_HOUR || hour < 6);
document.documentElement.dataset.evening = evening ? '1' : '0';

const prims = buildLayout(CONFIG);
const people = createPeople();

// ── pick a renderer. 3D if the device can, 2D if it can't. Never fail.
let R = null, mode = '2D';
async function makeRenderer(){
  if (q.get('mode') !== '2d'){
    try {
      const test = document.createElement('canvas');
      const gl = test.getContext('webgl2') || test.getContext('webgl');
      if (gl && !gl.isContextLost()){
        const { createThree3D } = await import('./three3d.js');
        R = createThree3D(canvas, prims, { evening });
        mode = '3D';
        // if the GL context dies later, fall back live rather than freezing
        canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); switchTo2D(); }, { once:true });
        return;
      }
    } catch (err){ console.warn('3D unavailable, using the 2D office:', err); }
  }
  R = createIso2D(canvas, prims, { evening });
  mode = '2D';
}
function switchTo2D(){
  const keep = R ? { ...R.cam } : null;
  R = createIso2D(canvas, prims, { evening });
  if (keep){ R.cam.tx = keep.tx; R.cam.tz = keep.tz; R.cam.zoom = keep.zoom; }
  mode = '2D';
  document.getElementById('modeTag').textContent = '2D';
  R.resize();
}

// ── live state ──────────────────────────────────────────────────────
let STATE = window.__HQ_STATE__ || null;
async function loadState(){
  for (const url of [CONFIG.STATE_URL, './state.json', '/api/state']){
    if (!url) continue;
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && (j.agents || j.budget)){ STATE = j; break; }
    } catch (e){ /* try the next one */ }
  }
  if (!STATE) return;
  syncFromState(people, STATE);
  paintPanels();
}

// ── UI ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const rupee = n => '₹' + Number(n||0).toLocaleString('en-IN');
document.querySelectorAll('[data-brand]').forEach(el => el.textContent = CONFIG.COMPANY);
document.querySelectorAll('[data-drop]').forEach(el => el.textContent = CONFIG.DROP_NAME);
document.title = CONFIG.COMPANY + ' · Matchbox HQ';

function paintPanels(){
  const S = STATE || {};
  const b = S.budget || { total:20000, lines:[] };
  const spent = (b.lines||[]).reduce((s,l) => s + (+l.committed||0), 0);
  $('sBudget').textContent = rupee(b.total - spent);
  const days = Math.ceil((new Date(CONFIG.DROP_DATE) - Date.now()) / 86400000);
  $('sDays').textContent = days > 0 ? days : '—';
  const open = (S.decisions?.decisions || []).filter(d => d.status === 'open');
  $('sDecisions').textContent = open.length;
  const pipe = CONFIG.PIPELINE || {};
  $('sPre').textContent = (pipe.preorders ?? 0) + ' / ' + (pipe.dropSize ?? 500);
  $('sWait').textContent = pipe.waitlist ?? 0;

  // decisions panel
  $('decList').innerHTML = open.length
    ? open.slice(0,4).map(d => '<div class="dec"><b>' + esc(d.title) + '</b><span>' +
        esc((d.recommendation||'').slice(0,110)) + '…</span></div>').join('')
    : '<div class="muted">Nothing waiting. 👍</div>';

  // pipeline panel
  $('pipeList').innerHTML = [
    ['Waitlist', pipe.waitlist ?? 0, pipe.waitlistTarget ?? 200],
    ['Pre-orders paid', pipe.preorders ?? 0, 60],
    ['Cafés pitched', pipe.cafesPitched ?? 0, 20],
    ['Cafés bought', pipe.cafesBought ?? 0, 5],
    ['Creators sent', pipe.creatorsSent ?? 0, 30],
  ].map(([l,v,t]) => '<div class="pipe"><span>' + l + '</span><b>' + v +
      '<i> / ' + t + '</i></b><div class="bar"><i style="width:' +
      Math.min(100, t ? v/t*100 : 0) + '%"></i></div></div>').join('');

  // team panel
  $('teamList').innerHTML = people.map(p =>
    '<button class="who" data-who="' + p.id + '"><i style="background:' + p.color + '"></i>' +
    '<span><b>' + esc(p.name) + '</b><em>' + esc(p.activity || 'Waiting') + '</em></span></button>').join('');
  $('teamList').querySelectorAll('[data-who]').forEach(btn =>
    btn.onclick = () => openPerson(people.find(p => p.id === btn.dataset.who)));
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function openPerson(p){
  if (!p) return;
  const open = (STATE?.decisions?.decisions || []).filter(d => d.status === 'open' && d.raisedBy === p.id);
  const tasks = (STATE?.tasks?.tasks || []).filter(t => t.agent === p.id);
  const by = s => tasks.filter(t => t.status === s);
  $('sheetTitle').textContent = p.name;
  $('sheetDot').style.background = p.color;
  $('sheetBody').innerHTML =
    '<p class="doing">' + esc(p.activity || 'Waiting for instructions') + '</p>' +
    (open.length ? '<div class="dec"><b>Needs your decision</b><span>' + esc(open[0].title) + '</span></div>' : '') +
    ['inprogress','review','todo','done'].map(s => {
      const list = by(s); if (!list.length) return '';
      const label = { inprogress:'Working on', review:'Ready for you', todo:'Queued', done:'Done' }[s];
      return '<h4>' + label + '</h4><ul>' + list.map(t =>
        '<li>' + esc(t.title) + (t.note ? '<em>' + esc(t.note) + '</em>' : '') + '</li>').join('') + '</ul>';
    }).join('');
  $('sheet').classList.add('open');
  R.cam.tx = p.home.x; R.cam.tz = p.home.z; wantZoom = 2.4;
}
$('sheetClose').onclick = () => $('sheet').classList.remove('open');

// ── controls ────────────────────────────────────────────────────────
let wantZoom = 1, dragging = false, lastX = 0, lastY = 0, moved = 0;
canvas.addEventListener('pointerdown', e => {
  dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  R.panBy(dx, dy);
  R.cam.tx = Math.max(-34, Math.min(34, R.cam.tx));
  R.cam.tz = Math.max(-28, Math.min(28, R.cam.tz));
});
addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  wantZoom = Math.max(.5, Math.min(4.5, wantZoom * (e.deltaY > 0 ? .9 : 1.11)));
}, { passive:false });
let pinch = 0;
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 2)
    pinch = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
}, { passive:true });
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && pinch){
    const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    wantZoom = Math.max(.5, Math.min(4.5, wantZoom * (d / pinch))); pinch = d;
  }
}, { passive:true });
canvas.addEventListener('dblclick', e => {
  const d = R.pick(e.clientX, e.clientY - canvas.getBoundingClientRect().top);
  if (d){ openPerson(people.find(p => p.id === d.id)); }
});
let lastTap = 0;
canvas.addEventListener('touchend', e => {
  const t = Date.now();
  if (t - lastTap < 320 && e.changedTouches[0]){
    const d = R.pick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (d) openPerson(people.find(p => p.id === d.id));
  }
  lastTap = t;
});
addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    R.cam.tx = 0; R.cam.tz = 1; wantZoom = 1;
    $('sheet').classList.remove('open');
  }
});
$('zoomOut').onclick = () => { R.cam.tx = 0; R.cam.tz = 1; wantZoom = 1; $('sheet').classList.remove('open'); };

// ── Call Meeting ────────────────────────────────────────────────────
let meeting = false;
$('meetBtn').onclick = () => {
  meeting = !meeting;
  if (meeting){
    callMeeting(people);
    people.forEach((p,i) => setTimeout(() => say(p, MEET_LINES[i % MEET_LINES.length], 14), 2600 + i*700));
    $('meetBtn').textContent = 'End meeting';
    R.cam.tx = -15; R.cam.tz = -10; wantZoom = 1.9;
  } else {
    endMeeting(people);
    $('meetBtn').textContent = 'Call Meeting';
    R.cam.tx = 0; R.cam.tz = 1; wantZoom = 1;
  }
};
const MEET_LINES = [
  'Trays first, boxes per drop.', 'Vendors need your phone calls.',
  'Udyam is free — do it this week.', 'Names: 4 of 10 already taken.',
  'Waitlist is live, pre-order waits.', 'Pune only. Couriers refuse matches.',
  '₹99 is the price that works.',
];

// ── speech bubbles (HTML, so they stay crisp in both renderers) ─────
const bubbleLayer = $('bubbles');
const bubbleEls = new Map();
function paintBubbles(){
  for (const p of people){
    let el = bubbleEls.get(p.id);
    const text = p.bubble || (p.waitingOnYou && p.state === 'founder' ? 'Need your call →' : null);
    if (!text){ if (el){ el.remove(); bubbleEls.delete(p.id); } continue; }
    if (!el){
      el = document.createElement('div');
      el.className = 'bubble';
      bubbleLayer.appendChild(el);
      bubbleEls.set(p.id, el);
    }
    if (el.dataset.t !== text){ el.textContent = text; el.dataset.t = text; }
    el.style.borderColor = p.color;
    const s = R.project(p.x, 5.2, p.z);
    el.style.transform = `translate(-50%,-100%) translate(${s.x}px, ${s.y}px)`;
    const vis = s.x > -80 && s.x < innerWidth + 80 && s.y > -40 && s.y < innerHeight + 40;
    el.style.opacity = vis ? '1' : '0';
  }
}

// ── loop ────────────────────────────────────────────────────────────
let last = performance.now();
function frame(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  R.cam.zoom += (wantZoom - R.cam.zoom) * .12;
  tick(people, dt, { meeting });
  R.render(people, now / 1000);
  paintBubbles();
  requestAnimationFrame(frame);
}

function resize(){ R.resize(); }
addEventListener('resize', resize);

// ── buttons ─────────────────────────────────────────────────────────
$('timeBtn').onclick = () => {
  const url = new URL(location.href);
  url.searchParams.set('time', evening ? 'day' : 'evening');
  location.href = url;
};
$('timeBtn').textContent = evening ? '☀ Daytime' : '☾ Evening';
let audio = null;
$('soundBtn').onclick = async () => {
  const btn = $('soundBtn');
  if (audio){ audio.stop(); audio = null; btn.textContent = '🔇 Sound'; btn.classList.remove('on'); return; }
  try {
    const { startAmbience } = await import('./sound.js');
    audio = startAmbience();
    btn.textContent = '🔊 Sound'; btn.classList.add('on');
  } catch (e){ btn.textContent = 'No sound'; }
};

// ── go ──────────────────────────────────────────────────────────────
await makeRenderer();
$('modeTag').textContent = mode;
R.resize();
await loadState();
paintPanels();
setInterval(loadState, 20000);
$('boot').classList.add('gone');
requestAnimationFrame(frame);
