const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { boot } = require('./harness');

function makePendingCandidate(g, id, name) {
  const G = g.PPM.state.G;
  const candidate = g.PPM.gameplay.genYouthPlayer(G.myTeamId, G.countryId);
  candidate.id = id;
  candidate.name = name;
  candidate.teamId = G.myTeamId;
  candidate.role = 'youth';
  return candidate;
}

test('migration keeps live player IDs and reassigns colliding academy candidates', () => {
  const g = boot(801);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const established = G.players.find((p) => Array.isArray(G.playerHistory[p.id]));
  const occupiedId = established.id;
  const establishedName = established.name;

  G.academyProspects = [
    makePendingCandidate(g, occupiedId, 'Academy Collision'),
  ];
  G.academyTrial = [
    makePendingCandidate(g, occupiedId, 'Trial Collision'),
  ];

  g.PPM.stateApi.loadGameFromText(JSON.stringify({ ...G, _pid: 3 }));
  const loaded = g.PPM.state.G;
  const loadedEstablished = loaded.players.find((p) => p.name === establishedName);
  const academy = loaded.academyProspects[0];
  const trial = loaded.academyTrial[0];
  const liveIds = new Set(loaded.players.map((p) => p.id));

  assert.equal(loadedEstablished.id, occupiedId, 'established player keeps the canonical ID');
  assert.notEqual(academy.id, occupiedId, 'academy prospect is moved away from the live-player ID');
  assert.notEqual(trial.id, occupiedId, 'trial prospect is moved away from the live-player ID');
  assert.notEqual(trial.id, academy.id, 'pending candidates are unique across both pending arrays');
  assert.ok(!liveIds.has(academy.id), 'academy prospect ID is outside live players');
  assert.ok(!liveIds.has(trial.id), 'trial prospect ID is outside live players');
  assert.ok(g.PPM.ui._pid > Math.max(academy.id, trial.id), 'counter is above IDs minted by migration');
});

test('migration preserves intentional ID sharing outside the pending-player domain', () => {
  const g = boot(802);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const real = G.players[0];
  const teamWithSameId = G.teams.find((t) => t.id === real.id);
  assert.ok(teamWithSameId, 'fixture has the intentional team/player namespace overlap');

  G.scoutResults = [{
    realId: real.id,
    reported: { ...real },
    scoutId: G.staff.find((s) => s.type === 'scout')?.id ?? -1,
    region: 'Test',
    seen: false,
  }];

  g.PPM.stateApi.loadGameFromText(JSON.stringify(G));
  const loaded = g.PPM.state.G;
  const report = loaded.scoutResults[0];

  assert.equal(report.realId, real.id, 'real player reference is stable');
  assert.equal(report.reported.id, real.id, 'reported scout copy intentionally shares the player ID');
  assert.equal(loaded.teams.find((t) => t.name === teamWithSameId.name).id, real.id,
    'team/player namespace overlap is not renumbered');
});

test('academy signing guard preserves the established player and his history', () => {
  const g = boot(803);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const established = G.players.find((p) => (G.playerHistory[p.id] || []).length > 0);
  const occupiedId = established.id;
  const establishedName = established.name;
  const historyBefore = JSON.stringify(G.playerHistory[occupiedId]);
  const candidate = makePendingCandidate(g, occupiedId, 'Runtime Academy Collision');
  G.academyProspects = [candidate];
  G.scoutResults = [{
    realId: occupiedId,
    reported: { ...established },
    scoutId: -1,
    region: 'Existing player report',
    seen: false,
  }];

  g.PPM.gameplay.signAcademyProspect(0);

  const signed = G.players.find((p) => p.name === 'Runtime Academy Collision');
  assert.ok(signed, 'the intended academy candidate was signed');
  assert.notEqual(signed.id, occupiedId, 'colliding academy candidate receives a fresh ID');
  assert.equal(G.players.find((p) => p.id === occupiedId).name, establishedName,
    'the established player still owns the occupied ID');
  assert.equal(JSON.stringify(G.playerHistory[occupiedId]), historyBefore,
    'the established player history is not overwritten');
  assert.equal(G.playerHistory[signed.id].length, 1, 'candidate receives a separate history entry');
  assert.equal(new Set(G.players.map((p) => p.id)).size, G.players.length,
    'signing does not create duplicate live-player IDs');
  assert.ok(G.scoutResults.some((r) => r.realId === occupiedId),
    'a scout result owned by the established player is not deleted');
});

test('trial signing guard also allocates a fresh live-player ID', () => {
  const g = boot(804);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const established = G.players.find((p) => (G.playerHistory[p.id] || []).length > 0);
  const occupiedId = established.id;
  const historyBefore = JSON.stringify(G.playerHistory[occupiedId]);
  G.academyTrial = [
    makePendingCandidate(g, occupiedId, 'Runtime Trial Collision'),
  ];

  g.PPM.gameplay.signTrialProspect(0);

  const signed = G.players.find((p) => p.name === 'Runtime Trial Collision');
  assert.ok(signed, 'the intended trial candidate was signed');
  assert.notEqual(signed.id, occupiedId, 'colliding trial candidate receives a fresh ID');
  assert.equal(JSON.stringify(G.playerHistory[occupiedId]), historyBefore,
    'trial signing does not overwrite established history');
  assert.equal(new Set(G.players.map((p) => p.id)).size, G.players.length,
    'trial signing keeps live-player IDs unique');
});

test('pending profile resolver uses the explicit academy source and index', () => {
  const g = boot(805);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  const established = G.players[0];
  const academy = makePendingCandidate(g, established.id, 'Pending Academy Profile');
  const trial = makePendingCandidate(g, established.id, 'Pending Trial Profile');
  G.academyProspects = [academy];
  G.academyTrial = [trial];

  assert.equal(typeof g.PPM.gameplay.resolvePlayerProfile, 'function',
    'gameplay exports the explicit profile resolver');
  assert.equal(g.PPM.gameplay.resolvePlayerProfile(established.id).name, established.name,
    'ordinary player lookup keeps the established live-player behavior');
  assert.equal(
    g.PPM.gameplay.resolvePlayerProfile(established.id, 'academyProspects', 0).name,
    academy.name,
    'academy card resolves the exact pending candidate',
  );
  assert.equal(
    g.PPM.gameplay.resolvePlayerProfile(established.id, 'academyTrial', 0).name,
    trial.name,
    'trial card resolves the exact pending candidate',
  );
  assert.equal(
    g.PPM.gameplay.resolvePlayerProfile(established.id, 'unknown', 0).name,
    established.name,
    'unknown source safely falls back to the live-player lookup',
  );
  assert.equal(
    g.PPM.gameplay.resolvePlayerProfile(established.id, 'academyProspects', 9).name,
    established.name,
    'stale pending index safely falls back to the live-player lookup',
  );
});

test('academy and trial cards pass explicit pending sources to the profile modal', () => {
  const pagesPath = path.resolve(__dirname, '..', 'src', 'ui', 'pages.js');
  const source = fs.readFileSync(pagesPath, 'utf8');

  assert.ok(source.includes("openPlayerModal(${p.id},'${pendingSource}',${i})"),
    'prospect card forwards its pending source and index');
  assert.match(source, /signAcademyProspect\(\$\{i\}\).*'academyProspects'/,
    'normal academy cards identify the academyProspects source');
  assert.match(source, /signTrialProspect\(\$\{i\}\).*'academyTrial'/,
    'mini-tournament cards identify the academyTrial source');
});
