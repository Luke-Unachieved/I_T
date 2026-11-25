import { BUYER_CREDITS, BUYER_TYPES, PRODUCTS, PRODUCT_BY_ID, RIVAL_COMPANIES, TUTORIAL_BUYERS } from '../data/core.js';
import { clientComic, currencyRate, EXPORT_REBATE_RATE, FINANCING, MARKET_BY_ID, MARKETS, tradePolicy } from '../data/expansion.js';
import { ERAS } from '../data/strategy.js';
import { random } from './rng.js';

const numberBetween = (state, low, high) => low + Math.floor(random(state) * (high - low + 1));
const sample = (state, options) => options[numberBetween(state, 0, options.length - 1)];
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const sourceLabels = { stock: '现货仓', factory: '工厂排产', inventory: '用现有库存' };
const domestic = MARKET_BY_ID.domestic;
const activeOrder = item => !['paid', 'settled', 'cancelled', 'bad-debt', 'badDebt'].includes(item.status);
const ventureLevel = value => Number.isInteger(value) ? clamp(value, 0, 3) : 0;

function tradeIndustry(state, category, marketId) {
  return {
    warehouseLevel: ventureLevel(state.ventures?.warehouse),
    factoryLevel: ventureLevel(state.ventures?.factory?.[category]),
    overseasLevel: ventureLevel(state.ventures?.overseas?.[marketId]),
    brandLevel: state.company.certs.includes('brand') ? ventureLevel(state.ventures?.brand) : 0,
  };
}

function competitorBids(state, targetPrice, count) {
  const tracked = state.rivals?.filter(rival => rival.active !== false && !['failed', 'closed', 'acquired'].includes(rival.status));
  const options = [...(state.rivals?.length ? tracked : RIVAL_COMPANIES)];
  const rivals = [];
  while (options.length && rivals.length < count) {
    const [rival] = options.splice(numberBetween(state, 0, options.length - 1), 1);
    const aggressive = ['激进', 'aggressive'].includes(rival.style);
    const pressure = Math.round(((state.rivalMultiplier ?? 1) - 1) * 12);
    const ratio = (aggressive ? numberBetween(state, 86, 95) : numberBetween(state, 91, 101)) - pressure;
    rivals.push({ id: rival.id, name: rival.name, style: aggressive ? '激进' : '稳健', price: Math.max(1, Math.ceil(targetPrice * ratio / 100)) });
  }
  return rivals;
}

function makeInquiry(state, index, product, buyer, terms, market = domestic) {
  const fx = currencyRate(state, market.currency);
  const targetPrice = Math.max(1, Math.round(terms.targetPrice / fx));
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
    cert: terms.cert ?? market.cert,
    rivals: competitorBids(state, targetPrice, terms.competitors),
    market: market.id,
    currency: market.currency,
    fx,
    extraShippingWeeks: market.shippingWeeks,
    tariffRate: market.tariffRate,
    tutorial: terms.tutorial ?? false,
    framework: terms.framework ?? false,
    repeat: terms.repeat ?? false,
    landmark: terms.landmark ?? false,
    brandDemand: terms.brandDemand ?? false,
    localRestock: terms.localRestock ?? false,
  };
}

function tutorialInquiry(state, tutorial) {
  const { id, name, type, credit, portrait, comic, line, productId, quantity, targetPrice, depositRate, terms, deadline } = tutorial;
  return makeInquiry(state, 0, PRODUCT_BY_ID[productId], { id, name, type, credit, portrait, comic, line }, {
    quantity, targetPrice, depositRate, weeks: terms, deadline, validity: 2, minRep: 0, competitors: 2, tutorial: true,
  });
}

