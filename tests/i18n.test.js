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

test('the in-game guide follows the active locale', () => {
  const g = boot(3135);
  vm.runInContext(read('src/ui/shell.js'), g, { filename: 'src/ui/shell.js' });

  g.PPM.shell.openGuide();
  const english = g.document.getElementById('modal').innerHTML;
  assert.match(english, /GUIDE|PLAYING STYLES|Grip|Strong against|PRE-SEASON|FATIGUE|LOANS & DATABASE/i);
  assert.doesNotMatch(english, /PRZEWODNIK|STYLE GRY|Uchwyt|Dobry przeciw|ZMĘCZENIE|WYPOŻYCZENIA/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.shell.openGuide();
  const polish = g.document.getElementById('modal').innerHTML;
  assert.match(polish, /PRZEWODNIK|STYLE GRY|Uchwyt|Dobry przeciw|ZMĘCZENIE|WYPOŻYCZENIA I DATABASE/i);
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

test('the dashboard Top 12 action follows the active locale', () => {
  const g = boot(3133);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });
  const G = g.PPM.state.G;
  G.phase = 'pre';
  G.matchday = 21;
  G.top12MastersDone = { 1: false, 2: false };

  const english = g.PPM.pages.pageDash();
  assert.match(english, /TOP 12.*DIVISION (?:I|II)/i);
  assert.doesNotMatch(english, /TOP 12.*LIGA/i);

  g.PPM.i18n.setLocale('pl');
  assert.match(g.PPM.pages.pageDash(), /TOP 12.*(?:I|II) LIGA/i);
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

test('next-season commitment descriptions follow the active locale', () => {
  const g = boot(3125);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });
  const G = g.PPM.state.G;
  const player = G.players.find(p => p.teamId === null && !p.retired);
  const staff = G.staffPool.find(s => s.teamId === null && s.type !== 'pr');
  G.preSignedPlayers = [{
    playerId: player.id, destinationTeamId: G.myTeamId,
    salary: 12000, bonus: 3000, years: 2, promisedRole: 'rotation',
  }];
  G.pendingStaffSignings = [{
    staffId: staff.id, destinationTeamId: G.myTeamId, years: 2,
  }];

  const english = g.PPM.pages.pageBudget();
  assert.match(english, /player joining next season|staff joining next season/i);
  assert.doesNotMatch(english, /zawodnik od nowego sezonu|sztab od nowego sezonu/i);

  g.PPM.i18n.setLocale('pl');
  const polish = g.PPM.pages.pageBudget();
  assert.match(polish, /zawodnik od nowego sezonu|sztab od nowego sezonu/i);
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

test('club overview and difficulty details follow the active locale', () => {
  const g = boot(3125);
  g.PPM.gameplay.newGame(0, 'PL');
  const club = g.PPM.state.G.teams.find(team => team.id === g.PPM.state.G.myTeamId);

  g.PPM.gameplay.openTeamOverview(club.id);
  const english = g.document.getElementById('modal').innerHTML;
  assert.match(english, /Management|Club identity|Rivalries|Infrastructure/i);
  assert.doesNotMatch(english, /ZARZADZANIE|TOZSAMOSC KLUBU|RYWALIZACJE|Budzet/i);
  assert.match(g.PPM.gameplay.difficultyEffectsSummary('hard').join(' '), /AI clubs|Free agents|Negotiations/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.openTeamOverview(club.id);
  const polish = g.document.getElementById('modal').innerHTML;
  assert.match(polish, /Zarządzanie|Tożsamość klubu|Rywalizacje|Infrastruktura/i);
  assert.match(g.PPM.gameplay.difficultyEffectsSummary('hard').join(' '), /Kluby AI|Wolni zawodnicy|Negocjacje/i);
});

test('equipment and infrastructure actions report in the active locale', () => {
  const g = boot(3127);
  g.PPM.gameplay.newGame(0, 'PL');
  let message = '';
  g.toast = value => { message = value; };
  g.PPM.gameplay.setRubberTier(1);
  assert.match(message, /Club rubbers/i);

  g.PPM.state.G.infraHall = 1;
  g.PPM.gameplay.downgradeInfra('hall');
  assert.match(message, /Downgraded to/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.setRubberTier(0);
  assert.match(message, /Okładziny klubowe/i);
});

test('academy intake and Top 12 selection follow the active locale', () => {
  const g = boot(3126);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.infraAcademy = 1;
  G.academyProspects = g.PPM.gameplay.genAcademyIntake(G.myTeamId, G.countryId);

  g.PPM.gameplay.pullYouth();
  const academyEnglish = g.document.getElementById('modal').innerHTML;
  assert.match(academyEnglish, /Academy intake|Readiness|Ceiling|Accept into academy/i);
  assert.doesNotMatch(academyEnglish, /Klasa rocznika|Gotowość|Sufit|Przyjmij do akademii/i);

  G.phase = 'pre';
  G.matchday = 21;
  G.top12MastersDone = { 1: false, 2: false };
  g.PPM.gameplay.openTop12Picker(G.teams.find(team => team.id === G.myTeamId).league);
  const top12English = g.document.getElementById('modal').innerHTML;
  assert.match(top12English, /Choose your representative|Recommendation|Appearances|Enter/i);
  assert.doesNotMatch(top12English, /wybierz reprezentanta|Rekomendacja|występów|Wystaw/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.pullYouth();
  assert.match(g.document.getElementById('modal').innerHTML, /Klasa rocznika|Gotowość|Sufit|Przyjmij do akademii/i);
});

test('international career screen and national-team offer follow the active locale', () => {
  const g = boot(3128);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });

  const english = g.PPM.pages.pageMundial();
  assert.match(english, /World Championship|national team|Manager prestige|Call-ups/i);
  assert.doesNotMatch(english, /Reprezentacja|Prestiż menedżera|Powołania|Dostępny/i);

  g.PPM.state.G.managerPrestige = 80;
  g.PPM.state.G.phase = 'transfer';
  g.PPM.gameplay.checkNatTeamOffer();
  assert.match(g.document.getElementById('modal').innerHTML, /National-team manager offer|Accept offer|Decline/i);

  g.PPM.i18n.setLocale('pl');
  assert.match(g.PPM.pages.pageMundial(), /Mundial|reprezentacja|Prestiż menedżera|Powołania/i);
});

test('player and staff profile modals follow the active locale', () => {
  const g = boot(3119);
  g.PPM.gameplay.newGame(0, 'PL');
  const player = g.PPM.state.G.players.find(p => p.teamId === g.PPM.state.G.myTeamId);
  player.traits = ['IRON_STAMINA'];
  const staff = g.PPM.state.G.staff.find(s => s.teamId === g.PPM.state.G.myTeamId && s.type === 'coach')
    || g.PPM.state.G.staffPool.find(s => s.type === 'coach')
    || g.PPM.state.G.staffPool[0];

  g.PPM.gameplay.openPlayerModal(player.id);
  const englishPlayer = g.document.getElementById('modal').innerHTML;
  assert.match(englishPlayer, /Equipment|Career points|Match modifiers/i);
  assert.match(englishPlayer, /Iron Stamina/i);
  assert.doesNotMatch(englishPlayer, /Sprzęt|Punkty w karierze|Modyfikatory meczowe/i);

  g.PPM.gameplay.openStaffModal(staff.id);
  const englishStaff = g.document.getElementById('modal').innerHTML;
  assert.match(englishStaff, /Club history|Current club/i);
  if (staff.type === 'coach') assert.match(englishStaff, /Attacking|Defensive|All-round|Serve-focused|Mental/i);
  assert.doesNotMatch(englishStaff, /Historia klubów|Wolny rynek/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.openPlayerModal(player.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Sprzęt|Punkty w karierze/i);
  g.PPM.gameplay.openStaffModal(staff.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Historia klubów/i);
});

test('saved player awards are translated in profiles and Hall of Fame', () => {
  const g = boot(3132);
  g.PPM.gameplay.newGame(0, 'PL');
  vm.runInContext(read('src/ui/pages.js'), g, { filename: 'src/ui/pages.js' });
  const player = g.PPM.state.G.players.find(p => p.teamId === g.PPM.state.G.myTeamId);
  player.awards = [
    { season: 1, type: 'golden_paddle', displayLabel: 'Z\u0142ota Paletka', label: 'Z\u0142ota Paletka S1' },
    { season: 1, type: 'cup_winner', displayLabel: 'Puchar Polski', label: 'Puchar Polski S1' },
  ];

  g.PPM.gameplay.openPlayerModal(player.id);
  const englishProfile = g.document.getElementById('modal').innerHTML;
  assert.match(englishProfile, /Golden Paddle|Polish Cup winner/i);
  assert.doesNotMatch(englishProfile, /Z\u0142ota Paletka|Puchar Polski/i);

  g.PPM.gameplay.retirePlayer(player);
  const englishHof = g.PPM.pages.pageHoF();
  assert.match(englishHof, /Golden Paddle|Polish Cup winner/i);
  assert.doesNotMatch(englishHof, /Z\u0142ota Paletka|Puchar Polski/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.openPlayerModal(player.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Z\u0142ota Paletka|Puchar Polski/i);
  assert.match(g.PPM.pages.pageHoF(), /Z\u0142ota Paletka|Puchar Polski/i);
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

test('club job market and post-season gala follow the active locale', async () => {
  const g = boot(3122);
  g.PPM.gameplay.newGame(0, 'PL');
  g.PPM.state.G.clubOffers = [{
    clubId: 1, clubIndex: 1, clubName: 'Arc United', countryId: 'PL',
    countryName: 'Polska', league: 1, ovr: 70, budget: 100000,
    prestigeNeed: 20, eligible: true, lastPosition: 4, recentTitles: 0,
  }];

  g.PPM.gameplay.openClubOfferPicker();
  const englishMarket = g.document.getElementById('modal').innerHTML;
  assert.match(englishMarket, /Club job market|All countries|Required prestige/i);
  assert.doesNotMatch(englishMarket, /Rynek nowych klubów|Wszystkie kraje|Prestiż wymagany/i);

  const englishGalaPromise = g.PPM.gameplay.showPostSeasonGala({
    position: 4, summaryKey: 'gala.summary.solid', awards: [], clubOffers: [],
  });
  const englishGala = g.document.getElementById('modal').innerHTML;
  assert.match(englishGala, /Post-season gala|Season summary|Awards/i);
  assert.doesNotMatch(englishGala, /Gala posezonowa|Sezon w skrócie|Nagrody wieczoru/i);
  g._galaResolved = true;
  await englishGalaPromise;

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.openClubOfferPicker();
  assert.match(g.document.getElementById('modal').innerHTML, /Rynek nowych klubów|Wszystkie kraje/i);
  const polishGalaPromise = g.PPM.gameplay.showPostSeasonGala({
    position: 4, summaryKey: 'gala.summary.solid', awards: [], clubOffers: [],
  });
  assert.match(g.document.getElementById('modal').innerHTML, /Gala posezonowa|Sezon w skrócie/i);
  g._galaResolved = true;
  await polishGalaPromise;
});

test('loan and squad replacement modals follow the active locale', () => {
  const g = boot(3123);
  g.PPM.gameplay.newGame(0, 'PL');
  const squad = g.PPM.state.G.players.filter(p => p.teamId === g.PPM.state.G.myTeamId && p.role !== 'youth');
  const loanPlayer = squad.find(p => p.contractYears > 1 && !p.injuredFor);
  const reserve = squad.find(p => p.role === 'reserve') || squad[0];

  g.PPM.gameplay.openLoanModal(loanPlayer.id);
  const englishLoan = g.document.getElementById('modal').innerHTML;
  assert.match(englishLoan, /Loan|Choose a destination club|interest/i);
  assert.doesNotMatch(englishLoan, /Wypożyczenie|Wybierz klub docelowy|zainteresowanie/i);

  g.PPM.gameplay.openSwapModal(reserve.id);
  const englishSwap = g.document.getElementById('modal').innerHTML;
  assert.match(englishSwap, /first team is full|Choose who to replace|Swap/i);
  assert.doesNotMatch(englishSwap, /Skład pełny|Wybierz kogo zastąpić|Zamień/i);

  g.PPM.i18n.setLocale('pl');
  g.PPM.gameplay.openLoanModal(loanPlayer.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Wypożyczenie|Wybierz klub docelowy/i);
  g.PPM.gameplay.openSwapModal(reserve.id);
  assert.match(g.document.getElementById('modal').innerHTML, /Skład pełny|Wybierz kogo zastąpić/i);
});

test('new matchday mail and news store semantic localisation keys', () => {
  const g = boot(3124);
  g.PPM.gameplay.newGame(0, 'PL');
  const G = g.PPM.state.G;
  G.inbox = [];
  G.newsFeed = [];
  const reserve = G.players.find(p => p.teamId === G.myTeamId && p.role === 'reserve');
  reserve.seasonForm = 10;
  g.Math.random = () => 0;

  g.PPM.gameplay.generateInboxForMatchday();
  const request = G.inbox.find(m => m.decision?.kind === 'reserveRequest');
  assert.equal(request.subjectKey, 'mail.reserveRequestSubject');
  assert.equal(request.bodyKey, 'mail.reserveRequestBody');

  const leader = G.teams.filter(t => t.league === 1).sort((a, b) => b.pts - a.pts)[0];
  const opponent = G.teams.find(t => t.league === 1 && t.id !== leader.id);
  g.PPM.gameplay.generateMatchdayNews([{
    homeId: leader.id, awayId: opponent.id, homeWin: false,
    isDraw: false, score: '1:3', matchups: [],
  }], G.myTeamId);
  assert.ok(G.newsFeed.some(n => n.msgKey === 'news.leaderDropsPoints'));
});

test('new career news is stored as semantic data, never as a fixed-language sentence', () => {
  const gameplay = read('src/core/gameplay.js');
  const calls = gameplay.match(/pushNews\([^;\n]+/g) || [];
  const producers = calls.filter(call => !call.startsWith('pushNews(msg'));
  assert.ok(producers.length > 10, 'news producers found');
  producers.forEach(call => assert.match(call, /^pushNews\('news\./, call));
});

test('persistent season log producers do not store fixed Polish sentences', () => {
  const gameplay = read('src/core/gameplay.js');
  assert.doesNotMatch(gameplay, /safeLog\(`Partnerstwo |safeLog\(`\$\{s\.name\}.*(?:urlop|emerytur)|safeLog\(`\$\{p\.name\} odszed/);
});

test('career backup labels are rendered from semantic checkpoint data', () => {
  const manager = read('src/core/save-manager.js');
  const main = read('src/main.js');
  assert.doesNotMatch(manager, /Przed kolejk|Przed turniejem|Punkt odzyskiwania|Nieznany klub/);
  assert.match(main, /career\.backup\./);
  assert.match(main, /backupLabel\(b\)/);
});

test('matchday modal title follows the active locale', () => {
  const g = boot(3134);
  g.PPM.gameplay.newGame(0, 'PL');
  const english = g.PPM.gameplay.matchdayModalTitle(1, 1);
  assert.match(english, /Matchday 1\/22 \(Division (?:I|II)\)/i);
  assert.doesNotMatch(english, /Kolejka|Liga/i);

  g.PPM.i18n.setLocale('pl');
  assert.match(g.PPM.gameplay.matchdayModalTitle(1, 1), /Kolejka 1\/22 \(I Liga\)/i);
});
