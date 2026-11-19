import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyView,propertyEntriesView,bindPropertyView,bindPropertyEntries} from '../src/deal-room-property-view.js';
import {applyPropertyAction,PROPERTY_CATALOG} from '../src/deal-room-property.js';
const fresh=(cash=600000)=>({cash,day:20,fame:4});
const buy=(s,id)=>applyPropertyAction(s,{type:'BUY_PROPERTY',assetId:id});
const money=n=>'¥'+n.toLocaleString('zh-CN');
const mk=(state=fresh(),kind='office')=>{
  let s=state,html='',nodes=new Map(),opens=[],calls=[],exits=[],renders=0;
  const ui={kind},mkNode=(data={})=>({dataset:data,events:{},focus(){},addEventListener(k,fn){this.events[k]=fn;}});
  const root={querySelector(sel){return nodes.get(sel)||null;},querySelectorAll(sel){return sel==='[data-pv-open]'?opens:[];}};
  const render=()=>{renders++;html=propertyView(s,ui);nodes=new Map();opens=[];
    for(const name of ['heading','exit','list','trade','review','cancel','confirm','switch']){
      if(new RegExp('data-pv-'+name+'(?:[\\s=>])').test(html))nodes.set('[data-pv-'+name+']',mkNode());
    }
    for(const match of html.matchAll(/data-pv-open="([^"]+)"/g)){
      const b=mkNode({pvOpen:match[1]});opens.push(b);nodes.set('[data-pv-open="'+match[1]+'"]',b);}
    bindPropertyView(root,s,ui,{render,dispatch(a){calls.push(a);s=applyPropertyAction(s,a);render();},onBack:p=>exits.push(p),getState:()=>s});};
  render();
  return {ui,calls,exits,get html(){return html;},get state(){return s;},get renders(){return renders;},
    open:id=>nodes.get('[data-pv-open="'+id+'"]').events.click(),click:key=>nodes.get('[data-pv-'+key+']').events.click(),
    change:(id)=>nodes.get('[data-pv-trade]').events.change({currentTarget:{value:id}}),
    beforeDoubleClick:key=>nodes.get('[data-pv-'+key+']').events.click,
    replaceState:ns=>{s=ns;}};
};
test('dedicated development and off-work entries open only one category; owning a vehicle relabels the dealership',()=>{
  const s=fresh(),h=propertyEntriesView(s,'development'),off=propertyEntriesView(s,'offwork');
  assert.match(h,/挑间办公室/);assert.doesNotMatch(h,/房产|车行/);assert.match(off,/房产/);assert.match(off,/车行/);
  assert.match(propertyEntriesView(buy(s,'car-hatch'),'offwork'),/车库/);assert.equal(propertyEntriesView(s,'orders'),'');
  const handlers=[],routes=[];bindPropertyEntries({querySelectorAll:()=>['home','office','other'].map(k=>({dataset:{propertyEnter:k},addEventListener:(_,fn)=>handlers.push(fn)}))},k=>routes.push(k));
  handlers.forEach(fn=>fn());assert.deepEqual(routes,['home','office']);
});
test('catalogue uses real prices and names, no invented artwork, invalid strings never become HTML images',()=>{
  const s=fresh(5000000);
  for(const k of ['office','home','car']){
    const data=PROPERTY_CATALOG.filter(x=>x.kind===k),h=propertyView(s,{kind:k},{artById:{'car-wagon':'https://bad.example/x.jpg','office-window':'assets/../../secret.jpg','home-flat':'javascript:<x>'}});
    assert.equal((h.match(/data-pv-open=/g)||[]).length,data.length);assert.doesNotMatch(h,/<img|确认购买|data-pv-confirm/);
    for(const r of data){assert.ok(h.includes(r.name));if(r.price)assert.ok(h.includes(money(r.price)));}
  }
  const item='office-window',h=propertyView(s,{kind:'office',assetId:item},{artById:{[item]:'assets/known/office.webp'}});
  assert.match(h,/src="assets\/known\/office.webp"/);
  assert.equal(propertyView(s,{kind:'constructor',assetId:'<img>'}),'');
});
test('office preview is free; only final confirmation dispatches, and first purchase visibly changes ownership',()=>{
  const m=mk();m.open('office-sky');assert.match(m.html,/付完还剩.*¥172,000/);assert.match(m.html,/4 → 9 \/ 100/);
  assert.equal(m.calls.length,0);m.click('review');assert.ok(m.html.includes('确认购买，支付 ¥428,000'));
  m.click('cancel');assert.equal(m.calls.length,0);m.click('review');const fire=m.beforeDoubleClick('confirm');fire();fire();
  assert.deepEqual(m.calls,[{type:'BUY_PROPERTY',assetId:'office-sky'}]);assert.match(m.html,/正在使用/);
  assert.equal(m.state.cash,172000);assert.equal(m.state.fame,9);m.click('list');m.click('exit');assert.deepEqual(m.exits,['development']);
});
test('car/home keep is default; choice of one eligible receipt is explicit and the actual amount is reconfirmed',()=>{
  const m=mk(buy(fresh(),'home-flat'),'home');m.open('home-harbor');
  assert.match(m.html,/option value="" selected>保留名下的房子/);assert.match(m.html,/原实付 ¥24,800，本次可抵 ¥17,360/);
  assert.doesNotMatch(m.html,/option value="home-starter"/);assert.match(m.html,/这次要付.*¥108,000/);
  m.change('home-flat');assert.match(m.html,/当初实付的 70%/);assert.match(m.html,/这次要付.*¥90,640/);
  m.click('review');assert.match(m.html,/旧公寓 将从你名下转出/);assert.match(m.html,/确认置换，支付 ¥90,640/);
  m.click('confirm');assert.deepEqual(m.calls,[{type:'TRADE_IN_PROPERTY',assetId:'home-harbor',tradeInId:'home-flat'}]);
  m.click('list');m.click('exit');assert.deepEqual(m.exits,['offwork']);
});
test('switching an already owned home is free and never offers repurchase',()=>{
  const s=buy(buy(fresh(),'home-flat'),'home-harbor'),m=mk(s,'home');m.open('home-flat');
  assert.match(m.html,/原实付.*¥24,800/);assert.match(m.html,/搬到这里住（免费）/);assert.doesNotMatch(m.html,/data-pv-review|data-pv-confirm/);
  m.click('switch');assert.deepEqual(m.calls,[{type:'SWITCH_PROPERTY',assetId:'home-flat'}]);assert.equal(m.state.cash,s.cash);
  assert.equal(m.state.fame,s.fame);assert.match(m.html,/现在住在这里/);
});
test('camper without established price cannot submit, and insufficient funds clearly show the exact shortfall',()=>{
  const m=mk(fresh(4000),'car');m.open('car-camper');assert.match(m.html,/暂未开售/);assert.doesNotMatch(m.html,/data-pv-review|data-pv-confirm|¥0/);
  m.click('list');m.open('car-super');assert.match(m.html,/还差.*¥2,776,000/);
  assert.doesNotMatch(m.html,/data-pv-review|data-pv-confirm/);m.click('list');m.click('exit');assert.deepEqual(m.exits,['offwork']);
});
test('a stale confirmation cannot commit changed finances or a different trade quote',()=>{
  const m=mk();m.open('office-yard');m.click('review');const f=m.beforeDoubleClick('confirm');
  m.replaceState({...m.state,cash:m.state.cash-1});f();assert.equal(m.calls.length,0);assert.match(m.html,/核对购买/);
  const c=mk(buy(fresh(),'car-hatch'),'car');c.open('car-wagon');c.change('car-hatch');c.click('review');
  c.ui.tradeInId=null;c.click('confirm');assert.equal(c.calls.length,0);assert.match(c.html,/这次要付.*¥18,800/);
});
