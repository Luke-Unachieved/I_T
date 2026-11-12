/** Data-trade economy. All money is fictional RMB, rounded integer. No DOM or storage. */
export const PRODUCTS = [
  {id:'fasteners',name:'五金紧固件',unit:'箱',base:60,color:'#e4b56b'},
  {id:'cups',name:'保温杯',unit:'箱',base:90,color:'#6dc6b3'},
  {id:'lights',name:'LED 灯具',unit:'箱',base:120,color:'#b2b9ef'},
  {id:'tools',name:'电动工具',unit:'箱',base:180,color:'#eea182'},
  {id:'textiles',name:'家居织品',unit:'箱',base:75,color:'#90bfda'},
  {id:'pumps',name:'小型水泵',unit:'箱',base:240,color:'#b6cd86'},
];
export const SUPPLIERS = [
  {id:'reliable',name:'稳达制造',cost:100,quality:94,weeks:2,description:'品质稳定，常规成本 · 生产 2 周'},
  {id:'economy',name:'丰源工厂',cost:84,quality:78,weeks:3,description:'采购省 16%，品质较低 · 生产 3 周'},
  {id:'express',name:'联捷制造',cost:112,quality:90,weeks:1,description:'采购贵 12%，抢交期 · 生产 1 周'},
];
export const SHIPPING = [
  {id:'sea',name:'海运拼箱',rate:7,weeks:2,description:'运费低 · 运输 2 周'},
  {id:'rail',name:'专线快运',rate:12,weeks:1,description:'运费中 · 运输 1 周'},
  {id:'air',name:'空运急件',rate:23,weeks:0,description:'运费高 · 当周送达'},
];
export const UPGRADES = [
  {id:'team',name:'业务团队',baseCost:4800,max:3,description:'每级 +1 并行订单槽，周运营费 +120'},
  {id:'quality',name:'驻厂验货',baseCost:3600,max:2,description:'每级品质 +10，周运营费 +60'},
  {id:'logistics',name:'航线协议',baseCost:5200,max:3,description:'每级运费 -15%，周运营费 +30'},
  {id:'sourcing',name:'集采网络',baseCost:6500,max:3,description:'每级采购成本 -5%，周运营费 +40'},
];
export const MARKETS = [
  {id:'asia',name:'东南亚',needed:0}, {id:'middle',name:'中东',needed:3}, {id:'europe',name:'欧洲',needed:8},
];
const kinds=[
 {id:'quick',name:'稳健回款',depositRate:70,payLag:0,deadline:5,quality:75,factor:138},
 {id:'long',name:'大额账期',depositRate:20,payLag:4,deadline:6,quality:90,factor:170},
 {id:'rush',name:'紧急补货',depositRate:50,payLag:1,deadline:2,quality:85,factor:166},
];
const clone=x=>JSON.parse(JSON.stringify(x));
const round=Math.round;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const idOf=(list,id)=>list.find(x=>x.id===id);
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const pricesAt=week=>Object.fromEntries(PRODUCTS.map((p,i)=>[p.id,round(p.base*(1+0.13*Math.sin(week*0.61+i*1.7)+0.07*Math.cos(week*0.27+i)))]));
export const capacity=s=>2+s.upgrades.team;
export const weeklyCost=s=>120+s.upgrades.team*120+s.upgrades.quality*60+s.upgrades.logistics*30+s.upgrades.sourcing*40+Math.ceil(s.debt*0.008);
export const netWorth=s=>s.cash-s.debt+s.receivables.reduce((a,r)=>a+r.amount,0)+s.active.reduce((a,o)=>a+(o.paidShipping?o.cost+o.freight:o.procurement)-o.deposit,0);
export const upgradeCost=(s,id)=>{const u=idOf(UPGRADES,id);return u?u.baseCost*(s.upgrades[id]+1):0;};
export const unlockedMarkets=s=>MARKETS.filter((m,i)=>s.metrics.orders>=m.needed && (i<2||s.reputation>=8));
function offersFor(s){
 const markets=unlockedMarkets(s);const scale=1+Math.min(1.8,s.metrics.orders*0.075);
 const offers=kinds.map((k,i)=>{
 const p=PRODUCTS[(s.week+i*2-1)%PRODUCTS.length];
 const market=markets[(s.week+i-1)%markets.length];
 const customerId=market.id+'-'+k.id;const repeat=s.customers[customerId]?.orders||0;
 const quantity=Math.max(10,round(5400*scale*(k.id==='long'?1.45:1)/p.base/5)*5);
 return {id:`w${s.week}-${k.id}`,kind:k.id,kindName:k.name,customerId,customer:`${market.name}${['连锁商店','批发商','采购商'][i]}`,market:market.id,product:p.id,quantity,unit:p.unit,price:round(p.base*k.factor/100*(1+Math.min(repeat,6)*0.012)),depositRate:k.depositRate,payLag:k.payLag,deadline:k.deadline,quality:k.quality,repeat,expires:s.week};
 });
 // A concrete last challenge replaces an arbitrary order-count grind.
 if(markets.length===3 && !s.customers['europe-flagship']?.qualified && !s.active.some(o=>o.offer.kind==='flagship')){
  const p=PRODUCTS[(s.week+1)%PRODUCTS.length];const quantity=Math.max(20,round(18000/p.base/5)*5);
  offers.push({id:`w${s.week}-flagship`,kind:'flagship',kindName:'年度框架试单',customerId:'europe-flagship',customer:'欧洲连锁采购中心',market:'europe',product:p.id,quantity,unit:p.unit,price:round(p.base*1.85),depositRate:15,payLag:3,deadline:3,quality:95,repeat:s.customers['europe-flagship']?.orders||0,expires:s.week});
 }
 return offers;
}
export function createTradeGame(name='我的贸易公司'){
 const s={version:2,ruleset:3,name:String(name).trim().slice(0,24)||'我的贸易公司',week:1,cash:18000,debt:0,reputation:0,receivables:[],active:[],offers:[],history:[],prices:pricesAt(1),priceHistory:[],customers:{},upgrades:{team:0,quality:0,logistics:0,sourcing:0},metrics:{orders:0,revenue:0,profit:0,ontime:0,rejected:0,brokered:0},log:[],lastBrokerWeek:0,ending:null};
 s.offers=offersFor(s);s.priceHistory=[{week:1,...s.prices}];s.history=[{week:1,cash:s.cash,netWorth:netWorth(s),revenue:0,profit:0}];return s;
}
export function quoteOrder(s,offerId,options={}){
 const offer=s.offers.find(x=>x.id===offerId);const supplier=idOf(SUPPLIERS,options.supplier||'reliable'),shipping=idOf(SHIPPING,options.shipping||'sea');
 const markup=options.markup??0;
 if(!offer||!supplier||!shipping||!Number.isInteger(markup)||markup < -10 || markup > 15)return {valid:false,reason:'报价方案无效'};
 const cost=round(offer.quantity*s.prices[offer.product]*supplier.cost/100*(1-s.upgrades.sourcing*0.05));
 const freight=round(offer.quantity*PRODUCTS.find(p=>p.id===offer.product).base*shipping.rate/100*(1-s.upgrades.logistics*0.15));
 const revenue=round(offer.quantity*offer.price*(1+markup/100));
 const deposit=round(revenue*offer.depositRate/100),procurement=round(cost*0.4),balance=cost-procurement;
 const weeks=supplier.weeks+shipping.weeks,quality=Math.min(100,supplier.quality+s.upgrades.quality*10);
 const late=Math.max(0,weeks-offer.deadline),shortfall=Math.max(0,offer.quality-quality);
 const penalty=round(revenue*Math.min(.25,late*.06+shortfall*.003));
 const chance=clamp(round(88-markup*2.3+Math.min(offer.repeat,5)*2+Math.min(s.reputation,20)*0.3-late*12-shortfall*.5),5,98);
 const cashRequired=Math.max(0,procurement-deposit),profit=revenue-cost-freight-penalty;
 const settlementWeek=s.week+weeks+offer.payLag;
 let reason='';if(s.active.length>=capacity(s))reason='并行订单已满，交付后释放名额';else if(s.cash<cashRequired)reason=`还需垫资 ¥${cashRequired-s.cash}`;
 return {valid:!reason,reason,offer,supplier:supplier.id,shipping:shipping.id,markup,revenue,cost,freight,deposit,procurement,balance,profit,margin:round(profit/revenue*100),chance,weeks,payLag:offer.payLag,capacity:1,quality,late,penalty,cashRequired,settlementWeek,steps:[{week:s.week,label:'签约订金',amount:deposit-procurement},{week:s.week+supplier.weeks,label:'工厂尾款与出运',amount:-balance-freight},{week:settlementWeek,label:'客户尾款',amount:revenue-deposit-penalty}],productionWeeks:supplier.weeks};
}
function projected(s,quote){
 const events=[];
 for(const o of s.active){if(!o.paidShipping)events.push({week:o.shipWeek,amount:-o.balance-o.freight});events.push({week:o.dueWeek,amount:o.revenue-o.deposit-o.penalty});}
 for(const r of s.receivables)events.push({week:r.dueWeek,amount:r.amount});
 if(quote?.offer)for(const x of quote.steps)events.push({week:x.week,amount:x.amount});
 return events;
}
export function forecastCash(s,quote){
 const events=projected(s,quote);let cash=s.cash;const points=[];
 for(let offset=0;offset<=6;offset++){
  const week=s.week+offset;let inflow=0,outflow=offset?weeklyCost(s):0;
  for(const e of events.filter(x=>x.week===week)){if(e.amount>=0)inflow+=e.amount;else outflow-=e.amount;}
  cash+=inflow-outflow;points.push({week,cash,inflow,outflow});
 }
 return {points,minimum:Math.min(...points.map(p=>p.cash)),note:'已签订单成本锁定，按当前运营费预测；不含未来新订单与行情变化。负值表示需要提前补充资金。'};
}
function log(s,text,kind='info'){s.log.unshift({week:s.week,text,kind});s.log=s.log.slice(0,60);}
function result(state,message,changed=false){return {state,message,changed};}
function finish(s,o){
 s.metrics.orders++;s.metrics.revenue+=o.revenue-o.penalty;s.metrics.profit+=o.profit;s.metrics.ontime+=o.late?0:1;
 s.reputation=clamp(s.reputation+(o.late? -1:o.quality>=o.offer.quality?2:0),0,100);
 const c=s.customers[o.offer.customerId]||{orders:0,revenue:0,market:o.offer.market,name:o.offer.customer};c.orders++;c.revenue+=o.revenue-o.penalty;if(o.offer.kind==='flagship'&&o.late===0&&o.quality>=o.offer.quality)c.qualified=true;s.customers[o.offer.customerId]=c;
 const amount=o.revenue-o.deposit-o.penalty;
 if(o.dueWeek<=s.week){s.cash+=amount;log(s,`${o.offer.customer}尾款 ¥${amount} 到账。`,'cash');}
 else{s.receivables.push({id:o.id,customer:o.offer.customer,amount,dueWeek:o.dueWeek});}
 log(s,`${o.offer.customer}收货：本单利润 ¥${o.profit}${o.penalty?`，含赔付 ¥${o.penalty}`:''}。${o.late?'交期延误':'准时交付'}，复购记录 +1。`,'success');
}
export function reduceTrade(state,action){
 if(!action||typeof action!=='object')return result(state,'操作无效');const s=clone(state);
 if(action.type==='ACCEPT'){
  const q=quoteOrder(s,action.offerId,action);if(!q.valid)return result(state,q.reason);
  const forecast=forecastCash(s,q);if(forecast.minimum<0)return result(state,`未来 6 周最低现金将为 ¥${forecast.minimum}，先换方案、回款或补充周转金`);
  s.offers=s.offers.filter(o=>o.id!==action.offerId);
  // Offer-specific fixed draw prevents reload rerolls; every rejected inquiry is consumed.
  if(hash(q.offer.id+'|'+q.offer.customerId)%100>=q.chance){s.metrics.rejected++;log(s,`${q.offer.customer}未接受报价，本次询盘关闭。`);return result(s,`客户未接受这份报价（成交率 ${q.chance}%）。可选择另一笔询盘。`,true);}
  s.cash+=q.deposit-q.procurement;
  s.active.push({...q,id:q.offer.id,acceptedWeek:s.week,shipWeek:s.week+q.productionWeeks,deliveryWeek:s.week+q.weeks,dueWeek:q.settlementWeek,paidShipping:false});
  log(s,`${q.offer.customer}签约 ¥${q.revenue}，订金 ¥${q.deposit} / 首付款 ¥${q.procurement}。`,'success');return result(s,`签约成功，预计利润 ¥${q.profit}，第 ${q.settlementWeek} 周收齐货款。`,true);
 }
 if(action.type==='NEXT_WEEK'){
  if(s.week>=520)return result(state,'已达到 520 周经营记录上限，可导出纪念存档');
  s.week++;const operating=weeklyCost(s);s.cash-=operating;
  for(const o of s.active){if(!o.paidShipping&&o.shipWeek<=s.week){s.cash-=o.balance+o.freight;o.paidShipping=true;log(s,`${o.offer.customer}已出运，支付尾款及运费 ¥${o.balance+o.freight}。`);}}
  const arriving=s.active.filter(o=>o.deliveryWeek<=s.week);s.active=s.active.filter(o=>o.deliveryWeek>s.week);for(const o of arriving)finish(s,o);
  const received=s.receivables.filter(r=>r.dueWeek<=s.week);s.receivables=s.receivables.filter(r=>r.dueWeek>s.week);for(const r of received){s.cash+=r.amount;log(s,`${r.customer}账期结束，尾款 ¥${r.amount} 到账。`,'cash');}
  if(s.cash<0){const advance=-s.cash;s.cash=0;s.debt+=advance;log(s,`资金缺口 ¥${advance} 已转周转欠款，按周计息。接代办或回款后尽快归还。`,'warning');}
  s.prices=pricesAt(s.week);s.priceHistory.push({week:s.week,...s.prices});s.priceHistory=s.priceHistory.slice(-24);s.offers=offersFor(s);
  s.history.push({week:s.week,cash:s.cash,netWorth:netWorth(s),revenue:s.metrics.revenue,profit:s.metrics.profit});s.history=s.history.slice(-52);
  if(!s.ending&&s.customers['europe-flagship']?.qualified&&new Set(Object.values(s.customers).filter(c=>c.orders>0).map(c=>c.market)).size===3&&netWorth(s)>=60000){s.ending={week:s.week,title:'从第一单到三大市场',orders:s.metrics.orders,netWorth:netWorth(s)};log(s,'阶段达成：三大市场。欧洲框架试单已合格交付，你已建立有复购、有现金流的贸易公司，可继续经营。','success');}
  return result(s,arriving.length?`本周交付 ${arriving.length} 单，现金 ¥${s.cash}`:`第 ${s.week} 周，运营支出 ¥${operating}`,true);
 }
 if(action.type==='UPGRADE'){
  const u=idOf(UPGRADES,action.id);if(!u)return result(state,'没有这项建设');if(s.upgrades[u.id]>=u.max)return result(state,'已满级');const cost=upgradeCost(s,u.id);
  if(s.cash<cost)return result(state,'现金不足');s.cash-=cost;s.upgrades[u.id]++;
  if(forecastCash(s).minimum<0)return result(state,'升级后已有合同可能资金不足，先等回款');
  log(s,`${u.name}升至 ${s.upgrades[u.id]} 级，投入 ¥${cost}。`,'success');return result(s,`${u.name}已升级`,true);
 }
 if(action.type==='BRIDGE'){
  if(s.debt>=12000)return result(state,'主动周转额度已用满');const amount=Math.min(6000,12000-s.debt);s.cash+=amount;s.debt+=amount;log(s,`取得周转金 ¥${amount}，周息 0.8%。`);return result(s,`到账 ¥${amount}，每周新增利息 ¥${Math.ceil(amount*.008)}`,true);
 }
 if(action.type==='REPAY'){
  if(!Number.isSafeInteger(action.amount)||action.amount<=0)return result(state,'还款金额无效');const amount=Math.min(action.amount,s.cash,s.debt);if(!amount)return result(state,'暂无可还金额');s.cash-=amount;s.debt-=amount;
  if(forecastCash(s).minimum<0)return result(state,'请先留足已签订单的周转资金');log(s,`归还周转金 ¥${amount}。`);return result(s,`已还款 ¥${amount}`,true);
 }
 if(action.type==='BROKER'){
  if(s.lastBrokerWeek===s.week)return result(state,'本周代办已完成');s.lastBrokerWeek=s.week;const pay=Math.max(420,weeklyCost(s)+100);s.cash+=pay;s.metrics.brokered++;log(s,`完成单证代办，收入 ¥${pay}。`,'cash');return result(s,`代办收入 ¥${pay}，本周不再重复结算`,true);
 }
 return result(state,'未知操作');
}

