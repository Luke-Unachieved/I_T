import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as engine from '../src/rework-opening.js';
const source=fs.readFileSync(new URL('../src/rework-app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'').replaceAll('import.meta.url',JSON.stringify('https://game.invalid/src/rework-app.js'));
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};}
function boot(search,local,session,art=null){const events={},root={innerHTML:'',addEventListener:(type,fn)=>events[type]=fn};vm.runInNewContext(source,{...engine,structuredClone,URL,URLSearchParams,location:{search},document:{querySelector:()=>root},localStorage:local,sessionStorage:session,fetch:()=>art?Promise.resolve({ok:true,text:()=>Promise.resolve(art)}):Promise.reject(new Error('No art needed for storage test')),confirm:()=>true});return {root,act:(action,id,extra={})=>events.click({target:{closest:()=>({dataset:{action,id,...extra}})}})}}
test('trial tabs never read or overwrite normal progress; refresh keeps only that tab trial',()=>{
 const local=storage(),a=storage(),b=storage();const old=engine.createOpeningGame();old.cash=4321;local.setItem(engine.STORAGE_KEY,JSON.stringify(old));const before=local.getItem(engine.STORAGE_KEY);
 const first=boot('?trial=1',local,a);assert.match(first.root.innerHTML,/1,800/);first.act('PURCHASE','quick');assert.equal(local.getItem(engine.STORAGE_KEY),before);assert.equal(JSON.parse(a.getItem(engine.STORAGE_KEY+':trial')).cash,1400);
 assert.match(boot('?trial=1',local,a).root.innerHTML,/1,400/);assert.match(boot('?trial=1',local,b).root.innerHTML,/1,800/);assert.match(boot('',local,b).root.innerHTML,/4,321/);
});
test('storage failure is reported without stopping the in-memory game',()=>{
 const broken={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};const app=boot('?trial=1',broken,broken);app.act('PURCHASE','quick');assert.match(app.root.innerHTML,/1,400/);assert.match(app.root.innerHTML,/浏览器没有保存这次进度/);app.act('dismiss');app.act('back');assert.match(app.root.innerHTML,/role="alert"[^>]*>浏览器没有保存这次进度/);
});
test('open contracts show the real latest quote movement and explicit relative deadline',()=>{
 let s=engine.createOpeningGame();const local=storage();for(const type of ['PURCHASE','SHIP','DELIVER'])s=engine.reduceOpening(s,{type,orderId:'quick',route:'sea'}).state;
 local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());assert.match(app.root.innerHTML,/本批毛利 ↑ \+¥100/);assert.match(app.root.innerHTML,/本批毛利 ↓ −¥120/);assert.match(app.root.innerHTML,/接单后 2 天内交付/);
 app.act('PURCHASE','urgent');assert.match(app.root.innerHTML,/最晚第 7 天交付/);
});
test('growth plaques count only actual invested procurement or booked express benefits',()=>{
 let base=engine.createOpeningGame();for(const id of ['quick','urgent','large']){for(const type of ['PURCHASE','SHIP','DELIVER'])base=engine.reduceOpening(base,{type,orderId:id,route:id==='urgent'?'express':'sea'}).state;if(id==='large')base=engine.reduceOpening(base,{type:'COLLECT',orderId:id}).state;}
 for(const choice of ['warehouse','express']){
  let s=engine.reduceOpening(base,{type:'INVEST',choice}).state;const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));assert.match(boot('',local,storage()).root.innerHTML,/累计省[^<]*<\/span><b>¥0/);
  const id=choice==='warehouse'?'port-quick':'port-urgent';s=engine.reduceOpening(s,{type:'PURCHASE',orderId:id}).state;if(choice==='express')s=engine.reduceOpening(s,{type:'SHIP',orderId:id,route:'express'}).state;
  local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const html=boot('',local,storage()).root.innerHTML;
  if(choice==='warehouse')assert.match(html,/货仓累计省采购<\/span><b>¥80/);else{assert.match(html,/快线累计省运费<\/span><b>¥120/);assert.match(html,/比普通快运少用 1 天/);}
 }
});
test('cash-constrained contract shows exact shortfall and a receivable recovery action',()=>{
 let s=engine.createOpeningGame();for(const type of ['PURCHASE','SHIP','DELIVER'])s=engine.reduceOpening(s,{type,orderId:'large',route:'sea'}).state;
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());app.act('select','urgent');assert.match(app.root.innerHTML,/还差 ¥400/);assert.match(app.root.innerHTML,/¥2,100 在第 12 天到账/);assert.match(app.root.innerHTML,/查看这笔待收款/);
 app.act('select','large');assert.match(app.root.innerHTML,/等到收款 · 推进 7 天/);
});
test('third-stage result separates this stage cash gain from lifetime earnings without fabricating absent history',()=>{
 let s=engine.createOpeningGame();const act=(type,id,route)=>{s=engine.reduceOpening(s,{type,orderId:id,route}).state;};const sale=(id,route='sea')=>{for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,id,route);};
 sale('quick');sale('urgent','express');sale('large');act('COLLECT','large');s=engine.reduceOpening(s,{type:'INVEST',choice:'warehouse'}).state;
 sale('port-quick');sale('port-urgent','express');sale('port-large');act('COLLECT','port-large');s=engine.reduceOpening(s,{type:'NEXT_STAGE'}).state;const startCash=s.cash,startDay=s.day;
 sale('choice-bulk');sale('choice-urgent','express');act('COLLECT','choice-bulk');const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));let html=boot('',local,storage()).root.innerHTML;
 assert.match(html,/这一程 · 2 位客户/);assert.ok(html.includes('+'+'¥'+(s.cash-startCash).toLocaleString('zh-CN')));assert.ok(html.includes((s.day-startDay)+' 天 · 已扣'));assert.match(html,/累计净赚/);assert.match(html,/出货至回款/);
 s.history=[];local.setItem(engine.STORAGE_KEY,JSON.stringify(s));html=boot('',local,storage()).root.innerHTML;assert.doesNotMatch(html,/这一程 ·/);assert.match(html,/累计净赚/);
});
test('collection preview includes every receivable due by the selected day',()=>{
 let s=engine.createOpeningGame();s.cash=5000;for(const type of ['PURCHASE','SHIP','DELIVER'])s=engine.reduceOpening(s,{type,orderId:'large',route:'sea'}).state;
 for(const type of ['PURCHASE','SHIP'])s=engine.reduceOpening(s,{type,orderId:'quick',route:'sea'}).state;
 // Compatible existing signed payment terms are preserved by normalization.
 const quick=s.orders.find(o=>o.id==='quick');quick.payLag=3;quick.collectionDay=12;s=engine.reduceOpening(s,{type:'DELIVER',orderId:'quick'}).state;
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());app.act('select','large');assert.match(app.root.innerHTML,/回款 <b>\+¥2,950/);
});
test('a funded express route keeps a contract purchasable when sea operating reserve is unaffordable',()=>{
 let s=engine.createOpeningGame();for(const id of ['quick','urgent','large']){for(const type of ['PURCHASE','SHIP','DELIVER'])s=engine.reduceOpening(s,{type,orderId:id,route:id==='urgent'?'express':'sea'}).state;if(id==='large')s=engine.reduceOpening(s,{type:'COLLECT',orderId:id}).state;}
 s=engine.reduceOpening(s,{type:'INVEST',choice:'express'}).state;
 const cost=engine.quoteOpening(s,'port-quick','express').purchaseCost;s.cash=cost+180+50;
 assert.equal(engine.quoteOpening(s,'port-quick','sea').valid,false);assert.equal(engine.quoteOpening(s,'port-quick','express').valid,true);
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());app.act('select','port-quick');
 assert.match(app.root.innerHTML,/快运后毛利/);assert.doesNotMatch(app.root.innerHTML,/data-action="PURCHASE"[^>]*disabled/);
 app.act('PURCHASE','port-quick');assert.match(app.root.innerHTML,/下一步 · 选船/);assert.match(app.root.innerHTML,/¥180 运费/);
});

