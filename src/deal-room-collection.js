import {atelierRestockProfit} from './deal-room-atelier-restock.js';
import {paidSeriesStoreOrders} from './deal-room-account.js';
/** One player-owned collection or one buyer-owned private-label commission.
 * Rights affect reuse of this packaging, never the user's earlier generic products.
 */
const money=n=>`¥${Number(n).toLocaleString('zh-CN')}`;
export const COLLECTION_STYLES={cream:'米杏纸套',charcoal:'炭黑礼盒',botanical:'枝叶纹样'};
export function collectionQuote(state,model,buyerId){
 const c=state.collection;if(!c)return null;
 const privateLabel=model==='private',sets=privateLabel?80:buyerId==='atelier'?50:60;
 if(!privateLabel&&!['atelier','northline'].includes(buyerId))return null;
 const unitPrice=privateLabel||buyerId==='atelier'?c.price+12:Math.floor(c.price*.85)+8;
 const revenue=unitPrice*sets+(privateLabel?4000:0),cost=(c.cost+(privateLabel||buyerId==='atelier'?6:4))*sets+(privateLabel?2400:0),days=privateLabel?9:buyerId==='atelier'?6:4,operatingCost=days*30,deposit=Math.floor(revenue*.5);
 return {buyerId:privateLabel?'northline-private':buyerId,buyer:privateLabel?'Northline · 自有品牌':buyerId==='atelier'?'Atelier · 主题上新':'Northline · 门店系列',sets,revenue,cost,deposit,balanceDue:revenue-deposit,operatingCost,days,paymentDay:state.day+days,netProfit:revenue-cost-operatingCost,valid:state.cash>=cost-deposit+operatingCost};
}
export function collectionPitchOffers(c){
 if(c?.model!=='own')return [];
 return ['atelier','northline'].filter(id=>(!c.exclusiveBuyer||c.exclusiveBuyer===id)&&!c.orders.some(o=>o.buyerId===id&&o.negotiated));
}
export function previewCollectionPitch(state,optionId){
 const c=state.collection,id=c?.pitchBuyer;if(!id||!['retain','exclusive','sleeve'].includes(optionId)||(id==='northline'&&optionId==='sleeve'))return null;
 const base=collectionQuote(state,'own',id),sleeve=optionId==='sleeve',exclusive=optionId==='exclusive';
 const sets=exclusive?base.sets*2:sleeve?base.sets+30:base.sets;
 const sampleCost=sleeve?(id==='atelier'?1200:1600):0,licenceFee=exclusive?2400:0;
 const revenue=base.revenue/base.sets*sets+licenceFee,cost=base.cost/base.sets*sets+sampleCost+(sleeve?sets*2:0),days=base.days+(exclusive?3:sleeve?2:0),operatingCost=days*30,deposit=Math.floor(revenue*.5);
 const adoptedElsewhere=[...(state.caseGrowthHistory||[]),...(state.caseGrowth?.status==='production'?[state.caseGrowth.active]:[])].some(o=>o?.designVersion==='original');
 const reason=exclusive&&adoptedElsewhere?'工作室原稿已经给概念店采用，不能再把同一原稿承诺为整套独家。':exclusive&&c.orders.some(o=>o.buyerId!==id&&o.scope!=='buyer-sleeve')?(id==='northline'?'原系列已供给其他买手，不能再承诺整套独家。可以保留工作室品牌，按门店选品供货。':'原系列已经供给过其他采购，不能再承诺整套独家。可以保留原系列，或只给这位买手做专用纸套。'):state.cash<cost-deposit+operatingCost?'当前周转不足，先回工作室再安排。':'';
 return {...base,negotiated:true,optionId,sets,revenue,cost,days,operatingCost,deposit,balanceDue:revenue-deposit,paymentDay:state.day+days,netProfit:revenue-cost-operatingCost,sampleCost,licenceFee,style:sleeve?'cream':exclusive&&id==='northline'?'charcoal':c.style,scope:exclusive?'whole-exclusive':sleeve?'buyer-sleeve':'nonexclusive',valid:!reason,reason};
}
export function collectionPitchView(state,optionId){
 const c=state.collection,q=previewCollectionPitch(state,optionId),buyer=q.buyer,chain=c.pitchBuyer==='northline';
 const otherId=chain?'atelier':'northline',otherName=chain?'Élise · Atelier':'Adrian · Northline';
 const otherOpen=collectionPitchOffers(c).includes(otherId);
 const nextUse=!q.valid?'现有客户与使用范围保持；请换可签方案。':optionId==='exclusive'?`${otherName} · 原系列不再提案`:otherOpen?`${otherName} · 仍可谈原系列采用`:`${otherName} · 已有约定保持，不重复开放提案`;
 const lines={retain:'原系列保留工作室署名，可以供给其他买手。买方按常规批量采购。',exclusive:'这份原系列以后只供这一位买手；另一位买手的这份系列提案将关闭。旧通用产品不受影响。',sleeve:'只把带买方署名的新纸套专供这一位；原系列和原纹样继续归工作室使用。'};
 return `<button class="back-clients" data-action="BACK_COLLECTION_PITCH">← 先不答应</button><h3>${buyer}</h3><blockquote class="buyer-counter">${chain?'“这批想放进我们的自有品牌线。整套设计能授权给我们，用统一黑色包装吗？”':'“主题店希望这组纹样只出现在本店。独家范围，可以一起谈吗？”'}</blockquote><div class="quotes">${[['retain','保留原系列，按常规量供货'],['exclusive','谈整套独家，把授权费计入'],['sleeve','只做买方专用纸套，原设计留下']].filter(([id])=>!chain||id!=='sleeve').map(([id,title])=>{const p=previewCollectionPitch(state,id);return `<button class="quote ${optionId===id?'chosen':''}" data-pitch-option="${id}" aria-pressed="${optionId===id}"><strong>${title}</strong><span>${p.sets} 套 · ${p.days} 天 · 预计赚到 ${money(p.netProfit)}</span></button>`;}).join('')}</div><section class="pitch-consequence" aria-label="这次签约留下的机会"><strong>${!q.valid?'本方案暂不能签':optionId==='exclusive'?'签后：这一套只供这位买方':optionId==='sleeve'?'签后：原稿可复用，纸套只供 Atelier':'签后：原系列仍可复用'}</strong><p>${nextUse}</p>${optionId==='exclusive'?'<small>通用产品仍可接单；原系列不能另许独家。</small>':''}</section><details><summary>署名与使用范围</summary><p>${lines[optionId]}</p></details>${q.reason?`<p class="counter" role="status">${q.reason}</p>`:`<p class="buyer-response" role="status">${optionId==='retain'?(chain?'“那就按工作室品牌做门店选品，不改成我们的自有品牌线。”':'“可以。按常规批量采购，你的署名保留。”'):optionId==='sleeve'?'“好，我们只要带自己名字的包装。原系列你继续做。”':'“独家范围写清楚，授权费一并计入这份订单。”'}</p>`}<section class="brief" aria-label="签约资金"><p>这单货款 ${money(q.revenue)} · 预计赚到 ${money(q.netProfit)}</p><p>客户先付定金 ${money(q.deposit)} · 现在要付 ${money(q.cost)}<br>${state.cash+q.deposit-q.cost<0?`还差 ${money(q.cost-q.deposit-state.cash)}`:`签完还剩 ${money(state.cash+q.deposit-q.cost)}`}</p></section><details><summary>货款与制作明细</summary><p>合同总额 ${money(q.revenue)}${q.licenceFee?`（含授权费 ${money(q.licenceFee)}）`:""} · 尾款 ${money(q.balanceDue)}<br>制作款 ${money(q.cost)}${q.sampleCost?`（其中纸套出样 ${money(q.sampleCost)}）`:""}<br>回款前需留 ${money(q.operatingCost)} 日常开销</p></details><button class="primary" data-action="SIGN_COLLECTION_PITCH" ${q.valid?'':'disabled'}>确认这份范围与订单 →</button>`;
}
const collectionSeedNames={mira:'便携台灯',samir:'保温杯',ines:'棉麻桌布'},collectionContacts={mira:'Mira',samir:'Samir',ines:'Inês'};
const goodsKey=v=>JSON.stringify([Object.keys(collectionSeedNames).filter(k=>v.products.includes(k)),v.lampVersion||'standard']);
export function collectionSeedChoices(state){
 const c=state.collection;if(state.phase!=='collection'||c?.status!=='draft'||!Array.isArray(c.products))return [];
 const rows=(state.curationHistory||[]).filter(o=>o.status==='paid'&&Object.hasOwn(collectionContacts,o.referrerId)&&Number.isSafeInteger(o.paymentDay)&&o.paymentDay>=0&&o.paymentDay<=state.day&&[40,60].includes(o.quantity)&&Array.isArray(o.products)&&o.products.length>=2&&o.products.length<=3&&new Set(o.products).size===o.products.length&&o.products.every(id=>Object.hasOwn(collectionSeedNames,id))&&(!o.lampVersion||['standard','developed'].includes(o.lampVersion)));
 const used=new Set(),options=[];
 for(const o of rows){const key=goodsKey(o);if(used.has(key)||rows.filter(w=>w.referrerId===o.referrerId).length!==1)continue;used.add(key);
  options.push({referrerId:o.referrerId,day:o.paymentDay,quantity:o.quantity,products:Object.keys(collectionSeedNames).filter(k=>o.products.includes(k)),...(o.lampVersion?{lampVersion:o.lampVersion}:{}),current:key===goodsKey(c)});
 }return options;
}
export function selectedCollectionSeed(state,draft){
 if(draft?.model!=='own'||!draft.sourceId)return null;
 return collectionSeedChoices(state).find(o=>o.referrerId===draft.sourceId&&!o.current)||null;
}
const seedNames=s=>s.products.map(id=>id==='mira'&&s.lampVersion==='developed'?'三档调光台灯':collectionSeedNames[id]).join('、');
function seedOptionsView(state,draft){
 const c=state.collection,rows=collectionSeedChoices(state),selected=selectedCollectionSeed(state,draft),plan=selected||c,alternate=rows.filter(r=>!r.current),current=rows.find(r=>r.current);
 const has=k=>plan.products.includes(k),uses=[...(has('mira')&&has('samir')&&plan.products.length===2?['阅读饮水']:[]),...(has('mira')&&has('ines')?['阅读陈列']:[]),...(has('samir')&&has('ines')?['待客陈列','迎宾茶台']:[]),...(has('mira')&&has('samir')?['客房床头']:[])];
 return `<fieldset class="collection-styles" aria-label="自有系列的实物来源"><legend>用哪套实物做样？</legend>${alternate.length?`<button data-collection-source="" aria-pressed="${!selected}">${state.accountHistory?.length?'沿用门店已收货的组合':(current?collectionContacts[current.referrerId]+' 引荐':'沿用桌上组合')} · ${seedNames(c)}</button>${alternate.map(o=>`<button data-collection-source="${o.referrerId}" aria-pressed="${o===selected||o.referrerId===selected?.referrerId}">${collectionContacts[o.referrerId]} 引荐 · ${seedNames(o)}<small>第 ${o.day} 天结清 · ${o.quantity} 套</small></button>`).join('')}`:`<p>${seedNames(c)}</p>`}<p class="brief" aria-live="polite">这次出样：${seedNames(plan)}。${uses.length?'这套实物适合以后尝试'+uses.join('、')+'；仍要另找相应买方谈，不是已经接到订单。':''}</p></fieldset>`;
}
export function collectionView(state,draft,{board=''}={}){
 const c=state.collection;
 if(c.status==='draft'){
  const q=collectionQuote(state,'private'),own=draft.model==='own',valid=own?state.cash>=2490:q.valid;
  return `<button class="back-clients" data-action="BACK_FROM_COLLECTION">← 先不决定</button><h3>这次，是谁的系列？</h3><p class="brief">Northline 愿意出资做贴牌。你也可以自己出样，把包装留给自己的工作室。</p><div class="quotes"><button class="quote ${own?'':'chosen'}" data-collection-model="private" aria-pressed="${!own}"><strong>客户出资 · 做 Northline 的系列</strong><span>已有 ${q.sets} 套订单 · 预计赚到 ${money(q.netProfit)}<br>买方标准色 · 这套专用包装不转售其他客户</span></button><button class="quote ${own?'chosen':''}" data-collection-model="own" aria-pressed="${own}"><strong>自己出样 · 留下自己的系列</strong><span>先付 ${money(2490)} · 外观自己选<br>同一设计可分别向两位买手提案</span></button></div>${own?seedOptionsView(state,draft):''}<fieldset class="collection-styles"><legend>样品上的包装</legend>${Object.entries(COLLECTION_STYLES).map(([id,name])=>`<button data-collection-style="${id}" aria-pressed="${draft.style===id}" ${!own&&id==='botanical'?'disabled':''}>${name}${!own&&id==='botanical'?' · 贴牌标准不采用':''}</button>`).join('')}</fieldset><p class="brief">${own?'出样含设计、打样与三天工作室支出。尚未接订单。确认后这套设计归工作室，可再向买手提案。':'包装署名 Northline，客户承担开发费用。确认后这套包装归买方，旧产品和旧客户不受限制。'}</p>${!own?`<p class="brief">这单货款 ${money(q.revenue)} · 预计赚到 ${money(q.netProfit)}<br>客户先付定金 ${money(q.deposit)} · 现在要付 ${money(q.cost)}<br>${state.cash+q.deposit-q.cost<0?`还差 ${money(q.cost-q.deposit-state.cash)}`:`签完还剩 ${money(state.cash+q.deposit-q.cost)}`}</p><details><summary>结算详情</summary><p>尾款 ${money(q.balanceDue)} · 回款前需留 ${money(q.operatingCost)} 日常开销</p></details>`:`<p class="brief">${state.cash<2490?`出样还差 ${money(2490-state.cash)}`:`出样后现金 ${money(state.cash-2490)}`}</p>`}<button class="primary" data-action="SIGN_COLLECTION" ${valid?'':'disabled'}>${own?'做出工作室自己的样品':'确认贴牌样品与订单'} →</button>`;
 }
 if(c.status==='production'){const q=c.active;return `<h3>${q.buyer} 已确认这套设计</h3><p class="brief">${COLLECTION_STYLES[q.style||c.style]} · 每款 ${q.sets} 件<br>定金 ${money(q.deposit)} 已收到，第 ${q.paymentDay} 天收齐尾款 ${money(q.balanceDue)}。</p><button class="primary" data-action="FULFIL_COLLECTION">跟进这套系列的交付 →</button>`;}
 const orders=(c.orders||[]).filter(o=>o.status==='paid'),adoptions=(state.caseGrowthHistory||[]).filter(o=>o.status==='paid'&&o.designVersion==='original'&&o.agreement==='portfolio'&&o.purpose==='studio-series'),available=collectionPitchOffers(c);
 const stores=c.model==='own'?paidSeriesStoreOrders(state).filter(a=>!a.seriesSource.versionId):[];
 const sum=rows=>rows.reduce((n,o)=>n+o.netProfit,0),storeCount=stores.reduce((n,a)=>n+a.stores,0);
 const restock=atelierRestockProfit(state),netReturn=sum(orders)+sum(adoptions)+sum(stores)+restock-c.sampleCost;
 const returnDetails=c.model==='own'&&(state.accountHistory?.length||restock)?`<details><summary>这次出样怎样回本</summary><p>买手系列订单净赚 ${money(sum(orders))}${restock?`<br>Atelier 原版补货净赚 ${money(restock)}（未重收授权费）`:''}${adoptions.length?`<br>概念店采用原稿净赚 ${money(sum(adoptions))}`:''}<br>沿用本系列的门店供货：${stores.length} 笔，${storeCount} 家店，净赚 ${money(sum(stores))}<br>减去这次出样 ${money(c.sampleCost)}。通用组合、独立新版本和另谈的用途专案不算在这里。</p></details>`:'';
 return `<h3>${c.model==='own'?(c.exclusiveBuyer?(c.exclusiveBuyer==='atelier'?'Atelier':'Northline')+' 独家系列已交付':'工作室的系列，留下来了'):'Northline 的专用系列已交付'}</h3>${c.seedCase?`<p class="brief">出样依据：${collectionContacts[c.seedCase.referrerId]} 引荐、第 ${c.seedCase.paymentDay} 天已结清的 ${seedNames(c)} 组合。</p>`:''}${board||`<p class="brief">${c.model==='own'?(c.exclusiveBuyer?'这份原系列已约定独家，其他通用产品仍可自由经营。':'同一份自己的设计，可以继续带给不同买手。'):'这套专用包装只交给 Northline；以前的通用产品仍可以照常经营。'}</p>${orders.map(o=>`<div class="collection-receipt"><strong>${o.buyer}</strong><span>${o.sets} 套 · 已收齐 · 净赚 ${money(o.netProfit)}${o.scope==='buyer-sleeve'?' · 仅纸套专供，原稿保留':o.scope==='whole-exclusive'?' · 原系列独家':o.negotiated?' · 非独家':''}</span></div>`).join('')}${c.model==='own'&&available.length?`<div class="quotes">${available.map(id=>{const q=collectionQuote(state,'own',id);return `<button data-collection-buyer="${id}"><strong>${q.buyer}</strong><span>${orders.some(o=>o.buyerId===id)?'商议下一批的合作范围':'看看买方采用设计的条件'}</span></button>`;}).join('')}</div>`:''}`}${c.model==='own'?`<p class="brief">出样已投入 ${money(c.sampleCost)}；${netReturn<0?`还差 ${money(-netReturn)} 回本`:netReturn===0?'出样已回本':`扣除出样后，已赚到 ${money(netReturn)}`}。${new Set(orders.map(o=>o.buyerId)).size===2?'两位买手都已采用这份设计。':''}</p>${returnDetails}`:''}<button class="primary" data-action="CLOSE_COLLECTION">回到工作室 →</button>`;
}
