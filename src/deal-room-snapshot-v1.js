// Offline corruption detection, NOT authentication or anti-cheat.
// Anyone editing both snapshot and checksum can create a consistent envelope.
// Complete events remain available for explicit strict recovery/audit.
import {validateSegmentedJournalShape,rebuildSegmentedDealRoom} from './deal-room-ledger-v2.js';
import {canonicalDealRoomEvent} from './deal-room-engine.js';
const TYPE='deal-room-snapshot',VERSION=1,ALGORITHM='crc32-utf8-v1';
export const SNAPSHOT_MAX_BYTES=5*1024*1024;
const phases=new Set(['negotiating','complete','review','portfolio','paid','fulfilling','account','case-growth','collection','collection-revision','curating','curation-fulfillment','development','launch-project','planning-fulfillment','shop-trial','stock-procurement','studio-project','supplier-development']);
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
const fail=message=>{throw new Error(message);};
function bytes(text){if(typeof text!=='string'||text.length>SNAPSHOT_MAX_BYTES)fail('快照超过 5 MiB 或不是文本');const b=new TextEncoder().encode(text);if(b.length>SNAPSHOT_MAX_BYTES)fail('快照超过 5 MiB');return b;}
const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let n=0;n<8;n++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32Utf8(text){let crc=0xffffffff;for(const b of new TextEncoder().encode(text))crc=table[(crc^b)&255]^(crc>>>8);return ((crc^0xffffffff)>>>0).toString(16).padStart(8,'0');}
function checksum(payload){return crc32Utf8(JSON.stringify(stable(payload)));}
function integer(n,min=Number.MIN_SAFE_INTEGER){return Number.isSafeInteger(n)&&n>=min;}
export function validateSnapshotBusiness(state){
 validateSegmentedJournalShape(state);
 for(const events of [...state.journal.segments.map(s=>s.actions),state.history])for(const action of events){
  const canonical=canonicalDealRoomEvent(action);
  if(!canonical||JSON.stringify(stable(canonical))!==JSON.stringify(stable(action)))fail('快照动作格式无效');
 }
 if(!integer(state.cash)||!integer(state.day,1)||!integer(state.clientIndex,0)||state.clientIndex>3||!phases.has(state.phase)||
 !Array.isArray(state.contracts)||!exact(state.feedback,['kind','message'])||typeof state.feedback.kind!=='string'||typeof state.feedback.message!=='string')fail('快照经营字段无效');
 for(const c of state.contracts){
  if(!c||!['fulfilling','receivable','paid'].includes(c.status)||['clientId','clientName','product','optionId'].some(k=>typeof c[k]!=='string'))fail('快照合同状态无效');
  for(const key of ['quantity','revenue','cost','deposit','balanceDue','operatingCost','signedDay','deliveryDay','paymentDay'])if(!integer(c[key],0))fail('快照合同金额或日期无效');
  if(!integer(c.profit)||!integer(c.netProfit)||c.profit!==c.revenue-c.cost||c.balanceDue!==c.revenue-c.deposit||c.netProfit!==c.profit-c.operatingCost||
   c.deposit>c.revenue||c.signedDay<1||c.deliveryDay<c.signedDay||c.paymentDay<c.deliveryDay||
   c.signedDay>state.day||(c.status==='paid'&&c.paymentDay>state.day))fail('快照合同账目不一致');
 }
 if(state.personalLife){
  const life=state.personalLife;
  if(!Array.isArray(life.purchases)||!integer(life.spent,0)||life.purchases.some(p=>!integer(p.price,0)||!integer(p.day,1)||p.day>state.day)||
   life.purchases.reduce((sum,p)=>sum+p.price,0)!==life.spent)fail('快照生活支出不一致');
 }
 return state;
}
function envelope(text){
 bytes(text);const raw=JSON.parse(text);
 if(!exact(raw,['type','version','state','integrity'])||raw.type!==TYPE||raw.version!==VERSION||
 !exact(raw.integrity,['algorithm','value'])||raw.integrity.algorithm!==ALGORITHM||typeof raw.integrity.value!=='string')fail('未知或无效的快照格式/版本');
 return raw;
}
export function encodeDealSnapshot(state){
 validateSnapshotBusiness(state);
 const payload={type:TYPE,version:VERSION,state};
 const text=JSON.stringify({...payload,integrity:{algorithm:ALGORITHM,value:checksum(payload)}});
 bytes(text);return text;
}
export function parseDealSnapshot(text){
 const raw=envelope(text),payload={type:raw.type,version:raw.version,state:raw.state};
 if(checksum(payload)!==raw.integrity.value)fail('快照校验和不一致，原文应保留，可尝试从完整经营记录恢复');
 return validateSnapshotBusiness(raw.state);
}
export function recoverDealSnapshot(text){
 const raw=envelope(text);
 const state=rebuildSegmentedDealRoom(raw.state);
 validateSnapshotBusiness(state);
 const changedFields=[...new Set([...Object.keys(state),...Object.keys(raw.state)])].filter(k=>JSON.stringify(stable(state[k]))!==JSON.stringify(stable(raw.state[k])));
 return {state,originalText:text,changedFields,method:'strict-event-replay',notice:'结果由现存事件重建；校验和不证明原始真实性。'};
}
