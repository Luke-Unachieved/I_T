import { ASSISTANTS } from '../data/core.js';
import { generateInquiries, quote, resolveBid } from './quotes.js';
import { random } from './rng.js';

const FIXED_COST = 1200;
const WEEKLY_INTEREST = 0.0025;
const CREDIT = {
  AAA: [0.98, 0.002], AA: [0.95, 0.004], A: [0.91, 0.01],
  BBB: [0.84, 0.025], BB: [0.76, 0.055], B: [0.65, 0.12],
};
const ACTIVE_ORDER = new Set(['procurement', 'production', 'transit']);
const OPEN_RECEIVABLE = new Set(['open', 'overdue']);
const STRONG_CREDIT = new Set(['AAA', 'AA', 'A']);

const amount = (value) => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(value)));
const emptyFlow = () => ({ inflow: 0, outflow: 0, financing: 0, profit: 0, messages: [] });
const emptyYear = (number, records = []) => ({ number, revenue: 0, profit: 0, deliveries: 0, late: 0, records });
const changeRep = (s, delta) => { s.company.rep = Math.max(0, Math.min(100, s.company.rep + delta)); };

export function newGame({ name = '我的贸易工作室', assistant = ASSISTANTS[0].id, seed = 1, era = '2026', difficulty = 'normal', origin = 'self-made' } = {}) {
  const normalizedName = typeof name === 'string' ? name.trim().slice(0, 32) : '';
  const assistantId = ASSISTANTS.find((item) => item.id === assistant)?.id ?? ASSISTANTS[0].id;
  const s = {
    v: 38, seed: Number.isSafeInteger(seed) ? seed >>> 0 : 1, week: 1, era, difficulty, origin,
    company: { name: normalizedName || '我的贸易工作室', rep: 60, certs: [], markets: ['domestic'] },
    assistant: assistantId, cash: 50000, loan: 0, creditLine: 20000, inquiries: [], bids: [], orders: [],
    receivables: [], payables: [], staff: [], rivals: [], macro: {}, events: [], queue: [],
    history: [], year: emptyYear(1), log: [], achievements: [], inventory: [], relationships: {},
    summary: null, bankrupt: false, negativeWeeks: 0, tutorial: { step: 0, done: false },
    period: emptyFlow(), sequence: 0,
  };
  s.inquiries = generateInquiries(s);
  return s;
}

export function netAssets(s) {
  const stock = s.inventory.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const due = s.receivables.reduce((sum, item) => sum + (OPEN_RECEIVABLE.has(item.status) ? item.amount : 0), 0);
  const unpaid = s.payables.reduce((sum, item) => sum + (item.paid ? 0 : item.amount), 0);
  const work = s.orders.reduce((sum, item) => sum + (ACTIVE_ORDER.has(item.status) ? item.costPaid - item.deposit : 0), 0);
  return s.cash + stock + due + work - unpaid - s.loan;
}

export function creditLimit(s) {
  const quality = s.receivables.reduce((sum, item) => (
    sum + (OPEN_RECEIVABLE.has(item.status) && STRONG_CREDIT.has(item.buyer.credit) ? item.amount : 0)
  ), 0);
  return amount(Math.max(0, netAssets(s)) * (0.22 + s.company.rep * 0.003) + quality * 0.22);
}

export const expediteFee = (order) => Math.max(250, amount(order.shipping * 0.25));
export const liquidationPrice = (item) => Math.max(1, amount(item.unitCost * 0.60));
export const lawsuitFee = (receivable) => Math.max(200, amount(receivable.amount * 0.05));

export function liquidationValue(s, productId, quantity) {
  let remaining = quantity;
  let proceeds = 0;
  for (const item of s.inventory) {
    if (item.productId !== productId) continue;
    const used = Math.min(remaining, item.quantity);
    remaining -= used;
    proceeds += liquidationPrice(item) * used;
    if (!remaining) break;
  }
  return proceeds;
}

function nextId(s, prefix) {
  s.sequence += 1;
  return `${prefix}-${s.sequence}`;
}

function log(s, type, text, flow = s.period) {
  s.log.unshift({ week: s.week, type, text });
  if (s.log.length > 320) s.log.pop();
  flow.messages.push(text);
}

