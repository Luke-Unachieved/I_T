import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as engine from '../src/rework-opening.js';
const source=fs.readFileSync(new URL('../src/rework-app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'').replaceAll('import.meta.url',JSON.stringify('https://game.invalid/src/rework-app.js'));
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};}
function boot(search,local,session,art=null,confirmation=()=>true){const downloads=[];class TestURL extends URL {static createObjectURL(blob){downloads.push(blob);return 'blob:test';}static revokeObjectURL(){}}const events={},notice={textContent:''},root={innerHTML:'',querySelector:()=>notice,addEventListener:(type,fn)=>events[type]=fn};vm.runInNewContext(source,{...engine,structuredClone,URL:TestURL,Blob,setTimeout:fn=>fn(),URLSearchParams,location:{search},document:{querySelector:()=>root,createElement:()=>({click(){}})},localStorage:local,sessionStorage:session,fetch:()=>art?Promise.resolve({ok:true,text:()=>Promise.resolve(art)}):Promise.reject(new Error('No art needed for storage test')),confirm:confirmation});return {root,notice,downloads,importFile:(text,size=text.length)=>events.change({target:{matches:()=>true,files:[{size,text:async()=>text}],value:'chosen'}}),act:(action,id,extra={})=>events.click({target:{closest:()=>({dataset:{action,id,...extra}})}})}}
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
 sale('port-quick');sale('port-urgent','express');sale('port-large');act('COLLECT','port-large');s=engine.reduceOpening(s,{type:'NEXT_STAGE'}).state;const startCash=s.cash,startDay=s.day;const identityStore=storage();const originalContracts=JSON.stringify(s);identityStore.setItem(engine.STORAGE_KEY,originalContracts);const identityApp=boot('',identityStore,storage());for(const name of ['南湾旅店','桥头杂货铺','新港展馆','海风百货'])assert.ok(identityApp.root.innerHTML.includes(name));identityApp.act('select','choice-bulk');assert.match(identityApp.root.innerHTML,/客房织品补换/);assert.equal(identityStore.getItem(engine.STORAGE_KEY),originalContracts);
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
  assert.match(app.root.innerHTML,/固定快线专用码头/);assert.match(app.root.innerHTML,/<use href="#express-dock-sprite"/);assert.doesNotMatch(app.root.innerHTML,/<use href="#warehouse-annex-sprite"/);assert.match(app.root.innerHTML,new RegExp('shipping-lane '+(route==='express'?'fast':'sea')));
 }
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(engine.createOpeningGame()));const app=boot('',local,storage(),art);await new Promise(resolve=>setImmediate(resolve));assert.doesNotMatch(app.root.innerHTML,/express-terminal|shipping-lane/);assert.doesNotMatch(app.root.innerHTML,/<use href="#(?:warehouse-annex|express-dock)-sprite"/);
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
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));let app=boot('',local,storage());assert.match(app.root.innerHTML,/留下这两位客户，继续经营/);app.act('START_BUSINESS');assert.match(app.root.innerHTML,/熟客又来补货/);assert.match(app.root.innerHTML,/收齐一单后，可不接另一单/);assert.match(app.root.innerHTML,/下批需求 · 共/);assert.match(app.root.innerHTML,/常规补货/);assert.match(app.root.innerHTML,/class="demand-kind"/);assert.match(app.root.innerHTML,/复购收齐 0 单/);app.act('EXPAND_BERTH');
 s=JSON.parse(local.getItem(engine.STORAGE_KEY));assert.equal(s.berthCount,2);const [a,b]=engine.currentOpeningOrders(s);app.act('select',a.id);assert.match(app.root.innerHTML,/让一点，当天收/);assert.match(app.root.innerHTML,/毛利 · 未扣日常/);assert.match(app.root.innerHTML,/nearby-cost">日常预留/);app.act('SET_PAYMENT',a.id,{paymentTerms:'cash'});assert.match(app.root.innerHTML,/交付即收/);app.act('SET_PAYMENT',a.id,{paymentTerms:'credit'});app.act('PURCHASE',a.id);app.act('SHIP',a.id,{route:'express'});const before=local.getItem(engine.STORAGE_KEY),low=JSON.parse(before);low.cash=0;local.setItem(engine.STORAGE_KEY,JSON.stringify(low));const constrained=boot('',local,storage());constrained.act('select',b.id);assert.match(constrained.root.innerHTML,/查看这批在途货/);local.setItem(engine.STORAGE_KEY,before);app.act('select',b.id);assert.doesNotMatch(app.root.innerHTML,/data-action="PURCHASE"[^>]*disabled/);app.act('PURCHASE',b.id);
 const art=fs.readFileSync(new URL('../assets/rework-harbor.svg',import.meta.url),'utf8');app=boot('',local,storage(),art);await new Promise(resolve=>setImmediate(resolve));assert.match(app.root.innerHTML,/新增第二泊位/);assert.equal((app.root.innerHTML.match(/class="berthed-vessel /g)||[]).length,2);assert.match(app.root.innerHTML,/1号泊位/);assert.match(app.root.innerHTML,/2号泊位/);app.act('SHIP',b.id,{route:'express'});app.act('DELIVER',a.id);app.act('select',a.id);assert.match(app.root.innerHTML,/去交付这批货/);assert.doesNotMatch(app.root.innerHTML,/这批生意只剩回款|data-action="COLLECT"/);app.act('DELIVER',b.id);app.act('COLLECT',a.id);assert.match(app.root.innerHTML,/这一批经营净赚/);assert.match(app.root.innerHTML,/扩建投入 −¥2,500/);assert.match(app.root.innerHTML,/现金净变/);assert.match(app.root.innerHTML,/扩建后已结净收益/);app.act('NEXT_BUSINESS_ROUND');assert.match(app.root.innerHTML,/复购收齐 1 单/);assert.match(app.root.innerHTML,/扩建后已结净收益/);
});
test('earned customer trust exposes a deposit and every cash panel shows only the unpaid balance',async()=>{
 let s=engine.createOpeningGame();const act=(type,id,route,extra={})=>{const r=engine.reduceOpening(s,{type,orderId:id,route,...extra});assert.equal(r.feedback.ok,true,r.feedback.message);s=r.state;};const sale=(id,route='express')=>{for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,id,route);if(s.orders.find(o=>o.id===id).status==='receivable')act('COLLECT',id);};
 sale('quick','sea');sale('urgent');sale('large','sea');act('INVEST',null,null,{choice:'express'});sale('port-quick');sale('port-urgent');sale('port-large');act('NEXT_STAGE');sale('choice-restock');sale('choice-urgent');act('START_BUSINESS');
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));let app=boot('',local,storage());app.act('select',engine.currentOpeningOrders(s)[0].id);assert.match(app.root.innerHTML,/data-payment-terms="deposit"[^>]*disabled/);
 for(let i=0;i<2;i++){for(const o of engine.currentOpeningOrders(s))sale(o.id);act('NEXT_BUSINESS_ROUND');}
 local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const art=fs.readFileSync(new URL('../assets/rework-harbor.svg',import.meta.url),'utf8');app=boot('',local,storage(),art);await new Promise(resolve=>setImmediate(resolve));assert.match(app.root.innerHTML,/可收三成定金/);assert.match(app.root.innerHTML,/trusted-client/);assert.match(app.root.innerHTML,/桥头杂货铺/);assert.match(app.root.innerHTML,/新港展馆/);assert.doesNotMatch(app.root.innerHTML,/>街区小店快补</);assert.match(app.root.innerHTML,/创业目标已达成/);const beforeReview=local.getItem(engine.STORAGE_KEY);app.act('review');assert.match(app.root.innerHTML,/从自己垫钱拿货/);assert.match(app.root.innerHTML,/已结净赚/);assert.match(app.root.innerHTML,/这笔净赚怎么算/);assert.match(app.root.innerHTML,/未收齐的订单暂不计利润/);for(const value of [s.investmentCost+(s.berthInvestmentCost||0),s.operatingCostPaid||0])assert.ok(app.root.innerHTML.includes('−¥'+value.toLocaleString('zh-CN')));app.act('back');assert.equal(local.getItem(engine.STORAGE_KEY),beforeReview);assert.doesNotMatch(app.root.innerHTML,/class="company-review"/);
 const o=engine.currentOpeningOrders(s)[0],deposit=Math.floor(o.baseRevenue*.3),before=s.cash;app.act('select',o.id);app.act('SET_PAYMENT',o.id,{paymentTerms:'deposit'});assert.match(app.root.innerHTML,/签约先收/);assert.match(app.root.innerHTML,/data-payment-terms="deposit"[^>]*>[\s\S]*?尾款 · 交付后 3 天/);assert.doesNotMatch(app.root.innerHTML,/data-payment-terms="deposit"[^>]*disabled/);app.act('PURCHASE',o.id);
 let saved=JSON.parse(local.getItem(engine.STORAGE_KEY)),purchased=saved.orders.find(x=>x.id===o.id);assert.equal(purchased.depositReceived,deposit);assert.equal(saved.cash,before+deposit-purchased.purchaseCost);
 app.act('SHIP',o.id,{route:'express'});app.act('DELIVER',o.id);app.act('select',o.id);assert.match(app.root.innerHTML,/客户已签收 · 等尾款/);assert.ok(app.root.innerHTML.includes('¥'+(o.revenue-deposit).toLocaleString('zh-CN')));assert.doesNotMatch(app.root.innerHTML,new RegExp('回款 <b>\\+¥'+o.revenue.toLocaleString('zh-CN')));
 app.act('COLLECT',o.id);assert.equal(JSON.parse(local.getItem(engine.STORAGE_KEY)).orders.find(x=>x.id===o.id).status,'paid');app.act('select',o.id);assert.match(app.root.innerHTML,/杂货铺的补货已送达/);assert.match(app.root.innerHTML,/这位熟客已收齐 3 笔回头单/);assert.match(app.root.innerHTML,/已建立三成定金合作/);
});

