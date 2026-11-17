import {catalogueVersions} from './deal-room-design-catalogue.js';
import {collectionPitchOffers,COLLECTION_STYLES} from './deal-room-collection.js';
const PEOPLE={atelier:{id:'atelier',name:'Élise',company:'Atelier',role:'主题店主理人',purpose:'看重陈列主题与独特纹样',column:0},northline:{id:'northline',name:'Adrian',company:'Northline',role:'品牌采购',purpose:'看重品牌标准与可复用供货',column:1}};
const buyerKey=id=>id==='northline-private'?'northline':id;
const money=n=>`¥${Number(n).toLocaleString('zh-CN')}`;
/** Read-only receipt from a paid collection order, independent of transient feedback.
 * Canonical engine state is assumed; this does not validate saves or grant rights.
 * A requested contact never falls back to a different customer's paid order.
 */
export function collectionReceipt(state,buyerId=''){
 const c=state.collection;
 if(state.phase!=='collection'||!c||!['sample','complete'].includes(c.status))return null;
 const order=(c.orders||[]).findLast(o=>o.status==='paid'&&(!buyerId||buyerKey(o.buyerId)===buyerKey(buyerId)));
 const person=order&&PEOPLE[buyerKey(order.buyerId)];
 if(!person)return null;
 return {buyer:{...person},buyerId:order.buyerId,order:{...order},products:[...c.products],sets:order.sets,
  style:order.style||c.style,scope:order.scope||(c.model==='private'?'private-label':'nonexclusive'),
  paymentDay:order.paymentDay,lampVersion:c.lampVersion||'standard',model:c.model};
}
export function buyerContact(state,pitch){
 const c=state.collection;let id=null,mood=0,label='看样中';
 if(state.phase==='launch-project'&&c){id=c.model==='private'?'northline':c.exclusiveBuyer;mood=state.launchProject?.status==='draft'?0:2;label=state.launchProject?.status==='handed'?'交接回执':'看上市陈列';}
 else if(state.phase==='collection'&&c){
  if(c.status==='draft')id='northline';
  else if(c.status==='pitch'){id=c.pitchBuyer;mood=pitch?.valid?2:1;label=pitch?.valid?'条件可谈':'正在回谈';}
  else if(c.status==='production'){id=buyerKey(c.active.buyerId);mood=2;label='订单已确认';}
  else if(c.orders.length&&state.feedback?.kind==='collection-paid'){id=buyerKey(c.orders.at(-1).buyerId);mood=2;label='交付回执';}
 }else if(state.phase==='account'){id='northline';mood=state.account.status==='draft'?0:2;label=state.account.status==='draft'?'看采购方案':'合作已确认';}
 else if(['curating','curation-fulfillment'].includes(state.phase)){id=state.curation.giftAllowed?'atelier':'northline';mood=state.phase==='curation-fulfillment'?2:0;label=mood?'组合已确认':'看组合';}
 return id&&PEOPLE[id]?{...PEOPLE[id],mood,label}:null;
}
export function collectionRelations(c){
 if(!c)return [];
 const available=collectionPitchOffers(c);
 return (c.model==='private'?['northline']:['atelier','northline']).map(id=>{
  const orders=c.orders.filter(o=>buyerKey(o.buyerId)===id),last=orders.at(-1),original=orders.some(o=>o.scope!=='buyer-sleeve'),sleeve=orders.findLast(o=>o.scope==='buyer-sleeve');
  const blocked=!!c.exclusiveBuyer&&c.exclusiveBuyer!==id;
  return {...PEOPLE[id],orders,last,original,sleeve,canPitch:available.includes(id),blocked,status:blocked?'原系列已另授独家':sleeve?'专用纸套已交付，原稿保留':original?'已采用原系列':c.model==='private'?'买方专用系列':'尚未采用'};
 });
}
export function collectionBoardView(state,focus='',versionFocus='original',receiptMode='delivered'){
 const c=state.collection,relations=collectionRelations(c),selected=relations.find(r=>r.id===focus);
 const adopted=(state.caseGrowthHistory||[]).filter(o=>o.status==='paid'&&o.designVersion==='original');
 const receipt=collectionReceipt(state,focus);
 const right=c.model==='private'?'这套包装属于 Northline':c.exclusiveBuyer?`原系列仅供 ${PEOPLE[c.exclusiveBuyer].company}`:'原稿在工作室，可继续谈采用范围';
 const tiles=relations.map(r=>`<div class="relation-card ${r.blocked?'relation-blocked':''}"><span class="buyer-portrait" aria-hidden="true" style="--buyer-x:${r.column*100}%;--buyer-y:${r.orders.length?100:0}%"></span><div><strong>${r.name} · ${r.company}</strong><small>${r.purpose}</small><span>${r.status}</span>${r.canPitch?`<button data-collection-buyer="${r.id}">商议采用条件 →</button>`:''}${r.orders.length?`<button class="quiet" data-view-buyer="${r.id}">查看 ${r.orders.length} 份已交付案例</button>`:''}</div></div>`).join('');
 const detail=selected?`<section class="buyer-case"><div class="case-heading"><strong>${selected.company} 的实际交付</strong><button data-close-buyer>收起</button></div><div class="design-comparison"><div class="design-swatch style-${c.style}"><b>${c.model==='own'?'工作室原稿':'买方原稿'}</b><span>${COLLECTION_STYLES[c.style]}</span></div>${selected.sleeve?`<span aria-hidden="true">→</span><div class="design-swatch style-${selected.sleeve.style}"><b>${selected.company} 专用纸套</b><span>${selected.sleeve.sets} 套已交付</span></div>`:''}</div>${selected.orders.map(o=>`<p>${o.sets} 套 · ${o.scope==='buyer-sleeve'?'只专供纸套':o.scope==='whole-exclusive'?'原系列独家':'按已签范围交付'} · 净赚 ${money(o.netProfit)}</p>`).join('')}</section>`:'';
 return `${receipt?`<section class="receipt-workbench" aria-label="客户已采用的作品"><small>${receipt.buyer.name} · ${receipt.buyer.company}</small><h3>这次合作，留下了什么</h3><p>${receipt.products.length} 款 · 每款 ${receipt.sets} 件已交付 · 第 ${receipt.paymentDay} 天结清</p><div role="group" aria-label="对照设计与实际交付"><button data-receipt-mode="original" aria-pressed="${receiptMode==='original'}">看确认的设计</button><button data-receipt-mode="delivered" aria-pressed="${receiptMode!=='original'}">看实际交付</button></div><small>${receipt.scope==='whole-exclusive'?'这份原系列仅供这位买方，通用业务保留。':receipt.scope==='buyer-sleeve'?'这份纸套专供买方，工作室原稿另行保留。':receipt.scope==='private-label'?'买方专用版本，不转供其他客户。':'工作室原稿保留，按已签范围继续经营。'}</small></section>`:''}<section class="relationship-board" aria-label="系列设计与买手关系"><div class="design-origin"><span class="design-swatch style-${c.style}" aria-hidden="true"></span><div><strong>${right}</strong><small>${COLLECTION_STYLES[c.style]} · 客户合作与采用范围</small></div></div><div class="relation-cards">${tiles}</div>${adopted.length?`<div class="catalogue-rights"><strong>概念店也采用了工作室原稿</strong><p>${adopted.length} 次已交付 · 署名保留 · 不再可授整套独家</p></div>`:''}${detail}${designCatalogueView(state,versionFocus)}</section>`;
}

