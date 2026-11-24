import { ASSISTANTS, RIVAL_COMPANIES } from '../data/core.js';
import { CERTIFICATIONS, DEFAULT_MACRO, MARKETS, STAFF_ROLES, clientComic, currencyRate } from '../data/expansion.js';
import { TRADE_EVENTS } from '../data/events.js';
import { random } from './rng.js';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const choose = (state, list) => list[Math.floor(random(state) * list.length)];
const operations = ['sales', 'operations', 'sales', 'finance'];
const talentNames = ['秦南栀', '沈嘉树', '罗小岚', '林之行', '梁知微', '许笙', '韩雨禾', '邵成宇', '宁萍', '季可'];
const skillTags = { sales: ['熟悉中东客户', '擅长谈价', '能做连锁采购'], operations: ['熟悉验货', '会跟海运', '熟悉工厂排期'], finance: ['擅长催收', '熟悉外汇', '会对账'] };
const activeOrder = order => ['procurement', 'production', 'transit'].includes(order.status);
const openInvoice = item => ['open', 'overdue'].includes(item.status);

function adviserStaff(adviser, index) {
  const role = operations[index];
  return { ...adviser, role, ability: 5 + index % 3, salary: STAFF_ROLES[role].salary,
    commission: STAFF_ROLES[role].commission, trait: skillTags[role][index % 3], original: true };
}

function candidatePool(s, week = s.week) {
  const originals = ASSISTANTS.map(adviserStaff).filter(person => !s.staff.some(employee => employee.id === person.id));
  const talent = Array.from({ length: 4 }, (_, i) => {
    const role = Object.keys(STAFF_ROLES)[i % 3];
    const ability = 3 + Math.floor(random(s) * 7);
    return {
      id: `candidate-${week}-${i}`, name: talentNames[(week + i) % talentNames.length], role, ability,
      salary: STAFF_ROLES[role].salary + 35 * (ability - 5),
      commission: STAFF_ROLES[role].commission, trait: choose(s, skillTags[role]),
    };
  });
  return [...originals, ...talent];
}

export function initGrowth(s) {
  const original = ASSISTANTS.findIndex(adviser => adviser.id === s.assistant);
  const lead = adviserStaff(ASSISTANTS[Math.max(0, original)], Math.max(0, original));
  // The founding assistant starts on a smaller base than hires from the talent market.
  s.staff = [{ ...lead, salary: Math.round(lead.salary * 0.38), founder: true }];
  s.macro = { ...DEFAULT_MACRO };
  s.rivals = RIVAL_COMPANIES.map((rival, index) => ({
    ...rival, scale: 1 + index % 4, health: index === RIVAL_COMPANIES.length - 1 ? 28 : 58 + 4 * (index % 7),
    revenue: 0, annualSales: 0, weeklyRevenue: [], cash: 16000 + index * 5500, active: true, status: 'active',
    financingStress: index === RIVAL_COMPANIES.length - 1,
  }));
  s.candidates = candidatePool(s);
  s.exhibitions = [];
  s.policies = [];
  s.leads = [];
  s.cumulativeRevenue = 0;
  s.qualityIncidents = 0;
  s.clientStories = [];
}

function certReqs(s, cert, assets) {
  const items = [];
  const gate = (text, met) => items.push({ text, met: Boolean(met) });
  if (cert.requires) {
    const prior = CERTIFICATIONS.find(item => item.id === cert.requires);
    gate(`先取得${prior?.name ?? cert.requires}`, s.company.certs.includes(cert.requires));
  }
  if (cert.deliveries) {
    const total = s.year.deliveries + s.year.records.reduce((sum, year) => sum + year.deliveries, 0);
    gate(`累计交付 ${total} / ${cert.deliveries} 单`, total >= cert.deliveries);
  }
  if (cert.rep) gate(`公司信誉 ${s.company.rep} / ${cert.rep}`, s.company.rep >= cert.rep);
  if (cert.revenue) gate(`累计营收 ¥${s.cumulativeRevenue.toLocaleString('zh-CN')} / ¥${cert.revenue.toLocaleString('zh-CN')}`, s.cumulativeRevenue >= cert.revenue);
  if (cert.staffRole) gate(`在职${STAFF_ROLES[cert.staffRole].label}至少 1 位`, s.staff.some(person => person.role === cert.staffRole));
  if (cert.netAssets) gate(`净资产 ¥${assets.toLocaleString('zh-CN')} / ¥${cert.netAssets.toLocaleString('zh-CN')}`, assets >= cert.netAssets);
  if (cert.cleanWeeks) {
    const lastLate = s.orders.reduce((last, order) => order.lateWeeks ? Math.max(last, order.dueWeek + order.lateWeeks) : last, 0);
    const consecutive = Math.max(0, s.week - 1 - lastLate);
    gate(`最近连续 ${Math.min(cert.cleanWeeks, consecutive)} / ${cert.cleanWeeks} 周无逾期交付`, consecutive >= cert.cleanWeeks);
  }
  return items;
}

