import { act, forecast } from '../engine/game.js';
import { VENTURES } from '../engine/strategy.js';
import { plannerForecast } from './quote-planner.js';
import { evaluateRollouts } from './rollout-planner.js';

const DEVELOPMENT_ACTIONS = new Set([
  'hire', 'dismiss-staff', 'repay', 'buy-cert', 'open-market', 'referral', 'exhibit',
  'invest-venture', 'strategic-investment', 'restructure', 'ipo',
]);
const MAX_CANDIDATES = 24;
const MAX_ROLLOUT_CANDIDATES = 3;
const rolloutCache = new WeakMap();
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);

export function operatingReserve(state) {
  let weekly = 1200 + state.staff.reduce((total, person) => total + person.salary, 0);
  for (const item of VENTURES) {
    const holdings = state.ventures[item.id];
    const levels = typeof holdings === 'number' ? holdings : Object.values(holdings).reduce((total, level) => total + level, 0);
    weekly += levels * item.upkeep;
  }
  return Math.max(5000, weekly * 4);
}

function projection(state, rows) {
  const valid = rows.length === 12 && rows.every((row) => [row.cash, row.hypothetical, row.inflow, row.outflow, row.financing].every(Number.isFinite));
  if (!valid) return null;
  const inflow = sum(rows, 'inflow');
  const outflow = sum(rows, 'outflow');
  const borrowing = sum(rows, 'financing');
  const settledFloor = Math.min(state.cash, ...rows.map((row) => row.cash));
  const pendingFloor = Math.min(state.cash, ...rows.map((row) => row.hypothetical));
  return {
    cashFloor: Math.min(settledFloor, pendingFloor), settledFloor, pendingFloor,
    endingCash: Math.min(rows.at(-1).cash, rows.at(-1).hypothetical),
    inflow, outflow, borrowing, loan: state.loan, operatingNet: inflow - borrowing - outflow,
    reserve: operatingReserve(state),
  };
}

function strategyValue(candidate) {
  return Number.isFinite(candidate.strategicValue) ? clamp(candidate.strategicValue, 0, 100) : 0;
}

function multiweekProjection(live, sample, action, reserve) {
  let entries = rolloutCache.get(live);
  if (!entries) { entries = new Map(); rolloutCache.set(live, entries); }
  const key = JSON.stringify([reserve, action?.type ?? 'defer', action?.id, action?.target, action?.amount]);
  if (!entries.has(key)) entries.set(key, evaluateRollouts(sample, { reserve, horizon: 4, continueCurrentWeek: true }));
  return entries.get(key);
}

function maximumNewDebt(rollout, startingLoan) {
  return Math.max(0, ...rollout.scenarios.map(item => item.maxLoan - startingLoan));
}

function longerTermAllowance(choice, after) {
  // A four-week sample cannot fully value a staged market or listing unlock.
  // Only an explicitly evidenced strategic candidate gets a bounded allowance,
  // and only for the type of value its current action genuinely creates.
  const tolerance = Math.min(1000, choice.reserve * .04);
  if (choice.action.type === 'repay' && choice.loanDelta < 0 && choice.scenarioOperatingDelta > 0 &&
      choice.scenarioFloor >= choice.reserve * 2 && choice.upfront <= (choice.scenarioFloor - choice.reserve) * .05) {
    // A modest repayment with a robust cash cushion and known interest savings
    // may change one of a few sampled bids around an affordability threshold.
    // Allow noise bounded by the payment itself and the neutral interest gain.
    // The separate distress/debt/liquidity veto still applies unconditionally.
    return Math.max(tolerance, Math.min(1000, choice.upfront + choice.scenarioOperatingDelta));
  }
  if (choice.longTermUnlock && ['buy-cert', 'restructure'].includes(choice.action.type)) {
    // Certification scenarios may actually pay the already-budgeted market
    // opening fee in a subsequent round. Treat that known cost as part of the
    // same verified strategic objective, with limited timing uncertainty.
    const staged = Math.max(choice.upfront, Math.min(Number.isFinite(choice.longTermCost) ? choice.longTermCost : choice.upfront, choice.upfront * 4));
    return staged + Math.min(choice.reserve * .02, staged * .2) + tolerance;
  }
  if (choice.longTermEvidence && ['open-market', 'referral'].includes(choice.action.type)) return choice.upfront * .7 + tolerance;
  if (choice.longTermEvidence && choice.action.type === 'invest-venture') return choice.upfront * .35 + tolerance;
  if (choice.longTermEvidence && choice.action.type === 'hire') {
    const wage = after.staff.find(person => person.id === choice.action.id)?.salary ?? 0;
    // History-based marginal role benefit can exceed the limited future-bid
    // sample. Only allow its actual four-week payroll when that evidence
    // exceeds the known recurring cost; never weaken liquidity rejection.
    if (wage > 0 && Number.isFinite(choice.expectedWeeklyBenefit) && choice.expectedWeeklyBenefit >= wage * 1.15) return wage * 4 + tolerance;
  }
  return tolerance;
}

