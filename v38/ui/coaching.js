import { ASSISTANTS, PRODUCT_BY_ID } from '../data/core.js';
import { STAFF_ROLES } from '../data/expansion.js';
import { certProgress, marketProgress } from '../engine/expansion.js';
import { act, canExpedite, expediteFee, factorValue, forecast, liquidationValue, lawsuitFee, netAssets } from '../engine/game.js';
import { LIFE_CATALOG, outingLockHint } from '../engine/life.js';
import { quote } from '../engine/quotes.js';
import { ipoProgress, VENTURES, ventureProgress } from '../engine/strategy.js';
import { ACTIVE_ORDER, OPEN_RECEIVABLE } from '../engine/treasury.js';
import { planQuoteBundle, plannerForecast, quoteExpectedProfit } from './quote-planner.js';
import { planDevelopment } from './development-planner.js';
import { planEventSafety, planEventRollouts } from './event-planner.js';

const cash = value => `¥${Math.round(value).toLocaleString('zh-CN')}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const percent = value => `${Math.round(value * 100)}%`;
const week = value => `第 ${value} 周`;
const easy = state => state.difficulty === 'casual';
const activeCache = new WeakMap();
const candidateCache = new WeakMap();
const checkpointCache = new WeakMap();
const sourceNames = { stock: '现货采购', factory: '工厂排产', inventory: '现有库存' };
const financingNames = { standard: '按普通账期', insured: '出口信用保险', 'letter-of-credit': '信用证' };
const preparation = [
  { page: 'office', tab: 'cash-forecast', label: '查看报价后的现金预测' },
  { page: 'company', tab: 'finance', label: '认识备用资金与授信' },
  { page: 'offwork', label: '认识精力与休息' },
];
const introduction = [
  { page: 'orders', label: '查看订单与交期' },
  { page: 'company', tab: 'finance', label: '认识财务' },
  { page: 'company', tab: 'team', label: '认识团队' },
  { page: 'offwork', label: '认识下班与休息' },
];
const introMatches = (ui, step) => step && ui.page === step.page && (step.page !== 'company' || !step.tab || (!ui.developmentOverview && ui.developmentTab === step.tab));
export function coachIntroIndex(value) {
  return Number.isInteger(value) ? Math.max(0, Math.min(introduction.length, value)) : 0;
}
export function coachPrepIndex(value) {
  return Number.isInteger(value) ? Math.max(0, Math.min(preparation.length, value)) : 0;
}

const reviewIds = ['orders-delivery','orders-receivables','orders-funding','orders-inventory','cash'];
export function coachReviewRecord(value) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(reviewIds.filter(id=>Number.isInteger(value[id]?.week) && typeof value[id]?.signature==='string' && /^[a-z0-9]+$/.test(value[id].signature)).map(id=>[id,{week:value[id].week,signature:value[id].signature}]));
}

function checkpoint(rows) {
  if (!rows.length) return '';
  // Compact, deterministic fingerprint of player-visible material commitments.
  const text=JSON.stringify(rows);
  let fingerprint=2166136261;
  for (let i=0;i<text.length;i++) fingerprint=Math.imul(fingerprint^text.charCodeAt(i),16777619);
  return (fingerprint>>>0).toString(36);
}

function reviewSignatures(state) {
  if (checkpointCache.has(state)) return checkpointCache.get(state);
  const active=state.orders.filter(order=>ACTIVE_ORDER.has(order.status));
  const latestOrders=state.orders.filter(order=>ACTIVE_ORDER.has(order.status) || Math.max(order.deliveredWeek ?? 0,order.cancelledWeek ?? 0)>=state.week-1);
  const invoices=state.receivables.filter(item=>OPEN_RECEIVABLE.has(item.status) || ['bad-debt','lawsuit'].includes(item.status) || (item.paidWeek ?? 0)>=state.week-1);
  const funding=state.queue.filter(item=>['export-refund','insurance'].includes(item.type));
  const inventory=state.inventory.filter(item=>item.quantity>0);
  const orderRows=latestOrders.map(order=>[order.id,order.status,order.deliverWeek,order.dueWeek,order.expectedPayWeek,order.productionLeft,order.shippingLeft,order.penalty,order.deliveredWeek,order.cancelledWeek]);
  const invoiceRows=invoices.map(item=>[item.id,item.status,item.amount,item.dueWeek,item.dueWeek<=state.week,item.paidAmount,item.paidWeek,item.reminderWeek,item.insuranceDueWeek]);
  const fundingRows=funding.map(item=>[item.id,item.amount,item.dueWeek,item.type]);
  const inventoryRows=inventory.map(item=>[item.productId,item.quantity,item.unitCost]);
  const bids=state.bids.map(item=>[item.inquiryId,item.workingCapital,item.total,item.expectedPayWeek,item.source]);
  const pending=state.payables.filter(item=>!item.paid).map(item=>[item.id,item.amount,item.dueWeek]);
  const commitments=[...bids,...active.map(order=>[order.id,order.cost,order.costPaid,order.deliverWeek,order.expectedPayWeek]),...invoiceRows.filter(row=>!row[6]),...fundingRows,...pending];
  if (state.loan>0) commitments.push(['loan',state.loan]);
  const result={ 'orders-delivery':checkpoint(orderRows),'orders-receivables':checkpoint(invoiceRows),'orders-funding':checkpoint(fundingRows),'orders-inventory':checkpoint(inventoryRows),'cash':checkpoint(commitments) };
  checkpointCache.set(state,result);
  return result;
}

export function recordCoachReview(state,ui,id) {
  if (!easy(state) || !reviewIds.includes(id)) return false;
  const signature=reviewSignatures(state)[id];
  if (!signature || ui.coachReview?.[id]?.signature===signature) return false;
  ui.coachReview={...coachReviewRecord(ui.coachReview),[id]:{week:state.week,signature}};
  return true;
}

export function coachDeclinedRecord(value,week) {
  const lists=value?.week===week?value:{};
  const valid=items=>[...new Set(Array.isArray(items)?items.filter(id=>typeof id==='string' && id.length>0 && id.length<160):[])];
  return {week,inquiries:valid(lists.inquiries),tasks:valid(lists.tasks)};
}

export function recordCoachDecline(state,ui,kind,id) {
  if (!easy(state)||!['inquiries','tasks'].includes(kind)||typeof id!=='string'||!id||id.length>=160) return false;
  const declined=coachDeclinedRecord(ui.coachDeclined,state.week);
  if (declined[kind].includes(id)) return false;
  declined[kind].push(id);
  ui.coachDeclined=declined;
  return true;
}

export function coachQuoteFilters(state,ui) {
  return {...ui.filters,excludedIds:coachDeclinedRecord(ui.coachDeclined,state.week).inquiries};
}

const declinedTask=(state,ui,key)=>coachDeclinedRecord(ui.coachDeclined,state.week).tasks.includes(key);

export function recordCoachVisit(state, ui) {
  if (!easy(state)) return false;
  if (!state.orders.length) {
    const index = coachPrepIndex(ui.coachPrep);
    if (!state.bids.length || !introMatches(ui, preparation[index])) return false;
    ui.coachPrep = index + 1;
    return true;
  }
  const index = coachIntroIndex(ui.coachIntro);
  if (!introMatches(ui, introduction[index])) return false;
  ui.coachIntro = index + 1;
  return true;
}

function operatingReserve(state) {
  const upkeep = VENTURES.reduce((sum,item)=>{
    const levels = state.ventures[item.id];
    return sum + item.upkeep * (typeof levels === 'number' ? levels : Object.values(levels).reduce((total,level)=>total+level,0));
  },0);
  return Math.max(5000, 4 * (1200 + upkeep + state.staff.reduce((sum, person) => sum + person.salary, 0)));
}

// Reserve cash against existing commitments. Reuse the forecast while the immutable game state is unchanged.
function estimates(state) {
  if (activeCache.has(state)) return activeCache.get(state);
  const rows = forecast(state);
  const lowest = rows.reduce((best, row) => row.hypothetical < best.hypothetical ? row : best, rows[0]);
  const reserve = operatingReserve(state);
  const result = { lowest, rows, baselineFloor: Math.min(...rows.map(row => row.cash)), reserve, budget: Math.max(0, Math.min(state.cash, lowest.hypothetical) - reserve), plans: new Map() };
  activeCache.set(state, result);
  return result;
}

function proposalConfig(offer) {
  return { source: offer.source, ratio: offer.ratio, extraTerms: offer.extraTerms, staffId: offer.staffId ?? '', financing: offer.financing,
    branded: offer.branded, brandUnitPrice: offer.unitPrice };
}

// The assistant compares executable quotes, preferring a good expected return, short cash cycles,
// reliable buyers and enough reserve for other commitments. This is a shortlist, not a guarantee.
function quoteCandidates(state, inquiry) {
  if (!easy(state) || !inquiry || state.bids.length >= 3 || state.bids.some(item => item.inquiryId === inquiry.id)) return [];
  let estimate = candidateCache.get(state);
  if (!estimate) {
    const reserve = operatingReserve(state);
    const minimum = Math.min(...plannerForecast(state).map(row => row.hypothetical));
    estimate = { budget: Math.max(0, Math.min(state.cash, minimum) - reserve), upfrontRoom: Math.max(0, state.cash - reserve), quotes: new Map() };
    candidateCache.set(state, estimate);
  }
  if (estimate.quotes.has(inquiry.id)) return estimate.quotes.get(inquiry.id);
  const sources = ['stock', 'factory', ...(state.inventory.some(item => item.productId === inquiry.productId) ? ['inventory'] : [])];
  const ratioBelow = Math.floor((Math.min(inquiry.targetPrice, ...inquiry.rivals.map(rival => rival.price)) - 1) * 100 / inquiry.targetPrice);
  const ratios = [...new Set([80, 85, 90, 95, 100, ratioBelow, ratioBelow + 1].filter(n => n >= 80 && n <= 100))];
  const sales = state.staff.filter(person => person.role === 'sales').sort((a, b) => b.ability - a.ability).slice(0, 2);
  const staffOptions = [null, ...sales.map(person => person.id)];
  const overseas = inquiry.currency !== 'CNY';
  const financingOptions = overseas ? ['standard', 'letter-of-credit', 'insured'] : ['standard'];
  const possibilities = [];
  function compare(config) {
    const offer = quote(state, inquiry, config);
    if (offer.error || offer.profit <= 0 || offer.probability <= 0 || offer.upfront > estimate.upfrontRoom) return;
    const expected = quoteExpectedProfit(state, offer);
    if (!(expected > 0)) return;
    const score = expected / (1 + (offer.expectedPayWeek - state.week) * .045 + offer.workingCapital / Math.max(1, estimate.budget) * .3);
    possibilities.push({ offer, config: proposalConfig(offer), score });
  }
  for (const source of sources) {
    for (const ratio of ratios) {
      for (const staffId of staffOptions) {
        for (const financing of financingOptions) compare({ source, ratio, staffId, financing, extraTerms: 0 });
      }
    }
    if (state.ventures.brand && state.company.certs.includes('brand')) {
      for (const ratio of [100, 120, 140, 160]) compare({ source, staffId: null, branded: true, brandUnitPrice: Math.max(1, Math.round(inquiry.targetPrice * ratio / 100)) });
    }
  }
  possibilities.sort((a, b) => b.score - a.score);
  if (possibilities.length) {
    const finalist = possibilities[0].config;
    for (const extraTerms of [1, 2, 3, 4]) compare({ ...finalist, extraTerms });
  }
  possibilities.sort((a,b) => b.score - a.score);
  const best = possibilities[0];
  const chosen = [];
  const add = candidate => {
    if (candidate && !chosen.some(item => JSON.stringify(item.config) === JSON.stringify(candidate.config))) chosen.push(candidate);
  };
  if (best) {
    add(best);
    // Keep alternatives that preserve most of the return but use less cash or complete sooner.
    const competitive = possibilities.filter(item => item.score >= best.score * .65);
    add([...competitive].sort((a,b) => a.offer.workingCapital - b.offer.workingCapital || b.score-a.score)[0]);
    add([...competitive].sort((a,b) => a.offer.expectedPayWeek - b.offer.expectedPayWeek || b.score-a.score)[0]);
    add(competitive.find(item => item.offer.source !== best.offer.source));
    for (const alternative of competitive) { if (chosen.length >= 3) break; add(alternative); }
  }
  const result = chosen.slice(0, 3);
  estimate.quotes.set(inquiry.id, result);
  return result;
}

function verifyRecommendation(state, recommendation) {
  if (!recommendation) return null;
  if (recommendation.scenarioFloor === undefined) recommendation.scenarioFloor = Math.min(...plannerForecast(state, recommendation.offer).map(row => row.hypothetical));
  if (recommendation.cashFloor === undefined) recommendation.cashFloor = Math.min(...forecast(state, recommendation.offer).map(row => row.hypothetical));
  return Math.min(recommendation.scenarioFloor, recommendation.cashFloor) < estimates(state).reserve ? null : recommendation;
}

function quoteBundle(state, filter = {}) {
  const estimate = estimates(state);
  const category = filter?.category && filter.category !== 'all' ? filter.category : '';
  const availability = filter?.availability === 'available' ? 'available' : 'all';
  const excluded=new Set(filter?.excludedIds ?? []);
  const key = JSON.stringify([category, availability,[...excluded].sort()]);
  if (!estimate.plans.has(key)) {
    const matches = inquiry => !excluded.has(inquiry.id) && (!category || inquiry.category === category) && (availability !== 'available' || ['stock', 'factory', 'inventory'].some(source => !quote(state, inquiry, { source, ratio: 100, extraTerms: 0 }).error));
    estimate.plans.set(key, planQuoteBundle(state, { recommendations: quoteCandidates, filter: matches, reserve: estimate.reserve }));
  }
  return estimate.plans.get(key);
}

export function quoteRecommendation(state, inquiry, filter) {
  if (!easy(state) || !inquiry || state.bids.length >= 3 || state.bids.some(item => item.inquiryId === inquiry.id)) return null;
  // The recommended thread and its actual proposal must match, even after a filter change.
  const planned = quoteBundle(state, filter).steps[0];
  if (planned?.inquiry.id === inquiry.id) return planned.recommendation;
  return quoteCandidates(state, inquiry).find(item => verifyRecommendation(state, item)) ?? null;
}

function bestInquiry(state, filter) {
  const bundle = quoteBundle(state, filter);
  const first = bundle.steps[0];
  return first ? { ...first, bundle } : null;
}

const page = (id, label, tab) => ({ ui: 'page', page: id, label, tab });
const focus = (action, id, label) => ({ ui: 'coach-target', action, id, label });
const form = (name, label, amount) => ({ ui: 'coach-target', form: name, label, amount });
const settle = () => ({ command: 'end-week', label: '结束本周，查看结果' });
const deferGrowth = () => ({ ui: 'coach-defer-growth', label: '稍后发展，继续报价', quiet: true });
const deferTask = id => ({ui:'coach-defer-task',id,label:'本周先不处理',quiet:true});
const skipPreparation = () => ({ ui: 'coach-skip-prep', label: '跳过介绍，继续报价', quiet: true });
const note = (title, text, action) => ({ title, text, action });
const noAction = reason => note('本周不用操作', reason);

function projectedCreditNote(state) {
  const { rows, lowest } = estimates(state);
  const draw = rows.reduce((sum,row)=>sum+row.financing,0);
  if (state.cash < 0 || lowest.hypothetical < 0 || draw <= 0) return '';
  return ` 现有业务预计还会自动动用约 ${cash(draw)} 授信，按周计息；先让已有回款推进，不宜为多接单增加新的支出。`;
}

function inquiryAdvice(state, filter, onInquiryPage = true) {
  const submitted = state.bids.length;
  if (submitted >= 3) return note('本周的三个报价位已用完', `已经提交 3 笔报价，无需继续挑选。本周结算后会揭晓结果、推进订单与回款，并收到新询盘。${projectedCreditNote(state)}`, settle());
  const best = bestInquiry(state, filter);
  if (best) {
    const { inquiry, recommendation: { offer }, bundle } = best;
    const progress = submitted ? `已报价 ${submitted}/3 笔。` : '';
    const rollout=bundle.rollout?`我按 ${bundle.rollout.scenarioCount} 种可能的情况，算了接下来 ${bundle.rollout.horizon} 周的接单、交货和回款。`:'';
    const plan = `${rollout}建议${submitted ? '再' : '先'}报 ${bundle.steps.length} 笔，按中单和回款风险估算收益 ${cash(bundle.expectedProfit)}。若全部中单，最低余额 ${cash(bundle.cashFloor)}。`;
    const advice=note(`${submitted ? '再看' : '先看'}${inquiry.buyer.name}的${inquiry.productName}询盘`, `${progress}此单建议${sourceNames[offer.source]}，预计中单率 ${percent(offer.probability)}，利润 ${cash(offer.profit)}。${plan}`, onInquiryPage ? { ui: 'quote-open', id: inquiry.id, label: '打开推荐询盘' } : page('inquiries', submitted ? '继续挑选询盘' : '开始挑选询盘'));
    return onInquiryPage?{...advice,nextAction:{ui:'coach-skip-inquiry',id:inquiry.id,label:'换条推荐',quiet:true}}:advice;
  }
  const filtered = (filter?.category && filter.category !== 'all') || filter?.availability === 'available';
  if (filtered && bestInquiry(state,{excludedIds:filter?.excludedIds})) return note('当前筛选没有合适的方案', '全部来信中还有利润和资金都合适的询盘，建议取消筛选再挑选。', onInquiryPage ? { ui: 'coach-all-inquiries', label: '查看全部询盘' } : page('inquiries', '查看询盘并调整筛选'));
  const waiting=quoteBundle(state,filter);
  if(waiting.waitPreferred)return note('先把资金留给后续机会',`我按 ${waiting.rollout.scenarioCount} 种可能情况，比较了接下来 ${waiting.rollout.horizon} 周的生意。现在留下资金，更有利于之后接单和周转。其余询盘并非都亏损，你仍可自行报价。${projectedCreditNote(state)}`,settle());
  const remaining = state.inquiries.some(inquiry => !state.bids.some(bid => bid.inquiryId === inquiry.id) && !filter?.excludedIds?.includes(inquiry.id));
  const skipped=state.inquiries.some(inquiry=>!state.bids.some(bid=>bid.inquiryId===inquiry.id)&&filter?.excludedIds?.includes(inquiry.id));
  return note(submitted ? '不必为了用完报价位而接单' : '先别急着发新报价', `${submitted ? `已报价 ${submitted}/3 笔。` : ''}${remaining ? '其余询盘暂时没有同时满足交期、利润和周转资金预留的方案。' : skipped?'本周已略过其余来信，仍可自行打开。':'当前没有其他未提交的询盘。'}结算会让新询盘和现有业务继续推进。${projectedCreditNote(state)}`, settle());
}

// The orders and leisure pages share the same decision about whether another quote
// is worthwhile. They explain their own page first without sending the player in circles.
function nextBusinessStep(state, ui) {
  const advice = inquiryAdvice(state, ui.filters, false);
  return { action: advice.action, text: advice.action.command === 'end-week' ? ` ${advice.text}` : ' 本周还有值得比较的询盘。' };
}

// Expansion spends tomorrow's bidding capacity. Base the budget on realized
// earnings and the actual capital tied up by recent weekly contract cohorts.
function growthReadiness(state) {
  const estimate = estimates(state);
  if (estimate.growthReadiness) return estimate.growthReadiness;
  const recent = state.history.slice(-12);
  const orders = state.orders.filter(order => order.contractWeek < state.week && order.contractWeek >= state.week - 12 && !['cancelled','bad-debt'].includes(order.status));
  const delivered = orders.filter(order=>order.deliveredWeek != null);
  const cohorts = new Map();
  for (const order of orders) {
    const capital = Math.max(0,order.workingCapital ?? ((order.cost ?? 0) + (order.shipping ?? 0) - (order.deposit ?? 0)));
    cohorts.set(order.contractWeek,(cohorts.get(order.contractWeek) ?? 0) + capital);
  }
  const weekly = [...cohorts.values()].sort((a,b)=>a-b);
  const median = weekly.length ? (weekly[Math.floor((weekly.length-1)/2)] + weekly[Math.floor(weekly.length/2)]) / 2 : 0;
  const nextTrading = Math.ceil(median * 1.5);
  const reserve = estimate.reserve + nextTrading;
  const floor = Math.min(state.cash,estimate.lowest.hypothetical,estimate.baselineFloor);
  const profit = recent.reduce((sum,row)=>sum+(row.profit ?? 0),0);
  const average = profit / Math.max(1,recent.length);
  const retained = state.history.reduce((sum,row)=>sum+(row.profit ?? 0),0) + (state.period?.profit ?? 0);
  const stable = recent.length >= 12 && recent.filter(row=>row.profit>0).length >= 8 && recent.slice(-4).filter(row=>row.profit>0).length >= 3 && average > 0 && retained > 0;
  const spent = state.log.some(row=>row.week === state.week && (['cert','market','venture','milestone'].includes(row.type) || row.type === 'staff' && row.text.includes('加入公司')));
  const capacity = Math.max(0,floor-reserve);
  const ready = stable && !spent && state.loan === 0 && orders.length >= 12;
  // A discretionary opening fee should be funded by retained profits, with
  // enough recent earning power to recover it in a few months of real business.
  const canFund = cost => ready && cost <= capacity && retained >= cost * 1.25 && average * 20 >= cost;
  estimate.growthReadiness = { orders, delivered, nextTrading, reserve, profit, average, retained, stable, spent, ready, capacity, canFund };
  return estimate.growthReadiness;
}

function teamBenefit(state, candidate, growth) {
  const current = Math.max(0,...state.staff.filter(person=>person.role===candidate.role).map(person=>person.ability));
  const gain = Math.max(0,candidate.ability-current);
  if (!gain) return null;
  if (candidate.role === 'operations') {
    const relevant = growth.orders.filter(order=>order.source==='factory' && !order.staffId);
    // Better follow-up reduces the real factory-disruption chance. Value only
    // a plausible avoided rush/penalty cost, not the whole contract as a saving.
    const benefit = relevant.reduce((sum,order)=>sum+gain*.009*Math.max(300,(order.cost ?? 0)*.06),0)/12;
    return relevant.length >= 12 ? { benefit, basis:`最近 12 周有 ${relevant.length} 笔需跟进的工厂订单，按延误概率和赶工成本估算，每周有望少损失约 ${cash(benefit)}。` } : null;
  }
  if (candidate.role === 'finance') {
    const overdue = state.receivables.filter(item=>item.status==='overdue');
    const balance = overdue.reduce((sum,item)=>sum+(item.amount ?? 0),0);
    const interest = state.loan*.0025*gain*.04;
    const quicker = balance * gain * .006 * 2.5 * .0025;
    const benefit = interest+quicker;
    return overdue.length >= 4 || state.loan > 0 ? { benefit,basis:`实际逾期应收 ${overdue.length} 笔，按融资利息和延后付款概率估算，每周可能节省 ${cash(benefit)}。` } : null;
  }
  const relevant = growth.orders.filter(order=>(order.probability ?? 1)<.9 && order.profit>0);
  const benefit = relevant.reduce((sum,order)=>{
    const probability = order.probability;
    const improved = Math.min(1,probability+gain*.004+candidate.ability*.012);
    const marginal = Math.max(0,improved*Math.max(0,order.profit-order.total*candidate.commission)-probability*order.profit);
    return sum+marginal;
  },0)/12;
  return relevant.length >= 12 ? { benefit,basis:`最近 12 周有 ${relevant.length} 笔中单率不足 90% 的合同；扣除业务提成后，估算每周增加收益 ${cash(benefit)}。` } : null;
}

function teamPlan(state) {
  const estimate = estimates(state);
  if (estimate.teamPlan) return estimate.teamPlan;
  const growth = growthReadiness(state);
  const candidates = state.candidates.filter(person=>!state.staff.some(staff=>staff.id===person.id || staff.name===person.name))
    .map(candidate=>({candidate,demand:teamBenefit(state,candidate,growth)}))
    .filter(item=>item.demand && item.demand.benefit>=item.candidate.salary*1.15)
    .sort((a,b)=>(b.demand.benefit-b.candidate.salary)-(a.demand.benefit-a.candidate.salary));
  let selected;
  if (growth.ready && state.staff.length<18) for (const {candidate,demand} of candidates) {
    const payroll = candidate.salary*12;
    const reserve = growth.reserve+candidate.salary*4;
    if (growth.average < candidate.salary*2 || growth.retained < payroll || state.cash<reserve || growth.capacity<payroll+candidate.salary*4) continue;
    const simulated = forecast({...state,staff:[...state.staff,candidate]});
    const minimum = Math.min(...simulated.map(row=>Math.min(row.cash,row.hypothetical)));
    if (minimum>=reserve) {selected={candidate,demand,minimum,reserve,payroll};break;}
  }
  if (selected) {
    const {candidate,demand,minimum,reserve,payroll}=selected;
    estimate.teamPlan={candidate,expectedWeeklyBenefit:demand.benefit,advice:note(`建议聘用${candidate.name}（${STAFF_ROLES[candidate.role].label}）`,`${demand.basis} 预计收益高于周薪 ${cash(candidate.salary)}。新增 12 周工资 ${cash(payroll)} 后，预测最低余额 ${cash(minimum)}，保留后续报价周转 ${cash(reserve)}。`,focus('hire',candidate.id,'查看推荐候选人'))};
  } else {
    const reason = growth.spent ? '本周已经增加过人员或办理发展投入，先让新安排产生实际效果。' : !growth.stable ? '近 12 周还没有实现持续盈利，先稳定订单收益。' : state.loan>0 ? '先处理贷款，暂不增加长期固定支出。' : !candidates.length ? '没有实际业务瓶颈能证明新岗位预计带来的收益足以覆盖工资和提成。' : '新增工资会挤占未来报价的周转资金。';
    estimate.teamPlan={advice:noAction(`暂缓聘用。${reason} 日后需求明朗、收益覆盖岗位成本，且未来 12 周最低余额保留后续报价资金，再考虑招聘。`)};
  }
  return estimate.teamPlan;
}

function overdueForCollection(state) {
  return state.receivables.filter(item => item.status === 'overdue' && item.reminderWeek !== state.week)
    .sort((a, b) => (a.originalDueWeek ?? a.dueWeek) - (b.originalDueWeek ?? b.dueWeek) || b.amount - a.amount)[0];
}

function troubleOrders(state) {
  return state.orders.filter(item=>ACTIVE_ORDER.has(item.status) && item.deliverWeek>item.dueWeek).sort((a,b)=>a.dueWeek-b.dueWeek);
}

function safelySpendForOrder(state,fee) {
  const {reserve,lowest,baselineFloor}=estimates(state);
  const neutral=Math.min(...plannerForecast(state).flatMap(row=>[row.cash,row.hypothetical]));
  return Math.min(state.cash,lowest.hypothetical,baselineFloor,neutral)-fee>=reserve;
}

// One shared order-task queue, not a different set of recommendations by page.
function inOrderPage(ui,section,action,label) {
  return ui.page==='orders' ? action : page('orders',label,section);
}

function orderTask(state,ui) {
  const overdue=state.receivables.filter(item=>item.status==='overdue'&&item.reminderWeek!==state.week&&!declinedTask(state,ui,`order:collect:${item.id}`)).sort((a,b)=>(a.originalDueWeek??a.dueWeek)-(b.originalDueWeek??b.dueWeek)||b.amount-a.amount)[0];
  if (overdue) return {...note(ui.page==='orders'?`先跟进${overdue.buyer.name}的逾期回款`:'先跟进逾期应收款',`${cash(overdue.amount)} 应收已逾期，原定${week(overdue.originalDueWeek ?? overdue.dueWeek)}回款，目前预计${week(overdue.dueWeek)}回款。催款可争取提前收回货款，但会略微影响客户关系。`,inOrderPage(ui,'orders-receivables',focus('collect',overdue.id,'查看逾期催款'),'查看逾期应收账款')),nextAction:deferTask(`order:collect:${overdue.id}`)};
  const urgent=troubleOrders(state).find(order=>!declinedTask(state,ui,`order:expedite:${order.id}`)&&canExpedite(state,order) && expediteFee(order)<order.total*.03 && state.cash>=expediteFee(order) && safelySpendForOrder(state,expediteFee(order)));
  if (urgent) return {...note(ui.page==='orders'?`留意 ${urgent.buyer.name} 的交期`:'先处理交期风险',`${urgent.buyer.name}预计晚交货。加急 ${cash(expediteFee(urgent))}，低于一周合同逾期罚款 ${cash(urgent.total*.03)}，且仍留有必要资金。`,inOrderPage(ui,'orders-delivery',focus('expedite',urgent.id,'查看加急操作'),'查看交期与加急')),nextAction:deferTask(`order:expedite:${urgent.id}`)};
  const debt=state.receivables.filter(item=>item.status==='bad-debt'&&!item.insuranceDueWeek&&!declinedTask(state,ui,`order:sue:${item.id}`)&&item.amount*.3>lawsuitFee(item)&&safelySpendForOrder(state,lawsuitFee(item))).sort((a,b)=>b.amount-a.amount)[0];
  if (debt) return {...note('坏账可以尝试追回',`${debt.buyer.name}有 ${cash(debt.amount)} 坏账，未获保险赔付。诉讼费 ${cash(lawsuitFee(debt))}，预计可追回的部分款项有机会超过费用，仍需承担回款风险；已留出必要资金。`,inOrderPage(ui,'orders-receivables',focus('sue',debt.id,'查看诉讼操作'),'查看坏账处理')),nextAction:deferTask(`order:sue:${debt.id}`)};
  return null;
}

function orderStatusAdvice(state,ui) {
  const trouble=troubleOrders(state);
  if (trouble.length) return note('留意交期风险',`${trouble[0].buyer.name}的订单预计晚于合同交期。${declinedTask(state,ui,`order:expedite:${trouble[0].id}`)?'你选择本周暂缓加急，仍可自行办理。':'目前没有适合交期与资金安排的加急方案。'}保留罚款周转资金，继续本周其他事项。`);
  const overdue=state.receivables.find(item=>item.status==='overdue');
  if (overdue) return note('逾期回款仍需留意',`${overdue.buyer.name}的应收仍逾期。${overdue.reminderWeek===state.week?'本周已提醒客户，等待回款。':declinedTask(state,ui,`order:collect:${overdue.id}`)?'你选择本周暂缓催款，仍可自行办理。':'目前待继续跟进。'}`);
  const debt=state.receivables.find(item=>item.status==='bad-debt'&&!item.insuranceDueWeek);
  if (debt) return note('坏账仍未收回',`${debt.buyer.name}的 ${cash(debt.amount)} 坏账尚未追回。${declinedTask(state,ui,`order:sue:${debt.id}`)?'本周已选择暂缓诉讼，仍可自行办理。':'眼下诉讼的预期收益或资金余量不足，不必勉强支付费用。'}`);
  const current=state.receivables.filter(item=>item.status==='open').sort((a,b)=>a.dueWeek-b.dueWeek||b.amount-a.amount)[0];
  if (current) return note('正常账期，先等待回款',`${current.buyer.name}的应收款 ${cash(current.amount)} 预计${week(current.dueWeek)}结算时回款。目前尚未逾期，不必提前催款。`);
  return note(state.orders.length?'现有订单按周推进':'先拿到第一张订单',state.orders.length?'交期、回款周和供应商费用会随周结算更新。当前没有需要主动催款或付费加急的合同。':'提交盈利且垫资可承受的报价，中单后订单会自动进入生产和发运。');
}

function ventureCandidates(state) {
  const growth = growthReadiness(state);
  const recentOrders = growth.orders;
  if (!growth.ready) return [];
  const candidates = [];
  for (const project of ventureProgress(state)) {
    for (const option of project.options) {
      if (!option.available || !growth.canFund(option.nextCost+project.upkeep*4)) continue;
      let basis = '';
      let weeklyBenefit = 0;
      if (project.id === 'warehouse') {
        const orders = recentOrders.filter(order => order.source === 'stock');
        weeklyBenefit = orders.reduce((sum,order)=>sum+(order.workingCapital ?? 0)*.0025+(order.lateWeeks ? order.total*.03 : 0),0)/12-project.upkeep;
        if (orders.length >= 12) basis = `最近 12 周有 ${orders.length} 笔现货采购订单，缩短备货有机会降低占款和晚交损失。`;
      } else if (project.id === 'factory') {
        const orders = recentOrders.filter(order => order.source === 'factory' && PRODUCT_BY_ID[order.productId]?.category === option.target);
        weeklyBenefit = orders.reduce((sum,order)=>sum+order.cost*.09/(1-.09*option.level),0)/12 + 455*.535*state.macro.consumer/100-project.upkeep;
        if (orders.length >= 12) basis = `最近 12 周有 ${orders.length} 笔同品类工厂订单，按现有采购规模可估算新增产线的采购节省。`;
      } else if (project.id === 'overseas') {
        const orders = recentOrders.filter(order => order.market === option.target);
        weeklyBenefit = orders.reduce((sum,order)=>sum+Math.max(0,order.shipping-(order.tariff ?? 0))*.35,0)/12-project.upkeep;
        if (orders.length >= 12 && !option.level) basis = `该市场最近 12 周有 ${orders.length} 笔订单，已有可供估算仓储运输节省的实际业务量。`;
      } else if (project.id === 'brand' && !option.level) {
        const repeat = growth.delivered.filter(order=>(state.relationships[order.buyer.id]?.deliveries ?? 0)>=3);
        weeklyBenefit=repeat.reduce((sum,order)=>sum+Math.max(0,order.profit)*.15,0)/12-project.upkeep;
        if (repeat.length>=12) basis=`最近 12 周有 ${repeat.length} 笔来自熟客的交付，保守按既有利润的少量增幅评估自主定价机会，仍有市场风险。`;
      } else if (project.id === 'ecommerce' && recentOrders.length >= 8 && state.macro.consumer >= 110 && !option.level) {
        weeklyBenefit=1540*.34*state.macro.consumer/100-project.upkeep;
        basis='按当前消费指数及店铺日常销售成本估算，每周利润仍可能波动。';
      }
      if (!basis || weeklyBenefit <= 0 || weeklyBenefit*52 < option.nextCost) continue;
      const action = option.target ? { ui: 'coach-target', form: 'invest-venture', id: project.id, choice: option.target, label: '查看推荐项目' } : focus('invest-venture', project.id, '查看推荐项目');
      const label = option.target ? `${project.label}（${option.label}）` : project.label;
      candidates.push({ tab: 'ventures', action: { type: 'invest-venture', id: project.id, ...(option.target ? { target: option.target } : {}) }, longTermEvidence:true, strategicValue: 68 + (project.id === 'warehouse' || project.id === 'factory' ? 5 : 0), advice: note(`建议${option.level ? '升级' : '投入'}${label}`, `${basis} 支出 ${cash(option.nextCost)}，扣掉每周维护费后，估计每周新增收益 ${cash(weeklyBenefit)}，按现有业务规模回收成本约 ${Math.ceil(option.nextCost/weeklyBenefit)} 周。`, action) });
    }
  }
  return candidates;
}

function marketFits(growth,market) {
  return growth.delivered.filter(order=>market.categories.includes(PRODUCT_BY_ID[order.productId]?.category) && order.profit>0).length >= 4;
}

function listingCandidate(state,growth) {
  const listing = ipoProgress(state,netAssets(state));
  const current = listing.actions.find(item=>item.current && item.available);
  if (!current || !growth.stable || growth.spent || growth.orders.length<12) return null;
  const ipo = listing.actions.find(item=>item.id==='ipo');
  const trailingProfit=state.history.slice(-52).reduce((sum,row)=>sum+(row.profit ?? 0),0);
  const ipoNear = ipo.requirements.every(item=>item.met) && trailingProfit >= 95000+20000;
  if (current.id==='restructure') {
    if (!ipoNear || !growth.canFund(current.cost)) return null;
    return { current,basis:`已有真实年度盈利和近 52 周上市营收、净利基础。即使支付改造费 ${cash(current.cost)}，仍有净利余量支持下一步申请。` };
  }
  if (current.id==='ipo') return {current,basis:`真实上市门槛已达到，预计引入 ${cash(current.cashIn)}，但创始人持股会进一步降低。`};
  if (current.id!=='strategic-investment') return null;
  if (ipoNear && growth.canFund(20000)) return { current,basis:`已有实际上市所需业绩，引资可开启后续改造与上市，预计到账 ${cash(current.cashIn)}，创始人持股将从 100% 降至 82%。` };
  // Equity is not free money: consider dilution only for a real working-capital bottleneck.
  const remainingCredit=Math.max(0,state.creditLine-state.loan);
  const shortage=growth.nextTrading-estimates(state).budget;
  if (!(shortage>remainingCredit && state.bids.length<3)) return null;
  const before=quoteBundle(state);
  if (before.steps.length>=3-state.bids.length) return null;
  const result=act(state,{type:current.id});
  if (result.error) return null;
  const after=quoteBundle(result.state);
  const added=after.expectedProfit-before.expectedProfit;
  if (after.steps.length<=before.steps.length || added<Math.max(500,growth.average*.5)) return null;
  return {current,basis:`当前正常授信和现金限制后续报价。模拟引资后，本周可多报 ${after.steps.length-before.steps.length} 笔，考虑成交机会和回款风险，预计收益增加 ${cash(added)}；预计引入 ${cash(current.cashIn)}，创始人持股降至 82%，仍需考虑长期股权代价。`};
}

function developmentPlan(state) {
  const estimate = estimates(state);
  if (estimate.developmentPlan) return estimate.developmentPlan;
  const growth = growthReadiness(state);
  const candidates = ventureCandidates(state);
  // A partial real payment is a complete voluntary decision for this week.
  // Do not repeatedly halve the remaining balance after the player confirms it.
  const repay = repaidThisWeek(state)>0 ? 0 : Math.floor(Math.min(state.loan, growth.capacity));
  for (const amount of new Set([repay, Math.floor(repay / 2)])) if (amount > 0) {
    candidates.push({ tab: 'finance', action: { type: 'repay', amount }, strategicValue: 82, advice: note('有闲置现金时优先还款', `建议偿还 ${cash(amount)}，仍保留经营周转资金，减少每周利息。`, form('repay', '查看并核对还款', amount)) });
  }
  const team = teamPlan(state);
  if (team.candidate) candidates.push({ tab:'team',action:{type:'hire',id:team.candidate.id},longTermEvidence:true,expectedWeeklyBenefit:team.expectedWeeklyBenefit,strategicValue:72,advice:team.advice });
  const markets=marketProgress(state);
  const overseas= growth.delivered.filter(order=>order.market!=='domestic' && order.profit>0);
  for (const cert of certProgress(state, netAssets(state)).filter(item => item.available)) {
    if (cert.id==='audit' && overseas.length<6 || cert.id==='supplier' && overseas.length<12) continue;
    const target = markets.filter(market=>market.cert===cert.id && !market.opened && marketFits(growth,market))
      .sort((a,b)=>(a.referralBuyer ? a.referralFee:a.fee)-(b.referralBuyer ? b.referralFee:b.fee))[0];
    if (!target) continue;
    const combined=cert.fee+(target.referralBuyer ? target.referralFee : target.fee);
    if (!growth.canFund(combined)) continue;
    candidates.push({ tab:'certifications',action:{type:'buy-cert',id:cert.id},longTermUnlock:true,longTermCost:combined,strategicValue:79,advice:note(`下一步：取得${cert.name}`,`近期订单已有${target.name}相关品类的实际利润。资质与随后开拓该市场预计共需 ${cash(combined)}，约为近期平均净利的 ${Math.ceil(combined/growth.average)} 周，已保留下轮报价资金，不依赖尚未发生的海外订单。`,focus('buy-cert',cert.id,'查看资质申请')) });
  }
  const lastExpansion=state.log.find(row=>row.type==='market')?.week ?? -Infinity;
  for (const market of markets.filter(item => !item.opened && item.eligible && (item.canRefer || item.canPay))) {
    const type = market.canRefer ? 'referral' : 'open-market';
    const fee=market.canRefer ? market.referralFee : market.fee;
    if (!growth.canFund(fee) || !marketFits(growth,market) || state.company.markets.length>1 && (overseas.length<6 || state.week-lastExpansion<12)) continue;
    candidates.push({ tab:'markets',action:{type,id:market.id},longTermEvidence:true,strategicValue:65+(market.canRefer?4:0),advice:note(`可先开拓${market.name}`,`已有实际获利的相关品类订单，资质已满足。${market.canRefer ? '熟客引荐' : '参展开拓'}费用 ${cash(fee)}，能由持续经营利润承担，同时保留后续报价资金。开拓不保证中单。`,focus(type,market.id,'查看市场方案')) });
  }
  const equity=listingCandidate(state,growth);
  if (equity) candidates.push({tab:'listing',action:{type:equity.current.id},longTermUnlock:equity.current.id==='restructure',strategicValue:90,advice:note(`当前可办理${equity.current.label}`,equity.basis,focus(equity.current.id,'','查看申请条件'))});
  estimate.developmentPlan = planDevelopment(state, candidates, { reserve: growth.reserve });
  return estimate.developmentPlan;
}

function growthTaskKey(choice) {return `growth:${choice.action.type}:${choice.action.id ?? ''}:${choice.action.target ?? ''}`;}
function repaidThisWeek(state) {return state.period?.cashBreakdown?.outflow?.repayment ?? 0;}
function improvementAdvice(choice) {
  if (!choice) return null;
  const { advice } = choice;
  const text=choice.tab==='team'?advice.text:`${advice.text} 办理后预测最低现金 ${cash(choice.cashFloor)}，不低于后续经营预留 ${cash(choice.reserve)}。`;
  return {...advice,text,nextAction:deferTask(growthTaskKey(choice))};
}

function developmentAdvice(state, tab, ui = {}) {
  const { reserve } = estimates(state);
  if (tab === 'finance') {
    const urgent = cashEmergency(state, { page: 'company', developmentTab: 'finance' });
    if (urgent) return urgent.action?.form === 'borrow' ? urgent : noAction('本页暂不建议新增或归还贷款。' + urgent.text);
  }
  const options=developmentPriorities.some(([id])=>id===tab)?developmentPlan(state).choices.filter(item=>item.tab===tab):[];
  const choice=options.find(item=>!declinedTask(state,ui,growthTaskKey(item)));
  if (choice) return improvementAdvice(choice);
  const deferred=options.find(item=>declinedTask(state,ui,growthTaskKey(item)));
  if(deferred)return noAction(`你本周选择暂缓${deferred.advice.title.replace(/^建议|^下一步：|^当前可办理/,'')}，该事项并未完成，仍可自行办理。`);
  if (tab === 'finance') {
    const repaid=repaidThisWeek(state);
    if(repaid>0)return noAction(`本周已归还 ${cash(repaid)}，${state.loan>0?`剩余贷款 ${cash(state.loan)}。先把现金留给接下来的经营，暂不建议连续还款；仍可自行还款。`:'贷款已经结清。'}`);
    return noAction(state.loan > 0 ? '目前应优先留出订单周转资金，暂缓还款。' : `当前没有贷款需要归还，也无需提前借款。建议仍保留 ${cash(reserve)} 作为周转资金。`);
  }
  if (tab === 'team') {
    const team = teamPlan(state);
    return team.candidate ? noAction('暂缓聘用。把现有订单和待揭晓报价也计入后，新增工资后的现金不适合本周招聘。') : team.advice;
  }
  if (tab === 'certifications') {
    const next = certProgress(state, netAssets(state)).find(item => !item.owned);
    if (!next) return noAction('所需资质已全部取得，暂时没有新的申请事项。');
    const unmet = next.requirements.filter(item => !item.met).map(item => item.text);
    return noAction(`${next.name}${unmet.length ? `尚有未达成条件：${unmet.join('；')}。` : '资格已达到。暂缓申请：先积累持续利润和相关品类业务，确保资质连同开拓市场的费用留足后续报价资金。'}`);
  }
  if (tab === 'markets') {
    return noAction('暂时没有同时满足真实业务需求、持续利润和后续报价资金预留的新市场。已有市场应先做好订单与回款。');
  }
  if (tab === 'partners') return noAction('客户关系随交付和回款更新，当前分区没有需要额外办理的客户事项。');
  if (tab === 'ventures') return noAction('暂时没有同时满足近期订单需求、稳定利润和周转资金预留的投资项目。先让现有业务继续经营。');
  if (tab === 'listing') {
    const next = ipoProgress(state, netAssets(state)).actions.find(item => item.current);
    if (!next) return noAction('上市目标已经完成，目前没有待办理的上市事项。');
    const unmet = next.requirements.filter(item => !item.met).map(item => item.text);
    const reason = next.id==='strategic-investment' ? '现有周转并不需要以股权换资金；应等实际业务瓶颈或上市先决业绩成熟。' : next.id==='restructure' ? '当前不急于花改造费；等真实上市营收、净利与连续年度盈利基础达标，并保留下轮经营资金。' : '暂缓支出，先确保实际经营稳定和后续报价资金。';
    return noAction(`${next.label}${unmet.length ? `尚有未满足条件：${unmet.join('；')}。` : `已满足本阶段条件。${reason}`}`);
  }
  if (tab === 'board-goals') {
    const goal = state.year.goal;
    return noAction(goal && (state.year.late > goal.maxLate || state.year.quality > goal.maxQuality) ? '今年的目标会在年末自动结算。先稳住手里的业务，明年再争取。' : '继续认真经营即可，年度目标会在年末自动结算。');
  }
  if (tab === 'economy') return noAction('宏观指标会自动影响报价成本、汇率与政策条件，本页无需手动调整。');
  if (tab === 'rivalry') return noAction('同行排名随经营变化自动更新，若有收购机会，会在待定事项中让你决定。');
  return noAction('成就和企业历程随经营自动记录，无需主动领取或提交。');
}

function restPlan(state) {
  const estimate = estimates(state);
  if (Object.hasOwn(estimate, 'restPlan')) return estimate.restPlan;
  const needed = Math.min(38, Math.max(0, 85 - state.energy));
  const options = LIFE_CATALOG.outings.filter(item => !outingLockHint(state, item))
    .flatMap(activity => activity.kind === 'quick' ? [{ activity, choice: activity }] : activity.choices.map(choice => ({ activity, choice })))
    .filter(item => item.choice.price <= estimate.budget && item.choice.price <= state.cash && item.choice.energy > 0)
    .sort((a,b) => {
      const restored = item => Math.min(item.choice.energy, 100 - state.energy);
      const aEnough = restored(a) >= needed, bEnough = restored(b) >= needed;
      return Number(bEnough) - Number(aEnough) || (aEnough ? a.choice.price - b.choice.price || restored(b) - restored(a) : restored(b) - restored(a) || a.choice.price - b.choice.price);
    });
  estimate.restPlan = options[0] ?? null;
  return estimate.restPlan;
}

function restTask(state,ui) {
  if (state.life.lastBreakWeek===state.week || state.energy>=85 || declinedTask(state,ui,'rest')) return null;
  const selected=restPlan(state);
  if (!selected) return null;
  const restored=Math.min(selected.choice.energy,100-state.energy);
  // Normal play loses one point per week; don't wait until severe exhaustion,
  // but neither force paid leisure nor suggest a token one-point recovery.
  if (ui.page!=='offwork' && state.energy>=50 && !(selected.choice.price===0 && restored>=10)) return null;
  const cost=selected.choice.price?`费用 ${cash(selected.choice.price)}`:'免费';
  const text=`精力 ${state.energy}/100。${selected.activity.label}${selected.activity.kind==='quick'?'':`可选「${selected.choice.label}」`}，${cost}，恢复 ${restored} 点精力。低精力会影响中单率。`;
  if (ui.page!=='offwork') return {...note(state.energy<50?'精力偏低，先考虑休息':'适当休息，保持经营状态',text,page('offwork','查看休息活动')),nextAction:deferTask('rest')};
  return {...note(`推荐${selected.activity.label}`,text,selected.activity.kind==='quick'?focus('outing',selected.activity.id,'查看这项活动'):{ui:'coach-select-outing',id:selected.activity.id,choice:selected.choice.id,label:'查看推荐的休息方案'}),nextAction:deferTask('rest')};
}

function offworkStatusAdvice(state) {
  if (state.life.lastBreakWeek===state.week) return note('本周已安排休息','这次活动已经结算，下周才可再次安排恢复精力的活动；仍可浏览旅行、好友、房产和车行。');
  if (state.energy>=85) return note('精力充足，先把预算用在经营',`当前精力 ${state.energy}/100。可以按喜好浏览生活活动，不必为了恢复精力额外花费。`);
  return note('可以自行安排休息',`当前精力 ${state.energy}/100。请优先选择免费的活动，避免为娱乐挤占经营资金。`);
}

// Learn what the first quote means outside the inquiry inbox, before an actual order exists.
// The separate persisted preparation index prevents repeated tours, and does not pretend
// a submitted quote is already a contract.
function preparationAdvice(state, ui, local) {
  if (!state.bids.length || state.orders.length) return null;
  const index = coachPrepIndex(ui.coachPrep);
  const next = preparation[index];
  if (!next) return null;
  const nextAction = page(next.page, next.label, next.tab);
  if (index === 1 && ui.page === 'office') {
    const { lowest, baselineFloor, reserve } = estimates(state);
    return { ...note('从报价看到资金周转', `已有报价并不等于成交。未来 12 周若没有新单，最低现金约为 ${cash(baselineFloor)}；若目前报价全部中单，预测最低 ${cash(lowest.hypothetical)}。建议留出 ${cash(reserve)} 周转资金。接下来认识现金不足时的备用授信。`, nextAction), nextAction: { ui: 'coach-focus-forecast', label: '向下查看预测图 ↓', quiet: true }, preparation: true };
  }
  if (index === 2 && introMatches(ui, preparation[1])) {
    if (local?.action) return { ...local, nextAction, preparation: true };
    const remaining = Math.max(0,state.creditLine-state.loan);
    return { ...note('认识备用资金', `现有现金优先用于采购、运费和日常经营。银行还可借 ${cash(remaining)}；借款有利息，并不是收入。目前${state.loan ? '不建议再增加贷款' : '无需借款'}，资金留在手里即可。最后认识精力与休息。`, nextAction), nextAction: skipPreparation(), preparation: true };
  }
  if (ui.page !== 'office' && ui.page !== 'inquiries') return null;
  const messages = [
    ['首笔报价已经发给客户', '这笔还在等结果。先到办公室看未来 12 周现金预测，弄清若中单会占用多少资金，再继续其他报价。'],
    ['接下来认识财务', '现金趋势已经看过了。到发展页的财务查看备用授信，了解遇到资金短缺时有哪些办法。'],
    ['再认识下班与精力', '经营会消耗精力。到下班页看看当前体力和休息安排，不必为了介绍花钱。'],
  ];
  return { ...note(...messages[index], nextAction), nextAction: skipPreparation(), preparation: true };
}

function introductionAdvice(state, ui, local) {
  const index = coachIntroIndex(ui.coachIntro);
  const next = introduction[index];
  if (!state.orders.length || !next) return local;
  const nextAction = page(next.page, next.label, next.tab);
  if (ui.page === 'inquiries' || ui.page === 'office') {
    const messages = [
      ['第一张订单到手了', '中单只是开始。到订单页看看合同交期、预计回款以及如何推进交付。'],
      ['下一步认识财务', '订单会逐周交货和回款。先看看银行授信、当前现金和每周资金趋势，了解如何防止周转中断。'],
      ['接着认识发展团队', '资金稳定后，再根据业务需要判断是否值得招聘。助理会计算新工资后的现金余额。'],
      ['最后认识下班与休息', '持续经营会消耗精力。花费合适的活动可恢复精力，低精力时中单率会受影响。'],
    ];
    return { ...note(...messages[index], nextAction), introduction: true };
  }
  if (!introMatches(ui, introduction[index - 1])) return local;
  if (index === 1 && ui.page === 'orders') {
    const order = state.orders[0];
    if (local?.action && local.action.ui === 'coach-target') return { ...local, nextAction, introduction: true };
    return { ...note('认识第一张订单', `${order.buyer.name} 的订单已成交，备货、发运、回款会随周结算更新。看过交期和预计收款后，接下来了解资金安排。`, nextAction), introduction: true };
  }
  if (index === 2 && ui.developmentTab === 'finance') {
    if (local?.action?.ui === 'coach-target' || local?.action?.page === 'orders') return { ...local, nextAction, introduction: true };
    return { ...local, action: nextAction, introduction: true };
  }
  if (index === 3 && ui.developmentTab === 'team') return { ...local, nextAction: local?.action ? nextAction : null, action: local?.action ?? nextAction, introduction: true };
  return local;
}

const developmentPriorities = [
  ['finance', '财务'], ['certifications', '资质'], ['listing', '估值上市'], ['team', '团队'], ['markets', '市场'], ['ventures', '产业链'],
];

function bestDevelopmentImprovement(state,ui={}) {
  // Compare actual before/after cash, recurring expenses and future runway for
  // all presently justified actions rather than giving one fixed tab priority.
  const next = developmentPlan(state).choices.find(item=>!declinedTask(state,ui,growthTaskKey(item)));
  const label = developmentPriorities.find(([tab]) => tab === next?.tab)?.[1];
  return next ? { ...improvementAdvice(next), action: ui.page==='company'&&!ui.developmentOverview&&ui.developmentTab===next.tab?next.advice.action:page('company', `查看${label}建议`, next.tab) } : null;
}

function developmentOverviewAdvice(state, ui) {
  const urgent = cashEmergency(state, { page: 'company', developmentTab: 'finance' });
  if (urgent) {
    if (urgent.action?.form === 'borrow') return { ...urgent, action: page('company', '查看财务建议', 'finance') };
    return noAction(`当前资金优先，本周暂停发展投入。${urgent.text}`);
  }
  const opportunity = bestDevelopmentImprovement(state,ui);
  if (opportunity) return opportunity;
  const next = state.orders.length && introduction[coachIntroIndex(ui.coachIntro)];
  if (next?.page === 'company') return { ...noAction(`目前没有适合立即支出的发展项目。初次成交后，可以先认识${next.tab === 'finance' ? '财务' : '团队'}，再继续经营。`), action: page(next.page, next.label, next.tab), introduction: true };
  return noAction('当前没有需要立即处理的财务问题，团队、资质、市场及产业也暂无适合周转安排的新增项目。本周继续做好现有经营即可。');
}

function assetRescue(state,ui,lowest) {
  // Only reached after ordinary cash, invoices, credit and usable inventory
  // prove insufficient. Compare actual owned assets; never buy one to obtain credit.
  const currentFloor=Math.min(state.cash,lowest.hypothetical);
  const candidates=[];
  const assess=(next)=>Math.min(next.cash,...forecast(next).flatMap(row=>[row.cash,row.hypothetical]),...plannerForecast(next).flatMap(row=>[row.cash,row.hypothetical]));
  function add(type,asset,then) {
    const result=act(state,{type,id:asset.id});
    if (result.error) return;
    let next=result.state;
    const cashGain=next.cash-state.cash;
    const creditGain=Math.max(0,next.creditLine-state.creditLine);
    if (type==='mortgage' && next.cash<0) {
      const room=Math.max(0,next.creditLine-next.loan);
      const borrowing=Math.min(room,Math.max(-next.cash,-lowest.hypothetical));
      if (borrowing<=0) return;
      const borrowed=act(next,{type:'borrow',amount:borrowing});
      if (borrowed.error) return;
      next=borrowed.state;
    }
    const floor=assess(next);
    if (floor<=currentFloor && next.cash<=state.cash) return;
    candidates.push({type,asset,floor,cashGain,creditGain,protected:floor>=0&&next.cash>=0,loss:type==='mortgage'?0:asset.price-cashGain,then});
  }
  for (const owned of state.life.properties.filter(item=>!item.pledged)) {
    const asset=LIFE_CATALOG.properties.find(item=>item.id===owned.id);
    if (!asset) continue;
    add('mortgage',asset);add('sell-property',asset);
  }
  for (const id of state.life.cars) {
    const asset=LIFE_CATALOG.cars.find(item=>item.id===id);
    if (asset) add('sell-car',asset);
  }
  const selected=candidates.sort((a,b)=>Number(b.protected)-Number(a.protected)||(a.protected&&b.protected?a.loss-b.loss||a.creditGain-b.creditGain||a.cashGain-b.cashGain:b.floor-a.floor||a.loss-b.loss))[0];
  if (!selected) return null;
  const {type,asset,cashGain,creditGain,loss,floor}=selected;
  const mortgage=type==='mortgage';
  const text=mortgage?`现有回款、库存和授信不足以补缺口。抵押已持有的${asset.label}可增加授信约 ${cash(creditGain)}，再按实际缺口借款，保留房产但需承担利息。`:`现有筹款途径不足。出售${asset.label}可实收 ${cash(cashGain)}，比购置价少 ${cash(loss)}，能缓解现金危机。`;
  return note(mortgage?'先用已有房产补足授信':'必要时变现已有生活资产',`${text}${floor<0?'预计仍有资金缺口，需继续核对回款。':''}`,ui.page==='offwork'?focus(type,asset.id,mortgage?'查看抵押操作':'查看出售操作'):page('offwork',mortgage?'前往房产抵押':'前往生活资产'));
}

function cashEmergency(state, ui) {
  const { lowest, rows, baselineFloor } = estimates(state);
  if (state.cash >= 0 && lowest.hypothetical >= 0) return null;
  // If only the new bids cause the shortfall, undoing a quote is free and avoids more borrowing.
  if (state.cash >= 0 && baselineFloor >= 0 && state.bids.length) {
    const bid = [...state.bids].sort((a, b) => b.workingCapital - a.workingCapital)[0];
    return note('先减少新增垫资', '现有业务的预测余额还够用，但如果新报价都中单，资金会不足。建议先撤回占用现金最多的报价，再结算。', ui.page === 'inquiries' ? focus('withdraw-bid', bid.inquiryId, '查看该笔报价') : page('inquiries', '检查已提交报价'));
  }
  const room = Math.max(0, state.creditLine - state.loan);
  const bill = state.receivables.filter(item => factorValue(state, item) > 0).sort((a, b) => factorValue(state, b) - factorValue(state, a))[0];
  if (bill) return note('先回收应收款', `${bill.buyer.name} 的应收款可以保理并立即到账 ${cash(factorValue(state, bill))}，代价是放弃部分货款。眼下先补足周转资金。`, ui.page === 'orders' ? focus('factor', bill.id, '查看可保理应收') : page('orders', '前往回款与保理', 'orders-receivables'));
  if (room > 0 && state.cash < 0) return note('先安排现金缺口', `目前现金为负，尚有 ${cash(room)} 授信。建议先借 ${cash(Math.min(-state.cash, room))} 弥补${room < -state.cash ? '一部分' : ''}现有缺口；未来第 ${lowest.week} 周仍需复查现金预测。`, ui.page === 'company' && ui.developmentTab === 'finance' ? form('borrow', '查看可用借款', Math.min(-state.cash, room)) : page('company', '前往财务筹款', 'finance'));
  const lots = new Map();
  for (const item of state.inventory) lots.set(item.productId, (lots.get(item.productId) ?? 0) + item.quantity);
  for (const bid of state.bids) if (bid.source === 'inventory') lots.set(bid.productId, (lots.get(bid.productId) ?? 0) - bid.quantity);
  const stock = [...lots].filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id, value: liquidationValue(state, id, quantity) })).sort((a,b) => b.value - a.value)[0];
  if (stock?.value > 0) return note('先变现可用库存', `${PRODUCT_BY_ID[stock.id]?.name ?? '可用库存'} 清仓预计立即到账 ${cash(stock.value)}，但会减少库存价值。没有其他即时筹款选择时可考虑。`, ui.page === 'orders' ? focus('liquidate', stock.id, '查看清仓金额') : page('orders', '前往可用库存', 'orders-inventory'));
  const rescue=assetRescue(state,ui,lowest);
  if(rescue)return rescue;
  if (state.cash >= 0 && rows[0].hypothetical >= 0) return note('暂缓新支出，本周可以继续推进', '当前没有适合的即时筹款渠道，未来现金仍有缺口。建议先不再接新单或投资，让现有业务继续交货回款。', settle());
  return note('暂停新增支出', '现在没有可立即弥补缺口的回款、授信或可用库存。暂缓报价、招聘和投资。继续周结算可能使资金链进一步恶化，请先核对已有订单的预计回款。');
}

function pendingReview(state,ui) {
  const signatures=reviewSignatures(state);
  const descriptions={
    'orders-delivery':['核对交付进展','本周有尚未查阅的订单或交付变化，先核对交期和预计回款，无需重复办理已经完成的操作。','查看订单进展'],
    'orders-receivables':['核对应收与回款变化','有新的应收、回款状态或到期安排需要了解；正常账期不用催款。','查看回款进展'],
    'orders-funding':['核对预计到账款','新增或变化的退税、理赔已进入现金预测，核对预计到账周即可。','查看退税与理赔'],
    'orders-inventory':['核对库存变化','手头有新的或变化的库存，核对数量和用途，不必为了操作额外采购。','查看库存'],
    cash:['核对新增现金承诺','报价、合同或回款安排有所变化。看一下未来 12 周现金趋势，确认资金能撑到回款。','查看现金预测'],
  };
  for (const id of reviewIds) {
    if (!signatures[id]||signatures[id]===ui.coachReview?.[id]?.signature) continue;
    const [title,text,label]=descriptions[id];
    const action=id==='cash'?{ui:'coach-review-cash',label}:{ui:'coach-review-orders',id,label};
    return note(title,text,action);
  }
  return null;
}

function quietWeek(state,ui,quoted) {
  const rested=state.life.lastBreakWeek===state.week;
  const declined=coachDeclinedRecord(ui.coachDeclined,state.week);
  const deferred=declined.tasks.length||declined.inquiries.length?'你选择暂缓的事项仍保留，可自行返回办理。':'';
  const text=`${quoted.text} 当前没有其他建议立即办理的经营事项。${deferred}${rested?'本周已安排过休息，仍可浏览生活内容，或直接结算。':'可以去下班娱乐，也可以直接结束本周。'}`;
  if (ui.page==='offwork') return {...note(rested?'本周已安排休息':'本周暂时没有其他经营事项',`${deferred}${rested?'本周活动已经结算，可以继续浏览生活内容，或结束本周。':'可以自行选择活动，也可以直接结束本周，不要求消费。'}`,settle()),quietWeek:true};
  return {...note(quoted.title,text,page('offwork',rested?'去下班看看':'去下班娱乐')),nextAction:settle(),quietWeek:true};
}

function attachOnward(local,next) {
  if (!local || !next) return next??local;
  const reason=next.quietWeek?'暂无其他建议立即办理的事项；你仍可自行选择娱乐、继续处理或结算。':`${next.title}：${next.text.split('。')[0]}。`;
  return {...local,text:`${local.text} ${reason}`,action:next.action,nextAction:next.nextAction,quietWeek:next.quietWeek};
}

// Replan on every state change and identical rules on every page. The current
// page only controls where a task's button points and its local explanation.
function weeklyAction(state,ui,local) {
  const growth=ui.coachDeferredWeek===state.week?null:bestDevelopmentImprovement(state,ui);
  if (growth) return growth;
  const rest=restTask(state,ui);
  if (rest) return rest;
  const quoted=inquiryAdvice(state,coachQuoteFilters(state,ui),ui.page==='inquiries');
  if (quoted.action.command!=='end-week') return quoted;
  return pendingReview(state,ui)??quietWeek(state,ui,quoted);
}

function pageAdvice(state, ui) {
  if (state.bankrupt) return null;
  if (state.events.length) return note('先处理本周待定事项','助理会在事项内比较结果并推荐处理方式，解决后才能继续周结算。',{ui:'show-event',label:'查看待定事项'});
  const emergency=cashEmergency(state,ui);
  if (emergency) return emergency;
  const order=orderTask(state,ui);
  if (order) return order;

  const local=ui.page==='company'?(ui.developmentOverview?developmentOverviewAdvice(state,ui):developmentAdvice(state,ui.developmentTab,ui)):
    ui.page==='orders'?orderStatusAdvice(state,ui):ui.page==='offwork'?offworkStatusAdvice(state):null;
  const prep=preparationAdvice(state,ui,local);
  if (prep) return prep;
  const orientation=introductionAdvice(state,ui,local);
  if (orientation?.introduction) return orientation;
  if (ui.page==='company' && local?.action) return local;
  const next=weeklyAction(state,ui,local);
  // When the player intentionally enters a local section, preserve its own
  // explanation, but never strand them there after a completed task.
  if (ui.page==='offwork' && (next.action?.ui==='coach-select-outing'||next.action?.action==='outing'||next.quietWeek)) return next;
  if (ui.page==='company'||ui.page==='orders'||ui.page==='offwork') return attachOnward(local,next);
  return next;
}

function actionButton(action) {
  if (!action) return '';
  if (action.command === 'end-week') return `<button type="button" class="button ${action.quiet ? 'quiet' : 'coach-action'}" data-action="end-week">${esc(action.label)}</button>`;
  return `<button type="button" class="button ${action.quiet ? 'quiet' : 'coach-action'}" data-ui="${action.ui}"${action.page ? ` data-page="${action.page}"` : ''}${action.tab ? ` data-coach-tab="${action.tab}"` : ''}${action.id != null ? ` data-id="${esc(action.id)}"` : ''}${action.choice ? ` data-choice="${esc(action.choice)}"` : ''}${action.action ? ` data-coach-action="${esc(action.action)}"` : ''}${action.form ? ` data-coach-form="${esc(action.form)}"` : ''}${Number.isSafeInteger(action.amount) ? ` data-coach-amount="${action.amount}"` : ''}>${esc(action.label)}</button>`;
}

function card(state, advice, { extra = '', preview = false, progress = false, overview = false } = {}) {
  if (!advice) return '';
  const person = ASSISTANTS.find(item => item.id === state.assistant) ?? ASSISTANTS[0];
  return `<aside class="coach-card" aria-label="助理带教"${preview ? ' data-quote-preview="coach" tabindex="-1"' : ''}>
    <span class="portrait headshot coach-portrait" data-assistant-id="${esc(person.id)}" aria-hidden="true" style="background-image:url('${esc(person.portrait)}')"></span>
    <div class="coach-copy"><small class="coach-label">${esc(person.name)}的带教建议${overview ? '（发展总览）' : progress ? `（入门 ${state.tutorial.step + 1}/5）` : ''}</small><h3>${esc(advice.title)}</h3><p>${esc(advice.text)}</p>
    ${advice.action || advice.nextAction || extra ? `<div class="coach-actions">${actionButton(advice.action)}${actionButton(advice.nextAction)}${extra}</div>` : ''}</div></aside>`;
}

export function pageCoach(state, ui) {
  if (!easy(state)) return '';
  const step = !state.tutorial.done && [0,1,3].includes(state.tutorial.step);
  const advice = pageAdvice(state, ui);
  const extra = advice?.preparation ? (advice.nextAction?.ui === 'coach-skip-prep' ? '' : actionButton(skipPreparation())) : advice?.introduction ? '<button type="button" class="button quiet" data-ui="coach-skip-intro">跳过介绍</button>' : step ? '<button type="button" class="button quiet" data-ui="skip-tutorial">跳过基础流程提示</button>' : '';
  return card(state, advice, { extra, progress: step, overview: ui.page === 'company' && ui.developmentOverview });
}

function manualQuoteAdvice(state,inquiry,model,selected) {
  const draft=quote(state,inquiry,model);
  const apply=selected?{ui:'coach-apply-quote',label:'采用助理方案'}:null;
  if (draft.error) return note('当前改动还不能提交',draft.error,apply);
  const floor=Math.min(...forecast(state,draft).map(row=>row.hypothetical));
  const value=quoteExpectedProfit(state,draft);
  const previous=selected?quoteExpectedProfit(state,selected.offer):null;
  const delta=previous===null?null:value-previous;
  const tradeoff=delta===null?'':Math.abs(delta)<50?' 考虑成交机会和回款风险，两种方案预计收益接近。':` 考虑成交机会和回款风险，相比助理方案预计收益${delta>0?'增加':'减少'}约 ${cash(Math.abs(delta))}。`;
  const details=`你的方案预计中单率 ${percent(draft.probability)}，订单利润 ${cash(draft.profit)}，若本周报价全部成交，预计最低余额 ${cash(floor)}。${tradeoff}`;
  const review={ui:'coach-review-submit',label:'保留我的方案，查看提交 ↓'};
  const safe=draft.profit>0&&draft.probability>0&&floor>=estimates(state).reserve;
  if (safe) return {...note('你的报价方案可保留',`${details}${!selected?' 单笔可盈利，但仍要留意整周经营安排。':' 仍保留必要资金，可以维持你的选择。'}`,review),nextAction:apply?{...apply,quiet:true}:null};
  const risk=draft.probability<=0?'当前价格没有中单机会。':draft.profit<=0?'即使成交也没有正利润。':`最低现金低于建议预留 ${cash(estimates(state).reserve)}，会挤占周转。`;
  return {...note('你的改动有经营风险',`${details} ${risk} 仍由你决定是否提交。`,apply??review),nextAction:apply?{...review,quiet:true}:null};
}

export function quoteCoach(state, inquiry, model, filter, initial={}) {
  if (!easy(state)) return '';
  if (state.bids.some(item => item.inquiryId === inquiry.id) || state.bids.length >= 3) return card(state, note('本周暂时无法再提交这笔报价', '待本周结算后再选择新机会，也可以先在询盘页撤回不再合适的报价。'), { preview: true });
  const recommended = verifyRecommendation(state, quoteRecommendation(state, inquiry, filter));
  const applied=recommended&&Object.entries(recommended.config).every(([name,value])=>name==='brandUnitPrice'&&!recommended.config.branded||String(model[name]??'')===String(value));
  const edited=Object.keys(initial).length>0&&Object.entries(initial).some(([name,value])=>!(name==='brandUnitPrice'&&!model.branded)&&String(model[name]??'')!==String(value??''));
  if(edited&&!applied)return card(state,manualQuoteAdvice(state,inquiry,model,recommended),{preview:true});
  if (!recommended) return card(state, note('暂时不建议提交这笔报价', '请检查利润、交期、回款和现金预测。若资金不足，可以挑其他询盘，不必为了中单而降到亏损价。'), { preview: true });
  const { offer, config, cashFloor } = recommended;
  const currency = { CNY: '人民币', USD: '美元', EUR: '欧元' }[offer.currency] ?? offer.currency ?? '人民币';
  const price = offer.branded ? `自有品牌单价定为 ${offer.unitPrice} ${currency}${inquiry.unit ? `/${inquiry.unit}` : ''}` : `按目标价的 ${offer.ratio}% 报价`;
  const terms = offer.extraTerms ? `在原账期基础上延长 ${offer.extraTerms} 周` : '沿用买家原账期';
  const financing = offer.financing === 'standard' ? '' : `，采用${financingNames[offer.financing] ?? '当前回款方式'}`;
  const staff = state.staff.find(person => person.id === offer.staffId);
  const text = `${price}，采用${sourceNames[offer.source]}，${terms}${financing}，${staff ? `由${staff.name}跟进` : '由你亲自跟进'}。预计中单率 ${percent(offer.probability)}，订单利润 ${cash(offer.profit)}，最低预测余额 ${cash(cashFloor)}。采用后仍需你确认提交。`;
  return card(state, note(applied ? '已采用当前建议方案' : '建议先用这套报价方案', text, applied ? { ui: 'coach-review-submit', label: '向下查看明细与提交 ↓' } : { ui: 'coach-apply-quote', label: '采用助理方案' }), { preview: true });
}

export function eventCoach(state, event, choices) {
  if (!easy(state) || choices.length <= 1) return null;
  const { budget, reserve } = estimates(state);
  const affordable = choices.filter(choice => !choice.disabled && Math.max(0, -(choice.impact?.cash ?? 0), choice.cost ?? 0) <= Math.max(0, state.cash));
  const safety = planEventSafety(state,event,affordable,{reserve});
  const valid = safety.choices;
  if (!valid.length) return null;
  const order = state.orders.find(item => item.id === event.orderId && ACTIVE_ORDER.has(item.status));
  const invoice = state.receivables.find(item => item.id === event.invoiceId);
  const stock = state.inventory.find(item => item.productId === event.productId);
  const spendable = cost => cost <= budget;
  let ranked;
  let reason;
  if (order) {
    ranked = [...valid].sort((a,b) => {
      const score = choice => choice.impact.cancelWeek ? -order.total : (choice.impact.profit ?? order.profit) - Math.max(0, (choice.impact.deliveryWeek ?? order.dueWeek) - order.dueWeek) * order.total * .03;
      return score(b)-score(a) || (a.impact.deliveryWeek ?? 0)-(b.impact.deliveryWeek ?? 0);
    });
    reason = '比较预计交期、订单利润与合同逾期罚款，优先保住合同和现金回流。';
  } else {
    const opportunities = state.inquiries.filter(inquiry => !state.bids.some(bid => bid.inquiryId === inquiry.id));
    const worthConsidering = (test, sources = ['stock', 'factory']) => opportunities.some(inquiry => sources.some(source => {
      const proposal = quote(state, inquiry, { source, ratio: 90 });
      return !proposal.error && proposal.profit > 0 && proposal.probability > 0 && proposal.workingCapital <= budget && test(proposal);
    }));
    const preferred = {
      'add-order': 'accept', 'key-client': 'contact', 'sample-approval': spendable(300) ? 'send' : 'thanks',
      'materials': spendable(700) && worthConsidering(offer => offer.cost > 7000, ['factory']) ? 'reserve' : 'open',
      'buyer-crisis': spendable(450) && (invoice?.amount ?? 0) * .1 > 450 ? 'visit' : 'extend',
      'fx-surge': spendable(600) && state.receivables.filter(bill => OPEN_RECEIVABLE.has(bill.status) && bill.currency === 'USD').reduce((total,bill) => total + (bill.foreignBalance ?? 0), 0) * .2 > 600 ? 'protect' : 'float',
      'new-tariff': spendable(550) && worthConsidering(offer => offer.market === event.market && offer.total >= 20000) ? 'certify' : 'observe',
      'tax-rebate': spendable(280) && worthConsidering(offer => offer.market === event.market && offer.total >= 15000) ? 'file' : 'ignore',
      'local-fair': spendable(750) && state.bids.length < 2 ? 'book' : 'skip',
      'winter-supply': spendable(420) && worthConsidering(offer => offer.cost > 8400, ['factory']) ? 'combine' : 'wait',
      'season': spendable(250) ? 'reply' : 'watch',
      'warehouse-water': spendable(360) && (stock?.unitCost ?? 0) * (stock?.quantity ?? 0) * .12 > 360 ? 'move' : 'mark',
      'rate-reset': spendable(220) && state.loan * .0005 * 6 > 220 ? 'prepare' : 'keep',
      'container-pool': spendable(500) && worthConsidering(offer => offer.market === event.market && offer.shipping > 4200) ? 'book' : 'wait',
      'overstock': state.cash < reserve ? 'sell' : 'save',
      'trade-note': spendable(200) && state.company.rep < 100 ? 'use' : 'later',
      'supplier-demo': spendable(380) && worthConsidering(offer => offer.cost > 5000, ['factory']) ? 'visit' : 'pass',
      'staff-poach': event.staffId === state.assistant ? (growthReadiness(state).stable && growthReadiness(state).average > event.raise*3 && spendable(event.raise*12) ? 'retain' : 'defer') : spendable(event.raise*12) && growthReadiness(state).stable ? 'retain' : 'release',
      'rival-sale': growthReadiness(state).canFund(event.fee) && (state.rivals.find(item=>item.id===event.rivalId)?.scale ?? 0)*40*19*.65 >= event.fee ? 'acquire' : 'pass',
    }[event.code ?? event.type];
    const picked = valid.find(choice => choice.id === preferred);
    ranked = picked ? [picked] : [...valid].sort((a,b) => (b.impact.cash ?? 0)-(a.impact.cash ?? 0));
    const reasons = {
      'add-order': '获取新的复购询盘不会产生费用，收到具体订单后再算利润。',
      'key-client': '维持合作关系有助于复购，这次联系不会立即占用周转资金。',
      'buyer-crisis': preferred === 'visit' ? '应收金额较大，对账可提高回款概率，预计收益高于对账费用，但回款仍有风险。' : '当前应收金额或资金余量不足以支持额外对账费用，延后回款也要留意新的现金安排。',
      'fx-surge': preferred === 'protect' ? '当前美元应收金额较高，汇率波动可能影响较多货款，锁汇能减少波动风险。' : '当前美元应收的潜在汇兑损失不足以覆盖锁汇费用，先保留现金并承担汇率波动。',
      'warehouse-water': preferred === 'move' ? '当前库存价值较高，预计账面贬值超过移库费，可以优先保住库存价值。' : '库存贬值估计不高或现金紧张，先避免额外移库支出。',
      'rate-reset': preferred === 'prepare' ? '当前借款规模较大，若维持借款，预计短期利息节约可能超过准备费用。' : '当前借款规模或资金余量有限，预期利息节约不一定覆盖准备费用。',
      'overstock': preferred === 'sell' ? '周转资金偏紧，低价卖出部分库存能立即回收现金，代价是减少库存价值。' : '目前周转资金尚可，可以先为后续报价保留库存。',
      'staff-poach': preferred === 'retain' ? '当前现金预留可以承担未来几周新工资，尽量保留已有员工和业务能力。' : '持续加薪可能挤占周转，目前应先控制固定支出。',
      'rival-sale': preferred === 'acquire' ? '当前现金预留可承担收购费，接手库存和本地渠道有机会扩大业务。' : '接手竞争对手需要立即支出现金，先保护自己的周转。',
    };
    const key = event.code ?? event.type;
    reason = picked && reasons[key] ? reasons[key] : (chosenReason(ranked[0], preferred, budget));
  }
  const comparison=planEventRollouts(state,event,safety,{preferredId:ranked[0].id});
  const chosen=comparison.choice;
  if(comparison.compared>1){
    const horizon=comparison.rollout.horizon,scenarios=comparison.rollout.scenarioCount;
    const prefix=`我比较了这几种安排，按 ${scenarios} 种可能的情况算了接下来 ${horizon} 周的接单、交货和回款。`;
    if(chosen.id!==ranked[0].id){
      const cost=chosen.upfront?`本次需支出 ${cash(chosen.upfront)}。`:'本次不增加立即支出。';
      const choiceReason=comparison.reason==='risk'?'这样资金周转更稳妥。':comparison.reason==='certain'?'这项安排的实际条件不会比其他选择差。':'这样更有利于接下来的经营。';
      reason=`${prefix}${cost}${choiceReason} 实际结果仍可能变化。`;
    }else reason=`${prefix}${reason} 实际结果仍可能变化。`;
  }
  if (!safety.safe) reason += ` 现有选项都不能充分保留 ${cash(chosen.reserve)} 周转资金；这个方案的保守预测最低余额 ${cash(Math.min(chosen.cashFloor,chosen.scenarioFloor))}，在可执行方案中资金风险较低，但仍可能缺钱。`;
  else if (safety.all.some(choice=>!choice.safeReserve)) reason += ` 其他方案可能挤占周转资金；该方案未来 12 周预计最低余额至少 ${cash(Math.min(chosen.cashFloor,chosen.scenarioFloor))}，仍保留必要现金。`;
  return { id: chosen.id, html: card(state, note(`建议：${chosen.label}`, reason)) };
}

function chosenReason(choice, preferred, budget) {
  const cost = Math.max(0, -(choice.impact?.cash ?? 0), choice.cost ?? 0);
  if (choice.id !== preferred || cost === 0) return cost > 0 ? '当前优先采用可负担的安排。请核对下方费用与影响，再确认处理。' : '当前选择不会新增立即支出。请根据后续报价和回款安排保留周转现金。';
  return `当前支出 ${cash(cost)} 处于预留后的现金余量 ${cash(budget)} 内，有机会改善后续经营条件；实际收益仍取决于新订单与市场变化。`;
}
