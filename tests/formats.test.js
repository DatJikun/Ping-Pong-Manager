// =============================================================================
// tests/formats.test.js — per-league match formats + equipment (owner 2026-07-03).
// PL Superliga (5th set to 6, 3/2/1/0), DE TTBL (2/0), CN olympic (2/1, double G3),
// JP T.League (double first, golden point, decider from 6:6, Victory Match, 4/3/1/0),
// and blade/sponge/rubber equipment flowing through adjusted stats.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function playSeason(g) {
  const G = g.PPM.state.G, gp = g.PPM.gameplay;
  for (const sch of [G.scheduleL1, G.scheduleL2]) {
    for (const round of sch) {
      for (const f of round) gp.applyResult(gp.simTeamMatch(f.home, f.away, false));
      gp.tickInjuries();
    }
  }
}

test('PL: the 5th set of a duel goes to 6 points, no advantage', () => {
  const g = boot(61);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G, gp = g.PPM.gameplay;
  let fifthSets = 0;
  for (const round of G.scheduleL1) for (const f of round) {
    const r = gp.simTeamMatch(f.home, f.away, false);
    r.matchups.forEach((mu) => {
      if ((mu.setScores || []).length === 5) {
        fifthSets++;
        const s5 = mu.setScores[4];
        assert.equal(Math.max(s5.home, s5.away), 6, `decider won at exactly 6 (got ${s5.home}:${s5.away})`);
      }
    });
  }
  assert.ok(fifthSets >= 5, `saw enough 5-set duels (${fifthSets})`);
});

test('DE (TTBL): table points are 2 per win, 0 per loss', () => {
  const g = boot(62);
  g.PPM.gameplay.newGame(0, 'DE');
  const G = g.PPM.state.G;
  playSeason(g);
  for (const t of G.teams) {
    assert.equal(t.pts, t.w * 2, `${t.name}: pts = 2×wins (${t.pts} vs ${t.w * 2})`);
  }
});

test('CN (CTTSL): olympic protocol — double is game 3, points 2/1, nobody plays 3 games', () => {
  const g = boot(63);
  g.PPM.gameplay.newGame(0, 'CN');
  const G = g.PPM.state.G, gp = g.PPM.gameplay;
  let checked = 0;
  for (const round of G.scheduleL1) {
    for (const f of round) {
      const r = gp.simTeamMatch(f.home, f.away, false);
      if (r.matchups.length >= 3) {
        assert.equal(r.matchups[2].type, 'double', 'game 3 is the double');
        checked++;
      }
      // nobody plays more than 2 games
      const counts = new Map();
      r.matchups.forEach((mu) => {
        (mu.homePair || [mu.homePlayer]).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
        (mu.awayPair || [mu.awayPlayer]).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
      });
      counts.forEach((n, id) => assert.ok(n <= 2, `player ${id} played ${n} games (max 2)`));
      gp.applyResult(r);
    }
    gp.tickInjuries();
    G.players.forEach((player) => { player.injuredFor = 0; });
  }
  assert.ok(checked > 50, 'plenty of matches reached game 3');
  for (const t of G.teams.filter((x) => x.league === 1)) {
    assert.equal(t.pts, t.w * 2 + t.l * 1, `${t.name}: CTTSL points 2/1`);
  }
});

test('JP (T.League): double opens the match, Victory Match decides 2:2, golden-point sets exist', () => {
  const g = boot(64);
  g.PPM.gameplay.newGame(0, 'JP');
  const G = g.PPM.state.G, gp = g.PPM.gameplay;
  let vmSeen = 0, goldenSeen = 0, deciderFrom6 = 0;
  for (const round of G.scheduleL1) for (const f of round) {
    const r = gp.simTeamMatch(f.home, f.away, false);
    assert.equal(r.matchups[0].type, 'double', 'game 1 is the double');
    assert.ok((r.matchups[0].setScores || []).length <= 3, 'opening double is best-of-3');
    const last = r.matchups[r.matchups.length - 1];
    if (r.matchups.length === 5) {
      vmSeen++;
      assert.equal(last.label, 'VICTORY MATCH', '5th game is the Victory Match');
      assert.equal((last.setScores || []).length, 1, 'Victory Match is a single set');
    }
    r.matchups.forEach((mu) => (mu.setScores || []).forEach((s, i, arr) => {
      const isDecider = i === arr.length - 1 && arr.length === (mu.label === 'DEBEL' ? 3 : 5);
      const mx = Math.max(s.home, s.away), mn = Math.min(s.home, s.away);
      if (!isDecider && mx === 11 && mx - mn === 1) goldenSeen++; // 11:10 golden point
      if (isDecider && mn >= 6 && mu.label !== 'VICTORY MATCH') deciderFrom6++; // started at 6:6
    }));
  }
  assert.ok(vmSeen >= 3, `Victory Matches occurred (${vmSeen})`);
  assert.ok(goldenSeen >= 3, `golden-point 11:10 sets occurred (${goldenSeen})`);
  assert.ok(deciderFrom6 >= 3, `deciders starting from 6:6 occurred (${deciderFrom6})`);
});