test('narrow layout keeps price explanation hidden and progress below the scene subtitle',()=>{
 const finalCss=fs.readFileSync(new URL('../src/rework-style.css',import.meta.url),'utf8');assert.match(finalCss,/font-size:20px;max-width:none;line-height:1.35/);
 const css=fs.readFileSync(new URL('../src/rework-style.css',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:1050px\)\{\.market-tape \.price-rule\{display:none\}\}/);
 assert.match(css,/@media\(max-width:760px\)\{\.goal-track\{top:96px\}\.harbor-art,\.harbor>img\{top:122px\}\}/);
});

test('all restart entry points require confirmation and cancellation preserves progress',()=>{
 const local=storage();const saved=engine.createOpeningGame();saved.cash=4321;local.setItem(engine.STORAGE_KEY,JSON.stringify(saved));const before=local.getItem(engine.STORAGE_KEY);let prompts=0;const app=boot('',local,storage(),null,()=>{prompts++;return false;});
 for(const action of ['RESTART','restart-prompt'])app.act(action);assert.equal(prompts,2);assert.equal(local.getItem(engine.STORAGE_KEY),before);assert.match(app.root.innerHTML,/4,321/);
});
test('unreadable saves are not silently overwritten and explicit restart preserves raw backup',()=>{
 for(const raw of ['{truncated',JSON.stringify({version:99}), 'null']){const local=storage();local.setItem(engine.STORAGE_KEY,raw);const app=boot('',local,storage());assert.match(app.root.innerHTML,/原存档已保留/);app.act('PURCHASE','quick');assert.equal(local.getItem(engine.STORAGE_KEY),raw);app.act('RESTART');assert.equal(local.getItem(engine.STORAGE_KEY+':unreadable-backup'),raw);assert.equal(JSON.parse(local.getItem(engine.STORAGE_KEY)).cash,1800);}
});
test('failed unreadable-save backup refuses destructive restart',()=>{
 const local={getItem:()=>'{broken',setItem:()=>{throw Error('full')}};const app=boot('',local,storage());app.act('RESTART');assert.match(app.root.innerHTML,/已取消重新开张/);app.act('PURCHASE','quick');assert.match(app.root.innerHTML,/已暂停操作以免覆盖/);
});

