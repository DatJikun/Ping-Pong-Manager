const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('product version is 0.x beta and stays in sync', () => {
  const pkg = JSON.parse(read('package.json'));
  const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
  const cargo = read('src-tauri/Cargo.toml');
  const versionJs = read('src/data/version.js');
  const html = read('index.html');
  const v = pkg.version;

  assert.match(v, /^0\.\d+\.\d+$/);
  assert.match(versionJs, new RegExp(`APP_VERSION = '${v.replace(/\./g, '\\.')}'`));
  assert.match(versionJs, /APP_CHANNEL = 'beta'/);
  assert.equal(tauri.version, v);
  assert.match(cargo, new RegExp(`^version = "${v.replace(/\./g, '\\.')}"$`, 'm'));
  assert.match(html, /src\/data\/version\.js/);
});

test('Windows release workflow publishes an exe on master', () => {
  const yml = read('.github/workflows/release-windows.yml');
  assert.match(yml, /tauri-apps\/tauri-action/);
  assert.match(yml, /branches: \[master\]/);
  assert.match(yml, /prerelease: true/);
  assert.match(yml, /includeUpdaterJson: false/);
  assert.match(read('src-tauri/tauri.conf.json'), /npm run desktop:pack/);
});
