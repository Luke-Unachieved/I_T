/** Data-trade economy. Cash is fictional integer RMB; USD contracts use integer cents. No DOM or storage. */
export const PRODUCTS = [
  {id:'fasteners',name:'五金紧固件',unit:'箱',base:60,color:'#e4b56b'},
  {id:'cups',name:'保温杯',unit:'箱',base:90,color:'#6dc6b3'},
  {id:'lights',name:'LED 灯具',unit:'箱',base:120,color:'#b2b9ef'},
  {id:'tools',name:'电动工具',unit:'箱',base:180,color:'#eea182'},
  {id:'textiles',name:'家居织品',unit:'箱',base:75,color:'#90bfda'},
  {id:'pumps',name:'小型水泵',unit:'箱',base:240,color:'#b6cd86'},
];
export const SUPPLIERS = [
  {id:'reliable',name:'稳达制造',cost:100,quality:94,weeks:2,days:14,description:'品质稳定，常规成本 · 生产 14 天'},
  {id:'economy',name:'丰源工厂',cost:84,quality:78,weeks:3,days:21,description:'采购省 16%，品质较低 · 生产 21 天'},
  {id:'express',name:'联捷制造',cost:112,quality:90,weeks:1,days:7,description:'采购贵 12%，抢交期 · 生产 7 天'},
];
export const SHIPPING = [
  {id:'sea',name:'海运拼箱',rate:7,weeks:2,days:14,description:'运费低 · 运输 14 天'},
  {id:'rail',name:'专线快运',rate:12,weeks:1,days:7,description:'运费中 · 运输 7 天'},
  {id:'air',name:'空运急件',rate:23,weeks:0,days:0,description:'运费高 · 加急运输计入下方总交期'},
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
export const MANAGERS=[
 {id:'chen',name:'陈卓',role:'渠道负责人',description:'负责市场的成交率 +5 个百分点',chance:5,freight:0,quality:0},
 {id:'zhou',name:'周岚',role:'货运负责人',description:'负责市场的运费再降 8%',chance:0,freight:8,quality:0},
 {id:'lin',name:'林远',role:'验货负责人',description:'负责市场的交付品质 +4',chance:0,freight:0,quality:4},
];
const emptyExpansion=()=>({warehouse:0,branches:{}});
export const expansionCost=s=>8000*((s.expansion?.warehouse||0)+1);
export const expansionWeekly=s=>(s.expansion?.warehouse||0)*100+Object.keys(s.expansion?.branches||{}).length*180;
export function expansionBonus(s,market){
 const branch=s.expansion?.branches?.[market],manager=MANAGERS.find(m=>m.id===branch?.manager);
 return {warehouse:s.expansion?.warehouse||0,branch:!!branch,manager:manager||null,chance:(branch?3:0)+(manager?.chance||0),freight:manager?.freight||0,quality:manager?.quality||0};
}
export const PAYMENT_TERMS=[
 {id:'standard',name:'按原条件',priceAdjustment:0,depositChange:0,payLagChangeDays:0},
 {id:'cashflow',name:'让价换快回款',priceAdjustment:-4,depositChange:20,payLagChangeDays:-14},
 {id:'growth',name:'给账期换高价',priceAdjustment:5,depositChange:-20,payLagChangeDays:14},
];
const termsAcceptance={quick:{cashflow:-8,growth:-12},long:{cashflow:-12,growth:4},rush:{cashflow:-4,growth:-8}};
function paymentProposal(offer,id='standard'){
 const t=idOf(PAYMENT_TERMS,id);
 if(!t||((offer.currency!=='USD'||offer.kind==='flagship')&&id!=='standard'))return null;
 return {id:t.id,name:t.name,depositRate:id==='standard'?offer.depositRate:clamp(offer.depositRate+t.depositChange,5,90),payLagDays:Math.max(0,(offer.payLagDays??offer.payLag*7)+t.payLagChangeDays),priceAdjustment:t.priceAdjustment,acceptanceAdjustment:id==='standard'?0:termsAcceptance[offer.kind]?.[id]??0};
}
const contractUsd=(offer,markup,terms)=>round(offer.quantity*offer.usdUnitCents*(1+terms.priceAdjustment/100)*(1+markup/100));
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
export const dayToWeek=day=>Math.floor((day-1)/7)+1;
export const weekToDay=week=>(week-1)*7+1;
export const MAX_DAY=3640;
// Fictional bounded weekly FX market. No date/random reroll; UI displays current rate only.
export const FX_MIN=64000,FX_MAX=80000;
export const fxRateAt=week=>round(72000+5200*Math.sin(week*.47)+2400*Math.cos(week*.19));
const convertUsd=(cents,rate)=>round(cents*rate/1000000);
const tailValue=(fx,rate)=>convertUsd(fx.tailUsdCents,fx.mode==='locked'?fx.lockedRate:rate);
const fxBounds=fx=>fx.mode==='locked'?[fx.estimatedTail,fx.estimatedTail]:[tailValue(fx,FX_MIN),tailValue(fx,FX_MAX)];

const pricesAt=week=>Object.fromEntries(PRODUCTS.map((p,i)=>[p.id,round(p.base*(1+0.13*Math.sin(week*0.61+i*1.7)+0.07*Math.cos(week*0.27+i)))]));
export const capacity=s=>2+s.upgrades.team+(s.expansion?.warehouse||0)+Object.keys(s.expansion?.branches||{}).length;
export const weeklyCost=s=>120+s.upgrades.team*120+s.upgrades.quality*60+s.upgrades.logistics*30+s.upgrades.sourcing*40+Math.ceil(s.debt*0.008)+expansionWeekly(s);
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
 return offers.map(o=>({...o,deadlineDays:o.deadline*7,payLagDays:o.payLag*7,expiresDay:o.expires*7,currency:'USD',quoteRate:fxRateAt(s.week),usdUnitCents:round(o.price*1000000/fxRateAt(s.week))}));
}
export function createTradeGame(name='我的贸易公司'){
 const s={version:2,ruleset:6,expansion:emptyExpansion(),day:1,name:String(name).trim().slice(0,24)||'我的贸易公司',week:1,cash:18000,debt:0,reputation:0,receivables:[],active:[],offers:[],history:[],prices:pricesAt(1),priceHistory:[],customers:{},upgrades:{team:0,quality:0,logistics:0,sourcing:0},metrics:{orders:0,revenue:0,profit:0,ontime:0,rejected:0,brokered:0},log:[],lastBrokerWeek:0,ending:null};
 s.offers=offersFor(s);s.priceHistory=[{day:1,week:1,...s.prices}];s.history=[{day:1,week:1,cash:s.cash,netWorth:netWorth(s),revenue:0,profit:0}];return s;
}
export function quoteOrder(s,offerId,options={}){
 const offer=s.offers.find(x=>x.id===offerId);const supplier=idOf(SUPPLIERS,options.supplier||'reliable'),shipping=idOf(SHIPPING,options.shipping||'sea');
 const markup=options.markup??0;
 if(!offer||!supplier||!shipping||!Number.isInteger(markup)||markup < -10 || markup > 15)return {valid:false,reason:'报价方案无效'};
 const paymentTerms=paymentProposal(offer,options.paymentTerms??'standard');
 if(!paymentTerms)return {valid:false,reason:'此询盘不支持该付款提案'};
 const cost=round(offer.quantity*s.prices[offer.product]*supplier.cost/100*(1-s.upgrades.sourcing*0.05));
 const expansion=expansionBonus(s,offer.market);
 const baseFreight=round(offer.quantity*PRODUCTS.find(p=>p.id===offer.product).base*shipping.rate/100*(1-s.upgrades.logistics*0.15));
 const freight=round(baseFreight*(1-expansion.warehouse*.05)*(1-expansion.freight/100));
 const usdCents=offer.currency==='USD'?contractUsd(offer,markup,paymentTerms):0;
 const signRate=fxRateAt(s.week),revenue=usdCents?convertUsd(usdCents,signRate):round(offer.quantity*offer.price*(1+markup/100));
 const deposit=round(revenue*paymentTerms.depositRate/100),procurement=round(cost*0.4),balance=cost-procurement;
 const weeks=supplier.weeks+shipping.weeks,quality=Math.min(100,supplier.quality+s.upgrades.quality*10+expansion.quality);
 const late=Math.max(0,weeks-offer.deadline),shortfall=Math.max(0,offer.quality-quality);
 const penalty=round(revenue*Math.min(.25,late*.06+shortfall*.003));
 const chance=clamp(round(88-markup*2.3+paymentTerms.acceptanceAdjustment+Math.min(offer.repeat,5)*2+Math.min(s.reputation,20)*0.3+expansion.chance-late*12-shortfall*.5),5,98);
 let fx=null;
 if(offer.currency==='USD'){
  const mode=options.fxMode??'locked';
  if(!['locked','spot'].includes(mode))return {valid:false,reason:'结汇方式无效'};
  // Contract deductions are fixed at signing; only the remaining USD balance floats.
  const tailUsdCents=Math.max(0,usdCents-round(usdCents*paymentTerms.depositRate/100)-round(penalty*1000000/signRate));
  const estimatedTail=convertUsd(tailUsdCents,signRate);
  const fee=mode==='locked'?Math.ceil(estimatedTail*.006):0;
  fx={mode,usdCents,tailUsdCents,signRate,lockedRate:signRate,fee,estimatedTail};
  [fx.minTail,fx.maxTail]=fxBounds(fx);
 }
 const fee=fx?.fee||0;
 const cashRequired=Math.max(0,procurement+fee-deposit),profit=(fx?deposit+fx.estimatedTail:revenue-penalty)-cost-freight-fee;
 const days=supplier.days+shipping.days,productionDays=supplier.days,payLagDays=paymentTerms.payLagDays,lateDays=Math.max(0,days-offer.deadlineDays);
 const settlementDay=s.day+days+payLagDays,settlementWeek=dayToWeek(settlementDay);
 let reason='';if(penalty>revenue-deposit)reason='预计赔付超过未付尾款，请降低订金提案或改善品质与交期';else if(offer.expiresDay<s.day)reason='询盘已过期';else if(s.active.length>=capacity(s))reason='并行订单已满，交付后释放名额';else if(s.cash<cashRequired)reason=`还需垫资 ¥${cashRequired-s.cash}`;
 return {valid:!reason,reason,offer,expansion,freightSaving:baseFreight-freight,fx,paymentTerms,supplier:supplier.id,shipping:shipping.id,markup,revenue,cost,freight,deposit,procurement,balance,profit,margin:round(profit/revenue*100),chance,weeks,days,productionDays,payLagDays,lateDays,payLag:payLagDays/7,capacity:1,quality,late,penalty,cashRequired,settlementWeek,settlementDay,steps:[{day:s.day,week:s.week,label:'签约净收付',amount:deposit-procurement-fee},{day:s.day+productionDays,week:dayToWeek(s.day+productionDays),label:'工厂尾款与出运',amount:-balance-freight},{day:settlementDay,week:settlementWeek,label:'客户尾款',amount:fx?fx.estimatedTail:revenue-deposit-penalty}],productionWeeks:supplier.weeks};
}
function projected(s,quote){
 const events=[];
 for(const o of s.active){if(!o.paidShipping)events.push({day:o.shipDay,amount:-o.balance-o.freight});events.push({day:o.dueDay,amount:o.fx?o.fx.estimatedTail:o.revenue-o.deposit-o.penalty,fx:o.fx});}
 for(const r of s.receivables)events.push({day:r.dueDay,amount:r.amount,fx:r.fx});
 if(quote?.offer)for(const x of quote.steps)events.push({day:x.day,amount:x.amount,fx:x.day===quote.settlementDay?quote.fx:null});
 return events;
}
/** Every daily low is sampled: a midweek shipment cannot hide between chart ticks. */
export function forecastCash(s,quote){
 const events=projected(s,quote);let cash=s.cash,lowCash=s.cash,highCash=s.cash;const points=[];
 for(let offset=0;offset<=42;offset++){
  const day=s.day+offset,week=dayToWeek(day);let inflow=0,outflow=offset>0&&(day-1)%7===0?weeklyCost(s):0;
  for(const e of events.filter(x=>x.day===day)){if(e.amount>=0)inflow+=e.amount;else outflow-=e.amount;}
  let lowInflow=inflow,highInflow=inflow;
  for(const e of events.filter(x=>x.day===day&&x.fx?.mode==='spot')){const [lo,hi]=fxBounds(e.fx);lowInflow+=lo-e.amount;highInflow+=hi-e.amount;}
  cash+=inflow-outflow;lowCash+=lowInflow-outflow;highCash+=highInflow-outflow;points.push({day,week,cash,lowCash,highCash,inflow,outflow});
 }
 return {points,minimum:Math.min(...points.map(p=>p.cash)),stressMinimum:Math.min(...points.map(p=>p.lowCash)),estimated:events.some(e=>e.fx?.mode==='spot'),horizonDays:42,note:'逐日预测未来42天；每7天更新行情与询盘、结算运营费。已签合同按实际日期收付且锁价，不含未来新单及新增借款。负值需提前补充资金。浮动美元尾款按签约汇率估计，阴影为模拟压力区间而非收益保证，实际到期结汇。'};
}
function log(s,text,kind='info'){s.log.unshift({day:s.day,week:s.week,text,kind});s.log=s.log.slice(0,60);}
function result(state,message,changed=false,extra={}){return {state,message,changed,...extra};}
const deliveryProfit=(s,o)=>o.profit+(o.fx&&o.dueDay<=s.day?tailValue(o.fx,fxRateAt(s.week))-o.fx.estimatedTail:0);
const deliveryEstimated=(s,o)=>o.fx?.mode==='spot'&&o.dueDay>s.day;
function finish(s,o){
 s.metrics.orders++;s.metrics.revenue+=o.fx?o.deposit+o.fx.estimatedTail:o.revenue-o.penalty;s.metrics.profit+=o.profit;s.metrics.ontime+=o.late?0:1;
 s.reputation=clamp(s.reputation+(o.late? -1:o.quality>=o.offer.quality?2:0),0,100);
 const c=s.customers[o.offer.customerId]||{orders:0,revenue:0,market:o.offer.market,name:o.offer.customer};c.orders++;c.revenue+=o.fx?o.deposit+o.fx.estimatedTail:o.revenue-o.penalty;if(o.offer.kind==='flagship'&&o.late===0&&o.quality>=o.offer.quality)c.qualified=true;s.customers[o.offer.customerId]=c;
 const amount=o.fx?o.fx.estimatedTail:o.revenue-o.deposit-o.penalty;
 if(o.dueDay<=s.day){s.cash+=settleFx(s,amount,o.fx,o.offer.customerId);log(s,`${o.offer.customer}尾款 ¥${o.fx?tailValue(o.fx,fxRateAt(s.week)):amount} 到账。`,'cash');}
 else{s.receivables.push({id:o.id,customer:o.offer.customer,amount,currency:o.fx?'USD':'CNY',fx:o.fx??null,...(o.paymentTerms?{paymentTerms:o.paymentTerms}:{}),customerId:o.offer.customerId,dueDay:o.dueDay,dueWeek:o.dueWeek});}
 log(s,`${o.offer.customer}收货：本单利润${deliveryEstimated(s,o)?'（浮动尾款未收，暂估）':''} ¥${deliveryProfit(s,o)}${o.penalty?`，含赔付 ¥${o.penalty}`:''}。${o.late?'交期延误':'准时交付'}，复购记录 +1。`,'success');
}
function settleFx(s,estimated,fx,customerId){
 if(!fx)return estimated;
 const actual=tailValue(fx,fxRateAt(s.week)),delta=actual-estimated;
 s.metrics.profit+=delta;s.metrics.revenue+=delta;
 if(s.customers[customerId])s.customers[customerId].revenue+=delta;
 log(s,`美元尾款 $${(fx.tailUsdCents/100).toFixed(2)} × ${((fx.mode==='locked'?fx.lockedRate:fxRateAt(s.week))/10000).toFixed(4)}，结汇 ¥${actual}（${fx.mode==='locked'?'银行锁汇':'到期结汇'}，相对签约估值 ${delta>=0?'+':''}¥${delta}）。`,'cash');
 return actual;
}
/** Settle exactly one calendar day. Caller commits only after handling any cash shortfall. */
function settleDay(s){
 const startingProfit=s.metrics.profit;
 s.day++;s.week=dayToWeek(s.day);const boundary=(s.day-1)%7===0;
 const operating=boundary?weeklyCost(s):0;s.cash-=operating;let payments=0;
 for(const o of s.active){if(!o.paidShipping&&o.shipDay<=s.day){s.cash-=o.balance+o.freight;payments+=o.balance+o.freight;o.paidShipping=true;log(s,`${o.offer.customer}已出运，支付尾款及运费 ¥${o.balance+o.freight}。`);}}
 const arriving=s.active.filter(o=>o.deliveryDay<=s.day);s.active=s.active.filter(o=>o.deliveryDay>s.day);for(const o of arriving)finish(s,o);
 const received=s.receivables.filter(r=>r.dueDay<=s.day);s.receivables=s.receivables.filter(r=>r.dueDay>s.day);for(const r of received){s.cash+=settleFx(s,r.amount,r.fx,r.customerId);log(s,`${r.customer}账期结束，尾款 ¥${r.fx?tailValue(r.fx,fxRateAt(s.week)):r.amount} 到账。`,'cash');}
 let newFlagship=false,expiredOffers=0;
 if(boundary){expiredOffers=s.offers.filter(o=>o.kind!=='flagship').length;if(expiredOffers)log(s,`${expiredOffers}笔普通询盘到期，询盘板按每7天周期更新。`);s.prices=pricesAt(s.week);s.priceHistory.push({day:s.day,week:s.week,...s.prices});s.priceHistory=s.priceHistory.slice(-24);s.offers=offersFor(s);newFlagship=s.offers.some(o=>o.kind==='flagship');}
 if(!s.ending&&s.customers['europe-flagship']?.qualified&&new Set(Object.values(s.customers).filter(c=>c.orders>0).map(c=>c.market)).size===3&&netWorth(s)>=60000){s.ending={day:s.day,week:s.week,title:'从第一单到三大市场',orders:s.metrics.orders,netWorth:netWorth(s)};log(s,'阶段达成：三大市场。欧洲框架试单已合格交付，你已建立有复购、有现金流的贸易公司，可继续经营。','success');}
 return {operating,payments,deliveries:arriving.length,profit:arriving.reduce((n,o)=>n+deliveryProfit(s,o),0),estimatedDeliveries:arriving.filter(o=>deliveryEstimated(s,o)).length,fxAdjustment:s.metrics.profit-startingProfit-arriving.reduce((n,o)=>n+deliveryProfit(s,o),0),receipts:received.reduce((n,r)=>n+(r.fx?tailValue(r.fx,fxRateAt(s.week)):r.amount),0)+arriving.filter(o=>o.dueDay<=s.day).reduce((n,o)=>n+(o.fx?tailValue(o.fx,fxRateAt(s.week)):o.revenue-o.deposit-o.penalty),0),newFlagship,expiredOffers};
}
export function reduceTrade(state,action){
 if(!action||typeof action!=='object')return result(state,'操作无效');const s=clone(state);
 if(action.type==='ACCEPT'){
  const q=quoteOrder(s,action.offerId,action);if(!q.valid)return result(state,q.reason);
  const forecast=forecastCash(s,q);if(forecast.stressMinimum<0)return result(state,`未来 42 天压力情景最低现金为 ¥${forecast.stressMinimum}，先换方案、回款或补充周转金`);
  s.offers=s.offers.filter(o=>o.id!==action.offerId);
  // Offer-specific fixed draw prevents reload rerolls; every rejected inquiry is consumed.
  if(hash(q.offer.id+'|'+q.offer.customerId)%100>=q.chance){s.metrics.rejected++;log(s,`${q.offer.customer}未接受报价，本次询盘关闭。`);return result(s,`客户未接受这份报价（成交率 ${q.chance}%）。可选择另一笔询盘。`,true);}
  s.cash+=q.deposit-q.procurement-(q.fx?.fee||0);
  s.active.push({...q,id:q.offer.id,acceptedDay:s.day,acceptedWeek:s.week,shipDay:s.day+q.productionDays,shipWeek:dayToWeek(s.day+q.productionDays),deliveryDay:s.day+q.days,deliveryWeek:dayToWeek(s.day+q.days),dueDay:q.settlementDay,dueWeek:q.settlementWeek,paidShipping:false});
  log(s,`${q.offer.customer}签约 ${q.fx?'USD '+(q.fx.usdCents/100).toFixed(2):'¥'+q.revenue}，订金 ¥${q.deposit} / 工厂首付 ¥${q.procurement}${q.fx?' / 锁汇费 ¥'+q.fx.fee:''}。${q.paymentTerms?'付款提案：'+q.paymentTerms.name+'，订金'+q.paymentTerms.depositRate+'%，交付后'+q.paymentTerms.payLagDays+'天收尾款。':''}`,'success');return result(s,`签约成功，预计利润 ¥${q.profit}，第 ${q.settlementDay} 天收齐货款。`,true);
 }
 if(['NEXT_DAY','NEXT_WEEK','ADVANCE_DAYS','ADVANCE'].includes(action.type)){
  const requestedDays=action.type==='NEXT_DAY'?1:action.type==='NEXT_WEEK'?7:action.days;
  if(!Number.isInteger(requestedDays)||requestedDays<1||requestedDays>7)return result(state,'每次可推进1至7天',false,{advancedDays:0,requestedDays,pause:null});
  let advancedDays=0,pause=null,expiredOffers=0;let current=s;const summary={deliveries:0,profit:0,estimatedDeliveries:0,fxAdjustment:0,receipts:0,payments:0,operating:0};
  const allowed=new Set(Array.isArray(action.allowExpireOfferIds)?action.allowExpireOfferIds.filter(x=>typeof x==='string'):[]);
  for(let i=0;i<requestedDays;i++){
   if(current.day>=MAX_DAY){pause={code:'limit',day:current.day,message:'已达到3640天经营记录上限，可导出纪念存档'};break;}
   const expiring=current.offers.filter(o=>o.kind==='flagship'&&o.expiresDay<current.day+1&&!allowed.has(o.id));
   if(expiring.length){pause={code:'offers_expiring',day:current.day,offerIds:expiring.map(o=>o.id),message:`${expiring.length}笔未处理询盘今天到期。先查看报价，或明确放弃本批询盘再继续。`};break;}
   const next=clone(current),beforeMarkets=unlockedMarkets(current).length,beforeEnding=!!current.ending;
   const outcome=settleDay(next);
   if(next.cash<0&&action.allowFundingDay!==next.day){pause={code:'funding_gap',day:next.day,shortfall:-next.cash,message:`第${next.day}天确定收支后仍缺¥${-next.cash}。请先周转，或确认将该日缺口转为计息欠款。`};break;}
   if(next.cash<0){const advance=-next.cash;next.cash=0;next.debt+=advance;log(next,`资金缺口 ¥${advance} 已转周转欠款，按周计息。接代办或回款后尽快归还。`,'warning');}
   next.history.push({day:next.day,week:next.week,cash:next.cash,netWorth:netWorth(next),revenue:next.metrics.revenue,profit:next.metrics.profit});next.history=next.history.slice(-365);
   current=next;advancedDays++;expiredOffers+=outcome.expiredOffers;for(const key of Object.keys(summary))summary[key]+=outcome[key];
   if(!beforeEnding&&current.ending){pause={code:'ending',day:current.day,message:'第一程已达成，先看看经营成绩，再继续远航。'};break;}
   if(unlockedMarkets(current).length>beforeMarkets){const newMarkets=unlockedMarkets(current).slice(beforeMarkets);const hasNewOffers=current.offers.some(o=>newMarkets.some(m=>m.id===o.market));pause={code:'market_unlocked',day:current.day,message:hasNewOffers?'已解锁新市场，新市场询盘已到达，去算一单。':'已解锁新市场；新市场询盘在下一次每7天更新时到达。'};break;}
   if(outcome.newFlagship){pause={code:'flagship_available',day:current.day,offerIds:current.offers.filter(o=>o.kind==='flagship').map(o=>o.id),message:'欧洲框架试单已出现，先查看品质、交期与周转要求。'};break;}
  }
  const details=[];
  if(summary.deliveries)details.push(`交付${summary.deliveries}单，交付订单利润${summary.estimatedDeliveries?'（含'+summary.estimatedDeliveries+'单浮动尾款暂估）':''} ¥${summary.profit}`);
  if(summary.fxAdjustment)details.push(`此前应收结汇损益调整 ${summary.fxAdjustment>=0?'+':''}¥${summary.fxAdjustment}`);
  if(summary.receipts)details.push(`实际回款 ¥${summary.receipts}`);
  if(summary.payments)details.push(`支付采购尾款及运费 ¥${summary.payments}`);
  if(summary.operating)details.push(`周结运营及利息 ¥${summary.operating}`);
  const message=`已推进${advancedDays}/${requestedDays}天，当前第${current.day}天。${details.length?details.join('；')+'。':''}${pause?pause.message:''}${expiredOffers?` ${expiredOffers}笔普通询盘已到期，询盘板已按周期更新。`:""}`;
  return result(advancedDays?current:state,message,advancedDays>0,{advancedDays,requestedDays,remainingDays:requestedDays-advancedDays,expiredOffers,summary,pause});
 }
 if(['EXPAND_WAREHOUSE','OPEN_BRANCH','APPOINT','DISMISS'].includes(action.type)){
  s.expansion=s.expansion||emptyExpansion();let cost=0,message='';
  if(action.type==='EXPAND_WAREHOUSE'){
   if(s.expansion.warehouse>=2)return result(state,'集货仓已扩建到上限');
   cost=expansionCost(s);s.expansion.warehouse++;message=`出口集货仓扩至 ${s.expansion.warehouse} 级`;
  }else{
   const market=idOf(MARKETS,action.market);if(!market||(action.type==='OPEN_BRANCH'&&!unlockedMarkets(s).some(m=>m.id===market.id)))return result(state,'先完成交付，打开该市场');
   if(action.type==='OPEN_BRANCH'){
    if(s.expansion.branches[market.id])return result(state,'该市场已有子公司');
    cost=16000;s.expansion.branches[market.id]={manager:null,appointedDay:0};message=`${market.name}子公司成立，并行名额 +1`;
   }else{
    const branch=s.expansion.branches[market.id],manager=idOf(MANAGERS,action.manager);
    if(action.type==='DISMISS'){
     if(!branch?.manager)return result(state,'该子公司尚未任命负责人');
     if(s.day<branch.appointedDay+7)return result(state,'任命满 7 天后才能调任');
     if(s.cash<600)return result(state,'现金不足');s.cash-=600;branch.manager=null;branch.appointedDay=0;
     if(forecastCash(s).stressMinimum<0)return result(state,'请先留足已有合同的周转金');
     log(s,`${market.name}子公司负责人已卸任，交接支出 ¥600。`);return result(s,'负责人已卸任，可调往其他子公司',true);
    }
    if(!branch||!manager)return result(state,'请先设立子公司，再选择负责人');
    if(branch.manager===manager.id)return result(state,'该负责人已在任');
    if(Object.values(s.expansion.branches).some(b=>b.manager===manager.id))return result(state,'这位负责人已在其他子公司任职');
    if(branch.manager&&s.day<branch.appointedDay+7)return result(state,'任命满 7 天后才能调任');
    cost=branch.manager?600:0;branch.manager=manager.id;branch.appointedDay=s.day;message=`${manager.name}已任${market.name}子公司负责人`;
   }
  }
  if(s.cash<cost)return result(state,'现金不足，先等订单回款');s.cash-=cost;
  if(forecastCash(s).stressMinimum<0)return result(state,'扩张后已有合同可能资金不足，先留足周转金');
  log(s,`${message}，投入 ¥${cost}。`,'success');return result(s,message,true);
 }
 if(action.type==='UPGRADE'){
  const u=idOf(UPGRADES,action.id);if(!u)return result(state,'没有这项建设');if(s.upgrades[u.id]>=u.max)return result(state,'已满级');const cost=upgradeCost(s,u.id);
  if(s.cash<cost)return result(state,'现金不足');s.cash-=cost;s.upgrades[u.id]++;
  if(forecastCash(s).stressMinimum<0)return result(state,'升级后已有合同可能资金不足，先等回款');
  log(s,`${u.name}升至 ${s.upgrades[u.id]} 级，投入 ¥${cost}。`,'success');return result(s,`${u.name}已升级`,true);
 }
 if(action.type==='BRIDGE'){
  if(s.debt>=12000)return result(state,'主动周转额度已用满');const amount=Math.min(6000,12000-s.debt);s.cash+=amount;s.debt+=amount;log(s,`取得周转金 ¥${amount}，周息 0.8%。`);return result(s,`到账 ¥${amount}，每周新增利息 ¥${Math.ceil(amount*.008)}`,true);
 }
 if(action.type==='REPAY'){
  if(!Number.isSafeInteger(action.amount)||action.amount<=0)return result(state,'还款金额无效');const amount=Math.min(action.amount,s.cash,s.debt);if(!amount)return result(state,'暂无可还金额');s.cash-=amount;s.debt-=amount;
  if(forecastCash(s).stressMinimum<0)return result(state,'请先留足已签订单的周转资金');log(s,`归还周转金 ¥${amount}。`);return result(s,`已还款 ¥${amount}`,true);
 }
 if(action.type==='BROKER'){
  if(s.lastBrokerWeek===s.week)return result(state,'本周代办已完成');s.lastBrokerWeek=s.week;const pay=Math.max(420,weeklyCost(s)+100);s.cash+=pay;s.metrics.brokered++;log(s,`完成单证代办，收入 ¥${pay}。`,'cash');return result(s,`代办收入 ¥${pay}，本周不再重复结算`,true);
 }
 return result(state,'未知操作');
}

