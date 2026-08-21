#!/usr/bin/env node
// Copy only the playable web app into dist-desktop/ for the Tauri bundle.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'dist-desktop');

const FILES = ['index.html', 'THIRD-PARTY-NOTICES.md'];
const DIRS = ['src', 'styles', 'assets'];

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === '.' || entry.name === '..') continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

rm(DEST);
fs.mkdirSync(DEST, { recursive: true });
for (const file of FILES) {
  fs.copyFileSync(path.join(ROOT, file), path.join(DEST, file));
}
for (const dir of DIRS) {
  copyDir(path.join(ROOT, dir), path.join(DEST, dir));
}
console.log('packed desktop frontend -> dist-desktop/');