// Safety projections count signed commitments and the all-existing-bids-win case.
// Only after they pass do bounded independent scenarios sample actual subsequent
// business. No recommendation relies on those new orders coming true.
export function planDevelopment(state, candidates, { reserve = 0 } = {}) {
  const baseline = projection(state, forecast(state));
  const scenario = projection(state, plannerForecast(state));
  if (!baseline || !scenario) return { baseline, choices: [], rejected: [] };
  const prudentialReserve = Math.max(baseline.reserve, Number.isFinite(reserve) ? reserve : 0);
  baseline.reserve = prudentialReserve;
  const choices = [];
  const successors = new Map();
  const rejected = [];
  const ranked = [...candidates].map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => strategyValue(b.candidate) - strategyValue(a.candidate) || a.index - b.index);
  const reject = (candidate, reason) => rejected.push({ candidate, reason });
  for (const [index, { candidate }] of ranked.entries()) {
    const action = candidate.action;
    if (!action || !DEVELOPMENT_ACTIONS.has(action.type)) {
      reject(candidate, '这里只比较真实的发展或还款操作，不用新贷款支持扩张。');
      continue;
    }
    if (index >= MAX_CANDIDATES) {
      reject(candidate, '本次仅比较有限数量的优先候选。');
      continue;
    }
    if (state.bankrupt || state.events.length) {
      reject(candidate, state.bankrupt ? '本局已结束。' : '先处理待决定事项，再判断发展资金。');
      continue;
    }
    const result = act(state, action);
    if (result.error) {
      reject(candidate, result.error);
      continue;
    }
    const neutral = projection(result.state, plannerForecast(result.state));
    if (!neutral) {
      reject(candidate, '暂时无法完成这项操作的现金预测。');
      continue;
    }
    const required = Math.max(prudentialReserve, neutral.reserve);
    if (result.state.loan > state.loan || neutral.borrowing > 0) {
      reject(candidate, '按当前现金预测，此项操作需要动用借款。');
      continue;
    }
    if (neutral.cashFloor < required) {
      reject(candidate, '考虑现有承诺和待揭晓报价，未来余额会低于经营预留。');
      continue;
    }
    // The game's own forecast supplies player-visible figures and a second
    // safety veto. Ordering never uses the hidden upcoming random draws.
    const next = projection(result.state, forecast(result.state));
    if (!next) {
      reject(candidate, '暂时无法完成这项操作的现金预测。');
      continue;
    }
    if (next.borrowing > 0 || next.cashFloor < required) {
      reject(candidate, next.borrowing > 0 ? '按当前现金预测，此项操作需要动用借款。' : '考虑现有承诺和待揭晓报价，未来余额会低于经营预留。');
      continue;
    }
    const floorDelta = next.cashFloor - baseline.cashFloor;
    const loanDelta = result.state.loan - state.loan;
    const endingDelta = next.endingCash - baseline.endingCash;
    const operatingDelta = next.operatingNet - baseline.operatingNet;
    const stakeDelta = (result.state.listing.stake ?? 100) - (state.listing.stake ?? 100);
    const cashDelta = result.state.cash - state.cash;
    const scenarioDelta = neutral.cashFloor - scenario.cashFloor;
    const scenarioOperatingDelta = neutral.operatingNet - scenario.operatingNet;
    const denominator = Math.max(required, scenario.cashFloor);
    // Compare plausible strategic benefits, liquidity loss and recurring cash costs. Keep uncertain
    // forecast differences bounded so a particular simulated payment date cannot dominate advice.
    const score = strategyValue(candidate)
      + 22 * clamp(scenarioDelta / denominator, -1, 1)
      + 8 * clamp((neutral.cashFloor - required) / required, 0, 2)
      + 12 * clamp(scenarioOperatingDelta / required, -0.5, 0.5)
      + 12 * clamp(-loanDelta / Math.max(required, state.loan), 0, 1)
      - Math.max(0, -stakeDelta) * 0.15;
    const choice = { ...candidate, ...next, action, reserve: required,
      cashDelta, upfront: Math.max(0, -cashDelta), floorDelta, endingDelta,
      inflowDelta: next.inflow - baseline.inflow, outflowDelta: next.outflow - baseline.outflow,
      operatingDelta, loanDelta, stakeDelta, scenarioFloor: neutral.cashFloor, scenarioOperatingDelta, score };
    choices.push(choice);
    successors.set(choice, result.state);
  }
  choices.sort((a, b) => b.score - a.score || b.scenarioFloor - a.scenarioFloor || a.upfront - b.upfront);
  if (!choices.length) return { baseline, choices, rejected };

  // Compare a small, economically ranked shortlist against doing nothing now
  // and continuing ordinary business in the *same* sampled future weeks.
  const deferred = multiweekProjection(state, state, null, prudentialReserve);
  const baselineDebt = maximumNewDebt(deferred, state.loan);
  const accepted = [];
  for (const choice of choices.slice(0, MAX_ROLLOUT_CANDIDATES)) {
    const after = successors.get(choice);
    const rollout = multiweekProjection(state, after, choice.action, prudentialReserve);
    const delta = rollout.score - deferred.score;
    if (!Number.isFinite(delta) || rollout.bankruptCount > deferred.bankruptCount || rollout.blockedCount > deferred.blockedCount ||
        maximumNewDebt(rollout, after.loan) > baselineDebt ||
        (rollout.minCash < choice.reserve && rollout.minCash < deferred.minCash)) {
      reject(choice, '多轮经营情境中，这项操作可能使资金风险高于继续现有业务，建议暂缓。');
      continue;
    }
    if (delta < -longerTermAllowance(choice, after)) {
      reject(choice, '与暂缓并继续经营的多轮情境相比，目前没有足够战略收益弥补这项操作的代价。');
      continue;
    }
    accepted.push({ ...choice, heuristicScore: choice.score,
      score: choice.score + 35 * clamp(delta / Math.max(10000, choice.reserve), -2, 2),
      rolloutDelta: delta, rolloutScore: rollout.score, rolloutHorizon: rollout.horizon, rolloutScenarios: rollout.scenarioCount,
      rolloutOperatingProfitDelta: rollout.averageOperatingProfit - deferred.averageOperatingProfit,
      rolloutMinCash: rollout.minCash, rolloutFutureBids: rollout.futureBids });
  }
  for (const choice of choices.slice(MAX_ROLLOUT_CANDIDATES)) reject(choice, '有更值得先比较的安全候选，本次先保留这项选择。');
  accepted.sort((a, b) => b.score - a.score || b.scenarioFloor - a.scenarioFloor || a.upfront - b.upfront);
  return { baseline, choices: accepted, rejected, defer: {
    rolloutScore: deferred.score, rolloutHorizon: deferred.horizon, rolloutScenarios: deferred.scenarioCount,
    rolloutMinCash: deferred.minCash, rolloutFutureBids: deferred.futureBids, chosen: accepted.length === 0,
  } };
}
