// =============================================================================
// tests/lib/real-saves.js — READ-ONLY regression fixtures from real careers.
//
// The owner's own exported careers are the only evidence we have of what an
// eight-plus season save actually looks like after months of play: duplicate
// entity ids, a bloated market, hundreds of retired-but-still-stored players.
// They are the strongest possible input for migration and long-career checks.
//
// These files live outside the repo (they are private saves) and are NEVER
// written to. Everything here reads the bytes once and works on parsed copies.
// If the files are absent — another machine, a fresh clone — callers are
// expected to skip rather than fail.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = process.env.PPM_REAL_SAVES_DIR || 'C:/Users/mwojn/Downloads';

const FIXTURES = [
  { id: 's4', file: 'ppm-v17-ks-piorun-s4-k4-pre.json', season: 4 },
  { id: 's8', file: 'ppm-v17-ks-piorun-s8-k21-pre.json', season: 8 },
  { id: 's11', file: 'ppm-v17-ks-piorun-s11-k4-pre.json', season: 11 },
];

function fixturePath(fixture, dir = DEFAULT_DIR) {
  return path.join(dir, fixture.file);
}

function available(dir = DEFAULT_DIR) {
  return FIXTURES.filter((f) => fs.existsSync(fixturePath(f, dir)));
}

// Returns the raw JSON text. Read-only by construction: nothing in this module
// ever opens these paths for writing.
function readText(fixture, dir = DEFAULT_DIR) {
  return fs.readFileSync(fixturePath(fixture, dir), 'utf8');
}

module.exports = { FIXTURES, DEFAULT_DIR, fixturePath, available, readText };
