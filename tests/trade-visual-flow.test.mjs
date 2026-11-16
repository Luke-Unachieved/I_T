import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as economy from '../src/trade-economy.js';
const app=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
function boot(s){
 const raw=JSON.stringify(s),nodes=new Map(),storage=new Map([['trade-tycoon:data:v2',raw]]);
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(id);};
 const c=vm.createContext({...economy,document:{querySelector:node},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){},window:{scrollTo(){}}});
 vm.runInContext(app.replace(/^import[^\n]+\n/,''),c);return {c,storage,raw};
}
test('network is read-only, separates actual production/transport from collected delivery',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('港口'));
 c.fixture=[{offer:{market:'asia'},paidShipping:false},{offer:{market:'middle'},paidShipping:true},{offer:{market:'middle'},paidShipping:true}];
 vm.runInContext('state.active=fixture;state.receivables=[{amount:900,dueDay:20}];state.metrics.orders=3;',c);
 const html=vm.runInContext('tradeNetwork()',c);
 assert.match(html,/生产 1 单，运输 2 单，待收尾款 1 笔/);
 assert.match(html,/2 单履约 · 2 单运输/);assert.equal((html.match(/network-route carrying/g)||[]).length,1);
 assert.match(html,/尚未开通/);assert.match(html,/非实时船位/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('fresh company has no fake shipments or live animation',()=>{
 const {c}=boot(economy.createTradeGame('港口'));
 const html=vm.runInContext('tradeNetwork()',c);
 assert.match(html,/生产 0 单，运输 0 单，待收尾款 0 笔/);assert.doesNotMatch(html,/network-route carrying|animateMotion/);
});
test('contract timeline uses paid shipping flag, not passage of date alone',()=>{
 const {c}=boot(economy.createTradeGame('港口'));
 c.order={acceptedDay:1,shipDay:15,deliveryDay:29,dueDay:43,paidShipping:false};
 const production=vm.runInContext('contractStages(order)',c);
 assert.match(production,/class="current"[^]*?<strong>出运<\/strong>/);
 c.order.paidShipping=true;const transport=vm.runInContext('contractStages(order)',c);
 assert.match(transport,/class="current"[^]*?<strong>交付<\/strong>/);
 assert.equal((transport.match(/class="done"/g)||[]).length,2);assert.match(transport,/第 43 天/);
});
test('cost composition displays engine amounts with loss and spot-estimate labels',()=>{
 const {c}=boot(economy.createTradeGame('港口'));
 c.quote={cost:1000,freight:100,fx:{fee:20,mode:'spot'},penalty:10,profit:200};
 let html=vm.runInContext('profitComposition(quote)',c);
 for(const value of ['¥1,000','¥100','¥20','¥10','¥200'])assert.ok(html.includes(value));
 assert.match(html,/利润为估值/);assert.doesNotMatch(html,/NaN|Infinity/);
 c.quote.profit=-120;html=vm.runInContext('profitComposition(quote)',c);assert.match(html,/成本超过收入 ¥120/);assert.doesNotMatch(html,/class="profit"/);
});
test('empty cost composition remains finite and all legacy save bytes stay untouched',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('港口'));
 c.quote={cost:0,freight:0,penalty:0,profit:0};const html=vm.runInContext('profitComposition(quote)',c);
 assert.doesNotMatch(html,/NaN|Infinity/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('cash calendar keeps a common amount scale, negatives and exact figures',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('港口'));
 c.forecast={points:[{day:1,inflow:0,outflow:0,cash:18000},{day:2,inflow:1000,outflow:2000,cash:-100},{day:3,inflow:0,outflow:0,cash:-100}]};
 const html=vm.runInContext('forecastSummary(forecast)',c);
 assert.match(html,/所有柱条使用同一金额尺度/);assert.match(html,/width:50%/);assert.match(html,/width:100%/);assert.match(html,/cash-balance negative/);assert.match(html,/−¥100/);assert.match(html,/无回款/);assert.doesNotMatch(html,/NaN|Infinity/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('empty future cash calendar is finite without fabricated transactions',()=>{
 const {c}=boot(economy.createTradeGame('港口'));c.forecast={points:[{day:1,inflow:0,outflow:0,cash:0}]};
 const html=vm.runInContext('forecastSummary(forecast)',c);assert.match(html,/width:0%/);assert.doesNotMatch(html,/NaN|Infinity/);
});
test('finished-run results are collapsed, without removing results or cash warnings',()=>{
 const {c}=boot(economy.createTradeGame('收口'));
 vm.runInContext('state.ending={day:134,orders:9,netWorth:66633}',c);
 const html=vm.runInContext('desk()',c);assert.match(html,/milestone-fold"><details><summary>第一程已达成/);assert.match(html,/66,633/);assert.match(html,/harbor-inquiry/);assert.doesNotMatch(html,/milestone-fold"><details open/);
});
test('cost legend labels do not repeat the exact breakdown amounts',()=>{
 const {c}=boot(economy.createTradeGame('收口'));c.quote={cost:1000,freight:100,profit:200};
 const html=vm.runInContext('profitComposition(quote)',c);const legend=html.split('class="cost-legend"')[1];assert.match(legend,/采购/);assert.doesNotMatch(legend,/¥/);assert.match(html,/采购 ¥1,000/);
});
test('inquiry baseline loss is styled as negative, not profitable green',()=>{
 const {c}=boot(economy.createTradeGame('亏损报价'));
 c.quoteOrder=(s,id)=>({profit:-321,revenue:1000});
 const html=vm.runInContext('desk()',c);assert.match(html,/class="negative">−¥321/);assert.doesNotMatch(html,/class="positive">−¥321/);
});
test('order flow and inquiry choices replace dashboard map; goals remain folded',()=>{
 const {c}=boot(economy.createTradeGame('先接单'));const html=vm.runInContext('desk()',c);
 assert.match(html,/class="cargo-lanes"/);assert.match(html,/harbor-inquiry/);assert.doesNotMatch(html,/class="network-map"/);assert.match(html,/<details class="panel"><summary>公司的下一程/);
 const goal=vm.runInContext('goals()',c);assert.doesNotMatch(goal,/route-map|<svg/);assert.match(goal,/欧洲框架试单/);
});
test('inquiry discloses baseline penalty before the quotation is opened',()=>{
 const {c}=boot(economy.createTradeGame('先看风险'));c.quoteOrder=()=>({profit:2787,revenue:10000,penalty:1800,lateDays:14});
 assert.match(vm.runInContext('desk()',c),/基准方案延期 14 天 · 已含赔付/);
 c.quoteOrder=()=>({profit:100,revenue:10000,penalty:100,lateDays:0});assert.match(vm.runInContext('desk()',c),/基准方案品质不足 · 已含赔付/);
});

test('advisor offers only an existing current inquiry and never changes the save',()=>{const {c,storage,raw}=boot(economy.createTradeGame('顾问'));const a=vm.runInContext('nextAdvice()',c);assert.equal(a.action,'quote');assert.match(a.attrs,/w1-/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);});
test('advisor handles no offers and ending without an obsolete quote target',()=>{const {c}=boot(economy.createTradeGame('空档'));vm.runInContext('state.offers=[];state.ending={day:1,orders:10,netWorth:60000}',c);const a=vm.runInContext('nextAdvice()',c);assert.notEqual(a.action,'quote');assert.equal(a.attrs,'');});
test('advisor routes cash shortfall to real ledger tools, not invented collection',()=>{const {c}=boot(economy.createTradeGame('周转'));c.forecastCash=()=>({minimum:-100,stressMinimum:-200,points:[]});const a=vm.runInContext('nextAdvice()',c);assert.equal(a.action,'tab');assert.equal(a.attrs,'data-tab="ledger"');assert.doesNotMatch(a.reason,/催收/);});
test('guide is skippable and scene does not invent cargo in a fresh game',()=>{const {c}=boot(economy.createTradeGame('开张'));const h=vm.runInContext('firstOrderGuide()+portScene()',c);assert.match(h,/跳过指引/);assert.match(h,/0单备货，0单在海上/);assert.doesNotMatch(h,/data-action="cargo-detail"/);vm.runInContext('guideHidden=true',c);assert.match(vm.runInContext('firstOrderGuide()',c),/重看首单指引/);});

test('completed first order never reopens first-order instructions or first-ship empty text',()=>{const {c}=boot(economy.createTradeGame('老客户'));vm.runInContext('state.metrics.orders=1',c);const html=vm.runInContext('firstOrderGuide()+portScene()',c);assert.match(html,/重看首单指引/);assert.match(html,/这一批顺利送达/);assert.doesNotMatch(html,/开出第一艘船|1\/4/);});

test('receivable can be inspected and advisor prioritizes cash tied up with customer',()=>{const {c}=boot(economy.createTradeGame('回款'));vm.runInContext('state.cash=7000;state.receivables=[{id:"r1",customer:"客户",amount:11000,dueDay:29}]',c);const advice=vm.runInContext('nextAdvice()',c);assert.equal(advice.action,'follow-order');assert.match(advice.reason,/7,000/);assert.match(advice.reason,/11,000/);const scene=vm.runInContext('portScene()',c);assert.match(scene,/data-action="receipt-detail"/);assert.match(scene,/货已交付，等尾款/);});
test('scene contract slots match real capacity and expose only actual occupied orders',()=>{const {c}=boot(economy.createTradeGame('合同位'));const html=vm.runInContext('portScene()',c);assert.equal((html.match(/class="physical-bay vacant"/g)||[]).length,2);assert.doesNotMatch(html,/class="physical-bay occupied"/);assert.match(html,/data-action="choose-inquiry"/);vm.runInContext('state.expansion.warehouse=1',c);const grown=vm.runInContext('portScene()',c);assert.equal((grown.match(/class="physical-bay vacant"/g)||[]).length,3);assert.match(grown,/warehouse-extension/);});
test('visible destination ports reflect only unlocked markets when there are no inquiries',()=>{const {c}=boot(economy.createTradeGame('港口'));vm.runInContext('state.offers=[]',c);const html=vm.runInContext('portScene()',c);assert.equal((html.match(/class="customer-port scene-cargo"/g)||[]).length,1);assert.match(html,/东南亚/);assert.doesNotMatch(html,/NaN|Infinity/);});

test('completed delivery guide never calls unpaid tails received',()=>{const {c}=boot(economy.createTradeGame('账期首单'));vm.runInContext('state.metrics.orders=1;state.receivables=[{id:"r1",amount:11000,dueDay:29}]',c);const h=vm.runInContext('firstOrderGuide()',c);assert.match(h,/还有尾款待收/);assert.doesNotMatch(h,/都已到账|2\/4/);});

test('choice timeline reflects production shipping and payment duration without fake waiting',()=>{const {c}=boot(economy.createTradeGame('船期'));c.q={productionDays:7,days:14,payLagDays:28};const h=vm.runInContext('planTimeline(q)',c);assert.match(h,/备货 7 天，运送 7 天，等款 28 天/);assert.match(h,/class="payment"/);c.q={productionDays:7,days:7,payLagDays:0};const instant=vm.runInContext('planTimeline(q)',c);assert.doesNotMatch(instant,/class="shipping"|class="payment"|NaN/);});
test('urgent inquiry starts on fast option without changing state or submitting',()=>{const {c,raw,storage}=boot(economy.createTradeGame('急单'));vm.runInContext('dialog.showModal=()=>{};dialog.querySelector=()=>({});showQuote(state.offers.find(o=>o.kind==="rush").id)',c);assert.equal(vm.runInContext('quoteOptions.shipping',c),'rail');assert.equal(vm.runInContext('quoteOptions.supplier',c),'express');assert.equal(storage.get('trade-tycoon:data:v2'),raw);});

test('visible team and inspection grow only from purchased real upgrades',()=>{const {c}=boot(economy.createTradeGame('成长'));const initial=vm.runInContext('portBusinessAssets()',c);assert.doesNotMatch(initial,/circle cy/);vm.runInContext('state.upgrades.team=2;state.upgrades.quality=1;state.upgrades.logistics=1',c);const grown=vm.runInContext('portBusinessAssets()',c);assert.equal((grown.match(/circle cy/g)||[]).length,2);assert.match(grown,/验货 1/);assert.match(grown,/航线 1/);});

test('advisor identifies actual late-game quality requirement instead of repeating generic inquiry advice',()=>{let s=economy.createTradeGame('试单');s.metrics.orders=8;s.customers["europe-quick"]={orders:1,revenue:8000,market:"europe",name:"欧洲老客户"};s.reputation=16;s.cash=60000;s=economy.reduceTrade(s,{type:'ADVANCE_DAYS',days:7}).state;const {c}=boot(s);const advice=vm.runInContext('nextAdvice()',c);assert.equal(advice.action,'upgrade');assert.equal(advice.attrs,'data-id="quality"');assert.match(advice.reason,/品质 95/);});
test('visual ship groups preserve every actual order and separate real destinations and phases',()=>{const {c,storage,raw}=boot(economy.createTradeGame('船队'));c.ships=[{id:'a',paidShipping:true,shipDay:1,deliveryDay:22,offer:{market:'asia'}},{id:'b',paidShipping:true,shipDay:1,deliveryDay:22,offer:{market:'asia'}},{id:'c',paidShipping:true,shipDay:1,deliveryDay:8,offer:{market:'asia'}},{id:'d',paidShipping:true,shipDay:1,deliveryDay:22,offer:{market:'middle'}}];vm.runInContext('state.active=ships;state.day=6',c);const groups=vm.runInContext('shippingGroups()',c);assert.equal(groups.length,3);assert.equal(groups.reduce((n,g)=>n+g.orders.length,0),4);assert.equal(groups.find(g=>g.key==='asia-0').orders.length,2);assert.equal(groups.find(g=>g.key==='asia-2').orders[0].id,'c');assert.equal(storage.get('trade-tycoon:data:v2'),raw);});
test('market port exposes only local orders and real branch appointments without mutating save',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('航线'));
 let html=vm.runInContext('marketPort("asia")',c);
 assert.match(html,/我的航线/);assert.doesNotMatch(html,/任命到这里|考虑设立办事处/);
 vm.runInContext('state.metrics.orders=3;',c);html=vm.runInContext('marketPort("asia")',c);
 assert.match(html,/考虑设立办事处/);
 vm.runInContext('state.expansion.branches.asia={manager:"chen",appointedDay:1};',c);html=vm.runInContext('marketPort("asia")',c);
 assert.match(html,/负责人：陈卓/);assert.match(html,/运费再降 8%/);assert.match(html,/交付品质 \+4/);
 assert.doesNotMatch(html,/NaN|undefined/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('framework cash gap advises its actual receivable even when cash exceeds receivables',()=>{
 let s=economy.createTradeGame('试单周转');s.metrics.orders=8;s.customers["europe-quick"]={orders:1,revenue:8000,market:"europe",name:"欧洲老客户"};s.reputation=16;s.cash=60000;s=economy.reduceTrade(s,{type:'ADVANCE_DAYS',days:7}).state;
 const {c}=boot(s);vm.runInContext('state.upgrades.quality=1;state.cash=17000;state.receivables=[{id:"actual-tail",customer:"客户",amount:15000,dueDay:29}];',c);c.forecastCash=(_s,q)=>({minimum:q?-865:16000,stressMinimum:q?-865:16000,points:[]});
 const a=vm.runInContext('nextAdvice()',c);assert.equal(a.action,'follow-order');assert.match(a.attrs,/actual-tail/);assert.match(a.reason,/865/);assert.match(a.reason,/29/);assert.doesNotMatch(a.reason,/催收/);
});
test('receivable tray stays separate from destination buildings and hides when empty',()=>{
 const {c}=boot(economy.createTradeGame('尾款'));assert.equal(vm.runInContext('portReceivables()',c),'');
 vm.runInContext('state.receivables=[{id:"due-1",customer:"客户",amount:2000,dueDay:29}];',c);
 const tray=vm.runInContext('portReceivables()',c);assert.match(tray,/待收款/);assert.match(tray,/data-id="due-1"/);assert.match(tray,/x="72" y="290"/);assert.doesNotMatch(tray,/NaN|undefined/);
});
test('new-market receipt celebrates actual first fulfillment without inventing cash awards',()=>{
 const {c}=boot(economy.createTradeGame('航线'));
 c.r={day:1,orders:1,profit:2551,receipts:1000,cash:900,firstMarkets:['middle']};
 const html=vm.runInContext('receiptBody(r)',c);assert.match(html,/新航线首单达成 · 中东/);assert.match(html,/¥1,000/);assert.doesNotMatch(html,/奖励金|undefined/);
});

test('custom route composer reflects actual duration and quality without submitting',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('组合'));
 vm.runInContext('quoteId=state.offers[0].id;quoteOptions={supplier:"reliable",shipping:"sea",markup:0,fxMode:"locked",paymentTerms:"standard"};state.offers[0].deadlineDays=21;state.offers[0].deadline=3',c);
 let html=vm.runInContext('routeComposer(quoteOrder(state,quoteId,quoteOptions))',c);
 assert.match(html,/14 \+ 14 = 28 天/);assert.match(html,/迟 7 天/);assert.match(html,/data-leg="supplier"/);assert.match(html,/data-leg="shipping"/);
 vm.runInContext('quoteOptions.shipping="rail"',c);
 html=vm.runInContext('routeComposer(quoteOrder(state,quoteId,quoteOptions))',c);
 assert.match(html,/14 \+ 7 = 21 天/);assert.match(html,/赶得上/);assert.match(html,/品质达标/);
 assert.equal(storage.get('trade-tycoon:data:v2'),raw);assert.doesNotMatch(html,/NaN|Infinity/);
});
test('inspection preview compares actual new contracts without claiming faster shipping or bonus cash',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('验货'));
 vm.runInContext('state.offers=[{...state.offers[0],quality:85,deadlineDays:14,deadline:2}]',c);
 const html=vm.runInContext('qualityUpgradeImpact()',c);
 assert.match(html,/78 → 88/);assert.match(html,/从不达标变达标/);assert.match(html,/验货不能赶交期/);assert.match(html,/不改已有合同/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
 vm.runInContext('state.offers=[]',c);assert.match(vm.runInContext('qualityUpgradeImpact()',c),/不急着升级/);
});
test('advisor never urges unfunded framework when no receivable can bridge it',()=>{
 const {c}=boot(economy.createTradeGame('现金'));
 vm.runInContext('state.cash=100;state.upgrades.quality=1;state.offers=[{...state.offers[0],kind:"flagship",quantity:300,depositRate:15,quality:95,deadline:3,deadlineDays:21}];state.receivables=[]',c);
 const advice=vm.runInContext('nextAdvice()',c);
 assert.notEqual(advice.title,'试试欧洲框架单');assert.match(advice.reason,/周转|现金/);
});
test('explicit focus continues same order through shipping delivery and collection, then clears intent',()=>{
 const {c}=boot(economy.createTradeGame('专心'));
 vm.runInContext('render=()=>{};save=()=>{};dialog.close=()=>{};state=reduceTrade(state,{type:"ACCEPT",offerId:state.offers[1].id,markup:-10}).state;state.metrics.orders=8;state.customers["europe-quick"]={orders:1,revenue:8000,market:"europe",name:"欧洲老客户"};state.reputation=16;state.cash=60000;state=reduceTrade(state,{type:"ADVANCE_DAYS",days:7}).state;var focusedId=state.active[0].id',c);
 let first=vm.runInContext('apply({type:"FOLLOW_ORDER",orderId:focusedId})',c);assert.equal(first.pause.code,'offers_expiring');
 vm.runInContext('handle({target:{closest:()=>({dataset:{action:"confirm-advance"}})}})',c);
 assert.equal(vm.runInContext('focusedOrders.has(focusedId)',c),true);
 const delivery=vm.runInContext('apply({type:"FOLLOW_ORDER",orderId:focusedId})',c);assert.notEqual(delivery.pause?.code,'offers_expiring');assert.equal(delivery.state.active.length,0);
 const paid=vm.runInContext('apply({type:"FOLLOW_ORDER",orderId:focusedId})',c);assert.notEqual(paid.pause?.code,'offers_expiring');assert.ok(paid.summary.receipts>0);assert.equal(vm.runInContext('focusedOrders.has(focusedId)',c),false);
});

test('framework qualification celebration is factual and separate from cash',()=>{
 const {c}=boot(economy.createTradeGame('框架'));
 vm.runInContext('lastReceipt={day:30,orders:1,profit:200,receipts:0,cash:-10,frameworkQualified:true};state.customers["europe-flagship"]={market:"europe",qualified:true};state.metrics.orders=10;state.reputation=20',c);
 const html=vm.runInContext('receiptBody(lastReceipt)',c);assert.match(html,/欧洲框架试单合格/);assert.match(html,/本次尾款入账/);assert.match(html,/¥0/);
 vm.runInContext('lastReceipt.frameworkQualified=false',c);assert.doesNotMatch(vm.runInContext('receiptBody(lastReceipt)',c),/欧洲框架试单合格/);
});

test('qualified company goals do not send player back to preparing qualification',()=>{
 const {c}=boot(economy.createTradeGame('合格'));
 vm.runInContext('state.customers["europe-flagship"]={market:"europe",qualified:true};state.metrics.orders=10;state.reputation=20',c);
 const html=vm.runInContext('goals()',c);assert.match(html,/试单已经合格/);assert.doesNotMatch(html,/先准备验货/);
});

test('buyer purpose explains actual differentiated terms without adding actions',()=>{
 const {c}=boot(economy.createTradeGame());
 c.buyer={kind:'long',kindName:'酒店开业备货',payLagDays:7};assert.match(vm.runInContext('buyerPurpose(buyer)',c),/订金多、毛利低/);
 c.buyer.kindName='精品店补货';assert.match(vm.runInContext('buyerPurpose(buyer)',c),/品质门槛高/);
 const asia=vm.runInContext('portBuilding("asia",85)',c),middle=vm.runInContext('portBuilding("middle",170)',c),europe=vm.runInContext('portBuilding("europe",255)',c);
 assert.notEqual(asia,middle);assert.notEqual(middle,europe);for(const html of [asia,middle,europe])assert.doesNotMatch(html,/NaN|undefined/);
});

test('a paused advance scrolls its reason into view',()=>{
 const {c}=boot(economy.createTradeGame('暂停'));
 vm.runInContext('render=()=>{};save=()=>{};var pauseScrolls=0;document.querySelector(".advance-feedback").scrollIntoView=()=>pauseScrolls++;state.metrics.orders=8;state.customers["europe-quick"]={orders:1,revenue:8000,market:"europe",name:"欧洲老客户"};state.reputation=16;state.cash=60000;state=reduceTrade(state,{type:"ADVANCE_DAYS",days:7}).state',c);
 vm.runInContext('apply({type:"NEXT_EVENT"})',c);
 assert.equal(vm.runInContext('lastAdvance.pause.code',c),'offers_expiring');assert.equal(vm.runInContext('pauseScrolls',c),1);
});

test('receivable cards show actual amount and time, sorted without mutating state',()=>{
 const {c}=boot(economy.createTradeGame('票据'));
 vm.runInContext('state.receivables=[{id:"late",customer:"甲",customerId:"europe-long",amount:12000,dueDay:29},{id:"soon",customer:"乙",customerId:"asia-quick",amount:2000,dueDay:8}]',c);
 const html=vm.runInContext('portReceivables()',c);assert.ok(html.indexOf('data-id="soon"')<html.indexOf('data-id="late"'));assert.match(html,/¥2,000 · 7天/);assert.match(html,/¥12,000 · 28天/);assert.equal(vm.runInContext('state.receivables[0].id',c),'late');
});

test('tutorial automatically recedes after a real paid delivery despite other unpaid orders',()=>{
 const {c}=boot(economy.createTradeGame('引导'));
 vm.runInContext('state.metrics.orders=2;state.receivables=[{id:"unpaid"}]',c);assert.match(vm.runInContext('firstOrderGuide()',c),/重看首单指引/);assert.doesNotMatch(vm.runInContext('firstOrderGuide()',c),/第一笔生意跑通/);
 vm.runInContext('guideReplay=true',c);assert.match(vm.runInContext('firstOrderGuide()',c),/还有尾款待收/);
});
test('optional life scene reflects actual ownership and independent relationship stage',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('生活'));
 let html=vm.runInContext('lifeScene()',c);assert.match(html,/尚未购车/);assert.doesNotMatch(html,/两个人一起看日落|有阳台的小家/);
 vm.runInContext('state.life.home="home-flat";state.life.car="car-city";state.life.relationship={stage:1}',c);html=vm.runInContext('lifeScene()',c);assert.match(html,/有阳台的小家/);assert.match(html,/自己的第一辆车/);assert.doesNotMatch(html,/两个人一起看日落/);
 vm.runInContext('state.life.relationship.stage=2',c);assert.match(vm.runInContext('lifeScene()',c),/两个人一起看日落/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});