export function certProgress(s, assets = s.cash - s.loan) {
  return CERTIFICATIONS.map(cert => {
    const requirements = certReqs(s, cert, assets);
    const owned = s.company.certs.includes(cert.id);
    return { ...cert, requirements, owned, eligible: requirements.every(item => item.met),
      available: !owned && s.cash >= cert.fee && requirements.every(item => item.met) };
  });
}

export function marketProgress(s) {
  const contact = Object.values(s.relationships).filter(item => item.deliveries >= 3 && item.rep >= 25 && item.buyer)
    .sort((a, b) => b.rep - a.rep)[0];
  return MARKETS.map(market => {
    const opened = s.company.markets.includes(market.id);
    const eligible = !market.cert || s.company.certs.includes(market.cert);
    const referralFee = Math.floor(market.fee * 0.55);
    const exhibition = s.exhibitions.find(item => item.market === market.id && item.untilWeek >= s.week);
    const certName = CERTIFICATIONS.find(item => item.id === market.cert)?.name;
    return { ...market, opened, eligible, certName, canPay: s.cash >= market.fee, exhibition,
      exhibitFee: Math.max(750, Math.round(market.fee * 0.22)),
      referralFee, referralBuyer: contact?.buyer ?? null, canRefer: eligible && !opened && !!contact && s.cash >= referralFee,
    };
  });
}

function expense(ops, value) {
  if (value > 0) ops.profit(-ops.spend(value));
}

function exhibit(s, market, weeks) {
  const old = s.exhibitions.find(item => item.market === market);
  const untilWeek = s.week + weeks - 1;
  if (old) old.untilWeek = Math.max(old.untilWeek, untilWeek);
  else s.exhibitions.push({ market, untilWeek });
}

const result = (error) => error ? { error } : {};

export function growthAction(s, action, ops) {
  const id = action.id;
  switch (action.type) {
    case 'hire': {
      const person = s.candidates.find(item => item.id === id);
      if (!person || s.staff.some(item => item.id === id)) return result('这位候选人已离开人才市场。');
      if (s.staff.length >= 18) return result('当前办公室最多容纳 18 位员工。');
      if (s.cash < person.salary) return result('现金不足以支付首周工资。');
      s.staff.push(person);
      s.candidates = s.candidates.filter(item => item.id !== id);
      ops.log('staff', `${person.name}加入公司，任${STAFF_ROLES[person.role].label}。`);
      return result();
    }
    case 'dismiss-staff': {
      const person = s.staff.find(item => item.id === id);
      if (!person) return result('员工已离开公司。');
      if (s.orders.some(order => order.staffId === id && activeOrder(order)) || s.bids.some(bid => bid.staffId === id)) {
        return result('请等这位员工的报价或在途订单处理完毕。');
      }
      s.staff = s.staff.filter(item => item.id !== id);
      ops.log('staff', `${person.name}已离职。`);
      return result();
    }
    case 'buy-cert': {
      const cert = certProgress(s, ops.netAssets()).find(item => item.id === id);
      if (!cert || cert.owned) return result('这项资质不可重复申领。');
      if (!cert.eligible) return result('资质条件尚未达成。');
      if (!cert.available) return result('现金不足以支付申请费用。');
      expense(ops, cert.fee);
      s.company.certs.push(id);
      ops.log('cert', `取得${cert.name}。`);
      return result();
    }
    case 'open-market':
    case 'referral':
    case 'exhibit': {
      const market = marketProgress(s).find(item => item.id === id);
      if (!market) return result('找不到这个市场。');
      if (!market.eligible) return result(`先取得${market.certName}，再开拓${market.name}。`);
      if (action.type !== 'exhibit' && market.opened) return result('这个市场已经开放。');
      if (action.type === 'exhibit' && market.exhibition) return result('该市场已经有一场进行中的展会。');
      if (action.type === 'referral' && !market.referralBuyer) return result('需要有至少合作三次、关系稳定的重点客户引荐。');
      const fee = action.type === 'referral' ? market.referralFee
        : action.type === 'exhibit' && market.opened ? market.exhibitFee : market.fee;
      if (s.cash < fee) return result('现金不足以支付市场开拓费用。');
      expense(ops, fee);
      if (!market.opened) s.company.markets.push(id);
      if (action.type !== 'referral') exhibit(s, id, 6);
      ops.log('market', action.type === 'referral'
        ? `${market.referralBuyer.name}引荐了${market.name}买家。`
        : `参加${market.name}展会，未来 6 周增加询盘。`);
      return result();
    }
    default: return null;
  }
}

