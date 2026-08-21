// Single source of truth for the public product version.
// 0.x = public beta. 1.0.0 = first real release. Patch bumps: 0.1.1, 0.1.2…
// Keep this file in sync with package.json and src-tauri/tauri.conf.json
// (tests/version-sync.test.js enforces it).
(function () {
  window.PPM = window.PPM || {};
  window.PPM.APP_VERSION = '0.1.2';
  window.PPM.APP_CHANNEL = 'beta';
  window.PPM.appVersionLabel = function () {
    const v = window.PPM.APP_VERSION || '0.1.0';
    const ch = window.PPM.APP_CHANNEL;
    return ch && ch !== 'release' ? v + ' ' + ch : v;
  };
})();
