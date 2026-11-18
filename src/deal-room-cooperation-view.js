import {cooperationChapter} from './deal-room-cooperation.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cooperationView(state){
 const chapter=cooperationChapter(state);if(!chapter.relation)return '';
 const {relation,stage,facts,step,nextAction}=chapter;
 const playerSteps={
  '没有这位买方已签范围的交付依据。':'先把这位客户已签的订单交好，再带着成品谈下一步。',
  '沿已建立的概念店关系，提出可合法复用的原稿。':'这家概念店已经认识你了，带着自己保留的原稿谈一笔新订单。',
  '原稿已经备好，下一步让买手确认采用范围。':'原稿准备好了，和买手谈谈选哪些产品、是否需要独家。',
  'Northline 已采用的不同版本分别交付给两批门店，六家店的合作已兑现；首批没有被改款。':'六家店都收到货了，两批门店各自拿到了确认过的版本。',
  'Northline 已确认的系列按同一版本铺到六家门店。这段合作已兑现，上市陈列仍可按需要查看。':'同一套系列已经摆进六家门店。有空去看看你做成的陈列。',
  '这份已交付案例可以带来合作；先选择合作方式，尚未约定为概念店或集团采购。':'带着这份案例，去谈概念店选品或集团供货。',
  '先完成已经签下的系列采购，尚不能把签约当作交付。':'系列订单已经签好，接下来安排制作、交货和收款。',
  '先选择实际合作的概念店联系人，不把转介自动算成采用。':'带着原稿去和概念店买手谈一谈，看看对方是否愿意采购。',
  '向已经签约的这位买方交接实物与陈列，不重新问归属。':'和 Atelier 确认实物与陈列，把谈好的独家系列送上货架。'
 };
 const playerStep=playerSteps[step]||step;
 const mixed=facts.find(f=>f.kind==='mixed-approved-version-stores');
 const split=facts.find(f=>f.kind==='generic-then-series-stores');
 const title=split?'Northline · 六家门店都已收货':mixed?'Northline · 两批门店已收货':relation.buyerId==='northline'?(nextAction?.type==='OPEN_LAUNCH_PROJECT'?(facts.some(f=>f.kind==='launch-handed')?'Northline · 上市交接已完成':'Northline · 交接这套系列的陈列'):'Northline · 把这套系列交到门店'):relation.buyerId==='atelier'?'Atelier · 做成这份独家合作':chapter.closed&&!facts.some(f=>f.kind==='use-delivered')?'工作室原稿 · 已被客户采用':'工作室原稿 · 从采用到实际用途';
 const delivered=facts.filter(f=>f.kind==='series-delivered').reduce((n,f)=>n+(f.sets||0),0);
 const stores=facts.find(f=>f.kind==='same-version-stores')?.stores;
 const labels=[delivered?`${delivered} 套系列已交付`:null,split?`首批 ${split.genericStores} 家通用组合 · 后 ${split.seriesStores} 家系列商品`:mixed?`${mixed.stores} 家店按各自确认版本交付`:stores?`${stores} 家店收到同版商品`:null,facts.some(f=>f.kind==='launch-handed')?'上市交接已完成':null,facts.some(f=>f.kind==='original-adopted')?'原稿已实际采用':null,facts.some(f=>f.kind==='use-delivered')?'用途方案已交付':null].filter(Boolean);
 return `<section class="career-focus cooperation-chapter" aria-label="当前客户合作"><small>${{proposal:'正在谈合作细节',contract:'已签约 · 待交付',delivery:'从交付走向下一步',closed:'这段合作已交付'}[stage]}</small><h3>${title}</h3>${labels.length?`<div class="cooperation-facts">${labels.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}<p class="career-next">${esc(playerStep)}</p>${nextAction?`<button class="primary" data-career-action="${esc(nextAction.type)}" ${nextAction.referrerId?`data-career-referrer="${esc(nextAction.referrerId)}"`:''} ${nextAction.direction?`data-career-direction="${esc(nextAction.direction)}"`:''}>${esc(nextAction.label)} →</button>`:''}</section>`;
}
