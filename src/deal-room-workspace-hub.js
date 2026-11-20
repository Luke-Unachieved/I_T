import {bindPropertyEntries} from './deal-room-property-view.js';
import {propertyHoldings,PROPERTY_CATALOG} from './deal-room-property.js';
import {openingCurationOffers,curationOffers} from './deal-room-engine.js';
import {propertySceneArt,propertyCatalogueArt} from './deal-room-property-art.js';
import {promotionView,bindPromotion} from './deal-room-promotion-view.js';
import {previewWorkspaceSleep} from './deal-room-workspace-sleep.js';
const wsEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function workspaceWeather(day){return ['晴','晴','阴','雨','晴','雪','阴'][(Math.imul(day,1597334677)>>>0)%7];}
const hubIcons={home:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',car:'m4 10 2-6h12l2 6M3 10h18v8H3zM6 18v3m12-3v3M6 14h2m8 0h2',trips:'M3 21h18M5 21V9h14v12M8 9V4h8v5M9 12v2m6-2v2m-6 3v2m6-2v2',friends:'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m20 0v-3a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8',sleep:'M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11'};
const promotionIcon='<span class="ws-hub-icon ws-hub-promo-emblem" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="17" r="11" stroke="currentColor" stroke-width="1.65"/><path d="M6 17h22M9 11.5h16M9 22.5h15M17 6c-3.4 2.8-5 6.6-5 11s1.6 8.2 5 11c3.4-2.8 5-6.6 5-11s-1.6-8.2-5-11Z" stroke="#ac8a56" stroke-width="1.12"/><circle cx="25.7" cy="24.7" r="5.8" fill="#2b2318" stroke="#f0d6a1" stroke-width="1.95"/><path d="m30 29 4.9 4.9" stroke="#f0d6a1" stroke-width="2.55"/><path d="M30 6v5m-2.5-2.5h5" stroke="#e4bc73" stroke-width="1.25"/></svg></span>';
const hubIcon=k=>k==='promo'?promotionIcon:'<span class="ws-hub-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+hubIcons[k]+'"/></svg></span>';
const hubLabel=(title,sub='')=>'<span class="ws-hub-label"><strong>'+wsEsc(title)+'</strong>'+(sub?'<small>'+wsEsc(sub)+'</small>':'')+'</span><span class="ws-hub-chevron" aria-hidden="true">›</span>';
const hubRow=(attrs,title,icon,sub='')=>'<button type="button" class="ws-hub-row" '+attrs+'>'+hubIcon(icon)+hubLabel(title,sub)+'</button>';
export function workspaceHubView(state,tab,lifeEnabled,sleepOpen=false,promotionUI={}){
 const dev=tab==='development',holdings=propertyHoldings(state);
 const home=PROPERTY_CATALOG.find(x=>x.id===holdings?.active.home);
 const homeName=home?.name??'工作室起居角';
 const carTitle=holdings?.owned.some(r=>PROPERTY_CATALOG.some(x=>x.kind==='car'&&x.id===r.id))?'车库':'车行';
 const introductions=[...openingCurationOffers(state).map(r=>({...r,first:true})),...curationOffers(state).map(r=>({...r,first:false}))].slice(0,3);
 const leads='<details open class="ws-hub-card ws-leads"><summary>客户机会</summary>'+ (introductions.length
  ?'<p>请合作过的客户介绍买手。先看看对方要什么，不会直接签单。</p>'+introductions.map(r=>'<button type="button" class="ws-hub-row" data-growth-referral="'+wsEsc(r.id)+'" data-growth-first="'+(r.first?'true':'false')+'">'+hubLabel(r.referrerName.split(' · ')[0]+' 的引荐',r.product)+'</button>').join('')
  :'<p>结清开场订单后，可以请合作过的客户引荐买手。</p>')+'</details>';
 const q=previewWorkspaceSleep(state);
 const confirm=sleepOpen?'<section class="ws-hub-card" aria-label="睡前确认"><h3>睡前看一眼</h3>'+(q.pending.length?'<ul>'+q.pending.map(x=>'<li>'+wsEsc(x)+'</li>').join('')+'</ul>':'')+(q.reason?'<p>'+wsEsc(q.reason)+'</p>':'<p>工作室开支 ¥'+q.cost+'，确认后进入第 '+q.nextDay+' 天。</p><button type="button" data-workspace-sleep-confirm>进入第 '+q.nextDay+' 天</button>')+'<button type="button" data-workspace-sleep-cancel>先不睡</button></section>':'';
 const promotion='<details class="ws-hub-promotion" data-hub-promotion'+(promotionUI.hubPromotionOpen||promotionUI.promotionChannel?' open':'')+'><summary class="ws-hub-row">'+hubIcon('promo')+hubLabel('推广获客','选择推广渠道')+'</summary><div class="ws-hub-promotion-body">'+promotionView(state,promotionUI)+'</div></details>';
 const office='<button type="button" class="ws-hub-row ws-hub-office" data-property-enter="office"><img alt="" src="'+propertyCatalogueArt('office-window')+'">'+hubLabel('挑间办公室','看房间和价格 · ¥'+Math.min(...PROPERTY_CATALOG.filter(x=>x.kind==='office'&&Number.isSafeInteger(x.price)).map(x=>x.price)).toLocaleString('zh-CN')+' 起')+'</button>';
 // The original starter room is recovered from the uninterrupted original in-game scene crop.
 const roomArt=home?.id&&home.id!=='home-starter'?propertySceneArt(home.id):'assets/deal-afterwork-original-room.webp';
 const rest='<img class="ws-hub-room" src="'+roomArt+'" alt="'+wsEsc(homeName)+'"><nav class="ws-hub-evening-list" aria-label="下班去处">'+
 hubRow('data-workspace-home','回家','home',homeName)+
 hubRow('data-property-enter="home"','房产','home')+
 hubRow('data-property-enter="car"',carTitle,'car')+
 hubRow('data-workspace-outing="trips"','旅行','trips')+
 hubRow('data-workspace-outing="friends"','约朋友','friends')+'</nav>';
 const day='<button type="button" class="ws-hub-row ws-hub-night" data-workspace-sleep>'+hubLabel('睡到明天')+'</button>';
 return '<section class="ws-office ws-hub ws-original-hub '+(dev?'ws-original-growth':'ws-original-evening')+'">'+
 (dev?'<h2 class="ws-hub-title">工作室的发展</h2><div class="ws-hub-growth-list">'+promotion+office+'</div>'+leads:rest+day+confirm)+'</section>';
}
export function bindWorkspaceHub(root,{onHome,onOuting,onProperty,onSleep,onSleepConfirm,onSleepCancel,promotion,onReferral}){
 if(promotion){
  bindPromotion(root,promotion.state,promotion.ui,promotion.render,promotion.dispatch);
  const panel=root.querySelector('[data-hub-promotion]');
  panel?.addEventListener('toggle',()=>{promotion.ui.hubPromotionOpen=panel.open;});
 }
 root.querySelector('[data-workspace-sleep]')?.addEventListener('click',onSleep);
 root.querySelector('[data-workspace-sleep-confirm]')?.addEventListener('click',onSleepConfirm);
 root.querySelector('[data-workspace-sleep-cancel]')?.addEventListener('click',onSleepCancel);
 root.querySelectorAll('[data-growth-referral]').forEach(b=>b.addEventListener('click',()=>onReferral?.(b.dataset.growthReferral,b.dataset.growthFirst==='true')));
 bindPropertyEntries(root,onProperty);
 root.querySelector('[data-workspace-home]')?.addEventListener('click',onHome);
 root.querySelectorAll('[data-workspace-outing]').forEach(b=>b.addEventListener('click',()=>onOuting(b.dataset.workspaceOuting)));
}
