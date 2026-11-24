import {netProfitAmount} from './deal-room-net-profit.js';
import {marketAvailable,marketBook} from './deal-room-market.js?v=36';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {goodsPriceRecords,priorSupplyAgreements} from './deal-room-goods-prices.js';
import {linenFreightInvite} from './deal-room-linen-freight.js?v=36';
import {atelierRestockInvite,atelierRestockProfit} from './deal-room-atelier-restock.js?v=36';
import {tradingChapter,tradingChapterView} from './deal-room-trading-chapter.js?v=36';
import {lifeReadingLampBasis} from './deal-room-life.js?v=36';
import {supplyLotsView} from './deal-room-supply-view.js';
import {shopTrialInvite} from './deal-room-shop-trial.js?v=36';
import {stockProcurementAccounting} from './deal-room-stock-procurement.js?v=36';
import {stockProcurementInvite} from './deal-room-stock-view.js?v=36';
import {revisionInvite} from './deal-room-revision-view.js';
import {cooperationChapter} from './deal-room-cooperation.js?v=36';
import {cooperationView} from './deal-room-cooperation-view.js?v=36';
import {clientProjects,openingCurationOffers,businessOpportunities} from './deal-room-engine.js?v=36';
import {launchInvite} from './deal-room-launch-view.js';
import {studioProjectEligibility} from './deal-room-studio-project.js?v=36';
import {studioProjectInvite} from './deal-room-studio-project-view.js?v=36';
import {careerProjects} from './deal-room-career-focus.js?v=36';
import {caseGrowthInvite} from './deal-room-case-growth-view.js?v=36';
import {accountReceipt,accountCoverage,canExpandAccount,accountRevisionBasis} from './deal-room-account.js?v=36';
const money=n=>`¥${Number(n).toLocaleString('zh-CN')}`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Referrers change the anchor product, not the identity of the buying company.
function curationBuyerChoices(state,referrals){
 const groups=new Map();
 for(const r of referrals){
  const buyer=r.buyer?.split(' · ')[0];if(!buyer)continue;
  if(!groups.has(buyer))groups.set(buyer,[]);
  groups.get(buyer).push(r);
 }
 return [...groups].map(([buyer,offers])=>{
  const repeat=(state.curationHistory||[]).some(c=>c.status==='paid'&&c.buyer?.split(' · ')[0]===buyer);
  return `<section class="business-route"><small>买手组合选品</small><h3>${escape(buyer)} · ${repeat?'再做组合':'洽谈组合'}</h3><p>选一件主推商品，再为这位买手搭配。</p><div class="referral-choices">${offers.map(r=>`<button data-referrer="${escape(r.id)}"><strong>主推 ${escape(r.product)}</strong><small>来源：${escape(r.referrerName.split(' · ')[0])} 的已交付案例</small></button>`).join('')}</div></section>`;
 }).join('');
}
/** Reveal only unfinished briefs for already-available customer relationships. */
export function hasNextStudioUse(state){
 return ['independent','group'].some(direction=>{
  const e=studioProjectEligibility(state,direction);if(!e.valid)return false;
  const delivered=(state.caseGrowthHistory||[]).filter(h=>h.status==='paid'&&h.purpose==='studio-project'&&h.studioDirection===direction&&h.referrerId===e.referrerId);
  return e.briefs.some(brief=>!delivered.some(h=>h.studioBrief===brief||h.allocationVersion===1&&(h.allocation?.[brief]>0)));
 });
}
/** Compact home receipt, derived only from fulfilled store orders. */
export function accountCompletionGlance(state,trade=tradingChapter(state)){
 const deliveries=(state.accountHistory||[]).filter(a=>a.status==='paid'&&Number.isInteger(a.stores)&&a.stores>0);
 const stores=deliveries.reduce((n,a)=>n+a.stores,0);
 if(stores!==6)return '';
 let offset=0;
 const shop=`<svg viewBox="0 0 48 44" aria-hidden="true"><path d="M7 15h34v25H7z" fill="#eee7d7" stroke="#9ca991"/><path d="M4 15l5-9h30l5 9z" fill="#41634e"/><path d="M4 16h40" stroke="#cdbb8d" stroke-width="3"/><rect x="12" y="22" width="13" height="12" fill="#e2c987"/><path d="M30 23h6v17h-6z" fill="#8b9e81"/></svg>`;
 return `<section class="account-completion-glance" aria-label="六家门店已交付"><header><strong>Northline · 六家店都已收货</strong><span>货款已收齐</span></header><div class="account-completion-shops" role="list" aria-label="已供货门店">${deliveries.map(a=>{const start=offset;offset+=a.stores;return Array.from({length:a.stores},(_,i)=>`<span role="listitem" aria-label="第 ${start+i+1} 家店已收货">${shop}<small>${start+i+1} 店</small></span>`).join('');}).join('')}</div><p>${deliveries.map(a=>`<span>${a.stores} 家店 · ${escape(a.seriesSource?.label||'通用商品组合')}</span>`).join('')}</p>${trade?`<p>Mira 也收到了 ${trade.model.contract.quantity} 盏${trade.model.product}。</p><button class="quiet" id="finish-trading">回看供货工作室的这一程 →</button>`:''}</section>`;
}
export function homeLifeView(state){
 if(!['review','complete'].includes(state.phase)||!(state.contracts||[]).some(c=>c.status==='paid'))return '';
 const ids=new Set((state.personalLife?.purchases||[]).map(p=>p.itemId));
 const names=[['chair','阅读角'],['coffee','自己的咖啡'],['books','手工书册'],['record','唱片机'],['records','周末唱片'],['readinglamp','调光阅读角'],['balcony','自己的阳台']].filter(([id])=>ids.has(id)).map(([,name])=>name);
 const spent=Number.isSafeInteger(state.personalLife?.spent)?state.personalLife.spent:0;
 const lampInvite=!ids.has('readinglamp')&&lifeReadingLampBasis(state);
 return `<section class="home-life" aria-label="赚钱以后的生活"><h3>工作室与住处</h3><div class="home-life-links"><button id="open-office-improvement">${state.officeImprovement?'去窗边工作室':'布置窗边工作室'}</button>${state.officeImprovement?`<button id="open-office-annex">${state.officeAnnex?'去样品会客室':'先参观样品会客室'}</button>`:''}</div>
 ${names.length||spent||lampInvite?`<details><summary>家里的物件</summary>${names.length?`<p>${names.join(' · ')}</p>`:''}${spent?`<p>已经为家里添置 ${money(spent)}</p>`:''}${lampInvite?(ids.has('chair')?'<p>米拉的调光灯订单已结清。你也可以另订一盏同款，摆在阅读椅旁。</p>':'<p>米拉的调光灯订单已结清。家里有了阅读椅，也可以另订一盏同款。</p>'):''}</details>`:''}</section>`;
}
function realizedBusinessNet(state){
 const paid=(state.contracts||[]).filter(c=>c.status==='paid'),cases=state.curationHistory||[],orders=state.collection?.orders||[];
 const revisionNet=(state.collectionRevision?.orders||[]).filter(o=>o.status==='paid').reduce((n,o)=>n+o.netProfit,0)-(state.collectionRevision?.investment||0);
 return (state.marketHistory?.length?marketBook(state).net:0)+(state.linenFreight?.status==='paid'?state.linenFreight.netProfit:0)+atelierRestockProfit(state)+stockProcurementAccounting(state).realizedProfit+revisionNet+paid.reduce((n,o)=>n+o.netProfit,0)+(state.supplyPlanHistory||[]).reduce((n,o)=>n+o.netProfit,0)+cases.reduce((n,o)=>n+o.netProfit,0)+(state.accountHistory||[]).reduce((n,o)=>n+o.netProfit,0)+orders.reduce((n,o)=>n+o.netProfit,0)+(state.caseGrowthHistory||[]).reduce((n,o)=>n+(o.netProfit||0),0)-(state.caseGrowthOperatingCost||0)-(state.collection?.sampleCost||0)-(state.retailOperatingCost||0)-(state.lineFactorySlot?.fee||0)-(state.productDevelopment?.investment||0)-(state.secondSupplier?.investment||0);
}
export function businessHomeView(state,{career,referrals,focus='',directionsOpen=false}){
 const trade=tradingChapter(state),openingOffers=openingCurationOffers(state),expand=canExpandAccount(state);
 const opening=openingOffers.length?`<section class="opening-curation" aria-label="第一份选品委托"><h3>给 ${escape(openingOffers[0].buyer.split(' · ')[0])} 搭一组货</h3><p>挑一件交过的样品作主推，再决定搭什么。</p><div class="referral-choices">${openingOffers.map((r,i)=>`<button data-opening-referrer="${r.id}"><span class="workbench-sample workbench-sample-${i}" aria-hidden="true"></span><strong>${escape(r.product)}</strong><small>${escape(r.referrerName.split(' · ')[0])} 引荐</small></button>`).join('')}</div></section>`:'';
 const chapter=cooperationView(state),chapterAction=chapter?cooperationChapter(state).nextAction:null;
 const retail=!!state.supplyPlanHistory?.length,repeatAction=retail?'CONTINUE_RETAIL_BUSINESS':'CONTINUE_BUSINESS';
 const focusCard=careerFocusView(state,focus,[repeatAction,expand?'OPEN_ACCOUNT_EXPANSION':chapterAction?.type]);
 const model=careerFocusModel(state,focus);
 const nextUse=model.projects.every(p=>p.done)&&hasNextStudioUse(state),useInvites=studioProjectInvite(state);
 const alternativeContent=nextUse?`${useInvites}<details><summary>回看已完成的事业方向</summary>${focusCard}</details>`:`${focusCard}${useInvites}`;
 const recentProjects=state.feedback?.kind==='projects-complete'?projectCompletionView(state):'';
 const guidance=recentProjects?`${recentProjects}${chapter?`<details class="career-alternatives"><summary>回看之前的系列合作</summary>${chapter}</details>`:''}`:chapter?`${chapter}<details class="career-alternatives" ${directionsOpen||nextUse?'open':''}><summary>${nextUse?'下一份用途合作':'其他发展方向与用途合作'}</summary>${alternativeContent}${state.launchProject?.status==='handed'?'':launchInvite(state)}</details>`:`${state.launchProject?.status==='handed'?'':launchInvite(state)}${useInvites}${focusCard}`;
 const cases=state.curationHistory||[],net=realizedBusinessNet(state),boutique=!trade&&tradingChapter(state,'boutique',net);
 const series=state.collection?(state.collection.model==='private'?'买方专用包装，查看已完成合作':state.collection.exclusiveBuyer?'原系列已有独家约定，先看范围':'原稿在工作室，按已签范围找买手'):'做客户的系列，或把设计留给自己';
 const market=typeof marketAvailable==='function'&&marketAvailable(state);
 const newGoods=market?`<button class="workbench-route workbench-market" data-action="OPEN_MARKET"><span class="workbench-thumbnail" aria-hidden="true"></span><span><strong>给新买家选货</strong><small>${MARKET_PRODUCTS.length} 款商品 · 现货或工厂${state.marketHistory?.length?` · 已结清 ${state.marketHistory.length} 笔${state.marketHistory.some(r=>r.kind)?'采购合同':'新品生意'}`:''}</small></span><b aria-hidden="true">›</b></button>`:'';
 const more=`${linenFreightInvite(state)}${stockProcurementInvite(state)}${shopTrialInvite(state)}${revisionInvite(state)}${accountRevisionBasis(state)&&!state.accountHistory?.length?'<section class="revision-invite"><small>Northline · 已确认的版本</small><h3>把潮汐版带到门店</h3><p>按已收到的图样、内托与商品谈铺店。以后扩店可沿用，或另选这位买手已采用的版本；已签门店不变。</p><button data-action="START_ACCOUNT_FROM_REVISION">先看门店报价 →</button></section>':''}`;
 const seriesAction=state.collection?'OPEN_COLLECTION':'START_COLLECTION';
 const promotedActions=recentProjects?[]:model.active?.actions||[];
 const promoted=new Set([chapterAction?.type,...promotedActions.map(a=>a.type)]);
 const promotedReferrers=new Set(promotedActions.filter(a=>a.type==='START_CURATION').map(a=>a.clientId));
 const optionalReferrals=referrals.filter(r=>!promotedReferrers.has(r.id));
 const optionalSeries=!promoted.has(seriesAction),optionalDevelopment=!promoted.has('START_DEVELOPMENT'),optionalProjects=!promoted.has('START_CLIENT_PROJECTS');
 return `<div class="ws-workbench">
 ${expand?'<section class="business-route account-next"><small>Northline · 3 家店已交付</small><h3>余下三家店，接着做吗？</h3><p>先看采购方案，再决定是否接单。</p><button data-action="OPEN_ACCOUNT_EXPANSION">谈余下三家的采购 →</button></section>':''}
 ${accountCompletionGlance(state,trade)}${atelierRestockInvite(state)}${guidance}
 ${opening}
 <section class="workbench-next" aria-label="经营选择"><h3>下一单</h3>${newGoods}<button class="workbench-route" data-action="${repeatAction}"><span class="workbench-sample workbench-sample-0" aria-hidden="true"></span><span><strong>${retail?'按库存给熟客补货':'找熟客谈下一单'}</strong><small>${retail?'先看门店余货，再选客户或等补货日':'沿用已交付的产品与规格'}</small></span><b aria-hidden="true">›</b></button></section>
 ${homeLifeView(state)}
 ${more?`<details class="home-opportunities"><summary>其他订单与产品机会</summary>${more}</details>`:''}
 ${state.launchProject?.status==='handed'?launchInvite(state):''}
 <details class="other-business" ${focusCard||opening?'':'open'}><summary>供货、产品和客户计划</summary>
 <div class="business-routes"><section class="business-route"><h3>两批供货安排</h3>${career.eligible?`<button class="quiet" id="open-supply">谈两批供货安排</button>${priorSupplyAgreements(state,career.clients)}`:`<small class="route-next">${escape(career.reason)}</small>`}${!state.collection&&!state.accountHistory?.length&&!boutique?'<details><summary>只做熟客，也能做成一间精品工作室</summary><p>让两位做过生意的客户再回来，其中一位把两批供货交给你。回单与供货都赚到钱、货款收清，工作室总账也有盈余，就能为这一程收工。</p></details>':''}</section>
 ${retail&&!state.retailPlanning?`<section class="business-route"><h3>看门店补货计划</h3><p>每次铺货后，门店卖完再采购。</p><button data-action="START_RETAIL_PLANNING">按门店余货安排返单 →</button></section>`:''}
 ${retail&&!state.productDevelopment&&optionalDevelopment?`<section class="business-route"><h3>去工厂拿一版新样</h3><p>调光小批，或标准整批？先看工艺，再决定花不花出样钱。</p><button data-action="START_DEVELOPMENT">看看两家工厂 →</button></section>`:''}
 ${state.productDevelopment?.status==='active'?'<section class="business-route"><h3>工厂留样</h3><p>Mira 的报价可用新版本；旧台灯也保留。</p><button data-action="VIEW_DEVELOPMENT">拿出工作室留样 →</button></section>':''}
 ${cases.length&&optionalSeries?`<section class="business-route series-route"><h3>${state.collection?'经营这份系列':'开自己的系列？'}</h3><p>${series}</p><button data-action="${seriesAction}">${state.collection?'看设计与买手关系':'看看两种合作方式'} →</button></section>`:''}
 ${caseGrowthInvite(state)}${curationBuyerChoices(state,optionalReferrals)}
 ${cases.length&&!state.accountHistory?.length?`<details class="business-route"><summary>通用商品的连锁采购 <small>选择一份已交付案例</small></summary>${cases.map(c=>`<button data-account-case="${c.referrerId}">${escape(c.referrerName||c.referrerId)} · ${c.products.length} 款${c.lampVersion==='developed'?' · 调光版':''}</button>`).join('')}</details>`:''}
 ${state.clientProjectSeason&&!state.clientProjectActive&&clientProjects(state).some(p=>!p.completed)?`<section class="business-route"><h3>还有 ${clientProjects(state).filter(p=>!p.completed).length} 项未完成的客户计划</h3><button data-action="RESUME_CLIENT_PROJECTS">继续看剩余计划 →</button></section>`:''}
 ${!state.clientProjectSeason&&retail&&optionalProjects?`<section class="business-route"><h3>客户的新用途</h3><p>橱窗、快闪与餐桌各有交付日期。</p><button data-action="START_CLIENT_PROJECTS">打开客户计划 →</button></section>`:''}</div></details>
 <details class="workbench-net"><summary>${net>=0?'经营累计赚到':'经营投入尚未收回'} <strong>${money(Math.abs(net))}</strong></summary><p>已计日常与出样投入。</p></details>
 ${cases.length||state.accountHistory?.length?`<details class="case-gallery home-archive"><summary>合作档案 · ${cases.length} 份买手案例${state.accountHistory?.length?' · 连锁已供 '+accountCoverage(state)+' 店':''}</summary>${cases.map(c=>`<button data-showcase="${c.referrerId}"><strong>${escape(c.referrerName||c.referrerId)} → ${escape(c.buyer)}</strong><small>${c.products.length} 款 · ${c.quantity} 套</small></button>`).join('')}${state.accountHistory?.length?state.accountHistory.map(accountReceipt).join(''):''}</details>`:''}
 <button class="quiet finish-session" id="finish-session">${boutique?'为这间精品工作室收个尾':trade&&!state.collection?'为供货工作室收个尾':recentProjects&&chapter?'回顾之前的系列合作':cooperationChapter(state).closed?'为这段合作收个尾':'今天先到这里，看看做成了什么'}</button></div>`;
}

