import {workspaceLedgerView} from './deal-room-workspace-nav.js';
import {bindPropertyEntries} from './deal-room-property-view.js';
import {propertyHoldings,PROPERTY_CATALOG} from './deal-room-property.js';
import {openingCurationOffers,curationOffers,reduceDealRoom} from './deal-room-engine.js';
import {propertySceneArt} from './deal-room-property-art.js';
import {promotionView,bindPromotion} from './deal-room-promotion-view.js';
import {promotionStatus} from './deal-room-promotion.js';
import {previewWorkspaceSleep} from './deal-room-workspace-sleep.js';
import {cooperationChapter} from './deal-room-cooperation.js';
import {tradingChapter} from './deal-room-trading-chapter.js';
import {prospectDisplayText} from './deal-room-prospect-locale.js';
const wsEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function workspaceWeather(day){return ['晴','晴','阴','雨','晴','雪','阴'][(Math.imul(day,1597334677)>>>0)%7];}
const hubIcons={home:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',car:'m4 10 2-6h12l2 6M3 10h18v8H3zM6 18v3m12-3v3M6 14h2m8 0h2',trips:'M3 21h18M5 21V9h14v12M8 9V4h8v5M9 12v2m6-2v2m-6 3v2m6-2v2',friends:'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m20 0v-3a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8',sleep:'M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11'};
const promotionIcon='<span class="ws-hub-icon ws-hub-growth-emblem" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="17" r="11" stroke="currentColor" stroke-width="1.65"/><path d="M6 17h22M9 11.5h16M9 22.5h15M17 6c-3.4 2.8-5 6.6-5 11s1.6 8.2 5 11c3.4-2.8 5-6.6 5-11s-1.6-8.2-5-11Z" stroke="#ac8a56" stroke-width="1.12"/><circle cx="25.7" cy="24.7" r="5.8" fill="#2b2318" stroke="#f0d6a1" stroke-width="1.95"/><path d="m30 29 4.9 4.9" stroke="#f0d6a1" stroke-width="2.55"/><path d="M30 6v5m-2.5-2.5h5" stroke="#e4bc73" stroke-width="1.25"/></svg></span>';
const officeIcon='<span class="ws-hub-icon ws-hub-growth-emblem" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 33h28M9 33V10l15-4v27m0-19h7v19M15 33v-7h5v7" stroke="currentColor" stroke-width="1.65"/><path d="M13 14h3m3 0h1m-7 5h3m3 0h1m6 0h2m-2 5h2" stroke="#ac8a56" stroke-width="1.4"/><path d="M15 33v-7h5v7" stroke="#f0d6a1" stroke-width="1.7"/></svg></span>';
const ledgerIcon='<span class="ws-hub-icon ws-hub-growth-emblem" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8v25h27M12 29V20h5v9m3 0V15h5v14m3 0V10h5v19" stroke="currentColor" stroke-width="1.65"/><path d="M12 20h5m3-5h5m3-5h5" stroke="#f0d6a1" stroke-width="1.7"/></svg></span>';
const hubIcon=k=>k==='promo'?promotionIcon:k==='office'?officeIcon:'<span class="ws-hub-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+hubIcons[k]+'"/></svg></span>';
const hubLabel=(title,sub='')=>'<span class="ws-hub-label"><strong>'+wsEsc(title)+'</strong>'+(sub?'<small>'+wsEsc(sub)+'</small>':'')+'</span><span class="ws-hub-chevron" aria-hidden="true">›</span>';
const hubRow=(attrs,title,icon,sub='')=>'<button type="button" class="ws-hub-row" '+attrs+'>'+hubIcon(icon)+hubLabel(title,sub)+'</button>';
export function workspaceTradingRecapAvailable(state){
 return ['review','complete','portfolio'].includes(state.phase)&&!!tradingChapter(state);
}
export function workspaceCooperationRecapAvailable(state){
 return ['review','complete'].includes(state.phase)&&cooperationChapter(state).closed;
}
export function workspaceCaseGrowthLink(state){
 const active=state.caseGrowth;
 if(state.phase==='case-growth'&&['draft','production','paid'].includes(active?.status)){
  return {type:'resume',label:{draft:'继续商谈案例合作',production:'查看已签订单',paid:'查看收款记录'}[active.status]};
 }
 if(!['review','complete'].includes(state.phase)||state.collection?.model!=='own')return null;
 const next=cooperationChapter(state).nextAction;
 return next?.type==='OPEN_CASE_GROWTH'&&reduceDealRoom(state,{type:next.type,referrerId:next.referrerId})!==state?next:null;
}
function closePaidAccount(state){
 return state.phase==='account'&&state.account?.status==='paid'?reduceDealRoom(state,{type:'CLOSE_ACCOUNT'}):state;
}
export function workspaceAccountExpansionDraft(state){
 if(state.accountHistory?.[0]?.status!=='paid')return state;
 const closed=closePaidAccount(state);
 const next=reduceDealRoom(closed,{type:'OPEN_ACCOUNT_EXPANSION'});
 return next===closed?state:next;
}
export function workspaceSeriesRoutes(state){
 if(state.phase==='collection')return [{id:'collection',label:'继续系列设计与买手合作',next:state}];
 if(state.phase==='launch-project')return [{id:'launch',label:state.launchProject?.status==='handed'?'回看已交接的陈列':'继续上市陈列交接',next:state}];
 const closed=closePaidAccount(state);
 const types=state.collection?['OPEN_COLLECTION','查看系列设计与买手合作']:['START_COLLECTION','看看两种系列合作方式'];
 const start=reduceDealRoom(closed,{type:types[0]}),launch=reduceDealRoom(closed,{type:'OPEN_LAUNCH_PROJECT'});
 const routes=[];
 if(start!==closed)routes.push({id:'collection',label:types[1],next:start});
 if(launch!==closed)routes.push({id:'launch',label:state.launchProject?.status==='handed'?'回看已交接的陈列':'和买手安排上市陈列',next:launch});
 return routes;
}
export function workspaceHubView(state,tab,lifeEnabled,sleepOpen=false,promotionUI={}){
 const dev=tab==='development';
 if(dev&&promotionUI.ledgerDetail)return '<section class="ws-office ws-hub ws-original-hub ws-original-growth"><button type="button" class="ws-ledger-back" data-workspace-ledger-back>‹ 返回发展</button>'+workspaceLedgerView(state)+'</section>';
 const holdings=propertyHoldings(state);
 const home=PROPERTY_CATALOG.find(x=>x.id===holdings?.active.home);
 const homeName=home?.name??'工作室起居角';
 const carTitle=holdings?.owned.some(r=>PROPERTY_CATALOG.some(x=>x.kind==='car'&&x.id===r.id))?'车库':'车行';
 const introductions=[...openingCurationOffers(state).map(r=>({...r,first:true})),...curationOffers(state).map(r=>({...r,first:false}))].slice(0,3);
 // Render only paid cases that the existing action can still open. The reducer
 // is pure; this eligibility probe does not commit the draft or write a save.
 const chainCases=dev?(state.curationHistory??[]).filter(c=>c.status==='paid'&&
  reduceDealRoom(state,{type:'START_ACCOUNT',referrerId:c.referrerId})!==state):[];
 const chain=chainCases.length?'<p><strong>把组合铺到六家店</strong> · 先看连锁采购条件，不会签单。</p>'+
  chainCases.map(c=>'<button type="button" class="ws-hub-row" data-growth-account="'+wsEsc(c.referrerId)+'">'+
   hubLabel(prospectDisplayText(c.referrerName)+' · 递给连锁采购',c.products.length+' 款 · '+c.quantity+' 套已交付')+'</button>').join(''):'';
 const expansion=dev&&workspaceAccountExpansionDraft(state)!==state?'<button type="button" class="ws-hub-row" data-growth-account-expansion>'+hubLabel('谈余下三家的采购','Northline 首批三家已结清')+'</button>':'';
 const series=dev?workspaceSeriesRoutes(state).map(route=>'<button type="button" class="ws-hub-row" data-growth-series="'+route.id+'">'+hubLabel(route.label)+'</button>').join(''):'';
 const caseLink=dev?workspaceCaseGrowthLink(state):null;
 const caseRow=caseLink?'<button type="button" class="ws-hub-row" data-hub-case-growth>'+hubLabel(caseLink.label,caseLink.type==='resume'?'回到已有合作':'工作室原稿 · 案例合作')+'</button>':'';
 const leads='<details open class="ws-hub-card ws-leads"><summary>客户机会</summary>'+ (introductions.length
  ?'<p>请合作过的客户介绍买手。先看看对方要什么，不会直接签单。</p>'+introductions.map(r=>'<button type="button" class="ws-hub-row" data-growth-referral="'+wsEsc(r.id)+'" data-growth-first="'+(r.first?'true':'false')+'">'+hubLabel(r.referrerName.split(' · ')[0]+' 的引荐',r.product)+'</button>').join('')
  :chain||expansion||series||caseRow?'':state.curationHistory?.some(c=>c.status==='paid')?'<p>目前没有新的客户引荐。</p>':'<p>结清开场订单后，可以请合作过的客户引荐买手。</p>')+chain+expansion+series+caseRow+'</details>';
 const recapRows=dev?[
  workspaceCooperationRecapAvailable(state)?'<button type="button" class="ws-hub-row" data-growth-cooperation-recap>'+hubLabel('回看这段合作的收尾')+'</button>':'',
  workspaceTradingRecapAvailable(state)?'<button type="button" class="ws-hub-row" data-growth-trade-recap>'+hubLabel('回看供货工作室的这一程','六家门店已收货 · 新款台灯已收齐款')+'</button>':''
 ].join(''):'';
 const recap=recapRows?'<section class="ws-hub-card"><h3>已做成的合作</h3>'+recapRows+'</section>':'';
 const q=previewWorkspaceSleep(state);
 const confirm=sleepOpen&&q.valid?'<section id="workspace-sleep-confirmation" class="ws-hub-card" aria-labelledby="workspace-sleep-title"><h3 id="workspace-sleep-title" tabindex="-1">睡前看一眼</h3>'+(q.pending.length?'<ul>'+q.pending.map(x=>'<li>'+wsEsc(x)+'</li>').join('')+'</ul>':'')+'<p>工作室开支 ¥'+q.cost+'，确认后进入第 '+q.nextDay+' 天。</p><button type="button" data-workspace-sleep-confirm>进入第 '+q.nextDay+' 天</button><button type="button" data-workspace-sleep-cancel>先不睡</button></section>':'';
 const ledger='<button type="button" class="ws-hub-row" data-workspace-ledger>'+ledgerIcon+hubLabel('销售账本')+'</button>';
 const pendingPromotion=dev?promotionStatus(state)?.pending:null;
 const promotion='<details class="ws-hub-promotion" data-hub-promotion'+(promotionUI.hubPromotionOpen||promotionUI.promotionChannel?' open':'')+'><summary class="ws-hub-row">'+hubIcon('promo')+hubLabel('推广获客',pendingPromotion?'等第 '+pendingPromotion.replyDay+' 天回信':'选择推广渠道')+'</summary><div class="ws-hub-promotion-body">'+promotionView(state,promotionUI)+'</div></details>';
 const office='<button type="button" class="ws-hub-row ws-hub-office" data-property-enter="office">'+hubIcon('office')+hubLabel('挑间办公室','看房间和价格 · ¥'+Math.min(...PROPERTY_CATALOG.filter(x=>x.kind==='office'&&Number.isSafeInteger(x.price)).map(x=>x.price)).toLocaleString('zh-CN')+' 起')+'</button>';
 // The original starter room is recovered from the uninterrupted original in-game scene crop.
 const roomArt=home?.id&&home.id!=='home-starter'?propertySceneArt(home.id):'assets/deal-afterwork-original-room.webp';
 const rest='<img class="ws-hub-room" src="'+roomArt+'" alt="'+wsEsc(homeName)+'"><nav class="ws-hub-evening-list" aria-label="下班去处">'+
 hubRow('data-workspace-home','回家','home',homeName)+
 hubRow('data-property-enter="home"','房产','home')+
 hubRow('data-property-enter="car"',carTitle,'car')+
 hubRow('data-workspace-outing="trips"','旅行','trips')+
 hubRow('data-workspace-outing="friends"','约朋友','friends')+'</nav>';
 const day=q.valid?'<button type="button" class="ws-hub-row ws-hub-night" data-workspace-sleep aria-expanded="'+String(sleepOpen)+'"'+(sleepOpen?' aria-controls="workspace-sleep-confirmation"':'')+'>'+hubLabel('睡到明天')+'</button>':
 q.nextStep?'<button type="button" class="ws-hub-row ws-hub-night" data-workspace-continue data-workspace-open="'+wsEsc(q.nextStep.tab)+'">'+hubLabel(q.nextStep.label,q.reason)+'</button>':
 '<section class="ws-hub-card ws-hub-night" aria-label="休息"><p>'+wsEsc(q.reason)+'</p></section>';
 return '<section class="ws-office ws-hub ws-original-hub '+(dev?'ws-original-growth':'ws-original-evening')+'">'+
 (dev?'<h2 class="ws-hub-title">工作室的发展</h2><div class="ws-hub-growth-list">'+promotion+office+ledger+'</div>'+recap+leads:rest+day+confirm)+'</section>';
}
export function bindWorkspaceHub(root,{onHome,onOuting,onProperty,onSleep,onSleepConfirm,onSleepCancel,promotion,onReferral,onAccountCase,onAccountExpansion,onSeries,onTradeRecap,onCooperationRecap,onCaseGrowth}){
 if(promotion){
  bindPromotion(root,promotion.state,promotion.ui,promotion.render,promotion.dispatch);
  const showLedger=(open,selector)=>{promotion.ui.ledgerDetail=open;promotion.render();const el=root.querySelector(selector);el?.focus?.({preventScroll:true});el?.scrollIntoView?.({block:'nearest'});};
  root.querySelector('[data-workspace-ledger]')?.addEventListener('click',()=>showLedger(true,'#ws-chart-ledger-title'));
  root.querySelector('[data-workspace-ledger-back]')?.addEventListener('click',()=>showLedger(false,'[data-workspace-ledger]'));
  const panel=root.querySelector('[data-hub-promotion]');
  panel?.addEventListener('toggle',()=>{promotion.ui.hubPromotionOpen=panel.open;});
 }
 const revealFocus=selector=>{
  const el=root.querySelector(selector);
  el?.focus?.({preventScroll:true});
  el?.scrollIntoView?.({block:'nearest'});
 };
 root.querySelector('[data-workspace-sleep]')?.addEventListener('click',()=>{onSleep?.();revealFocus('#workspace-sleep-title');});
 root.querySelector('[data-workspace-sleep-confirm]')?.addEventListener('click',onSleepConfirm);
 root.querySelector('[data-workspace-sleep-cancel]')?.addEventListener('click',()=>{onSleepCancel?.();revealFocus('[data-workspace-sleep]');});
 root.querySelectorAll('[data-growth-referral]').forEach(b=>b.addEventListener('click',()=>onReferral?.(b.dataset.growthReferral,b.dataset.growthFirst==='true')));
 root.querySelectorAll('[data-growth-account]').forEach(b=>b.addEventListener('click',()=>onAccountCase?.(b.dataset.growthAccount)));
 root.querySelector('[data-growth-account-expansion]')?.addEventListener('click',()=>onAccountExpansion?.());
 root.querySelectorAll('[data-growth-series]').forEach(b=>b.addEventListener('click',()=>onSeries?.(b.dataset.growthSeries)));
 root.querySelector('[data-growth-trade-recap]')?.addEventListener('click',()=>onTradeRecap?.());
 root.querySelector('[data-growth-cooperation-recap]')?.addEventListener('click',()=>onCooperationRecap?.());
 root.querySelector('[data-hub-case-growth]')?.addEventListener('click',()=>onCaseGrowth?.());
 bindPropertyEntries(root,onProperty);
 root.querySelector('[data-workspace-home]')?.addEventListener('click',onHome);
 root.querySelectorAll('[data-workspace-outing]').forEach(b=>b.addEventListener('click',()=>onOuting(b.dataset.workspaceOuting)));
}
