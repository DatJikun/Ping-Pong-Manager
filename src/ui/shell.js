// =============================================================================
// shell.js — Application shell: navigation, theme, audio, modals, header
// Loaded fourth (after state.js), before gameplay.js and pages.js.
//
// Responsibilities:
//   - setShellMode()   — switches body CSS classes between 'start' and 'game'
//   - syncNavState()   — highlights the active nav button (desktop + mobile)
//   - go(page)         — changes ui.page, renders, plays a native transition
//   - openModal()      — shows the #ov overlay with a native pop-in animation
//   - closeModal()     — hides the overlay; also bound to Escape key
//   - toast(msg)       — shows a timed bottom-right notification
//   - playClick/Ping/Pong() — Web Audio API sound effects (synthesised, no files)
//   - openGuide()      — renders the full in-game guide inside the modal
//   - openSettings()   — renders theme/speed/difficulty settings inside the modal
//   - updateHeader()   — refreshes all #hdr stat values from current store.G
//   - applyTheme()     — pins the single dark-carbon theme on <body>
//   - applyClubLivery()— recolours --club/--club2 from the club's crest palette
//   - saveSettings()   — validates, persists, and applies a settings change
//
// Exposed as window.PPM.shell and destructured into window by main.js.
// =============================================================================

(function(){
window.PPM = window.PPM || {};
const render = (...args)=>window.PPM.renderApp?.(...args);
const stateApi = window.PPM.stateApi || {};

function getSettings(){
  if(!ui.settings)ui.settings=stateApi.loadAppSettings?stateApi.loadAppSettings():{theme:'dark',matchSpeed:'normal',aiDifficulty:'hard'};
  return ui.settings;
}
// One theme: dark carbon. Kept as a function (rather than deleted) because it is
// part of the public shell API and is called on boot and after settings changes.
function applyTheme(){
  document.body.classList.add('theme-dark');
  document.body.classList.remove('theme-light');
}

// ═══════════════════════════════════════════════════════
// CLUB LIVERY
// The proto-final language recolours the whole UI in the club's own colours:
// --club drives the rail highlight, panel accents, primary buttons and the
// masthead rule. Crest palettes are tuned for a crest, so the accent is lifted
// toward white to stay legible as a UI colour on carbon.
// ═══════════════════════════════════════════════════════
function mixToward(hex,target,amount){
  const h=String(hex||'').replace('#','');
  if(h.length!==6)return hex;
  const t=String(target).replace('#','');
  const ch=i=>{
    const a=parseInt(h.substr(i*2,2),16),b=parseInt(t.substr(i*2,2),16);
    return Math.round(a+(b-a)*amount).toString(16).padStart(2,'0');
  };
  return '#'+ch(0)+ch(1)+ch(2);
}
function applyClubLivery(team){
  // Must be set on <body>, not <html>: the theme classes (`body.theme-dark`)
  // declare --club themselves, and a declaration ON body beats one inherited
  // from html — so livery written to html would be silently shadowed.
  const root=document.body;
  const brand=team&&window.PPM.gameplayVisuals?.getTeamBranding?.(team);
  if(!brand||!brand.primary){root.style.removeProperty('--club');root.style.removeProperty('--club2');return;}
  // Crest palettes are mixed for a crest, not for UI on carbon — lift them toward
  // white so they read as an accent rather than a stain.
  root.style.setProperty('--club',mixToward(brand.primary,'#ffffff',.16));
  root.style.setProperty('--club2',mixToward(brand.primary,'#ffffff',.42));
}
function saveSettings(nextSettings){
  const saved=stateApi.updateAppSettings?stateApi.updateAppSettings(nextSettings):Object.assign(getSettings(),nextSettings);
  applyTheme(saved.theme);
  // the livery is mixed against the theme's background, so it must be re-derived
  try{applyClubLivery(window.PPM.gameplay?.myTeam?.());}catch(e){}
  // Re-render ONLY the settings modal to reflect the change — do NOT render the app,
  // which would navigate into the game (esp. from the main menu).
  if(typeof openSettings==='function'&&document.getElementById('ov')?.classList.contains('on'))openSettings();
  return saved;
}

function setShellMode(mode){
  document.body.classList.toggle('app-start',mode==='start');
  document.body.classList.toggle('app-game',mode==='game');
  document.body.classList.toggle('app-preseason',mode==='game'&&store.G?.phase==='preseason');
}
function syncNavState(){
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  const desktopBtn=document.getElementById('n-'+ui.page);if(desktopBtn)desktopBtn.classList.add('on');
  document.querySelectorAll('.mn-btn').forEach(b=>b.classList.toggle('on',b.dataset.page===ui.page));
}
function animateUi(el,keyframes,options){
  if(!el||typeof el.animate!=='function')return null;
  try{
    if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return null;
    return el.animate(keyframes,options);
  }catch{return null;}
}
function go(p){
  if(ui.running)return;
  if(!store.G&&p!=='dash')return;
  if(store.G?.phase==='preseason'&&p!=='preseason'){
    toast('Przedsezon to tylko przygotowania. Reszta klubu otworzy się po starcie sezonu.');
    ui.page='preseason';
    render();
    syncNavState();
    return;
  }
  ui.page=p;
  const el=document.getElementById('content');
  render();
  if(el){
    el.scrollTop=0;
    animateUi(el,[{opacity:.2,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{
      duration:180,easing:'cubic-bezier(.2,.8,.2,1)',
    });
  }
  syncNavState();
  playClick();
}
function openModal(){
  const ov=document.getElementById('ov');
  ov.classList.add('on');
  const m=document.getElementById('modal');
  animateUi(m,[{opacity:0,transform:'translateY(18px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{
    duration:220,easing:'cubic-bezier(.2,.8,.2,1)',
  });
}
function closeModal(){document.getElementById('ov').classList.remove('on');}
let _toastTimer=null;
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.classList.remove('on');
  void el.offsetWidth; // force reflow to restart transition
  el.classList.add('on');
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>el.classList.remove('on'),3400);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ui.running)closeModal();});

function openSettings(){
  const settings=getSettings();
  const modal=document.getElementById('modal');
  modal.className='modal';
  modal.innerHTML=`<div class="mt2">USTAWIENIA <button class="close-btn" onclick="closeModal()">✕</button></div>
  <div class="settings-stack">
    <div class="settings-card">
      <div class="settings-label">Prędkość symulacji meczu</div>
      <div class="settings-desc">Steruje tempem VME i relacji punkt po punkcie.</div>
      <div class="settings-segment">
        <button class="btn sm ${settings.matchSpeed==='slow'?'pr':''}" onclick="saveSettings({matchSpeed:'slow'})">WOLNO</button>
        <button class="btn sm ${settings.matchSpeed==='normal'?'pr':''}" onclick="saveSettings({matchSpeed:'normal'})">NORMALNIE</button>
        <button class="btn sm ${settings.matchSpeed==='fast'?'pr':''}" onclick="saveSettings({matchSpeed:'fast'})">SZYBKO</button>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-label">Gra i pliki</div>
      <div class="settings-desc">Zapis do pliku, wczytanie kopii zapasowej albo własnej bazy klubów.</div>
      <div class="settings-segment">
        <button class="btn sm" onclick="openGuide()">PRZEWODNIK</button>
        <button class="btn sm" onclick="saveGame()">ZAPISZ DO PLIKU</button>
        <button class="btn sm" onclick="document.getElementById('fi').click()">WCZYTAJ ZAPIS</button>
        <button class="btn sm" onclick="document.getElementById('dbi').click()">WCZYTAJ DATABASE</button>
        <button class="btn sm" onclick="showStartScreen()">NOWA GRA</button>
      </div>
    </div>
  </div>
  <div class="btn-row mt-16 jcb">
    <button class="btn" onclick="backToMainMenu()">MENU GŁÓWNE</button>
    <button class="btn pr" onclick="closeModal()">ZAMKNIJ</button>
  </div>
  <div class="fs10 ink3 mt-6">Wersja ${(window.PPM.appVersionLabel&&window.PPM.appVersionLabel())||window.PPM.APP_VERSION||'0.1.0'}. „Menu główne” nie kasuje kariery — możesz ją wznowić z listy karier.</div>`;
  openModal();
}
// Return to the main menu without destroying the current career (it stays saved and
// resumable). Renders the menu directly (render() would go back into the game).
async function backToMainMenu(){
  try{
    stateApi.persistGame&&stateApi.persistGame();
    await stateApi.flushPersistence?.();
    await window.refreshCareerList?.(false);
  }catch(e){}
  ui._startView='menu';
  closeModal();
  setShellMode('start');
  window.PPM?.pages?.renderStart?.();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// WEB AUDIO API
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
let _audioCtx=null;
function getAudioCtx(){if(!_audioCtx)_audioCtx=new(window.AudioContext||window.webkitAudioContext)();return _audioCtx;}
function playClick(){
  try{const ctx=getAudioCtx();const o=ctx.createOscillator();const g=ctx.createGain();o.connect(g);g.connect(ctx.destination);
  o.frequency.value=420;o.type='sine';g.gain.setValueAtTime(0.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);
  o.start();o.stop(ctx.currentTime+0.08);}catch(e){}
}
function playPing(freq){
  try{const ctx=getAudioCtx();const o=ctx.createOscillator();const g=ctx.createGain();const f=ctx.createBiquadFilter();
  f.type='bandpass';f.frequency.value=freq||880;o.connect(f);f.connect(g);g.connect(ctx.destination);
  o.type='sine';o.frequency.value=freq||880;o.frequency.exponentialRampToValueAtTime((freq||880)*1.6,ctx.currentTime+0.04);
  g.gain.setValueAtTime(0.18,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.22);
  o.start();o.stop(ctx.currentTime+0.22);}catch(e){}
}
function playPong(freq){
  try{const ctx=getAudioCtx();const o=ctx.createOscillator();const g=ctx.createGain();
  o.connect(g);g.connect(ctx.destination);o.type='triangle';
  o.frequency.value=freq||660;o.frequency.exponentialRampToValueAtTime((freq||660)*0.7,ctx.currentTime+0.06);
  g.gain.setValueAtTime(0.14,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);
  o.start();o.stop(ctx.currentTime+0.18);}catch(e){}
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// GUIDE MODAL
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function openGuide(tab){
  const modal=document.getElementById('modal');modal.className='modal modal-lg';
  const SI=(window.PPM.constants&&window.PPM.constants.PLAYER_STYLE_INFO)||{};
  const STYLE_IDS=(window.PPM.constants&&window.PPM.constants.PLAYER_STYLES)||[];
  const styleLbl=x=>(SI[x]||{}).label||x;
  if(tab)ui._guideTab=tab;
  const cur=ui._guideTab||'play';
  const tabBtn=(id,label)=>`<button class="btn sm ${cur===id?'pr':''}" onclick="openGuide('${id}')">${label}</button>`;
  const styleCard=id=>{const s=SI[id];if(!s)return'';
    return `<div style="border:1px solid var(--b1);border-left:4px solid ${s.color};padding:8px 10px;margin:6px 0">
      <div class="b8 fs13" style="color:${s.color}">${s.label}</div>
      <div class="fs11 ink3 mb4">${s.desc}</div>
      <div class="fs11">Dobry przeciw: <b>${(s.beats||[]).map(styleLbl).join(', ')}</b> · Słaby przeciw: <b>${(s.losesTo||[]).map(styleLbl).join(', ')}</b></div>
    </div>`;};
  let body='';
  if(cur==='play'){
    body=`<h3 class="h-sub">JAK GRAĆ</h3>
    <p>Nie grasz piłek. Ustawiasz klub, żeby wygrywał. Sezon to pętla: <b>przedsezon → kolejki → rozliczenie</b>.</p>
    <ol style="line-height:1.7;padding-left:18px">
      <li><b>Przedsezon:</b> 3 sponsorów, partner techniczny, cel zarządu i <b>kontrakt okładzin (1–5 lat)</b>. Bez tego sezon się nie startuje.</li>
      <li><b>Kolejka:</b> najpierw skrzynka (0–3 sprawy; cisza jest OK). Nierozstrzygnięta decyzja blokuje mecz. Potem nominacja stołów i mecz.</li>
      <li><b>Skład:</b> zmęczenie i urazy rosną u tych, którzy grali. Rotuj. Rezerwa z gwarancją pierwszego składu napisze, jeśli łamie kontrakt.</li>
      <li><b>Rynek:</b> OVR widać zawsze. Cechy obcych to pasma, peak to <b>?</b>, dopóki nie zeskautujesz, nie zagracie albo nie podpiszesz.</li>
    </ol>
    <p class="fs12 ink3">Cechy i style są w sąsiednich zakładkach. W karierze ten sam przewodnik jest pod „Pomoc” w szynie.</p>`;
  }else if(cur==='match'){
    body=`<h3 class="h-sub">CECHY → WYNIK MECZU</h3>
    <p>Sześć liczb na karcie to nie ozdoba. Silnik składa je w <b>cztery kanały</b>, które widać na karcie pojedynku (ATK / ODB / SRV / GŁOWA) i w zdaniu „dlaczego ten wynik” po secie.</p>
    <table class="tbl" style="width:100%"><thead><tr><th>Kanał</th><th>Z cech</th><th>Na korcie</th></tr></thead><tbody>
      <tr><td><b>ATK</b></td><td>silniejsze skrzydło FH/BH</td><td>winnery, tempo ataku</td></tr>
      <tr><td><b>ODB</b></td><td>noga + BH + odbiór (RET)</td><td>dłuższe wymiany, mniej dziur w bloku</td></tr>
      <tr><td><b>SRV</b></td><td>serwis</td><td>asy, presja na odbiorcę</td></tr>
      <tr><td><b>GŁOWA</b></td><td>MEN</td><td>błędy, gdy set jest na styku</td></tr>
    </tbody></table>
    <p>OVR to średnia ważona cech (FH i BH ważą najwięcej). Styl kontruje styl — nawet przy równym OVR. Zmęczenie &gt; 70% i niska forma obcinają to, co widzisz na karcie.</p>
    <p class="fs12 ink3">Po meczu to samo zdanie ląduje w profilu zawodnika („ostatni pojedynek”).</p>`;
  }else if(cur==='club'){
    body=`<h3 class="h-sub">KLUB</h3>
    <p><b>Okładziny:</b> rodzina (tensor / tacky / control / kipy) to tożsamość, nie drabinka mocy. Klasa tylko skaluje efekt. Zmiana tylko w przedsezonie, na 1–5 lat. Gwiazda może zażądać swoich — TAK to obietnica na przedsezon.</p>
    <p><b>Skrzynka:</b> 0–3 sprawy. Rezerwa prosi o stół według roli w kontrakcie. Życie: uraz, wypalenie, rodzina, mentor, szum, złamana gwarancja.</p>
    <p><b>Skaut:</b> 2000 € za pełny raport, potrzebny skaut na etacie. Mecz przeciwko komuś też odkrywa jego stół.</p>
    <p><b>Budynki:</b> po poziomie 5 kupujesz projekty (trybuny, internat), nie kolejny plus do OVR. Akademia nie podnosi sufitu peak — tylko szansę na górę skali 56–92.</p>`;
  }else{
    body=`<h3 class="h-sub">STYLE</h3>
    <p>Pięć stylów. Każdy bije dwa i przegrywa z dwoma. Dobieraj stół pod rywala; trener z tą samą synergią dokłada bonus.</p>
    ${STYLE_IDS.map(styleCard).join('')}`;
  }
  modal.innerHTML=`<div class="mt2">PRZEWODNIK <button class="close-btn" onclick="closeModal()">\u2715</button></div>
  <div class="btn-row mb12 fwrap">${tabBtn('play','Jak grać')}${tabBtn('match','Cechy i mecz')}${tabBtn('club','Klub')}${tabBtn('styles','Style')}</div>
  <div class="fs13 ink2" style="line-height:1.7">${body}</div>
  <div class="mt-14"><button class="btn pr" onclick="closeModal()">ZAMKNIJ</button></div>`;
  openModal();
}

function updateHeader(){
  if(!store.G)return;
  const { myTeam, myLeague, calcPrestige, teamOvr, staffOvr, staffOvrColor } = window.PPM.gameplay;
  // Inbox badge: unread mail + pending decisions on the Skrzynka nav button.
  const badge=document.getElementById('inbox-badge');
  if(badge){
    const n=window.PPM.gameplay.unreadMailCount?.()||0;
    badge.style.display=n?'inline-block':'none';
    badge.textContent=n;
  }
  const mt=myTeam();
  if(!mt)return; // caretaker mode (background world generation) — no player club yet
  applyClubLivery(mt);
  const crest=document.getElementById('h-crest');
  if(crest)crest.src=window.PPM.gameplay.getTeamLogoData(mt);
  const myL=myLeague();
  const sorted=store.G.teams.filter(t=>t.league===myL).sort((a,b)=>b.pts-a.pts);
  const pos=sorted.findIndex(t=>t.isPlayer)+1;const pres=calcPrestige();
  const set=(id,text,color)=>{const el=document.getElementById(id);if(!el)return;el.textContent=text;if(color!==undefined)el.style.color=color;};
  const myStaff=store.G.staff.filter(s=>s.teamId===mt.id);
  const avgStaffOvr=myStaff.length?Math.round(myStaff.reduce((s,x)=>s+staffOvr(x),0)/myStaff.length):0;
  const rounds=store.G.schedule?.length||22;
  // Five grouped blocks (was eight single stats that truncated at any real width):
  // headline value on top, its context on the sub-line underneath.
  set('h-club',mt.name);
  set('h-club-sub',`${myL===1?'I Liga':'II Liga'} \u00b7 #${pos||'-'}`);
  set('h-budget',mt.budget.toLocaleString('pl')+' \u20ac');
  set('h-budget-sub',store.G.phase==='preseason'?'preseason':`sezon ${store.G.season}`);
  set('h-season',`S${store.G.season} \u00b7 K${store.G.matchday}`);
  set('h-season-sub',`z ${rounds} kolejek`);
  set('h-ovr',`${teamOvr(mt.id)}`);
  set('h-staff-ovr',avgStaffOvr>0?`sztab ${avgStaffOvr} (${myStaff.length})`:'sztab: brak',avgStaffOvr>0?staffOvrColor(avgStaffOvr):'');
  set('h-prestige',`${pres}`);
  set('h-prestige-sub',`MGR ${store.G.managerPrestige||0}`);
  // rail footer: where you are in the season, always visible under the nav
  set('rail-foot',store.G.phase==='preseason'
    ?`Sezon ${store.G.season} · preseason`
    :`Sezon ${store.G.season} · kolejka ${store.G.matchday}/${rounds}`);
}

applyTheme(getSettings().theme);
window.PPM.shell = { setShellMode, syncNavState, go, openModal, closeModal, toast, getAudioCtx, playClick, playPing, playPong, openGuide, openSettings, updateHeader, applyTheme, saveSettings, backToMainMenu };
})();
