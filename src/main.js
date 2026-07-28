// =============================================================================
// main.js — Application bootstrap and top-level wiring
// Last file loaded (after all modules are registered on window.PPM).
//
// Responsibilities:
//   1. Merges all window.PPM sub-namespaces onto both window.PPM and window
//      so every function is callable as a bare global throughout the app.
//   2. Defines a `G` property on window that proxies store.G for convenient
//      read/write access without importing the store object directly.
//   3. saveGame()         — exports current save as a named .json download.
//   4. showStartScreen()  — navigates to the new-game / start screen.
//   5. resumeSavedGame()  — loads the auto-save and navigates to the game.
//   6. loadGame(ev)       — loads a .json file chosen via the file input.
//   7. loadDatabaseFile() — loads a custom team/player database .json file.
//   8. clearDatabaseFile()— removes the loaded custom database.
//   Calls pages.renderStart() as the very first render to boot the UI.
// =============================================================================

(function(){
window.PPM = window.PPM || {};
const constants = window.PPM.constants || {};
const shell = window.PPM.shell || {};
const gameplay = window.PPM.gameplay || {};
const pages = window.PPM.pages || {};
Object.assign(window.PPM, constants, shell, gameplay, pages, { renderApp: pages.renderApp, updateHeader: shell.updateHeader, syncNavState: shell.syncNavState, setShellMode: shell.setShellMode, playClick: shell.playClick });
Object.assign(window, shell, gameplay, pages, { ui, store });
Object.defineProperty(window, 'G', {
  configurable: true,
  get() { return store.G; },
  set(value) { store.G = value; }
});

function slugifySavePart(value){
  return String(value||'save')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .toLowerCase()||'save';
}
function buildSaveFilename(){
  if(!store.G)return 'ppm-v17-save.json';
  const myClub=store.G.teams?.find?.(t=>t.id===store.G.myTeamId);
  const clubSlug=slugifySavePart(myClub?.name||'club');
  const phaseSlug=slugifySavePart(store.G.phase||'season');
  const seasonPart=`s${store.G.season||1}`;
  const matchdayPart=`k${store.G.matchday||0}`;
  return `ppm-v17-${clubSlug}-${seasonPart}-${matchdayPart}-${phaseSlug}.json`;
}
function saveGame(){
  if(!store.G)return;
  const blob=new Blob([JSON.stringify({...store.G,_pid:ui._pid},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=buildSaveFilename();a.click();shell.toast(t('career.fileSaved',{filename:a.download}));
}

function downloadCareerText(text,filename){
  const pretty=JSON.stringify(JSON.parse(text),null,2);
  const blob=new Blob([pretty],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
}

async function refreshCareerList(renderMenu=true){
  const manager=window.PPM.saveManager;
  if(!manager?.isInitialized?.())return[];
  ui._careers=await manager.listCareers();
  ui._storageEstimate=await manager.estimateStorage();
  if(renderMenu)pages.renderStart();
  return ui._careers;
}

function enterLoadedCareer(message){
  shell.updateHeader();
  const targetPage=store.G&&store.G.phase==='preseason'?'preseason':'dash';
  ui.page=targetPage;
  pages.renderApp();
  shell.syncNavState?.();
  if(message)shell.toast(message);
}

async function continueCareer(id){
  try{
    await window.PPM.saveManager.loadCareer(id);
    await refreshCareerList(false);
    enterLoadedCareer(t('career.resumedGeneric'));
  }catch(error){
    shell.toast(error?.message||t('career.loadFailed'));
  }
}

async function renameCareer(id){
  const career=await window.PPM.saveManager.getCareer(id);
  if(!career)return;
  const name=prompt(t('career.namePrompt'),career.name);
  if(name===null)return;
  if(!String(name).trim()){shell.toast(t('career.nameEmpty'));return;}
  await window.PPM.saveManager.renameCareer(id,name);
  await refreshCareerList();
}

async function deleteCareer(id){
  const career=await window.PPM.saveManager.getCareer(id);
  if(!career)return;
  if(!confirm(t('career.deleteConfirm',{name:career.name})))return;
  await window.PPM.saveManager.deleteCareer(id);
  if(!window.PPM.saveManager.getActiveCareerId())window.PPM.stateApi.setGame(null);
  await refreshCareerList();
  shell.toast(t('career.deleted'));
}

async function exportCareer(id){
  const career=await window.PPM.saveManager.getCareer(id);
  if(!career)return;
  const s=career.summary||{};
  const filename=`ppm-v17-${slugifySavePart(s.clubName||career.name)}-s${s.season||1}-k${s.matchday||0}.json`;
  downloadCareerText(career.data,filename);
  shell.toast(t('career.exported',{name:career.name}));
}

function escapeModal(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

async function showCareerBackups(id){
  const career=await window.PPM.saveManager.getCareer(id);
  const backups=await window.PPM.saveManager.listBackups(id);
  const modal=document.getElementById('modal');
  modal.className='modal';
  modal.innerHTML=`<div class="mt2">${t('career.backupsTitle',{name:escapeModal(career?.name||'Career')}).toUpperCase()} <button class="close-btn" onclick="closeModal()">✕</button></div>
    <div class="flex fdc gp6 mt-12">${backups.length?backups.map(b=>`<div class="flex jcb aic bgs1 bb1 r8 pd10-12"><div><div class="b7 fs12">${escapeModal(b.label)}</div><div class="fs9 ink3 mt-2">${formatDateTime(b.createdAt)}</div></div><button class="btn sm" onclick="restoreCareerBackup('${escapeModal(id)}','${escapeModal(b.id)}')">${t('career.restore').toUpperCase()}</button></div>`).join(''):`<div class="fs11 ink3">${t('career.noBackups')}</div>`}</div>`;
  shell.openModal();
}

async function restoreCareerBackup(id,backupId){
  if(!confirm(t('career.restoreConfirm')))return;
  try{
    await window.PPM.saveManager.restoreBackup(id,backupId);
    shell.closeModal();
    await refreshCareerList(false);
    enterLoadedCareer(t('career.restored'));
  }catch(error){
    shell.toast(error?.message||t('career.restoreFailed'));
  }
}

function showStartScreen(force){
  if(ui.running)return;
  if(store.G&&!force){
    const ok=confirm(t('career.newGameConfirm'));
    if(!ok)return;
  }
  shell.closeModal?.();
  pages.renderStart();
}

async function resumeSavedGame(){
  let saved=null;
  try{
    const manager=window.PPM.saveManager;
    if(manager?.isInitialized?.()&&manager.getActiveCareerId()){
      await continueCareer(manager.getActiveCareerId());
      return;
    }else{
      saved=loadPersistedGame();
    }
  }catch(error){
    shell.toast(error?.message||t('career.loadFailed'));
  }
  if(!saved){
    shell.toast(t('career.noLocalSave'));
    pages.renderStart();
    return;
  }
  shell.updateHeader();
  const targetPage=store.G&&store.G.phase==='preseason'?'preseason':'dash';
  ui.page=targetPage;
  shell.go(targetPage);
  shell.toast(t('career.lastSaveResumed'));
}

function loadGame(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=async e=>{try{
    const text=e.target.result;
    window.PPM.stateApi.validateSaveText(text);
    const estimate=await window.PPM.saveManager.estimateStorage();
    if(estimate?.low&&!confirm(t('career.importStorageLow')))return;
    const career=await window.PPM.saveManager.importCareer(text,f.name.replace(/\.json$/i,''));
    await window.PPM.saveManager.loadCareer(career.id);
    await refreshCareerList(false);
    enterLoadedCareer(t('career.imported'));
  }catch(error){shell.toast(error?.message||t('career.badFile'));}};
  r.readAsText(f);ev.target.value='';
}
function loadDatabaseFile(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=e=>{
    try{
      const parsed=JSON.parse(e.target.result);
      if(!Array.isArray(parsed.teams)||!Array.isArray(parsed.players))throw new Error('bad-db');
      window.PPM.customDatabase=parsed;
      shell.toast(t('database.loaded',{name:parsed.name||f.name}));
      pages.renderStart();
    }catch{
      shell.toast(t('database.invalid'));
    }
  };
  r.readAsText(f);ev.target.value='';
}
function clearDatabaseFile(){
  window.PPM.customDatabase=null;
  shell.toast(t('database.cleared'));
  pages.renderStart();
}

Object.assign(window, { saveGame, loadGame, loadDatabaseFile, clearDatabaseFile, showStartScreen, resumeSavedGame, continueCareer, renameCareer, deleteCareer, exportCareer, showCareerBackups, restoreCareerBackup, refreshCareerList, render: pages.renderApp, updateHeader: shell.updateHeader });
window.PPM.saveGame = saveGame;
window.PPM.loadGame = loadGame;
window.PPM.loadDatabaseFile = loadDatabaseFile;
window.PPM.clearDatabaseFile = clearDatabaseFile;
window.PPM.showStartScreen = showStartScreen;
window.PPM.resumeSavedGame = resumeSavedGame;
window.PPM.renderApp = pages.renderApp;
window.PPM.updateHeader = shell.updateHeader;

setNamePools(ui._selCountry);
async function initializeApplication(){
  const content=document.getElementById('content');
  if(content)content.innerHTML=`<div class="flex aic jcc" style="min-height:70vh">${t('common.loading')}</div>`;
  try{
    await window.PPM.saveManager.initialize();
    ui._careers=await window.PPM.saveManager.listCareers();
    ui._saveStorageError=null;
  }catch(error){
    ui._saveStorageError=error?.message||t('storage.unavailable');
  }
  pages.renderStart();
}
initializeApplication();
})();
