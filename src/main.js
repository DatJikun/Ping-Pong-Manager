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
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=buildSaveFilename();a.click();shell.toast(`Gra zapisana jako ${a.download}`);
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
    enterLoadedCareer('Wznowiono karierę.');
  }catch(error){
    shell.toast(error?.message||'Nie udało się wczytać kariery.');
  }
}

async function renameCareer(id){
  const career=await window.PPM.saveManager.getCareer(id);
  if(!career)return;
  const name=prompt('Nazwa kariery:',career.name);
  if(name===null)return;
  if(!String(name).trim()){shell.toast('Nazwa nie może być pusta.');return;}
  await window.PPM.saveManager.renameCareer(id,name);
  await refreshCareerList();
}

async function deleteCareer(id){
  const career=await window.PPM.saveManager.getCareer(id);
  if(!career)return;
  if(!confirm(`Usunąć karierę „${career.name}” wraz z kopiami bezpieczeństwa?`))return;
  await window.PPM.saveManager.deleteCareer(id);
  if(!window.PPM.saveManager.getActiveCareerId())window.PPM.stateApi.setGame(null);
  await refreshCareerList();
  shell.toast('Kariera została usunięta.');
}

async function exportCareer(id){
  const career=await window.PPM.saveManager.getCareer(id);
  if(!career)return;
  const s=career.summary||{};
  const filename=`ppm-v17-${slugifySavePart(s.clubName||career.name)}-s${s.season||1}-k${s.matchday||0}.json`;
  downloadCareerText(career.data,filename);
  shell.toast(`Wyeksportowano ${career.name}.`);
}

function escapeModal(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

async function showCareerBackups(id){
  const career=await window.PPM.saveManager.getCareer(id);
  const backups=await window.PPM.saveManager.listBackups(id);
  const modal=document.getElementById('modal');
  modal.className='modal';
  modal.innerHTML=`<div class="mt2">KOPIE — ${escapeModal(career?.name||'Kariera')} <button class="close-btn" onclick="closeModal()">✕</button></div>
    <div class="flex fdc gp6 mt-12">${backups.length?backups.map(b=>`<div class="flex jcb aic bgs1 bb1 r8 pd10-12"><div><div class="b7 fs12">${escapeModal(b.label)}</div><div class="fs9 ink3 mt-2">${new Date(b.createdAt).toLocaleString('pl-PL')}</div></div><button class="btn sm" onclick="restoreCareerBackup('${escapeModal(id)}','${escapeModal(b.id)}')">PRZYWRÓĆ</button></div>`).join(''):'<div class="fs11 ink3">Brak punktów odzyskiwania.</div>'}</div>`;
  shell.openModal();
}

async function restoreCareerBackup(id,backupId){
  if(!confirm('Przywrócić tę kopię? Obecny stan kariery również zostanie zabezpieczony.'))return;
  try{
    await window.PPM.saveManager.restoreBackup(id,backupId);
    shell.closeModal();
    await refreshCareerList(false);
    enterLoadedCareer('Przywrócono kopię kariery.');
  }catch(error){
    shell.toast(error?.message||'Nie udało się przywrócić kopii.');
  }
}

function showStartScreen(force){
  if(ui.running)return;
  if(store.G&&!force){
    const ok=confirm('Przej\u015b\u0107 do ekranu nowej gry? Obecna rozgrywka pozostanie zapisana lokalnie i b\u0119dzie mo\u017cna j\u0105 wznowi\u0107.');
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
    shell.toast(error?.message||'Nie udało się wczytać kariery.');
  }
  if(!saved){
    shell.toast('Brak lokalnego zapisu do wznowienia.');
    pages.renderStart();
    return;
  }
  shell.updateHeader();
  const targetPage=store.G&&store.G.phase==='preseason'?'preseason':'dash';
  ui.page=targetPage;
  shell.go(targetPage);
  shell.toast('Wznowiono ostatni zapis.');
}

function loadGame(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=async e=>{try{
    const text=e.target.result;
    window.PPM.stateApi.validateSaveText(text);
    const estimate=await window.PPM.saveManager.estimateStorage();
    if(estimate?.low&&!confirm('Pamięć na zapisy jest prawie pełna. Kontynuować import?'))return;
    const career=await window.PPM.saveManager.importCareer(text,f.name.replace(/\.json$/i,''));
    await window.PPM.saveManager.loadCareer(career.id);
    await refreshCareerList(false);
    enterLoadedCareer('Zaimportowano zapis jako osobną karierę.');
  }catch(error){shell.toast(error?.message||'Błąd pliku!');}};
  r.readAsText(f);ev.target.value='';
}
function loadDatabaseFile(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=e=>{
    try{
      const parsed=JSON.parse(e.target.result);
      if(!Array.isArray(parsed.teams)||!Array.isArray(parsed.players))throw new Error('bad-db');
      window.PPM.customDatabase=parsed;
      shell.toast(`Za\u0142adowano database: ${parsed.name||f.name}`);
      pages.renderStart();
    }catch{
      shell.toast('Niepoprawny plik database.');
    }
  };
  r.readAsText(f);ev.target.value='';
}
function clearDatabaseFile(){
  window.PPM.customDatabase=null;
  shell.toast('Wyczyszczono custom database.');
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
  if(content)content.innerHTML='<div class="flex aic jcc" style="min-height:70vh">Wczytywanie karier…</div>';
  try{
    await window.PPM.saveManager.initialize();
    ui._careers=await window.PPM.saveManager.listCareers();
    ui._saveStorageError=null;
  }catch(error){
    ui._saveStorageError=error?.message||'Magazyn zapisów jest niedostępny.';
  }
  pages.renderStart();
}
initializeApplication();
})();
