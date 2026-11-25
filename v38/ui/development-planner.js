import { act, forecast } from '../engine/game.js';
import { VENTURES } from '../engine/strategy.js';
import { plannerForecast } from './quote-planner.js';

const DEVELOPMENT_ACTIONS = new Set([
  'hire', 'dismiss-staff', 'repay', 'buy-cert', 'open-market', 'referral', 'exhibit',
  'invest-venture', 'strategic-investment', 'restructure', 'ipo',
]);
const MAX_CANDIDATES = 24;
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

// Cash projections cover signed commitments, plus the conservative case where all existing
// proposals win. No recommendations assume new business that an investment might generate.
// `strategicValue` comes from the candidate's stated business rationale, not future RNG draws.
export function planDevelopment(state, candidates, { reserve = 0 } = {}) {
  const baseline = projection(state, forecast(state));
  const scenario = projection(state, plannerForecast(state));
  if (!baseline || !scenario) return { baseline, choices: [], rejected: [] };
  const prudentialReserve = Math.max(baseline.reserve, Number.isFinite(reserve) ? reserve : 0);
  baseline.reserve = prudentialReserve;
  const choices = [];
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
    choices.push({ ...candidate, ...next, action, reserve: required,
      cashDelta, upfront: Math.max(0, -cashDelta), floorDelta, endingDelta,
      inflowDelta: next.inflow - baseline.inflow, outflowDelta: next.outflow - baseline.outflow,
      operatingDelta, loanDelta, stakeDelta, scenarioFloor: neutral.cashFloor, scenarioOperatingDelta, score });
  }
  choices.sort((a, b) => b.score - a.score || b.scenarioFloor - a.scenarioFloor || a.upfront - b.upfront);
  return { baseline, choices, rejected };
}
