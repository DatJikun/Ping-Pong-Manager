const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('the shipped app has no remote runtime scripts, stylesheets or fonts', () => {
  const html = read('index.html');
  const remoteRuntimeTags = [...html.matchAll(
    /<(?:script|link)\b[^>]*(?:src|href)=["']https?:\/\/[^"']+["'][^>]*>/gi,
  )].map(match => match[0]);

  assert.deepEqual(remoteRuntimeTags, []);
});

test('the locked UI fonts and their licences are shipped locally', () => {
  for (const relative of [
    'assets/fonts/Barlow-Regular.ttf',
    'assets/fonts/Barlow-Medium.ttf',
    'assets/fonts/Barlow-SemiBold.ttf',
    'assets/fonts/Barlow-Bold.ttf',
    'assets/fonts/SairaCondensed-Medium.ttf',
    'assets/fonts/SairaCondensed-SemiBold.ttf',
    'assets/fonts/SairaCondensed-Bold.ttf',
    'assets/fonts/SairaCondensed-ExtraBold.ttf',
    'assets/fonts/OFL-Barlow.txt',
    'assets/fonts/OFL-SairaCondensed.txt',
  ]) {
    assert.ok(fs.existsSync(path.join(root, relative)), `missing release asset: ${relative}`);
  }
});

test('page and modal transitions do not depend on GSAP', () => {
  assert.doesNotMatch(read('index.html'), /\bgsap\b/i);
  assert.doesNotMatch(read('src/ui/shell.js'), /\bgsap\b/i);
});