test('expansion planning previews real capacity and costs without buying or promising returns',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('规划'));
 let html=vm.runInContext('expansionPreview("warehouse")',c);
 assert.match(html,/名额 2 增至 3/);assert.match(html,/当前还有 2 个空位/);assert.match(html,/每周多付 ¥100/);assert.match(html,/尚未建成/);assert.match(html,/不保证成交/);
 html=vm.runInContext('expansionPreview("branch","asia")',c);assert.match(html,/每周多付 ¥180/);assert.match(html,/成交率/);
 assert.equal(vm.runInContext('state.expansion.warehouse',c),0);assert.equal(vm.runInContext('Object.keys(state.expansion.branches).length',c),0);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});


test('compact scene inquiries expose profit and full collection time with no duplicated default detail wall',()=>{
 const {c}=boot(economy.createTradeGame('首屏'));
 const html=vm.runInContext('inquiryDock()',c);assert.match(html,/预计利润/);assert.match(html,/天收齐/);assert.equal((html.match(/data-action="quote"/g)||[]).length,3);
 const desk=vm.runInContext('desk()',c);assert.match(desk,/<details class="opportunity-board"><summary>询盘细节与行情/);
});
test('receipt distinguishes current tail payment from earlier deposit and lists actual costs',()=>{
 const {c}=boot(economy.createTradeGame('回执'));
 vm.runInContext('fixture={day:29,orders:1,profit:2846,receipts:2836,cash:2596,payments:0,operating:240}',c);
 const html=vm.runInContext('receiptBody(fixture)',c);assert.match(html,/本次尾款入账/);assert.match(html,/运营与利息 −¥240/);assert.match(html,/订金在签约时已计入现金/);assert.doesNotMatch(html,/实际回款/);
});


