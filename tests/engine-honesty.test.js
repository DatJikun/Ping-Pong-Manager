// =============================================================================
// tests/engine-honesty.test.js — Equipment in match engine + fatigue scope.
//
// Guards the 2026-07-11 audit fixes:
// 1) blade / sponge / rubber / tech must affect engineStats (not only OVR UI)
// 2) simTeamMatch must only settle fatigue for the two clubs in the fixture
//    (not rest every bystander in the world after every match)
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function basePlayer(id, overrides = {}) {
  return {
    id,
    name: `P${id}`,
    fh: 70, bh: 70, srv: 70, ret: 70, foot: 70, men: 70,
    age: 25, peakAge: 28, traits: [], playStyle: 'TWO_SIDED',
    role: 'starter', teamId: null, morale: 50, fatigue: 0, seasonForm: 0,
    equipment: { blade: 'ALL', sponge: 'SREDNIA' },
    ...overrides,
  };
}

test('engineStats includes contract rubber, blade, and sponge mods', () => {
  const g = boot(42);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;

  // The player club gets offensive contract rubber; the free agent gets no club package.
  G.seasonHistory = [{ position: 1 }];
  gp.selectTechPartnership('tp_pro', 1);
  const myId = G.myTeamId;
  const withGear = basePlayer(90001, {
    teamId: myId,
    equipment: { blade: 'OFF', sponge: 'GRUBA' },
  });
  const bare = basePlayer(90002, {
    teamId: null,
    equipment: { blade: 'ALL', sponge: 'SREDNIA' },
  });

  const esGear = gp.engineStats(withGear);
  const esBare = gp.engineStats(bare);
  // OFF blade + GRUBA sponge + contract rubber should raise attack/serve vs bare.
  assert.ok(esGear.atk > esBare.atk, `atk with gear ${esGear.atk} > bare ${esBare.atk}`);
  assert.ok(esGear.srv > esBare.srv, `srv with gear ${esGear.srv} > bare ${esBare.srv}`);
  // OVR display and engine must agree that gear helps.
  assert.ok(gp.ovr(withGear) > gp.ovrBase(withGear), 'displayed OVR includes equipment');
});

test('better equipment measurably improves duel win rate at equal base stats', () => {
  const g = boot(2026);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  G.seasonHistory = [{ position: 1 }];
  gp.selectTechPartnership('tp_pro', 1);

  const strong = basePlayer(90101, {
    teamId: G.myTeamId,
    equipment: { blade: 'OFF', sponge: 'GRUBA' },
  });
  const weak = basePlayer(90102, {
    teamId: null,
    equipment: { blade: 'DEF', sponge: 'CIENKA' },
  });

  let wins = 0;
  const N = 1200;
  for (let i = 0; i < N; i++) {
    const r = gp.simIndividual(strong, weak, null, null);
    if (r.homeWin) wins++;
  }
  // Equal raw stats + better gear should edge the worse setup (style noise exists).
  assert.ok(wins / N > 0.52, `geared player should win more than half — got ${wins}/${N}`);
});

test('fatigue only changes for the two clubs in a fixture', () => {
  const g = boot(99);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;

  // Seed high fatigue on everyone so rest (if wrongly applied) is visible.
  G.players.forEach((p) => { p.fatigue = 60; });

  const f = G.scheduleL1[0][0];
  const homeId = f.home;
  const awayId = f.away;
  const bystanderTeam = G.teams.find((t) => t.league === 1 && t.id !== homeId && t.id !== awayId);
  assert.ok(bystanderTeam, 'need a third L1 club');

  const snap = (tid) => G.players
    .filter((p) => p.teamId === tid && !p.retired)
    .map((p) => ({ id: p.id, fatigue: p.fatigue }));

  const beforeBy = snap(bystanderTeam.id);
  const beforeHome = snap(homeId);

  gp.simTeamMatch(homeId, awayId, false);

  const afterBy = snap(bystanderTeam.id);
  beforeBy.forEach((b, i) => {
    assert.strictEqual(afterBy[i].fatigue, b.fatigue,
      `bystander ${b.id} fatigue must stay ${b.fatigue}, got ${afterBy[i].fatigue}`);
  });

  // At least one home player must have changed (played → up, or bench → down).
  const afterHome = snap(homeId);
  const changed = afterHome.some((a, i) => a.fatigue !== beforeHome[i].fatigue);
  assert.ok(changed, 'home squad fatigue should settle after their match');
});

test('full L1 matchday does not multi-rest bystanders into zero fatigue', () => {
  const g = boot(11);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;

  G.players.forEach((p) => { p.fatigue = 50; });

  const round = G.scheduleL1[0];
  round.forEach((f) => gp.simTeamMatch(f.home, f.away, false));

  // After a full round each club played exactly once. Players who sat on the
  // bench rest once (~10–22), players who played gain load. Nobody should have
  // been rested 5 extra times down to ~0 while their club was idle.
  const stillFatigued = G.players.filter((p) => !p.retired && p.teamId != null && (p.fatigue || 0) >= 20);
  assert.ok(stillFatigued.length > G.players.length * 0.15,
    `expected many players still at ≥20 fatigue after one round, got ${stillFatigued.length}`);
});