function receive(s, flow, value) {
  const paid = amount(value);
  s.cash += paid;
  flow.inflow += paid;
  return paid;
}

function spend(s, flow, value) {
  const paid = amount(value);
  s.cash -= paid;
  flow.outflow += paid;
  return paid;
}

function schedulePayable(s, type, value, orderId) {
  if (value <= 0) return;
  s.payables.push({ id: nextId(s, 'pay'), type, amount: value, orderId, dueWeek: s.week, paid: false });
}

function consumeStock(s, productId, quantity) {
  const items = s.inventory.filter((item) => item.productId === productId);
  if (items.reduce((sum, item) => sum + item.quantity, 0) < quantity) return null;
  let left = quantity;
  let cost = 0;
  for (const item of items) {
    const used = Math.min(left, item.quantity);
    item.quantity -= used;
    cost += used * item.unitCost;
    left -= used;
    if (!left) break;
  }
  s.inventory = s.inventory.filter((item) => item.quantity > 0);
  return cost;
}

function placeOrder(s, flow, pitch, inquiry) {
  const fromStock = pitch.source === 'inventory';
  const cost = fromStock ? consumeStock(s, pitch.productId ?? inquiry.productId, pitch.quantity) : pitch.cost;
  if (cost === null) return null;
  const id = nextId(s, 'order');
  const order = {
    ...pitch, id, productId: inquiry.productId, productName: inquiry.productName,
    buyer: { ...inquiry.buyer }, market: inquiry.market, bidId: pitch.id,
    cost, profit: pitch.total - cost - pitch.shipping,
    status: 'procurement', contractWeek: s.week, productionLeft: pitch.productionWeeks,
    shippingLeft: pitch.shippingWeeks, penalty: 0, extraCost: 0,
    costPaid: fromStock ? cost : pitch.prepayment,
    supplierScheduled: fromStock, freightScheduled: false,
    lateWeeks: 0, deliveredWeek: null, disruptionChecked: false, expedited: false,
  };
  s.orders.push(order);
  receive(s, flow, order.deposit);
  spend(s, flow, order.prepayment);
  return order;
}

function closeBids(s, flow, assumeWins) {
  for (const bid of s.bids) {
    const inquiry = s.inquiries.find((item) => item.id === bid.inquiryId);
    if (!inquiry) continue;
    const result = assumeWins ? { won: true, winner: s.company.name, price: bid.unitPrice } : resolveBid(s, inquiry, bid);
    const order = result.won ? placeOrder(s, flow, bid, inquiry) : null;
    const record = { bidId: bid.id, inquiryId: inquiry.id, buyer: inquiry.buyer, winner: result.winner, price: result.price };
    if (order) {
      flow.won.push({ ...record, orderId: order.id });
      log(s, 'won', `拿到${inquiry.buyer.name}的订单，已收定金 ¥${order.deposit.toLocaleString('zh-CN')}。`, flow);
    } else {
      flow.lost.push({ ...record, won: false });
      log(s, 'lost', result.won ? `可用库存不足，${inquiry.buyer.name}的订单未能承接。` : `${inquiry.buyer.name}由${result.winner}以 ${result.price} 成交。`, flow);
    }
  }
  const closed = new Set(s.bids.map((bid) => bid.inquiryId));
  s.inquiries = s.inquiries.filter((item) => !closed.has(item.id));
  s.bids = [];
}

function applyPenalty(s, order, flow) {
  if (s.week <= order.dueWeek) return false;
  order.penalty += Math.min(order.total - order.penalty, amount(order.total * 0.03));
  order.lateWeeks += 1;
  changeRep(s, -2);
  if (order.lateWeeks === 1) s.year.late += 1;
  log(s, 'late', `${order.buyer.name}的订单逾期第 ${order.lateWeeks} 周，累计罚金 ¥${order.penalty.toLocaleString('zh-CN')}，信誉 −2。`, flow);
  if (order.lateWeeks < 4) return false;

  // Take delivery of the lot and pay its balance before adding the goods to inventory.
  if (!order.supplierScheduled) schedulePayable(s, 'supplier', order.cost - order.costPaid, order.id);
  const unitCost = amount(order.cost / order.quantity);
  s.inventory.push({ productId: order.productId, quantity: order.quantity, unitCost });
  spend(s, flow, order.deposit);
  order.profit = -(order.extraCost + (order.freightScheduled ? order.shipping : 0));
  flow.profit += order.profit;
  order.status = 'cancelled';
  order.cancelledWeek = s.week;
  changeRep(s, -4);
  log(s, 'cancelled', `${order.buyer.name}取消逾期订单，定金已退，货物转入库存。`, flow);
  return true;
}

