import {equipmentComicView} from './deal-room-equipment-comics.js';
import {equipmentRoutePair} from './deal-room-equipment-view.js';
import {legacyEquipmentOffers,previewLegacyEquipment,legacyEquipmentNextAction} from './deal-room-equipment-legacy.js';
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>Number.isSafeInteger(x)?'¥'+x.toLocaleString('zh-CN'):'—';
const fact=(k,v)=>'<div><dt>'+e(k)+'</dt><dd>'+e(v)+'</dd></div>';
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
  request:'「先到的那几台给门诊，另外的还在等机房开门。装箱单上麻烦把序列号分开写。」',
  shipped:'几张装箱单摊在桌上。助理把序列号抄到同一页，交接时不用在三份文件里来回找。',
  accepted:'「最后一台也扫到序列号了。这批设备一张验收单，我今天一起送财务。」',
  paid:'买家发来一张新的值班表。最早那台已经排到周末，其余的也各有了去处。'
 },
 'filling-line':{
  request:'「试机用我们自己带的瓶子。空转听不出问题，我想看看真装起来会不会卡。」',
  shipped:'木箱封好前，工厂把试机用的空瓶放在随箱袋里。收货人一开箱就能找到。',
  accepted:'「第一排有一只瓶子歪了。重新对了导轨，第二排全过，验收单已经签好。」',
  paid:'买方发来第一批成品的照片。照片边上还放着试机那只空瓶，贴纸都没有撕。'
 }
});
const storyLine=t=>t?'<p class="market-note ws-equipment-story">'+e(t)+'</p>':'';
const tradeHint=(id,t)=>['liang','fang','tao','xu'].includes(id)&&t?'<aside class="ws-trade-hint" aria-label="助理建议"><strong>助理建议</strong><p>'+e(t)+'</p></aside>':'';
function activeLegacy(s,ui){
 const a=s.market?.active, status=s.market?.status;
 if(a?.kind!=='legacy-equipment-v1'||!Object.hasOwn(statusName,status))return '';
 const story=equipmentStory[a.legacyProjectId],move=legacyEquipmentNextAction(s),rebook=legacyEquipmentNextAction(s,'rebook'),labels={
  'legacy-preparing':'到出运日 · 支付工厂尾款和运费',
  'legacy-transit':'到验收日 · 交接并收验收款',
  'legacy-receivable':'到付款日 · 收齐尾款'
 };
 if(status==='legacy-transit'&&a.transfer&&!a.rebooked){
  const earlyDay=a.deliveryDay-a.daysSaved,earlyPay=a.paymentDay-a.daysSaved,difference=a.rebookFee-a.daysSaved*30;
  return '<section class="market-active eq-order" aria-label="设备合同履行"><small>设备在途 · '+e(a.buyer)+'</small><h3>'+e(a.productName)+' · '+a.physicalQuantity+e(a.physicalUnit)+'</h3><dl class="market-facts">'+fact('已到账',money(a.received))+fact('还没收到',money(a.balanceDue))+'</dl><section class="eq-decision"><h3>船期变了，怎么安排？</h3><p>换船通知：晚 '+a.slipDays+' 天。验收前共付 '+money(a.acceptanceFee+a.stationFee)+'（含场站费 '+money(a.stationFee)+'），验收后收 '+money(a.progressDue)+'。</p><p>改订早 '+a.daysSaved+' 天回款。算上省下的日常开支，总成本'+(difference===0?'不变':(difference>0?'多':'少')+money(Math.abs(difference)))+'。</p>'+
   equipmentRoutePair({title:'照现在的船期等',fee:0,day:a.deliveryDay,pay:a.paymentDay,button:'按现在船期验收',enabled:move,action:'data-legacy-next'},{title:'改订更早的班次',fee:a.rebookFee,day:earlyDay,pay:earlyPay,button:'确认改订',enabled:rebook,action:'data-legacy-rebook'})+'</section>'+
   tradeHint(ui.adviserId,rebook?'场站费两边都得付。换的是早几天拿到货和尾款，不是把那笔费用免了。':'手上的钱得先够验收。既然改订后周转不开，别把这一笔也搭进去。')+'<details><summary>设备订单</summary><p>'+e(a.productName)+' · '+a.physicalQuantity+e(a.physicalUnit)+' · '+e(a.buyer)+'</p>'+picture(a.legacyProjectId)+'<p>'+e(a.inspection)+'</p></details></section>';
 }
 const route=a.shipping==='shared'?'拼载海运':'直运海舱',preparing=status==='legacy-preparing',transit=status==='legacy-transit',settled=status==='paid';
 const moment=settled?story?.paid:transit?(a.rebooked?'船代把新提单发了过来，旧班次被划掉了。这回别按旧日期通知买方。':story?.shipped):preparing?'工厂收到了首款。助理先把出运要付的钱单独记下来，没算在可挪用的余额里。':(a.transfer&&!a.rebooked?'「晚到那几天，我们把人手挪去做别的了。现在货验完了，我把回执补发给你。」':a.rebooked?'「提前到了，预留的卸货时间用上了。我把验收单发你，财务按新日期排尾款。」':story?.accepted);
 const figure=a.legacyProjectId==='filling-line'&&transit?'<img class="pv-art" alt="" src="assets/deal-original-filling-line-crated.webp">':picture(a.legacyProjectId);
 const next=preparing?'第 '+a.shipDay+' 天付工厂余款、运费与这段日费，共 '+money(a.shipmentDue)+'。此时不收买方验收款。':transit?'第 '+a.deliveryDay+' 天验收。先付 '+money(a.acceptanceFee+(a.transfer?a.stationFee:0)+(a.deliveryDay-s.day)*30)+' 交付支出和日费，验收再收 '+money(a.progressDue)+'。':settled?'合同款已收齐。':'第 '+a.paymentDay+' 天收尾款 '+money(a.tailDue)+'。';
 return '<section class="market-active ws-equipment-state eq-order" aria-label="设备合同履行"><small>大型设备合同 · '+(preparing?'已订货':statusName[status])+'</small><h3>'+e(a.productName)+' · '+a.physicalQuantity+e(a.physicalUnit)+'</h3><p>'+e(a.buyer)+' · '+route+' · 第 '+s.day+' 天</p><dl class="market-facts">'+fact('主账可用现金',money(s.cash))+fact('已收买方款',money(a.received))+fact('已付各项支出',money(a.spent))+fact('尚未收到',money(a.balanceDue))+'</dl><p role="status">'+e(next)+'</p>'+storyLine(moment)+equipmentComicView(a,status)+(preparing&&!move?tradeHint(ui.adviserId,'买方的下一笔钱要等验收才到，先把出运这笔凑齐。'):'')+
 (settled?'<button type="button" class="primary" data-market-action="CLOSE_MARKET">回工作室</button>':move?'<button type="button" class="primary" data-legacy-next>'+e(labels[status])+'</button>':'<p>这一步还不能走。请核对日期和手头现金。</p>')+
 '<details><summary>设备订单</summary><figure>'+figure+'<figcaption>'+e(a.productName)+' · '+(preparing?'工厂备货':transit?'装箱出运':settled?'已结清':'已验收')+'</figcaption></figure><p>'+e(a.inspection)+'</p><dl class="market-facts">'+fact('合同金额',money(a.revenue))+fact('工厂已付',money(a.supplierPaid))+fact('预计交付','第 '+a.deliveryDay+' 天')+fact('尾款到期','第 '+a.paymentDay+' 天')+(settled?fact('实际净利',money(a.actualProfit)):'')+'</dl></details></section>';

}
export function legacyEquipmentInvite(s){
 const list=legacyEquipmentOffers(s);if(!list.length)return '';
 return '<section class="ws-promo"><h3>设备采购来信</h3><ul>'+list.map(o=>'<li><button type="button" data-legacy-open="'+e(o.projectId)+'" data-legacy-lots="'+o.lots+'">'+e(o.name)+' · '+o.physicalQuantity+e(o.physicalUnit)+'</button> <small>'+e(o.buyer)+(o.proofMissing?' · 还差 '+o.proofMissing+' 笔已结清合同':'')+'</small></li>').join('')+'</ul></section>';
}
function draft(s,ui){
 const row=legacyEquipmentOffers(s).find(x=>same(x,ui.legacyDraft));if(!row)return null;
 const shipping=ui.legacyDraft.shipping==='reserved'?'reserved':'shared';
 return {row,d:{projectId:row.projectId,lots:row.lots,shipping,price:ui.legacyDraft.price??row.priceCap}};
}
export function legacyEquipmentView(s,ui={}){
 const active=activeLegacy(s,ui);if(active)return active;
 const c=draft(s,ui);if(!c)return '';
 const {row,d}=c,q=previewLegacyEquipment(s,d);
 const standard=previewLegacyEquipment(s,{...d,shipping:'shared',price:row.priceCap}),reserved=previewLegacyEquipment(s,{...d,shipping:'reserved',price:row.priceCap});
 const accepted=ui.legacyChecked===JSON.stringify(d);
 return '<section class="market-quote" aria-label="设备合同报价"><button type="button" data-legacy-back>← 回客户来信</button><h3>'+e(row.name)+' · '+row.physicalQuantity+e(row.physicalUnit)+'</h3><p>'+e(row.buyer)+' · 第 '+row.replyBy+' 天前回复</p>'+picture(row.projectId)+storyLine(equipmentStory[row.projectId]?.request)+
 '<fieldset><legend>选船期</legend><button type="button" data-legacy-route="shared" aria-pressed="'+(d.shipping==='shared')+'">拼载海运<small>省锁舱费；换船可能晚 '+standard.slipDays+' 天，另付 '+money(standard.stationFee)+' 场站费。</small></button><button type="button" data-legacy-route="reserved" aria-pressed="'+(d.shipping==='reserved')+'">直运海舱<small>多付 '+money(reserved.freight-standard.freight)+'，正常船期快 '+(standard.transitDays-reserved.transitDays)+' 天。</small></button></fieldset><form data-legacy-form><label for="legacy-price">整单报价</label> <input id="legacy-price" name="price" type="number" min="1" step="1" value="'+e(d.price)+'" inputmode="numeric"><button>核对报价</button></form>'+
 '<dl class="market-facts">'+fact('签约收买方定金',money(q.deposit))+fact('签约付工厂首款',money(q.supplierDown))+fact('验收收款',money(q.progressDue))+fact('到期收尾款',money(q.tailDue))+fact('设备货款',money(q.goodsCost))+fact('运输费用',money(q.freight))+fact('验收费用',money(q.acceptanceFee))+fact('最低周转金',money(q.cashRequired))+fact('顺利时净利',money(q.projectedNet))+fact('晚船风险下净利',money(q.worstNet))+'</dl>'+
 (q.reason?'<p role="status">'+e(q.reason)+'</p>':'')+(Number.isSafeInteger(q.cashRequired)&&q.cashRequired>s.cash?tradeHint(ui.adviserId,'别只看签约收到的定金。出运和验收都要先垫钱，先把差额留出来。'):'')+'<button type="button" class="primary" data-legacy-sign '+(q.valid&&accepted?'':'disabled')+'>确认条款，签约</button></section>';
}
export function bindLegacyEquipment(root,s,ui,rerender,dispatch){
 const q=x=>root.querySelector(x),on=(x,f)=>q(x)?.addEventListener('click',f);
 root.querySelectorAll('[data-legacy-open]').forEach(b=>b.addEventListener('click',()=>{ui.legacyDraft={projectId:b.dataset.legacyOpen,lots:Number(b.dataset.legacyLots),shipping:'shared'};ui.legacyChecked=null;rerender();}));
 on('[data-legacy-back]',()=>{delete ui.legacyDraft;rerender();});
 root.querySelectorAll('[data-legacy-route]').forEach(b=>b.addEventListener('click',()=>{ui.legacyDraft.shipping=b.dataset.legacyRoute;ui.legacyChecked=null;rerender();}));
 const price=q('#legacy-price');
 price?.addEventListener('input',()=>{ui.legacyChecked=null;const button=q('[data-legacy-sign]');if(button)button.disabled=true;});
 q('[data-legacy-form]')?.addEventListener('submit',ev=>{ev.preventDefault();if(!price||!ui.legacyDraft)return;ui.legacyDraft.price=Number(price.value);const c=draft(s,ui);ui.legacyChecked=c?JSON.stringify(c.d):null;rerender();});
 on('[data-legacy-sign]',()=>{const c=draft(s,ui);if(c&&ui.legacyChecked===JSON.stringify(c.d)){const a=previewLegacyEquipment(s,c.d).action;if(a)dispatch(a);}});
 on('[data-legacy-next]',()=>{const a=legacyEquipmentNextAction(s);if(a)dispatch(a);});
 on('[data-legacy-rebook]',()=>{const a=legacyEquipmentNextAction(s,'rebook');if(a)dispatch(a);});
}
