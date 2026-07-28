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

test('player styles, traits and career state use semantic translation keys', () => {
  const g = boot(3110);
  assert.equal(g.PPM.i18n.t('style.DEFENDER'), 'Modern defender');
  assert.equal(g.PPM.i18n.t('trait.MENTOR.label'), 'Mentor');
  assert.equal(g.PPM.i18n.t('form.deepSlump'), 'deep slump');
  g.PPM.i18n.setLocale('pl');
  assert.equal(g.PPM.i18n.t('style.DEFENDER'), 'Nowoczesny defensor');
  assert.equal(g.PPM.i18n.t('trait.MENTOR.desc'), 'Przyspiesza rozwój młodszych kolegów z rezerwy.');
  assert.equal(g.PPM.i18n.t('form.deepSlump'), 'głęboki dołek');
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

test('the pre-season decision flow follows the active locale', () => {
  const g = boot(3105);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const english = g.PPM.pages.pagePreseason();
  assert.match(english, /SEASON PREPARATION/i);
  assert.match(english, /Who funds this season/i);
  assert.doesNotMatch(english, /Kto finansuje ten sezon/i);

  g.PPM.i18n.setLocale('pl');
  const polish = g.PPM.pages.pagePreseason();
  assert.match(polish, /PRZYGOTOWANIA DO SEZONU/i);
  assert.match(polish, /Kto finansuje ten sezon/i);
});

test('the dashboard shell follows the active locale', () => {
  const g = boot(3106);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const english = g.PPM.pages.pageDash();
  assert.match(english, /PROJECT PULSE/i);
  assert.match(english, /SEASON STORY/i);
  assert.doesNotMatch(english, /PULS PROJEKTU/i);

  g.PPM.i18n.setLocale('pl');
  const polish = g.PPM.pages.pageDash();
  assert.match(polish, /PULS PROJEKTU/i);
  assert.match(polish, /NARRACJA SEZONU/i);
});

test('the squad and academy flows follow the active locale', () => {
  const g = boot(3107);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  g.PPM.ui.squadTab = 'starter';
  const englishSquad = g.PPM.pages.pageSquad();
  assert.match(englishSquad, /Player squad/i);
  assert.match(englishSquad, /First team/i);
  assert.match(englishSquad, /Fatigue/i);
  assert.doesNotMatch(englishSquad, /Skład główny/i);

  g.PPM.ui.squadTab = 'youth';
  g.PPM.ui.academyTab = 'intake';
  const englishAcademy = g.PPM.pages.pageSquad();
  assert.match(englishAcademy, /Academy intake/i);
  assert.match(englishAcademy, /Who joins the academy/i);
  assert.doesNotMatch(englishAcademy, /Kogo bierzesz do akademii/i);

  g.PPM.i18n.setLocale('pl');
  const polishAcademy = g.PPM.pages.pageSquad();
  assert.match(polishAcademy, /Nabór do akademii/i);
  assert.match(polishAcademy, /Kogo bierzesz do akademii/i);
});

test('the club staff screen follows the active locale', () => {
  const g = boot(3108);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const english = g.PPM.pages.pageStaff();
  assert.match(english, /Club staff/i);
  assert.match(english, /Search transfers/i);
  assert.match(english, /Physiotherapist/i);
  assert.doesNotMatch(english, /Szukaj w transferach/i);

  g.PPM.i18n.setLocale('pl');
  const polish = g.PPM.pages.pageStaff();
  assert.match(polish, /Sztab klubu/i);
  assert.match(polish, /Szukaj w transferach/i);
});

test('the transfer market follows the active locale', () => {
  const g = boot(3109);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const english = g.PPM.pages.pageMarket();
  assert.match(english, /Transfer market/i);
  assert.match(english, /Search by name or club/i);
  assert.match(english, /S\+1 deals/i);
  assert.doesNotMatch(english, /Rynek transferowy/i);

  g.PPM.i18n.setLocale('pl');
  const polish = g.PPM.pages.pageMarket();
  assert.match(polish, /Rynek transferowy/i);
  assert.match(polish, /Szukaj nazwiska lub klubu/i);
});

test('the budget screen follows the active locale and locale-aware money formatting', () => {
  const g = boot(3111);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const english = g.PPM.pages.pageBudget();
  assert.match(english, /Budget &amp; finance|Budget & finance/i);
  assert.match(english, /End-of-season forecast/i);
  assert.match(english, /Next-season planning/i);
  assert.doesNotMatch(english, /Prognoza końca sezonu/i);

  g.PPM.i18n.setLocale('pl');
  const polish = g.PPM.pages.pageBudget();
  assert.match(polish, /Budżet i finanse/i);
  assert.match(polish, /Prognoza końca sezonu/i);
  assert.match(polish, /Planowanie kolejnego sezonu/i);
});

test('sponsor goals and the sponsor screen follow the active locale', () => {
  const g = boot(3112);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  assert.equal(g.PPM.gameplay.goalDesc('top4'), 'Top 4 in the league');
  assert.equal(g.PPM.gameplay.roleGuaranteeLabel('rotation'), 'Rotation role');
  const english = g.PPM.pages.pageSponsors();
  assert.match(english, /Sponsors/i);
  assert.match(english, /Active deals/i);
  assert.doesNotMatch(english, /Aktywne umowy/i);

  g.PPM.i18n.setLocale('pl');
  assert.equal(g.PPM.gameplay.goalDesc('top4'), 'Top 4 w lidze');
  assert.equal(g.PPM.gameplay.roleGuaranteeLabel('rotation'), 'Rola w rotacji');
  const polish = g.PPM.pages.pageSponsors();
  assert.match(polish, /Aktywne umowy/i);
});

test('inbox and news entries can store semantic keys and switch language live', () => {
  const g = boot(3113);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });
  g.PPM.gameplay.pushMail({
    fromKey: 'mail.board',
    subjectKey: 'mail.welcomeSubject',
    subjectParams: { club: 'Arc Club' },
    bodyKey: 'mail.welcomeBody',
    bodyParams: { years: 4, club: 'Arc Club', division: 'I' },
  });
  g.PPM.gameplay.pushNews('mail.welcomeSubject', 'good', { club: 'Arc Club' });

  const englishInbox = g.PPM.pages.pageInbox();
  const englishNews = g.PPM.pages.pageNews();
  assert.match(englishInbox, /Club inbox/i);
  assert.match(englishInbox, /Welcome to/i);
  assert.match(englishNews, /News &amp; media|News & media/i);
  assert.match(englishNews, /Welcome to Arc Club/i);

  g.PPM.i18n.setLocale('pl');
  const polishInbox = g.PPM.pages.pageInbox();
  const polishNews = g.PPM.pages.pageNews();
  assert.match(polishInbox, /Skrzynka klubowa/i);
  assert.match(polishInbox, /Witamy w/i);
  assert.match(polishNews, /Newsy i media/i);
  assert.match(polishNews, /Witamy w Arc Club/i);
});
