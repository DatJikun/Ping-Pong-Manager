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

test('fresh first-division clubs employ credible staff and outclass the second division', () => {
  for (const country of ['PL', 'DE', 'CN', 'JP', 'SE', 'KR']) {
    const g = boot(740);
    g.PPM.gameplay.newGame(0, country);
    const G = g.PPM.state.G;
    const gp = g.PPM.gameplay;
    const leagueOf = (staff) => G.teams.find((team) => team.id === staff.teamId)?.league;
    const roleRatings = (type, league) => G.staff
      .filter((staff) => staff.type === type && leagueOf(staff) === league)
      .map(gp.staffOvr);

    const coaches = distribution(roleRatings('coach', 1));
    const physios = distribution(roleRatings('physio', 1));
    assert.ok(coaches.p10 >= 35, `${country} L1 avoids implausible bottom-tier coaches: ${JSON.stringify(coaches)}`);
    assert.ok(coaches.median >= 52, `${country} L1 coach median is credible: ${JSON.stringify(coaches)}`);
    assert.ok(physios.p10 >= 30, `${country} L1 avoids implausible bottom-tier physios: ${JSON.stringify(physios)}`);
    assert.ok(physios.median >= 45, `${country} L1 physio median is credible: ${JSON.stringify(physios)}`);

    const teamStaffAverage = (team) => {
      const ratings = G.staff
        .filter((staff) => staff.teamId === team.id && ['coach', 'physio', 'psychologist'].includes(staff.type))
        .map(gp.staffOvr);
      return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
    };
    const l1 = G.teams.filter((team) => team.league === 1 && !team.isPlayer).map(teamStaffAverage);
    const l2 = G.teams.filter((team) => team.league === 2).map(teamStaffAverage);
    const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    assert.ok(mean(l1) >= mean(l2) + 6,
      `${country} L1 staff should be materially stronger than L2 (${mean(l1).toFixed(1)} vs ${mean(l2).toFixed(1)})`);
  }
});
