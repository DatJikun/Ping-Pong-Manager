// =============================================================================
// tests/sponsors.test.js — sponsor offers are country-appropriate.
// A Chinese club shouldn't advertise Allegro/InPost (owner wishlist #7).
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

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
