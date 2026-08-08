const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const bytes = relative => fs.readFileSync(path.join(root, relative));

function pngInfo(relative) {
  const png = bytes(relative);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    colorType: png[25],
  };
}

function icoSizes(relative) {
  const ico = bytes(relative);
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  const count = ico.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16;
    const dimension = value => value || 256;
    return [dimension(ico[offset]), dimension(ico[offset + 1])];
  });
}

function sha256(relative) {
  return crypto.createHash('sha256').update(bytes(relative)).digest('hex');
}

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

test('release keeps the approved source artwork byte-for-byte in branding assets', () => {
  assert.deepEqual(pngInfo('assets/branding/pingpong-manager-logo.png'), {
    width: 1254,
    height: 1254,
    colorType: 2,
  });
  assert.equal(
    sha256('assets/branding/pingpong-manager-logo.png'),
    '056875955f4c1fc1e02581f710bdd98cb89c947c6b50969104d93de313f236e0',
  );

  assert.deepEqual(pngInfo('assets/branding/pingpong-manager-itch-banner.png'), {
    width: 1408,
    height: 1117,
    colorType: 2,
  });
  assert.equal(
    sha256('assets/branding/pingpong-manager-itch-banner.png'),
    '9558f6eb3887d8d867f49ffe164e804563b8035022ff14dc7e11f9d1daf024d4',
  );
});

test('release includes opaque store and Windows artwork at exact dimensions', () => {
  assert.deepEqual(pngInfo('assets/branding/pingpong-manager-itch-cover-630x500.png'), {
    width: 630,
    height: 500,
    colorType: 2,
  });
  assert.deepEqual(pngInfo('assets/branding/pingpong-manager-icon-512.png'), {
    width: 512,
    height: 512,
    colorType: 2,
  });
  assert.deepEqual(icoSizes('assets/branding/pingpong-manager.ico'), [
    [16, 16],
    [24, 24],
    [32, 32],
    [48, 48],
    [64, 64],
    [128, 128],
    [256, 256],
  ]);
});

test('beta package identity is stable and every desktop surface uses approved icons', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const main = read('desktop/main.cjs');
  const html = read('index.html');

  assert.equal(pkg.name, 'pingpong-manager');
  assert.equal(pkg.version, '17.0.0-beta.1');
  assert.equal(lock.version, '17.0.0-beta.1');
  assert.equal(lock.packages[''].version, '17.0.0-beta.1');
  assert.equal(pkg.build.appId, 'com.datjikun.pingpongmanager');
  assert.equal(pkg.build.productName, 'PingPong Manager');
  assert.equal(pkg.build.win.icon, 'assets/branding/pingpong-manager.ico');
  assert.ok(pkg.build.files.includes('assets/**/*'));
  assert.match(main, /icon:\s*path\.join\(__dirname,\s*'\.\.',\s*'assets',\s*'branding',\s*'pingpong-manager-icon-512\.png'\)/);
  assert.match(html, /<link\s+rel=["']icon["']\s+type=["']image\/png["']\s+href=["']\.\/assets\/branding\/pingpong-manager-icon-512\.png["']\s*>/);
});

test('local runtime has a restrictive CSP and no remote network access', () => {
  const html = read('index.html');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /frame-src 'none'/);
});
