#!/usr/bin/env node
// Pushes the team's live state into the deployable app folder.
// Run it any time: node sync.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = __dirname, APP = path.join(ROOT, 'app');

const S = { now: new Date().toISOString() };
for (const n of ['tasks','agents','activity','decisions','budget','deliverables','requests'])
  S[n] = JSON.parse(fs.readFileSync(path.join(ROOT, 'state', n + '.json'), 'utf8'));

// 1. the JSON the office reads
fs.writeFileSync(path.join(APP, 'state.json'), JSON.stringify(S));

// 2. the plain dashboard, standalone at /simple
const tpl = fs.readFileSync(path.join(ROOT, 'artifact-template.html'), 'utf8');
const page = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  tpl.replace('__STATE__', JSON.stringify(S))
     .replace(/<title>.*?<\/title>/, '<title>Matchbox HQ · simple</title>')
     .replace(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/, '') +
  '</head></html>';
// the template puts <title>/<style> first then body markup; wrap it honestly
const head = page.slice(0, page.indexOf('<div class="strike">'));
const body = page.slice(page.indexOf('<div class="strike">'));
fs.writeFileSync(path.join(APP, 'simple.html'),
  head.replace('</head></html>', '') + '</head><body>' + body.replace('</head></html>', '') + '</body></html>');

// 3. keep the pipeline numbers in config.js in step with Sales & PR's file
const pipePath = path.join(ROOT, 'state', 'pipeline.json');
if (fs.existsSync(pipePath)){
  const p = JSON.parse(fs.readFileSync(pipePath, 'utf8'));
  let cfg = fs.readFileSync(path.join(APP, 'config.js'), 'utf8');
  cfg = cfg.replace(/PIPELINE: \{[\s\S]*?\},/,
    'PIPELINE: ' + JSON.stringify(p, null, 4).replace(/\n/g, '\n  ') + ',');
  fs.writeFileSync(path.join(APP, 'config.js'), cfg);
}

const sizes = fs.readdirSync(APP).map(f => f + ' ' + (fs.statSync(path.join(APP,f)).size/1024).toFixed(0) + 'k');
console.log('synced ->', APP);
console.log(sizes.join('  '));

// 4. if this folder is a git repo wired to a host, ship it
if (process.argv.includes('--push')){
  try {
    cp.execSync('git -C "' + ROOT + '" add -A app state && git -C "' + ROOT +
      '" commit -m "state: refresh office data" && git -C "' + ROOT + '" push', { stdio:'inherit' });
  } catch (e){ console.log('nothing to push, or no git remote set up yet'); }
}
