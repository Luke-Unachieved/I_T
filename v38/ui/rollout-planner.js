import { act, canExpedite, expediteFee } from '../engine/game.js';
import { decisionInfo, marketProgress } from '../engine/expansion.js';
import { quote } from '../engine/quotes.js';
import { VENTURES, strategyAssets } from '../engine/strategy.js';
import { lifeAssets } from '../engine/life.js';
import { ACTIVE_ORDER, OPEN_RECEIVABLE, orderMargin, receivableValue } from '../engine/treasury.js';

// Common, representative scenario seeds independent of the saved game's RNG.
// Every finalist sees the same samples. Choices can react only to the state
// generated so far, never to the next random result in that sample.
export const ROLLOUT_SEEDS = Object.freeze([0x7f4a7c15, 0xbf58476d, 0xa511e9b3]);
export const ROLLOUT_WEEKS = 4;
const INQUIRY_LIMIT = 24;
const EVENT_LIMIT = 12;
const cache = new WeakMap();
const creditRisk = { AAA: .002, AA: .004, A: .01, BBB: .025, BB: .055, B: .12 };
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const mean = values => values.reduce((total, n) => total + n, 0) / Math.max(1, values.length);
const risk = (state, deal) => deal.financing === 'letter-of-credit' ? .001 : clamp((creditRisk[deal.buyer?.credit] ?? .025) * (state.riskMultiplier ?? 1), 0, .8);
const recovery = (state, deal) => 1 - risk(state, deal) * (1 - clamp(deal.insuredRecovery ?? 0, 0, 1));
const timeDiscount = (state, due) => 1 + Math.max(0, (due ?? state.week) - state.week) * .025;

// A long-running firm can have thousands of full records cloned by each real
// reducer call. Narrow the search width in that case, not the number of weeks
// played. Both budgets still compare multiple independent scenario paths.
export function rolloutBudget(state) {
  const heavy = state.orders.length + state.receivables.length >= 600 || state.history.length >= 750;
  return heavy ? { scenarioCount: 2, futureBidLimit: 2, currentPlans: 3, beamWidth: 3, branchLimit: 7, branchAllowance: 14 }
    : { scenarioCount: 3, futureBidLimit: 3, currentPlans: 4, beamWidth: 4, branchLimit: 10, branchAllowance: 24 };
}

export function quoteExpectedProfit(state, offer) {
  const expectedLoss = Math.max(0, offer.total - offer.deposit) * (1 - recovery(state, offer));
  return clamp(offer.probability, 0, 1) * (offer.profit + (offer.rebateEstimate ?? 0) - expectedLoss);
}

function reserveFor(state, requested = 0) {
  const wages = state.staff.reduce((sum, person) => sum + person.salary, 0);
  const upkeep = VENTURES.reduce((sum, item) => {
    const levels = state.ventures[item.id];
    return sum + item.upkeep * (typeof levels === 'number' ? levels : Object.values(levels ?? {}).reduce((total, level) => total + level, 0));
  }, 0);
  return Math.max(5000, requested, 4 * (1200 + wages + upkeep));
}

// Conservative future policy: count all outstanding procurement, freight,
// invoiceable commission and already-proposed working capital. Don't assume
// that a customer will pay in time to fund the next new contract.
function obligations(state) {
  let total = state.payables.reduce((sum, item) => sum + (item.paid ? 0 : item.amount), 0);
  for (const order of state.orders) {
    if (!ACTIVE_ORDER.has(order.status)) continue;
    if (!order.supplierScheduled) total += Math.max(0, order.cost - order.costPaid);
    if (!order.freightScheduled) total += order.shipping;
    total += orderMargin(state, order).commission;
  }
  for (const bid of state.bids) total += Math.max(0, bid.workingCapital ?? bid.upfront ?? 0);
  return total;
}
const spare = (state, reserve) => Math.max(0, state.cash - reserveFor(state, reserve) - obligations(state));

