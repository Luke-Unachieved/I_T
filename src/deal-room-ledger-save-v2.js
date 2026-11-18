// Isolated opt-in save adapter; original modern/offline keys are never written.
import {normalizeSegmentedDealRoom as normalizeDealRoom,migrateDealRoomToV2} from './deal-room-ledger-v2.js';

export const DEAL_SAVE_KEY='trade-tycoon:deal-room-ledger-prototype:v2';
export const DEAL_BACKUP_MAX_BYTES=5*1024*1024;
const allowedKeys=new Set([DEAL_SAVE_KEY,'trade-tycoon:deal-room-ledger-prototype-offline:v2']);
const errorText=e=>e instanceof Error?e.message:String(e);
function checkKey(key){if(!allowedKeys.has(key))throw new Error('只支持现代外贸进度，不能读写其他游戏存档。');}
function checkText(text){
 if(typeof text!=='string')throw new Error('备份必须是 JSON 文本。');
 // The cheap length bound also prevents encoding arbitrarily large input.
 if(text.length>DEAL_BACKUP_MAX_BYTES||new TextEncoder().encode(text).byteLength>DEAL_BACKUP_MAX_BYTES)throw new Error('备份超过 5 MiB。');
 return text;
}
function summaryFor(s){return {day:s.day,cash:s.cash,phase:s.phase,actions:s.journal.totalActions};}
/** Throws on invalid state. No storage, downloads or browser permission effects. */
export function encodeDealBackup(state){
 const canonical=normalizeDealRoom(state);
 return checkText(JSON.stringify({type:'deal-room',version:2,state:canonical}));
}
/** Returns canonical state and a factual confirmation summary; never writes. */
export function parseDealBackup(text){
 const envelope=JSON.parse(checkText(text));
 if(!envelope||Array.isArray(envelope)||typeof envelope!=='object'||Object.keys(envelope).length!==3||!Object.hasOwn(envelope,'state')||envelope.type!=='deal-room'||![1,2].includes(envelope.version))throw new Error('不是支持的现代外贸备份（deal-room v1/v2）。');
 const state=envelope.version===1?migrateDealRoomToV2(envelope.state):normalizeDealRoom(envelope.state);
 return {state,summary:summaryFor(state),sourceVersion:envelope.version};
}
/** Storage is injected. raw is retained verbatim, including malformed text.
 * Optional copy selects only before-restore/unreadable-backup under this same
 * modern key. This function never writes, deletes or promotes a retained copy.
 * Persisted app saves remain raw engine JSON, not the exported envelope.
 */
export function loadDealSave(storage,key=DEAL_SAVE_KEY,{copy}={}){
 let raw;
 try{checkKey(key);if(copy!==undefined&&!['before-restore','unreadable-backup'].includes(copy))throw new Error('不支持的进度副本。');raw=storage.getItem(key+(copy?':'+copy:''));}catch(e){return {ok:false,status:'unavailable',error:errorText(e)};}
 if(raw===null)return {ok:true,status:'empty',raw:null};
 try{const state=normalizeDealRoom(JSON.parse(checkText(raw)));return {ok:true,status:'valid',raw,state,summary:summaryFor(state)};}
 catch(e){return {ok:false,status:'corrupt',raw,error:errorText(e)};}
}
function writeVerified(storage,key,raw){
 storage.setItem(key,raw);
 if(storage.getItem(key)!==raw)throw new Error('浏览器写入后的进度不一致，尚未确认保存成功。');
}
/** Autosave never overwrites unreadable progress. UI retains its in-memory state
 * on ok:false and must not display a successful save notice.
 */
export function saveDealProgress(storage,state,options={}){
 const {key=DEAL_SAVE_KEY}=options;
 try{
  checkKey(key);const canonical=normalizeDealRoom(state),raw=checkText(JSON.stringify(canonical));
  const previous=loadDealSave(storage,key);
  // Opt-in raw comparison, including null for an empty key. Legacy callers that
  // omit expectedRaw retain their old behavior. This is not atomic cross-tab CAS.
  if(previous.status!=='unavailable'&&Object.hasOwn(options,'expectedRaw')&&previous.raw!==options.expectedRaw)return {ok:false,status:'conflict',error:'其他页面已更新进度，本页已暂停自动保存。'};
  if(!previous.ok)return {ok:false,status:previous.status,error:previous.status==='corrupt'?'已有进度无法读取，原数据保留，未覆盖。':previous.error,raw:previous.raw};
  writeVerified(storage,key,raw);return {ok:true,status:'saved',raw,state:canonical,summary:summaryFor(canonical)};
 }catch(e){return {ok:false,status:'failed',error:errorText(e)};}
}
/** Two-step restore. First call returns needsConfirmation + summary + expectedRaw.
 * UI shows the summary and asks before calling again with confirmed:true and the
 * exact expectedRaw. A concurrent save invalidates confirmation. Bad raw is
 * copied verbatim to :unreadable-backup, never overwriting a different bad copy.
 * Valid prior progress is retained at :before-restore. No removeItem is used.
 * A failed write/readback is never reported as success; storage may be unavailable.
 */
export function restoreDealBackup(storage,text,options={}){
 const {key=DEAL_SAVE_KEY,confirmed=false}=options;
 try{
  checkKey(key);const parsed=parseDealBackup(text),previous=loadDealSave(storage,key);
  if(previous.status==='unavailable')return {ok:false,status:'unavailable',error:previous.error};
  if(confirmed!==true)return {ok:false,status:'confirmation',needsConfirmation:true,summary:parsed.summary,expectedRaw:previous.raw};
  if(!Object.hasOwn(options,'expectedRaw')||options.expectedRaw!==previous.raw)return {ok:false,status:'changed',error:'当前进度已变化，请重新查看恢复摘要并确认。'};
  // A v1 import is an explicit migration boundary. Preserve its original
  // envelope verbatim before writing v2, never overwrite another source backup.
  if(parsed.sourceVersion===1){
   const legacyKey=key+':imported-v1',existing=storage.getItem(legacyKey);
   if(existing!==null&&existing!==text)return {ok:false,status:'backup-conflict',error:'已有另一份旧版迁移原档，未覆盖。请先保留两份原始数据。'};
   writeVerified(storage,legacyKey,text);
  }
  if(previous.raw!==null){
   const backupKey=key+(previous.status==='corrupt'?':unreadable-backup':':before-restore');
   if(previous.status==='corrupt'){
    const existing=storage.getItem(backupKey);
    if(existing!==null&&existing!==previous.raw)return {ok:false,status:'backup-conflict',error:'已有另一份损坏进度备份，未覆盖任何原始数据。请先保留两份原始数据。'};
   }
   writeVerified(storage,backupKey,previous.raw);
  }
  // Re-read after backup: do not replace an intervening tab's new progress.
  if(storage.getItem(key)!==previous.raw)return {ok:false,status:'changed',error:'备份期间进度已变化，未替换当前进度。'};
  writeVerified(storage,key,checkText(JSON.stringify(parsed.state)));
  return {ok:true,status:'restored',state:parsed.state,summary:parsed.summary};
 }catch(e){return {ok:false,status:'failed',error:errorText(e)};}
}
