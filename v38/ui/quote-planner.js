import { act, forecast } from '../engine/game.js';
import { quote } from '../engine/quotes.js';

// Use a reproducible, independent scenario to compare future cash. Never use the
// saved game's upcoming RNG draws to decide which customer will win or pay.
const simulationSeed = 0x6e624eb7;
const neutralForecastCache = new WeakMap();
const visibleForecastCache = new WeakMap();
const creditRisk = { AAA: .002, AA: .004, A: .01, BBB: .025, BB: .055, B: .12 };
const defaultReserve = state => Math.max(5000, 4 * (1200 + state.staff.reduce((sum, person) => sum + person.salary, 0)));
const floor = rows => Math.min(...rows.map(row => row.hypothetical));

export function plannerForecast(state, draft) {
  if (draft) return forecast({ ...state, seed: simulationSeed }, draft);
  if (!neutralForecastCache.has(state)) neutralForecastCache.set(state, forecast({ ...state, seed: simulationSeed }));
  return neutralForecastCache.get(state);
}

function visibleFloor(state) {
  if (!visibleForecastCache.has(state)) visibleForecastCache.set(state, floor(forecast(state)));
  return visibleForecastCache.get(state);
}

// Estimate profit weighted by winning and the remaining balance's credit risk.
// Time discount and tied-up capital favor quicker, less resource-hungry orders.
// This is an estimate, not an assertion about the next actual random result.
export function quoteExpectedProfit(state, offer) {
  const risk = offer.financing === 'letter-of-credit' ? .001 : Math.min(.8, (creditRisk[offer.buyer?.credit] ?? .025) * (state.riskMultiplier ?? 1));
  const expectedLoss = Math.max(0, offer.total - offer.deposit) * risk * (1 - (offer.insuredRecovery ?? 0));
  return Math.max(0, Math.min(1, offer.probability)) * (offer.profit + (offer.rebateEstimate ?? 0) - expectedLoss);
}

function expectedMetrics(state, offer, availableCapital) {
  const expected = quoteExpectedProfit(state, offer);
  const duration = Math.max(0, offer.expectedPayWeek - state.week);
  const tiedCapital = Math.max(0, offer.workingCapital ?? offer.upfront ?? 0);
  return { expected, discounted: expected / (1 + duration * .04 + tiedCapital / Math.max(1, availableCapital) * .15) };
}

const configFields = ['source', 'ratio', 'extraTerms', 'staffId', 'financing', 'branded', 'brandUnitPrice'];
function cleanConfig(config) {
  return Object.fromEntries(configFields.filter(name => config[name] !== undefined).map(name => [name, config[name]]));
}
function actionKey(id, config) {
  return JSON.stringify([id, ...configFields.map(key => config[key] ?? null)]);
}
function planKey(steps) {
  return steps.map(step => actionKey(step.inquiry.id, step.recommendation.config)).sort().join('|');
}

function rank(node, rootFloor) {
  // A hard minimum reserve is verified separately. Among safe plans, a small
  // cushion penalty reflects that the predicted payment weeks may slip.
  return node.discountedExpectedProfit - Math.max(0, rootFloor - node.scenarioFloor) * .0125;
}

// Candidate generation belongs to the coach (price, source, staff, finance,
// brand). Diversify across customers before considering extra price/source
// variants so a single very large customer cannot fill every beam position.
function candidatesFor(node, inquiries, recommendations, availableCapital, branchLimit) {
  const submitted = new Set(node.state.bids.map(bid => bid.inquiryId));
  const options = [];
  for (const inquiry of inquiries) {
    if (submitted.has(inquiry.id)) continue;
    const suggested = recommendations(node.state, inquiry);
    const unique = new Set();
    const candidates = (Array.isArray(suggested) ? suggested : [suggested]).filter(Boolean);
    const variants = [];
    for (const recommendation of candidates) {
      if (!recommendation.config) continue;
      const config = cleanConfig(recommendation.config);
      const key = actionKey(inquiry.id, config);
      if (unique.has(key)) continue;
      unique.add(key);
      const offer = recommendation.offer ?? quote(node.state, inquiry, config);
      if (offer.error || offer.profit <= 0 || offer.probability <= 0) continue;
      const metrics = expectedMetrics(node.state, offer, availableCapital);
      if (!(metrics.expected > 0 && Number.isFinite(metrics.discounted))) continue;
      variants.push({ inquiry, recommendation: { ...recommendation, config }, metrics });
    }
    variants.sort((a, b) => b.metrics.discounted - a.metrics.discounted);
    if (variants.length) options.push(variants);
  }
  const byValue = (a, b) => b.metrics.discounted - a.metrics.discounted;
  const primary = options.map(items => items[0]).sort(byValue);
  const alternatives = options.flatMap(items => items.slice(1)).sort(byValue);
  // When there are a great many inquiries, reserve some of the limited
  // search slots for a different source/price on promising customers.
  const firstCount = Math.min(primary.length, alternatives.length ? Math.max(1, branchLimit - 2) : branchLimit);
  return [...primary.slice(0, firstCount), ...[...alternatives, ...primary.slice(firstCount)].sort(byValue).slice(0, branchLimit - firstCount)];
}

/** Bounded, deterministic beam search over the remaining weekly quote slots.
 * Existing bids stay fixed. All plans are simulated with real immutable bid
 * actions, so staff capacity, inventory allocations and quote rules are real.
 * No weeks are advanced in the actual game, no forecast outcomes are used as
 * winning predictions, and no future inquiries are evaluated.
 */
