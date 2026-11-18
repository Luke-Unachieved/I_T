// Isolated opt-in prototype. No UI, storage or legacy-format behavior changes.
// Archives contain all recorded events; only verified replay establishes money.
import {createDealRoom,normalizeDealRoom,replayDealRoomEvent as replayRecordedDeal,MAX_DEAL_ACTIONS} from './deal-room-engine.js';
export const LEDGER_SEGMENT_LENGTH=1024;
const copy=x=>JSON.parse(JSON.stringify(x));
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const frozenJournals=new WeakSet();
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function immutable(j){if(frozenJournals.has(j))return j;const result=freeze(copy(j));frozenJournals.add(result);return result;}
function journal(segments,totalActions){const j=Object.freeze({version:1,segments:Object.freeze(segments),totalActions});frozenJournals.add(j);return j;}
function wrap(domain,j){return {...domain,version:2,journal:j};}
function domain(state){const {journal,version,...rest}=state;return {...rest,version:1};}
function error(){throw new Error('分段经营记录无效');}
export function createSegmentedDealRoom(){return wrap(createDealRoom(),journal([],0));}
export function migrateDealRoomToV2(raw){
 const s=normalizeDealRoom(raw);
 if(!s.history.length)return createSegmentedDealRoom();
 const segment=freeze({kind:'legacy',actions:copy(s.history)});
 const result=wrap({...s,history:[copy(s.history.at(-1))]},journal([segment],s.history.length));
 cacheVerified(result);return result;
}
export function reduceSegmentedDealRoom(state,action){
 if(state?.version!==2)throw new Error('需要分段存档');
 const input=domain(state),next=replayRecordedDeal(input,action);
 if(next===input)return state;
 const old=immutable(state.journal);
 let segments=old.segments;
 if(next.history.length>=LEDGER_SEGMENT_LENGTH){
  const events=next.history.slice(segments.length?1:0);
  segments=[...segments,freeze({kind:'actions',actions:copy(events)})];
  next.history=[copy(next.history.at(-1))];
 }
 return wrap(next,journal(segments,old.totalActions+1));
}
function keys(x,wanted){return x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===wanted.slice().sort().join('|');}
// Exact content identities, never external hashes or object references. At most
// four serialized entries share a 32 MiB UTF-16 byte budget (2 * string.length).
// This bounds retained serialized payloads, not transient parsed objects or the
// JS engine heap. One oversized entry skips caching; validity is unchanged.
const verified=[];
const CACHE_BYTES=32*1024*1024;
let verifiedBytes=0;
function cachedPrefix(raw){
 const segmentKeys=raw.journal.segments.map(s=>JSON.stringify(s));
 let best,bestEncoded;
 for(const encoded of verified){
  const candidate=JSON.parse(encoded),n=candidate.segmentKeys.length;
  if(n>segmentKeys.length||!candidate.segmentKeys.every((key,i)=>key===segmentKeys[i]))continue;
  const next=n<segmentKeys.length?raw.journal.segments[n].actions:raw.history.slice(n?1:0);
  if(candidate.activeKeys.length>next.length||!candidate.activeKeys.every((key,i)=>key===JSON.stringify(next[i])))continue;
  if(!best||candidate.total>best.total){best=candidate;bestEncoded=encoded;}
 }
 if(bestEncoded!==undefined){const index=verified.indexOf(bestEncoded);verified.splice(index,1);verified.push(bestEncoded);}
 return best;
}
function cacheVerified(state){
 const value=JSON.stringify({domain:domain(state),total:state.journal.totalActions,
  segmentKeys:state.journal.segments.map(s=>JSON.stringify(s)),
  activeKeys:state.history.slice(state.journal.segments.length?1:0).map(a=>JSON.stringify(a))});
 const bytes=2*value.length;if(bytes>CACHE_BYTES)return;
 const found=verified.indexOf(value);if(found!==-1){verifiedBytes-=2*verified[found].length;verified.splice(found,1);}
 verified.push(value);verifiedBytes+=bytes;
 while(verified.length>4||verifiedBytes>CACHE_BYTES)verifiedBytes-=2*verified.shift().length;
}
export function validateSegmentedJournalShape(raw){
 if(!raw||raw.version!==2||!Array.isArray(raw.history)||raw.history.length>=LEDGER_SEGMENT_LENGTH||
  !keys(raw.journal,['version','segments','totalActions'])||raw.journal.version!==1||
  !Array.isArray(raw.journal.segments)||!Number.isSafeInteger(raw.journal.totalActions)||raw.journal.totalActions<0)error();
 // Cheap schema/count/context pass before any expensive economic replay.
 let count=0;
 for(let i=0;i<raw.journal.segments.length;i++){
  const seg=raw.journal.segments[i];
  if(!keys(seg,['kind','actions'])||!Array.isArray(seg.actions))error();
  if(seg.kind==='legacy'){
   if(i!==0||seg.actions.length<1||seg.actions.length>MAX_DEAL_ACTIONS)error();
  }else if(seg.kind==='actions'){
   if(seg.actions.length!==(i===0?LEDGER_SEGMENT_LENGTH:LEDGER_SEGMENT_LENGTH-1))error();
  }else error();
  count+=seg.actions.length;if(!Number.isSafeInteger(count))error();
 }
 if(raw.journal.segments.length){
  if(!raw.history.length||!equal(raw.history[0],raw.journal.segments.at(-1).actions.at(-1)))error();
 }
 count+=raw.history.length-(raw.journal.segments.length?1:0);
 if(count!==raw.journal.totalActions)error();
 return count;
}
// Explicit recovery derives all business fields solely from recorded events.
export function rebuildSegmentedDealRoom(raw){
 validateSegmentedJournalShape(raw);
 const cached=cachedPrefix(raw),start=cached?.segmentKeys.length||0;
 let state=cached?cached.domain:createDealRoom(),total=cached?.total||0;
 const segments=raw.journal.segments.slice(0,start).map(s=>freeze(copy(s)));
 for(let i=start;i<raw.journal.segments.length;i++){
  const seg=raw.journal.segments[i],skip=i===start?(cached?.activeKeys.length||0):0;
  for(const action of seg.actions.slice(skip)){const next=replayRecordedDeal(state,action);if(next===state)error();state=next;total++;}
  // Persisted event shape must itself be canonical, not merely replayable.
  const events=state.history.slice(i?1:0);
  if(!equal(events,seg.actions))error();
  segments.push(freeze(copy(seg)));
  state={...state,history:[copy(state.history.at(-1))]};
 }
 const skip=start===raw.journal.segments.length?(cached?.activeKeys.length||0):0;
 for(const action of raw.history.slice((segments.length?1:0)+skip)){
  const next=replayRecordedDeal(state,action);if(next===state)error();state=next;total++;
 }
 const expected=wrap(state,journal(segments,total));
 if(total!==raw.journal.totalActions)error();
 return expected;
}
export function normalizeSegmentedDealRoom(raw){
 const expected=rebuildSegmentedDealRoom(raw);
 if(!equal(expected,raw))error();
 cacheVerified(expected);
 return expected;
}
