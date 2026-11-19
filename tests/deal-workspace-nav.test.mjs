import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceNavView,workspaceOfficeView,bindWorkspaceNav} from '../src/deal-room-workspace-nav.js';

const day=()=>({day:1,cash:5000,phase:'negotiating',contracts:[]});
test('five visible workspace destinations, one current selection, and no economy action attributes',()=>{
 const keys=['office','inbox','orders','development','afterwork'],names=['办公室','询盘','订单','发展','下班'];
 for(const k of keys){
  const h=workspaceNavView(k);assert.deepEqual([...h.matchAll(/data-workspace-tab="([^"]+)"[^>]*>([^<]+)</g)].map(m=>[m[1],m[2]]),keys.map((x,i)=>[x,names[i]]));
  assert.equal((h.match(/aria-current="page"/g)||[]).length,1);assert.ok(h.includes('data-workspace-tab="'+k+'" aria-current="page"'));assert.doesNotMatch(h,/data-action|href=|ADVANCE|NEXT_DAY/);
 }
 assert.match(workspaceNavView('bad'),/data-workspace-tab="office" aria-current="page"/);
});
test('office puts the desk and real pending work before advice, then a collapsed ledger; upgrading and weather need explicit state',()=>{
 const s=day(),old=structuredClone(s),h=workspaceOfficeView(s);
 assert.ok(h.indexOf('class="ws-desk"')<h.indexOf('今日待办')&&h.indexOf('今日待办')<h.indexOf('工作建议')&&h.indexOf('工作建议')<h.indexOf('经营账本'));
 assert.match(h,/有询盘要回复/);assert.match(h,/data-workspace-open="inbox"/);assert.match(h,/经营账本 · 0 笔已结清/);
 assert.doesNotMatch(h,/<details[^>]+\bopen\b|ws-desk-window|晴天|雨天|¥0<\/strong>|六家|六店/);assert.deepEqual(s,old);
 const n=workspaceOfficeView({...s,officeImprovement:{id:'window-studio'}},{officeName:'城景 <office>',weather:'小雨',pending:[],advice:[{title:'看客户来信',detail:'A&B',tab:'inbox',ref:'opened:001'}]});
 assert.match(n,/ws-desk-window/);assert.match(n,/小雨/);assert.ok(n.includes('城景 &lt;office&gt;'));assert.ok(n.includes('A&amp;B'));assert.match(n,/data-workspace-ref="opened:001"/);assert.doesNotMatch(n,/有询盘要回复/);
});
test('current contracts and actual paid receipts are distinct: no double-counted active receipt, anticipated cash, or net-to-gross swap',()=>{
 const original={status:'paid',product:'台灯',clientName:'Mira',revenue:2400,cost:1800,netProfit:510};
 const unpaid={status:'receivable',product:'保温杯',clientName:'Samir',revenue:9000,cost:7000,balanceDue:6000,paymentDay:8};
 const market={status:'paid',buyer:'客户乙',productName:'托盘',quantity:40,delivered:40,received:1000,revenue:1000,cost:1100,netProfit:-190,paidDay:5};
 const s={...day(),phase:'review',day:6,contracts:[original,unpaid],marketHistory:[market,{...market,received:2},{...market,paidDay:11}],market:{status:'paid',active:market}};
 const h=workspaceOfficeView(s);assert.match(h,/待收尾款 · 保温杯/);assert.match(h,/第 8 天 · Samir · ¥6,000/);assert.match(h,/经营账本 · 2 笔已结清/);
 assert.match(h,/实际销售额<\/dt><dd>¥3,400/);assert.match(h,/直接成本<\/dt><dd>¥2,900/);assert.match(h,/销售毛利<\/dt><dd>¥500/);assert.match(h,/毛利率<\/dt><dd>14.7%/);assert.doesNotMatch(h,/¥9,000/);
 assert.match(h,/按商品看/);assert.match(h,/按客户看/);assert.match(h,/托盘/);assert.match(h,/客户乙/);
});
test('injected full-scope ledger safely groups only eligible records, supports losses, and excludes unsafe amounts',()=>{
 const s=day(),model={ledger:{scope:'已收款 <专项>',rows:[{product:'衣架',customer:'<甲>',sales:40,cost:80},{product:'衣架',customer:'<甲>',sales:10,cost:5},{product:'未收',customer:'乙',sales:999,cost:0,status:'receivable'},{product:'坏数',customer:'丙',sales:NaN,cost:1}]}};
 const h=workspaceOfficeView(s,model);assert.ok(h.includes('已收款 &lt;专项&gt;'));assert.ok(h.includes('&lt;甲&gt;'));assert.match(h,/经营账本 · 2 笔已结清/);assert.match(h,/毛利率<\/dt><dd>-70.0%/);assert.doesNotMatch(h,/未收<|坏数|999/);
});
test('keyboard browsing can move focus without navigating; an explicit destination click sends only a known tab and sanitized target',()=>{
 const mk=(dataset,current=false)=>({dataset,focused:false,listeners:{},getAttribute(n){return n==='aria-current'&&current?'page':null;},focus(){this.focused=true;},addEventListener(n,f){this.listeners[n]=f;}});
 const list=['office','inbox','orders','development','afterwork'].map((k,i)=>mk({workspaceTab:k},i===0)),extra=[mk({workspaceOpen:'inbox',workspaceRef:'opened:001'}),mk({workspaceOpen:'bogus'}),mk({workspaceOpen:'orders',workspaceRef:'<script>'})];
 const root={querySelectorAll:s=>s==='[data-workspace-tab]'?list:extra,querySelector:s=>list.find(b=>s.includes('"'+b.dataset.workspaceTab+'"'))};
 const calls=[];bindWorkspaceNav(root,(...args)=>calls.push(args));list[0].listeners.click();assert.equal(calls.length,0);
 list[0].listeners.keydown({key:'End',preventDefault(){}});assert.equal(list[4].focused,true);assert.equal(calls.length,0);
 list[4].listeners.click();extra.forEach(b=>b.listeners.click());assert.deepEqual(calls,[['afterwork',''],['inbox','opened:001'],['orders','']]);
});
