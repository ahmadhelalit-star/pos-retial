const database='sham-touch-retail-recovery-v1';
function open(){return new Promise((resolve,reject)=>{const request=indexedDB.open(database,1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);});}
export async function draftStore(key,value){
  const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('drafts',value===undefined?'readonly':'readwrite'),store=tx.objectStore('drafts');let result;const request=value===undefined?store.get(key):store.put({...value,version:1,updatedAt:new Date().toISOString()},key);request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(value===undefined?result:value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Recovery storage aborted'));});}finally{db.close();}
}
export function recoveryKey(user,device){return `${user.companyId}:${user.id}:${device}`;}
export function initialCartCurrency(draft,base){return draft?.items?.length||draft?.pending?draft.currency??base:base;}
