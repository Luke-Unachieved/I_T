import {revisionArt} from './deal-room-revision-view.js';
import {sampleSvg} from './deal-room-samples.js';
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
/** Alternative bases are existing Northline approvals, not upgrades to old stores. */
export function accountExpansionBases(state){
 const old=state.accountHistory?.[0],a=state.account;
 if(state.phase!=='account'||!a?.expansion||a.status!=='draft'||!canExpandAccount(state)||old.status!=='paid')return [];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const previous={buyer:old.buyer,referrerId:old.referrerId,referrerName:old.referrerName,products:[...old.products],unitPrice:old.unitPrice,unitCost:old.unitCost,...(old.seriesSource?{seriesSource:clone(old.seriesSource)}:{}),...(old.lampVersion?{lampVersion:old.lampVersion}:{})};
 const key=b=>JSON.stringify({products:[...b.products].sort(),lampVersion:b.lampVersion||'standard',unitPrice:b.unitPrice,unitCost:b.unitCost,seriesSource:b.seriesSource||null});
 const options=[{basisId:'previous',label:'沿用首批实际版本',basis:previous}];
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
function accountSpecBoard(a,title){
 const revision=a.seriesSource?.style==='tidal-grid';
 const packageArt=revision?revisionArt(true,a.products).replace(/<button[\s\S]*?<\/button>/,'').replace(/<small>[\s\S]*?<\/small>/,'').replaceAll('tidal-waves',`tidal-waves-${title[0]}`).replace(/(id="|url\(#)(revision-[^")]+)/g,`$1account-${title[0]}-$2`):'';
 const label=a.seriesSource?.label||'首批选品组合';
 return `<section class="account-spec"><h4>${title}</h4><div class="account-spec-package" data-style="${a.seriesSource?.style||'plain'}">${packageArt||`<div class="account-spec-samples">${a.products.map(id=>`<div>${sampleSvg(id==='mira'?'lamp':id==='samir'?'cup':'linen')}<span>${id==='mira'&&a.lampVersion==='developed'?'已验调光台灯':accountProductNames[id]}</span></div>`).join('')}</div>`}</div><strong>${label}</strong><small>${a.seriesSource?.signature||'常规选品'}${a.seriesSource?.style==='tidal-grid'?' · 波线分格内托':a.seriesSource?.style==='botanical'?' · 枝叶纹样':a.seriesSource?.style==='cream'?' · 米杏纸套':a.seriesSource?.style==='charcoal'?' · 炭黑礼盒':''}</small></section>`;
}
export function accountHandover(state,a){
 const old=state.accountHistory?.[0];if(!a.expansion||!old)return '';
 return `<div class="account-handover">${accountSpecBoard(old,'1—3 店 · 已交付，不改动')}${accountSpecBoard(a,a.status==='draft'?'4—6 店 · 这次待签':a.status==='paid'?'4—6 店 · 已按新合同交付':'4—6 店 · 按本次合同制作')}</div>`;
}

