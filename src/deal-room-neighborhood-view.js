import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {neighborhoodRequest} from './deal-room-neighborhood.js';
import {marketPlate} from './deal-room-market-art.js';

// Dialogue is text, including the quantity and day quoted from a receipt.
export function neighborhoodContact(line) {
  const text=String(line).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
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
  return `<section class="market-buyer-brief" aria-label="林妍的采购要求">
  ${neighborhoodContact('请按每家店的数量配货，报一个单价。')}
  <dl class="market-brief-facts"><div><dt>门店</dt><dd>${stores} 家</dd></div><div><dt>每店</dt><dd>${offer.perStore} ${unit}</dd></div><div><dt>合计</dt><dd>${offer.quantity} ${unit}</dd></div></dl>
  <p class="market-brief-pay"><span>签约付 ${offer.depositPercent}% 定金</span><span>验收后 ${offer.payLag} 天付清</span></p></section>`;
}
