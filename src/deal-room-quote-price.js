import {netProfitAmount} from './deal-room-net-profit.js';
const MIN=1, MAX=100000;
const money=(n,decimals=0)=>'¥'+n.toLocaleString('zh-CN',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const quoteUnitPriceValid=n=>Number.isSafeInteger(n)&&n>=MIN&&n<=MAX;

// Seller-side cost only. Buyer acceptance and budget are not inputs here.
export function quotePriceGuide({quantity,cost,operatingCost}={},markup=20){
 const total=cost+operatingCost;
 if(!Number.isSafeInteger(quantity)||quantity<1||!Number.isSafeInteger(total)||total<1)return null;
 const average=total/quantity;
 return {average,breakEven:Math.ceil(average),recommended:Math.min(MAX,Math.ceil(total*(100+markup)/(quantity*100))),markup};
}
const supplyIssue=q=>q.quantity<q.minQuantity?'minimum':q.deliveryDay>q.deadlineDay?'deadline':'';
// Estimate from what the seller sees, not from maxUnitPrice, accepted or valid.
// Bound the percentage to avoid a guarantee or false certainty.
export function quoteAcceptanceEstimate(q,guide,price){
 if(!guide||!quoteUnitPriceValid(price)||supplyIssue(q))return null;
 const relative=(price-guide.average)/Math.max(guide.average,6);
 return Math.max(5,Math.min(90,Math.round(82-145*relative)));
}

// The reducer uses the private budget to decide what happens after Send.
// Before that, warnings may only describe visible constraints and arithmetic.
export function quoteDraftWarning(q,cash){
 if(!Number.isSafeInteger(q.quantity))return q.reason||'';
 if(q.quantity<q.minQuantity)return '这家货源至少 '+q.minQuantity+' '+q.unit+'起订，当前只需 '+q.quantity+' '+q.unit+'。';
 if(q.deliveryDay>q.deadlineDay)return '预计第 '+q.deliveryDay+' 天到货，晚于买方第 '+q.deadlineDay+' 天收货期限。';
 if(q.cashRequired>cash)return '周转资金还差 '+money(q.cashRequired-cash)+'，需覆盖采购、运费和回款前日常开支。';
 return '';
}
export function quoteAdviserProjection(q,cash,sent,priceRejected){
 const {maxUnitPrice,...view}=q;
 if(sent)return {...view,...(priceRejected?{reason:'客户没有接受这个价格。可以降低单价，再问一次。'}:{})};
 const reason=quoteDraftWarning(q,cash);
 return {...view,reason,accepted:Number.isSafeInteger(q.quantity)&&!supplyIssue(q),valid:!reason};
}
export const quotePriceRejected=q=>Number.isSafeInteger(q.unitPrice)&&Number.isSafeInteger(q.maxUnitPrice)&&q.unitPrice>q.maxUnitPrice;

export function quotePriceControls({key,unit,price,guide,q,sent=false,canSend=true}){
 const id=key+'-unit-price',hasPrice=quoteUnitPriceValid(price);
 const display=hasPrice?money(price):'—';
 const forecast=sent?null:quoteAcceptanceEstimate(q,guide,price);
 const result=forecast===null?'—':'约 '+forecast+'%';
 const sign=step=>step<0?'减':'加';
 const stepButton=(step,symbol)=>'<button type="button" class="quote-price-step" data-quote-price-step="'+step+'" aria-label="'+sign(step)+' 1 元" aria-describedby="'+id+'" aria-disabled="'+(!hasPrice||!quoteUnitPriceValid(price+step))+'">'+symbol+'</button>';
 return '<div class="quote-price-editor" data-quote-price-editor="'+key+'" role="group" aria-labelledby="'+id+'-label">'+
  '<div class="quote-price-title"><strong id="'+id+'-label">报价单价</strong><small role="status">'+(sent?'已发送':'未发送')+'</small></div>'+
  '<div class="quote-price-adjust">'+stepButton(-1,'−')+
  '<output id="'+id+'" class="quote-price-output" tabindex="-1" aria-live="polite">'+display+'<small> / '+esc(unit)+'</small></output>'+stepButton(1,'+')+'</div>'+
  (sent?'':(guide?'<dl class="quote-price-hint"><div><dt>建议单价</dt><dd>'+money(guide.recommended)+'</dd></div><div><dt>保本价</dt><dd>'+money(guide.breakEven)+'</dd></div></dl>':'<p class="quote-price-basis">当前货源暂不能估算成本。</p>')+
   '<dl class="quote-price-metrics" aria-label="报价预估">'+
   '<div><dt>'+(q.netProfit<0?'预计亏损':'预计净利')+'</dt><dd>'+netProfitAmount(q.netProfit)+'</dd></div>'+
   '<div><dt>预计同意率</dt><dd data-quote-acceptance'+(forecast===null?' aria-label="暂不估计"':'')+'>'+result+'</dd></div></dl>')+
  '</div><button class="primary quote-price-send ws-control ws-control--main" type="submit"'+(hasPrice&&canSend?'':' disabled')+ '><span class="quote-price-send-label">发送报价</span></button>';
}

// The surrounding app redraws the screen; restore the same control without
// jumping to the reply or requesting the on-screen keyboard. At either price
// bound aria-disabled leaves the focused step usable for keyboard navigation.
export function bindQuotePriceSteps(root,{key,read,change,rerender}){
 const group='[data-quote-price-editor="'+key+'"]';
 root.querySelectorAll(group+' [data-quote-price-step]').forEach(button=>button.addEventListener('click',()=>{
  const step=Number(button.dataset.quotePriceStep),price=read();
  if((step!==1&&step!==-1)||!quoteUnitPriceValid(price)||!quoteUnitPriceValid(price+step))return;
  change(price+step);
  rerender();
  root.querySelector(group+' [data-quote-price-step="'+step+'"]')?.focus?.({preventScroll:true});
 }));
}
