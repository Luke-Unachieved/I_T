import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {neighborhoodRequest} from './deal-room-neighborhood.js';
import {marketPlate} from './deal-room-market-art.js';

// Dialogue is text, including the quantity and day quoted from a receipt.
export function neighborhoodContact(line) {
  const text=openingDialogueQuote(line).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  return `<div class="neighborhood-contact"><img src="assets/deal-buyer-lin-yan.webp" width="72" height="72" alt="林妍的肖像"><div><strong>林妍</strong><small>四邻百货门店采购</small><p>${text}</p></div></div>`;
}

export function neighborhoodInvite(state, receipts) {
  const request = neighborhoodRequest(receipts);
  if (!request) {
    if (!state.neighborhoodRegistered) return '';
    return `<section class="market-repeat"><h3>四邻百货联采已结清</h3>${neighborhoodContact('二十四家店的货款都结清了。三次联采的明细，你可以在成交记录里核对。')}</section>`;
  }
  if (!state.neighborhoodRegistered) {
    return `<section class="market-repeat"><h3>四邻百货联采登记</h3>${neighborhoodContact('你好，我负责四邻百货的门店采购。我们在找能按店配货的供货方。方便留份合作登记吗？')}<button type="button" data-market-action="REGISTER_NEIGHBORHOOD">登记四邻百货联采</button></section>`;
  }
  const {stores, offers} = request;
  const letter = stores === 12 ? '先从十二家店做起。工具柜每店要三十六套棘轮套筒，我把装盒要求写在清单里了。' :
    stores === 18 ? '上次十二家店都收到了。这次十八家店一起补货，你从这份清单里挑一款来报。' :
    '十八家店的账已经结清。下一期有二十四家店参加，仍旧每家配同样的数量。';
  return `<section class="market-repeat"><h3>四邻百货联采清单</h3>${neighborhoodContact(letter)}<div>${MARKET_PRODUCTS.filter(p => offers[p.id]).map(p => `<button type="button" data-neighborhood-product="${p.id}">${marketPlate(p)}<span><strong>${p.name}</strong><small>${stores} 家店，每店 ${offers[p.id].perStore} ${p.unit}</small>核对清单并报价 ›</span></button>`).join('')}</div></section>`;
}

export function neighborhoodQuote(stores, offer, unit) {
  const line=stores===12?'第一批先供这十二家。每家拿一样多，你给我一个单价，我好把清单分给各店。':stores===18?'上一期的箱单还在。十八家店这回各拿一样多，你照本期总数报单价。':stores===24?'这期是 24 家。各店按清单上同一个数配，别按上期总数备货。':'请按每家店的数量配货，报一个单价。';
  return `<section class="market-buyer-brief" aria-label="林妍的采购要求">
  ${neighborhoodContact(line)}
  <dl class="market-brief-facts"><div><dt>门店</dt><dd>${stores} 家</dd></div><div><dt>每店</dt><dd>${offer.perStore} ${unit}</dd></div><div><dt>合计</dt><dd>${offer.quantity} ${unit}</dd></div></dl>
  <p class="market-brief-pay"><span>签约付 ${offer.depositPercent}% 定金</span><span>验收后 ${offer.payLag} 天付清</span></p></section>`;
}

export function neighborhoodOrderLine(order,status){
 const {stores,perStore,unit,paymentDay}=order;
 const stage=['transit','receivable','paid'].indexOf(status);
 const lines={
  12:[`定金付了。先给十二家配齐，每店 ${perStore} ${unit}，收货时照箱单点。`,`十二家都点齐了，签收单我收着。第 ${paymentDay} 天付尾款。`,'这笔付清了。我把第一期的十二张收货记录归在一起。'],
  18:[`定金到了。十八家这批每店 ${perStore} ${unit}，箱单请用这一期的，别拿上回十二家的那份。`,`十八家这一批都签收了。我拿本期的清单对账，第 ${paymentDay} 天付尾款。`,'十八家这单结清了。签收单留在第二期，不跟头一批混在一起。'],
  24:[`定金付好了。这期二十四家参加，按每店 ${perStore} ${unit}分好，不用从上一期里的数补差。`,`二十四家这一批都点过了。尾款第 ${paymentDay} 天付，本期的签收单我一并交财务。`,'二十四家这笔也付清了。三期各用各的清单，这一期的账已经结了。']
 };
 return lines[stores]?.[stage]??[
  `定金付好了。请按每店 ${perStore} ${unit}配齐装箱，门店照清单点数。`,
  `${stores} 家店都点过数了。这批货我签收，余款在第 ${paymentDay} 天付。`,
  `财务已经付清。谢谢你把 ${stores} 家店的货配齐。`
 ][stage]??'';
}