export function planQuoteBundle(state, { recommendations, filter, reserve = defaultReserve(state), beamWidth = 4, branchLimit = 10 } = {}) {
  if (typeof recommendations !== 'function') throw new TypeError('planQuoteBundle needs a recommendation function');
  const cashReserve = Math.max(0, Number.isFinite(reserve) ? reserve : defaultReserve(state));
  const rootFloor = floor(plannerForecast(state));
  const availableCapital = Math.max(1, Math.min(state.cash, rootFloor) - cashReserve);
  const root = { state, previous: null, steps: [], scenarioFloor: rootFloor, expectedProfit: 0, discountedExpectedProfit: 0, score: 0 };
  const empty = examined => ({ steps: [], cashFloor: visibleFloor(state), scenarioFloor: rootFloor, expectedProfit: 0, discountedExpectedProfit: 0, score: 0, examined, reserve: cashReserve, projectedWeeks: 12 });
  const depth = Math.max(0, Math.min(3, 3 - state.bids.length));
  const inquiries = state.inquiries.filter(inquiry => (!filter || filter(inquiry)) && !state.bids.some(bid => bid.inquiryId === inquiry.id));
  if (!depth || !inquiries.length || state.bankrupt || state.cash < cashReserve || rootFloor < cashReserve) return empty(0);
  // Caps are deliberately small for phones. Even if the caller asks for an
  // enlarged search, the three slots can trigger at most 58 candidate forecasts.
  const width = Math.max(1, Math.min(4, Math.floor(beamWidth) || 4));
  const branches = Math.max(1, Math.min(10, Math.floor(branchLimit) || 10));
  const visited = new Set();
  const finalists = [];
  let frontier = [root];
  let examined = 0;
  for (let level = 0; level < depth && frontier.length; level++) {
    const lists = frontier.map(node => ({ node, options: candidatesFor(node, inquiries, recommendations, availableCapital, branches) }));
    const next = [];
    const allowance = level === 0 ? 10 : 24;
    let evaluated = 0;
    // Consider promising options round-robin across each distinct prior plan,
    // preventing a greedy first move from monopolizing the entire search.
    for (let optionIndex = 0; optionIndex < branches && evaluated < allowance; optionIndex++) {
      for (const { node, options } of lists) {
        if (evaluated >= allowance) break;
        const option = options[optionIndex];
        if (!option) continue;
        const { inquiry, recommendation } = option;
        const nextSteps = [...node.steps, { inquiry, recommendation }];
        const key = planKey(nextSteps);
        if (visited.has(key)) continue;
        const outcome = act(node.state, { ...recommendation.config, type: 'bid', inquiryId: inquiry.id });
        if (outcome.error || outcome.state === node.state) continue;
        const offer = outcome.state.bids.at(-1);
        const metrics = expectedMetrics(node.state, offer, availableCapital);
        if (!(offer.profit > 0 && metrics.expected > 0 && Number.isFinite(metrics.discounted))) continue;
        visited.add(key);
        evaluated++; examined++;
        const scenarioFloor = floor(plannerForecast(outcome.state));
        if (scenarioFloor < cashReserve || !Number.isFinite(scenarioFloor)) continue;
        const child = {
          state: outcome.state, previous: node, scenarioFloor,
          steps: [...node.steps, { inquiry, recommendation: { ...recommendation, offer, score: metrics.discounted, scenarioFloor } }],
          expectedProfit: node.expectedProfit + metrics.expected,
          discountedExpectedProfit: node.discountedExpectedProfit + metrics.discounted,
        };
        child.score = rank(child, rootFloor);
        next.push(child);
        finalists.push(child);
      }
    }
    next.sort((a, b) => b.score - a.score || b.scenarioFloor - a.scenarioFloor);
    // At the first move preserve distinct customers if possible; later levels
    // already deduplicate permutations of the same quote configuration bundle.
    if (level === 0) {
      const different = new Set();
      frontier = next.filter(node => {
        const id = node.steps[0].inquiry.id;
        if (different.has(id)) return false;
        different.add(id); return true;
      }).slice(0, width);
      if (frontier.length < width) frontier.push(...next.filter(node => !frontier.includes(node)).slice(0, width - frontier.length));
    } else frontier = next.slice(0, width);
  }
  // Rank solely with the independent scenario and expected economics. Before
  // suggesting the plan to the player, verify every prefix against the actual
  // player-visible all-win forecast. It is a safety veto, not a source of extra
  // expected profit; quote dialog's displayed projected minimum remains exact.
  finalists.sort((a, b) => b.score - a.score || b.scenarioFloor - a.scenarioFloor);
  const topFinalists = finalists.slice(0, 12);
  // If long plans fail the visible safety check, do not prematurely settle
  // while a safe useful first quote is still in the bounded shortlist.
  const visibleCandidates = [...topFinalists, ...finalists.filter(node => node.steps.length === 1 && !topFinalists.includes(node))];
  for (const node of visibleCandidates) {
    const path = [];
    for (let current = node; current.previous; current = current.previous) path.unshift(current);
    const prefixes = path.map(current => visibleFloor(current.state));
    if (prefixes.some(value => !Number.isFinite(value) || value < cashReserve)) continue;
    const steps = node.steps.map((step, index) => ({ ...step, cashFloor: prefixes[index], recommendation: { ...step.recommendation, cashFloor: prefixes[index] } }));
    return { steps, cashFloor: prefixes.at(-1), scenarioFloor: node.scenarioFloor, expectedProfit: node.expectedProfit,
      discountedExpectedProfit: node.discountedExpectedProfit, score: node.score, examined, reserve: cashReserve, projectedWeeks: 12 };
  }
  return empty(examined);
}
