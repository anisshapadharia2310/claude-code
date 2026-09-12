// ── The team: where they are, what they're doing ────────────────────
// One model, drawn by both renderers.
import { DESKS, SPOTS } from './layout.js';

const SPEED = 3.4;                 // units per second — an unhurried walk
const CORRIDOR = [4.5, 13.2];      // the two clear lanes; nobody walks through a desk

const SKIN = ['#C98C61','#E0AE83','#A9704A','#D9A377','#8E5A3B','#EFC9A5','#B87E52'];
const HAIR = ['#2B2119','#3E2A1E','#1C1713','#4A3323','#2A1F2E','#111014','#3A2418'];
// 70s wardrobe — these have to read against honey wood, so no dark slate
const SHIRT_ALT = ['#C8963E','#A85A32','#6E7A4A','#E4D2A8','#3E7A72','#9C4A3C','#4A6B8A'];

export function createPeople(){
  return DESKS.map((d, i) => ({
    id: d.id, name: d.name, color: d.color,
    home: { x: d.x - .4, z: d.z + 2.8 },
    x: d.x - .4, z: d.z + 2.8, facing: 'n',
    skin: SKIN[i % SKIN.length], hair: HAIR[i % HAIR.length], shirt: SHIRT_ALT[i % SHIRT_ALT.length],
    state: 'desk', path: [], dwell: 2 + i * 1.7, bob: i * 1.3,
    activity: 'Getting started', bubble: null, bubbleUntil: 0, waitingOnYou: false,
  }));
}

// route through a corridor so nobody clips a desk
function route(from, to){
  const lane = CORRIDOR.reduce((best, L) =>
    Math.abs(L - from.z) + Math.abs(L - to.z) < Math.abs(best - from.z) + Math.abs(best - to.z) ? L : best, CORRIDOR[0]);
  const pts = [];
  if (Math.abs(from.z - to.z) > 1.5 || Math.abs(from.x - to.x) > 6){
    pts.push({ x: from.x, z: lane });
    pts.push({ x: to.x,   z: lane });
  }
  pts.push({ x: to.x, z: to.z });
  return pts;
}

export function goTo(p, spot, state){
  p.path = route(p, spot);
  p.state = state || 'walk';
}

export function say(p, text, seconds){
  p.bubble = text;
  p.bubbleUntil = performance.now() + (seconds || 6) * 1000;
}

// the errands that make the floor feel alive
const ERRANDS = [
  { spot: SPOTS.coffee,  say: 'Coffee. Back in a minute.', state:'coffee',  dwell: [6, 11] },
  { spot: SPOTS.printer, say: 'Printing the vendor list.', state:'printer', dwell: [4, 8] },
];

export function tick(people, dt, opts){
  const now = performance.now();
  for (const p of people){
    if (p.bubble && now > p.bubbleUntil) p.bubble = null;

    if (p.path.length){
      const t = p.path[0];
      const dx = t.x - p.x, dz = t.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < .18){
        p.path.shift();
        if (!p.path.length){
          if (p.state === 'walk') p.state = 'desk';
          p.dwell = p.state === 'meet' ? 1e9 : 3 + Math.random() * 5;
        }
      } else {
        const step = Math.min(SPEED * dt, dist);
        p.x += dx / dist * step; p.z += dz / dist * step;
        p.facing = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');
        p.bob += dt * 9;
      }
      continue;
    }

    // standing still
    p.dwell -= dt;
    if (p.state === 'founder' || p.state === 'meet') continue;   // waiting on you / in a meeting
    if (p.dwell > 0) continue;

    if (p.waitingOnYou && p.state !== 'founder'){
      goTo(p, SPOTS.founderDoor, 'founder');
      say(p, 'Got a question for you →', 20);
      continue;
    }
    if (p.state === 'desk' && Math.random() < .45 && !opts?.meeting){
      const e = ERRANDS[Math.floor(Math.random() * ERRANDS.length)];
      goTo(p, e.spot, 'walk');
      p.nextState = e.state;
      if (Math.random() < .5) say(p, e.say, 5);
      p.dwell = e.dwell[0] + Math.random() * (e.dwell[1] - e.dwell[0]);
    } else {
      goTo(p, p.home, 'walk');
      p.dwell = 6 + Math.random() * 10;
    }
  }
}

export function callMeeting(people){
  people.forEach((p, i) => {
    const seat = SPOTS.meetSeats[i % SPOTS.meetSeats.length];
    p.waitingOnYou = false;
    goTo(p, seat, 'walk');
    p.onArrive = 'meet';
    p.state = 'walk';
    setTimeout(() => { if (!p.path.length) p.state = 'meet'; }, 200);
  });
}

export function endMeeting(people){
  people.forEach(p => { p.state = 'walk'; goTo(p, p.home, 'walk'); p.dwell = 2; });
}

// fold live agent state from /state into the people
export function syncFromState(people, state){
  const agents = state?.agents?.agents || [];
  const open = (state?.decisions?.decisions || []).filter(d => d.status === 'open');
  for (const p of people){
    const a = agents.find(x => x.id === p.id);
    if (a){ p.activity = a.doing || 'Waiting'; p.agentStatus = a.status; }
    const mine = open.find(d => d.raisedBy === p.id);
    p.waitingOnYou = !!mine;
    p.decisionTitle = mine ? mine.title : null;
  }
}
