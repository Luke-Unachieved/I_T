import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {neighborhoodRequest} from './deal-room-neighborhood.js';

// Dialogue is text, including the quantity and day quoted from a receipt.
export function neighborhoodContact(line) {
  const text=String(line).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  return `<div class="neighborhood-contact"><img src="assets/deal-buyer-lin-yan.webp" width="72" height="72" alt="林妍的肖像"><div><strong>林妍</strong><small>四邻百货联采 · 门店采购</small><p>${text}</p></div></div>`;
}

export function neighborhoodInvite(state, receipts) {
  const request = neighborhoodRequest(receipts);
  if (!request) {
    if (!state.neighborhoodRegistered) return '';
    return `<section class="market-repeat"><h3>采购台收件箱 · 四邻百货</h3>${neighborhoodContact('二十四家店的货款都结清了。三次联采的明细，你可以在成交记录里核对。')}</section>`;
  }
  if (!state.neighborhoodRegistered) {
    return `<section class="market-repeat"><h3>采购台收件箱 · 联采登记</h3>${neighborhoodContact('你好，我负责四邻百货的门店采购。我们在找能按店配货的供货方。方便留份合作登记吗？')}<button data-market-action="REGISTER_NEIGHBORHOOD">登记四邻百货联采</button></section>`;
  }
  const {stores, offers} = request;
  const letter = stores === 12 ? '先从十二家店做起。工具柜每店要三十六套棘轮套筒，我把装盒要求写在清单里了。' :
    stores === 18 ? '上次十二家店都收到了。这次十八家店一起补货，你从这份清单里挑一款来报。' :
    '十八家店的账已经结清。下一期有二十四家店参加，仍旧每家配同样的数量。';
  return `<section class="market-repeat"><h3>采购台收件箱 · 林妍的来信</h3>${neighborhoodContact(letter)}<div>${MARKET_PRODUCTS.filter(p => offers[p.id]).map(p => `<button data-neighborhood-product="${p.id}"><span><strong>${p.name}</strong><small>${stores} 家店 · 每店 ${offers[p.id].perStore} ${p.unit} · 共 ${offers[p.id].quantity} ${p.unit}</small>核对清单并报价 →</span></button>`).join('')}</div></section>`;
}

export function neighborhoodQuote(stores, offer, unit) {
  return neighborhoodContact(`这单有 ${stores} 家店，每家 ${offer.perStore} ${unit}，合计 ${offer.quantity} ${unit}。签约付五成，验收后五天付余款。给我一个每${unit}的报价吧。`);
}