/** Read confirmed single-product receipts only. Keep quotes, bundles, unpaid
 * receivables and independent factory variants out of the same price series. */
export function settledUnitPriceGroups(contracts=[]){
 const groups=new Map();
 for(const c of contracts){
  if(c?.status!=='paid'||typeof c.product!=='string'||!c.product||
     !Number.isSafeInteger(c.quantity)||c.quantity<=0||!Number.isSafeInteger(c.revenue)||c.revenue<0||
     !Number.isSafeInteger(c.signedDay)||!Number.isSafeInteger(c.paidDay??c.paymentDay))continue;
  // First Samir contract predates the specification field. Its named variant is still known.
  const spec=c.specification||(c.clientId==='samir'&&c.optionId==='branded'?'branded':'standard');
  const key=JSON.stringify([c.clientId,c.product,spec]);
  if(!groups.has(key))groups.set(key,{name:c.product,spec,rows:[]});
  const rows=groups.get(key).rows;
  rows.push({signedDay:c.signedDay,paidDay:c.paidDay??c.paymentDay,quantity:c.quantity,revenue:c.revenue,unit:c.revenue/c.quantity,...(c.priceSource?{priceSource:c.priceSource}:{}),...(c.separateServiceFee?{separateServiceFee:c.separateServiceFee}:{})});
  if(rows.length>4)rows.shift();
 }
 return [...groups.values()];
}
export function settledUnitPricesView(contracts){
 const groups=settledUnitPriceGroups(contracts);if(!groups.length)return '';
 const unit=n=>'¥'+n.toLocaleString('zh-CN',{maximumFractionDigits:2});
 return `<details class="settled-prices"><summary>自己的成交单价</summary><p>只看已收齐货款的单品单，每种规格最近四笔。每点一笔，分批供货按批记；从左到右按签约先后。数量和账期会影响成交价。</p>${groups.map(({name,spec,rows})=>{
  const vals=rows.map(r=>Math.round(r.unit*100)/100),lo=Math.min(...vals),hi=Math.max(...vals);
  const xy=rows.map((r,i)=>[rows.length===1?72:8+i*(128/(rows.length-1)),hi===lo?20:31-22*(vals[i]-lo)/(hi-lo)]);
  const last=rows.at(-1);
  return `<article><header><strong>${escape(name)}${spec==='branded'?' · 定制包装':''}</strong><span>最近每件 ${unit(last.unit)}</span></header><svg viewBox="0 0 144 40" width="144" height="40" aria-hidden="true" focusable="false">${xy.length>1?`<polyline points="${xy.map(([x,y])=>x.toFixed(2)+','+y.toFixed(2)).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>`:''}${xy.map(([x,y])=>`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" fill="currentColor"/>`).join('')}</svg>${hi!==lo?`<small class="price-range">图内每件 ${unit(lo)} 至 ${unit(hi)}</small>`:''}<ul>${rows.map(r=>`<li><span>${r.priceSource?escape(r.priceSource)+' · ':''}第 ${r.signedDay} 天签约 · ${r.quantity} 件</span><span>货款 ${money(r.revenue)} · 每件 ${unit(r.unit)} · 第 ${r.paidDay} 天收齐${r.separateServiceFee?'；另收赶展服务费 '+money(r.separateServiceFee)+'（不摊入货价）':''}</span></li>`).join('')}</ul></article>`;
 }).join('')}</details>`;
}