function regularInquiry(state, index, market, contact = null) {
  const overseas = market.id !== domestic.id;
  const preferred = overseas && random(state) < 0.8 ? PRODUCTS.filter(item => market.categories.includes(item.category)) : PRODUCTS;
  const product = (contact && PRODUCT_BY_ID[contact.productId]) || sample(state, preferred);
  const buyerTypes = state.company.certs.includes('audit') ? BUYER_TYPES : BUYER_TYPES.filter(item => item.id !== 'chain');
  const type = sample(state, buyerTypes);
  const names = overseas ? market.buyers : type.names;
  const grades = overseas ? market.grades : type.grades;
  const buyerIndex = numberBetween(state, 0, names.length - 1);
  const credit = contact?.buyer.credit ?? grades[buyerIndex % grades.length];
  const comicIndex = (MARKETS.indexOf(market) * 30 + BUYER_TYPES.indexOf(type) * names.length + buyerIndex) % 100 + 1;
  const buyer = contact ? { ...contact.buyer, line: '上一批合作顺利，想再补一批。交货和回款条件都可以谈。' } : {
    id: `${market.id}-${type.id}-${buyerIndex}`, name: names[buyerIndex],
    type: type.label, credit, line: type.line, comicIndex,
  };
  if (contact) buyer.comic = clientComic(buyer, 'repeat');
  const industry = tradeIndustry(state, product.category, market.id);
  const localRestock = overseas && industry.overseasLevel > 0 && random(state) < 0.38;
  const brandDemand = industry.brandLevel > 0 && random(state) < 0.19 + 0.035 * industry.brandLevel;
  const route = industry.overseasLevel ? 0 : market.shippingWeeks + tradePolicy(state, market.id).delayWeeks;
  const deadline = numberBetween(state, 2 + Math.max(0, route), 10 + Math.max(0, route));
  const framework = !contact && !localRestock && type.id === 'chain' && state.company.certs.includes('supplier') && random(state) < 0.25;
  const landmark = framework && state.company.rep >= 84 && state.company.markets.length >= 4 && random(state) < 0.20;
  const batch = numberBetween(state, type.lots[0], type.lots[1]) * (framework ? 5 : overseas ? 2 : 1);
  const { stock, factory } = product.sources;
  const factorySuitable = deadline >= Math.max(2, Math.ceil(factory.days / 7) + 1) + 1 + route;
  const options = !localRestock && factorySuitable && batch >= 2 ? factory : stock;
  let quantity = options === factory ? factory.minQuantity * Math.ceil(batch / 2) : stock.minQuantity * batch;
  if (localRestock) quantity = Math.ceil(stock.minQuantity / (1 + industry.overseasLevel)) * numberBetween(state, 1, 2);
  if (landmark) quantity = Math.max(quantity, options.packSize * Math.ceil(1450000 / options.unitCost / options.packSize));
  const unitFreight = (options.freightBase + Math.ceil(quantity / options.packSize) * options.freightPerBox) / quantity;
  const macroDemand = Math.max(0.8, Math.min(1.2, (state.macro?.consumer ?? 100) / 100));
  const marginMultiplier = numberBetween(state, 125, 160) / 100 + (localRestock ? 0.22 : 0);
  const targetPrice = Math.ceil((options.unitCost + unitFreight) * marginMultiplier * macroDemand);
  const gradeIndex = BUYER_CREDITS.indexOf(credit);
  const longest = Math.min(type.termLimit, [12, 10, 8, 6, 4, 3][gradeIndex]);
  const minRep = framework ? 80 : batch >= 6 ? 65 : batch >= 4 ? 55 : 0;
  return makeInquiry(state, index, product, buyer, {
    quantity, targetPrice, minRep, deadline,
    weeks: numberBetween(state, 0, contact ? Math.max(0, longest - 3) : longest),
    depositRate: sample(state, credit === 'B' ? [15, 20, 30] : [0, 10, 15, 20, 30]),
    validity: numberBetween(state, 1, 2),
    competitors: numberBetween(state, 1, 6),
    cert: framework ? 'supplier' : market.cert,
    framework, landmark, brandDemand, localRestock, repeat: Boolean(contact),
  }, market);
}