const macroBounds = { usd: [4, 12], eur: [4, 13], freight: [45, 620], materials: [45, 260], consumer: [32, 220] };

function adjustMacro(s, changes) {
  for (const [key, change] of Object.entries(changes ?? {})) {
    const [min, max] = macroBounds[key];
    const value = clamp(s.macro[key] + change, min, max);
    s.macro[key] = key === 'usd' || key === 'eur' ? Math.round(value * 100) / 100 : Math.round(value);
  }
}

function marketWeek(s) {
  adjustMacro(s, {
    usd: (random(s) - 0.5) * 0.1, eur: (random(s) - 0.5) * 0.11,
    freight: (random(s) - 0.5) * 9, materials: (random(s) - 0.5) * 7,
    consumer: (random(s) - 0.5) * 7,
  });
  s.policies = s.policies.filter(policy => policy.untilWeek >= s.week + 1);
  s.exhibitions = s.exhibitions.filter(item => item.untilWeek >= s.week + 1);
  s.leads = s.leads.filter(item => item.untilWeek >= s.week + 1);
}

function offerEvent(s, ops, code, details) {
  s.events.push({ id: ops.id('event'), type: code, ...details });
  ops.log('event', details.title + '。');
}

function rivalsWeek(s, ops, projecting) {
  for (const rival of s.rivals) {
    if (!rival.active) continue;
    const sales = Math.round((1400 + random(s) * 4400) * rival.scale * s.macro.consumer / 100);
    rival.weeklyRevenue.push(sales);
    if (rival.weeklyRevenue.length > 52) rival.weeklyRevenue.shift();
    rival.revenue += sales;
    rival.annualSales = rival.weeklyRevenue.reduce((sum, amount) => sum + amount, 0);
    const margin = rival.style === '激进' ? 0.11 : 0.18;
    const financedRisk = rival.financingStress ? 2700 : 380;
    const net = Math.round(sales * margin - financedRisk - rival.scale * 560);
    rival.cash += net;
    rival.health = clamp(rival.health + (net >= 0 ? 1 : -1) - (rival.cash < 10000 ? 2 : 0), 0, 100);
    if (rival.cash > rival.scale * 55000 && rival.scale < 9) {
      rival.cash -= rival.scale * 25000;
      rival.scale += 1;
    }
    if (rival.health === 0 || rival.cash < -8000) {
      rival.active = false;
      rival.status = 'failed';
      if (!projecting) {
        const fee = rival.scale * 2600;
        offerEvent(s, ops, 'rival-sale', { title: `${rival.name}停止经营`, text: '可以接手对方的老客户和待售库存。',
          rivalId: rival.id, fee, choices: [{ id: 'acquire', label: `接手业务 · ¥${fee.toLocaleString('zh-CN')}` }, { id: 'pass', label: '放弃收购' }] });
      }
    }
  }
}