test('new-player instruction names the visible compact business card',()=>{
 const {c}=boot(economy.createTradeGame('入门'));const html=vm.runInContext('firstOrderGuide()',c);assert.match(html,/点一张生意卡/);assert.doesNotMatch(html,/点「挑个方案」/);
});

test('warehouse honours actual delivered markets without changing capacity or cash',()=>{const {c}=boot(economy.createTradeGame('航线'));assert.equal(vm.runInContext('portTrackRecord()',c),'');vm.runInContext('state.customers={"asia-test":{market:"asia"},"middle-test":{market:"middle"}}',c);const before=vm.runInContext('JSON.stringify(state)',c);assert.match(vm.runInContext('portTrackRecord()',c),/已在 2 个市场实际履约/);assert.doesNotMatch(vm.runInContext('portTrackRecord()',c),/>欧</);assert.equal(vm.runInContext('JSON.stringify(state)',c),before);assert.equal(vm.runInContext('capacity(state)',c),2);vm.runInContext('state.ending={day:148,orders:11,netWorth:69967}',c);assert.match(vm.runInContext('portScene()',c),/这一程，做成了/);});

test('eligible cargo makes optional rebooking visible without forcing the tutorial path',()=>{
 const s=economy.createTradeGame('船期');const offer=s.offers.find(o=>o.kind==='quick');
 const signed=economy.reduceTrade(s,{type:'ACCEPT',offerId:offer.id,supplier:'reliable',shipping:'sea'}).state;
 assert.equal(signed.active.length,1);const {c}=boot(signed);
 assert.match(vm.runInContext('firstOrderGuide()',c),/先看运费与船期/);
 assert.match(vm.runInContext('firstOrderGuide()',c),/让这批货出运/);
 assert.match(vm.runInContext('portScene()',c),/data-action="route-plan"/);
 const next=economy.reduceTrade(signed,{type:'REBOOK_SHIPPING',orderId:offer.id,shipping:'rail'}).state;
 const changed=boot(next).c;
 assert.doesNotMatch(vm.runInContext('firstOrderGuide()',changed),/先看运费与船期/);
 assert.doesNotMatch(vm.runInContext('portScene()',changed),/安排运输 · 可改订一次/);
 assert.match(vm.runInContext('routePlanningScene(state.active[0])',changed),/已改订一次/);
});

