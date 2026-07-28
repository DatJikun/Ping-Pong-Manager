// =============================================================================
// save-storage.js — asynchronous storage adapters for careers and checkpoints.
// The rest of the game depends on this contract, not directly on IndexedDB.
// =============================================================================

(function(){
window.PPM = window.PPM || {};

const DB_NAME='ppm-careers';
const DB_VERSION=1;

function clone(value){
  if(value===null||value===undefined)return value;
  return JSON.parse(JSON.stringify(value));
}

function createMemoryAdapter(){
  const careers=new Map();
  const backups=new Map();
  const meta=new Map();
  return{
    async open(){return this;},
    async listCareers(){return Array.from(careers.values(),clone);},
    async getCareer(id){return careers.has(id)?clone(careers.get(id)):null;},
    async commit({career,backup=null,deleteBackupIds=[]}){
      const nextCareers=new Map(careers);
      const nextBackups=new Map(backups);
      if(career)nextCareers.set(career.id,clone(career));
      if(backup)nextBackups.set(backup.id,clone(backup));
      for(const id of deleteBackupIds||[])nextBackups.delete(id);
      careers.clear();for(const [id,value] of nextCareers)careers.set(id,value);
      backups.clear();for(const [id,value] of nextBackups)backups.set(id,value);
      return career?clone(career):null;
    },
    async listBackups(careerId){
      return Array.from(backups.values()).filter(x=>x.careerId===careerId).map(clone);
    },
    async deleteCareer(id){
      careers.delete(id);
      for(const [backupId,backup] of backups){
        if(backup.careerId===id)backups.delete(backupId);
      }
    },
    async getMeta(key){return meta.has(key)?clone(meta.get(key)):null;},
    async putMeta(key,value){meta.set(key,clone(value));return clone(value);},
  };
}

function requestResult(request){
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
  });
}

function transactionDone(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
    tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
  });
}

function createIndexedDbAdapter(options={}){
  const dbName=options.dbName||DB_NAME;
  const indexedDb=options.indexedDB||globalThis.indexedDB;
  let db=null;

  async function open(){
    if(db)return api;
    if(!indexedDb)throw new Error('IndexedDB is unavailable');
    db=await new Promise((resolve,reject)=>{
      const request=indexedDb.open(dbName,DB_VERSION);
      request.onupgradeneeded=()=>{
        const next=request.result;
        if(!next.objectStoreNames.contains('careers'))next.createObjectStore('careers',{keyPath:'id'});
        if(!next.objectStoreNames.contains('backups')){
          const store=next.createObjectStore('backups',{keyPath:'id'});
          store.createIndex('careerId','careerId',{unique:false});
        }
        if(!next.objectStoreNames.contains('meta'))next.createObjectStore('meta',{keyPath:'key'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Cannot open career storage'));
      request.onblocked=()=>reject(new Error('Career storage upgrade is blocked'));
    });
    return api;
  }

  function ensureOpen(){
    if(!db)throw new Error('Career storage is not open');
  }

  const api={
    open,
    async listCareers(){
      ensureOpen();
      const tx=db.transaction('careers','readonly');
      const result=await requestResult(tx.objectStore('careers').getAll());
      await transactionDone(tx);
      return result;
    },
    async getCareer(id){
      ensureOpen();
      const tx=db.transaction('careers','readonly');
      const result=await requestResult(tx.objectStore('careers').get(id));
      await transactionDone(tx);
      return result||null;
    },
    async commit({career,backup=null,deleteBackupIds=[]}){
      ensureOpen();
      const tx=db.transaction(['careers','backups'],'readwrite');
      if(career)tx.objectStore('careers').put(career);
      if(backup)tx.objectStore('backups').put(backup);
      for(const id of deleteBackupIds||[])tx.objectStore('backups').delete(id);
      await transactionDone(tx);
      return career||null;
    },
    async listBackups(careerId){
      ensureOpen();
      const tx=db.transaction('backups','readonly');
      const result=await requestResult(tx.objectStore('backups').index('careerId').getAll(careerId));
      await transactionDone(tx);
      return result;
    },
    async deleteCareer(id){
      ensureOpen();
      const tx=db.transaction(['careers','backups'],'readwrite');
      tx.objectStore('careers').delete(id);
      const index=tx.objectStore('backups').index('careerId');
      const request=index.openCursor(id);
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor)return;
        cursor.delete();
        cursor.continue();
      };
      await transactionDone(tx);
    },
    async getMeta(key){
      ensureOpen();
      const tx=db.transaction('meta','readonly');
      const result=await requestResult(tx.objectStore('meta').get(key));
      await transactionDone(tx);
      return result?result.value:null;
    },
    async putMeta(key,value){
      ensureOpen();
      const tx=db.transaction('meta','readwrite');
      tx.objectStore('meta').put({key,value});
      await transactionDone(tx);
      return value;
    },
  };
  return api;
}

window.PPM.saveStorage={createMemoryAdapter,createIndexedDbAdapter,DB_NAME,DB_VERSION};
})();
