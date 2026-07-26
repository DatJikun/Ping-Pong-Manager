// =============================================================================
// tests/avatars.test.js — Procedural player/staff portraits return valid SVG data.
// =============================================================================

const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

test('getAvatarData returns a unique SVG data-URL for players and staff', () => {
  const g = boot(3);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;

  const player = G.players.find((p) => p.teamId === G.myTeamId && !p.retired);
  const staff = G.staff.find((s) => s.teamId === G.myTeamId) || G.staff[0];
  assert.ok(player, 'has a player');
  assert.ok(staff, 'has staff');

  const pUrl = gp.getAvatarData(player, 'player');
  const sUrl = gp.getAvatarData(staff, 'staff');
  assert.ok(pUrl.startsWith('data:image/svg+xml'), 'player avatar is SVG data URL');
  assert.ok(sUrl.startsWith('data:image/svg+xml'), 'staff avatar is SVG data URL');
  assert.notStrictEqual(pUrl, sUrl, 'player and staff portraits differ');

  // Decode and check for a real face-ish SVG (not empty).
  const decode = (u) => decodeURIComponent(u.replace(/^data:image\/svg\+xml;utf8,/, ''));
  const pSvg = decode(pUrl);
  const sSvg = decode(sUrl);
  assert.ok(pSvg.includes('<svg'), 'player SVG markup');
  assert.ok(sSvg.includes('<svg'), 'staff SVG markup');
  assert.ok(pSvg.includes('ellipse') || pSvg.includes('circle'), 'has face geometry');
  // Staff torso should include shirt/blazer fill path; players jersey.
  assert.ok(pSvg.length > 800 && sSvg.length > 800, 'portraits are detailed enough');
});

test('same entity always gets the same avatar (stable seed)', () => {
  const g = boot(9);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const p = g.PPM.state.G.players[0];
  assert.strictEqual(gp.getAvatarData(p, 'player'), gp.getAvatarData(p, 'player'));
});

test('player with a club jersey differs from free-agent palette', () => {
  const g = boot(5);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const G = g.PPM.state.G;
  const p = G.players.find((x) => x.teamId === G.myTeamId && !x.retired);
  assert.ok(p);
  const url = gp.getAvatarData(p, 'player');
  const svg = decodeURIComponent(url.replace(/^data:image\/svg\+xml;utf8,/, ''));
  const fa = { ...p, id: p.id + 99999, teamId: null, name: p.name + ' FA' };
  const urlFa = gp.getAvatarData(fa, 'player');
  assert.notStrictEqual(url, urlFa, 'clubbed player jersey should differ from free-agent palette');
  assert.ok(/#[0-9a-fA-F]{6}/.test(svg), 'avatar SVG contains hex colours');
});

test('Asian and European nationalities produce different portrait DNA', () => {
  const g = boot(12);
  g.PPM.gameplay.newGame(0, 'PL');
  const gp = g.PPM.gameplay;
  const base = { id: 7001, name: 'Test Player', age: 25, teamId: null };
  const eu = gp.getAvatarData({ ...base, nationality: 'PL' }, 'player');
  const cn = gp.getAvatarData({ ...base, id: 7002, nationality: 'CN' }, 'player');
  const jp = gp.getAvatarData({ ...base, id: 7003, nationality: 'JP' }, 'player');
  assert.notStrictEqual(eu, cn);
  assert.notStrictEqual(cn, jp);
});