test('selecting physical cargo opens actual route diagram and leaving it does not alter a contract',()=>{
 const s=economy.createTradeGame('调度'),offer=s.offers.find(o=>o.kind==='quick');
 const signed=economy.reduceTrade(s,{type:'ACCEPT',offerId:offer.id,supplier:'reliable',shipping:'sea'}).state;
 const {c}=boot(signed);c.id=offer.id;const before=vm.runInContext('JSON.stringify(state)',c);
 vm.runInContext('routeOrderId=id',c);const html=vm.runInContext('portScene()',c);
 assert.match(html,/这批货的运输选择图/);assert.match(html,/data-action="rebook"/);assert.match(html,/第 22 天到港 → 第 22 天收齐/);assert.match(html,/沿用当前船期/);
 assert.doesNotMatch(html,/下一单，做哪笔/);assert.equal(vm.runInContext('JSON.stringify(state)',c),before);
 vm.runInContext('routeOrderId=null',c);assert.match(vm.runInContext('portScene()',c),/harbor-inquiry/);
});
test('full dock surfaces waiting and expansion without suggesting an impossible warehouse upgrade',()=>{
 const s=economy.createTradeGame('满仓');s.cash=60000;
 for(const o of [...s.offers].filter(o=>o.kind!=='rush')){const r=economy.reduceTrade(s,{type:'ACCEPT',offerId:o.id});Object.assign(s,r.state);}
 assert.equal(s.active.length,2);const {c}=boot(s);const html=vm.runInContext('portScene()',c);assert.match(html,/比较扩一个货位/);assert.match(html,/先跟进手里的货/);
});


