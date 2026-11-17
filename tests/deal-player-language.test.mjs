import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,previewCuration,previewOffer} from '../src/deal-room-engine.js';
import {curationView} from '../src/deal-room-curation-view.js';
import {quoteCommitmentView} from '../src/deal-room-quote-view.js';
const finish=(s,id)=>[{type:'PROPOSE',optionId:id},{type:'ADVANCE'},{type:'NEXT_CLIENT'}].reduce(reduceDealRoom,s);
test('player quote shows commitments without QA or internal-state explanations',()=>{
 const s=createDealRoom(),h=quoteCommitmentView(s,previewOffer(s,'trial'));
 for(const phrase of ['这单货款','现在要付','签完还剩','预计赚到','签下这单','¥2,400','¥1,800','¥3,200','¥510'])assert.ok(h.includes(phrase),phrase);
 for(const phrase of ['不是此刻到账金额','不能当作当前余额','不是只发送询价','尚未实现','签约与资金明细规则'])assert.ok(!h.includes(phrase),phrase);
});
test('curation signing states real deposit, spending and remaining cash before commitment',()=>{
 let s=['trial','ready','season'].reduce(finish,createDealRoom());s=reduceDealRoom(s,{type:'START_OPENING_CURATION',clientId:'mira'});
 const draft={products:['mira','samir','ines'],quantity:40,packaging:'gift'},q=previewCuration(s,draft),h=curationView(s.curation,draft,q),before=structuredClone(s);
 assert.equal(s.cash,8520);assert.equal(q.revenue,6280);assert.equal(q.deposit,3140);assert.equal(q.cost,3520);assert.equal(q.cashAfterSigning,8140);
 for(const value of ['¥6,280','¥3,140','¥3,520','¥380','¥8,140','预计赚到','签下这单','data-action="SIGN_CURATION"'])assert.ok(h.includes(value),value);
 assert.doesNotMatch(h,/把这组搭配交给买手|这组净赚/);assert.deepEqual(s,before);
 const signed=reduceDealRoom(s,{type:'SIGN_CURATION',...draft});assert.equal(signed.cash,q.cashAfterSigning);assert.equal(signed.phase,'curation-fulfillment');
});

test('historical status wording is only rewritten at display time',async()=>{
 const {playerStatusText}=await import('../src/deal-room-curation-view.js');
 const saved='未签约，资金和日期保持不变。';assert.equal(playerStatusText(saved),'这份采购先放一放。');assert.equal(saved,'未签约，资金和日期保持不变。');
 assert.equal(playerStatusText('靠窗的阅读椅送到了家里。花了 ¥800，这是个人消费，不会提高订单收益。'),'靠窗的阅读椅送到了家里。花了 ¥800。');
 assert.equal(playerStatusText('原系列仅供Atelier，不可供给其他买手。'),'原系列仅供Atelier，不可供给其他买手。');
});

test('unaffordable offers show the shortfall, never suggest overdraft',()=>{
 const s={...createDealRoom(),cash:0},q=previewOffer(s,'trial'),h=quoteCommitmentView(s,q);assert.match(h,/还差/);assert.match(h,/¥1,800/);assert.doesNotMatch(h,/¥-1,800/);assert.match(h,/data-action="PROPOSE" disabled/);
});

test('new lamp buyer language follows the selected sample, not prior specifications',async()=>{
 const {quoteBuyerBrief,quoteOptionExplanation}=await import('../src/deal-room-quote-view.js');
 const client={id:'mira',brief:'沿用已确认规格'};
 assert.match(quoteBuyerBrief({productDevelopment:{factory:'studio'}},client,'developed-lamp'),/调光灯/);
 assert.match(quoteBuyerBrief({productDevelopment:{factory:'line'}},client,'developed-lamp'),/暖光灯/);
 assert.doesNotMatch(quoteBuyerBrief({productDevelopment:{factory:'studio'}},client,'developed-lamp'),/沿用已确认规格/);
 assert.equal(quoteOptionExplanation({businessRound:1},{exchange:'本次总净赚较少。'}),'这单预计赚得较少。');
});
