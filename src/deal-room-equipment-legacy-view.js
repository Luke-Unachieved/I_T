import {netProfitAmount} from './deal-room-net-profit.js';
import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {tradeAdviserHint} from './deal-room-market-adviser-hint.js';
import {equipmentComicView} from './deal-room-equipment-comics.js';
import {equipmentRoutePair,equipmentQuoteMilestones,equipmentQuoteDelay} from './deal-room-equipment-view.js?v=36';
import {legacyEquipmentOffers,previewLegacyEquipment,legacyEquipmentCalendarAction} from './deal-room-equipment-legacy.js?v=36';
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>Number.isSafeInteger(x)?'¥'+x.toLocaleString('zh-CN'):'—';
const fact=(k,v,net=false)=>'<div><dt>'+e(k)+'</dt><dd>'+(net?netProfitAmount(v):e(v))+'</dd></div>';
const same=(o,d)=>o.projectId===d?.projectId&&o.lots===d?.lots;
const legacyArt=Object.freeze({excavator:'assets/deal-legacy-equipment-excavator.webp',ultrasound:'assets/deal-legacy-equipment-ultrasound.webp','filling-line':'assets/deal-project-filling-line.webp'});
const picture=id=>Object.hasOwn(legacyArt,id)?'<img class="pv-art" alt="" loading="lazy" src="'+legacyArt[id]+'">':'';
const statusName={ 'legacy-preparing':'等出运','legacy-transit':'运输中','legacy-receivable':'待收尾款','paid':'已结清' };
const equipmentStory=Object.freeze({
 excavator:{
  request:'「车到了先别卸。工地老门只有一条车道，司机得等外面的吊车挪开。」',
  shipped:'司机发来一张照片。每台挖机的钥匙都单独扎在提货单上，免得卸车时拿混。',
  accepted:'「门口那辆吊车比说好的早挪了十分钟，就这十分钟，省了我们一轮倒车。」',
  paid:'工地传回第一铲土的视频。拍的人没说话，只在消息末尾回了个「开工」。'
 },
 ultrasound:{
  request:'「门诊那几台先留出来。剩下的等机房开门再搬。装箱单上，麻烦把每台的序列号都写明白。」',
  shipped:'几张装箱单摊在桌上。助理把序列号抄到同一页，交接时不用在三份文件里来回找。',
  accepted:'「最后一台的序列号也对上了。验收单就开一张，我今天送财务。」',
  paid:'买家发来一张新的值班表。最早那台已经排到周末，其余的也各有了去处。'
 },
 'filling-line':{
  request:'「试机用我们自己带的瓶子。空转听不出问题，我想看看真装起来会不会卡。」',
  shipped:'木箱封好前，工厂把导轨调整说明放进随箱袋。等货到厂，买方会拿自己的瓶子试机。',
  accepted:'「第一排有一只瓶子歪了。重新对了导轨，第二排全过，验收单已经签好。」',
  paid:'买方发来第一批成品的照片。照片边上还放着试机那只空瓶，贴纸都没有撕。'
 }
});
const storyLine=t=>t?'<p class="market-note ws-equipment-story">'+e(t)+'</p>':'';
const buyerSpeech=(text,name)=>text?'<figure class="market-note ws-equipment-story ws-equipment-buyer-speech"><figcaption>'+e(name)+'</figcaption><blockquote>'+e(openingDialogueQuote(text))+'</blockquote></figure>':'';
function legacyOrderDetails(a,figure,settled=false){
 return '<details class="market-trade-detail ws-equipment-order-facts"><summary>合同与验收明细</summary>'+
  (figure?'<figure>'+figure+'</figure>':'')+'<p>'+e(a.inspection)+'</p><dl class="market-facts">'+
  fact('合同金额',money(a.revenue))+fact('工厂已付',money(a.supplierPaid))+fact('预计交付','第 '+a.deliveryDay+' 天')+fact('尾款到期','第 '+a.paymentDay+' 天')+
  (settled?fact('实际净利',a.actualProfit,true):'')+'</dl></details>';
}
function activeLegacy(s,ui){
 const a=s.market?.active, status=s.market?.status;
 if(a?.kind!=='legacy-equipment-v1'||!Object.hasOwn(statusName,status))return '';
 const story=equipmentStory[a.legacyProjectId],move=legacyEquipmentCalendarAction(s),rebook=legacyEquipmentCalendarAction(s,'rebook'),labels={
  'legacy-preparing':'安排装船',
  'legacy-transit':'验收并收验收款',
  'legacy-receivable':'收尾款'
 };
 if(status==='legacy-transit'&&a.transfer&&!a.rebooked&&s.day===a.shipDay){
  const earlyDay=a.deliveryDay-a.daysSaved,earlyPay=a.paymentDay-a.daysSaved,difference=a.rebookFee-a.daysSaved*30;
  return '<section class="market-active eq-order" aria-label="设备合同履行"><small>设备在途，'+e(a.buyer)+'</small><h3>'+e(a.productName)+'，'+a.physicalQuantity+e(a.physicalUnit)+'</h3><dl class="market-facts">'+fact('已到账',money(a.received))+fact('还没收到',money(a.balanceDue))+'</dl>'+legacyOrderDetails(a,picture(a.legacyProjectId))+'<section class="eq-decision"><h3>船期变了，怎么安排？</h3><p>换船通知：晚 '+a.slipDays+' 天。验收前共付 '+money(a.acceptanceFee+a.stationFee)+'（含场站费 '+money(a.stationFee)+'），验收后收 '+money(a.progressDue)+'。</p><p>改订早 '+a.daysSaved+' 天回款。算上省下的日常开支，总成本'+(difference===0?'不变':(difference>0?'多':'少')+money(Math.abs(difference)))+'。不改订的话，仍按原到港日验收。</p>'+
   tradeAdviserHint(ui.adviserId,rebook?'不管换不换船，场站费都得付。多花的这笔钱，买的是早几天到货、早几天收尾款。':'验收得先付费，客户那笔钱要验完才到。现在改订会让手头的钱不够，还是按原安排等吧。')+
   equipmentRoutePair({title:'照现在的船期等',fee:0,day:a.deliveryDay,pay:a.paymentDay,button:'',enabled:false,action:''},{title:'改订更早的班次',fee:a.rebookFee,day:earlyDay,pay:earlyPay,button:'确认改订',enabled:rebook,action:'data-legacy-rebook'})+'</section></section>';
 }
 const route=a.shipping==='shared'?'拼载海运':'直运海舱',preparing=status==='legacy-preparing',transit=status==='legacy-transit',settled=status==='paid';
 const moment=settled?story?.paid:transit?(a.rebooked?'船代把新提单发了过来，旧班次被划掉了。这回别按旧日期通知买方。':story?.shipped):preparing?'工厂收到了首款。助理先把出运要付的钱单独记下来，没算在可挪用的余额里。':(a.transfer&&!a.rebooked?'「晚到那几天，我们把人手挪去做别的了。现在货验完了，我把回执补发给你。」':a.rebooked?'「比换船通知上的日子早到了。我把验收单发你，尾款按新日期付。」':story?.accepted);
 const figure=a.legacyProjectId==='filling-line'&&transit?'<img class="pv-art" alt="" src="assets/deal-original-filling-line-crated.webp">':picture(a.legacyProjectId);
 const next=preparing?'第 '+a.shipDay+' 天装船。届时付工厂余款和运费，共 '+money(a.supplierBalance+a.freight)+'。此时不收买方验收款。':transit?'第 '+a.deliveryDay+' 天验收。先付 '+money(a.acceptanceFee+(a.transfer?a.stationFee:0))+' 交付费用，验收再收 '+money(a.progressDue)+'。':settled?'合同款已收齐。':'第 '+a.paymentDay+' 天收尾款 '+money(a.tailDue)+'。';
 return '<section class="market-active ws-equipment-state eq-order" aria-label="设备合同履行"><small>大型设备合同，'+(preparing?'已订货':statusName[status])+'</small><h3>'+e(a.productName)+'，'+a.physicalQuantity+e(a.physicalUnit)+'</h3><p>'+e(a.buyer)+'，'+route+'，第 '+s.day+' 天</p><dl class="market-facts">'+fact('主账可用现金',money(s.cash))+fact('已收买方款',money(a.received))+fact('已付各项支出',money(a.spent+(settled?0:(s.day-(preparing?a.signedDay:transit?a.shipDay:a.deliveryDay))*30)))+fact('尚未收到',money(a.balanceDue))+'</dl><p role="status">'+e(next)+'</p>'+legacyOrderDetails(a,figure,settled)+(status==='legacy-receivable'?buyerSpeech(moment,'买方验收留言'):storyLine(moment))+equipmentComicView(a,status)+(preparing&&s.day>=a.shipDay&&!move?tradeAdviserHint(ui.adviserId,'工厂尾款和运费得先付。客户那笔验收款还不能算进手头的钱。'):'')+
 (settled?'<button type="button" class="primary" data-market-action="CLOSE_MARKET">回工作室</button>':move?'<button type="button" class="primary" data-legacy-next>'+e(labels[status])+'</button>':s.day>=(preparing?a.shipDay:transit?a.deliveryDay:a.paymentDay)?'<p>手头现金不足，无法继续这一步。</p>':'')+
 '</section>';

}
export function legacyEquipmentInvite(s){
 const list=legacyEquipmentOffers(s);if(!list.length)return '';
 return '<section class="ws-promo"><h3>设备采购来信</h3><ul>'+list.map(o=>'<li><button type="button" data-legacy-open="'+e(o.projectId)+'" data-legacy-lots="'+o.lots+'">'+e(o.name)+'，'+o.physicalQuantity+e(o.physicalUnit)+'</button> <small>'+e(o.buyer)+(o.proofMissing?'，还差 '+o.proofMissing+' 笔已结清合同':'')+'</small></li>').join('')+'</ul></section>';
}
function draft(s,ui){
 const row=legacyEquipmentOffers(s).find(x=>same(x,ui.legacyDraft));if(!row)return null;
 const shipping=ui.legacyDraft.shipping==='reserved'?'reserved':'shared';
 return {row,d:{projectId:row.projectId,lots:row.lots,shipping,price:ui.legacyDraft.price??row.priceCap}};
}
export function legacyEquipmentView(s,ui={}){
 const active=activeLegacy(s,ui);if(active)return active;
 const c=draft(s,ui);if(!c)return '';
 const {row,d}=c,q=previewLegacyEquipment(s,d,2);
 const standard=previewLegacyEquipment(s,{...d,shipping:'shared',price:row.priceCap},2),reserved=previewLegacyEquipment(s,{...d,shipping:'reserved',price:row.priceCap},2);
 const accepted=ui.legacyChecked===JSON.stringify(d),shared=d.shipping==='shared';
 const dates=shared?standard:reserved;
 const shipOptions=[['shared','拼载海运',standard,'中途可能换船'],
 ['reserved','直运海舱',reserved,'多付 '+money(reserved.freight-standard.freight)+'，快 '+(standard.transitDays-reserved.transitDays)+' 天']].map(([id,name,r,note])=>
 `<div class="market-choice"><button type="button" data-legacy-route="${id}" aria-pressed="${d.shipping===id}" aria-describedby="legacy-${id}-facts">${name}</button>
 <div id="legacy-${id}-facts" class="market-choice-facts"><p>运费 <strong>${money(r.freight)}</strong></p><small>${note}</small></div></div>`).join('');
 return `<section class="market-quote market-trade-sheet" aria-label="设备合同报价"><button type="button" data-legacy-back>‹ 返回商品与项目</button>
 <div class="market-trade-hero market-sheet">${picture(row.projectId)}<div><small>${e(row.buyer)}</small><h2 tabindex="-1" data-legacy-heading>${e(row.name)}（${row.physicalQuantity} ${e(row.physicalUnit)}）</h2><p>第 ${row.replyBy} 天前回复</p></div></div>
 <section class="market-buyer-brief" aria-label="客户留言">${buyerSpeech(equipmentStory[row.projectId]?.request,'客户留言')}</section>
 <div class="market-trade-columns"><section aria-label="船期与运输费用"><fieldset class="market-compare"><legend>怎么订舱</legend>${shipOptions}</fieldset>
 ${equipmentQuoteMilestones(dates.shipDay,dates.plannedDeliveryDay,dates.plannedPaymentDay,{fixed:!shared})}
 ${shared?equipmentQuoteDelay({slipDays:standard.slipDays,stationFee:standard.stationFee,rebookFee:standard.rebookFee,daysSaved:standard.daysSaved,riskProfit:q.worstNet,paymentDay:standard.plannedPaymentDay}):''}</section>
 <section class="market-trade-price" aria-label="合同货款与周转">
 <form data-legacy-form><label for="legacy-price">整单报价（元）</label><div class="market-price-row"><input id="legacy-price" name="price" type="number" min="1" step="1" value="${e(d.price)}" inputmode="numeric"><button type="submit">核对报价</button></div></form>
 <dl class="market-facts market-trade-totals">${fact('合同货款',money(q.revenue))}${fact('最低周转金',money(q.cashRequired))}${fact('预计净利',q.projectedNet,true)}</dl>
 <h3 class="market-finance-title">签约当天</h3>
 <dl class="market-pay-plan">${fact('收到定金',money(q.deposit))}${fact('签约付工厂首款',money(q.supplierDown))}</dl>
 <details class="market-trade-detail"><summary>费用与回款明细</summary><dl class="market-facts">${fact('验收收款',money(q.progressDue))}${fact('到期收尾款',money(q.tailDue))}${fact('设备货款',money(q.goodsCost))}${fact('运输费用',money(q.freight))}${fact('验收费用',money(q.acceptanceFee))}</dl></details>
 ${q.reason?`<p class="market-warning" role="status">${e(q.reason)}</p>`:''}
 <button type="button" class="primary" data-legacy-sign ${q.valid&&accepted?'':'disabled'}>确认签约</button></section></div></section>`;
}