test('fixed-line growth and shipping lane are drawn only for the actual investment and route',async()=>{
 let s=engine.createOpeningGame();for(const id of ['quick','urgent','large']){for(const type of ['PURCHASE','SHIP','DELIVER'])s=engine.reduceOpening(s,{type,orderId:id,route:id==='urgent'?'express':'sea'}).state;if(id==='large')s=engine.reduceOpening(s,{type:'COLLECT',orderId:id}).state;}
 s=engine.reduceOpening(s,{type:'INVEST',choice:'express'}).state;s=engine.reduceOpening(s,{type:'PURCHASE',orderId:'port-quick'}).state;
 const art=fs.readFileSync(new URL('../assets/rework-harbor.svg',import.meta.url),'utf8');
 for(const route of ['sea','express']){
  const shipped=engine.reduceOpening(s,{type:'SHIP',orderId:'port-quick',route}).state,local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(shipped));const app=boot('',local,storage(),art);await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.root.innerHTML,/固定快线专用码头/);assert.match(app.root.innerHTML,new RegExp('shipping-lane '+(route==='express'?'fast':'sea')));
 }
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(engine.createOpeningGame()));const app=boot('',local,storage(),art);await new Promise(resolve=>setImmediate(resolve));assert.doesNotMatch(app.root.innerHTML,/express-terminal|shipping-lane/);
});
test('route choice compares each payment date with existing receivables on the same day scale',()=>{
 let s=engine.createOpeningGame();const act=(type,id,route)=>{s=engine.reduceOpening(s,{type,orderId:id,route}).state;};
 for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,'urgent','express');
 for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,'large','sea');
 act('PURCHASE','quick');const due=s.orders.find(o=>o.id==='large').collectionDay;
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());app.act('select','quick');
 const html=app.root.innerHTML;assert.match(html,/route-pending/);assert.match(html,/◆ 待收 ¥2,100/);assert.ok(html.includes('已有货款第 '+due+' 天到账'));assert.equal((html.match(/class="pending-marker"/g)||[]).length,2);assert.equal((html.match(/class="payment-marker"/g)||[]).length,2);
 for(const route of ['sea','express']){const q=engine.quoteOpening(s,'quick',route);assert.ok(html.includes(`第 ${q.arrivalDay} 天送达`));assert.ok(html.includes(`本单第 ${q.collectionDay} 天回款`));}
});

