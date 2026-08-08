const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('equipment partner profiles are trade-offs rather than a sporting ladder', () => {
  const g = boot(2501);
  const { EQUIPMENT, TECH_PARTNERSHIPS } = g.PPM.constants;

  assert.deepEqual(new Set(TECH_PARTNERSHIPS.map((partner) => partner.profileId)),
    new Set(['offensive', 'control', 'speed', 'development', 'commercial']));
  assert.equal(new Set(TECH_PARTNERSHIPS.map((partner) => partner.id)).size, 6);
  assert.ok(TECH_PARTNERSHIPS.every((partner) => partner.rubberId));
  assert.deepEqual(EQUIPMENT.rubberProfiles, {
    offensive: { id: 'offensive', mods: { fh: 1, srv: 1 }, fitStyles: ['FH_LOOPER', 'TWO_SIDED'] },
    control: { id: 'control', mods: { ret: 1, men: 1 }, fitStyles: ['BLOCKER', 'DEFENDER', 'FISHER'] },
    speed: { id: 'speed', mods: { bh: 1, foot: 1 }, fitStyles: ['TWO_SIDED', 'BLOCKER'] },
    development: { id: 'development', mods: { men: 1 }, fitStyles: ['TWO_SIDED', 'FH_LOOPER', 'BLOCKER', 'FISHER', 'DEFENDER'] },
    balanced: { id: 'balanced', mods: { fh: 1, bh: 1 }, fitStyles: ['TWO_SIDED'] },
    commercial: { id: 'commercial', mods: {}, fitStyles: ['TWO_SIDED', 'FH_LOOPER', 'BLOCKER', 'FISHER', 'DEFENDER'] },
  });
});

test('new careers begin without an equipment contract', () => {
  const g = boot(2502);
  g.PPM.gameplay.newGame(0, 'PL');

  assert.equal(g.PPM.state.G.techContract, null);
});