// A week's arrivals are appended by settlement, which independently removes expired inquiries.
export function generateInquiries(state) {
  const base = numberBetween(state, 4, 6);
  const markets = state.company.markets.map(id => MARKET_BY_ID[id]).filter(Boolean);
  const overseas = markets.filter(market => market.id !== domestic.id);
  const overseasDemand = state.overseasDemand ?? ERAS.find(era => era.id === state.era)?.overseasDemand ?? 1;
  const boosted = (state.marketBoostUntil ?? Infinity) >= state.week
    ? overseas.filter(market => (state.marketBoost ?? []).includes(market.id)) : [];
  const overseasMarket = () => sample(state, boosted.length && random(state) < 0.7 ? boosted : overseas);
  const exhibitions = (state.exhibitions ?? []).filter(item => item.untilWeek >= state.week && markets.some(market => market.id === item.market));
  const sales = (state.staff ?? []).filter(person => person.role === 'sales').length;
  const consumer = state.macro?.consumer ?? 100;
  const count = Math.max(3, base + Math.min(4, sales) + Math.min(3, exhibitions.length) + (consumer >= 118 ? 1 : consumer <= 80 ? -1 : 0));
  const featured = TUTORIAL_BUYERS[state.week - 1];
  const arrivals = featured ? [tutorialInquiry(state, featured)] : [];
  const leadIndex = state.leads?.findIndex(item => item.buyer && item.untilWeek >= state.week && markets.some(market => market.id === item.market)) ?? -1;
  if (leadIndex >= 0) {
    const [lead] = state.leads.splice(leadIndex, 1);
    arrivals.push(regularInquiry(state, arrivals.length, MARKET_BY_ID[lead.market], lead));
  }
  if (state.week % 4 === 0) {
    const regulars = Object.entries(state.relationships ?? {}).filter(([id, client]) =>
      client.deliveries >= 3 && client.rep >= 25 && !arrivals.some(item => item.buyer.id === id));
    const entry = regulars.length ? sample(state, regulars) : null;
    if (entry) {
      const order = (state.orders ?? []).findLast(item => item.buyer?.id === entry[0]);
      const info = entry[1];
      const buyer = info.buyer ?? order?.buyer;
      const market = MARKET_BY_ID[info.market ?? order?.market] ?? domestic;
      if (buyer && markets.includes(market)) arrivals.push(regularInquiry(state, arrivals.length, market, { buyer, productId: info.productId ?? order?.productId }));
    }
  }
  for (const item of exhibitions.slice(0, 3)) arrivals.push(regularInquiry(state, arrivals.length, MARKET_BY_ID[item.market]));
  if (overseas.length && !arrivals.some(item => item.market !== domestic.id) && (overseasDemand >= 1 || random(state) < overseasDemand)) {
    arrivals.push(regularInquiry(state, arrivals.length, overseasMarket()));
  }
  while (arrivals.length < count) {
    const market = overseas.length && random(state) < 0.43 * overseasDemand ? overseasMarket() : domestic;
    arrivals.push(regularInquiry(state, arrivals.length, market));
  }
  return arrivals;
}

