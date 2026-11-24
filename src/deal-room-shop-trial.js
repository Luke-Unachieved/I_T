import {netProfitAmount} from './deal-room-net-profit.js';
import {specialtyMilestoneView} from './deal-room-specialty-calendar.js';
/** One explicit, fixed-outcome purchase/display agreement. No random sales,
 * retroactive price change, new inventory or automatic background clock. */
export const SHOP_TRIAL_ACTIONS=Object.freeze({OPEN_SHOP_TRIAL:['type'],CLOSE_SHOP_TRIAL:['type'],SIGN_SHOP_TRIAL:['type','terms'],SETTLE_SHOP_TRIAL:['type']});
export function canonicalShopTrialAction(a){const keys=a&&SHOP_TRIAL_ACTIONS[a.type];if(!keys||Object.keys(a).length!==keys.length||keys.some(k=>!Object.hasOwn(a,k))||a.type==='SIGN_SHOP_TRIAL'&&!['regular','shelf'].includes(a.terms))return null;return Object.fromEntries(keys.map(k=>[k,a[k]]));}
export function shopTrialAvailable(s){const p=s.stockProcurement;return p?.status==='paid'&&p.specification==='developed-studio'&&p.packaging==='generic'&&p.unitCost===45&&Number.isSafeInteger(p.remaining)&&p.remaining>=12;}
export function previewShopTrial(s,terms='regular'){
 const p=s.shopTrial,b=s.stockProcurement;if(s.phase!=='shop-trial'||p?.status!=='draft'||!shopTrialAvailable(s)||!['regular','shelf'].includes(terms))return {valid:false,reason:'先留出12盏已付货款的通用调光灯。'};
 const sold=terms==='regular'?8:12,returned=12-sold,unitPrice=terms==='regular'?75:60,revenue=sold*unitPrice,operatingCost=120,soldCost=sold*45,remainingAfter=b.remaining-sold;
 return {valid:s.cash>=operatingCost&&s.history.length<=4091,reason:s.cash<operatingCost?'还需留出这4天的工作室开支 ¥120。':s.history.length>4091?'本份经营记录已满，先保留进度。':'',terms,sent:12,sold,returned,unitPrice,revenue,operatingCost,soldCost,netProfit:revenue-soldCost-operatingCost,cashChange:revenue-operatingCost,cashAfterSigning:s.cash,cashAfterPayment:s.cash+revenue-operatingCost,settlementDay:s.day+4,remainingAfter,shortForForty:Math.max(0,40-remainingAfter)};
}
export function applyShopTrialAction(s,a,{calendar=false}={}){
 if(!canonicalShopTrialAction(a))return s;
 if(a.type==='OPEN_SHOP_TRIAL'&&['review','complete'].includes(s.phase)&&(!s.shopTrial?shopTrialAvailable(s):true)){const n=structuredClone(s);n.shopTrial??={status:'draft'};n.phase='shop-trial';return n;}
 if(s.phase!=='shop-trial'||!s.shopTrial)return s;
 if(a.type==='CLOSE_SHOP_TRIAL'&&s.shopTrial.status!=='display'){const n=structuredClone(s);if(n.shopTrial.status==='draft')delete n.shopTrial;n.phase='review';return n;}
 if(a.type==='SIGN_SHOP_TRIAL'){const q=previewShopTrial(s,a.terms);if(!q.valid)return s;const n=structuredClone(s);n.stockProcurement.remaining-=12;n.stockProcurement.inventoryCost=n.stockProcurement.remaining*45;n.shopTrial={...q,status:'display',signedDay:s.day,outside:12};n.feedback={kind:'shop-trial-signed',message:'12盏灯已送到小店，按约定陈列4天后收款、收回留样。'};return n;}
 if(a.type==='SETTLE_SHOP_TRIAL'&&s.shopTrial.status==='display'){if(calendar&&s.day!==s.shopTrial.settlementDay)return s;const n=structuredClone(s),p=n.shopTrial;if(!calendar)n.day=p.settlementDay;n.cash+=calendar?p.revenue:p.cashChange;n.stockProcurement.remaining+=p.returned;n.stockProcurement.inventoryCost=n.stockProcurement.remaining*45;p.status='paid';p.outside=0;n.feedback={kind:'shop-trial-paid',message:`小店已付 ¥${p.revenue}，${p.returned?`${p.returned}盏陈列灯完好退回。`:'12盏全部留下。'}`};return n;}
 return s;
}
export function shopTrialAccounting(s){const p=s.shopTrial;return {realizedProfit:p?.status==='paid'?p.netProfit:0,cashChange:p?.status==='paid'?p.cashChange:0,outsideInventoryCost:p?.status==='display'?540:0};}
const money=n=>'¥'+n.toLocaleString('zh-CN');
export function shopTrialInvite(s){if(!s.shopTrial&&!shopTrialAvailable(s))return '';return `<section class="stock-invite"><small>库存试卖</small><h3>街角灯具店试卖</h3><p>${s.shopTrial?.status==='paid'?'这次小店合作已经结清，可以回看货款和库存。':'送12盏去店里摆4天。按原价买8盏，或按优惠价买下12盏。'}</p><button data-action="OPEN_SHOP_TRIAL">${s.shopTrial?.status==='paid'?'看看这次小店合作':'比较两种试卖条件'} →</button></section>`;}
export function shopTrialView(s,terms='regular'){
 const p=s.shopTrial;if(!p)return '';const q=previewShopTrial(s,terms),draft=p.status==='draft';
 if(!draft)return `<h3>${p.status==='display'?'12盏正在小店陈列':'小店这单已结清'}</h3><p>${p.terms==='regular'?'原价确认购买8盏，另外4盏只陈列、到期退回。':'整架优惠确认购买12盏，没有退回。'}</p><div class="stock-facts"><article><small>约定货款</small><strong>${money(p.revenue)}</strong></article><article><small>${p.status==='display'?'预计净利':'本单净利'}</small><strong>${netProfitAmount(p.netProfit)}</strong></article><article><small>${p.status==='display'?'店内陈列货值':'仓库现有货值'}</small><strong>${money(p.status==='display'?540:s.stockProcurement.inventoryCost)}</strong></article></div><p>${p.status==='display'?`仓库还有${s.stockProcurement.remaining}盏；小店的12盏不能再配给另一单。第${p.settlementDay}天收款，同时付这4天日费¥120。`:`本次现金增加${money(p.cashChange)}；退回${p.returned}盏，仓库现有${s.stockProcurement.remaining}盏。`}</p>${p.status==='display'?specialtyMilestoneView(s):'<button class="primary" data-action="CLOSE_SHOP_TRIAL">回工作室 →</button>'}`;
 return `<button data-action="CLOSE_SHOP_TRIAL">← 先保留库存</button><h3>陈列4天，小店留下多少？</h3><blockquote>“原价每盏 ¥75，我要8盏，另外4盏摆满四天还你。每盏 ¥60 的话，12盏我全要。”</blockquote><div class="stock-options">${[['regular','原价购8盏，退回4盏'],['shelf','优惠购12盏，全部留下']].map(([id,label])=>`<button data-shop-terms="${id}" aria-pressed="${terms===id}">${label}</button>`).join('')}</div><div class="stock-facts"><article><small>4天后现金到账</small><strong>${money(q.revenue)}</strong><span>另付日费¥120</span></article><article><small>预计净利</small><strong>${netProfitAmount(q.netProfit)}</strong><span>已扣售出商品的成本${money(q.soldCost)}</span></article><article><small>结清后手头现金</small><strong>${money(q.cashAfterPayment)}</strong></article></div><p>现在不再付制作款，手头仍是${money(s.cash)}。12盏送去陈列后暂不用于其他订单。</p><p>结束后仓库留${q.remainingAfter}盏；下一份40套调光组合${q.shortForForty?`还要新做${q.shortForForty}盏灯`:'可以全部用现货配齐'}，其他商品和包装仍按实际方案制作。</p>${q.valid?'':`<p role="status">${q.reason}</p>`}<button class="primary" data-action="SIGN_SHOP_TRIAL" ${q.valid?'':'disabled'}>确认试卖，送12盏去陈列 →</button>`;
}
// The shop's real twelve-lamp lot, not a random sales simulation. Reopening a
// receipt draws its final positions. Only the action that just happened may move them.
export function shopShelfScene(s,terms='regular',moment=''){
 const p=s.shopTrial;if(!p||!['draft','display','paid'].includes(p.status))return '';
 const draft=p.status==='draft',paid=p.status==='paid',q=draft?previewShopTrial(s,terms):p;
 if(!Number.isSafeInteger(q.sold)||q.sold+q.returned!==12)return '';
 const title=draft?'橱窗排样':paid?'试卖结束':'陈列中的货架',kind=q.returned?'split':'whole';
 const shift=paid&&moment==='settle'?'settle':p.status==='display'&&moment==='send'?'send':'still';
 const caption=draft?`拟送展 12 盏 · 留店 ${q.sold} 盏${q.returned?'，另 4 盏到期退回':''}`:paid?`店里留下 ${q.sold} 盏 · ${q.returned?'4 盏已退回工作室':'没有退货'}`:`12 盏全部在店 · ${q.returned?'其中 4 盏约定到期退回':'约定整架留下'}，尚未结算`;
 const lamps=Array.from({length:12},(_,i)=>{
  const sx=35+(i%6)*37,sy=i<6?83:139,returnable=i>=q.sold,boxed=paid&&returnable;
  const x=boxed?270+((i-8)%2)*32:sx,y=boxed?98+Math.floor((i-8)/2)*35:sy;
  return `<g transform="translate(${x} ${y})" data-lamp-place="${boxed?'box':'shelf'}"><g class="shop-real-lamp ${returnable?'trial-only':'store-keep'}" style="--sx:${sx-x}px;--sy:${sy-y}px;--stagger:${(i%6)*36}ms"><image href="assets/deal-work-shelf-lamp.webp" x="-14" y="-31" width="28" height="31"/>${returnable?'<text x="8" y="-10" font-size="9" fill="#fff1c5" aria-hidden="true">◇</text>':''}</g></g>`;
 }).join('');
 const toggle=draft?`<button class="shop-shelf-toggle" data-shop-shelf-toggle="${q.returned?'shelf':'regular'}">${q.returned?'让小店留下这 4 盏 · 看整架价':'这 4 盏只陈列 · 看原价'} ↔</button>`:'';
 return `<section class="workspace shop-window" aria-label="街角小店的陈列货架"><figure class="shop-window-card" data-shop-phase="${p.status}" data-shop-split="${kind}" data-shop-motion="${shift}"><div class="shop-window-sign"><span>街角灯具店</span><strong>${title}</strong></div><svg class="shop-shelf-art" aria-hidden="true" focusable="false" viewBox="0 0 340 157"><image href="assets/deal-work-shop-shelf.webp" width="340" height="157"/>${lamps}</svg><figcaption><strong>${caption}</strong>${toggle}</figcaption></figure></section>`;
}