// v1 story saves stay isolated. v2 weekly saves migrate once, without replaying settlement.
function migrateCalendar(s){
 const day=weekToDay(s.week);
 const dated=x=>({...x,day:weekToDay(x.week)});
 const offer=o=>({...o,deadlineDays:o.deadline*7,payLagDays:o.payLag*7,expiresDay:o.expires*7});
 s.day=day;s.offers=s.offers.map(offer);
 s.active=s.active.map(o=>({...o,offer:offer(o.offer),acceptedDay:weekToDay(o.acceptedWeek),shipDay:weekToDay(o.shipWeek),deliveryDay:weekToDay(o.deliveryWeek),dueDay:weekToDay(o.dueWeek),settlementDay:weekToDay(o.dueWeek),days:o.weeks*7,productionDays:o.productionWeeks*7,payLagDays:o.payLag*7,lateDays:o.late*7,steps:o.steps.map(dated)}));
 s.receivables=s.receivables.map(r=>({...r,dueDay:weekToDay(r.dueWeek)}));
 s.history=s.history.map(dated);s.priceHistory=s.priceHistory.map(dated);s.log=s.log.map(dated);
 if(s.ending)s.ending=dated(s.ending);if(s.previousEnding)s.previousEnding=dated(s.previousEnding);
 s.ruleset=4;return s;
}
export function parseTradeSave(raw){
 let s;try{s=typeof raw==='string'?JSON.parse(raw):clone(raw);}catch{throw new Error('存档不是有效 JSON');}
 const integer=(v,min=0,max=1000000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const text=(v,max=80)=>typeof v==='string'&&v.length<=max;
 const fail=()=>{throw new Error('经营存档数据无效或版本不兼容，原存档未改动');};
 if(!s||s.version!==2||!text(s.name,24)||!integer(s.week,1,520)||!integer(s.cash)||!integer(s.debt)||!integer(s.reputation,0,100))fail();
 const daily=[4,5,6].includes(s.ruleset);
 if(![undefined,2,3,4,5,6].includes(s.ruleset))fail();
 if(daily&&(!integer(s.day,1,MAX_DAY)||s.week!==dayToWeek(s.day)))fail();
 if(s.ruleset!==6&&s.expansion===undefined)s.expansion=emptyExpansion();
 const ex=s.expansion;
 if(!ex||!integer(ex.warehouse,0,2)||!ex.branches||typeof ex.branches!=='object'||Array.isArray(ex.branches)||Object.keys(ex.branches).length>3)fail();
 const assigned=[];
 for(const [market,b] of Object.entries(ex.branches)){
  if(!s.metrics||!idOf(MARKETS,market)||!b||typeof b!=='object'||!(b.manager===null||idOf(MANAGERS,b.manager))||!integer(b.appointedDay,0,s.day??weekToDay(s.week))||(b.manager===null?b.appointedDay!==0:b.appointedDay<1))fail();
  if(b.manager){if(assigned.includes(b.manager))fail();assigned.push(b.manager);}
 }
 for(const key of ['receivables','active','offers','history','priceHistory','log'])if(!Array.isArray(s[key])||s[key].length>600)fail();
 for(const u of UPGRADES)if(!integer(s.upgrades?.[u.id],0,u.max))fail();
 for(const k of ['orders','revenue','profit','ontime','rejected','brokered'])if(!integer(s.metrics?.[k],k==='profit'?-1000000000:0))fail();
 if(!integer(s.lastBrokerWeek,0,s.week)||!s.customers||typeof s.customers!=='object'||Array.isArray(s.customers)||Object.keys(s.customers).length>10)fail();
 for(const [id,c] of Object.entries(s.customers))if(!/^(asia|middle|europe)-(quick|long|rush|flagship)$/.test(id)||!integer(c.orders)||!integer(c.revenue)||!text(c.name)||!idOf(MARKETS,c.market)||(c.qualified!==undefined&&typeof c.qualified!=='boolean'))fail();
 for(const p of PRODUCTS)if(!integer(s.prices?.[p.id],1,10000))fail();
 const fxValid=f=>{
  if(!f||!['locked','spot'].includes(f.mode)||!integer(f.usdCents,1,1000000000)||!integer(f.tailUsdCents,0,f.usdCents)||!integer(f.signRate,FX_MIN,FX_MAX)||f.lockedRate!==f.signRate||!integer(f.fee)||!integer(f.estimatedTail)||!integer(f.minTail)||!integer(f.maxTail))return false;
  const [lo,hi]=fxBounds(f);
  return f.estimatedTail===convertUsd(f.tailUsdCents,f.signRate)&&f.fee===(f.mode==='locked'?Math.ceil(f.estimatedTail*.006):0)&&f.minTail===lo&&f.maxTail===hi;
 };
 const currencyValid=o=>o.currency===undefined||(o.currency==='USD'&&integer(o.usdUnitCents,1,1000000)&&integer(o.quoteRate,FX_MIN,FX_MAX)&&o.quoteRate===fxRateAt(o.expires)&&o.usdUnitCents===round(o.price*1000000/o.quoteRate));
 const dateValid=(x,dayKey,weekKey,min=1,max=3850)=>integer(x[dayKey],min,max)&&x[weekKey]===dayToWeek(x[dayKey]);
 const offerValid=o=>o&&currencyValid(o)&&text(o.id)&&/^w\d+-(quick|long|rush|flagship)$/.test(o.id)&&(kinds.some(k=>k.id===o.kind)||o.kind==='flagship')&&idOf(PRODUCTS,o.product)&&idOf(MARKETS,o.market)&&text(o.customer)&&/^(asia|middle|europe)-(quick|long|rush|flagship)$/.test(o.customerId)&&integer(o.quantity,1,100000)&&integer(o.price,1,10000)&&integer(o.depositRate,0,100)&&integer(o.payLag,0,12)&&integer(o.deadline,1,12)&&integer(o.quality,0,100)&&integer(o.repeat,0,10000)&&integer(o.expires,1,520)&&text(o.kindName)&&text(o.unit)&&(!daily||(o.deadlineDays===o.deadline*7&&o.payLagDays===o.payLag*7&&o.expiresDay===o.expires*7));
 if(s.offers.length>4||s.active.length>capacity(s)||!s.offers.every(offerValid))fail();
 if(daily&&s.offers.some(o=>o.expiresDay<s.day))fail();
 const allIds=[...s.offers.map(o=>o.id),...s.active.map(o=>o.id),...s.receivables.map(r=>r.id)];if(new Set(allIds).size!==allIds.length)fail();
 for(const o of s.active){
  const terms=o.offer&&paymentProposal(o.offer,o.paymentTerms?.id??'standard');
  if(!terms)fail();
  if(o.paymentTerms!==undefined){
   if(!o.paymentTerms||Object.keys(terms).some(k=>o.paymentTerms[k]!==terms[k])||(daily&&o.payLagDays!==terms.payLagDays)||o.payLag!==terms.payLagDays/7)fail();
  }
  if(o.offer?.currency==='USD'){
   if(!fxValid(o.fx)||o.fx.signRate!==fxRateAt(o.acceptedWeek)||o.fx.usdCents!==contractUsd(o.offer,o.markup,terms)||o.revenue!==convertUsd(o.fx.usdCents,o.fx.signRate)||o.deposit!==round(o.revenue*terms.depositRate/100)||o.fx.tailUsdCents!==Math.max(0,o.fx.usdCents-round(o.fx.usdCents*terms.depositRate/100)-round(o.penalty*1000000/o.fx.signRate)))fail();
   if(o.steps?.[0]?.amount!==o.deposit-o.procurement-o.fx.fee||o.steps?.[1]?.amount!==-o.balance-o.freight||o.steps?.[2]?.amount!==o.fx.estimatedTail)fail();
  }else if(o.fx!=null)fail();
  if(!offerValid(o.offer)||o.id!==o.offer.id||!idOf(SUPPLIERS,o.supplier)||!idOf(SHIPPING,o.shipping)||typeof o.paidShipping!=='boolean')fail();
  for(const k of ['revenue','cost','freight','deposit','procurement','balance','penalty','cashRequired'])if(!integer(o[k]))fail();
  for(const k of ['acceptedWeek','shipWeek','deliveryWeek','dueWeek'])if(!integer(o[k],1,550))fail();
  if(!Array.isArray(o.steps)||o.steps.length!==3||!o.steps.every(x=>integer(x.week,1,550)&&text(x.label,80)&&integer(x.amount,-1000000000))||!integer(o.weeks,1,6)||!integer(o.productionWeeks,1,3)||!integer(o.payLag,0,14)||!integer(o.margin,-100,100)||o.capacity!==1)fail();
  if(!integer(o.profit,-1000000000)||!integer(o.markup,-10,15)||!integer(o.quality,0,100)||!integer(o.late,0,20)||!integer(o.chance,0,100)||o.deposit>o.revenue||o.penalty>o.revenue-o.deposit||o.cost!==o.procurement+o.balance||o.profit!==(o.fx?o.deposit+o.fx.estimatedTail-o.cost-o.freight-o.fx.fee:o.revenue-o.cost-o.freight-o.penalty)||o.acceptedWeek>s.week||o.shipWeek<o.acceptedWeek||o.deliveryWeek<o.shipWeek||o.dueWeek<o.deliveryWeek)fail();
  if(!daily&&o.deliveryWeek<=s.week)fail();
  if(daily){
   for(const [d,w] of [['acceptedDay','acceptedWeek'],['shipDay','shipWeek'],['deliveryDay','deliveryWeek'],['dueDay','dueWeek']])if(!dateValid(o,d,w))fail();
   if(o.acceptedDay>s.day||o.deliveryDay<=s.day||o.days!==o.weeks*7||o.productionDays!==o.productionWeeks*7||o.payLagDays!==o.payLag*7||o.lateDays!==o.late*7||o.shipDay!==o.acceptedDay+o.productionDays||o.deliveryDay!==o.acceptedDay+o.days||o.dueDay!==o.deliveryDay+o.payLagDays||o.settlementDay!==o.dueDay||o.paidShipping!==(o.shipDay<=s.day))fail();
   if(!o.steps.every(x=>dateValid(x,'day','week'))||o.steps[0].day!==o.acceptedDay||o.steps[1].day!==o.shipDay||o.steps[2].day!==o.dueDay)fail();
  }
 }
 for(const r of s.receivables)if(r.paymentTerms!==undefined){
  const t=r.paymentTerms,config=t&&idOf(PAYMENT_TERMS,t.id),kind=r.customerId?.split('-')[1];
  if(!config||t.name!==config.name||t.priceAdjustment!==config.priceAdjustment||!integer(t.depositRate,0,100)||!integer(t.payLagDays,0,98)||t.payLagDays%7!==0||t.acceptanceAdjustment!==(t.id==='standard'?0:termsAcceptance[kind]?.[t.id])||(kind==='flagship'&&t.id!=='standard'))fail();
 }
 for(const r of s.receivables)if((r.currency!==undefined&&!['USD','CNY'].includes(r.currency))||(r.currency==='USD'&&!r.fx)||(r.currency==='CNY'&&r.fx!=null)||(r.fx!=null&&(!fxValid(r.fx)||r.amount!==r.fx.estimatedTail||!text(r.customerId)||!s.customers[r.customerId]))||!text(r.id)||!text(r.customer)||!integer(r.amount)||!integer(r.dueWeek,daily?s.week:s.week+1,550)||(daily&&!dateValid(r,'dueDay','dueWeek',s.day+1)))fail();
 for(const h of s.history)if(!integer(h.week,1,s.week)||!integer(h.cash)||!integer(h.netWorth,-1000000000)||!integer(h.revenue)||!integer(h.profit,-1000000000)||(daily&&!dateValid(h,'day','week',1,s.day)))fail();
 for(const h of s.priceHistory){if(!integer(h.week,1,s.week)||(daily&&!dateValid(h,'day','week',1,s.day)))fail();for(const p of PRODUCTS)if(!integer(h[p.id],1,10000))fail();}
 for(const l of s.log)if(!integer(l.week,1,s.week)||!text(l.text,300)||!['info','success','cash','warning'].includes(l.kind)||(daily&&!dateValid(l,'day','week',1,s.day)))fail();
 for(const key of ['ending','previousEnding'])if(s[key]!=null&&(!integer(s[key].week,1,s.week)||!text(s[key].title)||!integer(s[key].orders)||!integer(s[key].netWorth,-1000000000)||(daily&&!dateValid(s[key],'day','week',1,s.day))))fail();
 if(s.ending===undefined)fail();
 if(s.ruleset===undefined||s.ruleset===2){if(s.ending&&(!s.customers['europe-flagship']?.qualified||netWorth(s)<60000)){s.previousEnding=s.ending;s.ending=null;}}
 if(!daily){s=migrateCalendar(s);return parseTradeSave(s);}
 s.ruleset=6;return s;
}
