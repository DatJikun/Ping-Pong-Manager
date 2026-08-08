const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

const REAL_IDENTITIES = [
  'adidas','allegro','alibaba','allianz','amazon','andro','audi','butterfly',
  'asteron','elaris',
  'bmw','bosch','byd','canon','cornilleau','dhl','dhs','donic','ericsson',
  'huawei','hyundai','ikea','inpost','joola','kia','klarna','lenovo','lg',
  'lidl','lotte','mizuno','nintendo','nittaku','nordkern','novaris','orlen','panasonic','pko',
  'puma','rossmann','samsung','siemens','sony','spotify','stiga','tencent',
  'tibhar','toyota','volkswagen','volvo','xiom','xiaomi','yasaka','alpenwerk',
];

const OLD_CARTESIAN_SPONSORS = [
  'Asteron Energia', 'Asteron Finanse', 'Rhevara Energie', 'Rhevara Finanz',
  'Jade River Energy', 'Jade River Finance', 'Hikari Wave Energy',
  'Hikari Wave Finance', 'Nordljus Energi', 'Nordljus Finans',
  'Hanul Energy', 'Hanul Finance',
];

function identityKey(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function shippedIdentityText(constants) {
  const clubs = Object.values(constants.COUNTRIES)
    .flatMap(country => [...country.l1Names, ...country.l2Names]);
  const sponsors = Object.values(constants.COUNTRY_SPONSORS).flat();
  const partners = constants.TECH_PARTNERSHIPS.map(partner => partner.name);
  return [...clubs, ...sponsors, ...partners].map(identityKey).join('\n');
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
    assert.equal(new Set(sponsors.map(identityKey)).size, sponsors.length,
      `${country.id} sponsors remain unique after case/accent/punctuation normalization`);

    const tokenCounts = new Map();
    sponsors.flatMap(name => identityKey(name).split(' ')).filter(Boolean).forEach(token => {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    });
    const mostRepeated = [...tokenCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    assert.ok(!mostRepeated || mostRepeated[1] <= 4,
      `${country.id} sponsor token "${mostRepeated?.[0]}" repeats only ${mostRepeated?.[1]} times`);

    for (const oldName of OLD_CARTESIAN_SPONSORS) {
      assert.ok(!sponsors.includes(oldName), `${country.id} removed Cartesian sponsor ${oldName}`);
    }
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

test('official legacy sponsor remapping keeps every deal distinct and preserves its terms', () => {
  const g = boot(2804);
  const formerNames = [
    'Asteron Energia', 'Asteron Finanse', 'Asteron Żywność', 'Asteron Technologie', 'Asteron Logistyka',
    'Cedrava Energia', 'Cedrava Finanse', 'Cedrava Żywność', 'Cedrava Technologie', 'Cedrava Logistyka',
    'Deltaris Energia', 'Deltaris Finanse', 'Deltaris Żywność', 'Deltaris Technologie', 'Deltaris Logistyka',
  ];
  const makeDeal = (name, index, active) => ({
    id: 700 + index,
    name,
    active,
    pending: !active,
    reward: 20000 + index * 500,
    goal: index % 2 ? 'top4' : 'win6',
    tier: index % 2 ? 'Krajowy' : 'Regionalny',
    customNote: `legacy-${index}`,
  });
  const raw = {
    season: 4,
    schemaVersion: 25,
    countryId: 'PL',
    myTeamId: 0,
    teams: [],
    players: [],
    sponsors: [
      { id: 699, name: 'Helvara', active: true, reward: 19000, goal: 'top3', tier: 'Krajowy', customNote: 'canonical' },
      ...formerNames.slice(0, 3).map((name, index) => makeDeal(name, index, true)),
    ],
    sponsorOffers: formerNames.slice(3).map((name, index) => makeDeal(name, index + 3, false)),
  };

  const migrated = g.PPM.stateApi.migrateLoadedGame(raw);
  const deals = [...migrated.sponsors, ...migrated.sponsorOffers];
  const pool = new Set(g.PPM.constants.COUNTRY_SPONSORS.PL);

  assert.equal(migrated.sponsors[0].name, 'Helvara', 'an existing canonical sponsor keeps its identity');
  assert.equal(deals.length, 16);
  assert.equal(new Set(deals.map(deal => deal.name)).size, deals.length,
    'legacy records receive distinct canonical sponsor names');
  assert.ok(deals.every(deal => pool.has(deal.name)), 'every migrated name belongs to the canonical pool');
  assert.deepEqual(
    deals.slice(1).map(({ id, reward, goal, customNote }) => ({ id, reward, goal, customNote })),
    formerNames.map((name, index) => ({
      id: 700 + index,
      reward: 20000 + index * 500,
      goal: index % 2 ? 'top4' : 'win6',
      customNote: `legacy-${index}`,
    })),
    'migration changes identity fields without changing contract terms',
  );
});