/** Inspect actual held artwork, never grant reuse through a display selection. */
export function designCatalogueView(state,focus='original'){
 const versions=catalogueVersions(state);if(!versions.length)return '';
 const selected=versions.find(v=>v.id===focus)||versions[0];
 const title=v=>v.title;
 const rights=v=>v.kind==='buyer-sleeve'?`这份纸套只供 ${v.buyerId==='atelier'?'Atelier':'Northline'}，工作室原稿仍保留。`:v.kind==='private-label'?'Northline 的专用版本，不供其他客户。':v.exclusiveBuyer?`这份原稿已约定只供 ${v.exclusiveBuyer==='atelier'?'Atelier':'Northline'}。`:v.reusable?'原稿在你手里，可以带给其他客户看样。':v.reason;
 return `<details class="design-catalogue"><summary>打开样册 · ${versions.length} 个版本</summary><div class="catalogue-table" role="group" aria-label="已经持有的设计版本">${versions.map(v=>`<button data-catalogue-version="${v.id}" aria-pressed="${v.id===selected.id}"><span class="design-swatch style-${v.style}" aria-hidden="true"></span><strong>${title(v)}</strong><small>${v.buyerId==='atelier'?'Atelier':v.buyerId==='northline'?'Northline':'工作室'}</small></button>`).join('')}</div><div class="catalogue-rights" role="status"><strong>${title(selected)} · ${COLLECTION_STYLES[selected.style]||'已签版本'}</strong><p>${rights(selected)}</p></div></details>`;
}
