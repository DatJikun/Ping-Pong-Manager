const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('desktop shell keeps game code isolated from Node and denies permissions', () => {
  const source = read('desktop/main.cjs');
  assert.match(source, /contextIsolation:\s*true/);
  assert.match(source, /nodeIntegration:\s*false/);
  assert.match(source, /sandbox:\s*true/);
  assert.match(source, /setPermissionRequestHandler[\s\S]*callback\(false\)/);
  assert.match(source, /setWindowOpenHandler/);
  assert.match(source, /will-navigate/);
});

test('desktop package contains only runtime assets and produces a portable target', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.main, 'desktop/main.cjs');
  assert.equal(pkg.build.asar, true);
  assert.deepEqual(pkg.build.win.target, ['portable']);
  assert.ok(pkg.build.files.includes('src/**/*'));
  assert.ok(pkg.build.files.includes('assets/**/*'));
  assert.ok(!pkg.build.files.some(pattern => /tests|prototypes|saves/i.test(pattern)));
});

test('local runtime has a restrictive CSP and no remote network access', () => {
  const html = read('index.html');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /frame-src 'none'/);
});
