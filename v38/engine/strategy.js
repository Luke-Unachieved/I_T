import { CATEGORIES, PRODUCT_BY_ID, TUTORIAL_BUYERS } from '../data/core.js';
import { MARKET_BY_ID, MARKETS } from '../data/expansion.js';
import { DIFFICULTIES, ERAS, ORIGINS } from '../data/strategy.js';
import { random } from './rng.js';
import { amount } from './treasury.js';

export const VENTURES = [
  { id: 'warehouse', label: '自建仓库', description: '先备好常卖货品，缩短现货备货时间。', asset: 'assets/deal-warehouse-starter.webp', costs: [18000, 32000, 61000], upkeep: 170 },
  { id: 'factory', label: '投资工厂', description: '给一个品类建立稳定产线，降低采购成本和延误。', asset: 'assets/deal-project-automated-warehouse.webp', costs: [45000, 74000, 124000], upkeep: 380 },
  { id: 'overseas', label: '海外仓', description: '在已开拓的市场提前配货，压缩跨境交付时间。', asset: 'assets/deal-warehouse-transit.webp', costs: [35000, 59000, 106000], upkeep: 310 },
  { id: 'brand', label: '自有品牌', description: '建立自己的品牌，拿到可以自主定价的询盘。', asset: 'assets/deal-work-product-thermos-branded.webp', costs: [25000, 45000, 85000], upkeep: 260 },
  { id: 'ecommerce', label: '跨境电商', description: '运营零售店铺，按周结算小额销售、进货及广告。', asset: 'assets/deal-warehouse-carton-paint.webp', costs: [16000, 28000, 52000], upkeep: 340 },
];

const CAPACITY = [0, 600, 1400, 3600];
const IPO_LIMITS = { seedRevenue: 125000, restructureAssets: 100000, restructureFee: 20000, revenue: 900000, profit: 95000, annualProfits: 2 };
const cny = (value) => `¥${Math.round(value).toLocaleString('zh-CN')}`;
const selection = (list, id, fallback) => list.find((item) => String(item.id) === String(id)) ?? list.find((item) => item.id === fallback) ?? list[0];
const successful = (s) => s.orders.filter((order) => order.deliveredWeek != null);
const totalLevel = (s, industry) => Object.values(s.ventures[industry]).reduce((total, level) => total + level, 0);
const latestYear = (s) => s.year.records.at(-1);
const rolling = (s, field) => s.history.slice(-52).reduce((sum, item) => sum + (item[field] ?? 0), 0);

export function strategyAssets(s) {
  return s.ventureBookAssets ?? 0;
}

function chronicle(s, type, text) {
  s.chronicle.unshift({ week: s.week, type, text });
  if (s.chronicle.length > 160) s.chronicle.pop();
}

function annualGoal(s, year) {
  const scale = Math.min(7, 1 + (year - 1) * 0.48);
  const eraFactor = s.era === '2008' && year === 1 ? 0.8 : 1;
  return {
    revenue: amount(190000 * scale * eraFactor), profit: amount(16000 * scale * eraFactor),
    maxLate: year < 3 ? 3 : 2, maxQuality: 0,
    bonusCash: 6000 + Math.min(10, year - 1) * 2500, bonusRep: 3,
  };
}

export function initStrategy(s) {
  const era = selection(ERAS, s.era, '2026');
  const origin = selection(ORIGINS, s.origin, 'self-made');
  const difficulty = selection(DIFFICULTIES, s.difficulty, 'normal');
  s.era = String(era.id);
  s.origin = origin.id;
  s.difficulty = difficulty.id;
  s.startYear = era.year;
  s.macro = { ...s.macro, ...era.initial };
  s.cash = Math.max(1, origin.cash + (difficulty.cashDelta ?? 0));
  s.company.rep = origin.rep;
  s.riskMultiplier = (difficulty.riskMultiplier ?? 1) * (era.riskMultiplier ?? 1);
  s.rivalMultiplier = difficulty.rivalMultiplier ?? 1;
  s.certFeeMultiplier = era.certFeeMultiplier ?? 1;
  s.overseasDemand = era.overseasDemand ?? 1;
  s.marketBoost = [];
  s.ventures = { warehouse: 0, factory: {}, overseas: {}, brand: 0, ecommerce: 0 };
  s.ventureBookAssets = 0;
  s.listing = { stage: 'private', stake: 100, capital: 0, publicWeek: null };
  s.chronicle = [];
  initAnnualGoal(s, 1);
  if (origin.id === 'factory-heir') {
    s.ventures.factory['餐桌器具'] = 1;
    s.ventureBookAssets += VENTURES.find((row) => row.id === 'factory').costs[0];
  }
  if (origin.id === 'buyer') {
    const buyer = TUTORIAL_BUYERS[0];
    s.relationships[buyer.id] = { buyer, market: 'domestic', deliveries: 3, rep: 48, comic: buyer.comic, productId: buyer.productId };
  }
  chronicle(s, 'founded', `${era.year} 年，${s.company.name}以${origin.label}的身份成立。`);
}