export function bindLegacyEquipment(root,s,ui,rerender,dispatch){
 const q=x=>root.querySelector(x),on=(x,f)=>q(x)?.addEventListener('click',f);
 root.querySelectorAll('[data-legacy-open]').forEach(b=>b.addEventListener('click',()=>{ui.legacyDraft={projectId:b.dataset.legacyOpen,lots:Number(b.dataset.legacyLots),shipping:'shared'};ui.legacyChecked=null;rerender();q('[data-legacy-heading]')?.focus?.();}));
 on('[data-legacy-back]',()=>{delete ui.legacyDraft;rerender();});
 root.querySelectorAll('[data-legacy-route]').forEach(b=>b.addEventListener('click',()=>{const choice=b.dataset.legacyRoute;ui.legacyDraft.shipping=choice;ui.legacyChecked=null;rerender();q('[data-legacy-route="'+choice+'"]')?.focus?.();}));
 const price=q('#legacy-price');
 price?.addEventListener('input',()=>{ui.legacyChecked=null;const button=q('[data-legacy-sign]');if(button)button.disabled=true;});
 q('[data-legacy-form]')?.addEventListener('submit',ev=>{ev.preventDefault();if(!price||!ui.legacyDraft)return;ui.legacyDraft.price=Number(price.value);const c=draft(s,ui);ui.legacyChecked=c?JSON.stringify(c.d):null;rerender();});
 on('[data-legacy-sign]',()=>{const c=draft(s,ui);if(c&&ui.legacyChecked===JSON.stringify(c.d)){const a=previewLegacyEquipment(s,c.d,2).action;if(a)dispatch(a);}});
 on('[data-legacy-next]',()=>{const a=legacyEquipmentCalendarAction(s);if(a)dispatch(a);});
 on('[data-legacy-rebook]',()=>{const a=legacyEquipmentCalendarAction(s,'rebook');if(a)dispatch(a);});
}