function deliver(s, order, flow) {
  const bill = Math.max(0, order.total - order.penalty);
  const balance = bill - order.deposit;
  if (balance < 0) spend(s, flow, -balance);
  order.deliveredWeek = s.week;
  order.expectedPayWeek = s.week + order.terms;
  order.profit = bill - order.cost - order.shipping - order.extraCost;
  order.status = balance > 0 ? 'delivered' : 'settled';
  flow.revenue += bill;
  flow.profit += order.profit;
  flow.delivered.push(order.id);
  s.year.deliveries += 1;
  if (!order.lateWeeks) changeRep(s, 1);
  const relationship = s.relationships[order.buyer.id] ?? { deliveries: 0, rep: 0 };
  relationship.deliveries += 1;
  relationship.rep = Math.max(0, Math.min(100, relationship.rep + (order.lateWeeks ? -5 : 10)));
  s.relationships[order.buyer.id] = relationship;
  if (balance > 0) {
    s.receivables.push({
      id: nextId(s, 'invoice'), orderId: order.id, buyer: order.buyer, market: order.market,
      amount: balance, dueWeek: order.expectedPayWeek, originalDueWeek: order.expectedPayWeek,
      status: 'open', delays: 0, reminderWeek: null, financing: order.financing,
    });
  }
  log(s, 'delivered', `完成交付：${order.buyer.name}${balance > 0 ? `，预计第 ${order.expectedPayWeek} 周收到尾款` : '，款项已结清'}。`, flow);
}

function readyForTransit(s, order) {
  if (!order.supplierScheduled) {
    schedulePayable(s, 'supplier', order.cost - order.costPaid, order.id);
    order.supplierScheduled = true;
  }
  if (!order.freightScheduled) {
    schedulePayable(s, 'freight', order.shipping, order.id);
    order.freightScheduled = true;
  }
  order.status = 'transit';
}

function progressOrders(s, flow, projecting) {
  for (const order of s.orders) {
    if (!ACTIVE_ORDER.has(order.status) || order.contractWeek === s.week) continue;
    if (applyPenalty(s, order, flow)) continue;
    if (order.status === 'procurement') order.status = order.productionLeft > 0 ? 'production' : 'transit';
    if (order.status === 'production') {
      if (!order.disruptionChecked && order.source === 'factory') {
        order.disruptionChecked = true;
        if (random(s) < 0.13) {
          const delay = 1 + Math.floor(random(s) * 2);
          const fee = Math.max(300, amount(order.cost * 0.06));
          order.productionLeft += delay;
          if (!projecting) s.events.push({
            id: nextId(s, 'event'), type: 'factory-delay', title: '工厂排期延误',
            text: `${order.buyer.name}的货要晚 ${delay} 周。付 ¥${fee.toLocaleString('zh-CN')} 可以赶回原排期。`,
            orderId: order.id, delay, fee, choices: [{ id: 'rush', label: '付费赶工' }, { id: 'accept', label: '接受延期' }],
          });
          log(s, 'event', `${order.buyer.name}对应工厂通知将延迟交货。`, flow);
        }
      }
      order.productionLeft = Math.max(0, order.productionLeft - 1);
      if (!order.productionLeft) {
        readyForTransit(s, order);
        if (!order.shippingLeft) deliver(s, order, flow);
      }
      continue;
    }
    readyForTransit(s, order);
    order.shippingLeft = Math.max(0, order.shippingLeft - 1);
    if (!order.shippingLeft) deliver(s, order, flow);
  }
}

