export const SAVE_KEY = 'trade-tycoon:weekly:v38:v1';
const FORMAT = 1;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const arrays = (value, fields) => fields.every(key => Array.isArray(value[key]));
const numbers = (value, fields) => fields.every(key => Number.isFinite(value[key]));
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;

function validFlow(flow) {
  return object(flow) && numbers(flow, ['inflow', 'outflow', 'financing', 'profit']) &&
    Array.isArray(flow.messages) && object(flow.cashBreakdown) &&
    object(flow.cashBreakdown.inflow) && object(flow.cashBreakdown.outflow);
}

function validSummary(summary) {
  return validFlow(summary) && positiveInteger(summary.week) &&
    arrays(summary, ['won', 'lost', 'delivered']) &&
    (summary.weeks === undefined || (Array.isArray(summary.weeks) && summary.weeks.every(validSummary)));
}

// The state belongs specifically to the weekly game. Optional detail fields may
// evolve without losing the ability to read earlier saves of this format.
function validState(state) {
  return object(state) && state.v === 38 && positiveInteger(state.week) &&
    numbers(state, ['cash', 'loan', 'creditLine', 'seed', 'sequence', 'energy']) &&
    typeof state.era === 'string' && typeof state.difficulty === 'string' &&
    typeof state.origin === 'string' && typeof state.assistant === 'string' &&
    typeof state.bankrupt === 'boolean' &&
    object(state.company) && typeof state.company.name === 'string' && state.company.name.trim() !== '' &&
    Number.isFinite(state.company.rep) && arrays(state.company, ['certs', 'markets']) &&
    arrays(state, ['inquiries', 'bids', 'orders', 'receivables', 'payables', 'staff', 'rivals',
      'events', 'queue', 'history', 'log', 'achievements', 'inventory', 'candidates', 'exhibitions',
      'policies', 'leads', 'clientStories', 'marketBoost', 'chronicle']) &&
    object(state.relationships) && object(state.macro) && object(state.year) &&
    positiveInteger(state.year.number) && Array.isArray(state.year.records) &&
    object(state.ventures) && object(state.ventures.factory) && object(state.ventures.overseas) &&
    numbers(state.ventures, ['warehouse', 'brand', 'ecommerce']) &&
    object(state.listing) && typeof state.listing.stage === 'string' &&
    object(state.life) && arrays(state.life, ['properties', 'cars']) &&
    object(state.tutorial) && Number.isSafeInteger(state.tutorial.step) &&
    state.tutorial.step >= 0 && state.tutorial.step < 5 && typeof state.tutorial.done === 'boolean' &&
    validFlow(state.period) && (state.summary === null || validSummary(state.summary));
}

export function readSave(storage) {
  let raw;
  try {
    raw = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty', raw };
  try {
    const record = JSON.parse(raw);
    if (!object(record) || record.format !== FORMAT || !validState(record.state)) {
      return { status: 'invalid', raw };
    }
    return { status: 'ready', raw, record };
  } catch {
    return { status: 'invalid', raw };
  }
}

export function writeSave(state, view, expectedRaw, storage) {
  try {
    const disk = storage ?? globalThis.localStorage;
    const current = disk.getItem(SAVE_KEY);
    // Avoid silently replacing a save changed in another browser tab.
    if (current !== expectedRaw && !(current === null && expectedRaw === undefined)) {
      return { status: 'conflict' };
    }
    const record = { format: FORMAT, savedAt: new Date().toISOString(), state, view };
    const raw = JSON.stringify(record);
    disk.setItem(SAVE_KEY, raw);
    return { status: 'ready', raw, record };
  } catch {
    return { status: 'unavailable' };
  }
}