test('continuing business shows real customer repeats, payment choices and both working berths',async()=>{
 let s=engine.createOpeningGame();const act=(type,id,route,extra={})=>{const r=engine.reduceOpening(s,{type,orderId:id,route,...extra});assert.equal(r.feedback.ok,true,r.feedback.message);s=r.state;};
 const sale=(id,route='express')=>{for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,id,route);const o=s.orders.find(x=>x.id===id);if(o.status==='receivable')act('COLLECT',id);};
 sale('quick','sea');sale('urgent');sale('large','sea');act('INVEST',null,null,{choice:'express'});sale('port-quick');sale('port-urgent');sale('port-large');act('NEXT_STAGE');sale('choice-restock');sale('choice-urgent');
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));let app=boot('',local,storage());assert.match(app.root.innerHTML,/留下这两位客户，继续经营/);app.act('START_BUSINESS');assert.match(app.root.innerHTML,/熟客又来补货/);assert.match(app.root.innerHTML,/复购收齐 0 单/);app.act('EXPAND_BERTH');
 s=JSON.parse(local.getItem(engine.STORAGE_KEY));assert.equal(s.berthCount,2);const [a,b]=engine.currentOpeningOrders(s);app.act('select',a.id);assert.match(app.root.innerHTML,/让一点，当天收/);assert.match(app.root.innerHTML,/毛利 · 未扣日常/);assert.match(app.root.innerHTML,/nearby-cost">日常预留/);app.act('SET_PAYMENT',a.id,{paymentTerms:'cash'});assert.match(app.root.innerHTML,/交付即收/);app.act('SET_PAYMENT',a.id,{paymentTerms:'credit'});app.act('PURCHASE',a.id);app.act('SHIP',a.id,{route:'express'});const before=local.getItem(engine.STORAGE_KEY),low=JSON.parse(before);low.cash=0;local.setItem(engine.STORAGE_KEY,JSON.stringify(low));const constrained=boot('',local,storage());constrained.act('select',b.id);assert.match(constrained.root.innerHTML,/查看这批在途货/);local.setItem(engine.STORAGE_KEY,before);app.act('select',b.id);assert.doesNotMatch(app.root.innerHTML,/data-action="PURCHASE"[^>]*disabled/);app.act('PURCHASE',b.id);
 const art=fs.readFileSync(new URL('../assets/rework-harbor.svg',import.meta.url),'utf8');app=boot('',local,storage(),art);await new Promise(resolve=>setImmediate(resolve));assert.match(app.root.innerHTML,/新增第二泊位/);assert.equal((app.root.innerHTML.match(/class="berthed-vessel /g)||[]).length,2);assert.match(app.root.innerHTML,/1号泊位/);assert.match(app.root.innerHTML,/2号泊位/);app.act('SHIP',b.id,{route:'express'});app.act('DELIVER',a.id);app.act('select',a.id);assert.match(app.root.innerHTML,/去交付这批货/);assert.doesNotMatch(app.root.innerHTML,/这批生意只剩回款|data-action="COLLECT"/);app.act('DELIVER',b.id);app.act('COLLECT',a.id);assert.match(app.root.innerHTML,/这一批经营净赚/);assert.match(app.root.innerHTML,/扩建投入 −¥2,500/);assert.match(app.root.innerHTML,/现金净变/);assert.match(app.root.innerHTML,/扩建后已结净收益/);app.act('NEXT_BUSINESS_ROUND');assert.match(app.root.innerHTML,/复购收齐 1 单/);assert.match(app.root.innerHTML,/扩建后已结净收益/);
});
test('earned customer trust exposes a deposit and every cash panel shows only the unpaid balance',async()=>{
 let s=engine.createOpeningGame();const act=(type,id,route,extra={})=>{const r=engine.reduceOpening(s,{type,orderId:id,route,...extra});assert.equal(r.feedback.ok,true,r.feedback.message);s=r.state;};const sale=(id,route='express')=>{for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,id,route);if(s.orders.find(o=>o.id===id).status==='receivable')act('COLLECT',id);};
 sale('quick','sea');sale('urgent');sale('large','sea');act('INVEST',null,null,{choice:'express'});sale('port-quick');sale('port-urgent');sale('port-large');act('NEXT_STAGE');sale('choice-restock');sale('choice-urgent');act('START_BUSINESS');
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));let app=boot('',local,storage());app.act('select',engine.currentOpeningOrders(s)[0].id);assert.match(app.root.innerHTML,/data-payment-terms="deposit"[^>]*disabled/);
 for(let i=0;i<2;i++){for(const o of engine.currentOpeningOrders(s))sale(o.id);act('NEXT_BUSINESS_ROUND');}
 local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const art=fs.readFileSync(new URL('../assets/rework-harbor.svg',import.meta.url),'utf8');app=boot('',local,storage(),art);await new Promise(resolve=>setImmediate(resolve));assert.match(app.root.innerHTML,/可收三成定金/);assert.match(app.root.innerHTML,/trusted-client/);assert.match(app.root.innerHTML,/创业目标已达成/);const beforeReview=local.getItem(engine.STORAGE_KEY);app.act('review');assert.match(app.root.innerHTML,/从自己垫钱拿货/);assert.match(app.root.innerHTML,/已结净赚/);app.act('back');assert.equal(local.getItem(engine.STORAGE_KEY),beforeReview);assert.doesNotMatch(app.root.innerHTML,/class="company-review"/);
 const o=engine.currentOpeningOrders(s)[0],deposit=Math.floor(o.baseRevenue*.3),before=s.cash;app.act('select',o.id);app.act('SET_PAYMENT',o.id,{paymentTerms:'deposit'});assert.match(app.root.innerHTML,/签约先收/);assert.match(app.root.innerHTML,/data-payment-terms="deposit"[^>]*>[\s\S]*?尾款 · 交付后 3 天/);assert.doesNotMatch(app.root.innerHTML,/data-payment-terms="deposit"[^>]*disabled/);app.act('PURCHASE',o.id);
 let saved=JSON.parse(local.getItem(engine.STORAGE_KEY)),purchased=saved.orders.find(x=>x.id===o.id);assert.equal(purchased.depositReceived,deposit);assert.equal(saved.cash,before+deposit-purchased.purchaseCost);
 app.act('SHIP',o.id,{route:'express'});app.act('DELIVER',o.id);app.act('select',o.id);assert.match(app.root.innerHTML,/客户已签收 · 等尾款/);assert.ok(app.root.innerHTML.includes('¥'+(o.revenue-deposit).toLocaleString('zh-CN')));assert.doesNotMatch(app.root.innerHTML,new RegExp('回款 <b>\\+¥'+o.revenue.toLocaleString('zh-CN')));
 app.act('COLLECT',o.id);assert.equal(JSON.parse(local.getItem(engine.STORAGE_KEY)).orders.find(x=>x.id===o.id).status,'paid');
});