/** A factual session recap, not a score, ending unlock, or invented promotion. */
export function careerRecap(state){
 const paid=state.contracts.filter(o=>o.status==='paid'),clients=new Set(paid.map(o=>o.clientId));
 const series=state.collection,orders=series?.orders||[],market=state.marketHistory?.length?marketBook(state):null;
 return {day:state.day,clients:clients.size+(market?.buyers.length||0),paid:paid.length+(market?.receipts.length||0),stores:accountCoverage(state),
  designs:orders.length?(series.model==='private'?'替客户完成了专用系列':series.exclusiveBuyer?'原系列已约定独家供货':orders.some(o=>o.scope==='buyer-sleeve')?'原稿留下，买方另有专用版本':'自己的系列已被买手采用'):'',
  cases:(state.curationHistory||[]).length,
  openDesign:series?.model==='own'&&orders.length>0&&!series.exclusiveBuyer,
  cash:state.cash};
}
export function careerRecapView(state,{route='auto',evidence='chain'}={}){
 const latestSupply=(state.supplyPlanHistory||[]).findLast(p=>p.status==='paid'&&Array.isArray(p.lots));
 const market=state.marketHistory?.length?marketBook(state):null;
 const projectLedger=market?.receipts.some(r=>r.kind);
 const marketLedger=market?.receipts.length?`<details class="settled-prices"><summary>${projectLedger?'采购合同':'新品生意'} · ${market.receipts.length} 笔已结清</summary><p>${market.buyers.length} 家买方收下了 ${market.products} 种${projectLedger?'货品或设备':'新品'}，已收货款 ${money(market.received)}。扣除采购、运输${market.receipts.some(r=>r.kind==='equipment')?'、验收及实际发生的船期费用':''}和日常开支，${market.net===0?'这些合同合计不赚不亏':market.net>0?'合计赚了 '+money(market.net):'合计亏了 '+money(-market.net)}。</p>${market.repeat?`<p><strong>从试单做到铺货</strong> · ${escape(market.repeat.bulk.buyer)} 先试了 ${market.repeat.trial.quantity}${escape(market.repeat.trial.unit)}${escape(market.repeat.trial.productName)}，后来又采购 ${market.repeat.bulk.quantity}${escape(market.repeat.bulk.unit)}。两笔都已付清，最近一笔在第 ${market.repeat.bulk.paidDay} 天到账。</p>`:''}</details>`:'';
 const ledger=`<p class="brief">可用资金 ${money(state.cash)}。</p>${marketLedger}${settledUnitPricesView(goodsPriceRecords(state))}${latestSupply?`<details class="settled-prices"><summary>最近结清的两批供货 · ${escape(String(latestSupply.clientName||'客户').split(' · ')[0])}</summary>${supplyLotsView(latestSupply)}</details>`:''}`;
 const trade=(route==='trade'||route==='auto'&&!state.collection)&&tradingChapter(state);
 if(trade)return tradingChapterView(trade,evidence,ledger,{sampleAction:state.phase!=='portfolio'});
 const boutique=route==='auto'&&!state.collection&&!state.accountHistory?.length&&tradingChapter(state,'boutique',realizedBusinessNet(state));
 if(boutique)return tradingChapterView(boutique,'boutique',ledger);
 const r=careerRecap(state),chapter=cooperationChapter(state),closed=chapter.closed;
 const closing=closed?(chapter.facts.some(f=>f.kind==='generic-stores-separate-handover')?'Northline 已接收系列成品与上市陈列。另有六家门店收到通用组合，两件成果分别记下。':chapter.facts.some(f=>f.kind==='generic-then-series-stores')?'Northline 的六家门店都已收货：首批三家是通用组合，后三家是买方确认过的系列。':chapter.relation.buyerId==='northline'?'Northline 从确认系列走到六店交付，型号、包装与署名都按你谈下的版本兑现。':chapter.relation.buyerId==='atelier'?(atelierRestockProfit(state)?`Atelier 已收到独家系列与上市陈列，后来又买了 ${state.atelierRestock.sets} 套同版实物。第二批货款也已经结清，原独家约定没有改动。`:'Atelier 已收到独家系列与上市陈列。你选择把这份设计留给这位买方，也保留了其他通用业务。'):chapter.facts.some(f=>f.kind==='use-delivered')?'你保留的原稿被客户采用，又走进实际使用场所；作品不再只停在样品桌上。':'买手的系列订单已经交付，工作室原稿也已被概念店采用。设计仍留在工作室，新的用途合作由你决定。'):'';
 return `<section class="career-recap" aria-label="今天的事业回顾"><small>第 ${r.day} 天 · ${closed?'一段合作的收尾':'工作室收工前'}</small><h3 tabindex="-1">${closed?'这一程，交付完成':'做成的合作，明天还在'}</h3>${closing?`<p class="recap-outcome">${closing}</p>`:''}<div class="recap-facts"><div><strong>${r.clients}</strong><span>位已成交老客户</span></div><div><strong>${r.paid}</strong><span>笔单品订单已收齐</span></div>${r.cases?`<div><strong>${r.cases}</strong><span>份组合选品案例</span></div>`:''}${r.stores?`<div><strong>${r.stores}</strong><span>家连锁门店已交付</span></div>`:''}</div>${r.designs?`<p class="recap-design">${r.designs}。${r.openDesign?'还可以带着自己的设计，去见下一位买手。':'这套系列按约供货，通用产品仍可接单。'}</p>`:''}${ledger}<button class="primary" id="resume-work">${closed?'继续自由经营':'再看看工作室'} →</button><small class="recap-save"></small></section>`;
}

