import {netProfitAmount} from './deal-room-net-profit.js';
/** Existing Northline approval, not a new licence or customer. */
export function accountCollectionBasis(state){
 const c=state.collection;if(!c||!['own','private'].includes(c.model)||!Array.isArray(c.products)||!c.products.length||c.exclusiveBuyer&&c.exclusiveBuyer!=='northline')return null;
 const orderIndex=(c.orders||[]).findLastIndex(o=>o.status==='paid'&&(c.model==='private'?o.buyerId==='northline-private':o.buyerId==='northline'&&(!o.scope||['nonexclusive','whole-exclusive','buyer-sleeve'].includes(o.scope))));
 if(orderIndex<0)return null;
 const o=c.orders[orderIndex],scope=c.model==='private'?'private-label':o.scope||'nonexclusive',style=o.style||c.style;
 if(!['cream','charcoal','botanical'].includes(style))return null;
 // Do not repeat the one-off design/licence fees in a volume reorder.
 const price=(o.revenue-(o.licenceFee||0)-(c.model==='private'?4000:0))/o.sets;
 const cost=(o.cost-(o.sampleCost||0)-(c.model==='private'?2400:0))/o.sets;
 if(!Number.isSafeInteger(price)||!Number.isSafeInteger(cost)||price<=0||cost<0)return null;
 return {products:[...c.products],unitPrice:Math.floor(price*.75),unitCost:cost,...(c.lampVersion?{lampVersion:c.lampVersion}:{}),seriesSource:{orderIndex,buyerId:o.buyerId,scope,style,signature:scope==='nonexclusive'?'工作室署名':'Northline',label:scope==='private-label'?'Northline 贴牌系列':scope==='whole-exclusive'?'Northline 独家系列':scope==='buyer-sleeve'?'Northline 专用纸套':'Northline 选品 · 工作室系列'}};
}
/** Only a paid Northline revision is a procurement basis; artwork selection grants no rights. */
export function accountRevisionBasis(state){
 const r=state.collectionRevision;if(!r)return null;
 const revisionOrderIndex=(r.orders||[]).findLastIndex(o=>o.status==='paid'&&o.buyerId==='northline'&&o.versionId==='revision:tidal-grid'&&['revision-nonexclusive','revision-exclusive'].includes(o.scope));
 if(revisionOrderIndex<0)return null;const o=r.orders[revisionOrderIndex];
 if(o.style!=='tidal-grid'||o.packaging!=='partition-tray'||!Array.isArray(o.products)||!o.products.length||new Set(o.products).size!==o.products.length||o.products.some(id=>!['mira','samir','ines'].includes(id))||!Number.isSafeInteger(o.sets)||o.sets<=0)return null;
 const price=(o.revenue-(o.licenceFee||0))/o.sets,cost=o.cost/o.sets;
 if(!Number.isSafeInteger(price)||!Number.isSafeInteger(cost)||price<=0||cost<0||!['standard','developed'].includes(o.lampVersion))return null;
 return {products:[...o.products],unitPrice:Math.floor(price*.75),unitCost:cost,lampVersion:o.lampVersion,seriesSource:{versionId:o.versionId,revisionOrderIndex,buyerId:'northline',scope:o.scope,style:o.style,packaging:o.packaging,signature:o.scope==='revision-exclusive'?'Northline':'工作室署名',label:'Northline 已采用 · 潮汐分格系列'}};
}
/** Actual settled store contracts with a traceable, matching buyer approval.
 * A case referral or separate packaging version must never stand in for this one. */
