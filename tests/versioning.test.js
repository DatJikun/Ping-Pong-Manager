const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('public beta uses semantic 0.x numbering everywhere', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const versionJs = read('src/data/version.js');
  const html = read('index.html');
  const pages = read('src/ui/pages.js');

  assert.equal(pkg.version, '0.1.1');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(versionJs, /APP_VERSION\s*=\s*'0\.1\.1'/);
  assert.match(versionJs, /APP_CHANNEL\s*=\s*'beta'/);
  assert.ok(html.indexOf('src/data/version.js') < html.indexOf('src/i18n/i18n.js'));
  assert.match(pages, /appVersionLabel/);
});

test('release docs keep the build date outside the game version', () => {
  const readme = read('README.md');
  const versioning = read('docs/VERSIONING.md');
  const release = read('docs/releases/WINDOWS-BETA-0.1.1.md');

  for (const text of [readme, versioning, release]) {
    assert.doesNotMatch(text, /17\.0\.0-beta\.2/);
  }
  assert.match(readme, /PingPong Manager 0\.1\.1 beta \(20260821\)/);
  assert.match(readme, /v0\.1\.1-20260821/);
  assert.match(versioning, /Data.*tylko.*GitHub Release/is);
  assert.match(release, /PingPong-Manager-0\.1\.1-windows-x64\.zip/);
});