function careerFocusModel(state,focus){
 const projects=careerProjects(state);
 const active=projects.find(p=>p.id===focus)||projects.find(p=>p.id==='series'&&state.collection&&!p.done)||projects.find(p=>!p.done&&p.actions.length)||projects.find(p=>!p.done)||projects[0];
 return {projects,active};
}
export function careerFocusView(state,focus='',excludedAction=''){
 const {projects,active}=careerFocusModel(state,focus);
 if(!projects.some(p=>p.actions.length||p.done))return '';
 const omitted=Array.isArray(excludedAction)?excludedAction:[excludedAction];
 return `<section class="career-focus" aria-label="正在发展的事业项目"><small>这次想把什么做成</small><div class="career-directions">${projects.map(p=>`<button data-career-focus="${p.id}" aria-pressed="${p.id===active.id}">${{stores:'门店合作',series:'系列设计',product:'新品采用'}[p.id]||escape(p.title)}${p.done?' ✓':''}</button>`).join('')}</div><h3>${escape(active.title)}</h3><p class="${active.done?'career-achievement':'career-next'}">${escape(active.done?(active.achievement||active.step):active.step)}</p>${active.actions.filter(a=>!omitted.includes(a.type)).map(a=>`<button class="primary" data-career-action="${a.type}" ${a.referrerId?`data-career-referrer="${escape(a.referrerId)}"`:''} ${a.clientId?`data-career-client="${escape(a.clientId)}"`:''} ${a.factory?`data-career-factory="${escape(a.factory)}"`:''}>${escape(a.label)} →</button>`).join('')}${active.done?`<small>${projects.every(p=>p.done)?'这几项合作已经做成，可继续经营已有客户与系列。':'这项合作已经做成，可以换个方向，也可以继续经营老客户。'}</small>`:''}</section>`;
}

