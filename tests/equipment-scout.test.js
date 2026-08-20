// =============================================================================
// tests/equipment-scout.test.js — rubber families + scout fog (owner 2026-08-20).
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function fresh(seed) {
  const g = boot(seed);
  g.PPM.gameplay.newGame(0, 'PL');
  return g;
}

function ownStarter(G) {
  return G.players.find((p) => p.teamId === G.myTeamId && p.role === 'starter' && !p.retired);
}

test('PRO grade of TENSOR raises FH versus warehouse', () => {
  const g = fresh(81);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const p = ownStarter(G);
  p.equipment.family = null;
  p.equipment.freshness = 100;
  p.equipment.adaptLeft = 0;
  G.rubberFamily = 'TENSOR';
  G.rubberTier = 0;
  const warehouse = gp.equipmentMods(p);
  G.rubberTier = 2;
  const pro = gp.equipmentMods(p);
  assert.ok((pro.fh || 0) > (warehouse.fh || 0), `PRO FH ${pro.fh} > warehouse ${warehouse.fh}`);
});

test('wrong family can hurt FH versus TENSOR', () => {
  const g = fresh(82);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const p = ownStarter(G);
  p.equipment.freshness = 100;
  p.equipment.adaptLeft = 0;
  p.preferredFamily = 'TENSOR';
  G.rubberTier = 2;
  p.equipment.family = 'TENSOR';
  const tensor = gp.equipmentMods(p);
  p.equipment.family = 'LONG_PIPS';
  const pips = gp.equipmentMods(p);
  p.equipment.family = 'CONTROL';
  const control = gp.equipmentMods(p);
  assert.ok((pips.fh || 0) < (tensor.fh || 0), `long pips FH ${pips.fh} < tensor ${tensor.fh}`);
  assert.ok((control.fh || 0) < (tensor.fh || 0), `control FH ${control.fh} < tensor ${tensor.fh}`);
});

test('playing a match wears freshness', () => {
  const g = fresh(83);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const mt = G.teams.find((t) => t.isPlayer);
  const opp = G.teams.find((t) => t.league === mt.league && !t.isPlayer);
  G.players.filter((p) => p.teamId === mt.id).forEach((p) => {
    p.equipment = p.equipment || { blade: 'ALL', sponge: 'SREDNIA', family: null };
    p.equipment.freshness = 100;
  });
  const r = gp.simTeamMatch(mt.id, opp.id, false);
  const played = new Set();
  (r.matchups || []).forEach((m) => {
    (m.homePair || [m.homePlayer]).forEach((id) => played.add(id));
    (m.awayPair || [m.awayPlayer]).forEach((id) => played.add(id));
  });
  const worn = G.players.find((p) => played.has(p.id) && p.teamId === mt.id);
  assert.ok(worn, 'someone from the club played');
  assert.ok(worn.equipment.freshness < 100, `freshness dropped to ${worn.equipment.freshness}`);
});

test('own squad is always scouted; market others start as fog', () => {
  const g = fresh(84);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const mine = ownStarter(G);
  const other = G.players.find((p) => p.teamId !== G.myTeamId && p.teamId !== null && !p.retired);
  assert.equal(gp.playerIsScouted(mine), true);
  assert.equal(typeof gp.peakDisplay(mine), 'number');
  assert.equal(gp.statBand(mine, 'fh'), String(mine.fh));
  assert.equal(gp.playerIsScouted(other), false);
  assert.equal(gp.peakDisplay(other), '?');
  assert.match(gp.statBand(other, 'fh'), /\d+–\d+/);
});

test('observePlayer reveals numeric stats and peak when a scout is employed', () => {
  const g = fresh(85);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const other = G.players.find((p) => p.teamId !== G.myTeamId && p.teamId !== null && !p.retired);
  const before = G.teams.find((t) => t.id === G.myTeamId).budget;
  gp.observePlayer(other.id);
  assert.equal(other.revealedToManager, undefined);
  G.staff.push({ id: 88001, type: 'scout', teamId: G.myTeamId, name: 'Obserwator', salary: 1, contractYears: 1 });
  gp.observePlayer(other.id);
  assert.equal(other.revealedToManager, true);
  assert.equal(gp.playerIsScouted(other), true);
  assert.equal(typeof gp.peakDisplay(other), 'number');
  assert.equal(gp.statBand(other, 'fh'), String(other.fh));
  assert.ok(G.teams.find((t) => t.id === G.myTeamId).budget < before, 'observation costs money');
});

test('playing the opponent reveals their match squad', () => {
  const g = fresh(86);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const mt = G.teams.find((t) => t.isPlayer);
  const opp = G.teams.find((t) => t.league === mt.league && !t.isPlayer);
  const r = gp.simTeamMatch(mt.id, opp.id, false);
  const oppIds = [];
  (r.matchups || []).forEach((m) => {
    (m.homePair || [m.homePlayer]).forEach((id) => oppIds.push(id));
    (m.awayPair || [m.awayPlayer]).forEach((id) => oppIds.push(id));
  });
  const oppPlayed = G.players.find((p) => oppIds.includes(p.id) && p.teamId === opp.id);
  assert.ok(oppPlayed);
  assert.equal(gp.playerIsScouted(oppPlayed), false);
  gp.applyResult(r);
  assert.equal(gp.playerIsScouted(oppPlayed), true);
});

test('kit demand in the inbox waits for preseason instead of swapping mid-season', () => {
  const g = fresh(87);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const p = ownStarter(G);
  p.equipment.family = 'TENSOR';
  p.preferredFamily = 'LONG_PIPS';
  const morale = p.morale || 50;
  gp.pushMail({ type: 'decision', from: p.name, subject: 'kit', decision: { kind: 'kitDemand', playerId: p.id, familyId: 'LONG_PIPS' } });
  const mail = G.inbox[G.inbox.length - 1];
  gp.answerMail(mail.id, true);
  assert.equal(p.equipment.family, 'TENSOR', 'no mid-season swap');
  assert.equal(p._promisedFamily, 'LONG_PIPS');
  assert.ok(p.morale > morale);
  gp.applyPromisedKitChanges();
  assert.equal(p.equipment.family, 'LONG_PIPS');
  assert.ok((p.equipment.adaptLeft || 0) >= 4);
});

test('club rubber family is a 1-5 year preseason contract', () => {
  const g = fresh(89);
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const p = ownStarter(G);
  G.phase = 'pre';
  G.rubberContractYears = 0;
  gp.setRubberFamily('CONTROL', 3);
  assert.equal(G.rubberFamily, 'TENSOR', 'blocked in-season');
  G.phase = 'preseason';
  gp.setRubberFamily('CONTROL', 3);
  assert.equal(G.rubberFamily, 'CONTROL');
  assert.equal(G.rubberContractYears, 3);
  assert.ok((p.equipment.adaptLeft || 0) >= 4 && (p.equipment.adaptLeft || 0) <= 6);
  gp.setRubberFamily('LONG_PIPS', 1);
  assert.equal(G.rubberFamily, 'CONTROL', 'other family locked until expiry');
  gp.setRubberFamily('CONTROL', 5);
  assert.equal(G.rubberContractYears, 5, 'same family can be extended');
});

test('newGame gives AI clubs a rubber family identity', () => {
  const g = fresh(88);
  const G = g.PPM.state.G;
  const ai = G.teams.filter((t) => !t.isPlayer);
  assert.ok(ai.every((t) => t.rubberFamily), 'every AI club has a family');
});