function finishPayment(s, item, flow, value, recovered = false) {
  const paid = receive(s, flow, value);
  item.status = recovered ? 'recovered' : 'paid';
  item.paidWeek = s.week;
  item.paidAmount = paid;
  const order = s.orders.find((candidate) => candidate.id === item.orderId);
  if (order && !recovered) order.status = 'settled';
  const correction = recovered ? paid : (paid - item.amount);
  if (order) order.profit += correction;
  flow.profit += correction;
  flow.collected.push({ id: item.id, amount: paid });
  log(s, 'collected', `${item.buyer.name}${recovered ? '诉讼追回' : '回款'} ¥${paid.toLocaleString('zh-CN')}。`, flow);
}

function progressReceivables(s, flow) {
  for (const item of s.receivables) {
    if (item.dueWeek > s.week) continue;
    if (item.status === 'lawsuit') {
      finishPayment(s, item, flow, item.amount * (0.3 + random(s) * 0.45), true);
      continue;
    }
    if (!OPEN_RECEIVABLE.has(item.status)) continue;
    const [onTime, defaultRisk] = CREDIT[item.buyer.credit] ?? CREDIT.BBB;
    const roll = random(s);
    if (roll < defaultRisk) {
      item.status = 'bad-debt';
      item.defaultWeek = s.week;
      flow.profit -= item.amount;
      const order = s.orders.find((candidate) => candidate.id === item.orderId);
      if (order) {
        order.status = 'bad-debt';
        order.profit -= item.amount;
      }
      log(s, 'bad-debt', `${item.buyer.name}无法支付尾款，可在订单页考虑诉讼。`, flow);
    } else if (roll > Math.min(0.995, onTime + (item.reminderDueWeek === s.week ? 0.16 : 0)) && item.delays < 2) {
      item.dueWeek = s.week + 1 + Math.floor(random(s) * 4);
      item.status = 'overdue';
      item.delays += 1;
      const order = s.orders.find((candidate) => candidate.id === item.orderId);
      if (order) order.expectedPayWeek = item.dueWeek;
      log(s, 'overdue', `${item.buyer.name}延后付款，预计第 ${item.dueWeek} 周回款。`, flow);
    } else finishPayment(s, item, flow, item.amount);
  }
}

function payBills(s, flow) {
  for (const item of s.payables) {
    if (item.paid || item.dueWeek > s.week) continue;
    spend(s, flow, item.amount);
    const order = s.orders.find((candidate) => candidate.id === item.orderId);
    if (order && item.type === 'supplier') order.costPaid += item.amount;
    item.paid = true;
  }
  s.payables = s.payables.filter((item) => !item.paid);
  const interest = amount(s.loan * WEEKLY_INTEREST);
  flow.profit -= spend(s, flow, FIXED_COST + interest);
}

function finance(s, flow) {
  const cover = Math.min(-s.cash, Math.max(0, s.creditLine - s.loan));
  if (cover > 0) {
    s.loan += receive(s, flow, cover);
    flow.financing += cover;
    log(s, 'loan', `自动动用授信 ¥${cover.toLocaleString('zh-CN')}。`, flow);
  }
  s.negativeWeeks = s.cash < 0 ? s.negativeWeeks + 1 : 0;
  if (s.negativeWeeks >= 2) {
    s.bankrupt = true;
    log(s, 'bankrupt', '现金连续两周为负，工作室停止经营。', flow);
  } else if (s.cash < 0) log(s, 'cash', '资金链告急。可清仓变卖库存，或通过催款争取及时回款。', flow);
}

function closeWeek(state, { assumeWins = false, projecting = false } = {}) {
  if (state.bankrupt || (!projecting && state.events.length)) return state;
  const s = structuredClone(state);
  const flow = { ...s.period, week: s.week, won: [], lost: [], delivered: [], collected: [], revenue: 0 };
  closeBids(s, flow, assumeWins);
  progressOrders(s, flow, projecting);
  progressReceivables(s, flow);
  payBills(s, flow);
  finance(s, flow);
  s.year.revenue += flow.revenue;
  s.year.profit += flow.profit;
  if (s.week % 52 === 0) {
    const { records, ...annual } = s.year;
    flow.annual = annual;
    s.year = emptyYear(s.year.number + 1, [...records, annual]);
  }
  s.history.push({
    week: s.week, cash: s.cash, loan: s.loan,
    receivables: s.receivables.reduce((sum, item) => sum + (OPEN_RECEIVABLE.has(item.status) ? item.amount : 0), 0),
    orders: s.orders.reduce((sum, item) => sum + (ACTIVE_ORDER.has(item.status) ? 1 : 0), 0),
    revenue: flow.revenue, profit: flow.profit, inflow: flow.inflow, outflow: flow.outflow, rep: s.company.rep,
  });
  s.summary = flow;
  s.period = emptyFlow();
  s.week += 1;
  s.creditLine = creditLimit(s);
  s.inquiries = s.inquiries.filter((item) => item.expiresWeek >= s.week);
  if (!s.bankrupt && !projecting) s.inquiries.push(...generateInquiries(s));
  return s;
}