test('save import validates before confirmation and replacement, and persists the restored game',async()=>{
 const local=storage();let prompts=0;const app=boot('',local,storage(),null,()=>{prompts++;return true;});app.act('PURCHASE','quick');const before=local.getItem(engine.STORAGE_KEY);
 await app.importFile('{broken');assert.equal(local.getItem(engine.STORAGE_KEY),before);assert.equal(prompts,0);assert.match(app.notice.textContent,/无法读取/);
 await app.importFile('{}',6*1024*1024);assert.equal(prompts,0);assert.match(app.notice.textContent,/文件过大/);
 const restore=engine.createOpeningGame();restore.cash=2345;await app.importFile(JSON.stringify(restore));assert.equal(prompts,1);assert.equal(JSON.parse(local.getItem(engine.STORAGE_KEY)).cash,2345);assert.match(app.root.innerHTML,/进度已恢复/);
});
test('cancelled or unwritable import preserves active progress',async()=>{
 const local=storage();const app=boot('',local,storage(),null,()=>false);app.act('PURCHASE','quick');const before=local.getItem(engine.STORAGE_KEY);await app.importFile(JSON.stringify(engine.createOpeningGame()));assert.equal(local.getItem(engine.STORAGE_KEY),before);assert.match(app.root.innerHTML,/1,400/);
 const broken={getItem:()=>before,setItem:()=>{throw Error('full')}};const failed=boot('',broken,storage());await failed.importFile(JSON.stringify(engine.createOpeningGame()));assert.match(failed.root.innerHTML,/1,400/);assert.match(failed.notice.textContent,/恢复失败/);
});