export function paidSeriesStoreOrders(state){
 const c=state.collection;if(!c)return [];
 return (state.accountHistory||[]).filter(a=>{
  const src=a.seriesSource;if(a.status!=='paid'||!src||![3,6].includes(a.stores))return false;
  let expected,approval;
  if(src.versionId==='revision:tidal-grid'){
   const r=state.collectionRevision,i=src.revisionOrderIndex;
   if(!r||!Number.isInteger(i)||i<0||i>=r.orders.length)return false;
   approval=r.orders[i];expected=accountRevisionBasis({...state,collectionRevision:{...r,orders:r.orders.slice(0,i+1)}});
  }else{
   const i=src.orderIndex;if(src.versionId||!Number.isInteger(i)||i<0||i>=c.orders.length)return false;
   approval=c.orders[i];expected=accountCollectionBasis({...state,collection:{...c,orders:c.orders.slice(0,i+1)}});
  }
  return expected&&approval.status==='paid'&&approval.paymentDay<=a.signedDay&&JSON.stringify(src)===JSON.stringify(expected.seriesSource)&&JSON.stringify(a.products)===JSON.stringify(expected.products)&&(a.lampVersion||'standard')===(expected.lampVersion||'standard')&&a.unitPrice===expected.unitPrice&&a.unitCost===expected.unitCost;
 });
}
/** Alternative bases are existing Northline approvals, not upgrades to old stores. */
export function accountExpansionBases(state){
 const old=state.accountHistory?.[0],a=state.account;
 if(state.phase!=='account'||!a?.expansion||a.status!=='draft'||!canExpandAccount(state)||old.status!=='paid')return [];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const previous={buyer:old.buyer,referrerId:old.referrerId,referrerName:old.referrerName,products:[...old.products],unitPrice:old.unitPrice,unitCost:old.unitCost,...(old.seriesSource?{seriesSource:clone(old.seriesSource)}:{}),...(old.lampVersion?{lampVersion:old.lampVersion}:{})};
 const key=b=>JSON.stringify({products:[...b.products].sort(),lampVersion:b.lampVersion||'standard',unitPrice:b.unitPrice,unitCost:b.unitCost,seriesSource:b.seriesSource||null});
 const options=[{basisId:'previous',label:'沿用首批供货',basis:previous}];
 for(const [basisId,b,label] of [['original',accountCollectionBasis(state),'Northline 已采用的原系列'],['revision:tidal-grid',accountRevisionBasis(state),'Northline 已采用的潮汐分格版']]){
  if(b&&!options.some(o=>key(o.basis)===key(b)))options.push({basisId,label,basis:{buyer:'Northline · 区域连锁采购',referrerId:'northline',referrerName:label,...clone(b)}});
 }
 return options.map(o=>({...o,selected:key(o.basis)===key(a)}));
}
export function accountSeriesReceipt(a){return a.seriesSource?`<p class="brief">沿用已交付的 ${a.seriesSource.label} · ${a.seriesSource.style==='tidal-grid'?'独立波线图样 · 分格内托':a.seriesSource.style==='cream'?'米杏纸套':a.seriesSource.style==='charcoal'?'炭黑礼盒':'枝叶纹样'} · ${a.seriesSource.signature}。</p>`:'';}
/** Finite chain-account negotiation. Fictional RMB terms, not live market data.
 * Uses a paid, player-authored assortment. No recurring passive income.
 */
