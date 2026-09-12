#!/usr/bin/env node
// Watches the project and commits on its own after every meaningful change.
// Start:  node autosave.js        Stop:  Ctrl-C (or kill the pid in .autosave.pid)
const fs = require('fs'), path = require('path'), cp = require('child_process');

const ROOT = __dirname;
const WATCH = ['state', 'deliverables', 'app', 'website', 'vendors', 'public'];
const QUIET_MS = 45000;          // wait for this much silence before committing
const IGNORE = /(^|\/)(\.git|node_modules|\.hq\.pid|\.autosave\.pid|\.lock)(\/|$)/;

const git = (args, opts = {}) =>
  cp.execSync('git ' + args, { cwd: ROOT, encoding: 'utf8', stdio: opts.quiet ? 'pipe' : 'pipe' }).trim();

let timer = null;
const touched = new Set();

function label(){
  const dirs = [...new Set([...touched].map(f => f.split('/')[0]))].sort();
  const what = {
    state:        'team state',
    deliverables: 'desk output',
    app:          'the office',
    website:      'the pre-order site',
    vendors:      'the vendor sheet',
    public:       'the dashboard',
  };
  return dirs.map(d => what[d] || d).join(', ');
}

function commit(){
  timer = null;
  const moved = label();
  const files = [...touched].sort().slice(0, 12);
  touched.clear();
  try {
    cp.execSync('node sync.js', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) { console.error('[autosave] sync failed:', e.message.split('\n')[0]); }
  try {
    git('add -A');
    if (!git('status --porcelain')) { console.log('[autosave] nothing changed, skipping'); return; }
    const stat = git('diff --cached --shortstat');
    const msg = 'Update ' + moved + '\n\n' + files.map(f => '- ' + f).join('\n') +
                (stat ? '\n\n' + stat : '') +
                '\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>' +
                '\nClaude-Session: https://claude.ai/code/session_01CAPz6pP84AMaqTvsWKUmjv';
    cp.execSync('git commit -q -F -', { cwd: ROOT, input: msg });
    console.log('[autosave] committed: ' + moved + ' (' + stat + ')');
    try { git('push -q'); console.log('[autosave] pushed'); }
    catch (e) { console.log('[autosave] committed locally; no remote to push to yet'); }
  } catch (e) {
    console.error('[autosave] commit failed:', e.message.split('\n')[0]);
  }
}

function bump(rel){
  if (IGNORE.test(rel)) return;
  touched.add(rel);
  if (timer) clearTimeout(timer);
  timer = setTimeout(commit, QUIET_MS);
}

for (const dir of WATCH){
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  fs.watch(full, { recursive: true }, (ev, file) => { if (file) bump(dir + '/' + file); });
}
fs.writeFileSync(path.join(ROOT, '.autosave.pid'), String(process.pid));
console.log('[autosave] watching ' + WATCH.join(', ') + ' — commits after ' +
            (QUIET_MS/1000) + 's of quiet. pid ' + process.pid);
process.on('SIGINT', () => { try { fs.unlinkSync(path.join(ROOT,'.autosave.pid')); } catch(_){} process.exit(0); });
