import { BUYER_CREDITS, BUYER_TYPES, PRODUCTS, PRODUCT_BY_ID, RIVAL_COMPANIES, TUTORIAL_BUYERS } from '../data/core.js';
import { random } from './rng.js';

const numberBetween = (state, low, high) => low + Math.floor(random(state) * (high - low + 1));
const sample = (state, options) => options[numberBetween(state, 0, options.length - 1)];
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const sourceLabels = { stock: '现货仓', factory: '工厂排产', inventory: '用现有库存' };
const domestic = { id: 'domestic', currency: 'CNY', fx: 1, shippingWeeks: 0, tariffRate: 0 };
const activeOrder = item => !['paid', 'settled', 'cancelled', 'bad-debt', 'badDebt'].includes(item.status);

function competitorBids(state, targetPrice, count) {
  const tracked = state.rivals?.filter(rival => rival.active !== false && !['failed', 'closed', 'acquired'].includes(rival.status));
  const options = [...(tracked?.length ? tracked : RIVAL_COMPANIES)];
  const rivals = [];
  while (options.length && rivals.length < count) {
    const [rival] = options.splice(numberBetween(state, 0, options.length - 1), 1);
    const aggressive = ['激进', 'aggressive'].includes(rival.style);
    const ratio = aggressive ? numberBetween(state, 86, 95) : numberBetween(state, 91, 101);
    rivals.push({ id: rival.id, name: rival.name, style: aggressive ? '激进' : '稳健', price: Math.max(1, Math.ceil(targetPrice * ratio / 100)) });
  }
  return rivals;
}

function makeInquiry(state, index, product, buyer, terms, market = domestic) {
  const targetPrice = Math.max(1, Math.round(terms.targetPrice / market.fx));
  return {
    id: `w${state.week}-${index + 1}`,
    week: state.week,
    productId: product.id,
    productName: product.name,
    category: product.category,
    unit: product.unit,
    asset: product.asset,
    quantity: terms.quantity,
    targetPrice,
    buyer,
    terms: terms.weeks,
    depositRate: terms.depositRate,
    dueWeek: state.week + terms.deadline,
    expiresWeek: state.week + terms.validity - 1,
    minRep: terms.minRep,
    cert: terms.cert ?? null,
    rivals: competitorBids(state, targetPrice, terms.competitors),
    market: market.id,
    currency: market.currency,
    fx: market.fx,
    extraShippingWeeks: market.shippingWeeks,
    tariffRate: market.tariffRate,
    tutorial: terms.tutorial ?? false,
  };
}

function tutorialInquiry(state, tutorial) {
  const { id, name, type, credit, portrait, comic, line, productId, quantity, targetPrice, depositRate, terms, deadline } = tutorial;
  return makeInquiry(state, 0, PRODUCT_BY_ID[productId], { id, name, type, credit, portrait, comic, line }, {
    quantity, targetPrice, depositRate, weeks: terms, deadline, validity: 2, minRep: 0, competitors: 2, tutorial: true,
  });
}

function regularInquiry(state, index) {
  const product = sample(state, PRODUCTS);
  const type = sample(state, BUYER_TYPES);
  const buyerIndex = numberBetween(state, 0, type.names.length - 1);
  const credit = type.grades[buyerIndex % type.grades.length];
  const buyer = { id: `domestic-${type.id}-${buyerIndex}`, name: type.names[buyerIndex], type: type.label, credit, line: type.line };
  const deadline = numberBetween(state, 2, 10);
  const batch = numberBetween(state, type.lots[0], type.lots[1]);
  const { stock, factory } = product.sources;
  const factorySuitable = deadline >= Math.max(2, Math.ceil(factory.days / 7) + 1) + 1;
  const options = factorySuitable && batch >= 2 ? factory : stock;
  const quantity = options === factory ? factory.minQuantity * Math.ceil(batch / 2) : stock.minQuantity * batch;
  const unitFreight = (options.freightBase + Math.ceil(quantity / options.packSize) * options.freightPerBox) / quantity;
  const targetPrice = Math.ceil((options.unitCost + unitFreight) * numberBetween(state, 125, 160) / 100);
  const gradeIndex = BUYER_CREDITS.indexOf(credit);
  const longest = Math.min(type.termLimit, [12, 10, 8, 6, 4, 3][gradeIndex]);
  const minRep = batch >= 6 ? 65 : batch >= 4 ? 55 : 0;
  return makeInquiry(state, index, product, buyer, {
    quantity, targetPrice, minRep, deadline,
    weeks: numberBetween(state, 0, longest),
    depositRate: sample(state, credit === 'B' ? [15, 20, 30] : [0, 10, 15, 20, 30]),
    validity: numberBetween(state, 1, 2),
    competitors: numberBetween(state, 1, 6),
  });
}

