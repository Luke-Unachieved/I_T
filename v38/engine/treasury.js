import { currencyRate } from '../data/expansion.js';

const FACTOR_RATES = { AAA: 0.97, AA: 0.95, A: 0.93, BBB: 0.89, BB: 0.84, B: 0.78 };
export const OPEN_RECEIVABLE = new Set(['open', 'overdue']);
export const amount = (value) => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(value)));

export function staffAbility(state, role, staffId) {
  const team = state.staff.filter((person) => person.role === role);
  if (staffId) return team.find((person) => person.id === staffId)?.ability ?? 0;
  return Math.max(0, ...team.map((person) => person.ability));
}

export function receivableValue(state, item) {
  return item.currency && item.currency !== 'CNY' && item.foreignBalance != null
    ? amount(item.foreignBalance * (item.lockedFx ?? currencyRate(state, item.currency)))
    : item.amount;
}

export function factorValue(state, item) {
  if (!item || !OPEN_RECEIVABLE.has(item.status)) return 0;
  const rate = FACTOR_RATES[item.buyer.credit] ?? FACTOR_RATES.BBB;
  return amount(receivableValue(state, item) * Math.min(0.99, rate + staffAbility(state, 'finance') * 0.002));
}
