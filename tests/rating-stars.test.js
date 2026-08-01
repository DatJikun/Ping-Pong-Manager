const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./harness');

function layerWidths(html, layer) {
  const pattern = new RegExp(`rating-stars__clip--${layer}" style="width:([0-9.]+)%`, 'g');
  return [...html.matchAll(pattern)].map(match => Number(match[1]));
}

function rootAriaLabel(html) {
  return html.match(/class="rating-stars[^"]*" role="img" aria-label="([^"]*)"/)?.[1] || '';
}

test('rating renderer layers current and peak fills without exposing peak in summary labels', () => {
  const g = boot(4101);
  const { gameplay: gp } = g.PPM;
  const ratings = g.PPM.ratingStars;
  const profile = gp.ratingProfile(62, 84);
  const html = ratings.renderRating(profile, {
    size: 'standard', peakKnown: true, disclosure: 'summary', showCurrentOvr: true,
  });

  assert.equal((html.match(/rating-stars__slot/g) || []).length, 5);
  assert.deepEqual(layerWidths(html, 'current'), [100, 100, 100, 10, 0]);
  assert.deepEqual(layerWidths(html, 'peak'), [100, 100, 100, 100, 20]);
  assert.match(html, />62</);
  assert.doesNotMatch(rootAriaLabel(html), /84/);
});

test('rating renderer handles endpoints, fractional fills, and inverted or malformed rating inputs', () => {
  const g = boot(4102);
  const { gameplay: gp } = g.PPM;
  const ratings = g.PPM.ratingStars;

  const empty = ratings.renderRating(gp.ratingProfile(0, 0), { size: 'compact', peakKnown: true, disclosure: 'summary', showCurrentOvr: false });
  assert.deepEqual(layerWidths(empty, 'current'), [0, 0, 0, 0, 0]);
  assert.deepEqual(layerWidths(empty, 'peak'), [0, 0, 0, 0, 0]);

  const full = ratings.renderRating(gp.ratingProfile(100, 100), { size: 'compact', peakKnown: true, disclosure: 'summary', showCurrentOvr: false });
  assert.deepEqual(layerWidths(full, 'current'), [100, 100, 100, 100, 100]);
  assert.deepEqual(layerWidths(full, 'peak'), [100, 100, 100, 100, 100]);

  const fractional = ratings.renderRating(gp.ratingProfile(61, 83), { size: 'compact', peakKnown: true, disclosure: 'summary', showCurrentOvr: false });
  assert.deepEqual(layerWidths(fractional, 'current'), [100, 100, 100, 5, 0]);
  assert.deepEqual(layerWidths(fractional, 'peak'), [100, 100, 100, 100, 15]);

  const normalized = gp.ratingProfile('oops', -20);
  const malformed = ratings.renderRating(normalized, { size: 'compact', peakKnown: true, disclosure: 'summary', showCurrentOvr: false });
  assert.deepEqual(layerWidths(malformed, 'current'), [0, 0, 0, 0, 0]);
  assert.deepEqual(layerWidths(malformed, 'peak'), [0, 0, 0, 0, 0]);

  const inverted = ratings.renderRating(gp.ratingProfile(75, 40), { size: 'compact', peakKnown: true, disclosure: 'summary', showCurrentOvr: false });
  assert.deepEqual(layerWidths(inverted, 'peak'), [100, 100, 100, 75, 0]);
});

test('rating renderer whitelists sizes and prevents unknown potential disclosure', () => {
  const g = boot(4103);
  const { gameplay: gp } = g.PPM;
  const ratings = g.PPM.ratingStars;
  const profile = gp.ratingProfile(62, 84);

  ['compact', 'standard', 'profile'].forEach(size => {
    const html = ratings.renderRating(profile, { size, peakKnown: false, disclosure: 'summary', showCurrentOvr: false });
    assert.match(html, new RegExp(`rating-stars--${size}`));
    assert.equal((html.match(/rating-stars__slot/g) || []).length, 5);
    assert.deepEqual(layerWidths(html, 'peak'), [100, 100, 100, 10, 0]);
  });

  const fallback = ratings.renderRating(profile, { size: 'hostile value', peakKnown: true, disclosure: 'hostile value', showCurrentOvr: false });
  assert.match(fallback, /rating-stars--standard/);
  assert.match(fallback, /rating-stars--summary/);

  const knownProfile = ratings.renderRating(profile, { size: 'profile', peakKnown: true, disclosure: 'profile', showCurrentOvr: false });
  assert.match(rootAriaLabel(knownProfile), /84/);
  const unknownProfile = ratings.renderRating(profile, { size: 'profile', peakKnown: false, disclosure: 'profile', showCurrentOvr: false });
  assert.doesNotMatch(rootAriaLabel(unknownProfile), /84/);
  assert.match(rootAriaLabel(unknownProfile), /unknown/i);
});
