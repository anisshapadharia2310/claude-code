// ── Founder dashboard ───────────────────────────────────────────────
// The same thing that appears inside the cabin in the 3D office.
// Reads the shared state; writes go to the local server when it's there,
// and queue on this device when the site is running as a static deploy.
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rupee = n => '₹' + Math.round(Number(n)||0).toLocaleString('en-IN');
const TEAMS = {
  prodops:['Production & Ops','#E0714B'], supplier:['Supplier Scout','#F0A63C'],
  legal:['Legal Team','#5B9BE8'], brand:['Design Team','#F08AAE'],
  website:['Website Builder','#A98AE8'], launch:['Sales & PR','#62C285'],
  finance:['Finance','#46BFB0'], master:['Master','#8A8078'], founder:['Founder','#7A3B2E'],
};
const team = id => TEAMS[id] || [id, '#8A8078'];

let STATE = null, QUEUE = load('mhq-queue', []);
function load(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e){ return d; } }
function save(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

async function post(path, body){
  try {
    const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return { live:true, data: await r.json() };
  } catch (e){
    QUEUE.unshift({ path, body, at:new Date().toISOString() });
    save('mhq-queue', QUEUE);
    return { live:false };
  }
}

async function loadState(){
  for (const url of ['/api/state', '/state.json']){
    try { const r = await fetch(url, { cache:'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && (j.agents || j.budget)){ STATE = j; break; }
    } catch(e){}
  }
  paint();
}

// ── the ledger strip ────────────────────────────────────────────────
function ledgerNumbers(){
  const L = STATE?.ledger || { opening:20000, entries:[] };
  const pending = QUEUE.filter(q => q.path === '/api/money').map(q => q.body);
  const all = [...pending, ...(L.entries||[])];
  const added = all.filter(e => e.type === 'in').reduce((t,e) => t + (+e.amount||0), 0);
  const spent = all.filter(e => e.type === 'out').reduce((t,e) => t + (+e.amount||0), 0);
  return { opening:L.opening ?? 20000, added, spent,
           total:(L.opening ?? 20000) + added, left:(L.opening ?? 20000) + added - spent, all };
}
function paintBar(){
  const n = ledgerNumbers();
  $('bTotal').textContent = rupee(n.total);
  $('bSpent').textContent = rupee(n.spent);
  $('bLeft').textContent  = rupee(n.left);
  $('ledger').innerHTML = n.all.length
    ? n.all.map(e => '<div class="lrow"><span class="amt ' + e.type + '">' +
        (e.type === 'out' ? '−' : '+') + rupee(e.amount) + '</span>' +
        '<span class="r">' + esc(e.reason) + (e.pending ? ' <em>(on this device)</em>' : '') + '</span>' +
        '<span class="dt">' + String(e.date || e.at || '').slice(0,10) + '</span></div>').join('')
    : '<div class="lrow"><span class="r">Nothing spent yet. Opening capital ' +
      rupee(n.opening) + '.</span></div>';
}

// ── query cards ─────────────────────────────────────────────────────
function paintQueries(){
  const open = (STATE?.decisions?.decisions || []).filter(d => d.status === 'open');
  const answeredLocal = load('mhq-answers', {});
  const live = open.filter(d => !answeredLocal[d.id]);
  $('qCount').textContent = live.length;
  $('queries').innerHTML = live.length ? live.map(d => {
    const [tn, tc] = team(d.raisedBy || 'master');
    return '<div class="card"><div class="team" style="color:' + tc + '">' + esc(tn) + ' is asking</div>' +
      '<h3>' + esc(d.title) + '</h3><div class="why">' + esc(d.why) + '</div>' +
      (d.options||[]).map(o => {
        const rec = (d.recommendation||'').trim().toUpperCase()
          .startsWith(o.label.trim().charAt(0).toUpperCase());
        return '<button class="opt' + (rec ? ' rec' : '') + '" data-q="' + esc(d.id) +
          '" data-a="' + esc(o.label) + '"><b>' + esc(o.label) + '</b><span>' +
          esc(o.detail) + '</span></button>';
      }).join('') +
      '<div class="more">' +
        '<button class="btn ghost" data-own="' + esc(d.id) + '">Write my own answer</button>' +
        '<button class="btn ghost" data-meet="' + esc(d.id) + '">Call a meeting</button>' +
      '</div></div>';
  }).join('') : '<div class="empty">Nothing needs your yes right now.</div>';

  $('queries').querySelectorAll('[data-q]').forEach(b =>
    b.onclick = () => answer(b.dataset.q, b.dataset.a));
  $('queries').querySelectorAll('[data-own]').forEach(b =>
    b.onclick = () => openAnswer(b.dataset.own));
  $('queries').querySelectorAll('[data-meet]').forEach(b =>
    b.onclick = () => requestMeeting(b.dataset.meet));
}

async function answer(id, text){
  const a = load('mhq-answers', {});
  a[id] = { answer:text, at:new Date().toISOString() };
  save('mhq-answers', a);
  paint();
  const r = await post('/api/decision', { id, answer:text });
  toast(r.live ? 'Answered. The team has it.' : 'Saved on this device — Claude picks it up next cycle.');
}
function openAnswer(id){
  const d = (STATE?.decisions?.decisions || []).find(x => x.id === id);
  $('aFor').textContent = d ? d.title : '';
  $('aTxt').value = '';
  $('answerDlg').showModal();
  $('aGo').onclick = async () => {
    const t = $('aTxt').value.trim();
    if (!t) return;
    $('answerDlg').close();
    await answer(id, 'My own answer: ' + t);
  };
}
async function requestMeeting(id){
  const d = (STATE?.decisions?.decisions || []).find(x => x.id === id);
  const m = load('mhq-meetings', []);
  m.unshift({ id:'M'+Date.now(), about:id, title:d ? d.title : 'A question',
    team:d?.raisedBy || 'master', by:'founder', at:new Date().toISOString(), urgent:true });
  save('mhq-meetings', m);
  await post('/api/meeting', { about:id, title:d?.title, team:d?.raisedBy });
  paint();
  toast('Meeting requested. It is at the top of your schedule.');
}

// ── meeting schedule ────────────────────────────────────────────────
function paintMeetings(){
  const fromState = (STATE?.meetings?.meetings || []);
  const local = load('mhq-meetings', []);
  const all = [...local, ...fromState]
    .sort((a,b) => (b.urgent?1:0) - (a.urgent?1:0) || String(b.at).localeCompare(String(a.at)));
  $('mCount').textContent = all.length;
  $('meetings').innerHTML = all.length ? all.map(m => {
    const [tn, tc] = team(m.team || 'master');
    const dt = new Date(m.at);
    return '<div class="meet' + (m.urgent ? ' urgent' : '') + '">' +
      '<div class="tab"><div class="d">' + dt.getDate() + '</div><div class="m">' +
      dt.toLocaleString('en-IN',{month:'short'}) + '</div></div>' +
      '<div class="b"><div class="t">' + esc(m.title || 'Meeting') + '</div>' +
      '<div class="s"><b style="color:' + tc + '">' + esc(m.by === 'founder' ? 'Founder' : tn) +
      '</b> · ' + esc(m.reason || 'waiting for you') + '</div></div>' +
      '<button class="btn ghost" data-start="' + esc(m.id) + '">Start now</button></div>';
  }).join('') : '<div class="meet"><div class="b"><div class="s">No meetings waiting.</div></div></div>';
  $('meetings').querySelectorAll('[data-start]').forEach(b =>
    b.onclick = () => toast('Live meetings need the chat service switched on — see DEPLOY.md.'));
}

function paintResearch(){
  const tasks = (STATE?.tasks?.tasks || []).filter(t =>
    /your phone|needs you|call |confirm|check |verify/i.test(t.note || '') && t.status !== 'done');
  $('research').innerHTML = tasks.length ? tasks.slice(0,8).map(t => {
    const [tn, tc] = team(t.agent);
    return '<div class="meet"><div class="b"><div class="t">' + esc(t.title) + '</div>' +
      '<div class="s"><b style="color:' + tc + '">' + esc(tn) + '</b> · ' + esc(t.note) + '</div></div></div>';
  }).join('') : '<div class="meet"><div class="b"><div class="s">Nothing needs your legwork yet.</div></div></div>';
}

function paintDecided(){
  const local = load('mhq-answers', {});
  const fromState = (STATE?.decisions?.decisions || []).filter(d => d.status !== 'open');
  const rows = [
    ...Object.entries(local).map(([id, v]) => {
      const d = (STATE?.decisions?.decisions || []).find(x => x.id === id);
      return { title: d ? d.title : id, answer: v.answer, at: v.at };
    }),
    ...fromState.map(d => ({ title:d.title, answer:d.answer, at:d.answeredAt })),
  ];
  $('decided').innerHTML = rows.length ? rows.map(r =>
    '<div class="done"><b>' + esc(r.title) + '</b><span>You said: ' + esc(r.answer) +
    ' · ' + String(r.at||'').slice(0,10) + '</span></div>').join('')
    : '<div class="empty">Nothing decided yet.</div>';
}

function paint(){ paintBar(); paintQueries(); paintMeetings(); paintResearch(); paintDecided(); }

// ── money dialog ────────────────────────────────────────────────────
let moneyDir = 'out';
function openMoney(dir){
  moneyDir = dir;
  $('mTitle').textContent = dir === 'in' ? 'Add money' : 'Spend money';
  $('mSub').textContent = dir === 'in'
    ? 'Money going into the business. Say where it came from.'
    : 'Nothing is recorded without a reason.';
  $('mGo').className = 'btn ' + (dir === 'in' ? 'add' : 'spend');
  $('mGo').textContent = 'Record it';
  $('mAmt').value = ''; $('mWhy').value = ''; $('mErr').textContent = '';
  $('moneyDlg').showModal();
  setTimeout(() => $('mAmt').focus(), 60);
}
$('addBtn').onclick = () => openMoney('in');
$('spendBtn').onclick = () => openMoney('out');
$('mGo').onclick = async () => {
  const amt = Math.round(+$('mAmt').value), why = $('mWhy').value.trim();
  if (!(amt > 0)) return $('mErr').textContent = 'Put in an amount.';
  if (!why) return $('mErr').textContent = 'Every entry needs a reason. One line is enough.';
  const n = ledgerNumbers();
  if (moneyDir === 'out' && amt > n.left)
    return $('mErr').textContent = 'That is ' + rupee(amt - n.left) + ' more than you have.';
  $('moneyDlg').close();
  const entry = { type:moneyDir, amount:amt, reason:why, date:new Date().toISOString(), pending:true };
  const r = await post('/api/money', entry);
  if (!r.live){ /* already queued; the bar reads the queue */ }
  await loadState();
  toast(r.live ? 'Recorded in the ledger.' : 'Saved on this device — Claude writes it to the sheet next cycle.');
};

$('figs').onclick = toggleLedger;
$('figs').onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleLedger(); } };
function toggleLedger(){
  const open = $('ledger').classList.toggle('open');
  $('ledgerHead').style.display = open ? '' : 'none';
}

let toastEl = null;
function toast(msg){
  if (!toastEl){
    toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);' +
      'background:#241F1A;color:#F2E9D8;padding:12px 18px;border-radius:8px;font-size:14px;' +
      'z-index:60;max-width:90%;text-align:center;box-shadow:0 12px 30px -10px rgba(0,0,0,.7)';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 4200);
}

loadState();
setInterval(loadState, 20000);
