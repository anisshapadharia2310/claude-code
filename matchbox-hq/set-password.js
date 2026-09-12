#!/usr/bin/env node
// Change the office password:  node set-password.js "my new password"
const crypto = require('crypto'), fs = require('path') && require('fs');
const pw = process.argv[2];
if (!pw) { console.log('usage: node set-password.js "your new password"'); process.exit(1); }
const file = __dirname + '/app/config.js';
let s = fs.readFileSync(file, 'utf8');
const salt = (s.match(/PASS_SALT:\s*"([^"]+)"/) || [])[1] || 'matchbox-hq-2026';
const hash = crypto.createHash('sha256').update(pw + salt).digest('hex');
s = s.replace(/PASS_HASH:\s*"[^"]*"/, 'PASS_HASH: "' + hash + '"');
fs.writeFileSync(file, s);
console.log('Password set to: ' + pw + '\nRe-deploy the app folder for it to take effect.');