/** A reversible desk plan. Nothing here signs, advances time or writes a save. */
export function projectDeskPreview(state,clientId,optionId){
 if(state.phase!=='portfolio'||!state.clientProjectActive)return null;
 const first=businessOpportunities(state).find(c=>c.id===clientId&&c.available);
 const quote=first?.options.find(o=>o.id===optionId&&o.valid);if(!quote)return null;
 const after={...state,day:quote.paymentDay,cash:quote.cashAfterPayment};
 const following=businessOpportunities(after).filter(c=>c.id!==clientId&&c.reason!=='已完成');
 return {first,quote,following};
}
export function projectDeskView(state,plan={}){
 if(state.phase!=='portfolio'||!state.clientProjectActive)return '';
 const clients=businessOpportunities(state).filter(c=>c.reason!=='已完成');
 const p=projectDeskPreview(state,plan.clientId,plan.optionId);
 return `<section class="project-desk" aria-label="客户排期桌"><small>先摆一摆，再答应客户</small><h3>${clients.length===1?'把最后这份计划落实':'这一单之后，还能怎么安排？'}</h3><div class="desk-plans">${clients.map(c=>`<div><strong>${escape(c.name.split(' · ')[0])} · 第 ${c.deadline} 天专题</strong>${c.options.map(o=>`<button data-desk-client="${c.id}" data-desk-option="${o.id}" aria-pressed="${p?.first.id===c.id&&p?.quote.id===o.id}" ${o.valid?'':'disabled'}>${escape(o.title)}</button>`).join('')}</div>`).join('')}</div>${p?`<div class="desk-timeline" aria-label="拟定时间安排"><span>今天<strong>${state.day}</strong>先垫 ${money(p.quote.cost-p.quote.deposit)}</span><span>交付<strong>${p.quote.deliveryDay}</strong>${p.quote.projectOnTime?'赶上专题':'日常补货'}</span><span>收齐<strong>${p.quote.paymentDay}</strong>净赚 ${netProfitAmount(p.quote.netProfit)}</span></div><div class="desk-following" role="status">${p.following.length?p.following.map(c=>`<p><strong>${escape(c.name.split(' · ')[0])}</strong> · ${c.options.filter(o=>o.projectOnTime).length?c.options.filter(o=>o.projectOnTime).map(o=>escape(o.title)).join(' / ')+'仍赶得上专题':'改做日常补货，不能再承诺专题开场'}</p>`).join(''):'这单结清后，本轮三份计划都已兑现。'}</div><button class="primary" id="use-desk-plan">按这个安排，去谈 ${escape(p.first.name.split(' · ')[0])} →</button><small>只是排期，尚未签约。${p.following.length?'另一位客户的日期不会随你延后。':'按你确认的规格交付。'}</small>`:'<p>点一份方案，看交付和回款会占到哪一天。</p>'}</section>`;
}

