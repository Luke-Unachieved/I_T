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
 return wrap({...s,history:[copy(s.history.at(-1))]},journal([segment],s.history.length));
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
export function normalizeSegmentedDealRoom(raw){
 if(!raw||raw.version!==2||!Array.isArray(raw.history)||raw.history.length>=LEDGER_SEGMENT_LENGTH||
  !keys(raw.journal,['version','segments','totalActions'])||raw.journal.version!==1||
  !Array.isArray(raw.journal.segments)||!Number.isSafeInteger(raw.journal.totalActions)||raw.journal.totalActions<0)error();
 let state=createDealRoom(),total=0;
 const segments=[];
 for(let i=0;i<raw.journal.segments.length;i++){
  const seg=raw.journal.segments[i];
  if(!keys(seg,['kind','actions'])||!Array.isArray(seg.actions))error();
  if(seg.kind==='legacy'){
   if(i!==0||seg.actions.length<1||seg.actions.length>MAX_DEAL_ACTIONS)error();
  }else if(seg.kind==='actions'){
   if(seg.actions.length!==(i===0?LEDGER_SEGMENT_LENGTH:LEDGER_SEGMENT_LENGTH-1))error();
  }else error();
  for(const action of seg.actions){const next=replayRecordedDeal(state,action);if(next===state)error();state=next;total++;}
  // Persisted event shape must itself be canonical, not merely replayable.
  const events=state.history.slice(i?1:0);
  if(!equal(events,seg.actions))error();
  segments.push(freeze(copy(seg)));
  state={...state,history:[copy(state.history.at(-1))]};
 }
 if(segments.length){
  if(!raw.history.length||!equal(raw.history[0],state.history[0]))error();
 }
 for(const action of raw.history.slice(segments.length?1:0)){
  const next=replayRecordedDeal(state,action);if(next===state)error();state=next;total++;
 }
 const expected=wrap(state,journal(segments,total));
 if(total!==raw.journal.totalActions||!equal(expected,raw))error();
 return expected;
}