export const endWeek = (state) => closeWeek(state);

export function forecast(state, draft) {
  let baseline = state;
  let hypothetical = structuredClone(state);
  if (draft && !draft.error && hypothetical.inquiries.some((item) => item.id === draft.inquiryId)) {
    hypothetical.bids = [...hypothetical.bids.filter((bid) => bid.inquiryId !== draft.inquiryId), { ...draft, id: 'draft' }];
  }
  return Array.from({ length: 12 }, (_, index) => {
    const before = baseline.period;
    const next = closeWeek(baseline, { projecting: true });
    hypothetical = closeWeek(hypothetical, { assumeWins: true, projecting: true });
    const flow = next === baseline ? emptyFlow() : next.summary;
    baseline = next;
    return {
      week: state.week + index,
      inflow: Math.max(0, flow.inflow - before.inflow),
      outflow: Math.max(0, flow.outflow - before.outflow),
      financing: Math.max(0, flow.financing - before.financing),
      cash: baseline.cash, hypothetical: hypothetical.cash,
    };
  });
}

function advanceFour(state) {
  let s = state;
  const weeks = [];
  for (let i = 0; i < 4; i += 1) {
    const next = endWeek(s);
    if (next === s) break;
    s = next;
    weeks.push(s.summary);
    if (s.bankrupt || s.cash < 0 || s.events.length || s.summary.annual || s.summary.won.length || s.summary.lost.length) break;
  }
  if (weeks.length > 1) s.summary = { ...s.summary, weeks };
  return s;
}