// New mode is intentionally isolated from v1. Never silently rewrite an old save.
export function parseTradeSave(raw){
 let s;try{s=typeof raw==='string'?JSON.parse(raw):clone(raw);}catch{throw new Error('存档不是有效 JSON');}
 const integer=(v,min=0,max=1000000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const text=(v,max=80)=>typeof v==='string'&&v.length<=max;
 const fail=()=>{throw new Error('经营存档数据无效或版本不兼容，原存档未改动');};
 if(!s||s.version!==2||!text(s.name,24)||!integer(s.week,1,520)||!integer(s.cash)||!integer(s.debt)||!integer(s.reputation,0,100))fail();
 for(const key of ['receivables','active','offers','history','priceHistory','log'])if(!Array.isArray(s[key])||s[key].length>600)fail();
 for(const u of UPGRADES)if(!integer(s.upgrades?.[u.id],0,u.max))fail();
 for(const k of ['orders','revenue','profit','ontime','rejected','brokered'])if(!integer(s.metrics?.[k],k==='profit'?-1000000000:0))fail();
 if(!integer(s.lastBrokerWeek,0,s.week)||!s.customers||typeof s.customers!=='object'||Array.isArray(s.customers)||Object.keys(s.customers).length>10)fail();
 for(const [id,c] of Object.entries(s.customers))if(!/^(asia|middle|europe)-(quick|long|rush|flagship)$/.test(id)||!integer(c.orders)||!integer(c.revenue)||!text(c.name)||!idOf(MARKETS,c.market)||(c.qualified!==undefined&&typeof c.qualified!=='boolean'))fail();
 for(const p of PRODUCTS)if(!integer(s.prices?.[p.id],1,10000))fail();
 const offerValid=o=>o&&text(o.id)&&/^w\d+-(quick|long|rush|flagship)$/.test(o.id)&&(kinds.some(k=>k.id===o.kind)||o.kind==='flagship')&&idOf(PRODUCTS,o.product)&&idOf(MARKETS,o.market)&&text(o.customer)&&/^(asia|middle|europe)-(quick|long|rush|flagship)$/.test(o.customerId)&&integer(o.quantity,1,100000)&&integer(o.price,1,10000)&&integer(o.depositRate,0,100)&&integer(o.payLag,0,12)&&integer(o.deadline,1,12)&&integer(o.quality,0,100)&&integer(o.repeat,0,10000)&&integer(o.expires,1,520)&&text(o.kindName)&&text(o.unit);
 if(s.offers.length>4||s.active.length>capacity(s)||!s.offers.every(offerValid))fail();
 const allIds=[...s.offers.map(o=>o.id),...s.active.map(o=>o.id),...s.receivables.map(r=>r.id)];if(new Set(allIds).size!==allIds.length)fail();
 for(const o of s.active){
  if(!offerValid(o.offer)||o.id!==o.offer.id||!idOf(SUPPLIERS,o.supplier)||!idOf(SHIPPING,o.shipping)||typeof o.paidShipping!=='boolean')fail();
  for(const k of ['revenue','cost','freight','deposit','procurement','balance','penalty','cashRequired'])if(!integer(o[k]))fail();
  for(const k of ['acceptedWeek','shipWeek','deliveryWeek','dueWeek'])if(!integer(o[k],1,550))fail();
  if(!Array.isArray(o.steps)||o.steps.length!==3||!o.steps.every(x=>integer(x.week,1,550)&&text(x.label,80)&&integer(x.amount,-1000000000))||!integer(o.weeks,1,6)||!integer(o.productionWeeks,1,3)||!integer(o.payLag,0,12)||!integer(o.margin,-100,100)||o.capacity!==1)fail();
  if(!integer(o.profit,-1000000000)||!integer(o.markup,-10,15)||!integer(o.quality,0,100)||!integer(o.late,0,20)||!integer(o.chance,0,100)||o.deposit>o.revenue||o.penalty>o.revenue-o.deposit||o.cost!==o.procurement+o.balance||o.profit!==o.revenue-o.cost-o.freight-o.penalty||o.acceptedWeek>s.week||o.deliveryWeek<=s.week||o.shipWeek<o.acceptedWeek||o.deliveryWeek<o.shipWeek||o.dueWeek<o.deliveryWeek)fail();
 }
 for(const r of s.receivables)if(!text(r.id)||!text(r.customer)||!integer(r.amount)||!integer(r.dueWeek,s.week+1,550))fail();
 for(const h of s.history)if(!integer(h.week,1,s.week)||!integer(h.cash)||!integer(h.netWorth,-1000000000)||!integer(h.revenue)||!integer(h.profit,-1000000000))fail();
 for(const h of s.priceHistory){if(!integer(h.week,1,s.week))fail();for(const p of PRODUCTS)if(!integer(h[p.id],1,10000))fail();}
 for(const l of s.log)if(!integer(l.week,1,s.week)||!text(l.text,300)||!['info','success','cash','warning'].includes(l.kind))fail();
 if(s.ending!==null&&(!s.ending||!integer(s.ending.week,1,s.week)||!text(s.ending.title)||!integer(s.ending.orders)||!integer(s.ending.netWorth,-1000000000)))fail();
 if(s.ruleset===undefined||s.ruleset===2){s.ruleset=3;if(s.ending&&(!s.customers['europe-flagship']?.qualified||netWorth(s)<60000)){s.previousEnding=s.ending;s.ending=null;}}
 if(s.ruleset!==3)fail();
 return s;
}
