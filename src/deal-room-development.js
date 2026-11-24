import {netProfitAmount} from './deal-room-net-profit.js';
import {specialtyMilestoneView} from './deal-room-specialty-calendar.js';
// A delivered lamp case is practical supplier experience; no unrelated repeat-order grind.
import {retailDemand} from './deal-room-demand.js';
export function hasLampDevelopmentCase(state){return (state.curationHistory||[]).some(c=>c.status==='paid'&&c.products?.includes('mira'));}
/** Fictional supplier samples. A reusable capability, not a compulsory next order. */
export const SAMPLE_FACTORIES={
 studio:{name:'澄光小批工作室',title:'三档调光台灯',cost:2400,days:4,quantity:60,revenue:4200,productionCost:2700,deliveryDays:4,payLag:0,feature:'一件样品可试三档亮度；以后可接 60 盏的小批调光灯。',limit:'单件制作成本高，不靠大批低价竞争。'},
 line:{name:'恒序灯具工厂',title:'暖光标准台灯',cost:1800,days:3,quantity:180,revenue:6300,productionCost:4140,deliveryDays:5,payLag:7,feature:'工厂为这版锁定整批生产；以后可按新成本接 180 盏整批采购。',limit:'这一版至少 180 盏起做；小单仍走原供应商。'}
};
function lineSlotBasis(s,optionId){
 const d=optionId==='second-developed-lamp'?s.secondSupplier:s.productDevelopment;
 if(d?.status!=='active'||d.factory!=='line')return null;
 return (s.contracts||[]).findLast(c=>c.clientId==='mira'&&c.optionId===optionId&&c.specification==='developed-line'&&c.quantity===180&&c.status==='paid'&&Number.isSafeInteger(c.paymentDay)&&c.paymentDay<=s.day)||null;
}
function lineSlotUsed(s,slot){
 return slot&&(s.contracts||[]).find(c=>c.clientId==='mira'&&c.optionId===slot.optionId&&c.quantity===180&&c.specification==='developed-line'&&c.signedDay>=slot.bookedDay&&c.signedDay<=slot.lastDay&&c.deliveryDay===c.signedDay+3);
}
function lineSlotOpen(s,optionId){
 const slot=s.lineFactorySlot;
 return !!(slot&&slot.optionId===optionId&&s.day>=slot.bookedDay&&s.day<=slot.lastDay&&!lineSlotUsed(s,slot)&&lineSlotBasis(s,optionId));
}
function lineSlotView(s,optionId){
 const receipt=lineSlotBasis(s,optionId);if(!receipt)return '';
 const slot=s.lineFactorySlot,used=lineSlotUsed(s,slot),demand=retailDemand(s,'mira');
 if(slot&&slot.optionId!==optionId)return '';
 if(slot){const summary=used?`这档已给第 ${used.signedDay} 天签的 ${used.quantity} 盏；合同交期是第 ${used.deliveryDay} 天。之后的订单按常规五天安排。`:s.day>slot.lastDay?`第 ${slot.lastDay} 天的排期已过，没有把这档计作采购。后续仍可走五天常规排期。`:demand&&!demand.ready&&demand.readyDay>slot.lastDay?`这段机时只到第 ${slot.lastDay} 天，Mira 的余货预计第 ${demand.readyDay} 天才售完，按当前计划来不及。`:`还可以在第 ${slot.lastDay} 天结束前签下一批 Mira 的同版 180 盏。先做别的生意也会走日历。`;return `<section class="line-slot"><small>恒序工厂 · 排期回单</small><p>${summary}</p><small>第 ${slot.bookedDay} 天付出的 ¥90 订档费已单列，不再收第二次。</small></section>`;}
 if(demand&&!demand.ready&&demand.readyDay>s.day+3)return `<details class="line-slot"><summary>恒序：这几天不必留机时</summary><p>Mira 的货架还约有 ${demand.remaining} 盏，预计第 ${demand.readyDay} 天才补货。今天能留的机时只到第 ${s.day+3} 天，赶不上；先不花这 ¥90。按目前进度，第 ${demand.readyDay-3} 天起再对一下两边的日历。</p></details>`;
 return `<details class="line-slot"><summary>恒序：给下一批暖光灯留一段机时？</summary><p>你交给 Mira 的 180 盏暖光灯已在第 ${receipt.paymentDay} 天结清。厂里腾出一个档期，可以留给同款下一批，不代表 Mira 已下单。</p><div class="line-slot-calendar" aria-label="从第 ${s.day} 天到第 ${s.day+3} 天可启用">${[0,1,2,3].map(i=>`<span>第 ${s.day+i} 天</span>`).join('')}</div>${demand&&!demand.ready?`<p>Mira 目前还约有 ${demand.remaining} 盏，预计第 ${demand.readyDay} 天才补货；届时仍在这段机时内。</p>`:''}<p>¥90 不退。四天内签同款 180 盏，三天交货，仍是交货后七天收尾款；不订则按原五天做。提前两天省 ¥60 日费，若不需要腾出这两天，常规排期少花 ¥30。</p><button class="quiet" data-action="BOOK_AVAILABLE_LINE_FACTORY_SLOT" ${s.cash>=90?'':'disabled'}>支付 ¥90，留这一个档期</button></details>`;
}
export function developmentOffer(state,optionId='developed-lamp'){
 const d=state.productDevelopment;if(d?.status!=='active')return null;const f=SAMPLE_FACTORIES[d.factory];
 const slot=d.factory==='line'&&lineSlotOpen(state,optionId);
 return {id:optionId,title:f.title+(d.factory==='studio'?' · 小批展示':' · 整批铺货'),exchange:slot?'使用已经预订的恒序机时；同款180盏三天交货，交货后七天收齐。¥90订档费已经付过。':d.factory==='studio'?'用你验过的三档调光样品报价；交货付款。':'使用新工厂批量成本；180 盏起做，先付三成、留七天账期。',quantity:f.quantity,revenue:f.revenue,cost:f.productionCost,deliveryDays:slot?3:f.deliveryDays,payLag:f.payLag,deposit:d.factory==='line'?Math.floor(f.revenue*.3):0,accepted:true,reason:'',specification:'developed-'+d.factory};
}
function firstDevelopmentView(state,selected='studio',brightness=1,optionId='developed-lamp'){
 const d=state.productDevelopment,f=SAMPLE_FACTORIES[d.factory||selected];
 const receipt=d.status==='active'?(state.contracts||[]).findLast(c=>c.status==='paid'&&c.optionId===optionId&&c.specification==='developed-'+d.factory):null;
 const escapeReceipt=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const adoption=receipt?`<section class="sample-adoption" aria-label="这版样品的实际交付"><strong>这版灯，已经交到客户手上</strong><p>${escapeReceipt(receipt.clientName)} · ${receipt.quantity} 盏<br>第 ${receipt.deliveryDay} 天交付 · 货款已收齐</p></section>`:'';
 if(d.status==='draft')return `<button class="back-clients" data-action="CLOSE_DEVELOPMENT">← 先不付出样费</button><h3>找哪家工厂做灯样？</h3><p class="brief">一家能做小批调光灯，另一家做整批暖光灯。可以先看样品费用和起订量，不耽误接旧款的单。</p><div class="quotes">${Object.entries(SAMPLE_FACTORIES).map(([id,v])=>`<button data-factory="${id}" class="quote ${id===selected?'chosen':''}" aria-pressed="${id===selected}"><strong>${v.name}</strong><span>${v.title} · 出样 ¥${v.cost} · ${v.days} 天</span></button>`).join('')}</div><p>${f.feature}</p><p class="brief">${f.limit}</p><details><summary>这版以后能怎么报价</summary><p>${f.quantity} 盏 · 整单 ¥${f.revenue} · 采购 ¥${f.productionCost}<br>${f.deliveryDays} 天交货 · ${f.payLag?`交货后 ${f.payLag} 天收齐`:'交货收齐'} · 扣除日常开支后预计净赚 ${netProfitAmount(f.revenue-f.productionCost-(f.deliveryDays+f.payLag)*30)}</p></details><p class="brief">出样及这 ${f.days} 天工作室开支合计 ¥${f.cost+f.days*30}。样品做好后，还要由买手决定是否下单。</p><button class="primary" data-action="COMMISSION_SAMPLE" ${state.cash>=f.cost+f.days*30?'':'disabled'}>付出样费，拿这家的实物样 →</button>`;
 if(d.status==='sampling')return `<h3>${f.name} 正在做样</h3><p class="brief">出样已付 ¥${f.cost}。第 ${d.sampleDay} 天到样，期间工作室开支 ¥${f.days*30}。</p>${specialtyMilestoneView(state,{hideWaiting:true})}`;
 return `<h3>${f.title} · 工厂实物样</h3><div class="lamp-trial" style="--sample-light:${d.factory==='studio'?[.25,.55,1][brightness]:.55};--lamp-brightness:${d.factory==='studio'?[.75,.95,1.12][brightness]:.95}"><div class="sample-glow"></div><div class="trial-lamp"></div></div>${d.factory==='studio'?`<div class="sample-switch" role="group" aria-label="试灯亮度">${['夜间柔光','桌面阅读','陈列亮光'].map((name,i)=>`<button data-light="${i}" aria-pressed="${brightness===i}">${name}</button>`).join('')}</div><p class="brief">试试三档亮度，看看哪一档适合店里展示。</p>`:'<p class="brief">暖光标准版，亮度固定，180 盏起订。</p>'}${adoption}${d.status==='active'&&d.factory==='line'?lineSlotView(state,optionId):''}<p class="brief">${d.status==='active'?'和 Mira 谈下一单时，可以报这款灯。已经签的单按原规格交货。':'先看看样品。确认收下后，和 Mira 谈下一单时才能报这款灯。'}</p><button class="primary" data-action="${d.status==='active'?'CLOSE_SAMPLE':'ACCEPT_SAMPLE'}">${d.status==='active'?'回工作室':'留下验过的样品，带去谈单'} →</button>`;
}