// Conservative mark-to-recoverable-value at the horizon. Cash/debt and bills
// already paid are not counted twice: only remaining flows of active orders,
// outstanding receivables, scheduled receipts and recoverable asset values.
function terminalValue(state) {
  let value = state.cash - state.loan - state.payables.reduce((sum, item) => sum + (item.paid ? 0 : item.amount), 0);
  value += state.inventory.reduce((sum, item) => sum + item.quantity * item.unitCost * .65, 0);
  value += strategyAssets(state) * .65 + lifeAssets(state) * .65;
  for (const item of state.receivables) {
    if (OPEN_RECEIVABLE.has(item.status)) {
      const amount = receivableValue(state, item);
      const discount = timeDiscount(state, item.dueWeek) * (item.status === 'overdue' ? 1.08 : 1);
      value += amount * recovery(state, item) / discount;
    } else if (item.status === 'lawsuit') value += item.amount * .5 / timeDiscount(state, item.dueWeek);
  }
  for (const item of state.queue) {
    if (['export-refund', 'insurance'].includes(item.type)) value += item.amount / timeDiscount(state, item.dueWeek);
  }
  for (const order of state.orders) {
    if (!ACTIVE_ORDER.has(order.status)) continue;
    const { bill, commission } = orderMargin(state, order);
    const late = Math.max(0, (order.deliverWeek ?? state.week) - order.dueWeek);
    const adjusted = Math.max(0, bill - Math.max(0, late - (order.lateWeeks ?? 0)) * order.total * .03);
    const unpaidCost = order.supplierScheduled ? 0 : Math.max(0, order.cost - order.costPaid);
    const freight = order.freightScheduled ? 0 : order.shipping;
    if (late >= 4) {
      // On cancellation the deposit is refunded; undelivered stock can be
      // recovered only at a haircut. Do not mark the contract's tail as cash.
      value += order.cost * .65 - unpaidCost - order.deposit;
      continue;
    }
    const balance = adjusted - order.deposit;
    const receipt = balance > 0 ? balance * recovery(state, order) / timeDiscount(state, order.expectedPayWeek) : balance;
    value += receipt - unpaidCost - freight - commission + adjusted * (order.rebateRate ?? 0) / timeDiscount(state, (order.deliverWeek ?? state.week) + 4);
  }
  return value;
}

function shortlistedInquiries(state) {
  const submitted = new Set(state.bids.map(bid => bid.inquiryId));
  // When a very busy company has accumulated a long inbox, consider soonest
  // expiring opportunities first, interleaving affordable and larger offers.
  const eligible = state.inquiries.filter(inquiry => !submitted.has(inquiry.id) && inquiry.expiresWeek >= state.week);
  if (eligible.length <= INQUIRY_LIMIT) return eligible;
  const cheap = [...eligible].sort((a, b) => a.quantity * a.targetPrice - b.quantity * b.targetPrice);
  const expiring = [...eligible].sort((a, b) => a.expiresWeek - b.expiresWeek || b.quantity * b.targetPrice - a.quantity * a.targetPrice);
  return [...new Map([...expiring.slice(0, 12), ...cheap.slice(0, 12), ...expiring].map(inquiry => [inquiry.id, inquiry])).values()].slice(0, INQUIRY_LIMIT);
}