export function accountView(state,selected){
 const a=state.account,q=previewAccount(state,a.expansion?'remaining':selected);

 if(a.status==='paid')return `${accountHandover(state,a)}<div class="receipt"><small>${a.seriesSource?'已确认的系列，进入连锁门店':'从买手店案例，做到连锁采购'}</small><strong>+ ${cash(a.netProfit)}</strong><span>${a.expansion?'另外 3 家店，累计 6 家':a.stores+' 家店'} · 每种 ${a.sets} 件 · 货款已收齐</span></div>${accountReceipt(a)}<button class="primary" data-action="CLOSE_ACCOUNT">回到工作室 →</button>`;
 if(a.status==='fulfilling')return `${accountHandover(state,a)}${accountSeriesReceipt(a)}<h3>${a.stores} 家门店，按这份合同开工</h3><div class="offer"><div><small>定金已到账</small><strong>${cash(a.deposit)}</strong></div><div><small>待收尾款</small><strong>${cash(a.balanceDue)}</strong></div></div><p class="brief">每种 ${a.sets} 件 · 第 ${a.deliveryDay} 天交付 · 第 ${a.paymentDay} 天收齐。报价与采购价已锁定。</p><button class="primary" data-action="${a.expansion?'FULFIL_ACCOUNT_EXPANSION':'FULFIL_ACCOUNT'}">跟进门店交付 →</button>`;
 if(a.expansion){
 const choices=accountExpansionBases(state);
 return `<button class="back-clients" data-action="BACK_FROM_ACCOUNT">← 先经营已铺的三家店</button><h3>由你确认余下三家店的产品线</h3><p class="brief">为新增的三家店选择产品组合：沿用首批，或选择这位买手已采用的其他款式。</p>${accountHandover(state,a)}${choices.length>1?`<div class="account-basis-options" role="group" aria-label="余下三店实际采用版本">${choices.map(c=>`<button data-account-expansion-basis="${c.basisId}" aria-pressed="${c.selected}">${c.label}</button>`).join('')}</div>`:'<p class="brief">这次继续使用首批门店的产品组合。</p>'}<div class="offer"><div><small>这单货款</small><strong>${cash(q.revenue)}</strong></div><div><small>新增 3 店预计赚到</small><strong>${cash(q.netProfit)}</strong></div><div><small>现在要付</small><strong>${cash(q.cost)}</strong></div><div><small>客户先付定金</small><strong>${cash(q.deposit)}</strong></div><div><small>${q.cashAfterSigning<0?'采购款还差':'签完还剩'}</small><strong>${cash(Math.abs(q.cashAfterSigning))}</strong></div></div><details><summary>付款明细</summary><p>尾款 ${cash(q.balanceDue)}<br>回款前需留 ${cash(q.operatingCost)} 日常开销。</p></details><p class="opportunity">为新增 3 家店供货，每种 300 件。第 ${q.deliveryDay} 天交付；第 ${q.paymentDay} 天收齐。本单不含原 3 家店换货。</p>${q.valid?'':`<p class="counter">${Number.isFinite(q.requiredCash)&&state.cash<q.requiredCash?`加上 ${cash(q.operatingCost)} 日常开销，需再备 ${cash(q.requiredCash-state.cash)}。`:q.reason}</p>`}<button class="primary" data-action="SIGN_ACCOUNT_EXPANSION" ${q.valid?'':'disabled'}>按这份实物方案签新三店 →</button>`;
 }

 const feasible=!a.expansion&&!q.valid?['pilot'].filter(id=>id!==selected&&previewAccount(state,id).valid):[];
 const cashAdvice=q.valid?'':`加上 ${cash(q.operatingCost)} 日常开销，需再备 ${cash(q.requiredCash-state.cash)}。`+(feasible.length?`当前可行：${feasible.map(id=>id==='pilot'?'先铺三店':'用折扣换五成定金').join('，或')}。`:'可先不签，保留资金安排其他业务。');
 return `${accountSeriesReceipt(a)}<button class="back-clients" data-action="BACK_FROM_ACCOUNT">← 暂不接这份采购</button><h3>订单更大，先把付款谈妥</h3><p class="brief">先为三家店供货。交付后，再决定是否接下另外三家。</p><div class="quotes" role="group" aria-label="连锁采购付款方案">${(selected==='rollout'||selected==='funded'?['pilot',selected]:['pilot']).map(id=>{const p=previewAccount(state,id);return `<button class="quote ${selected===id?'chosen':''}" data-account-option="${id}" aria-pressed="${selected===id}"><strong>${p.title}</strong><span>每种 ${p.sets} 件 · ${p.days} 天收齐 · 预计净赚 ${cash(p.netProfit)}</span></button>`;}).join('')}</div><div class="offer"><div><small>这单货款</small><strong>${cash(q.revenue)}</strong></div><div><small>现在要付</small><strong>${cash(q.cost)}</strong></div><div><small>客户先付定金</small><strong>${cash(q.deposit)}</strong></div><div><small>${q.cashAfterSigning<0?'采购款还差':'签完还剩'}</small><strong>${cash(Math.abs(q.cashAfterSigning))}</strong></div></div><p class="${q.valid?'brief':'counter'}" role="status">${q.valid?(q.discount?`整单少收 ${cash(a.unitPrice*q.sets-q.revenue)}，换客户先付五成。少垫 ${cash(previewAccount(state,'rollout').requiredCash-q.requiredCash)}，现在就能开工。`:q.stores===3?'先为三家店供货，再决定是否接下另外三家。':'保留原报价，但必须自己垫足生产和回款前支出。'):cashAdvice}</p><details><summary>工厂与付款明细</summary><p>尾款 ${cash(q.balanceDue)}<br>每套批发 ${cash(a.unitPrice)}，采购 ${cash(a.unitCost)}。回款前需留 ${cash(q.operatingCost)} 日常开销。</p></details><button class="primary" data-action="SIGN_ACCOUNT" ${q.valid?'':'disabled'}>按这份条件签约 →</button>`;
}