test('export uses only current game or untouched unreadable bytes',async()=>{
 const local=storage();const app=boot('',local,storage());app.act('PURCHASE','quick');app.act('export-save');assert.equal(JSON.parse(await app.downloads[0].text()).cash,1400);
 local.setItem(engine.STORAGE_KEY,'{damaged');const damaged=boot('',local,storage());damaged.act('export-save');assert.equal(await damaged.downloads[0].text(),'{damaged');assert.equal(local.getItem(engine.STORAGE_KEY),'{damaged');
});

test('paid opening orders leave an honest remaining count and on-time opening lamps get specific closure',()=>{
 const local=storage(),app=boot('',local,storage());app.act('PURCHASE','urgent');app.act('SHIP','urgent',{route:'express'});app.act('DELIVER','urgent');assert.match(app.root.innerHTML,/灯具赶上开业/);assert.match(app.root.innerHTML,/还剩 2 笔生意待收齐/);assert.doesNotMatch(app.root.innerHTML,/三笔来单，先做哪笔/);
 app.act('select','urgent');assert.match(app.root.innerHTML,/<span>灯具赶上开业<\/span>/);
 const late=JSON.parse(local.getItem(engine.STORAGE_KEY));late.orders.find(o=>o.id==='urgent').deliveredDay=99;local.setItem(engine.STORAGE_KEY,JSON.stringify(late));const old=boot('',local,storage());old.act('select','urgent');assert.doesNotMatch(old.root.innerHTML,/灯具赶上开业/);
});
test('second-stage remaining counts and finished business berths lead into the actual next batch',()=>{
 let s=engine.createOpeningGame();const act=(type,id,route,extra={})=>{const r=engine.reduceOpening(s,{type,orderId:id,route,...extra});assert.equal(r.feedback.ok,true,r.feedback.message);s=r.state;};const sale=(id,route='express')=>{for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,id,route);if(s.orders.find(o=>o.id===id).status==='receivable')act('COLLECT',id);};
 sale('quick','sea');sale('urgent');sale('large','sea');act('INVEST',null,null,{choice:'express'});sale('port-quick');const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));assert.match(boot('',local,storage()).root.innerHTML,/还剩 2 笔生意待收齐/);
 sale('port-urgent');sale('port-large');act('NEXT_STAGE');sale('choice-restock');sale('choice-urgent');act('START_BUSINESS');act('EXPAND_BERTH');for(const o of engine.currentOpeningOrders(s))sale(o.id);local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());const controls=app.root.innerHTML.match(/<div class="berth-controls">([\s\S]*?)<\/div>/)[1];assert.equal((controls.match(/data-action="NEXT_BUSINESS_ROUND"/g)||[]).length,2);assert.doesNotMatch(controls,/挑一笔生意|data-action="back"/);app.act('NEXT_BUSINESS_ROUND');const next=JSON.parse(local.getItem(engine.STORAGE_KEY));assert.equal(next.businessRound,s.businessRound+1);assert.equal(engine.currentOpeningOrders(next).filter(o=>o.status==='open').length,2);assert.match(app.root.innerHTML,/挑一笔生意/);
});