test('confirmed shipping stays in its scene with one clear next action and no second rebooking',()=>{
 const s=economy.createTradeGame('连续调度'),offer=s.offers.find(o=>o.kind==='quick');
 const signed=economy.reduceTrade(s,{type:'ACCEPT',offerId:offer.id,supplier:'reliable',shipping:'sea'}).state;
 const changed=economy.reduceTrade(signed,{type:'REBOOK_SHIPPING',orderId:offer.id,shipping:'rail'}).state;
 const {c}=boot(changed);c.id=offer.id;vm.runInContext('routeOrderId=id',c);
 const html=vm.runInContext('portScene()',c);
 assert.match(html,/船期安排好了/);assert.match(html,/按已选船期出运/);assert.match(html,/第 22 天到港/);
 assert.doesNotMatch(html,/data-action="rebook"|下一单，做哪笔/);
});
test('unpaid tail rows provide the actual same-order follow action without changing cash',()=>{
 const s=economy.createTradeGame('尾款');
 const {c}=boot(s);vm.runInContext("state.receivables=[{id:'tail-actual',customer:'客户',amount:1200,dueDay:29}]",c);const before=vm.runInContext('JSON.stringify(state)',c),html=vm.runInContext('pendingTails()',c);
 assert.match(html,/跟进这笔回款/);assert.match(html,/data-action="follow-order" data-id="tail-actual"/);
 assert.match(html,/第 29 天到账/);assert.equal(vm.runInContext('JSON.stringify(state)',c),before);
});


