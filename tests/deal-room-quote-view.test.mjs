import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,previewOffer,reduceDealRoom,quoteOptions} from '../src/deal-room-engine.js';
import {quoteCommitmentView,quoteOptionExplanation} from '../src/deal-room-quote-view.js';
const finish=(s,id)=>reduceDealRoom(reduceDealRoom(reduceDealRoom(s,{type:'PROPOSE',optionId:id}),{type:'ADVANCE'}),{type:'NEXT_CLIENT'});
test('quote clearly declares actual signing and separates price, outlay, cash and projected gain',()=>{
 const s=createDealRoom(),before=structuredClone(s),q=previewOffer(s,'trial'),html=quoteCommitmentView(s,q);
 assert.match(html,/确认签约并安排备货/);assert.match(html,/不是只发送询价/);assert.match(html,/合同总价/);assert.match(html,/¥2,400/);assert.match(html,/本次净垫资/);assert.match(html,/¥1,800/);assert.match(html,/¥3,200/);assert.match(html,/预计净收益/);assert.match(html,/¥510/);assert.match(html,/尚未实现/);assert.deepEqual(s,before);
 const signed=reduceDealRoom(s,{type:'PROPOSE',optionId:q.id});assert.equal(signed.cash,q.cashAfterSigning);assert.equal(signed.phase,'fulfilling');assert.equal(signed.contracts.length,1);assert.equal(reduceDealRoom(signed,{type:'PROPOSE',optionId:q.id}),signed);
});
test('deposit does not get confused with full contract revenue or net outlay',()=>{
 const s=finish(finish(createDealRoom(),'trial'),'ready'),q=previewOffer(s,'season'),html=quoteCommitmentView(s,q);
 assert.equal(q.deposit,1860);assert.match(html,/¥1,860/);assert.match(html,/¥2,440/);assert.match(html,/¥4,340/);const signed=reduceDealRoom(s,{type:'PROPOSE',optionId:q.id});assert.equal(signed.cash,s.cash+1860-4300);
});
test('rejected quote only solicits a reply and never promises signing',()=>{
 const s=finish(createDealRoom(),'trial'),q=previewOffer(s,'promise'),html=quoteCommitmentView(s,q,{counterMessage:'<img src=x onerror=alert(1)>'});
 assert.match(html,/不会签约或扣款/);assert.doesNotMatch(html,/确认签约并安排备货/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);const next=reduceDealRoom(s,{type:'PROPOSE',optionId:q.id});assert.equal(next.cash,s.cash);assert.equal(next.contracts.length,s.contracts.length);
});
test('first customer speaks about her own terms, not unseen next buyers',()=>{
 const s=createDealRoom();for(const q of quoteOptions(s)){const t=quoteOptionExplanation(s,q);assert.match(t,/Mira：/);assert.doesNotMatch(t,/下位客户|开业/);}assert.equal(quoteOptionExplanation({...s,businessRound:1},{id:'repeat-small',exchange:'原有回访条件'}),'原有回访条件');
});
test('invalid funds keep signing disabled, and text is escaped',()=>{
 const s={...createDealRoom(),cash:0},q=previewOffer(s,'trial');assert.match(quoteCommitmentView(s,q),/data-action="PROPOSE" disabled/);assert.match(quoteCommitmentView(s,{...q,reason:'<script>x</script>'}),/&lt;script/);
});
test('unknown projected cash does not become a fake zero balance',()=>{
 const s=createDealRoom(),q=previewOffer(s,'trial'),html=quoteCommitmentView(s,{...q,cashAfterPayment:null},{roundActive:true});assert.match(html,/预计可用现金 待确认/);assert.match(html,/单独做本单预计净收益/);assert.doesNotMatch(html,/本单分摊/);
});

test('first buyer brief uses buyer voice, later briefs preserved', async () => {
 const {quoteBuyerBrief}=await import('../src/deal-room-quote-view.js');
 assert.match(quoteBuyerBrief({clientIndex:0},{id:'mira',brief:'original'}),/我想先/);
 assert.equal(quoteBuyerBrief({clientIndex:1},{id:'samir',brief:'original'}),'original');
});
