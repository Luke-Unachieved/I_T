import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,previewOffer,reduceDealRoom,quoteOptions} from '../src/deal-room-engine.js';
import {quoteCommitmentView,quoteOptionExplanation} from '../src/deal-room-quote-view.js';
const finish=(s,id)=>reduceDealRoom(reduceDealRoom(reduceDealRoom(s,{type:'PROPOSE',optionId:id}),{type:'ADVANCE'}),{type:'NEXT_CLIENT'});
test('quote clearly declares actual signing and separates price, outlay, cash and projected gain',()=>{
 const s=createDealRoom(),before=structuredClone(s),q=previewOffer(s,'trial'),html=quoteCommitmentView(s,q);
 assert.match(html,/签下这单/);assert.doesNotMatch(html,/不是只发送询价/);assert.match(html,/这单货款/);assert.match(html,/¥2,400/);assert.doesNotMatch(html,/你先垫付|客户先付定金/);assert.match(html,/现在要付/);assert.match(html,/¥1,800/);assert.match(html,/¥3,200/);assert.match(html,/预计赚到/);assert.match(html,/¥510/);assert.doesNotMatch(html,/尚未实现/);assert.deepEqual(s,before);
 const signed=reduceDealRoom(s,{type:'PROPOSE',optionId:q.id});assert.equal(signed.cash,q.cashAfterSigning);assert.equal(signed.phase,'fulfilling');assert.equal(signed.contracts.length,1);assert.equal(reduceDealRoom(signed,{type:'PROPOSE',optionId:q.id}),signed);
});
test('deposit does not get confused with full contract revenue or net outlay',()=>{
 const s=finish(finish(createDealRoom(),'trial'),'ready'),q=previewOffer(s,'season'),html=quoteCommitmentView(s,q);
 assert.equal(q.deposit,1860);assert.match(html,/你先垫付/);assert.match(html,/客户先付定金/);assert.match(html,/¥1,860/);assert.match(html,/¥2,440/);assert.match(html,/¥4,340/);const signed=reduceDealRoom(s,{type:'PROPOSE',optionId:q.id});assert.equal(signed.cash,s.cash+1860-4300);
});
test('rejected quote only solicits a reply and never promises signing',()=>{
 const s=finish(createDealRoom(),'trial'),q=previewOffer(s,'promise'),html=quoteCommitmentView(s,q,{counterMessage:'<img src=x onerror=alert(1)>'});
 assert.match(html,/这一步不花钱/);assert.doesNotMatch(html,/签下这单/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);const next=reduceDealRoom(s,{type:'PROPOSE',optionId:q.id});assert.equal(next.cash,s.cash);assert.equal(next.contracts.length,s.contracts.length);
});
test('first customer speaks about her own terms, not unseen next buyers',()=>{
 const s=createDealRoom();for(const q of quoteOptions(s)){const t=quoteOptionExplanation(s,q);assert.match(t,/Mira：/);assert.doesNotMatch(t,/下位客户|开业/);}assert.equal(quoteOptionExplanation({...s,businessRound:1},{id:'repeat-small',exchange:'原有回访条件'}),'原有回访条件');
});
test('invalid funds keep signing disabled, and text is escaped',()=>{
 const s={...createDealRoom(),cash:0},q=previewOffer(s,'trial');assert.match(quoteCommitmentView(s,q),/data-action="PROPOSE" disabled/);assert.match(quoteCommitmentView(s,{...q,reason:'<script>x</script>'}),/&lt;script/);
});
test('unknown projected cash does not become a fake zero balance',()=>{
 const s=createDealRoom(),q=previewOffer(s,'trial'),html=quoteCommitmentView(s,{...q,cashAfterPayment:null},{roundActive:true});assert.match(html,/预计可用现金 待确认/);assert.match(html,/仅做这单预计花费的/);assert.doesNotMatch(html,/本单分摊/);
});

test('first buyer brief uses buyer voice, later briefs preserved', async () => {
 const {quoteBuyerBrief}=await import('../src/deal-room-quote-view.js');
 assert.match(quoteBuyerBrief({clientIndex:0},{id:'mira',brief:'original'}),/我想先/);
 assert.equal(quoteBuyerBrief({clientIndex:1},{id:'samir',brief:'original'}),'original');
});

test('return-order comparison exposes replenishment timing before signing without spoiling first buyers',()=>{let s=finish(finish(finish(createDealRoom(),'trial'),'ready'),'season');s=reduceDealRoom(s,{type:'CONTINUE_BUSINESS'});s=reduceDealRoom(s,{type:'SELECT_CLIENT',clientId:'mira'});const q=previewOffer(s,'repeat-small'),before=structuredClone(s);assert.match(quoteCommitmentView(s,{...q,opportunityNote:'这批约供门店卖 19 天；预计第 53 天再补货。'}),/接下这单后的安排[\s\S]*19 天[\s\S]*53 天/);assert.deepEqual(s,before);const first=createDealRoom();assert.doesNotMatch(quoteCommitmentView(first,previewOffer(first,'rollout')),/下一位客户|开业批/);assert.match(quoteCommitmentView({...s,clientProjectActive:true},{...q,opportunityNote:'<危险>'}),/&lt;危险&gt;/);});

test('real demand-led quotes show different shelf coverage for small and large replenishment',()=>{const a=(s,type,x={})=>reduceDealRoom(s,{type,...x});let s=finish(finish(finish(createDealRoom(),'trial'),'ready'),'season');s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++){s=a(s,'SELECT_CLIENT',{clientId:'mira'});s=finish(s,'repeat-small');}s=a(a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');s=a(a(s,'CONTINUE_RETAIL_BUSINESS'),'SELECT_CLIENT',{clientId:'mira'});const small=previewOffer(s,'repeat-small'),large=previewOffer(s,'repeat-scale');assert.match(quoteCommitmentView(s,small),/约供门店卖 8 天/);assert.match(quoteCommitmentView(s,large),/约供门店卖 19 天/);assert.ok(large.netProfit>small.netProfit);assert.match(quoteCommitmentView(s,large),/期间可换客户或经营其他业务/);});

test('full prepayment proposal never invents delivery-day receipt or signing cash',()=>{
 const s=finish(finish(createDealRoom(),'trial'),'ready'),before=structuredClone(s),q=previewOffer(s,'all-now');
 const html=quoteCommitmentView(s,q);
 assert.match(html,/全款预付/);assert.match(html,/条件还没谈妥/);assert.doesNotMatch(html,/签完还剩|收齐货款|现在要付|预计赚到|待收尾款/);
 const rejected=reduceDealRoom(s,{type:'PROPOSE',optionId:'all-now'});
 assert.equal(rejected.cash,s.cash);assert.equal(rejected.day,s.day);assert.deepEqual(rejected.contracts,s.contracts);assert.deepEqual(s,before);
 const accepted=quoteCommitmentView(rejected,previewOffer(rejected,'season'));
 assert.match(accepted,/客户先付定金/);assert.match(accepted,/收齐货款/);
});
