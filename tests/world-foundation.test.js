// World-foundation contracts shared by simulation and UI.
// Every assertion describes player-visible behaviour rather than source layout.

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (part) => sorted[Math.floor((sorted.length - 1) * part)];
  return { min: sorted[0], p10: at(0.1), median: at(0.5), p90: at(0.9), max: sorted.at(-1) };
}

test('rating profile maps current and peak OVR onto exactly five star slots', () => {
  const g = boot(731);
  const gp = g.PPM.gameplay;

  assert.equal(typeof gp.ratingProfile, 'function', 'simulation exposes the shared rating contract');
  assert.deepEqual(
    { ...gp.ratingProfile(20, 100) },
    { currentOvr: 20, peakOvr: 100, currentStars: 1, peakStars: 5, slots: 5 },
  );
  assert.deepEqual(
    { ...gp.ratingProfile(46, 58) },
    { currentOvr: 46, peakOvr: 58, currentStars: 2.3, peakStars: 2.9, slots: 5 },
  );
});

test('rating profile clamps malformed values and never shows peak below current', () => {
  const g = boot(732);
  const gp = g.PPM.gameplay;

  assert.deepEqual(
    { ...gp.ratingProfile(120, 40) },
    { currentOvr: 100, peakOvr: 100, currentStars: 5, peakStars: 5, slots: 5 },
  );
  assert.deepEqual(
    { ...gp.ratingProfile('not-a-number', -10) },
    { currentOvr: 0, peakOvr: 0, currentStars: 0, peakStars: 0, slots: 5 },
  );
});

test('every generated staff profession uses a credible shared 0..100 quality scale', () => {
  const g = boot(733);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;

  for (const type of ['coach', 'physio', 'psychologist', 'scout']) {
    const stats = distribution(Array.from({ length: 400 }, () => gp.staffOvr(gp.genStaff(type, 'PL'))));
    assert.ok(stats.p10 <= 35, `${type} market still contains affordable low-end staff: ${JSON.stringify(stats)}`);
    assert.ok(stats.median >= 40 && stats.median <= 60,
      `${type} median represents a competent journeyman: ${JSON.stringify(stats)}`);
    assert.ok(stats.p90 >= 68, `${type} market has a real high-quality tail: ${JSON.stringify(stats)}`);
    assert.ok(stats.max >= 75, `${type} can produce an elite candidate: ${JSON.stringify(stats)}`);
  }
});
