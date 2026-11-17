import test from 'node:test';import assert from 'node:assert/strict';
import {studioProjectView} from '../src/deal-room-studio-project-view.js';
const spec=(briefId)=>({direction:'group',briefId,status:'approved',lampVersion:briefId==='bedside'?'developed':'standard',light:briefId==='bedside'?'soft':'reading',layout:'table',referrerId:'samir',products:briefId==='bedside'?['mira','samir']:['samir','ines']});
function fixture(current='bedside'){
 return {day:159,cash:61700,history:[],feedback:{},collection:{model:'own',style:'botanical',products:['mira','samir','ines'],orders:[{status:'paid',buyerId:'atelier',scope:'nonexclusive'}]},curationHistory:['mira','samir'].map(referrerId=>({referrerId,status:'paid',products:['mira','samir','ines'],packaging:'plain',buyer:referrerId})),caseGrowthHistory:[{status:'paid',agreement:'portfolio',referrerId:'mira',designVersion:'original',purpose:'studio-series',products:['mira','samir','ines'],quantity:40,deliveryDay:90},{status:'paid',agreement:'private',referrerId:'samir',products:['mira','samir','ines'],quantity:60,deliveryDay:90},{status:'paid',agreement:'private',referrerId:'samir',purpose:'studio-project',studioDirection:'group',studioBrief:'bedside',products:['mira','samir'],quantity:64,deliveryDay:152}],productDevelopment:{status:'active',factory:'studio'},studioProject:spec(current),groupProjectSpecs:{bedside:spec('bedside'),welcome:spec('welcome')}};
}
const comparison=html=>html.match(/<small class="group-spec-comparison">([\s\S]*?)<\/small>/)?.[1];
test('alternate approved welcome quote uses its own ready cup/linen stock, not bedside lamp delay',()=>{
 const s=fixture(),before=structuredClone(s),text=comparison(studioProjectView(s));assert.match(text,/现在可采购/);assert.match(text,/¥2,250/);assert.match(text,/第 164 天收齐/);assert.match(text,/尚未签约/);assert.doesNotMatch(text,/台灯还余|等至/);assert.deepEqual(s,before);
});
test('alternate already-delivered bedside shows use record rather than a new automatic consumption quote',()=>{
 const s=fixture('welcome'),before=structuredClone(s),text=comparison(studioProjectView(s));assert.match(text,/已用于客户场所/);assert.match(text,/不重复采购/);assert.doesNotMatch(text,/台灯还余|等至|收齐|净赚|现在可采购/);assert.deepEqual(s,before);
});
test('unconfirmed or invalid second specification never gains a quote comparison',()=>{
 for(const mutate of [s=>delete s.groupProjectSpecs.welcome,s=>s.groupProjectSpecs.welcome.status='draft',s=>s.groupProjectSpecs.welcome.referrerId='ines']){const s=fixture();mutate(s);assert.equal(comparison(studioProjectView(s)),undefined);}
 const s=fixture();s.cash=0;const text=comparison(studioProjectView(s));assert.match(text,/资金不足/);assert.doesNotMatch(text,/现在可采购/);
});