function retainStaff(s, ops, projecting) {
  if (s.week % 4 === 0) s.candidates = candidatePool(s, s.week + 1);
  if (s.week < 8 || s.week % 4) return;
  const person = s.staff.find(item => item.salary < STAFF_ROLES[item.role].salary &&
    (s.history.slice(-4).every(row => row.profit < 0) || item.salary < STAFF_ROLES[item.role].salary * 0.55));
  if (!person || random(s) > 0.6 || projecting) return;
  const raise = Math.max(Math.round(person.salary * 1.25), STAFF_ROLES[person.role].salary);
  offerEvent(s, ops, 'staff-poach', { title: `${person.name}收到同行邀请`, text: `对方给的工资更高。${person.name}愿意留下，但希望周薪调整至 ¥${raise}。`,
    staffId: person.id, raise, choices: [{ id: 'retain', label: `加薪至 ¥${raise} / 周` }, { id: 'release', label: '接受离职' }] });
}

function targetFor(s, flow, kind) {
  switch (kind) {
    case 'production': return s.orders.find(order => order.status === 'production');
    case 'overseas-transit': return s.orders.find(order => order.status === 'transit' && order.market !== 'domestic');
    case 'delivery': return s.orders.find(order => flow.delivered.includes(order.id));
    case 'invoice': return s.receivables.find(openInvoice);
    case 'foreign-invoice': return s.receivables.find(item => openInvoice(item) && item.currency !== 'CNY');
    case 'stock': return s.inventory.find(item => item.quantity > 0);
    case 'global': return s.company.markets.find(id => id !== 'domestic');
    case 'loan': return s.loan > 0;
    default: return true;
  }
}

function randomEvent(s, flow, ops, projecting) {
  if (s.week < 5 || s.week % 3 || random(s) > 0.7) return;
  const pool = TRADE_EVENTS.map(template => ({ template, target: targetFor(s, flow, template.when) }))
    .filter(item => item.target && item.template.id !== s.lastTradeEvent);
  const choice = choose(s, pool);
  if (!choice) return;
  const { template, target } = choice;
  if (template.id === 'quality' && random(s) < s.staff.filter(person => person.role === 'operations')
    .reduce((best, person) => Math.max(best, person.ability), 0) * 0.07) return;
  s.lastTradeEvent = template.id;
  if (projecting) return;
  const { id, text, title, choices, when } = template;
  offerEvent(s, ops, 'trade-event', { code: id, title, text, choices,
    orderId: ['production', 'overseas-transit', 'delivery'].includes(when) ? target.id : null,
    invoiceId: when === 'invoice' ? target.id : null,
    market: when === 'global' ? target : target.market,
    productId: when === 'stock' ? target.productId : null,
    comic: when === 'delivery' ? clientComic(target.buyer, 'repeat') : null });
}

function keyClients(s, flow, ops, projecting) {
  for (const orderId of flow.delivered) {
    const order = s.orders.find(item => item.id === orderId);
    const relation = s.relationships[order?.buyer.id];
    if (!order || !relation || relation.deliveries !== 3) continue;
    const comic = clientComic(order.buyer, 'repeat');
    const news = { week: s.week, buyer: order.buyer, text: '第三次顺利交付后，买家愿意把你加入常用供应商。', comic };
    if (projecting) continue;
    s.clientStories.unshift(news);
    offerEvent(s, ops, 'key-client', { title: `${order.buyer.name}成为重点客户`, text: news.text, comic,
      buyerId: order.buyer.id, orderId, choices: [{ id: 'contact', label: '约下次复购' }, { id: 'thanks', label: '礼貌致谢' }] });
  }
}

export function growthWeek(s, flow, ops, { projecting } = {}) {
  s.cumulativeRevenue += flow.revenue;
  marketWeek(s);
  rivalsWeek(s, ops, projecting);
  retainStaff(s, ops, projecting);
  keyClients(s, flow, ops, projecting);
  if (!s.events.length) randomEvent(s, flow, ops, projecting);
}

function applyDelay(order, delay) {
  if (!order || !activeOrder(order) || !delay) return;
  if (order.status === 'transit') order.shippingLeft += delay;
  else order.productionLeft += delay;
  order.expectedPayWeek += delay;
}

