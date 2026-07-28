(function(){
window.PPM = window.PPM || {};
const { INFRA_HALL, INFRA_MED, INFRA_ACADEMY, INFRA_MERCH } = window.PPM.constants;

function getClubHistory(tid){
  if(!store.G)return[];
  return store.G.clubHistory?.[tid]||[];
}

function cupStageForTeam(teamId){
  const cup=store.G?.cup;
  if(!cup)return null;
  if(cup.finished&&cup.winner?.isReal&&cup.winner.id===teamId)return'winner';
  const rounds=cup.rounds||[];
  for(let roundIndex=rounds.length-1;roundIndex>=0;roundIndex--){
    const match=(rounds[roundIndex]||[]).find(m=>
      (m.home?.isReal&&m.home.id===teamId)||(m.away?.isReal&&m.away.id===teamId));
    if(!match)continue;
    const distanceFromFinal=rounds.length-1-roundIndex;
    if(distanceFromFinal===0)return'finalist';
    if(distanceFromFinal===1)return'semifinal';
    if(distanceFromFinal===2)return'quarterfinal';
    if(distanceFromFinal===3)return'round16';
    return'round32';
  }
  return null;
}

function recordClubSeasonHistory(){
  if(!store.G)return;
  const { ovr, teamOvr } = window.PPM.gameplay;
  store.G.clubHistory=store.G.clubHistory||{};
  [1,2].forEach(league=>{
    // pts-only, like every engine decision (champion, promotion, prizes) — a
    // different tiebreaker here recorded positions that never actually happened.
    const sorted=store.G.teams.filter(t=>t.league===league).sort((a,b)=>b.pts-a.pts);
    sorted.forEach((t,idx)=>{
      store.G.clubHistory[t.id]=store.G.clubHistory[t.id]||[];
      const topPlayers=store.G.players.filter(p=>p.teamId===t.id&&!p.retired&&p.role!=='youth')
        .sort((a,b)=>(b.leagueSeasonW||0)-(a.leagueSeasonW||0)
          ||((b.leagueSeasonPointsWon||0)-(b.leagueSeasonPointsLost||0))-((a.leagueSeasonPointsWon||0)-(a.leagueSeasonPointsLost||0))
          ||ovr(b)-ovr(a))
        .slice(0,3)
        .map(p=>({
          id:p.id,name:p.name,age:p.age,ovr:ovr(p),
          w:p.leagueSeasonW||0,l:p.leagueSeasonL||0,
          points:(p.leagueSeasonPointsWon||0)-(p.leagueSeasonPointsLost||0),
          winPoints:p.leagueSeasonPointsWon||0,lossPoints:p.leagueSeasonPointsLost||0,
        }));
      const row={
        season:store.G.season,league,position:idx+1,
        played:(t.w||0)+(t.d||0)+(t.l||0),pts:t.pts||0,
        w:t.w||0,d:t.d||0,l:t.l||0,gf:t.gf||0,ga:t.ga||0,
        pointsWon:t.pointsWon||0,pointsLost:t.pointsLost||0,
        ovr:teamOvr(t.id),budget:t.budget||0,cupStage:cupStageForTeam(t.id),topPlayers,
      };
      store.G.clubHistory[t.id]=store.G.clubHistory[t.id].filter(entry=>entry.season!==store.G.season);
      store.G.clubHistory[t.id].push(row);
    });
  });
}

function getClubCareerStats(tid){
  const history=getClubHistory(tid);
  const stats={
    seasons:history.length,games:0,points:0,pointsPerGame:0,
    wins:0,draws:0,losses:0,gf:0,ga:0,pointsWon:0,pointsLost:0,
    leagueTitles:0,cupTitles:0,podiums:0,bestLeague:null,bestPosition:null,bestPoints:0,
    averageOvr:0,peakOvr:0,topPlayers:[],
  };
  let ovrTotal=0;
  const playerPerformances=[];
  history.forEach(row=>{
    const games=typeof row.played==='number'?row.played:(row.w||0)+(row.d||0)+(row.l||0);
    stats.games+=games;stats.points+=row.pts||0;
    stats.wins+=row.w||0;stats.draws+=row.d||0;stats.losses+=row.l||0;
    stats.gf+=row.gf||0;stats.ga+=row.ga||0;
    stats.pointsWon+=row.pointsWon||0;stats.pointsLost+=row.pointsLost||0;
    if(row.league===1&&row.position===1)stats.leagueTitles++;
    if(row.cupStage==='winner')stats.cupTitles++;
    if(row.league===1&&(row.position||99)<=3)stats.podiums++;
    if(stats.bestLeague===null||(row.league||99)<stats.bestLeague
      ||((row.league||99)===stats.bestLeague&&(row.position||99)<stats.bestPosition)){
      stats.bestLeague=row.league||null;
      stats.bestPosition=row.position||null;
    }
    stats.bestPoints=Math.max(stats.bestPoints,row.pts||0);
    stats.peakOvr=Math.max(stats.peakOvr,row.ovr||0);
    ovrTotal+=row.ovr||0;
    playerPerformances.push(...(row.topPlayers||[]).map(player=>({...player,season:row.season})));
  });
  stats.pointsPerGame=stats.games?Math.round((stats.points/stats.games)*1000)/1000:0;
  stats.averageOvr=stats.seasons?Math.round((ovrTotal/stats.seasons)*10)/10:0;
  stats.topPlayers=playerPerformances
    .sort((a,b)=>(b.w||0)-(a.w||0)||(b.points||0)-(a.points||0)||(b.ovr||0)-(a.ovr||0))
    .slice(0,10);
  return stats;
}

function getClubHallOfFame(limit=20){
  return (store.G?.teams||[]).map(team=>{
    const stats=getClubCareerStats(team.id);
    const legacyScore=stats.leagueTitles*1000+stats.cupTitles*700+stats.podiums*120
      +stats.pointsPerGame*100+stats.wins;
    return{teamId:team.id,name:team.name,legacyScore,...stats};
  }).filter(row=>row.seasons>0)
    .sort((a,b)=>b.legacyScore-a.legacyScore||b.points-a.points)
    .slice(0,limit);
}

function openTeamOverview(tid){
  const gameplay=window.PPM.gameplay;
  const { getTeamBranding, getTeamLogoData, ovr, staffOvr, staffOvrColor, teamOvr, teamName } = gameplay;
  const t=store.G.teams.find(x=>x.id===tid);if(!t)return;
  const branding=getTeamBranding(t);
  const players=store.G.players.filter(p=>p.teamId===tid&&!p.retired).sort((a,b)=>ovr(b)-ovr(a));
  const staff=store.G.staff.filter(s=>s.teamId===tid).sort((a,b)=>staffOvr(b)-staffOvr(a));
  const history=getClubHistory(tid).slice(-5).reverse();
  const seasonsAll=getClubHistory(tid);
  const bestSeason=seasonsAll.slice().sort((a,b)=>b.pts-a.pts||a.position-b.position)[0];
  const allMatches=(store.G.results||[]).filter(r=>r.homeId===tid||r.awayId===tid);
  const rivalryMap=new Map();
  allMatches.forEach(r=>{
    const oppId=r.homeId===tid?r.awayId:r.homeId;
    if(oppId===null||oppId===undefined)return;
    const row=rivalryMap.get(oppId)||{oppId,games:0,wins:0,losses:0,draws:0,close:0};
    row.games++;
    if(Math.abs((r.homePoints||0)-(r.awayPoints||0))<=8)row.close++;
    const won=(r.homeId===tid&&r.homeWin)||(r.awayId===tid&&!r.homeWin&&!r.isDraw);
    if(r.isDraw)row.draws++;
    else if(won)row.wins++;
    else row.losses++;
    rivalryMap.set(oppId,row);
  });
  const rivalry=[...rivalryMap.values()].sort((a,b)=>(b.games*3+b.close*2+Math.abs(b.wins-b.losses))-(a.games*3+a.close*2+Math.abs(a.wins-a.losses)))[0];
  const rivalName=rivalry?teamName(rivalry.oppId):null;
  const starPlayer=players[0]||null;
  const clubStory=bestSeason?`${t.name} najlepiej wygladal w sezonie ${bestSeason.season}, gdy zamknal lige na pozycji #${bestSeason.position} z dorobkiem ${bestSeason.pts} pkt.`:`${t.name} dopiero buduje swoja historie sezon po sezonie.`;
  const rivalryStory=rivalry?`Najmocniej grzeje rywalizacja z ${rivalName}: ${rivalry.games} meczow, bilans ${rivalry.wins}-${rivalry.draws}-${rivalry.losses}, w tym ${rivalry.close} spotkan na styku.`:'Na razie brak wyraznie zarysowanej historycznej rywalizacji.';
  const modal=document.getElementById('modal');modal.className='modal modal-lg';
  modal.innerHTML=`<div class="mt2">${t.name} <button class="close-btn" onclick="closeModal()">x</button></div>
  <div class="flex aic gp14 mb14 pd12 bb1 bgs1" style="border-radius:14px">
    <img src="${getTeamLogoData(t)}" alt="${t.name}" class="club-logo lg">
    <div><div class="syne fs22 b8">${t.name}</div><div class="fs11 ink3">${branding.nickname} / ${branding.motto}</div></div>
  </div>
  <div class="g3 gp8 mb14">
    <div class="sb pd10"><div class="l">Liga</div><div class="v fs22">${t.league===1?'I Liga':'II Liga'}</div></div>
    <div class="sb pd10"><div class="l">OVR</div><div class="v gold fs22">${teamOvr(tid)}</div></div>
    <div class="sb pd10"><div class="l">Budzet</div><div class="v g fs22">${(t.budget||0).toLocaleString('pl')} €</div></div>
  </div>
  ${(t.principal||(t.traits&&t.traits.length)||t.isPlayer)?`<div class="card mb14"><div class="ct">ZARZADZANIE</div>
    ${t.principal?`<div class="fs12">Dyrektor: <b>${t.principal.name}</b> (${t.principal.age}l) — <b class="cr">${gameplay.principalStrategyLabel(t.principal.strategy)}</b> / kompetencje <b>${t.principal.competence}</b></div>`:t.isPlayer?'<div class="fs12">Dyrektor: <b>Ty (gracz)</b></div>':''}
    ${(t.traits&&t.traits.length)?`<div class="fs11 ink3 mt-6">Cechy klubu: <b>${t.traits.map(tr=>tr==='youthOnly'?'Tylko własna młodzież':tr).join(', ')}</b></div>`:''}
  </div>`:''}
  <div class="g2 gp10 mb14">
    <div class="card">
      <div class="ct">TOZSAMOSC KLUBU</div>
      <div class="fs12 lh155">${clubStory}</div>
      <div class="fs11 ink3 mt-8">Marka: <b>${branding.nickname}</b> / ${branding.motto}</div>
      <div class="fs11 ink3 mt-4">${starPlayer?`Twarz projektu: ${starPlayer.name} (OVR ${ovr(starPlayer)})`:'Brak lidera kadry.'}</div>
    </div>
    <div class="card">
      <div class="ct">RYWALIZACJE</div>
      <div class="fs12 lh155">${rivalryStory}</div>
      <div class="fs11 ink3 mt-8">${rivalName?`Glowny rywal: ${rivalName}`:'Rywale dopiero wylonia sie wraz z kolejnymi sezonami.'}</div>
      ${rivalName?`<button class="btn sm mt-8" onclick="closeModal();openTeamOverview(${rivalry.oppId})">OTWORZ RYWALA</button>`:''}
    </div>
  </div>
  <div class="g2">
    <div>
      <div class="card"><div class="ct">SKLAD</div>
      ${players.slice(0,8).map(p=>`<div class="grid gtc1aa gp8 pd6-0 bdb-s3 cur" onclick="openPlayerModal(${p.id})"><div><div class="b7">${p.name}</div><div class="fs10 ink3">${p.age}l / ${p.contractYears} lata kontraktu / ${p.profileTag||p.playStyle}</div></div><div class="fs10 ink3">${p.playStyle}</div><div class="syne b8 cr">${ovr(p)}</div></div>`).join('')||'<div class="ink3">Brak danych</div>'}
      </div>
      <div class="card"><div class="ct">SZTAB</div>
      ${staff.length?staff.map(s=>`<div class="flex jcb pd6-0 bdb-s3"><div><b>${s.name}</b><div class="fs10 ink3">${s.type}</div></div><div style="font-weight:700;color:${staffOvrColor(staffOvr(s))}">${staffOvr(s)}</div></div>`).join(''):'<div class="ink3">Brak danych sztabu</div>'}
      </div>
    </div>
    <div>
      <div class="card"><div class="ct">INFRASTRUKTURA</div>
        <div class="grid gp8 fs12">
          <div>Hala: <b>${INFRA_HALL[t.infraHall||0]?.name||'Brak danych'}</b></div>
          <div>Medyczne: <b>${INFRA_MED[t.infraMed||0]?.name||'Brak danych'}</b></div>
          <div>Akademia: <b>${INFRA_ACADEMY[t.infraAcademy||0]?.name||'Brak danych'}</b></div>
          <div>Strefa kibica: <b>${INFRA_MERCH[t.infraMerchandising||0]?.name||'Brak danych'}</b></div>
        </div>
      </div>
      <div class="card"><div class="ct">OSTATNIE SEZONY</div>
      ${history.length?history.map(h=>`<div class="flex jcb pd6-0 bdb-s3"><div>S${h.season} / ${h.league===1?'I':'II'} Liga</div><div><b>#${h.position}</b> / ${h.pts} pkt</div></div>`).join(''):'<div class="ink3">Historia zapisze sie po sezonie.</div>'}
      </div>
    </div>
  </div>`;
  openModal();
}

window.PPM.gameplayClubUI = { getClubHistory, recordClubSeasonHistory, getClubCareerStats, getClubHallOfFame, openTeamOverview };
})();
