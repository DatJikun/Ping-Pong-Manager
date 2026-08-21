const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { boot } = require('./harness');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('newGame seeds a free-agent pool about as large as every club squad', () => {
  const g = boot(3101);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const squaded = gp.clubSquadedCount(G);
  const fas = gp.listedFreeAgents(G);
  const target = gp.freeAgentTarget(G);
  assert.ok(squaded >= 200, `squaded seniors ${squaded}`);
  assert.equal(target, Math.max(squaded, 200));
  assert.equal(fas.length, target, `FA pool ${fas.length} should match target ${target}`);
  assert.ok(fas.length >= squaded - 5, 'market depth is within a few of the squaded labour pool');
  const marketFa = (G.transferMarket || []).filter((row) => row.type === 'fa');
  assert.equal(marketFa.length, fas.length);
});

test('prune caps free agents at the squaded-player target, not 5 per club', () => {
  const g = boot(3102);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  const target = gp.freeAgentTarget(G);
  while (gp.listedFreeAgents(G).length < target + 25) {
    const p = gp.genPlayer(null, 39, 'PL');
    p.teamId = null;
    p.contractYears = 0;
    p.role = 'reserve';
    G.players.push(p);
    G.playerHistory[p.id] = [{ season: G.season, ovr: 50 }];
  }
  gp.pruneCareerData();
  assert.equal(gp.listedFreeAgents(G).length, target);
});

test('startSeason stays in preseason until the rubber contract is signed', () => {
  const g = boot(3103);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const gp = g.PPM.gameplay;
  G.sponsors = [
    { id: 1, active: true, name: 'A', reward: 1, yearsLeft: 1, goal: { type: 'league', value: 8 } },
    { id: 2, active: true, name: 'B', reward: 1, yearsLeft: 1, goal: { type: 'league', value: 8 } },
    { id: 3, active: true, name: 'C', reward: 1, yearsLeft: 1, goal: { type: 'league', value: 8 } },
  ];
  G.techPartnership = (g.PPM.constants.TECH_PARTNERSHIPS[0] || {}).id || 'local';
  G.boardObjective = { id: 'safe', label: 'Bezpieczny' };
  G.rubberContractYears = 0;
  G.phase = 'preseason';
  gp.startSeason();
  assert.equal(G.phase, 'preseason');
  G.phase = 'preseason';
  gp.setRubberFamily('TENSOR', 3);
  assert.equal(G.rubberContractYears, 3);
  gp.startSeason();
  assert.equal(G.phase, 'pre');
});

test('preseason chrome is a closed flow: no rail, no chip jumps, one start button', () => {
  const pages = read('src/ui/pages.js');
  const shell = read('src/ui/shell.js');
  const css = read('styles/main.css');
  assert.match(shell, /phase==='preseason'&&p!=='preseason'/);
  assert.match(shell, /app-preseason/);
  assert.match(pages, /if\(store\.G\.phase==='preseason'\)ui\.page='preseason'/);
  assert.match(pages, /setRubberFamily\('/);
  assert.match(pages, /class="stage">\s*\$\{nav\}\s*<div class="wizard-pane/);
  assert.doesNotMatch(pages, /wizard-pane[^>]*>\$\{body\}<\/div>\s*\$\{nav\}/);
  assert.match(pages, /function pickRubberFamily/);
  assert.match(pages, /id:'rubber'/);
  assert.doesNotMatch(pages, /steps\.map\(\(s,i\)=>`<div class="ss[^"]*" onclick=/);
  assert.doesNotMatch(pages, /Rozpocznij sezon →/);
  assert.match(css, /app-preseason #sidebar/);
  assert.doesNotMatch(css, /clip-path:\s*polygon/);
});
