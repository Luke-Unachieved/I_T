import {lifeReadingLampBasis} from './deal-room-life.js';
import {supplyLotsView} from './deal-room-supply-view.js';
import {shopTrialInvite} from './deal-room-shop-trial.js';
import {stockProcurementAccounting} from './deal-room-stock-procurement.js';
import {stockProcurementInvite} from './deal-room-stock-view.js';
import {revisionInvite} from './deal-room-revision-view.js';
import {cooperationChapter} from './deal-room-cooperation.js';
import {cooperationView} from './deal-room-cooperation-view.js';
import {clientProjects,openingCurationOffers,businessOpportunities} from './deal-room-engine.js';
import {launchInvite} from './deal-room-launch-view.js';
import {studioProjectEligibility} from './deal-room-studio-project.js';
import {studioProjectInvite} from './deal-room-studio-project-view.js';
import {careerProjects} from './deal-room-career-focus.js';
import {caseGrowthInvite} from './deal-room-case-growth-view.js';
import {accountReceipt,accountCoverage,canExpandAccount,accountRevisionBasis} from './deal-room-account.js';
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
export function accountCompletionGlance(state){
 const deliveries=(state.accountHistory||[]).filter(a=>a.status==='paid'&&Number.isInteger(a.stores)&&a.stores>0);
 const stores=deliveries.reduce((n,a)=>n+a.stores,0);
 if(stores!==6)return '';
 let offset=0;
 const shop=`<svg viewBox="0 0 48 44" aria-hidden="true"><path d="M7 15h34v25H7z" fill="#eee7d7" stroke="#9ca991"/><path d="M4 15l5-9h30l5 9z" fill="#41634e"/><path d="M4 16h40" stroke="#cdbb8d" stroke-width="3"/><rect x="12" y="22" width="13" height="12" fill="#e2c987"/><path d="M30 23h6v17h-6z" fill="#8b9e81"/></svg>`;
 return `<section class="account-completion-glance" aria-label="六家门店已交付"><header><strong>Northline · 六家店都已收货</strong><span>货款已收齐</span></header><div class="account-completion-shops" role="list" aria-label="已供货门店">${deliveries.map(a=>{const start=offset;offset+=a.stores;return Array.from({length:a.stores},(_,i)=>`<span role="listitem" aria-label="第 ${start+i+1} 家店已收货">${shop}<small>${start+i+1} 店</small></span>`).join('');}).join('')}</div><p>${deliveries.map(a=>`<span>${a.stores} 家店 · ${escape(a.seriesSource?.label||'通用商品组合')}</span>`).join('')}</p></section>`;
}
export function homeLifeView(state){
 if(!['review','complete'].includes(state.phase)||!(state.contracts||[]).some(c=>c.status==='paid'))return '';
 const ids=new Set((state.personalLife?.purchases||[]).map(p=>p.itemId));
 const names=[['chair','阅读角'],['coffee','自己的咖啡'],['books','手工书册'],['record','唱片机'],['records','周末唱片'],['readinglamp','调光阅读角']].filter(([id])=>ids.has(id)).map(([,name])=>name);
 const spent=Number.isSafeInteger(state.personalLife?.spent)?state.personalLife.spent:0;
 return `<section class="home-life" aria-label="赚钱以后的生活"><div><small>生意之外，也有自己的生活</small><p>${names.length?names.join(' · '):'家里还没添置新物件。想给自己挑一件，还是把钱留给下一单？'}</p>${!ids.has('readinglamp')&&lifeReadingLampBasis(state)?'<p>Mira 已付清调光灯货款。回家看看：现在也能另订一盏，摆在自己的阅读椅旁。</p>':''}${spent?`<span>已经为家里添置 ¥${spent.toLocaleString('zh-CN')}</span>`:''}</div><div class="home-life-links"><button id="open-personal-life">${names.length?'回家享受一下':'去看看喜欢的物件'}</button><button id="open-office-improvement">${state.officeImprovement?'去窗边工作室':'想换个办公环境'}</button>${state.officeImprovement?`<button id="open-office-annex">${state.officeAnnex?'去自己的会客室':'看看更宽敞的会客室'}</button>`:''}</div></section>`;
}
export function businessHomeView(state,{career,referrals,focus='',directionsOpen=false}){
 const openingOffers=openingCurationOffers(state);
 const opening=openingOffers.length?`<section class="opening-curation" aria-label="第一份选品委托"><small>交过的货，带来下一次机会</small><h3>带一件熟悉的产品，去见买手</h3><p>选一位客户引荐，用桌上的样品搭配提案。先看用途，不急着签。</p><div class="referral-choices">${openingOffers.map(r=>`<button data-opening-referrer="${r.id}"><strong>${escape(r.referrerName.split(' · ')[0])} 的引荐</strong><small>${escape(r.product)} · 带这件产品去搭配</small></button>`).join('')}</div><small>也可以继续熟客供货，稍后再来。</small></section>`:'';
 const chapter=cooperationView(state),chapterAction=chapter?cooperationChapter(state).nextAction:null,focusCard=careerFocusView(state,focus,canExpandAccount(state)?'OPEN_ACCOUNT_EXPANSION':chapterAction?.type);
 const nextUse=careerProjects(state).every(p=>p.done)&&hasNextStudioUse(state);
 const useInvites=studioProjectInvite(state);
 const alternativeContent=nextUse?`${useInvites}<details><summary>回看已完成的事业方向</summary>${focusCard}</details>`:`${focusCard}${useInvites}`;
 const recentProjects=state.feedback?.kind==='projects-complete'?projectCompletionView(state):'';
 const guidance=recentProjects?`${recentProjects}${chapter?`<details class="career-alternatives"><summary>回看之前的系列合作</summary>${chapter}</details>`:''}`:chapter?`${chapter}<details class="career-alternatives" ${directionsOpen||nextUse?'open':''}><summary>${nextUse?'下一份用途合作':'其他发展方向与用途合作'}</summary>${alternativeContent}${state.launchProject?.status==='handed'?'':launchInvite(state)}</details>`:`${state.launchProject?.status==='handed'?'':launchInvite(state)}${studioProjectInvite(state)}${focusCard}`;
 const paid=state.contracts.filter(c=>c.status==='paid'),cases=state.curationHistory||[],orders=state.collection?.orders||[];
 const revisionNet=(state.collectionRevision?.orders||[]).filter(o=>o.status==='paid').reduce((n,o)=>n+o.netProfit,0)-(state.collectionRevision?.investment||0);
 const net=stockProcurementAccounting(state).realizedProfit+revisionNet+paid.reduce((n,o)=>n+o.netProfit,0)+(state.supplyPlanHistory||[]).reduce((n,o)=>n+o.netProfit,0)+cases.reduce((n,o)=>n+o.netProfit,0)+(state.accountHistory||[]).reduce((n,o)=>n+o.netProfit,0)+orders.reduce((n,o)=>n+o.netProfit,0)+(state.caseGrowthHistory||[]).reduce((n,o)=>n+(o.netProfit||0),0)-(state.caseGrowthOperatingCost||0)-(state.collection?.sampleCost||0)-(state.retailOperatingCost||0)-(state.productDevelopment?.investment||0)-(state.secondSupplier?.investment||0);
 const series=state.collection?(state.collection.model==='private'?'买方专用包装，查看已完成合作':state.collection.exclusiveBuyer?'原系列已有独家约定，先看范围':'原稿在工作室，按已签范围找买手'):'做客户的系列，或把设计留给自己';
 const opportunities=`${opening}${stockProcurementInvite(state)}${shopTrialInvite(state)}${revisionInvite(state)}${accountRevisionBasis(state)&&!state.accountHistory?.length?'<section class="revision-invite"><small>Northline · 已确认的版本</small><h3>把潮汐版带到门店</h3><p>按已收到的图样、内托与商品谈铺店。以后扩店可沿用，或另选这位买手已采用的版本；已签门店不变。</p><button data-action="START_ACCOUNT_FROM_REVISION">先看门店报价 →</button></section>':''}`;
 return `${canExpandAccount(state)?'<section class="business-route account-next"><small>Northline · 3 家店已交付</small><h3>余下三家店，接着做吗？</h3><p>先看采购方案，再决定是否接单。也可以先经营别的业务。</p><button data-action="OPEN_ACCOUNT_EXPANSION">看看余下三家的采购 →</button></section>':''}${accountCompletionGlance(state)}${guidance}${homeLifeView(state)}${opportunities?`<details class="home-opportunities" ${chapter||recentProjects||canExpandAccount(state)?'':'open'}><summary>更多机会 · 新单与产品升级</summary><p class="home-opportunities-note">先把眼前的合作做好，也可以随时来看看下一步想做什么。</p>${opportunities}</details>`:''}${state.launchProject?.status==='handed'?launchInvite(state):''}<details class="other-business" ${focusCard||opening?'':'open'}><summary>其他业务 · 熟客补货与合作机会</summary><div class="business-net"><span>${net>=0?'经营累计赚到':'经营投入尚未收回'} <strong>${money(Math.abs(net))}</strong></span><small>已计日常与出样投入</small></div><div class="business-routes"><section class="business-route"><small>熟客往来</small><h3>下一单，挑客户来谈</h3><p>${state.supplyPlanHistory?.length?'从这次起，按门店余货接返单；刚补过货的客户先卖库存，也可以换客户或等待。':career.eligible?'继续返单，或谈整份供货安排。':'沿用做过的规格，自己选择继续合作的客户。'}</p><button data-action="${state.supplyPlanHistory?.length?'CONTINUE_RETAIL_BUSINESS':'CONTINUE_BUSINESS'}">${state.supplyPlanHistory?.length?'按门店补货，挑一位熟客':'挑一位熟客'} →</button>${career.eligible?'<button class="quiet" id="open-supply">谈两批供货安排</button>':`<small class="route-next">${escape(career.reason)}</small>`}</section>${state.supplyPlanHistory?.length&&!state.retailPlanning?`<section class="business-route"><small>熟客供货计划</small><h3>按门店余货安排返单</h3><p>每次铺货后，门店卖完再采购；可以换客户或做别的业务，不必守着等。</p><button data-action="START_RETAIL_PLANNING">开始看门店补货计划 →</button></section>`:''}${state.supplyPlanHistory?.length&&!state.productDevelopment?`<section class="business-route"><small>去工厂开发新款</small><h3>去工厂拿一版新样</h3><p>调光小批，或标准整批？先看工艺和以后能接的单，再决定花不花出样钱。</p><button data-action="START_DEVELOPMENT">看看两家工厂 →</button></section>`:''}${state.productDevelopment?.status==='active'?'<section class="business-route"><small>已验工厂样品</small><p>Mira 的报价可用新版本；旧台灯也保留。</p><button data-action="VIEW_DEVELOPMENT">拿出工作室留样 →</button></section>':''}${cases.length?`<section class="business-route series-route"><small>产品与署名</small><h3>${state.collection?'经营这份系列':'开自己的系列？'}</h3><p>${series}</p><button data-action="${state.collection?'OPEN_COLLECTION':'START_COLLECTION'}">${state.collection?'看设计与买手关系':'看看两种合作方式'} →</button></section>`:''}${caseGrowthInvite(state)}${curationBuyerChoices(state,referrals)}${cases.length&&!state.accountHistory?.length?`<details class="business-route"><summary>通用商品的连锁采购 <small>选择一份已交付案例</small></summary>${cases.map(c=>`<button data-account-case="${c.referrerId}">${escape(c.referrerName||c.referrerId)} · ${c.products.length} 款${c.lampVersion==='developed'?' · 调光版':''}</button>`).join('')}</details>`:''}${state.clientProjectSeason&&!state.clientProjectActive&&clientProjects(state).some(p=>!p.completed)?`<section class="business-route"><small>客户专题 · 还有 ${clientProjects(state).filter(p=>!p.completed).length} 项未完成</small><p>看看还剩哪些客户计划，以及各自的交货日期。</p><button data-action="RESUME_CLIENT_PROJECTS">继续看剩余计划 →</button></section>`:''}${!state.clientProjectSeason&&state.supplyPlanHistory?.length?`<section class="business-route"><small>客户新用途</small><h3>橱窗、快闪与餐桌</h3><p>看清日期与用途，再决定先经营谁。</p><button data-action="START_CLIENT_PROJECTS">打开客户计划 →</button></section>`:''}</div></details><button class="quiet finish-session" id="finish-session">${recentProjects&&chapter?'回顾之前的系列合作':cooperationChapter(state).closed?'为这段合作收个尾':'今天先到这里，看看做成了什么'}</button>${cases.length||state.accountHistory?.length?`<details class="case-gallery home-archive"><summary>合作档案 · ${cases.length} 份买手案例${state.accountHistory?.length?' · 连锁已供 '+accountCoverage(state)+' 店':''}</summary>${cases.map(c=>`<button data-showcase="${c.referrerId}"><strong>${escape(c.referrerName||c.referrerId)} → ${escape(c.buyer)}</strong><small>${c.products.length} 款 · ${c.quantity} 套</small></button>`).join('')}${state.accountHistory?.length?state.accountHistory.map(accountReceipt).join(''):''}</details>`:''}`;
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
  rows.push({signedDay:c.signedDay,paidDay:c.paidDay??c.paymentDay,quantity:c.quantity,revenue:c.revenue,unit:c.revenue/c.quantity});
  if(rows.length>4)rows.shift();
 }
 return [...groups.values()];
}
export function settledUnitPricesView(contracts){
 const groups=settledUnitPriceGroups(contracts);if(!groups.length)return '';
 const unit=n=>'¥'+n.toLocaleString('zh-CN',{maximumFractionDigits:2});
 return `<details class="settled-prices"><summary>自己的成交单价</summary><p>只看已收齐货款的单品单，每种规格最近四笔。每点一单，从左到右按签约先后；数量和账期会影响成交价。</p>${groups.map(({name,spec,rows})=>{
  const vals=rows.map(r=>Math.round(r.unit*100)/100),lo=Math.min(...vals),hi=Math.max(...vals);
  const xy=rows.map((r,i)=>[rows.length===1?72:8+i*(128/(rows.length-1)),hi===lo?20:31-22*(vals[i]-lo)/(hi-lo)]);
  const last=rows.at(-1);
  return `<article><header><strong>${escape(name)}${spec==='branded'?' · 定制包装':''}</strong><span>最近每件 ${unit(last.unit)}</span></header><svg viewBox="0 0 144 40" width="144" height="40" aria-hidden="true" focusable="false">${xy.length>1?`<polyline points="${xy.map(([x,y])=>x.toFixed(2)+','+y.toFixed(2)).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>`:''}${xy.map(([x,y])=>`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" fill="currentColor"/>`).join('')}</svg>${hi!==lo?`<small class="price-range">图内每件 ${unit(lo)} 至 ${unit(hi)}</small>`:''}<ul>${rows.map(r=>`<li><span>第 ${r.signedDay} 天签约 · ${r.quantity} 件</span><span>货款 ${money(r.revenue)} · 每件 ${unit(r.unit)} · 第 ${r.paidDay} 天收齐</span></li>`).join('')}</ul></article>`;
 }).join('')}</details>`;
}


