// Node-only observational timings, not browser/Windows acceptance.
// Run in a fresh process per size: node scripts/benchmark-deal-replay-cache.mjs 2000
import {performance} from 'node:perf_hooks';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {saveDealProgress,DEAL_SAVE_KEY} from '../src/deal-room-save.js';
const size=Number(process.argv[2]||2000);
if(!Number.isInteger(size)||size<10||size>4095)throw new Error('Use history length 10..4095');
let s=createDealRoom();
for(const optionId of ['trial','ready','small'])
 for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);
s=reduceDealRoom(s,{type:'BUY_LIFE_ITEM',itemId:'chair'});
// Retain the historical uncompressed journal, even on newer reducers that
// compact decoration tails. No financial/derived field is manufactured.
const arrange=x=>{
 const action={type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:x.personalLife.positions.chair==='window'?'inside':'window'};
 const next=reduceDealRoom(x,action);
 return {...next,history:[...x.history,action]};
};
while(s.history.length<size)s=arrange(s);
const result={actions:s.history.length,bytes:Buffer.byteLength(JSON.stringify(s))};
function timed(key,f){const start=performance.now();const value=f();result[key]=+(performance.now()-start).toFixed(2);return value;}
timed('coldNormalizeMs',()=>normalizeDealRoom(s));
timed('hotNormalizeMs',()=>normalizeDealRoom(s));
const grown=arrange(s);
timed('appendNormalizeMs',()=>normalizeDealRoom(grown));
const data=new Map([[DEAL_SAVE_KEY,JSON.stringify(s)]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
const saved=timed('hotSaveWithPreviousMs',()=>saveDealProgress(storage,grown));
if(!saved.ok)throw new Error(saved.error);
console.log(JSON.stringify(result));