// A week's arrivals are appended by settlement, which independently removes expired inquiries.
export function generateInquiries(state) {
  const count = numberBetween(state, 4, 6);
  const featured = TUTORIAL_BUYERS[state.week - 1];
  const arrivals = featured ? [tutorialInquiry(state, featured)] : [];
  while (arrivals.length < count) arrivals.push(regularInquiry(state, arrivals.length));
  return arrivals;
}

function inventoryCost(state, productId, quantity) {
  let remaining = quantity;
  let cost = 0;
  for (const item of state.inventory ?? []) {
    if (item.productId !== productId || !Number.isSafeInteger(item.quantity) || item.quantity < 1) continue;
    const used = Math.min(remaining, item.quantity);
    const unitCost = item.unitCost ?? (Number.isSafeInteger(item.cost) ? Math.ceil(item.cost / item.quantity) : 0);
    cost += unitCost * used;
    remaining -= used;
    if (!remaining) return cost;
  }
  return null;
}

function staffChoice(state, staffId) {
  if (!staffId) return null;
  const staff = state.staff?.find(person => person.id === staffId);
  if (!staff) return { error: '找不到这位负责人。' };
  const commitments = (state.bids ?? []).filter(item => item.staffId === staffId).length +
    (state.orders ?? []).filter(item => item.staffId === staffId && activeOrder(item)).length;
  if (commitments >= 3) return { error: '这个负责人已经跟进 3 笔报价或订单。' };
  return staff;
}

function winProbability(state, inquiry, unitPrice, extraTerms, staff, financing) {
  const competitorFloor = Math.min(inquiry.targetPrice, ...(inquiry.rivals ?? []).map(rival => rival.price));
  if (unitPrice > inquiry.targetPrice) return { probability: 0, competitorFloor };
  if (unitPrice < competitorFloor) return { probability: 1, competitorFloor };
  const distance = Math.max(1, inquiry.targetPrice - competitorFloor);
  const priceEdge = clamp((inquiry.targetPrice - unitPrice) / distance, 0, 1);
  const relationships = state.relationships?.[inquiry.buyer.id];
  const priorSales = relationships?.deliveries ?? 0;
  const mightSell = 0.16 + 0.69 * priceEdge ** 1.35 + (state.company.rep - 60) * 0.003 +
    extraTerms * 0.025 + Math.min(5, priorSales) * 0.02 + (staff?.role === 'sales' ? (staff.ability ?? 0) * 0.012 : 0) -
    (financing === 'letter-of-credit' ? 0.06 : 0) - (state.energy < 35 ? 0.055 : 0);
  return { probability: clamp(mightSell, 0.03, 0.98), competitorFloor };
}