export function act(state, action = {}) {
  const fail = (error) => ({ state, error });
  if (action.type === 'end-week' || action.type === 'advance-four') {
    if (state.bankrupt) return fail('工作室已破产，请重新开局。');
    if (state.events.length) return fail('请先处理待决定事项。');
    return { state: action.type === 'end-week' ? endWeek(state) : advanceFour(state) };
  }
  if (state.bankrupt && action.type !== 'dismiss-summary') return fail('工作室已破产，请重新开局。');
  const s = structuredClone(state);
  const identifier = action.orderId ?? action.receivableId ?? action.eventId ?? action.id;
  switch (action.type) {
    case 'bid': {
      const inquiry = s.inquiries.find((item) => item.id === action.inquiryId);
      if (!inquiry) return fail('这条询盘已结束。');
      if (s.bids.length >= 3) return fail('本周三个报价位已用完。');
      if (s.bids.some((item) => item.inquiryId === inquiry.id)) return fail('已经提交过这条询盘。');
      const pitch = quote(s, inquiry, action);
      if (pitch.error) return fail(pitch.error);
      if (pitch.source === 'inventory') {
        const claimed = s.bids.filter((bid) => bid.source === 'inventory' && bid.productId === inquiry.productId).reduce((sum, bid) => sum + bid.quantity, 0);
        const stock = s.inventory.filter((item) => item.productId === inquiry.productId).reduce((sum, item) => sum + item.quantity, 0);
        if (stock < claimed + pitch.quantity) return fail('库存已预留给另一条报价。');
      }
      s.bids.push({ ...pitch, buyer: inquiry.buyer, productId: inquiry.productId, id: nextId(s, 'bid'), submittedWeek: s.week });
      break;
    }
    case 'withdraw-bid': {
      const index = s.bids.findIndex((item) => item.inquiryId === action.inquiryId || item.id === action.id);
      if (index < 0) return fail('找不到要撤回的报价。');
      s.bids.splice(index, 1);
      break;
    }
    case 'expedite': {
      const order = s.orders.find((item) => item.id === identifier && ACTIVE_ORDER.has(item.status));
      if (!order || order.expedited || order.shippingLeft <= 0) return fail('这笔订单无法再次加急。');
      const fee = expediteFee(order);
      if (s.cash < fee) return fail('现金不足以支付加急运费。');
      order.shippingLeft -= 1;
      order.expectedPayWeek = Math.max(s.week, order.expectedPayWeek - 1);
      order.extraCost += spend(s, s.period, fee);
      order.expedited = true;
      break;
    }
    case 'collect': {
      const item = s.receivables.find((record) => record.id === identifier && OPEN_RECEIVABLE.has(record.status));
      if (!item || item.reminderWeek === s.week) return fail('本周无法再次催收这笔应收。');
      item.reminderWeek = s.week;
      if (item.status === 'overdue') item.dueWeek = s.week;
      item.reminderDueWeek = item.dueWeek;
      const order = s.orders.find((candidate) => candidate.id === item.orderId);
      if (order) order.expectedPayWeek = item.dueWeek;
      const relationship = s.relationships[item.buyer.id];
      if (relationship) relationship.rep = Math.max(0, relationship.rep - 2);
      break;
    }
    case 'sue': {
      const item = s.receivables.find((record) => record.id === identifier && record.status === 'bad-debt');
      if (!item) return fail('只可对未追回的坏账提起诉讼。');
      const fee = lawsuitFee(item);
      if (s.cash < fee) return fail('现金不足以支付诉讼费。');
      s.period.profit -= spend(s, s.period, fee);
      item.status = 'lawsuit';
      item.dueWeek = s.week + 2 + Math.floor(random(s) * 3);
      break;
    }
    case 'resolve-event': {
      const index = s.events.findIndex((item) => item.id === identifier);
      if (index < 0) return fail('这条事项已经处理。');
      const event = s.events[index];
      if (!event.choices.some((option) => option.id === action.choice)) return fail('请选择一种处理方式。');
      if (event.type === 'factory-delay' && action.choice === 'rush') {
        const order = s.orders.find((item) => item.id === event.orderId);
        if (!order || s.cash < event.fee) return fail('现金不足以赶工。');
        order.productionLeft = Math.max(0, order.productionLeft - event.delay);
        order.extraCost += spend(s, s.period, event.fee);
      }
      s.events.splice(index, 1);
      break;
    }
    case 'borrow':
    case 'repay': {
      const value = Number(action.amount);
      if (!Number.isSafeInteger(value) || value <= 0) return fail('请输入正整数金额。');
      if (action.type === 'borrow') {
        if (value > s.creditLine - s.loan) return fail('借款超过本周剩余授信。');
        s.loan += receive(s, s.period, value);
        s.period.financing += value;
      } else {
        if (value > s.loan || value > s.cash) return fail('还款不能超过贷款余额或可用现金。');
        s.loan -= spend(s, s.period, value);
      }
      break;
    }
    case 'liquidate': {
      const reserved = s.bids.filter((bid) => bid.source === 'inventory' && bid.productId === action.productId).reduce((sum, bid) => sum + bid.quantity, 0);
      const available = s.inventory.filter((item) => item.productId === action.productId).reduce((sum, item) => sum + item.quantity, 0) - reserved;
      const quantity = Number(action.quantity ?? available);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > available) return fail('可清仓库存不足。');
      const proceeds = liquidationValue(s, action.productId, quantity);
      const cost = consumeStock(s, action.productId, quantity);
      s.period.profit += receive(s, s.period, proceeds) - cost;
      break;
    }
    case 'dismiss-summary': s.summary = null; break;
    case 'tutorial': {
      const step = Number(action.step ?? s.tutorial.step + 1);
      if (!Number.isSafeInteger(step) || step < 0 || step > 5) return fail('教程步骤无效。');
      s.tutorial = { step: Math.min(4, step), done: s.tutorial.done || Boolean(action.done) || step === 5 };
      break;
    }
    default: return fail('未知操作。');
  }
  return { state: s };
}