test('focused order follows actual shipping and receivable state without inventing collected cash',()=>{
 const s=economy.createTradeGame('连续履约'),offer=s.offers.find(o=>o.kind==='long');
 const signed=economy.reduceTrade(s,{type:'ACCEPT',offerId:offer.id,supplier:'reliable',shipping:'sea'}).state;
 const shipped=economy.reduceTrade(signed,{type:'FOLLOW_ORDER',orderId:offer.id}).state;
 assert.equal(shipped.active[0].paidShipping,true);
 let ctx=boot(shipped).c;ctx.id=offer.id;vm.runInContext('routeOrderId=id',ctx);
 let html=vm.runInContext('portScene()',ctx);assert.match(html,/这批货正在路上/);assert.match(html,/跟进这批货到港/);assert.doesNotMatch(html,/下一单，做哪笔/);
 const delivered=economy.reduceTrade(shipped,{type:'FOLLOW_ORDER',orderId:offer.id}).state;
 assert.equal(delivered.active.length,0);assert.equal(delivered.receivables.length,1);
 ctx=boot(delivered).c;ctx.id=offer.id;vm.runInContext('routeOrderId=id',ctx);const before=vm.runInContext('JSON.stringify(state)',ctx);
 html=vm.runInContext('portScene()',ctx);assert.match(html,/货已到，等这笔钱回家/);assert.match(html,/这张票据还不是现金/);assert.match(html,/跟进这笔回款/);assert.equal(vm.runInContext('JSON.stringify(state)',ctx),before);
 const paid=economy.reduceTrade(delivered,{type:'FOLLOW_ORDER',orderId:offer.id}).state;
 ctx=boot(paid).c;ctx.id=offer.id;vm.runInContext('routeOrderId=id',ctx);html=vm.runInContext('portScene()',ctx);assert.match(html,/harbor-inquiry/);assert.equal(vm.runInContext('routeOrderId',ctx),null);
});

test('focused scenes expose actual spare slots and do not offer a fictional route choice',()=>{
 const s=economy.createTradeGame('机会'),offer=s.offers.find(o=>o.kind==='rush');
 const signed=economy.reduceTrade(s,{type:'ACCEPT',offerId:offer.id,supplier:'express',shipping:'rail'}).state;
 assert.equal(signed.active.length,1);const {c}=boot(signed);c.id=offer.id;vm.runInContext('routeOrderId=id',c);
 const html=vm.runInContext('portScene()',c);assert.match(html,/1 空位 \/ 2 笔机会/);assert.match(html,/目前没有可用的替代方案/);assert.doesNotMatch(html,/点船比较|你来选这趟/);
});
test('receivable cargo identity survives saves and old receipts remain compatible',()=>{
 const s=economy.createTradeGame('身份'),offer=s.offers.find(o=>o.kind==='long');
 let next=economy.reduceTrade(s,{type:'ACCEPT',offerId:offer.id}).state;
 next=economy.reduceTrade(next,{type:'FOLLOW_ORDER',orderId:offer.id}).state;
 next=economy.reduceTrade(next,{type:'FOLLOW_ORDER',orderId:offer.id}).state;
 assert.equal(next.receivables[0].cargo.product,offer.product);assert.equal(next.receivables[0].cargo.quantity,offer.quantity);
 let restored=economy.parseTradeSave(JSON.stringify(next));const {c}=boot(restored);c.id=offer.id;vm.runInContext('routeOrderId=id',c);assert.match(vm.runInContext('portScene()',c),new RegExp(`${offer.quantity}${offer.unit}`));
 const amount=restored.receivables[0].amount;delete restored.receivables[0].cargo;restored=economy.parseTradeSave(JSON.stringify(restored));assert.equal(restored.receivables[0].amount,amount);
 restored.receivables[0].cargo={product:'not-a-product',quantity:1,unit:'箱'};assert.throws(()=>economy.parseTradeSave(JSON.stringify(restored)));
});