/** Latest fulfilled plans take visual priority over an older closed series. */
export function projectCompletionView(state){
 const projects=clientProjects(state);if(!projects.length||!projects.every(p=>p.completed))return '';
 const orders=projects.map(p=>state.contracts.find(o=>o.projectId===p.id&&o.status==='paid'));
 // This closing receipt temporarily replaces the usual career desk. Keep a paid,
 // pending factory sample reachable without requiring an unrelated detour.
 const collect=['sampling','received'].includes(state.productDevelopment?.status)?careerProjects(state).find(p=>p.id==='product')?.actions.find(a=>a.type==='COLLECT_FIRST_SAMPLE'):null;
 return `<section class="project-outcomes" aria-label="本轮客户计划已兑现"><small>按你排下的顺序，交到了客户手里</small><h3>这次安排，留下了这些成果</h3><div>${projects.map((p,i)=>{const o=orders[i];return `<article><span class="mini-face" style="--face-x:${['mira','samir','ines'].indexOf(p.id)*50}%" aria-hidden="true"></span><strong>${escape(p.name.split(' · ')[0])}</strong><b>${escape(p.title)}</b><span>${p.quantity} 件 · ${p.onTime?'专题已亮相':'转为日常销售'}</span><small>第 ${o.deliveryDay} 天交付 · 第 ${o.paymentDay} 天结清</small></article>`;}).join('')}</div><p>三份合作共赚到 <strong>${netProfitAmount(orders.reduce((sum,o)=>sum+o.netProfit,0))}</strong>，已扣回款前的日常开销。</p>${collect?`<div class="sample-follow-up"><small>工厂首样 · 已付出样费，尚未确认型号</small><button class="quiet" data-action="COLLECT_FIRST_SAMPLE">${escape(collect.label)} →</button></div>`:""}</section>`;
}