export function ventureProgress(s) {
  return VENTURES.map((record) => {
    const { id, costs } = record;
    const targets = id === 'factory' ? CATEGORIES.map((category) => ({ target: category, label: category }))
      : id === 'overseas' ? MARKETS.filter((market) => market.id !== 'domestic').map((market) => ({ target: market.id, label: market.name }))
        : [{ target: null, label: record.label }];
    const options = targets.map(({ target, label }) => {
      const level = target ? s.ventures[id][target] ?? 0 : s.ventures[id];
      const nextCost = costs[level] ?? null;
      const condition = id === 'overseas' && !s.company.markets.includes(target) ? '先开拓这个市场。'
        : id === 'brand' && !s.company.certs.includes('audit') ? '先取得验厂认证。'
          : id === 'ecommerce' && s.company.markets.length < 2 ? '至少开拓一个海外市场。' : '';
      const reason = condition || (nextCost != null && s.cash < nextCost ? '现金不足。' : '');
      return { target, label, level, nextCost, available: nextCost != null && !reason, reason };
    });
    return { ...record, options };
  });
}

export function stockPurchaseQuote(s, productId, requested) {
  const product = Object.hasOwn(PRODUCT_BY_ID, productId) ? PRODUCT_BY_ID[productId] : null;
  const level = s.ventures.warehouse;
  const capacity = CAPACITY[level];
  const available = Math.max(0, capacity - s.inventory.reduce((total, item) => total + item.quantity, 0));
  const quantity = Number(requested);
  const result = { capacity, available, quantity, cost: 0, unitPrice: 0, shipping: 0 };
  if (!level) return { ...result, error: '自建仓库后才能主动备货。' };
  if (!product) return { ...result, error: '请选择要备货的商品。' };
  const source = product.sources.stock;
  if (!Number.isSafeInteger(quantity) || quantity < source.minQuantity || quantity > available) {
    return { ...result, error: `该商品最少采购 ${source.minQuantity} ${product.unit}，仓库余量 ${available}。` };
  }
  const shipping = Math.max(1, amount((source.freightBase + Math.ceil(quantity / source.packSize) * source.freightPerBox) * (1 - level * 0.07)));
  const unitPrice = source.unitCost;
  const cost = quantity * unitPrice + shipping;
  const order = { ...result, cost, unitPrice, shipping };
  return s.cash < cost ? { ...order, error: '现金不足以支付采购和送仓。' } : order;
}

export function valuation(s, assets = s.cash - s.loan + strategyAssets(s)) {
  const earnings = rolling(s, 'profit');
  const multiple = 4 + s.company.rep * 0.026 + s.company.markets.length * 0.15;
  return amount(earnings * multiple + Math.max(0, assets) * 0.75);
}

export function nationalRank(s) {
  const revenue = rolling(s, 'revenue');
  return Math.max(1, Math.round(180000 / (1 + (revenue / 185000) ** 0.95)));
}

export function ipoProgress(s, assets) {
  const value = valuation(s, assets);
  const stage = s.listing.stage;
  const profitYears = s.year.records.slice(-IPO_LIMITS.annualProfits).filter((row) => row.profit > 0).length;
  const revenue = rolling(s, 'revenue');
  const profit = rolling(s, 'profit');
  const action = (id, label, requiredStage, requirements, cashIn, cost = 0) => ({
    id, label, requirements, cashIn, cost, available: stage === requiredStage && requirements.every((row) => row.met),
    current: stage === requiredStage,
  });
  const rule = (text, met) => ({ text, met });
  return { stage, stake: s.listing.stake, valuation: value, actions: [
    action('strategic-investment', '引入战略投资', 'private', [
      rule(`累计营收达到 ${cny(IPO_LIMITS.seedRevenue)}`, s.cumulativeRevenue >= IPO_LIMITS.seedRevenue),
      rule('公司信誉至少 66', s.company.rep >= 66),
      rule('当前估值为正', value > 0),
    ], Math.max(25000, amount(value * 0.18))),
    action('restructure', '股份制改造', 'funded', [
      rule(`净资产达到 ${cny(IPO_LIMITS.restructureAssets)}`, assets >= IPO_LIMITS.restructureAssets),
      rule(`可支付改造成本 ${cny(IPO_LIMITS.restructureFee)}`, s.cash >= IPO_LIMITS.restructureFee),
    ], 0, IPO_LIMITS.restructureFee),
    action('ipo', '申请上市', 'corporation', [
      rule(`近 52 周营收至少 ${cny(IPO_LIMITS.revenue)}，目前 ${cny(revenue)}`, revenue >= IPO_LIMITS.revenue),
      rule(`近 52 周净利至少 ${cny(IPO_LIMITS.profit)}，目前 ${cny(profit)}`, profit >= IPO_LIMITS.profit),
      rule(`最近 ${IPO_LIMITS.annualProfits} 个完整年度连续盈利`, profitYears >= IPO_LIMITS.annualProfits),
    ], amount(value * 0.20)),
  ] };
}