test('ending is visible above the focused receivable without pretending outstanding money was collected',()=>{
 const {c}=boot(economy.createTradeGame('收官'));vm.runInContext("state.ending={day:141,orders:11,netWorth:62442};state.receivables=[{id:'tail',customer:'客户',amount:28393,dueDay:162}];routeOrderId='tail';endingFresh=true",c);
 const before=vm.runInContext('JSON.stringify(state)',c),html=vm.runInContext('desk()',c);
 assert.ok(html.indexOf('这一程，做成了')<html.indexOf('货已到，等这笔钱回家'));
 assert.match(html,/¥28,393 未到账/);assert.match(html,/回到码头看全局/);assert.equal(vm.runInContext('JSON.stringify(state)',c),before);
});

test('full warehouse preview prices the additional real order after paying expansion cost',()=>{
 const s=economy.createTradeGame('并行');s.cash=60000;
 for(const o of [...s.offers].filter(o=>o.kind!=='rush'))Object.assign(s,economy.reduceTrade(s,{type:'ACCEPT',offerId:o.id}).state);
 assert.equal(s.active.length,2);const {c}=boot(s),before=vm.runInContext('JSON.stringify(state)',c);
 const html=vm.runInContext('expansionPreview("warehouse")',c);assert.match(html,/眼前有单，缺的是一个位置/);assert.match(html,/新增货位/);assert.match(html,/扩建并接这单后/);assert.match(html,/不会自动签单/);assert.match(html,/询盘到期/);assert.equal(vm.runInContext('JSON.stringify(state)',c),before);
 vm.runInContext('state.cash=100',c);assert.match(vm.runInContext('expansionPreview("warehouse")',c),/暂时没有找到能守约且留足周转/);
});


test('capacity purchase explains team alternative without claiming warehouse is optimal',()=>{
 const {c}=boot(economy.createTradeGame('投资对照'));const before=vm.runInContext('JSON.stringify(state)',c);
 let html=vm.runInContext('expansionPreview("warehouse")',c);assert.match(html,/团队投入 ¥4,800/);assert.match(html,/不适用于团队方案/);assert.match(html,/data-id="team"/);assert.equal(vm.runInContext('JSON.stringify(state)',c),before);
 vm.runInContext('state.upgrades.team=2',c);html=vm.runInContext('expansionPreview("warehouse")',c);assert.match(html,/团队投入 ¥14,400/);
 vm.runInContext('state.upgrades.team=3',c);assert.doesNotMatch(vm.runInContext('expansionPreview("warehouse")',c),/改看业务团队/);
});


test('framework history does not claim nonexistent repeat price bonus',()=>{
 const {c}=boot(economy.createTradeGame('客户'));vm.runInContext("state.customers={'europe-flagship':{name:'框架',market:'europe',orders:1,revenue:100,qualified:true},'asia-quick':{name:'老客',market:'asia',orders:2,revenue:200}}",c);
 const html=vm.runInContext('company()',c);assert.match(html,/框架试单已履约/);assert.match(html,/复购基准价 \+2.4%/);assert.doesNotMatch(html,/复购基准价 \+1.2%/);
});


test('one near-term growth cue follows actual unlocks and disappears after achievement',()=>{
 const {c}=boot(economy.createTradeGame('下一程'));vm.runInContext('state.metrics.orders=2',c);assert.match(vm.runInContext('growthCue()',c),/再交付 1 单，开通中东/);
 vm.runInContext('state.metrics.orders=3;state.reputation=6',c);assert.match(vm.runInContext('growthCue()',c),/再交付 5 单，向欧洲出发 · 还需信誉 8/);
 vm.runInContext('state.metrics.orders=8;state.reputation=8',c);assert.match(vm.runInContext('growthCue()',c),/在欧洲交好第一单/);
 vm.runInContext("state.customers['europe-quick']={market:'europe',orders:1}",c);assert.match(vm.runInContext('growthCue()',c),/完成欧洲框架试单/);
 vm.runInContext('state.ending={day:141}',c);assert.equal(vm.runInContext('growthCue()',c),'');
});


test('existing victory folds into a small record and does not duplicate the dock score panel',()=>{
 const {c}=boot(economy.createTradeGame('续玩'));vm.runInContext("state.ending={day:141,orders:11,netWorth:62442};state.receivables=[{id:'tail',customer:'客户',amount:28393,dueDay:162}];routeOrderId='tail'",c);
 let html=vm.runInContext('desk()',c);assert.match(html,/<details class="ending-record">/);assert.doesNotMatch(html,/class="milestone focused-ending"|class="milestone milestone-fold"/);assert.match(html,/尾款未到账，不计入现金/);
 vm.runInContext('endingFresh=true',c);assert.match(vm.runInContext('desk()',c),/class="milestone focused-ending"/);
 vm.runInContext("handle({target:{closest:()=>({dataset:{action:'route-close'}})}})",c);assert.equal(vm.runInContext('endingFresh',c),false);
});

// Current harbor-first shell: assertions cover observable content, not aesthetics.
test('harbor shell removes duplicate dashboard panels and keeps cash and one spatial workflow',()=>{const {c,storage,raw}=boot(economy.createTradeGame('新港口'));const html=vm.runInContext('harborShell()',c);assert.match(html,/harbor-hud/);assert.match(html,/点港口旁的询盘/);assert.match(html,/harbor-inquiry/);assert.doesNotMatch(html,/cash-strip|dispatch-slot|scene-inquiries/);assert.match(html,/公司菜单/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);});
test('graphical quote paths share a day scale and keep unpaid tails separate',()=>{const {c}=boot(economy.createTradeGame('时间路线'));vm.runInContext('quoteId=state.offers.find(o=>o.kind==="long").id',c);const before=vm.runInContext('JSON.stringify(state)',c);const html=vm.runInContext('planCards()',c);assert.match(html,/横向距离按真实天数比较/);assert.match(html,/客户交期/);assert.match(html,/天收齐/);assert.match(html,/stroke-dasharray="5 5"/);assert.equal((html.match(/data-action="quote-plan"/g)||[]).length,3);assert.equal(vm.runInContext('JSON.stringify(state)',c),before);});

