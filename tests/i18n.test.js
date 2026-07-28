const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { boot, LOAD_ORDER } = require('./harness');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('English is the release default and Polish remains selectable', () => {
  const g = boot(3101);
  assert.equal(g.PPM.i18n.getLocale(), 'en');
  assert.equal(g.PPM.i18n.t('common.close'), 'Close');
  g.PPM.i18n.setLocale('pl');
  assert.equal(g.PPM.i18n.t('common.close'), 'Zamknij');
  assert.equal(g.document.documentElement.lang, 'pl');
});

test('locale dictionaries have identical keys and interpolate parameters', () => {
  const g = boot(3102);
  const { dictionaries, t, setLocale } = g.PPM.i18n;
  assert.deepEqual(
    Object.keys(dictionaries.en).sort(),
    Object.keys(dictionaries.pl).sort(),
  );
  setLocale('en');
  assert.equal(t('career.resumed', { name: 'Piorun' }), 'Resumed Piorun.');
  assert.equal(t('missing.key'), 'missing.key');
});

test('i18n loads before state and app settings persist the selected language', () => {
  assert.ok(LOAD_ORDER.indexOf('src/i18n/i18n.js') < LOAD_ORDER.indexOf('src/core/state.js'));
  const g = boot(3103);
  assert.equal(g.PPM.stateApi.DEFAULT_APP_SETTINGS.locale, 'en');
  g.PPM.stateApi.updateAppSettings({ locale: 'pl' });
  assert.equal(g.PPM.stateApi.loadAppSettings().locale, 'pl');
});

test('the document declares English and loads i18n before game modules', () => {
  const html = read('index.html');
  assert.match(html, /<html lang="en">/);
  assert.ok(html.indexOf('src/i18n/i18n.js') < html.indexOf('src/data/constants.js'));
});

test('the start screen renders in English and switches to Polish without reload', () => {
  const g = boot(3104);
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });
  g.PPM.pages.renderStart();
  const content = g.document.getElementById('content');
  assert.match(content.innerHTML, /NEW GAME/i);
  assert.match(content.innerHTML, /Your careers/i);
  assert.doesNotMatch(content.innerHTML, /Twoje kariery/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.pages.renderStart();
  assert.match(content.innerHTML, /NOWA GRA/i);
  assert.match(content.innerHTML, /Twoje kariery/i);
});
