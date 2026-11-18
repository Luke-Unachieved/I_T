import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,careerOpportunity} from '../src/deal-room-engine.js';
import {linenFreightInvite,linenFreightView,linenFreightQuote} from '../src/deal-room-linen-freight.js';
import {businessHomeView} from '../src/deal-room-home.js';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import vm from 'node:vm';
const a=(s,type,args={})=>{let n=reduceDealRoom(s,{type,...args});assert.notEqual(n,s,type);return n;};
const closeOrder=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function home(){let s=createDealRoom();for(const id of ['trial','ready','season'])s=closeOrder(s,id);assert.equal(linenFreightInvite(s),'');s=a(s,'CONTINUE_BUSINESS');for(const clientId of ['ines','samir'])s=closeOrder(a(s,'SELECT_CLIENT',{clientId}),'repeat-small');return s;}
test('a settled repeat linen partner introduces a fixed Lisbon order: one slower high-margin shipment or funded early partial delivery',()=>{
 const h=home(),original=structuredClone(h);assert.match(linenFreightInvite(h),/100 条/);
 const d=a(h,'OPEN_LINEN_FREIGHT');assert.equal(a(d,'CLOSE_LINEN_FREIGHT').cash,h.cash);
 for(const mode of ['groupage','split']){const split=mode==='split',q=linenFreightQuote(d,mode);assert.equal(q.netProfit,split?960:1170);assert.equal(q.required,split?2698:2470);let s=a(d,split?'SIGN_LINEN_SPLIT':'SIGN_LINEN_GROUPAGE');assert.equal(s.cash,h.cash+q.deposit-q.cost);assert.equal(s.linenFreight.delivered,0);
  s=a(s,'RECEIVE_LINEN_FREIGHT');if(split){assert.equal(s.linenFreight.delivered,20);assert.equal(s.day,h.day+3);assert.equal(s.linenFreight.received,2528);assert.equal(s.cash,h.cash+1632-4240-90+896);assert.match(linenFreightView(s),/在途 80 条/);assert.deepEqual(normalizeDealRoom(s),s);s=a(s,'RECEIVE_LINEN_FREIGHT');}
  assert.equal(s.day,h.day+(split?8:12));assert.equal(s.cash,h.cash+q.netProfit);assert.equal(s.linenFreight.received,q.revenue);assert.equal(s.linenFreight.delivered,100);assert.equal(reduceDealRoom(s,{type:'RECEIVE_LINEN_FREIGHT'}),s);
  s=a(s,'CLOSE_LINEN_FREIGHT');assert.deepEqual(s.contracts,h.contracts);assert.deepEqual(normalizeDealRoom(s),s);const reopened=a(s,'OPEN_LINEN_FREIGHT');assert.equal(reduceDealRoom(reopened,{type:'SIGN_LINEN_SPLIT'}),reopened);
  const display=businessHomeView(s,{career:careerOpportunity(s),referrals:[]});assert.ok(display.includes((s.cash-5000).toLocaleString('zh-CN')));
 }
 assert.deepEqual(h,original);
});
test('the offline bundle exposes both quotes; an at-risk budget cannot commit or use future receipts before they clear',async()=>{
 const d=a(home(),'OPEN_LINEN_FREIGHT'),poor={...d,cash:2697};assert.equal(linenFreightQuote(poor,'groupage').valid,true);assert.equal(linenFreightQuote(poor,'split').valid,false);assert.equal(reduceDealRoom(poor,{type:'SIGN_LINEN_SPLIT'}),poor);
 const html=await buildDealHtml(),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];const root={innerHTML:'',querySelector(){return null;},querySelectorAll(){return [];}};
 new vm.Script(script).runInNewContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k.endsWith(':reduced-motion')?null:JSON.stringify(d),setItem(){}},TextEncoder,structuredClone,console},{timeout:2500});
 assert.match(root.innerHTML,/西班牙集货仓 → 里斯本/);assert.match(root.innerHTML,/SIGN_LINEN_GROUPAGE/);assert.match(root.innerHTML,/SIGN_LINEN_SPLIT/);
});