function nextQuote(state, reserve) {
  if (state.bids.length >= 3) return null;
  const room = spare(state, reserve);
  if (state.cash < reserveFor(state, reserve)) return null;
  let best = null;
  const sales = state.staff.filter(person => person.role === 'sales').sort((a, b) => b.ability - a.ability).slice(0, 1);
  const staffOptions = [null, ...sales.map(person => person.id)];
  const inventory = new Set(state.inventory.map(item => item.productId));
  for (const inquiry of shortlistedInquiries(state)) {
    const sources = inventory.has(inquiry.productId) ? ['inventory', 'stock', 'factory'] : ['stock', 'factory'];
    const edge = Math.floor((Math.min(inquiry.targetPrice, ...inquiry.rivals.map(rival => rival.price)) - 1) * 100 / inquiry.targetPrice);
    const ratios = [...new Set([80, 90, 95, 100, edge, edge + 1].filter(n => n >= 80 && n <= 100))];
    const financing = inquiry.currency !== 'CNY' ? ['standard', 'letter-of-credit', 'insured'] : ['standard'];
    const consider = config => {
      const offer = quote(state, inquiry, config);
      if (offer.error || offer.profit <= 0 || offer.probability <= 0 || offer.workingCapital > room || offer.upfront > room) return;
      const expected = quoteExpectedProfit(state, offer);
      if (!(expected > 0)) return;
      const score = expected / (1 + Math.max(0, offer.expectedPayWeek - state.week) * .055 + offer.workingCapital / Math.max(1, room) * .3);
      if (!best || score > best.score) best = { inquiry, config, score, expected, offer };
    };
    for (const source of sources) {
      for (const ratio of ratios) for (const staffId of staffOptions) for (const finance of financing) {
        consider({ source, ratio, staffId, financing: finance, extraTerms: 0 });
      }
      if (state.company.certs.includes('brand')) for (const ratio of [110, 140, 160]) {
        consider({ source, branded: true, brandUnitPrice: Math.max(1, Math.round(inquiry.targetPrice * ratio / 100)) });
      }
    }
  }
  return best;
}

function eventChoices(state, event, reserve, remaining) {
  const { choices } = decisionInfo(state, event);
  const order = state.orders.find(item => item.id === event.orderId);
  const invoice = state.receivables.find(item => item.id === event.invoiceId);
  const safety = spare(state, reserve);
  return choices.map(choice => {
    const impact = choice.impact ?? {};
    const cost = Math.max(0, -(impact.cash ?? 0));
    let score = -cost + (impact.reputation ?? 0) * 55 + (choice.relationship ?? 0) * 12 + (choice.collection ?? 0) * (invoice?.amount ?? 0) * .35;
    if (Number.isFinite(impact.profit) && order) {
      score += impact.profit - order.profit;
      // The preview already includes direct costs in profit. Add them back
      // to avoid double-counting, then account for later penalty and payment.
      score += cost;
      score -= Math.max(0, (impact.deliveryWeek ?? order.deliverWeek) - order.dueWeek) * order.total * .03;
      score -= Math.max(0, (impact.paymentWeek ?? order.expectedPayWeek) - state.week) * Math.max(0, order.total - order.deposit) * .006;
      if (impact.cancelWeek) score -= Math.abs(order.total) * .5;
    }
    if (choice.invoiceDelay) score -= choice.invoiceDelay * (invoice?.amount ?? 0) * .02;
    if (choice.lead || (event.type === 'key-client' && choice.id === 'contact')) score += 150;
    if (choice.policy?.interestDelta < 0) score += state.loan * Math.abs(choice.policy.interestDelta) * Math.min(remaining, choice.policy.weeks ?? 0);
    if (choice.stockLoss) score -= state.inventory.filter(item => item.productId === event.productId).reduce((sum, item) => sum + item.quantity * item.unitCost * choice.stockLoss, 0);
    if (event.type === 'staff-poach' && choice.id === 'retain') {
      const member = state.staff.find(person => person.id === event.staffId);
      const raise = Math.max(0, (event.raise ?? 0) - (member?.salary ?? 0));
      score += (member?.ability ?? 0) * 35 - raise * remaining;
      if (raise * remaining > safety) score -= 100000;
    }
    if (cost > state.cash) score -= 1e12;
    if (cost > safety) score -= 100000 + cost;
    return { choice, score };
  }).sort((a, b) => b.score - a.score).map(item => item.choice.id);
}

function resolveEvents(state, reserve, remaining, actions) {
  let next = state;
  for (let count = 0; next.events.length && count < EVENT_LIMIT; count++) {
    const event = next.events[0];
    let handled = false;
    for (const choice of eventChoices(next, event, reserve, remaining)) {
      const result = act(next, { type: 'resolve-event', eventId: event.id, choice });
      if (result.error || result.state === next) continue;
      next = result.state;
      actions.push({ type: 'resolve-event', eventId: event.id, choice });
      handled = true;
      break;
    }
    if (!handled) break;
  }
  return next;
}