// Quote previews never advance the RNG or reserve anything. Settlement price-locks the proposal
// at bid submission, while the weekly reducer is responsible for charging and moving stock.
export function quote(state, inquiry, options = {}) {
  if (!inquiry) return { error: '这条询盘已不存在。' };
  const { source = 'stock', ratio = 95, extraTerms = 0, staffId = null, financing = 'standard' } = options;
  if (!Object.hasOwn(sourceLabels, source) || !Number.isInteger(ratio) || ratio < 80 || ratio > 105 ||
      !Number.isInteger(extraTerms) || extraTerms < 0 || extraTerms > 4) return { error: '请选择有效货源、报价和账期。' };
  if (inquiry.expiresWeek < state.week) return { error: '询盘已过了报价期限。' };
  if (inquiry.minRep > state.company.rep) return { error: `这笔询盘需要信誉 ${inquiry.minRep}。` };
  if (inquiry.cert && !state.company.certs.includes(inquiry.cert)) return { error: '公司还没有这笔询盘所需的认证。' };
  if (!['standard', 'letter-of-credit', 'insured'].includes(financing) || (financing !== 'standard' && inquiry.market === domestic.id)) {
    return { error: '这笔询盘不能使用所选贸易融资。' };
  }
  const staff = staffChoice(state, staffId);
  if (staff?.error) return staff;
  const product = Object.hasOwn(PRODUCT_BY_ID, inquiry.productId) && PRODUCT_BY_ID[inquiry.productId];
  const quantity = inquiry.quantity;
  if (!product || !Number.isSafeInteger(quantity) || quantity < 1) return { error: '询盘中的商品或数量无效。' };
  const supplier = product.sources[source === 'inventory' ? 'stock' : source];
  if (source !== 'inventory' && quantity < supplier.minQuantity) {
    return { error: `${supplier.name}需要至少 ${supplier.minQuantity} ${product.unit}，本单只有 ${quantity} ${product.unit}。` };
  }
  const productionWeeks = source === 'factory' ? Math.max(2, Math.ceil(supplier.days / 7) + 1) : source === 'stock' ? Math.max(1, Math.ceil(supplier.days / 7)) : 0;
  const shippingWeeks = 1 + (inquiry.extraShippingWeeks ?? 0);
  const deliverWeek = state.week + productionWeeks + shippingWeeks;
  if (deliverWeek > inquiry.dueWeek) return { error: `最早第 ${deliverWeek} 周交货，赶不上第 ${inquiry.dueWeek} 周的交期。` };
  const fx = inquiry.fx ?? 1;
  const currency = inquiry.currency ?? 'CNY';
  const unitPrice = Math.max(1, Math.round(inquiry.targetPrice * ratio / 100));
  const foreignTotal = unitPrice * quantity;
  const total = Math.round(foreignTotal * fx);
  const materialIndex = source === 'factory' ? (state.macro?.materials ?? 100) : 100;
  const cost = source === 'inventory' ? inventoryCost(state, product.id, quantity) : Math.round(quantity * supplier.unitCost * materialIndex / 100);
  if (cost === null) return { error: '库存不足以交齐这笔订单。' };
  const baseFreight = supplier.freightBase + Math.ceil(quantity / supplier.packSize) * supplier.freightPerBox;
  const overseasFactor = inquiry.market === domestic.id ? 1 : (state.macro?.freight ?? 100) / 100 * (1 + (inquiry.extraShippingWeeks ?? 0) / 2);
  const shipping = Math.round(baseFreight * overseasFactor + cost * (inquiry.tariffRate ?? 0));
  const prepayment = source === 'inventory' ? 0 : source === 'factory' ? Math.round(cost * 0.3) : cost;
  const deposit = Math.round(total * inquiry.depositRate / 100);
  const terms = inquiry.terms + extraTerms;
  const expectedPayWeek = deliverWeek + terms;
  const profit = total - cost - shipping;
  if (![total, cost, shipping, prepayment, deposit, terms, expectedPayWeek].every(Number.isSafeInteger)) {
    return { error: '这笔询盘的金额或账期超出了可核算范围。' };
  }
  const acceptance = winProbability(state, inquiry, unitPrice, extraTerms, staff, financing);
  return {
    inquiryId: inquiry.id, productId: product.id, buyer: inquiry.buyer, market: inquiry.market,
    source, sourceLabel: source === 'inventory' ? sourceLabels.inventory : supplier.name, ratio, extraTerms, staffId, financing,
    quantity, unitPrice, total, foreignTotal, cost, shipping, prepayment, deposit, profit, productionWeeks, shippingWeeks,
    upfront: Math.max(0, prepayment - deposit), workingCapital: Math.max(0, cost + shipping - deposit), margin: profit / total,
    quotedWeek: state.week, dueWeek: inquiry.dueWeek, deliverWeek, expectedPayWeek, terms, currency, fx,
    ...acceptance,
  };
}

export function resolveBid(state, inquiry, details) {
  const rival = [...inquiry.rivals].sort((a, b) => a.price - b.price)[0];
  if (details.probability >= 1 || (details.probability > 0 && random(state) < details.probability)) {
    return { won: true, winner: state.company.name, price: details.unitPrice };
  }
  if (!rival || rival.price > inquiry.targetPrice) return { won: false, winner: '本轮未采购', price: 0 };
  return { won: false, winner: rival.name, price: rival.price };
}
