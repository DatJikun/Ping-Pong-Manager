(function(){
window.PPM = window.PPM || {};
const render = (...args)=>window.PPM.renderApp?.(...args);
const updateHeader = (...args)=>window.PPM.updateHeader?.(...args);

// A recovery checkpoint is insurance, never a precondition for playing.
//
// runMatchday() and the tournaments awaited this unguarded, so a storage error —
// a full disk, an IndexedDB quota, a browser in private mode — did not merely
// cost the player a recovery point: the rejection propagated out and the round
// never ran. The career became unplayable because a BACKUP failed. (endSeason
// already treated it as best-effort; the two paths simply disagreed.)
//
// The autosave path is where a storage problem gets reported to the player, and
// it has its own once-only notification. Here we log it and carry on.
function checkpointCareer(kind){
  const manager=window.PPM.saveManager;
  if(!manager?.isInitialized?.()||!manager.getActiveCareerId?.())return Promise.resolve(null);
  let pending;
  try{
    pending=manager.createCheckpoint(kind,window.PPM.stateApi.serializeGame());
  }catch(error){
    safeLog(`Nie udało się zapisać punktu odzyskiwania (${kind}).`,'bd');
    return Promise.resolve(null);
  }
  return Promise.resolve(pending).catch(()=>{
    safeLog(`Nie udało się zapisać punktu odzyskiwania (${kind}).`,'bd');
    return null;
  });
}
function flushCareerSave(){
  return window.PPM.stateApi.flushPersistence?.()||Promise.resolve(true);
}

function getLoanedOut(){
  if(!store.G)return[];
  return (store.G.loans||[]).filter(l=>l.fromTeamId===store.G.myTeamId&&!l.returned);
}
function getLoanedIn(){
  if(!store.G)return[];
  return (store.G.loans||[]).filter(l=>l.toTeamId===store.G.myTeamId&&!l.returned);
}
function canLoanOut(pid){
  const p=store.G.players.find(x=>x.id===pid);
  if(!p)return{ok:false,reason:t('loan.noPlayer')};
  if(p.role==='youth'&&!p.isYouth)return{ok:false,reason:t('loan.notEligible')};
  if(p.injuredFor>0)return{ok:false,reason:t('loan.injured')};
  if(p.joinedSeason===store.G.season&&p.joinedViaTransfer)return{ok:false,reason:t('loan.newSigning')};
  // Final contract year: the deal would expire DURING the loan, so the player
  // "returns" straight into free agency \u2014 reads like he never came back.
  if((p.contractYears||0)<=1)return{ok:false,reason:t('loan.finalYear')};
  if(getLoanedIn().find(l=>l.playerId===pid))return{ok:false,reason:t('loan.alreadyBorrowed')};
  const already=getLoanedOut().find(l=>l.playerId===pid);
  if(already)return{ok:false,reason:t('loan.alreadyOut')};
  if(myStarters().filter(x=>x.id!==pid).length<3&&p.role==='starter'){
    return{ok:false,reason:t('loan.minimumSquad')};
  }
  return{ok:true};
}

function openLoanModal(pid){
  const p=store.G.players.find(x=>x.id===pid);if(!p)return;
  const check=canLoanOut(pid);
  if(!check.ok){toast(check.reason);return;}
  const isAcademyLoan=!!p.isYouth;
  // Find interested teams
  const l2Teams=store.G.teams.filter(t=>t.league===2&&!t.isPlayer).map(t=>{
    const needScore=Math.max(0,72-teamOvr(t.id))+Math.max(0,24-p.age)+Math.max(0,ovrBase(p)-teamOvr(t.id));
    const interest=clamp(Math.round(35+needScore-(p.salary/700)+((p.preferredRole==='starter')?8:0)+(isAcademyLoan?10:0)),8,92);
    return{...t,interest};
  }).sort((a,b)=>b.interest-a.interest);
  const modal=document.getElementById('modal');modal.className='modal';
  modal.innerHTML=`<div class="mt2">${t(isAcademyLoan?'loan.academyTitle':'loan.title',{name:p.name})} <button class="close-btn" onclick="closeModal()">\u2715</button></div>
  <div class="pd12 bgs2 r3 mb14 fs12">
    <b>OVR ${ovrBase(p)}</b> / ${t('loan.age',{age:p.age})}<br>
    ${t(isAcademyLoan?'loan.academyInfo':'loan.regularInfo')}<br>
    ${t('loan.termsInfo')}
  </div>
  <div class="fs11 ink3 mb8">${t('loan.chooseClub')}</div>
  <div class="grid gp6">
  ${l2Teams.map(t=>`<div class="grid gtc1aa gp8 aic pd8-10 bb1 bgs1 r3">
    <div><div class="b7 fs13">${t.name}</div><div class="fs10 ink3">${window.t('loan.teamOvr')}: ${teamOvr(t.id)} / ${window.t('loan.interest')}: ${t.interest}%</div></div>
    <div>
      <select id="loan-share-${t.id}" class="bb1 bgs1 fs11" style="padding:5px">
        <option value="0.2">${window.t('loan.wageShare',{percent:20})}</option>
        <option value="0.3" selected>${window.t('loan.wageShare',{percent:30})}</option>
        <option value="0.4">${window.t('loan.wageShare',{percent:40})}</option>
        <option value="0.5">${window.t('loan.wageShare',{percent:50})}</option>
      </select>
    </div>
    <button class="btn pr sm" onclick="doLoanOut(${pid},${t.id},parseFloat(document.getElementById('loan-share-${t.id}').value))">${window.t('loan.negotiate').toUpperCase()}</button>
  </div>`).join('')}
  </div>
  <button class="btn mt-10" onclick="closeModal()">${t('common.cancel').toUpperCase()}</button>`;
  openModal();
}

function doLoanOut(pid, toTeamId, share){
  const p=store.G.players.find(x=>x.id===pid);if(!p)return;
  const loanShare=clamp(share||0.3,0.15,0.5);
  const target=store.G.teams.find(t=>t.id===toTeamId);if(!target)return;
  const interest=clamp(Math.round(35+Math.max(0,72-teamOvr(target.id))+Math.max(0,24-p.age)+Math.max(0,ovrBase(p)-teamOvr(target.id))-(p.salary/700)+loanShare*30+(p.isYouth?10:0)),5,95);
  if(Math.random()*100>interest){toast(t('loan.rejected',{club:target.name,name:p.name}));return;}
  store.G.loans=store.G.loans||[];
  store.G.loans.push({playerId:pid, fromTeamId:store.G.myTeamId, toTeamId, seasons:1, returned:false, originalRole:p.role, wageShare:loanShare, academyLoan:!!p.isYouth});
  p.teamId=toTeamId;
  p.role='starter'; // guaranteed starter on loan
  p.loanedOut=true;
  closeModal();
  toast(t('loan.completed',{name:p.name,club:teamName(toTeamId),percent:Math.round(loanShare*100)}));
  pushNews('news.loanedOut','',{name:p.name,academy:p.isYouth?t('news.academySuffix'):'',club:teamName(toTeamId)});
  render();updateHeader();
  persistGame();
}

function returnLoans(){
  // Called at end of season
  if(!store.G.loans)return;
  store.G.loans.forEach(l=>{
    if(l.returned)return;
    const p=store.G.players.find(x=>x.id===l.playerId);
    if(p){
      p.teamId=l.fromTeamId;
      p.role=l.originalRole||'reserve';
      p.loanedOut=false;
      if(l.fromTeamId===store.G.myTeamId){
        toast(t('loan.returned',{name:p.name}));
        pushNews('news.loanReturned','good',{name:p.name});
      }else if(l.toTeamId===store.G.myTeamId){
        toast(t('loan.returnedParent',{name:p.name,club:teamName(l.fromTeamId)}));
        pushNews('news.loanReturnedParent','',{name:p.name,club:teamName(l.fromTeamId)});
      }
    }
    l.returned=true;
  });
}

// INFRA_HALL / INFRA_MED / INFRA_ACADEMY / INFRA_MERCH live in constants.js
// (single source of truth, 6 levels each). They are declared at classic-script
// top level there, so this IIFE sees them via the shared lexical scope \u2014 the same
// dedup pattern used for rnd/clamp/sleep. Do NOT redeclare them here: a local copy
// silently diverged before (4 levels here vs 6 in the UI \u2192 upgrading past level 3
// read INFRA_ACADEMY[4] = undefined and crashed).

// ── Ticket & merch model (owner spec) ────────────────────────────────────────
// Cheap tickets PACK the arena (more fans + more merch) but earn little per head;
// pricey tickets earn more per head but thin the crowd → a genuine trade-off, no
// single optimum. A block of ULTRAS always turns up regardless of price/results.
// The "success" crowd (and their merch spending) is volatile: winning pulls in
// casual fans, losing leaves only the die-hards.
const ULTRAS_FRAC=0.22; // die-hard share of capacity (comes at any FAIR price)
// Owner 2026-07-02: maxing the price slider printed ~€1M/season in I Liga because
// the ultras floor never decayed and demand bottomed at 15% of capacity. Revenue
// must PEAK at a sensible price (~50–70 €) and collapse at rip-off prices.
// Price → demand for the variable (non-ultras) stands. ~1.3 at €25, ~0 above €110.
function ticketPriceDemand(price){return clamp(1.25-((price||50)-25)/70,0.02,1.3);}
// Even die-hards stop coming at rip-off prices: full loyalty up to ~40 €, fading
// linearly to zero at 160 €.
function ultrasShare(price){return ULTRAS_FRAC*clamp((160-(price||50))/120,0,1);}
// Estimated attendance for the player's club at a price (defaults to the set price).
function estimateAttendance(price){
  if(!store.G)return{attendance:0,capacity:0,fill:0};
  const capacity=INFRA_HALL[clamp(store.G.infraHall||0,0,INFRA_HALL.length-1)].capacity;
  const myL=myLeague();
  const sorted=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>b.pts-a.pts);
  const pos=(sorted.findIndex(t=>t.isPlayer)+1)||6;
  const posBonus=Math.max(0.35,1-(pos-1)*0.055);
  const presBonus=0.45+calcPrestige()/100*0.6;
  const marketability=calcTeamMarketability(myTeam().id);
  const prBoost=getPRDirector()?.bonus||0;
  const appeal=clamp(posBonus*presBonus*(0.95+marketability/260+prBoost),0.3,1.6);
  const p=price==null?store.G.ticketPrice:price;
  const variable=(1-ULTRAS_FRAC)*ticketPriceDemand(p)*appeal;
  const fill=clamp(ultrasShare(p)+variable,0.01,1);
  return{attendance:Math.round(capacity*fill),capacity,fill};
}
function getMerchIncome(){
  if(!store.G)return 0;
  const lv=store.G.infraMerchandising||0;
  const ratio=INFRA_MERCH[lv].income||0;
  if(!ratio)return 0;
  const pr=getPRDirector();
  const marketability=calcTeamMarketability(store.G.myTeamId);
  const prBoost=pr?pr.bonus:0;
  // RESULT-driven and VOLATILE: a great season sells far more than a bad one.
  const myL=myLeague();
  const sorted=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>b.pts-a.pts);
  const pos=(sorted.findIndex(t=>t.isPlayer)+1)||6;
  const resultMult=clamp(1.6-(pos-1)*0.11,0.4,1.7);
  // A full arena (cheap tickets) sells MUCH more merch; a half-empty one much less —
  // strong enough that packing the hall cheaply rivals a high gate price (no single
  // optimum; the balance shifts with how much you've invested in the merch shop).
  const fill=estimateAttendance(null).fill;
  return Math.round(marketability*185*(ratio+prBoost)*resultMult*(0.4+fill*1.4));
}

// v16: TV Rights
function calcTVRights(){
  if(!store.G)return 0;
  const myL=myLeague();
  const sorted=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>b.pts-a.pts);
  const pos=sorted.findIndex(t=>t.isPlayer)+1;
  const base=myL===1?55000:16000;
  const posFactor=Math.max(0.4,1-(pos-1)*0.05);
  return Math.round(base*posFactor);
}

// v16: PR Director staff
const PR_DIRECTORS=[
  {id:'pr1',name:'Agnieszka Wolska',level:1,bonus:0.02,cooldownReduce:0,salary:2500,cost:5000},
  {id:'pr2',name:'Bart\u0142omiej Krupa',level:2,bonus:0.04,cooldownReduce:1,salary:5000,cost:12000},
  {id:'pr3',name:'Natalia Czajka',level:3,bonus:0.06,cooldownReduce:2,salary:9000,cost:25000},
];

function genPRDirector(teamId=null,countryId=null){
  const level=1+rnd(0,2);
  const age=31+rnd(0,28);
  const peakAge=46+rnd(0,12);
  return finalizePRDirector(ensureStaffMeta({
    id:ui._pid++,
    type:'pr',
    name:randNameForCountry(countryId),
    level,
    age,
    peakAge,
    bonus:clamp(0.015+level*0.013+rnd(0,8)/1000,0.02,0.07),
    cooldownReduce:level>=3?2:level>=2?1:0,
    salary:Math.round(1900+level*1700+rnd(0,1500)),
    cost:0,
    contractYears:1+rnd(0,2),
    teamId,
    nationality:countryId||store.G?.countryId||'PL'
  }));
}
function finalizePRDirector(pr){
  if(!pr)return pr;
  pr.cost=Math.max(4500,Math.round((pr.salary||0)*(1.5+(pr.level||1)*0.35)));
  return pr;
}
function estimatePlayerCeiling(p){
  const base=typeof ovrBase==='function'?ovrBase(p):Math.round(SK.reduce((a,s)=>a+(p[s]||40),0)/SK.length);
  const age=p.age||24;
  let ceiling=base;
  if(age<=17)ceiling+=22;
  else if(age<=20)ceiling+=18;
  else if(age<=23)ceiling+=13;
  else if(age<=27)ceiling+=7;
  else if(age<=31)ceiling+=3;
  if(p.traits?.includes('WUNDERKIND'))ceiling+=7;
  if(p.traits?.includes('VETERAN'))ceiling-=3;
  if(p.traits?.includes('LONGEVITY'))ceiling+=2;
  if(p.academyProfile?.ceiling)ceiling=Math.max(ceiling,p.academyProfile.ceiling);
  return clamp(Math.round(ceiling),Math.max(base,45),96);
}
function playerCeiling(p){
  ensurePlayerMeta(p);
  return clamp(p.ceiling||estimatePlayerCeiling(p),Math.max(ovrBase(p),45),96);
}
function getTeamPRDirector(teamId){
  if(!store.G)return null;
  if(teamId===store.G.myTeamId)return store.G.prDirector||null;
  const team=store.G.teams.find(t=>t.id===teamId);
  return team?.prDirector||null;
}
function getPRDirector(){return getTeamPRDirector(store.G?.myTeamId);}
function getPRDirectorMarket(){return (store.G?.prDirectorPool||[]).filter(pr=>pr.teamId===null);}
function getRivalPRDirectors(){
  if(!store.G)return[];
  return store.G.teams.filter(t=>!t.isPlayer&&t.prDirector).map(t=>({...t.prDirector,teamId:t.id})).sort((a,b)=>(b.bonus||0)-(a.bonus||0));
}
function calcTeamMarketability(teamId){
  if(!store.G)return 0;
  const team=store.G.teams.find(t=>t.id===teamId);if(!team)return 0;
  const players=store.G.players.filter(p=>p.teamId===teamId&&!p.retired);
  const avgOvr=players.length?Math.round(players.reduce((s,p)=>s+ovr(p),0)/players.length):45;
  const starPlayers=players.slice().sort((a,b)=>calcPlayerMarketability(b)-calcPlayerMarketability(a)).slice(0,4);
  const starPower=starPlayers.length?starPlayers.reduce((s,p)=>s+calcPlayerMarketability(p),0)/starPlayers.length:20;
  const prestigeBoost=teamId===store.G.myTeamId?calcPrestige():Math.max(20,50-Math.abs(team.league-1)*12+Math.round(avgOvr/3));
  const prBoost=Math.round((getTeamPRDirector(teamId)?.bonus||0)*180);
  let m=Math.round(prestigeBoost*0.48+avgOvr*0.24+starPower*0.28+prBoost);
  // Tech partnership's real value is MARKETING (co-branding) — it lifts marketability
  // (→ merch & attendance), not on-court power. Only the player's club has one.
  if(teamId===store.G.myTeamId){const tp=getTechPartnership();if(tp&&tp.mktBonus)m=Math.round(m*(1+tp.mktBonus));}
  return m;
}
function getBoardObjective(){
  return store.G?.boardObjective||null;
}
function boardObjectiveLabel(obj){
  if(!obj)return t('board.noObjective');
  return t('board.objectiveLabel',{goal:goalDesc(obj.goal),reward:formatCurrency(obj.reward)});
}
// A club's expected strength relative to its league: squad OVR + (dampened) budget +
// infrastructure. Drives the board's league-POSITION target (owner request).
function teamStrengthScore(t){
  if(!t)return 0;
  const infra=(t.infraHall||0)+(t.infraMed||0)+(t.infraAcademy||0)+(t.infraMerchandising||0);
  return teamOvr(t.id)+Math.log10(Math.max(1,(t.budget||0))+1)*3.2+infra*0.9;
}
// Predicted finishing position within the club's league (1 = best).
function predictedLeaguePosition(teamId){
  const t=store.G.teams.find(x=>x.id===teamId);if(!t)return 6;
  const ranked=store.G.teams.filter(x=>x.league===t.league).sort((a,b)=>teamStrengthScore(b)-teamStrengthScore(a));
  return (ranked.findIndex(x=>x.id===teamId)+1)||6;
}
function generateBoardObjective(teamId){
  const tid=teamId??store.G?.myTeamId;
  const league=store.G.teams.find(t=>t.id===tid)?.league||1;
  const n=store.G.teams.filter(t=>t.league===league).length||12;
  // The board expects you to finish around where your resources place you.
  const pos=clamp(predictedLeaguePosition(tid),1,n);
  const goal='top'+pos;
  return{goal,reward:Math.round((league===1?90000:45000)*goalDiff(goal)),summary:goalDesc(goal),baseOvr:teamOvr(tid),predictedPos:pos,risk:'expected',multiplier:1};
}
function generateBoardObjectiveChoices(teamId){
  const tid=teamId??store.G?.myTeamId;
  const league=store.G.teams.find(t=>t.id===tid)?.league||1;
  const n=store.G.teams.filter(t=>t.league===league).length||12;
  const baseReward=(league===1?90000:45000);
  const pos=clamp(predictedLeaguePosition(tid),1,n);
  const safePos=clamp(pos+2,1,n);   // easier: a lower finish is acceptable
  const ambPos=clamp(pos-2,1,n);    // harder: push above your resources
  const mk=(id,label,gp,mult,risk,failure)=>{const goal='top'+gp;return{id,label,goal,multiplier:mult,reward:Math.round(baseReward*goalDiff(goal)*mult),summary:goalDesc(goal),predictedPos:pos,risk,failure};};
  return[
    mk('safe','Bezpieczny',safePos,0.72,'safe','soft'),
    mk('expected','Oczekiwany',pos,1,'expected','normal'),
    mk('ambitious','Ambitny',ambPos,1.45,'ambitious','fired'),
  ];
}
function selectBoardObjective(choiceId){
  const options=store.G.boardObjectiveOptions||generateBoardObjectiveChoices(store.G.myTeamId);
  const picked=options.find(o=>o.id===choiceId);
  if(!picked)return false;
  store.G.boardObjectiveOptions=options;
  store.G.boardObjective={...picked,baseOvr:teamOvr(store.G.myTeamId)};
  persistGame();
  return true;
}
function handleManagerFired(reason){
  pushNews('news.managerFired','hot',{reason});
  toast(t('news.managerFiredToast'));
  persistGame();
  // Called mid-runMatchday, which returns without clearing ui.running — and
  // showStartScreen() refuses to render while ui.running is set, so without this
  // reset the game soft-locks (stuck flag + open match modal) until a refresh.
  ui.running=false;ui.autoPlay=false;
  stopCanvasVME();closeModal();
  if(typeof showStartScreen==='function')showStartScreen(true);
}
function getClubHistory(tid){
  return window.PPM.gameplayClubUI.getClubHistory(tid);
}
function recordClubSeasonHistory(){
  return window.PPM.gameplayClubUI.recordClubSeasonHistory();
}
function openTeamOverview(tid){
  return window.PPM.gameplayClubUI.openTeamOverview(tid);
}

function hirePRDirector(id){
  openStaffNeg(id);
}

const SCOUT_SPECIALTIES=[
  {id:'youth',label:'Juniorzy',desc:'Specjalista od zawodnik\u00f3w 16-19 lat',qualityBonus:0.3},
  {id:'regional',label:'Regionalny',desc:'Zna lokalne ligi',qualityBonus:0.1},
  {id:'talent',label:'\u0141owca Talent\u00f3w',desc:'Odkrywa ukryty potencja\u0142',qualityBonus:0.2},
  {id:'veteran',label:'Weteran\u00f3w',desc:'Sie\u0107 kontakt\u00f3w',qualityBonus:0.25},
];
const POLISH_REGIONS=['Mazowsze','\u015al\u0105sk','Ma\u0142opolska','Wielkopolska','Dolny \u015al\u0105sk','Pomorze'];
const TOTAL_MATCHDAYS=22;
const CHART_COLORS=['#c02818','#1a50a0','#207040','#b07800','#6828a0','#1c6868','#c84800','#a04060','#606020','#205080','#804020','#408040'];

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// NAVIGATION / MODAL / TOAST
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function genNewsFeed(){
  if(!store.G)return[];
  const news=store.G.newsFeed||[];
  return news.slice(-8).reverse();
}
function pushNews(msg,type='',params=null){
  if(!store.G)return;store.G.newsFeed=store.G.newsFeed||[];
  store.G.newsFeed.push(params?{msgKey:msg,msgParams:params,type,season:store.G.season,matchday:store.G.matchday}:{msg,type,season:store.G.season,matchday:store.G.matchday});
  if(store.G.newsFeed.length>180)store.G.newsFeed.shift();
}
// Owner note #6: the feed was "team X loses points" and nothing else. Every item
// below is DATA-DRIVEN from this round's actual results/state — no fake drama.
function generateMatchdayNews(results,myId){
  const teamById=id=>store.G.teams.find(t=>t.id===id);
  // 1) The league leader actually dropping points is news.
  const l1sorted=store.G.teams.filter(t=>t.league===1).sort((a,b)=>b.pts-a.pts);
  const leader=l1sorted[0];
  if(leader){
    const lr=results.find(r=>r.homeId===leader.id||r.awayId===leader.id);
    if(lr&&!lr.isDraw){
      const leaderWon=(lr.homeId===leader.id)===lr.homeWin;
      if(!leaderWon)pushNews('news.leaderDropsPoints','hot',{team:leader.name,score:lr.score});
    }
  }
  // 2) Genuine upsets (weaker side wins against a much stronger one).
  results.forEach(r=>{
    const ht=teamById(r.homeId),at=teamById(r.awayId);
    if(!ht||!at)return;
    const hOvr=teamOvr(r.homeId),aOvr=teamOvr(r.awayId);
    if(!r.isDraw&&!r.homeWin&&hOvr-aOvr>12)pushNews('news.underdogWins','hot',{winner:at.name,winnerOvr:aOvr,loser:ht.name,loserOvr:hOvr,score:r.score});
    if(!r.isDraw&&r.homeWin&&aOvr-hOvr>12)pushNews('news.underdogWins','hot',{winner:ht.name,winnerOvr:hOvr,loser:at.name,loserOvr:aOvr,score:r.score});
  });
  // 3) Win streaks: a club on a 5+ win run (announced at 5, 8, 11…).
  // One pass over this season's results (perf: no per-team re-filtering).
  const runByTeam=new Map();
  store.G.results.forEach(r=>{
    if(r.season!==store.G.season)return;
    const upd=(tid,won)=>runByTeam.set(tid,won?(runByTeam.get(tid)||0)+1:0);
    upd(r.homeId,!r.isDraw&&r.homeWin);
    upd(r.awayId,!r.isDraw&&!r.homeWin);
  });
  const playedThisRound=new Set();results.forEach(r=>{playedThisRound.add(r.homeId);playedThisRound.add(r.awayId);});
  runByTeam.forEach((streak,tid)=>{
    if(!playedThisRound.has(tid))return;
    const t=teamById(tid);
    if(t&&streak>=5&&(streak-5)%3===0)pushNews('news.winStreak',tid===myId?'good':'',{team:t.name,streak});
  });
  // 4) Standout duel: a player beating a clearly higher-rated opponent 3:0/3:1.
  const pById=new Map();store.G.players.forEach(p=>pById.set(p.id,p));
  const duels=[];
  results.forEach(r=>{(r.matchups||[]).forEach(mu=>{
    const hp=pById.get(mu.homePlayer),ap=pById.get(mu.awayPlayer);
    if(!hp||!ap)return;
    if(mu.homeWin&&ovr(ap)-ovr(hp)>=8&&(mu.as||0)<=1)duels.push({w:hp,l:ap,score:`${mu.hs}:${mu.as}`});
    if(!mu.homeWin&&ovr(hp)-ovr(ap)>=8&&(mu.hs||0)<=1)duels.push({w:ap,l:hp,score:`${mu.as}:${mu.hs}`});
  });});
  if(duels.length){
    const d=duels.sort((a,b)=>(ovr(b.l)-ovr(b.w))-(ovr(a.l)-ovr(a.w)))[0];
    pushNews('news.standoutDuel','',{winner:d.w.name,club:teamName(d.w.teamId),winnerOvr:ovr(d.w),loser:d.l.name,loserOvr:ovr(d.l),score:d.score});
  }
  // 5) Career milestones crossed this round (only players who played this round).
  results.forEach(r=>{(r.matchups||[]).forEach(mu=>{
    [pById.get(mu.homePlayer),pById.get(mu.awayPlayer)].forEach(p=>{
      if(p&&!p.retired&&[100,250,500].includes(p.careerW||0))pushNews('news.careerMilestone','good',{player:p.name,club:teamName(p.teamId),wins:p.careerW});
    });
  });});
  // 6) Mid-season table check every 6th round.
  if(store.G.matchday>0&&store.G.matchday%6===0&&leader){
    pushNews('news.tableLeader','',{matchday:store.G.matchday,team:leader.name,points:leader.pts});
  }
}


function getTechPartnership(){if(!store.G||!store.G.techPartnership)return null;return TECH_PARTNERSHIPS.find(t=>t.id===store.G.techPartnership)||null;}
function getTechPartnershipBonus(teamId){
  if(!store.G)return{};
  if(teamId!==store.G.myTeamId)return{};
  return getTechPartnership()?.bonus||{};
}
// ── EQUIPMENT (owner research 2026-07-03): blade + sponge are the player's
// personal setup (fitted to his style at generation); rubber freshness is a
// CLUB-level tier (rubbers wear out → recurring seasonal cost; AI clubs get a
// tier from their budget). Mods flow through getPlayerAdjustedStats, so OVR,
// the match engine and every display see the same numbers.
function fitEquipmentToStyle(p){
  const st=p?.playStyle;
  const blade=(st==='DEFENDER'||st==='FISHER')?'DEF':st==='BLOCKER'?'ALL':st==='FH_LOOPER'?'OFF':(Math.random()<0.5?'OFF':'ALL');
  const sponge=(st==='DEFENDER'||st==='FISHER')?'CIENKA':st==='BLOCKER'?(Math.random()<0.5?'SREDNIA':'CIENKA'):st==='FH_LOOPER'?'GRUBA':(Math.random()<0.5?'GRUBA':'SREDNIA');
  return{blade,sponge};
}
// id → team index. ovr() runs millions of times per season change and used to pay
// a linear teams.find() on every call; that alone was seconds of frozen UI at the
// season boundary. The club list is created once per career and only ever mutated
// in place (never pushed, spliced or re-sorted), so the index is keyed on the array
// itself and rebuilt automatically when a save is loaded and hands us a new one.
let _teamIndexFor=null,_teamIndex=null;
function teamById(id){
  const teams=store.G?.teams;
  if(!teams)return undefined;
  if(_teamIndexFor!==teams||_teamIndex.size!==teams.length){
    _teamIndex=new Map(teams.map(t=>[t?.id,t]));
    _teamIndexFor=teams;
  }
  return _teamIndex.get(id);
}
function clubRubberTier(teamId){
  if(teamId===null||teamId===undefined||!store.G)return 0;
  const maxTier=EQUIPMENT.rubberTiers.length-1;
  if(teamId===store.G.myTeamId)return clamp(store.G.rubberTier||0,0,maxTier);
  const t=teamById(teamId);
  if(!t)return 0;
  return (t.budget||0)>350000?2:(t.budget||0)>120000?1:0;
}
function equipmentMods(p){
  if(!p||!p.equipment||typeof EQUIPMENT==='undefined')return{};
  const out={};
  const add=m=>{if(m)SK.forEach(k=>{if(m[k])out[k]=(out[k]||0)+m[k];});};
  add(EQUIPMENT.blades[p.equipment.blade]?.mods);
  add(EQUIPMENT.sponges[p.equipment.sponge]?.mods);
  add(EQUIPMENT.rubberTiers[clubRubberTier(p.teamId)]?.mods);
  return out;
}
function setRubberTier(tier){
  const tierData=EQUIPMENT.rubberTiers[tier];if(!tierData)return;
  const label=t(`equipment.rubber.${tier}`);
  const squad=store.G.players.filter(p=>p.teamId===store.G.myTeamId&&!p.retired&&p.role!=='youth').length;
  const cost=tierData.costPerPlayer*squad;
  if(tier>(store.G.rubberTier||0)&&cost>0){
    if(!confirm(t('equipment.rubberConfirm',{label,costPerPlayer:formatCurrency(tierData.costPerPlayer),squad,cost:formatCurrency(cost)})))return;
  }
  store.G.rubberTier=tier;
  toast(t('equipment.rubberSet',{label}));
  render();updateHeader();persistGame();
}
function getPlayerAdjustedStats(p,teamId){
  const bonus=getTechPartnershipBonus(teamId??p?.teamId);
  const eq=equipmentMods(p);
  const out={};SK.forEach(s=>{out[s]=(p?.[s]||0)+(bonus[s]||0)+(eq[s]||0);});
  return out;
}
// OVR from the 6 realistic attributes (fh/bh lead, srv, ret, foot, men).
function ovrFromStats(s){return Math.round((s.fh||0)*.22+(s.bh||0)*.20+(s.srv||0)*.16+(s.ret||0)*.14+(s.foot||0)*.14+(s.men||0)*.14);}
function ovr(p){if(!p)return 0;return ovrFromStats(getPlayerAdjustedStats(p,p.teamId));}
function ovrBase(p){return p?ovrFromStats(p):0;}
// Engine channels (ATK/DEF/SRV/MEN) derived from the 6 attributes — keeps the well-
// tuned 4-channel rally math intact while the player-facing model is realistic.
// Uses getPlayerAdjustedStats so blade/sponge/rubber + tech partnership actually
// affect the point sim (not only the displayed OVR).
function engineStats(p){
  const s=(p&&typeof getPlayerAdjustedStats==='function')?getPlayerAdjustedStats(p,p.teamId):p;
  const fh=s?.fh||40,bh=s?.bh||40,srv=s?.srv||40,ret=s?.ret||40,foot=s?.foot||40,men=s?.men||40;
  const hi=Math.max(fh,bh),lo=Math.min(fh,bh);
  return{
    atk:hi*0.6+lo*0.4,                 // attack = strong wing + exploitable weak wing
    def:foot*0.5+bh*0.26+ret*0.24,     // consistency / block / reach / return read
    srv,                               // serve pressure (blunted by opp's def→ret)
    men,
  };
}
function getActiveBrand(){return null;}
function myTeam(){return store.G.teams.find(t=>t.isPlayer);}
function myPlayers(){return store.G.players.filter(p=>p.teamId===myTeam().id&&!p.retired);}
function myStarters(){return myPlayers().filter(p=>p.role==='starter');}
function myReserves(){return myPlayers().filter(p=>p.role==='reserve');}
function teamName(id){return teamById(id)?.name||'?';}
function playerName(id){return store.G.players.find(p=>p.id===id)?.name||'?';}
function teamLeague(tid){return teamById(tid)?.league||1;}
function myLeague(){return myTeam()?.league||1;}
function teamOvr(tid){
  let st=store.G.players.filter(p=>p.teamId===tid&&!p.retired&&p.role==='starter'&&!(p.injuredFor>0)).slice(0,4);
  if(st.length<4){const ex=store.G.players.filter(p=>p.teamId===tid&&!p.retired&&!(p.injuredFor>0)).sort((a,b)=>ovr(b)-ovr(a));st=ex.slice(0,4);}
  return st.length?Math.round(st.reduce((s,p)=>s+ovr(p),0)/st.length):40;
}
// Every club's best four, averaged. contractExpect() calls this for every single
// negotiation, and the naive shape (one full player scan per club, plus a fresh
// ovr() inside every sort comparison) made the AI transfer window take seconds of
// frozen UI at each season change. One grouping pass and one ovr() per player —
// same players, same order, same number.
function calcLeagueAvgOvr(leagueId){
  const byTeam=new Map();
  const rating=new Map();
  for(const p of store.G.players){
    if(!p||p.retired||p.role==='youth'||p.teamId===null||p.teamId===undefined)continue;
    let group=byTeam.get(p.teamId);
    if(!group){group=[];byTeam.set(p.teamId,group);}
    group.push(p);
    rating.set(p,ovr(p));
  }
  const rate=p=>rating.get(p);
  let sum=0,count=0;
  for(const t of store.G.teams){
    if(t.league!==leagueId)continue;
    const group=byTeam.get(t.id);
    if(!group)continue;
    const best=group.slice().sort((a,b)=>rate(b)-rate(a)).slice(0,4);
    for(const p of best){sum+=rate(p);count++;}
  }
  return count?Math.round(sum/count):60;
}
function getTopClubPlayers(teamId,count=3){
  return store.G.players
    .filter(p=>p.teamId===teamId&&!p.retired&&p.role!=='youth')
    .sort((a,b)=>ovr(b)-ovr(a))
    .slice(0,count);
}
function expectsStarterRole(p,targetTeamId=p.teamId){
  if(!targetTeamId||p.teamId!==targetTeamId)return false;
  const topGroup=getTopClubPlayers(targetTeamId,3);
  return topGroup.some(x=>x.id===p.id);
}
function getPlayerTargetLeague(teamId=store.G?.myTeamId){
  return teamById(teamId)?.league||myLeague();
}
function getMax(p,s){
  if(s==='fh'&&p.traits.includes('IRON_ATTACK'))return 96;
  if(s==='bh'&&p.traits.includes('IRON_DEFENSE'))return 96;
  if(s==='srv'&&(p.traits.includes('SERVE_MASTER')||p.traits.includes('AGGR_SERVE')))return 96;
  if(s==='men'&&(p.traits.includes('STEEL_NERVES')||p.traits.includes('VETERAN')))return 96;
  // Owner note #5: a flat 84 made any advertised peak above ~84 unreachable —
  // players always ended 5-7 OVR under their ceiling. Stats may now rise a few
  // points past the ceiling value (OVR is a weighted mean, so reaching ceiling
  // OVR needs per-stat headroom above it).
  return clamp(playerCeiling(p)+3,84,96);
}
function phaseLabel(p){return t(p.age<p.peakAge?'phase.growth':p.age<=p.peakAge+2?'phase.plateau':'phase.decline');}
function phaseColor(p){return p.age<p.peakAge?'var(--g)':p.age<=p.peakAge+2?'var(--gold)':'var(--r)';}
// Staff OVR instead of stars
function staffOvr(s){
  const age=s.age||45;
  const peak=s.peakAge||52;
  const ageMod=age<peak?Math.min(4,Math.round((peak-age)/8)):age>peak+2?-Math.min(12,Math.round((age-(peak+2))/3)):0;
  if(s.type==='coach') return clamp(Math.round((s.tactics+s.training+s.motivation+s.synergy)/4)+ageMod,10,99);
  if(s.type==='scout') return clamp(Math.round((s.accuracy+s.network)/2)+ageMod,10,99);
  if(s.type==='physio') return clamp(Math.round((s.injReduction+s.recovery+s.prevention)/3)+ageMod,10,99);
  if(s.type==='psychologist') return clamp(Math.round(((s.moraleBoost||0)+(s.mentalTraining||0)+(s.pressure||0))/3)+ageMod,10,99);
  if(s.type==='pr') return clamp(Math.round(((s.bonus||0)*900)+((s.cooldownReduce||0)*8))+ageMod,10,99);
  return 50;
}
// v13: Progressive staff OVR colors (more granular)
function staffOvrColor(o){if(o>=85)return'#18a050';if(o>=75)return'var(--g)';if(o>=65)return'#50a030';if(o>=55)return'var(--gold)';if(o>=45)return'var(--orange)';if(o>=35)return'#d06020';return'var(--r)';}
// sleep(), rnd() and clamp() are provided globally by src/core/utils.js.
function getAppSettings(){return ui.settings||window.PPM.stateApi?.loadAppSettings?.()||{theme:'light',matchSpeed:'normal',aiDifficulty:'hard'};}
function getCareerDifficultyKey(){
  if(store.G&&['easy','normal','hard','legend'].includes(store.G.aiDifficulty))return store.G.aiDifficulty;
  if(['easy','normal','hard','legend'].includes(ui._newSaveDifficulty))return ui._newSaveDifficulty;
  return getAppSettings().aiDifficulty||'hard';
}
const AI_DIFFICULTY_CONFIG={
  easy:{speedMult:1.8, negotiationBias:1, prestigeBarrier:0, aiCashMult:0.92, aiInfraMult:0.9, freeAgentCap:84, playerAcademyPotential:1.04, playerScoutPotential:1.03},
  normal:{speedMult:1.6, negotiationBias:0, prestigeBarrier:0.4, aiCashMult:1, aiInfraMult:1, freeAgentCap:83, playerAcademyPotential:1, playerScoutPotential:1},
  hard:{speedMult:1.6, negotiationBias:-1, prestigeBarrier:0.9, aiCashMult:1.12, aiInfraMult:1.12, freeAgentCap:81, playerAcademyPotential:0.94, playerScoutPotential:0.95},
  legend:{speedMult:1.6, negotiationBias:-2, prestigeBarrier:1.35, aiCashMult:1.24, aiInfraMult:1.22, freeAgentCap:79, playerAcademyPotential:0.88, playerScoutPotential:0.9},
};
function getDifficultyConfig(){
  const key=getCareerDifficultyKey();
  return AI_DIFFICULTY_CONFIG[key]||AI_DIFFICULTY_CONFIG.hard;
}
// Plain-language summary of what a difficulty level actually changes (owner backlog
// #13 — players couldn't tell what easy/normal/hard/legend do). Data-driven from the
// config above, so it stays accurate if the numbers are tuned.
function difficultyEffectsSummary(key){
  const c=AI_DIFFICULTY_CONFIG[key]||AI_DIFFICULTY_CONFIG.normal;
  const rel=v=>{const p=Math.round((v-1)*100);return p===0?t('difficulty.unchanged'):(p>0?'+':'')+p+'%';};
  const neg=c.negotiationBias>0?t('difficulty.easier'):c.negotiationBias<0?t('difficulty.harder'):t('difficulty.neutral');
  return [
    t('difficulty.aiClubs',{budget:rel(c.aiCashMult),infra:rel(c.aiInfraMult)}),
    t('difficulty.freeAgents',{ovr:c.freeAgentCap}),
    t('difficulty.academyScouting',{academy:rel(c.playerAcademyPotential),scouting:rel(c.playerScoutPotential)}),
    t('difficulty.negotiations',{level:neg,barrier:c.prestigeBarrier>=0.9?t('difficulty.prestigeBarrier'):''}),
  ];
}
function fatigueImpactFactor(){return 1.15;}
function matchPause(ms){
  if(window.ui&&ui.autoPlay)return Promise.resolve(); // auto-play: no animation delays
  const speed=getAppSettings().matchSpeed||'normal';
  const mult=speed==='slow'?2.35:speed==='fast'?0.9:getDifficultyConfig().speedMult;
  return sleep(Math.round(ms*mult));
}
function safeLog(msg,cls=''){if(!store.G)return;store.G.gameLog=store.G.gameLog||[];store.G.gameLog.push({msg,cls,season:store.G.season,matchday:store.G.matchday});if(store.G.gameLog.length>150)store.G.gameLog.shift();}
function calcPrestige(){
  const h=store.G.seasonHistory.slice(-5);if(!h.length)return 30;
  const avg=h.reduce((s,x)=>s+x.position,0)/h.length;
  // Prestige reflects RECENT form only (last 5 seasons), not lifetime trophies —
  // otherwise every club would drift to max prestige given enough time. The L2 gap
  // is a tier difference, not a punishment, and there's a real floor so no club is
  // ever "nobody wants to join".
  const leagueBonus=myLeague()===1?0:-8;
  const stars=myPlayers().sort((a,b)=>calcPlayerMarketability(b)-calcPlayerMarketability(a)).slice(0,4);
  const starMarketability=stars.length?stars.reduce((s,p)=>s+calcPlayerMarketability(p),0)/stars.length:20;
  const starBoost=Math.round(Math.max(0,(starMarketability-35)/6));
  return Math.round(Math.max(25,Math.min(100,100-(avg-1)*11+leagueBonus+starBoost)));
}
function goalDiff(g){
  const map={none:0.4,top2:2.4,top3:2.0,top4:1.5,top6:1.0,top8:0.7,win2:0.45,win4:0.6,win6:0.85,win8:1.0,win10:1.3,win12:1.7,win14:2.1,win16:2.6};
  if(map[g]!=null)return map[g];
  if(/^top\d+$/.test(g))return clamp(2.6-(+g.slice(3)-1)*0.19,0.35,2.6); // any position target
  return 1;
}
function goalDesc(g){
  if(g==='none')return t('goal.none');
  if(/^top\d+$/.test(g))return t('goal.top',{count:g.slice(3)});
  if(/^win\d+$/.test(g))return t('goal.wins',{count:g.slice(3)});
  return g;
}
const BOARD_GOAL_ORDER=['top2','top3','top4','top6','top8','win16','win14','win12','win10','win8','win6','win4'];
function boardGoalIndex(goal){
  const idx=BOARD_GOAL_ORDER.indexOf(goal);
  return idx>=0?idx:BOARD_GOAL_ORDER.length-1;
}
function checkGoal(s){if(s.goal==='none')return true;const mt=myTeam();const myL=myLeague();const srt=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>b.pts-a.pts);const pos=srt.findIndex(t=>t.isPlayer)+1;if(s.goal.startsWith('top'))return pos<=(+s.goal.replace('top',''));if(s.goal.startsWith('win'))return mt.w>=(+s.goal.replace('win',''));return false;}
function sponsorProg(s){if(s.goal==='none')return{label:t('goal.progressNone'),pct:100};const mt=myTeam();const myL=myLeague();const srt=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>b.pts-a.pts);const pos=srt.findIndex(t=>t.isPlayer)+1;if(s.goal.startsWith('top')){const target=+s.goal.replace('top','');return{label:t('goal.positionProgress',{position:pos,target}),pct:Math.max(0,Math.min(100,100-(pos-1)*(100/target)))};}const target=+s.goal.replace('win','');return{label:t('goal.winsProgress',{wins:mt.w,target}),pct:Math.min(100,Math.round(mt.w/target*100))};}
function randName(){
  const fn = window._FN || FN;
  const ln = window._LN || LN;
  return fn[rnd(0,fn.length-1)]+' '+ln[rnd(0,ln.length-1)];
}
// getCountryNamePools / randNameForCountry — canonical in utils.js (loaded first).
function raisePlayerBaseOvrTo(p,target){
  let guard=0;
  while(ovrBase(p)<target&&guard<220){
    const stat=[...SK].sort((a,b)=>(p[a]/Math.max(1,getMax(p,a)))-(p[b]/Math.max(1,getMax(p,b))))[0];
    const next=Math.min(getMax(p,stat),p[stat]+1);
    if(next===p[stat])break; // every stat at its cap — target unreachable, stop burning the guard
    p[stat]=next;
    guard++;
  }
  ensurePlayerMeta(p);
  // Re-price the wage to the new OVR so a boosted player isn't underpaid at
  // generation and then "shocked" with a huge demand at renewal.
  p.salary=Math.round(playerWageForOvr(ovrBase(p))*(0.92+Math.random()*0.1));
  return p;
}
// Budget ↔ squad strength are tightly coupled and LEAGUE-AGNOSTIC: the same money
// buys the same squad anywhere, so league strength is purely EMERGENT from income
// (L1 simply earns more → bigger budgets → stronger; relegation cuts income →
// weakens). ~80% of budget on wages across a 7-deep squad [T,-2,-4,-6,-8,-9,-10];
// we invert the convex wage curve for the top player. Because wages are convex,
// €100k buys more OVR at the bottom than at the top — honest economics.
function leagueStrengthTopForBudget(budget){
  const wageBudget=Math.max(1,(budget||0)*0.80);
  const top=55+Math.log(wageBudget/(3.812*2000))/Math.log(1.135);
  return clamp(Math.round(top),55,90);
}
function getLeagueStrengthTargets(budget){
  const T=leagueStrengthTopForBudget(budget);
  return [T,T-2,T-4,T-6];
}
function tuneGeneratedLeagueRoster(teamId){
  const team=store.G.teams.find(t=>t.id===teamId);
  let roster=store.G.players
    .filter(p=>p.teamId===teamId&&!p.retired&&p.role!=='youth')
    .sort((a,b)=>ovrBase(b)-ovrBase(a));
  const targets=getLeagueStrengthTargets(team?team.budget:100000);
  // Owner: every club carries 4 starters + 6 reserves (sparring depth). Top up AI
  // squads that fell short (aging/retirement). The player's own club and youth-only
  // clubs are NOT auto-filled — they build their bench themselves / via the academy.
  const ROSTER_TARGET=10;
  if(team&&!team.isPlayer&&!(team.traits||[]).includes('youthOnly')){
    while(roster.length<ROSTER_TARGET){
      const np=genPlayer(null,20+rnd(0,12),store.G.countryId||'PL');
      np.teamId=teamId;np.role='reserve';np.contractYears=1+rnd(0,2);np.nationality=store.G.countryId||'PL';
      store.G.players.push(np);
      if(store.G.playerHistory)store.G.playerHistory[np.id]=[snap(np)];
      roster.push(np);
    }
    roster.sort((a,b)=>ovrBase(b)-ovrBase(a));
  }
  // Soft retune: only nudge stars that are clearly below budget target (gap>3),
  // and only halfway — stops full magic OVR rewrite every season.
  roster.forEach((p,idx)=>{
    if(idx<4){
      const target=targets[idx]||targets[targets.length-1];
      const cur=ovrBase(p);
      if(cur<target-3)raisePlayerBaseOvrTo(p,Math.round(cur+(target-cur)*0.5));
    }
    p.role=idx<4?'starter':'reserve';
  });
}
// Our actual player wage bill, correctly accounting for BOTH loan directions.
// wageShare = the fraction the DESTINATION (borrower) covers, so:
//   lent OUT (player now sits at the borrower): we keep the residual (1-share).
//   borrowed IN (player sits in our squad):     we pay only our share (share).
// Returns {gross, loanAdj, bill, loanedOutCost, loanedInSaving} for display.
function myPlayerWageBill(){
  const mt=myTeam();
  const loans=(store.G.loans||[]).filter(l=>!l.returned);
  const out=new Map(loans.filter(l=>l.fromTeamId===mt.id).map(l=>[l.playerId,l.wageShare||0.3]));
  const inn=new Map(loans.filter(l=>l.toTeamId===mt.id).map(l=>[l.playerId,l.wageShare||0.3]));
  let gross=0,bill=0,loanedOutCost=0,loanedInSaving=0;
  store.G.players.forEach(p=>{
    if(p.retired)return;
    const sal=p.salary||0;
    if(out.has(p.id)){const c=Math.round(sal*(1-out.get(p.id)));bill+=c;loanedOutCost+=c;} // lent out → residual
    else if(p.teamId===mt.id){
      gross+=sal;
      if(inn.has(p.id)){const c=Math.round(sal*inn.get(p.id));bill+=c;loanedInSaving+=(sal-c);} // borrowed in → our share
      else bill+=sal;
    }
  });
  return{gross,bill,loanedOutCost,loanedInSaving};
}
function totalWages(){
  const mt=myTeam();
  const staffWages=store.G.staff.filter(s=>s.teamId===mt.id).reduce((s,x)=>s+(x.salary||0),0);
  const prSalary=store.G.prDirector?.salary||0;
  return myPlayerWageBill().bill+staffWages+prSalary;
}
function totalWageBreakdown(){
  const mt=myTeam();
  const wb=myPlayerWageBill();
  const staff=store.G.staff.filter(s=>s.teamId===mt.id);
  const breakdown={
    players:wb.bill, // net player wages (loans in/out already applied)
    coaches:staff.filter(s=>s.type==='coach').reduce((sum,s)=>sum+(s.salary||0),0),
    physios:staff.filter(s=>s.type==='physio').reduce((sum,s)=>sum+(s.salary||0),0),
    psychologists:staff.filter(s=>s.type==='psychologist').reduce((sum,s)=>sum+(s.salary||0),0),
    scouts:staff.filter(s=>s.type==='scout').reduce((sum,s)=>sum+(s.salary||0),0),
    prDirector:store.G.prDirector?.salary||0,
    loanSavings:wb.loanedInSaving,    // saved on players borrowed in
    loanedOutCost:wb.loanedOutCost,   // residual we still pay on players lent out
  };
  breakdown.total=breakdown.players+breakdown.coaches+breakdown.physios+breakdown.psychologists+breakdown.scouts+breakdown.prDirector;
  return breakdown;
}
function getMyScouts(){
  if(!store.G)return[];
  return store.G.staff.filter(s=>s.teamId===store.G.myTeamId&&s.type==='scout');
}
function getPolishClubStaffMarket(){
  if(!store.G)return[];
  return store.G.staff.filter(s=>s.teamId!==null&&s.teamId!==store.G.myTeamId).sort((a,b)=>staffOvr(b)-staffOvr(a));
}
function getAllExternalStaffMarket(){
  if(!store.G)return[];
  return [
    ...store.G.staff.filter(s=>s.teamId!==null&&s.teamId!==store.G.myTeamId),
    ...(store.G.staffPool||[]),
    ...((store.G.scoutPool||[]).filter(s=>!s.hired)),
    ...getPRDirectorMarket(),
    ...getRivalPRDirectors()
  ];
}
function calcTeamMorale(){const mp=myPlayers();if(!mp.length)return 50;return Math.round(mp.reduce((s,p)=>s+(p.morale||50),0)/mp.length);}
function moraleLabel(m){return t(m>=80?'morale.excellent':m>=60?'morale.good':m>=40?'morale.average':'morale.bad');}
// v13: Updated league maintenance costs
function calcLeagueMaint(){const base=myLeague()===1?32000:13000;return base+(store.G.season||1)*800;}
// Yearly academy upkeep (NEW): scales with level (€2k→€30k). Charged every season-
// end as part of maintenance. Downgrading the academy is the escape valve in a cash
// crisis (downgradeInfra).
function academyUpkeep(){const lv=clamp(store.G.infraAcademy||0,0,INFRA_ACADEMY.length-1);return INFRA_ACADEMY[lv].upkeep||0;}
function snap(p){const s={season:store.G.season,age:p.age,ovr:ovr(p),baseOvr:ovrBase(p)};SK.forEach(k=>s[k]=p[k]);return s;}
function ensureStaffMeta(s){
  if(!s)return s;
  if(!Array.isArray(s.careerHistory))s.careerHistory=[];
  if(typeof s.ceiling!=='number'){
    const peakVersion={...s,age:Math.min(s.age||45,s.peakAge||52)};
    s.ceiling=clamp(staffOvr(peakVersion)+(s.type==='coach'?4:2),Math.max(staffOvr(s),30),99);
  }
  if(!s.bioKey)s.bioKey='staff.bioFallback';
  if(s.teamId!==undefined&&s.teamId!==null){
    const openTenure=s.careerHistory.find(h=>h.teamId===s.teamId&&!h.endSeason);
    if(!openTenure)s.careerHistory.push({teamId:s.teamId,startSeason:store.G?.season||1,endSeason:null,role:s.type});
  }
  return s;
}
function closeStaffTenure(s, endSeason){
  if(!s?.careerHistory)return;
  const openTenure=s.careerHistory.find(h=>h.teamId===s.teamId&&!h.endSeason);
  if(openTenure)openTenure.endSeason=endSeason;
}
function startStaffTenure(s, teamId, season){
  ensureStaffMeta(s);
  s.teamId=teamId;
  const openTenure=s.careerHistory.find(h=>h.teamId===teamId&&!h.endSeason);
  if(!openTenure)s.careerHistory.push({teamId, startSeason:season, endSeason:null, role:s.type});
}
function staffSnap(s){return{season:store.G.season,age:s.age||0,ovr:staffOvr(s),contractYears:s.contractYears||0,type:s.type,style:s.styleName||s.type,teamId:s.teamId??null,teamName:s.teamId!==null&&s.teamId!==undefined?teamName(s.teamId):'Wolny rynek'};}
function staffCeiling(s){ensureStaffMeta(s);return Math.max(staffOvr(s),s.ceiling||staffOvr(s));}
function getOwnedSingleStaffByType(type){
  if(type==='pr')return store.G.prDirector||null;
  if(type==='scout')return null;
  return store.G.staff.find(s=>s.teamId===store.G.myTeamId&&s.type===type)||null;
}
function staffReplacementCost(existing){
  if(!existing)return 0;
  const remaining=Math.max(0,TOTAL_MATCHDAYS-(store.G?.matchday||0));
  const ratio=(remaining/Math.max(1,TOTAL_MATCHDAYS))*2;
  return Math.round((existing.salary||0)*ratio);
}
function canPreSignStaff(s){
  return !!(s&&s.teamId!==null&&s.teamId!==store.G?.myTeamId&&(s.contractYears||0)===1);
}
function staffNegotiationBlockReason(s){
  if(!s)return t('staff.neg.notFound');
  if(s.teamId!==null&&s.teamId!==store.G?.myTeamId&&(s.contractYears||0)>1){
    return t('staff.neg.contractBlocked',{name:s.name,years:s.contractYears||0});
  }
  return '';
}
function calcGoat(p){const awards=p.awards||[];const titles=awards.filter(a=>a.type==='league_champion'||a.type==='olympic_gold').length;const mvp=awards.filter(a=>a.type==='golden_paddle').length;const wr=(p.careerW||0)+(p.careerL||0)>0?Math.round((p.careerW||0)/((p.careerW||0)+(p.careerL||0))*100):0;const peak=p.careerOvr||p.peakOvr||0;return Math.round(titles*50+mvp*40+wr+peak*5);}
const STYLE_EDGE={
  TWO_SIDED:{TWO_SIDED:0,FH_LOOPER:5,BLOCKER:3,FISHER:-3,DEFENDER:-5},
  FH_LOOPER:{TWO_SIDED:-5,FH_LOOPER:0,BLOCKER:5,FISHER:3,DEFENDER:-3},
  BLOCKER:{TWO_SIDED:-3,FH_LOOPER:-5,BLOCKER:0,FISHER:5,DEFENDER:3},
  FISHER:{TWO_SIDED:3,FH_LOOPER:-3,BLOCKER:-5,FISHER:0,DEFENDER:5},
  DEFENDER:{TWO_SIDED:5,FH_LOOPER:3,BLOCKER:-3,FISHER:-5,DEFENDER:0},
};
const OPPOSITE_STYLE={TWO_SIDED:'DEFENDER',FH_LOOPER:'TWO_SIDED',BLOCKER:'FH_LOOPER',FISHER:'BLOCKER',DEFENDER:'FISHER'};
function pick(arr){return arr[rnd(0,arr.length-1)];}
function derivePlayerStamina(p){
  const men=typeof p?.men==='number'?p.men:50;
  const age=typeof p?.age==='number'?p.age:24;
  const traits=Array.isArray(p?.traits)?p.traits:[];
  let stamina=50+Math.round((men-50)*0.25);
  if(age<=22)stamina+=8;
  else if(age<=27)stamina+=4;
  else if(age>=35)stamina-=7;
  else if(age>=31)stamina-=3;
  if(traits.includes('IRON_STAMINA'))stamina+=18;
  if(traits.includes('VETERAN'))stamina+=4;
  if(traits.includes('HOTHEADED'))stamina-=6;
  if(traits.includes('WUNDERKIND'))stamina+=3;
  return clamp(stamina,28,96);
}
function playerStamina(p){
  ensurePlayerMeta(p);
  return clamp(typeof p.stamina==='number'?p.stamina:derivePlayerStamina(p),28,99);
}
function getInjuredStarters(teamId){
  return store.G.players.filter(p=>p.teamId===teamId&&!p.retired&&p.role==='starter'&&(p.injuredFor||0)>0);
}
function getHealthyStarters(teamId){
  return store.G.players.filter(p=>p.teamId===teamId&&!p.retired&&p.role==='starter'&&(p.injuredFor||0)<=0);
}
// With pre-match nomination (Superliga protocol) a match needs 3 base players —
// drawn from the WHOLE healthy senior roster, not just the 4 starter slots.
function getEligibleMatchPlayers(teamId){
  return store.G.players.filter(p=>p.teamId===teamId&&!p.retired&&p.role!=='youth'&&(p.injuredFor||0)<=0);
}
function getStarterAvailabilityIssues(teamId){
  const healthy=getEligibleMatchPlayers(teamId);
  const injured=store.G.players.filter(p=>p.teamId===teamId&&!p.retired&&p.role!=='youth'&&(p.injuredFor||0)>0);
  if(healthy.length>=3)return null;
  return{
    healthyCount:healthy.length,
    injured,
    missingCount:Math.max(0,3-healthy.length)
  };
}
function blockForInjuredStarter(teamId,contextLabel){
  const issues=getStarterAvailabilityIssues(teamId);
  if(!issues)return false;
  ui.page='squad';
  closeModal();
  render();
  const injuredNames=issues.injured.map(p=>p.name).join(', ');
  const reason=t(issues.injured.length?'match.blockedInjuries':'match.blockedSquad',{
    count:issues.healthyCount,names:injuredNames,
  });
  toast(`${t(contextLabel)}: ${reason}`);
  return true;
}
function ensurePlayerMeta(p){
  if(!p)return p;
  if(typeof p.seasonForm!=='number')p.seasonForm=rnd(-6,6);
  if(typeof p.stamina!=='number')p.stamina=derivePlayerStamina(p);
  if(typeof p.ceiling!=='number')p.ceiling=estimatePlayerCeiling(p);
  if(!p.equipment)p.equipment=fitEquipmentToStyle(p);
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
  if(typeof p.marketability!=='number')p.marketability=clamp(14+Math.round(ovrBase(p)/3)+(p.loyalty||0),8,92);
  if(!p.profileTag||!p.signatureNote){
    const identity=describePlayerIdentity(p);
    if(!p.profileTag)p.profileTag=identity.label;
    if(!p.signatureNote)p.signatureNote=identity.note;
  }
  return p;
}
function calcPlayerMarketability(p){
  if(!p)return 10;
  ensurePlayerMeta(p);
  const wins=(p.careerW||0)*0.08+(p.seasonW||0)*0.9;
  const trophyScore=(p.awards||[]).reduce((sum,a)=>{
    if(a.type==='league_champion')return sum+8;
    if(a.type==='cup_winner')return sum+6;
    if(a.type==='golden_paddle')return sum+7;
    if(a.type==='iron_paddle')return sum+6;
    if(String(a.type||'').startsWith('top12_winner'))return sum+6;
    if(a.type==='olympic_gold')return sum+10;
    if(a.type==='mundial_gold')return sum+12;
    return sum+2;
  },0);
  const base=12+Math.round(ovrBase(p)*0.34)+(p.loyalty||0)*1.4+Math.max(0,(p.age-20)*0.4);
  const formBoost=Math.max(-4,Math.min(8,seasonFormImpact(p)/2));
  const total=clamp(Math.round(base+wins+trophyScore+formBoost),8,99);
  p.marketability=total;
  return total;
}
function getAvatarData(entity,kind){
  return window.PPM.gameplayVisuals.getAvatarData(entity,kind);
}
function getTeamLogoData(team){
  return window.PPM.gameplayVisuals.getTeamLogoData(team);
}
function getTeamBranding(team){
  return window.PPM.gameplayVisuals.getTeamBranding(team);
}
function negotiationKey(kind,id){return`${store.G.season}:${store.G.matchday}:${kind}:${id}`;}
function alreadyNegotiated(kind,id){
  store.G._negotiationLog=store.G._negotiationLog||{};
  return !!store.G._negotiationLog[negotiationKey(kind,id)];
}
function markNegotiated(kind,id){
  store.G._negotiationLog=store.G._negotiationLog||{};
  store.G._negotiationLog[negotiationKey(kind,id)]=true;
}
function pushNegotiationHistory(entry){
  if(!store.G)return;
  store.G.negotiationHistory=store.G.negotiationHistory||[];
  store.G.negotiationHistory.push({season:store.G.season,matchday:store.G.matchday,...entry});
  if(store.G.negotiationHistory.length>40)store.G.negotiationHistory.shift();
}
function ensureSeasonFinance(){
  if(!store.G)return null;
  if(!store.G.seasonFinance||store.G.seasonFinance.season!==store.G.season){
    store.G.seasonFinance={season:store.G.season,tickets:0,merch:0,prize:0,sponsorIncome:0,tvRights:0,boardReward:0,techPartnership:0,wages:0,playerWages:0,coachWages:0,physioWages:0,psychologistWages:0,scoutWages:0,prDirectorWages:0,maint:0,transfersIn:0,infraCost:0,staffBuyouts:0,prDirectorCost:0,brandCosts:0,other:0};
  }
  return store.G.seasonFinance;
}
function recordManagerSeason(position,league){
  store.G.managerHistory=store.G.managerHistory||[];
  store.G.managerHistory.push({
    season:store.G.season,
    clubId:store.G.myTeamId,
    clubName:myTeam().name,
    league,
    position,
    prestige:store.G.managerPrestige||0,
    boardGoal:store.G.boardObjective?.goal||null,
    boardMet:store.G.boardObjective?checkGoal(store.G.boardObjective):null
  });
}
function recordCoachSeason(){
  store.G.coachHistory=store.G.coachHistory||[];
  const coach=getCoach();
  if(!coach)return;
  store.G.coachHistory.push({
    season:store.G.season,
    clubId:store.G.myTeamId,
    clubName:myTeam().name,
    coachId:coach.id,
    coachName:coach.name,
    coachOvr:staffOvr(coach),
    age:coach.age||0,
    style:coach.styleName||coach.type,
  });
}
function generateClubOffers(){
  const rep=store.G.managerPrestige||0;
  const currentId=store.G.myTeamId;
  const currentCountryId=store.G.countryId||'PL';
  const worldOffers=[];
  const currentSeason=store.G.season||1;
  const calcPrestigeNeed=(offer)=>{
    const countryRank=COUNTRIES[offer.countryId]?.worldRank||12;
    const history=(offer.history||[]).slice(-3);
    const avgPos=history.length?history.reduce((sum,row)=>sum+(row.position||8),0)/history.length:(offer.league===1?6:7);
    const titles=history.filter(row=>row.position===1).length;
    const podiums=history.filter(row=>(row.position||99)<=3).length;
    const recentForm=Math.max(0,8-avgPos)*2.2;
    const trophyValue=titles*8+podiums*3;
    const budgetValue=Math.min(16,(offer.budget||0)/(offer.league===1?3800:2600));
    const countryValue=Math.max(0,12-countryRank)*1.2;
    const leagueValue=offer.league===1?8:0;
    const ovrValue=Math.max(0,(offer.ovr||60)-(offer.league===1?68:60))*2.1;
    return clamp(Math.round(18+leagueValue+ovrValue+budgetValue+recentForm+trophyValue+countryValue),18,96);
  };
  COUNTRY_IDS.forEach(cid=>{
    const country=COUNTRIES[cid]||COUNTRIES.PL;
    const names=[...(country.l1Names||TNAMES_L1),...(country.l2Names||TNAMES_L2)];
    names.forEach((name,clubIndex)=>{
      const league=clubIndex<12?1:2;
      if(cid===currentCountryId&&clubIndex===currentId)return;
      const existingTeam=cid===currentCountryId?store.G.teams.find(t=>t.id===clubIndex):null;
      const budget=existingTeam?.budget??(league===1?Math.round((250000+clubIndex*22000)*(country.budgetMult||1)):Math.round((60000+Math.max(0,clubIndex-12)*8000)*(country.budgetMult||1)));
      const estimatedOvr=existingTeam?teamOvr(existingTeam.id):Math.round((league===1?66:56)+(country.ovrMult||1)*8+(league===1?(11-(clubIndex%12))*0.8:(11-(clubIndex-12))*0.55));
      const history=existingTeam?(store.G.clubHistory?.[existingTeam.id]||[]):[];
      const latestHistory=history[history.length-1]||null;
      const recentTitles=history.filter(row=>row.season>=Math.max(1,currentSeason-3)&&row.position===1).length;
      const recentPodiums=history.filter(row=>row.season>=Math.max(1,currentSeason-3)&&(row.position||99)<=3).length;
      const offer={
        clubId:existingTeam?existingTeam.id:`${cid}_${clubIndex}`,
        clubIndex,
        clubName:name,
        league,
        ovr:estimatedOvr,
        budget,
        countryId:cid,
        countryName:country.name,
        lastPosition:latestHistory?.position||null,
        recentTitles,
        recentPodiums,
        history,
      };
      offer.prestigeNeed=calcPrestigeNeed(offer);
      offer.eligible=rep>=offer.prestigeNeed;
      offer.noteKey=offer.eligible?(league===1?'jobs.noteTop':'jobs.noteRebuild'):'jobs.noteLocked';
      offer.powerScore=(offer.ovr||0)+(offer.league===1?8:0)+recentTitles*4+recentPodiums*2+(offer.lastPosition?Math.max(0,8-offer.lastPosition):0);
      worldOffers.push(offer);
    });
  });
  const offers=worldOffers
    .sort((a,b)=>a.countryName.localeCompare(b.countryName,'pl')||a.league-b.league||a.prestigeNeed-b.prestigeNeed||b.powerScore-a.powerScore||a.clubName.localeCompare(b.clubName,'pl'))
    .map(({powerScore,...offer})=>offer);
  ui.clubOfferCountry='all';
  ui.clubOfferLeague='all';
  store.G.clubOffers=offers;
  return offers;
}
function getFilteredClubOffers(){
  const offers=store.G.clubOffers||[];
  return offers.filter(o=>(ui.clubOfferCountry||'all')==='all'||o.countryId===ui.clubOfferCountry)
    .filter(o=>(ui.clubOfferLeague||'all')==='all'||String(o.league)===String(ui.clubOfferLeague));
}
function setClubOfferFilter(type,value){
  if(type==='country')ui.clubOfferCountry=value;
  if(type==='league')ui.clubOfferLeague=value;
  refreshClubOfferPicker();
}
function buildClubOfferPickerHtml(limit=24){
  const offers=getFilteredClubOffers();
  const visible=offers.slice(0,limit);
  return `<div class="grid gtc2 gp8 mb10">
    <select onchange="setClubOfferFilter('country',this.value)" class="tile">
      <option value="all" ${(ui.clubOfferCountry||'all')==='all'?'selected':''}>${t('jobs.allCountries')}</option>
      ${COUNTRY_IDS.map(cid=>`<option value="${cid}" ${(ui.clubOfferCountry||'all')===cid?'selected':''}>${COUNTRIES[cid]?.flag||''} ${t(`country.${cid}`)}</option>`).join('')}
    </select>
    <select onchange="setClubOfferFilter('league',this.value)" class="tile">
      <option value="all" ${(ui.clubOfferLeague||'all')==='all'?'selected':''}>${t('jobs.bothLeagues')}</option>
      <option value="1" ${String(ui.clubOfferLeague||'all')==='1'?'selected':''}>${t('league.divisionOne')}</option>
      <option value="2" ${String(ui.clubOfferLeague||'all')==='2'?'selected':''}>${t('league.divisionTwo')}</option>
    </select>
  </div>
  <div class="fs11 ink3 mb8">${t('jobs.available',{count:offers.length})}</div>
  <div class="offer-grid">${visible.map(o=>`<div class="offer-card" style="opacity:${o.eligible?1:0.7}">
    <img src="${o.countryId===store.G.countryId?getTeamLogoData(o.clubId):getTeamLogoData({id:o.clubIndex,name:o.clubName})}" alt="${o.clubName}" class="club-logo">
    <div>
      <div class="b7">${o.clubName}</div>
      <div class="offer-card-meta">${t(`country.${o.countryId}`)} / ${t(o.league===1?'league.divisionOne':'league.divisionTwo')} / OVR ${o.ovr} / ${t('jobs.budget')} ${formatCurrency(o.budget||0)}</div>
      <div class="fs10 ink3">${t('jobs.requiredPrestige')}: <b>${o.prestigeNeed}</b>${o.lastPosition?` / ${t('jobs.lastPosition')}: #${o.lastPosition}`:''}${o.recentTitles?` / ${t('jobs.recentTitles')}: ${o.recentTitles}`:''}</div>
      <div style="font-size:10px;color:${o.eligible?'var(--ink3)':'var(--r)'}">${t(o.noteKey||(o.eligible?(o.league===1?'jobs.noteTop':'jobs.noteRebuild'):'jobs.noteLocked'),{country:t(`country.${o.countryId}`),prestige:o.prestigeNeed})}</div>
    </div>
    <button class="btn ${o.eligible?'pr':'sm'}" ${o.eligible?'':'disabled'} onclick="acceptClubOffer('${o.clubId}')">${t(o.eligible?'jobs.target':'jobs.tooLow').toUpperCase()}</button>
  </div>`).join('')}</div>`;
}
function refreshClubOfferPicker(){
  const el=document.getElementById('club-offer-picker');
  if(el)el.innerHTML=buildClubOfferPickerHtml();
}
function openClubOfferPicker(){
  const modal=document.getElementById('modal');modal.className='modal modal-xl';
  modal.innerHTML=`<div class="mt2">${t('jobs.title').toUpperCase()} <button class="close-btn" onclick="closeModal()">✕</button></div><div id="club-offer-picker">${buildClubOfferPickerHtml(36)}</div>`;
  openModal();
}
function acceptClubOffer(clubId){
  const offer=(store.G.clubOffers||[]).find(o=>String(o.clubId)===String(clubId));if(!offer)return;
  if(!offer.eligible){toast(t('jobs.needPrestige',{prestige:offer.prestigeNeed,club:offer.clubName}));return;}
  const sameCountry=offer.countryId===(store.G.countryId||'PL');
  if(!sameCountry){
    const snapshot={
      season:store.G.season,
      managerPrestige:store.G.managerPrestige||0,
      managerHistory:[...(store.G.managerHistory||[])],
      coachHistory:[...(store.G.coachHistory||[])],
      seasonHistory:[...(store.G.seasonHistory||[])],
      records:{...(store.G.records||{})},
    };
    newGame(offer.clubIndex,offer.countryId);
    store.G.season=snapshot.season;
    store.G.matchday=0;
    store.G.phase='preseason';
    store.G.managerPrestige=snapshot.managerPrestige;
    store.G.managerHistory=snapshot.managerHistory;
    store.G.coachHistory=snapshot.coachHistory;
    store.G.seasonHistory=snapshot.seasonHistory;
    store.G.records=snapshot.records;
    store.G.clubOffers=[];
    pushNews('news.managerMovesCountry','hot',{club:offer.clubName,country:t(`country.${offer.countryId}`),season:store.G.season});
    closeModal();render();updateHeader();toast(t('jobs.newClub',{club:`${offer.clubName} / ${t(`country.${offer.countryId}`)}`}));persistGame();
    return;
  }
  const oldTeam=myTeam();
  const next=store.G.teams.find(t=>t.id===offer.clubIndex||t.id===clubId);if(!next)return;
  // Infrastructure belongs to the CLUB, not the manager: leave what was built at
  // the old club and inherit the new club's levels (same as the newGame path).
  syncMyTeamInfra();
  oldTeam.isPlayer=false;
  next.isPlayer=true;
  store.G.myTeamId=next.id;
  store.G.infraHall=next.infraHall||0;
  store.G.infraMed=next.infraMed||0;
  store.G.infraAcademy=next.infraAcademy||0;
  store.G.infraMerchandising=next.infraMerchandising||0;
  store.G.clubOffers=[];
  // The transfer shelf is built around who the player IS: buildMarket() excludes
  // his own squad. After changing clubs the old shelf described the old manager,
  // so the new club's own players sat on it — offered for transfer to themselves.
  buildMarket();
  pushNews('news.managerMoves','hot',{club:next.name,season:store.G.season+1});
  closeModal();render();updateHeader();toast(t('jobs.newClub',{club:next.name}));persistGame();
}
function showPostSeasonGala(payload){
  return new Promise(resolve=>{
    const modal=document.getElementById('modal');modal.className='modal modal-lg';
    const branding=getTeamBranding(myTeam());
    const awardRows=(payload.awards||[]).length?(payload.awards||[]).map(a=>`<div class="award-card"><div><b>${a.type?t(`award.${a.type}`):a.label}</b><div class="fs10 ink3">${a.player}${a.club?` (${a.club})`:''}</div></div><div class="history-badge">S${store.G.season}</div></div>`).join(''):`<div class="fs12 ink3">${t('gala.noAwards')}</div>`;
    const offerRows=(payload.clubOffers||[]).length?`<div class="card mt-12"><div class="ct">${t('jobs.title').toUpperCase()}</div><div id="club-offer-picker">${buildClubOfferPickerHtml(18)}</div><div class="fs10 ink3 mt-8">${t('gala.jobHint')}</div></div>`:'';
    modal.innerHTML=`<div class="mt2">${t('gala.title',{season:store.G.season}).toUpperCase()} <button class="close-btn" onclick="window._galaResolved=true;closeModal()">✕</button></div>
    <div class="gala-hero">
      <img src="${getTeamLogoData(myTeam())}" alt="${myTeam().name}" class="club-logo lg">
      <div>
        <div class="gala-kicker">${branding.nickname} / ${branding.motto}</div>
        <div class="gala-title">${myTeam().name}</div>
        <div class="gala-sub">${payload.summaryKey?t(payload.summaryKey):(payload.summary||t('gala.defaultSummary'))}</div>
      </div>
      <div class="gala-pill">#${payload.position}</div>
    </div>
    <div class="g2">
      <div>
        <div class="card"><div class="ct">${t('gala.seasonSummary').toUpperCase()}</div>
          <div class="g3 gp8">
            <div class="sb pd10"><div class="l">${t('gala.club')}</div><div class="v fs20">${myTeam().name}</div></div>
            <div class="sb pd10"><div class="l">${t('gala.position')}</div><div class="v gold fs20">#${payload.position}</div></div>
            <div class="sb pd10"><div class="l">${t('gala.managerPrestige')}</div><div class="v gold fs20">${store.G.managerPrestige||0}</div></div>
          </div>
          <div class="mt-10 fs12 ink2">${t('gala.explain')}</div>
        </div>
        ${offerRows}
      </div>
      <div>
        <div class="card"><div class="ct">${t('gala.awards').toUpperCase()}</div><div class="award-grid">${awardRows}</div></div>
      </div>
    </div>
    <div class="btn-row mt-14"><button class="btn go" onclick="window._galaResolved=true;closeModal()">${t('gala.stay').toUpperCase()}</button></div>`;
    openModal();
    window._galaResolved=false;
    const tick=()=>{ if(window._galaResolved){ window._galaResolved=false; resolve(); } else { setTimeout(tick,120); } };
    tick();
  });
}
function seasonFormImpact(p){
  ensurePlayerMeta(p);
  return clamp((p.seasonForm||0)+Math.round(((p.morale||50)-50)/10)-Math.round((p.fatigue||0)/10),-16,16);
}
function seasonFormLabel(val){
  const v=typeof val==='number'?val:seasonFormImpact(val);
  if(v>=8)return t('form.hot');
  if(v>=3)return t('form.good');
  if(v<=-8)return t('form.deepSlump');
  if(v<=-3)return t('form.slump');
  return t('form.stable');
}
// Removed dead pre-point-sim odds path (duelWinProbability, matchupProfileSwing) —
// live matches use simulateRallyPoint / simIndividual only (2026-07 cleanup).
function styleLabel(id){return t(`style.${id}`)||id||'?';}
function describePlayerIdentity(p){
  const order=[...SK].sort((a,b)=>(p[b]||0)-(p[a]||0));
  const top=order[0], second=order[1], low=order[order.length-1];
  const names={fh:t('stat.fh'),bh:t('stat.bh'),srv:t('stat.srv'),ret:t('stat.ret'),foot:t('stat.foot'),men:t('stat.men')};
  const archetype=(PLAYER_STYLE_INFO[p.playStyle]||{}).archetype||'uniwersalny gracz';
  return{
    topStat:top,
    weakStat:low,
    label:archetype,
    note:t('player.identityNote',{top:names[top],second:second?` + ${names[second]}`:'',weak:names[low]})
  };
}
function getStyleEdge(homeStyle,awayStyle){
  // Extra nudge on top of engine mults. Tuned so equal-stat counters land
  // ~57–65% and a large OVR gap still usually beats a style underdog.
  const delta=((STYLE_EDGE[homeStyle]||{})[awayStyle]||0)*0.65;
  return{delta,label:delta>0?t('vme.styleAdvantage',{style:styleLabel(homeStyle),opponent:styleLabel(awayStyle)}):delta<0?t('vme.styleCounter',{style:styleLabel(awayStyle),opponent:styleLabel(homeStyle)}):t('vme.styleNeutral')};
}
// Team psychologist: morale floor + clutch MEN boost (staff impact goal batch).
function getTeamPsychologist(teamId){
  if(teamId===null||teamId===undefined||!store.G)return null;
  return store.G.staff.find(s=>s.teamId===teamId&&s.type==='psychologist'&&!s._healthVacation)||null;
}
function psychMatchBoost(teamId){
  const psy=getTeamPsychologist(teamId);
  if(!psy)return{morale:0,clutch:0,men:0};
  // Concave-ish: OVR 50 → modest, 85 → strong but not free win.
  const q=clamp(staffOvr(psy)/100,0.2,0.99);
  const pressure=(psy.pressure||50)/100;
  const mental=(psy.mentalTraining||50)/100;
  const moraleB=(psy.moraleBoost||50)/100;
  return{
    morale:Math.round(2+moraleB*8*q),          // +2..~10 morale contribution at season ticks
    clutch:0.06+pressure*0.14*q,              // +6–20% clutch mult strength
    men:1.5+mental*6*q,                       // +1.5..~7.5 MEN in point profile
  };
}
function getTeamPhysio(teamId){
  if(teamId===null||teamId===undefined||!store.G)return null;
  return store.G.staff.find(s=>s.teamId===teamId&&s.type==='physio'&&!s._healthVacation)||null;
}
function physioFatigueMult(teamId){
  const phy=getTeamPhysio(teamId);
  if(!phy)return 1;
  const q=clamp(staffOvr(phy)/100,0.2,0.99);
  const rec=(phy.recovery||50)/100;
  // Better physio → less fatigue gained from play, more rest recovery.
  return clamp(1-(0.08+rec*0.22*q),0.7,1);
}
function physioRestBonus(teamId){
  const phy=getTeamPhysio(teamId);
  if(!phy)return 0;
  const q=clamp(staffOvr(phy)/100,0.2,0.99);
  return Math.round(2+((phy.recovery||50)/100)*10*q); // +2..~12 extra rest
}
function playerMarketValue(p){
  ensurePlayerMeta(p);
  const ageCurve=p.age<24?1.18:p.age<=28?1.08:p.age<=32?1:0.86;
  const formCurve=1+seasonFormImpact(p)/40;
  const traitCurve=p.traits?.includes('WUNDERKIND')?1.18:p.traits?.includes('VETERAN')?0.94:1;
  return Math.max(0,Math.round(ovrBase(p)*240*ageCurve*formCurve*traitCurve));
}
function rollWeightedPeak(baseFloor,baseCeil,quality){
  const q=clamp(quality||0,0,1);
  // Owner 2026-07-02: halved diamond/gem odds — a top scout returned a near-max
  // peak ~15% of the time and ≥gem ~30%; wonderkids should be half as common.
  const diamondChance=0.008+q*0.065;
  const gemChance=0.04+q*0.12;
  const solidChance=0.28+q*0.28;
  const r=Math.random();
  if(r<diamondChance)return clamp(baseCeil-rnd(0,2),58,97);
  if(r<gemChance)return clamp(baseFloor+Math.round((baseCeil-baseFloor)*0.78)+rnd(-2,2),58,97);
  if(r<solidChance)return clamp(baseFloor+Math.round((baseCeil-baseFloor)*0.58)+rnd(-3,3),58,97);
  return clamp(baseFloor+Math.round((baseCeil-baseFloor)*(0.18+Math.random()*0.34))+rnd(-2,2),58,97);
}
function roleGuaranteeLabel(role){
  return t(role==='starter'?'role.starter':role==='rotation'?'role.rotation':'role.prospect');
}
function getContractProfile(p){
  ensurePlayerMeta(p);
  const age=p.age||24;
  const loyalty=p.loyalty||0;
  const form=seasonFormImpact(p);
  const expectedRole=p.preferredRole||'starter';
  let agentType='balanced';
  if(age<=21||p.traits?.includes('WUNDERKIND'))agentType='ambitiousTalent';
  else if(loyalty>=7&&p.teamId===store.G?.myTeamId)agentType='loyalist';
  else if(form>=6||ovrBase(p)>=78)agentType='contractStar';
  else if(age>=31||p.traits?.includes('VETERAN'))agentType='securityVeteran';
  const roleWeight=expectedRole==='starter'?3:expectedRole==='rotation'?1:0;
  const wageWeight=agentType==='contractStar'?3:agentType==='loyalist'?1:2;
  const securityWeight=agentType==='securityVeteran'?3:age<=22?1:2;
  const loyaltyDiscount=agentType==='loyalist'?0.08:0;
  return{
    agentType,
    expectedRole,
    wageWeight,
    roleWeight,
    securityWeight,
    loyaltyDiscount,
    summaryKey:`neg.agentSummary.${agentType==='balanced'?'securityVeteran':agentType}`,
  };
}
function contractExpect(p,targetTeamId=store.G?.myTeamId,marketContext=null){
  ensurePlayerMeta(p);
  if(targetTeamId&&expectsStarterRole(p,targetTeamId))p.preferredRole='starter';
  const profile=getContractProfile(p);
  const o=ovrBase(p);
  const form=seasonFormImpact(p);
  const targetLeague=getPlayerTargetLeague(targetTeamId);
  const leagueAvgOvr=typeof marketContext?.leagueAvgOvr==='number'
    ?marketContext.leagueAvgOvr
    :calcLeagueAvgOvr(targetLeague);
  const prestigeDiff=Math.max(0,o-leagueAvgOvr);
  const loyaltyMod=(p.loyalty>=7?0.88:p.loyalty>=4?0.95:1.05)-profile.loyaltyDiscount;
  const ageMod=p.age<22?1.06:p.age<=29?1:p.age<=33?0.93:0.86;
  const roleMod=p.preferredRole==='starter'?1.06:p.preferredRole==='rotation'?1:0.95;
  // Base wage comes from the SAME curve as initial generation (no renewal shock).
  // Situational modifiers only nudge it; the elite premium is already in the curve.
  let salary=Math.max(1000,Math.round(playerWageForOvr(o)*loyaltyMod*ageMod*(1+form/70)*roleMod));
  const prestigeTax=prestigeDiff>0?1+(Math.pow(prestigeDiff,1.5)/12):1;
  salary=Math.round(salary*prestigeTax);
  const years=p.age<24?3:p.age<29?2+(p.loyalty>=6?1:0):p.age<33?2:1;
  const signingBonus=Math.max(0,Math.round(salary*(p.teamId===store.G?.myTeamId?0.20:0.35)*(1+Math.max(0,form)/30)));
  return{
    salary,
    years:clamp(years,1,4),
    signingBonus,
    role:p.preferredRole||'starter',
    profile,
    interestKey:p.teamId===store.G?.myTeamId?'neg.interest.renewal':(form>=5?'neg.interest.hot':form<=-4?'neg.interest.bargain':'neg.interest.normal'),
    marketValue:playerMarketValue(p),
    leagueAvgOvr,
    prestigeDiff,
    prestigeTax:Number(prestigeTax.toFixed(2)),
  };
}
function negResponse(p,sal,yrs,bonus,roleGuarantee,targetTeamId=store.G?.myTeamId){
  const exp=contractExpect(p,targetTeamId);let sc=0;
  const diffCfg=getDifficultyConfig();
  const profile=exp.profile||getContractProfile(p);
  const targetLeague=getPlayerTargetLeague(targetTeamId);
  const ambitionBlocked=(p.traits?.includes('AMBITNY')&&((exp.prestigeDiff||0)>4||(targetLeague===2&&ovrBase(p)>75)));
  if(ambitionBlocked){
    return{mood:-1,score:-99,reasons:['neg.reason.tooAmbitious','neg.reason.topProjects'],profile,hardBlockKey:'neg.hardBlockAmbition'};
  }
  // Signing bonus amortises into effective annual pay: a 10k bonus on a 2-year
  // deal ≈ +5k/year. So a player wanting 35k can accept 30k + a 10k/2yr bonus.
  const bonusRatio=(bonus||0)/Math.max(1,exp.signingBonus||1);
  const effAnnual=sal+((bonus||0)/Math.max(1,yrs));
  const salaryRatio=effAnnual/Math.max(1,exp.salary);
  const guaranteeRatio=((sal*yrs)+(bonus||0))/Math.max(1,(exp.salary*exp.years)+(exp.signingBonus||0));
  if(salaryRatio>=1.15)sc+=4;
  else if(salaryRatio>=1.0)sc+=2;
  else if(salaryRatio>=0.93)sc+=1;
  else if(salaryRatio>=0.85)sc-=2;
  else sc-=5;
  // Top stars also specifically like to see an explicit signing bonus, not just
  // amortised salary; a generous bonus is a small extra sweetener for anyone.
  if(ovrBase(p)>=85&&(exp.signingBonus||0)>0&&bonusRatio<0.5)sc-=2;
  else if(bonusRatio>=1.5)sc+=1;
  if(guaranteeRatio>=1.12)sc+=2;
  else if(guaranteeRatio>=1.0)sc+=1;
  else if(guaranteeRatio<0.9)sc-=2;
  if(yrs>=exp.years)sc+=1;else if(yrs<exp.years-1)sc-=2;else sc-=1;
  const roleScore=(roleGuarantee||'prospect')===exp.role?2:(roleGuarantee==='starter'&&exp.role==='rotation')?1:(roleGuarantee==='rotation'&&exp.role==='prospect')?1:-Math.max(1,profile.roleWeight);
  sc+=roleScore;
  if((p.morale||50)>72)sc+=1;else if((p.morale||50)<32)sc-=1;
  if((p.loyalty||0)>=6&&p.teamId===store.G?.myTeamId)sc+=1;
  if(seasonFormImpact(p)>=8)sc+=1;
  if(p.teamId!==store.G?.myTeamId){
    const clubPull=calcPrestige()+(myLeague()===1?8:0);
    const prestigeGap=Math.max(0,ovrBase(p)-clubPull-12);
    sc-=Math.round((prestigeGap/10)*diffCfg.prestigeBarrier);
  }
  sc+=diffCfg.negotiationBias;
  const reasons=[];
  if(salaryRatio<0.9)reasons.push('neg.reason.lowSalary');
  else if(salaryRatio>=1.05)reasons.push('neg.reason.strongSalary');
  if(guaranteeRatio<0.92)reasons.push('neg.reason.lowGuarantee');
  else if(guaranteeRatio>=1.05)reasons.push('neg.reason.goodPackage');
  if(roleScore<0)reasons.push('neg.reason.badRole');
  else if(roleScore>0)reasons.push('neg.reason.goodRole');
  if(yrs<exp.years)reasons.push('neg.reason.shortSecurity');
  if(p.teamId!==store.G?.myTeamId&&diffCfg.prestigeBarrier>0.7&&ovrBase(p)>calcPrestige()+18)reasons.push('neg.reason.lowPrestige');
  const mood=sc>=4?1:sc>=1?0:-1;
  return{mood,score:sc,reasons,profile};
}
// Staff version of negResponse — same shape (salary/bonus/package/years), so the
// hire modal can show the SAME live acceptance indicator players have.
function staffNegResponse(s,sal,bonus,yrs){
  const expSal=staffWageForOvr(staffOvr(s));
  const expBonus=Math.max(1,Math.round(expSal*0.2));
  const expYears=2;
  let sc=0;
  // Bonus amortises into effective annual pay (same model as players).
  const effAnnual=(sal||0)+((bonus||0)/Math.max(1,yrs||1));
  const salaryRatio=effAnnual/Math.max(1,expSal);
  const bonusRatio=(bonus||0)/expBonus;
  const guaranteeRatio=((sal||0)*(yrs||1)+(bonus||0))/Math.max(1,expSal*expYears+expBonus);
  if(salaryRatio>=1.15)sc+=4;else if(salaryRatio>=1.0)sc+=2;else if(salaryRatio>=0.92)sc+=1;else if(salaryRatio>=0.82)sc-=2;else sc-=5;
  if(bonusRatio>=1.5)sc+=1;
  if(guaranteeRatio>=1.12)sc+=2;else if(guaranteeRatio>=1.0)sc+=1;else if(guaranteeRatio<0.85)sc-=3;
  if((yrs||2)>=expYears)sc+=1;else sc-=1;
  const reasons=[];
  if(salaryRatio<0.9)reasons.push('neg.reason.lowSalary');else if(salaryRatio>=1.05)reasons.push('neg.reason.strongSalary');
  if(bonusRatio>=1.3)reasons.push('neg.reason.largeBonus');
  if(guaranteeRatio<0.9)reasons.push('neg.reason.lowGuarantee');else if(guaranteeRatio>=1.1)reasons.push('neg.reason.goodPackage');
  const mood=sc>=4?1:sc>=0?0:-1;
  return{mood,score:sc,reasons};
}
function getNextSeasonCommitments(){
  if(!store.G)return{playerWages:0,staffWages:0,bonuses:0,entries:[],total:0};
  const entries=[];
  let playerWages=0,staffWages=0,bonuses=0;
  (store.G.preSignedPlayers||[]).forEach(ps=>{
    const p=store.G.players.find(x=>x.id===ps.playerId);
    if(!p||ps.destinationTeamId!==store.G.myTeamId)return;
    playerWages+=ps.salary||0;
    bonuses+=ps.bonus||0;
    entries.push({kind:'player',name:p.name,labelKey:'budget.commitmentPlayer',salary:ps.salary||0,bonus:ps.bonus||0,years:ps.years||0,role:ps.promisedRole||p.preferredRole||'starter'});
  });
  (store.G.pendingStaffSignings||[]).forEach(ps=>{
    if(ps.destinationTeamId!==store.G.myTeamId)return;
    const s=store.G.staff.find(x=>x.id===ps.staffId)
      || store.G.staffPool.find(x=>x.id===ps.staffId)
      || (store.G.scoutPool||[]).find(x=>x.id===ps.staffId)
      || (store.G.prDirectorPool||[]).find(x=>x.id===ps.staffId)
      || getRivalPRDirectors().find(x=>x.id===ps.staffId);
    if(!s)return;
    staffWages+=s.salary||0;
    entries.push({kind:'staff',name:s.name,labelKey:s.type==='pr'?'budget.commitmentPr':'budget.commitmentStaff',salary:s.salary||0,bonus:0,years:ps.years||0,role:s.type});
  });
  return{playerWages,staffWages,bonuses,entries,total:playerWages+staffWages+bonuses};
}
function awardLabel(award){
  if(!award)return'';
  if(award.type){
    const key=`award.${award.type}`;
    const translated=t(key);
    if(translated!==key)return translated;
  }
  return award.displayLabel||award.label||'';
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// GENERATION
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function genPlayer(teamId,forceAge,countryId=null){
  const id=ui._pid++;const age=forceAge!==undefined?forceAge:16+rnd(0,17);const peakAge=peakAgeFor(countryId);
  const playerCountryId=countryId||store.G?.countryId||'PL';
  const traitPool=Object.keys(TRAITS).filter(t=>{
    if(t==='WUNDERKIND'&&age>22)return false;
    if(t==='VETERAN'&&age<30)return false;
    if(t==='MENTOR'&&age<28)return false;
    if(t==='AMBITNY'&&age<20)return false;
    return true;
  }).sort(()=>Math.random()-.5);
  // Slightly more traits so the expanded catalog is visible on squads.
  const tc=Math.random()<.18?0:Math.random()<.5?1:Math.random()<.75?2:3;
  const traits=[];for(let i=0;i<Math.min(tc,traitPool.length);i++)traits.push(traitPool[i]);
  const ar=Math.max(0,1-Math.abs(age-peakAge)/14);
  const base=38+Math.floor(ar*36)+rnd(0,14);
  const stats={};SK.forEach(s=>{stats[s]=Math.min(getMax({traits},s),Math.max(15,base-10+rnd(0,20)));});
  const primeStat=pick(SK);
  const weakStat=pick(SK.filter(s=>s!==primeStat));
  stats[primeStat]=Math.min(getMax({traits},primeStat),stats[primeStat]+rnd(5,12));
  stats[weakStat]=Math.max(15,stats[weakStat]-rnd(3,9));
  if(traits.includes('VETERAN'))stats.men=Math.min(96,stats.men+12);
  const traitEnf=(tr,stat,others)=>{if(traits.includes(tr)){const mx=Math.max(...others.map(x=>stats[x]))+5+rnd(0,7);stats[stat]=Math.min(getMax({traits},stat),Math.max(stats[stat],mx));}};
  traitEnf('IRON_ATTACK','fh',['bh','srv','ret','foot','men']);traitEnf('IRON_DEFENSE','bh',['fh','srv','ret','foot','men']);
  traitEnf('SERVE_MASTER','srv',['fh','bh','ret','foot','men']);traitEnf('AGGR_SERVE','srv',['fh','bh','ret','foot','men']);
  traitEnf('STEEL_NERVES','men',['fh','bh','srv','ret','foot']);
  const stamina=derivePlayerStamina({age,men:stats.men,traits});
  const baseOvr=ovrFromStats(stats);
  const sal=Math.round(playerWageForOvr(baseOvr)*(0.92+Math.random()*0.1));
  const domStat=SK.reduce((a,b)=>stats[b]>stats[a]?b:a,SK[0]);
  const styleMap={fh:'FH_LOOPER',bh:'TWO_SIDED',srv:'TWO_SIDED',ret:'BLOCKER',foot:'FISHER',men:'DEFENDER'};
  let playStyle=styleMap[domStat]||'TWO_SIDED';
  if(Math.random()<0.3)playStyle=PLAYER_STYLES[rnd(0,PLAYER_STYLES.length-1)];
  if(traits.includes('IRON_ATTACK'))playStyle='FH_LOOPER';
  if(traits.includes('AGGR_SERVE'))playStyle='TWO_SIDED';
  if(traits.includes('IRON_DEFENSE')||traits.includes('VETERAN'))playStyle='DEFENDER';
  if(traits.includes('TACTICIAN'))playStyle='BLOCKER';
  const identity=describePlayerIdentity({...stats,playStyle});
  return ensurePlayerMeta({id,teamId,name:randNameForCountry(playerCountryId,age),age,peakAge,traits,playStyle,...stats,
    contractYears:1+rnd(0,2),salary:sal,loyalty:rnd(0,3),role:'starter',retired:false,
    careerW:0,careerL:0,careerOvr:0,careerPts:0,careerSeasons:0,
    seasonW:0,seasonL:0,seasonD:0,injuredFor:0,fatigue:0,stamina,ceiling:0,morale:50+rnd(0,20),awards:[],
    seasonForm:rnd(-6,6),preferredRole:Math.random()<0.6?'starter':'rotation',
    profileTag:identity.label,signatureNote:identity.note,
    clubHistory:teamId!==null?[teamId]:[],
    nationality:playerCountryId});
}

// Which academy LEVEL produces this junior? The owner team's academy \u2014 NOT always
// the player's. (Old bug: read store.G.infraAcademy for every team, so AI juniors
// were always graded by the PLAYER's academy level.)
function academyLevelFor(ownerTeamId){
  if(!store.G)return 0;
  if(ownerTeamId===store.G.myTeamId)return store.G.infraAcademy||0;
  const t=ownerTeamId!=null?store.G.teams.find(x=>x.id===ownerTeamId):null;
  return t?(t.infraAcademy||0):(store.G.infraAcademy||0);
}
function genYouthPlayer(ownerTeamId=null,countryId=null){
  // A junior's quality is driven by the producing academy's LEVEL: the intake OVR
  // band, the peak/ceiling band and a development bonus all scale with it (owner-
  // agreed). Level sets QUALITY; throughput (1-2/season) is fixed elsewhere.
  const academyLv=clamp(academyLevelFor(ownerTeamId),1,INFRA_ACADEMY.length-1);
  const cfg=INFRA_ACADEMY[academyLv];
  const diffCfg=getDifficultyConfig();
  const playerPipeline=store.G&&ownerTeamId===store.G.myTeamId;
  const playerPotentialMult=playerPipeline?diffCfg.playerAcademyPotential:1;
  const youthCountryId=countryId||store.G?.countryId||'PL';
  const p=genPlayer(null,16+rnd(0,3),youthCountryId);
  const region=pick(POLISH_REGIONS);
  const readinessRoll=['raw','quick','polished','instant'][clamp(academyLv-1+rnd(0,1),0,3)];
  // Wunderkind chance grows with academy level. (Owner 2026-07-02: halved — top
  // academies minted wonderkids ~35% of the time; a wonderkid should be rare.)
  if(Math.random()<(0.06+cfg.devBonus*0.3+academyLv*0.01)*playerPotentialMult)p.traits.push('WUNDERKIND');
  const isWunder=p.traits.includes('WUNDERKIND');
  // Starting stats sit in the level's intake OVR band.
  const startOvr=rnd(cfg.ovrLo,cfg.ovrHi);
  SK.forEach(s=>{p[s]=clamp(startOvr+rnd(-6,6),12,getMax(p,s));});
  // Peak/ceiling sits in the level's band, lifted by potential & wonderkid status.
  // Min-of-two draw skews peaks toward the band's lower half — top-of-band peaks
  // stay possible but stop being routine (owner 2026-07-02).
  let ceiling=Math.round(Math.min(rnd(cfg.ceilLo,cfg.ceilHi),rnd(cfg.ceilLo,cfg.ceilHi))*playerPotentialMult)+(isWunder?rnd(4,7):0);
  ceiling=clamp(ceiling,ovrBase(p)+8,96);
  // RARE GEM (owner): even the weakest academy can occasionally unearth a talent far
  // above its band — the dream that keeps a youth-only club alive. The chance GROWS
  // with academy level (~2% at L1 → ~6% at L5, halved 2026-07-02), never zero.
  const gemChance=clamp(0.015+academyLv*0.009,0.015,0.065)*playerPotentialMult;
  const isGem=Math.random()<gemChance;
  if(isGem){
    ceiling=clamp(ceiling+rnd(15,25),ceiling,96);
    if(!p.traits.includes('WUNDERKIND'))p.traits.push('WUNDERKIND');
  }
  // Mental/technical-led players peak late (28-31); physical archetypes a touch earlier.
  p.peakAge=peakAgeFor(youthCountryId);
  // ~10% of juniors never reach their peak (poor luck / playing time): they plateau
  // a few OVR short of the ceiling. A gem is the payoff — it never busts.
  p.willPlateau=!isGem&&Math.random()<0.10;
  // Junior wage INCLUDES training cost (owner decision): small, scales with potential
  // and academy level. Band ~ \u20ac500-1500/yr.
  p.salary=clamp(Math.round(300+(ceiling-50)*22+academyLv*60),500,1500);
  // The academy deal has to reach the graduation gate at 21. A flat 3 years
  // signed at 16 ran out at 19, so most juniors never finished the academy at
  // all — they simply vanished on their 21st birthday, at every club including
  // the player's. The term now covers the academy plus one senior season, which
  // is when the ordinary "last year of contract" decision takes over.
  p.contractYears=Math.max(3,22-p.age);
  p.isYouth=true; // in academy until age 21
  p.role='youth';
  p.preferredRole='starter';
  p.seasonForm=rnd(-3,5);
  p.ceiling=ceiling;
  p.academyProfile={
    region,
    source:'academy',
    readiness:readinessRoll,
    academyLevel:academyLv,
    ceiling,
    note:`Profil ${p.playStyle.toLowerCase()} / region ${region}`,
  };
  return p;
}
// One season's academy intake: 1-2 juniors (owner: throughput is fixed; LEVEL
// drives quality, not quantity). The producing academy's level shapes each junior.
function genAcademyIntake(teamId,countryId){
  const n=1+(Math.random()<0.5?1:0);
  return Array.from({length:n},()=>genYouthPlayer(teamId,countryId));
}
function academyReadinessLabel(value){
  const legacy={
    'surowy projekt':'raw','do szybkiego szlifowania':'quick',
    'prawie gotowy':'polished','błyskawiczny talent':'instant',
    'obserwacja terenowa':'field','projekt':'raw',
  };
  const id=legacy[value]||value||'raw';
  return t(`academy.readiness.${id}`);
}
function academyProfileNote(p){
  const profile=p.academyProfile||{};
  return t(profile.source==='scout'?'academy.scoutProfile':'academy.intakeProfile',{
    style:styleLabel(p.playStyle),region:profile.region||t('academy.clubRegion'),
  });
}
function myYouth(){return store.G.players.filter(p=>p.teamId===myTeam().id&&!p.retired&&p.role==='youth');}
function promoteYouth(pid){
  const p=store.G.players.find(x=>x.id===pid);if(!p)return;
  p.role='reserve';p.isYouth=false;
  toast(t('season.academyPromoted',{name:p.name}));
  render();updateHeader();persistGame();
}

// v15: Progressive staff salary (OVR30=1.2k, OVR75=9k, OVR95=18k)
// ── Wages (EUR, realistic scale — see DESIGN-economy.md) ──────────────────────
// Convex curves: top OVR costs disproportionately more, so 4 superstars is
// financially impractical. The SAME player curve feeds both initial generation and
// contract renewals, so there is no artificial "renew = 2-3x" shock (only a real
// rise when a player actually improves). Staff ceiling is far lower than players.
function playerWageForOvr(ovr){
  // Piecewise: 13.5%/OVR up to 80, then 10%/OVR (owner 2026-07-02: the flat 13.5%
  // made 87→90 cost ~+€53k/yr — top talent should be pricey, not absurd). Still
  // convex end-to-end (each +10 OVR ≥2.5×).
  const o=ovr||0;
  const base=2000*Math.pow(1.135,Math.min(o,80)-55);
  const top=o>80?Math.pow(1.10,o-80):1;
  return clamp(Math.round(base*top),1000,400000);
}
function staffWageForOvr(ovr){
  return clamp(Math.round(1500*Math.pow(1.075,(ovr||0)-45)),1000,60000);
}
function staffSalary(ovr){return staffWageForOvr(ovr);}
// v14: Staff bonus also exponential with OVR
function staffEffectiveBonus(s){
  const o=staffOvr(s);
  return Math.pow(o/100,2.0); // exponential multiplier 0..1
}
function genStaff(type,countryId=null){
  const id=ui._pid++;
  // Owner 2026-07-02: staff OVR must vary WIDELY. Quality is a continuous skewed
  // roll (lots of journeymen, a real tail of elites) instead of 3 tight bands.
  const q=Math.pow(Math.random(),1.35);          // 0..1, skewed toward low
  const level=q>0.72?3:q>0.38?2:1;               // legacy 3-band label kept for UI
  const baseVal=Math.round(20+q*62);             // core quality ~20..82
  const staffAge=28+rnd(0,40);
  const peakAge=45+rnd(0,15); // staff peak age
  const staffCountryId=countryId||store.G?.countryId||'PL';
  let extra={};
  if(type==='coach'){
    const coachTraitPool=[
      {id:'TACTIC_GURU',bonus:'tactics'},
      {id:'YOUTH_DEVELOPER',bonus:'youth'},
      {id:'MORALE_MONSTER',bonus:'morale'},
      {id:'DISCIPLINARIAN',bonus:'discipline'},
    ];
    const styleKeys=Object.keys(COACH_STYLES);
    const styleId=styleKeys[rnd(0,styleKeys.length-1)];
    const style=COACH_STYLES[styleId];
    extra.coachTraits=coachTraitPool.sort(()=>Math.random()-.5).slice(0,Math.random()<0.45?2:1);
    extra.styleId=styleId;extra.styleName=style.label;extra.styleIcon=style.icon;
    extra.styleDesc=style.desc;extra.styleFocus=style.statFocus;extra.styleSynergy=style.synergy;
    extra.tactics=Math.max(10,Math.min(96,baseVal+rnd(-14,18)));
    extra.training=Math.max(10,Math.min(96,baseVal+rnd(-14,18)));
    extra.motivation=Math.max(10,Math.min(96,baseVal+rnd(-16,20)));
    extra.synergy=Math.max(15,Math.min(96,baseVal+rnd(-12,22)));
    extra.intensity=Math.max(10,Math.min(95,20+rnd(0,70)));
  }else if(type==='scout'){
    const sp=SCOUT_SPECIALTIES[rnd(0,SCOUT_SPECIALTIES.length-1)];
    extra.specialty=sp.id;extra.specialtyLabel=sp.label;extra.qualityBonus=sp.qualityBonus;
    extra.accuracy=Math.max(15,Math.min(96,baseVal+rnd(-12,18)));
    extra.network=Math.max(10,Math.min(96,baseVal+rnd(-16,20)));
  }else if(type==='physio'){
    const pq=Math.round(6+q*46); // physio scale ~6..52
    extra.injReduction=Math.max(5,Math.min(60,pq+rnd(-4,8)));
    extra.recovery=Math.max(5,Math.min(60,pq+rnd(-6,10)));
    extra.prevention=Math.max(5,Math.min(50,Math.round(pq*0.85)+rnd(-4,8)));
  }else if(type==='psychologist'){
    const gq=Math.round(10+q*62); // psych scale ~10..72
    extra.moraleBoost=Math.max(10,Math.min(85,gq+rnd(-8,12)));
    extra.mentalTraining=Math.max(10,Math.min(85,gq+rnd(-8,10)));
    extra.pressure=Math.max(10,Math.min(85,gq+rnd(-10,14)));
  }
  const sOvr=staffOvr({type,...extra});
  const sal=type==='scout'?Math.round(staffSalary(sOvr)*1.18):staffSalary(sOvr);
  return ensureStaffMeta({id,type,name:randNameForCountry(staffCountryId,staffAge),level,age:staffAge,peakAge,contractYears:1+rnd(0,2),salary:sal,teamId:null,cost:type==='scout'?Math.max(5000,Math.round(sOvr*sOvr*1.6)):0,nationality:staffCountryId,...extra});
}
// ── Team Principals (Layer 2) ────────────────────────────────────────────────
// Each AI club has a Principal (GM): a staff-like entity with a STRATEGY and a
// competence level, its own lifecycle (generated, ages, retires, sits in a free-
// agent pool after being fired and may be re-hired). The player IS their own
// principal. Strategy effects are intentionally conservative for now (tune later).
const PRINCIPAL_STRATEGIES={
  youth:{fit:['youthOnly','academy','frugal']},
  winnow:{fit:['bigspender','ambitious']},
  frugal:{fit:['frugal','academy','community']},
  gambler:{fit:['bigspender','ambitious']},
  builder:{fit:['youthOnly','academy','community']},
  dealer:{fit:['frugal','bigspender']},
};
function principalStrategyLabel(s){return PRINCIPAL_STRATEGIES[s]?t(`principal.strategy.${s}`):s||'—';}
function genPrincipal(countryId,forceStrategy){
  const cid=countryId||store.G?.countryId||'PL';
  const keys=Object.keys(PRINCIPAL_STRATEGIES);
  const strategy=forceStrategy||keys[rnd(0,keys.length-1)];
  return {id:ui._pid++,kind:'principal',name:randNameForCountry(cid),nationality:cid,
    age:36+rnd(0,22),peakAge:58+rnd(0,8),strategy,competence:clamp(35+rnd(0,55),30,95),
    ambition:pick(['calm','balanced','ambitious']),teamId:null,retired:false,idle:0,careerHistory:[]};
}
// Pick a principal whose strategy fits the club's traits (small chance of a
// contrarian for variety); prefer re-hiring a compatible free agent from the pool.
function pickPrincipalForClub(team){
  const traits=team.traits||[];
  const keys=Object.keys(PRINCIPAL_STRATEGIES);
  const compatible=keys.filter(k=>PRINCIPAL_STRATEGIES[k].fit.some(f=>traits.includes(f)));
  const poolMatch=(store.G.principalPool||[]).filter(p=>!p.retired&&(compatible.length?compatible.includes(p.strategy):true));
  let principal;
  if(poolMatch.length&&Math.random()<0.6){
    principal=poolMatch[rnd(0,poolMatch.length-1)];
    store.G.principalPool=store.G.principalPool.filter(p=>p.id!==principal.id);
  }else{
    const strat=(compatible.length&&Math.random()>0.15)?compatible[rnd(0,compatible.length-1)]:keys[rnd(0,keys.length-1)];
    principal=genPrincipal(store.G?.countryId,strat);
  }
  principal.teamId=team.id;principal.hiredSeason=store.G?.season||1;principal.poorSeasons=0;principal.idle=0;
  return principal;
}
function assignAiPrincipal(team){if(team&&!team.isPlayer)team.principal=pickPrincipalForClub(team);}
// Yearly lifecycle: age, retire, and board fire/replace on underperformance.
function principalLifecycle(){
  store.G.principalPool=store.G.principalPool||[];
  store.G.principalPool=store.G.principalPool.filter(p=>{p.age=(p.age||45)+1;p.idle=(p.idle||0)+1;return p.age<=(p.peakAge||62)+4&&p.idle<4;});
  store.G.teams.filter(t=>!t.isPlayer).forEach(team=>{
    let pr=team.principal;
    if(!pr){assignAiPrincipal(team);return;}
    pr.age=(pr.age||45)+1;
    const L=team.league||1;
    const standings=store.G.teams.filter(t=>t.league===L).sort((a,b)=>(b.pts||0)-(a.pts||0));
    const rank=standings.findIndex(t=>t.id===team.id)+1;
    pr.poorSeasons=(rank>standings.length*0.7)?(pr.poorSeasons||0)+1:0;
    const retire=pr.age>(pr.peakAge||62)+rnd(0,4);
    const fired=pr.poorSeasons>=2&&Math.random()<0.6;
    if(retire||fired){
      pr.teamId=null;
      if(!retire){pr.idle=0;store.G.principalPool.push(pr);}
      team.principal=pickPrincipalForClub(team);
    }
  });
  while(store.G.principalPool.length<6)store.G.principalPool.push(genPrincipal(store.G.countryId));
}
function assignAiStaff(team){
  if(!team||team.isPlayer)return;
  ['coach','physio','psychologist'].forEach(type=>{
    if(type!=='coach'&&team.league===2&&Math.random()<0.25)return;
    const s=genStaff(type,store.G?.countryId||'PL');
    startStaffTenure(s,team.id,store.G?.season||1);
    s.contractYears=1+rnd(0,2);
    store.G.staff.push(s);
  });
  if(Math.random()<0.65){
    const scout=genStaff('scout',store.G?.countryId||'PL');
    startStaffTenure(scout,team.id,store.G?.season||1);
    scout.hired=true;
    scout.contractYears=1+rnd(0,2);
    store.G.staff.push(scout);
  }
  if(team.league===1||Math.random()<0.55){
    team.prDirector=genPRDirector(team.id,store.G?.countryId||'PL');
  }else{
    team.prDirector=null;
  }
}

function genSponsorOffers(prestige){
  const used=new Set(store.G.sponsors.filter(s=>s.active).map(s=>s.name));
  const recentNames=new Set(store.G.sponsors.filter(s=>!s.active&&s.endSeason&&(store.G.season-s.endSeason)<=(s.cooldown||1)).map(s=>s.name));
  const sponsorNames=(COUNTRY_SPONSORS&&COUNTRY_SPONSORS[store.G.countryId])||SNAMES; // country-appropriate brands
  const pool=sponsorNames.filter(n=>!used.has(n)&&!recentNames.has(n)).sort(()=>Math.random()-.5);
  store.G.sponsorOffers=[];const numOffers=Math.min(12,pool.length);
  const leagueMult=myLeague()===1?1:0.6;
  const myL=myLeague();
  const leagueTeams=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>teamOvr(b.id)-teamOvr(a.id));
  const ovrRank=(leagueTeams.findIndex(t=>t.id===store.G.myTeamId)+1)||6;
  const n=leagueTeams.length||12;
  let goalPool;
  if(ovrRank<=Math.ceil(n*0.25))goalPool=['top2','top3','win14','win16','win12'];
  else if(ovrRank<=Math.ceil(n*0.5))goalPool=['top3','top4','win10','win12','win8'];
  else if(ovrRank<=Math.ceil(n*0.75))goalPool=['top4','top6','win6','win8'];
  else goalPool=['top8','win2','win4','win6']; // weakest tier: include a low, real target
  for(let i=0;i<numOffers;i++){
    // Owner: more variety — ~1/3 of sponsors ask for NOTHING (guaranteed money, but
    // smaller), the rest carry a goal scaled to the club's strength. The no-requirement
    // offers are the lifeline that keeps a weak club (e.g. Akademia Orłów) afloat.
    const goal=Math.random()<0.34?'none':goalPool[rnd(0,goalPool.length-1)];
    const diff=goalDiff(goal);
    const variation=[0.9,0.95,1.0,1.05,1.1][rnd(0,4)];
    const raw=(22000+prestige*1300)*Math.pow(diff,0.88)*leagueMult*1.45*variation;
    const rewardCap=myLeague()===1?145000:48000;
    const reward=Math.min(rewardCap,Math.round(raw/500)*500);
    const hardMin=Math.round(reward*0.65/500)*500;
    const cooldown=diff>=2.0?0:diff>=1.3?1:2;
    const tier=diff>=2.0?'Elite':diff>=1.4?'Premium':diff>=1.0?'Krajowy':diff>=0.7?'Regionalny':'Lokalny';
    // How long the sponsor is willing to commit (the player picks 1..maxYears at
    // signing). Bigger/steadier brands offer longer terms.
    const maxYears=diff>=1.4?3:diff>=0.8?2:pick([1,1,2]);
    store.G.sponsorOffers.push({id:ui._pid++,name:pool[i],goal,reward,originalReward:reward,hardMin,cooldown,tier,maxYears,active:false,pending:true,met:false,failed:false});
  }
}

function genScoutPool(count=SCOUT_POOL_FLOOR){
  const pool=[];for(let i=0;i<count;i++){const s=genStaff('scout',store.G?.countryId||'PL');pool.push({...s,hired:false,cost:Math.max(s.cost||0,Math.round((s.salary||0)*(1.2+s.level*0.45)))});}
  return pool;
}
// Owner 2026-07-02: the staff market must stay DEEP — at least 3 candidates per
// club in a league (≥36 total) — and regenerate: pool staff age, the old retire,
// and fresh faces appear every season instead of the same stale handful.
// Owner 2026-07-03: 80 candidates PER PROFESSION for the two-league pyramid.
const STAFF_POOL_FLOOR={coach:80,physio:80,psychologist:80};
const SCOUT_POOL_FLOOR=80;
const PR_POOL_FLOOR=80;
function replenishStaffPools(){
  const cid=store.G.countryId||'PL';
  store.G.staffPool=store.G.staffPool||[];
  // Age the market too; veterans withdraw from the job market.
  store.G.staffPool.forEach(s=>{s.age=(s.age||40)+1;});
  store.G.staffPool=store.G.staffPool.filter(s=>(s.age||40)<=70);
  Object.entries(STAFF_POOL_FLOOR).forEach(([type,floor])=>{
    while(store.G.staffPool.filter(s=>s.type===type).length<floor){
      store.G.staffPool.push(genStaff(type,cid));
    }
  });
}
function capFreeAgentProfile(p,maxOvr=85){
  if(!p)return p;
  let current=ovrBase(p);
  let safety=0;
  while(current>maxOvr&&safety<30){
    const stat=SK.reduce((best,key)=>(p[key]||0)>(p[best]||0)?key:best,SK[0]);
    p[stat]=Math.max(15,(p[stat]||15)-rnd(1,3));
    current=ovrBase(p);
    safety++;
  }
  p.salary=Math.max(500,Math.round(((current-28)*115+700)*0.92));
  return p;
}

function buildMarket(){
  store.G.transferMarket=[];
  const myL=myLeague();
  // NOTE: !p.loanedOut everywhere — a player lent out carries the borrower's
  // teamId while still being contractually OURS, so without the guard he showed
  // up as a transfer/pre-sign target for his own club.
  // Free agents (no team or expired contract)
  store.G.players.filter(p=>!p.retired&&!p.loanedOut&&((p.teamId===null)||p.contractYears<=0)&&p.teamId!==store.G.myTeamId).forEach(p=>{store.G.transferMarket.push({playerId:p.id,type:'fa',fee:0});});
  // Transfer-listed players
  const eligibleForTransfer=store.G.players.filter(p=>!p.retired&&!p.loanedOut&&p.teamId!==null&&p.teamId!==store.G.myTeamId&&p.contractYears>0&&Math.random()<.25);
  eligibleForTransfer.forEach(p=>{
    ensurePlayerMeta(p);
    store.G.transferMarket.push({playerId:p.id,type:'transfer',fee:playerMarketValue(p),tier:seasonFormImpact(p)>=5?'hot':seasonFormImpact(p)<=-4?'value':'standard'});
  });
  // v14: Players from other clubs with 1 year left on contract (pre-sign for next season)
  store.G.players.filter(p=>!p.retired&&!p.loanedOut&&p.teamId!==null&&p.teamId!==store.G.myTeamId&&p.contractYears===1&&p.role!=='youth').forEach(p=>{
    if(!store.G.transferMarket.find(m=>m.playerId===p.id)){
      store.G.transferMarket.push({playerId:p.id,type:'presign',fee:0,tier:'presign'});
    }
  });
  // Owner note #10: the borrow-IN direction. AI clubs offer some bench players on
  // a season-long loan — we cover a negotiated share of the wage, they return at
  // season end (same returnLoans path as outgoing loans).
  const loanCandidates=store.G.players.filter(p=>!p.retired&&!p.loanedOut&&p.teamId!==null&&p.teamId!==store.G.myTeamId&&p.role==='reserve'&&p.contractYears>=2&&!p.isYouth&&Math.random()<.18);
  loanCandidates.slice(0,6).forEach(p=>{
    if(!store.G.transferMarket.find(m=>m.playerId===p.id)){
      store.G.transferMarket.push({playerId:p.id,type:'loan',fee:0,share:[0.5,0.6,0.7][rnd(0,2)],tier:'loan'});
    }
  });
}
// Borrow a loan-listed player for one season (owner note #10). wageShare follows
// the loans convention: the fraction the DESTINATION (us) covers.
function doBorrowIn(pid){
  const item=(store.G.transferMarket||[]).find(m=>m.playerId===pid&&m.type==='loan');
  const p=store.G.players.find(x=>x.id===pid);
  if(!item||!p||p.retired||p.teamId===null||p.teamId===store.G.myTeamId){toast(t('loan.stale'));return;}
  const share=clamp(item.share||0.6,0.3,0.9);
  store.G.loans=store.G.loans||[];
  store.G.loans.push({playerId:pid,fromTeamId:p.teamId,toTeamId:store.G.myTeamId,seasons:1,returned:false,originalRole:p.role,wageShare:share});
  const fromName=teamName(p.teamId);
  p.teamId=store.G.myTeamId;
  const starterCount=myStarters().filter(x=>x.id!==p.id).length;
  p.role=starterCount<4?'starter':'reserve';
  store.G.transferMarket=store.G.transferMarket.filter(m=>!(m.playerId===pid&&m.type==='loan'));
  toast(t('loan.borrowed',{name:p.name,club:fromName,percent:Math.round(share*100)}));
  pushNews('news.loanedIn','',{name:p.name,club:fromName});
  render();updateHeader();persistGame();
}
function toggleMarketShortlist(pid){
  store.G.marketShortlist=store.G.marketShortlist||[];
  if(store.G.marketShortlist.includes(pid))store.G.marketShortlist=store.G.marketShortlist.filter(id=>id!==pid);
  else store.G.marketShortlist=[pid,...store.G.marketShortlist.filter(id=>id!==pid)].slice(0,12);
  render();persistGame();
}
function toggleMarketCompare(pid){
  ui.marketCompare=Array.isArray(ui.marketCompare)?ui.marketCompare:[];
  if(ui.marketCompare.includes(pid))ui.marketCompare=ui.marketCompare.filter(id=>id!==pid);
  else ui.marketCompare=[...ui.marketCompare,pid].slice(-2);
  render();
}
function makeSchedule(ids){
  const n=ids.length,sc=[];const arr=[...ids];
  for(let r=0;r<n-1;r++){const round=[];for(let i=0;i<n/2;i++)round.push({home:arr[i],away:arr[n-1-i]});sc.push(round);arr.splice(1,0,arr.pop());}
  const first=[...sc];first.forEach(round=>sc.push(round.map(m=>({home:m.away,away:m.home}))));
  return sc;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// CUP GENERATION (32 slots: 24 league + 8 amateur)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function genCupBracket(){
  const leagueTeams=store.G.teams.map(t=>({id:t.id,name:t.name,isReal:true}));
  const amateurs=TNAMES_AMATEUR.map((n,i)=>({id:'am_'+i,name:n,isReal:false,ovr:25+rnd(0,15)}));
  const all=[...leagueTeams,...amateurs].sort(()=>Math.random()-.5);
  // Build 32-slot bracket (padded if <32)
  while(all.length<32)all.push({id:'bye_'+all.length,name:'BYE',isReal:false,isBye:true});
  // Pair into round of 32
  const r1=[];
  for(let i=0;i<all.length;i+=2)r1.push({home:all[i],away:all[i+1],result:null});
  store.G.cup={rounds:[r1],currentRound:0,finished:false,winner:null};
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// NEW GAME
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// Deterministic PRNG so a new game generates the SAME world every time (provisional
// "default database"): every country always starts with identical teams & players.
function mulberry32Seed(a){a>>>=0;return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
// Region-based career curves (owner research files, 2026-07-03): Asian players
// peak young (21-26) and decline earlier; European careers peak at 27-32.
function peakAgeFor(countryId){
  const band=COUNTRIES[countryId||store.G?.countryId||'PL']?.peakAgeBand||[27,32];
  return band[0]+rnd(0,Math.max(0,band[1]-band[0]));
}
function seedFromString(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function newGame(clubIdx, countryId){
  countryId = countryId || 'PL';
  // Fix the world generation to a per-country seed (restored in finally, so in-game
  // events stay random). This is the provisional default DB.
  const __origRandom=Math.random;
  Math.random=mulberry32Seed(seedFromString('ppm-world-'+countryId));
  try{
  const COUNTRY = COUNTRIES[countryId] || COUNTRIES['PL'];
  // Override name arrays with country-specific ones
  window._FN = COUNTRY.firstNames;
  window._LN = COUNTRY.lastNames;
  ui._pid=0;
  // Create 24 teams: 12 I Liga, 12 II Liga
  const db=window.PPM.customDatabase||null;
  const dbTeams=(db?.teams||[]).filter(t=>t.countryId? t.countryId===countryId : true);
  const dbPlayers=(db?.players||[]).filter(p=>{
    if(p.countryId&&p.countryId!==countryId)return false;
    if(p.nationality&&p.nationality!==countryId)return false;
    return true;
  });
  const useDb=dbTeams.length>=24;
  const allNames=useDb?dbTeams.slice(0,24).map(t=>t.name):[...(COUNTRY.l1Names||TNAMES_L1),...(COUNTRY.l2Names||TNAMES_L2)];
  const budMult = COUNTRY.budgetMult || 1.0;
  const ovrMult = COUNTRY.ovrMult || 1.0;
  // A custom database is user data and loadDatabaseFile() validates almost none of
  // it, so its league split cannot be trusted. The engine is built on two divisions
  // of twelve: makeSchedule() derives the round count from the club count, and
  // promotion/relegation moves clubs between exactly two tiers. A file that puts
  // all 24 clubs in one division produced 46 rounds in the first and NONE in the
  // second — half the fixtures never played, the other division empty, and no
  // error anywhere. Honour the file's split only when it is actually playable.
  const dbSplitUsable=useDb
    &&dbTeams.slice(0,24).filter(t=>t?.league===1).length===12
    &&dbTeams.slice(0,24).filter(t=>t?.league===2).length===12;
  const teams=allNames.map((name,i)=>{
    const source=useDb?dbTeams[i]:null;
    const identity=CLUB_IDENTITIES[name]||null;
    return{
      id:i,name,isPlayer:i===clubIdx,
      league:(dbSplitUsable?source?.league:null)||(i<12?1:2),
      budget:source?.budget??identity?.budget??(i<12?Math.round((250000+i*22000)*budMult):Math.round((60000+Math.max(0,i-12)*8000)*budMult)),
      traits:source?.traits||identity?.traits||[],
      w:0,d:0,l:0,pts:0,gf:0,ga:0,pointsWon:0,pointsLost:0,
      infraHall:source?.infraHall||(identity?.traits?.includes('youthOnly')?1:0),infraMed:source?.infraMed||0,infraAcademy:source?.infraAcademy||(identity?.traits?.includes('youthOnly')?2:0),infraMerchandising:source?.infraMerchandising||0,
    };
  });
  const players=[];
  if(useDb&&dbPlayers.length){
    dbPlayers.forEach(raw=>{
      const teamIndex=typeof raw.teamIndex==='number'?raw.teamIndex:teams.findIndex(t=>t.name===raw.teamName);
      if(teamIndex<0||teamIndex>=teams.length)return;
      const p=genPlayer(teamIndex,raw.age,countryId);
      p.name=raw.name||p.name;
      p.teamId=teamIndex;
      p.role=raw.role||p.role;
      p.playStyle=raw.playStyle||p.playStyle;
      p.nationality=countryId;
      p.contractYears=raw.contractYears??p.contractYears;
      p.salary=raw.salary??p.salary;
      p.loyalty=raw.loyalty??p.loyalty;
      p.peakAge=raw.peakAge??p.peakAge;
      p.traits=Array.isArray(raw.traits)?raw.traits:p.traits;
      p.seasonForm=raw.seasonForm??p.seasonForm;
      SK.forEach(stat=>{if(typeof raw[stat]==='number')p[stat]=raw[stat];});
      players.push(p);
    });
  }
  teams.forEach(t=>{
    const isL2=t.league===2;
    // 4 starters + 6 reserves (owner: deep benches for sparring partners).
    while(players.filter(p=>p.teamId===t.id).length<10){
      const p=genPlayer(t.id,undefined,countryId);
      if(isL2){SK.forEach(s=>{p[s]=Math.max(15,p[s]-rnd(5,12));});}
      if(ovrMult>1.0){SK.forEach(s=>{p[s]=Math.min(getMax(p,s),Math.round(p[s]*ovrMult));});}
      if(players.filter(x=>x.teamId===t.id).length>=4)p.role='reserve';
      p.nationality=countryId;
      players.push(p);
    }
  });
  for(let i=0;i<32;i++){
    const p=genPlayer(null,18+rnd(0,16),countryId);
    p.teamId=null;
    p.contractYears=0;
    p.role='reserve';
    p.preferredRole=Math.random()<0.5?'rotation':'starter';
    p.seasonForm=clamp((p.seasonForm||0)+rnd(-2,5),-8,10);
    if(i<8){
      const bump=3+rnd(0,6);
      SK.forEach(s=>{p[s]=Math.min(getMax(p,s),p[s]+rnd(0,bump));});
      p.salary=Math.round((p.salary||800)*(1.08+bump/20));
      p.signatureNote=(p.signatureNote||'')+' Rynek widzi w nim gotowego gracza do sk\u0142adu.';
    }
    capFreeAgentProfile(p,getDifficultyConfig().freeAgentCap);
    p.nationality=countryId;
    players.push(p);
  }
  const staffPool=[];
  for(let i=0;i<STAFF_POOL_FLOOR.coach;i++)staffPool.push(genStaff('coach',countryId));
  for(let i=0;i<STAFF_POOL_FLOOR.physio;i++)staffPool.push(genStaff('physio',countryId));
  for(let i=0;i<STAFF_POOL_FLOOR.psychologist;i++)staffPool.push(genStaff('psychologist',countryId));
  
  const l1Ids=teams.filter(t=>t.league===1).map(t=>t.id);
  const l2Ids=teams.filter(t=>t.league===2).map(t=>t.id);
  
  store.G={season:1,matchday:0,phase:'preseason',myTeamId:clubIdx,teams,players,
    countryId:countryId,
    aiDifficulty:getCareerDifficultyKey(),
    scheduleL1:makeSchedule(l1Ids),scheduleL2:makeSchedule(l2Ids),
    results:[],seasonHistory:[],playerHistory:{},staffHistory:{},
    managerHistory:[],coachHistory:[],clubOffers:[],
    clubHistory:{},
    marketShortlist:[],
    hallOfFame:[],transferMarket:[],staff:[],staffPool,
    sponsors:[],sponsorOffers:[],scoutMissions:[],scoutResults:[],scoutPool:genScoutPool(SCOUT_POOL_FLOOR),
    gameLog:[],
    equipBrand:null,infraHall:0,infraMed:0,infraAcademy:0,infraMerchandising:0,
    budgetLog:[],cup:null,cupPlayedThisSeason:false,
    academyUsedThisSeason:false,academyProspects:[],_pid:ui._pid,
    inbox:[],matchNomination:null,rubberTier:0,
    techPartnership:null,ticketPrice:50,newsFeed:[],
    loans:[],
    records:{},
    top12MastersDone:{1:false,2:false},
    managerPrestige:0,
    boardObjective:null,
    boardObjectiveOptions:[],
    prDirector:null,
    prDirectorPool:Array.from({length:PR_POOL_FLOOR},()=>finalizePRDirector(genPRDirector(null,countryId))),
    preSignedPlayers:[],
    pendingStaffSignings:[],
    tvRightsBase:clubIdx<12?25000:8000,
    customDatabase:useDb?db:null,
    schemaVersion:(typeof SAVE_SCHEMA_VERSION!=='undefined'?SAVE_SCHEMA_VERSION:19),
    seasonFinance:{season:1,tickets:0,merch:0,prize:0,sponsorIncome:0,tvRights:0,boardReward:0,techPartnership:0,wages:0,playerWages:0,coachWages:0,physioWages:0,psychologistWages:0,scoutWages:0,prDirectorWages:0,maint:0,transfersIn:0,infraCost:0,staffBuyouts:0,prDirectorCost:0,brandCosts:0,other:0},
  };
  
  // The player inherits the chosen club's infrastructure (e.g. Akademia Orłów starts
  // with academy L2 + hall L1 from its identity). Previously these were hardcoded to
  // 0, so taking the youth-only club gave it NO academy — making it unplayable.
  const myTeamObj=teams.find(t=>t.id===clubIdx);
  if(myTeamObj){
    store.G.infraHall=myTeamObj.infraHall||0;
    store.G.infraMed=myTeamObj.infraMed||0;
    store.G.infraAcademy=myTeamObj.infraAcademy||0;
    store.G.infraMerchandising=myTeamObj.infraMerchandising||0;
  }
  teams.forEach(t=>assignAiStaff(t));
  store.G.principalPool=Array.from({length:6},()=>genPrincipal(countryId));
  teams.forEach(t=>assignAiPrincipal(t));
  if(!useDb)teams.forEach(t=>tuneGeneratedLeagueRoster(t.id));
  // The youth-only challenge club must stay CLEARLY the weakest in L2 (owner
  // design). Equipment mods (2026-07-03) add ±2 OVR of noise on top of the
  // budget tuning, so the gap is enforced explicitly at generation.
  {
    const chall=teams.find(t=>(t.traits||[]).includes('youthOnly'));
    if(chall){
      const others=teams.filter(t=>t.league===2&&t.id!==chall.id).map(t=>teamOvr(t.id));
      const floor=Math.min(...others)-3;
      let guard=0;
      while(teamOvr(chall.id)>floor&&guard++<40){
        store.G.players.filter(p=>p.teamId===chall.id&&!p.retired).forEach(p=>{SK.forEach(st=>{p[st]=Math.max(12,(p[st]||12)-1);});});
      }
    }
  }
  genCupBracket();
  players.forEach(p=>{p.fatigue=0;store.G.playerHistory[p.id]=[snap(p)];});
  if((store.G.infraAcademy||0)>0){
    store.G.academyProspects=genAcademyIntake(store.G.myTeamId,countryId);
  }
  store.G.boardObjectiveOptions=generateBoardObjectiveChoices(clubIdx);
  store.G.boardObjective=null;
  genSponsorOffers(30);buildMarket();updateHeader();
  persistGame();
  }finally{Math.random=__origRandom;}
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// SIMULATION
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function getMatchStarters(tid){
  let st=store.G.players.filter(p=>p.teamId===tid&&!p.retired&&p.role==='starter'&&!(p.injuredFor>0));
  // The player can set the board ORDER of their own starters (boardOrder); AI clubs
  // (and any unset player) fall back to strongest-first.
  if(tid===store.G.myTeamId)st.sort((a,b)=>(a.boardOrder??99)-(b.boardOrder??99)||ovr(b)-ovr(a));
  else st.sort((a,b)=>ovr(b)-ovr(a));
  st=st.slice(0,4);
  if(st.length<4){const res=store.G.players.filter(p=>p.teamId===tid&&!p.retired&&!(p.injuredFor>0)).sort((a,b)=>ovr(b)-ovr(a));while(st.length<4&&res.length){const r=res.shift();if(!st.find(x=>x.id===r.id))st.push(r);}}
  return st;
}
// Swap a starter's board slot with its neighbour (player lineup control).
function moveLineup(pid,dir){
  const myId=store.G.myTeamId;
  const st=store.G.players.filter(p=>p.teamId===myId&&!p.retired&&p.role==='starter'&&!(p.injuredFor>0))
    .sort((a,b)=>(a.boardOrder??99)-(b.boardOrder??99)||ovr(b)-ovr(a));
  st.forEach((p,i)=>{p.boardOrder=i;}); // normalise to 0..n-1 by current order
  const idx=st.findIndex(p=>p.id===pid);const j=idx+dir;
  if(idx<0||j<0||j>=st.length)return;
  const tmp=st[idx].boardOrder;st[idx].boardOrder=st[j].boardOrder;st[j].boardOrder=tmp;
  render();updateHeader();persistGame();
}
function getBestAvailablePlayer(teamId){
  return store.G.players
    .filter(p=>p.teamId===teamId&&!p.retired&&!(p.injuredFor>0))
    .sort((a,b)=>ovr(b)-ovr(a))[0]||null;
}
function getCoach(tid=store.G?.myTeamId){return store.G.staff.find(s=>s.teamId===tid&&s.type==='coach')||null;}

function effectiveRating(p,coach){
  const base=ovr(p);if(!coach)return base;
  const hasSynergy=p.playStyle&&coach.styleSynergy&&p.playStyle===coach.styleSynergy;
  const oppositeStyle=p.playStyle&&coach.styleSynergy&&OPPOSITE_STYLE[coach.styleSynergy]===p.playStyle;
  let synergyBonus=hasSynergy?Math.round(coach.synergy/8):0;
  if(oppositeStyle)synergyBonus-=Math.round(coach.synergy/12);
  const focus=coach.styleFocus;const _es=engineStats(p);
  let focusBonus=0;
  if(focus==='atk')focusBonus=Math.round((_es.atk/96)*coach.tactics/14);
  else if(focus==='def')focusBonus=Math.round((_es.def/96)*coach.tactics/14);
  else if(focus==='srv')focusBonus=Math.round((_es.srv/96)*coach.tactics/14);
  else if(focus==='men')focusBonus=Math.round((_es.men/96)*coach.tactics/14);
  else focusBonus=Math.round(coach.tactics/22);
  let moraleFromCoach=Math.round((coach.motivation||50)/50);
  const coachTraits=coach.coachTraits||[];
  if(coachTraits.find(t=>t.id==='TACTIC_GURU')&&hasSynergy)focusBonus+=2;
  if(coachTraits.find(t=>t.id==='MORALE_MONSTER'))moraleFromCoach+=1;
  if(coachTraits.find(t=>t.id==='DISCIPLINARIAN')){
    if(p.playStyle==='DEFENDER')synergyBonus+=2;
    if(p.playStyle==='FH_LOOPER')synergyBonus-=2;
  }
  const eliteBonus=base>=90?(base-89)*2.5:base>=84?(base-83)*1.2:0;
  return base+focusBonus+synergyBonus+moraleFromCoach+eliteBonus;
}
function getPlayerModifierBreakdown(p){
  ensurePlayerMeta(p);
  const teamId=p.teamId;
  const coach=teamId!==null&&teamId!==undefined?getCoach(teamId):null;
  const tech=getTechPartnershipBonus(teamId);
  const techLabel=getTechPartnership()?.name||t('common.none');
  const hasSynergy=!!(coach&&p.playStyle&&coach.styleSynergy&&p.playStyle===coach.styleSynergy);
  const oppositeStyle=!!(coach&&p.playStyle&&coach.styleSynergy&&OPPOSITE_STYLE[coach.styleSynergy]===p.playStyle);
  let coachSynergy=0;
  let coachFocus=0;
  let coachMorale=0;
  let eliteBonus=0;
  if(coach){
    coachSynergy=hasSynergy?Math.round(coach.synergy/8):0;
    if(oppositeStyle)coachSynergy-=Math.round(coach.synergy/12);
    const _es2=engineStats(p);
    if(coach.styleFocus==='atk')coachFocus=Math.round((_es2.atk/96)*coach.tactics/14);
    else if(coach.styleFocus==='def')coachFocus=Math.round((_es2.def/96)*coach.tactics/14);
    else if(coach.styleFocus==='srv')coachFocus=Math.round((_es2.srv/96)*coach.tactics/14);
    else if(coach.styleFocus==='men')coachFocus=Math.round((_es2.men/96)*coach.tactics/14);
    else coachFocus=Math.round(coach.tactics/22);
    coachMorale=Math.round((coach.motivation||50)/50);
  }
  const base=ovrBase(p);
  const totalOvr=ovr(p);
  eliteBonus=totalOvr>=90?(totalOvr-89)*2.5:totalOvr>=84?(totalOvr-83)*1.2:0;
  const moraleBonus=Number((((p.morale||50)-50)/200*6).toFixed(1));
  const formBonus=seasonFormImpact(p);
  const staminaBonus=Number((((p.men||50)/100)*6).toFixed(1));
  const fatiguePenalty=Number((((p.fatigue||0)*(0.11+((60-playerStamina(p))/280)))*fatigueImpactFactor()).toFixed(1));
  return{
    baseOvr:base,
    totalOvr,
    techLabel,
    techStats:tech,
    techOvr:totalOvr-base,
    coachName:coach?.name||null,
    coachFocus,
    coachSynergy,
    coachMorale,
    eliteBonus:Number(eliteBonus.toFixed(1)),
    formBonus,
    moraleBonus,
    staminaBonus,
    fatiguePenalty,
    effectiveNow:Number((effectiveRating(p,coach)-fatiguePenalty+moraleBonus+staminaBonus+formBonus).toFixed(1)),
  };
}
function normalizeProbabilityTriplet(winner,error,cont){
  let w=Math.max(0.001,winner);
  let e=Math.max(0.001,error);
  let c=Math.max(0.001,cont);
  const sum=w+e+c;
  return{winner:w/sum,error:e/sum,cont:c/sum};
}
function buildPointSimProfile(p,coach){
  // Coach-only lift: equipment/tech already live inside engineStats via adjusted
  // stats. Using ovrBase here double-counted equipment as a flat all-channel boost.
  const coachLift=effectiveRating(p,coach)-ovr(p);
  const formLift=seasonFormImpact(p);
  const moraleLift=((p.morale||50)-50)/8;
  const fatiguePenalty=(p.fatigue||0)*(0.028+((60-playerStamina(p))/560))*fatigueImpactFactor();
  const styleLift=((PLAYER_STYLE_INFO[p.playStyle]||{}).engine||{}).allStatLift||0;
  const es=engineStats(p);
  const tr=p.traits||[];
  const psy=psychMatchBoost(p.teamId);
  // Trait base lifts (always on).
  let tAtk=0,tDef=0,tSrv=0,tMen=psy.men||0;
  if(tr.includes('IRON_ATTACK'))tAtk+=4;
  if(tr.includes('IRON_DEFENSE')||tr.includes('WALL'))tDef+=4;
  if(tr.includes('SERVE_MASTER'))tSrv+=4;
  if(tr.includes('AGGR_SERVE')){tSrv+=2;tAtk+=1;}
  if(tr.includes('STEEL_NERVES'))tMen+=3.5;
  if(tr.includes('VETERAN'))tMen+=2;
  if(tr.includes('SPIN_WIZARD')){tSrv+=2.5;tAtk+=1;}
  if(tr.includes('FAST_FEET'))tDef+=2.5;
  if(tr.includes('CLUTCH'))tMen+=1.5;
  if(tr.includes('BIG_MATCH'))tMen+=1;
  const stamina0=tr.includes('IRON_STAMINA')?108:tr.includes('FAST_FEET')?104:100;
  return{
    player:p,
    coach,
    matchStamina:stamina0,
    baseATK:es.atk+coachLift*0.34+formLift*0.55+moraleLift*0.2-fatiqueSafe(fatiguePenalty)+styleLift+tAtk,
    baseDEF:es.def+coachLift*0.3+formLift*0.5+moraleLift*0.16-fatiqueSafe(fatiguePenalty)+styleLift+tDef,
    baseSRV:es.srv+coachLift*0.28+formLift*0.42+moraleLift*0.14-fatiqueSafe(fatiguePenalty)+styleLift+tSrv,
    baseMEN:es.men+coachLift*0.12+formLift*0.3+moraleLift*0.45-Math.max(0,fatiguePenalty*0.35)+tMen,
    style:p.playStyle||'TWO_SIDED',
    setsWon:0,setsLost:0,hotHeadMenPenalty:0,psychClutch:psy.clutch||0,
  };
}
function fatiqueSafe(value){return Number((value||0).toFixed(2));}
function applySeveranceRelease(p){
  if(!p||p.teamId===null)return;
  const team=store.G.teams.find(t=>t.id===p.teamId);
  if(!team)return;
  const severance=Math.round((p.salary||0)*Math.max(1,p.contractYears||1)*0.5);
  team.budget=(team.budget||0)-severance;
  const finance=store.G.seasonFinance;
  if(finance)finance.other=(finance.other||0)-severance;
  pushNews('news.contractTerminated','hot',{name:p.name,club:team.name,severance:formatCurrency(severance)});
  p.teamId=null;
  p.contractYears=0;
  p.role='reserve';
  p.preferredRole='starter';
  p.starterBenchStreak=0;
  p.loanedOut=false;
}
function processStarterUsageForTeam(teamId,playedIds){
  const starters=store.G.players.filter(p=>p.teamId===teamId&&!p.retired&&p.role==='starter');
  starters.forEach(p=>{
    ensurePlayerMeta(p);
    if(playedIds.has(p.id)){
      p.starterBenchStreak=0;
      p.lastPlayedMatchday=store.G.matchday;
      return;
    }
    p.starterBenchStreak=(p.starterBenchStreak||0)+1;
    if(p.starterBenchStreak>=3){
      p.morale=Math.max(0,(p.morale||50)-25);
      p.starterBenchStreak=0;
      if(teamId===store.G.myTeamId)toast(t('season.noPlayingTime',{name:p.name}));
    }
    if((p.morale||0)<15)applySeveranceRelease(p);
  });
}
function getLivePointStats(profile,ownScore,oppScore){
  const tr=profile.player?.traits||[];
  const staminaLoss=Math.max(0,100-(profile.matchStamina||100));
  const staminaModifier=1-staminaLoss*0.002;
  const clutchOn=ownScore>=9&&Math.abs(ownScore-oppScore)<=1;
  let clutchModifier=clutchOn?(0.8+((profile.baseMEN||50)/100)*0.4):1;
  if(clutchOn){
    if(tr.includes('CLUTCH')||tr.includes('STEEL_NERVES'))clutchModifier+=0.12;
    if(tr.includes('COMEBACK_KID')&&(profile.setsLost||0)>(profile.setsWon||0))clutchModifier+=0.1;
    clutchModifier+=(profile.psychClutch||0);
  }
  // Dynamic set-score traits
  let atk=profile.baseATK,def=profile.baseDEF,srv=profile.baseSRV,men=profile.baseMEN-(profile.hotHeadMenPenalty||0);
  if(tr.includes('HOTHEADED')){
    if((profile.setsWon||0)>(profile.setsLost||0))atk+=5;
    else if((profile.setsLost||0)>(profile.setsWon||0))men-=4;
  }
  if(tr.includes('COMEBACK_KID')&&(profile.setsLost||0)>(profile.setsWon||0)){
    men+=5;atk+=3;def+=2;
  }
  return{
    effATK:Math.max(12,atk*staminaModifier*clutchModifier),
    effDEF:Math.max(12,def*staminaModifier*clutchModifier),
    effSRV:Math.max(12,srv*clutchModifier),
    effMEN:Math.max(15,men),
  };
}
function applyLongRallyFatigue(profile,rallyHits){
  if(rallyHits<=6)return;
  const tr=profile.player?.traits||[];
  const staminaFactor=clamp((100-playerStamina(profile.player))/45,0.25,1.55);
  let drain=(rallyHits-6)*(0.42+staminaFactor*0.48);
  if(tr.includes('IRON_STAMINA'))drain*=0.72;
  if(tr.includes('FAST_FEET'))drain*=0.85;
  profile.matchStamina=Math.max(55,(profile.matchStamina||100)-drain);
}
function getServeOutcome(serverProfile,receiverProfile,serverScore,receiverScore){
  const serverStats=getLivePointStats(serverProfile,serverScore,receiverScore);
  const receiverStats=getLivePointStats(receiverProfile,receiverScore,serverScore);
  let ace=Math.max(0.01,0.05+(serverStats.effSRV-receiverStats.effDEF)*0.002);
  let fault=Math.max(0.01,0.06-(serverStats.effMEN*0.0005));
  ace+=((PLAYER_STYLE_INFO[serverProfile.style]||{}).engine||{}).aceBonus||0;
  if(serverProfile.player.traits?.includes('AGGR_SERVE'))ace*=1.1;
  if(serverProfile.player.traits?.includes('STEEL_NERVES'))fault*=0.88;
  ace=Math.min(0.35,ace);
  fault=Math.min(0.18,fault);
  if(ace+fault>0.82){
    const scale=0.82/(ace+fault);
    ace*=scale;
    fault*=scale;
  }
  const roll=Math.random();
  if(roll<ace)return{winner:'server',ace:true,fault:false,rallyHits:0};
  if(roll<ace+fault)return{winner:'receiver',ace:false,fault:true,rallyHits:0};
  return{winner:null,ace:false,fault:false,rallyHits:0};
}
function simulateRallyPoint(serverProfile,receiverProfile,serverScore,receiverScore){
  const serve=getServeOutcome(serverProfile,receiverProfile,serverScore,receiverScore);
  if(serve.winner)return serve;
  let active=serverProfile;
  let passive=receiverProfile;
  let activeOwn=serverScore;
  let passiveOwn=receiverScore;
  let rallyHits=0;
  while(rallyHits<40){
    rallyHits++;
    const activeStats=getLivePointStats(active,activeOwn,passiveOwn);
    const passiveStats=getLivePointStats(passive,passiveOwn,activeOwn);
    const delta=activeStats.effATK-passiveStats.effDEF;
    let pWinner=Math.max(0.02,0.08+delta*0.003);
    let pError=Math.max(0.02,0.12-(activeStats.effATK*0.0005)+(passiveStats.effDEF*0.0015));
    let pContinue=Math.max(0.02,1-pWinner-pError);
    const aEng=(PLAYER_STYLE_INFO[active.style]||{}).engine||{};
    pWinner*=(aEng.winnerMult||1);pError*=(aEng.errorMult||1);
    const pEng=(PLAYER_STYLE_INFO[passive.style]||{}).engine||{};
    pError*=(pEng.oppErrorMult||1);
    // Trait error / winner tweaks on the live rally path.
    const aTr=active.player?.traits||[];
    const pTr=passive.player?.traits||[];
    if(aTr.includes('TACTICIAN'))pError*=0.82;
    if(aTr.includes('WALL'))pError*=0.88;
    if(aTr.includes('HOTHEADED')&&(active.setsWon||0)<=(active.setsLost||0))pError*=1.12;
    if(pTr.includes('SPIN_WIZARD')||pTr.includes('WALL'))pError*=1.08; // force errors on active
    if(aTr.includes('IRON_ATTACK'))pWinner*=1.06;
    if(aTr.includes('AGGR_SERVE')&&rallyHits<=2)pWinner*=1.08;
    const probs=normalizeProbabilityTriplet(pWinner,pError,pContinue);
    const roll=Math.random();
    if(roll<probs.winner){
      return{winner:active===serverProfile?'server':'receiver',ace:false,fault:false,rallyHits,winnerShot:true,errorByActive:false};
    }
    if(roll<probs.winner+probs.error){
      return{winner:active===serverProfile?'receiver':'server',ace:false,fault:false,rallyHits,winnerShot:false,errorByActive:true};
    }
    [active,passive]=[passive,active];
    [activeOwn,passiveOwn]=[passiveOwn,activeOwn];
  }
  return{winner:Math.random()<0.5?'server':'receiver',ace:false,fault:false,rallyHits:40,winnerShot:true,errorByActive:false};
}
function simulateSetScore(homeProfile,awayProfile,startingServer,setOpts){
  // Set rules are league-format-driven (owner dossier): target points, advantage
  // (winBy 1 = golden point / no-advantage), and a non-zero starting score
  // (T.League decider starts at 6:6).
  const to=setOpts?.to||11,winBy=setOpts?.winBy||2;
  let home=setOpts?.startHome||0,away=setOpts?.startAway||0;
  let totalRallies=0,longestRally=0,acesHome=0,acesAway=0,winnersHome=0,winnersAway=0,errorsHome=0,errorsAway=0;
  while((home<to&&away<to)||Math.abs(home-away)<winBy){
    const totalPoints=home+away;
    const serverIsHome=((Math.floor(totalPoints/2)%2)===0)?startingServer==='home':startingServer!=='home';
    const outcome=serverIsHome
      ?simulateRallyPoint(homeProfile,awayProfile,home,away)
      :simulateRallyPoint(awayProfile,homeProfile,away,home);
    totalRallies+=Math.max(1,outcome.rallyHits);
    longestRally=Math.max(longestRally,outcome.rallyHits||0);
    if(outcome.rallyHits>6){
      applyLongRallyFatigue(homeProfile,outcome.rallyHits);
      applyLongRallyFatigue(awayProfile,outcome.rallyHits);
    }
    const homeWins=serverIsHome?outcome.winner==='server':outcome.winner==='receiver';
    if(homeWins){
      home++;
      if(outcome.ace)acesHome++;
      else if(outcome.winnerShot)winnersHome++;
      else errorsAway++;
    }else{
      away++;
      if(outcome.ace)acesAway++;
      else if(outcome.winnerShot)winnersAway++;
      else errorsHome++;
    }
  }
  return{
    home,away,rallies:totalRallies,longestRally,
    homeAces:acesHome,awayAces:acesAway,
    homeWinners:winnersHome,awayWinners:winnersAway,
    homeErrors:errorsHome,awayErrors:errorsAway
  };
}

function simIndividual(ph,pa,hCoach,aCoach,duelOpts){
  ensurePlayerMeta(ph);ensurePlayerMeta(pa);
  const homeProfile=buildPointSimProfile(ph,hCoach);
  const awayProfile=buildPointSimProfile(pa,aCoach);
  const styleEdge=getStyleEdge(ph.playStyle,pa.playStyle);
  // Apply counter once as a modest home-relative lift (do NOT also subtract the
  // full edge from away — that doubled the gap and inverted large OVR favorites).
  const edge=styleEdge.delta||0;
  homeProfile.baseATK+=edge;homeProfile.baseDEF+=edge*0.75;homeProfile.baseSRV+=edge*0.55;homeProfile.baseMEN+=edge*0.4;
  // Cup / big-match trait
  if(duelOpts?.isCup||duelOpts?.bigMatch){
    if(ph.traits?.includes('BIG_MATCH')){homeProfile.baseMEN+=4;homeProfile.baseATK+=2;}
    if(pa.traits?.includes('BIG_MATCH')){awayProfile.baseMEN+=4;awayProfile.baseATK+=2;}
  }
  const diff=
    (homeProfile.baseATK+homeProfile.baseDEF+homeProfile.baseSRV+homeProfile.baseMEN)
    -(awayProfile.baseATK+awayProfile.baseDEF+awayProfile.baseSRV+awayProfile.baseMEN);
  let hs=0,as=0;
  const setResults=[];
  const setScores=[];
  const micro={homePoints:0,awayPoints:0,homeAces:0,awayAces:0,homeWinners:0,awayWinners:0,homeErrors:0,awayErrors:0,longestRally:0,closestSets:0};
  let firstServer=Math.random()<0.5?'home':'away';
  // Per-league duel rules: bestOf (T.League doubles Bo3, Victory Match Bo1),
  // golden point outside the decider, decider from 6:6, Polish last set to 6.
  const bestOf=duelOpts?.bestOf||5;
  const toWin=Math.ceil(bestOf/2);
  while(hs<toWin&&as<toWin){
    const isDecider=bestOf>1&&hs===toWin-1&&as===toWin-1;
    // Comeback kid gets an extra decider bump.
    if(isDecider){
      if(ph.traits?.includes('COMEBACK_KID')){homeProfile.baseMEN+=3;homeProfile.baseATK+=2;}
      if(pa.traits?.includes('COMEBACK_KID')){awayProfile.baseMEN+=3;awayProfile.baseATK+=2;}
    }
    homeProfile.setsWon=hs;homeProfile.setsLost=as;
    awayProfile.setsWon=as;awayProfile.setsLost=hs;
    const so={to:11,winBy:2,startHome:0,startAway:0};
    if(duelOpts?.goldenPoint&&!isDecider)so.winBy=1;
    if(isDecider&&duelOpts?.deciderFrom){so.startHome=duelOpts.deciderFrom;so.startAway=duelOpts.deciderFrom;}
    if(isDecider&&duelOpts?.lastSetTo){so.to=duelOpts.lastSetTo;so.winBy=duelOpts.lastSetWinBy||1;}
    const setScore=simulateSetScore(homeProfile,awayProfile,firstServer,so);
    setScores.push(setScore);
    micro.homePoints+=setScore.home;
    micro.awayPoints+=setScore.away;
    micro.homeAces+=setScore.homeAces;
    micro.awayAces+=setScore.awayAces;
    micro.homeWinners+=setScore.homeWinners;
    micro.awayWinners+=setScore.awayWinners;
    micro.homeErrors+=setScore.homeErrors;
    micro.awayErrors+=setScore.awayErrors;
    micro.longestRally=Math.max(micro.longestRally,setScore.longestRally);
    if(Math.abs(setScore.home-setScore.away)<=2)micro.closestSets++;
    if(setScore.home>setScore.away){
      hs++;setResults.push('H');
      if(pa.traits?.includes('HOTHEADED'))awayProfile.hotHeadMenPenalty=(awayProfile.hotHeadMenPenalty||0)+5;
    }else{
      as++;setResults.push('A');
      if(ph.traits?.includes('HOTHEADED'))homeProfile.hotHeadMenPenalty=(homeProfile.hotHeadMenPenalty||0)+5;
    }
    firstServer=firstServer==='home'?'away':'home';
  }
  return{hs,as,homeWin:hs>as,isDraw:false,setResults,setScores,micro,styleEdge:styleEdge.label,momentum:Math.round(diff/4)};
}

// ── Real match protocol (owner 2026-07-02, per the league dossier) ─────────────
// Superliga/TTBL hybrid, FIRST TO 3 match points, no draws:
//   G1: A vs Y   G2: B vs X   G3: C vs Z
//   G4: A vs X — either side may field a reserve instead (reserves enter from G4)
//   G5: DOUBLES — the board-1 nominee (A/X) may NOT play the double; pairs are B+C / Y+Z.
// Teams nominate 3 base players + up to 2 reserves before the match.
function autoNomination(teamId){
  const healthy=store.G.players.filter(p=>p.teamId===teamId&&!p.retired&&!(p.injuredFor>0)&&p.role!=='youth');
  const starters=healthy.filter(p=>p.role==='starter').sort((a,b)=>(teamId===store.G.myTeamId?(a.boardOrder??99)-(b.boardOrder??99):0)||ovr(b)-ovr(a));
  const bench=healthy.filter(p=>p.role!=='starter').sort((a,b)=>ovr(b)-ovr(a));
  const ordered=[...starters,...bench];
  return{base:ordered.slice(0,3),reserves:ordered.slice(3,5)};
}
// The player's one-shot nomination from the pre-match modal (consumed per match).
function getMatchNomination(teamId){
  const nom=store.G.matchNomination;
  if(teamId===store.G.myTeamId&&nom&&nom.season===store.G.season){
    const byId=id=>store.G.players.find(p=>p.id===id&&p.teamId===teamId&&!p.retired&&!(p.injuredFor>0));
    const base=(nom.base||[]).map(byId).filter(Boolean);
    const reserves=(nom.reserves||[]).map(byId).filter(Boolean);
    if(base.length===3)return{base,reserves:reserves.slice(0,2)};
  }
  return autoNomination(teamId);
}
// Virtual doubles pair: averaged stats + a small chemistry bonus for mixed styles.
function makeDoublesPair(p1,p2){
  ensurePlayerMeta(p1);ensurePlayerMeta(p2);
  const pair={id:'pair_'+p1.id+'_'+p2.id,name:`${p1.name.split(' ').pop()} / ${p2.name.split(' ').pop()}`,
    age:Math.round(((p1.age||25)+(p2.age||25))/2),peakAge:Math.round(((p1.peakAge||28)+(p2.peakAge||28))/2),
    morale:Math.round(((p1.morale||50)+(p2.morale||50))/2),fatigue:Math.round(((p1.fatigue||0)+(p2.fatigue||0))/2),
    seasonForm:Math.round(((p1.seasonForm||0)+(p2.seasonForm||0))/2),
    traits:[],playStyle:p1.playStyle,teamId:p1.teamId};
  const chem=p1.playStyle!==p2.playStyle?2:0;
  SK.forEach(s=>{pair[s]=clamp(Math.round(((p1[s]||40)+(p2[s]||40))/2)+chem,10,96);});
  return pair;
}
function simTeamMatch(homeId,awayId,isCup){
  const hN=getMatchNomination(homeId),aN=getMatchNomination(awayId);
  // consume the player's one-shot nomination once it fed a match involving them
  if(store.G.matchNomination&&(homeId===store.G.myTeamId||awayId===store.G.myTeamId))store.G.matchNomination=null;
  // Forfeit safety: fewer than 3 eligible players = walkower 0:3 (never crash).
  if(hN.base.length<3||aN.base.length<3){
    const bothShort=hN.base.length<3&&aN.base.length<3;
    const homeWin=!bothShort&&aN.base.length<3;
    const hW=bothShort?0:(homeWin?3:0),aW=bothShort?0:(homeWin?0:3);
    return{homeId,awayId,hTeamW:hW,aTeamW:aW,draws:0,homeWin,isDraw:bothShort,score:`${hW}:${aW}`,matchups:[],homePoints:0,awayPoints:0,tiebreak:null,forfeit:true};
  }
  const hCoach=getCoach(homeId),aCoach=getCoach(awayId);
  const matchups=[];let hW=0,aW=0;
  const isLeagueMatch=!isCup;
  const fatigueGain=new Map();
  const [A,B,C]=hN.base,[X,Y,Z]=aN.base;
  // Per-league protocol (owner dossier 2026-07-03): the game order, set rules and
  // reserve usage all come from the country's real league format.
  const FMT=getLeagueFormat();
  const duelOpts={goldenPoint:!!FMT.goldenPoint,deciderFrom:FMT.deciderFrom||0,lastSetTo:FMT.lastSetTo||0,lastSetWinBy:FMT.lastSetWinBy||2};
  // G4 (superliga protocol): a reserve may replace the double-duty board-1 player.
  const pickG4=(nom,dflt)=>{
    const res=nom.reserves[0];
    if(!res)return dflt;
    const eff=p=>ovr(p)-(p.fatigue||0)/8+(p.seasonForm||0)/2;
    return ((dflt.fatigue||0)>72||eff(res)>eff(dflt))?res:dflt;
  };
  let schedule;
  if(FMT.protocol==='olympic'){
    // CTTSL/olympic: 3-man squads, nobody plays more than 2 games, double in G3.
    // A: G1+G4, B: G2+DEBEL, C: DEBEL+G5 / X: G1+G5, Y: G2+DEBEL, Z: DEBEL+G4.
    schedule=[
      {h:[A],a:[X],label:'G1',opts:duelOpts},
      {h:[B],a:[Y],label:'G2',opts:duelOpts},
      {h:[C,B],a:[Z,Y],label:'DEBEL',double:true,opts:duelOpts},
      {h:[A],a:[Z],label:'G4',opts:duelOpts},
      {h:[C],a:[X],label:'G5',opts:duelOpts},
    ];
  }else if(FMT.protocol==='tleague'){
    // T.League: the DOUBLE opens (best-of-3), doubles players skip the next
    // single (pairs are B+C / Y+Z, S1 = A vs X), 2:2 → one-set VICTORY MATCH.
    schedule=[
      {h:[B,C],a:[Y,Z],label:'DEBEL',double:true,opts:{...duelOpts,bestOf:3}},
      {h:[A],a:[X],label:'S1',opts:duelOpts},
      {h:[B],a:[Y],label:'S2',opts:duelOpts},
      {h:[C],a:[Z],label:'S3',opts:duelOpts},
      {h:[A],a:[X],label:'VICTORY MATCH',opts:{bestOf:1}},
    ];
  }else{
    // superliga/TTBL: G1 A-Y, G2 B-X, G3 C-Z, G4 with reserves, G5 double (B+C).
    const g4h=pickG4(hN,A),g4a=pickG4(aN,X);
    schedule=[
      {h:[A],a:[Y],label:'G1',opts:duelOpts},
      {h:[B],a:[X],label:'G2',opts:duelOpts},
      {h:[C],a:[Z],label:'G3',opts:duelOpts},
      {h:[g4h],a:[g4a],label:'G4',opts:duelOpts},
      {h:[B,C],a:[Y,Z],label:'DEBEL',double:true,opts:duelOpts},
    ];
  }
  // Credits one game's stats to every real participant (doubles: both members).
  const credit=(players,micro,ownPts,oppPts,won)=>{
    players.forEach(p=>{
      p.seasonPointsWon=(p.seasonPointsWon||0)+ownPts;
      p.seasonPointsLost=(p.seasonPointsLost||0)+oppPts;
      p.careerPointsWon=(p.careerPointsWon||0)+ownPts;
      p.careerPointsLost=(p.careerPointsLost||0)+oppPts;
      if(isLeagueMatch){
        p.leagueSeasonPointsWon=(p.leagueSeasonPointsWon||0)+ownPts;
        p.leagueSeasonPointsLost=(p.leagueSeasonPointsLost||0)+oppPts;
      }
      if(won){p.seasonW=(p.seasonW||0)+1;p.careerW=(p.careerW||0)+1;if(isLeagueMatch)p.leagueSeasonW=(p.leagueSeasonW||0)+1;}
      else{p.seasonL=(p.seasonL||0)+1;p.careerL=(p.careerL||0)+1;if(isLeagueMatch)p.leagueSeasonL=(p.leagueSeasonL||0)+1;}
    });
  };
  for(const game of schedule){
    if(hW===3||aW===3)break; // first to 3 — remaining games are not played
    const hReal=game.h,aReal=game.a;
    const hp=game.double?makeDoublesPair(hReal[0],hReal[1]):hReal[0];
    const ap=game.double?makeDoublesPair(aReal[0],aReal[1]):aReal[0];
    const r=simIndividual(hp,ap,hCoach,aCoach,{...game.opts,isCup:!!isCup,bigMatch:!!isCup});
    matchups.push({
      type:game.double?'double':'single',label:game.label,
      homePlayer:hReal[0].id,awayPlayer:aReal[0].id,
      homePair:game.double?hReal.map(p=>p.id):null,awayPair:game.double?aReal.map(p=>p.id):null,
      homeName:game.double?hp.name:hReal[0].name,awayName:game.double?ap.name:aReal[0].name,
      ...r,
    });
    const duelLoad=Math.round((((r.micro?.homePoints||0)+(r.micro?.awayPoints||0))/2.6)+((r.micro?.longestRally||0)/4));
    const loadShare=game.double?0.6:1; // doubles cover less ground per player
    hReal.forEach(p=>fatigueGain.set(p.id,(fatigueGain.get(p.id)||0)+Math.round(duelLoad*loadShare)));
    aReal.forEach(p=>fatigueGain.set(p.id,(fatigueGain.get(p.id)||0)+Math.round(duelLoad*loadShare)));
    const hPts=r.micro?.homePoints||0,aPts=r.micro?.awayPoints||0;
    credit(hReal,r.micro,game.double?Math.round(hPts/2):hPts,game.double?Math.round(aPts/2):aPts,r.homeWin);
    credit(aReal,r.micro,game.double?Math.round(aPts/2):aPts,game.double?Math.round(hPts/2):hPts,!r.homeWin);
    if(!game.double){
      hReal[0].lastMatchMicro={score:`${r.hs}:${r.as}`,...r.micro,styleEdge:r.styleEdge};
      aReal[0].lastMatchMicro={score:`${r.as}:${r.hs}`,homePoints:aPts,awayPoints:hPts,homeAces:r.micro?.awayAces||0,awayAces:r.micro?.homeAces||0,homeWinners:r.micro?.awayWinners||0,awayWinners:r.micro?.homeWinners||0,homeErrors:r.micro?.awayErrors||0,awayErrors:r.micro?.homeErrors||0,longestRally:r.micro?.longestRally||0,closestSets:r.micro?.closestSets||0,styleEdge:r.styleEdge};
    }
    if(r.homeWin)hW++;else aW++;
  }
  // Fatigue: only the two clubs in THIS fixture settle load. Players who stepped
  // on court gain fatigue; teammates who sat out rest once. Everyone else in the
  // world is untouched — previously every non-participant recovered after every
  // fixture, so a full matchday recharged bystanders ~6–11× and killed rotation.
  const allPlaying=new Set();
  matchups.forEach(m=>{(m.homePair||[m.homePlayer]).forEach(id=>allPlaying.add(id));(m.awayPair||[m.awayPlayer]).forEach(id=>allPlaying.add(id));});
  const involvedTeams=new Set([homeId,awayId]);
  const coachByTeam=new Map();
  [homeId,awayId].forEach(tid=>coachByTeam.set(tid,getCoach(tid)));
  store.G.players.forEach(p=>{
    if(p.retired)return;
    if(!involvedTeams.has(p.teamId))return;
    ensurePlayerMeta(p);
    const teamCoach=coachByTeam.get(p.teamId)||null;
    const intensityFactor=teamCoach?(0.88+((teamCoach.intensity||50)/150)):1;
    const cupFactor=isCup?0.9:1;
    const fatMult=physioFatigueMult(p.teamId);
    if(allPlaying.has(p.id)){
      const duelLoad=fatigueGain.get(p.id)||10;
      const playedAdd=Math.round((duelLoad*(0.28+(100-playerStamina(p))/180))*intensityFactor*cupFactor*fatMult);
      p.fatigue=Math.min(100,(p.fatigue||0)+playedAdd);
    }else{
      const restGain=Math.round(clamp(15+((playerStamina(p)-50)/10),10,22))+physioRestBonus(p.teamId);
      p.fatigue=Math.max(0,(p.fatigue||0)-restGain);
    }
  });
  processStarterUsageForTeam(homeId,new Set(hN.base.map(p=>p.id)));
  processStarterUsageForTeam(awayId,new Set(aN.base.map(p=>p.id)));
  // First-to-3 protocol can never tie — the doubles decides a 2:2. No draws.
  const homePoints=matchups.reduce((sum,m)=>sum+(m.micro?.homePoints||0),0);
  const awayPoints=matchups.reduce((sum,m)=>sum+(m.micro?.awayPoints||0),0);
  return{homeId,awayId,hTeamW:hW,aTeamW:aW,draws:0,homeWin:hW>aW,isDraw:false,score:`${hW}:${aW}`,matchups,homePoints,awayPoints,tiebreak:null};
}

// ── BACKGROUND CAREER GENERATION (owner backlog #1, 2026-07-03) ───────────────
// Before the manager takes over, the world plays N full seasons on its own:
// league schedules, awards, records, club history, promotion/relegation, aging,
// retirements (Hall of Fame), AI finances, poaching. During generation NO club
// is the player's (caretaker mode) — the chosen club is handed over afterwards
// with whatever squad/budget/infrastructure its history produced.
async function simulateBackgroundSeasons(n,progressCb){
  if(!store.G||!(n>0))return;
  const clubId=store.G.myTeamId;
  ui._bgGen=true;
  store.G.teams.forEach(t=>{t.isPlayer=false;});
  store.G.myTeamId=null;
  try{
    for(let i=0;i<n;i++){
      for(const sch of [store.G.scheduleL1,store.G.scheduleL2]){
        for(const round of sch)for(const f of round)applyResult(simTeamMatch(f.home,f.away,false));
      }
      store.G.matchday=TOTAL_MATCHDAYS;
      giveSeasonAwards();
      updateRecords();
      doPromotionRelegation();
      recordClubSeasonHistory();
      await endSeason();
      if(progressCb)progressCb(i+1,n);
      await sleep(20); // let the progress modal repaint
    }
  }finally{
    // Handover: the chosen club becomes the player's, wherever history took it.
    const club=store.G.teams.find(t=>t.id===clubId);
    club.isPlayer=true;
    store.G.myTeamId=clubId;
    store.G.infraHall=club.infraHall||0;
    store.G.infraMed=club.infraMed||0;
    store.G.infraAcademy=club.infraAcademy||0;
    store.G.infraMerchandising=club.infraMerchandising||0;
    store.G.boardObjectiveOptions=generateBoardObjectiveChoices(clubId);
    store.G.boardObjective=null;
    store.G.academyProspects=(store.G.infraAcademy||0)>0?genAcademyIntake(clubId,store.G.countryId):[];
    genSponsorOffers(calcPrestige());
    buildMarket();
    store.G.matchNomination=null;
    pushNews('news.newManager','hot',{club:club.name,season:store.G.season});
    pushMail({fromKey:'mail.board',subjectKey:'mail.welcomeSubject',subjectParams:{club:club.name},bodyKey:'mail.welcomeBody',bodyParams:{years:n,club:club.name,division:club.league===1?'I':'II'}});
    ui._bgGen=false;
    updateHeader();
    persistGame();
  }
}

// The country's real league format (protocol + set rules + table points).
function getLeagueFormat(){
  return (typeof LEAGUE_FORMATS!=='undefined'&&LEAGUE_FORMATS[store.G?.countryId])||LEAGUE_FORMATS?.PL||{protocol:'superliga',tablePoints:'superliga',lastSetTo:6,lastSetWinBy:1};
}
// Table points for a stored result under the save's league format.
function tablePointsFor(r){
  const fmt=getLeagueFormat();
  if(r.isDraw)return{h:1,a:1}; // pathological double-forfeit only
  const wl=r.homeWin?r.aTeamW:r.hTeamW; // games taken by the loser
  let win,lose;
  switch(fmt.tablePoints){
    case 'win2':win=2;lose=0;break;                       // TTBL: 2/0
    case 'win2loss1':win=2;lose=1;break;                  // CTTSL: 2/1
    case 'tleague':win=wl>=2?3:4;lose=wl>=2?1:0;break;    // clean-win bonus
    default:win=wl>=2?2:3;lose=wl>=2?1:0;                 // Superliga 3/2/1/0
  }
  return r.homeWin?{h:win,a:lose}:{h:lose,a:win};
}

// ── INBOX / mailbox (owner 2026-07-02; designed in DESIGN-ai-world.md) ────────
// Mail is either informational or a DECISION (yes/no). Unanswered decisions BLOCK
// the next matchday — the manager must run the club, not just click "play".
function ensureInbox(){store.G.inbox=store.G.inbox||[];return store.G.inbox;}
function pushMail(mail){
  const inbox=ensureInbox();
  inbox.push({id:ui._pid++,season:store.G.season,matchday:store.G.matchday,read:false,answered:false,answer:null,type:'info',...mail});
  if(inbox.length>120)inbox.shift();
}
function unreadMailCount(){return (store.G?.inbox||[]).filter(m=>!m.read||(m.type==='decision'&&!m.answered)).length;}
function pendingDecisions(){return (store.G?.inbox||[]).filter(m=>m.type==='decision'&&!m.answered);}
function markMailRead(id){
  const m=(store.G.inbox||[]).find(x=>x.id===id);
  if(m&&!m.read){m.read=true;persistGame();}
}
function answerMail(id,yes){
  const m=(store.G.inbox||[]).find(x=>x.id===id);
  if(!m||m.type!=='decision'||m.answered)return;
  m.answered=true;m.read=true;m.answer=!!yes;
  applyMailDecision(m,!!yes);
  render();updateHeader();persistGame();
}
function applyMailDecision(m,yes){
  const d=m.decision||{};
  if(d.kind==='reserveRequest'){
    const p=store.G.players.find(x=>x.id===d.playerId);
    if(!p)return;
    if(yes){
      p.morale=Math.min(100,(p.morale||50)+8);
      p._promisedMatch={season:store.G.season};
      toast(t('mail.promiseMade',{name:p.name}));
    }else{
      const hit=(p.seasonForm||0)>=7?10:6; // snubbing a player on FIRE hurts more
      p.morale=Math.max(10,(p.morale||50)-hit);
    }
  }
}
// Generates the pre-matchday mail. Called after each matchday commit and at the
// start of the season, so there is something real to decide before pressing play.
function generateInboxForMatchday(){
  const myId=store.G.myTeamId;
  // Reserve in strong form asks for a chance (decision).
  const cands=store.G.players.filter(p=>p.teamId===myId&&!p.retired&&p.role==='reserve'&&!(p.injuredFor>0)&&(p.seasonForm||0)>=4&&!p._promisedMatch);
  const alreadyAsked=new Set((store.G.inbox||[]).filter(m=>m.decision?.kind==='reserveRequest'&&!m.answered).map(m=>m.decision.playerId));
  const fresh=cands.filter(p=>!alreadyAsked.has(p.id));
  if(fresh.length&&Math.random()<0.5){
    const p=fresh[rnd(0,fresh.length-1)];
    pushMail({type:'decision',from:p.name,subjectKey:'mail.reserveRequestSubject',subjectParams:{name:p.name},
      bodyKey:'mail.reserveRequestBody',bodyParams:{form:seasonFormLabel(p),ovr:ovr(p)},
      decision:{kind:'reserveRequest',playerId:p.id}});
  }
  // Expiring contracts warning (info, once per player per season).
  const expiring=store.G.players.filter(p=>p.teamId===myId&&!p.retired&&p.contractYears===1&&p.role!=='youth');
  expiring.forEach(p=>{
    const already=(store.G.inbox||[]).find(m=>m.season===store.G.season&&m._tag===`exp_${p.id}`);
    if(!already&&store.G.matchday===0)pushMail({fromKey:'mail.sportingDirector',subjectKey:'mail.expiringSubject',subjectParams:{name:p.name},bodyKey:'mail.expiringBody',bodyParams:{name:p.name,ovr:ovr(p)},_tag:`exp_${p.id}`});
  });
  // Fatigue warning before the round (info).
  const tired=store.G.players.filter(p=>p.teamId===myId&&!p.retired&&p.role==='starter'&&(p.fatigue||0)>75);
  if(tired.length&&store.G.matchday>0){
    const already=(store.G.inbox||[]).find(m=>m.season===store.G.season&&m.matchday===store.G.matchday&&m._tag==='fatigue');
    if(!already)pushMail({fromKey:'mail.medicalTeam',subjectKey:'mail.fatigueSubject',bodyKey:'mail.fatigueBody',bodyParams:{players:tired.map(p=>`${p.name} (${p.fatigue}%)`).join(', ')},_tag:'fatigue'});
  }
}
// After my match: settle reserve promises (kept = bonus, broken = real resentment).
function settleMatchPromises(playedIds){
  const myId=store.G.myTeamId;
  store.G.players.filter(p=>p.teamId===myId&&p._promisedMatch).forEach(p=>{
    if(playedIds.has(p.id)){
      p.morale=Math.min(100,(p.morale||50)+4);
    }else{
      p.morale=Math.max(10,(p.morale||50)-12);
      p.loyalty=Math.max(0,(p.loyalty||0)-1);
      pushMail({from:p.name,subjectKey:'mail.disappointedSubject',subjectParams:{name:p.name},bodyKey:'mail.disappointedBody'});
    }
    p._promisedMatch=null;
  });
}

// ── Pre-match squad nomination (owner 2026-07-02, real TT protocol) ───────────
// The manager names 3 base players (boards A/B/C) + up to 2 reserves before the
// match. Form, fatigue and morale are all visible — the "small stuff" now drives
// a real decision. Selection order = A, B, C, R1, R2.
let _nomState=null;
function openMatchNomination(onConfirm){
  const myId=store.G.myTeamId;
  const pool=getEligibleMatchPlayers(myId).sort((a,b)=>(a.boardOrder??99)-(b.boardOrder??99)||ovr(b)-ovr(a));
  if(pool.length<3){toast(t('match.nom.tooFew'));return;}
  const cap=nominationSlotCount();
  const def=pool.slice(0,3).map(p=>p.id);
  // Promised reserves are pre-picked into the reserve slots (keep your word!).
  pool.filter(p=>p._promisedMatch).forEach(p=>{if(!def.includes(p.id)&&def.length<cap)def.push(p.id);});
  pool.forEach(p=>{if(!def.includes(p.id)&&def.length<cap)def.push(p.id);});
  _nomState={sel:def.slice(0,cap),onConfirm};
  renderNominationModal();
}
function nominationSlotCount(){return getLeagueFormat().protocol==='superliga'?5:3;}
function protocolDescription(){
  const f=getLeagueFormat();
  if(f.protocol==='olympic')return t('match.protocol.olympic',{label:f.label});
  if(f.protocol==='tleague')return t('match.protocol.tleague',{label:f.label});
  return t('match.protocol.superliga',{label:f.label,lastSet:f.lastSetTo?t('match.protocol.lastSet',{points:f.lastSetTo}):''});
}
function nomToggle(pid){
  if(!_nomState)return;
  const cap=nominationSlotCount();
  const i=_nomState.sel.indexOf(pid);
  if(i>=0)_nomState.sel.splice(i,1);
  else if(_nomState.sel.length<cap)_nomState.sel.push(pid);
  else{toast(t(cap===5?'match.nom.maxFive':'match.nom.noReserves'));return;}
  renderNominationModal();
}
function nomConfirm(){
  if(!_nomState)return;
  if(_nomState.sel.length<3){toast(t('match.nom.chooseThree'));return;}
  store.G.matchNomination={season:store.G.season,matchday:store.G.matchday,base:_nomState.sel.slice(0,3),reserves:_nomState.sel.slice(3,5)};
  const cb=_nomState.onConfirm;_nomState=null;
  closeModal();persistGame();
  if(cb)cb();
}
function renderNominationModal(){
  const myId=store.G.myTeamId;
  const pool=getEligibleMatchPlayers(myId).sort((a,b)=>(a.boardOrder??99)-(b.boardOrder??99)||ovr(b)-ovr(a));
  const fiveSlots=nominationSlotCount()===5;
  const slots=fiveSlots?['match.nom.slotA','match.nom.slotB','match.nom.slotC','match.nom.slotR1','match.nom.slotR2'].map(key=>t(key)):['match.nom.slotA','match.nom.slotB','match.nom.slotC'].map(key=>t(key));
  const modal=document.getElementById('modal');modal.className='modal modal-lg';
  modal.innerHTML=`<div class="mt2">${t('match.nom.title',{format:getLeagueFormat().label}).toUpperCase()}</div>
  <div class="fs11 ink3 mb10 lh16">${protocolDescription()} ${t('match.nom.selectHint',{order:fiveSlots?'A, B, C, R1, R2':'A, B, C'})}</div>
  <div class="grid gp6 ova" style="max-height:46vh">
  ${pool.map(p=>{const idx=_nomState.sel.indexOf(p.id);const tag=idx>=0?slots[idx]:null;
    return `<div onclick="nomToggle(${p.id})" style="display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:8px 10px;border:1px solid ${tag?(idx<3?'var(--g)':'var(--blue)'):'var(--b1)'};background:${tag?'var(--s2)':'var(--s1)'};border-radius:6px;cursor:pointer">
    <div style="min-width:86px;font-weight:800;font-size:11px;color:${tag?(idx<3?'var(--g)':'var(--blue)'):'var(--ink3)'}">${tag||'—'}</div>
    <div><div class="b7 fs13">${p.name}${p._promisedMatch?` <span class="fs9 cgold">${t('match.nom.promised')}</span>`:''}${p.role==='reserve'?` <span class="fs9 ink3">${t('match.nom.reserve')}</span>`:''}</div>
    <div class="fs10 ink3">${t('match.nom.form')}: <b>${seasonFormLabel(p)}</b> / ${t('match.nom.fatigue')}: <b style="color:${(p.fatigue||0)>70?'var(--r)':'inherit'}">${p.fatigue||0}%</b> / ${t('match.nom.morale')}: <b>${p.morale||50}</b> / ${styleLabel(p.playStyle)}</div></div>
    <div class="fs10 ink3">${t('match.nom.record',{wins:p.seasonW||0,losses:p.seasonL||0})}</div>
    <div class="syne b8 fs22 cr">${ovr(p)}</div>
    </div>`;}).join('')}
  </div>
  <div class="btn-row mt-12"><button class="btn go" onclick="nomConfirm()" ${_nomState.sel.length>=3?'':'disabled'}>${t('match.nom.confirm',{starters:Math.min(3,_nomState.sel.length),reserves:Math.max(0,_nomState.sel.length-3)}).toUpperCase()}</button></div>`;
  openModal();
}

// ── Uncancellable events (owner 2026-07-02) ───────────────────────────────────
// EVERY match type must be impossible to abort-and-reroll. Two locks:
//   1. ui.running is held for the whole event → Escape / nav / other actions are
//      blocked (the modals have no close buttons during play).
//   2. A random seed is PERSISTED before the event starts and the entire event
//      runs on that seeded RNG. Reloading mid-event does not lose the outcome —
//      re-entering the event replays the exact same results from the same
//      persisted state. The seed is only cleared (with a persist) on completion.
async function runSeededEvent(seedKey,body){
  if(!store.G[seedKey]){store.G[seedKey]=rnd(1,2147483646);persistGame();}
  const origRandom=Math.random;
  Math.random=mulberry32Seed(store.G[seedKey]);
  ui.running=true;
  try{
    await body();
    store.G[seedKey]=null;
    persistGame();
  }finally{
    Math.random=origRandom;
    ui.running=false;
  }
}
function simCupMatch(homeTeam,awayTeam){
  // For amateur teams, generate temporary ratings
  if(!homeTeam.isReal&&!awayTeam.isReal)return{homeWin:Math.random()<.5,score:'2:2'};
  if(homeTeam.isBye)return{homeWin:false,score:'BYE',isBye:true};
  if(awayTeam.isBye)return{homeWin:true,score:'BYE',isBye:true};
  
  if(!homeTeam.isReal){
    // Amateur vs real team
    const realOvr=teamOvr(awayTeam.id);
    const diff=realOvr-(homeTeam.ovr||30);
    const upset=Math.random()<Math.max(0.05,0.3-diff*0.005);
    const hw=upset?rnd(2,3):rnd(0,1);const aw=upset?rnd(0,1):rnd(2,4);
    return{homeWin:hw>aw,score:`${hw}:${aw}`};
  }
  if(!awayTeam.isReal){
    const realOvr=teamOvr(homeTeam.id);
    const diff=realOvr-(awayTeam.ovr||30);
    const upset=Math.random()<Math.max(0.05,0.3-diff*0.005);
    const hw=upset?rnd(0,1):rnd(2,4);const aw=upset?rnd(2,3):rnd(0,1);
    return{homeWin:hw>aw,score:`${hw}:${aw}`};
  }
  // Both real teams
  const r=simTeamMatch(homeTeam.id,awayTeam.id,true);
  return{homeWin:r.homeWin,score:r.score,tiebreak:!!r.tiebreak,matchups:r.matchups};
}

function applyResult(r){
  const ht=store.G.teams.find(t=>t.id===r.homeId),at=store.G.teams.find(t=>t.id===r.awayId);
  ht.pointsWon=(ht.pointsWon||0)+(r.homePoints||0);
  ht.pointsLost=(ht.pointsLost||0)+(r.awayPoints||0);
  at.pointsWon=(at.pointsWon||0)+(r.awayPoints||0);
  at.pointsLost=(at.pointsLost||0)+(r.homePoints||0);
  ht.gf+=r.hTeamW;ht.ga+=r.aTeamW;at.gf+=r.aTeamW;at.ga+=r.hTeamW;
  // Table points follow the country's REAL league format (owner dossier):
  // Superliga 3/2/1/0, TTBL 2/0, CTTSL 2/1, T.League clean-win bonus 4/3/1/0.
  const tp=tablePointsFor(r);
  ht.pts+=tp.h;at.pts+=tp.a;
  if(r.isDraw){ht.d++;at.d++;}
  else if(r.homeWin){ht.w++;at.l++;}
  else{at.w++;ht.l++;}
  store.G.results.push({...r,matchday:store.G.matchday,season:store.G.season});
  // Injuries for both clubs (AI parity — was player-only via tryInjuries(myId)).
  if(!r.forfeit)tryInjuriesAfterMatch(r.homeId,r.awayId);
  // Morale after the match for BOTH clubs (psych softens losses / boosts wins).
  [r.homeId,r.awayId].forEach(tid=>{
    if(tid===null||tid===undefined)return;
    const won=(tid===r.homeId&&r.homeWin)||(tid===r.awayId&&!r.homeWin&&!r.isDraw);
    const drew=r.isDraw;
    const psy=psychMatchBoost(tid);
    store.G.players.filter(p=>p.teamId===tid&&!p.retired).forEach(p=>{
      if(won)p.morale=Math.min(100,(p.morale||50)+5+Math.round(psy.morale*0.35));
      else if(drew)p.morale=Math.min(100,(p.morale||50)+1+Math.round(psy.morale*0.15));
      else p.morale=Math.max(10,(p.morale||50)-4+Math.round(psy.morale*0.45)); // psych cushions defeat
    });
  });
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// INJURIES
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// Injury roll for ONE club (player or AI). Med infra: player uses G.infraMed;
// AI uses team.infraMed. Physio always club-scoped.
function tryInjuriesForTeam(teamId){
  const injured=[];
  if(teamId===null||teamId===undefined)return injured;
  const team=store.G.teams.find(t=>t.id===teamId);
  const medLv=teamId===store.G.myTeamId?(store.G.infraMed||0):(team?.infraMed||0);
  const medBonus=INFRA_MED[clamp(medLv,0,INFRA_MED.length-1)].injBonus;
  const physio=getTeamPhysio(teamId);
  const physioPrevent=physio?(physio.prevention||0)/100:0;
  store.G.players.filter(p=>p.teamId===teamId&&!p.retired&&p.injuredFor===0&&p.role==='starter').forEach(p=>{
    const highFatigue=(p.fatigue||0)>70;
    const staminaRisk=clamp((58-playerStamina(p))/40,0,0.55);
    let baseChance=p.traits?.includes('IRON_STAMINA')?0.008:0.015;
    if(highFatigue)baseChance*=1.8;
    baseChance*=(1+staminaRisk);
    baseChance*=(1-physioPrevent);
    if(Math.random()<baseChance){
      const baseDur=rnd(1,5);
      const physioReduce=physio?(physio.injReduction||0)/100:0;
      const dur=Math.max(1,Math.round(baseDur*(1-medBonus)*(1-physioReduce)));
      p.injuredFor=dur;p.morale=Math.max(10,(p.morale||50)-10);
      p._injMd=store.G.matchday;
      injured.push({name:p.name,dur,teamId});
      if(ovr(p)>=72)pushNews('news.starInjury','hot',{name:p.name,club:teamName(p.teamId),rounds:dur});
    }
  });
  return injured;
}
// Back-compat: player club only (runMatchday still calls this).
function tryInjuries(myId){return tryInjuriesForTeam(myId??store.G?.myTeamId);}
// Roll injuries for every club that just played a fixture (league parity).
function tryInjuriesAfterMatch(homeId,awayId){
  const out=[];
  if(homeId!=null)out.push(...tryInjuriesForTeam(homeId));
  if(awayId!=null&&awayId!==homeId)out.push(...tryInjuriesForTeam(awayId));
  return out;
}
function tickInjuries(){
  const myId=store.G.myTeamId;const recovered=[];
  store.G.players.forEach(p=>{if(p.injuredFor>0){p.injuredFor--;if(p.injuredFor===0&&p.teamId===myId)recovered.push(p.name);}});
  if(recovered.length)recovered.forEach(name=>toast(t('season.recovered',{name})));
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// GROWTH
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// Coach DEVELOPMENT multiplier — the elite coach's real value (a dynasty tool).
// CONCAVE (two-curve philosophy): a ~75-training coach gives most of the benefit,
// 95 only a little more; a weak coach still helps; no coach = base growth. Youth
// benefit far more than seniors (development is about the young). Used by both the
// player club and AI clubs (so good-coach clubs grow their youth → emergence).
function coachDevMultiplier(coachTraining,isYouth){
  // Slightly stronger than original (staff-impact goal): elite coach is a real dynasty lever.
  const t=clamp((coachTraining||0)/95,0,1);
  const max=isYouth?1.45:0.78;
  return 1+max*Math.pow(t,0.58);
}
// Human-readable development boost for the player's current coach (UI).
function coachDevPercent(isYouth){
  const c=getCoach(store.G?.myTeamId);
  if(!c||c._healthVacation)return 0;
  return Math.round((coachDevMultiplier(c.training,isYouth)-1)*100);
}

// ── Age / stat-group aging (owner research, DESIGN-academy.md) ────────────────
// The four stats map onto three real aging groups that peak & decline at DIFFERENT
// ages, so a 30-year-old can still beat a young gun:
//   atk = PHYSICAL  (reflex/speed)   → matures earliest, declines first & fastest
//   def = MIXED                      → middle
//   srv = TECHNICAL (spin/service)   → learned young, holds long
//   men = MENTAL    (tactics/nerve)  → peaks latest (~28-32), declines slowest
// `mature` is the age a stat stops climbing; it flexes with the player's peakAge.
const STAT_AGING={
  foot:{mature:24,decl:1.1}, // physical: matures earliest, declines first & fastest
  fh:{mature:27,decl:0.8},   // forehand power: some physical component
  bh:{mature:28,decl:0.7},   // backhand
  ret:{mature:30,decl:0.55}, // receive (technical)
  srv:{mature:31,decl:0.45}, // serve: technical, holds long
  men:{mature:33,decl:0.35}, // mental: peaks latest, slowest decline
};
// Raw per-year change for ONE stat, before development multipliers. Positive while
// the stat is still maturing (faster when young, per the owner's age brackets),
// negative once past maturity (steeper after 34). Wonderkids grow faster & decline
// slower. The result is later scaled by coach/infra/role and capped at the ceiling.
function statAgeBaseDelta(p,s,isWunder,isLong){
  // Offset the per-stat maturity ages by the player's regional peak: an Asian
  // 22-26 peak shifts maturity (and the decline that follows) ~5 years earlier;
  // European 27-32 peaks push it slightly later. (Owner research files.)
  const off=clamp(Math.round(((p.peakAge||28)-28)*0.8),-6,4);
  const prof=STAT_AGING[s];
  const mature=prof.mature+off;
  const a=p.age;
  if(a<mature){
    let g;
    if(a<=14)g=2.8;else if(a<=17)g=2.5;else if(a<=20)g=2.0;else if(a<=23)g=1.4;else if(a<=25)g=0.9;else g=0.6;
    return g*(isWunder&&a<=24?1.6:1);
  }
  if(a>mature+1){
    let dec=prof.decl;
    if(a>=38)dec*=2.4;else if(a>=34)dec*=1.7;else if(a>=30)dec*=1.2;
    return -dec*((isWunder||isLong)?0.6:1);
  }
  return 0;
}
// Apply one season of aging to a player. `devMult` already bundles coach×infra×
// academy bonuses; `roleMult` is the playing-time factor (×1.0 first team, ×0.8
// bench/academy — owner decision). Growth scales with the gap to the ceiling, so
// juniors climb fast then taper; ~10% "willPlateau" busts cap a few OVR short.
function applyAgingTo(p,devMult,roleMult){
  const ceil=playerCeiling(p);
  let effCeil=ceil;
  if(p.willPlateau){if(p._plateauGap==null)p._plateauGap=rnd(5,8);effCeil=Math.max(ovrBase(p),ceil-p._plateauGap);}
  const isWunder=p.traits.includes('WUNDERKIND');
  const isLong=p.traits.includes('LONGEVITY');
  const gap=effCeil-ovrBase(p);
  // Owner note #5 (players never reached their peak): two starvation bugs.
  // 1) The 1.3 cap meant a big-gap talent (academy ceiling 30+ above intake) could
  //    only ever bank ~15-25 OVR of growth in his whole window — the advertised
  //    peak was structurally unreachable. Big gaps now grow proportionally faster.
  // 2) The 0.3 floor keeps the last few points trickling in near the ceiling
  //    instead of the taper flattening 3-5 short.
  const gapFactor=gap>0?clamp(Math.max(gap/14,0.3),0,2.2):0;
  SK.forEach(s=>{
    const base=statAgeBaseDelta(p,s,isWunder,isLong);
    let d=0;
    if(base>0&&gap>0){
      let g=base*devMult*roleMult*gapFactor*(0.75+Math.random()*0.5);
      // Probabilistic rounding: a 0.4 growth means +1 with 40% chance instead of
      // always rounding to 0 — small gains keep accruing near the peak.
      d=Math.floor(g)+(Math.random()<(g-Math.floor(g))?1:0);
      if(d>0){
        if(s==='fh'&&p.traits.includes('IRON_ATTACK')&&Math.random()<.6)d++;
        if(s==='bh'&&p.traits.includes('IRON_DEFENSE')&&Math.random()<.6)d++;
        if(s==='srv'&&(p.traits.includes('SERVE_MASTER')||p.traits.includes('AGGR_SERVE'))&&Math.random()<.6)d++;
        if(s==='men'&&(p.traits.includes('STEEL_NERVES')||p.traits.includes('VETERAN'))&&Math.random()<.6)d++;
      }
    }else if(base<0){
      d=Math.round(base*(0.6+Math.random()*0.8));
    }
    if(d!==0)p[s]=Math.max(10,Math.min(getMax(p,s),p[s]+d));
  });
}
// An AI club with the `youthOnly` trait may not sign anyone from the transfer
// market — that restriction is the whole point of the challenge club. For that
// club an expiring contract is therefore not a squad decision, it is the club
// quietly dissolving: every player it grows leaves the season after graduating
// and nothing can replace him. The owner's real season-11 save shows the end
// state — Akademia Orłów was down to ONE senior, below the three the match
// protocol needs. Such a club renews its own people instead of releasing them.
// The human-run version is excluded: the manager renews contracts himself.
function clubMustRetainOwnPlayers(teamId){
  if(teamId===null||teamId===undefined||!store.G)return false;
  const team=store.G.teams.find(t=>t.id===teamId);
  return !!team&&!team.isPlayer&&(team.traits||[]).includes('youthOnly');
}
function retainForClosedClub(p){
  p.contractYears=1+rnd(1,2);
  p.salary=contractExpect(p,p.teamId).salary;
}
// Owner call 2026-07-29: a junior is meant to FINISH the academy. Whether the
// graduate then stays is the club's decision — some are kept, some are let go —
// and it depends on what the club needs and how good he turned out.
//
// Before this, nobody decided: an academy deal was three flat years signed at
// 16-19 against a graduation gate at 21, so most contracts simply lapsed and the
// junior evaporated on his birthday. A club that had paid for an academy was in
// practice stocking the rest of the league.
//
// Returns true when the AI club keeps him. A released graduate is NOT lost —
// he becomes a free agent, which is exactly how the market stays stocked.
function aiKeepsGraduate(p,team){
  if(!team)return false;
  if((team.traits||[]).includes('youthOnly'))return true; // no other source of players
  const seniors=store.G.players.filter(x=>x.teamId===team.id&&!x.retired
    &&x.role!=='youth'&&x.id!==p.id&&(x.contractYears||0)>0);
  // 1) Need: the squad is short, so anyone able to hold a bat is welcome.
  const needed=team.league===1?7:6;
  if(seniors.length<needed)return true;
  // 2) Merit: he is already worth a place, or his ceiling says he soon will be.
  const weakest=seniors.reduce((lo,x)=>ovrBase(x)<ovrBase(lo)?x:lo,seniors[0]);
  if(ovrBase(p)>=ovrBase(weakest))return true;
  if(playerCeiling(p)>=ovrBase(weakest)+6)return true;
  // 3) Otherwise it comes down to how the club is run. A youth-focused board
  //    gives a marginal graduate the benefit of the doubt; most others don't.
  const patient=team.principal?.strategy==='youth'||team.principal?.strategy==='builder';
  return Math.random()<(patient?0.5:0.2);
}
function applyGrowth(){
  const myId=store.G.myTeamId;
  const coach=store.G.staff.find(s=>s.teamId===myId&&s.type==='coach');
  const hallBonus=INFRA_HALL[store.G.infraHall||0].trainingBonus;
  const cb=coach?coach.training:0;
  const coachTrainByTeam=new Map();
  store.G.teams.forEach(t=>{const c=getCoach(t.id);coachTrainByTeam.set(t.id,c&&!c._healthVacation?(c.training||0):0);});
  // v17: same veteran-coach / YOUTH_DEVELOPER academy bonus for every club (player AND AI),
  // so AI academies develop on the same terms as the player's (was player-only before).
  const academyMultByTeam=new Map();
  store.G.teams.forEach(t=>{
    const c=getCoach(t.id);
    const vet=c&&(c.age||40)>=60;
    const onVac=c&&c._healthVacation;
    let m=vet&&!onVac?1.1:1;
    if(c?.coachTraits?.find(tr=>tr.id==='YOUTH_DEVELOPER'))m+=0.08;
    academyMultByTeam.set(t.id,m);
  });
  // Sparring (owner): a deep, quality bench = sparring partners that lift the whole
  // squad's training. Bonus scales with reserve/academy DEPTH (up to 6) × their
  // quality → up to ~+18% development. Makes a 4+6 roster genuinely worth the wages.
  const sparringMultByTeam=new Map();
  store.G.teams.forEach(t=>{
    const res=store.G.players.filter(p=>p.teamId===t.id&&!p.retired&&(p.role==='reserve'||p.role==='youth'));
    const depth=clamp(res.length/6,0,1);
    const quality=res.length?clamp((res.reduce((s,p)=>s+ovrBase(p),0)/res.length)/70,0.3,1.2):0;
    const mentors=store.G.players.filter(p=>p.teamId===t.id&&!p.retired&&p.traits?.includes('MENTOR')).length;
    // MENTOR is a real sparring lever (~+10% dev per mentor, capped influence via count).
    sparringMultByTeam.set(t.id,1+depth*quality*0.18+Math.min(3,mentors)*0.10);
  });
  // Hall bonus per team (player uses G.infraHall; AI uses team.infraHall) — parity.
  const hallMultByTeam=new Map();
  store.G.teams.forEach(t=>{
    const lv=t.id===myId?(store.G.infraHall||0):(t.infraHall||0);
    hallMultByTeam.set(t.id,1+(INFRA_HALL[clamp(lv,0,INFRA_HALL.length-1)].trainingBonus||0)*0.5);
  });
  // v15: Young coach (<30): slower fatigue regen, bigger morale bonus after win
  // v15: Veteran coach (60+): +10% academy bonus, but may be on health vacation
  const coachIsYoung=coach&&(coach.age||40)<30;
  const coachIsVet=coach&&(coach.age||40)>=60;
  const coachOnVacation=coach&&coach._healthVacation;

  store.G.players.forEach(p=>{
    if(p.retired)return;
    p.age++;p.contractYears--;p.careerSeasons++;
    // Loyalty + coach/psych morale for any club with staff.
    if(p.teamId!==null){
      if(p.teamId===myId)p.loyalty=Math.min(10,(p.loyalty||0)+1);
      const teamCoach=store.G.staff.find(s=>s.teamId===p.teamId&&s.type==='coach');
      if(teamCoach&&!teamCoach._healthVacation){
        const motBonus=Math.round((teamCoach.motivation||50)/25);
        p.morale=Math.min(100,(p.morale||50)+motBonus);
      }
      const psyM=psychMatchBoost(p.teamId);
      if(psyM.morale)p.morale=Math.min(100,(p.morale||50)+Math.round(psyM.morale*0.4));
    }
    // Graduation at 21, for EVERY club. The academy contract runs to this point
    // (see genYouthPlayer), so reaching it is normal rather than lucky — what
    // varies is whether the club keeps him. The manager decides for his own
    // club the usual way: the graduate joins the reserves and his contract then
    // enters its final year, which the inbox warns about like any other.
    if(p.role==='youth'&&p.age>=21&&p.teamId!==null){
      const wasMine=p.teamId===myId;
      if(p.contractYears<=0&&clubMustRetainOwnPlayers(p.teamId))retainForClosedClub(p);
      const club=teamById(p.teamId);
      const keep=p.contractYears>0
        &&(wasMine||aiKeepsGraduate(p,club));
      if(keep){
        p.role='reserve';p.isYouth=false;
        if(wasMine)toast(t('season.academyGraduated',{name:p.name,ovr:ovrBase(p)}));
      }else{
        p.teamId=null;p.role='reserve';p.isYouth=false;p.contractYears=0;
        if(wasMine)toast(t('season.academyReleased',{name:p.name}));
      }
    }
    // AI-club players develop in the dedicated AI loop below — running them here
    // too aged them twice per season (with the PLAYER's coach/academy bonuses).
    // This loop's development path covers only the player's club and free agents.
    if(p.teamId!==null&&p.teamId!==myId)return;
    const isYouthAcademy=!!p.isYouth||p.role==='youth';
    // v15: Veteran coach gives +10% academy bonus; YOUTH_DEVELOPER coach +8%.
    const academyMult=isYouthAcademy?(academyMultByTeam.get(myId)||1):1;
    // Development multiplier: coach × hall × academy-infra dev bonus × academy mult.
    const coachTrain=(p.teamId===myId&&coachOnVacation)?0:(coachTrainByTeam.get(p.teamId)||0);
    let devMult=coachDevMultiplier(coachTrain,isYouthAcademy)*academyMult;
    if(p.teamId!==null)devMult*=(hallMultByTeam.get(p.teamId)||1);
    if(isYouthAcademy)devMult*=(1+(INFRA_ACADEMY[clamp(store.G.infraAcademy||0,0,INFRA_ACADEMY.length-1)].devBonus||0));
    devMult*=(sparringMultByTeam.get(p.teamId)||1); // sparring depth bonus
    // Playing-time factor: first team develops fully, bench/academy at ×0.8.
    const roleMult=p.role==='starter'?1.0:0.8;
    applyAgingTo(p,devMult,roleMult);
    p.careerOvr=Math.max(p.careerOvr||0,ovrBase(p));
    if(store.G.playerHistory&&store.G.playerHistory[p.id])store.G.playerHistory[p.id].push(snap(p));
    // Retirement check
    if(p.age>=40&&!p.retired&&Math.random()<0.15*(p.age-39)){retirePlayer(p);}
  });
  // AI clubs (both leagues): same aging engine, driven by THEIR coach + academy + hall.
  store.G.players.filter(p=>!p.retired&&p.teamId!==null&&p.teamId!==myId).forEach(p=>{
    const team=store.G.teams.find(t=>t.id===p.teamId);
    const isYouthAcademy=!!p.isYouth||p.role==='youth';
    const academyMult=isYouthAcademy?(academyMultByTeam.get(p.teamId)||1):1;
    let devMult=coachDevMultiplier(coachTrainByTeam.get(p.teamId)||0,isYouthAcademy)*academyMult;
    if(isYouthAcademy&&team)devMult*=(1+(INFRA_ACADEMY[clamp(team.infraAcademy||0,0,INFRA_ACADEMY.length-1)].devBonus||0));
    devMult*=(hallMultByTeam.get(p.teamId)||1); // AI hall parity
    devMult*=(sparringMultByTeam.get(p.teamId)||1); // sparring depth bonus
    const roleMult=p.role==='starter'?1.0:0.8;
    applyAgingTo(p,devMult,roleMult);
    p.careerOvr=Math.max(p.careerOvr||0,ovrBase(p));
    if(store.G.playerHistory&&store.G.playerHistory[p.id])store.G.playerHistory[p.id].push(snap(p));
    if(p.age>=40&&!p.retired&&Math.random()<0.15*(p.age-39))retirePlayer(p);
  });
  // AI recruitment for both divisions is handled once, with budget/contract
  // checks, by aiSignPlayers() during the rollover. The old L2-only shortcut
  // signed one of the three best free agents without any affordability check,
  // eventually making the entire second division stronger than the first.
  store.G.staff.forEach(s=>{s.contractYears=(s.contractYears||0)-1;});
  if(store.G.prDirector)store.G.prDirector.contractYears=(store.G.prDirector.contractYears||0)-1;
  store.G.teams.forEach(t=>{if(t.prDirector)t.prDirector.contractYears=(t.prDirector.contractYears||0)-1;});
}

function retirePlayer(p){
  p.retired=true;const wm=p.teamId===store.G.myTeamId;p.teamId=null;
  const trophyMap={};(p.awards||[]).forEach(a=>{if(!trophyMap[a.type])trophyMap[a.type]={label:a.displayLabel||a.label,count:0};trophyMap[a.type].count++;});
  store.G.hallOfFame.push({id:p.id,name:p.name,traits:[...p.traits],peakOvr:p.careerOvr||ovrBase(p),
    careerW:p.careerW||0,careerL:p.careerL||0,careerPts:p.careerPts||0,careerSeasons:p.careerSeasons||0,
    retiredAge:p.age,wasMyPlayer:wm,awards:p.awards||[],trophyMap,goatScore:calcGoat(p),
    fh:p.fh,bh:p.bh,srv:p.srv,ret:p.ret,foot:p.foot,men:p.men,nationality:p.nationality,clubHistory:[...(p.clubHistory||[])],
    wrate:(p.careerW||0)+(p.careerL||0)>0?Math.round((p.careerW||0)/((p.careerW||0)+(p.careerL||0))*100):0});
  if(wm)toast(t('season.playerRetired',{name:p.name,age:p.age}));
}

// Keeps a long career lightweight (memory + per-match loop cost). Called once per
// season at the end of endSeason(). Bounds the three things that otherwise grow
// forever (see tests/stress.js): retired player objects, the Hall of Fame, and
// old match rows whose permanent season summaries already live in clubHistory.
function hofRankScore(e){
  if(typeof e.goatScore==='number')return e.goatScore;
  const titles=Object.values(e.trophyMap||{}).reduce((s,t)=>s+(t.count||0),0);
  return titles*50+(e.wrate||0)+(e.peakOvr||0)*5;
}
function pruneCareerData(){
  if(!store.G)return;
  // 1) Keep a broad but bounded transfer shelf. Five candidates per active club
  //    gives the player plenty of choice (120 in the current 24-club world) while
  //    stopping unused free agents from accumulating forever.
  const isFreeAgent=p=>p&&!p.retired&&!p.loanedOut
    &&(p.teamId===null||(p.contractYears||0)<=0)&&p.teamId!==store.G.myTeamId;
  const freeAgents=(store.G.players||[]).filter(isFreeAgent);
  freeAgents.forEach(p=>{p.teamId=null;p.contractYears=0;});
  const freeAgentLimit=Math.max(60,(store.G.teams||[]).length*5);
  if(freeAgents.length>freeAgentLimit){
    const retentionScore=p=>{
      const current=ovrBase(p);
      const upside=Math.max(0,playerCeiling(p)-current);
      const youthBonus=Math.max(0,27-(p.age||27))*0.4;
      return current+upside*0.18+youthBonus;
    };
    // A scouted player is not surplus: the manager PAID a mission to find him and
    // his report is sitting on the scouting screen waiting to be signed. Culling
    // him under the population cap threw away what the club bought.
    const scouted=new Set((store.G.scoutResults||[]).map(r=>r&&r.realId).filter(id=>id!==undefined));
    const keepIds=new Set([...freeAgents]
      .sort((a,b)=>retentionScore(b)-retentionScore(a)||(a.id||0)-(b.id||0))
      .slice(0,freeAgentLimit)
      .map(p=>p.id));
    scouted.forEach(id=>keepIds.add(id));
    freeAgents.filter(p=>!keepIds.has(p.id)).forEach(p=>{
      const hasCareer=((p.careerW||0)+(p.careerL||0))>0||(p.awards||[]).length>0;
      if(hasCareer)retirePlayer(p);
      else p.retired=true;
    });
  }
  // 2) Retired players survive only as HoF summaries — drop the heavy objects so
  //    the active roster array can't balloon to thousands over a long career.
  if(Array.isArray(store.G.players)){
    store.G.players=store.G.players.filter(p=>!p.retired);
    const live=new Set(store.G.players.map(p=>p.id));
    if(store.G.playerHistory)Object.keys(store.G.playerHistory).forEach(k=>{if(!live.has(Number(k)))delete store.G.playerHistory[k];});
    if(Array.isArray(store.G.transferMarket))store.G.transferMarket=store.G.transferMarket.filter(row=>live.has(row.playerId));
    if(Array.isArray(store.G.marketShortlist))store.G.marketShortlist=store.G.marketShortlist.filter(id=>live.has(id));
    if(Array.isArray(store.G.marketCompare))store.G.marketCompare=store.G.marketCompare.filter(id=>live.has(id));
    if(Array.isArray(ui.marketCompare))ui.marketCompare=ui.marketCompare.filter(id=>live.has(id));
    // A scout report is a pointer too. The scouted player is a free agent, so the
    // population cap can cull him — and the report stayed on the scouting screen
    // pointing at nobody, clickable forever with nothing happening.
    if(Array.isArray(store.G.scoutResults))store.G.scoutResults=store.G.scoutResults.filter(r=>r&&live.has(r.realId));
  }
  // 3) Staff history exists to chart people who can still be inspected. Once a
  //    staff member has retired from every role and pool, the snapshots go too.
  if(store.G.staffHistory){
    const liveStaffIds=new Set([
      ...(store.G.staff||[]),...(store.G.staffPool||[]),...(store.G.scoutPool||[]),
      ...(store.G.prDirectorPool||[]),store.G.prDirector,
      ...(store.G.teams||[]).map(t=>t.prDirector),
    ].filter(Boolean).map(s=>s.id));
    Object.keys(store.G.staffHistory).forEach(k=>{if(!liveStaffIds.has(Number(k)))delete store.G.staffHistory[k];});
  }
  // 4) Hall of Fame holds only the 20 greatest lightweight career summaries.
  if(Array.isArray(store.G.hallOfFame)&&store.G.hallOfFame.length>20){
    store.G.hallOfFame.sort((a,b)=>hofRankScore(b)-hofRankScore(a));
    store.G.hallOfFame.length=20;
  }
  // 5) Full match rows are only needed for the current and previous season.
  //    Permanent club statistics and top performers live in the compact
  //    clubHistory ledger, so retaining every old fixture only bloats saves.
  // Head-to-head totals are permanent; the fixtures behind them are not. Fold
  // before dropping, so a club's rivalry history survives the prune (and so a
  // career that predates the ledger backfills whatever it still carries).
  window.PPM.gameplayClubUI?.foldAllSeasonsIntoRivalries?.();
  const keepFrom=(store.G.season||1)-1;
  if(Array.isArray(store.G.results)){
    store.G.results=store.G.results.filter(r=>(r.season||0)>=keepFrom);
  }
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// v16: RECORDS TRACKING
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function updateRecords(){
  if(!store.G)return;
  store.G.records=store.G.records||{};
  const mt=myTeam();
  // Caretaker mode (background world generation): with no player club the
  // records are set by the WORLD — the best club/player of the season. That is
  // the point of pre-history: records-to-beat already exist at handover.
  const recordTeam=mt||[...store.G.teams].sort((a,b)=>(b.pts||0)-(a.pts||0))[0];
  const fewestTeam=mt||[...store.G.teams].sort((a,b)=>(a.ga||0)-(b.ga||0))[0];
  const playerPool=mt?myPlayers():store.G.players.filter(p=>!p.retired&&p.teamId!==null);
  const myL=mt?myLeague():1;
  const sorted=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>b.pts-a.pts);
  const myPos=mt?(sorted.findIndex(t=>t.isPlayer)+1):0;

  // Perfect season check
  if(recordTeam&&recordTeam.pts>=66&&!store.G.records.PERFECT_SEASON){
    store.G.records.PERFECT_SEASON={season:store.G.season,club:recordTeam.name,pts:recordTeam.pts};
    if(mt)toast(t('season.perfectRecord'));
  }

  // Fewest sets lost (approximation via ga)
  const prevFewest=store.G.records.FEWEST_SETS_LOST;
  if(fewestTeam&&(!prevFewest||fewestTeam.ga<prevFewest.setsLost)){
    store.G.records.FEWEST_SETS_LOST={season:store.G.season,club:fewestTeam.name,setsLost:fewestTeam.ga};
  }

  // Most wins by player
  const topPlayer=playerPool.sort((a,b)=>(b.leagueSeasonW||0)-(a.leagueSeasonW||0))[0];
  if(topPlayer&&topPlayer.leagueSeasonW>0){
    const prevMostW=store.G.records.MOST_WINS_PLAYER;
    if(!prevMostW||topPlayer.leagueSeasonW>prevMostW.wins){
      store.G.records.MOST_WINS_PLAYER={season:store.G.season,playerName:topPlayer.name,wins:topPlayer.leagueSeasonW};
    }
  }
  
  // Highest OVR ever
  store.G.players.filter(p=>!p.retired).forEach(p=>{
    const pOvr=Math.max(p.careerOvr||0,ovrBase(p),ovr(p));
    const prevHigh=store.G.records.HIGHEST_OVR;
    if(!prevHigh||pOvr>prevHigh.ovr){
      store.G.records.HIGHEST_OVR={playerName:p.name,ovr:pOvr,season:store.G.season};
    }
  });
  
  // Longest streak: my club in career mode; the season's best run in caretaker mode.
  const streakTeams=mt?[mt]:store.G.teams;
  let bestStreak={streak:0,club:null};
  streakTeams.forEach(t=>{
    const res=store.G.results.filter(r=>r.season===store.G.season&&(r.homeId===t.id||r.awayId===t.id)).sort((a,b)=>a.matchday-b.matchday);
    let cur=0,mx=0;
    res.forEach(r=>{
      const won=(r.homeId===t.id&&r.homeWin)||(r.awayId===t.id&&!r.homeWin&&!r.isDraw);
      if(won||r.isDraw){cur++;mx=Math.max(mx,cur);}else{cur=0;}
    });
    if(mx>bestStreak.streak)bestStreak={streak:mx,club:t.name};
  });
  const prevStreak=store.G.records.LONGEST_STREAK;
  if(bestStreak.club&&(!prevStreak||bestStreak.streak>prevStreak.streak)){
    store.G.records.LONGEST_STREAK={season:store.G.season,club:bestStreak.club,streak:bestStreak.streak};
  }

  // Manager prestige update (career only — pre-history has no manager)
  if(mt){
    if(myPos===1){store.G.managerPrestige=(store.G.managerPrestige||0)+15;}
    else if(myPos<=3){store.G.managerPrestige=(store.G.managerPrestige||0)+8;}
    else if(myPos<=6){store.G.managerPrestige=(store.G.managerPrestige||0)+3;}
    if(myL===1){store.G.managerPrestige=(store.G.managerPrestige||0)+5;}
    store.G.managerPrestige=Math.min(100,store.G.managerPrestige||0);
  }
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// SEASON AWARDS + PROMOTION/RELEGATION
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function giveSeasonAwards(){
  const myId=store.G.myTeamId;
  const allStarters=store.G.players.filter(p=>!p.retired&&p.teamId!==null&&p.role==='starter');
  const awards=[];
  if(allStarters.length){
    const teamMatches=new Map();
    store.G.teams.forEach(t=>teamMatches.set(t.id,store.G.results.filter(r=>r.season===store.G.season&&(r.homeId===t.id||r.awayId===t.id)).length));
    const appearances=p=>(p.leagueSeasonW||0)+(p.leagueSeasonL||0)+(p.leagueSeasonD||0);
    const eligible=allStarters.filter(p=>appearances(p)>=Math.ceil((teamMatches.get(p.teamId)||0)*0.75)&&appearances(p)>0);
    const awardPool=eligible.length?eligible:allStarters.filter(p=>appearances(p)>0);
    const diffPerMatch=p=>(((p.leagueSeasonPointsWon||0)-(p.leagueSeasonPointsLost||0))/Math.max(1,appearances(p)));
    const lostPerMatch=p=>((p.leagueSeasonPointsLost||0)/Math.max(1,appearances(p)));
    const topImpact=Math.max(...awardPool.map(diffPerMatch));
    if(topImpact>-999){
      awardPool.filter(p=>diffPerMatch(p)===topImpact).forEach(p=>{
        p.awards=p.awards||[];
        p.awards.push({season:store.G.season,type:'golden_paddle',clubName:teamName(p.teamId),displayLabel:'Z\u0142ota Paletka',label:`Z\u0142ota Paletka S${store.G.season}`});
        // forLeague awards can go to ANY club's player (incl. one we pre-signed
        // who still plays elsewhere) \u2014 always carry the club so the gala/log
        // can't read as if OUR club's award went to a player who isn't here yet.
        awards.push({player:p.name,club:teamName(p.teamId),type:'golden_paddle',label:'Z\u0142ota Paletka',forLeague:true});
      });
    }
    const defensePool=awardPool;
    if(defensePool.length){
      const leastPointsLost=Math.min(...defensePool.map(lostPerMatch));
      defensePool.filter(p=>lostPerMatch(p)===leastPointsLost).forEach(p=>{
        p.awards=p.awards||[];
        p.awards.push({season:store.G.season,type:'iron_paddle',clubName:teamName(p.teamId),displayLabel:'\u017belazna Paletka',label:`\u017belazna Paletka S${store.G.season}`});
        awards.push({player:p.name,club:teamName(p.teamId),type:'iron_paddle',label:'\u017belazna Paletka',forLeague:true});
      });
    }
  }
  // Champion of each league
  [1,2].forEach(league=>{
    const srt=store.G.teams.filter(t=>t.league===league).sort((a,b)=>b.pts-a.pts);
    const champ=srt[0];
    if(league===1){
      store.G.players.filter(p=>p.teamId===champ.id&&!p.retired&&p.role==='starter').forEach(p=>{p.awards=p.awards||[];p.awards.push({season:store.G.season,type:'league_champion',clubName:champ.name,displayLabel:'Mistrz I Ligi',label:`Mistrz I Ligi S${store.G.season}`});if(p.teamId===myId)awards.push({player:p.name,club:champ.name,type:'league_champion',label:'Mistrz I Ligi'});});
    }
  });
  return awards;
}

function doPromotionRelegation(){
  const l1=store.G.teams.filter(t=>t.league===1).sort((a,b)=>b.pts-a.pts);
  const l2=store.G.teams.filter(t=>t.league===2).sort((a,b)=>b.pts-a.pts);
  const relegated=[l1[l1.length-1],l1[l1.length-2]]; // bottom 2 of L1
  const promoted=[l2[0],l2[1]]; // top 2 of L2
  const promoNames=promoted.map(t=>t.name);
  const releNames=relegated.map(t=>t.name);
  const changes=[
    ...relegated.map(t=>({teamId:t.id,toLeague:2})),
    ...promoted.map(t=>({teamId:t.id,toLeague:1})),
  ];
  store.G.pendingLeagueChanges=changes;
  return{promoted:promoNames,relegated:releNames,changes};
}
function applyPendingPromotionRelegation(){
  (store.G.pendingLeagueChanges||[]).forEach(change=>{
    const team=store.G.teams.find(t=>t.id===change.teamId);
    if(team)team.league=change.toLeague;
  });
  store.G.pendingLeagueChanges=[];
}

function buildMatchProgression(){const prog={};store.G.teams.forEach(t=>{prog[t.id]=[];});store.G.results.filter(r=>r.season===store.G.season).forEach(r=>{const hSnap=prog[r.homeId]||(prog[r.homeId]=[]);const aSnap=prog[r.awayId]||(prog[r.awayId]=[]);const hp=hSnap.length?hSnap[hSnap.length-1]:0;const ap=aSnap.length?aSnap[aSnap.length-1]:0;const tp=tablePointsFor(r);hSnap.push(hp+tp.h);aSnap.push(ap+tp.a);});return prog;}

function buildBudgetEntry(wages,prize,sponsorIncome,maint){
  const finance=ensureSeasonFinance()||{};
  // The season-finance ledger already accumulated the params at the call site —
  // finance.prize also holds cup + Top 12 premia, so params only serve as
  // fallbacks; overwriting entry.prize with the league-only param understated net.
  const entry={...finance,season:store.G.season};
  entry.wages=entry.wages||wages;
  entry.prize=entry.prize||prize;
  entry.sponsorIncome=entry.sponsorIncome||sponsorIncome;
  entry.maint=entry.maint||maint;
  entry.net=(entry.tickets||0)+(entry.merch||0)+(entry.prize||0)+(entry.sponsorIncome||0)+(entry.tvRights||0)+(entry.boardReward||0)+(entry.techPartnership||0)+(entry.other||0)-((entry.wages||0)+(entry.maint||0)+(entry.transfersIn||0)+(entry.infraCost||0)+(entry.staffBuyouts||0)+(entry.prDirectorCost||0)+(entry.brandCosts||0));
  return entry;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// CUP ROUND PLAY
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function shouldPlayCup(){
  if(!store.G.cup||store.G.cup.finished)return false;
  return store.G.matchday>0&&store.G.matchday%4===0&&!store.G.cupPlayedThisSeason;
}

async function playCupRound(){
  // Full gate (incl. cupPlayedThisSeason): one cup round per 4-matchday window —
  // without it a re-click played the ENTIRE bracket in one sitting.
  if(!shouldPlayCup())return;
  if(blockForInjuredStarter(store.G.myTeamId,'match.cupBlocked'))return;
  await checkpointCareer('tournament');
  const result=await runSeededEvent('_cupRoundSeed',playCupRoundBody);
  await flushCareerSave();
  return result;
}
async function playCupRoundBody(){
  const cup=store.G.cup;
  const round=cup.rounds[cup.currentRound];
  if(!round)return;
  
  store.G.cupPlayedThisSeason=true;
  const modal=document.getElementById('modal');modal.className='modal modal-xl';
  const roundNames=['1/16','1/8',t('cup.quarterfinal'),t('cup.semifinal'),t('cup.final')];
  const roundName=roundNames[Math.min(cup.currentRound,roundNames.length-1)];
  
  modal.innerHTML=`<div class="mt2">${t('cup.title').toUpperCase()}: ${roundName}</div>
    <div id="cup-vme" class="mb10"></div>
    <div id="cup-matches" class="mb12 grid gtcfill240 gp4"></div>
    <div class="log" id="cup-log" style="height:160px"></div>`;
  openModal();
  
  const matchesEl=document.getElementById('cup-matches');
  const logEl=document.getElementById('cup-log');
  const vmeEl=document.getElementById('cup-vme');
  function addLog(t,c=''){const d=document.createElement('div');d.className=c;d.textContent=t;logEl.appendChild(d);logEl.scrollTop=logEl.scrollHeight;}
  
  const myId=store.G.myTeamId;
  const nextRound=[];
  
  addLog(t('cupLog.header',{round:roundName,count:round.length}),'hl');
  await matchPause(500);
  
  // Render all matches bracket
  function renderCupBracket(activeIdx){
    matchesEl.innerHTML=round.map((m,i)=>{
      const isMy=(m.home.isReal&&m.home.id===myId)||(m.away.isReal&&m.away.id===myId);
      const hasResult=!!m.result;
      const cls=i===activeIdx?'playing':hasResult?(isMy?(m.result.winner&&((m.result.winner.isReal&&m.result.winner.id===myId))?'win':'loss'):''):'pending';
      return`<div class="mr ${cls}"><div class="mr-t home fs10">${m.home.name}</div><div class="mr-sc ${i===activeIdx?'live':''} fs12">${hasResult?m.result.score:'-'}</div><div class="mr-t fs10">${m.away.name}</div></div>`;
    }).join('');
  }
  renderCupBracket(-1);
  
  for(let i=0;i<round.length;i++){
    const m=round[i];
    if(m.home.isBye){nextRound.push(m.away);m.result={score:'BYE',winner:m.away};renderCupBracket(i);continue;}
    if(m.away.isBye){nextRound.push(m.home);m.result={score:'BYE',winner:m.home};renderCupBracket(i);continue;}
    
    const isMyMatch=(m.home.isReal&&m.home.id===myId)||(m.away.isReal&&m.away.id===myId);
    
    if(isMyMatch&&m.home.isReal&&m.away.isReal){
      // VME for our match, ensure our team is always "home" (left side) in display
      renderCupBracket(i);
      addLog(`\n\u2605 ${m.home.name} vs ${m.away.name}`,'hl');
      await matchPause(600);
      
      const r=simTeamMatch(m.home.id,m.away.id,true);
      const weAreHome=m.home.id===myId;
      // For VME display: swap teams so ours is always left
      const displayHome=weAreHome?store.G.teams.find(t=>t.id===m.home.id):store.G.teams.find(t=>t.id===m.away.id);
      const displayAway=weAreHome?store.G.teams.find(t=>t.id===m.away.id):store.G.teams.find(t=>t.id===m.home.id);
      
      let hScore=0,aScore=0;
      for(let mi=0;mi<r.matchups.length;mi++){
        const mu=r.matchups[mi];
        // Remap for display if we swapped
        const cupFlip=m2=>({...m2,homeWin:!m2.homeWin,hs:m2.as,as:m2.hs,homePlayer:m2.awayPlayer,awayPlayer:m2.homePlayer,homePair:m2.awayPair||null,awayPair:m2.homePair||null,homeName:m2.awayName,awayName:m2.homeName,momentum:-(m2.momentum||0),setScores:(m2.setScores||[]).map(s=>({home:s.away,away:s.home}))});
        const displayMu=weAreHome?mu:cupFlip(mu);
        const displayMatchups=r.matchups.map(m2=>weAreHome?m2:cupFlip(m2));
        // Remove momentum from VME for cup
        vmeEl.innerHTML=renderVME(displayHome,displayAway,displayMatchups,mi,hScore,aScore,true,{setIndex:0,home:0,away:0});
        await matchPause(400);
        for(let si=0;si<(displayMu.setScores||[]).length;si++){
          const timeline=buildSetTimeline(displayMu.setScores[si]);
          for(let pi=0;pi<timeline.length;pi++){
            const state=timeline[pi];
            vmeEl.innerHTML=renderVME(displayHome,displayAway,displayMatchups,mi,hScore,aScore,true,{setIndex:si,home:state.home,away:state.away});
            await matchPause(pi===timeline.length-1?210:100);
          }
          addLog(`    Set ${si+1}: ${displayMu.setScores[si].home}:${displayMu.setScores[si].away}`,'dm');
        }
        if(displayMu.homeWin)hScore++;else aScore++;
        vmeEl.innerHTML=renderVME(displayHome,displayAway,displayMatchups,mi,hScore,aScore,true,{setIndex:(displayMu.setScores||[]).length,home:0,away:0});
        const ww=displayMu.homeWin;
        addLog(`  ${displayMu.type==='double'?t('matchLog.doubles')+' ':''}${displayMu.homeName||playerName(displayMu.homePlayer)} vs ${displayMu.awayName||playerName(displayMu.awayPlayer)}: ${displayMu.hs}:${displayMu.as}`,ww?'gd':'bd');
        await matchPause(1000);
      }
      
      const winner=r.homeWin?m.home:m.away;
      const loser=r.homeWin?m.away:m.home;
      m.result={score:r.score,winner,loser,matchups:r.matchups};
      nextRound.push(winner);
      renderCupBracket(i);
      
      const myWon=(winner.isReal&&winner.id===myId);
      addLog(t(myWon?'matchLog.win':'matchLog.loss',{score:r.score}),myWon?'gd':'bd');
      await matchPause(800);
      vmeEl.innerHTML='';
    }else if(isMyMatch){
      // My match vs amateur
      renderCupBracket(i);
      const r=simCupMatch(m.home,m.away);
      const winner=r.homeWin?m.home:m.away;
      const loser=r.homeWin?m.away:m.home;
      m.result={score:r.score,winner,loser,matchups:r.matchups};
      nextRound.push(winner);
      const myWon=(winner.isReal&&winner.id===myId);
      addLog(`\u2605 ${m.home.name} vs ${m.away.name}: ${r.score}${r.tiebreak?` (${t('cupLog.tiebreak')})`:''}`,myWon?'gd':'bd');
      renderCupBracket(i);
      await matchPause(1200);
    }else{
      const r=simCupMatch(m.home,m.away);
      const winner=r.homeWin?m.home:m.away;
      const loser=r.homeWin?m.away:m.home;
      // loser must be recorded here too — the finalist/semi/quarter prize payout
      // reads match.result.loser, so AI clubs knocked out in AI-vs-AI ties got €0.
      m.result={score:r.score,winner,loser};
      nextRound.push(winner);
      addLog(`  ${m.home.name} vs ${m.away.name}: ${r.score} -> ${winner.name}`,'dm');
      renderCupBracket(i);
      await matchPause(200);
    }
  }
  
  cup.currentRound++;
  
  if(nextRound.length<=1){
    cup.finished=true;cup.winner=nextRound[0];
    addLog(t('cupLog.winner',{name:cup.winner.name}),'hl');
    const cupPrizeTable={winner:35000,finalist:18000,semifinal:9000,quarterfinal:4500};
    const finalRound=cup.rounds[cup.rounds.length-1]||[];
    const semiRound=cup.rounds[cup.rounds.length-2]||[];
    const quarterRound=cup.rounds[cup.rounds.length-3]||[];
    const rewardCupTeam=(teamId,amount,label)=>{
      const team=store.G.teams.find(t=>t.id===teamId);
      if(!team||!amount)return;
      team.budget=(team.budget||0)+amount;
      if(teamId===myId){
        const finance=ensureSeasonFinance();
        if(finance)finance.prize+=amount;
        addLog(t('cupLog.prize',{label:t(label),amount:formatCurrency(amount)}),'gd');
      }
    };
    if(cup.winner.isReal)rewardCupTeam(cup.winner.id,cupPrizeTable.winner,'cupLog.prizeWinner');
    finalRound.forEach(match=>{if(match.result?.loser?.isReal)rewardCupTeam(match.result.loser.id,cupPrizeTable.finalist,'cupLog.prizeFinalist');});
    semiRound.forEach(match=>{if(match.result?.loser?.isReal)rewardCupTeam(match.result.loser.id,cupPrizeTable.semifinal,'cupLog.prizeSemifinal');});
    quarterRound.forEach(match=>{if(match.result?.loser?.isReal)rewardCupTeam(match.result.loser.id,cupPrizeTable.quarterfinal,'cupLog.prizeQuarterfinal');});
    if(cup.winner.isReal&&cup.winner.id===myId){
      pushNews('news.cupWinner','cup',{club:myTeam().name,prize:formatCurrency(cupPrizeTable.winner)});
      store.G.players.filter(p=>p.teamId===myId&&!p.retired&&p.role==='starter').forEach(p=>{
        p.awards=p.awards||[];
        p.awards.push({season:store.G.season,type:'cup_winner',clubName:myTeam().name,displayLabel:'Puchar Polski',label:`Puchar Polski S${store.G.season}`});
      });
    }
    await matchPause(1000);
  }else{
    const newRoundMatches=[];
    for(let i=0;i<nextRound.length;i+=2){
      newRoundMatches.push({home:nextRound[i],away:nextRound[i+1]||{id:'bye',name:'BYE',isBye:true},result:null});
    }
    cup.rounds.push(newRoundMatches);
    addLog(t('cupLog.nextRound',{count:nextRound.length}),'hl');
  }
  
  await matchPause(1200);
  closeModal();render();updateHeader();
  persistGame();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// CANVAS VME - 60fps ball with motion blur
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
let _vmeRaf=null;
function initCanvasVME(){return null;}
function stopCanvasVME(){if(_vmeRaf){cancelAnimationFrame(_vmeRaf);_vmeRaf=null;}}

function buildSetTimeline(setScore){
  const targetHome=setScore?.home||0;
  const targetAway=setScore?.away||0;
  let home=0,away=0;
  const timeline=[];
  while(home<targetHome||away<targetAway){
    const homeRemaining=targetHome-home;
    const awayRemaining=targetAway-away;
    let homeWinsPoint=false;
    if(homeRemaining<=0)homeWinsPoint=false;
    else if(awayRemaining<=0)homeWinsPoint=true;
    else if(homeRemaining===awayRemaining)homeWinsPoint=Math.random()>.5;
    else homeWinsPoint=Math.random()<(homeRemaining/(homeRemaining+awayRemaining));
    if(homeWinsPoint)home++;else away++;
    timeline.push({home,away});
  }
  return timeline;
}
function momentumHint(momentum){
  if(momentum>=22)return{label:t('vme.momentumStrong'),color:'var(--g)',pct:64};
  if(momentum>=10)return{label:t('vme.momentumSlight'),color:'var(--g)',pct:57};
  if(momentum<=-22)return{label:t('vme.momentumOpponentStrong'),color:'var(--r)',pct:36};
  if(momentum<=-10)return{label:t('vme.momentumOpponentSlight'),color:'var(--r)',pct:43};
  return{label:t('vme.momentumEven'),color:'var(--gold)',pct:50};
}


function renderVME(homeTeam,awayTeam,matchups,currentIdx,homeScore,awayScore,hideMomentum,livePointState){
  const homeIsMine=homeTeam.id===store.G.myTeamId; // which side is OUR club
  const hS=getMatchStarters(homeTeam.id);
  const aS=getMatchStarters(awayTeam.id);
  const mu=matchups[currentIdx];
  // Show the ACTUAL committed duelists (matchups store player ids) — re-deriving
  // from getMatchStarters at render time showed the wrong card whenever the live
  // roster order differed from the one used at simulation time.
  const findP=id=>store.G.players.find(p=>p.id===id);
  // Doubles matchup: render a merged card for the pair (both names, averaged look).
  const resolveSide=(single,pairIds,fallback)=>{
    if(pairIds&&pairIds.length===2){
      const m1=findP(pairIds[0]),m2=findP(pairIds[1]);
      if(m1&&m2)return{...m1,name:`${m1.name.split(' ').pop()} / ${m2.name.split(' ').pop()}`,_pairTraits:[]};
      return m1||m2||fallback;
    }
    return findP(single)||fallback;
  };
  const hp=(mu&&resolveSide(mu.homePlayer,mu.homePair,hS[currentIdx]||hS[0]))||hS[currentIdx]||hS[0];
  const ap=(mu&&resolveSide(mu.awayPlayer,mu.awayPair,aS[currentIdx]||aS[0]))||aS[currentIdx]||aS[0];
  const momentum=mu?mu.momentum:0;
  let momMeta=momentumHint(momentum);
  const muDone=(livePointState?.setIndex??0)>=(mu?.setScores||[]).length&&((mu?.setScores||[]).length>0);

  let homeSets='',awaySets='';
  // First-to-3: up to 5 games (4 singles + the double).
  for(let i=0;i<5;i++){
    const mu2=matchups[i];
    // Results are pre-committed for the whole match — only reveal a duel's dot
    // once that duel has been replayed, or all outcomes are spoiled from duel 1.
    const revealed=i<currentIdx||(i===currentIdx&&muDone);
    if(!mu2||!revealed){homeSets+=`<div class="vme-set"></div>`;awaySets+=`<div class="vme-set"></div>`;}
    else if(mu2.homeWin){homeSets+=`<div class="vme-set won"></div>`;awaySets+=`<div class="vme-set lost"></div>`;}
    else{homeSets+=`<div class="vme-set lost"></div>`;awaySets+=`<div class="vme-set won"></div>`;}
  }

  // Traits with tooltips for players in VME
  const traitHtml=(p)=>p?(p.traits||[]).slice(0,2).map(id=>`<span class="has-tooltip tb ${TRAITS[id]?.type||'men'} fs9" style="padding:2px 4px">${t(`trait.${id}.label`)}<span class="tip">${t(`trait.${id}.desc`)}</span></span>`).join(''):'';
  const finishedSets=Math.max(0,livePointState?.setIndex||0);
  // Set pills: OUR won sets green, lost sets red (owner request — readable at a glance).
  const setLine=(mu?.setScores||[]).slice(0,finishedSets).map((s,i)=>{
    const weWonSet=homeIsMine?(s.home>s.away):(s.away>s.home);
    const bg=weWonSet?'var(--g)':'var(--r)';
    return`<span style="padding:4px 10px;border-radius:999px;background:${bg};color:#fff;font-weight:800;font-size:13px">S${i+1} ${s.home}:${s.away}</span>`;
  }).join('');
  const micro=mu?.micro||null;
  const liveHome=livePointState?.home??0;
  const liveAway=livePointState?.away??0;
  const currentSetNo=Math.min((livePointState?.setIndex||0)+1,(mu?.setScores||[]).length||1);
  const matchupFinished=muDone;
  if(livePointState){
    const finSets=(mu?.setScores||[]).slice(0,Math.max(0,livePointState.setIndex||0));
    let hSetW=0,aSetW=0;finSets.forEach(s=>{if(s.home>s.away)hSetW++;else aSetW++;});
    const initScore=(momentum||0)*0.5+(liveHome-liveAway)*2.2+(hSetW-aSetW)*7;
    const pct=clamp(Math.round(50+initScore),12,88);
    const color=initScore>6?'var(--g)':initScore<-6?'var(--r)':'var(--gold)';
    const label=t(initScore>14?'vme.momentumStrong':initScore>6?'vme.momentumSlight':initScore<-14?'vme.momentumOpponentStrong':initScore<-6?'vme.momentumOpponentSlight':'vme.momentumEven');
    momMeta={pct,color,label};
  }
  const playerHud=(p,side,won)=>p?`<div class="vme-pcard ${won?'active':''} r18 ovh" style="background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(246,241,234,.92));box-shadow:0 16px 28px rgba(25,18,10,.14);border:1px solid rgba(122,91,52,.14)">
        <div style="display:flex;align-items:center;gap:10px;padding:12px 12px 8px 12px;border-bottom:1px solid rgba(122,91,52,.1);background:${side==='home'?'linear-gradient(135deg,rgba(192,40,24,.08),rgba(255,255,255,.55))':'linear-gradient(135deg,rgba(32,112,64,.08),rgba(255,255,255,.55))'}">
          <img src="${getAvatarData(p,'player')}" alt="${p.name}" class="r16" style="width:56px;height:56px;object-fit:cover;border:2px solid rgba(255,255,255,.8);box-shadow:0 6px 14px rgba(0,0,0,.12)">
          <div class="minw0 flx1">
            <div class="syne b8 fs15" style="line-height:1.05;color:#241a12">${p.name}</div>
            <div class="fs10 ink3 mt-3">${t('vme.playerAgePeak',{age:p.age,peak:p.peakAge||'?'})}</div>
            <div style="font-size:10px;font-weight:700;color:${(PLAYER_STYLE_INFO[p.playStyle]||{}).color||'var(--ink2)'};margin-top:3px">${styleLabel(p.playStyle)}</div>
          </div>
          <div class="tar">
            <div class="fs10 ink3 up ls1">OVR</div>
            <div style="font-family:'Saira Condensed',sans-serif;font-size:28px;line-height:1;font-weight:800;color:${side==='home'?'var(--r)':'var(--g)'}">${ovr(p)}</div>
          </div>
        </div>
        <div style="padding:10px 12px 12px">
          <div style="margin:0 0 7px 0;min-height:22px">${traitHtml(p)}</div>
          <div class="vme-pcard-stats">${SK.map(s=>`<div class="vme-pcard-stat"><div class="lbl">${SL[s]}</div><div class="val" style="color:${({fh:'var(--r2)',bh:'#c04890',srv:'#d4a830',ret:'#8060c0',foot:'#5090d0',men:'#60c878'}[s]||'var(--ink)')}">${p[s]}</div></div>`).join('')}</div>
          <div class="grid gtc1a gp8 aic mt-8">
            <div><div class="fs9 mb4" style="color:#555">${t('player.fatigue')}</div><div class="vme-pcard-fat"><div class="vme-pcard-fat-fill" style="width:${p.fatigue||0}%;background:${(p.fatigue||0)>70?'var(--r2)':'var(--orange)'}"></div></div></div>
            <div class="fs10 ink3">${t('vme.morale')} <b>${p.morale||50}</b></div>
          </div>
        </div>
      </div>`:'';

  const html=`<div class="vme">
    <div class="vme-scoreboard">
      <div class="vme-team"><div class="vme-team-name">${homeTeam.name}</div><div class="vme-team-ovr">OVR ${teamOvr(homeTeam.id)}</div><div class="vme-sets">${homeSets}</div></div>
      <div class="vme-score"><div class="vme-score-num">${homeScore}</div><div class="vme-score-sep">:</div><div class="vme-score-num">${awayScore}</div></div>
      <div class="vme-team away"><div class="vme-team-name">${awayTeam.name}</div><div class="vme-team-ovr">OVR ${teamOvr(awayTeam.id)}</div><div class="vme-sets">${awaySets}</div></div>
    </div>
    ${hideMomentum?'':`<div class="vme-momentum">
      <div class="vme-mom-bar"><div class="vme-mom-fill" style="width:${momMeta.pct}%;background:${momMeta.color}"></div></div>
      <div class="vme-mom-label jcc"><span style="color:${momMeta.color};font-weight:700">${t('vme.initiative')}</span></div>
      <div style="text-align:center;font-size:10px;color:${momMeta.color};margin-top:5px">${momMeta.label}</div>
    </div>`}
    <div class="vme-cards">
      ${playerHud(hp,'home',!!(mu&&mu.homeWin&&matchupFinished))}
      <div class="vme-center">
        <div class="vme-match-index">${t('vme.matchIndex',{current:currentIdx+1,total:4})}</div>
        <div class="vme-match-style">${mu?.styleEdge||t('vme.neutralDuel')}</div>
        <div class="vme-setline">${setLine||`<span class="fs10" style="color:#8f8a80">${t('vme.setsPending')}</span>`}</div>
        <div class="mt-10">
          <div class="fs10 ink3 up ls1">${t('vme.currentSet',{number:currentSetNo})}</div>
          <div class="syne fs30 b8"><span style="color:${liveHome>liveAway?'var(--g)':liveHome<liveAway?'var(--r)':'var(--ink2)'}">${liveHome}</span><span class="ink3">:</span><span style="color:${liveAway>liveHome?'var(--g)':liveAway<liveHome?'var(--r)':'var(--ink2)'}">${liveAway}</span></div>
          <div class="fs10 ink3">${t('vme.livePoints')}</div>
        </div>
      </div>
      ${playerHud(ap,'away',!!(mu&&!mu.homeWin&&matchupFinished))}
    </div>
    ${mu?`<div class="mt-10 pd10-12 bb1 r10" style="background:rgba(255,255,255,.5)">
      <div class="flex jcb gp8 aic fwrap mb8">
        <div class="fs11 b7 ink2">${t('vme.duelStats')}</div>
        <div class="fs10 ink3">${t('vme.fullStatsAfter')}</div>
      </div>
      ${(micro&&matchupFinished)?`<div class="grid gp8 fs10" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
        <div><div class="ink3">${t('vme.points')}</div><div class="b7">${micro.homePoints}:${micro.awayPoints}</div></div>
        <div><div class="ink3">${t('vme.aces')}</div><div class="b7">${micro.homeAces}:${micro.awayAces}</div></div>
        <div><div class="ink3">${t('vme.winners')}</div><div class="b7">${micro.homeWinners}:${micro.awayWinners}</div></div>
        <div><div class="ink3">${t('vme.errors')}</div><div class="b7">${micro.homeErrors}:${micro.awayErrors}</div></div>
        <div><div class="ink3">${t('vme.longestRally')}</div><div class="b7">${micro.longestRally}</div></div>
        <div><div class="ink3">${t('vme.closeSets')}</div><div class="b7">${micro.closestSets}</div></div>
      </div>`:''}
    </div>`:''}
  </div>`;
  return html;
}
function matchdayModalTitle(league,current){
  return t('match.modalTitle',{
    current,
    total:TOTAL_MATCHDAYS,
    division:t(league===1?'league.divisionOne':'league.divisionTwo'),
  });
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// MATCHDAY
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
async function runMatchday(){
  if(ui.running)return;
  if(!store.G||store.G.phase!=='pre'){toast(t('season.finishPrevious'));return;}
  // Owner 2026-07-02: unanswered decision mail BLOCKS the matchday — read the
  // inbox and answer before you can press play.
  if(pendingDecisions().length){
    toast(t('season.answerInbox',{count:pendingDecisions().length}));
    ui.page='inbox';render();
    return;
  }
  if(blockForInjuredStarter(store.G.myTeamId,'match.matchdayBlocked'))return;
  if(getEligibleMatchPlayers(store.G.myTeamId).length<3){
    blockForInjuredStarter(store.G.myTeamId,'match.matchdayBlocked');
    return;
  }
  const myL=myLeague();
  const schedule=myL===1?store.G.scheduleL1:store.G.scheduleL2;
  const matches=schedule[store.G.matchday];
  if(!matches){store.G.phase='transfer';render();return;}
  // Pre-match squad nomination (real TT protocol): pick A/B/C + reserves first.
  // Auto-play uses the automatic nomination instead of interrupting the flow.
  if(!ui.autoPlay&&!store.G.matchNomination){
    openMatchNomination(()=>runMatchday());
    return;
  }
  // Owner note #3: a due cup round plays itself before the league matchday —
  // no separate button press per round.
  if(shouldPlayCup()){await playCupRound();}
  await checkpointCareer('matchday');
  ui.running=true;
  const myId=store.G.myTeamId;
  const modal=document.getElementById('modal');modal.className='modal modal-xl';
  modal.innerHTML=`<div class="mt2">${matchdayModalTitle(myL,store.G.matchday+1)}</div>
  <div id="vme-container" class="mb10"></div>
  <div id="mdb" class="mb10 grid gtcfill240 gp4"></div>
  <div class="log" id="mdl" style="height:220px"></div>`;
  openModal();
  const bracket=document.getElementById('mdb'),logEl=document.getElementById('mdl'),vmeEl=document.getElementById('vme-container');
  function addLog(t,c=''){const d=document.createElement('div');d.className=c;d.textContent=t;logEl.appendChild(d);logEl.scrollTop=logEl.scrollHeight;}
  function flipMatchup(mu){
    return{
      ...mu,
      homeWin:!mu.homeWin,
      hs:mu.as,
      as:mu.hs,
      homePlayer:mu.awayPlayer,awayPlayer:mu.homePlayer,
      homePair:mu.awayPair||null,awayPair:mu.homePair||null,
      homeName:mu.awayName,awayName:mu.homeName,
      momentum:-(mu.momentum||0),
      setScores:(mu.setScores||[]).map(s=>({home:s.away,away:s.home,rallies:s.rallies})),
      micro:{
        homePoints:mu.micro?.awayPoints||0,
        awayPoints:mu.micro?.homePoints||0,
        homeAces:mu.micro?.awayAces||0,
        awayAces:mu.micro?.homeAces||0,
        homeWinners:mu.micro?.awayWinners||0,
        awayWinners:mu.micro?.homeWinners||0,
        homeErrors:mu.micro?.awayErrors||0,
        awayErrors:mu.micro?.homeErrors||0,
        longestRally:mu.micro?.longestRally||0,
        closestSets:mu.micro?.closestSets||0,
      }
    };
  }
  // Results are simulated & committed BEFORE the animation (atomic — see below), keyed
  // to the matchday that was PLAYED. `_revealed` hides a score in the bracket until the
  // animation reaches it, so committing early doesn't spoil the result.
  const playedMd=store.G.matchday;
  let _revealed=-1;
  function renderBracket(ai=-1){
    bracket.innerHTML=matches.map((m,i)=>{
      const r=(i<=_revealed)?store.G.results.find(r=>r.matchday===playedMd&&r.homeId===m.home&&r.awayId===m.away&&r.season===store.G.season):null;
      const isO=m.home===myId||m.away===myId;const weW=r&&((m.home===myId&&r.homeWin)||(m.away===myId&&!r.homeWin));const isDr=r&&r.isDraw;
      const cls=i===ai?'playing':r?(isO?(isDr?'draw':weW?'win':'loss'):''):i>ai?'pending':'';
      return`<div class="mr ${cls}"><div class="mr-t home fs10">${teamName(m.home)}</div><div class="mr-sc ${i===ai?'live':''} fs12">${r?r.score:'-'}</div><div class="mr-t fs10">${teamName(m.away)}</div></div>`;
    }).join('');
  }
  
  // Also simulate the other league in background
  const otherL=myL===1?2:1;
  const otherSchedule=otherL===1?store.G.scheduleL1:store.G.scheduleL2;
  const otherMatches=otherSchedule[store.G.matchday];
  const finance=ensureSeasonFinance();
  
  tickInjuries();
  // Injuries for player + AI are applied inside applyResult via tryInjuriesAfterMatch.
  const newInj=store.G.players.filter(p=>p.teamId===myId&&!p.retired&&(p.injuredFor||0)>0&&p._injMd===store.G.matchday);
  if(newInj.length){newInj.forEach(p=>addLog(t('matchLog.injury',{name:p.name,rounds:p.injuredFor}),'inj'));await matchPause(600);}
  if(getEligibleMatchPlayers(myId).length<3){
    ui.running=false;
    blockForInjuredStarter(myId,'match.matchdayBlocked');
    return;
  }
  renderBracket();addLog(t('matchLog.header',{season:store.G.season,matchday:store.G.matchday+1,total:TOTAL_MATCHDAYS,division:myL===1?'I':'II'}),'hl');await matchPause(400);

  // ── ATOMIC COMMIT (results locked before the animation) ─────────────────────
  // Simulate ALL matches, apply them, advance the matchday and PERSIST *now*. The
  // animation below merely replays the committed outcome, so interrupting or
  // refreshing the match can never re-simulate a different result.
  const preResults=matches.map(m=>simTeamMatch(m.home,m.away));
  preResults.forEach(r=>applyResult(r)); // keyed to playedMd (matchday not yet advanced)
  if(otherMatches)otherMatches.forEach(m=>applyResult(simTeamMatch(m.home,m.away)));
  store.G.matchday=playedMd+1;
  // Reserve promises: settled against who ACTUALLY stepped on court in my match.
  const myResult=preResults.find(r=>r.homeId===myId||r.awayId===myId);
  if(myResult){
    const playedIds=new Set();
    (myResult.matchups||[]).forEach(mu=>{(mu.homePair||[mu.homePlayer]).forEach(id=>playedIds.add(id));(mu.awayPair||[mu.awayPlayer]).forEach(id=>playedIds.add(id));});
    settleMatchPromises(playedIds);
  }
  generateInboxForMatchday(); // fresh mail (incl. decisions) before the NEXT round
  persistGame();
  await flushCareerSave();

  for(let i=0;i<matches.length;i++){
    const m=matches[i],isO=m.home===myId||m.away===myId;
    renderBracket(i);
    if(isO){
      addLog(`\n\u2605 ${teamName(m.home)} vs ${teamName(m.away)}`,'hl');
      await matchPause(600);
      // VME: simulate with visual display
      const weAreHome=m.home===myId;
      const hT=store.G.teams.find(t=>t.id===m.home);
      const aT=store.G.teams.find(t=>t.id===m.away);
      const r=preResults[i]; // committed result — replay only
      // Always show our team on the left
      const displayHome=weAreHome?hT:aT;
      const displayAway=weAreHome?aT:hT;
      // Animate VME matchup by matchup (skipped during auto-play — fast simulation)
      let hScore=0,aScore=0;
      if(!ui.autoPlay)for(let mi=0;mi<r.matchups.length;mi++){
        const mu=r.matchups[mi];
        const displayMatchups=r.matchups.map(m2=>weAreHome?m2:flipMatchup(m2));
        const displayMu=weAreHome?mu:flipMatchup(mu);
        vmeEl.innerHTML=renderVME(displayHome,displayAway,displayMatchups,mi,hScore,aScore,false,{setIndex:0,home:0,away:0});
        await matchPause(250);
        addLog(`  ${mu.type==='double'?t('matchLog.doubles')+' ':''}${mu.homeName||playerName(mu.homePlayer)} vs ${mu.awayName||playerName(mu.awayPlayer)}`,'hl');
        for(let si=0;si<(displayMu.setScores||[]).length;si++){
          const timeline=buildSetTimeline(displayMu.setScores[si]);
          for(let pi=0;pi<timeline.length;pi++){
            const state=timeline[pi];
            vmeEl.innerHTML=renderVME(displayHome,displayAway,displayMatchups,mi,hScore,aScore,false,{setIndex:si,home:state.home,away:state.away});
            if(pi===timeline.length-1){
              addLog(`    Set ${si+1}: ${state.home}:${state.away}`,'dm');
            }
            await matchPause(pi===timeline.length-1?180:85);
          }
        }
        if(displayMu.homeWin)hScore++;else aScore++;
        vmeEl.innerHTML=renderVME(displayHome,displayAway,displayMatchups,mi,hScore,aScore,false,{setIndex:(displayMu.setScores||[]).length,home:0,away:0});
        const ww=(m.home===myId&&mu.homeWin)||(m.away===myId&&!mu.homeWin);
        addLog(t('matchLog.duelResult',{score:`${displayMu.hs}:${displayMu.as}`}),ww?'gd':'bd');
        addLog(t('matchLog.micro',{points:`${displayMu.micro.homePoints}:${displayMu.micro.awayPoints}`,aces:`${displayMu.micro.homeAces}:${displayMu.micro.awayAces}`,errors:`${displayMu.micro.homeErrors}:${displayMu.micro.awayErrors}`,rally:displayMu.micro.longestRally}),'dm');
        await matchPause(1150);
      }
      _revealed=i;renderBracket(i); // reveal this result now (already committed)
      const ww=(m.home===myId&&r.homeWin)||(m.away===myId&&!r.homeWin);const dr=r.isDraw;
      addLog(t(dr?'matchLog.draw':ww?'matchLog.win':'matchLog.loss',{score:r.score}),dr?'hl':ww?'gd':'bd');
      await matchPause(1200);
    }else{
      await matchPause(180);
      const r=preResults[i];_revealed=i;renderBracket(i);
      addLog(r.isDraw?t('matchLog.otherDraw',{score:r.score}):t('matchLog.otherWin',{team:r.homeWin?teamName(m.home):teamName(m.away),score:r.score}),'dm');
    }
  }

  // Other league was already simulated & applied in the atomic commit above.
  if(otherMatches){
    addLog(t('matchLog.otherDivision',{division:otherL===1?'I':'II',count:otherMatches.length}),'dm');
  }

  // v16: Merchandising income every matchday
  const merchInc=getMerchIncome();
  if(merchInc>0){
    const totalMerch=store.G._top12Bonus?Math.round(merchInc*1.5):merchInc;
    myTeam().budget+=totalMerch;
    if(finance)finance.merch+=totalMerch;
    addLog(t('matchLog.merch',{amount:formatCurrency(totalMerch)}),'gd');
  }
  
  if(store.G.matchday===TOTAL_MATCHDAYS-1){
    [1,2].forEach(leagueId=>{
      if(!store.G.top12MastersDone?.[leagueId]){
        addLog(t('matchLog.top12Available',{division:leagueId===1?'I':'II'}),'hl');
      }
    });
  }
  
  // v15: Ticket income every 2nd home matchday
  if(store.G.matchday%2===0){
    const priceRaw=store.G.ticketPrice||50;
    const{attendance,capacity}=estimateAttendance(priceRaw);
    const ticketIncome=attendance*priceRaw;
    myTeam().budget+=ticketIncome;
    if(finance)finance.tickets+=ticketIncome;
    addLog(t('matchLog.tickets',{attendance,price:formatCurrency(priceRaw),income:formatCurrency(ticketIncome)}),'gd');
  }
  
  // v15: News feed
  const thisRoundResults=store.G.results.filter(r=>r.matchday===store.G.matchday-1&&r.season===store.G.season);
  generateMatchdayNews(thisRoundResults,myId);
  
  // Cup check
  if(store.G.matchday>0&&store.G.matchday%4===0&&!store.G.cup?.finished){
    store.G.cupPlayedThisSeason=false;
    addLog(t('matchLog.cupAvailable'),'hl');
  }
  
  if(store.G.matchday>=TOTAL_MATCHDAYS){
    addLog(t('matchLog.seasonFinished'),'hl');store.G.phase='transfer';
    const wages=totalWages();const acadUp=academyUpkeep();const maint=calcLeagueMaint()+acadUp;
    myTeam().budget=Math.max(0,myTeam().budget-wages-maint);
    addLog(t('matchLog.costs',{wages:formatCurrency(wages),maintenance:formatCurrency(maint),academy:acadUp?t('matchLog.academyCost',{amount:formatCurrency(acadUp)}):''}),'bd');
    const srt=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>b.pts-a.pts);
    const myPos2=srt.findIndex(t=>t.isPlayer)+1;
    // v13: 150% buffed prize tables
    const PRIZE_TABLE_L1=[62500,45000,32500,22500,17500,13750,11250,8750,7500,6250,5000,3750];
    const PRIZE_TABLE_L2=[20000,15000,11250,8750,6250,5000,4500,3750,3000,2500,2000,1500];
    const prizeTable=myL===1?PRIZE_TABLE_L1:PRIZE_TABLE_L2;
    const prize=prizeTable[Math.min(myPos2-1,prizeTable.length-1)];
    myTeam().budget+=prize;
    if(finance)finance.prize+=prize;
    let sponsorIncome=0;
    store.G.sponsors.filter(s=>s.active).forEach(s=>{
      // Pay this season if the goal was met; a multi-year deal STAYS active (a missed
      // goal just means no payout that season, not termination).
      if(checkGoal(s)){myTeam().budget+=s.reward;s.met=true;sponsorIncome+=s.reward;addLog(t('matchLog.sponsorMet',{name:s.name,reward:formatCurrency(s.reward)}),'gd');}
      else{s.failed=true;addLog(t('matchLog.sponsorFailed',{name:s.name}),'bd');}
      s.yearsLeft=(s.yearsLeft||1)-1;
      if(s.yearsLeft<=0){s.active=false;s.endSeason=store.G.season;}
    });
    if(finance)finance.sponsorIncome+=sponsorIncome;
    const boardObjective=getBoardObjective();
    if(boardObjective){
      if(checkGoal(boardObjective)){
        myTeam().budget+=boardObjective.reward;
        if(finance)finance.boardReward+=boardObjective.reward;
        addLog(t('matchLog.boardMet',{goal:goalDesc(boardObjective.goal),reward:formatCurrency(boardObjective.reward)}),'gd');
        store.G.managerPrestige=Math.min(100,(store.G.managerPrestige||0)+6);
      }else{
        addLog(t('matchLog.boardFailed',{goal:goalDesc(boardObjective.goal)}),'bd');
        store.G.managerPrestige=Math.max(0,(store.G.managerPrestige||0)-4);
        if(boardObjective.failure==='fired'){
          handleManagerFired(t('board.firedAmbitious',{goal:goalDesc(boardObjective.goal)}));
          return;
        }
      }
    }
    const tvPay=calcTVRights();
    myTeam().budget+=tvPay;
    if(finance){
      const wageBreakdown=totalWageBreakdown();
      finance.tvRights+=tvPay;
      finance.wages=wages;
      finance.playerWages=wageBreakdown.players;
      finance.coachWages=wageBreakdown.coaches;
      finance.physioWages=wageBreakdown.physios;
      finance.psychologistWages=wageBreakdown.psychologists;
      finance.scoutWages=wageBreakdown.scouts;
      finance.prDirectorWages=wageBreakdown.prDirector;
      finance.maint=maint;
    }
    addLog(t('matchLog.tvRights',{amount:formatCurrency(tvPay),position:myPos2,division:myL===1?'I':'II'}),'gd');
    store.G.budgetLog=store.G.budgetLog||[];
    store.G.budgetLog.push(buildBudgetEntry(wages,prize,sponsorIncome,maint));
    const awardResults=giveSeasonAwards();
    if(awardResults.length){addLog(t('matchLog.awards'),'hl');awardResults.forEach(a=>addLog(`  \u2605 ${a.player}${a.club?` (${a.club})`:''}: ${a.type?t(`award.${a.type}`):a.label}`,a.forLeague?'hl':'gd'));}
    
    // Promotion/Relegation
    const promoRele=doPromotionRelegation();
    addLog(t('matchLog.promotionRelegation'),'hl');
    promoRele.promoted.forEach(name=>addLog(t('matchLog.promoted',{name}),'gd'));
    promoRele.relegated.forEach(name=>addLog(t('matchLog.relegated',{name}),'bd'));
    
    safeLog(t('season.positionLog',{season:store.G.season,position:myPos2,division:myL===1?'I':'II'}),'hl');

    // v16: Records update
    updateRecords();
    recordManagerSeason(myPos2,myL);
    recordCoachSeason();
    
    // v16: Return loans
    returnLoans();
    
    // v16: Check nat team offer
    
    recordClubSeasonHistory();
    store.G.seasonHistory.push({season:store.G.season,position:myPos2,league:myL,w:myTeam().w,d:myTeam().d,l:myTeam().l,pts:myTeam().pts,gf:myTeam().gf,ga:myTeam().ga,pointsWon:myTeam().pointsWon||0,pointsLost:myTeam().pointsLost||0,teamOvr:teamOvr(myTeam().id),matchProg:buildMatchProgression(),budget:myTeam().budget,wages,promoted:promoRele.promoted,relegated:promoRele.relegated});
    buildMarket();genSponsorOffers(calcPrestige());
    const clubOffers=generateClubOffers();
    await showPostSeasonGala({
      awards:awardResults,
      clubOffers,
      position:myPos2,
      summaryKey:myPos2<=3?'gala.summary.great':myPos2<=6?'gala.summary.solid':'gala.summary.rebuild'
    });
  }
  ui.running=false;
  if(ui.autoPlay&&store.G.phase==='pre'){updateHeader();persistGame();} // keep modal; loop plays on
  else setTimeout(()=>{stopCanvasVME();closeModal();updateHeader();render();persistGame();},1400);
}
function safeCloseMatchday(){ui.running=false;stopCanvasVME();closeModal();updateHeader();render();}
// Auto-play the rest of the season: plays matchdays back-to-back with no animation,
// and STOPS for anything that needs the manager — an injury / too few healthy
// starters (needs a sub), a cup or Top 12 Masters round that's due, the season-
// end gala, or the user toggling it off. Reuses runMatchday's fast path, so economy,
// news and standings stay identical to manual play. Clicking the button again stops.
async function autoPlaySeason(){
  if(ui.autoPlay){ui.autoPlay=false;return;} // toggle OFF
  if(ui.running){toast(t('season.waitForMatchday'));return;}
  if(!store.G||store.G.phase!=='pre'){toast(t('season.autoPlayOnly'));return;}
  ui.autoPlay=true;updateHeader();
  try{
    while(ui.autoPlay){
      if(store.G.phase!=='pre')break;                                   // season over / transfer
      if(shouldPlayTop12(1)||shouldPlayTop12(2))break;                  // Top 12 Masters due
      if(shouldPlayCup())await playCupRound();                          // cup rounds auto-play (owner #3)
      if(getEligibleMatchPlayers(store.G.myTeamId).length<3)break; // cannot field a legal squad
      if(pendingDecisions().length)break;                               // decision mail waits for the manager
      const md=store.G.matchday;
      await runMatchday();
      if(store.G.matchday===md)break; // runMatchday bailed (e.g. injury block) → stop
      await sleep(30);                // yield so the UI repaints / can be toggled off
    }
  }finally{
    ui.autoPlay=false;ui.running=false;stopCanvasVME();
    if(store.G&&store.G.phase==='pre')closeModal();
    updateHeader();render();persistGame();
  }
}

// AI clubs EARN income the same way the player does — from their own marketability,
// infrastructure and league position, NOT a fixed position rule. So income depends
// on what a club builds (squad quality → marketability, hall capacity, merch shop)
// plus sponsor luck, which breaks the deterministic pyramid: a well-run mid-table
// club can out-earn a poorly-run rival and climb. Streams mirror the player's
// (sponsors, tickets, TV, merch, prize). Constants tuned via tests/stress.js.
function aiClubSeasonIncome(team){
  const L=team.league||1;
  const standings=store.G.teams.filter(t=>t.league===L).sort((a,b)=>(b.pts||0)-(a.pts||0));
  const N=Math.max(1,standings.length);
  const rank=Math.max(1,standings.findIndex(t=>t.id===team.id)+1);
  const posBonus=clamp(1.25-(rank-1)*(0.6/Math.max(1,N-1)),0.55,1.25); // 1st 1.25 … last ~0.65
  const mkt=calcTeamMarketability(team.id);
  const home=11;
  const cap=(INFRA_HALL[team.infraHall||0]||INFRA_HALL[0]).capacity;
  const price=L===1?55:40;
  const tickets=Math.round(cap*Math.min(1,0.5+mkt/200)*posBonus*price*home);
  const merchRatio=(INFRA_MERCH[team.infraMerchandising||0]||INFRA_MERCH[0]).income||0;
  const merch=Math.round(mkt*220*merchRatio*home);
  const tv=Math.round((L===1?55000:16000)*Math.max(0.4,1-(rank-1)*0.05));
  const sponsors=Math.round((L===1?95000:30000)*(0.7+mkt/110)*(0.85+Math.random()*0.3));
  const prize=Math.round((L===1?120000:35000)*posBonus/1.25);
  // A more competent principal runs the club a bit better (≈ ±10%).
  const compMult=0.9+((team.principal?.competence||50)/500);
  return Math.round((tickets+merch+tv+sponsors+prize)*compMult);
}
function applyAiClubFinances(){
  store.G.teams.filter(t=>!t.isPlayer).forEach(team=>{
    const L=team.league||1;
    const income=aiClubSeasonIncome(team);
    // Wage discipline (owner note #11: "a lot of Polish teams go bankrupt,
    // constantly no money"). Salaries follow player OVR while income follows the
    // club's economy, so poor clubs ran a structural deficit and lived at €0
    // forever. A real board renegotiates: if payroll exceeds ~62% of income the
    // whole wage book is scaled down (pay cuts / cheaper renewals abstracted).
    const wages0=teamPayroll(team.id);
    const wageBudget=Math.round(income*0.62);
    if(wages0>wageBudget&&wages0>0){
      const k=wageBudget/wages0;
      store.G.players.filter(p=>p.teamId===team.id&&!p.retired&&p.contractYears>0).forEach(p=>{p.salary=Math.max(500,Math.round((p.salary||0)*k));});
      store.G.staff.filter(s=>s.teamId===team.id&&(s.contractYears||0)>0).forEach(s=>{s.salary=Math.max(500,Math.round((s.salary||0)*k));});
      if(team.prDirector)team.prDirector.salary=Math.max(500,Math.round((team.prDirector.salary||0)*k));
    }
    const wages=teamPayroll(team.id);
    const acadUp=INFRA_ACADEMY[clamp(team.infraAcademy||0,0,INFRA_ACADEMY.length-1)].upkeep||0;
    const upkeep=(L===1?30000:11000)+acadUp;
    // Lower-tier commercial reach is smaller even for a well-run club. Without
    // a league-specific treasury ceiling, every L2 club eventually accumulated
    // the same €1.2m as L1 and the whole lower division became equally strong.
    // €550k still allows an exceptional promotion contender while preserving a
    // meaningful top-flight economy over very long careers.
    const treasuryCeiling=L===1?1200000:550000;
    team.budget=clamp(Math.round((team.budget||0)+income-wages-upkeep),0,treasuryCeiling);
  });
}
// Re-couple AI squad strength to current budget each season (Layer-1 abstraction:
// AI clubs are budget-driven strength backdrops until Layer 3 gives them real,
// individual signing decisions). Budgets evolve via position/income, so strength
// follows the money → leagues stay differentiated and churn with promotion.
// Talent flows to money. Now that players actually develop to their ceilings
// (2026-07-02 growth fix), a poor club can grow a star far above its financial
// level — without sales the leagues' strength compressed (L1≈L2 by season 20).
// A club sells a clearly-outgrown player to the richest club that can afford
// him; the seller banks a real fee. This keeps the budget→strength hierarchy
// emergent instead of frozen.
function aiPoachOutgrownStars(){
  const l2Avg=calcLeagueAvgOvr(2);
  const movedThisWindow=new Set();
  store.G.teams.filter(t=>!t.isPlayer).forEach(seller=>{
    const level=leagueStrengthTopForBudget(seller.budget);
    store.G.players.filter(p=>p.teamId===seller.id&&!p.retired&&!p.isYouth&&p.role!=='youth'&&!p.loanedOut).forEach(p=>{
      if(movedThisWindow.has(p.id))return;
      const outgrownBudget=ovrBase(p)>(level+6);
      // Strong second-division starters should attract top-flight clubs even
      // when their current club has accumulated enough cash to keep them.
      // Without this sporting step-up, mature L2 squads eventually hoarded
      // developed stars and the average second division overtook L1.
      const leagueStepUp=seller.league===2&&p.role==='starter'&&ovrBase(p)>=Math.max(78,l2Avg);
      if((!outgrownBudget&&!leagueStepUp)||Math.random()>(leagueStepUp?0.80:0.55))return;
      // A top-flight step-up happens late in the contract cycle: the selling
      // club is compensated, but not with the ruinous full-star premium that
      // previously bankrupted buyers and made L2 richer than L1.
      const fee=Math.round(playerWageForOvr(ovrBase(p))*(leagueStepUp?0.75:2.2));
      const buyer=store.G.teams
        .filter(t=>!t.isPlayer&&t.id!==seller.id&&(!leagueStepUp||t.league===1)&&leagueStrengthTopForBudget(t.budget)>=ovrBase(p)-4&&(t.budget||0)>fee*1.4)
        .filter(t=>{
          const senior=store.G.players.filter(x=>x.teamId===t.id&&!x.retired&&x.role!=='youth');
          const weakestStarter=senior.filter(x=>x.role==='starter').sort((a,b)=>ovrBase(a)-ovrBase(b))[0];
          return senior.length<10||!weakestStarter||ovrBase(p)>ovrBase(weakestStarter);
        })
        .sort((a,b)=>(b.budget||0)-(a.budget||0))[0];
      if(!buyer)return;
      buyer.budget-=fee;seller.budget=(seller.budget||0)+fee;
      p.teamId=buyer.id;p.salary=contractExpect(p,buyer.id).salary;p.contractYears=1+rnd(0,2);p.role='reserve';
      movedThisWindow.add(p.id);
      const surplus=store.G.players
        .filter(x=>x.teamId===buyer.id&&!x.retired&&x.role!=='youth'&&x.id!==p.id)
        .sort((a,b)=>ovrBase(a)-ovrBase(b));
      while(store.G.players.filter(x=>x.teamId===buyer.id&&!x.retired&&x.role!=='youth').length>10&&surplus.length){
        const released=surplus.shift();
        released.teamId=null;released.contractYears=0;released.role='reserve';
      }
      if(ovrBase(p)>=72)pushNews('news.playerTransferred','',{buyer:buyer.name,name:p.name,ovr:ovrBase(p),seller:seller.name,fee:formatCurrency(fee)});
    });
  });
}
function maintainAiRosters(){
  aiPoachOutgrownStars();
  store.G.teams.filter(t=>!t.isPlayer).forEach(team=>tuneGeneratedLeagueRoster(team.id));
}
function endSeason(){
  const checkpointPromise=checkpointCareer('season');
  applyAiClubFinances();
  principalLifecycle();
  applyGrowth();
  applyPendingPromotionRelegation();
  // v15: Tech partnership cost/income
  if(store.G.techPartnership){
    const tp=TECH_PARTNERSHIPS.find(t=>t.id===store.G.techPartnership);
    if(tp){
      const delta=tp.costPerSeason;// negative = you pay, positive = they pay you
      myTeam().budget+=delta;
      const finance=ensureSeasonFinance();
      if(finance)finance.techPartnership+=delta;
      const lastBudgetEntry=(store.G.budgetLog||[])[(store.G.budgetLog||[]).length-1];
      if(lastBudgetEntry&&lastBudgetEntry.season===store.G.season){
        lastBudgetEntry.techPartnership=(lastBudgetEntry.techPartnership||0)+delta;
        lastBudgetEntry.net=(lastBudgetEntry.net||0)+delta;
      }
      if(delta>0)safeLog(t('season.techPartnershipLog',{name:tp.name,amount:`+${formatCurrency(delta)}`}),'gd');
      else if(delta<0)safeLog(t('season.techPartnershipLog',{name:tp.name,amount:formatCurrency(delta)}),'bd');
    }
  }
  // v15: Staff aging and retirement
  const myId=store.G.myTeamId;
  const retiringStaff=[];
  store.G.staffHistory=store.G.staffHistory||{};
  store.G.staff.forEach(s=>{
    s.age=(s.age||40)+1;
    store.G.staffHistory[s.id]=store.G.staffHistory[s.id]||[];
    if(s.age>75){retiringStaff.push(s);}
    // Health vacation for 60+ (5% chance)
    if(s.age>=60&&Math.random()<0.05){
      safeLog(t('season.staffHealthVacationLog',{name:s.name,age:s.age}),'bd');
      s._healthVacation=true;
    }else{s._healthVacation=false;}
    store.G.staffHistory[s.id].push(staffSnap(s));
  });
  retiringStaff.forEach(s=>{
    store.G.staff=store.G.staff.filter(x=>x.id!==s.id);
    if(s.teamId===myId)toast(t('season.staffRetired',{name:s.name,age:s.age}));
    safeLog(t('season.staffRetiredLog',{name:s.name,age:s.age}),'dm');
  });
  store.G.teams.forEach(t=>{
    if(t.prDirector){
      t.prDirector.age=(t.prDirector.age||40)+1;
      if(t.prDirector.age>75)t.prDirector=null;
    }
  });
  if(store.G.prDirector&&(store.G.prDirector.age||40)>75){
    toast(t('season.prRetired',{name:store.G.prDirector.name}));
    store.G.prDirector=null;
  }
  // Process pre-signed players (both ours and AI)
  if(store.G.preSignedPlayers&&store.G.preSignedPlayers.length){
    store.G.preSignedPlayers.forEach(ps=>{
      const p=store.G.players.find(x=>x.id===ps.playerId);
      if(p&&!p.retired){
        p.teamId=ps.destinationTeamId||store.G.myTeamId;p.salary=ps.salary;p.contractYears=ps.years;
        p.joinedSeason=store.G.season;p.joinedViaTransfer=true;
        p.promisedRole=ps.promisedRole||p.preferredRole||'starter';
        p.role='reserve';
        if(p.teamId===store.G.myTeamId)toast(t('season.playerArrived',{name:p.name}));
      }
    });
    store.G.preSignedPlayers=[];
  }
  if(store.G.pendingStaffSignings&&store.G.pendingStaffSignings.length){
    store.G.pendingStaffSignings.forEach(entry=>{
      if(entry.kind==='pr'){
        const sourceTeam=store.G.teams.find(t=>t.id===entry.sourceTeamId);
        let pr=(store.G.prDirectorPool||[]).find(x=>x.id===entry.staffId)||sourceTeam?.prDirector||null;
        if(!pr||pr.id!==entry.staffId)return;
        if(sourceTeam&&sourceTeam.prDirector&&sourceTeam.prDirector.id===entry.staffId){
          closeStaffTenure(sourceTeam.prDirector,store.G.season);
          sourceTeam.prDirector=null;
        }
        store.G.prDirectorPool=(store.G.prDirectorPool||[]).filter(x=>x.id!==entry.staffId);
        startStaffTenure(pr,entry.destinationTeamId,store.G.season);
        pr.contractYears=entry.years;
        if(entry.destinationTeamId===store.G.myTeamId){
          store.G.prDirector=pr;
          toast(t('season.prArrived',{name:pr.name}));
        }else{
          const team=store.G.teams.find(t=>t.id===entry.destinationTeamId);
          if(team)team.prDirector=pr;
        }
        return;
      }
      const s=store.G.staff.find(x=>x.id===entry.staffId)
        || store.G.staffPool.find(x=>x.id===entry.staffId)
        || (store.G.scoutPool||[]).find(x=>x.id===entry.staffId);
      if(!s)return;
      closeStaffTenure(s,store.G.season);
      startStaffTenure(s,entry.destinationTeamId,store.G.season);
      s.contractYears=entry.years;
      if(s.type==='scout')s.hired=true;
      if(!store.G.staff.find(x=>x.id===s.id))store.G.staff.push(s);
      store.G.staffPool=store.G.staffPool.filter(x=>x.id!==s.id);
      if(store.G.scoutPool)store.G.scoutPool=store.G.scoutPool.filter(x=>x.id!==s.id);
      if(entry.destinationTeamId===store.G.myTeamId)toast(t('season.staffArrived',{name:s.name}));
    });
    store.G.pendingStaffSignings=[];
  }
  // v14: AI teams can poach our players with 1yr left (10% chance per player)
  const ourExpiring=store.G.players.filter(p=>p.teamId===myId&&!p.retired&&p.contractYears<=0&&p.role!=='youth');
  ourExpiring.forEach(p=>{
    if(Math.random()<0.25){
      const aiTeams=store.G.teams.filter(t=>!t.isPlayer);
      const buyer=aiTeams[rnd(0,aiTeams.length-1)];
      if(buyer){
        p.teamId=buyer.id;p.contractYears=1+rnd(0,2);p.salary=contractExpect(p,buyer.id).salary;
        p.role='starter';
        toast(t('season.preSignedElsewhere',{name:p.name,club:buyer.name}));
        safeLog(t('season.playerLeftLog',{name:p.name,club:buyer.name}),'bd');
      }
    }
  });
  store.G.season++;store.G.matchday=0;store.G.phase='preseason';store.G.top12MastersDone={1:false,2:false};store.G._top12Bonus=false;store.G.top12Entrant=null;
  store.G.techPartnership=null;// reset - must choose new one each season
  store.G.teams.forEach(t=>{t.w=0;t.d=0;t.l=0;t.pts=0;t.gf=0;t.ga=0;t.pointsWon=0;t.pointsLost=0;});
  const l1Ids=store.G.teams.filter(t=>t.league===1).map(t=>t.id);
  const l2Ids=store.G.teams.filter(t=>t.league===2).map(t=>t.id);
  store.G.scheduleL1=makeSchedule(l1Ids);
  store.G.scheduleL2=makeSchedule(l2Ids);
  store.G.players.forEach(p=>{
    ensurePlayerMeta(p);
    p.seasonW=0;p.seasonL=0;p.seasonD=0;
    p.seasonPointsWon=0;p.seasonPointsLost=0;
    p.leagueSeasonW=0;p.leagueSeasonL=0;p.leagueSeasonD=0;
    p.leagueSeasonPointsWon=0;p.leagueSeasonPointsLost=0;
    p.starterBenchStreak=0;
    p.injuredFor=0;p.fatigue=Math.max(0,(p.fatigue||0)-30);
    p.seasonForm=clamp((p.seasonForm||0)+rnd(-5,5),-10,10);
    p.lastMatchMicro=null;
  });
  // Keep multi-year sponsors with seasons left (carry over + count toward the 3);
  // only 1-season / expired deals are cleared.
  store.G.sponsors=(store.G.sponsors||[]).filter(s=>s.active&&(s.yearsLeft||0)>0);store.G.scoutMissions=[];store.G.academyUsedThisSeason=false;store.G.academyProspects=[];store.G.academyTrial=[];store.G.academyTrialUsed=false;store.G.cupPlayedThisSeason=false;
  store.G._lastNegMatchday=-1;store.G._lastNegSeason=-1;
  store.G._negotiationLog={};
  const keptScouts=getMyScouts().map(s=>({...s,hired:true}));
  store.G.scoutPool=[...keptScouts,...genScoutPool().slice(0,Math.max(0,SCOUT_POOL_FLOOR-keptScouts.length))];
  store.G.prDirectorPool=(store.G.prDirectorPool||[]).filter(pr=>pr.teamId===null);
  while(store.G.prDirectorPool.length<PR_POOL_FLOOR)store.G.prDirectorPool.push(finalizePRDirector(genPRDirector(null,store.G.countryId)));
  replenishStaffPools(); // staff regens: age the market, retire the old, add fresh faces
  // Rubber upkeep (owner 2026-07-03): fresh rubbers are a recurring cost. If the
  // club can't afford the tier anymore, it silently drops one level (with a mail).
  if(myTeam()){
    const tier=EQUIPMENT.rubberTiers[clamp(store.G.rubberTier||0,0,EQUIPMENT.rubberTiers.length-1)];
    const squad=store.G.players.filter(p=>p.teamId===store.G.myTeamId&&!p.retired&&p.role!=='youth').length;
    const cost=(tier?.costPerPlayer||0)*squad;
    if(cost>0){
      if((myTeam().budget||0)>=cost){
        myTeam().budget-=cost;
        const fin=ensureSeasonFinance();if(fin)fin.brandCosts+=cost;
        safeLog(t('season.rubberCost',{label:t(`equipment.rubber.${store.G.rubberTier||0}`),cost:formatCurrency(cost)}),'bd');
      }else{
        store.G.rubberTier=Math.max(0,(store.G.rubberTier||0)-1);
        pushMail({fromKey:'mail.sportingDirector',subjectKey:'mail.rubberUnaffordableSubject',bodyKey:'mail.rubberUnaffordableBody',bodyParams:{
          tier:t(`equipment.rubber.${Math.min(store.G.rubberTier+1,EQUIPMENT.rubberTiers.length-1)}`),
          cost:formatCurrency(cost),lowerTier:t(`equipment.rubber.${store.G.rubberTier}`),
        }});
      }
    }
  }
  store.G.matchNomination=null; // nominations never carry across seasons
  generateInboxForMatchday(); // preseason mail (contract warnings etc.)
  if((store.G.infraAcademy||0)>0&&myTeam())store.G.academyProspects=genAcademyIntake(store.G.myTeamId,store.G.countryId);
  for(let i=0;i<14;i++){
    const p=genPlayer(null,18+rnd(0,16),store.G.countryId);
    p.teamId=null;
    p.contractYears=0;
    p.role='reserve';
    p.preferredRole=Math.random()<0.5?'rotation':'starter';
    p.seasonForm=clamp((p.seasonForm||0)+rnd(-1,4),-8,10);
    capFreeAgentProfile(p,getDifficultyConfig().freeAgentCap);
    p.nationality=store.G.countryId;
    store.G.players.push(p);
    store.G.playerHistory[p.id]=[snap(p)];
  }
  store.G.boardObjectiveOptions=myTeam()?generateBoardObjectiveChoices(store.G.myTeamId):[];
  store.G.boardObjective=null;
  store.G.seasonFinance={season:store.G.season,tickets:0,merch:0,prize:0,sponsorIncome:0,tvRights:0,boardReward:0,techPartnership:0,wages:0,playerWages:0,coachWages:0,physioWages:0,psychologistWages:0,scoutWages:0,prDirectorWages:0,maint:0,transfersIn:0,infraCost:0,staffBuyouts:0,prDirectorCost:0,brandCosts:0,other:0};
  genCupBracket();
  aiSignPlayers();maintainAiRosters();buildMarket();
  if(myTeam())genSponsorOffers(calcPrestige());
  updateHeader();
  pruneCareerData();
  // During background world-generation there is no player club — skip the page
  // render (pages assume myTeam()) and let the generator drive the UI.
  if(!ui._bgGen){ui.page='preseason';render();}
  return Promise.resolve(checkpointPromise)
    .catch(()=>null)
    .then(()=>{persistGame();return flushCareerSave();});
}

// v13: Require exactly 3 sponsors to start season
// v15: Require exactly 3 sponsors + tech partnership to start season
function startSeason(){
  const activeSponsors=store.G.sponsors.filter(s=>s.active).length;
  if(activeSponsors<3){toast(t('season.needSponsors',{count:activeSponsors}));return;}
  if(!store.G.techPartnership){toast(t('season.needTechPartner'));return;}
  if(!store.G.boardObjective){toast(t('season.needBoardGoal'));return;}
  store.G.phase='pre';ui.page='dash';render();updateHeader();
  toast(t('season.started',{season:store.G.season,division:myLeague()===1?'I':'II'}));
  persistGame();
}

function teamPayroll(teamId){
  const playerWages=store.G.players.filter(p=>p.teamId===teamId&&!p.retired&&p.contractYears>0).reduce((sum,p)=>sum+(p.salary||0),0);
  const staffWages=store.G.staff.filter(s=>s.teamId===teamId&&(s.contractYears||0)>0).reduce((sum,s)=>sum+(s.salary||0),0);
  return playerWages+staffWages+(getTeamPRDirector(teamId)?.salary||0);
}
function aiBudgetReserve(team){
  return Math.round((team.league===1?7000:3500)+teamPayroll(team.id)*0.22);
}
function aiAffordableCash(team){
  return Math.max(0,Math.round(((team.budget||0)-aiBudgetReserve(team))*getDifficultyConfig().aiCashMult));
}
function queueFutureStaffSigning(team,staff,years,cost,kind){
  store.G.pendingStaffSignings=store.G.pendingStaffSignings||[];
  if(store.G.pendingStaffSignings.find(x=>x.staffId===staff.id))return false;
  if((team.budget||0)<cost)return false;
  team.budget-=cost;
  store.G.pendingStaffSignings.push({staffId:staff.id,destinationTeamId:team.id,sourceTeamId:staff.teamId,years,kind});
  return true;
}
function rebalanceAiLineup(teamId){
  const roster=store.G.players
    .filter(p=>p.teamId===teamId&&!p.retired)
    .sort((a,b)=>(ovrBase(b)+Math.max(0,(playerCeiling(b)-ovrBase(b))*0.18)+(b.role==='youth'?2:0))-(ovrBase(a)+Math.max(0,(playerCeiling(a)-ovrBase(a))*0.18)+(a.role==='youth'?2:0)));
  roster.forEach((p,idx)=>{
    if(idx<4){
      // A junior good enough for the first team has graduated in practice. Say so:
      // `isYouth` with role 'starter' is a state the save migration explicitly
      // undoes (state.js: isYouth ⇒ role 'youth'), so leaving the flag on meant an
      // AI club's best young player silently dropped out of its lineup on every
      // load — the same save producing different teams before and after.
      if(p.isYouth)p.isYouth=false;
      p.role='starter';
    }
    else if(p.isYouth||p.age<21)p.role='youth';
    else p.role='reserve';
  });
}
function aiSignPlayers(){
  const diffCfg=getDifficultyConfig();
  // Clubs barred from the market keep their own squad (see clubMustRetainOwnPlayers).
  // Runs BEFORE the expiry sweep below, which would otherwise release them all.
  store.G.players.forEach(p=>{
    if(!p.retired&&(p.contractYears||0)<=0&&clubMustRetainOwnPlayers(p.teamId))retainForClosedClub(p);
  });
  // Contract expectations are evaluated hundreds of times in one AI transfer
  // window. League strength does not materially change during that loop, so
  // calculate it once per league instead of sorting every squad per candidate.
  const contractContexts=new Map([...new Set(store.G.teams.map(t=>t.league))]
    .map(league=>[league,{leagueAvgOvr:calcLeagueAvgOvr(league)}]));
  const contractContextFor=team=>contractContexts.get(team.league);
  const freeAgents=store.G.players.filter(p=>!p.retired&&(p.teamId===null||p.contractYears<=0)).sort((a,b)=>ovrBase(b)-ovrBase(a));
  freeAgents.forEach(p=>{p.teamId=null;p.contractYears=0;});
  store.G.staff=store.G.staff.filter(s=>{
    // Owner note #8: MY club's staff were exempt from this sweep, so their
    // contracts ran into negative years and nobody ever left. Expiry now applies
    // to every club — the whole final contract year is the renewal window
    // (staff negotiation / "zaklepanie" already supports it).
    if((s.contractYears||0)<=0){
      closeStaffTenure(s,store.G.season);
      if(s.teamId===store.G.myTeamId){
        toast(t('season.staffContractExpired',{name:s.name,role:t(s.type==='coach'?'staff.coach':s.type==='physio'?'staff.physio':s.type==='psychologist'?'staff.psychologist':s.type==='scout'?'staff.scout':'staff.prDirector')}));
        safeLog(t('season.staffContractExpiredLog',{name:s.name}),'bd');
      }
      s.teamId=null;
      if(s.type==='scout'){s.hired=false;(store.G.scoutPool=store.G.scoutPool||[]).push(s);}
      else (store.G.staffPool=store.G.staffPool||[]).push(s);
      return false;
    }
    return true;
  });
  store.G.teams.filter(t=>!t.isPlayer&&t.prDirector&&(t.prDirector.contractYears||0)<=0).forEach(t=>{closeStaffTenure(t.prDirector,store.G.season);t.prDirector.teamId=null;store.G.prDirectorPool.push(t.prDirector);t.prDirector=null;});
  const contractedTargets=(store.G.transferMarket||[])
    .filter(item=>item.type==='transfer'||item.type==='presign')
    .map(item=>({item,player:store.G.players.find(p=>p.id===item.playerId)}))
    .filter(row=>row.player&&!row.player.retired)
    .sort((a,b)=>(ovrBase(b.player)-ovrBase(a.player))||((a.item.fee||0)-(b.item.fee||0)));
  const aiTeams=store.G.teams.filter(t=>!t.isPlayer).sort((a,b)=>(teamOvr(a.id)-teamOvr(b.id))||((a.budget||0)-(b.budget||0)));
  aiTeams.forEach(team=>{
    const leagueContext=contractContextFor(team);
    // A lower-division club can develop an exceptional star, but established
    // top-flight players should not routinely choose L2 just because that club
    // has stockpiled cash. This is the sporting-prestige side of recruitment.
    const maxExternalOvr=team.league===2?Math.min(84,leagueContext.leagueAvgOvr+2):99;
    [
      {key:'infraHall',levels:INFRA_HALL,chance:team.league===1?0.24:0.12},
      {key:'infraMed',levels:INFRA_MED,chance:team.league===1?0.22:0.10},
      {key:'infraAcademy',levels:INFRA_ACADEMY,chance:team.league===1?0.32:0.18},
      {key:'infraMerchandising',levels:INFRA_MERCH,chance:team.league===1?0.18:0.08},
    ].forEach(cfg=>{
      const next=cfg.levels[(team[cfg.key]||0)+1];
      if(next&&aiAffordableCash(team)>=Math.round(next.cost*0.9)&&Math.random()<cfg.chance*diffCfg.aiInfraMult){
        team.budget-=next.cost;
        team[cfg.key]=(team[cfg.key]||0)+1;
      }
    });
    const youthOnly=team.traits?.includes('youthOnly');
    const youthStrat=team.principal?.strategy==='youth'||team.principal?.strategy==='builder';
    const desiredYouth=youthOnly?5:(youthStrat?(team.league===1?3:2):(team.league===1?2:1));
    let youthCount=store.G.players.filter(p=>p.teamId===team.id&&!p.retired&&p.role==='youth').length;
    while((team.infraAcademy||0)>0&&youthCount<desiredYouth&&Math.random()<Math.min(0.92,0.78*diffCfg.aiInfraMult)){
      const youth=genYouthPlayer(team.id,store.G.countryId);
      youth.teamId=team.id;
      youth.nationality=store.G.countryId;
      youth.contractYears=Math.max(3,22-youth.age); // must reach the age-21 gate
      youth.salary=Math.max(300,youth.salary||300);
      store.G.players.push(youth);
      store.G.playerHistory[youth.id]=[snap(youth)];
      youthCount++;
    }
    const desiredRoster=team.league===1?7:6;
    let roster=store.G.players.filter(p=>p.teamId===team.id&&!p.retired&&p.contractYears>0);
    let starters=roster.filter(p=>p.role==='starter').length;
    while(!youthOnly&&roster.length<desiredRoster&&freeAgents.length){
      const fa=freeAgents
        .filter(p=>ovrBase(p)<=maxExternalOvr)
        .filter(p=>contractExpect(p,team.id,contractContextFor(team)).salary<=Math.max(1200,aiAffordableCash(team)+3000))
        .sort((a,b)=>(ovrBase(b)+Math.max(0,playerCeiling(b)-ovrBase(b))*0.22)-(ovrBase(a)+Math.max(0,playerCeiling(a)-ovrBase(a))*0.22))[0];
      if(!fa)break;
      const exp=contractExpect(fa,team.id,contractContextFor(team));
      fa.teamId=team.id;
      fa.contractYears=1+rnd(1,2);
      fa.salary=Math.round(exp.salary*(0.92+Math.random()*0.16));
      fa.role=starters<4?'starter':'reserve';
      starters+=fa.role==='starter'?1:0;
      roster.push(fa);
      freeAgents.splice(freeAgents.findIndex(x=>x.id===fa.id),1);
    }
    rebalanceAiLineup(team.id);
    roster=store.G.players.filter(p=>p.teamId===team.id&&!p.retired&&p.contractYears>0);
    const weakestStarter=roster.filter(p=>p.role==='starter').sort((a,b)=>ovrBase(a)-ovrBase(b))[0];
    const futureTarget=youthOnly?null:contractedTargets.find(({item,player})=>{
      if(player.teamId===team.id)return false;
      if(ovrBase(player)>maxExternalOvr)return false;
      if(store.G.preSignedPlayers?.find(x=>x.playerId===player.id))return false;
      const exp=contractExpect(player,team.id,contractContextFor(team));
      const fee=(item.type==='transfer'?(item.fee||0):0)+exp.signingBonus;
      if(aiAffordableCash(team)<fee)return false;
      if(weakestStarter&&ovrBase(player)<ovrBase(weakestStarter)+2&&playerCeiling(player)<playerCeiling(weakestStarter)+3&&roster.length>=desiredRoster)return false;
      return true;
    });
    if(futureTarget){
      const exp=contractExpect(futureTarget.player,team.id,contractContextFor(team));
      const fee=(futureTarget.item.type==='transfer'?(futureTarget.item.fee||0):0)+exp.signingBonus;
      team.budget-=fee;
      if(futureTarget.item.type==='transfer'){
        const seller=store.G.teams.find(t=>t.id===futureTarget.player.teamId);
        if(seller)seller.budget=(seller.budget||0)+(futureTarget.item.fee||0);
      }
      store.G.preSignedPlayers=store.G.preSignedPlayers||[];
      store.G.preSignedPlayers.push({playerId:futureTarget.player.id,destinationTeamId:team.id,salary:exp.salary,years:exp.years,bonus:exp.signingBonus,promisedRole:exp.role});
    }
    ['coach','physio','psychologist'].forEach(type=>{
      const current=store.G.staff.find(s=>s.teamId===team.id&&s.type===type&&(s.contractYears||0)>0);
      if(current)return;
      const freeStaff=(store.G.staffPool||[]).filter(s=>s.type===type).sort((a,b)=>staffOvr(b)-staffOvr(a))[0];
      if(freeStaff&&aiAffordableCash(team)>=Math.round((freeStaff.salary||0)*0.6)){
        freeStaff.teamId=team.id;
        freeStaff.contractYears=1+rnd(1,2);
        store.G.staff.push(freeStaff);
        store.G.staffPool=store.G.staffPool.filter(x=>x.id!==freeStaff.id);
      }else{
        const rival=store.G.staff.filter(s=>s.type===type&&s.teamId!==null&&s.teamId!==team.id&&(s.contractYears||0)>0).sort((a,b)=>staffOvr(b)-staffOvr(a))[0];
        if(rival)queueFutureStaffSigning(team,rival,2,Math.round((rival.salary||0)*1.6),'staff');
      }
    });
    const currentScout=store.G.staff.find(s=>s.teamId===team.id&&s.type==='scout'&&(s.contractYears||0)>0);
    if(!currentScout){
      const freeScout=(store.G.scoutPool||[]).filter(s=>!s.hired).sort((a,b)=>staffOvr(b)-staffOvr(a))[0];
      if(freeScout&&aiAffordableCash(team)>=Math.round((freeScout.salary||0)*0.7)){
        freeScout.teamId=team.id;
        freeScout.contractYears=1+rnd(1,2);
        freeScout.hired=true;
        store.G.staff.push(freeScout);
        store.G.scoutPool=store.G.scoutPool.filter(x=>x.id!==freeScout.id);
      }
    }
    if(!team.prDirector){
      const freePR=getPRDirectorMarket().sort((a,b)=>(b.bonus||0)-(a.bonus||0))[0];
      if(freePR&&aiAffordableCash(team)>=Math.round((freePR.cost||0)*0.7)){
        store.G.prDirectorPool=store.G.prDirectorPool.filter(x=>x.id!==freePR.id);
        freePR.teamId=team.id;
        freePR.contractYears=1+rnd(1,2);
        team.prDirector=freePR;
      }else{
        const rivalPR=getRivalPRDirectors().find(pr=>pr.teamId!==team.id);
        if(rivalPR)queueFutureStaffSigning(team,rivalPR,2,Math.round((rivalPR.salary||0)*1.6),'pr');
      }
    }
    rebalanceAiLineup(team.id);
  });
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// YOUTH ACADEMY
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function pullYouth(){
  if(!store.G||store.G.infraAcademy===0){toast(t('academy.buildFirst'));return;}
  if(!store.G.academyProspects?.length){toast(t('academy.noCandidates'));return;}
  const modal=document.getElementById('modal');modal.className='modal modal-lg';
  modal.innerHTML=`<div class="mt2">${t('academy.intakeTitle')} <button class="close-btn" onclick="closeModal()">\u2715</button></div>
  <div class="fs12 ink3 mb12">${t('academy.intakeHint')}</div>
  <div class="grid gtcfit220 gp10">
    ${store.G.academyProspects.map((p,i)=>`<div class="pd14 bb1 bt3-purple r12 bgs1">
      <div class="flex jcb gp10 aifs mb8">
        <div><div class="syne b7 fs15">${p.name}</div><div class="fs10 ink3">${t('academy.ageStyle',{age:p.age,style:styleLabel(p.playStyle)})}</div></div>
        <div class="syne b8 fs28 cpurple">${ovrBase(p)}</div>
      </div>
      <div class="fs10 ink3 mb8">${academyProfileNote(p)}</div>
      <div class="grid gtc2 gp6 fs10 mb10">
        <div><div class="ink3">${t('academy.region')}</div><div class="b7">${p.academyProfile?.region||t('academy.clubRegion')}</div></div>
        <div><div class="ink3">${t('academy.readiness')}</div><div class="b7">${academyReadinessLabel(p.academyProfile?.readiness)}</div></div>
        <div><div class="ink3">${t('academy.ceiling')}</div><div class="b7">${p.academyProfile?.ceiling||'?'}</div></div>
        <div><div class="ink3">${t('academy.form')}</div><div class="b7">${seasonFormLabel(p)}</div></div>
      </div>
      <div class="flex gp6 fwrap mb10">${SK.map(s=>`<span class="fs10"><span class="ink3">${SL[s]}</span> <b>${p[s]}</b></span>`).join('')}</div>
      <button class="btn pr sm w100" onclick="signAcademyProspect(${i})">${t('academy.accept').toUpperCase()}</button>
    </div>`).join('')}
  </div>`;
  openModal();
}
function ensurePendingPlayerIdAvailable(p){
  const occupied=new Set((store.G.players||[])
    .filter(x=>x&&Number.isInteger(x.id)&&x.id>=0)
    .map(x=>x.id));
  if(Number.isInteger(p.id)&&p.id>=0&&!occupied.has(p.id))return p.id;
  let next=Number.isInteger(ui._pid)&&ui._pid>=0?ui._pid:0;
  while(occupied.has(next))next++;
  p.id=next;
  ui._pid=next+1;
  return p.id;
}
function signAcademyProspect(idx){
  const p=(store.G.academyProspects||[])[idx];
  if(!p)return;
  ensurePendingPlayerIdAvailable(p);
  p.teamId=store.G.myTeamId;
  store.G.players.push(p);
  store.G.playerHistory[p.id]=[snap(p)];
  store.G.academyProspects=store.G.academyProspects.filter((_,i)=>i!==idx);
  store.G.academyUsedThisSeason=true; // kept for save-compat; intake size is the real cap now
  clearScoutResult(p.id);
  closeModal();
  render();updateHeader();
  toast(t('academy.joined',{name:p.name,ovr:ovrBase(p)}));
  pushNews('news.academyJoined','good',{name:p.name,region:p.academyProfile?.region||t('academy.localTalent')});
  persistGame();
}

// Mini-tournament trial (owner: an economically NON-obvious option). One-off \u20ac10k
// for a shortlist of 3 candidates of which you keep ONE \u2014 the rest leave. Quality is
// only a touch above a normal intake, so it rarely "pays off" in pure talent: it's a
// convenience/gamble (pick the best of three) rather than a clear upgrade path.
const ACADEMY_MINI_TOURNAMENT_COST=10000;
function runAcademyMiniTournament(){
  if(!store.G||(store.G.infraAcademy||0)<1){toast(t('academy.buildFirst'));return;}
  if(store.G.academyTrialUsed){toast(t('academy.trialUsed'));return;}
  const cost=ACADEMY_MINI_TOURNAMENT_COST;
  if((myTeam().budget||0)<cost){toast(t('academy.trialNoBudget',{cost:formatCurrency(cost)}));return;}
  if(!confirm(t('academy.trialConfirm',{cost:formatCurrency(cost)})))return;
  myTeam().budget-=cost;
  const finance=ensureSeasonFinance();if(finance)finance.other-=cost;
  const trial=[];
  for(let i=0;i<3;i++){
    const p=genYouthPlayer(store.G.myTeamId,store.G.countryId);
    p.ceiling=clamp(p.ceiling+rnd(0,4),p.ceiling,96); // a touch better than baseline
    if(p.academyProfile){p.academyProfile.ceiling=p.ceiling;p.academyProfile.source='trial';}
    trial.push(p);
  }
  store.G.academyTrial=trial;
  store.G.academyTrialUsed=true;
  toast(t('academy.trialComplete'));
  render();updateHeader();persistGame();
}
function signTrialProspect(idx){
  const trial=store.G.academyTrial||[];const p=trial[idx];
  if(!p)return;
  ensurePendingPlayerIdAvailable(p);
  p.teamId=store.G.myTeamId;
  store.G.players.push(p);
  store.G.playerHistory[p.id]=[snap(p)];
  store.G.academyTrial=[]; // the other candidates leave
  clearScoutResult(p.id);
  toast(t('academy.trialChosen',{name:p.name,ovr:ovrBase(p)}));
  pushNews('news.trialJoined','good',{name:p.name});
  render();updateHeader();persistGame();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// PLAYER MODAL
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function resolvePlayerProfile(pid,pendingSource,pendingIndex){
  if(pendingSource==='academyProspects'||pendingSource==='academyTrial'){
    const pending=(store.G[pendingSource]||[])[pendingIndex];
    if(pending&&pending.id===pid)return pending;
  }
  return store.G.players.find(x=>x.id===pid)||null;
}
function openPlayerModal(pid,pendingSource,pendingIndex){
  const p=resolvePlayerProfile(pid,pendingSource,pendingIndex);if(!p)return;
  ensurePlayerMeta(p);
  const o=ovr(p);const wr=(p.careerW||0)+(p.careerL||0)>0?Math.round((p.careerW||0)/((p.careerW||0)+(p.careerL||0))*100):0;
  const exp=contractExpect(p,store.G.myTeamId);
  const marketability=calcPlayerMarketability(p);
  const mods=getPlayerModifierBreakdown(p);
  const trophyMap=new Map();
  (p.awards||[]).forEach(a=>{
    const key=a.type||a.label;
    const row=trophyMap.get(key)||{label:awardLabel(a),count:0};
    row.count++;
    trophyMap.set(key,row);
  });
  const trophyCabinet=[...trophyMap.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  const clubs=[...new Set((p.clubHistory||[]).map(id=>teamName(id)).filter(Boolean))];
  const identity=describePlayerIdentity(p);
  const isPolish=window.PPM.i18n.getLocale()==='pl';
  const profileLabel=isPolish?(p.profileTag||identity.label):t('player.profile');
  const profileNote=isPolish?(p.signatureNote||identity.note):t('player.profileNote',{top:SL[identity.topStat]||identity.topStat,weak:SL[identity.weakStat]||identity.weakStat});
  const techStatText=Object.entries(mods.techStats).filter(([,val])=>val>0).map(([key,val])=>`${SL[key]} +${val}`).join(' / ');
  const modal=document.getElementById('modal');modal.className='modal modal-lg';
  modal.innerHTML=`<div class="mt2">${p.name} <button class="close-btn" onclick="closeModal()">\u2715</button></div>
  <div class="g2 gp12 mb14">
    <div>
      <div class="flex aic gp14 mb10">
        <img src="${getAvatarData(p,'player')}" alt="${p.name}" class="avatar xl">
        <div>
          <div class="syne b8 fs52 cr lh1 mb6">${o}</div>
          <div class="pc-meta">${t('player.agePeak',{age:p.age,peak:p.peakAge})} / <span style="color:${phaseColor(p)}">${phaseLabel(p)}</span>${p.teamId===store.G.myTeamId?` / ${t('player.basePeak',{value:playerCeiling(p)})}`:''}</div>
          <div class="fs11 ink3 mt-4">${t('player.marketability')}: <b class="cgold">${marketability}</b></div>
        </div>
      </div>
      <div style="margin-top:6px;padding:6px 10px;display:inline-block;border:1px solid ${(PLAYER_STYLE_INFO[p.playStyle]||{}).color||'var(--b1)'};border-radius:3px;font-size:11px;font-weight:700;color:${(PLAYER_STYLE_INFO[p.playStyle]||{}).color||'var(--ink3)'}">${styleLabel(p.playStyle)}${store.G.staff.find(s=>s.teamId===store.G.myTeamId&&s.type==='coach')?.styleSynergy===p.playStyle?` ${t('player.synergy')}`:''}</div>
      <div class="mt-8 pd8-10 bb1 r10 bgs2 fs12">
        <div class="b7 mb4">${profileLabel}</div>
        <div class="ink3">${profileNote}</div>
      </div>
      ${p.equipment?`<div class="mt-8 pd8-10 bb1 r10 bgs1 fs11">
        <div class="b7 mb3">${t('player.equipment')}</div>
        <div class="ink3">${t(`equipment.blade.${p.equipment.blade}`)} + ${t(`equipment.sponge.${p.equipment.sponge}`)} + ${t(`equipment.rubber.${clubRubberTier(p.teamId)}`)}</div>
        <div class="mt-3">${(()=>{const m=equipmentMods(p);const parts=SK.filter(k=>m[k]).map(k=>`${SL[k]} ${m[k]>0?'+':''}${m[k]}`);return parts.length?parts.join(' / '):t('player.neutralSetup');})()}</div>
      </div>`:''}
      <div class="traits mt-8">${p.traits.map(trait=>`<span class="has-tooltip tb ${TRAITS[trait]?.type||'men'}">${t(`trait.${trait}.label`)}<span class="tip">${t(`trait.${trait}.desc`)}</span></span>`).join('')||`<span class="fs10 ink3">${t('player.noTraits')}</span>`}</div>
      <div class="grid gtc3 gp8 mt-12">
        <div><div class="fs9 ink3 mb3">${t('player.morale').toUpperCase()}</div><div class="h8 bgs3 r3"><div style="height:100%;width:${p.morale||50}%;background:var(--g);border-radius:3px"></div></div><div class="fs11 mt-2">${moraleLabel(p.morale||50)}</div></div>
        <div><div class="fs9 ink3 mb3">${t('player.fatigue').toUpperCase()}</div><div class="h8 bgs3 r3"><div style="height:100%;width:${p.fatigue||0}%;background:var(--orange);border-radius:3px"></div></div><div class="fs11 mt-2">${p.fatigue||0}%</div></div>
        <div><div class="fs9 ink3 mb3">${t('player.stamina').toUpperCase()}</div><div class="h8 bgs3 r3"><div style="height:100%;width:${playerStamina(p)}%;background:var(--b);border-radius:3px"></div></div><div class="fs11 mt-2">${playerStamina(p)} / 100</div></div>
      </div>
    </div>
    <div>
      ${SK.map(s=>`<div class="mb10"><div class="flex jcb mb3"><span class="fs10 ink3">${SL[s]}</span><span class="b7 fs16">${p[s]}</span></div><div class="h10 bgs3 r3"><div style="height:100%;width:${p[s]}%;background:${p[s]>=85?'var(--g)':p[s]>=75?'var(--blue)':p[s]>=62?'var(--gold)':'var(--orange)'};border-radius:3px"></div></div></div>`).join('')}
    </div>
  </div>
  <div class="g4 gp8 mb14">
    <div class="sb pd10"><div class="l">${t('player.wins')}</div><div class="v g fs20">${p.careerW||0}</div></div>
    <div class="sb pd10"><div class="l">${t('player.losses')}</div><div class="v r fs20">${p.careerL||0}</div></div>
    <div class="sb pd10"><div class="l">${t('player.winRate')}</div><div class="v gold fs20">${wr}%</div></div>
    <div class="sb pd10"><div class="l">${t('player.loyalty')}</div><div class="v fs20">${p.loyalty||0}/10</div></div>
  </div>
  <div class="g3 gp8 mb14">
    <div class="sb pd10"><div class="l">${t('player.form')}</div><div class="v fs18">${seasonFormLabel(p)}</div></div>
    <div class="sb pd10"><div class="l">${t('player.expectedSalary')}</div><div class="v gold fs18">${formatCurrency(exp.salary)}</div></div>
    <div class="sb pd10"><div class="l">${t('player.marketValue')}</div><div class="v g fs18">${formatCurrency(exp.marketValue)}</div></div>
  </div>
  <div class="g2 gp10 mb14">
    <div class="tile tile-lg">
      <div class="fs10 ink3 up ls1 mb8">${t('player.ovrModifiers')}</div>
      <div class="pnl-row"><div>${t('player.baseOvr')}</div><div>${mods.baseOvr}</div></div>
      <div class="pnl-row"><div>${t('player.techPartner')}</div><div class="${mods.techOvr>0?'pnl-pos':''}">${mods.techOvr>0?`+${mods.techOvr}`:'0'}</div></div>
      <div class="fs11 ink3 mt-8">${mods.techLabel}${techStatText?` / ${techStatText}`:` / ${t('player.noEquipmentPackage')}`}</div>
      <div class="fs11 ink3 mt-6">${t('player.finalOvr')}: <b>${mods.totalOvr}</b></div>
    </div>
    <div class="tile tile-lg">
      <div class="fs10 ink3 up ls1 mb8">${t('player.matchModifiers')}</div>
      <div class="pnl-row"><div>${t('player.coachFocus')}</div><div class="${mods.coachFocus>0?'pnl-pos':''}">${mods.coachFocus>0?`+${mods.coachFocus}`:'0'}</div></div>
      <div class="pnl-row"><div>${t('player.coachSynergy')}</div><div class="${mods.coachSynergy>=0?'pnl-pos':'pnl-neg'}">${mods.coachSynergy>0?`+${mods.coachSynergy}`:mods.coachSynergy}</div></div>
      <div class="pnl-row"><div>${t('player.coachMotivation')}</div><div class="${mods.coachMorale>0?'pnl-pos':''}">${mods.coachMorale>0?`+${mods.coachMorale}`:'0'}</div></div>
      <div class="pnl-row"><div>${t('player.seasonForm')}</div><div class="${mods.formBonus>=0?'pnl-pos':'pnl-neg'}">${mods.formBonus>0?`+${mods.formBonus}`:mods.formBonus}</div></div>
      <div class="pnl-row"><div>${t('player.morale')}</div><div class="${mods.moraleBonus>=0?'pnl-pos':'pnl-neg'}">${mods.moraleBonus>0?`+${mods.moraleBonus}`:mods.moraleBonus}</div></div>
      <div class="pnl-row"><div>Stamina / MEN</div><div class="pnl-pos">+${mods.staminaBonus}</div></div>
      <div class="pnl-row"><div>${t('player.fatigue')}</div><div class="pnl-neg">-${mods.fatiguePenalty}</div></div>
      <div class="pnl-row"><div>${t('player.eliteBonus')}</div><div class="${mods.eliteBonus>0?'pnl-pos':''}">${mods.eliteBonus>0?`+${mods.eliteBonus}`:'0'}</div></div>
      <div class="fs11 ink3 mt-8">${t('player.currentMatchStrength')}: <b>${mods.effectiveNow}</b>${mods.coachName?` / ${t('player.coach')}: ${mods.coachName}`:''}</div>
    </div>
  </div>
  <div class="g2 gp10 mb14">
    <div class="tile tile-lg">
      <div class="fs10 ink3 up ls1 mb6">${t('player.biography')}</div>
      <div class="fs12 lh155">
        ${t('player.biographyText',{name:p.name,age:p.age,top:SL[identity.topStat]||identity.topStat,weak:SL[identity.weakStat]||identity.weakStat})}
      </div>
      <div class="fs11 ink3 mt-8">${t('player.clubPath')}: <b>${clubs.join(' → ')||t('player.currentClubDebut')}</b></div>
      ${p.teamId===store.G.myTeamId?`<div class="fs11 ink3 mt-6">${t('player.basePeak',{value:`<b>${playerCeiling(p)}</b>`})}</div>`:''}
      <div class="fs11 ink3 mt-6">${t('player.matchEndurance')}: <b>${playerStamina(p)}/100</b> ${playerStamina(p)>=75?t('player.staminaHigh'):playerStamina(p)<=45?t('player.staminaLow'):t('player.staminaNormal')}</div>
      <div class="fs11 ink3 mt-6">${t('player.careerPoints')}: ${t('player.pointsWonLost',{won:`<b>${formatNumber(p.careerPointsWon||0)}</b>`,lost:`<b>${formatNumber(p.careerPointsLost||0)}</b>`})}</div>
    </div>
    <div class="tile tile-lg">
      <div class="fs10 ink3 up ls1 mb6">${t('player.trophyCabinet')}</div>
      ${trophyCabinet.length?trophyCabinet.map(trophy=>`<div class="pnl-row"><div>${trophy.label}</div><div class="pnl-pos">${trophy.count}x</div></div>`).join(''):`<div class="fs12 ink3">${t('player.noTrophies')}</div>`}
    </div>
  </div>
  ${p.academyProfile?`<div class="mb14 pd10-12 r10 fs12" style="border:1px solid var(--purple);background:rgba(104,40,160,.08)">
    <div class="b7 cpurple mb6">${t('player.academyReport')}</div>
    <div>${t('player.region')}: <b>${p.academyProfile.region||t('player.clubAcademy')}</b> / ${t('player.readiness')}: <b>${academyReadinessLabel(p.academyProfile.readiness)}</b> / Peak OVR: <b>${p.academyProfile.ceiling||'?'}</b></div>
    <div class="mt-4 ink3">${academyProfileNote(p)}</div>
  </div>`:''}
  ${p.awards?.length?`<div class="mb14"><div class="fs10 ink3 mb6 up ls1">${t('player.seasonTrophies')}</div><div>${p.awards.map(a=>`<span class="award">${awardLabel(a)}</span>`).join('')}</div></div>`:''}
  <div class="btn-row">
    ${p.teamId===store.G.myTeamId?`<button class="btn pr" onclick="closeModal();openNegotiate(${p.id})">${t('player.negotiateContract').toUpperCase()}</button>`:''}
    <button class="btn" onclick="closeModal()">${t('common.close').toUpperCase()}</button>
  </div>`;
  openModal();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// CONTRACT NEGOTIATION (v14: no feedback, one offer per matchday)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function negUpdate(){
  const p=store.G.players.find(x=>x.id===window._negPid);if(!p)return;
  const exp=contractExpect(p);
  const sl=document.getElementById('neg-sal-lbl');if(sl)sl.textContent=`${formatCurrency(window._negSal)} ${t('neg.perYear')}`;
  const yl=document.getElementById('neg-yr-lbl');if(yl)yl.textContent=t('neg.yearsValue',{count:window._negYrs});
  const bl=document.getElementById('neg-bonus-lbl');if(bl)bl.textContent=formatCurrency(window._negBonus||0);
  const pkg=document.getElementById('neg-pkg-lbl');if(pkg)pkg.textContent=formatCurrency((window._negBonus||0)+(window._negFee||0));
  const rl=document.getElementById('neg-role-lbl');if(rl)rl.textContent=roleGuaranteeLabel(window._negRole||exp.role);
  const reasons=document.getElementById('neg-reasons');
  const mood=document.getElementById('neg-mood');
  const feedback=negResponse(p,window._negSal||exp.salary,window._negYrs||exp.years,window._negBonus||exp.signingBonus,window._negRole||exp.role,store.G.myTeamId);
  if(mood){
    mood.className='nfb '+(feedback.mood>0?'happy':feedback.mood===0?'ok':'angry');
    mood.textContent=feedback.hardBlockKey?t(feedback.hardBlockKey):t(feedback.mood>0?'neg.moodHappy':feedback.mood===0?'neg.moodBorderline':'neg.moodWeak');
  }
  if(reasons)reasons.textContent=feedback.reasons.length?t('neg.signals',{reasons:feedback.reasons.map(key=>t(key)).join(', ')}):t('neg.waitingPlayer');
}
// An EMPLOYED person is authoritative. The season change mirrors the club's own
// scouts into scoutPool (so the market page can grey them out), and those mirrors
// are shallow copies that stop tracking the real record the moment either side
// changes. Resolving to a copy meant the staff modal showed a stale contract and
// a renewal wrote the new terms to a throwaway object — visible in the owner's
// S4 save, where scout id 456 existed twice.
function findStaffById(sid){
  return store.G.staff.find(x=>x.id===sid)
    ||(store.G.prDirector&&store.G.prDirector.id===sid?store.G.prDirector:null)
    ||store.G.staffPool.find(x=>x.id===sid)
    ||(store.G.scoutPool||[]).find(x=>x.id===sid)
    ||(store.G.prDirectorPool||[]).find(x=>x.id===sid)
    ||getRivalPRDirectors().find(x=>x.id===sid);
}
function staffNegUpdate(){
  const s=findStaffById(window._staffNegSid);if(!s)return;
  const fb=staffNegResponse(s,window._staffNegSal||s.salary,window._staffNegBonus||0,window._staffNegYrs||2);
  const mood=document.getElementById('staff-mood');
  if(mood){mood.className='nfb '+(fb.mood>0?'happy':fb.mood===0?'ok':'angry');mood.textContent=t(fb.mood>0?'staff.neg.moodHappy':fb.mood===0?'staff.neg.moodBorderline':'staff.neg.moodWeak');}
  const reasons=document.getElementById('staff-reasons');
  if(reasons)reasons.textContent=fb.reasons.length?t('neg.signals',{reasons:fb.reasons.map(key=>t(key)).join(', ')}):t('neg.waitingStaff');
}
function openNegotiate(pid){
  const p=store.G.players.find(x=>x.id===pid);if(!p)return;
  ensurePlayerMeta(p);
  if(getLoanedIn().find(l=>l.playerId===pid)){toast(t('neg.loanedContract'));return;}
  if(alreadyNegotiated('player',pid)){
    toast(t('neg.alreadyOffered',{name:p.name}));return;
  }
  // v15: Transfer refusal based on prestige gap
  if(p.teamId!==null&&p.teamId!==store.G.myTeamId){
    const theirTeam=store.G.teams.find(t=>t.id===p.teamId);
    if(theirTeam){
      const myPres=calcPrestige();
      const theirOvr=teamOvr(theirTeam.id);
      const myOvr=teamOvr(myTeam().id);
      const ovrDiff=theirOvr-myOvr;
      const presDiff=myPres;
      // Player from much stronger club refuses if our prestige is too low
      if(ovrDiff>12&&myPres<40){
        const modal=document.getElementById('modal');modal.className='modal';
        modal.innerHTML=`<div class="mt2">${t('neg.refusalTitle')} <button class="close-btn" onclick="closeModal()">\u2715</button></div>
        <div class="bbr r4 mb12" style="padding:16px;background:#fae8e4">
          <div class="b7 mb6">${t('neg.refusalName',{name:p.name})}</div>
          <div class="fs12 ink2">${t('neg.refusalQuote',{prestige:myPres})}</div>
        </div>
        <div class="fs11 ink3">${t('neg.refusalHint',{prestige:myPres})}</div>
        <button class="btn mt-12" onclick="closeModal()">${t('common.close').toUpperCase()}</button>`;
        openModal();return;
      }
    }
  }
  const exp=contractExpect(p,store.G.myTeamId);
  const marketItem=(store.G.transferMarket||[]).find(m=>m.playerId===pid)||null;
  const modal=document.getElementById('modal');modal.className='modal';
  const sal=exp.salary,yrs=exp.years;
  const maxBonus=Math.max(10000,Math.round(exp.salary*1.5));
  const maxSal=Math.max(60000,Math.round(exp.salary*3));
  const bonus=Math.min(exp.signingBonus,maxBonus);
  window._negSal=sal;window._negYrs=yrs;window._negBonus=bonus;window._negPid=pid;window._negFee=marketItem?.fee||0;window._negRole=exp.role;
  const isFutureJoin=p.teamId!==null&&p.teamId!==store.G.myTeamId&&p.contractYears>0;
  modal.innerHTML=`<div class="mt2">${t('neg.title',{name:p.name})} <button class="close-btn" onclick="closeModal()">\u2715</button></div>
  <div class="neg-block">
    <div class="neg-row"><div class="neg-label">${t('neg.playerOvr')}</div><div class="neg-val syne fs24 cr">${ovrBase(p)}</div></div>
    <div class="neg-row"><div class="neg-label">${t('neg.ageLoyalty')}</div><div class="neg-val">${t('neg.ageYears',{age:p.age})} / ${p.loyalty||0}/10</div></div>
    <div class="neg-row"><div class="neg-label">${t('neg.playerMood')}</div><div class="neg-val">${seasonFormLabel(p)} / ${t(exp.interestKey)}</div></div>
    <div class="neg-row"><div class="neg-label">${t('neg.agentProfile')}</div><div class="neg-val">${t(`neg.agent.${exp.profile.agentType}`)} / ${t(exp.profile.summaryKey)}</div></div>
    <div class="neg-row"><div class="neg-label">${t('neg.expectedRole')}</div><div class="neg-val">${roleGuaranteeLabel(exp.role)}</div></div>
    ${marketItem?.type==='transfer'?`<div class="neg-row"><div class="neg-label">${t('neg.transferFee')}</div><div class="neg-val">${formatCurrency(marketItem.fee)}</div></div>`:''}
  </div>
  ${isFutureJoin?`<div class="pd8-12 r3 fs11" style="background:#f8f0dc;border:1px solid var(--gold);color:#8a6000;margin:8px 0">${t('neg.futureJoin')}</div>`:''}
  <div style="margin:16px 0">
    <div class="fs10 up ls1 ink3 mb4">${t('neg.salary')}: <b id="neg-sal-lbl" class="cr">${formatCurrency(sal)} ${t('neg.perYear')}</b></div>
    <input type="range" min="1000" max="${maxSal}" step="1000" value="${sal}" class="w100 accr" oninput="window._negSal=+this.value;negUpdate()">
    <div class="kicker">${t('neg.contractYears')}: <b id="neg-yr-lbl" class="cr">${t('neg.yearsValue',{count:yrs})}</b></div>
    <input type="range" min="1" max="4" step="1" value="${yrs}" class="w100 accr" oninput="window._negYrs=+this.value;negUpdate()">
    <div class="kicker">${t('neg.signingBonus')}: <b id="neg-bonus-lbl" class="cr">${formatCurrency(bonus)}</b></div>
    <input type="range" min="0" max="${maxBonus}" step="1000" value="${bonus}" class="w100 accr" oninput="window._negBonus=+this.value;negUpdate()">
    <div class="kicker">${t('neg.promisedRole')}: <b id="neg-role-lbl" class="cr">${roleGuaranteeLabel(exp.role)}</b></div>
    <select class="w100 pd10-12 bb1 bgs1 r10" onchange="window._negRole=this.value;negUpdate()">
      <option value="starter" ${exp.role==='starter'?'selected':''}>${t('role.starter')}</option>
      <option value="rotation" ${exp.role==='rotation'?'selected':''}>${t('role.rotation')}</option>
      <option value="prospect" ${exp.role==='prospect'?'selected':''}>${t('role.prospect')}</option>
    </select>
  </div>
  <div class="nfb ok" id="neg-mood">${t('neg.moodBorderline')}</div>
  <div id="neg-reasons" class="fs11 ink3" style="margin:8px 0 10px">${t('neg.waitingPlayer')}</div>
  <div class="bb1 fs11 ink3 bgs2 r3 mb12" style="padding:10px 14px">${t('neg.expectations',{salary:formatCurrency(exp.salary),years:t('neg.yearsValue',{count:exp.years}),bonus:formatCurrency(exp.signingBonus),upfront:`<b id="neg-pkg-lbl">${formatCurrency((marketItem?.fee||0)+bonus)}</b>`,rule:t(isFutureJoin?'neg.ruleFuture':'neg.ruleOneOffer')})}</div>
  <div class="btn-row"><button class="btn pr" onclick="doNegotiate(${pid})">${t('neg.propose').toUpperCase()}</button><button class="btn" onclick="closeModal()">${t('neg.withdraw').toUpperCase()}</button></div>`;
  negUpdate();
  openModal();
}
function doNegotiate(pid){
  const p=store.G.players.find(x=>x.id===pid);if(!p)return;
  // Club trait: youth-only clubs may NOT sign adult external players \u2014 but scouted
  // JUNIORS (isYouth) are part of the academy pipeline, so those are allowed.
  if(myTeam().traits?.includes('youthOnly')&&p.teamId!==store.G.myTeamId&&!p.isYouth){
    toast(t('neg.youthOnly'));return;
  }
  if(alreadyNegotiated('player',pid)){toast(t('neg.alreadyOffered',{name:p.name}));return;}
  const exp=contractExpect(p,store.G.myTeamId);
  // `||` treated a slider dragged to ZERO as "not set" and quietly substituted the
  // agent's full expectation — so offering no signing bonus charged the club the
  // whole bonus anyway, while the modal displayed 0. Fall back only when the value
  // is genuinely absent.
  const num=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const sal=num(window._negSal,exp.salary);
  const yrs=num(window._negYrs,exp.years);
  const bonus=num(window._negBonus,exp.signingBonus);
  const promisedRole=window._negRole||exp.role;
  const marketItem=(store.G.transferMarket||[]).find(m=>m.playerId===pid)||null;
  const upfront=(marketItem?.type==='transfer'?(marketItem.fee||0):0)+bonus;
  // Only an offer that actually COSTS something can be blocked by the balance.
  // A club in the red still has to be able to sign a free agent on a zero-cost
  // package, or it soft-locks: a benched starter walking out on severance
  // (applySeveranceRelease) can push the account negative mid-season, and if
  // that also blocked free signings the squad could never be rebuilt back to the
  // three players the match protocol needs.
  if(upfront>0&&myTeam().budget<upfront){toast('Brak bud\u017cetu na ten pakiet!');return;}
  const feedback=negResponse(p,sal,yrs,bonus,promisedRole,store.G.myTeamId);
  markNegotiated('player',pid);
  pushNegotiationHistory({kind:'player',targetId:p.id,targetName:p.name,status:feedback.score<0?'rejected':'accepted',salary:sal,years:yrs,bonus,promisedRole,reasons:feedback.reasons});
  if(feedback.score<0){toast(feedback.hardBlockKey?t(feedback.hardBlockKey):t('neg.rejected',{name:p.name}));closeModal();persistGame();return;}
  const joinsNextSeason=p.teamId!==null&&p.teamId!==store.G.myTeamId&&p.contractYears>0;
  const finance=ensureSeasonFinance();
  myTeam().budget-=upfront;
  if(finance){
    finance.transfersIn+=(marketItem?.type==='transfer'?(marketItem.fee||0):0);
    finance.other+=bonus>0?-bonus:0;
  }
  if(joinsNextSeason){
    if(!store.G.preSignedPlayers)store.G.preSignedPlayers=[];
    if(!store.G.preSignedPlayers.find(x=>x.playerId===p.id))store.G.preSignedPlayers.push({playerId:p.id,destinationTeamId:myTeam().id,salary:sal,years:yrs,bonus,promisedRole});
    if(marketItem?.type==='transfer'){
      const seller=store.G.teams.find(t=>t.id===p.teamId);
      if(seller)seller.budget=(seller.budget||0)+(marketItem.fee||0);
    }
    toast(t('neg.joinsNext',{name:p.name,role:roleGuaranteeLabel(promisedRole).toLowerCase()}));
  }else{
    const previousTeamId=p.teamId;
    if(marketItem?.type==='transfer'&&previousTeamId!==null&&previousTeamId!==store.G.myTeamId){
      const seller=store.G.teams.find(t=>t.id===previousTeamId);
      if(seller)seller.budget=(seller.budget||0)+(marketItem.fee||0);
    }
    p.salary=sal;p.contractYears=yrs;p.teamId=myTeam().id;
    p.morale=Math.min(100,(p.morale||50)+10);
    p.loyalty=Math.min(10,(p.loyalty||0)+1);
    p.joinedSeason=store.G.season;
    p.joinedViaTransfer=previousTeamId!==store.G.myTeamId;
    p.promisedRole=promisedRole;
    if(previousTeamId!==store.G.myTeamId&&!p.clubHistory.includes(store.G.myTeamId))p.clubHistory.push(store.G.myTeamId);
    // Place the new signing sensibly: fill an empty starter slot (so the player
    // never ends up fielding only 3), otherwise go to the bench. Youth stay youth.
    if(p.role!=='youth'){
      const starterCount=myStarters().filter(x=>x.id!==p.id).length;
      p.role=starterCount<4?'starter':'reserve';
    }
    clearScoutResult(p.id);
  }
  buildMarket();closeModal();render();updateHeader();
  if(!joinsNextSeason)toast(t('neg.signed',{name:p.name,salary:formatCurrency(sal),years:t('neg.yearsValue',{count:yrs}),bonus:formatCurrency(bonus),role:roleGuaranteeLabel(promisedRole).toLowerCase()}));
  persistGame();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// SQUAD MANAGEMENT
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function promoteToStarter(pid){const p=store.G.players.find(x=>x.id===pid);if(!p)return;if(myStarters().length>=4){openSwapModal(pid);return;}p.role='starter';render();toast(t('squad.promoted',{name:p.name}));}
function demoteToReserve(pid){const p=store.G.players.find(x=>x.id===pid);if(!p||p.role!=='starter')return;p.role='reserve';render();toast(t('squad.demoted',{name:p.name}));}
function openSwapModal(rid){
  const rp=store.G.players.find(p=>p.id===rid);const st=myStarters();
  const modal=document.getElementById('modal');modal.className='modal';
  modal.innerHTML=`<div class="mt2">${t('squad.swapTitle',{name:rp.name,ovr:ovrBase(rp)})} <button class="close-btn" onclick="closeModal()">\u2715</button></div>
  <div class="fs11 ink3 mb10">${t('squad.swapHint')}</div>
  ${st.map(p=>`<div class="grid gtc1aa gp8 aic pd8 bb1 mb4 bgs1">
    <div><div class="syne b7">${p.name}</div><div class="fs10 ink3">${t('squad.ageOvr',{age:p.age,ovr:ovrBase(p)})}</div></div>
    <div class="syne b8 fs22 cr">${ovrBase(p)}</div>
    <button class="btn pr" onclick="doSwap(${rid},${p.id})">${t('squad.swap').toUpperCase()}</button>
  </div>`).join('')}
  <button class="btn mt-6" onclick="closeModal()">${t('common.cancel')}</button>`;
  openModal();
}
function doSwap(rid,sid){const r=store.G.players.find(p=>p.id===rid),s=store.G.players.find(p=>p.id===sid);if(!r||!s)return;r.role='starter';s.role='reserve';closeModal();render();toast(`${r.name} \u2194 ${s.name}`);}
function releasePlayer(pid){
  const p=store.G.players.find(x=>x.id===pid);if(!p)return;
  if(getLoanedIn().find(l=>l.playerId===pid)){toast(t('squad.loanedRelease'));return;}
  const yearsLeft=Math.max(0,p.contractYears);const buyout=yearsLeft>0?yearsLeft*(p.salary||0)*2:0;
  const mt=myTeam();
  if(buyout>0){if(!confirm(t('squad.releaseConfirm',{name:p.name,cost:formatCurrency(buyout)})))return;if(mt.budget<buyout){toast(t('squad.noBudget'));return;}mt.budget-=buyout;}
  p.teamId=null;p.contractYears=0;
  buildMarket();render();updateHeader();toast(t('squad.released',{name:p.name}));
  persistGame();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// STAFF
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function openStaffModal(sid){
  const s=store.G.staff.find(x=>x.id===sid)
    || store.G.staffPool.find(x=>x.id===sid)
    || (store.G.scoutPool||[]).find(x=>x.id===sid)
    || (store.G.prDirector&&store.G.prDirector.id===sid?store.G.prDirector:null)
    || (store.G.prDirectorPool||[]).find(x=>x.id===sid)
    || getRivalPRDirectors().find(x=>x.id===sid);
  if(!s)return;
  ensureStaffMeta(s);
  const hist=(store.G.staffHistory?.[s.id]||[]).slice().reverse();
  const career=(s.careerHistory||[]).slice().reverse();
  const currentTeam=s.teamId!==null&&s.teamId!==undefined?teamName(s.teamId):t('staff.freeMarket');
  const roleLabel=t(s.type==='coach'?'staff.coach':s.type==='physio'?'staff.physio':s.type==='psychologist'?'staff.psychologist':s.type==='scout'?'staff.scout':'staff.prDirector');
  const coachStyle=s.styleId?t(`coachStyle.${s.styleId}`):s.styleName||'?';
  const detail=s.type==='coach'
    ?t('staff.styleDetail',{style:coachStyle,tactics:s.tactics||0,motivation:s.motivation||0})
    :s.type==='physio'
    ?t('staff.physioDetail',{injury:s.injReduction||0,recovery:s.recovery||0})
    :s.type==='psychologist'
    ?t('staff.psychDetail',{mental:s.mentalTraining||0,pressure:s.pressure||0})
    :s.type==='scout'
    ?t('staff.scoutDetail',{accuracy:s.accuracy||0,network:s.network||0})
    :t('staff.prDetail',{bonus:Math.round((s.bonus||0)*100),cooldown:s.cooldownReduce||0});
  const bio=t('staff.bioFallback',{name:s.name,role:roleLabel.toLowerCase()});
  const modal=document.getElementById('modal');modal.className='modal modal-lg';
  modal.innerHTML=`<div class="mt2">${roleLabel}: ${s.name} <button class="close-btn" onclick="closeModal()">✕</button></div>
  <div class="flex gp16 aic mb14">
    <img src="${getAvatarData(s,'staff')}" alt="${s.name}" class="avatar xl">
    <div>
      <div class="syne fs26 b8">${s.name}</div>
      <div class="fs11 ink3">${roleLabel} / ${t('staff.currentClub')}: ${currentTeam}</div>
      <div class="fs11 ink3 mt-4">${t('staff.profileLine',{age:s.age||'?',years:s.contractYears||0,ovr:staffOvr(s)})}${s.teamId===store.G.myTeamId?` / Peak OVR ${staffCeiling(s)}`:''}</div>
      <div class="fs11 ink3 mt-4">${detail}</div>
    </div>
  </div>
  <div class="card mb12"><div class="ct">${t('staff.bio').toUpperCase()}</div><div class="fs12 lh16">${bio}</div></div>
  <div class="g2">
    <div class="card"><div class="ct">${t('staff.clubHistory').toUpperCase()}</div>
      ${career.length?career.map(h=>`<div class="pnl-row"><div>${teamName(h.teamId)}<div class="fs10 ink3">S${h.startSeason} - ${h.endSeason?`S${h.endSeason}`:t('staff.now')}</div></div><div class="pnl-pos">${t('staff.tenureYears',{count:(h.endSeason||store.G.season)-h.startSeason+1})}</div></div>`).join(''):`<div class="fs12 ink3">${t('staff.clubHistoryEmpty')}</div>`}
    </div>
    <div class="card"><div class="ct">${t('staff.seasons').toUpperCase()}</div>
      ${hist.length?hist.map(h=>`<div class="pnl-row"><div>S${h.season}<div class="fs10 ink3">${h.teamName||t('staff.freeMarket')} / ${h.style||h.type}</div></div><div class="pnl-pos">OVR ${h.ovr}</div></div>`).join(''):`<div class="fs12 ink3">${t('staff.seasonHistoryEmpty')}</div>`}
    </div>
  </div>
  <div class="btn-row mt-12">
    <button class="btn ${s.teamId===store.G.myTeamId?'go':'pr'}" onclick="closeModal();openStaffNeg(${s.id})">${t(s.teamId===store.G.myTeamId?'staff.extend':'staff.negotiate').toUpperCase()}</button>
    <button class="btn" onclick="closeModal()">${t('common.close').toUpperCase()}</button>
  </div>`;
  openModal();
}
function openStaffNeg(sid){
  const s=store.G.staff.find(x=>x.id===sid)
    || store.G.staffPool.find(x=>x.id===sid)
    || (store.G.scoutPool||[]).find(x=>x.id===sid)
    || (store.G.prDirector&&store.G.prDirector.id===sid?store.G.prDirector:null)
    || (store.G.prDirectorPool||[]).find(x=>x.id===sid)
    || getRivalPRDirectors().find(x=>x.id===sid);
  if(!s)return;
  const blockReason=staffNegotiationBlockReason(s);
  if(blockReason){toast(blockReason);return;}
  if(alreadyNegotiated('staff',sid)){
    toast(t('staff.neg.alreadyOffered',{name:s.name}));return;
  }
  const isHiring=s.teamId!==store.G.myTeamId;
  const mt=myTeam();const modal=document.getElementById('modal');modal.className='modal';
  const typeLbl=t(s.type==='coach'?'staff.coach':s.type==='scout'?'staff.scout':s.type==='physio'?'staff.physio':s.type==='pr'?'staff.prDirector':'staff.psychologist');
  const typeIcon=s.type==='coach'?'':s.type==='scout'?'':s.type==='physio'?'':s.type==='pr'?'':'';
  const sOvr=staffOvr(s);
  const defaultYrs=s.contractYears||2;
  const canPreSign=canPreSignStaff(s);
  const currentRoleHolder=isHiring&&s.teamId===null?getOwnedSingleStaffByType(s.type):null;
  const replaceFee=currentRoleHolder&&currentRoleHolder.id!==s.id?staffReplacementCost(currentRoleHolder):0;
  const staffExpSal=staffWageForOvr(sOvr);
  const staffMaxSal=Math.max(60000,Math.round(staffExpSal*3));
  const staffDefBonus=Math.round(staffExpSal*0.2);
  const staffMaxBonus=Math.max(8000,Math.round(staffExpSal*1.5));
  window._staffNegYrs=defaultYrs;window._staffNegSid=s.id;window._staffNegSal=s.salary||staffExpSal;window._staffNegBonus=staffDefBonus;
  modal.innerHTML=`<div class="mt2">${typeIcon} ${s.name} <button class="close-btn" onclick="closeModal()">\u2715</button></div>
  <div class="flex aic gp16 mb14">
    <div style="font-family:'Saira Condensed',sans-serif;font-weight:800;font-size:40px;color:${staffOvrColor(sOvr)}">${sOvr}</div>
    <div><div class="fs11 ink3">${t('staff.neg.ageLine',{role:typeLbl,ovr:sOvr,age:s.age||'?',peak:s.peakAge?t('staff.neg.peak',{age:s.peakAge}):'',ceiling:s.teamId===store.G.myTeamId?t('staff.neg.ceiling',{ovr:staffCeiling(s)}):''})}</div><div class="fs11 ink3 mt-2">${formatCurrency(s.salary)} ${t('neg.perYear')}</div></div>
  </div>
  ${s.type==='coach'?`<div class="pd8-12 bgs2 bb1 r6 fs11 mb10">${t('staff.neg.development',{youth:Math.round((coachDevMultiplier(s.training,true)-1)*100),senior:Math.round((coachDevMultiplier(s.training,false)-1)*100)})}</div>`:''}
  ${(isHiring&&canPreSign)||replaceFee>0?`<div class="neg-block">
    ${isHiring&&canPreSign?`<div class="neg-row"><div class="neg-label">${t('staff.neg.contractStatus')}</div><div class="neg-val">${t('staff.neg.preSignStatus')}</div></div>`:''}
    ${replaceFee>0?`<div class="neg-row"><div class="neg-label">${t('staff.neg.replacementCost')}</div><div class="neg-val">${t('staff.neg.replacementValue',{cost:formatCurrency(replaceFee),name:currentRoleHolder.name})}</div></div>`:''}
  </div>`:''}
  <div style="margin:12px 0">
    <div class="fs10 up ls1 ink3 mb4">${t('neg.salary')}: <b id="staff-sal-lbl" class="cr">${formatCurrency(s.salary||staffExpSal)} ${t('neg.perYear')}</b> <span class="ink3">(${t('staff.neg.expected',{salary:formatCurrency(staffExpSal)})})</span></div>
    <input type="range" min="1000" max="${staffMaxSal}" step="1000" value="${s.salary||staffExpSal}" class="w100 accr" oninput="window._staffNegSal=+this.value;document.getElementById('staff-sal-lbl').firstChild.textContent=formatCurrency(+this.value)+' '+t('neg.perYear');staffNegUpdate()">
    <div class="kicker">${t('neg.signingBonus')}: <b id="staff-bonus-lbl" class="cr">${formatCurrency(staffDefBonus)}</b></div>
    <input type="range" min="0" max="${staffMaxBonus}" step="1000" value="${staffDefBonus}" class="w100 accr" oninput="window._staffNegBonus=+this.value;document.getElementById('staff-bonus-lbl').textContent=formatCurrency(+this.value);staffNegUpdate()">
    <div class="kicker">${t('neg.contractYears')}: <b id="staff-yr-lbl" class="cr">${t('neg.yearsValue',{count:defaultYrs})}</b></div>
    <input type="range" min="1" max="4" step="1" value="${defaultYrs}" class="w100 accr" oninput="window._staffNegYrs=+this.value;document.getElementById('staff-yr-lbl').textContent=t('neg.yearsValue',{count:this.value});staffNegUpdate()">
    <div id="staff-mood" class="nfb ok mt-12">${t('staff.neg.moodBorderline')}</div>
    <div id="staff-reasons" class="fs11 ink3 mt-6"></div>
  </div>
  <div class="bb1 fs11 ink3 bgs2 r3 mb12" style="padding:10px 14px">${t(canPreSign?'staff.neg.preSignInfo':replaceFee>0?'staff.neg.replaceInfo':'staff.neg.freeInfo')}${t('staff.neg.ownInfo')}</div>
  <div class="btn-row mt-14">
    <button class="btn ${isHiring?'pr':'go'}" onclick="doHireStaff(${s.id})">${t(isHiring?'staff.neg.hire':'staff.neg.extend').toUpperCase()}</button>
    <button class="btn" onclick="closeModal()">${t('staff.neg.cancel').toUpperCase()}</button>
  </div>`;
  openModal();staffNegUpdate();
}
function doHireStaff(sid){
  let s=store.G.staffPool.find(x=>x.id===sid)
    || (store.G.scoutPool||[]).find(x=>x.id===sid)
    || (store.G.prDirectorPool||[]).find(x=>x.id===sid)
    || store.G.staff.find(x=>x.id===sid&&x.teamId!==store.G.myTeamId)
    || getRivalPRDirectors().find(x=>x.id===sid);
  const existing=store.G.staff.find(x=>x.id===sid)||(store.G.prDirector&&store.G.prDirector.id===sid?store.G.prDirector:null);
  // Our own scouts are mirrored into scoutPool at the season change (see
  // findStaffById). Signing "the pool row" for someone we already employ wrote the
  // renewal to that stale copy and left the real contract to expire — treat it as
  // the renewal it actually is.
  if(s&&existing&&existing.teamId===store.G.myTeamId)s=null;
  const mt=myTeam();
  if(s){
    const blockReason=staffNegotiationBlockReason(s);
    if(blockReason){toast(blockReason);closeModal();return;}
  }
  // Negotiated wage + signing bonus (player-like). Reject clear lowball offers
  // BEFORE consuming the negotiation slot for this round.
  const negSal=Math.round(window._staffNegSal||(s?s.salary:(existing?existing.salary:0)));
  const negBonus=Math.max(0,Math.round(window._staffNegBonus||0));
  if(s){
    const fb=staffNegResponse(s,negSal,negBonus,window._staffNegYrs||2);
    if(fb.score<0){toast(t('staff.neg.rejected',{name:s.name,reason:t(fb.reasons[0]||'neg.reason.weakPackage')}));return;}
  }
  if(alreadyNegotiated('staff',sid)){toast(t('staff.neg.alreadyOffered',{name:s?.name||existing?.name||''}));return;}
  markNegotiated('staff',sid);
  const yrs=window._staffNegYrs||2;
  if(s){
    const currentRoleHolder=s.teamId===null?getOwnedSingleStaffByType(s.type):null;
    const replaceFee=currentRoleHolder&&currentRoleHolder.id!==s.id?staffReplacementCost(currentRoleHolder):0;
    // Upfront cash = signing bonus + any poaching buyout. The SALARY is an ongoing
    // wage (paid each season from income), NOT required upfront \u2014 so a near-broke
    // club can still hire an affordable scout/coach. (PR directors keep their cost.)
    const upfrontFee=(s.type==='pr'?(s.cost||0):0);
    const cost=upfrontFee+replaceFee+negBonus;if(cost>0&&mt.budget<cost){toast(t('staff.neg.noBudget'));closeModal();return;}
    if(replaceFee>0&&!confirm(t('staff.neg.replaceConfirm',{name:s.name,current:currentRoleHolder.name,cost:formatCurrency(replaceFee)}))){closeModal();return;}
    const finance=ensureSeasonFinance();
    mt.budget-=cost;
    s.salary=negSal;
    if(finance&&negBonus>0)finance.other-=negBonus;
    if(finance){
      finance.staffBuyouts+=replaceFee;
      if((s.cost||0)>0)finance.prDirectorCost+=(s.type==='pr'?(s.cost||0):0);
    }
    if(s.type==='pr'){
      if(s.teamId!==null&&s.teamId!==store.G.myTeamId){
        store.G.pendingStaffSignings=store.G.pendingStaffSignings||[];
        if(!store.G.pendingStaffSignings.find(x=>x.staffId===s.id))store.G.pendingStaffSignings.push({staffId:s.id,destinationTeamId:store.G.myTeamId,sourceTeamId:s.teamId,years:yrs,kind:'pr'});
        toast(t('staff.neg.prJoinsNext',{name:s.name}));
      }else{
        if(currentRoleHolder&&currentRoleHolder.id!==s.id){
          closeStaffTenure(currentRoleHolder,store.G.season);
          store.G.prDirector=null;
        }
        startStaffTenure(s,store.G.myTeamId,store.G.season);s.contractYears=yrs;
        store.G.prDirector=s;
        store.G.prDirectorPool=(store.G.prDirectorPool||[]).filter(x=>x.id!==sid);
        toast(t('staff.neg.prHired',{name:s.name,years:t('neg.yearsValue',{count:yrs})}));
      }
    }else if(s.teamId!==null&&s.teamId!==store.G.myTeamId){
      store.G.pendingStaffSignings=store.G.pendingStaffSignings||[];
      if(!store.G.pendingStaffSignings.find(x=>x.staffId===s.id))store.G.pendingStaffSignings.push({staffId:s.id,destinationTeamId:store.G.myTeamId,sourceTeamId:s.teamId,years:yrs,kind:'staff'});
      toast(t('staff.neg.joinsNext',{name:s.name}));
    }else{
      if(currentRoleHolder&&currentRoleHolder.id!==s.id){
        closeStaffTenure(currentRoleHolder,store.G.season);
        store.G.staff=store.G.staff.filter(x=>x.id!==currentRoleHolder.id);
      }
      startStaffTenure(s,store.G.myTeamId,store.G.season);s.contractYears=yrs;if(s.type==='scout')s.hired=true;
      if(!store.G.staff.find(x=>x.id===sid))store.G.staff.push(s);
      store.G.staffHistory=store.G.staffHistory||{};
      if(!store.G.staffHistory[s.id])store.G.staffHistory[s.id]=[staffSnap(s)];
      store.G.staffPool=store.G.staffPool.filter(x=>x.id!==sid);
      if(store.G.scoutPool)store.G.scoutPool=store.G.scoutPool.filter(x=>x.id!==sid);
      toast(t('staff.neg.hired',{name:s.name,years:t('neg.yearsValue',{count:yrs})}));
    }
  }else if(existing){
    existing.contractYears=yrs;
    if(negSal>0)existing.salary=negSal;
    if(negBonus>0){mt.budget-=negBonus;const f=ensureSeasonFinance();if(f)f.other-=negBonus;}
    toast(t('staff.neg.renewed',{name:existing.name,years:t('neg.yearsValue',{count:yrs})}));
  }
  closeModal();render();updateHeader();persistGame();
}
function fireStaff(sid){
  const s=store.G.staff.find(x=>x.id===sid);if(!s)return;
  if(!confirm(t('staff.neg.fireConfirm',{name:s.name})))return;
  const mt=myTeam();mt.budget-=s.salary*s.contractYears;
  closeStaffTenure(s,store.G.season);
  store.G.staff=store.G.staff.filter(x=>x.id!==sid);render();updateHeader();toast(t('staff.neg.fired',{name:s.name}));
  persistGame();
}

function upgradeInfra(type){
  const mt=myTeam();
  if(type==='merch'){
    const cur=store.G.infraMerchandising||0;const next=INFRA_MERCH[cur+1];if(!next){toast(t('infra.maximum'));return;}
    if(mt.budget<next.cost){toast(t('infra.noBudget'));return;}
    mt.budget-=next.cost;const finance=ensureSeasonFinance();if(finance)finance.infraCost+=next.cost;store.G.infraMerchandising=cur+1;toast(`${next.name}!`);
    syncMyTeamInfra();render();updateHeader();persistGame();return;
  }
  if(type==='hall'){
    const cur=store.G.infraHall||0;const next=INFRA_HALL[cur+1];if(!next){toast(t('infra.maximum'));return;}
    if(mt.budget<next.cost){toast(t('infra.noBudget'));return;}
    mt.budget-=next.cost;const finance=ensureSeasonFinance();if(finance)finance.infraCost+=next.cost;store.G.infraHall=cur+1;toast(`${next.name}!`);
  }else if(type==='med'){
    const cur=store.G.infraMed||0;const next=INFRA_MED[cur+1];if(!next){toast(t('infra.maximum'));return;}
    if(mt.budget<next.cost){toast(t('infra.noBudget'));return;}
    mt.budget-=next.cost;const finance=ensureSeasonFinance();if(finance)finance.infraCost+=next.cost;store.G.infraMed=cur+1;toast(`${next.name}!`);
  }else if(type==='academy'){
    const cur=store.G.infraAcademy||0;const next=INFRA_ACADEMY[cur+1];if(!next){toast(t('infra.maximum'));return;}
    if(mt.budget<next.cost){toast(t('infra.noBudget'));return;}
    mt.budget-=next.cost;const finance=ensureSeasonFinance();if(finance)finance.infraCost+=next.cost;store.G.infraAcademy=cur+1;toast(`${next.name}!`);
  }
  syncMyTeamInfra();render();updateHeader();persistGame();
}

// Mirror the player's infra levels onto their team object. AI clubs keep infra on
// the team object, and teamStrengthScore/board objectives read from there — without
// the mirror the player's club is rated as if it had day-one infrastructure forever.
function syncMyTeamInfra(){
  const mt=myTeam();if(!mt)return;
  mt.infraHall=store.G.infraHall||0;
  mt.infraMed=store.G.infraMed||0;
  mt.infraAcademy=store.G.infraAcademy||0;
  mt.infraMerchandising=store.G.infraMerchandising||0;
}
// Map each infra type to its state field + level table.
const INFRA_FIELDS={
  hall:{key:'infraHall',arr:INFRA_HALL},
  med:{key:'infraMed',arr:INFRA_MED},
  academy:{key:'infraAcademy',arr:INFRA_ACADEMY},
  merch:{key:'infraMerchandising',arr:INFRA_MERCH},
};
// Downgrade an infra building one level (owner request): FREE, no refund of the
// build cost. The point is to cut a recurring cost (e.g. academy upkeep) in a cash
// crisis — a deliberate, reversible escape valve rather than a money-maker.
function downgradeInfra(type){
  const f=INFRA_FIELDS[type];if(!f)return;
  const cur=store.G[f.key]||0;
  if(cur<=0){toast(t('infra.minimum'));return;}
  const prev=f.arr[cur-1];
  if(!confirm(t('infra.downgradeConfirm',{name:prev.name})))return;
  store.G[f.key]=cur-1;
  toast(t('infra.downgraded',{name:prev.name}));
  syncMyTeamInfra();render();updateHeader();persistGame();
}

// Transfer value of a (usually home-grown) player: a multiple of his market wage,
// with a premium for youth and for unrealised ceiling. This is the income stream
// that lets a "develop & sell" club survive (owner: both selling and loaning are
// valid strategies).
function youthSaleValue(p){
  const base=playerWageForOvr(ovrBase(p));
  let mult=1.6;
  mult+=clamp((playerCeiling(p)-ovrBase(p))/12,0,1.0); // unrealised upside
  mult+=clamp((26-(p.age||24))/10,0,0.8);              // youth premium
  return Math.max(800,Math.round(base*mult));
}
// Interested AI buyers (never youth-only clubs), best fee first.
function youthSaleInterest(p){
  return store.G.teams.filter(t=>!t.isPlayer&&!(t.traits||[]).includes('youthOnly')).map(t=>{
    const need=Math.max(0,ovrBase(p)+6-teamOvr(t.id));
    const interest=clamp(Math.round(30+need*4+Math.max(0,24-(p.age||24))*1.5+(p.isYouth?8:0)),5,95);
    const fee=Math.round(youthSaleValue(p)*(0.8+interest/100));
    return{team:t,interest,fee};
  }).sort((a,b)=>b.fee-a.fee);
}
// Sell one of your players outright to the highest AI bidder (transfer fee income).
function sellPlayer(pid){
  const p=store.G.players.find(x=>x.id===pid);if(!p)return;
  if(p.teamId!==store.G.myTeamId){toast(t('squad.notYours'));return;}
  if(getLoanedOut().find(l=>l.playerId===pid)){toast(t('squad.loanedOutSale'));return;}
  if(getLoanedIn().find(l=>l.playerId===pid)){toast(t('squad.loanedInSale'));return;}
  const offers=youthSaleInterest(p);
  if(!offers.length){toast(t('squad.noBuyers'));return;}
  const best=offers[0];
  if(!confirm(t('squad.sellConfirm',{name:p.name,ovr:ovrBase(p),club:best.team.name,fee:formatCurrency(best.fee)})))return;
  p.teamId=best.team.id;p.role='reserve';p.isYouth=false;p.contractYears=Math.max(2,p.contractYears||0);
  myTeam().budget+=best.fee;
  const finance=ensureSeasonFinance();if(finance)finance.other+=best.fee;
  pushNews('news.playerSold','',{name:p.name,club:best.team.name,fee:formatCurrency(best.fee)});
  toast(t('squad.sold',{name:p.name,club:best.team.name,fee:formatCurrency(best.fee)}));
  buildMarket();render();updateHeader();persistGame();
}

function selectTechPartnership(tpId){
  const tp=TECH_PARTNERSHIPS.find(t=>t.id===tpId);if(!tp)return;
  const pres=calcPrestige();
  if(pres<tp.prestige[0]||pres>tp.prestige[1]){toast(t('sponsor.prestigeMismatch',{prestige:pres}));return;}
  store.G.techPartnership=tpId;
  render();
  const costStr=tp.costPerSeason>0?'+'+formatCurrency(tp.costPerSeason):formatCurrency(tp.costPerSeason);
  toast(t('sponsor.partnershipSelected',{name:tp.name,bonus:tp.bonusDesc,cost:costStr}));
  persistGame();
}

// Sign a sponsor for a chosen term (1..maxYears). A longer commitment carries a
// small per-season premium (the sponsor values the security). Multi-year deals stay
// active across seasons and pay each season the goal is met, until the term ends.
function activateSponsor(s,years){
  const term=clamp(Math.round(years||1),1,s.maxYears||1);
  const yearMult=1+(term-1)*0.06; // +6%/yr per extra committed season
  s.reward=Math.round((s.originalReward||s.reward)*yearMult/500)*500;
  s.years=term;s.yearsLeft=term;s.active=true;s.pending=false;
  store.G.sponsors.push(s);store.G.sponsorOffers=store.G.sponsorOffers.filter(x=>x.id!==s.id);
}
function signSponsor(sid,years){
  const s=store.G.sponsorOffers.find(x=>x.id===sid);if(!s)return;
  const activeCount=store.G.sponsors.filter(x=>x.active).length;
  if(activeCount>=3){toast(t('sponsor.maximum'));return;}
  activateSponsor(s,years);
  closeModal();render();toast(t('sponsor.signed',{name:s.name,years:s.years,count:activeCount+1}));
  persistGame();
}
function signSponsorPreseason(sid,years){
  const s=store.G.sponsorOffers.find(x=>x.id===sid);if(!s)return;
  const activeCount=store.G.sponsors.filter(x=>x.active).length;
  if(activeCount>=3){toast(t('sponsor.maximum'));return;}
  activateSponsor(s,years);
  render();toast(t('sponsor.signed',{name:s.name,years:s.years,count:activeCount+1}));
  persistGame();
}

// Scout system
function clearScoutResult(realId){
  store.G.scoutResults=(store.G.scoutResults||[]).filter(r=>r.realId!==realId);
}
function scoutMissionCost(scout){
  return Math.max(2500,Math.round(1800+staffOvr(scout)*45));
}
function scoutMissionFindCount(scout){
  return 1;
}
function genScoutPlayer(scout,region){
  const id=ui._pid++;
  const acc=scout.accuracy/100;
  const scoutOvr=staffOvr(scout);
  const diffCfg=getDifficultyConfig();
  const scoutPotentialMult=scout.teamId===store.G?.myTeamId?diffCfg.playerScoutPotential:1;
  const p=genYouthPlayer(scout.teamId||null,store.G?.countryId||'PL');p.id=id;
  p.age=16+rnd(0,3);
  p.teamId=null;
  p.peakAge=peakAgeFor(store.G?.countryId);
  p.salary=Math.max(300,Math.round((p.salary||300)*(0.9+(scout.qualityBonus||0)*0.35)));
  p.contractYears=3;
  p.seasonForm=clamp((p.seasonForm||0)+Math.round((scout.qualityBonus||0)*10)-2,-8,10);
  const quality=clamp((scoutOvr-25)/70,0.03,1);
  const scoutPeakFloor=54+Math.round(scoutOvr*0.12)+(scout.specialty==='youth'?2:0);
  const scoutPeakCeil=70+Math.round(scoutOvr*0.2)+(scout.specialty==='talent'?6:0)+(scout.specialty==='youth'?4:0);
  const targetCeiling=Math.round(rollWeightedPeak(scoutPeakFloor,Math.max(scoutPeakFloor+6,scoutPeakCeil),quality)*scoutPotentialMult);
  p.ceiling=Math.max(p.ceiling||0,targetCeiling);
  p.scoutedRegion=region||'Polska';
  p.academyProfile={...(p.academyProfile||{}),region:region||p.academyProfile?.region||t('country.PL'),source:'scout',ceiling:p.ceiling,readiness:p.academyProfile?.readiness||'field'};
  const noise=1-acc;const reported={...p};
  SK.forEach(s=>{reported[s]=Math.max(10,Math.min(96,p[s]+Math.round((Math.random()-.5)*30*noise)));});
  reported.scoutConfidence=Math.round(acc*100);
  reported.ceilingHint=clamp(p.ceiling+rnd(-Math.max(2,Math.round((1-acc)*10)),Math.max(1,Math.round((1-acc)*10))),58,97);
  reported.formHint=seasonFormLabel(p);
  reported.region=region||'Polska';
  reported.roleHint=p.preferredRole;
  return{real:p,reported};
}
function sendScout(scoutId,region){
  const scout=getMyScouts().find(s=>s.id===scoutId)||(store.G.scoutPool||[]).find(s=>s.id===scoutId&&s.hired);if(!scout)return;
  if(store.G.scoutMissions.find(m=>m.scoutId===scoutId&&!m.done)){toast(t('scout.onMission'));return;}
  const cost=scoutMissionCost(scout);
  if(!confirm(t('scout.missionConfirm',{name:scout.name,region,cost:formatCurrency(cost)})))return;
  if((myTeam().budget||0)<cost){toast(t('scout.noBudget',{cost:formatCurrency(cost)}));return;}
  myTeam().budget-=cost;
  const finance=ensureSeasonFinance();
  if(finance)finance.other-=cost;
  store.G.scoutMissions.push({scoutId,region,startMatchday:store.G.matchday,duration:10,done:false,cost});
  toast(t('scout.departed',{name:scout.name,cost:formatCurrency(cost)}));closeModal();render();updateHeader();persistGame();
}
function checkScoutReturns(){
  (store.G.scoutMissions||[]).forEach(m=>{
    if(!m.done&&store.G.matchday>=m.startMatchday+m.duration){
      m.done=true;const scout=getMyScouts().find(s=>s.id===m.scoutId)||(store.G.scoutPool||[]).find(s=>s.id===m.scoutId);if(!scout)return;
      const numPlayers=scoutMissionFindCount(scout);const results=[];
      for(let i=0;i<numPlayers;i++){
        const{real,reported}=genScoutPlayer(scout,m.region);
        store.G.players.push(real);
        results.push({realId:real.id,reported,scoutId:m.scoutId,region:m.region,seen:false,fit:real.playStyle,ceiling:reported.ceilingHint});
      }
      store.G.scoutResults=(store.G.scoutResults||[]).concat(results);
      toast(t('scout.returned',{name:scout.name,count:numPlayers}));
    }
  });
}
function hireScout(sid){
  openStaffNeg(sid);
}
function scoutSign(ri){
  const res=store.G.scoutResults[ri];if(!res)return;
  res.seen=true;openNegotiate(res.realId);
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// v16: TOP 12 MASTERS - Individual Tournament
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function shouldPlayTop12(leagueId){
  if(!store.G||store.G.phase!=='pre'||store.G.matchday!==(TOTAL_MATCHDAYS-1))return false;
  if(typeof leagueId==='number')return !store.G.top12MastersDone?.[leagueId];
  return [1,2].some(id=>!store.G.top12MastersDone?.[id]);
}

// Owner note #3: entrants are CHOSEN, not arbitrary. AI clubs send their player
// with the best season (wins → point balance per appearance → OVR); the player's
// club sends whoever the manager picked in the pre-tournament modal
// (store.G.top12Entrant), falling back to the same AI rule.
function top12Score(p){
  const apps=Math.max(1,(p.leagueSeasonW||0)+(p.leagueSeasonL||0)+(p.leagueSeasonD||0));
  const diff=((p.leagueSeasonPointsWon||0)-(p.leagueSeasonPointsLost||0))/apps;
  return (p.leagueSeasonW||0)*100+diff*10+ovr(p)/10;
}
function getTop12Participants(leagueId){
  const leagueTeams=store.G.teams.filter(t=>t.league===leagueId);
  const participants=[];
  leagueTeams.forEach(t=>{
    const pool=store.G.players.filter(p=>p.teamId===t.id&&!p.retired&&p.role!=='youth');
    let best=pool.sort((a,b)=>top12Score(b)-top12Score(a))[0];
    if(t.id===store.G.myTeamId&&store.G.top12Entrant!=null){
      const picked=pool.find(p=>p.id===store.G.top12Entrant);
      if(picked)best=picked;
    }
    if(best)participants.push({player:best, team:t});
  });
  return participants.sort((a,b)=>top12Score(b.player)-top12Score(a.player)).slice(0,12);
}
// Pre-tournament picker: the manager selects their club's entrant.
function openTop12Picker(leagueId){
  if(!shouldPlayTop12(leagueId)){toast(t('top12.unavailable'));return;}
  if(myLeague()!==leagueId){runTop12Masters(leagueId);return;}
  const pool=store.G.players.filter(p=>p.teamId===store.G.myTeamId&&!p.retired&&p.role!=='youth')
    .sort((a,b)=>top12Score(b)-top12Score(a));
  if(!pool.length){runTop12Masters(leagueId);return;}
  const modal=document.getElementById('modal');modal.className='modal';
  modal.innerHTML=`<div class="mt2">${t('top12.chooseTitle').toUpperCase()} <button class="close-btn" onclick="closeModal()">✕</button></div>
  <div class="fs11 ink3 mb10">${t('top12.chooseHint',{club:myTeam().name})}</div>
  <div class="grid gp6">
  ${pool.map((p,i)=>{
    const apps=(p.leagueSeasonW||0)+(p.leagueSeasonL||0)+(p.leagueSeasonD||0);
    const diff=(p.leagueSeasonPointsWon||0)-(p.leagueSeasonPointsLost||0);
    return`<div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:8px 10px;border:1px solid ${i===0?'var(--gold)':'var(--b1)'};background:var(--s1);border-radius:3px">
      <div><div class="b7 fs13">${p.name}${i===0?` <span class="fs9 cgold">${t('top12.recommendation').toUpperCase()}</span>`:''}${p.injuredFor>0?` <span class="fs9 cr">${t('top12.injury').toUpperCase()}</span>`:''}</div>
      <div class="fs10 ink3">${t('top12.seasonLine',{wins:p.leagueSeasonW||0,losses:p.leagueSeasonL||0,diff:(diff>=0?'+':'')+diff,apps})}</div></div>
      <div class="syne b8 fs22 cr">${ovr(p)}</div>
      <button class="btn pr sm" onclick="store.G.top12Entrant=${p.id};closeModal();runTop12Masters(${leagueId})">${t('top12.enter').toUpperCase()}</button>
    </div>`;}).join('')}
  </div>`;
  openModal();
}

function simIndividualTournamentMatch(p1, p2){
  const r=simIndividual(p1,p2,null,null);
  return{winner:r.homeWin?p1:p2, loser:r.homeWin?p2:p1, score:`${r.hs}:${r.as}`};
}

async function runTop12Masters(leagueId){
  if(!store.G||store.G.top12MastersDone?.[leagueId])return;
  await runSeededEvent('_top12Seed_l'+leagueId,()=>runTop12MastersBody(leagueId));
}
async function runTop12MastersBody(leagueId){
  const participants=getTop12Participants(leagueId);
  if(participants.length<8){toast(t('top12.tooFewTeams'));return;}
  
  store.G.top12MastersDone[leagueId]=true;
  const myId=store.G.myTeamId;
  const myEntry=participants.find(e=>e.team.id===myId);
  
  const modal=document.getElementById('modal');modal.className='modal modal-xl';
  modal.innerHTML=`<div class="mt2">${t('top12.eventTitle',{division:leagueId===1?'I':'II'}).toUpperCase()}</div>
  <div class="grid gtc4 gp6 mb14">
    ${participants.map((e,i)=>`<div style="padding:8px;background:${e.team.id===myId?'var(--tint-bad)':'var(--s2)'};border:1px solid ${e.team.id===myId?'var(--r)':'var(--b1)'};border-radius:3px">
      <div class="fs9 ink3">#${i+1}</div>
      <div class="b7 fs12">${e.player.name}</div>
      <div class="fs10 ink3">${e.team.name}</div>
      <div class="syne b8 fs18 cr">${ovr(e.player)}</div>
    </div>`).join('')}
  </div>
  <div id="t12-bracket" class="mb12"></div>
  <div class="log" id="t12-log" style="height:200px"></div>`;
  openModal();
  
  const logEl=document.getElementById('t12-log');
  const brackEl=document.getElementById('t12-bracket');
  function addLog(t,c=''){const d=document.createElement('div');d.className=c;d.textContent=t;logEl.appendChild(d);logEl.scrollTop=logEl.scrollHeight;}
  
  addLog(t('top12.eventTitle',{division:leagueId===1?'I':'II'}),'hl');
  addLog(t('top12.format',{count:participants.length}));
  await sleep(600);
  
  let current=[...participants.map(e=>e.player)];
  // Pad to power of 2
  while(current.length<16){current.push(null);}
  
  let round=1;
  let myPlayer=myEntry?myEntry.player:null;
  let myEliminated=false;
  const placements={};
  
  while(current.filter(x=>x).length>1){
    const next=[];
    const alive=current.filter(x=>x).length;
    const roundId=alive<=2?'final':alive<=4?'semifinal':alive<=8?'quarterfinal':'round';
    const roundName=roundId==='round'?t('top12.round',{round}):t(`cup.${roundId}`).toUpperCase();
    addLog(`\n// ${roundName}`,'hl');
    await sleep(400);
    
    for(let i=0;i<current.length;i+=2){
      const p1=current[i], p2=current[i+1];
      if(!p1&&!p2){continue;}
      if(!p1){next.push(p2);continue;}
      if(!p2){next.push(p1);addLog(`  ${p1.name}: BYE`,'dm');continue;}
      
      const isMyMatch=myPlayer&&(p1.id===myPlayer.id||p2.id===myPlayer.id);
      await sleep(isMyMatch?800:250);
      const r=simIndividualTournamentMatch(p1,p2);
      next.push(r.winner);
      
      const cls=isMyMatch?(r.winner.id===myPlayer.id?'gd':'bd'):'dm';
      addLog(`  ${p1.name} vs ${p2.name}: ${r.score} \u2192 ${r.winner.name}`,cls);
      if(roundId==='final')placements[r.loser.id]='finalist';
      else if(roundId==='semifinal')placements[r.loser.id]='semifinal';
      else if(roundId==='quarterfinal')placements[r.loser.id]='quarterfinal';
      
      if(isMyMatch&&r.loser.id===myPlayer.id){
        myEliminated=true;
      }
    }
    current=next.filter(x=>x);
    round++;
    await sleep(300);
  }
  
  const champion=current[0];
  if(champion){
    placements[champion.id]='winner';
    addLog(t('top12.championLog',{name:champion.name,club:teamName(champion.teamId)}),'hl');
    // Award champion
    champion.awards=champion.awards||[];
    champion.awards.push({season:store.G.season,type:`top12_winner_l${leagueId}`,clubName:teamName(champion.teamId),displayLabel:`Top 12 Masters ${leagueId===1?'I':'II'} Liga`,label:`Top 12 Masters ${leagueId===1?'I':'II'} Liga S${store.G.season}`});
    champion.morale=100;
    
    // Update records
    store.G.records=store.G.records||{};
    store.G.records.MOST_MVP=store.G.records.MOST_MVP||{playerName:'',count:0};
    const champ_mvps=(champion.awards||[]).filter(a=>String(a.type||'').startsWith('top12_winner')).length;
    if(champ_mvps>(store.G.records.MOST_MVP.count||0)){
      store.G.records.MOST_MVP={playerName:champion.name,count:champ_mvps,season:store.G.season};
    }
    
    const prizeTable=leagueId===1?{winner:15000,finalist:9000,semifinal:4500,quarterfinal:2000}:{winner:9000,finalist:5500,semifinal:3000,quarterfinal:1500};
    Object.entries(placements).forEach(([playerId,place])=>{
      const player=store.G.players.find(p=>String(p.id)===String(playerId));
      if(!player||player.teamId===null)return;
      const team=store.G.teams.find(t=>t.id===player.teamId);
      const prize=prizeTable[place]||0;
      if(!team||!prize)return;
      team.budget=(team.budget||0)+prize;
      if(team.id===myId){
        const finance=ensureSeasonFinance();
        if(finance)finance.prize+=prize;
        addLog(t('top12.prize',{place:t(`top12.place.${place}`),amount:formatCurrency(prize)}),'gd');
      }
    });
    if(champion.teamId===myId){
      addLog(t('top12.attendanceBonus'),'gd');
      store.G._top12Bonus=true; // ticket income multiplier rest of season
      toast(t('top12.winner',{name:champion.name}));
    }
    // No else-reset: both leagues' tournaments run the same matchday, and losing
    // the OTHER league's Top 12 must not wipe a bonus earned in ours. The flag is
    // cleared at season start (startSeason) anyway.
    pushNews('news.top12Champion','cup',{name:champion.name,division:leagueId===1?'I':'II',season:store.G.season});
  }
  
  await sleep(1200);
  closeModal();render();updateHeader();
  persistGame();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// CHART / SVG
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function miniChart(vals){
  if(!vals||vals.length<2)return'';
  const clean=vals.map(v=>Number.isFinite(v)?v:0);
  const mn=Math.min(...clean),mx=Math.max(...clean),h=52,w=160,pad=6,plotH=h-pad*2;
  const pts=clean.map((v,i)=>{
    const x=pad+(i/(Math.max(1,clean.length-1)))*(w-pad*2);
    const ratio=(v-mn)/Math.max(1,mx-mn);
    const y=pad+(1-ratio)*plotH;
    return`${x},${clamp(y,pad,h-pad)}`;
  }).join(' ');
  return`<svg class="mchart" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect x="${pad}" y="${pad}" width="${w-pad*2}" height="${plotH}" rx="6" fill="rgba(255,255,255,.03)" stroke="var(--b1)"/>
    <polyline points="${pts}" fill="none" stroke="var(--r)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${pad+4}" y="${pad+10}" font-size="9" fill="var(--ink3)">${mx}</text>
    <text x="${pad+4}" y="${h-pad-2}" font-size="9" fill="var(--ink3)">${mn}</text>
    <text x="${w-pad-2}" y="${h-pad-2}" text-anchor="end" font-size="9" fill="var(--ink3)">S${store.G.season}</text>
  </svg>`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// HEADER UPDATE
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

window.PPM.gameplay = { sleep, rnd, getLoanedOut, getLoanedIn, canLoanOut, openLoanModal, doLoanOut, doBorrowIn, returnLoans, getMerchIncome, estimateAttendance, ticketPriceDemand, calcTVRights, getPRDirector, getPRDirectorMarket, getRivalPRDirectors, getTeamPRDirector, hirePRDirector, genNewsFeed, pushNews, generateMatchdayNews, getTechPartnership, ovr, ovrBase, engineStats, equipmentMods, getPlayerAdjustedStats, getActiveBrand, myTeam, myPlayers, myStarters, myReserves, teamName, playerName, teamLeague, myLeague, teamOvr, getMax, phaseLabel, phaseColor, seasonFormLabel, staffOvr, staffOvrColor, safeLog, calcPrestige, goalDiff, goalDesc, checkGoal, sponsorProg, contractExpect, negResponse, roleGuaranteeLabel, getNextSeasonCommitments, awardLabel, randName, totalWages, totalWageBreakdown, getMyScouts, getPolishClubStaffMarket, getAllExternalStaffMarket, calcTeamMorale, moraleLabel, calcLeagueMaint, snap, calcGoat, genPlayer, genYouthPlayer, myYouth, promoteYouth, staffSalary, staffEffectiveBonus, genStaff, genSponsorOffers, genScoutPool, buildMarket, toggleMarketShortlist, toggleMarketCompare, makeSchedule, genCupBracket, newGame, getMatchStarters, moveLineup, getCoach, effectiveRating, simIndividual, simTeamMatch, simCupMatch, applyResult, tryInjuries, tryInjuriesForTeam, tryInjuriesAfterMatch, getTeamPsychologist, psychMatchBoost, getTeamPhysio, physioFatigueMult, physioRestBonus, getStyleEdge, buildPointSimProfile, getLivePointStats, applyLongRallyFatigue, coachDevMultiplier, tickInjuries, applyGrowth, retirePlayer, updateRecords, giveSeasonAwards, doPromotionRelegation, buildMatchProgression, buildBudgetEntry, shouldPlayCup, playCupRound, initCanvasVME, stopCanvasVME, renderVME, matchdayModalTitle, runMatchday, safeCloseMatchday, autoPlaySeason, endSeason, startSeason, aiSignPlayers, acceptClubOffer, getFilteredClubOffers, setClubOfferFilter, refreshClubOfferPicker, openClubOfferPicker, showPostSeasonGala, pullYouth, signAcademyProspect, genAcademyIntake, runAcademyMiniTournament, signTrialProspect, resolvePlayerProfile, openPlayerModal, negUpdate, openNegotiate, doNegotiate, promoteToStarter, demoteToReserve, openSwapModal, doSwap, releasePlayer, openStaffModal, openStaffNeg, doHireStaff, fireStaff, upgradeInfra, downgradeInfra, academyUpkeep, sellPlayer, youthSaleValue, youthSaleInterest, selectTechPartnership, signSponsor, signSponsorPreseason, genScoutPlayer, sendScout, checkScoutReturns, hireScout, scoutSign, shouldPlayTop12, getTop12Participants, openTop12Picker, simIndividualTournamentMatch, runTop12Masters, miniChart, calcTeamMarketability, calcPlayerMarketability, getBoardObjective, boardObjectiveLabel, generateBoardObjective, generateBoardObjectiveChoices, selectBoardObjective, difficultyEffectsSummary, getClubHistory, openTeamOverview, getAvatarData, getTeamLogoData, getTeamBranding, playerCeiling, staffCeiling, styleLabel, pruneCareerData, hofRankScore, playerWageForOvr, staffWageForOvr, staffNegResponse, staffNegUpdate, findStaffById, leagueStrengthTopForBudget, getLeagueStrengthTargets, coachDevPercent, genPrincipal, principalLifecycle, assignAiPrincipal, principalStrategyLabel, handleManagerFired, pushMail, unreadMailCount, pendingDecisions, markMailRead, answerMail, generateInboxForMatchday, settleMatchPromises, openMatchNomination, nomToggle, nomConfirm, getMatchNomination, autoNomination, getEligibleMatchPlayers, replenishStaffPools, runSeededEvent, makeDoublesPair, getLeagueFormat, tablePointsFor, protocolDescription, peakAgeFor, fitEquipmentToStyle, clubRubberTier, setRubberTier, simulateBackgroundSeasons, maintainAiRosters };
})();