function focusHarness(){
 const doc={activeElement:null};let nodes=[],heading,panels=[];const events={};let finishArt;
 const root={contains:el=>nodes.includes(el),querySelector:()=>heading,querySelectorAll:selector=>selector==='details[data-panel]'?panels:nodes,addEventListener:(type,fn)=>events[type]=fn};
 function node(tag,dataset={},panel=null){return {tagName:tag,dataset,open:false,attrs:{},closest:()=>panel,matches:selector=>selector==='h2'||selector==='.workbench h2'?tag==='H2':selector==='[data-save-restore]'?tag==='INPUT':false,setAttribute(k,v){this.attrs[k]=v;},focus(options){doc.activeElement=this;this.focusOptions=options;}};}
 function mount(){const p=node('DETAILS',{panel:'demand'}),save=node('DETAILS',{panel:'save'});panels=[p,save];heading=node('H2');nodes=[node('SUMMARY',{},p),node('SUMMARY',{},save),node('BUTTON',{action:'SET_PAYMENT',id:'repeat-1',paymentTerms:'cash'}),node('BUTTON',{action:'SET_PAYMENT',id:'repeat-1',paymentTerms:'credit'}),heading];}
 Object.defineProperty(root,'innerHTML',{set(){mount();},get(){return '';}});
 doc.querySelector=()=>root;const local=storage();
 const api=vm.runInNewContext(source+'\n;({rememberUi,restoreUi,render})',{...engine,structuredClone,URL,URLSearchParams,location:{search:''},document:doc,localStorage:local,sessionStorage:storage(),confirm:()=>true,fetch:()=>new Promise(resolve=>{finishArt=()=>resolve({ok:true,text:async()=>'<svg></svg>'});})});
 return {api,doc,root,get nodes(){return nodes;},get panels(){return panels;},get heading(){return heading;},mount,finishArt:()=>finishArt()};
}
test('render preserves exact payment focus and both open and deliberately closed disclosures',()=>{
 const h=focusHarness();h.panels[0].open=true;h.doc.activeElement=h.nodes[2];h.api.render();assert.equal(h.panels[0].open,true);assert.equal(h.doc.activeElement,h.nodes[2]);assert.equal(h.doc.activeElement.dataset.paymentTerms,'cash');assert.equal(h.doc.activeElement.focusOptions.preventScroll,true);
 h.panels[0].open=false;h.api.render();assert.equal(h.panels[0].open,false);
});
test('changed contract view focuses heading without entering normal tab sequence, outside focus is not stolen',()=>{
 const h=focusHarness();h.doc.activeElement=h.nodes[2];const snapshot=h.api.rememberUi();h.mount();h.api.restoreUi(snapshot,true);assert.equal(h.doc.activeElement,h.heading);assert.equal(h.heading.attrs.tabindex,'-1');assert.equal(h.heading.focusOptions.preventScroll,false);
 const outside={};h.doc.activeElement=outside;h.api.render();assert.equal(h.doc.activeElement,outside);
});
test('late SVG rendering retains open preview and focused summary',async()=>{
 const h=focusHarness();h.panels[0].open=true;h.panels[1].open=true;h.doc.activeElement=h.nodes[0];h.finishArt();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.panels[0].open,true);assert.equal(h.panels[1].open,true);assert.equal(h.doc.activeElement,h.nodes[0]);
});

test('credit orders without a deposit are labeled full payment rather than balance',()=>{
 let s=engine.createOpeningGame();
 for(const type of ['PURCHASE','SHIP','DELIVER']){const r=engine.reduceOpening(s,{type,orderId:'large',route:'sea'});assert.equal(r.feedback.ok,true,r.feedback.message);s=r.state;}
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());
 assert.match(app.root.innerHTML,/货款待收/);app.act('select','large');assert.match(app.root.innerHTML,/等货款到账/);assert.doesNotMatch(app.root.innerHTML,/等尾款到账/);
});

test('passing one repeat requires confirmation, preserves cancel and explains no trust reward',()=>{
 let s=engine.createOpeningGame();const act=(type,id,route,extra={})=>{const r=engine.reduceOpening(s,{type,orderId:id,route,...extra});assert.equal(r.feedback.ok,true,r.feedback.message);s=r.state;};const sale=(id,route='express')=>{for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,id,route);if(s.orders.find(o=>o.id===id).status==='receivable')act('COLLECT',id);};
 sale('quick','sea');sale('urgent');sale('large','sea');act('INVEST',null,null,{choice:'express'});sale('port-quick');sale('port-urgent');sale('port-large');act('NEXT_STAGE');sale('choice-restock');sale('choice-urgent');act('START_BUSINESS');const [a,b]=engine.currentOpeningOrders(s);sale(a.id);
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));let approved=false,prompt='';const app=boot('',local,storage(),null,text=>{prompt=text;return approved;});app.act('select',b.id);assert.match(app.root.innerHTML,/这批不接，保留周转金/);assert.match(app.root.innerHTML,/不增加该客户复购/);const before=local.getItem(engine.STORAGE_KEY);app.act('PASS_BUSINESS_ORDER',b.id);assert.equal(local.getItem(engine.STORAGE_KEY),before);assert.match(prompt,/不扣钱、不增加复购/);approved=true;app.act('PASS_BUSINESS_ORDER',b.id);assert.match(app.root.innerHTML,/本批做成 1 单，另 1 单未签约/);assert.match(app.root.innerHTML,/接下一批回头单/);assert.ok(engine.normalizeOpeningSave(local.getItem(engine.STORAGE_KEY)));assert.match(boot('',local,storage()).root.innerHTML,/本批做成 1 单/);
});