export function acceptedLampSample(state,factory){return [state.productDevelopment,state.secondSupplier].find(d=>d?.status==='active'&&d.factory===factory)||null;}
export const SECOND_SUPPLIER_ACTIONS=Object.freeze({PAUSE_FIRST_SAMPLE:['type'],COLLECT_FIRST_SAMPLE:['type'],BOOK_AVAILABLE_LINE_FACTORY_SLOT:['type'],BOOK_LINE_FACTORY_SLOT:['type'],OPEN_SECOND_SUPPLIER:['type'],CLOSE_SECOND_SUPPLIER:['type'],COMMISSION_SECOND_SAMPLE:['type'],RECEIVE_SECOND_SAMPLE:['type'],ACCEPT_SECOND_SAMPLE:['type']});
export function canonicalSecondSupplierAction(a){if(!a||!Object.hasOwn(SECOND_SUPPLIER_ACTIONS,a.type)||Object.keys(a).length!==1)return null;return {type:a.type};}
export function applySecondSupplierAction(state,a,{calendar=false}={}){
 if(!canonicalSecondSupplierAction(a))return state;
 const first=state.productDevelopment;
 // Commissioning already paid the factory. Charge only uncovered waiting days;
 // the original uninterrupted receipt path and all its journal entries stay intact.
 if(a.type==='PAUSE_FIRST_SAMPLE'){
  if(state.phase!=='development'||!['sampling','received'].includes(first?.status))return state;
  const s=structuredClone(state);s.phase='review';s.feedback={kind:'sample-pending',message:first.status==='received'?'实物样留在工作室，没确认的型号不会带入报价。':'出样费已付。工厂照常制作，工作室可以继续接单。'};return s;
 }
 if(a.type==='COLLECT_FIRST_SAMPLE'){
  if(!(calendar?['development','review','complete']:['review','complete']).includes(state.phase)||!['sampling','received'].includes(first?.status)||!Object.hasOwn(SAMPLE_FACTORIES,first.factory)||!Number.isSafeInteger(first.sampleDay)||!Number.isSafeInteger(first.investment))return state;
  if(calendar&&(state.phase==='development'&&first.status!=='sampling'||first.status==='sampling'&&state.day<first.sampleDay))return state;
  const remaining=!calendar&&first.status==='sampling'?Math.max(0,first.sampleDay-state.day):0,cost=remaining*30;
  if(state.cash<cost)return state;
  const s=structuredClone(state);s.phase='development';if(!calendar){s.day+=remaining;s.cash-=cost;s.productDevelopment.investment+=cost;}s.productDevelopment.status='received';s.feedback={kind:'sample-received',message:'工厂实物样在桌上。验过后再决定是否用它报价。'};return s;
 }
 if(first?.status!=='active')return state;
 // Leave the pre-gating action replayable for prior purchases; current UI uses the demand-checked action only.
 if(a.type==='BOOK_AVAILABLE_LINE_FACTORY_SLOT'||a.type==='BOOK_LINE_FACTORY_SLOT'){
  const optionId=state.phase==='development'?'developed-lamp':state.phase==='supplier-development'?'second-developed-lamp':null;
  if(!optionId||!lineSlotBasis(state,optionId)||state.lineFactorySlot||!Number.isSafeInteger(state.cash)||state.cash<90)return state;
  if(a.type==='BOOK_AVAILABLE_LINE_FACTORY_SLOT'){const demand=retailDemand(state,'mira');if(demand&&!demand.ready&&demand.readyDay>state.day+3)return state;}
  const s=structuredClone(state);s.cash-=90;s.lineFactorySlot={optionId,bookedDay:s.day,lastDay:s.day+3,fee:90};s.feedback={kind:'factory-slot',message:'恒序留好了这一段机时，尚未签下客户订单。'};return s;
 }
 const other=state.productDevelopment.factory==='studio'?'line':'studio',d=state.secondSupplier,f=SAMPLE_FACTORIES[other];
 if(a.type==='OPEN_SECOND_SUPPLIER'&&['review','complete','development'].includes(state.phase)){const s=structuredClone(state);s.secondSupplier??={factory:other,status:'draft'};s.phase='supplier-development';return s;}
 if(state.phase!=='supplier-development'||d?.factory!==other)return state;
 if(a.type==='CLOSE_SECOND_SUPPLIER'){const s=structuredClone(state);if(d.status==='draft')delete s.secondSupplier;s.phase='review';return s;}
 if(a.type==='COMMISSION_SECOND_SAMPLE'&&d.status==='draft'&&state.cash>=f.cost+f.days*30){const s=structuredClone(state);s.cash-=f.cost;s.secondSupplier={factory:other,status:'sampling',sampleDay:s.day+f.days,investment:f.cost};s.feedback={kind:'second-sample',message:`${f.name}收到出样委托，实物样第 ${s.secondSupplier.sampleDay} 天寄到。`};return s;}
 if(a.type==='RECEIVE_SECOND_SAMPLE'&&d.status==='sampling'){if(calendar&&state.day<d.sampleDay)return state;const days=calendar?0:Math.max(0,d.sampleDay-state.day),cost=days*30;if(state.cash<cost)return state;const s=structuredClone(state);if(!calendar){s.day+=days;s.cash-=cost;s.secondSupplier.investment+=cost;}s.secondSupplier.status='received';s.feedback={kind:'second-sample',message:'另一家工厂的实物样到了。拆开看看，再决定收进样品柜。'};return s;}
 if(a.type==='ACCEPT_SECOND_SAMPLE'&&d.status==='received'){const s=structuredClone(state);s.secondSupplier.status='active';s.phase='review';s.feedback={kind:'second-sample',message:'两家的实物样都收好了，谈单时按客户需要选。'};return s;}
 return state;
}
export function secondDevelopmentOffer(state){const d=state.secondSupplier;if(d?.status!=='active')return null;return developmentOffer({...state,productDevelopment:d},'second-developed-lamp');}
export function developmentView(state,selected='studio',brightness=1){
 if(state.phase!=='supplier-development')return firstDevelopmentView(state,selected,brightness)+(['sampling','received'].includes(state.productDevelopment?.status)?'<button class="quiet" data-action="PAUSE_FIRST_SAMPLE">'+(state.productDevelopment.status==='sampling'?'厂里先做样，我回工作室接单':'先留着实物，不启用这款报价')+' →</button>':'')+(state.productDevelopment?.status==='active'?`<button data-action="OPEN_SECOND_SUPPLIER">${state.secondSupplier?.status==='active'?'看看另一家的留样':state.secondSupplier&&state.secondSupplier.status!=='draft'?'查看另一家的出样进度':'也看看另一家工厂'}</button>`:'');
 const d=state.secondSupplier,f=SAMPLE_FACTORIES[d.factory],back='<button class="quiet" data-action="CLOSE_SECOND_SUPPLIER">回工作室</button>';
 if(d.status==='draft')return `${back}<h3>${f.name} · 再留一家的实物样</h3><p>${f.title}。${f.feature}</p><p>${f.limit}</p><p>出样 ¥${f.cost}，${f.days} 天到样。这段时间的工作室开支 ¥${f.days*30}。</p><p>现在支付 ¥${f.cost} · ${state.cash>=f.cost?'付后还剩 ¥'+(state.cash-f.cost):'出样费还差 ¥'+(f.cost-state.cash)}。</p>${state.cash<f.cost+f.days*30?`<p role="status">出样费和等样期间开支共 ¥${f.cost+f.days*30}，手头还差 ¥${f.cost+f.days*30-state.cash}。</p>`:''}<button class="primary" data-action="COMMISSION_SECOND_SAMPLE" ${state.cash>=f.cost+f.days*30?'':'disabled'}>委托这家出样</button>`;
 if(d.status==='sampling'){const days=Math.max(0,d.sampleDay-state.day);return `${back}<h3>${f.name} 正在做样</h3><p>已付 ¥${f.cost} · 第 ${d.sampleDay} 天到样。${days?`还需 ${days} 天，期间开支 ¥${days*30}。`:'实物样已寄到，可以拆开看看。'}</p>${specialtyMilestoneView(state,{hideWaiting:true})}`;}
 return firstDevelopmentView({...state,productDevelopment:d},d.factory,brightness,'second-developed-lamp').replaceAll('data-action="CLOSE_SAMPLE"','data-action="CLOSE_SECOND_SUPPLIER"').replaceAll('data-action="ACCEPT_SAMPLE"','data-action="ACCEPT_SECOND_SAMPLE"');
}
