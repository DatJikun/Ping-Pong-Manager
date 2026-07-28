


// =============================================================================
// state.js — Central state access and persistence layer
// Loaded third (after constants.js and utils.js).
//
// Two top-level state objects:
//   store.G  — the entire game save (teams, players, staff, season data, …)
//              Null until newGame() or loadPersistedGame() is called.
//              Persisted to localStorage under LOCAL_STORAGE_KEY.
//   ui        — transient UI state (current page, tab selections, search text,
//              market compare slots, start-screen selections, settings).
//              Never persisted as part of the career save.
//
// Public API exposed on window.PPM.stateApi:
//   getGame()              — returns store.G
//   setGame(next)          — replaces store.G, returns it
//   persistGame()          — serialises store.G to localStorage, returns success
//   loadPersistedGame()    — deserialises + migrates from localStorage
//   loadGameFromText(text) — deserialises + migrates from a JSON string
//   createNewGame(idx, id) — delegates to gameplay.newGame()
//   migrateLoadedGame(obj) — upgrades old saves to current field layout
//   loadAppSettings()      — reads ui.settings from localStorage
//   persistAppSettings()   — writes ui.settings to localStorage
//   updateAppSettings(obj) — merges + validates + persists settings
//   setNamePools(countryId)— sets global _FN/_LN name arrays for a country
//
// IMPORTANT: Any new field added to store.G must also be given a migration
// default inside migrateLoadedGame() so that old saves don't break.
// =============================================================================

window.PPM = window.PPM || {};

// ── Storage keys ─────────────────────────────────────────────────────────────
const LOCAL_STORAGE_KEY = 'ppgame';
const APP_SETTINGS_KEY = 'ppgame_app_settings';
const DEFAULT_APP_SETTINGS = {
  // The locked design language (proto-final "Paddock") is dark carbon. There is
  // no light variant — see normalizeAppSettings().
  theme: 'dark',
  matchSpeed: 'normal',
  aiDifficulty: 'hard'
};

// ── Core state containers ─────────────────────────────────────────────────────
// store.G is the single source of truth for all career/game data.
const store = { G: null };

// ui holds ephemeral, render-time-only state. Not saved to the career file.
const ui = {
  page: 'dash',
  _pid: 0,
  squadTab: 'starter',
  running: false,
  hofTab: 'all',
  hofSort: 'trophies_gold',
  scoutTab: 'scouts',
  mktSort: 'ovr',
  mktSortDir: 1,
  selHistSeason: null,
  selHistStat: 'seasonW',
  leagueTab: 'l1',
  leagueStatsTab: 'table',
  hofRealTab: 'hof',
  budgetSeason: 'live',
  historyTab: 'seasons',
  squadSearch: '',
  squadStyleFilter: 'all',
  marketSearch: '',
  marketTypeFilter: 'player',   // the market is one role at a time (role tabs)
  marketCompare: [],
  _selClub: -1,
  _selCountry: 'PL',
  _newSaveDifficulty: 'hard',
  settings: null,
  _saveFailureNotified: false
};

// ── State accessors ───────────────────────────────────────────────────────────
function getGame(){return store.G;}
function setGame(nextGame){store.G=nextGame;return store.G;}
function getUIState(){return ui;}
function setPage(pageId){ui.page=pageId;return ui.page;}

// ── App settings (theme, speed, difficulty) ───────────────────────────────────
// These live in a separate localStorage key so they survive between careers.
function normalizeAppSettings(raw){
  return{
    // Owner call 2026-07-26: the game is dark carbon everywhere, full stop. Any
    // 'light' left in a returning player's localStorage is coerced back to dark,
    // otherwise they open the game into a theme that no longer exists.
    theme:'dark',
    matchSpeed:['slow','normal','fast'].includes(raw?.matchSpeed)?raw.matchSpeed:DEFAULT_APP_SETTINGS.matchSpeed,
    aiDifficulty:['easy','normal','hard','legend'].includes(raw?.aiDifficulty)?raw.aiDifficulty:DEFAULT_APP_SETTINGS.aiDifficulty,
  };
}
function loadAppSettings(){
  try{
    const saved=localStorage.getItem(APP_SETTINGS_KEY);
    if(!saved)return {...DEFAULT_APP_SETTINGS};
    return normalizeAppSettings(JSON.parse(saved));
  }catch{
    return {...DEFAULT_APP_SETTINGS};
  }
}
function persistAppSettings(){
  localStorage.setItem(APP_SETTINGS_KEY,JSON.stringify(ui.settings||DEFAULT_APP_SETTINGS));
}
function updateAppSettings(nextSettings){
  ui.settings=normalizeAppSettings({...ui.settings,...nextSettings});
  persistAppSettings();
  return ui.settings;
}
// ── Name pool helpers ─────────────────────────────────────────────────────────
// Sets the global _FN (first names) and _LN (last names) arrays used by
// any code that generates random names without a specific country context.
function setNamePools(countryId){
  globalThis._FN = COUNTRIES[countryId]?.firstNames || FN;
  globalThis._LN = COUNTRIES[countryId]?.lastNames || LN;
}
// randNameForCountry / getCountryNamePools live in utils.js (single source of truth).