/** A factual session recap, not a score, ending unlock, or invented promotion. */
export function careerRecap(state){
 const paid=state.contracts.filter(o=>o.status==='paid'),clients=new Set(paid.map(o=>o.clientId));
 const series=state.collection,orders=series?.orders||[];
 return {day:state.day,clients:clients.size,paid:paid.length,stores:accountCoverage(state),
  designs:orders.length?(series.model==='private'?'替客户完成了专用系列':series.exclusiveBuyer?'原系列已约定独家供货':orders.some(o=>o.scope==='buyer-sleeve')?'原稿留下，买方另有专用版本':'自己的系列已被买手采用'):'',
  cases:(state.curationHistory||[]).length,
  openDesign:series?.model==='own'&&orders.length>0&&!series.exclusiveBuyer,
  cash:state.cash};
}
export function careerRecapView(state){
 const latestSupply=(state.supplyPlanHistory||[]).findLast(p=>p.status==='paid'&&Array.isArray(p.lots));
 const r=careerRecap(state),chapter=cooperationChapter(state),closed=chapter.closed;
 const closing=closed?(chapter.facts.some(f=>f.kind==='generic-stores-separate-handover')?'Northline 已接收系列成品与上市陈列。另有六家门店收到通用组合，两件成果分别记下。':chapter.facts.some(f=>f.kind==='generic-then-series-stores')?'Northline 的六家门店都已收货：首批三家是通用组合，后三家是买方确认过的系列。':chapter.relation.buyerId==='northline'?'Northline 从确认系列走到六店交付，型号、包装与署名都按你谈下的版本兑现。':chapter.relation.buyerId==='atelier'?'Atelier 已收到独家系列与上市陈列。你选择把这份设计留给这位买方，也保留了其他通用业务。':chapter.facts.some(f=>f.kind==='use-delivered')?'你保留的原稿被客户采用，又走进实际使用场所；作品不再只停在样品桌上。':'买手的系列订单已经交付，工作室原稿也已被概念店采用。设计仍留在工作室，新的用途合作由你决定。'):'';
 return `<section class="career-recap" aria-label="今天的事业回顾"><small>第 ${r.day} 天 · ${closed?'一段合作的收尾':'工作室收工前'}</small><h3 tabindex="-1">${closed?'这一程，交付完成':'做成的合作，明天还在'}</h3>${closing?`<p class="recap-outcome">${closing}</p>`:''}<div class="recap-facts"><div><strong>${r.clients}</strong><span>位已成交老客户</span></div><div><strong>${r.paid}</strong><span>笔单品订单已收齐</span></div>${r.cases?`<div><strong>${r.cases}</strong><span>份组合选品案例</span></div>`:''}${r.stores?`<div><strong>${r.stores}</strong><span>家连锁门店已交付</span></div>`:''}</div>${r.designs?`<p class="recap-design">${r.designs}。${r.openDesign?'还可以带着自己的设计，去见下一位买手。':'这套系列按约供货，通用产品仍可接单。'}</p>`:''}<p class="brief">可用资金 ${money(r.cash)}。</p>${settledUnitPricesView(state.contracts)}${latestSupply?`<details class="settled-prices"><summary>最近结清的两批供货 · ${escape(String(latestSupply.clientName||'客户').split(' · ')[0])}</summary>${supplyLotsView(latestSupply)}</details>`:''}<button class="primary" id="resume-work">${closed?'继续自由经营':'再看看工作室'} →</button><small class="recap-save"></small></section>`;
}

