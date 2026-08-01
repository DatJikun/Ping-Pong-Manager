// =============================================================================
// tests/pages-render.test.js — every screen the player can reach must render.
//
// pages.js is the one file where a bad merge, a removed feature or a renamed
// helper produces nothing until the moment a real player clicks the tab — the
// unit tests parse the file and exercise the engine, but never actually build a
// screen. This walks every navigation target in index.html and renders it, in
// both locales, in the three career phases, on a fresh world and on a world that
// has been running for a few seasons.
//
// It asserts almost nothing about the CONTENT on purpose: the point is that the
// page produces markup instead of throwing, which is the failure this catches.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { boot } = require('./harness');

const ROOT = path.resolve(__dirname, '..');

// The nav is the contract: whatever index.html offers, the player can click.
function navTargets() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...new Set([...html.matchAll(/go\('([a-z0-9]+)'\)/g)].map((m) => m[1]))];
}

// pages.js is DOM-bound, so it is not part of the headless harness load order.
function bootWithPages(seed) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8'), g,
    { filename: 'src/ui/pages.js' });
  return g;
}

// Drives the REAL route (renderApp -> the page's branch) rather than guessing a
// function name, and captures what lands in #content so the markup can be read.
function renderPage(g, page) {
  let captured = '';
  const realGet = g.document.getElementById;
  g.document.getElementById = function (id) {
    const el = realGet.call(this, id);
    if (id === 'content') Object.defineProperty(el, 'innerHTML', {
      configurable: true, get: () => captured, set: (v) => { captured = String(v); },
    });
    return el;
  };
  try {
    g.PPM.ui.page = page;
    g.PPM.pages.renderApp();
  } finally {
    g.document.getElementById = realGet;
  }
  return captured;
}

test('every navigation target in index.html renders', () => {
  const g = bootWithPages(9001);
  const targets = navTargets();
  assert.ok(targets.length >= 10, `found ${targets.length} nav targets`);

  const broken = [];
  for (const page of targets) {
    try {
      const html = renderPage(g, page);
      if (typeof html !== 'string' || html.length < 20) broken.push(`${page}: produced no markup`);
      if (/undefined|\[object Object\]|NaN/.test(html)) {
        broken.push(`${page}: markup contains ${html.match(/undefined|\[object Object\]|NaN/)[0]}`);
      }
    } catch (error) {
      broken.push(`${page}: ${error.message}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('every screen survives all three career phases', () => {
  const g = bootWithPages(9002);
  const targets = navTargets();
  const broken = [];
  for (const phase of ['preseason', 'pre', 'transfer']) {
    g.PPM.state.G.phase = phase;
    for (const page of targets) {
      try { renderPage(g, page); } catch (error) { broken.push(`${phase}/${page}: ${error.message}`); }
    }
  }
  assert.deepEqual(broken, []);
});

test('every screen renders in both locales', () => {
  const g = bootWithPages(9003);
  const targets = navTargets();
  const broken = [];
  for (const locale of ['en', 'pl']) {
    g.PPM.i18n.setLocale(locale);
    for (const page of targets) {
      try {
        const html = renderPage(g, page);
        // A missing key renders as the raw dotted key — visible to the player.
        const raw = html.match(/[>"\s]([a-z][a-zA-Z0-9]+\.[a-zA-Z0-9.]{3,})[<"\s]/);
        if (raw && !/\d/.test(raw[1]) && !raw[1].includes('.js')) {
          broken.push(`${locale}/${page}: looks like an untranslated key "${raw[1]}"`);
        }
      } catch (error) {
        broken.push(`${locale}/${page}: ${error.message}`);
      }
    }
  }
  g.PPM.i18n.setLocale('en');
  assert.deepEqual(broken, []);
});

test('the squad page and dashboard use one ordered senior match squad', () => {
  const g = bootWithPages(9004);
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const seniors = gp.getClubSeniorPlayers(G.myTeamId).slice(0, 6);
  const selected = [seniors[4], seniors[1], seniors[5], seniors[0], seniors[3]];
  G.lastMatchSelection = {
    base: selected.slice(0, 3).map((player) => player.id),
    reserves: selected.slice(3).map((player) => player.id),
  };
  selected.forEach((player, index) => {
    const value = 42 + index;
    player.fh = player.bh = player.srv = player.ret = player.foot = player.men = value;
  });
  selected[1].injuredFor = 2;
  const loaned = seniors.find((player) => !selected.includes(player));
  const borrower = G.teams.find((team) => team.id !== G.myTeamId);
  G.loans.push({ playerId: loaned.id, fromTeamId: G.myTeamId, toTeamId: borrower.id, returned: false, originalRole: 'senior' });
  loaned.teamId = borrower.id;
  loaned.loanedOut = true;

  g.PPM.ui.squadTab = 'squad';
  for (const locale of ['en', 'pl']) {
    g.PPM.i18n.setLocale(locale);
    const squad = g.PPM.pages.pageSquad();
    const visibleText = squad.replace(/<[^>]*>/g, ' ');
    for (const player of gp.getClubSeniorPlayers(G.myTeamId, true)) {
      assert.equal(visibleText.split(player.name).length - 1, 1, `${locale}: ${player.name} appears once`);
    }
    assert.doesNotMatch(squad, /First team|Skład główny|promoteToStarter|demoteToReserve/);
    assert.match(squad, /A —|A —/);
    assert.match(squad, locale === 'en' ? /Injured.*2 round/i : /Kontuzja.*2/i);
    assert.match(squad, new RegExp(borrower.name));
    assert.doesNotMatch(squad, />\s*(?:squad|match\.nom)\.[a-zA-Z.]+\s*</);
  }

  g.PPM.i18n.setLocale('en');
  const dash = g.PPM.pages.pageDash();
  const positions = selected.map((player) => dash.indexOf(player.name));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'dashboard keeps A/B/C/R1/R2 order');
});

test('dashboard resolves the selected technical partner and semantic news', () => {
  const g = bootWithPages(9010);
  g.PPM.i18n.setLocale('en');
  g.PPM.state.G.techPartnership = 'tp_national';
  g.PPM.state.G.newsFeed = [{
    msgKey: 'news.newManager',
    msgParams: { club: 'Test Club', season: 1 },
    type: 'hot',
    season: 1,
    matchday: 0,
  }];

  const html = renderPage(g, 'dash');
  assert.match(html, /PulseForge Performance/);
  assert.match(html, /A new manager takes over Test Club ahead of season 1\./);
  assert.doesNotMatch(html, /undefined/);
});

test('[slow] every screen still renders after several seasons of a real career', async () => {
  const { runCareer } = require('./lib/career-driver');
  const result = await runCareer({ seasons: 4, seed: 9004, countryId: 'PL' });
  const g = result.sandbox;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8'), g,
    { filename: 'src/ui/pages.js' });

  const broken = [];
  for (const page of navTargets()) {
    try { renderPage(g, page); } catch (error) { broken.push(`${page}: ${error.message}`); }
  }
  g.__stopGalaClicker();
  assert.deepEqual(broken, [],
    'a screen that only breaks on an aged world is exactly what unit tests miss');
});

test('a removed feature leaves no dangling navigation', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const pages = fs.readFileSync(path.join(ROOT, 'src/ui/pages.js'), 'utf8');
  const routed = new Set([...pages.matchAll(/ui\.page===['"]([a-z0-9]+)['"]/g)].map((m) => m[1]));
  const unrouted = navTargets().filter((p) => !routed.has(p));
  assert.deepEqual(unrouted, [],
    'every nav button must have a route in renderApp()');
});