// ── Persistence ───────────────────────────────────────────────────────────────
// Keeps the saved _pid in sync with the live ID counter (ui._pid) so a resumed
// game never re-mints IDs that already belong to existing entities.
function persistGame(){
  if(!store.G)return false;
  const text=serializeGame();
  const manager=window.PPM.saveManager;
  if(manager?.isInitialized?.()){
    return manager.requestAutosave(text);
  }
  try{
    localStorage.setItem(LOCAL_STORAGE_KEY,text);
    ui._saveFailureNotified=false;
    return true;
  }catch(_error){
    if(!ui._saveFailureNotified){
      ui._saveFailureNotified=true;
      toast('Autosave nie powiódł się — pobierz zapis do pliku w Ustawieniach.');
    }
    return false;
  }
}
// Bump when save layout changes in a non-idempotent way. Idempotent if(!field)
// guards still run; schemaVersion records the highest migration floor applied.
const SAVE_SCHEMA_VERSION=20;
function validateSaveObject(parsed){
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Zapis musi być obiektem.');
  if(!Number.isFinite(parsed.season))throw new Error('Zapis nie ma poprawnego numeru sezonu.');
  if(!Array.isArray(parsed.teams))throw new Error('Zapis nie zawiera listy klubów.');
  if(!Array.isArray(parsed.players))throw new Error('Zapis nie zawiera listy zawodników.');
  if(Number.isFinite(parsed.schemaVersion)&&parsed.schemaVersion>SAVE_SCHEMA_VERSION){
    throw new Error('Ten zapis pochodzi z nowszej wersji gry.');
  }
  return parsed;
}
function validateSaveText(text){
  return validateSaveObject(JSON.parse(text));
}
function serializeGame(){
  if(!store.G)return null;
  store.G._pid=ui._pid;
  return JSON.stringify(store.G);
}
async function flushPersistence(){
  const manager=window.PPM.saveManager;
  if(manager?.isInitialized?.())return manager.flush();
  return true;
}
// ── Save migration ────────────────────────────────────────────────────────────
// migrateLoadedGame() upgrades any loaded save object to the current field
// layout. Every if(!field) block here is a guard for a missing field that was
// added in a later version. When adding a new gameplay field, always add a
// corresponding migration default here, then bump SAVE_SCHEMA_VERSION.
function migrateLoadedGame(parsed){
  const game = parsed;
  const fromVersion=typeof game.schemaVersion==='number'?game.schemaVersion:0;
  const leagueCountryId=game.countryId||'PL';
  const STYLE_MIGRATE={AGRESYWNY:'FH_LOOPER',WSZECHSTRONNY:'TWO_SIDED',CIERPLIWY:'DEFENDER',TECHNICZNY:'BLOCKER'};
  const migrateStyle=v=>STYLE_MIGRATE[v]||v;
  (game.players||[]).forEach(p=>{if(p&&p.playStyle)p.playStyle=migrateStyle(p.playStyle);});
  [...(game.staff||[]),...(game.staffPool||[]),...(game.scoutPool||[])].forEach(st=>{if(st&&st.styleSynergy)st.styleSynergy=migrateStyle(st.styleSynergy);});
  const legacyPRs=[
    {id:'pr1',name:'Agnieszka Wolska',level:1,bonus:0.02,cooldownReduce:0,salary:2500,cost:5000},
    {id:'pr2',name:'Bart\u0142omiej Krupa',level:2,bonus:0.04,cooldownReduce:1,salary:5000,cost:12000},
    {id:'pr3',name:'Natalia Czajka',level:3,bonus:0.06,cooldownReduce:2,salary:9000,cost:25000},
  ];
  (game.staff||[]).forEach(s=>{
    if(s.nationality!==leagueCountryId){
      s.nationality=leagueCountryId;
      if(s.teamId!==null)s.name=randNameForCountry(leagueCountryId);
    }
    if(!s.age)s.age=40+rnd(0,20);
    if(!s.peakAge)s.peakAge=45+rnd(0,15);
    if(!Array.isArray(s.careerHistory))s.careerHistory=[];
    if(!s.bio)s.bio=`${s.name} to doświadczony członek sztabu z własną historią pracy w klubach.`;
    if(typeof s.ceiling!=='number')s.ceiling=60;
    // Pre-fix saves let contracts run negative (staff never left); clamp so the
    // UI shows 0 and the season-end expiry sweep releases them normally.
    if((s.contractYears||0)<0)s.contractYears=0;
  });
  (game.staffPool||[]).forEach(s=>{if(s.nationality!==leagueCountryId){s.nationality=leagueCountryId;s.name=randNameForCountry(leagueCountryId);}if(!s.age)s.age=30+rnd(0,35);if(!s.peakAge)s.peakAge=45+rnd(0,15);if(typeof s.ceiling!=='number')s.ceiling=60;});
  (game.scoutPool||[]).forEach(s=>{if(s.nationality!==leagueCountryId){s.nationality=leagueCountryId;s.name=randNameForCountry(leagueCountryId);}if(!s.age)s.age=30+rnd(0,35);if(!s.peakAge)s.peakAge=45+rnd(0,15);if(typeof s.ceiling!=='number')s.ceiling=60;});
  (game.players||[]).forEach(p=>{
    if(p.nationality!==leagueCountryId){
      p.nationality=leagueCountryId;
      p.name=randNameForCountry(leagueCountryId);
    }
    if(p.isYouth&&p.role!=='youth')p.role='youth';
    if(typeof p.seasonForm!=='number')p.seasonForm=rnd(-6,6);
    // v18: split the old 4 stats (atk/def/srv/men) into the 6 realistic attributes.
    if(typeof p.fh!=='number'){
      const atk=p.atk||40,def=p.def||40,srv=p.srv||40;
      p.fh=Math.round(atk);
      p.bh=Math.round(atk*0.65+def*0.35);
      p.ret=Math.round(srv*0.5+def*0.5);
      p.foot=Math.round(def);
      // p.srv and p.men keep their keys/values
      if(typeof p.srv!=='number')p.srv=srv;
      if(typeof p.men!=='number')p.men=40;
      delete p.atk;delete p.def;
    }
    if(typeof p.stamina!=='number'){
      const traits=Array.isArray(p.traits)?p.traits:[];
      let stamina=50+Math.round(((p.men||50)-50)*0.25);
      if((p.age||24)<=22)stamina+=8;
      else if((p.age||24)<=27)stamina+=4;
      else if((p.age||24)>=35)stamina-=7;
      else if((p.age||24)>=31)stamina-=3;
      if(traits.includes('IRON_STAMINA'))stamina+=18;
      if(traits.includes('VETERAN'))stamina+=4;
      if(traits.includes('HOTHEADED'))stamina-=6;
      if(traits.includes('WUNDERKIND'))stamina+=3;
      p.stamina=Math.max(28,Math.min(96,stamina));
    }
    if(typeof p.ceiling!=='number'){
      let ceiling=Math.round(((p.fh||40)+(p.bh||40)+(p.srv||40)+(p.ret||40)+(p.foot||40)+(p.men||40))/6);
      if((p.age||24)<=17)ceiling+=22;
      else if((p.age||24)<=20)ceiling+=18;
      else if((p.age||24)<=23)ceiling+=13;
      else if((p.age||24)<=27)ceiling+=7;
      else if((p.age||24)<=31)ceiling+=3;
      if((p.traits||[]).includes('WUNDERKIND'))ceiling+=7;
      if((p.traits||[]).includes('VETERAN'))ceiling-=3;
      if((p.traits||[]).includes('LONGEVITY'))ceiling+=2;
      if(p.academyProfile?.ceiling)ceiling=Math.max(ceiling,p.academyProfile.ceiling);
      p.ceiling=Math.max(Math.round(((p.fh||40)+(p.bh||40)+(p.srv||40)+(p.ret||40)+(p.foot||40)+(p.men||40))/6),Math.min(96,ceiling));
    }
    if(!p.preferredRole)p.preferredRole=p.role==='reserve'?'rotation':'starter';
    if(!Array.isArray(p.clubHistory))p.clubHistory=p.teamId!==null?[p.teamId]:[];
    if(typeof p.leagueSeasonW!=='number')p.leagueSeasonW=0;
    if(typeof p.leagueSeasonL!=='number')p.leagueSeasonL=0;
    if(typeof p.leagueSeasonD!=='number')p.leagueSeasonD=0;
    if(typeof p.leagueSeasonPointsWon!=='number')p.leagueSeasonPointsWon=0;
    if(typeof p.leagueSeasonPointsLost!=='number')p.leagueSeasonPointsLost=0;
    if(typeof p.starterBenchStreak!=='number')p.starterBenchStreak=0;
    if(typeof p.lastPlayedMatchday!=='number')p.lastPlayedMatchday=-1;
    if(typeof p.seasonPointsWon!=='number')p.seasonPointsWon=0;
    if(typeof p.seasonPointsLost!=='number')p.seasonPointsLost=0;
    if(typeof p.careerPointsWon!=='number')p.careerPointsWon=0;
    if(typeof p.careerPointsLost!=='number')p.careerPointsLost=0;
    if(!p.lastMatchMicro)p.lastMatchMicro=null;
    if(typeof p.marketability!=='number')p.marketability=Math.max(8,Math.min(92,14+Math.round(((p.fh||40)+(p.bh||40)+(p.srv||40)+(p.ret||40)+(p.foot||40)+(p.men||40))/24)+(p.loyalty||0)));
    if(!p.academyProfile&&p.role==='youth'){
      p.academyProfile={region:'Klubowa akademia',ceiling:60,readiness:'projekt',source:'academy'};
    }
  });
  (game.teams||[]).forEach(t=>{
    if(!Array.isArray(t.traits))t.traits=(typeof CLUB_IDENTITIES!=='undefined'&&CLUB_IDENTITIES[t.name]?.traits)||[];
    if(typeof t.pointsWon!=='number')t.pointsWon=0;
    if(typeof t.pointsLost!=='number')t.pointsLost=0;
  });
  if(game.equipBrand&&!game.techPartnership){
    const legacyTechMap={stiga:'tp_local',butterfly:'tp_national',donic:'tp_regional',tibhar:'tp_pro',xiom:'tp_national',cornilleau:'tp_pro'};
    game.techPartnership=legacyTechMap[game.equipBrand]||null;
  }
  if(!game.techPartnership)game.techPartnership=null;
  game.equipBrand=null;
  if(!game.ticketPrice)game.ticketPrice=50;
  if(!game.newsFeed)game.newsFeed=[];
  if(!game.loans)game.loans=[];
  if(!game.records)game.records={};
  if(!game.countryId)game.countryId='PL';
  if(game.infraMerchandising===undefined)game.infraMerchandising=0;
  if(!game.managerPrestige)game.managerPrestige=0;
  if(!game.academyProspects)game.academyProspects=[];
  if(typeof game.academyUsedThisSeason!=='boolean')game.academyUsedThisSeason=false;
  if(!Array.isArray(game.academyTrial))game.academyTrial=[];
  if(typeof game.academyTrialUsed!=='boolean')game.academyTrialUsed=false;
  if(Array.isArray(game.sponsors))game.sponsors.forEach(s=>{if(s){if(typeof s.maxYears!=='number')s.maxYears=1;if(typeof s.yearsLeft!=='number')s.yearsLeft=s.active?1:0;}});
  if(!['easy','normal','hard','legend'].includes(game.aiDifficulty))game.aiDifficulty=(ui._newSaveDifficulty||ui.settings?.aiDifficulty||'hard');
  if(!game.boardObjective)game.boardObjective=null;
  if(!Array.isArray(game.boardObjectiveOptions))game.boardObjectiveOptions=[];
  if(!game.clubHistory)game.clubHistory={};
  // v20: clubHistory is the permanent, compact source for season/lifetime club
  // comparisons. Older saves duplicated the league table inside the player's
  // seasonHistory; use that copy once to enrich the club rows, then discard it.
  const teamSnapshotsBySeason=new Map((game.seasonHistory||[])
    .filter(entry=>entry&&Array.isArray(entry.teamsSnapshot))
    .map(entry=>[entry.season,new Map(entry.teamsSnapshot.map(team=>[team.id,team]))]));
  Object.entries(game.clubHistory).forEach(([teamId,entries])=>{
    if(!Array.isArray(entries)){game.clubHistory[teamId]=[];return;}
    entries.forEach(row=>{
      const snapshot=teamSnapshotsBySeason.get(row.season)?.get(Number(teamId));
      if(typeof row.played!=='number')row.played=(row.w||0)+(row.d||0)+(row.l||0);
      for(const key of ['gf','ga','pointsWon','pointsLost']){
        if(typeof row[key]!=='number')row[key]=typeof snapshot?.[key]==='number'?snapshot[key]:0;
      }
      if(!Array.isArray(row.topPlayers))row.topPlayers=[];
      if(row.cupStage===undefined)row.cupStage=null;
    });
  });
  (game.seasonHistory||[]).forEach(entry=>{if(entry)delete entry.teamsSnapshot;});
  if(!game.customDatabase)game.customDatabase=null;
  if(!game._negotiationLog)game._negotiationLog={};
  if(!Array.isArray(game.negotiationHistory))game.negotiationHistory=[];
  if(!game.seasonFinance)game.seasonFinance={season:game.season||1,tickets:0,merch:0,prize:0,sponsorIncome:0,tvRights:0,boardReward:0,techPartnership:0,wages:0,playerWages:0,coachWages:0,physioWages:0,psychologistWages:0,scoutWages:0,prDirectorWages:0,maint:0,transfersIn:0,infraCost:0,staffBuyouts:0,prDirectorCost:0,brandCosts:0,other:0};
  if(typeof game.top12MastersDone!=='object'||game.top12MastersDone===null)game.top12MastersDone={1:!!game.top12MastersDone,2:false};
  if(!game.pendingLeagueChanges)game.pendingLeagueChanges=[];
  if(!game.managerHistory)game.managerHistory=[];
  if(!game.coachHistory)game.coachHistory=[];
  if(!game.staffHistory)game.staffHistory={};
  if(!game.playerHistory)game.playerHistory={};
  if(!game.clubOffers)game.clubOffers=[];
  if(!game.marketShortlist)game.marketShortlist=[];
  if(!Array.isArray(game.preSignedPlayers))game.preSignedPlayers=[];
  if(!Array.isArray(game.pendingStaffSignings))game.pendingStaffSignings=[];
  if(!Array.isArray(game.prDirectorPool))game.prDirectorPool=[];
  if(!Array.isArray(game.inbox))game.inbox=[];
  if(game.matchNomination===undefined)game.matchNomination=null;
  if(typeof game.rubberTier!=='number')game.rubberTier=0;
  if(!Array.isArray(game.principalPool))game.principalPool=[];
  (game.teams||[]).forEach(t=>{if(t.prDirector===undefined)t.prDirector=null;if(t.prDirector&&!Array.isArray(t.prDirector.careerHistory))t.prDirector.careerHistory=[];if(t.prDirector&&!t.prDirector.bio)t.prDirector.bio=`${t.prDirector.name} zarządza wizerunkiem klubu i relacjami z partnerami.`;});
  if(game.prDirector&&typeof game.prDirector==='string'){
    const legacy=legacyPRs.find(p=>p.id===game.prDirector);
    if(legacy)game.prDirector={...legacy,type:'pr',teamId:game.myTeamId,contractYears:1,age:36+rnd(0,10),peakAge:48+rnd(0,8)};
  }
  if(game.prDirector&&game.prDirector.nationality!==leagueCountryId){game.prDirector.nationality=leagueCountryId;game.prDirector.name=randNameForCountry(leagueCountryId);}
  if(game.prDirector&&!Array.isArray(game.prDirector.careerHistory))game.prDirector.careerHistory=[];
  if(game.prDirector&&!game.prDirector.bio)game.prDirector.bio=`${game.prDirector.name} zarządza wizerunkiem klubu i relacjami ze sponsorami.`;
  // Repair saves written before the _pid persistence fix (2026-07-02): the ID
  // counter used to rewind on resume, so newly generated entities reused ids of
  // existing ones. Every by-id lookup is first-match, so a duplicate id makes the
  // market/modals open a different player ("3 of the same" in the market). Keep
  // the first holder of each id; give later duplicates fresh unique ids.
  {
    let nextRepairId=maxEntityId(game)+1;
    const repairIds=(arr)=>{
      const seen=new Set();
      (arr||[]).forEach(e=>{
        if(!e||typeof e.id!=='number')return;
        if(seen.has(e.id)){
          e.id=nextRepairId++;
          // Fresh history slot so season snapshots don't append to the other
          // player's chart (pushes are guarded by the key existing).
          if(game.playerHistory&&!game.playerHistory[e.id])game.playerHistory[e.id]=[];
        }
        seen.add(e.id);
      });
    };
    repairIds(game.players);
    repairIds(game.staff);
    repairIds(game.staffPool);
    repairIds(game.scoutPool);
    repairIds(game.prDirectorPool);

    // Staff UI and negotiation flows search several collections by the same ID.
    // An employed person is authoritative; different market candidates yield to
    // that ID and to earlier market pools. A keptScouts copy is the same logical
    // person, so it intentionally retains the employed scout's ID.
    const sameStaffIdentity=(a,b)=>!!a&&!!b
      &&a.name===b.name
      &&a.type===b.type
      &&a.age===b.age
      &&a.nationality===b.nationality;
    const claimedStaffIds=new Map();
    const claimEmployedStaff=(s)=>{
      if(s&&Number.isInteger(s.id)&&s.id>=0&&!claimedStaffIds.has(s.id)){
        claimedStaffIds.set(s.id,s);
      }
    };
    (game.staff||[]).forEach(claimEmployedStaff);
    claimEmployedStaff(game.prDirector);
    (game.teams||[]).forEach(t=>claimEmployedStaff(t&&t.prDirector));
    const repairStaffMarketIds=(arr)=>{
      (arr||[]).forEach(s=>{
        if(!s)return;
        const claimed=Number.isInteger(s.id)&&s.id>=0?claimedStaffIds.get(s.id):null;
        if(!Number.isInteger(s.id)||s.id<0||(claimed&&!sameStaffIdentity(claimed,s))){
          while(claimedStaffIds.has(nextRepairId))nextRepairId++;
          s.id=nextRepairId++;
        }
        if(!claimedStaffIds.has(s.id))claimedStaffIds.set(s.id,s);
      });
    };
    repairStaffMarketIds(game.staffPool);
    repairStaffMarketIds(game.scoutPool);
    repairStaffMarketIds(game.prDirectorPool);

    // Pending academy candidates will later be appended to `players`, so they
    // share the player lookup domain even though they live in separate arrays
    // before signing. Reserve repaired live-player IDs first, then make both
    // pending arrays disjoint from live players and from one another.
    const claimedPlayerIds=new Set((game.players||[])
      .filter(p=>p&&Number.isInteger(p.id)&&p.id>=0)
      .map(p=>p.id));
    const repairPendingPlayerIds=(arr)=>{
      (arr||[]).forEach(p=>{
        if(!p)return;
        if(!Number.isInteger(p.id)||p.id<0||claimedPlayerIds.has(p.id)){
          while(claimedPlayerIds.has(nextRepairId))nextRepairId++;
          p.id=nextRepairId++;
        }
        claimedPlayerIds.add(p.id);
      });
    };
    repairPendingPlayerIds(game.academyProspects);
    repairPendingPlayerIds(game.academyTrial);

    // The market stores only `playerId`, so rows written while several players
    // shared one ID all point at the same number. Renumbering the players above
    // leaves those rows stale — S11 carries 997 `fa` rows over just 695 distinct
    // IDs, which the player sees as the same free agent listed several times.
    // `fa` rows hold no per-entity data (always fee 0), so they are rebuilt from
    // the repaired player list. Negotiated rows carry randomised fee/tier/share,
    // so they are kept verbatim — de-duplicated and dropped when they no longer
    // resolve, but never re-rolled on load.
    if(Array.isArray(game.transferMarket)){
      const liveById=new Map((game.players||[])
        .filter(p=>p&&Number.isInteger(p.id))
        .map(p=>[p.id,p]));
      // Mirrors the free-agent predicate in buildMarket().
      const freeAgents=(game.players||[]).filter(p=>p&&!p.retired&&!p.loanedOut
        &&((p.teamId===null)||p.contractYears<=0)&&p.teamId!==game.myTeamId);
      const freeAgentIds=new Set(freeAgents.map(p=>p.id));
      const seenNegotiated=new Set();
      const negotiated=game.transferMarket.filter(row=>{
        if(!row||row.type==='fa')return false;
        if(!liveById.has(row.playerId))return false;
        // A stale fee/pre-sign row for someone whose contract has since expired
        // contradicts his current state; buildMarket() would never pair the two.
        if(freeAgentIds.has(row.playerId))return false;
        // Keyed by player alone, not by player+type: buildMarket() guards each
        // negotiated shelf with find(m=>m.playerId===p.id), so nobody is ever
        // offered two ways at once. The first row wins and keeps its own terms.
        if(seenNegotiated.has(row.playerId))return false;
        seenNegotiated.add(row.playerId);
        return true;
      });
      game.transferMarket=[
        ...freeAgents.map(p=>({playerId:p.id,type:'fa',fee:0})),
        ...negotiated,
      ];
      // Shortlist/compare entries are plain ID lists — drop what no longer resolves.
      if(Array.isArray(game.marketShortlist))game.marketShortlist=game.marketShortlist.filter(id=>liveById.has(id));
      if(Array.isArray(game.marketCompare))game.marketCompare=game.marketCompare.filter(id=>liveById.has(id));
    }
  }
  // The player's infra levels are authoritative on game.infra*; mirror them onto
  // the team object so club-strength scoring and the team-overview panel (which
  // read team.infra*, like they do for AI clubs) see the real levels.
  const myTeamObj=(game.teams||[]).find(t=>t.id===game.myTeamId);
  if(myTeamObj){
    myTeamObj.infraHall=game.infraHall||0;
    myTeamObj.infraMed=game.infraMed||0;
    myTeamObj.infraAcademy=game.infraAcademy||0;
    myTeamObj.infraMerchandising=game.infraMerchandising||0;
  }
  setNamePools(game.countryId);
  // Stamp schema after all guards so old saves and new saves share one floor.
  game.schemaVersion=SAVE_SCHEMA_VERSION;
  game._migratedFromSchema=fromVersion;
  return game;
}
// Walks the whole save object and returns the highest numeric `id` found.
// Saves written before _pid syncing carry a counter that is lower than IDs
// already minted, so the counter must be floored at max(existing id)+1 or new
// entities would reuse live IDs (and every by-id lookup is first-match).
function maxEntityId(node){
  let max=-1;
  const stack=[node];
  while(stack.length){
    const cur=stack.pop();
    if(Array.isArray(cur)){
      for(const v of cur)if(v&&typeof v==='object')stack.push(v);
    }else if(cur&&typeof cur==='object'){
      if(typeof cur.id==='number'&&cur.id>max)max=cur.id;
      for(const k in cur){const v=cur[k];if(v&&typeof v==='object')stack.push(v);}
    }
  }
  return max;
}
// Parses a JSON string, runs migration, stores result in store.G.
// Also restores ui._pid (the global entity-ID counter).
function loadGameFromText(text){
  const parsed = validateSaveText(text);
  store.G = migrateLoadedGame(parsed);
  // Floor AFTER migration — the duplicate-id repair inside migrateLoadedGame can
  // mint ids above the save's original maximum.
  ui._pid = Math.max(parsed._pid || 0, maxEntityId(store.G) + 1);
  // Legacy careers may contain hundreds of free agents accumulated before the
  // bounded population lifecycle existed. Clean them on first load rather than
  // forcing the player to complete another season with the bloated state.
  window.PPM.gameplay?.pruneCareerData?.();
  return store.G;
}
function loadPersistedGame(){
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if(!saved)return null;
  try{return loadGameFromText(saved);}catch{return null;}
}
function createNewGame(clubIdx, countryId){
  return window.PPM.gameplay.newGame(clubIdx, countryId);
}
ui.settings=loadAppSettings();
window.PPM.state = store;
window.PPM.ui = ui;
window.PPM.stateApi = { LOCAL_STORAGE_KEY, APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS, SAVE_SCHEMA_VERSION, getGame, setGame, getUIState, setPage, persistGame, serializeGame, flushPersistence, validateSaveObject, validateSaveText, loadGameFromText, loadPersistedGame, createNewGame, setNamePools, migrateLoadedGame, loadAppSettings, persistAppSettings, updateAppSettings };