function applyTradeDecision(s, event, choice, ops) {
  if (choice.cost && s.cash < choice.cost) return result('现金不足，仍可选择其他处理方式。');
  expense(ops, choice.cost);
  if (choice.rep) ops.changeRep(choice.rep);
  if (choice.macro) adjustMacro(s, choice.macro);
  if (choice.policy) {
    const { weeks, ...effects } = choice.policy;
    s.policies.push({ ...effects, market: event.market, untilWeek: s.week + weeks - 1, title: event.title });
  }
  if (choice.exhibit) exhibit(s, choice.exhibit, 4);
  const order = s.orders.find(item => item.id === event.orderId);
  applyDelay(order, choice.delay);
  if (choice.discount && order && activeOrder(order)) order.penalty = Math.min(order.total, order.penalty + Math.round(order.total * choice.discount));
  if (event.code === 'quality') s.qualityIncidents += 1;
  if (choice.relationship && order) {
    const relation = s.relationships[order.buyer.id];
    if (relation) relation.rep = clamp(relation.rep + choice.relationship, 0, 100);
  }
  if (choice.lead && order) s.leads.push({ buyer: order.buyer, productId: order.productId, market: order.market, untilWeek: s.week + 3 });
  const invoice = s.receivables.find(item => item.id === event.invoiceId && openInvoice(item));
  if (invoice) {
    if (choice.invoiceDelay) {
      invoice.dueWeek += choice.invoiceDelay;
      const billed = s.orders.find(item => item.id === invoice.orderId);
      if (billed) billed.expectedPayWeek = invoice.dueWeek;
    }
    if (choice.collection) invoice.collectionBoost = (invoice.collectionBoost ?? 0) + choice.collection;
  }
  if (choice.lockFx) {
    for (const item of s.receivables.filter(item => openInvoice(item) && item.currency !== 'CNY')) {
      item.lockedFx = currencyRate(s, item.currency);
    }
  }
  const stock = s.inventory.find(item => item.productId === event.productId);
  if (stock && choice.stockLoss) {
    const next = Math.round(stock.unitCost * (1 - choice.stockLoss));
    ops.profit((next - stock.unitCost) * stock.quantity);
    stock.unitCost = next;
  }
  if (stock && choice.clearance) {
    const reserved = s.bids.filter(bid => bid.source === 'inventory' && bid.productId === stock.productId)
      .reduce((sum, bid) => sum + bid.quantity, 0);
    const sales = Math.min(Math.max(0, stock.quantity - reserved), Math.ceil(stock.quantity / 3));
    ops.profit(ops.receive(Math.round(sales * stock.unitCost * 0.65)) - sales * stock.unitCost);
    stock.quantity -= sales;
    s.inventory = s.inventory.filter(item => item.quantity > 0);
  }
  ops.log('decision', `${event.title}：${choice.label}。`);
  return result();
}

export function growthEvent(s, event, id, ops) {
  const choice = event.choices.find(item => item.id === id);
  if (!choice) return result('请选择有效处理方式。');
  if (event.type === 'trade-event') return applyTradeDecision(s, event, choice, ops);
  if (event.type === 'staff-poach') {
    const person = s.staff.find(item => item.id === event.staffId);
    if (!person) return result();
    if (id === 'retain') {
      person.salary = event.raise;
      ops.log('staff', `${person.name}决定留在公司。`);
    } else {
      s.staff = s.staff.filter(item => item.id !== person.id);
      ops.log('staff', `${person.name}离职，手头订单由公司接手。`);
    }
    return result();
  }
  if (event.type === 'rival-sale' && id === 'acquire') {
    const rival = s.rivals.find(item => item.id === event.rivalId && item.status === 'failed');
    if (!rival || s.cash < event.fee) return result('无法支付收购费用。');
    expense(ops, event.fee);
    rival.status = 'acquired';
    const productId = 'tray';
    s.inventory.push({ productId, quantity: rival.scale * 40, unitCost: 19 });
    ops.changeRep(3);
    exhibit(s, 'domestic', 6);
    ops.log('rival', `已接手${rival.name}的存货和本地渠道。`);
  }
  if (event.type === 'key-client' && id === 'contact') {
    const order = s.orders.find(item => item.id === event.orderId);
    if (order) {
      s.leads.push({ buyer: order.buyer, productId: order.productId, market: order.market, untilWeek: s.week + 3 });
      const relation = s.relationships[event.buyerId];
      if (relation) relation.rep = clamp(relation.rep + 5, 0, 100);
    }
  }
  return result();
}