test('equipment: setup fits the style and mods flow into adjusted OVR', () => {
  const g = boot(65);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const defender = G.players.find((p) => p.playStyle === 'DEFENDER' || p.playStyle === 'FISHER');
  if (defender) {
    assert.equal(defender.equipment.blade, 'DEF', 'defensive players carry a DEF blade');
    assert.equal(defender.equipment.sponge, 'CIENKA', 'defensive players use thin sponge');
  }
  const p = G.players.find((x) => x.teamId === G.myTeamId && x.playStyle === 'FH_LOOPER') || G.players.find((x) => x.teamId === G.myTeamId);
  const mods = gp.equipmentMods(p);
  assert.ok(Object.keys(mods).length > 0, 'equipment produces stat mods');
  // OFF blade + thick sponge boosts forehand: adjusted fh > raw fh for a looper
  if (p.equipment.blade === 'OFF') {
    assert.ok(gp.ovr(p) !== undefined && (mods.fh || 0) > 0, 'attacking setup boosts FH');
  }
});

test('equipment: an active contract supplies the club rubber profile', () => {
  const g = boot(66);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const p = gp.getClubSeniorPlayers(G.myTeamId)[0];
  const before = gp.equipmentMods(p);
  G.seasonHistory = [{ position: 1 }];
  gp.selectTechPartnership('tp_pro', 1);
  const after = gp.equipmentMods(p);
  assert.ok((after.fh || 0) > (before.fh || 0), 'offensive contract rubber adds FH');
  assert.equal(G.techContract.rubberId, 'offensive');
});

test('AI clubs get a rubber tier from their budget', () => {
  const g = boot(67);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const rich = G.teams.filter((t) => !t.isPlayer).sort((a, b) => b.budget - a.budget)[0];
  const poor = G.teams.filter((t) => !t.isPlayer).sort((a, b) => a.budget - b.budget)[0];
  assert.ok(gp.clubRubberTier(rich.id) >= gp.clubRubberTier(poor.id), 'richer club ⇒ at least as fresh rubbers');
});

test('region age curves: Asian players peak 21-26 and decline earlier than Europeans', () => {
  const g = boot(68);
  g.PPM.gameplay.newGame(0, 'CN');
  const cn = g.PPM.state.G.players.map((p) => p.peakAge);
  assert.ok(Math.min(...cn) >= 21 && Math.max(...cn) <= 26, 'CN peaks within 21-26');
  const g2 = boot(68);
  g2.PPM.gameplay.newGame(0, 'PL');
  const pl = g2.PPM.state.G.players.map((p) => p.peakAge);
  assert.ok(Math.min(...pl) >= 27 && Math.max(...pl) <= 32, 'PL peaks within 27-32');
  // A 28-year-old with an Asian peak is already declining; a European is not.
  const G2 = g2.PPM.state.G;
  const asian = { ...G2.players[0], age: 28, peakAge: 22, traits: [] };
  const euro = { ...G2.players[0], age: 28, peakAge: 30, traits: [] };
  const gp2 = g2.PPM.gameplay;
  // drive one growth season for each via applyGrowth on a controlled pair
  asian.teamId = null; euro.teamId = null; asian.id = 999901; euro.id = 999902;
  asian.contractYears = 9; euro.contractYears = 9;
  const a0 = gp2.ovrBase(asian), e0 = gp2.ovrBase(euro);
  G2.players.push(asian, euro);
  for (let i = 0; i < 3; i++) gp2.applyGrowth();
  assert.ok(gp2.ovrBase(asian) < a0, 'asian-peak 28yo declined');
  assert.ok(gp2.ovrBase(euro) >= e0 - 1, 'european-peak 28yo held (still near peak)');
});