test('harbor guide can be replayed and hidden after a completed first order',()=>{const {c}=boot(economy.createTradeGame('指引'));vm.runInContext('state.metrics.orders=1',c);assert.equal(vm.runInContext('harborLesson()',c),'');vm.runInContext('guideReplay=true',c);assert.match(vm.runInContext('harborLesson()',c),/点港口旁的询盘/);vm.runInContext('guideHidden=true',c);assert.equal(vm.runInContext('harborLesson()',c),'');});
test('shipped contracts occupy their bays rather than showing a false free slot',()=>{const {c}=boot(economy.createTradeGame('占位'));vm.runInContext(`state.active=[{id:'sea1',paidShipping:true,shipDay:1,deliveryDay:15,offer:{product:'cups',quantity:50,unit:'箱',market:'asia'}}];shippingGroups=()=>[]`,c);const h=vm.runInContext('portScene()',c);assert.equal((h.match(/physical-bay vacant/g)||[]).length,1);assert.equal((h.match(/physical-bay occupied/g)||[]).length,1);assert.match(h,/此合同正在运输/);});

test('cargo with no legal alternative exposes direct dispatch while adjustable cargo still invites planning',()=>{
 const s=economy.createTradeGame('直接发运');const offer=s.offers.find(o=>o.kind==='quick');
 const signed=economy.reduceTrade(s,{type:'ACCEPT',offerId:offer.id,supplier:'reliable',shipping:'sea'}).state;
 const {c}=boot(signed);assert.doesNotMatch(vm.runInContext('portScene()',c),/aria-label="按合同发运/);
 vm.runInContext('state.active[0].shippingRevision=1',c);
 assert.match(vm.runInContext('portScene()',c),/aria-label="按合同发运/);
});

test('expanded harbor exposes additional real bays without altering the save',()=>{
 const s=economy.createTradeGame('扩张货位');s.upgrades.team=2;s.expansion.warehouse=2;
 const {c,storage,raw}=boot(s);const first=vm.runInContext('portScene()',c);
 assert.match(first,/货位 1–3 \/ 6/);assert.match(first,/data-action="dock-page"/);
 vm.runInContext('dockPage=1',c);const second=vm.runInContext('portScene()',c);
 assert.match(second,/货位 4–6 \/ 6/);assert.equal((second.match(/physical-bay vacant/g)||[]).length,3);
 assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});

test('cargo transfer feedback derives only from actual newly shipped and delivered contracts',()=>{
 const {c}=boot(economy.createTradeGame('装卸'));
 c.before={active:[{id:'a',paidShipping:false},{id:'b',paidShipping:true}],metrics:{orders:0}};
 c.after={active:[{id:'a',paidShipping:true}],metrics:{orders:1}};
 assert.equal(JSON.stringify(vm.runInContext('transferredCargo(before,after)',c)),JSON.stringify({loaded:['a'],delivered:['b']}));
 assert.equal(JSON.stringify(vm.runInContext('transferredCargo(after,after)',c)),JSON.stringify({loaded:[],delivered:[]}));
 c.sameCount={active:[],metrics:{orders:0}};
 assert.equal(JSON.stringify(vm.runInContext('transferredCargo(before,sameCount)',c)),JSON.stringify({loaded:[],delivered:[]}));
});

test('inquiries never replace destination ports, branches, or fulfilled routes',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('稳定港口'));
 const initial=vm.runInContext('portScene()',c);
 assert.match(initial,/customer-port/);assert.match(initial,/harbor-inquiry/);
 vm.runInContext("state.reputation=10;state.metrics.orders=20;state.expansion.branches.asia={manager:'test'};state.customers['europe-flagship']={market:'europe',qualified:true,orders:1};",c);
 const expanded=vm.runInContext('portScene()',c);
 assert.equal((expanded.match(/class="customer-port /g)||[]).length,3);
 assert.match(expanded,/框架试单已合格/);assert.match(expanded,/>商<\/text>/);
 assert.match(expanded,/data-action="market-port" data-market="asia" aria-label="东南亚有/);
 assert.match(expanded,/harbor-inquiry/);
 vm.runInContext('state.offers=[]',c);
 const quiet=vm.runInContext('portScene()',c);
 assert.equal((quiet.match(/class="customer-port /g)||[]).length,3);
 assert.doesNotMatch(quiet,/harbor-inquiry/);assert.match(quiet,/框架试单已合格/);
 assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});


test('port inquiries compare a labeled steady baseline, including rush penalties and full collection time',()=>{
 const s=economy.createTradeGame('港口比单');const {c,storage,raw}=boot(s);
 vm.runInContext("quoteOptions={supplier:'express',shipping:'rail',markup:10}",c);
 const html=vm.runInContext('marketPort("asia")',c);
 const offers=s.offers.filter(o=>o.market==='asia');
 assert.equal((html.match(/省运费方案参考 · 换方案会变化/g)||[]).length,offers.length);
 const cards=html.split('<article>').slice(1);
 offers.forEach((o,i)=>{
  const q=economy.quoteOrder(s,o.id,{supplier:'reliable',shipping:'sea',markup:0,fxMode:'locked',paymentTerms:'standard'});
  c.baseline=q;
  const amount=vm.runInContext('money(Math.abs(baseline.profit))',c);
  assert.ok(cards[i].includes(`预计${q.profit<0?'亏':'赚'} ${amount}`));
  assert.ok(cards[i].includes(`${q.days+q.payLagDays} 天收齐`));
  assert.equal(cards[i].includes('已计赔付'),!!q.penalty);
 });
 assert.ok(offers.some(o=>o.kind==='rush'));
 assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
