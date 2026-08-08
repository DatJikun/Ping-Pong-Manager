// =============================================================================
// tests/sponsors.test.js — sponsor offers are country-appropriate.
// A Chinese club shouldn't advertise Allegro/InPost (owner wishlist #7).
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('historic sponsor tier labels normalize to semantic ids', () => {
  const g = boot(2);
  const normalize = g.PPM.constants.normalizeSponsorTier;
  assert.equal(typeof normalize, 'function');
  const cases = [
    ['local', 'local'], ['Local', 'local'], [' Lokalny ', 'local'],
    ['regional', 'regional'], ['Regional', 'regional'], ['Regionalny', 'regional'],
    ['national', 'national'], ['National', 'national'], ['Krajowy', 'national'],
    ['premium', 'premium'], ['Premium', 'premium'],
    ['elite', 'elite'], ['Elite', 'elite'], ['Elitarny', 'elite'],
  ];
  for (const [historic, expected] of cases) {
    assert.equal(normalize(historic), expected, historic);
  }
});

test('sponsor offers are drawn from the club\'s own country pool', () => {
  const g = boot(3);
  g.PPM.gameplay.newGame(0, 'CN'); // play in the Chinese league
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const cn = new Set(g.PPM.constants.COUNTRY_SPONSORS.CN);
  const pl = new Set(g.PPM.constants.COUNTRY_SPONSORS.PL);
  let seen = 0;
  for (let i = 0; i < 6; i++) {
    gp.genSponsorOffers(30);
    for (const o of (G.sponsorOffers || [])) {
      seen++;
      assert.ok(cn.has(o.name), `Chinese club sponsor "${o.name}" is a Chinese brand`);
      assert.ok(!pl.has(o.name), `"${o.name}" is not a Poland-only brand`);
    }
  }
  assert.ok(seen > 0, 'some offers were generated');
});

test('the Polish league still uses Polish sponsors', () => {
  const g = boot(3);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const pl = new Set(g.PPM.constants.COUNTRY_SPONSORS.PL);
  gp.genSponsorOffers(30);
  const offers = G.sponsorOffers || [];
  assert.ok(offers.length > 0 && offers.every((o) => pl.has(o.name)), 'all offers are Polish brands');
});

test('generated sponsor records use semantic tiers and preserve name exclusions', () => {
  const g = boot(4);
  g.PPM.gameplay.newGame(0, 'DE');
  const gp = g.PPM.gameplay, G = g.PPM.state.G;
  const [activeName, recentName] = g.PPM.constants.COUNTRY_SPONSORS.DE;
  G.sponsors = [
    { name: activeName, active: true },
    { name: recentName, active: false, endSeason: G.season, cooldown: 2 },
  ];

  gp.genSponsorOffers(55);
  const offers = G.sponsorOffers || [];
  const semanticTiers = new Set(['local', 'regional', 'national', 'premium', 'elite']);
  assert.equal(offers.length, 12);
  assert.equal(new Set(offers.map(offer => offer.name)).size, offers.length);
  assert.ok(offers.every(offer => semanticTiers.has(offer.tier)), 'tiers are semantic ids');
  assert.ok(offers.every(offer => offer.name !== activeName && offer.name !== recentName),
    'active and cooldown sponsor names stay excluded');
});