export function previewAccount(state,optionId){
 const account=state.account;if(!account||account.status!=='draft')return null;
 const option=account.expansion?(optionId==='remaining'?{sets:300,depositRate:30,discount:0,days:6,delivery:4,stores:3,title:'再铺余下 3 家店 · 30% 定金'}:null):{pilot:{sets:300,depositRate:30,discount:0,days:6,delivery:4,stores:3,title:'先铺 3 家店 · 30% 定金'},rollout:{sets:600,depositRate:30,discount:0,days:15,delivery:9,stores:6,title:'铺满 6 家店 · 30% 定金'},funded:{sets:600,depositRate:50,discount:5,days:15,delivery:9,stores:6,title:'铺满 6 家店 · 定金换折扣'}}[optionId];
 if(!option)return null;
 const revenue=Math.floor(account.unitPrice*option.sets*(100-option.discount)/100),cost=account.unitCost*option.sets,deposit=Math.floor(revenue*option.depositRate/100),operatingCost=option.days*30,requiredCash=cost-deposit+operatingCost;
 return {...option,optionId,products:[...account.products],revenue,cost,deposit,balanceDue:revenue-deposit,operatingCost,requiredCash,netProfit:revenue-cost-operatingCost,deliveryDay:state.day+option.delivery,paymentDay:state.day+option.days,cashAfterSigning:state.cash+deposit-cost,valid:state.cash>=requiredCash,reason:state.cash>=requiredCash?'':`还差 ¥${(requiredCash-state.cash).toLocaleString('zh-CN')} 周转。可提高定金，或先做三店试销。`};
}
const cash=n=>`¥${Number(n).toLocaleString('zh-CN')}`;
export function accountCoverage(state){return (state.accountHistory||[]).reduce((n,a)=>n+a.stores,0);}
export function canExpandAccount(state){return state.accountHistory?.length===1&&state.accountHistory[0].stores===3;}
export function accountReceipt(a){return `${accountSeriesReceipt(a)}<div class="account-stores" role="list" aria-label="已交付的 ${a.stores} 家门店">${Array.from({length:a.stores},(_,i)=>`<div class="account-store" role="listitem" style="--store-order:${i}"><svg viewBox="0 0 72 70" aria-hidden="true"><path d="M10 23h52v40H10z" fill="#eee7d7" stroke="#b8a382"/><path d="M7 23l5-12h48l5 12z" fill="#31544a"/><path d="M7 24h58" stroke="#d2b77f" stroke-width="4"/><rect x="17" y="32" width="22" height="21" rx="2" fill="#e9cc91"/><path d="M27 32v21M17 43h22" stroke="#b8a382"/><path d="M45 32h10v31H45z" fill="#698276"/><path d="M6 64h60" stroke="#31544a" stroke-width="3"/></svg><span>${i+1+(a.expansion?3:0)} 店已上架</span></div>`).join('')}</div><p class="brief">${a.products.length} 款产品，每种 ${a.sets} 件；第 ${a.deliveryDay} 天交付，第 ${a.paymentDay} 天收齐。</p>`;}

