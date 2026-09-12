// Matchbox HQ - zero-dependency dashboard server
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const STATE = path.join(ROOT, 'state');
const PORT = process.env.PORT || 4321;

const FILES = ['tasks','agents','activity','decisions','budget','deliverables','requests','ledger','meetings','pipeline'];

function writeBudgetSheet(){
  try { execFileSync('python3', [path.join(ROOT, 'tools', 'write_budget_xlsx.py')], { cwd: ROOT }); }
  catch (e) { console.error('budget sheet not updated:', e.message.split('\n')[0]); }
}

function readState(name) {
  try { return JSON.parse(fs.readFileSync(path.join(STATE, name + '.json'), 'utf8')); }
  catch (e) { return null; }
}
function writeState(name, data) {
  fs.writeFileSync(path.join(STATE, name + '.json'), JSON.stringify(data, null, 2));
}

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/state') {
    const out = { now: new Date().toISOString() };
    FILES.forEach(f => { out[f] = readState(f); });
    return send(res, 200, JSON.stringify(out));
  }

  if (req.method === 'POST' && url.pathname === '/api/request') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body || '{}');
        if (!text || !String(text).trim()) return send(res, 400, JSON.stringify({ error: 'empty' }));
        const store = readState('requests') || { requests: [] };
        const entry = { id: 'req-' + Date.now(), time: new Date().toISOString(), text: String(text).trim(), status: 'new' };
        store.requests.unshift(entry);
        writeState('requests', store);
        const act = readState('activity') || { events: [] };
        act.events.unshift({ time: entry.time, agent: 'you', text: 'You sent a new instruction: "' + entry.text.slice(0, 120) + '"' });
        writeState('activity', act);
        send(res, 200, JSON.stringify({ ok: true, entry }));
      } catch (e) { send(res, 400, JSON.stringify({ error: 'bad json' })); }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/money') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { type, amount, reason } = JSON.parse(body || '{}');
        // reuse hq.js so the guards (reason required, never overspend) are in one place
        const out = execFileSync('node', [path.join(ROOT, 'hq.js'), 'money',
          String(type), String(amount), String(reason || ''), 'founder'],
          { cwd: ROOT, encoding: 'utf8' });
        writeBudgetSheet();
        send(res, 200, out.trim() || '{"ok":true}');
      } catch (e) {
        const msg = String(e.stderr || e.message).match(/REFUSED[^'\n]*/);
        send(res, 400, JSON.stringify({ error: msg ? msg[0] : 'could not record that' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/meeting') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { about, title, team, reason } = JSON.parse(body || '{}');
        const store = readState('meetings') || { meetings: [] };
        store.meetings.unshift({ id:'M' + Date.now(), about, title: title || 'A question',
          team: team || 'master', by: 'founder', reason: reason || 'you asked for this one',
          urgent: true, at: new Date().toISOString(), status: 'pending' });
        writeState('meetings', store);
        send(res, 200, JSON.stringify({ ok: true }));
      } catch (e) { send(res, 400, JSON.stringify({ error: 'bad request' })); }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/decision') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { id, answer } = JSON.parse(body || '{}');
        const store = readState('decisions') || { decisions: [] };
        const d = store.decisions.find(x => x.id === id);
        if (!d) return send(res, 404, JSON.stringify({ error: 'not found' }));
        d.status = 'answered';
        d.answer = answer;
        d.answeredAt = new Date().toISOString();
        writeState('decisions', store);
        const act = readState('activity') || { events: [] };
        act.events.unshift({ time: d.answeredAt, agent: 'you', text: 'You decided: ' + d.title + ' -> ' + answer });
        writeState('activity', act);
        send(res, 200, JSON.stringify({ ok: true }));
      } catch (e) { send(res, 400, JSON.stringify({ error: 'bad json' })); }
    });
    return;
  }

  // static. /office/* is the deployable app folder, everything else is public/
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  if (p.endsWith('/')) p += 'index.html';
  if (p === '/dashboard' || p === '/dashboard/index.html') p = '/office/dashboard.html';
  if (p === '/simple' || p === '/simple/index.html') p = '/office/simple.html';
  const office = p === '/office' || p.startsWith('/office/');
  const base = office ? path.join(ROOT, 'app') : path.join(ROOT, 'public');
  if (office) p = p.replace(/^\/office/, '') || '/index.html';
  if (p === '/' || p === '') p = '/index.html';
  const safe = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(base, safe);
  if (!file.startsWith(base)) return send(res, 403, 'no');
  // the office app and the plain dashboard share a root when deployed, so
  // fall back to the other folder rather than 404 on a sibling asset
  if (!fs.existsSync(file)) {
    const alt = path.join(office ? path.join(ROOT, 'public') : path.join(ROOT, 'app'), safe);
    if (fs.existsSync(alt)) file = alt;
  }
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream');
  });
});

server.listen(PORT, () => {
  console.log('\n  MATCHBOX HQ is running.\n  Open this in your browser:  http://localhost:' + PORT + '\n');
});
