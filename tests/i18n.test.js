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

test('the career history views follow the active locale', () => {
  const g = boot(3114);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  g.PPM.ui.historyTab = 'seasons';
  const englishSeasons = g.PPM.pages.pageHistory();
  assert.match(englishSeasons, /History &amp; statistics|History & statistics/i);
  assert.match(englishSeasons, /Player OVR/i);
  g.PPM.ui.historyTab = 'manager';
  assert.match(g.PPM.pages.pageHistory(), /Manager career/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.ui.historyTab = 'seasons';
  const polish = g.PPM.pages.pageHistory();
  assert.match(polish, /Historia i statystyki/i);
  assert.match(polish, /OVR zawodników/i);
});

test('league tables and the cup bracket follow the active locale', () => {
  const g = boot(3115);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const englishLeague = g.PPM.pages.pageLeague();
  const englishCup = g.PPM.pages.pageCup();
  assert.match(englishLeague, /League · Season/i);
  assert.match(englishLeague, /Division I table/i);
  assert.match(englishCup, /National Cup/i);
  assert.doesNotMatch(englishLeague, /Ostatnie dwie drużyny/i);

  g.PPM.i18n.setLocale('pl');
  const polishLeague = g.PPM.pages.pageLeague();
  const polishCup = g.PPM.pages.pageCup();
  assert.match(polishLeague, /Liga · Sezon/i);
  assert.match(polishLeague, /Tabela I Ligi/i);
  assert.match(polishCup, /Puchar krajowy/i);
});

test('completed English screens reject common Polish UI regressions and raw keys', () => {
  const g = boot(3116);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });
  g.PPM.state.G.inbox = [];
  g.PPM.state.G.newsFeed = [];
  g.PPM.ui.squadTab = 'starter';
  g.PPM.ui.historyTab = 'seasons';
  g.PPM.ui.leagueStatsTab = 'table';

  const rendered = [
    g.PPM.pages.pageDash(),
    g.PPM.pages.pagePreseason(),
    g.PPM.pages.pageSquad(),
    g.PPM.pages.pageStaff(),
    g.PPM.pages.pageMarket(),
    g.PPM.pages.pageBudget(),
    g.PPM.pages.pageSponsors(),
    g.PPM.pages.pageHistory(),
    g.PPM.pages.pageLeague(),
    g.PPM.pages.pageCup(),
    g.PPM.pages.pageInbox(),
    g.PPM.pages.pageNews(),
    g.PPM.pages.pageHoF(),
    g.PPM.pages.pageClub(),
  ].join('\n');

  assert.doesNotMatch(rendered, /Skład główny|Szukaj w transferach|Zobowiązania S\+1|Aktywne umowy|Historia sezonów|Tabela I Ligi|Puchar krajowy|Skrzynka klubowa|Wszystkie sezony|Galeria emerytów|Infrastruktura klubu|Treningi na podwórku/i);
  assert.doesNotMatch(rendered, />\s*(?:squad|staff|market|budget|sponsors|history|league|cup|inbox|news|hof|club)\.[a-zA-Z.]+\s*</);
});

test('Hall of Fame gallery and record book follow the active locale', () => {
  const g = boot(3117);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  g.PPM.ui.hofRealTab = 'hof';
  const englishGallery = g.PPM.pages.pageHoF();
  assert.match(englishGallery, /Retired legends/i);
  assert.match(englishGallery, /My club/i);
  g.PPM.ui.hofRealTab = 'records';
  const englishRecords = g.PPM.pages.pageHoF();
  assert.match(englishRecords, /Club records/i);
  assert.match(englishRecords, /Individual records/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.ui.hofRealTab = 'records';
  const polish = g.PPM.pages.pageHoF();
  assert.match(polish, /Księga rekordów/i);
  assert.match(polish, /Rekordy klubowe/i);
});

test('club facilities and their data descriptions follow the active locale', () => {
  const g = boot(3118);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const english = g.PPM.pages.pageClub();
  assert.match(english, /Club infrastructure/i);
  assert.match(english, /Training hall/i);
  assert.match(english, /Outdoor training|No hall/i);
  assert.match(english, /Technical partnership/i);
  assert.doesNotMatch(english, /Treningi na podwórku|Partnerstwo techniczne/i);

  g.PPM.i18n.setLocale('pl');
  const polish = g.PPM.pages.pageClub();
  assert.match(polish, /Infrastruktura klubu/i);
  assert.match(polish, /Hala treningowa/i);
  assert.match(polish, /Treningi na podwórku|Brak hali/i);
});

test('player and staff profile modals follow the active locale', () => {
  const g = boot(3119);
  g.PPM.gameplay.newGame(0, 'PL');
  const player = g.PPM.state.G.players.find(p => p.teamId === g.PPM.state.G.myTeamId);
  const staff = g.PPM.state.G.staff.find(s => s.teamId === g.PPM.state.G.myTeamId)
    || g.PPM.state.G.staffPool[0];

  g.PPM.gameplay.openPlayerModal(player.id);
  const englishPlayer = g.document.getElementById('modal').innerHTML;
  assert.match(englishPlayer, /Equipment|Career points|Match modifiers/i);
  assert.doesNotMatch(englishPlayer, /Sprzęt|Punkty w karierze|Modyfikatory meczowe/i);

  g.PPM.gameplay.openStaffModal(staff.id);
  const englishStaff = g.document.getElementById('modal').innerHTML;
  assert.match(englishStaff, /Club history|Current club/i);
  assert.doesNotMatch(englishStaff, /Historia klubów|Wolny rynek/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.openPlayerModal(player.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Sprzęt|Punkty w karierze/i);
  g.PPM.gameplay.openStaffModal(staff.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Historia klubów/i);
});

test('player and staff contract negotiations follow the active locale', () => {
  const g = boot(3120);
  g.PPM.gameplay.newGame(0, 'PL');
  const player = g.PPM.state.G.players.find(p => p.teamId === null && !p.retired);
  const staff = g.PPM.state.G.staffPool.find(s => s.teamId === null);

  g.PPM.gameplay.openNegotiate(player.id);
  const englishPlayer = g.document.getElementById('modal').innerHTML;
  assert.match(englishPlayer, /Negotiations|Signing bonus|Promised role/i);
  assert.doesNotMatch(englishPlayer, /Negocjacje|Premia za podpis|Obiecana rola/i);

  g.PPM.gameplay.openStaffNeg(staff.id);
  const englishStaff = g.document.getElementById('modal').innerHTML;
  assert.match(englishStaff, /Contract years|Expected|Hire/i);
  assert.doesNotMatch(englishStaff, /Lata kontraktu|Zatrudnij/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.openNegotiate(player.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Negocjacje|Premia za podpis/i);
  g.PPM.gameplay.openStaffNeg(staff.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Lata kontraktu|Zatrudnij/i);
});

test('the mandatory match nomination flow follows the active locale', () => {
  const g = boot(3121);
  g.PPM.gameplay.newGame(0, 'PL');

  g.PPM.gameplay.openMatchNomination(() => {});
  const english = g.document.getElementById('modal').innerHTML;
  assert.match(english, /Match nomination|Click a player|Fatigue/i);
  assert.doesNotMatch(english, /Nominacja meczowa|Kliknij zawodnika|Zmęczenie/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.openMatchNomination(() => {});
  const polish = g.document.getElementById('modal').innerHTML;
  assert.match(polish, /Nominacja meczowa|Kliknij zawodnika|Zmęczenie/i);
});
