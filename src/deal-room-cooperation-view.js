import {cooperationChapter} from './deal-room-cooperation.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cooperationView(state){
 const chapter=cooperationChapter(state);if(!chapter.relation)return '';
 const {relation,stage,facts,step,nextAction}=chapter;
 const playerStep=step==='这份已交付案例可以带来合作；先选择合作方式，尚未约定为概念店或集团采购。'?'带着这份案例，去谈概念店选品或集团供货。':step;
 const mixed=facts.find(f=>f.kind==='mixed-approved-version-stores');
 const title=mixed?'Northline · 两批门店已收货':relation.buyerId==='northline'?(nextAction?.type==='OPEN_LAUNCH_PROJECT'?(facts.some(f=>f.kind==='launch-handed')?'Northline · 上市交接已完成':'Northline · 交接这套系列的陈列'):'Northline · 把这套系列交到门店'):relation.buyerId==='atelier'?'Atelier · 做成这份独家合作':chapter.closed&&!facts.some(f=>f.kind==='use-delivered')?'工作室原稿 · 已被客户采用':'工作室原稿 · 从采用到实际用途';
 const delivered=facts.filter(f=>f.kind==='series-delivered').reduce((n,f)=>n+(f.sets||0),0);
 const stores=facts.find(f=>f.kind==='same-version-stores')?.stores;
 const labels=[delivered?`${delivered} 套系列已交付`:null,mixed?`${mixed.stores} 家店按各自确认版本交付`:stores?`${stores} 家店收到同版商品`:null,facts.some(f=>f.kind==='launch-handed')?'上市交接已完成':null,facts.some(f=>f.kind==='original-adopted')?'原稿已实际采用':null,facts.some(f=>f.kind==='use-delivered')?'用途方案已交付':null].filter(Boolean);
 return `<section class="career-focus cooperation-chapter" aria-label="当前客户合作"><small>${{proposal:'正在谈采用范围',contract:'已签约 · 待交付',delivery:'从交付走向下一步',closed:'这段合作已交付'}[stage]}</small><h3>${title}</h3>${labels.length?`<div class="cooperation-facts">${labels.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}<p class="career-next">${esc(playerStep)}</p>${nextAction?`<button class="primary" data-career-action="${esc(nextAction.type)}" ${nextAction.referrerId?`data-career-referrer="${esc(nextAction.referrerId)}"`:''} ${nextAction.direction?`data-career-direction="${esc(nextAction.direction)}"`:''}>${esc(nextAction.label)} →</button>`:''}</section>`;
}
