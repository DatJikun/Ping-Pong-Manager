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
const i18n = window.PPM.i18n;

function getSettings(){
  if(!ui.settings)ui.settings=stateApi.loadAppSettings?stateApi.loadAppSettings():{theme:'dark',locale:'en',matchSpeed:'normal',aiDifficulty:'hard',uiSound:true};
  i18n?.setLocale(ui.settings.locale);
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
  const previousLocale=getSettings().locale;
  const saved=stateApi.updateAppSettings?stateApi.updateAppSettings(nextSettings):Object.assign(getSettings(),nextSettings);
  i18n?.setLocale(saved.locale);
  applyTheme(saved.theme);
  // the livery is mixed against the theme's background, so it must be re-derived
  try{applyClubLivery(window.PPM.gameplay?.myTeam?.());}catch(e){}
  if(previousLocale!==saved.locale){
    if(store.G)render();
    else window.PPM?.pages?.renderStart?.();
  }
  if(typeof openSettings==='function'&&document.getElementById('ov')?.classList.contains('on'))openSettings();
  return saved;
}

function setShellMode(mode){
  document.body.classList.toggle('app-start',mode==='start');
  document.body.classList.toggle('app-game',mode==='game');
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
  modal.innerHTML=`<div class="mt2">${t('settings.title').toUpperCase()} <button class="close-btn" onclick="closeModal()">✕</button></div>
  <div class="settings-stack">
    <div class="settings-card">
      <div class="settings-label">${t('settings.language')}</div>
      <div class="settings-desc">${t('settings.languageDesc')}</div>
      <div class="settings-segment">
        <button class="btn sm ${settings.locale==='en'?'pr':''}" onclick="saveSettings({locale:'en'})">${t('settings.english').toUpperCase()}</button>
        <button class="btn sm ${settings.locale==='pl'?'pr':''}" onclick="saveSettings({locale:'pl'})">${t('settings.polish').toUpperCase()}</button>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-label">${t('settings.matchSpeed')}</div>
      <div class="settings-desc">${t('settings.matchSpeedDesc')}</div>
      <div class="settings-segment">
        <button class="btn sm ${settings.matchSpeed==='slow'?'pr':''}" onclick="saveSettings({matchSpeed:'slow'})">${t('settings.slow').toUpperCase()}</button>
        <button class="btn sm ${settings.matchSpeed==='normal'?'pr':''}" onclick="saveSettings({matchSpeed:'normal'})">${t('settings.normal').toUpperCase()}</button>
        <button class="btn sm ${settings.matchSpeed==='fast'?'pr':''}" onclick="saveSettings({matchSpeed:'fast'})">${t('settings.fast').toUpperCase()}</button>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-label">${t('settings.uiSound')}</div>
      <div class="settings-desc">${t('settings.uiSoundDesc')}</div>
      <div class="settings-segment">
        <button class="btn sm ${settings.uiSound?'pr':''}" onclick="saveSettings({uiSound:true})">${t('settings.soundOn').toUpperCase()}</button>
        <button class="btn sm ${!settings.uiSound?'pr':''}" onclick="saveSettings({uiSound:false})">${t('settings.soundOff').toUpperCase()}</button>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-label">${t('settings.gameFiles')}</div>
      <div class="settings-desc">${t('settings.gameFilesDesc')}</div>
      <div class="settings-segment">
        <button class="btn sm" onclick="saveGame()">${t('settings.export').toUpperCase()}</button>
        <button class="btn sm" onclick="document.getElementById('fi').click()">${t('settings.import').toUpperCase()}</button>
        <button class="btn sm" onclick="document.getElementById('dbi').click()">${t('settings.database').toUpperCase()}</button>
        <button class="btn sm" onclick="showStartScreen()">${t('settings.newGame').toUpperCase()}</button>
      </div>
    </div>
  </div>
  <div class="btn-row mt-16 jcb">
    <button class="btn" onclick="backToMainMenu()">${t('settings.mainMenu').toUpperCase()}</button>
    <button class="btn pr" onclick="closeModal()">${t('common.close').toUpperCase()}</button>
  </div>
  <div class="fs10 ink3 mt-6">${t('settings.menuHint')}</div>`;
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
let _lastClickAt=-Infinity;
function getAudioCtx(){
  if(_audioCtx)return _audioCtx;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(typeof AudioContextClass!=='function')return null;
  try{_audioCtx=new AudioContextClass();return _audioCtx;}catch{return null;}
}
function playClick(){
  if(!getSettings().uiSound)return false;
  const now=globalThis.performance?.now?.()??Date.now();
  if(now-_lastClickAt<65)return false;
  try{
    const ctx=getAudioCtx();if(!ctx)return false;
    _lastClickAt=now;
    if(ctx.state==='suspended')ctx.resume?.();
    const o=ctx.createOscillator();const g=ctx.createGain();o.connect(g);g.connect(ctx.destination);
    o.frequency.value=250;o.type='sine';g.gain.setValueAtTime(0.03,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.045);
    o.start(ctx.currentTime);o.stop(ctx.currentTime+0.045);return true;
  }catch{return false;}
}
let _activateUiTimer=null;
function activateUi(action){
  clearTimeout(_activateUiTimer);
  _activateUiTimer=setTimeout(()=>{_activateUiTimer=null;action?.();},60);
}
document.addEventListener('click',event=>{
  const target=event.target?.closest?.('button,.rtab,[role="button"],a[href],[onclick]');
  if(!target||target.disabled)return;
  playClick();
  target.classList?.add('ui-pressed');
  setTimeout(()=>target.classList?.remove('ui-pressed'),60);
});
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
function openGuide(){
  const modal=document.getElementById('modal');modal.className='modal modal-lg';
  const SI=(window.PPM.constants&&window.PPM.constants.PLAYER_STYLE_INFO)||{};
  const STYLE_IDS=(window.PPM.constants&&window.PPM.constants.PLAYER_STYLES)||[];
  const styleLbl=x=>t(`style.${x}`);
  const styleCard=id=>{const s=SI[id];if(!s)return'';
    return `<div style="border:1px solid var(--b1);border-left:4px solid ${s.color};border-radius:6px;padding:8px 10px;margin:6px 0">
      <div style="font-family:'Saira Condensed',sans-serif;font-weight:800;font-size:13px;color:${s.color}">${styleLbl(id)}</div>
      <div class="fs10 ink3 mb4">${t('guide.grip')}: ${t(`guide.style.${id}.grip`)}</div>
      <div class="mb4">${t(`guide.style.${id}.desc`)}</div>
      <div class="fs12 cg">\u2713 ${t(`guide.style.${id}.strengths`)}</div>
      <div class="fs12 cr">\u2715 ${t(`guide.style.${id}.weaknesses`)}</div>
      <div class="fs12 mt-3">\u25b2 ${t('guide.strongAgainst')}: <b>${s.beats.map(styleLbl).join(', ')}</b> &nbsp; \u25bc ${t('guide.weakAgainst')}: <b>${s.losesTo.map(styleLbl).join(', ')}</b></div>
    </div>`;};
  const stylesSection=`<h3 class="h-sub">${t('guide.stylesTitle')}</h3>
  <p>${t('guide.stylesIntro')}</p>
  ${STYLE_IDS.map(styleCard).join('')}`;
  modal.innerHTML=`<div class="mt2">${t('guide.title')} <button class="close-btn" onclick="closeModal()">\u2715</button></div>
  <div class="fs13 ink2" style="line-height:1.8">
  ${stylesSection}
  ${['prestige','preseason','fatigue','commerce','traits','economy','staff','loans','league'].map(section=>`<h3 class="h-sub">${t(`guide.${section}Title`)}</h3><p>${t(`guide.${section}Text`)}</p>`).join('')}
  </div>
  <div class="mt-14"><button class="btn pr" onclick="closeModal()">${t('common.close').toUpperCase()}</button></div>`;
  openModal();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// NEWS FEED GENERATION
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

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
  const sorted=window.PPM.gameplay.leagueStandings(myL);
  const pos=sorted.findIndex(t=>t.isPlayer)+1;const pres=calcPrestige();
  const set=(id,text,color)=>{const el=document.getElementById(id);if(!el)return;el.textContent=text;if(color!==undefined)el.style.color=color;};
  const myStaff=store.G.staff.filter(s=>s.teamId===mt.id);
  const avgStaffOvr=myStaff.length?Math.round(myStaff.reduce((s,x)=>s+staffOvr(x),0)/myStaff.length):0;
  const rounds=store.G.schedule?.length||22;
  // Five grouped blocks (was eight single stats that truncated at any real width):
  // headline value on top, its context on the sub-line underneath.
  set('h-club',mt.name);
  set('h-club-sub',`${t(myL===1?'league.divisionOne':'league.divisionTwo')} \u00b7 #${pos||'-'}`);
  set('h-budget',formatCurrency(mt.budget));
  set('h-budget-sub',store.G.phase==='preseason'?'preseason':`${t('common.season').toLowerCase()} ${store.G.season}`);
  set('h-season',`S${store.G.season} \u00b7 K${store.G.matchday}`);
  set('h-season-sub',i18n?.getLocale()==='pl'?`z ${rounds} kolejek`:`of ${rounds} matchdays`);
  set('h-ovr',`${teamOvr(mt.id)}`);
  set('h-staff-ovr',avgStaffOvr>0?`${t('nav.staff').toLowerCase()} ${avgStaffOvr} (${myStaff.length})`:`${t('nav.staff').toLowerCase()}: ${t('common.none').toLowerCase()}`,avgStaffOvr>0?staffOvrColor(avgStaffOvr):'');
  set('h-prestige',`${pres}`);
  set('h-prestige-sub',`MGR ${store.G.managerPrestige||0}`);
  // rail footer: where you are in the season, always visible under the nav
  set('rail-foot',store.G.phase==='preseason'
    ?`${t('common.season')} ${store.G.season} · preseason`
    :`${t('common.season')} ${store.G.season} · ${t('library.matchday',{number:`${store.G.matchday}/${rounds}`})}`);
}

applyTheme(getSettings().theme);
window.PPM.shell = { setShellMode, syncNavState, go, activateUi, openModal, closeModal, toast, getAudioCtx, playClick, playPing, playPong, openGuide, openSettings, updateHeader, applyTheme, saveSettings, backToMainMenu };
})();