function continueBusiness(state, requested, actions, marketOpened, allowDevelopment, futureBidLimit) {
  let next = state;
  const apply = action => {
    const result = act(next, action);
    if (result.error || result.state === next) return false;
    next = result.state; actions.push(action); return true;
  };
  for (const invoice of next.receivables.filter(item => item.status === 'overdue' && item.reminderWeek !== next.week).slice(0, 2)) {
    apply({ type: 'collect', receivableId: invoice.id });
  }
  for (const order of next.orders.filter(item => ACTIVE_ORDER.has(item.status) && item.deliverWeek > item.dueWeek && canExpedite(next, item)).slice(0, 2)) {
    const fee = expediteFee(order);
    if (fee < order.total * .03 && fee <= spare(next, requested)) apply({ type: 'expedite', orderId: order.id });
  }
  // A modest follow-through step for an actually unlocked market allows a
  // qualification to generate new business during later sampled rounds.
  // Do not force an expansion by consuming the working-capital reserve.
  if (allowDevelopment && !marketOpened) {
    const room = spare(next, requested);
    const eligible = marketProgress(next).filter(item => !item.opened && item.eligible && item.canPay && item.fee <= room * .28)
      .sort((a, b) => a.fee - b.fee);
    if (eligible[0] && apply({ type: 'open-market', id: eligible[0].id })) marketOpened = true;
  }
  for (let index = 0; index < futureBidLimit && next.bids.length < 3; index++) {
    const candidate = nextQuote(next, requested);
    if (!candidate) break;
    if (!apply({ type: 'bid', inquiryId: candidate.inquiry.id, ...candidate.config })) break;
  }
  return { state: next, marketOpened };
}

function simulate(initial, seed, horizon, requested, futurePolicy, futureBidLimit, continueCurrentWeek) {
  // Clone first. The live state, saved seed, history and pending interface
  // actions are never mutated by a rollout.
  let state = structuredClone({ ...initial, seed });
  let minCash = state.cash, maxLoan = state.loan, profit = 0, marketOpened = false, blocked = false;
  let futureBids = 0, futureBidWeeks = 0, futureActions = 0, eventActions = 0, won = 0, delivered = 0, collected = 0;
  const rounds = [];
  const startingValue = terminalValue(state);
  const initialReserve = reserveFor(state, requested);
  for (let round = 0; round < horizon && !state.bankrupt; round++) {
    const week = state.week;
    const actions = [];
    state = resolveEvents(state, requested, horizon - round, actions);
    if (state.events.length) { blocked = true; break; }
    eventActions += actions.length;
    if ((round > 0 || continueCurrentWeek) && futurePolicy) {
      const before = actions.length;
      const continuation = continueBusiness(state, requested, actions, marketOpened, round > 0 && round < horizon - 1, futureBidLimit);
      state = continuation.state; marketOpened = continuation.marketOpened;
      const bids = actions.slice(before).filter(action => action.type === 'bid').length;
      futureBids += bids; futureActions += actions.length - before;
      if (bids) futureBidWeeks++;
    }
    minCash = Math.min(minCash, state.cash);
    const result = act(state, { type: 'end-week' });
    if (result.error || result.state === state || result.state.week !== week + 1) { blocked = true; break; }
    state = result.state;
    const summary = state.summary;
    minCash = Math.min(minCash, state.cash); maxLoan = Math.max(maxLoan, state.loan);
    profit += summary.profit;
    won += summary.won.length; delivered += summary.delivered.length; collected += summary.collected.length;
    rounds.push({ week, actions, cash: state.cash, loan: state.loan, profit: summary.profit, won: summary.won.length,
      delivered: summary.delivered.length, collected: summary.collected.length, nextInquiries: state.inquiries.length });
  }
  const finalValue = terminalValue(state);
  // Terminal option value uses the next currently generated opportunity, not
  // knowledge of its next outcome. It helps distinguish a flexible position
  // from one where all available cash is immobilized in unfinished business.
  const opportunity = state.bankrupt || blocked ? 0 : (nextQuote(state, requested)?.expected ?? 0);
  const target = Math.max(initialReserve, reserveFor(state, requested));
  const shortage = Math.max(0, target - minCash);
  const debtStress = Math.max(0, maxLoan - initial.loan);
  const distress = (state.bankrupt || blocked ? Math.max(100000, Math.abs(startingValue) * 2) : 0);
  const score = finalValue + .12 * profit + .25 * opportunity + .04 * Math.min(target * 2, Math.max(0, minCash - target))
    - 1.25 * shortage - .3 * debtStress - distress;
  return { score, rounds, completedRounds: rounds.length, futureBids, futureBidWeeks, futureActions, eventActions, won, delivered, collected,
    operatingProfit: profit, finalValue, netDelta: finalValue - startingValue, minCash, finalCash: state.cash, maxLoan, finalLoan: state.loan,
    opportunity, bankrupt: Boolean(state.bankrupt), blocked };
}

