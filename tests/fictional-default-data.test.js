const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

const REAL_IDENTITIES = [
  'adidas','allegro','alibaba','allianz','amazon','andro','audi','butterfly',
  'bmw','bosch','byd','canon','cornilleau','dhl','dhs','donic','ericsson',
  'huawei','hyundai','ikea','inpost','joola','kia','klarna','lenovo','lg',
  'lidl','lotte','mizuno','nintendo','nittaku','orlen','panasonic','pko',
  'puma','rossmann','samsung','siemens','sony','spotify','stiga','tencent',
  'tibhar','toyota','volkswagen','volvo','xiom','xiaomi','yasaka',
];

function shippedIdentityText(constants) {
  const clubs = Object.values(constants.COUNTRIES)
    .flatMap(country => [...country.l1Names, ...country.l2Names]);
  const sponsors = Object.values(constants.COUNTRY_SPONSORS).flat();
  const partners = constants.TECH_PARTNERSHIPS.map(partner => partner.name);
  return [...clubs, ...sponsors, ...partners].join('\n').toLowerCase();
}

test('the official database contains no blocked real-world identities', () => {
  const g = boot(2801);
  const text = shippedIdentityText(g.PPM.constants);
  for (const identity of REAL_IDENTITIES) {
    assert.doesNotMatch(text, new RegExp(`\\b${identity}\\b`, 'i'), identity);
  }
});

test('every country ships 24 unique clubs and a deep fictional sponsor pool', () => {
  const g = boot(2802);
  for (const country of Object.values(g.PPM.constants.COUNTRIES)) {
    const clubs = [...country.l1Names, ...country.l2Names];
    const sponsors = g.PPM.constants.COUNTRY_SPONSORS[country.id];
    assert.equal(clubs.length, 24, `${country.id} club count`);
    assert.equal(new Set(clubs).size, 24, `${country.id} unique clubs`);
    assert.ok(sponsors.length >= 48, `${country.id} sponsor depth`);
    assert.equal(new Set(sponsors).size, sponsors.length, `${country.id} unique sponsors`);
  }
});

test('official legacy saves are debranded while custom databases are preserved', () => {
  const g = boot(2803);
  const official = {
    season: 8,
    schemaVersion: 20,
    countryId: 'KR',
    myTeamId: 0,
    teams: [{ id: 0, league: 1, name: 'Seoul Samsung', isPlayer: true }],
    players: [],
    sponsors: [{ name: 'Samsung', active: true }],
    sponsorOffers: [{ name: 'LG', pending: true }],
    newsFeed: [{ msg: 'Samsung wspiera Seoul Samsung.' }],
  };
  const migrated = g.PPM.stateApi.migrateLoadedGame(official);
  const pool = new Set(g.PPM.constants.COUNTRY_SPONSORS.KR);
  assert.equal(migrated.teams[0].name, g.PPM.constants.COUNTRIES.KR.l1Names[0]);
  assert.ok(pool.has(migrated.sponsors[0].name));
  assert.ok(pool.has(migrated.sponsorOffers[0].name));
  assert.doesNotMatch(JSON.stringify(migrated), /Samsung|Seoul Samsung/);

  const swapped = {
    season: 5,
    schemaVersion: 20,
    countryId: 'PL',
    myTeamId: 18,
    teams: [
      { id: 18, league: 1, name: 'Iskrzyca Zamość', isPlayer: true },
      { id: 19, league: 2, name: 'Rekord Bielsko' },
    ],
    players: [],
    sponsors: [],
    newsFeed: [{ msg: 'Iskrzyca Zamość pokonała Rekord Bielsko.' }],
  };
  const swappedMigrated = g.PPM.stateApi.migrateLoadedGame(swapped);
  assert.equal(swappedMigrated.teams[0].name, g.PPM.constants.COUNTRIES.PL.l2Names[6]);
  assert.equal(swappedMigrated.teams[1].name, g.PPM.constants.COUNTRIES.PL.l2Names[7]);
  assert.equal(new Set(swappedMigrated.teams.map(team => team.name)).size, 2);

  const custom = {
    season: 1,
    schemaVersion: 20,
    countryId: 'KR',
    myTeamId: 0,
    teams: [{ id: 0, league: 1, name: 'Community Club', isPlayer: true }],
    players: [],
    sponsors: [{ name: 'Community Sponsor', active: true }],
    customDatabase: { name: 'User database' },
  };
  const customMigrated = g.PPM.stateApi.migrateLoadedGame(custom);
  assert.equal(customMigrated.teams[0].name, 'Community Club');
  assert.equal(customMigrated.sponsors[0].name, 'Community Sponsor');
});
