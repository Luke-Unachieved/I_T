// Optional long-run functional verification: node tests/functional-play.mjs [weeks]
// This campaign uses only public game actions. It exercises one established
// policy in the 2001 scenario on casual difficulty, rather than tuning values.
import { act, forecast, netAssets, newGame } from '../v38/engine/game.js';
import { certProgress } from '../v38/engine/expansion.js';
import { quote } from '../v38/engine/quotes.js';
import { ipoProgress, ventureProgress } from '../v38/engine/strategy.js';

const weeks = Number(process.argv[2] ?? 520);
if (!Number.isSafeInteger(weeks) || weeks < 1 || weeks > 520) {
  throw new Error('Enter an integer between 1 and 520 weeks.');
}

let state = newGame({
  name: '远岸公司',
  assistant: 'liang',
  seed: 2087,
  era: '2001',
  origin: 'factory-heir',
  difficulty: 'casual',
});
let submitted = 0;
let ipoWeek = null;

function perform(action) {
  const result = act(state, action);
  if (result.error) return false;
  state = result.state;
  return true;
}

function resolveDecisions() {
  for (const event of [...state.events]) {
    const order = state.orders.find(item => item.id === event.orderId);
    const fallback = event.choices.at(-1).id;
    let choice = fallback;
    if (event.type === 'factory-delay' && order && order.deliverWeek + event.delay > order.dueWeek && state.cash > 25000) {
      choice = 'rush';
    } else if (event.type === 'staff-poach' && state.cash > 45000) {
      choice = 'retain';
    }
    if (!perform({ type: 'resolve-event', id: event.id, choice })) {
      perform({ type: 'resolve-event', id: event.id, choice: fallback });
    }
  }
  if (state.events.length) throw new Error(`Unresolved decision in week ${state.week}.`);
}

function manageCash() {
  if (state.energy < 42 && state.cash > 18000) perform({ type: 'outing', id: 'flower-market' });
  if (state.cash < 13000) {
    const bills = state.receivables.filter(bill => ['open', 'overdue'].includes(bill.status));
    for (const bill of bills.sort((a, b) => b.amount - a.amount).slice(0, 3)) {
      perform({ type: 'factor', receivableId: bill.id });
    }
    if (state.cash < 14000 && state.creditLine > state.loan) {
      perform({ type: 'borrow', amount: Math.min(9000, state.creditLine - state.loan) });
    }
  } else if (state.cash > 95000 && state.loan > 0) {
    perform({ type: 'repay', amount: state.loan });
  }
}

function expandBusiness() {
  for (const cert of certProgress(state, netAssets(state))) {
    if (cert.available && state.cash > 55000 + cert.fee) perform({ type: 'buy-cert', id: cert.id });
  }
  for (const id of ['se-asia', 'east-asia', 'europe']) {
    const reserve = id === 'se-asia' ? 85000 : 180000;
    if (!state.company.markets.includes(id) && state.cash > reserve) perform({ type: 'open-market', id });
  }
  for (const id of ['warehouse', 'brand', 'ecommerce']) {
    const option = ventureProgress(state).find(venture => venture.id === id).options[0];
    const [ceiling, reserve] = id === 'warehouse' ? [1, 48000] : [3, 68000];
    if (option.available && option.level < ceiling && state.cash > option.nextCost + reserve) {
      perform({ type: 'invest-venture', id });
    }
  }
  if (!state.staff.some(person => person.role === 'operations') && state.cash > 85000) {
    const candidate = state.candidates.find(person => person.role === 'operations');
    if (candidate) perform({ type: 'hire', id: candidate.id });
  }
}

function bestProposal(inquiry) {
  const pricing = [82, 85, 88, 91, 94, 97].map(ratio => ({ ratio }));
  if (state.ventures.brand) {
    for (const ratio of [1.25, 1.55, 1.85, 2.15]) {
      pricing.push({ branded: true, brandUnitPrice: Math.round(inquiry.targetPrice * ratio) });
    }
  }
  let best;
  for (const source of ['stock', 'factory', 'inventory']) {
    for (const options of pricing) {
      const proposal = quote(state, inquiry, { source, ...options });
      if (proposal.error || proposal.profit <= 500 || proposal.probability < 0.17 || proposal.workingCapital > state.cash * 0.35) continue;
      const duration = proposal.terms + proposal.shippingWeeks + proposal.productionWeeks;
      const credit = inquiry.buyer.credit === 'B' ? 0.8 : 1;
      const score = proposal.profit * proposal.probability * credit / (1 + duration * 0.055);
      if (!best || best.score < score) best = { proposal, options, score };
    }
  }
  return best;
}

while (state.week <= weeks && !state.bankrupt) {
  resolveDecisions();
  manageCash();
  const next = ipoProgress(state, netAssets(state)).actions.find(step => step.available);
  if (next && perform({ type: next.id }) && next.id === 'ipo') {
    ipoWeek = state.week;
    continue;
  }
  expandBusiness();
  for (const bill of state.receivables.filter(bill => bill.status === 'overdue')) {
    perform({ type: 'collect', receivableId: bill.id });
  }
  const bids = state.inquiries.map(bestProposal).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);
  for (const { proposal, options } of bids) {
    if (state.bids.length >= 3) break;
    if (forecast(state, proposal).some(week => week.hypothetical < 0)) continue;
    if (perform({ type: 'bid', inquiryId: proposal.inquiryId, source: proposal.source, ...options })) submitted += 1;
  }
  if (!perform({ type: 'end-week' })) throw new Error(`Unable to close week ${state.week}.`);
  if (state.week % 52 === 1 || state.bankrupt) {
    console.log(JSON.stringify({
      week: state.week,
      cash: state.cash,
      annual: state.year.records.at(-1),
      listing: state.listing.stage,
    }));
  }
}

console.log(JSON.stringify({
  weeksCompleted: state.week - 1,
  ipoWeek,
  bankrupt: state.bankrupt,
  quotes: submitted,
  deliveries: state.orders.filter(order => order.deliveredWeek).length,
}));
if (state.bankrupt || (weeks === 520 && !ipoWeek)) process.exitCode = 1;