const funded = (s) => ['funded', 'corporation', 'public'].includes(s.listing.stage);
const incorporated = (s) => ['corporation', 'public'].includes(s.listing.stage);
const earned = (id, label, description, check) => ({ id, label, description, check });
export const ACHIEVEMENTS = [
  earned('quote', '先报一单', '提交第一份报价。', (s, ops, flow) => s.bids.length || flow?.won.length || flow?.lost.length),
  earned('won', '第一份合同', '在竞价中取得一笔订单。', (s) => s.orders.length),
  earned('delivered', '第一批货', '完成第一笔交付。', (s) => successful(s).length),
  earned('paid', '收到尾款', '取得第一笔实际应收回款。', (s) => s.receivables.some((item) => item.status === 'paid')),
  earned('ten-deliveries', '十单老手', '完成十笔交付。', (s) => successful(s).length >= 10),
  earned('fifty-deliveries', '枢纽供货商', '完成五十笔交付。', (s) => successful(s).length >= 50),
  earned('punctual', '不误船期', '十笔已交付订单均按时。', (s) => successful(s).filter((item) => !item.lateWeeks).length >= 10),
  earned('export-cert', '进出口权', '取得进出口经营权。', (s) => s.company.certs.includes('export')),
  earned('audit-cert', '通过验厂', '取得验厂认证。', (s) => s.company.certs.includes('audit')),
  earned('chain-cert', '名录在册', '成为大连锁供应商。', (s) => s.company.certs.includes('supplier')),
  earned('market', '第一次出海', '开拓第一个海外市场。', (s) => s.company.markets.length >= 2),
  earned('three-markets', '三条海外航线', '开拓三个海外市场。', (s) => s.company.markets.length >= 4),
  earned('all-markets', '全球商路', '开拓全部海外市场。', (s) => s.company.markets.length === MARKETS.length),
  earned('export-shipment', '越过海峡', '完成第一笔海外交付。', (s) => successful(s).some((order) => order.market !== 'domestic')),
  earned('new-hire', '同事来了', '至少两位员工在职。', (s) => s.staff.length >= 2),
  earned('all-roles', '小而齐全', '同时聘用业务员、跟单员和财务。', (s) => new Set(s.staff.map((person) => person.role)).size === 3),
  earned('team', '坐满办公室', '至少六位员工在职。', (s) => s.staff.length >= 6),
  earned('key-client', '老客户', '建立一位合作三次的重点客户。', (s) => Object.values(s.relationships).some((relation) => relation.deliveries >= 3)),
  earned('factor', '提前收款', '为一张应收账款办理保理。', (s) => s.receivables.some((item) => item.status === 'factored')),
  earned('insurance', '保险到账', '因出口信用保险收到一笔赔款。', (s) => s.receivables.some((item) => item.status === 'insured')),
  earned('recovery', '追回欠款', '通过诉讼收回部分欠款。', (s) => s.receivables.some((item) => item.status === 'recovered')),
  earned('trust', '报价有分量', '公司信誉达到 78。', (s) => s.company.rep >= 78),
  earned('famous', '行业口碑', '公司信誉达到 95。', (s) => s.company.rep >= 95),
  earned('positive-year', '第一个盈利年', '完成一个完整且盈利的年度。', (s) => s.year.records.some((row) => row.profit > 0)),
  earned('clean-year', '干净账本', '全年无坏账且完成至少一笔交付。', (s) => latestYear(s)?.deliveries > 0 && latestYear(s).badDebts === 0),
  earned('annual-goal', '兑现年度目标', '达到一整组年度经营目标。', (s) => s.year.records.some((row) => row.goal?.met)),
  earned('warehouse', '自己的仓', '投资自建仓库。', (s) => s.ventures.warehouse > 0),
  earned('factory', '直达产线', '投资至少一个品类的工厂。', (s) => totalLevel(s, 'factory') > 0),
  earned('overseas-stock', '货在海外', '建立第一个海外仓。', (s) => totalLevel(s, 'overseas') > 0),
  earned('brand', '自家牌子', '建立自有品牌。', (s) => s.ventures.brand > 0),
  earned('web-store', '网上开店', '运营一个跨境电商店铺。', (s) => s.ventures.ecommerce > 0),
  earned('landmark', '百万地标订单', '拿下一笔价值至少一百万元的合同。', (s) => s.orders.some((order) => order.total >= 1000000)),
  earned('million', '百万营收', '近 52 周营收达到一百万元。', (s) => rolling(s, 'revenue') >= 1000000),
  earned('invested', '新的股东', '完成一轮战略融资。', funded),
  earned('corporation', '股份公司', '完成股份制改造。', incorporated),
  earned('ipo', '敲钟之后', '在交易所上市。', (s) => s.listing.stage === 'public'),
];