export function careerFocusView(state,focus='',excludedAction=''){
 const projects=careerProjects(state);if(!projects.some(p=>p.actions.length||p.done))return '';
 const active=projects.find(p=>p.id===focus)||projects.find(p=>p.id==='series'&&state.collection&&!p.done)||projects.find(p=>!p.done&&p.actions.length)||projects.find(p=>!p.done)||projects[0];
 return `<section class="career-focus" aria-label="正在发展的事业项目"><small>这次想把什么做成</small><div class="career-directions">${projects.map(p=>`<button data-career-focus="${p.id}" aria-pressed="${p.id===active.id}">${{stores:'门店合作',series:'系列设计',product:'新品采用'}[p.id]||escape(p.title)}${p.done?' ✓':''}</button>`).join('')}</div><h3>${escape(active.title)}</h3><p class="${active.done?'career-achievement':'career-next'}">${escape(active.done?(active.achievement||active.step):active.step)}</p>${active.actions.filter(a=>a.type!==excludedAction).map(a=>`<button class="primary" data-career-action="${a.type}" ${a.referrerId?`data-career-referrer="${escape(a.referrerId)}"`:''} ${a.clientId?`data-career-client="${escape(a.clientId)}"`:''} ${a.factory?`data-career-factory="${escape(a.factory)}"`:''}>${escape(a.label)} →</button>`).join('')}${active.done?`<small>${projects.every(p=>p.done)?'这几项合作已经做成，可继续经营已有客户与系列。':'这项合作已经做成，可以换个方向，也可以继续经营老客户。'}</small>`:''}</section>`;
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
 return `<section class="project-desk" aria-label="客户排期桌"><small>先摆一摆，再答应客户</small><h3>${clients.length===1?'把最后这份计划落实':'这一单之后，还能怎么安排？'}</h3><div class="desk-plans">${clients.map(c=>`<div><strong>${escape(c.name.split(' · ')[0])} · 第 ${c.deadline} 天专题</strong>${c.options.map(o=>`<button data-desk-client="${c.id}" data-desk-option="${o.id}" aria-pressed="${p?.first.id===c.id&&p?.quote.id===o.id}" ${o.valid?'':'disabled'}>${escape(o.title)}</button>`).join('')}</div>`).join('')}</div>${p?`<div class="desk-timeline" aria-label="拟定时间安排"><span>今天<strong>${state.day}</strong>先垫 ${money(p.quote.cost-p.quote.deposit)}</span><span>交付<strong>${p.quote.deliveryDay}</strong>${p.quote.projectOnTime?'赶上专题':'日常补货'}</span><span>收齐<strong>${p.quote.paymentDay}</strong>净赚 ${money(p.quote.netProfit)}</span></div><div class="desk-following" role="status">${p.following.length?p.following.map(c=>`<p><strong>${escape(c.name.split(' · ')[0])}</strong> · ${c.options.filter(o=>o.projectOnTime).length?c.options.filter(o=>o.projectOnTime).map(o=>escape(o.title)).join(' / ')+'仍赶得上专题':'改做日常补货，不能再承诺专题开场'}</p>`).join(''):'这单结清后，本轮三份计划都已兑现。'}</div><button class="primary" id="use-desk-plan">按这个安排，去谈 ${escape(p.first.name.split(' · ')[0])} →</button><small>只是排期，尚未签约。${p.following.length?'另一位客户的日期不会随你延后。':'按你确认的规格交付。'}</small>`:'<p>点一份方案，看交付和回款会占到哪一天。</p>'}</section>`;
}

/** Latest fulfilled plans take visual priority over an older closed series. */
export function projectCompletionView(state){
 const projects=clientProjects(state);if(!projects.length||!projects.every(p=>p.completed))return '';
 const orders=projects.map(p=>state.contracts.find(o=>o.projectId===p.id&&o.status==='paid'));
 return `<section class="project-outcomes" aria-label="本轮客户计划已兑现"><small>按你排下的顺序，交到了客户手里</small><h3>这次安排，留下了这些成果</h3><div>${projects.map((p,i)=>{const o=orders[i];return `<article><span class="mini-face" style="--face-x:${['mira','samir','ines'].indexOf(p.id)*50}%" aria-hidden="true"></span><strong>${escape(p.name.split(' · ')[0])}</strong><b>${escape(p.title)}</b><span>${p.quantity} 件 · ${p.onTime?'专题已亮相':'转为日常销售'}</span><small>第 ${o.deliveryDay} 天交付 · 第 ${o.paymentDay} 天结清</small></article>`;}).join('')}</div><p>三份合作共赚到 <strong>${money(orders.reduce((sum,o)=>sum+o.netProfit,0))}</strong>，已扣回款前的日常开销。</p></section>`;
}