function inventoryCost(state, productId, quantity, inquiryId) {
  let reserved = (state.bids ?? []).filter(bid => bid.source === 'inventory' && bid.productId === productId && bid.inquiryId !== inquiryId)
    .reduce((sum, bid) => sum + bid.quantity, 0);
  let remaining = quantity;
  let cost = 0;
  for (const item of state.inventory ?? []) {
    if (item.productId !== productId || !Number.isSafeInteger(item.quantity) || item.quantity < 1) continue;
    const held = Math.min(reserved, item.quantity);
    reserved -= held;
    const used = Math.min(remaining, item.quantity - held);
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

function winProbability(state, inquiry, unitPrice, extraTerms, staff, financing, brandLevel) {
  const competitorFloor = Math.min(inquiry.targetPrice, ...(inquiry.rivals ?? []).map(rival => rival.price));
  const relationships = state.relationships?.[inquiry.buyer.id];
  const priorSales = relationships?.deliveries ?? 0;
  const salesTeam = (state.staff ?? []).filter(person => person.role === 'sales');
  const generalSales = Math.max(0, ...salesTeam.map(person => person.ability ?? 0)) * 0.004;
  const termsAndTrust = (state.company.rep - 60) * 0.003 +
    extraTerms * 0.025 + Math.min(5, priorSales) * 0.02 + generalSales + (staff?.role === 'sales' ? (staff.ability ?? 0) * 0.012 : 0) -
    (financing === 'letter-of-credit' ? 0.06 : 0) - (state.energy < 35 ? 0.055 : 0);
  if (brandLevel) {
    const brandReach = 1.25 + brandLevel * 0.15 + (inquiry.brandDemand ? 0.18 : 0);
    const priceStretch = unitPrice / (inquiry.targetPrice * brandReach);
    const probability = clamp(0.64 + 0.105 * brandLevel + termsAndTrust - 0.39 * priceStretch ** 1.6, 0, 0.98);
    return { probability, competitorFloor };
  }
  if (unitPrice > inquiry.targetPrice) return { probability: 0, competitorFloor };
  if (unitPrice < competitorFloor) return { probability: 1, competitorFloor };
  const distance = Math.max(1, inquiry.targetPrice - competitorFloor);
  const priceEdge = clamp((inquiry.targetPrice - unitPrice) / distance, 0, 1);
  const mightSell = 0.16 + 0.69 * priceEdge ** 1.35 + termsAndTrust;
  return { probability: clamp(mightSell, 0.03, 0.98), competitorFloor };
}

// Quote previews never advance the RNG or reserve anything. Settlement price-locks the proposal
// at bid submission, while the weekly reducer is responsible for charging and moving stock.
export function quote(state, inquiry, options = {}) {
  if (!inquiry) return { error: '这条询盘已不存在。' };
  const { source = 'stock', ratio = 95, extraTerms = 0, staffId = null, financing = 'standard', branded = false, brandUnitPrice } = options;
  const customPrice = branded && brandUnitPrice !== undefined;
  const ratioValid = Number.isInteger(ratio) && ratio >= 80 && ratio <= (branded ? 160 : 105);
  if (!Object.hasOwn(sourceLabels, source) || (!customPrice && !ratioValid) ||
      !Number.isInteger(extraTerms) || extraTerms < 0 || extraTerms > 4) return { error: '请选择有效货源、报价和账期。' };
  if (customPrice && (!Number.isSafeInteger(brandUnitPrice) || brandUnitPrice < 1)) return { error: '自牌货单价必须是正整数。' };
  if (inquiry.expiresWeek < state.week) return { error: '询盘已过了报价期限。' };
  if (inquiry.minRep > state.company.rep) return { error: `这笔询盘需要信誉 ${inquiry.minRep}。` };
  if (inquiry.cert && !state.company.certs.includes(inquiry.cert)) return { error: '公司还没有这笔询盘所需的认证。' };
  const market = MARKET_BY_ID[inquiry.market] ?? domestic;
  const overseas = market.id !== domestic.id;
  const policy = tradePolicy(state, market.id);
  if (!Object.hasOwn(FINANCING, financing) || (financing !== 'standard' && !overseas)) {
    return { error: '这笔询盘不能使用所选贸易融资。' };
  }
  const staff = staffChoice(state, staffId);
  if (staff?.error) return staff;
  const product = Object.hasOwn(PRODUCT_BY_ID, inquiry.productId) && PRODUCT_BY_ID[inquiry.productId];
  const quantity = inquiry.quantity;
  if (!product || !Number.isSafeInteger(quantity) || quantity < 1) return { error: '这条询盘的商品或数量有误，请先选择其他询盘。' };
  const industry = tradeIndustry(state, product.category, market.id);
  if (branded && !industry.brandLevel) return { error: '先投入并注册自有品牌，才能自主定价。' };
  const warehouseLocal = overseas && industry.overseasLevel > 0;
  const factoryLevel = source === 'factory' ? industry.factoryLevel : 0;
  const brandLevel = branded ? industry.brandLevel : 0;
  const supplier = product.sources[source === 'inventory' ? 'stock' : source];
  const minQuantity = warehouseLocal && source === 'stock' ? Math.ceil(supplier.minQuantity / (1 + industry.overseasLevel)) : supplier.minQuantity;
  if (source !== 'inventory' && quantity < minQuantity) {
    return { error: `${supplier.name}需要至少 ${minQuantity} ${product.unit}，本单只有 ${quantity} ${product.unit}。` };
  }
  const factoryWeeks = Math.max(1, Math.max(2, Math.ceil(supplier.days / 7) + 1) - factoryLevel);
  const stockWeeks = Math.max(0, Math.max(1, Math.ceil(supplier.days / 7)) - industry.warehouseLevel);
  const productionWeeks = source === 'factory' ? factoryWeeks : source === 'stock' ? stockWeeks : 0;
  const extraShippingWeeks = Math.max(0, (inquiry.extraShippingWeeks ?? market.shippingWeeks) + policy.delayWeeks);
  const shippingWeeks = warehouseLocal ? 0 : 1 + extraShippingWeeks;
  const deliverWeek = state.week + Math.max(1, productionWeeks + shippingWeeks);
  if (deliverWeek > inquiry.dueWeek) return { error: `最早第 ${deliverWeek} 周交货，赶不上第 ${inquiry.dueWeek} 周的交期。` };
  const currency = inquiry.currency ?? market.currency;
  const fx = currencyRate(state, currency);
  const unitPrice = customPrice ? brandUnitPrice : Math.max(1, Math.round(inquiry.targetPrice * ratio / 100));
  const foreignTotal = unitPrice * quantity;
  const total = Math.round(foreignTotal * fx);
  const financingMin = FINANCING[financing].threshold ?? 0;
  if (total < financingMin) return { error: `信用证仅适用于总货款不低于 ¥${financingMin.toLocaleString('zh-CN')} 的海外订单。` };
  const materialIndex = source === 'factory' ? Math.max(40, (state.macro?.materials ?? 100) + policy.materialDelta) * (1 - 0.09 * factoryLevel) : 100;
  const cost = source === 'inventory' ? inventoryCost(state, product.id, quantity, inquiry.id) : Math.round(quantity * supplier.unitCost * materialIndex / 100);
  if (cost === null) return { error: '扣除其他报价的预留量后，库存不足以交齐这笔订单。' };
  const baseFreight = supplier.freightBase + Math.ceil(quantity / supplier.packSize) * supplier.freightPerBox;
  const overseasFactor = warehouseLocal ? 0.8 - industry.overseasLevel * 0.10
    : overseas ? Math.max(25, (state.macro?.freight ?? 100) + policy.freightDelta) / 100 * (1 + extraShippingWeeks / 2) : 1;
  const tariffRate = overseas ? Math.max(0, (inquiry.tariffRate ?? market.tariffRate) + policy.tariffDelta) : 0;
  const tariff = Math.round(cost * tariffRate);
  const shipping = Math.round(baseFreight * overseasFactor) + tariff;
  const prepayment = source === 'inventory' ? 0 : source === 'factory' ? Math.round(cost * 0.3) : cost;
  const depositForeign = Math.round(foreignTotal * inquiry.depositRate / 100);
  const deposit = Math.round(depositForeign * fx);
  const terms = inquiry.terms + extraTerms;
  const expectedPayWeek = deliverWeek + terms;
  const insurancePremium = Math.round(total * (FINANCING[financing].premiumRate ?? 0));
  const insuredRecovery = FINANCING[financing].recovery ?? 0;
  const rebateRate = overseas ? clamp(EXPORT_REBATE_RATE + policy.rebateDelta, 0, 0.2) : 0;
  const rebateEstimate = Math.round(total * rebateRate);
  const commission = Math.round(total * (staff?.commission ?? 0));
  const profit = total - cost - shipping - insurancePremium - commission;
  if (![foreignTotal, total, cost, shipping, prepayment, deposit, insurancePremium, rebateEstimate, commission, terms, expectedPayWeek].every(Number.isSafeInteger)) {
    return { error: '这笔询盘的金额或账期超出了可核算范围。' };
  }
  const acceptance = winProbability(state, inquiry, unitPrice, extraTerms, staff, financing, brandLevel);
  const sourceLabel = source === 'inventory' ? sourceLabels.inventory : factoryLevel ? `自有产线 · ${product.category}` : supplier.name;
  const quotedRatio = customPrice ? Math.min(Number.MAX_SAFE_INTEGER, Math.round(unitPrice / inquiry.targetPrice * 100)) : ratio;
  return {
    inquiryId: inquiry.id, productId: product.id, buyer: inquiry.buyer, market: inquiry.market,
    source, sourceLabel, ratio: quotedRatio, extraTerms, staffId, financing,
    quantity, unitPrice, total, foreignTotal, cost, shipping, prepayment, deposit, depositForeign, profit, productionWeeks, shippingWeeks,
    upfront: Math.max(0, prepayment + insurancePremium - deposit),
    workingCapital: Math.max(0, (source === 'inventory' ? 0 : cost) + shipping + insurancePremium + commission - deposit),
    margin: profit / total,
    tariff, insurancePremium, insuredRecovery, rebateRate, rebateEstimate, commission,
    branded, brandLevel, factoryLevel, warehouseLocal,
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