export function strategyMilestones(s, ops, flow) {
  for (const item of ACHIEVEMENTS) {
    if (s.achievements.includes(item.id) || !item.check(s, ops, flow)) continue;
    s.achievements.push(item.id);
    chronicle(s, 'achievement', item.label);
    ops.log('achievement', `达成成就：${item.label}。`);
  }
}

export function biography(s) {
  const era = selection(ERAS, s.era, '2026');
  const birthplace = selection(ORIGINS, s.origin, 'self-made');
  const name = s.company.name;
  const foreignCount = s.company.markets.length - 1;
  const paragraph = [`${name}于 ${s.startYear} 年成立，时处“${era.label}”，团队从${birthplace.label}出发。`];
  const delivered = successful(s).length;
  if (delivered) paragraph.push(`截至经营第 ${s.week} 周，公司累计交付 ${delivered} 单，近 52 周营收 ${cny(rolling(s, 'revenue'))}，已开拓 ${foreignCount} 个海外市场。`);
  const used = ventureProgress(s).filter((row) => row.options.some((option) => option.level > 0)).map((row) => row.label);
  if (used.length) paragraph.push(`贸易业务之外，公司陆续布局${used.join('、')}。`);
  const milestones = s.chronicle.filter((item) => ['era', 'annual', 'venture'].includes(item.type)).slice(0, 3).reverse();
  if (milestones.length) paragraph.push(milestones.map((item) => `经营第 ${item.week} 周，${item.text}`).join(''));
  if (s.listing.stage === 'public') paragraph.push(`第 ${s.listing.publicWeek} 周，公司完成上市。创始团队目前持股 ${s.listing.stake}%。`);
  else if (funded(s)) paragraph.push(`公司已获得战略资金，正在为下一步股份制发展做准备。`);
  return paragraph;
}

export function strategyAction(s, action, ops) {
  if (action.type === 'invest-venture') {
    const record = ventureProgress(s).find((row) => row.id === action.id);
    const option = record?.options.find((row) => row.target === (action.target ?? null));
    if (!option || !option.available) return { error: option?.reason || '这项产业不能继续投资。' };
    const invested = ops.spend(option.nextCost);
    // Facilities are carried at their purchase cost; weekly operating expenses go through profit.
    s.ventureBookAssets += invested;
    if (option.target) s.ventures[record.id][option.target] = option.level + 1;
    else s.ventures[record.id] = option.level + 1;
    if (record.id === 'brand' && !s.company.certs.includes('brand')) s.company.certs.push('brand');
    const description = `${record.label}${option.target ? `（${option.label}）` : ''}达到 ${option.level + 1} 级。`;
    chronicle(s, 'venture', description);
    ops.log('venture', description);
    return {};
  }
  if (['stock-warehouse', 'purchase-stock'].includes(action.type)) {
    const productId = action.productId ?? action.id;
    const priced = stockPurchaseQuote(s, productId, action.quantity);
    if (priced.error) return { error: priced.error };
    ops.spend(priced.cost);
    // Preserve the total book cost by splitting the lot where freight leaves a remainder.
    const unitCost = Math.floor(priced.cost / priced.quantity);
    const extra = priced.cost - unitCost * priced.quantity;
    if (extra) s.inventory.push({ productId, quantity: extra, unitCost: unitCost + 1 });
    if (priced.quantity > extra) s.inventory.push({ productId, quantity: priced.quantity - extra, unitCost });
    ops.log('venture', `采购 ${priced.quantity} 件${PRODUCT_BY_ID[productId].name}入仓，支出 ${cny(priced.cost)}。`);
    return {};
  }
  if (!['strategic-investment', 'restructure', 'ipo'].includes(action.type)) return null;
  const proposed = ipoProgress(s, ops.netAssets()).actions.find((row) => row.id === action.type);
  if (!proposed.available) return { error: '公司尚未满足这一步的条件。' };
  if (action.type === 'strategic-investment') {
    s.listing.stage = 'funded';
    s.listing.stake = 82;
  } else if (action.type === 'restructure') {
    s.listing.stage = 'corporation';
    ops.profit(-ops.spend(proposed.cost));
  } else {
    s.listing.stage = 'public';
    s.listing.stake = Math.round(s.listing.stake * 0.8 * 100) / 100;
    s.listing.publicWeek = s.week;
    s.events.push({ id: ops.id('event'), type: 'ipo-celebration', title: '上市成功',
      text: '公司已完成上市。以后仍可继续经营、扩张和挑战新的年度目标。',
      choices: [{ id: 'continue', label: '继续经营' }] });
  }
  if (proposed.cashIn) s.listing.capital += ops.receiveCapital(proposed.cashIn);
  const text = `${proposed.label}完成${proposed.cashIn ? `，筹得 ${cny(proposed.cashIn)}` : ''}。`;
  chronicle(s, action.type, text);
  ops.log('milestone', text);
  return {};
}