const accountProductNames={mira:'便携台灯',samir:'保温杯',ines:'棉麻桌布'};
const accountEscape=x=>String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const accountItems=a=>a.products.map(id=>id==='mira'&&a.lampVersion==='developed'?'三档调光台灯':accountProductNames[id]).join('、');
const accountSection=(title,body)=>'<section class="account-order-section"><h4>'+title+'</h4>'+body+'</section>';
function accountSpec(a,title){
 return `<div class="account-order-spec"><strong>${title}</strong><p>${accountItems(a)}${a.sets?'，各 '+a.sets+' 件':''}</p><small>${a.seriesSource?.label||'常规款'}${a.seriesSource?.signature?'，'+a.seriesSource.signature:''}${a.seriesSource?.style?('，'+({cream:'米杏纸套',charcoal:'炭黑礼盒',botanical:'枝叶纹样','tidal-grid':'潮汐波线和分格内托'}[a.seriesSource.style]||'')):''}</small></div>`;
}
export function accountHandover(state,a){
 const old=state.accountHistory?.[0];if(!a.expansion||!old)return '';
 return `<div class="account-order-specs">${accountSpec(old,'首批 3 家门店已交付')}${accountSpec(a,a.status==='draft'?'新增 3 家门店待签':['receivable','paid'].includes(a.status)?'新增 3 家门店已交付':'新增 3 家门店已签')}</div>`;
}
const amount=(label,value,net=false)=>`<div><dt>${label}</dt><dd>${net?netProfitAmount(value):cash(value)}</dd></div>`;
const accountAmountList=items=>`<dl class="account-signed-amounts">${items.join('')}</dl>`;
const orderCTA=(type,label,enabled=true)=>`<button class="primary" data-action="${type}" ${enabled?'':'disabled'}>${label} →</button>`;
function accountDeliveryScene(day,a){
 if(!['receivable','paid'].includes(a.status)||!Number.isSafeInteger(a.deliveryDay)||day<a.deliveryDay)return '';
 const added=a.expansion===true,src=added?'assets/deal-northline-handover-addition.webp':'assets/deal-northline-handover-first.webp';
 const scope=(added?'新增 ':' ')+a.stores+' 家门店';
 const basis=a.seriesSource?.label?'，'+accountEscape(a.seriesSource.label):'';
 const caption='第 '+a.deliveryDay+' 天，货交到'+scope+'。这批'+accountItems(a)+'各 '+a.sets+' 件'+basis+'。';
 return `<details class="account-delivery-scene"><summary>门店收到货了</summary><figure><img loading="lazy" src="${src}" alt="门店店员开箱验货，核对收货单"><figcaption class="comic-narration">${caption}</figcaption></figure></details>`;
}
export function accountView(state,selected){
 const a=state.account,storeLabel=(a.expansion?'新增 ':'')+a.stores+' 家门店',q=previewAccount(state,a.expansion?'remaining':selected);
 const specs=accountSection('商品',a.expansion?accountHandover(state,{...a,sets:a.sets??q?.sets}):`<p>${accountItems(a)}，各 ${a.sets??q?.sets} 件</p>${accountSeriesReceipt(a)}`);
 const dates=accountSection('交付安排',`<p>第 ${a.deliveryDay??q?.deliveryDay} 天交付，第 ${a.paymentDay??q?.paymentDay} 天收齐。</p>`);

 const details=inner=>`<details class="account-order-details"><summary>订单明细</summary><div class="account-order-grid">${inner}</div></details>`;
 if(a.status==='paid')return `<h3>${storeLabel}采购已结清</h3>${accountAmountList([amount('已收货款',a.revenue),amount('本单净利',a.netProfit,true)])}${details(specs+dates)}<button class="account-return" data-action="CLOSE_ACCOUNT">回办公室</button><button type="button" class="account-return" data-workspace-open="orders" data-workspace-ref="account-payments">查看回款</button>${accountDeliveryScene(state.day,a)}`;
 if(['fulfilling','receivable'].includes(a.status)){
  const shipped=a.status==='receivable',due=shipped?a.paymentDay:a.deliveryDay;
  const next=state.day>=due?orderCTA((shipped?'COLLECT_ACCOUNT_':'DELIVER_ACCOUNT_')+(state.day===due?'V1':'V2'),shipped?'收取尾款':'确认交货'):
   `<p>第 ${due} 天${shipped?'收尾款':'交货'}。</p>`;
  const lead=`<section class="account-order-next" aria-label="下一步">${shipped?`<p>待收尾款 <strong>${cash(a.balanceDue)}</strong></p>`:''}${next}</section>`;
  return `<h3>${storeLabel}采购${shipped?'已交付':'已签'}</h3>${lead}${details(specs+accountSection('款项',accountAmountList([amount('定金已到账',a.deposit),amount('待收尾款',a.balanceDue),amount('合同总额',a.revenue)]))+dates)}${accountDeliveryScene(state.day,a)}`;
 }
 if(a.expansion){
 const choices=accountExpansionBases(state);
 return `<button class="back-clients" data-action="BACK_FROM_ACCOUNT">← 先经营已铺的三家店</button><h3>给另外三家店供什么？</h3><p class="brief">只给新增的三家供货，原三家不换货。可沿用首批，或选客户已采用的其他款式。</p>${specs}${choices.length>1?`<div class="account-basis-options" role="group" aria-label="另外三家店的供货选择">${choices.map(c=>{const offer=previewAccount({...state,account:{...a,...c.basis}},'remaining');return `<button data-account-expansion-basis="${c.basisId}" aria-pressed="${c.selected}"><strong>${c.label}</strong><small>预计赚到 ${netProfitAmount(offer.netProfit)}</small><small>${offer.cashAfterSigning<0?'采购款还差':'签完还剩'} ${cash(Math.abs(offer.cashAfterSigning))}</small></button>`;}).join('')}</div>`:'<p class="brief">这次继续使用首批门店的产品组合。</p>'}<div class="account-order-section"><h4>款项</h4><div class="offer"><div><small>这单货款</small><strong>${cash(q.revenue)}</strong></div><div><small>新增 3 店预计赚到</small><strong>${netProfitAmount(q.netProfit)}</strong></div><div><small>现在要付</small><strong>${cash(q.cost)}</strong></div><div><small>客户先付定金</small><strong>${cash(q.deposit)}</strong></div><div><small>${q.cashAfterSigning<0?'采购款还差':'签完还剩'}</small><strong>${cash(Math.abs(q.cashAfterSigning))}</strong></div></div><details><summary>付款明细</summary><p>尾款 ${cash(q.balanceDue)}<br>回款前需留 ${cash(q.operatingCost)} 日常开销。</p></details></div>${dates}${q.valid?'':`<p class="counter">${Number.isFinite(q.requiredCash)&&state.cash<q.requiredCash?`加上 ${cash(q.operatingCost)} 日常开销，需再备 ${cash(q.requiredCash-state.cash)}。`:q.reason}</p>`}<button class="primary" data-action="SIGN_ACCOUNT_EXPANSION" ${q.valid?'':'disabled'}>签下另外三家店的订单 →</button>`;
 }

 const feasible=!a.expansion&&!q.valid?['pilot'].filter(id=>id!==selected&&previewAccount(state,id).valid):[];
 const cashAdvice=q.valid?'':`加上 ${cash(q.operatingCost)} 日常开销，需再备 ${cash(q.requiredCash-state.cash)}。`+(feasible.length?`当前可行：${feasible.map(id=>id==='pilot'?'先铺三店':'用折扣换五成定金').join('，或')}。`:'可先不签，保留资金安排其他业务。');
 return `<button class="back-clients" data-action="BACK_FROM_ACCOUNT">← 暂不接这份采购</button><h3>确认 ${q.stores} 家门店的采购方案</h3>${specs}<p class="brief">${q.stores===3?'先给三家店供货。等这批交了，再谈余下三家。':'这笔直接给六家店供货，一起交付。'}</p><div class="quotes" role="group" aria-label="连锁采购付款方案">${(selected==='rollout'||selected==='funded'?['pilot',selected]:['pilot']).map(id=>{const p=previewAccount(state,id);return `<button class="quote ${selected===id?'chosen':''}" data-account-option="${id}" aria-pressed="${selected===id}"><strong>${p.title.replace(' · ','，')}</strong><span>每种 ${p.sets} 件，${p.days} 天收齐，预计净赚 ${netProfitAmount(p.netProfit)}</span></button>`;}).join('')}</div><div class="account-order-section"><h4>款项</h4><div class="offer"><div><small>这单货款</small><strong>${cash(q.revenue)}</strong></div><div><small>现在要付</small><strong>${cash(q.cost)}</strong></div><div><small>客户先付定金</small><strong>${cash(q.deposit)}</strong></div><div><small>${q.cashAfterSigning<0?'采购款还差':'签完还剩'}</small><strong>${cash(Math.abs(q.cashAfterSigning))}</strong></div></div><p class="${q.valid?'brief':'counter'}" role="status">${q.valid?(q.discount?`整单少收 ${cash(a.unitPrice*q.sets-q.revenue)}，换客户先付五成。少垫 ${cash(previewAccount(state,'rollout').requiredCash-q.requiredCash)}，现在就能开工。`:q.stores===3?'按原报价供货，签约先收三成定金。':'保留原报价，但必须自己垫足生产和回款前支出。'):cashAdvice}</p><details><summary>工厂与付款明细</summary><p>尾款 ${cash(q.balanceDue)}<br>每套批发 ${cash(a.unitPrice)}，采购 ${cash(a.unitCost)}。回款前需留 ${cash(q.operatingCost)} 日常开销。</p></details></div>${dates}<button class="primary" data-action="SIGN_ACCOUNT" ${q.valid?'':'disabled'}>按这份条件签约 →</button>`;
}
