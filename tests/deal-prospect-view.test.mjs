import test from 'node:test';
import assert from 'node:assert/strict';
import {prospectInbox,prospectContentById} from '../src/deal-room-prospects.js';
import {previewMarket,applyMarketAction} from '../src/deal-room-market.js';
import {prospectInboxView,bindProspectInbox,prospectAdviserQuote,prospectReceiptContact} from '../src/deal-room-prospect-view.js';

const desk=()=>({phase:'market',day:1,cash:20000,market:{status:'draft',returnPhase:'review'},contracts:[{status:'paid'}]});
const scope=(s,ui={})=>prospectInboxView(s,ui);
const fieldKey=(row,unitPrice,optionId='quote',source='stock')=>({customerId:row.person.id,optionId,source,unitPrice});
const screen=(row,unitPrice,optionId='quote',source='stock')=>{
 const d=fieldKey(row,unitPrice,optionId,source);
 return {prospectId:d.customerId,prospectOption:d.optionId,prospectSource:d.source,prospectPrice:d.unitPrice,prospectAsked:JSON.stringify(d)};
};
test('prospect letters are paged and return to the desk without suggesting a paid sale',()=>{
 const s=desk(),list=prospectInbox(s),h=scope(s);
 assert.equal(list.length,5);assert.match(h,/新客每 7 天轮换一组，每组最多 5 封/);assert.match(h,/第 7 天回复。下一批从第 8 天开始/);assert.match(scope({...s,day:7}),/今天是本批新客回复的最后一天/);
 assert.equal((h.match(/data-prospect-open="/g)||[]).length,5);
 assert.doesNotMatch(h,/data-prospect-page=/);
 assert.ok(h.includes(list[0].person.organization)&&h.includes(list[0].product.name));
 assert.ok(h.includes(list[4].person.displayName));
 assert.equal(scope({...s,market:{status:'paid'}}),'');
 assert.ok(scope(s,{prospectId:'<misplaced-id>'}).includes('客户来信'));
});
test('a first quote explains both repeat delays, real settlement terms, and never publishes the buyer ceiling',()=>{
 const s=desk(),row=prospectInbox(s)[0],ui={prospectId:row.person.id},h=scope(s,ui);
 assert.ok(h.includes(row.opening));assert.match(h,/回到客户来信/);
 assert.match(h,/结清 7 天后可再询价/);assert.match(h,/结清 3 天后可再询价/);
 assert.ok(h.includes('验收当日付清'));assert.match(h,/data-prospect-sign disabled/);
 const sellerPrice=page=>Number(/id="prospect-unit-price"[^>]*value="(\d+)"/.exec(page)[1]);
 const concessionPage=scope(s,{...ui,prospectOption:'concession'});assert.equal(sellerPrice(concessionPage),Math.max(1,Math.floor(sellerPrice(h)*.95)));assert.ok(sellerPrice(concessionPage)<sellerPrice(h));
 const o=row.options.find(v=>v.id==='concession'),price=100000,request=screen(row,price,o.id),refused=scope(s,request);
 assert.ok(refused.includes('这个单价我这边接不了'));assert.match(refused,/data-prospect-sign disabled/);
 assert.ok(refused.includes(row.person.lines.bargain[0]));assert.doesNotMatch(refused,/预算.{0,12}[¥￥]|最高接受|按买方上限/);
 const adviser=prospectAdviserQuote(s,request);assert.equal(adviser.maxUnitPrice,undefined);assert.doesNotMatch(adviser.reason,/\d|上限/);
 assert.equal(prospectAdviserQuote(s,{}),null);
});
test('protected signature is distinct from asking a price; editing invalidates a previously approved quote',()=>{
 const s=desk(),row=prospectInbox(s)[0],price=row.options[0].maxUnitPrice,ui=screen(row,price);delete ui.prospectAsked;
 const listeners=new Map(),nodes=new Map(),actions=[];
 const root={querySelectorAll(){return [];},querySelector(key){
  if(!nodes.has(key))nodes.set(key,{value:String(price),hidden:false,disabled:false,focus(){},addEventListener(evt,fn){listeners.set(key+':'+evt,fn);}});
  return nodes.get(key);
 }};
 bindProspectInbox(root,s,ui,()=>{},a=>actions.push(a));
 const call=(sel,evt)=>listeners.get(sel+':'+evt)({preventDefault(){}});
 call('[data-prospect-sign]','click');assert.deepEqual(actions,[]);
 call('[data-prospect-form]','submit');assert.equal(actions.length,0);
 assert.doesNotMatch(scope(s,ui),/data-prospect-sign disabled/);
 root.querySelector('#prospect-unit-price').value=String(price-1);
 call('#prospect-unit-price','input');assert.equal(root.querySelector('[data-prospect-sign]').disabled,true);
 call('[data-prospect-sign]','click');assert.deepEqual(actions,[]);
 call('[data-prospect-form]','submit');call('[data-prospect-sign]','click');
 assert.deepEqual(actions,[{type:'SIGN_PROSPECT_LOT_V1',...fieldKey(row,price-1)}]);
});
test('receipt contact uses the signed buyer, handover instructions before delivery and a new request on the repeat',()=>{
 const s=desk(),row=prospectInbox(s)[0],o=row.options.find(x=>x.id==='concession'),d=fieldKey(row,o.maxUnitPrice,o.id);
 const q=previewMarket(s,d);assert.ok(q.valid,q.reason);
 let next=applyMarketAction(s,{type:'SIGN_PROSPECT_LOT_V1',...d}),signed=prospectReceiptContact(next);
 assert.ok(signed.includes(q.prospectVoice.delivery));assert.ok(!signed.includes(q.prospectVoice.settlement));
 next=applyMarketAction(next,{type:'DELIVER_MARKET'});assert.equal(next.market.status,'paid');
 const paid=prospectReceiptContact(next);assert.ok(paid.includes(q.prospectVoice.settlement));
 assert.equal(prospectReceiptContact({...next,market:{status:'paid',active:{buyer:'非本客户'}}}),'');
 const expired={...s,day:next.day+o.followupDays,marketHistory:next.marketHistory};
 const again=prospectInbox(expired).find(r=>r.person.id===row.person.id);assert.ok(again?.isRepeat);
 const h=scope(expired,{prospectId:row.person.id});
 assert.ok(h.includes(again.opening));assert.ok(!h.includes(row.opening));
 assert.ok(h.includes('上次已结清'));assert.ok(h.includes('熟客补货'));
 assert.match(h,/data-prospect-option="reorder"/);assert.doesNotMatch(h,/data-prospect-option="(?:quote|concession)"/);
 const nextWeek={...expired,day:Math.floor((expired.day-1)/7)*7+8};
 const list=scope(nextWeek),repeats=scope(nextWeek,{prospectFilter:'repeat'});
 assert.match(list,/data-prospect-page="1"/);assert.match(repeats,/熟客补货 1/);
 assert.ok(repeats.includes(row.person.displayName));assert.equal((repeats.match(/data-prospect-open="/g)||[]).length,1);
 const previous=again.previous;assert.ok(h.includes('第 '+previous.paidDay+' 天收齐'));
 assert.ok(h.includes('定金 '+again.options[0].depositPercent+'%'));assert.ok(h.includes('验收后 '+again.options[0].payLag+' 天付余款'));
 const person=prospectContentById(d.customerId);assert.ok(paid.includes(person.displayName)&&paid.includes(person.organization));
});
test('the back button restores focus to the originating letter without dispatching an action',()=>{
 const s=desk(),row=prospectInbox(s)[0],ui={prospectId:row.person.id},listeners={};
 let focus=0,render=0;
 const origin={dataset:{prospectOpen:row.person.id},addEventListener(){},focus(){focus++;}};
 const root={
  querySelectorAll(sel){return sel==='[data-prospect-open]'?[origin]:[];},
  querySelector(sel){return sel==='[data-prospect-back]'?{addEventListener(_,fn){listeners.back=fn;}}:null;}
 };
 bindProspectInbox(root,s,ui,()=>{render++;},()=>assert.fail('browsing must not spend cash or advance a day'));
 listeners.back();assert.equal(render,1);assert.equal(focus,1);assert.equal(ui.prospectId,undefined);
});
test('unknown-contact fallback and saved receipt dialogue do not inject imported markup',()=>{
 const state={market:{status:'paid',active:{customerId:'bad-id',buyer:'<script>buyer</script>',prospectVoice:{settlement:'<img src=x onerror=alert(1)>'}}}};
 const h=prospectReceiptContact(state);
 assert.ok(h.includes('prospect-letter-tile'));assert.ok(h.includes('&lt;script&gt;buyer&lt;/script&gt;'));
 assert.ok(h.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.doesNotMatch(h,/<script>|<img src=x/);
});