function calendar(s, ops) {
  const era = selection(ERAS, s.era, '2026');
  for (const event of era.schedule.filter((item) => item.week === s.week)) {
    for (const [key, change] of Object.entries(event.changes ?? {})) {
      s.macro[key] = key === 'usd' || key === 'eur' ? Math.round((s.macro[key] + change) * 100) / 100 : Math.round(s.macro[key] + change);
    }
    if (event.policy) {
      const { weeks, ...policy } = event.policy;
      s.policies.push({ ...policy, title: event.title, untilWeek: s.week + weeks });
    }
    if (event.marketBoost) {
      s.marketBoost = [...new Set([...s.marketBoost, ...event.marketBoost])];
      s.marketBoostUntil = s.week + 26;
    }
    chronicle(s, 'era', `${event.title}。${event.text ?? ''}`);
    ops.log('era', `${event.title}。${event.text ?? ''}`);
  }
}

export function strategyWeek(s, flow, ops) {
  calendar(s, ops);
  const levelCounts = {
    ...s.ventures, factory: totalLevel(s, 'factory'), overseas: totalLevel(s, 'overseas'),
  };
  const upkeep = VENTURES.reduce((sum, venture) => sum + levelCounts[venture.id] * venture.upkeep, 0);
  ops.profit(-ops.spend(upkeep));
  for (const level of Object.values(s.ventures.factory)) {
    const revenue = amount(level * (130 + random(s) * 650) * s.macro.consumer / 100);
    const supplies = amount(revenue * (0.25 + random(s) * 0.43));
    ops.profit(ops.receive(revenue) - ops.spend(supplies));
    flow.revenue += revenue;
  }
  if (s.ventures.ecommerce) {
    const retail = amount(s.ventures.ecommerce * (440 + random(s) * 2200) * s.macro.consumer / 100);
    const merchandise = amount(retail * 0.66);
    ops.profit(ops.receive(retail) - ops.spend(merchandise));
    flow.revenue += retail;
    ops.log('retail', `跨境店铺本周销售 ${cny(retail)}。`);
  }
}

export function finalizeGoal(s, annual, ops) {
  const goal = annual.goal;
  const criteria = [
    { text: `营收达到 ${cny(goal.revenue)}`, met: annual.revenue >= goal.revenue },
    { text: `净利达到 ${cny(goal.profit)}`, met: annual.profit >= goal.profit },
    { text: `逾期订单不超过 ${goal.maxLate} 笔`, met: annual.late <= goal.maxLate },
    { text: `质量事故不超过 ${goal.maxQuality} 次`, met: annual.quality <= goal.maxQuality },
  ];
  const met = criteria.every((item) => item.met);
  if (met) {
    ops.receive(goal.bonusCash);
    ops.changeRep(goal.bonusRep);
    ops.log('annual', `完成第 ${annual.number} 年目标，奖励 ${cny(goal.bonusCash)} 和 ${goal.bonusRep} 点信誉。`);
  }
  chronicle(s, 'annual', `第 ${annual.number} 年结束，营收 ${cny(annual.revenue)}，净利 ${cny(annual.profit)}。`);
  return { ...goal, criteria, met };
}

export function initAnnualGoal(s, year) {
  s.year.goal = annualGoal(s, year);
  s.year.quality = 0;
  s.year.qualityStart = s.qualityIncidents;
  s.year.badDebts = 0;
}
