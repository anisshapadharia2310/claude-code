#!/usr/bin/env node
// hq.js - the ONLY safe way for agents to write to /state (atomic, lock-protected)
const fs = require('fs'), path = require('path');
const STATE = path.join(__dirname, 'state');
const LOCK = path.join(__dirname, 'state', '.lock');
const now = () => new Date().toISOString();

function withLock(fn) {
  for (let i = 0; i < 300; i++) {
    try { fs.mkdirSync(LOCK); } catch (e) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); continue; }
    try { return fn(); } finally { try { fs.rmdirSync(LOCK); } catch (e) {} }
  }
  throw new Error('could not get lock');
}
const rd = n => JSON.parse(fs.readFileSync(path.join(STATE, n + '.json'), 'utf8'));
const wr = (n, d) => fs.writeFileSync(path.join(STATE, n + '.json'), JSON.stringify(d, null, 2));

const [cmd, ...a] = process.argv.slice(2);
withLock(() => {
  switch (cmd) {
    case 'status': { // hq.js status <agentId> "<what you are doing>" [working|waiting|done|blocked]
      const s = rd('agents'); const ag = s.agents.find(x => x.id === a[0]);
      if (!ag) throw new Error('unknown agent ' + a[0]);
      ag.doing = a[1]; ag.status = a[2] || 'working'; ag.lastUpdate = now(); wr('agents', s); break;
    }
    case 'log': { // hq.js log <agentId> "<plain english, no jargon>"
      const s = rd('activity'); s.events.unshift({ time: now(), agent: a[0], text: a[1] });
      s.events = s.events.slice(0, 200); wr('activity', s); break;
    }
    case 'task': { // hq.js task <taskId> <todo|inprogress|review|done> ["note"]
      const s = rd('tasks'); const t = s.tasks.find(x => x.id === a[0]);
      if (!t) throw new Error('unknown task ' + a[0]);
      t.status = a[1]; if (a[2]) t.note = a[2]; t.updated = now(); wr('tasks', s); break;
    }
    case 'addtask': { // hq.js addtask <id> <agentId> "<title>" <status> ["note"]
      const s = rd('tasks');
      if (s.tasks.some(x => x.id === a[0])) throw new Error('task id exists');
      s.tasks.push({ id: a[0], title: a[2], agent: a[1], status: a[3] || 'todo', note: a[4] || '', updated: now() });
      wr('tasks', s); break;
    }
    case 'deliverable': { // hq.js deliverable <agentId> "<name>" "<path>" "<one line description>"
      const s = rd('deliverables');
      s.files = s.files.filter(f => f.path !== a[2]);
      s.files.push({ name: a[1], path: a[2], agent: a[0], desc: a[3] || '', updated: now() }); wr('deliverables', s); break;
    }
    case 'decision': { // hq.js decision <agentId> "<title>" "<why it matters>" "<A|B|C>" "<recommendation>" [taskIdsCsv]
      const s = rd('decisions');
      const id = 'D-' + String(s.decisions.length + 1).padStart(3, '0');
      s.decisions.push({ id, title: a[1], why: a[2], raisedBy: a[0],
        options: a[3].split('|').map(o => { const [l, ...d] = o.split('::'); return { label: l.trim(), detail: (d.join('::') || '').trim() }; }),
        recommendation: a[4], status: 'open', answer: null, answeredAt: null,
        blocks: (a[5] || '').split(',').filter(Boolean), created: now() });
      wr('decisions', s); console.log(id); break;
    }
    case 'budget': { // hq.js budget "<item>" <planned> <committed> "<note>" [agentId]
      const s = rd('budget'); let l = s.lines.find(x => x.item === a[0]);
      if (!l) { l = { item: a[0], agent: a[4] || 'finance', planned: 0, committed: 0, note: '' }; s.lines.push(l); }
      l.planned = +a[1]; l.committed = +a[2]; if (a[3]) l.note = a[3];
      const spent = s.lines.reduce((t, x) => t + (+x.committed || 0), 0);
      if (spent > s.total) throw new Error('REFUSED: that would spend more than the 20,000 budget');
      wr('budget', s); break;
    }
    case 'money': { // hq.js money <in|out> <amount> "<reason>" [who]
      const dir = a[0], amt = Math.round(+a[1]), reason = (a[2]||'').trim();
      if (dir !== 'in' && dir !== 'out') throw new Error('use: money in|out <amount> "<reason>"');
      if (!(amt > 0)) throw new Error('amount must be a positive number');
      if (!reason) throw new Error('REFUSED: every entry needs a one-line reason');
      const L = rd('ledger');
      const bal = L.entries.reduce((t,e) => t + (e.type === 'in' ? e.amount : -e.amount), L.opening);
      if (dir === 'out' && amt > bal)
        throw new Error('REFUSED: that would spend ' + (amt - bal) + ' more than you have');
      L.entries.unshift({ id:'L' + Date.now(), date: now(), type: dir, amount: amt,
        reason, by: a[3] || 'founder' });
      wr('ledger', L);
      const spent = L.entries.filter(e => e.type === 'out').reduce((t,e) => t + e.amount, 0);
      const added = L.entries.filter(e => e.type === 'in').reduce((t,e) => t + e.amount, 0);
      const B = rd('budget'); B.total = L.opening + added; wr('budget', B);
      const act = rd('activity');
      act.events.unshift({ time: now(), agent: 'finance',
        text: (dir === 'out' ? 'Spent \u20b9' : 'Added \u20b9') + amt.toLocaleString('en-IN') + ' - ' + reason });
      wr('activity', act);
      console.log(JSON.stringify({ balance: L.opening + added - spent, spent, added }));
      break;
    }
    case 'requests': console.log(JSON.stringify(rd('requests'), null, 2)); break;
    default: console.log('commands: status log task addtask deliverable decision budget requests');
  }
});
