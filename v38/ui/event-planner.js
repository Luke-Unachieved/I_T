import { act, forecast } from '../engine/game.js';
import { operatingReserve } from './development-planner.js';
import { plannerForecast } from './quote-planner.js';

function liquidity(state, rows) {
  if (rows.length !== 12 || !rows.every(row => [row.cash, row.hypothetical, row.financing].every(Number.isFinite))) return null;
  return {
    floor: Math.min(state.cash, ...rows.flatMap(row => [row.cash, row.hypothetical])),
    borrowing: rows.reduce((total, row) => total + row.financing, 0),
  };
}

// Resolve each displayed choice on a disposable copy of the real game. A choice
// cannot buy its better margin by eating the minimum operating reserve when a
// viable alternative is available. Forecasts describe existing commitments,
// not more sales or guaranteed future returns from this event.
export function planEventSafety(state, event, choices, { reserve = 0 } = {}) {
  const required = Math.max(operatingReserve(state), Number.isFinite(reserve) ? reserve : 0);
  // Normal play supplies a pending event; allowing a disposable copy also makes
  // previews for a separately supplied decision possible without state mutation.
  const current = state.events.some(item => item.id === event.id) ? state : { ...state, events: [...state.events, event] };
  const feasible = [];
  for (const choice of choices) {
    if (choice.disabled) continue;
    const result = act(current, { type: 'resolve-event', eventId: event.id, choice: choice.id });
    if (result.error || result.state === current) continue;
    const neutral = liquidity(result.state, plannerForecast(result.state));
    const visible = liquidity(result.state, forecast(result.state));
    if (!neutral || !visible) continue;
    const nextReserve = Math.max(required, operatingReserve(result.state));
    const riskFloor = Math.min(neutral.floor, visible.floor);
    const debt = Math.max(neutral.borrowing, visible.borrowing);
    const safeReserve = riskFloor >= nextReserve && debt === 0 && result.state.loan <= state.loan;
    feasible.push({ ...choice, reserve: nextReserve, cashFloor: visible.floor, scenarioFloor: neutral.floor,
      borrowing: visible.borrowing, scenarioBorrowing: neutral.borrowing, riskFloor, debt, safeReserve,
      upfront: Math.max(0, state.cash - result.state.cash) });
  }
  const safeChoices = feasible.filter(choice => choice.safeReserve);
  if (safeChoices.length) return { safe: true, choices: safeChoices, all: feasible, reserve: required };
  // When every option is risky, use the conservative cash safety estimate only
  // to find the least exposed choice. Do not rank future profits using the
  // live game's hidden seed or pretend that this forced choice is safe.
  const ranked = [...feasible].sort((a, b) => (b.riskFloor - b.reserve) - (a.riskFloor - a.reserve)
    || a.debt - b.debt || b.scenarioFloor - a.scenarioFloor || a.upfront - b.upfront);
  return { safe: false, choices: ranked.slice(0, 1), all: feasible, reserve: required };
}
