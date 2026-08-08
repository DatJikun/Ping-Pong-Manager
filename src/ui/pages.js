(function(){
window.PPM = window.PPM || {};
const { COUNTRIES, COUNTRY_IDS, RECORDS_KEYS, TRAITS, SK, SL, FN, LN, TNAMES_L1, TNAMES_L2, TNAMES_AMATEUR, CNAMES, SCOUTNAMES, PHYSIONAMES, PSYCHNAMES, SNAMES, SFULL, SGOALS, SPONSOR_TIERS, COACH_STYLES, PLAYER_STYLES, PLAYER_STYLE_INFO, TECH_PARTNERSHIPS, INFRA_HALL, INFRA_MED, INFRA_ACADEMY, INFRA_MERCH, PR_DIRECTORS, SCOUT_SPECIALTIES, POLISH_REGIONS, TOTAL_MATCHDAYS, CHART_COLORS } = window.PPM.constants;
const styleLabel=id=>t(`style.${id}`)||id||'?';
const coachStyleLabel=s=>{
  const id=s.styleId||Object.values(COACH_STYLES).find(style=>style.label===s.styleName)?.id;
  return id?t(`coachStyle.${id}`):t('staff.generalCoach');
};
const scoutSpecialtyLabel=s=>{
  const id=s.specialty||SCOUT_SPECIALTIES.find(spec=>spec.label===s.specialtyLabel)?.id;
  return id?t(`scoutSpecialty.${id}`):t('squad.general');
};
const staffRoleLabel=type=>type==='coach'?t('staff.coach'):type==='physio'?t('staff.physio'):type==='psychologist'?t('staff.psychologist'):type==='scout'?t('staff.scout'):type==='pr'?t('staff.prDirector'):type;
const { getLoanedOut, getLoanedIn, getClubSeniorPlayers, matchAvailability, getLastMatchSelection, bestMatchSelection, matchSelectionView, canLoanOut, openLoanModal, doLoanOut, returnLoans, getMerchIncome, calcTVRights, getPRDirector, getPRDirectorMarket, getRivalPRDirectors, hirePRDirector, genNewsFeed, pushNews, generateMatchdayNews, getTechContract, getTechPartnership, formatTechContractEffects, techContractAnnualCashflow, techContractBreakFee, terminateTechPartnership, ovr, ovrBase, getActiveBrand, myTeam, myPlayers, myStarters, myReserves, teamName, playerName, teamLeague, myLeague, teamOvr, getMax, phaseLabel, phaseColor, seasonFormLabel, staffOvr, ratingProfile, staffOvrColor, sleep, rnd, safeLog, calcPrestige, goalDiff, goalDesc, checkGoal, sponsorProg, contractExpect, negResponse, roleGuaranteeLabel, getNextSeasonCommitments, awardLabel, randName, totalWages, totalWageBreakdown, getMyScouts, getPolishClubStaffMarket, getAllExternalStaffMarket, calcTeamMorale, moraleLabel, calcLeagueMaint, snap, calcGoat, genPlayer, genYouthPlayer, myYouth, promoteYouth, staffSalary, staffEffectiveBonus, genStaff, genSponsorOffers, genScoutPool, buildMarket, toggleMarketShortlist, toggleMarketCompare, makeSchedule, genCupBracket, newGame, getMatchStarters, getCoach, effectiveRating, simIndividual, simTeamMatch, simCupMatch, applyResult, tryInjuries, tickInjuries, applyGrowth, retirePlayer, updateRecords, giveSeasonAwards, doPromotionRelegation, buildMatchProgression, buildBudgetEntry, shouldPlayCup, initCanvasVME, stopCanvasVME, renderVME, safeCloseMatchday, endSeason, startSeason, aiSignPlayers, acceptClubOffer, pullYouth, signAcademyProspect, openPlayerModal, negUpdate, openNegotiate, doNegotiate, releasePlayer, openStaffModal, openStaffNeg, doHireStaff, fireStaff, upgradeInfra, selectTechPartnership, signSponsor, signSponsorPreseason, genScoutPlayer, sendScout, checkScoutReturns, hireScout, scoutSign, shouldPlayTop12, getTop12Participants, simIndividualTournamentMatch, miniChart, getBoardObjective, selectBoardObjective, openTeamOverview, getAvatarData, calcPlayerMarketability, getTeamLogoData, getTeamBranding, playerCeiling, staffCeiling, leagueStandings } = window.PPM.gameplay;
const updateHeader = (...args)=>window.PPM.updateHeader?.(...args);
const syncNavState = (...args)=>window.PPM.syncNavState?.(...args);
const setShellMode = (...args)=>window.PPM.setShellMode?.(...args);
const playClick = (...args)=>window.PPM.playClick?.(...args);
const newsText=n=>n.msgKey?t(n.msgKey,n.msgParams||{}):(n.msg||'');

function statBar(label,val,color,max){
  color=color||'var(--r)';max=max||100;const pct=Math.round(val/max*100);
  return `<div class="mb8"><div class="flex jcb aib mb3"><span class="fs9 up ls1 ink3">${label}</span><span style="font-family:'Saira Condensed',sans-serif;font-weight:800;font-size:20px;color:${color}">${val}</span></div><div class="bgs3 r3" style="height:7px"><div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width .4s"></div></div></div>`;
}
function teamPointDiff(t){
  return (t.pointsWon||0)-(t.pointsLost||0);
}
function pageDash(){
  const mt=myTeam();const mp=myPlayers();const myL=myLeague();
  const matchSquad=matchSelectionView(mt.id,getLastMatchSelection(mt.id)||bestMatchSelection(mt.id));
  const matchSlotLabels=['match.nom.slotA','match.nom.slotB','match.nom.slotC','match.nom.slotR1','match.nom.slotR2'];
  const sorted=leagueStandings(myL);
  const pos=sorted.findIndex(t=>t.isPlayer)+1;const pres=calcPrestige();
  const coach=store.G.staff.find(s=>s.teamId===store.G.myTeamId&&s.type==='coach');
  const morale=calcTeamMorale();const brand=getActiveBrand();
  const myMatches=store.G.results.filter(r=>r.season===store.G.season&&(r.homeId===mt.id||r.awayId===mt.id));
  const recentResults=myMatches.slice(-5);
  const canCup=shouldPlayCup();
  const canTop12L1=shouldPlayTop12(1);
  const canTop12L2=shouldPlayTop12(2);
  const phaseText=t(store.G.phase==='pre'?'dash.inSeason':store.G.phase==='preseason'?'dash.preparing':'dash.transferPhase').toUpperCase();
  const activeSponsors=store.G.sponsors.filter(s=>s.active).length;
    const clubOffers=store.G.clubOffers||[];
    const eligibleClubOffers=clubOffers.filter(o=>o.eligible);
  let nextActionLabel=t('dash.playMatchday',{number:store.G.matchday+1}).toUpperCase();
  let nextActionCall='runMatchday()';
  let nextActionStyle='btn pr';
  const pendingMail=(window.PPM.gameplay.pendingDecisions?.()||[]).length;
  if(store.G.phase==='pre'&&pendingMail){
    nextActionLabel=t('dash.inboxDecisions',{count:pendingMail}).toUpperCase();
    nextActionCall="go('inbox')";
    nextActionStyle='btn gl';
  }else if(store.G.phase==='preseason'){
    nextActionLabel=t('dash.preparation').toUpperCase();
    nextActionCall="go('preseason')";
    nextActionStyle='btn gl';
  }else if(store.G.phase!=='pre'){
    nextActionLabel=t('dash.newSeason').toUpperCase();
    nextActionCall='endSeason()';
    nextActionStyle='btn go';
  }else if(canTop12L1){
    nextActionLabel=t('dash.top12Action',{division:'I'});
    nextActionCall='openTop12Picker(1)';
    nextActionStyle='btn gl';
  }else if(canTop12L2){
    nextActionLabel=t('dash.top12Action',{division:'II'});
    nextActionCall='openTop12Picker(2)';
    nextActionStyle='btn gl';
  }
  // (no cup branch: a due cup round now plays itself before the next matchday)
  const preseasonMissing=[];
  if(store.G.phase==='preseason'){
    if(activeSponsors<3)preseasonMissing.push(t('dash.missingSponsors',{count:activeSponsors}));
    if(!store.G.techPartnership)preseasonMissing.push(t('dash.missingTech'));
  }
  const boardObjective=getBoardObjective();
  const boardProgress=boardObjective?sponsorProg(boardObjective):null;
  const recentWins=recentResults.filter(r=>{const isHome=r.homeId===mt.id;return (isHome&&r.homeWin)||(!isHome&&!r.homeWin&&!r.isDraw);}).length;
  const recentLosses=recentResults.filter(r=>{const isHome=r.homeId===mt.id;return (isHome&&!r.homeWin&&!r.isDraw)||(!isHome&&r.homeWin);}).length;
  const formArc=t(recentResults.length===0?'dash.formNew':recentWins>=4?'dash.formHot':recentLosses>=3?'dash.formTrouble':'dash.formSteady');
  const sponsorPulse=store.G.sponsors.filter(s=>s.active).map(s=>sponsorProg(s)).sort((a,b)=>b.pct-a.pct)[0];
  const boardWon=boardObjective?checkGoal(boardObjective):false;
  const boardMood=t(!boardObjective?'dash.noPressure':boardWon?'dash.boardHappy':(boardProgress?.pct||0)>=70?'dash.boardProgress':'dash.boardPressure');
  
  return`<div class="ph">
    <div><div class="pt">${mt.name} <span class="league-badge ${myL===1?'l1':'l2'}">${t(myL===1?'league.divisionOne':'league.divisionTwo').toUpperCase()}</span></div><div class="ps">${t('common.season')} ${store.G.season} / ${t('library.matchday',{number:`${store.G.matchday}/${TOTAL_MATCHDAYS}`})} / ${phaseText}</div></div>
    <div class="btn-row">
      <button class="${nextActionStyle} fs12" onclick="${nextActionCall}" style="padding:10px 20px">${nextActionLabel}</button>
      ${store.G.phase==='pre'?`<button class="btn ${ui.autoPlay?'r':'gl'} fs12" onclick="autoPlaySeason()" style="padding:10px 16px" title="${t('dash.autoHint')}">${t(ui.autoPlay?'dash.stopAuto':'dash.autoSeason').toUpperCase()}</button>`:''}
    </div>
  </div>
  ${store.G.phase==='preseason'?`<div class="banner" style="margin-bottom:14px;border-left-color:${preseasonMissing.length?'var(--orange)':'var(--g)'}"><div class="dot" style="background:${preseasonMissing.length?'var(--orange)':'var(--g)'}"></div>${preseasonMissing.length?t('dash.preseasonMissing',{items:preseasonMissing.join(', ')}):t('dash.preseasonReady')}</div>`:''}
${clubOffers.length&&store.G.phase!=='pre'?`<div class="card mb14 bt3-blue"><div class="ct">${t('dash.clubOfferTitle').toUpperCase()}</div><div class="grid gp12 aic" style="grid-template-columns:1.1fr auto"><div><div class="b7">${t('dash.clubOfferReach',{eligible:eligibleClubOffers.length,total:clubOffers.length})}</div><div class="fs11 ink3 mt-4" style="line-height:1.5">${t('dash.clubOfferHint')}</div></div><button class="btn pr" onclick="openClubOfferPicker()">${t('dash.chooseClub').toUpperCase()}</button></div></div>`:''}
  <div class="g5">
    <div class="sb"><div class="l">${t('dash.position',{league:t(myL===1?'league.divisionOne':'league.divisionTwo')})}</div><div class="v ${pos<=3?'gold':pos<=6?'':'r'} fs34">#${pos}</div><div class="sub">${mt.pts} ${t('dash.points')} / ${mt.w}${t('dash.winShort')}/${mt.d||0}${t('dash.drawShort')}/${mt.l}${t('dash.lossShort')}</div></div>
    <div class="sb"><div class="l">${t('header.budget')}</div><div class="v g fs28">${Math.floor(mt.budget/1000)}k</div><div class="sub">${formatCurrency(mt.budget)}</div></div>
    <div class="sb"><div class="l">${t('dash.teamOvr')}</div><div class="v fs34">${teamOvr(mt.id)}</div><div class="sub">${t('dash.seniors',{count:getClubSeniorPlayers(mt.id).length})}</div></div>
    <div class="sb"><div class="l">${t('header.prestige')}</div><div class="v gold fs34">${pres}</div></div>
    <div class="sb"><div class="l">${t('dash.morale')}</div><div class="v ${morale>=70?'g':morale>=40?'gold':'r'} fs34">${morale}%</div><div class="sub">${moraleLabel(morale)}</div></div>
  </div>
  <div class="card mb14 bt3-gold">
    <div class="ct">${t('dash.projectPulse').toUpperCase()}</div>
    <div class="grid gp12" style="grid-template-columns:1.15fr .85fr .85fr">
      <div>
        <div class="b7 mb4">${t('dash.seasonStory')}</div>
        <div class="fs12 ink2 lh155">${formArc}</div>
      </div>
      <div>
        <div class="b7 mb4">${t('dash.board')}</div>
        <div class="fs12 ink2">${boardObjective?goalDesc(boardObjective.goal):t('dash.noObjective')}</div>
        <div style="font-size:11px;color:${boardWon?'var(--g)':'var(--ink3)'};margin-top:4px">${boardMood}</div>
        ${boardProgress?`<div class="mt-6 h8 bgs3 rpill"><div style="height:100%;width:${boardProgress.pct}%;background:${boardWon?'var(--g)':'var(--gold)'};border-radius:999px"></div></div><div class="fs10 ink3 mt-4">${boardProgress.label}</div>`:''}
      </div>
      <div>
        <div class="b7 mb4">${t('nav.sponsors')}</div>
        <div class="fs12 ink2">${sponsorPulse?t('dash.hottestDeal',{label:sponsorPulse.label}):t('dash.noSponsorTension')}</div>
        <div class="fs11 ink3 mt-4">${brand?t('dash.techPartner',{name:brand.name}):t('dash.noTechPartner')}</div>
      </div>
    </div>
  </div>
  <div class="g2">
    <div>
      <div class="card"><div class="ct">${t('dash.matchSquad').toUpperCase()}</div>
      ${matchSquad.slots.map((slot,index)=>{const p=slot.player||slot.previousPlayer;const status=slot.status;return`<div class="grid gp8 aic pd8-0 bdb-s3 ${p?'cur':''}" style="grid-template-columns:86px 1fr auto" ${p?`onclick="openPlayerModal(${p.id})"`:''}>
        <div class="fs9 b8" style="color:${index<3?'var(--g)':'var(--blue)'}">${t(matchSlotLabels[index])}</div>
        ${p?`<div class="flex aic gp10 minw0"><img src="${getAvatarData(p,'player')}" alt="" class="avatar"><div class="minw0"><div class="b7 fs13">${p.name}</div><div class="fs10 ${status.available?'ink3':'cr'}">${status.available?`${t('dash.age',{age:p.age})} \u00b7 ${styleLabel(p.playStyle)}`:t(status.reasonKey,status.reasonParams)}</div></div></div>${window.PPM.ratingStars.renderRating(ratingProfile(ovr(p),playerCeiling(p)),{size:'compact',peakKnown:true,disclosure:'summary',showCurrentOvr:true})}`
          :`<div class="fs11 ink3">${t('match.nom.vacant')}</div><div class="ink3">—</div>`}
      </div>`;}).join('')}
      </div>
      <div class="card"><div class="ct">${t('dash.recentMatches').toUpperCase()}</div>
      ${recentResults.length?recentResults.map(r=>{const isHome=r.homeId===mt.id;const opp=store.G.teams.find(t=>t.id===(isHome?r.awayId:r.homeId));const won=(isHome&&r.homeWin)||(!isHome&&!r.homeWin&&!r.isDraw);const drew=r.isDraw;return`<div class="flex jcb aic pd6-0 bdb-s3"><div class="fs12">${t(isHome?'dash.homeShort':'dash.awayShort')} vs ${opp?.name||'?'}</div><div class="syne b7 fs14">${r.score}</div><div style="font-size:11px;font-weight:700;color:${drew?'var(--gold)':won?'var(--g)':'var(--r)'}">${t(drew?'dash.drawShort':won?'dash.winShort':'dash.lossShort')}</div></div>`;}).join(''):`<div class="ink3 fs12">${t('dash.noResults')}</div>`}
      </div>
    </div>
    <div>
      <div class="card"><div class="ct">${t('dash.table',{league:t(myL===1?'league.divisionOne':'league.divisionTwo')}).toUpperCase()} <span class="fs9">TOP 6</span></div>
      <table class="t"><tr><th>#</th><th>${t('dash.team')}</th><th>${t('dash.points')}</th><th>${t('dash.record')}</th><th>${t('dash.difference')}</th><th>OVR</th></tr>
      ${sorted.slice(0,6).map((t,i)=>`<tr class="${t.isPlayer?'mine':''}"><td><span class="pos ${i<3?'p'+(i+1):''}">${i+1}</span></td><td style="font-weight:${t.isPlayer?700:400};font-size:12px">${t.name}</td><td class="syne b8">${t.pts}</td><td class="fs10 ink3">${t.w}-${t.d||0}-${t.l}</td><td style="font-weight:700;color:${teamPointDiff(t)>=0?'var(--g)':'var(--r)'}">${teamPointDiff(t)>=0?'+':''}${teamPointDiff(t)}</td><td class="ink3">${teamOvr(t.id)}</td></tr>`).join('')}
      </table>
      </div>
      ${store.G.cup?(()=>{const status=window.PPM.gameplay.getCupClubStatus(mt.id);return`<div class="card"><div class="ct">${t('dash.cup').toUpperCase()}</div><div class="fs12 ink3">${t(`cup.status.${status.state}`)}</div>${status.nextTrigger!==null?`<div class="fs10 cpurple mt-6 b7">${t('cup.nextTrigger',{matchday:status.nextTrigger})}</div>`:''}</div>`;})():''}
      <div class="card"><div class="ct">${t('dash.messages').toUpperCase()}</div>
        ${genNewsFeed().length?genNewsFeed().map(n=>`<div class="news-item ${n.type||''}">${newsText(n)} <span class="fs9 ink3">(S${n.season}/MD${n.matchday})</span></div>`).join(''):`<div class="fs11 ink3">${t('dash.noMessages')}</div>`}
      </div>
    </div>
  </div>`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// PAGE: SQUAD
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function pageSquad(){
  if(ui.squadTab==='starter'||ui.squadTab==='reserve')ui.squadTab='squad';
  const seniors=getClubSeniorPlayers(store.G.myTeamId,true),youth=myYouth();
  const selectionView=matchSelectionView(store.G.myTeamId,getLastMatchSelection(store.G.myTeamId)||bestMatchSelection(store.G.myTeamId));
  const academyScouts=getMyScouts();
  const academyReports=(store.G.scoutResults||[]).filter(r=>{
    const real=store.G.players.find(p=>p.id===r.realId);
    return !!real&&real.teamId!==store.G.myTeamId;
  });
  const academyNewReports=academyReports.filter(r=>!r.seen).length;
  const baseList=ui.squadTab==='squad'?seniors:ui.squadTab==='youth'?youth:[];
  const squadSearch=(ui.squadSearch||'').trim().toLowerCase();
  const squadStyle=ui.squadStyleFilter||'all';
  const list=baseList.filter(p=>{
    const matchesText=!squadSearch||p.name.toLowerCase().includes(squadSearch);
    const matchesStyle=squadStyle==='all'||p.playStyle===squadStyle;
    return matchesText&&matchesStyle;
  });
  if(ui.squadTab==='squad')list.sort((a,b)=>{
    const slot=player=>selectionView.slots.findIndex(item=>item.previousPlayer?.id===player.id);
    const aSlot=slot(a),bSlot=slot(b);
    if(aSlot>=0||bSlot>=0)return(aSlot<0?99:aSlot)-(bSlot<0?99:bSlot);
    const available=Number(matchAvailability(b,store.G.myTeamId).available)-Number(matchAvailability(a,store.G.myTeamId).available);
    return available||ovr(b)-ovr(a)||a.name.localeCompare(b.name);
  });
  const _loanedOut=getLoanedOut();
  if(ui.squadTab==='loans'){
    return`<div class="ph"><div><div class="pt">${t('squad.title')}</div></div></div>
  <div class="rtabs">
    <div class="rtab" onclick="ui.squadTab='squad';render()">${t('squad.seniorSquad')} (${seniors.length})</div>
    <div class="rtab" onclick="ui.squadTab='youth';render()">${t('squad.academy')} (${youth.length})</div>
    <div class="rtab on" onclick="ui.squadTab='loans';render()">${t('squad.loans')} (${_loanedOut.length})</div>
  </div>
    <div class="grid gp10">
    ${_loanedOut.length?_loanedOut.map(l=>{const p=store.G.players.find(x=>x.id===l.playerId);if(!p)return'';return`<div class="grid gtc1a gp10 aic pd14 bbb bgs1 bl4-blue r4">
      <div>
        <div class="syne b7 fs16">${p.name}</div>
        <div class="fs11 ink3">${t('squad.loanedTo',{club:teamName(l.toTeamId)})} ${l.academyLoan?`<span class="cpurple b7">/ ${t('squad.academy')}</span>`:''}</div>
        <div class="fs11 cg">${t('squad.saving',{amount:formatCurrency(Math.round(p.salary/2))})}</div>
        <div class="fs10 ink3">${t(l.academyLoan?'squad.academyReturn':'squad.autoReturn')}</div>
        <div class="mt-6 grid gtc4 gp4" style="max-width:240px">${SK.map(s=>`<div class="tac"><div class="fs9 ink3">${SL[s]}</div><div class="b7">${p[s]}</div></div>`).join('')}</div>
      </div>
      ${window.PPM.ratingStars.renderRating(ratingProfile(ovrBase(p),p.isYouth&&Number.isFinite(p.academyProfile?.ceiling)?p.academyProfile.ceiling:playerCeiling(p)),{size:'compact',peakKnown:!p.isYouth||Number.isFinite(p.academyProfile?.ceiling),disclosure:'summary',showCurrentOvr:true})}
    </div>`;}).join(''):`<div class="pd40 tac ink3">${t('squad.noLoans')}</div>`}
    ${(()=>{const inn=getLoanedIn();return inn.length?`<div class="ct mt-14">${t('squad.loanedIn')}</div>${inn.map(l=>{const p=store.G.players.find(x=>x.id===l.playerId);if(!p)return'';return`<div class="grid gtc1a gp10 aic pd14 bgs1 bl4-purple r4" style="border:1px solid var(--purple)">
      <div>
        <div class="syne b7 fs16">${p.name}</div>
        <div class="fs11 ink3">${t('squad.loanedFrom',{club:teamName(l.fromTeamId)})}</div>
        <div class="fs11 ink3">${t('squad.wageShare',{percent:Math.round((l.wageShare||0.6)*100),amount:formatCurrency(Math.round((p.salary||0)*(l.wageShare||0.6)))})}</div>
      </div>
      ${window.PPM.ratingStars.renderRating(ratingProfile(ovrBase(p),p.isYouth&&Number.isFinite(p.academyProfile?.ceiling)?p.academyProfile.ceiling:playerCeiling(p)),{size:'compact',peakKnown:!p.isYouth||Number.isFinite(p.academyProfile?.ceiling),disclosure:'summary',showCurrentOvr:true})}
    </div>`;}).join('')}`:'';})()}
    </div>`;
  }
  const mt0=myTeam();
  const ovrRange=store.G.infraAcademy>0?gameDataText('infraAcademy',store.G.infraAcademy,'desc',INFRA_ACADEMY[store.G.infraAcademy].desc):t('squad.noAcademy');
  const academyLevel=store.G.infraAcademy||0;
  const academyBestCurrent=youth.length?Math.max(...youth.map(p=>ovrBase(p))):0;
  const academyCandidates=(store.G.academyProspects||[]);
  const academyTrial=(store.G.academyTrial||[]);
  const mtBudgetLow=mt0.budget<10000;
  // The academy used to be five stacked cards on one scroll. It is now four
  // sub-steps with exactly one block on screen at a time, in the order you
  // actually work: who is in the academy -> who wants in -> who is looking ->
  // what they found.
  const acaSteps=[
    ['squad',t('squad.juniors'),youth.length],
    ['intake',t('squad.intake'),academyCandidates.length+academyTrial.length],
    ['scouts',t('squad.scouts'),academyScouts.length],
    ['reports',t('squad.reports'),academyReports.length],
  ];
  if(!acaSteps.some(s=>s[0]===ui.academyTab))ui.academyTab='squad';
  const acaTab=ui.academyTab;
  const prospectCard=(p,i,action,label,pendingSource)=>`<div class="scout-card academy-report cur" onclick="openPlayerModal(${p.id},'${pendingSource}',${i})">
    <div class="flex jcb mb8"><div class="staff-head"><img src="${getAvatarData(p,'player')}" alt="${p.name}" class="avatar"><div><div class="b7">${p.name}</div><div class="fs10 ink3">${p.age} · ${p.academyProfile?.region||t('squad.clubAcademy')}</div></div></div>${window.PPM.ratingStars.renderRating(ratingProfile(ovrBase(p),Number.isFinite(p.academyProfile?.ceiling)?p.academyProfile.ceiling:Number.isFinite(p.ceiling)?p.ceiling:ovrBase(p)),{size:'compact',peakKnown:Number.isFinite(p.academyProfile?.ceiling)||Number.isFinite(p.ceiling),disclosure:'summary',showCurrentOvr:true})}</div>
    <div class="attrs mb10">${SK.map(s=>`<div class="attr-row"><span>${SL[s]}</span><b class="${ovrBase(p)?'':''}">${p[s]}</b></div>`).join('')}</div>
    <div class="grid gtc2 gp6 fs11 ink3 mb10"><div>${t('squad.style')}: <b>${styleLabel(p.playStyle)}</b></div></div>
    <button class="btn pr sm w100" onclick="event.stopPropagation();${action}">${label}</button>
  </div>`;

  return`<div class="ph"><div><div class="pt">${t('squad.title')}</div><div class="ps">${t('squad.subtitle')}</div></div></div>
  <div class="rtabs">
    <div class="rtab ${ui.squadTab==='squad'?'on':''}" onclick="ui.squadTab='squad';render()">${t('squad.seniorSquad')} (${seniors.length})</div>
    <div class="rtab ${ui.squadTab==='youth'?'on':''}" onclick="ui.squadTab='youth';render()">${t('squad.academy')} (${youth.length})</div>
    <div class="rtab ${ui.squadTab==='loans'?'on':''}" onclick="ui.squadTab='loans';render()">${t('squad.loans')} (${getLoanedOut().length})</div>
  </div>
  ${ui.squadTab==='youth'?`
  <div class="g4 mb14">
    <div class="sb" style="--tone:var(--purple)"><div class="l">${t('squad.academy')}</div><div class="v" style="font-size:20px">${gameDataText('infraAcademy',academyLevel,'name',INFRA_ACADEMY[academyLevel].name)}</div><div class="sub">${t('squad.level',{current:academyLevel,max:INFRA_ACADEMY.length-1})} · ${ovrRange}</div></div>
    <div class="sb" style="--tone:var(--cyan)"><div class="l">${t('squad.juniors')}</div><div class="v">${youth.length}</div><div class="sub">${t('squad.juniorExit')}</div></div>
    <div class="sb" style="--tone:var(--volt)"><div class="l">${t('squad.bestCurrentOvr')}</div><div class="v">${academyBestCurrent||'-'}</div><div class="sub">${t('squad.classCurrentStrength')}</div></div>
    <div class="sb"><div class="l">${t('squad.upkeep')}</div><div class="v">${Math.round((INFRA_ACADEMY[academyLevel].upkeep||0)/1000)||'-'}k</div><div class="sub">${t('squad.yearly',{amount:formatCurrency(INFRA_ACADEMY[academyLevel].upkeep||0)})}</div></div>
  </div>
  <div class="substeps">
    ${acaSteps.map(([id,label,count])=>`<div class="ss ${acaTab===id?'on':''}" onclick="ui.academyTab='${id}';render()">
      <div class="n">${count}</div>${label}
    </div>`).join('')}
  </div>
  ${acaTab==='intake'?`<div class="stage">
    <div class="over">${t('squad.intakeTitle')}</div>
    <h3>${t('squad.intakeQuestion')}</h3>
    <p class="why">${t('squad.intakeWhy')}</p>
    ${academyLevel===0?`<div class="empty-state mt-14">${t('squad.buildAcademy')}</div>`:`
      <div class="h-sub">${t('squad.class')}</div>
      ${academyCandidates.length?`<div class="grid gtcfit240 gp12">${academyCandidates.map((p,i)=>prospectCard(p,i,`signAcademyProspect(${i})`,t('squad.acceptAcademy'),'academyProspects')).join('')}</div>`
        :`<div class="empty-state">${t('squad.noCandidates')}</div>`}
      <div class="h-sub">${t('squad.miniTournament')}</div>
      ${academyTrial.length?`<div class="grid gtcfit240 gp12">${academyTrial.map((p,i)=>prospectCard(p,i,`signTrialProspect(${i})`,t('squad.chooseCandidate'),'academyTrial')).join('')}</div>`
        :store.G.academyTrialUsed?`<div class="empty-state">${t('squad.tournamentUsed')}</div>`
        :`<div class="opt"><div><b>${t('squad.organizeTournament')}</b><p>${t('squad.tournamentHint')}</p></div><div class="m neg">−${formatCurrency(10000)}<s>${t('squad.oneOff')}</s></div><button class="btn pr" onclick="runAcademyMiniTournament()" ${mtBudgetLow?'disabled':''}>${t('squad.organize')}</button></div>`}
    `}
  </div>`
  :acaTab==='scouts'?`<div class="stage">
    <div class="over">${t('squad.academyScouts')}</div>
    <h3>${t('squad.scoutQuestion')}</h3>
    <p class="why">${t('squad.scoutWhy')}</p>
    ${academyScouts.length?`<div class="grid gp12 mt-14" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
      ${academyScouts.map(s=>{const mission=(store.G.scoutMissions||[]).find(m=>m.scoutId===s.id&&!m.done);const current=staffOvr(s);const cost=Math.max(2500,Math.round(1800+current*45));return`<div class="scout-card academy cur" onclick="openStaffModal(${s.id})">
        <div class="flex jcb mb8"><div class="staff-head"><img src="${getAvatarData(s,'staff')}" alt="${s.name}" class="avatar"><div><div class="b7">${s.name}</div><div class="fs10 ink3">${t('staff.agePeak',{age:s.age||'?',peak:s.peakAge||'?'})} · ${scoutSpecialtyLabel(s)}</div></div></div>${window.PPM.ratingStars.renderRating(ratingProfile(current,staffCeiling(s)),{size:'compact',peakKnown:true,disclosure:'summary',showCurrentOvr:true})}</div>
        ${mission?`<div class="tile fs11">${t('squad.inField',{region:mission.region})}<br>${t('squad.remaining',{count:Math.max(0,mission.startMatchday+mission.duration-store.G.matchday)})}<br>${t('squad.missionCost',{amount:formatCurrency(mission.cost||cost)})}</div>`
          :`<div class="grid gtc1a gp6" onclick="event.stopPropagation()"><select id="academy-reg-${s.id}">${POLISH_REGIONS.map(r=>`<option>${r}</option>`).join('')}</select><button class="btn bl sm" onclick="sendScout(${s.id},document.getElementById('academy-reg-${s.id}').value)">${t('squad.send')}</button></div>
             <div class="fs11 ink3 mt-6">${t('squad.missionCost',{amount:formatCurrency(cost)})} · ${t('squad.reportCount')} · ${t('squad.specialty',{name:scoutSpecialtyLabel(s)})}</div>`}
      </div>`;}).join('')}
    </div>`:`<div class="empty-state mt-14">${t('squad.noScout')}</div>`}
  </div>`
  :acaTab==='reports'?`<div class="stage">
    <div class="over">${t('squad.scoutReports')}</div>
    <h3>${t('squad.reportQuestion')}</h3>
    <p class="why">${t('squad.reportWhy')}</p>
    ${academyReports.length?`<div class="grid gp12 mt-14" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
      ${academyReports.map(res=>{const p=res.reported;const ri=(store.G.scoutResults||[]).findIndex(x=>x.realId===res.realId);const o=ovrBase(p);return`<div class="scout-card result academy-report cur" onclick="openPlayerModal(${res.realId})">
        ${!res.seen?`<span class="pill club mb6">${t('squad.new')}</span>`:''}
        <div class="flex jcb mb6"><div class="staff-head"><img src="${getAvatarData(p,'player')}" alt="${p.name}" class="avatar"><div><div class="b7">${p.name}</div><div class="fs10 ink3">${p.age} · ${res.region||'?'}</div></div></div>${window.PPM.ratingStars.renderRating(ratingProfile(o,Number.isFinite(p.ceilingHint)?p.ceilingHint:o),{size:'compact',peakKnown:Number.isFinite(p.ceilingHint),disclosure:'summary',showCurrentOvr:true})}</div>
        <div class="grid gtc2 gp6 fs11 ink3 mb8"><div>${t('squad.style')}: <b>${styleLabel(p.playStyle)}</b></div><div>${t('squad.form')}: <b>${p.formHint||t('squad.stable')}</b></div><div>${t('squad.confidence')}: <b>${p.scoutConfidence||0}%</b></div></div>
        <div class="attrs mb10">${SK.map(s=>`<div class="attr-row"><span>${SL[s]}</span><b>${p[s]}</b></div>`).join('')}</div>
        <button class="btn pr sm w100" onclick="event.stopPropagation();scoutSign(${ri})">${t('squad.negotiate')}</button></div>`;}).join('')}
    </div>`:`<div class="empty-state mt-14">${t('squad.noReports')}</div>`}
  </div>`
  :`<div class="squad-filters"><input value="${ui.squadSearch||''}" oninput="ui.squadSearch=this.value;render()" placeholder="${t('squad.search')}" style="flex:1.2;min-width:160px"><select onchange="ui.squadStyleFilter=this.value;render()" style="flex:.9;min-width:120px"><option value="all" ${squadStyle==='all'?'selected':''}>${t('squad.allStyles')}</option>${PLAYER_STYLES.map(s=>`<option value="${s}" ${squadStyle===s?'selected':''}>${styleLabel(s)}</option>`).join('')}</select></div>
    <div class="grid gp12" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
      ${list.length?list.map(p=>squadCard(p,selectionView)).join(''):`<div class="empty-state">${t('squad.emptyAcademy')}</div>`}
    </div>`}
  `:`
  <div class="squad-filters"><input value="${ui.squadSearch||''}" oninput="ui.squadSearch=this.value;render()" placeholder="${t('squad.search')}" style="flex:1.2;min-width:160px"><select onchange="ui.squadStyleFilter=this.value;render()" style="flex:.9;min-width:120px"><option value="all" ${squadStyle==='all'?'selected':''}>${t('squad.allStyles')}</option>${PLAYER_STYLES.map(s=>`<option value="${s}" ${squadStyle===s?'selected':''}>${styleLabel(s)}</option>`).join('')}</select></div>
  <div class="grid gp12" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
    ${list.map(p=>squadCard(p,selectionView)).join('')}
  </div>`}`;
}

// Colour a stat bar by its value — six identical red bars carried no information.
function statTone(v){return v>=85?'var(--g)':v>=75?'var(--blue)':v>=62?'var(--gold)':'var(--orange)';}

// One squad card, in three tiers: identity + OVR, the six ratings, then
// condition/contract facts and the actions. Numbers that belong to the full
// profile (marketability, loyalty, preferred role) stay in the player modal,
// one click away — the card was carrying ten stacked rows of them.
function squadCard(p,selectionView){
  const o=ovr(p),inj=p.injuredFor>0,isYouth=p.role==='youth';
  const current=isYouth?ovrBase(p):o;
  const academyPeak=Number.isFinite(p.academyProfile?.ceiling)?p.academyProfile.ceiling:null;
  const peak=isYouth?(academyPeak??current):playerCeiling(p);
  const peakKnown=!isYouth||academyPeak!==null;
  const styleColor=(PLAYER_STYLE_INFO[p.playStyle]||{}).color||'var(--ink3)';
  const slotIndex=isYouth?-1:selectionView.slots.findIndex(slot=>slot.previousPlayer?.id===p.id);
  const slotKeys=['match.nom.slotA','match.nom.slotB','match.nom.slotC','match.nom.slotR1','match.nom.slotR2'];
  const status=isYouth?{available:false,code:'academy',reasonKey:'match.nom.unavailableAcademy',reasonParams:{}}:matchAvailability(p,store.G.myTeamId);
  const statusText=slotIndex>=0
    ?`${t(slotKeys[slotIndex])}${status.available?'':` · ${t(status.reasonKey,status.reasonParams)}`}`
    :status.available?t('squad.outsideMatchSquad'):t(status.reasonKey,status.reasonParams);
  const mor=p.morale||50,fat=p.fatigue||0;
  return`<div class="pc ${inj?'injured':isYouth?'':status.available?'senior':'unavailable'}" onclick="openPlayerModal(${p.id})">
    <div class="pc-top">
      <div class="pc-head">
        <img src="${getAvatarData(p,'player')}" alt="${p.name}" class="avatar lg">
        <div class="minw0">
          <div class="pc-name">${p.name}</div>
          <div class="pc-meta">${t('squad.agePeak',{age:p.age,peak:p.peakAge})} · <span style="color:${phaseColor(p)}">${phaseLabel(p)}</span></div>
          <div class="pc-style" style="color:${styleColor}">${styleLabel(p.playStyle)}</div>
        </div>
      </div>
      <div class="pc-ovr-wrap">
        ${window.PPM.ratingStars.renderRating(ratingProfile(current,peak),{size:'standard',peakKnown,disclosure:'summary',showCurrentOvr:true})}
      </div>
    </div>
    <div class="pc-tags">
      ${inj?`<span class="pc-tag bad">⚕ ${t('squad.injury',{count:p.injuredFor})}</span>`:''}
      ${isYouth?`<span class="pc-tag youth">${t('squad.academyYears',{count:Math.max(0,21-p.age)})}</span>`:`<span class="pc-tag ${status.available?(slotIndex>=0?'board':''):'bad'}">${statusText}</span><span class="pc-tag">${t('squad.expectation',{role:roleGuaranteeLabel(p.preferredRole||'starter')})}</span>`}
    </div>
    <div class="pc-stats">${SK.map(s=>`<div class="pcs"><span class="l">${SL[s]}</span><span class="bar"><span class="fill" style="width:${p[s]}%;background:${statTone(p[s])}"></span></span><span class="v">${p[s]}</span></div>`).join('')}</div>
    ${p.traits.length?`<div class="traits">${p.traits.map(id=>`<span class="has-tooltip tb ${TRAITS[id]?.type||'men'}">${t(`trait.${id}.label`)}<span class="tip">${t(`trait.${id}.desc`)}</span></span>`).join('')}</div>`:''}
    <div class="pc-cond ${mor>=80?'energy-active':''}">
      <div><div class="pc-cond-l">${t('squad.morale')} <b>${mor}%</b></div><div class="morale-bar"><div class="morale-fill" style="width:${mor}%"></div></div></div>
      <div><div class="pc-cond-l">${t('squad.fatigue')} <b class="${fat>=70?'cr':''}">${fat}%</b></div><div class="fatigue-bar"><div class="fatigue-fill" style="width:${fat}%"></div></div></div>
    </div>
    <div class="pc-facts">
      <span class="k">${t('squad.salary')}</span><span class="v">${formatCurrency(p.salary)}</span>
      <span class="k">${t('squad.contract')}</span><span class="v ${p.contractYears<=1?'cr b7':''}">${p.contractYears} ${t(p.contractYears===1?'common.year':'common.years')}</span>
      <span class="k">${t('squad.form')}</span><span class="v">${seasonFormLabel(p)}</span>
      <span class="k">${t('squad.record')}</span><span class="v">${p.seasonW}W / ${p.seasonL}L</span>
    </div>
    <div class="pc-actions" onclick="event.stopPropagation()">
      ${isYouth?`<button class="btn go sm" onclick="promoteYouth(${p.id})">${t('squad.promoteSenior')}</button>`:''}
      <button class="btn gl sm" onclick="openNegotiate(${p.id})">${t('squad.contract')}</button>
      ${!p.loanedOut?`<button class="btn sm bcb cblue" onclick="openLoanModal(${p.id})" title="${t('squad.loanTitle')}">${t('squad.loan')}</button>`:''}
      ${!p.loanedOut?`<button class="btn sm bcg cg" onclick="sellPlayer(${p.id})" title="${t('squad.sellTitle')}">${t('squad.sell')}</button>`:''}
      <button class="btn sm bcr cr" onclick="releasePlayer(${p.id})" title="${t('squad.releaseTitle')}">${t('squad.release')}</button>
    </div>
  </div>`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// PAGE: LEAGUE
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function pageLeague(){
  const tab=ui.leagueTab||'l1';
  const statsTab=ui.leagueStatsTab||'table';
  const league=tab==='l1'?1:2;
  const sorted=leagueStandings(league);
  const myId=store.G.myTeamId;
  
  // Gather all starters from this league for stats
  const leaguePlayers=store.G.players.filter(p=>!p.retired&&p.teamId!==null&&store.G.teams.find(t=>t.id===p.teamId)?.league===league&&p.role!=='youth');
  const playerAppearances=p=>((p.leagueSeasonW||0)+(p.leagueSeasonL||0)+(p.leagueSeasonD||0));
  const maxAppearances=leaguePlayers.reduce((mx,p)=>Math.max(mx,playerAppearances(p)),0);
  const durablePlayers=leaguePlayers.filter(p=>playerAppearances(p)>0&&playerAppearances(p)>=Math.max(1,maxAppearances-1));
  const topPointsWon=[...leaguePlayers].sort((a,b)=>(b.leagueSeasonPointsWon||0)-(a.leagueSeasonPointsWon||0)||ovr(b)-ovr(a)).slice(0,10);
  const topPointsLost=[...(durablePlayers.length?durablePlayers:leaguePlayers.filter(p=>playerAppearances(p)>0))].sort((a,b)=>playerAppearances(b)-playerAppearances(a)||(a.leagueSeasonPointsLost||0)-(b.leagueSeasonPointsLost||0)||ovr(b)-ovr(a)).slice(0,10);
  const teamPointsWon=[...sorted].sort((a,b)=>(b.pointsWon||0)-(a.pointsWon||0)||b.pts-a.pts).slice(0,10);
  const teamPointsLost=[...sorted].sort((a,b)=>(a.pointsLost||0)-(b.pointsLost||0)||b.pts-a.pts).slice(0,10);
  
  function playerStatsTable(players,statLabel,mode){
    return`<table class="t"><tr><th>#</th><th>${t('league.player')}</th><th>${t('market.club')}</th><th>${t('league.age')}</th><th>${t('league.contract')}</th><th>${statLabel}</th><th>OVR</th><th>${t('league.action')}</th></tr>
    ${players.map((p,i)=>{
      const isMine=p.teamId===myId;
      const val=mode==='won'?(p.leagueSeasonPointsWon||0):(p.leagueSeasonPointsLost||0);
      return`<tr class="${isMine?'mine':''}"><td><span class="pos ${i<3?'p'+(i+1):''}">${i+1}</span></td><td style="font-weight:${isMine?700:400};cursor:pointer" onclick="openPlayerModal(${p.id})">${p.name}</td><td class="fs11 ink3 cur" onclick="openTeamOverview(${p.teamId})">${teamName(p.teamId)}</td><td>${p.age}</td><td>${p.contractYears||0} ${t((p.contractYears||0)===1?'common.year':'common.years')}</td><td style="font-family:'Saira Condensed',sans-serif;font-weight:800;color:${mode==='won'?'var(--g)':'var(--blue)'}">${val}</td><td>${window.PPM.ratingStars.renderRating(ratingProfile(ovr(p),playerCeiling(p)),{size:'compact',peakKnown:true,disclosure:'summary',showCurrentOvr:true})}</td><td>${!isMine&&p.contractYears===1?`<button class="btn sm pr" onclick="openNegotiate(${p.id})">${t('market.preSign')}</button>`:'-'}</td></tr>`;
    }).join('')}</table>`;
  }
  function teamStatsTable(teams,statLabel,mode){
    return`<table class="t"><tr><th>#</th><th>${t('league.team')}</th><th>OVR</th><th>${statLabel}</th><th>Pts</th><th>${t('league.record')}</th><th>${t('league.difference')}</th></tr>
    ${teams.map((team,i)=>`<tr class="${team.isPlayer?'mine':''}"><td><span class="pos ${i<3?'p'+(i+1):''}">${i+1}</span></td><td style="font-family:'Saira Condensed',sans-serif;font-weight:${team.isPlayer?700:400};cursor:pointer" onclick="openTeamOverview(${team.id})">${team.name}</td><td class="ink3">${teamOvr(team.id)}</td><td style="font-family:'Saira Condensed',sans-serif;font-weight:800;color:${mode==='won'?'var(--g)':'var(--blue)'}">${mode==='won'?(team.pointsWon||0):(team.pointsLost||0)}</td><td>${team.pts}</td><td class="fs10 ink3">${team.w}W/${team.d||0}D/${team.l}L</td><td style="font-weight:700;color:${teamPointDiff(team)>=0?'var(--g)':'var(--r)'}">${teamPointDiff(team)>=0?'+':''}${teamPointDiff(team)}</td></tr>`).join('')}</table>`;
  }
  
  return`<div class="ph"><div><div class="pt">${t('league.title',{season:store.G.season})}</div><div class="ps">${t('league.matchday',{current:store.G.matchday,total:TOTAL_MATCHDAYS})}</div></div></div>
  <div class="rtabs mb10">
    <div class="rtab ${tab==='l1'?'on':''}" onclick="ui.leagueTab='l1';render()">${t('league.divisionOne')}</div>
    <div class="rtab ${tab==='l2'?'on':''}" onclick="ui.leagueTab='l2';render()">${t('league.divisionTwo')}</div>
  </div>
  <div class="rtabs mb14">
    <div class="rtab ${statsTab==='table'?'on':''}" onclick="ui.leagueStatsTab='table';render()">${t('league.table')}</div>
    <div class="rtab ${statsTab==='points_for'?'on':''}" onclick="ui.leagueStatsTab='points_for';render()">${t('league.playerPointsFor')}</div>
    <div class="rtab ${statsTab==='points_against'?'on':''}" onclick="ui.leagueStatsTab='points_against';render()">${t('league.playerPointsAgainst')}</div>
    <div class="rtab ${statsTab==='team_points_for'?'on':''}" onclick="ui.leagueStatsTab='team_points_for';render()">${t('league.teamPointsFor')}</div>
    <div class="rtab ${statsTab==='team_points_against'?'on':''}" onclick="ui.leagueStatsTab='team_points_against';render()">${t('league.teamPointsAgainst')}</div>
  </div>
  ${statsTab==='table'?`<div class="card"><div class="ct">${t('league.tableTitle',{division:league===1?'I':'II'})}</div>
  <table class="t"><tr><th>#</th><th>${t('league.team')}</th><th>OVR</th><th>W</th><th>D</th><th>L</th><th>${t('league.duels')}</th><th>${t('league.points')}</th><th>${t('league.difference')}</th><th>Pts</th></tr>
  ${sorted.map((t,i)=>{
    const isRelegation=league===1&&i>=sorted.length-2;
    const isPromotion=league===2&&i<2;
    return`<tr class="${t.isPlayer?'mine':''}"><td><span class="pos ${i<3?'p'+(i+1):''}${isRelegation?' rel':''}${isPromotion?' p1':''}">${i+1}</span></td><td style="font-family:'Saira Condensed',sans-serif;font-weight:${t.isPlayer?700:400};cursor:pointer" onclick="openTeamOverview(${t.id})">${t.name}${isRelegation?' <span class="cr fs9">\u2193</span>':''}${isPromotion?' <span class="cg fs9">\u2191</span>':''}</td><td class="ink3">${teamOvr(t.id)}</td><td class="cg b7">${t.w}</td><td class="cgold">${t.d||0}</td><td class="cr">${t.l}</td><td class="ink3 fs10">${t.gf||0}:${t.ga||0}</td><td class="ink3 fs10">${t.pointsWon||0}:${t.pointsLost||0}</td><td style="font-weight:700;color:${teamPointDiff(t)>=0?'var(--g)':'var(--r)'}">${teamPointDiff(t)>=0?'+':''}${teamPointDiff(t)}</td><td class="syne b8 fs14">${t.pts}</td></tr>`;
  }).join('')}
  </table>
  ${league===1?`<div class="mt-8 fs10 ink3">\u2b07 ${t('league.relegation')}</div>`:`<div class="mt-8 fs10 ink3">\u2b06 ${t('league.promotion')}</div>`}
  </div>`
  :statsTab==='points_for'?`<div class="card"><div class="ct">${t('league.mostPoints',{division:league===1?'I':'II'})}</div>${playerStatsTable(topPointsWon,t('league.pointsWon'),'won')}</div>`
  :statsTab==='points_against'?`<div class="card"><div class="ct">${t('league.fewestLost',{division:league===1?'I':'II'})}</div>${playerStatsTable(topPointsLost,t('league.pointsLost'),'lost')}</div>`
  :statsTab==='team_points_for'?`<div class="card"><div class="ct">${t('league.teamsMostPoints',{division:league===1?'I':'II'})}</div>${teamStatsTable(teamPointsWon,t('league.pointsWon'),'won')}</div>`
  :statsTab==='team_points_against'?`<div class="card"><div class="ct">${t('league.teamsFewestLost',{division:league===1?'I':'II'})}</div>${teamStatsTable(teamPointsLost,t('league.pointsLost'),'lost')}</div>`
  :''}`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// PAGE: CUP
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function pageCup(){
  if(!store.G.cup)return`<div class="ph"><div><div class="pt">${t('cup.title')}</div></div></div><div class="card">${t('cup.noData')}</div>`;
  const cup=store.G.cup;const myId=store.G.myTeamId;
  const roundNames=['1/16','1/8',t('cup.quarterfinal'),t('cup.semifinal'),t('cup.final')];
  const canPlay=shouldPlayCup();
  
  return`<div class="ph"><div><div class="pt">${t('cup.title')}</div><div class="ps">${t('common.season')} ${store.G.season} ${cup.finished?`/ ${t('cup.finished')}`:''}</div></div>
  ${canPlay?`<div class="fs11 cpurple b7">${t('cup.next')}</div>`:''}
  </div>
  ${cup.finished&&cup.winner?`<div class="banner" style="border-left-color:var(--gold)"><div class="dot" style="background:var(--gold)"></div>${t('cup.winner',{name:cup.winner.name})}</div>`:''}
  <div class="card mb14"><div class="fs12 ink3">${t('cup.format')}</div><div class="fs11 mt-6">${t('cup.prizes',{winner:formatCurrency(window.PPM.gameplay.CUP_PRIZES.winner),finalist:formatCurrency(window.PPM.gameplay.CUP_PRIZES.finalist),semifinalist:formatCurrency(window.PPM.gameplay.CUP_PRIZES.semifinalist),quarterfinalist:formatCurrency(window.PPM.gameplay.CUP_PRIZES.quarterfinalist)})}</div>${(()=>{const status=window.PPM.gameplay.getCupClubStatus(myId);const names=['1/16','1/8',t('cup.quarterfinal'),t('cup.semifinal'),t('cup.final')];const path=status.path.map(row=>`${names[row.roundIndex]}: ${row.opponent?.name||t('common.none')}${row.result?` ${row.result.score}`:''}`).join(' · ');return`<div class="fs11 mt-6 b7">${t(`cup.status.${status.state}`)}${status.nextTrigger!==null?` ${t('cup.nextTrigger',{matchday:status.nextTrigger})}`:''}</div>${path?`<div class="fs11 mt-4">${t('cup.path',{path})}</div>`:''}`;})()}</div>
  <div class="cup-bracket">
    ${cup.rounds.map((round,ri)=>`<div class="cup-round">
      <div class="cup-round-title">${roundNames[Math.min(ri,roundNames.length-1)]}</div>
      ${round.map(m=>{
        const isMy=(m.home.isReal&&m.home.id===myId)||(m.away.isReal&&m.away.id===myId);
        const hasResult=!!m.result;
        // Compare by id, not object identity \u2014 after a save/load the winner is a
        // detached JSON copy and === never matches the bracket slot.
        const homeWon=hasResult&&m.result.winner&&m.result.winner.id===m.home.id;
        const awayWon=hasResult&&m.result.winner&&m.result.winner.id===m.away.id;
        return`<div class="cup-match ${isMy?'my':''}">
          <div class="cup-t ${hasResult?(homeWon?'winner':'loser'):''}">${m.home.name}${homeWon?' \u2713':''}</div>
          <div class="cup-t ${hasResult?(awayWon?'winner':'loser'):''}">${m.away.name}${awayWon?' \u2713':''}</div>
          ${hasResult?`<div class="tac fs10 ink3">${m.result.score}</div>`:''}
        </div>`;
      }).join('')}
    </div>`).join('')}
  </div>`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// PAGE: STAFF
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function pageStaff(){
  const myId=store.G.myTeamId;
  const ownedStaff=store.G.staff.filter(s=>s.teamId===myId);
  const prDir=getPRDirector();
  const sections=[
    {label:t('staff.coach'),items:ownedStaff.filter(s=>s.type==='coach')},
    {label:t('staff.physio'),items:ownedStaff.filter(s=>s.type==='physio')},
    {label:t('staff.psychologist'),items:ownedStaff.filter(s=>s.type==='psychologist')},
    {label:t('staff.prDirector'),items:prDir?[prDir]:[]},
    {label:t('staff.scouts'),items:ownedStaff.filter(s=>s.type==='scout')},
  ];
  function staffCard(s){
    const sOvr=staffOvr(s);
    const roleIcon=s.type==='coach'?'':s.type==='physio'?'':s.type==='psychologist'?'':s.type==='scout'?'':'';
    return`<div class="staff-card hired cur" onclick="openStaffModal(${s.id})">
      <div class="flex jcb aifs mb10">
        <div class="staff-head"><img src="${getAvatarData(s,'staff')}" alt="${s.name}" class="avatar"><div><div class="syne b7 fs15">${roleIcon} ${s.name}</div>
        <div class="fs10 ink3 mt-2">${t('staff.salaryContract',{salary:formatCurrency(s.salary),years:`${s.contractYears||0} ${t((s.contractYears||0)===1?'common.year':'common.years')}`})}</div>
        <div class="fs10 mt-2">${t('staff.agePeak',{age:s.age||'?',peak:s.peakAge||'?'})}</div></div></div>
        ${window.PPM.ratingStars.renderRating(ratingProfile(sOvr,staffCeiling(s)),{size:'compact',peakKnown:true,disclosure:'summary',showCurrentOvr:true})}
      </div>
      <div class="fs11 ink3">${s.type==='coach'?coachStyleLabel(s):s.type==='scout'?scoutSpecialtyLabel(s):s.type==='pr'?t('staff.commerceBonus',{percent:Math.round((s.bonus||0)*100)}):t('staff.clubSpecialist')}</div>
      <div class="btn-row mt-8">
        <button class="btn gl sm" onclick="event.stopPropagation();openStaffNeg(${s.id})">${t('staff.extend')}</button>
        ${s.type!=='pr'?`<button class="btn sm bcr cr" onclick="event.stopPropagation();fireStaff(${s.id})">${t('staff.fire')}</button>`:''}
      </div>
    </div>`;
  }
  return`<div class="ph"><div><div class="pt">${t('staff.title')}</div><div class="ps">${t('staff.subtitle')}</div></div>
    <button class="btn bl" onclick="go('market')">${t('staff.search')}</button></div>
  <div class="grid gp12" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
    ${sections.map(section=>`<div class="card"><div class="ct">${section.label} <span class="fs10 ink3">${section.items.length}</span></div>
      ${section.items.length?`<div class="grid gp10">${section.items.map(staffCard).join('')}</div>`
        :`<div class="empty-state fs12">${t('staff.vacant')}<div class="mt-10"><button class="btn sm bl" onclick="go('market')">${t('staff.findCandidate')}</button></div></div>`}
    </div>`).join('')}
  </div>`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// PAGE: CLUB (INFRA + EQUIPMENT + ACADEMY)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function pageClub(){
  const mt=myTeam();const pres=calcPrestige();const myL=myLeague();const sorted=leagueStandings(myL);const branding=getTeamBranding(mt);
  const techPartnership=getTechPartnership();
  const techContract=getTechContract();
  function levelDots(cur,max){let s='<div class="infra-dots">';for(let i=0;i<max;i++)s+=`<div class="infra-dot${i<cur?' on':''}"></div>`;return s+'</div>';}
  function infraBlock(type,label,icon,levels,curLevel){
    const cur=levels[curLevel];const next=levels[curLevel+1];
    const maxLevel=levels.length-1;
    const dataGroup={hall:'infraHall',med:'infraMed',academy:'infraAcademy',merch:'infraMerch'}[type];
    // One card per facility (was a card wrapping a second bordered card), with the
    // level as a pill and the price/CTA on one row that can't collide.
    return`<div class="infra-card">
      <div class="infra-head">
        <div class="infra-title">${icon} ${label}</div>
        <div class="infra-pill">${curLevel}/${maxLevel}</div>
      </div>
      <div class="syne b7 fs15">${gameDataText(dataGroup,curLevel,'name',cur.name)}</div>
      <div class="fs11 ink3 mb8">${gameDataText(dataGroup,curLevel,'desc',cur.desc)}</div>
      ${levelDots(curLevel,maxLevel)}
      ${next?`<div class="infra-next">
        <div class="fs10 ink3 up ls1">${t('club.nextLevel')}</div>
        <div class="b7 fs12 mb2">${gameDataText(dataGroup,curLevel+1,'name',next.name)}</div>
        <div class="fs11 ink3 mb10">${gameDataText(dataGroup,curLevel+1,'desc',next.desc)}</div>
        <div class="infra-buy">
          <div class="syne b8 fs18 ${mt.budget<next.cost?'ink3':'cr'}">${formatCurrency(next.cost)}</div>
          <button class="btn pr sm" onclick="upgradeInfra('${type}')" ${mt.budget<next.cost?'disabled':''}>${t('club.upgrade')}</button>
        </div>
      </div>`:`<div class="infra-next tac cg b7 fs11">✓ ${t('club.maxLevel')}</div>`}
      ${curLevel>0?`<div class="tar mt-8"><button class="btn sm fs10 op8" onclick="downgradeInfra('${type}')" title="${t('club.downgradeTitle')}">↓ ${t('club.downgrade')}</button></div>`:''}
    </div>`;
  }
  
  const prDir=getPRDirector();
  
  return`<div class="ph"><div><div class="pt">${t('club.title')}</div></div></div>
    <div class="card mb14">
    <div class="flex aic jcb gp16 fwrap">
      <div class="flex aic gp16">
      <img src="${getTeamLogoData(mt)}" alt="${mt.name}" class="club-logo lg">
      <div><div class="syne fs28 b8">${mt.name}</div><div class="fs12 ink3">${branding.nickname} / ${branding.motto}</div></div>
      </div>
      <div class="history-badge">${t('club.facilityLevel',{level:Math.max(store.G.infraHall||0,store.G.infraMed||0,store.G.infraAcademy||0,store.G.infraMerchandising||0)})}</div>
    </div>
  </div>
  <div class="g4 mb14">
    ${infraBlock('hall',t('club.trainingHall'),'',INFRA_HALL,store.G.infraHall||0)}
    ${infraBlock('med',t('club.medicalCentre'),'',INFRA_MED,store.G.infraMed||0)}
    ${infraBlock('academy',t('club.youthAcademy'),'',INFRA_ACADEMY,store.G.infraAcademy||0)}
    ${infraBlock('merch',t('club.fanShop'),'',INFRA_MERCH,store.G.infraMerchandising||0)}
  </div>
  <div class="g2 mb14">
    <div class="card"><div class="ct">${t('club.tvRights')} <span class="fs9">${t('club.paidSeasonEnd')}</span></div>
      <div class="g2">
        <div class="sb"><div class="l">${t('club.estimated')}</div><div class="v gold fs24">${formatCurrency(calcTVRights())}</div><div class="sub">#${sorted.findIndex(team=>team.isPlayer)+1}</div></div>
        <div class="sb"><div class="l">${t('history.league')}</div><div class="v ${myL===1?'gold':''} fs20">${t(myL===1?'league.divisionOne':'league.divisionTwo')}</div><div class="sub">${t('club.higherPays')}</div></div>
      </div>
    </div>
    <div class="card"><div class="ct">${t('club.prDirector')}</div>
    ${prDir?`<div class="pd12 bg-ok bbg r4">
      <div class="syne b7 fs15">\u2713 ${prDir.name}</div>
      <div class="fs11 ink3 mt-4">${t('club.commercialBonus',{percent:Math.round(prDir.bonus*100),seasons:prDir.cooldownReduce})}</div>
      <div class="fs10 ink3 mt-2">${t('staff.salaryContract',{salary:formatCurrency(prDir.salary),years:`${prDir.contractYears||0} ${t((prDir.contractYears||0)===1?'common.year':'common.years')}`})}</div>
      <div class="btn-row mt-8"><button class="btn gl sm" onclick="openStaffNeg(${prDir.id})">${t('staff.extend')}</button></div>
    </div>`:
    `<div class="fs11 ink3 lh155">${t('club.noPr')}</div>`}
    </div>
  </div>
  <div class="card"><div class="ct">${t('club.techPartnership')} <span class="fs9">${t('club.prestige',{value:pres})}</span></div>
  <div class="panel-muted mb12">${t('club.techHint')}</div>
  ${techContract&&techPartnership?(()=>{
    const rubber=EQUIPMENT.rubberProfiles[techContract.rubberId]||{};
    const effects=formatTechContractEffects(techContract);
    const fit=(rubber.fitStyles||[]).map(styleLabel).join(', ')||t('club.allStyles');
    const cashflow=Number(techContract.annualCashflow)||0;
    const signed=`${cashflow>0?'+':''}${formatCurrency(cashflow)}`;
    return`<div class="academy-inline-banner">
      <div class="flex aic jcb gp10 fwrap"><div><div class="syne b8 fs18">${techPartnership.icon} ${techPartnership.name}</div><div class="fs11 cg mt-3">${t(`equipment.profile.${techPartnership.profileId}`)}</div></div><span class="pill pos">${t('club.active')}</span></div>
      <div class="grid gtc2 gp8 mt-10 fs11"><div>${t('club.contractRubber',{rubber:t(`equipment.rubber.${techContract.rubberId}`)})}</div><div>${t('club.contractFit',{styles:fit})}</div><div>${t('club.contractEffects',{effects})}</div><div>${t('club.contractAnnualCashflow',{cashflow:signed})}</div></div>
      <div class="mt-10 fs11">${t('club.contractTerm',{left:techContract.yearsLeft,total:techContract.termYears})}</div>
      <div class="mt-4 fs11 ink3">${t('club.terminationFee',{fee:formatCurrency(techContractBreakFee(techContract))})}</div>
      <button class="btn rd sm mt-8" onclick="terminateTechPartnership()">${t('club.terminatePartnership')}</button>
    </div>`;
  })():`<div class="empty-state">${t('club.noTechContract')}</div>`}
  </div>`;
}

// Remaining pages (simplified for space)
function pageBudget(){
  const mt=myTeam();const wages=totalWages();const maint=calcLeagueMaint();const log=store.G.budgetLog||[];
  const nextSeason=getNextSeasonCommitments();
  const live={...(store.G.seasonFinance||{}),season:store.G.season,wages,maint};
  // The per-category wage rows live in seasonFinance, but are only filled at season-
  // end. For the LIVE view compute them now, so wages reflect the current squad/staff
  // (signings, releases) instead of showing 0 mid-season.
  const liveBreak=totalWageBreakdown();
  live.playerWages=liveBreak.players;live.coachWages=liveBreak.coaches;live.physioWages=liveBreak.physios;
  live.psychologistWages=liveBreak.psychologists;live.scoutWages=liveBreak.scouts;live.prDirectorWages=liveBreak.prDirector;
  live.net=(live.tickets||0)+(live.merch||0)+(live.prize||0)+(live.sponsorIncome||0)+(live.tvRights||0)+(live.boardReward||0)+(live.techPartnership||0)+(live.other||0)-((live.wages||0)+(live.maint||0)+(live.transfersIn||0)+(live.infraCost||0)+(live.staffBuyouts||0)+(live.prDirectorCost||0)+(live.brandCosts||0));
  const seasonOptions=['live',...log.map(e=>String(e.season)).reverse()];
  if(!seasonOptions.includes(String(ui.budgetSeason)))ui.budgetSeason='live';
  const selected=ui.budgetSeason==='live'?live:(log.find(e=>String(e.season)===String(ui.budgetSeason))||live);
  const normalizeMoney=val=>{const num=Number(val)||0;return Object.is(num,-0)?0:num;};
  const formatSignedMoney=val=>{const num=normalizeMoney(val);return`${num>0?'+':''}${formatCurrency(num)}`;};
  const formatTableMoney=val=>{const num=normalizeMoney(val);return`${num>0?'+':''}${formatNumber(num)}`;};
  const rowClass=val=>normalizeMoney(val)<0?'pnl-neg':'pnl-pos';
  const fixedExpenseProjection=mt.budget-(wages+maint);
  const nextSeasonProjection=mt.budget-(wages+maint+nextSeason.total);
  const transferAndBonusCosts=-((selected.transfersIn||0)+Math.max(0,-(selected.other||0)));
  const otherAdjustments=Math.max(0,selected.other||0);
  const wageRows=[
    [t('budget.playerWages'),selected.playerWages||0],
    [t('budget.coachWages'),selected.coachWages||0],
    [t('budget.physioWages'),selected.physioWages||0],
    [t('budget.psychologistWages'),selected.psychologistWages||0],
    [t('budget.scoutWages'),selected.scoutWages||0],
    [t('budget.prWages'),selected.prDirectorWages||0],
  ];
  // P&L is grouped (income vs cost) with subtotals, and all-zero lines are hidden
  // behind a toggle — the flat 19-row list was mostly "0 €" in a normal season.
  const incomeRows=[
    [t('budget.tickets'),selected.tickets||0],
    [t('budget.merch'),selected.merch||0],
    [t('budget.prizes'),selected.prize||0],
    [t('budget.sponsors'),selected.sponsorIncome||0],
    [t('budget.tvRights'),selected.tvRights||0],
    [t('budget.boardObjective'),selected.boardReward||0],
    [t('budget.techPartner'),selected.techPartnership||0],
    ...(otherAdjustments>0?[[t('budget.otherAdjustments'),otherAdjustments]]:[]),
  ];
  const wageTotal=wageRows.reduce((a,[,v])=>a+(v||0),0);
  const costRows=[
    [t('budget.wagesBreakdownBelow'),-wageTotal],
    [t('budget.upkeep'),-(selected.maint||0)],
    [t('budget.transfersBonuses'),transferAndBonusCosts],
    [t('budget.infrastructure'),-(selected.infraCost||0)],
    [t('budget.staffBuyouts'),-(selected.staffBuyouts||0)],
    [t('budget.prHiring'),-(selected.prDirectorCost||0)],
    [t('budget.legacyEquipment'),-(selected.brandCosts||0)],
  ];
  const showZeroRows=!!ui.budgetShowZero;
  const visibleRows=list=>showZeroRows?list:list.filter(([,v])=>normalizeMoney(v)!==0);
  const sumRows=list=>list.reduce((a,[,v])=>a+normalizeMoney(v),0);
  const pnlGroup=(title,list,tone)=>{
    const shown=visibleRows(list),hidden=list.length-shown.length,total=sumRows(list);
    return`<div class="pnl-group">
      <div class="pnl-group-head"><span>${title}</span><span class="${rowClass(total)}">${formatSignedMoney(total)}</span></div>
      ${shown.length?shown.map(([label,val])=>`<div class="pnl-row"><div>${label}</div><div class="${rowClass(val)}">${formatSignedMoney(val)}</div></div>`).join('')
        :`<div class="pnl-row"><div class="ink3">${t('budget.noEntries')}</div><div class="ink3">${formatCurrency(0)}</div></div>`}
      ${hidden?`<div class="fs10 ink3 mt-4">${t('budget.zeroHidden',{count:hidden})}</div>`:''}
    </div>`;
  };
  return`<div class="ph"><div><div class="pt">${t('budget.title')}</div></div></div>
  <div class="g4">
    <div class="sb"><div class="l">${t('budget.cash')}</div><div class="v g fs26">${formatCurrency(mt.budget)}</div></div>
    <div class="sb"><div class="l">${t('budget.totalWages')}</div><div class="v r fs26">${formatCurrency(wages)}</div><div class="sub">${t('budget.perSeason')}</div></div>
    <div class="sb"><div class="l">${t('budget.upkeep')}</div><div class="v r fs26">${formatCurrency(maint)}</div></div>
    <div class="sb"><div class="l">${t('budget.nextSeasonCommitments')}</div><div class="v ${nextSeason.total>0?'gold':'g'} fs26">${formatSignedMoney(-nextSeason.total)}</div><div class="sub">${t('budget.deals',{count:nextSeason.entries.length})}</div></div>
  </div>
  <div class="card mb14"><div class="ct">${t('budget.forecast')}</div>
    <div class="pnl-block">
      <div class="pnl-row"><div>${t('budget.afterFixed')}</div><div class="${rowClass(fixedExpenseProjection)}">${formatSignedMoney(fixedExpenseProjection)}</div></div>
      <div class="pnl-row"><div>${t('budget.afterFixedAndDeals')}</div><div class="${rowClass(nextSeasonProjection)}">${formatSignedMoney(nextSeasonProjection)}</div></div>
    </div>
    <div class="fs11 ink3 mt-8">${t('budget.forecastHint')}</div>
  </div>
  ${ui.budgetSeason==='live'?(()=>{
    const sponsors=store.G.sponsors.filter(s=>s.active);
    const bo=getBoardObjective();
    if(!sponsors.length&&!bo)return '';
    const goalRow=(name,goal,reward)=>{const met=checkGoal({goal});const prog=sponsorProg({goal});return`<div class="pnl-row"><div>${name} <span class="fs10 ink3">(${goalDesc(goal)} — ${met?`✓ ${t('budget.goalMet')}`:prog.label})</span></div><div style="color:${met?'var(--g)':'var(--gold)'};font-weight:700">${met?'+':'~'}${formatCurrency(reward||0)}</div></div>`;};
    const sponsorRows=sponsors.map(s=>goalRow(s.name,s.goal,s.reward)).join('');
    const boRow=bo?goalRow(t('budget.boardObjective'),bo.goal,bo.reward):'';
    const potential=sponsors.reduce((a,s)=>a+(s.reward||0),0)+(bo?(bo.reward||0):0);
    const secured=sponsors.filter(s=>checkGoal(s)).reduce((a,s)=>a+(s.reward||0),0)+((bo&&checkGoal(bo))?(bo.reward||0):0);
    return`<div class="card mb14 bt3-gold"><div class="ct">${t('budget.objectiveIncome')}</div>
      <div class="pnl-block">${sponsorRows}${boRow}
        <div class="pnl-row total"><div>${t('budget.securedPotential')}</div><div class="${secured>0?'pnl-pos':''} b8">${formatCurrency(secured)} / ${formatCurrency(potential)}</div></div>
      </div>
      <div class="fs11 ink3 mt-8">${t('budget.objectiveHint')}</div>
    </div>`;
  })():''}
  <div class="card mb14 bt3-blue"><div class="ct">${t('budget.nextSeasonPlanning')}</div>
    <div class="pnl-block">
      <div class="pnl-row"><div>${t('budget.newPlayers')}</div><div class="${rowClass(-nextSeason.playerWages)}">${formatSignedMoney(-nextSeason.playerWages)}</div></div>
      <div class="pnl-row"><div>${t('budget.newStaff')}</div><div class="${rowClass(-nextSeason.staffWages)}">${formatSignedMoney(-nextSeason.staffWages)}</div></div>
      <div class="pnl-row"><div>${t('budget.signingBonuses')}</div><div class="${rowClass(-nextSeason.bonuses)}">${formatSignedMoney(-nextSeason.bonuses)}</div></div>
    </div>
    ${nextSeason.entries.length?`<div class="mt-10 grid gp8">
      ${nextSeason.entries.map(entry=>`<div class="tile">
        <div class="row-bet">
          <div><div class="b7">${entry.name}</div><div class="fs10 ink3">${t('budget.commitmentLine',{description:t(entry.labelKey),role:entry.kind==='player'?roleGuaranteeLabel(entry.role):t(entry.role==='pr'?'staff.prDirector':`staff.${entry.role}`),years:entry.years})}</div></div>
          <div class="tar fs11"><div class="b7 cr">${formatCurrency(entry.salary||0)}</div><div class="ink3">${t('budget.bonus',{amount:formatCurrency(entry.bonus||0)})}</div></div>
        </div>
      </div>`).join('')}
    </div>`:`<div class="fs12 ink3 mt-8">${t('budget.noNextSeason')}</div>`}
  </div>
  <div class="card mb14"><div class="ct">${t('budget.seasonResult')}
    <div class="card-tools">${seasonOptions.map(opt=>`<button class="btn sm ${String(ui.budgetSeason)===String(opt)?'pr':''}" onclick="ui.budgetSeason='${opt}';render()">${opt==='live'?t('budget.current'):`S${opt}`}</button>`).join('')}<button class="btn sm" onclick="ui.budgetShowZero=!ui.budgetShowZero;render()">${t(showZeroRows?'budget.hideZero':'budget.showAll')}</button></div></div>
    <div class="g2">
      ${pnlGroup(t('budget.income'),incomeRows)}
      ${pnlGroup(t('budget.costs'),costRows)}
    </div>
    <div class="pnl-row total mt-10"><div>${t('budget.financialResult')}</div><div class="${rowClass(selected.net)}">${formatSignedMoney(selected.net||0)}</div></div>
  </div>
  <div class="g2">
    <div class="card"><div class="ct">${t('budget.wageBreakdown')}</div>
      <div class="pnl-block">
        ${wageRows.map(([label,val])=>`<div class="pnl-row"><div>${label}</div><div class="${val?'pnl-neg':'ink3'}">${formatSignedMoney(-val)}</div></div>`).join('')}
        <div class="pnl-row total"><div>${t('budget.total')}</div><div class="pnl-neg">${formatSignedMoney(-wageTotal)}</div></div>
      </div>
    </div>
    <div class="card"><div class="ct">${t('budget.seasonHistory')}</div>
      ${log.length?`<table class="t"><tr><th>${t('budget.season')}</th><th>${t('budget.tickets')}</th><th>${t('budget.merch')}</th><th>TV</th><th>${t('budget.balance')}</th></tr>
      ${log.slice().reverse().map(e=>`<tr><td><button class="btn sm ${String(ui.budgetSeason)===String(e.season)?'pr':''}" onclick="ui.budgetSeason='${e.season}';render()">S${e.season}</button></td><td class="cg">${formatTableMoney(e.tickets||0)}</td><td class="cg">${formatTableMoney(e.merch||0)}</td><td class="cg">${formatTableMoney(e.tvRights||0)}</td><td style="${normalizeMoney(e.net)>=0?'color:var(--g)':'color:var(--r)'};font-weight:700">${formatTableMoney(e.net||0)}</td></tr>`).join('')}</table>`:`<div class="empty-state fs12">${t('budget.noHistory')}</div>`}
    </div>
  </div>`;
}

function pageSponsors(){
  const pres=calcPrestige();const offers=store.G.sponsorOffers||[];const active=store.G.sponsors.filter(s=>s.active);
  return`<div class="ph"><div><div class="pt">${t('sponsors.title')}</div><div class="ps">${t('sponsors.prestige',{value:pres})}${myLeague()===2?` (${t('sponsors.lowerRewards')})`:''}</div></div></div>
  <div class="g2">
    <div class="card"><div class="ct">${t('sponsors.active')}</div>
    ${active.length?active.map(s=>{const p=sponsorProg(s);return`<div class="spon active"><div class="flex jcb"><div><div class="spon-name">${s.name}</div><div class="spon-goal">${goalDesc(s.goal)}</div></div><div class="spon-reward">${formatCurrency(s.reward)}${(s.yearsLeft||1)>1?` <span class="fs9 ink3">(${t('sponsors.seasons',{count:s.yearsLeft})})</span>`:''}</div></div><div class="spbar"><div class="spfill" style="width:${p.pct}%"></div></div></div>`;}).join(''):`<div class="ink3 fs12">${t('sponsors.noActive')}</div>`}
    </div>
    <div class="card"><div class="ct">${t('sponsors.offers')} <span class="cgold">${pres}/100</span></div>
    ${active.length>=3?`<div class="ink3 fs12">${t('sponsors.maximum')}</div>`:
      offers.length?offers.map(s=>`<div class="spon"><div class="flex jcb"><div><div class="spon-name">${s.name} <span class="fs10 ink3">[${s.tier}]</span></div><div class="spon-goal">${goalDesc(s.goal)}</div></div><div class="spon-reward">${formatCurrency(s.reward)}${(s.yearsLeft||1)>1?` <span class="fs9 ink3">(${t('sponsors.seasons',{count:s.yearsLeft})})</span>`:''}</div></div><button class="btn pr sm mt-6" onclick="signSponsor(${s.id})">${t('sponsors.sign')}</button></div>`).join(''):`<div class="ink3 fs12">${t('sponsors.noOffers')}</div>`}
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET — filter panel + one dense sortable table (owner reference: the
// Motorsport Manager staff market). Everything that used to be a stacked card
// is either a filter, a column, or folded into the details strip below.
// ═══════════════════════════════════════════════════════════════════════════

// Favourites work for players and staff alike; they live in different pools, so
// they are stored separately (and the player list keeps its old save key).
function marketFavIds(kind){
  if(kind==='staff')return store.G.marketShortlistStaff||(store.G.marketShortlistStaff=[]);
  return store.G.marketShortlist||(store.G.marketShortlist=[]);
}
function toggleMarketFav(kind,id){
  const list=marketFavIds(kind);
  const i=list.indexOf(id);
  if(i>=0)list.splice(i,1);else list.unshift(id);
  renderApp();
}

function pageMarket(){
  const mt=myTeam();
  const sortKey=ui.mktSort||'ovr';
  const sortDir=ui.mktSortDir||1;
  const marketSearch=(ui.marketSearch||'').trim().toLowerCase();
  // 'all' is the pre-overhaul default and no longer a valid tab — map it to the
  // first role rather than showing an empty market to anyone with an old save.
  const marketType=(ui.marketTypeFilter&&ui.marketTypeFilter!=='all')?ui.marketTypeFilter:'player';
  const ageBand=ui.mktAge||'all';
  const minStars=ui.mktStars||0;      // 0 = no minimum
  const favOnly=ui.mktFav==='fav';
  const compareIds=ui.marketCompare||[];
  const nextSeason=getNextSeasonCommitments();
  const negotiationHistory=(store.G.negotiationHistory||[]).slice(-6).reverse();
  const roleLabel=type=>type==='coach'?t('staff.coach'):type==='physio'?t('market.physios'):type==='psychologist'?t('staff.psychologist'):type==='scout'?t('staff.scout'):type==='pr'?'PR':t('market.players');
  // \u2500\u2500 one normalised row shape for players and staff alike \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const rows=[];
  for(const item of (store.G.transferMarket||[])){
    const p=store.G.players.find(x=>x.id===item.playerId);
    if(!p||p.retired)continue;
    const isFa=item.type==='fa',isPreSign=item.type==='presign',isLoan=item.type==='loan';
    const o=ovr(p);
    const profile=ratingProfile(o,playerCeiling(p));
    const currentStars=ratingProfile(o,o).currentStars;
    rows.push({
      kind:'player',role:'player',id:p.id,data:p,item,
      name:p.name,nat:(p.nationality||store.G.countryId||'PL'),age:p.age||0,
      ovr:o,profile,currentStars,
      teamId:p.teamId,club:p.teamId!==null?teamName(p.teamId):'',
      series:p.teamId!==null?t(teamLeague(p.teamId)===1?'league.divisionOne':'league.divisionTwo'):'',
      salary:isLoan?Math.round((p.salary||0)*(item.share||0.6)):contractExpect(p).salary,
      fee:isLoan?0:(item.fee||0),
      until:isFa?0:(p.contractYears||0),
      deal:t(isFa?'market.freeAgent':isPreSign?'market.preSign':isLoan?'market.loan':'market.transfer'),
      dealTone:isFa?'pos':isPreSign?'warn':isLoan?'':'club',
      action:isLoan
        ?`<button class="btn sm pr" onclick="event.stopPropagation();doBorrowIn(${p.id})">${t('market.loan')}</button>`
        :`<button class="btn sm pr" onclick="event.stopPropagation();openNegotiate(${p.id})">${t(isPreSign?'market.preSign':'market.sign')}</button>`,
      open:`openPlayerModal(${p.id})`,
    });
  }
  for(const s of getAllExternalStaffMarket()){
    const o=staffOvr(s);
    const profile=ratingProfile(o,staffCeiling(s));
    const currentStars=ratingProfile(o,o).currentStars;
    const mine=s.teamId===store.G.myTeamId;
    const canPreSign=s.teamId!==null&&!mine&&(s.contractYears||0)===1;
    const blocked=s.teamId!==null&&!mine&&!canPreSign;
    rows.push({
      kind:'staff',role:s.type,id:s.id,data:s,
      name:s.name,nat:(s.nationality||store.G.countryId||'PL'),age:s.age||0,
      ovr:o,profile,currentStars,
      teamId:s.teamId,club:s.teamId!==null?teamName(s.teamId):'',
      series:s.teamId!==null?t(teamLeague(s.teamId)===1?'league.divisionOne':'league.divisionTwo'):'',
      salary:s.salary||0,fee:0,until:s.contractYears||0,
      deal:t(mine?'market.yourStaff':s.teamId===null?'market.freeAgent':canPreSign?'market.preSign':'market.unavailable'),
      dealTone:mine?'':s.teamId===null?'pos':canPreSign?'warn':'',
      action:`<button class="btn sm ${blocked?'':canPreSign?'bl':'pr'}" ${blocked?'disabled':''} onclick="event.stopPropagation();${blocked?'':`openStaffNeg(${s.id})`}">${t(blocked?'market.unavailable':canPreSign?'market.forNextSeason':'market.negotiate')}</button>`,
      open:`openStaffModal(${s.id})`,
    });
  }

  const roleTabs=[['player',t('market.players')],['coach',t('market.coaches')],['physio',t('market.physios')],['psychologist',t('market.psychologists')],['scout',t('market.scouts')],['pr','PR']];
  const inRole=rows.filter(r=>r.role===marketType);
  const favIdsForRole=marketFavIds(marketType==='player'?'player':'staff');
  const ageOk=r=>ageBand==='all'
    ||(ageBand==='16-22'&&r.age<22)
    ||(ageBand==='22-28'&&r.age>=22&&r.age<28)
    ||(ageBand==='28-34'&&r.age>=28&&r.age<34)
    ||(ageBand==='34+'&&r.age>=34);
  let market=inRole.filter(r=>{
    const text=`${r.name} ${r.club} ${roleLabel(r.role)}`.toLowerCase();
    if(marketSearch&&!text.includes(marketSearch))return false;
    if(favOnly&&!favIdsForRole.includes(r.id))return false;
    if(!ageOk(r))return false;
    if(minStars&&r.currentStars<minStars)return false;
    return true;
  });
  const sortVal=r=>({
    name:r.name,nat:r.nat,age:r.age,ovr:r.ovr,club:r.club||'\uffff',
    series:r.series||'\uffff',salary:r.salary,fee:r.fee,until:r.until,
  })[sortKey]??r.ovr;
  market.sort((a,b)=>{
    const x=sortVal(a),y=sortVal(b);
    const cmp=typeof x==='string'?String(y).localeCompare(String(x),PPM.i18n.getLocale()):(y-x);
    return cmp*sortDir;
  });
  const th=(key,label,cls)=>`<th class="${cls||''} ${sortKey===key?'srt':''}" onclick="ui.mktSort='${key}';ui.mktSortDir=${sortKey===key?-sortDir:1};render()">${label}${sortKey===key?(sortDir>0?' \u2193':' \u2191'):''}</th>`;
  const seg=(group,current,options)=>`<div class="seg">${options.map(([val,label,badge])=>
    `<button class="${current===val?'on':''}" onclick="ui.${group}='${val}';render()">${label}${badge!=null?`<span class="cnt">${badge}</span>`:''}</button>`).join('')}</div>`;

  const ourExpiring=myPlayers().filter(p=>p.contractYears<=1&&p.role!=='youth');
  const compare=compareIds.map(id=>store.G.players.find(p=>p.id===id)).filter(Boolean);
  const playerCommitments=nextSeason.entries.filter(entry=>entry.kind==='player');
  const staffCommitments=nextSeason.entries.filter(entry=>entry.kind==='staff');
  const showDetails=ui.mktDetails===true;
  const money=n=>n?formatCurrency(n):'-';
  const compareBlock=compare.length===2?`<div class="card mb14"><div class="ct">${t('market.compare')}<div class="card-tools"><button class="btn sm" onclick="ui.marketCompare=[];render()">${t('market.clear')}</button></div></div>
    <div class="grid gtc2 gp12">
      ${compare.map(p=>`<div class="tile tile-lg">
        <div class="flex jcb gp10 aifs mb8">
          <div><div class="b7">${p.name}</div><div class="fs10 ink3">${teamName(p.teamId)} / ${p.age} / ${styleLabel(p.playStyle)}</div></div>
          ${window.PPM.ratingStars.renderRating(ratingProfile(ovr(p),playerCeiling(p)),{size:'compact',peakKnown:true,disclosure:'summary',showCurrentOvr:true})}
        </div>
        <div class="grid gtc4 gp6 mb8">${SK.map(s=>`<div class="pd6 bbs3l tac"><div class="fs9 ink3">${SL[s]}</div><div class="b7">${p[s]}</div></div>`).join('')}</div>
        <div class="fs11 ink3">${t('market.expectedSalary',{amount:formatCurrency(contractExpect(p).salary)})} · +${p.seasonPointsWon||0} / −${p.seasonPointsLost||0}</div>
      </div>`).join('')}
    </div>
  </div>`:'';

  return`<div class="ph">
    <div><div class="pt">${t('market.title')}</div><div class="ps">${t('market.subtitle',{budget:formatCurrency(mt.budget)})}</div></div>
    <div class="tools"><button class="btn ${showDetails?'on':''}" onclick="ui.mktDetails=${showDetails?'false':'true'};render()">${t('market.nextSeasonDeals',{count:nextSeason.entries.length})}</button></div>
  </div>
  ${ourExpiring.length?`<div class="banner" style="border-left-color:var(--volt)"><div class="dot" style="background:var(--volt)"></div>
    ${t(ourExpiring.length===1?'market.expiringOne':'market.expiringMany',{count:ourExpiring.length,names:ourExpiring.map(p=>p.name).join(', ')})}
  </div>`:''}

  <div class="filters">
    <div class="filters-h">${t('market.filters')}</div>
    <div class="fgrp wide mb14"><i>${t('market.role')}</i>
      ${seg('marketTypeFilter',marketType,roleTabs.map(([v,l])=>[v,l]))}
    </div>
    <div class="frow">
      <div class="fgrp"><i>${t('market.view')}</i>
        ${seg('mktFav',favOnly?'fav':'all',[['all',t('market.everyone'),inRole.length],['fav',t('market.watched'),favIdsForRole.length||null]])}
      </div>
      <div class="fgrp"><i>${t('market.age')}</i>
        ${seg('mktAge',ageBand,[['all',t('market.everyone')],['16-22','16-22'],['22-28','22-28'],['28-34','28-34'],['34+','34+']])}
      </div>
      <div class="fgrp"><i>${t('market.rating')}</i>
        <div class="seg">
          <button class="${minStars?'':'on'}" onclick="ui.mktStars=0;render()">${t('market.everyone')}</button>
          <button class="${minStars?'on':''}" onclick="ui.mktStars=${minStars?minStars:3};render()">${t('market.minimum')}</button>
          <button class="step" onclick="ui.mktStars=Math.max(0,(ui.mktStars||0)-0.5);render()" ${minStars?'':'disabled'}>‹</button>
          <button class="step" style="flex:0 0 auto;padding:8px 10px" onclick="event.preventDefault()">${window.PPM.ratingStars.renderRating(ratingProfile(minStars*20,minStars*20),{size:'compact',peakKnown:false,showCurrentOvr:false})}</button>
          <button class="step" onclick="ui.mktStars=Math.min(5,(ui.mktStars||0)+0.5);render()" ${minStars>=5?'disabled':''}>›</button>
        </div>
      </div>
    </div>
    <div class="fgrp wide mt-14">
      <input value="${ui.marketSearch||''}" oninput="ui.marketSearch=this.value;render()" placeholder="${t('market.search')}" class="w100">
    </div>
  </div>

  ${showDetails?`<div class="g2 mb14">
    <div class="card bt3-blue"><div class="ct">${t('market.nextSeasonTitle')}<span class="pill">${formatCurrency(nextSeason.total)}</span></div>
      ${nextSeason.entries.length?`<table class="tbl"><thead><tr><th>${t('market.who')}</th><th>${t('market.role')}</th><th class="n">${t('market.years')}</th><th class="n">${t('market.salary')}</th><th class="n">${t('market.bonus')}</th></tr></thead><tbody>
        ${nextSeason.entries.map(e=>`<tr><td class="pname">${e.name}</td><td class="dim">${e.kind==='player'?roleGuaranteeLabel(e.role):roleLabel(e.role)}</td><td class="n dim">${e.years}</td><td class="n">${formatNumber(e.salary||0)}</td><td class="n dim">${formatNumber(e.bonus||0)}</td></tr>`).join('')}
      </tbody></table>`:`<div class="pad fs12 ink3">${t('market.noCommitments')}</div>`}
      <div class="pad fs11 ink3">${t('market.commitmentsSplit',{players:playerCommitments.length,staff:staffCommitments.length})}</div>
    </div>
    <div class="card"><div class="ct">${t('market.recentNegotiations')}</div>
      ${negotiationHistory.length?`<table class="tbl"><thead><tr><th>${t('market.who')}</th><th>${t('market.when')}</th><th>${t('market.result')}</th></tr></thead><tbody>
        ${negotiationHistory.map(e=>`<tr><td class="pname">${e.targetName}</td><td class="dim">S${e.season}/M${e.matchday}</td><td><span class="pill ${e.status==='accepted'?'pos':'club'}">${t(e.status==='accepted'?'market.accepted':'market.rejected')}</span></td></tr>`).join('')}
      </tbody></table>`:`<div class="pad fs12 ink3">${t('market.noNegotiations')}</div>`}
    </div>
  </div>`:''}
  ${compareBlock}

  <div class="panel" style="overflow-x:auto">
    <header><h4>${t('market.available',{role:(roleTabs.find(tab=>tab[0]===marketType)||[0,t('market.title')])[1],count:market.length})}</h4>
      <span class="pill">${minStars?`min. ${minStars} ★`:t('market.noThreshold')}${ageBand!=='all'?` · ${ageBand}`:''}</span>
    </header>
    <table class="tbl wide">
      <thead><tr>
        <th style="width:30px"></th>
        ${th('name',t('market.who'))}
        ${th('nat',t('market.country'))}
        ${th('age',t('market.age'),'n')}
        ${th('ovr',t('market.rating'))}
        ${th('club',t('market.club'))}
        ${th('series',t('market.competition'))}
        ${th('salary',t('market.salary'),'n')}
        ${th('fee',t('market.fee'),'n')}
        ${th('until',t('market.contractUntil'),'n')}
        <th>${t('market.status')}</th>
        <th></th>
      </tr></thead>
      <tbody>
      ${market.slice(0,150).map(r=>{
        const fav=favIdsForRole.includes(r.id);
        const av=r.kind==='player'?getAvatarData(r.data,'player'):getAvatarData(r.data,'staff');
        return`<tr class="row-link" onclick="${r.open}">
          <td><button class="fav ${fav?'on':''}" onclick="event.stopPropagation();toggleMarketFav('${r.kind}',${r.id})" title="${t('market.watch')}">${fav?'★':'☆'}</button></td>
          <td><span class="face" style="background-image:url('${av}');--ring:${fav?'var(--volt)':'var(--line2)'}"></span><span class="pname">${r.name}</span></td>
          <td><span class="nat">${r.nat}</span></td>
          <td class="n dim">${r.age||'-'}</td>
          <td>${window.PPM.ratingStars.renderRating(r.profile,{size:'compact',peakKnown:true,disclosure:'summary',showCurrentOvr:true})}</td>
          <td class="${r.club?'':'dim'}">${r.club||'-'}</td>
          <td class="dim">${r.series||'-'}</td>
          <td class="n">${money(r.salary)}</td>
          <td class="n ${r.fee?'':'dim'}">${money(r.fee)}</td>
          <td class="n dim">${r.until?store.G.season+r.until:'-'}</td>
          <td><span class="pill ${r.dealTone}">${r.deal}</span></td>
          <td class="n">${r.action}</td>
        </tr>`;
      }).join('')||`<tr><td colspan="12"><div class="empty-state">${t('market.empty')}</div></td></tr>`}
      </tbody>
    </table>
  </div>`;
}

function pageHistory(){
  const seasons=store.G.seasonHistory||[];
  const managerHistory=(store.G.managerHistory||[]).slice().reverse();
  const coachHistory=(store.G.coachHistory||[]).slice().reverse();
  const clubHistory=(store.G.clubHistory?.[store.G.myTeamId]||[]).slice().reverse();
  const tab=ui.historyTab||'seasons';
  return`<div class="ph"><div><div class="pt">${t('history.title')}</div></div></div>
  <div class="rtabs mb14">
    <div class="rtab ${tab==='seasons'?'on':''}" onclick="ui.historyTab='seasons';render()">${t('history.seasons')}</div>
    <div class="rtab ${tab==='manager'?'on':''}" onclick="ui.historyTab='manager';render()">${t('history.manager')}</div>
    <div class="rtab ${tab==='club'?'on':''}" onclick="ui.historyTab='club';render()">${t('history.club')}</div>
    <div class="rtab ${tab==='coaches'?'on':''}" onclick="ui.historyTab='coaches';render()">${t('history.coaches')}</div>
  </div>
  ${tab==='seasons'?`${seasons.length?`<div class="card"><div class="ct">${t('history.seasonHistory')}</div>
  <table class="t"><tr><th>${t('common.season')}</th><th>${t('history.league')}</th><th>${t('history.position')}</th><th>W</th><th>D</th><th>L</th><th>Pts</th><th>OVR</th><th>${t('history.budget')}</th></tr>
  ${seasons.map(s=>`<tr><td>S${s.season}</td><td><span class="league-badge ${s.league===1?'l1':'l2'}">${s.league===1?'I':'II'}</span></td><td><b style="color:${s.position<=3?'var(--gold)':'inherit'}">#${s.position}</b></td><td class="cg">${s.w}</td><td class="cgold">${s.d||0}</td><td class="cr">${s.l}</td><td class="b7">${s.pts}</td><td>${s.teamOvr}</td><td class="cg">${s.budget!=null?formatCurrency(s.budget):'-'}</td></tr>`).join('')}
  </table></div>`:`<div class="card">${t('history.noSeasons')}</div>`}
  <div class="card"><div class="ct">${t('history.playerOvr')}</div>
  <div class="grid gp10" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
  ${myPlayers().sort((a,b)=>ovr(b)-ovr(a)).slice(0,8).map(p=>{const hist=store.G.playerHistory[p.id]||[];const vals=hist.map(h=>h.ovr);const latest=vals.length?vals[vals.length-1]:ovr(p);return`<div class="bgs2 bb1 pd10 cur r4" onclick="openPlayerModal(${p.id})"><div class="syne b7 fs13">${p.name}</div><div class="fs9 ink3">${p.age}l / OVR ${latest}</div>${miniChart(vals)}<div class="fs9 ink3 mt-4">${vals.join(' → ')}</div></div>`;}).join('')}
  </div></div>`:''}
  ${tab==='manager'?`<div class="g2"><div class="card"><div class="ct">${t('history.managerPath')}</div>${managerHistory.length?managerHistory.map(h=>`<div class="pnl-row"><div><b>${h.clubName}</b><div class="fs10 ink3">S${h.season} / ${h.league===1?'I':'II'} / ${t('history.goal',{goal:h.boardGoal?goalDesc(h.boardGoal):'-'})} ${h.boardMet===null?'':h.boardMet?'✓':'✗'}</div></div><div class="pnl-pos">#${h.position} / P${h.prestige}</div></div>`).join(''):`<div class="fs12 ink3">${t('history.noManager')}</div>`}</div><div class="card"><div class="ct">${t('history.reputation')}</div><div class="sb"><div class="l">${t('history.currentPrestige')}</div><div class="v gold fs40">${store.G.managerPrestige||0}</div><div class="sub">${t((store.G.managerPrestige||0)>=65?'history.prestigeTop':(store.G.managerPrestige||0)>=45?'history.prestigeFirst':'history.prestigeProjects')}</div></div></div></div>`:''}
  ${tab==='club'?`<div class="g2"><div class="card"><div class="ct">${t('history.clubChronicle')}</div>${clubHistory.length?clubHistory.map(h=>`<div class="pnl-row"><div><b>S${h.season}</b><div class="fs10 ink3">${h.league===1?'I':'II'} / OVR ${h.ovr}</div></div><div class="pnl-pos">#${h.position} / ${t('history.pointsShort',{points:h.pts})}</div></div>`).join(''):`<div class="fs12 ink3">${t('history.noClub')}</div>`}</div><div class="card"><div class="ct">${t('history.clubIdentity')}</div><div class="flex aic gp14 mb10"><img src="${getTeamLogoData(myTeam())}" alt="${myTeam().name}" class="club-logo lg"><div><div class="syne fs22 b8">${myTeam().name}</div><div class="fs11 ink3">${getTeamBranding(myTeam()).nickname} / ${getTeamBranding(myTeam()).motto}</div></div></div><div class="fs12 ink2">${t('history.loyalPlayers',{names:myPlayers().slice().sort((a,b)=>(b.loyalty||0)-(a.loyalty||0)).slice(0,3).map(p=>p.name).join(', ')||t('history.noData')})}</div></div></div>`:''}
  ${tab==='coaches'?`<div class="g2">
    <div class="card"><div class="ct">${t('history.coachHistory')}</div>${coachHistory.length?coachHistory.map(h=>`<div class="pnl-row"><div><b>${h.coachName}</b><div class="fs10 ink3">S${h.season} / ${h.clubName} / ${h.style}</div></div><div class="pnl-pos">OVR ${h.coachOvr}</div></div>`).join(''):`<div class="fs12 ink3">${t(store.G.staff.some(s=>s.teamId===store.G.myTeamId&&s.type==='coach')?'history.coachStarts':'history.hireCoach')}</div>`}
      <div class="mt-14" style="padding-top:12px;border-top:1px solid var(--b1)"><div class="ct mb8">${t('history.bestCoaches')}</div>
      ${coachHistory.length?[...coachHistory].sort((a,b)=>b.coachOvr-a.coachOvr||b.season-a.season).slice(0,5).map((h,i)=>`<div class="pnl-row"><div><b>#${i+1} ${h.coachName}</b><div class="fs10 ink3">S${h.season} / ${h.style}</div></div><div class="pnl-pos">OVR ${h.coachOvr}</div></div>`).join(''):`<div class="fs12 ink3">${t('history.rankingStarts')}</div>`}
      </div></div>
    <div class="card"><div class="ct">${t('history.currentStaff')}</div>
      ${store.G.staff.filter(s=>s.teamId===store.G.myTeamId).length?store.G.staff.filter(s=>s.teamId===store.G.myTeamId).sort((a,b)=>staffOvr(b)-staffOvr(a)).map(s=>{const current=staffOvr(s);const hist=store.G.staffHistory?.[s.id]||[];const vals=hist.map(h=>h.ovr);const best=Math.max(current,...vals,0);return`<div class="pd10 bb1 bgs2 r10 mb10"><div class="row-bet"><div><div class="b7">${s.name}</div><div class="fs10 ink3">${staffRoleLabel(s.type)} / ${s.type==='coach'?coachStyleLabel(s):s.type==='scout'?scoutSpecialtyLabel(s):t('staff.clubSpecialist')} / ${s.age||'?'}</div></div>${window.PPM.ratingStars.renderRating(ratingProfile(current,staffCeiling(s)),{size:'compact',peakKnown:true,disclosure:'summary',showCurrentOvr:true})}</div>${miniChart(vals.length>1?vals:[current,current])}<div class="fs9 ink3 mt-4">${t('history.timeline',{values:(vals.length?vals:[current]).join(' → ')})} / ${t('history.recordedHighOvr',{ovr:best})}</div></div>`;}).join(''):`<div class="fs12 ink3">${t('history.noStaff')}</div>`}
    </div>
  </div>`:''}`;
}

// ── INBOX (owner 2026-07-02): mail + yes/no decisions gating the next matchday ─
function pageInbox(){
  const inbox=(store.G.inbox||[]).slice().reverse();
  const pending=inbox.filter(m=>m.type==='decision'&&!m.answered).length;
  const text=(m,field)=>m[`${field}Key`]?t(m[`${field}Key`],m[`${field}Params`]||{}):(m[field]||'');
  return`<div class="ph"><div><div class="pt">${t('inbox.title')}</div><div class="ps">${t('inbox.summary',{count:inbox.length})}${pending?` / <b class="cr">${t('inbox.pending',{count:pending})}</b>`:''}</div></div></div>
  ${pending?`<div class="banner" style="border-left-color:var(--r)"><div class="dot bgr"></div>${t('inbox.blocked')}</div>`:''}
  <div class="grid gp8">
  ${inbox.length?inbox.map(m=>{
    const isPending=m.type==='decision'&&!m.answered;
    const border=isPending?'var(--r)':m.read?'var(--b1)':'var(--gold)';
    return`<div style="padding:12px 14px;border:1px solid ${border};border-left:4px solid ${border};background:var(--s1);border-radius:6px;${m.read&&!isPending?'opacity:.75;':''}" ${!m.read?`onclick="markMailRead(${m.id});render()"`:''}>
      <div class="flex jcb gp10 aib">
        <div style="font-weight:${m.read&&!isPending?'400':'800'};font-size:13px">${text(m,'subject')}</div>
        <div class="fs9 ink3 nowrap">S${m.season} / M${m.matchday}${m.read?'':` / <b class="cgold">${t('inbox.new')}</b>`}</div>
      </div>
      <div class="fs10 ink3" style="margin:2px 0 6px">${t('inbox.from',{name:text(m,'from')||t('inbox.club')})}</div>
      <div class="fs12 ink2 lh155">${text(m,'body')}</div>
      ${m.type==='decision'?(isPending?`<div class="btn-row mt-10" onclick="event.stopPropagation()">
        <button class="btn go sm" onclick="answerMail(${m.id},true)">✔ ${t('inbox.yes')}</button>
        <button class="btn sm bcr cr" onclick="answerMail(${m.id},false)">✘ ${t('inbox.no')}</button>
      </div>`:`<div style="margin-top:8px;font-size:11px;font-weight:700;color:${m.answer?'var(--g)':'var(--r)'}">${t('inbox.yourDecision',{answer:t(m.answer?'inbox.yes':'inbox.no')})}</div>`):''}
    </div>`;}).join(''):`<div class="card tac ink3 pd40">${t('inbox.empty')}</div>`}
  </div>`;
}

function pageNews(){
  const allNews=(store.G.newsFeed||[]).slice().reverse();
  const seasons=[...new Set((store.G.newsFeed||[]).map(n=>String(n.season)).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));
  if(!ui.newsSeason)ui.newsSeason='all';
  if(!ui.newsType)ui.newsType='all';
  const filtered=allNews.filter(n=>(ui.newsSeason==='all'||String(n.season)===String(ui.newsSeason))&&(ui.newsType==='all'||(n.type||'')===ui.newsType));
  const typeLabel=type=>t(type==='cup'?'news.cupEvent':type==='hot'?'news.sensation':type==='good'?'news.positive':'news.neutral');
  return`<div class="ph"><div><div class="pt">${t('news.title')}</div><div class="ps">${t('news.archiveCount',{count:allNews.length})}</div></div></div>
  <div class="card mb14">
    <div class="ct">${t('news.filters')}</div>
    <div class="grid gtc2 gp10">
      <select onchange="ui.newsSeason=this.value;render()" class="tile">
        <option value="all" ${ui.newsSeason==='all'?'selected':''}>${t('news.allSeasons')}</option>
        ${seasons.map(s=>`<option value="${s}" ${String(ui.newsSeason)===String(s)?'selected':''}>${t('common.season')} ${s}</option>`).join('')}
      </select>
      <select onchange="ui.newsType=this.value;render()" class="tile">
        <option value="all" ${ui.newsType==='all'?'selected':''}>${t('news.allTypes')}</option>
        <option value="" ${ui.newsType===''?'selected':''}>${t('news.neutral')}</option>
        <option value="good" ${ui.newsType==='good'?'selected':''}>${t('news.positive')}</option>
        <option value="hot" ${ui.newsType==='hot'?'selected':''}>${t('news.sensation')}</option>
        <option value="cup" ${ui.newsType==='cup'?'selected':''}>${t('news.cupEvent')}</option>
      </select>
    </div>
  </div>
  <div class="card">
    <div class="ct">${t('news.archive')}</div>
    ${filtered.length?filtered.map(n=>`<div class="news-item ${n.type||''} mb8">
      <div class="flex jcb gp12 aifs">
        <div>${newsText(n)}</div>
        <div class="tar nowrap fs10 ink3">S${n.season}/K${n.matchday}<div>${typeLabel(n.type)}</div></div>
      </div>
    </div>`).join(''):`<div class="fs12 ink3">${t('news.empty')}</div>`}
  </div>`;
}

function pageHoF(){
  const tab=ui.hofTab||'all';const sk=ui.hofSort||'trophies_gold';
  const hofRealTab=ui.hofRealTab||'hof';
  let list=[...store.G.hallOfFame];
  list.forEach(e=>{e.goldCount=(e.awards||[]).filter(a=>a.type==='league_champion'||a.type==='olympic_gold'||a.type==='cup_winner').length;e.ovr=e.peakOvr;e.w=e.careerW;});
  if(sk==='trophies_gold')list.sort((a,b)=>b.goldCount-a.goldCount);
  else if(sk==='ovr')list.sort((a,b)=>b.ovr-a.ovr);
  else if(sk==='w')list.sort((a,b)=>b.w-a.w);
  else list.sort((a,b)=>b.wrate-a.wrate);
  if(tab==='mine')list=list.filter(e=>e.wasMyPlayer);
  const rec=store.G.records||{};
  
  const tabsHtml=`<div class="rtabs mb14">
    <div class="rtab ${hofRealTab==='hof'?'on':''}" onclick="ui.hofRealTab='hof';render()">${t('hof.gallery')}</div>
    <div class="rtab ${hofRealTab==='records'?'on':''}" onclick="ui.hofRealTab='records';render()">${t('hof.records')}</div>
  </div>`;
  
  let bodyHtml='';
  
  if(hofRealTab==='hof'){
    const filterTabs=`<div class="g2 mb14">
      <div class="rtabs" style="margin-bottom:0">
        <div class="rtab ${tab==='all'?'on':''}" onclick="ui.hofTab='all';render()">${t('hof.everyone')}</div>
        <div class="rtab ${tab==='mine'?'on':''}" onclick="ui.hofTab='mine';render()">${t('hof.myClub')}</div>
      </div>
      <div class="rtabs" style="margin-bottom:0">${[['trophies_gold',t('hof.trophies')],['ovr','Peak OVR'],['w',t('hof.wins')],['wrate','%W']].map(([v,l])=>`<div class="rtab ${sk===v?'on':''}" onclick="ui.hofSort='${v}';render()">${l}</div>`).join('')}</div>
    </div>`;
    
    const rows=list.length?list.slice(0,20).map((e,i)=>`<div class="hof-row">
      <div class="hr-rank ${i<3?'r'+(i+1):''}">${i+1}</div>
      <div>
        <div class="hr-name">${e.name}${e.wasMyPlayer?' <span class="fs10 cg">\u2605</span>':''}</div>
        <div class="hr-meta">${e.retiredAge} / ${e.careerW}W/${e.careerL}L / ${e.wrate}%W</div>
        <div class="mt-3">${(e.awards||[]).slice(0,4).map(a=>`<span class="award">${awardLabel(a)}</span>`).join('')}</div>
      </div>
      <div class="hr-val">${sk==='trophies_gold'?e.goldCount+'':sk==='ovr'?e.ovr:sk==='w'?e.careerW:e.wrate+'%'}</div>
    </div>`).join(''):`<div class="pd40 tac ink3">${t('hof.empty')}</div>`;
    
    bodyHtml=filterTabs+'<div class="card" style="padding:0">'+rows+'</div>';
  }
  
  if(hofRealTab==='records'){
    const allPlayers=[...(store.G.players||[]),...(store.G.hallOfFame||[])];
    const playerTallies=new Map();
    const clubTallies=new Map();
    const seenPlayerAwards=new Set();
    const seenClubTrophies=new Set();
    const addPlayerTally=(name,key)=>{
      if(!name)return;
      const row=playerTallies.get(name)||{name,total:0,league:0,cup:0,masters:0,international:0};
      row[key]++;
      row.total++;
      playerTallies.set(name,row);
    };
    const addClubTally=(name,key,season)=>{
      if(!name)return;
      const trophyKey=`${name}|${key}|${season||'na'}`;
      if(seenClubTrophies.has(trophyKey))return;
      seenClubTrophies.add(trophyKey);
      const row=clubTallies.get(name)||{name,total:0,league:0,cup:0};
      row[key]++;
      row.total++;
      clubTallies.set(name,row);
    };
    allPlayers.forEach(p=>(p.awards||[]).forEach(a=>{
      const awardType=String(a.type||'');
      const playerAwardKey=`${p.name}|${awardType}|${a.season||0}|${a.clubName||''}`;
      if(seenPlayerAwards.has(playerAwardKey))return;
      seenPlayerAwards.add(playerAwardKey);
      if(awardType==='league_champion'){
        addPlayerTally(p.name,'league');
        addClubTally(a.clubName||teamName(p.teamId)||'', 'league', a.season);
      }
      else if(awardType==='cup_winner'){
        addPlayerTally(p.name,'cup');
        addClubTally(a.clubName||teamName(p.teamId)||'', 'cup', a.season);
      }
      else if(awardType.startsWith('top12_winner')){addPlayerTally(p.name,'masters');}
      else if(awardType==='olympic_gold'||awardType==='mundial_gold'){addPlayerTally(p.name,'international');}
    }));
    Object.entries(store.G.clubHistory||{}).forEach(([cid,entries])=>{
      (entries||[]).forEach(entry=>{
        if(entry.position!==1)return;
        const clubName=teamName(Number(cid))||entry.clubName;
        addClubTally(clubName,'league',entry.season);
      });
    });
    const topPlayersByTotal=[...playerTallies.values()].sort((a,b)=>b.total-a.total||b.league-a.league).slice(0,5);
    const topPlayersByLeague=[...playerTallies.values()].sort((a,b)=>b.league-a.league||b.total-a.total).slice(0,5);
    const topClubsByTotal=[...clubTallies.values()].sort((a,b)=>b.total-a.total||b.league-a.league).slice(0,5);
    const topClubsByLeague=[...clubTallies.values()].sort((a,b)=>b.league-a.league||b.total-a.total).slice(0,5);
    const recordEmpty=label=>`<div class="ink3 fs11 pd8-0">${label} — ${t('hof.notSet')}</div>`;
    const psRow=rec.PERFECT_SEASON?`<div class="pnl-row"><div><b>${t('hof.perfectSeason')}</b><div class="fs10 ink3">${rec.PERFECT_SEASON.club} / ${t('common.season')} ${rec.PERFECT_SEASON.season}</div></div><div class="pnl-pos">${t('history.pointsShort',{points:rec.PERFECT_SEASON.pts})}</div></div>`:recordEmpty(t('hof.perfectSeason'));
    const strRow=rec.LONGEST_STREAK?`<div class="pnl-row"><div><b>${t('hof.longestStreak')}</b><div class="fs10 ink3">${rec.LONGEST_STREAK.club} / ${t('common.season')} ${rec.LONGEST_STREAK.season}</div></div><div class="pnl-pos">${t('hof.matchdays',{count:rec.LONGEST_STREAK.streak})}</div></div>`:recordEmpty(t('hof.longestStreak'));
    const setsRow=rec.FEWEST_SETS_LOST?`<div class="pnl-row"><div><b>${t('hof.fewestSets')}</b><div class="fs10 ink3">${rec.FEWEST_SETS_LOST.club} / ${t('common.season')} ${rec.FEWEST_SETS_LOST.season}</div></div><div class="pnl-pos">${rec.FEWEST_SETS_LOST.setsLost}</div></div>`:recordEmpty(t('hof.fewestSets'));
    const winRow=rec.MOST_WINS_PLAYER?`<div class="pnl-row"><div><b>${t('hof.mostWins')}</b><div class="fs10 ink3">${rec.MOST_WINS_PLAYER.playerName} / ${t('common.season')} ${rec.MOST_WINS_PLAYER.season}</div></div><div class="pnl-pos">${rec.MOST_WINS_PLAYER.wins} W</div></div>`:recordEmpty(t('hof.mostWins'));
    const ovrRow=rec.HIGHEST_OVR?`<div class="pnl-row"><div><b>${t('hof.highestOvr')}</b><div class="fs10 ink3">${rec.HIGHEST_OVR.playerName} / ${t('common.season')} ${rec.HIGHEST_OVR.season}</div></div><div class="pnl-pos syne b8 fs22">${rec.HIGHEST_OVR.ovr}</div></div>`:recordEmpty(t('hof.highestOvr'));
    const mvpRow=rec.MOST_MVP?`<div class="pnl-row"><div><b>${t('hof.mostMasters')}</b><div class="fs10 ink3">${rec.MOST_MVP.playerName}</div></div><div class="pnl-pos">${rec.MOST_MVP.count}\u00d7</div></div>`:recordEmpty(t('hof.mostMasters'));
    const mgrStatus=t((store.G.managerPrestige||0)>=75?'hof.managerEligible':(store.G.managerPrestige||0)>=50?'hof.managerGoodPath':'hof.managerBuild');
    bodyHtml=`<div class="g2">
      <div>
        <div class="card"><div class="ct cgold">${t('hof.clubRecords')}</div>
          ${psRow}${strRow}${setsRow}
        </div>
        <div class="card"><div class="ct">${t('hof.decoratedClubs')}</div>
          ${topClubsByTotal.length?topClubsByTotal.map((c,i)=>`<div class="pnl-row"><div><b>#${i+1} ${c.name}</b><div class="fs10 ink3">${t('hof.leaguesCups',{leagues:c.league,cups:c.cup})}</div></div><div class="pnl-pos">${t('hof.trophiesShort',{count:c.total})}</div></div>`).join(''):`<div class="fs11 ink3">${t('hof.noFullHistory')}</div>`}
        </div>
        <div class="card"><div class="ct">${t('hof.clubLeagueTitles')}</div>
          ${topClubsByLeague.length?topClubsByLeague.map((c,i)=>`<div class="pnl-row"><div><b>#${i+1} ${c.name}</b></div><div class="pnl-pos">${c.league}×</div></div>`).join(''):`<div class="fs11 ink3">${t('hof.noFullHistory')}</div>`}
        </div>
      </div>
      <div>
        <div class="card"><div class="ct cr">${t('hof.individualRecords')}</div>
          ${winRow}${ovrRow}${mvpRow}
        </div>
        <div class="card"><div class="ct">${t('hof.decoratedPlayers')}</div>
          ${topPlayersByTotal.length?topPlayersByTotal.map((p,i)=>`<div class="pnl-row"><div><b>#${i+1} ${p.name}</b><div class="fs10 ink3">${t('hof.playerTrophies',{league:p.league,cup:p.cup,masters:p.masters,international:p.international})}</div></div><div class="pnl-pos">${t('hof.trophiesShort',{count:p.total})}</div></div>`).join(''):`<div class="fs11 ink3">${t('hof.noFullHistory')}</div>`}
        </div>
        <div class="card"><div class="ct">${t('hof.playerLeagueTitles')}</div>
          ${topPlayersByLeague.length?topPlayersByLeague.map((p,i)=>`<div class="pnl-row"><div><b>#${i+1} ${p.name}</b></div><div class="pnl-pos">${p.league}×</div></div>`).join(''):`<div class="fs11 ink3">${t('hof.noFullHistory')}</div>`}
        </div>
        <div class="card"><div class="ct">${t('hof.managerPrestige')}</div>
          <div class="sb mb10"><div class="l">${t('hof.managerPrestige')}</div><div class="v gold fs40">${store.G.managerPrestige||0}</div><div class="sub">${mgrStatus}</div></div>
        </div>
      </div>
    </div>`;
  }
  
  return`<div class="ph"><div><div class="pt">${t('hof.title')}</div></div></div>${tabsHtml}${bodyHtml}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRE-SEASON — a flow, not a stack of sections.
// Four decisions, one at a time, with a step rail that shows what is done and
// what is left. The season only unlocks on the last step, and only when every
// step is actually settled — so "am I done?" is never a question.
// ═══════════════════════════════════════════════════════════════════════════
function pagePreseason(){
  const mt=myTeam();const offers=store.G.sponsorOffers||[];
  const activeSponsors=store.G.sponsors.filter(s=>s.active);
  const sponsorCount=activeSponsors.length;
  const techContract=getTechContract();
  const hasTech=!!techContract;
  const pres=calcPrestige();
  if(!(store.G.boardObjectiveOptions||[]).length)store.G.boardObjectiveOptions=window.PPM.gameplay.generateBoardObjectiveChoices(store.G.myTeamId);
  const boardObjective=getBoardObjective();
  const boardOptions=store.G.boardObjectiveOptions||[];
  const activeTp=techContract?TECH_PARTNERSHIPS.find(t=>t.id===techContract.partnerId):null;

  const steps=[
    {id:'sponsors',label:t('pre.sponsors'),done:sponsorCount>=3,status:`${sponsorCount}/3`},
    {id:'tech',    label:t('pre.tech'),done:hasTech,status:hasTech?(activeTp?.name||t('pre.selected')):t('pre.none')},
    {id:'tickets', label:t('pre.tickets'),done:true,status:formatCurrency(store.G.ticketPrice||50)},
    {id:'board',   label:t('pre.board'),done:!!boardObjective,status:boardObjective?boardObjective.label:t('pre.none')},
  ];
  // Land on the first unsettled step rather than always on step 1.
  if(ui.preStep==null||ui.preStep<0||ui.preStep>3){
    const firstOpen=steps.findIndex(s=>!s.done);
    ui.preStep=firstOpen<0?3:firstOpen;
  }
  const step=ui.preStep;
  const canStart=steps.every(s=>s.done);
  const doneCount=steps.filter(s=>s.done).length;

  let body='';
  if(step===0){
    body=`<div class="over">${t('pre.step',{current:1})}</div>
      <h3>${t('pre.sponsorQuestion')}</h3>
      <p class="why">${t('pre.sponsorWhy')}</p>
      ${activeSponsors.length?`<div class="mt-14">${activeSponsors.map(s=>`<div class="opt on"><div><b>${s.name}</b><p>${goalDesc(s.goal)}${(s.yearsLeft||1)>1?` · ${t('pre.seasons',{count:s.yearsLeft})}`:''}</p></div><div class="m pos">${formatCurrency(s.reward)}<s>${t('pre.perSeason')}</s></div><span class="pill pos">${t('pre.signed')}</span></div>`).join('')}</div>`:''}
      ${sponsorCount<3?`<div class="mt-14">${offers.length?offers.map(s=>`<div class="opt">
        <div><b>${s.name} <span class="pill">${s.tier}</span></b><p>${goalDesc(s.goal)}</p></div>
        <div class="m pos">${formatCurrency(s.reward)}<s>${t('pre.perSeason')}</s></div>
        <div class="tools" onclick="event.stopPropagation()">
          ${(s.maxYears||1)>1?`<select id="spy-${s.id}">${Array.from({length:s.maxYears},(_,i)=>i+1).map(y=>`<option value="${y}">${t('pre.seasons',{count:y})}</option>`).join('')}</select>`:''}
          <button class="btn pr" onclick="signSponsorPreseason(${s.id},(document.getElementById('spy-${s.id}')||{}).value||1)">${t('pre.sign')}</button>
        </div></div>`).join(''):`<div class="empty-state">${t('pre.noOffers')}</div>`}</div>`
      :`<div class="opt on mt-14"><div><b>${t('pre.sponsorsComplete')}</b><p>${t('pre.sponsorsCompleteHint')}</p></div><span class="pill pos">${t('pre.ready')}</span></div>`}`;
  }else if(step===1){
    body=`<div class="over">${t('pre.step',{current:2})}</div>
      <h3>${t('pre.techQuestion')}</h3>
      <p class="why">${t('pre.techWhy',{prestige:`<b class="cgold">${pres}</b>`})}</p>
      ${hasTech&&activeTp?(()=>{
        const rubber=EQUIPMENT.rubberProfiles[techContract.rubberId]||{};
        const effects=formatTechContractEffects(techContract);
        const fit=(rubber.fitStyles||[]).map(styleLabel).join(', ')||t('club.allStyles');
        const cashflow=Number(techContract.annualCashflow)||0;
        const contractStatus=Number(techContract.signedSeason)===Number(store.G.season)?t('pre.techNewContract'):t('pre.techCarryover');
        return`<div class="opt on mt-14"><div><b>${activeTp.name} <span class="pill pos">${t('pre.chosen')}</span></b><p>${contractStatus}</p><p>${t('pre.techProfile',{profile:t(`equipment.profile.${activeTp.profileId}`)})} · ${t('pre.techIncludedRubber',{rubber:t(`equipment.rubber.${techContract.rubberId}`)})}</p><p>${t('pre.techStyleFit',{styles:fit})} · ${t('pre.techEffects',{effects})}</p></div><div class="m ${cashflow>0?'pos':'neg'}">${cashflow>0?'+':''}${formatCurrency(cashflow)}<s>${t('pre.perSeason')}</s></div></div>`;
      })():`<div class="mt-14"><div class="fs10 ink3 mb6">${t('pre.techTerm')}</div>${TECH_PARTNERSHIPS.map(tp=>{
        const ok=pres>=tp.prestige[0]&&pres<=tp.prestige[1];
        const rubber=EQUIPMENT.rubberProfiles[tp.rubberId]||{};
        const effects=formatTechContractEffects(tp);
        const fit=(rubber.fitStyles||[]).map(styleLabel).join(', ')||t('club.allStyles');
        const signedCashflow=years=>{const amount=techContractAnnualCashflow(tp,years);return `${amount>0?'+':''}${formatCurrency(amount)}`;};
        return`<div class="opt" style="${ok?'':'opacity:.45'}"><div><b>${tp.name} <span class="pill">${t('pre.tier',{tier:tp.tier})}</span></b><p>${t('pre.techProfile',{profile:t(`equipment.profile.${tp.profileId}`)})} · ${t('pre.techIncludedRubber',{rubber:t(`equipment.rubber.${tp.rubberId}`)})}</p><p>${t('pre.techStyleFit',{styles:fit})} · ${t('pre.techEffects',{effects})} · ${t('pre.prestigeRange',{min:tp.prestige[0],max:tp.prestige[1]})}</p></div><div class="tools" onclick="event.stopPropagation()"><select id="tpy-${tp.id}" ${ok?'':'disabled'}>${[1,2,3].map(years=>`<option value="${years}">${t(`club.${years===1?'oneSeason':years===2?'twoSeasons':'threeSeasons'}`)} (${signedCashflow(years)})</option>`).join('')}</select><div class="fs10 ink3">${t('pre.techTermBenefit')}</div><button class="btn pr" onclick="selectTechPartnership('${tp.id}',(document.getElementById('tpy-${tp.id}')||{}).value||1);render()" ${ok?'':'disabled'}>${t(ok?'pre.choose':'pre.prestigeTooLow')}</button></div></div>`;
      }).join('')}</div>`}`;
  }else if(step===2){
    const gpx=window.PPM.gameplay;
    const price=store.G.ticketPrice||50;
    const est=gpx.estimateAttendance(price);
    const gate=est.attendance*price*11;
    const cheap=gpx.estimateAttendance(Math.max(10,price-25));
    const dear=gpx.estimateAttendance(price+25);
    body=`<div class="over">${t('pre.step',{current:3})}</div>
      <h3>${t('pre.ticketQuestion')}</h3>
      <p class="why">${t('pre.ticketWhy')}</p>
      <div class="ticket-row mt-14">
        <div class="syne b8 fs28">${price} €</div>
        <input type="range" min="10" max="200" step="5" value="${price}" class="flx1 accr" oninput="store.G.ticketPrice=+this.value;this.previousElementSibling.textContent=this.value+' €'" onchange="render()">
      </div>
      <div class="g3 mt-14">
        <div class="sb" style="--tone:var(--cyan)"><div class="l">${t('pre.attendance')}</div><div class="v">${formatNumber(est.attendance)}<span class="dim fs18">/${formatNumber(est.capacity)}</span></div><div class="sub">${t('pre.venueFill',{percent:Math.round(est.fill*100),venue:gameDataText('infraHall',store.G.infraHall||0,'name',INFRA_HALL[store.G.infraHall||0].name)})}</div></div>
        <div class="sb"><div class="l">${t('pre.gateRevenue')}</div><div class="v g">${Math.round(gate/1000)}k</div><div class="sub">${formatCurrency(gate)} ${t('pre.perSeason')}</div></div>
        <div class="sb" style="--tone:var(--volt)"><div class="l">${t('pre.sensitivity')}</div><div class="v" style="font-size:20px">${formatNumber(cheap.attendance)} / ${formatNumber(dear.attendance)}</div><div class="sub">${t('pre.sensitivityHint')}</div></div>
      </div>`;
  }else{
    body=`<div class="over">${t('pre.step',{current:4})}</div>
      <h3>${t('pre.boardQuestion')}</h3>
      <p class="why">${t('pre.boardWhy',{ovr:`<b>${teamOvr(mt.id)}</b>`})}</p>
      <div class="mt-14">${boardOptions.map(opt=>{
        const active=boardObjective?.id===opt.id;
        return`<div class="opt ${active?'on':''}" onclick="selectBoardObjective('${opt.id}');render()">
          <div><b>${opt.label}</b><p>${opt.summary} · ${t(opt.id==='ambitious'?'pre.ambitiousRisk':opt.id==='safe'?'pre.safePath':'pre.standardPath')}</p></div>
          <div class="m ${opt.id==='ambitious'?'neg':'pos'}">${formatCurrency(opt.reward)}<s>${t('pre.bonus')}</s></div>
          <button class="btn ${active?'pr':''}">${t(active?'pre.chosen':'pre.choose')}</button>
        </div>`;}).join('')}</div>`;
  }

  return`<div class="ph">
    <div><div class="pt">${t('pre.title').toUpperCase()} <span>${t('common.season').toUpperCase()} ${store.G.season}</span></div>
      <div class="ps">${t(myLeague()===1?'league.divisionOne':'league.divisionTwo')} · ${t('pre.progress',{done:doneCount})}${canStart?` · ${t('pre.canStart')}`:''}</div></div>
    <button class="btn ${canStart?'go':''} fs13" onclick="startSeason()" style="padding:12px 26px" ${canStart?'':'disabled'}>${t('pre.start').toUpperCase()}</button>
  </div>
  <div class="substeps">
    ${steps.map((s,i)=>`<div class="ss ${s.done?'done':''} ${i===step?'on':''}" onclick="ui.preStep=${i};render()">
      <div class="n">${s.done?'✓':i+1}</div>${s.label}<span class="dim fs11">${s.status}</span>
    </div>`).join('')}
  </div>
  <div class="stage">
    ${body}
    <div class="stage-f">
      <button class="btn" ${step>0?'':'disabled'} onclick="ui.preStep=${Math.max(0,step-1)};render()">← ${step>0?steps[step-1].label:t('common.back')}</button>
      <span class="dim fs12">${canStart?t('pre.allDone'):t('pre.missing',{items:steps.filter(s=>!s.done).map(s=>s.label.toLowerCase()).join(', ')})}</span>
      ${step<3
        ?`<button class="btn ${steps[step].done?'pr':''}" onclick="ui.preStep=${step+1};render()">${steps[step+1].label} →</button>`
        :`<button class="btn ${canStart?'go':''}" ${canStart?'':'disabled'} onclick="startSeason()">${t('pre.start').replace('▶ ','')} →</button>`}
    </div>
  </div>`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// SAVE / LOAD
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function renderApp(){
  if(!store.G){renderStart();return;}
  setShellMode('game');
  checkScoutReturns();
  const el=document.getElementById('content');
  if(ui.page==='preseason')el.innerHTML=pagePreseason();
  else if(ui.page==='dash')el.innerHTML=pageDash();
  else if(ui.page==='squad')el.innerHTML=pageSquad();
  else if(ui.page==='staff')el.innerHTML=pageStaff();
  else if(ui.page==='club')el.innerHTML=pageClub();
  else if(ui.page==='budget')el.innerHTML=pageBudget();
  else if(ui.page==='sponsors')el.innerHTML=pageSponsors();
  else if(ui.page==='league')el.innerHTML=pageLeague();
  else if(ui.page==='cup')el.innerHTML=pageCup();
  else if(ui.page==='market')el.innerHTML=pageMarket();
  else if(ui.page==='scout'){ui.page='squad';ui.squadTab='youth';el.innerHTML=pageSquad();}
  else if(ui.page==='news')el.innerHTML=pageNews();
  else if(ui.page==='inbox')el.innerHTML=pageInbox();
  else if(ui.page==='history')el.innerHTML=pageHistory();
  else if(ui.page==='hof')el.innerHTML=pageHoF();
  updateHeader();
  syncNavState();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// START SCREEN
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function clubBudget(n,i,league){
  const CI=(window.PPM.constants.CLUB_IDENTITIES)||{};
  const country=COUNTRIES[ui._selCountry]||COUNTRIES['PL'];
  const budMult=country.budgetMult||1.0;
  if(CI[n]&&CI[n].budget!=null)return CI[n].budget;
  return league===1?Math.round((250000+i*22000)*budMult):Math.round((60000+i*8000)*budMult);
}
function renderStart(){
  setShellMode('start');
  if(!ui._newSaveDifficulty)ui._newSaveDifficulty=(ui.settings?.aiDifficulty||'hard');
  if(!ui._startView)ui._startView='menu';
  document.getElementById('content').innerHTML=ui._startView==='newgame'?renderNewGameWizard():renderMainMenu();
}
function menuEscape(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function renderCareerLibrary(){
  if(ui._saveStorageError){
    let hasLegacySave=false;
    try{hasLegacySave=!!localStorage.getItem(window.PPM.stateApi.LOCAL_STORAGE_KEY);}catch{}
    return`<div class="card bt3-red"><div class="b8 cr">${t('library.unavailable').toUpperCase()}</div><div class="fs11 ink3 mt-4">${menuEscape(ui._saveStorageError)}</div><div class="fs10 mt-6">${t(hasLegacySave?'library.legacySafe':'library.doNotStart')}</div>${hasLegacySave?`<button class="btn mt-10" onclick="resumeSavedGame()">${t('library.resumeLegacy').toUpperCase()}</button>`:''}</div>`;
  }
  const careers=Array.isArray(ui._careers)?ui._careers:[];
  if(!careers.length){
    return`<div class="tac pd16 bgs1 bb1 r8"><div class="b7">${t('library.empty')}</div><div class="fs10 ink3 mt-4">${t('library.emptyHint')}</div></div>`;
  }
  return careers.map(c=>{
    const s=c.summary||{};
    const phase=s.phase==='preseason'?'preseason':t('library.matchday',{number:s.matchday||0});
    const updated=c.updatedAt?formatDateTime(c.updatedAt):'—';
    const id=menuEscape(c.id);
    return`<div class="bgs1 bb1 r8 pd10-12">
      <div class="flex jcb aic gp10">
        <button class="btn flx1 tal" onclick="continueCareer('${id}')" style="padding:10px 12px">
          <span class="block syne b8 fs13">${menuEscape(c.name)}</span>
          <span class="block fs10 ink3 mt-2">${menuEscape(s.clubName||t('library.unknownClub'))} · ${t('common.season').toLowerCase()} ${s.season||1}, ${phase} · ${t(`country.${s.countryId||'PL'}`)}</span>
          <span class="block fs9 ink3 mt-2">${t('library.lastSave',{date:menuEscape(updated)})}</span>
        </button>
        <div class="flex gp4">
          <button class="btn sm" onclick="renameCareer('${id}')">${t('library.rename').toUpperCase()}</button>
          <button class="btn sm" onclick="showCareerBackups('${id}')">${t('library.backups').toUpperCase()}</button>
          <button class="btn sm" onclick="exportCareer('${id}')">JSON</button>
          <button class="btn sm r" onclick="deleteCareer('${id}')">${t('common.delete').toUpperCase()}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function renderMainMenu(){
  const hasCustomDb=!!window.PPM.customDatabase;
  // One accented action only. In this design language the livery marks the thing
  // you came here to do; a stack of seven solid slabs reads as noise.
  const menuBtn=(label,onclick,cls,sub,enabled)=>`<button class="btn ${cls||''} w100 fs15 syne b8 ls1 tal flex jcb aic" ${enabled===false?'disabled':''} onclick="${onclick}" style="padding:15px 20px">${label}${sub?`<span class="fs10 b6 ink3" style="letter-spacing:0">${sub}</span>`:''}</button>`;
  return`<div class="flex fdc aic jcc pd20" style="min-height:calc(100vh - 40px);gap:26px">
    <div class="tac">
      <div class="syne b8 up" style="font-size:68px;letter-spacing:.01em;line-height:.9"><span class="cr">PING</span><span class="cgold">PONG</span></div>
      <div class="syne fs14 b7 ink3 up mt-2" style="letter-spacing:.9em">MANAGER</div>
    </div>
    <div class="flex fdc gp8" style="width:680px;max-width:94vw">
      ${menuBtn(t('menu.newGame'),'startNewGameFlow()','pr')}
      <div class="fs10 ink3 up ls1 mt-6">${t('menu.careers')}</div>
      <div class="flex fdc gp6" style="max-height:44vh;overflow:auto">${renderCareerLibrary()}</div>
      ${menuBtn(t('menu.importCareer').toUpperCase(),'menuFilePicker()','',t('menu.importHint'))}
      ${menuBtn(t('menu.databaseEditor').toUpperCase(),"menuTbd(t('menu.databaseEditor'))",'',t('menu.comingSoon'))}
      ${menuBtn(t('menu.challenges').toUpperCase(),"menuTbd(t('menu.challenges'))",'',t('menu.comingSoon'))}
      ${menuBtn(t('menu.options').toUpperCase(),'openSettings()','')}
      ${menuBtn(t('menu.exit').toUpperCase(),'menuExit()','')}
    </div>
    ${hasCustomDb?`<div class="fs11 cpurple">${t('menu.customDb',{name:`<b>${menuEscape(window.PPM.customDatabase.name||'Custom DB')}</b>`})} &mdash; <span class="cur" style="text-decoration:underline" onclick="clearDatabaseFile()">${t('menu.clear')}</span></div>`:''}
    <div class="fs10 ink3">${t('menu.defaultDb')}</div>
  </div>`;
}
function ngCountryCard(cid){
  const c=COUNTRIES[cid];const sel=ui._selCountry===cid;
  return`<div onclick="ngSelectCountry('${cid}')" style="padding:14px 10px;border:2px solid ${sel?'var(--r)':'var(--line)'};cursor:pointer;background:${sel?'var(--tint-bad)':'var(--s2)'};border-radius:14px;text-align:center">
    <div class="fs30 mb6">${c.flag}</div>
    <div class="syne b7 fs13">${t(`country.${cid}`)}</div>
    <div class="fs9 ink3 mt-2">${t('wizard.ranking',{rank:c.worldRank})}</div>
    <div class="fs9 cr b7">OVR &times;${c.ovrMult} / ${t('wizard.budget')} &times;${c.budgetMult}</div>
  </div>`;
}
function ngTeamCard(n,idx,league){
  const CI=(window.PPM.constants.CLUB_IDENTITIES)||{};
  const sel=ui._selClub===idx;const budget=clubBudget(n,league===1?idx:idx-12,league);
  return`<div onclick="ngSelectTeam(${idx})" style="padding:11px;border:1.5px solid ${sel?'var(--r)':'var(--b1)'};cursor:pointer;background:${sel?'var(--tint-bad)':'var(--s2)'};border-radius:12px">
    <div class="flex aic" style="gap:9px;margin-bottom:5px"><img src="${getTeamLogoData({id:idx,name:n})}" alt="${n}" class="club-logo"><div class="syne b7 fs12" style="line-height:1.15">${n}</div></div>
    <div class="fs12 b7 cg">${formatCurrency(budget)}</div>
    ${CI[n]?`<div class="mt-4 fs9 cr b8">&#127942; ${t('wizard.challengeClub').toUpperCase()}</div>`:''}
  </div>`;
}
function renderNewGameWizard(){
  const step=ui._ngStep||0;
  const country=COUNTRIES[ui._selCountry]||COUNTRIES['PL'];
  const l1=(country.l1Names||TNAMES_L1),l2=(country.l2Names||TNAMES_L2);
  const stepNames=['wizard.country','wizard.league','wizard.team','wizard.difficulty'].map(t);
  const stepper=stepNames.map((nm,i)=>`<div style="display:flex;align-items:center;gap:6px;opacity:${i<=step?1:.4}"><div style="width:22px;height:22px;border-radius:50%;background:${i<step?'var(--g)':i===step?'var(--r)':'var(--b1)'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">${i<step?'&#10003;':i+1}</div><span class="fs11 b7">${nm}</span></div>`).join('<div class="flx1" style="height:1px;background:var(--b1);min-width:16px"></div>');
  let body='',hint='';
  if(step===0){
    hint=t('wizard.countryHint');
    body=`<div class="country-grid">${COUNTRY_IDS.map(ngCountryCard).join('')}</div>`;
  }else if(step===1){
    hint=`${country.flag} ${t(`country.${country.id}`)}. ${t('wizard.chooseLeague')}.`;
    const lbtn=(l,name,desc)=>`<div onclick="ngSelectLeague(${l})" style="flex:1;padding:26px;border:2px solid ${ui._ngLeague===l?'var(--r)':'var(--b1)'};border-radius:16px;cursor:pointer;background:${ui._ngLeague===l?'var(--tint-bad)':'var(--s2)'};text-align:center">
      <span class="league-badge ${l===1?'l1':'l2'} fs14" style="padding:6px 14px">${name}</span>
      <div class="fs12 ink3 mt-12">${desc}</div></div>`;
    body=`<div class="flex gp16 mxauto" style="max-width:560px">${lbtn(1,t('league.divisionOne').toUpperCase(),t('wizard.topLeagueDesc'))}${lbtn(2,t('league.divisionTwo').toUpperCase(),t('wizard.secondLeagueDesc'))}</div>`;
  }else if(step===2){
    const league=ui._ngLeague||1;const names=league===1?l1:l2;
    hint=`${t(league===1?'league.divisionOne':'league.divisionTwo')} · ${t(`country.${country.id}`)}. ${t('wizard.teamHint')}`;
    body=`<div class="grid gtc3 gp10">${names.map((n,i)=>ngTeamCard(n,league===1?i:i+12,league)).join('')}</div>`;
  }else{
    hint=t('wizard.difficultyHint');
    const chosenName=(ui._ngLeague===1?l1:l2)[(ui._ngLeague===1?ui._selClub:ui._selClub-12)]||'&mdash;';
    body=`<div class="tac mb14 fs13">${t('nav.club')}: <b>${chosenName}</b> (${t(ui._ngLeague===1?'league.divisionOne':'league.divisionTwo')}, ${t(`country.${country.id}`)})</div>
      <div class="grid gtc4 gp8 maxw520" style="margin:0 auto 10px">${[['easy','Easy'],['normal','Normal'],['hard','Hard'],['legend','Legend']].map(([id,label])=>`<button class="btn ${ui._newSaveDifficulty===id?'pr':'sm'} w100" onclick="selectNewSaveDifficulty('${id}')">${label}</button>`).join('')}</div>
      <div class="maxw520" style="margin:0 auto 10px">
        <div class="fs10 ink3 up ls1 mb6 tac">${t('wizard.worldHistory')}</div>
        <div class="grid gtc4 gp8">${[[0,t('wizard.freshWorld')],[3,t('wizard.seasons',{count:3})],[5,t('wizard.seasons',{count:5})],[10,t('wizard.seasons',{count:10})]].map(([n,label])=>`<button class="btn ${(ui._ngHistory??5)===n?'pr':'sm'} w100" onclick="ui._ngHistory=${n};renderStart();playClick()">${label}</button>`).join('')}</div>
        <div class="fs10 ink3 mt-6 tac">${t('wizard.historyHint')}</div>
      </div>
      <div class="maxw520 mxauto fs11 ink2 lh17 pd10-12 bgs1 bb1 r8">${(window.PPM.gameplay.difficultyEffectsSummary(ui._newSaveDifficulty||'hard')).map(e=>`&bull; ${e}`).join('<br>')}</div>`;
  }
  const canNext=step===0?!!ui._selCountry:step===1?!!ui._ngLeague:step===2?ui._selClub>=0:true;
  const nav=step<3
    ?`<button class="btn pr" ${canNext?'':'disabled'} onclick="ngNext()" style="padding:11px 30px">${t('wizard.next').toUpperCase()}</button>`
    :`<button class="btn pr fs14" onclick="startGame()" style="padding:11px 34px">${t('wizard.start').toUpperCase()}</button>`;
  return`<div class="mxauto flex fdc" style="max-width:820px;min-height:calc(100vh - 40px);padding:18px 16px">
    <div class="flex aic gp10 mb16">
      <button class="btn sm" onclick="ngBack()">&larr; ${step===0?'Menu':t('common.back')}</button>
      <div class="flx1 flex aic gp8">${stepper}</div>
    </div>
    <div class="tac syne fs26 b8 mb4">${['wizard.chooseCountry','wizard.chooseLeague','wizard.chooseTeam','wizard.chooseDifficulty'].map(t)[step]}</div>
    <div class="tac fs11 ink3 mb18">${hint}</div>
    <div class="flx1">${body}</div>
    <div class="flex jcc" style="margin-top:18px">${nav}</div>
  </div>`;
}
function startNewGameFlow(){ui._startView='newgame';ui._ngStep=0;ui._selClub=-1;ui._ngLeague=null;renderStart();playClick();}
function ngBack(){if((ui._ngStep||0)>0)ui._ngStep=(ui._ngStep||0)-1;else ui._startView='menu';renderStart();playClick();}
function ngNext(){const step=ui._ngStep||0;if(step<3)ui._ngStep=step+1;renderStart();playClick();}
function ngSelectCountry(cid){ui._selCountry=cid;ui._selClub=-1;ui._ngLeague=null;ui._ngStep=1;renderStart();playClick();}
function ngSelectLeague(l){ui._ngLeague=l;ui._selClub=-1;ui._ngStep=2;renderStart();playClick();}
function ngSelectTeam(idx){ui._selClub=idx;ui._ngStep=3;renderStart();playClick();}
function menuLoadGame(){if(typeof resumeSavedGame==='function')resumeSavedGame();}
function menuFilePicker(){const fi=document.getElementById('fi');if(fi)fi.click();}
function menuTbd(name){toast(`${name} — ${t('menu.comingSoon')}.`);}
function menuExit(){if(confirm(t('menu.exitConfirm'))){try{window.close();}catch(e){}toast(t('menu.exitHint'));}}
function selCountry(cid){ui._selCountry=cid;ui._selClub=-1;renderStart();playClick();}
function selClub(i){ui._selClub=i;renderStart();}
function selectNewSaveDifficulty(level){ui._newSaveDifficulty=level;renderStart();playClick();}
async function startGame(){
  if(ui._selClub<0)return;
  const manager=window.PPM.saveManager;
  if(manager?.isInitialized?.()){
    const estimate=await manager.estimateStorage();
    if(estimate?.low&&!confirm(t('wizard.storageLow')))return;
    persistGame();
    await manager.flush();
    await manager.deactivate();
  }
  newGame(ui._selClub,ui._selCountry);
  if(manager?.isInitialized?.()){
    const club=store.G.teams.find(t=>t.id===store.G.myTeamId);
    await manager.createCareer(window.PPM.stateApi.serializeGame(),club?.name||'Nowa kariera');
    ui._careers=await manager.listCareers();
  }
  const historyN=ui._ngHistory??5;
  if(historyN>0){
    // World pre-history (owner backlog #1): block the UI with a progress modal
    // while the league plays its seasons; the save persists only at handover.
    ui.running=true;
    const modal=document.getElementById('modal');modal.className='modal';
    modal.innerHTML=`<div class="mt2">⏳ ${t('wizard.generatingHistory').toUpperCase()}</div>
      <div id="bg-gen-status" class="fs13" style="margin:14px 0 6px">${t('wizard.generatingSeason',{done:1,total:historyN})}</div>
      <div class="h10 bgs3 rpill ovh"><div id="bg-gen-bar" class="bgr" style="height:100%;width:0%;transition:width .3s"></div></div>
      <div class="fs10 ink3 mt-10">${t('wizard.generatingHint')}</div>`;
    openModal();
    try{
      await window.PPM.gameplay.simulateBackgroundSeasons(historyN,(done,total)=>{
        const st=document.getElementById('bg-gen-status');
        const bar=document.getElementById('bg-gen-bar');
        if(st)st.textContent=t('wizard.generatingProgress',{done,total});
        if(bar)bar.style.width=`${Math.round(done/total*100)}%`;
      });
    }finally{
      ui.running=false;
      closeModal();
    }
  }
  ui._startView='menu';
  ui.page='preseason';
  renderApp();
  syncNavState();
  updateHeader();
  persistGame();
  await window.PPM.stateApi.flushPersistence();
  playClick();
}

window.PPM.pages = { statBar, toggleMarketFav, pageDash, pageSquad, pageLeague, pageCup, pageStaff, pageClub, pageBudget, pageSponsors, pageMarket, pageNews, pageInbox, pageHistory, pageHoF, pagePreseason, renderApp, renderStart, selCountry, selClub, selectNewSaveDifficulty, startGame, startNewGameFlow, ngBack, ngNext, ngSelectCountry, ngSelectLeague, ngSelectTeam, menuLoadGame, menuFilePicker, menuTbd, menuExit };
})();