/** Score an already executable current action/bundle by playing actual future
 * rounds with a bounded continuation policy. The return values describe only
 * sampled hypothetical games; none of these future actions are carried out in
 * the player's real save. Higher score is better (yuan-equivalent).
 */
export function evaluateRollouts(initialState, { horizon = ROLLOUT_WEEKS, seeds, reserve = 0, futurePolicy = true, continueCurrentWeek = false } = {}) {
  const rounds = clamp(Math.floor(horizon) || ROLLOUT_WEEKS, ROLLOUT_WEEKS, 6);
  const budget = rolloutBudget(initialState);
  const selectedSeeds = seeds === undefined ? ROLLOUT_SEEDS.slice(0, budget.scenarioCount) : [...seeds].slice(0, 3);
  if (!selectedSeeds.length || selectedSeeds.some(seed => !Number.isSafeInteger(seed))) throw new TypeError('Rollout scenarios need independent integer seeds');
  const requested = Math.max(0, Number.isFinite(reserve) ? reserve : 0);
  const key = JSON.stringify([rounds, selectedSeeds, requested, Boolean(futurePolicy), budget.futureBidLimit, Boolean(continueCurrentWeek)]);
  let results = cache.get(initialState);
  if (!results) { results = new Map(); cache.set(initialState, results); }
  if (results.has(key)) return results.get(key);
  const scenarios = selectedSeeds.map(seed => simulate(initialState, seed >>> 0, rounds, requested, futurePolicy, budget.futureBidLimit, continueCurrentWeek));
  const average = field => mean(scenarios.map(scenario => scenario[field]));
  const report = {
    horizon: rounds, scenarioCount: scenarios.length, futureBidLimit: budget.futureBidLimit, scenarios,
    score: average('score'), averageNetDelta: average('netDelta'), averageFinalValue: average('finalValue'), averageOperatingProfit: average('operatingProfit'),
    averageFinalCash: average('finalCash'), averageFinalLoan: average('finalLoan'), minCash: Math.min(...scenarios.map(item => item.minCash)),
    futureBids: scenarios.reduce((sum, item) => sum + item.futureBids, 0), futureBidWeeks: scenarios.reduce((sum, item) => sum + item.futureBidWeeks, 0),
    futureActions: scenarios.reduce((sum, item) => sum + item.futureActions, 0), eventActions: scenarios.reduce((sum, item) => sum + item.eventActions, 0),
    futureWeeks: scenarios.reduce((sum, item) => sum + Math.max(0, item.completedRounds - 1), 0), completedRounds: scenarios.reduce((sum, item) => sum + item.completedRounds, 0),
    bankruptCount: scenarios.filter(item => item.bankrupt).length, blockedCount: scenarios.filter(item => item.blocked).length,
    continuationOpportunity: average('opportunity'),
  };
  results.set(key, report);
  return report;
}
