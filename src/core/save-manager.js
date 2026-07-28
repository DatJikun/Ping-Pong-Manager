// =============================================================================
// save-manager.js — career library, ordered autosaves and recovery checkpoints.
// =============================================================================

(function(){
window.PPM = window.PPM || {};

const ACTIVE_META_KEY='activeCareerId';
const ORDINARY_BACKUP_LIMIT=3;

function defaultNewId(prefix){
  const uuid=globalThis.crypto?.randomUUID?.();
  if(uuid)return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

function parseSummary(text){
  const game=JSON.parse(text);
  if(!game||typeof game!=='object'||Array.isArray(game))throw new Error('Save must be an object');
  const team=(game.teams||[]).find(t=>t?.id===game.myTeamId)
    ||(game.teams||[]).find(t=>t?.isPlayer)
    ||null;
  return{
    clubName:team?.name||'Nieznany klub',
    countryId:game.countryId||'PL',
    season:Number(game.season)||1,
    matchday:Number(game.matchday)||0,
    phase:game.phase||'season',
    difficulty:game.aiDifficulty||'hard',
    schemaVersion:Number(game.schemaVersion)||0,
  };
}

function checkpointLabel(kind,summary){
  const where=summary.phase==='preseason'
    ?`sezon ${summary.season}, preseason`
    :`sezon ${summary.season}, kolejka ${summary.matchday}`;
  const labels={
    matchday:'Przed kolejką',
    tournament:'Przed turniejem',
    season:'Przed zmianą sezonu',
    migration:'Przed aktualizacją zapisu',
    restore:'Przed przywróceniem kopii',
  };
  return `${labels[kind]||'Punkt odzyskiwania'} — ${where}`;
}

function createSaveManager(options){
  const adapter=options.adapter;
  const now=options.now||(()=>Date.now());
  const newId=options.newId||defaultNewId;
  const validateText=options.validateText||(text=>JSON.parse(text));
  const loadText=options.loadText||(()=>{});
  const serializeCurrent=options.serializeCurrent||(()=>null);
  const onError=options.onError||(()=>{});
  const storageEstimate=options.storageEstimate
    ||(globalThis.navigator?.storage?.estimate
      ?()=>globalThis.navigator.storage.estimate()
      :null);
  let activeCareerId=null;
  let initialized=false;
  let pendingText=null;
  let drainPromise=null;
  let failureNotified=false;

  function requireInitialized(){
    if(!initialized)throw new Error('Career save manager is not initialized');
  }

  function normalizeName(name,fallback){
    return String(name||fallback||'Kariera').trim().slice(0,60)||'Kariera';
  }

  function makeCareer(text,name,previous=null,id=null){
    validateText(text);
    const timestamp=now();
    const summary=parseSummary(text);
    return{
      id:id||newId('career'),
      name:normalizeName(name,summary.clubName),
      createdAt:previous?.createdAt||timestamp,
      updatedAt:timestamp,
      revision:(previous?.revision||0)+1,
      summary,
      data:text,
    };
  }

  async function initialize(){
    await adapter.open();
    activeCareerId=await adapter.getMeta(ACTIVE_META_KEY);
    if(activeCareerId&&!(await adapter.getCareer(activeCareerId))){
      activeCareerId=null;
      await adapter.putMeta(ACTIVE_META_KEY,null);
    }
    initialized=true;
    return api;
  }

  async function listCareers(){
    requireInitialized();
    return (await adapter.listCareers()).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  }

  async function createCareer(text,name){
    requireInitialized();
    const career=makeCareer(text,name);
    await adapter.commit({career,backup:null,deleteBackupIds:[]});
    activeCareerId=career.id;
    await adapter.putMeta(ACTIVE_META_KEY,activeCareerId);
    failureNotified=false;
    return career;
  }

  async function importCareer(text,name){
    return createCareer(text,name);
  }

  async function loadCareer(id){
    requireInitialized();
    await flush();
    const career=await adapter.getCareer(id);
    if(!career)throw new Error('Career not found');
    validateText(career.data);
    loadText(career.data);
    activeCareerId=id;
    await adapter.putMeta(ACTIVE_META_KEY,id);
    return career;
  }

  async function renameCareer(id,name){
    requireInitialized();
    const previous=await adapter.getCareer(id);
    if(!previous)throw new Error('Career not found');
    const next={...previous,name:normalizeName(name,previous.name),updatedAt:now()};
    await adapter.commit({career:next,backup:null,deleteBackupIds:[]});
    return next;
  }

  async function deleteCareer(id){
    requireInitialized();
    await flush();
    await adapter.deleteCareer(id);
    if(activeCareerId===id){
      activeCareerId=null;
      await adapter.putMeta(ACTIVE_META_KEY,null);
    }
  }

  async function commitAutosave(text){
    const previous=await adapter.getCareer(activeCareerId);
    if(!previous)throw new Error('Active career not found');
    const career=makeCareer(text,previous.name,previous,previous.id);
    await adapter.commit({career,backup:null,deleteBackupIds:[]});
  }

  function startDrain(){
    if(drainPromise||pendingText===null||!activeCareerId)return drainPromise;
    drainPromise=(async()=>{
      let success=true;
      while(pendingText!==null&&activeCareerId){
        const text=pendingText;
        pendingText=null;
        try{
          await commitAutosave(text);
          failureNotified=false;
        }catch(error){
          success=false;
          if(!failureNotified){
            failureNotified=true;
            onError(error);
          }
        }
      }
      return success;
    })().finally(()=>{
      drainPromise=null;
      if(pendingText!==null&&activeCareerId)startDrain();
    });
    return drainPromise;
  }

  function requestAutosave(text){
    if(!initialized||!activeCareerId)return false;
    validateText(text);
    pendingText=text;
    startDrain();
    return true;
  }

  async function flush(){
    let success=true;
    while(drainPromise||pendingText!==null){
      if(!drainPromise)startDrain();
      if(!drainPromise)break;
      if(await drainPromise===false)success=false;
    }
    return success;
  }

  async function listBackups(id=activeCareerId){
    requireInitialized();
    if(!id)return[];
    return (await adapter.listBackups(id)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  }

  async function createCheckpoint(kind,text=serializeCurrent()){
    requireInitialized();
    if(!activeCareerId||!text)return null;
    validateText(text);
    const summary=parseSummary(text);
    const timestamp=now();
    const backup={
      id:newId('backup'),
      careerId:activeCareerId,
      kind,
      createdAt:timestamp,
      label:checkpointLabel(kind,summary),
      summary,
      data:text,
    };
    const existing=await listBackups(activeCareerId);
    let deleteBackupIds=[];
    if(kind==='migration'){
      deleteBackupIds=existing.filter(x=>x.kind==='migration').map(x=>x.id);
    }else{
      const ordinary=existing
        .filter(x=>x.kind!=='migration')
        .sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
      deleteBackupIds=ordinary.slice(0,Math.max(0,ordinary.length-(ORDINARY_BACKUP_LIMIT-1))).map(x=>x.id);
    }
    await adapter.commit({career:null,backup,deleteBackupIds});
    return backup;
  }

  async function restoreBackup(careerId,backupId){
    requireInitialized();
    await flush();
    const career=await adapter.getCareer(careerId);
    if(!career)throw new Error('Career not found');
    const backup=(await adapter.listBackups(careerId)).find(x=>x.id===backupId);
    if(!backup)throw new Error('Backup not found');
    activeCareerId=careerId;
    await adapter.putMeta(ACTIVE_META_KEY,careerId);
    const displaced=serializeCurrent();
    if(displaced)await createCheckpoint('restore',displaced);
    validateText(backup.data);
    const restored=makeCareer(backup.data,career.name,career,career.id);
    await adapter.commit({career:restored,backup:null,deleteBackupIds:[]});
    loadText(backup.data);
    return restored;
  }

  async function deactivate(){
    await flush();
    activeCareerId=null;
    if(initialized)await adapter.putMeta(ACTIVE_META_KEY,null);
  }

  async function estimateStorage(){
    if(!storageEstimate)return null;
    const estimate=await storageEstimate();
    const usage=Number(estimate?.usage)||0;
    const quota=Number(estimate?.quota)||0;
    if(!quota)return null;
    const ratio=usage/quota;
    return{usage,quota,ratio,low:ratio>=0.85};
  }

  function getActiveCareerId(){return activeCareerId;}
  function isInitialized(){return initialized;}

  const api={
    initialize,listCareers,createCareer,importCareer,loadCareer,renameCareer,
    deleteCareer,requestAutosave,flush,createCheckpoint,listBackups,
    restoreBackup,deactivate,getActiveCareerId,isInitialized,estimateStorage,
  };
  return api;
}

const storage=window.PPM.saveStorage;
const defaultManager=createSaveManager({
  adapter:storage.createIndexedDbAdapter(),
  validateText:text=>window.PPM.stateApi?.validateSaveText
    ?window.PPM.stateApi.validateSaveText(text)
    :JSON.parse(text),
  loadText:text=>window.PPM.stateApi?.loadGameFromText?.(text),
  serializeCurrent:()=>window.PPM.stateApi?.serializeGame?.()||null,
  onError:()=>globalThis.toast?.('Autosave nie powiódł się — pobierz zapis do pliku w Ustawieniach.'),
});

window.PPM.saveManagerApi={createSaveManager,parseSummary,ORDINARY_BACKUP_LIMIT};
window.PPM.saveManager=defaultManager;
})();
