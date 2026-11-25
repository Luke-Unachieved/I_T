import { act, forecast } from '../engine/game.js';
import { quote } from '../engine/quotes.js';
import { evaluateRollouts, quoteExpectedProfit, rolloutBudget } from './rollout-planner.js';

export { quoteExpectedProfit } from './rollout-planner.js';

// Use a reproducible, independent scenario to compare future cash. Never use the
// saved game's upcoming RNG draws to decide which customer will win or pay.
const simulationSeed = 0x6e624eb7;
const neutralForecastCache = new WeakMap();
const visibleForecastCache = new WeakMap();
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
 * Finalists are compared by real, independently seeded multi-week rollouts;
 * the live game never advances or reveals its next actual random outcomes.
 */
export function planQuoteBundle(state, { recommendations, filter, reserve = defaultReserve(state), beamWidth = 4, branchLimit = 10, lookahead = true } = {}) {
  if (typeof recommendations !== 'function') throw new TypeError('planQuoteBundle needs a recommendation function');
  const cashReserve = Math.max(0, Number.isFinite(reserve) ? reserve : defaultReserve(state));
  const rootFloor = floor(plannerForecast(state));
  const availableCapital = Math.max(1, Math.min(state.cash, rootFloor) - cashReserve);
  const root = { state, previous: null, steps: [], scenarioFloor: rootFloor, expectedProfit: 0, discountedExpectedProfit: 0, score: 0 };
  const empty = (examined, extra = {}) => ({ steps: [], cashFloor: visibleFloor(state), scenarioFloor: rootFloor, expectedProfit: 0, discountedExpectedProfit: 0, score: 0, examined, reserve: cashReserve, projectedWeeks: 12, ...extra });
  const depth = Math.max(0, Math.min(3, 3 - state.bids.length));
  const inquiries = state.inquiries.filter(inquiry => (!filter || filter(inquiry)) && !state.bids.some(bid => bid.inquiryId === inquiry.id));
  if (!depth || !inquiries.length || state.bankrupt || state.cash < cashReserve || rootFloor < cashReserve) return empty(0);
  // Caps are deliberately small for phones. Even if the caller asks for an
  // enlarged search, the three slots can trigger at most 58 candidate forecasts.
  const budget = rolloutBudget(state);
  const width = Math.max(1, Math.min(budget.beamWidth, Math.floor(beamWidth) || budget.beamWidth));
  const branches = Math.max(1, Math.min(budget.branchLimit, Math.floor(branchLimit) || budget.branchLimit));
  const visited = new Set();
  const finalists = [];
  let frontier = [root];
  let examined = 0;
  for (let level = 0; level < depth && frontier.length; level++) {
    const lists = frontier.map(node => ({ node, options: candidatesFor(node, inquiries, recommendations, availableCapital, branches) }));
    const next = [];
    const allowance = level === 0 ? branches : budget.branchAllowance;
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
  // Validate current commitments against the player-visible all-win cash
  // chart. This remains a safety veto, not a way to rank by the saved RNG.
  finalists.sort((a, b) => b.score - a.score || b.scenarioFloor - a.scenarioFloor);
  const topFinalists = finalists.slice(0, 12);
  // Give shorter bundles a chance even when the analytic ranking is crowded
  // with 3-order pricing variants. Their lower capital usage is precisely
  // what additional weekly rounds may reveal to be valuable.
  const byDepth = [1, 2, 3].flatMap(length => finalists.filter(node => node.steps.length === length).slice(0, 3));
  const visibleCandidates = [...new Set([...topFinalists, ...byDepth, ...finalists.filter(node => node.steps.length === 1)])];
  const possibleDepths = new Set(finalists.map(node => node.steps.length));
  const safe = [];
  for (const node of visibleCandidates) {
    const path = [];
    for (let current = node; current.previous; current = current.previous) path.unshift(current);
    const prefixes = path.map(current => visibleFloor(current.state));
    if (prefixes.some(value => !Number.isFinite(value) || value < cashReserve)) continue;
    const steps = node.steps.map((step, index) => ({ ...step, cashFloor: prefixes[index], recommendation: { ...step.recommendation, cashFloor: prefixes[index] } }));
    safe.push({ node, steps, cashFloor: prefixes.at(-1) });
    if (!lookahead || (safe.length >= 8 && new Set(safe.map(candidate => candidate.steps.length)).size === possibleDepths.size)) break;
  }
  if (!safe.length) return empty(examined);
  const build = ({ node, steps, cashFloor }, extra = {}) => ({ steps, cashFloor, scenarioFloor: node.scenarioFloor,
    expectedProfit: node.expectedProfit, discountedExpectedProfit: node.discountedExpectedProfit, score: node.score, examined,
    reserve: cashReserve, projectedWeeks: 12, ...extra });
  // Useful in diagnostics to isolate the within-week beam from the actual
  // multiweek policy. Production coaching always keeps lookahead enabled.
  if (!lookahead) return build(safe[0]);

  // Several different current plans, plus not submitting another bid this week.
  // Select diverse first moves and bundle lengths, not merely four pricing
  // variants of the same customer. Search stays bounded on a phone.
  const shortlist = [safe[0]];
  const add = candidate => { if (candidate && !shortlist.includes(candidate) && shortlist.length < budget.currentPlans) shortlist.push(candidate); };
  for (const length of [1, 2, 3]) {
    if (length !== shortlist[0].steps.length) add(safe.find(candidate => candidate.steps.length === length));
  }
  add(safe.find(candidate => !shortlist.some(selected => selected.steps[0].inquiry.id === candidate.steps[0].inquiry.id)));
  for (const candidate of safe) add(candidate);
  const baselineRollout = evaluateRollouts(state, { reserve: cashReserve });
  // A few scenarios carry sampling noise. Give the real continuation more
  // influence when today's best analytical bundle would tie up most cash
  // above the protected reserve; otherwise avoid giving up strong orders
  // just because one hypothetical future was unlucky.
  const priorHeadroom = Math.max(1, rootFloor - cashReserve);
  const remainingHeadroom = Math.max(0, safe[0].node.scenarioFloor - cashReserve);
  const liquidityPressure = Math.max(0, Math.min(1, 1 - remainingHeadroom / priorHeadroom));
  const rolloutWeight = .25 + .45 * liquidityPressure;
  const compared = shortlist.map(candidate => {
    const rollout = evaluateRollouts(candidate.node.state, { reserve: cashReserve });
    const rolloutDelta = rollout.score - baselineRollout.score;
    // Stabilize a few uncertain sampled paths with the analytic current-week
    // estimate, but let actual multi-round continuation drive the ranking.
    const rolloutScore = rolloutWeight * rolloutDelta + (1 - rolloutWeight) * candidate.node.score;
    return { ...candidate, rollout, rolloutDelta, rolloutScore };
  }).sort((a, b) => b.rolloutScore - a.rolloutScore || b.node.score - a.node.score);
  const sampleDebt = rollout => Math.max(0, ...rollout.scenarios.map(scenario => scenario.maxLoan - state.loan));
  const best = compared.find(({ rollout }) => rollout.bankruptCount <= baselineRollout.bankruptCount
    && rollout.blockedCount <= baselineRollout.blockedCount && sampleDebt(rollout) <= sampleDebt(baselineRollout)
    && !(rollout.minCash < cashReserve && rollout.minCash < baselineRollout.minCash));
  const metrics = { baselineRollout, rolloutCompared: compared.length + 1, lookaheadRounds: baselineRollout.horizon };
  // If waiting leads to a materially stronger estimated position, do not fill
  // a quote slot just for its own sake. A small sample difference alone is
  // insufficient; the deal's positive expectation still matters.
  if (!best || best.rolloutScore < -Math.max(250, cashReserve * .05)) {
    return empty(examined, { ...metrics, rollout: baselineRollout, rolloutDelta: 0, rolloutScore: 0, waitPreferred: true });
  }
  return build(best, { ...metrics, rollout: best.rollout, rolloutDelta: best.rolloutDelta, rolloutScore: best.rolloutScore });
}
