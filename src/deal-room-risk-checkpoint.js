import {createDealRoom,normalizeDealRoom,reduceDealRoom,previewCashRisk} from './deal-room-engine.js?v=37';
import {DEAL_SAVE_KEY,DEAL_BACKUP_MAX_BYTES,loadDealSave,saveDealProgress} from './deal-room-save.js?v=37';

const allowed=new Set([DEAL_SAVE_KEY,'trade-tycoon:deal-room-offline:v1']);
const checkpointKey=key=>key+':before-risk:v1';
const failedKey=key=>key+':bankrupt-run:v1';
const actions=s=>[...(s.historyPages||[]).flat(),...s.history];
const decor=new Set(['ARRANGE_LIFE_ITEM','READ_LIFE_BOOK','SELECT_LIFE_RECORD']);
const ledger=s=>actions(s).filter(a=>!decor.has(a.type));
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const ancestor=(old,current,strict=true)=>{
 const a=ledger(old),b=ledger(current);
 return old.day<=current.day&&(strict?a.length<b.length:a.length<=b.length)&&a.every((x,i)=>same(x,b[i]));
};
const fail=(status,error)=>({ok:false,status,error});
const info=(state,raw)=>({ok:true,status:'valid',state,raw,day:state.day,cash:state.cash});
const enc=new TextEncoder();
function decode(raw){
 if(typeof raw!=='string'||raw.length>DEAL_BACKUP_MAX_BYTES||enc.encode(raw).byteLength>DEAL_BACKUP_MAX_BYTES)throw new Error('回退记录无法读取。');
 const parsed=JSON.parse(raw);
 if(parsed?.version!==1||!Object.hasOwn(parsed,'state'))throw new Error('回退记录无法读取。');
 return normalizeDealRoom(parsed.state);
}
function verifiedWrite(storage,key,raw){
 storage.setItem(key,raw);
 if(storage.getItem(key)!==raw)throw new Error('没能保留回退记录。');
}
const defaultCausative=(before,after)=>!!previewCashRisk(before,after);
const causative=(before,after,entry,check)=>before.day===after.day&&after.cash<before.cash&&check(before,after,entry);
function inSameRiskEpisode(checkpoint,current,isRisky,isCausative){
 if(!ancestor(checkpoint,current)||typeof isRisky!=='function'||isRisky(checkpoint)||!isRisky(current))return false;
 const prefix=actions(checkpoint),all=actions(current),remaining=all.length-prefix.length;
 if(remaining<1||remaining>400||!prefix.every((a,i)=>same(a,all[i])))return false;
 let before=checkpoint;
 for(let i=prefix.length;i<all.length;i++){
  const entry=all[i],after=reduceDealRoom(before,entry);
  if(after===before||!isRisky(after)||i===prefix.length&&!causative(before,after,entry,isCausative))return false;
  before=after;
 }
 return same(before,current);
}
export function readRiskCheckpoint(storage,key=DEAL_SAVE_KEY,currentState,{isRisky,isCausative=defaultCausative}={}){
 if(!allowed.has(key))return fail('unavailable','不能读取这份回退记录。');
 try{
  const raw=storage.getItem(checkpointKey(key));
  if(raw!==null){
   const state=decode(raw);
   if(!currentState||inSameRiskEpisode(state,currentState,isRisky,isCausative))return info(state,raw);
  }
  const recovered=currentState&&replayRiskCheckpoint(currentState,isRisky,isCausative);
  if(recovered&&ancestor(recovered,currentState))return {...info(recovered,null),recovered:true};
  return raw===null?fail('empty','这局没有可回退的记录。'):fail('stale','这份回退记录不属于现在的进度。');
 }catch{return fail('unavailable','回退记录无法读取。');}
}
/** Caller calls this on a healthy → risky transition, before saving the result. */
export function putRiskCheckpoint(storage,key=DEAL_SAVE_KEY,previousState,options={}){
 if(!allowed.has(key)||!Object.hasOwn(options,'expectedRaw'))return fail('unavailable','无法确认这份进度。');
 try{
  const state=normalizeDealRoom(previousState);
  const previous=loadDealSave(storage,key);
  if(!previous.ok||previous.raw!==options.expectedRaw)return fail('changed','当前进度已变化，请重新操作。');
  if(previous.state?!same(state,previous.state):!same(state,createDealRoom(state.version)))return fail('changed','当前进度已变化，请重新操作。');
  const raw=JSON.stringify({version:1,state});
  if(raw.length>DEAL_BACKUP_MAX_BYTES||enc.encode(raw).byteLength>DEAL_BACKUP_MAX_BYTES)return fail('too-large','没能保留回退记录。');
  verifiedWrite(storage,checkpointKey(key),raw);
  return info(state,raw);
 }catch{return fail('unavailable','没能保留回退记录。');}
}
/** Only offer when the caller has verified bankruptcy. This is an explicit reset of
 * the active autosave; retain the complete abandoned run independently of manual copies. */
export function rollbackRiskCheckpoint(storage,key=DEAL_SAVE_KEY,options={}){
 if(!allowed.has(key)||!Object.hasOwn(options,'expectedRaw'))return fail('unavailable','无法确认这份进度。');
 const prior=loadDealSave(storage,key);
 if(prior.status!=='valid'||prior.raw!==options.expectedRaw)return fail('changed','当前进度已变化，请重新确认。');
 try{
  if(options.currentState&&!same(normalizeDealRoom(options.currentState),prior.state))return fail('changed','当前进度已变化，请重新确认。');
  const cp=readRiskCheckpoint(storage,key,prior.state,{isRisky:options.isRisky,isCausative:options.isCausative});
  if(!cp.ok)return cp;
  verifiedWrite(storage,failedKey(key),prior.raw);
  const result=saveDealProgress(storage,cp.state,{key,expectedRaw:prior.raw});
  if(!result.ok)return result;
  // The restore is already durable. Sidecar cleanup cannot turn it into failure.
  clearRiskCheckpoint(storage,key,{expectedRaw:result.raw});
  return {...result,status:'rolled-back'};
 }catch{return fail('unavailable','无法保留当前进度，未回退。');}
}
export function clearRiskCheckpoint(storage,key=DEAL_SAVE_KEY,options={}){
 if(!allowed.has(key))return false;
 try{if(Object.hasOwn(options,'expectedRaw')&&storage.getItem(key)!==options.expectedRaw)return false;storage.removeItem(checkpointKey(key));return storage.getItem(checkpointKey(key))===null;}catch{return false;}
}
/** Optional old-run fallback. Bound replay work and insist it reproduces the full
 * active state before offering its most recent healthy → risky boundary. */
export function replayRiskCheckpoint(currentState,isRisky,isCausative=defaultCausative){
 if(typeof isRisky!=='function')return null;
 try{
  const current=normalizeDealRoom(currentState),journal=actions(current);
  if(journal.length>400)return null;
  let before=createDealRoom(current.version),checkpoint=null;
  for(const entry of journal){
   const after=reduceDealRoom(before,entry);
   if(after===before)return null;
   const nowRisky=isRisky(after);
   if(!nowRisky)checkpoint=null;
   else if(!isRisky(before))checkpoint=causative(before,after,entry,isCausative)?before:null;
   before=after;
  }
  return same(before,current)&&isRisky(current)?checkpoint:null;
 }catch{return null;}
}
