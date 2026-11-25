import { ASSISTANTS, BUYER_CREDITS, PRODUCT_BY_ID } from '../data/core.js';
import { STAFF_ROLES } from '../data/expansion.js';
import { certProgress, marketProgress } from '../engine/expansion.js';
import { canExpedite, expediteFee, factorValue, forecast, liquidationValue, netAssets } from '../engine/game.js';
import { LIFE_CATALOG, outingLockHint } from '../engine/life.js';
import { quote } from '../engine/quotes.js';
import { ipoProgress, ventureProgress } from '../engine/strategy.js';
import { ACTIVE_ORDER, OPEN_RECEIVABLE } from '../engine/treasury.js';

const cash = value => `¥${Math.round(value).toLocaleString('zh-CN')}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const percent = value => `${Math.round(value * 100)}%`;
const week = value => `第 ${value} 周`;
const easy = state => state.difficulty === 'casual';
const activeCache = new WeakMap();
const sourceNames = { stock: '现货采购', factory: '工厂排产', inventory: '现有库存' };
const financingNames = { standard: '按普通账期', insured: '出口信用保险', 'letter-of-credit': '信用证' };
const introduction = [
  { page: 'orders', label: '查看订单与交期' },
  { page: 'company', tab: 'finance', label: '认识财务' },
  { page: 'company', tab: 'team', label: '认识团队' },
  { page: 'offwork', label: '认识下班与休息' },
];
const introMatches = (ui, step) => step && ui.page === step.page && (!step.tab || (!ui.developmentOverview && ui.developmentTab === step.tab));
export function coachIntroIndex(value) {
  return Number.isInteger(value) ? Math.max(0, Math.min(introduction.length, value)) : 0;
}
export function recordCoachVisit(state, ui) {
  if (!easy(state) || !state.orders.length) return false;
  const index = coachIntroIndex(ui.coachIntro);
  if (!introMatches(ui, introduction[index])) return false;
  ui.coachIntro = index + 1;
  return true;
}

// Reserve cash against existing commitments. Reuse the forecast while the immutable game state is unchanged.
function estimates(state) {
  if (activeCache.has(state)) return activeCache.get(state);
  const rows = forecast(state);
  const lowest = rows.reduce((best, row) => row.hypothetical < best.hypothetical ? row : best, rows[0]);
  const reserve = Math.max(5000, 4 * (1200 + state.staff.reduce((sum, person) => sum + person.salary, 0)));
  const result = { lowest, rows, baselineFloor: Math.min(...rows.map(row => row.cash)), reserve, budget: Math.max(0, Math.min(state.cash, lowest.hypothetical) - reserve), quotes: new Map() };
  activeCache.set(state, result);
  return result;
}

function proposalConfig(offer) {
  return { source: offer.source, ratio: offer.ratio, extraTerms: offer.extraTerms, staffId: offer.staffId ?? '', financing: offer.financing,
    branded: offer.branded, brandUnitPrice: offer.unitPrice };
}

// The assistant compares executable quotes, preferring a good expected return, short cash cycles,
// reliable buyers and enough reserve for other commitments. This is a shortlist, not a guarantee.
export function quoteRecommendation(state, inquiry) {
  if (!easy(state) || !inquiry || state.bids.length >= 3 || state.bids.some(item => item.inquiryId === inquiry.id)) return null;
  const estimate = estimates(state);
  if (estimate.quotes.has(inquiry.id)) return estimate.quotes.get(inquiry.id);
  const credit = BUYER_CREDITS.indexOf(inquiry.buyer.credit);
  const sources = ['stock', 'factory', ...(state.inventory.some(item => item.productId === inquiry.productId) ? ['inventory'] : [])];
  const ratioBelow = Math.floor((Math.min(inquiry.targetPrice, ...inquiry.rivals.map(rival => rival.price)) - 1) * 100 / inquiry.targetPrice);
  const ratios = [...new Set([80, 85, 90, 95, 100, ratioBelow, ratioBelow + 1].filter(n => n >= 80 && n <= 100))];
  const sales = state.staff.filter(person => person.role === 'sales').sort((a, b) => b.ability - a.ability).slice(0, 2);
  const staffOptions = [null, ...sales.map(person => person.id)];
  const overseas = inquiry.currency !== 'CNY';
  const financingOptions = overseas ? ['standard', 'letter-of-credit', 'insured'] : ['standard'];
  let best = null;
  function compare(config) {
    const offer = quote(state, inquiry, config);
    if (offer.error || offer.profit <= 0 || offer.probability <= 0 || offer.workingCapital > estimate.budget) return;
    const reliability = offer.financing === 'letter-of-credit' ? .99 : 1 - Math.max(0, credit + 1) * (offer.insurancePremium ? .009 : .022);
    const expected = (offer.profit + offer.rebateEstimate) * offer.probability * reliability;
    const score = expected / (1 + (offer.expectedPayWeek - state.week) * .045 + offer.workingCapital / Math.max(1, estimate.budget) * .3);
    if (!best || score > best.score) best = { offer, config: proposalConfig(offer), score };
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
  if (best) {
    const finalist = best.config;
    for (const extraTerms of [1, 2, 3, 4]) compare({ ...finalist, extraTerms });
  }
  estimate.quotes.set(inquiry.id, best);
  return best;
}

function verifyRecommendation(state, recommendation) {
  if (!recommendation) return null;
  if (recommendation.cashFloor === undefined) recommendation.cashFloor = Math.min(...forecast(state, recommendation.offer).map(row => row.hypothetical));
  return recommendation.cashFloor < 0 ? null : recommendation;
}

function bestInquiry(state, filter) {
  const candidates = [];
  for (const inquiry of state.inquiries) {
    if (filter && filter.category && filter.category !== 'all' && inquiry.category !== filter.category) continue;
    if (filter?.availability === 'available' && !['stock', 'factory', 'inventory'].some(source => !quote(state, inquiry, { source, ratio: 100, extraTerms: 0 }).error)) continue;
    const recommendation = quoteRecommendation(state, inquiry);
    if (recommendation) candidates.push({ inquiry, recommendation });
  }
  return candidates.sort((a, b) => b.recommendation.score - a.recommendation.score).slice(0, 3)
    .find(item => verifyRecommendation(state, item.recommendation)) ?? null;
}

const page = (id, label, tab) => ({ ui: 'page', page: id, label, tab });
const focus = (action, id, label) => ({ ui: 'coach-target', action, id, label });
const form = (name, label) => ({ ui: 'coach-target', form: name, label });
const settle = () => ({ command: 'end-week', label: '结束本周，查看结果' });
const deferGrowth = () => ({ ui: 'coach-defer-growth', label: '稍后发展，继续报价', quiet: true });
const note = (title, text, action) => ({ title, text, action });
const noAction = reason => note('本周不用操作', reason);

function inquiryAdvice(state, filter) {
  if (state.bids.length) return note('本周报价已提交', `目前已提交 ${state.bids.length} 笔报价（每周最多 3 笔）。可以自行比较其他询盘，但这轮建议先结算，让订单和资金按周推进。`, settle());
  const best = bestInquiry(state, filter);
  if (best) {
    const { inquiry, recommendation: { offer } } = best;
    return note(`先看${inquiry.buyer.name}的${inquiry.productName}询盘`, `建议用${sourceNames[offer.source]}，预计中单率 ${percent(offer.probability)}、订单利润 ${cash(offer.profit)}。垫资约 ${cash(offer.workingCapital)}，目前仍能留出周转资金。`, { ui: 'quote-open', id: inquiry.id, label: '打开推荐询盘' });
  }
  if (filter?.category && filter.category !== 'all' && bestInquiry(state, {})) return note('当前筛选没有合适的方案', '其他品类还有利润和资金都合适的询盘，先取消品类筛选再挑选。', { ui: 'coach-all-inquiries', label: '查看全部品类' });
  return note('先别急着发新报价', '目前没有同时满足利润和周转资金预留的方案。可以调整筛选条件，或者结算本周，让新询盘与现有订单继续推进。', settle());
}

function teamPlan(state) {
  const estimate = estimates(state);
  if (estimate.teamPlan) return estimate.teamPlan;
  const openRole = ['operations', 'finance', 'sales'].filter(role => !state.staff.some(person => person.role === role));
  const role = state.orders.some(order => ACTIVE_ORDER.has(order.status)) && openRole.includes('operations') ? 'operations'
    : state.receivables.some(item => OPEN_RECEIVABLE.has(item.status)) && openRole.includes('finance') ? 'finance'
      : openRole.includes('sales') ? 'sales' : openRole[0];
  const candidates = state.candidates.filter(person => person.role === role && !state.staff.some(staff => staff.id === person.id))
    .sort((a, b) => b.ability - a.ability || a.salary - b.salary);
  const last = state.history.slice(-4);
  const profit = last.reduce((sum, row) => sum + row.profit, 0) / Math.max(1, last.length);
  const recentStable = last.length === 4 && last.filter(row => row.profit > 0).length >= 3;
  const neededRole = STAFF_ROLES[role]?.label ?? '对应岗位';
  if (!role || state.staff.length >= 18) {
    estimate.teamPlan = { advice: noAction('暂缓聘用。当前已有覆盖三类业务的岗位或办公室人员已满，继续做好现有订单。') };
  } else if (!candidates.length) {
    estimate.teamPlan = { advice: noAction(`暂缓聘用。目前人才市场没有合适的${neededRole}，等候选人刷新。`) };
  } else {
    const cheapest = candidates.reduce((best, person) => person.salary < best.salary ? person : best, candidates[0]);
    const profitTarget = Math.ceil(cheapest.salary * 1.5);
    let selected;
    for (const candidate of candidates) {
      const payroll = candidate.salary * 12;
      const reserve = Math.max(5000, estimate.reserve + candidate.salary * 4);
      if (!recentStable || profit < 1.5 * candidate.salary || state.cash < candidate.salary || estimate.lowest.hypothetical - payroll < reserve) continue;
      const simulated = forecast({ ...state, staff: [...state.staff, candidate] });
      const minimum = Math.min(...simulated.map(row => row.hypothetical));
      if (minimum >= reserve) { selected = { candidate, minimum, reserve, payroll }; break; }
    }
    if (selected) {
      const { candidate, minimum, reserve, payroll } = selected;
      estimate.teamPlan = { candidate, advice: note(`建议聘用${candidate.name}（${STAFF_ROLES[candidate.role].label}）`, `岗位目前缺人。近 4 周平均净利 ${cash(profit)}，可覆盖新周薪 ${cash(candidate.salary)}；新增 12 周工资 ${cash(payroll)} 后，预测最低余额 ${cash(minimum)}，高于建议周转预留 ${cash(reserve)}。`, focus('hire', candidate.id, '查看推荐候选人')) };
    } else {
      const target = Math.max(5000, estimate.reserve + cheapest.salary * 4) + cheapest.salary * 12;
      const cause = last.length < 4 ? '经营记录还不足 4 周，尚不能判断持续盈利。' : !recentStable || profit < profitTarget
        ? `近 4 周平均净利 ${cash(profit)}，或盈利周数不足以稳定承担新工资。` : `考虑现有订单和新增工资后的现金余量不足。`;
      estimate.teamPlan = { advice: noAction(`暂缓聘用。${cause} 建议先达到近 4 周至少 3 周盈利、平均净利 ${cash(profitTarget)} 以上，且未来 12 周最低余额达到 ${cash(target)}，再考虑增补${neededRole}。`) };
    }
  }
  return estimate.teamPlan;
}

function overdueForCollection(state) {
  return state.receivables.filter(item => item.status === 'overdue' && item.reminderWeek !== state.week)
    .sort((a, b) => (a.originalDueWeek ?? a.dueWeek) - (b.originalDueWeek ?? b.dueWeek) || b.amount - a.amount)[0];
}

function orderAdvice(state) {
  const bills = state.receivables.filter(item => OPEN_RECEIVABLE.has(item.status));
  const trouble = state.orders.filter(item => ACTIVE_ORDER.has(item.status) && item.deliverWeek > item.dueWeek)
    .sort((a, b) => a.dueWeek - b.dueWeek);
  const urgent = trouble.find(order => canExpedite(state, order) && expediteFee(order) < order.total * .03 && state.cash >= expediteFee(order));
  if (urgent) return note(`留意 ${urgent.buyer.name} 的交期`, `预计晚交货。加急花费 ${cash(expediteFee(urgent))}，低于一周的合同逾期罚款 ${cash(urgent.total * .03)}，可以少损失一部分。`, focus('expedite', urgent.id, '查看加急操作'));
  const overdue = overdueForCollection(state);
  if (overdue) return note(`先跟进${overdue.buyer.name}的逾期回款`, `${cash(overdue.amount)} 应收已逾期，原定${week(overdue.originalDueWeek ?? overdue.dueWeek)}回款，目前预计${week(overdue.dueWeek)}回款。催款可争取提前回收货款，但会略微影响客户关系。`, focus('collect', overdue.id, '查看逾期催款'));
  const debt = state.receivables.find(item => item.status === 'bad-debt' && !item.insuranceDueWeek && state.cash > estimates(state).reserve + Math.max(200, item.amount * .05));
  if (debt) return note('坏账可以尝试追回', `${debt.buyer.name} 有未获保险赔付的坏账。诉讼要先支出费用，且不保证全额追回。现金充足时可查看是否值得起诉。`, focus('sue', debt.id, '查看诉讼操作'));
  if (trouble.length) return note('先关注已出现的逾期风险', `${trouble[0].buyer.name} 的订单预计晚于合同交期。若暂时不能加急，优先留出现金应对罚款，慎选后续新单。`);
  const current = bills.filter(item => item.status === 'open').sort((a, b) => a.dueWeek - b.dueWeek || b.amount - a.amount)[0];
  if (current) return note('正常账期，先等待回款', `${current.buyer.name}的应收款 ${cash(current.amount)} 预计${week(current.dueWeek)}结算时回款。目前尚未逾期，建议正常等待，避免影响客户关系。`, state.bids.length ? settle() : page('inquiries', '查看询盘'));
  return note(state.orders.length ? '现有订单按周推进' : '先拿到第一张订单', state.orders.length ? '交期、回款周和供应商费用会随周结算更新。当前不需要主动催款或付费加急。' : '提交盈利且垫资可承受的报价，本周结算中单后会自动进入生产和发运。', page('inquiries', '查看询盘'));
}

function venturePlan(state) {
  const { budget } = estimates(state);
  const recentOrders = state.orders.filter(order => order.contractWeek >= state.week - 12 && !['cancelled', 'bad-debt'].includes(order.status));
  const recentProfit = state.history.slice(-4);
  const average = recentProfit.reduce((sum, row) => sum + row.profit, 0) / Math.max(1, recentProfit.length);
  if (recentProfit.length < 4 || recentProfit.filter(row => row.profit > 0).length < 3) return null;
  for (const project of ventureProgress(state)) {
    for (const option of project.options) {
      if (!option.available || option.nextCost > budget * .6 || option.nextCost + project.upkeep * 12 > budget || average < project.upkeep * 2) continue;
      let basis = '';
      if (project.id === 'warehouse') {
        const orders = recentOrders.filter(order => order.source === 'stock');
        if (orders.length >= 4) basis = `最近 12 周有 ${orders.length} 笔现货采购订单，提高仓库等级可缩短备货并支持库存采购。`;
      } else if (project.id === 'factory') {
        const orders = recentOrders.filter(order => order.source === 'factory' && PRODUCT_BY_ID[order.productId]?.category === option.target);
        if (orders.length >= 3 && orders.reduce((sum, order) => sum + order.cost, 0) * .09 >= project.upkeep * 18) basis = `最近 12 周有 ${orders.length} 笔同品类工厂订单，自有产线有助于降低后续采购成本和排产用时。`;
      } else if (project.id === 'overseas') {
        const orders = recentOrders.filter(order => order.market === option.target);
        if (orders.length >= 4 && !option.level) basis = `该市场最近 12 周有 ${orders.length} 笔订单，建立当地仓库可以缩短跨境交付。`;
      } else if (project.id === 'brand' && recentOrders.length >= 12 && !option.level) basis = `最近 12 周有 ${recentOrders.length} 笔合同，现有客户规模已较稳定。自牌产品可尝试自主定价，市场接受度仍需验证。`;
      else if (project.id === 'ecommerce' && recentOrders.length >= 8 && state.macro.consumer >= 110 && !option.level) basis = '当前需求较旺且既有业务稳定，跨境店铺有机会补充销售，但每周收益仍可能波动。';
      if (!basis) continue;
      const action = option.target ? { ui: 'coach-target', form: 'invest-venture', id: project.id, choice: option.target, label: '查看推荐项目' } : focus('invest-venture', project.id, '查看推荐项目');
      const label = option.target ? `${project.label}（${option.label}）` : project.label;
      return note(`建议${option.level ? '升级' : '投入'}${label}`, `${basis} 本次需要 ${cash(option.nextCost)}，每周新增维护费 ${cash(project.upkeep)}。已留出近期工资、订单及维护资金。`, action);
    }
  }
  return null;
}

function developmentAdvice(state, tab) {
  const { budget, reserve } = estimates(state);
  if (tab === 'finance') {
    const urgent = cashEmergency(state, { page: 'company', developmentTab: 'finance' });
    if (urgent) return urgent.action?.form === 'borrow' ? urgent : noAction('本页暂不建议新增或归还贷款。' + urgent.text);
    if (state.loan > 0 && budget > 0) return note('有闲置现金时优先还款', `建议偿还 ${cash(Math.min(state.loan, budget))}，仍保留经营周转资金，减少每周利息。`, form('repay', '查看还款'));
    return noAction(state.loan > 0 ? '目前应优先留出订单周转资金，暂缓还款。' : `当前没有贷款需要归还，也无需提前借款。建议仍保留 ${cash(reserve)} 作为周转资金。`);
  }
  if (tab === 'team') {
    return teamPlan(state).advice;
  }
  if (tab === 'certifications') {
    const next = certProgress(state, netAssets(state)).find(item => !item.owned);
    if (!next) return noAction('所需资质已全部取得，暂时没有新的申请事项。');
    if (next.available && next.fee <= budget) return note(`下一步：取得${next.name}`, `已经满足条件，申请费 ${cash(next.fee)} 在建议的现金余量内，可解锁下一阶段业务。`, focus('buy-cert', next.id, '查看资质申请'));
    const unmet = next.requirements.filter(item => !item.met).map(item => item.text);
    return noAction(`${next.name}${unmet.length ? `尚有未达成条件：${unmet.join('；')}。` : '资格条件已达成，但费用会占用必要周转资金，应暂缓申请。'}`);
  }
  if (tab === 'markets') {
    const next = marketProgress(state).filter(item => !item.opened && item.eligible && (item.canRefer ? item.referralFee : item.fee) <= budget).sort((a,b) => (a.canRefer ? a.referralFee : a.fee) - (b.canRefer ? b.referralFee : b.fee))[0];
    if (next) return note(`可先开拓${next.name}`, `资质已满足，开拓费能保留必要周转资金。${next.canRefer ? `已有熟客可以引荐，费用 ${cash(next.referralFee)}。` : `参展开拓费 ${cash(next.fee)}。`}`, focus(next.canRefer ? 'referral' : 'open-market', next.id, '查看市场方案'));
    return noAction('暂时没有同时满足资质和现金预留要求的新市场，已有市场也无需例行额外花费。');
  }
  if (tab === 'partners') return noAction('客户关系随交付和回款更新，当前分区没有需要额外办理的客户事项。');
  if (tab === 'ventures') return venturePlan(state) ?? noAction('暂时没有同时满足近期订单需求、稳定利润和周转资金预留的投资项目。先让现有业务继续经营。');
  if (tab === 'listing') {
    const next = ipoProgress(state, netAssets(state)).actions.find(item => item.current);
    if (!next) return noAction('上市目标已经完成，目前没有待办理的上市事项。');
    if (next.available && next.cost <= budget) return note(`当前可办理${next.label}`, `所需条件均满足。${next.cashIn ? `预计可引入 ${cash(next.cashIn)}，同时创始人持股会变化。` : `预计支出 ${cash(next.cost)}。`}`, focus(next.id, '', '查看申请条件'));
    const unmet = next.requirements.filter(item => !item.met).map(item => item.text);
    return noAction(`${next.label}${unmet.length ? `尚有未满足条件：${unmet.join('；')}。` : '已满足条件，但费用暂不适合当前周转资金。'}`);
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

function offworkAdvice(state) {
  const onward = state.bids.length ? settle() : page('inquiries', '开始下一轮经营');
  if (state.life.lastBreakWeek === state.week) return note('本周已安排休息', '这次活动已经结算，精力会随经营消耗。下周可以再次安排旅行或好友活动。', onward);
  if (state.energy >= 85) return note('精力充足，先把预算用在经营', `当前精力 ${state.energy}/100。旅行与好友活动可恢复精力，房产和车辆会占用现金，可以等公司资金稳定后再选。`, onward);
  const selected = restPlan(state);
  return selected ? note(`推荐${selected.activity.label}`, `${selected.activity.kind === 'quick' ? '' : `可以选择「${selected.choice.label}」。`}${selected.choice.price ? `费用 ${cash(selected.choice.price)}` : '费用为零'}，可恢复 ${Math.min(selected.choice.energy,100-state.energy)} 点精力。精力低时中单率会受影响，先休息再继续经营。`, selected.activity.kind === 'quick' ? focus('outing', selected.activity.id, '查看这项活动') : { ui: 'coach-select-outing', id: selected.activity.id, choice: selected.choice.id, label: '查看推荐的休息方案' })
    : note('精力需要恢复，但现金优先', `精力仅 ${state.energy}/100，建议在旅行与好友活动中先挑费用较低或免费的选项，避免大额非必要开支。`, onward);
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

function bestDevelopmentImprovement(state) {
  // Prioritize cash and eligibility milestones before recurring payroll, market and facility spending.
  const opportunities = developmentPriorities.map(([tab, label]) => ({ tab, label, advice: developmentAdvice(state, tab) }));
  const next = opportunities.find(item => item.advice.action);
  return next ? { ...next.advice, action: page('company', `查看${next.label}建议`, next.tab) } : null;
}

function developmentOverviewAdvice(state, ui) {
  const urgent = cashEmergency(state, { page: 'company', developmentTab: 'finance' });
  if (urgent) {
    if (urgent.action?.form === 'borrow') return { ...urgent, action: page('company', '查看财务建议', 'finance') };
    return noAction(`当前资金优先，本周暂停发展投入。${urgent.text}`);
  }
  const opportunity = bestDevelopmentImprovement(state);
  if (opportunity) return opportunity;
  const next = state.orders.length && introduction[coachIntroIndex(ui.coachIntro)];
  if (next?.page === 'company') return { ...noAction(`目前没有适合立即支出的发展项目。初次成交后，可以先认识${next.tab === 'finance' ? '财务' : '团队'}，再继续经营。`), action: page(next.page, next.label, next.tab), introduction: true };
  return noAction('当前没有需要立即处理的财务问题，团队、资质、市场及产业也暂无适合周转安排的新增项目。本周继续做好现有经营即可。');
}

function growthOpportunity(state) {
  if (!state.orders.length) return null;
  return bestDevelopmentImprovement(state);
}

function cashEmergency(state, ui) {
  const { lowest, rows, baselineFloor } = estimates(state);
  if (state.cash >= 0 && lowest.hypothetical >= 0) return null;
  const bill = state.receivables.filter(item => factorValue(state, item) > 0).sort((a, b) => factorValue(state, b) - factorValue(state, a))[0];
  if (bill) return note('先回收应收款', `${bill.buyer.name} 的应收款可以保理并立即到账 ${cash(factorValue(state, bill))}，代价是放弃部分货款。眼下先补足周转资金。`, ui.page === 'orders' ? focus('factor', bill.id, '查看可保理应收') : page('orders', '前往回款与保理', 'orders-receivables'));
  // If only the new bids cause the shortfall, undoing a quote is free and avoids more borrowing.
  if (state.cash >= 0 && baselineFloor >= 0 && state.bids.length) {
    const bid = [...state.bids].sort((a, b) => b.workingCapital - a.workingCapital)[0];
    return note('先减少新增垫资', '现有业务的预测余额还够用，但如果新报价都中单，资金会不足。建议先撤回占用现金最多的报价，再结算。', ui.page === 'inquiries' ? focus('withdraw-bid', bid.inquiryId, '查看该笔报价') : page('inquiries', '检查已提交报价'));
  }
  const room = Math.max(0, state.creditLine - state.loan);
  if (room > 0 && state.cash < 0) return note('先安排现金缺口', `目前现金为负，尚有 ${cash(room)} 授信。建议先借 ${cash(Math.min(-state.cash, room))} 弥补${room < -state.cash ? '一部分' : ''}现有缺口；未来第 ${lowest.week} 周仍需复查现金预测。`, ui.page === 'company' && ui.developmentTab === 'finance' ? form('borrow', '查看可用借款') : page('company', '前往财务筹款', 'finance'));
  const lots = new Map();
  for (const item of state.inventory) lots.set(item.productId, (lots.get(item.productId) ?? 0) + item.quantity);
  for (const bid of state.bids) if (bid.source === 'inventory') lots.set(bid.productId, (lots.get(bid.productId) ?? 0) - bid.quantity);
  const stock = [...lots].filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id, value: liquidationValue(state, id, quantity) })).sort((a,b) => b.value - a.value)[0];
  if (stock?.value > 0) return note('先变现可用库存', `${PRODUCT_BY_ID[stock.id]?.name ?? '可用库存'} 清仓预计立即到账 ${cash(stock.value)}，但会减少库存价值。没有其他即时筹款选择时可考虑。`, ui.page === 'orders' ? focus('liquidate', stock.id, '查看清仓金额') : page('orders', '前往可用库存', 'orders-inventory'));
  if (state.cash >= 0 && rows[0].hypothetical >= 0) return note('暂缓新支出，本周可以继续推进', '当前没有适合的即时筹款渠道，未来现金仍有缺口。建议先不再接新单或投资，让现有业务继续交货回款。', settle());
  return note('暂停新增支出', '现在没有可立即弥补缺口的回款、授信或可用库存。暂缓报价、招聘和投资。继续周结算可能使资金链进一步恶化，请先核对已有订单的预计回款。');
}

function pageAdvice(state, ui) {
  if (state.bankrupt) return null;
  if (state.events.length) return ui.page === 'company' && !ui.developmentOverview ? noAction('尚有待定事项可能影响本周资金与经营安排，建议解决后再办理当前分区的业务。') : note('先处理本周待定事项', '助理会在事项内比较结果并推荐处理方式，解决后才能继续周结算。', { ui: 'show-event', label: '查看待定事项' });
  if (ui.page === 'company') {
    if (ui.developmentOverview) return developmentOverviewAdvice(state, ui);
    const advice = introductionAdvice(state, ui, developmentAdvice(state, ui.developmentTab));
    if (!advice.introduction && advice.action && state.orders.length && ['team', 'certifications', 'markets', 'ventures', 'listing'].includes(ui.developmentTab)) return { ...advice, nextAction: deferGrowth() };
    return advice;
  }
  const emergency = cashEmergency(state, ui);
  if (emergency) return emergency;
  if (ui.page === 'orders') return introductionAdvice(state, ui, orderAdvice(state));
  if (ui.page === 'offwork') return offworkAdvice(state);
  if (!state.orders.length && state.bids.length) return note('首笔报价已提交', '现在可以结算本周，立即查看首笔报价是否中单。结算也会推进货物与资金。', settle());
  const overdue = overdueForCollection(state);
  if (overdue) return note('先跟进逾期应收款', `${overdue.buyer.name}的货款已逾期，可以先跟进回款，再挑选新订单。`, page('orders','查看逾期应收账款','orders-receivables'));
  const late = state.orders.find(item => ACTIVE_ORDER.has(item.status) && item.deliverWeek > item.dueWeek && canExpedite(state, item) && expediteFee(item) < item.total * .03 && state.cash >= expediteFee(item));
  if (late) return note('先处理交期风险', `${late.buyer.name} 的订单预计晚交货，有可行的加急安排。先核对费用和能避免的罚款，再发新报价。`, page('orders', '查看交期与加急', 'orders-delivery'));
  if (state.energy < 50 && state.life.lastBreakWeek !== state.week && restPlan(state)) return note('精力偏低，先考虑休息', `当前精力 ${state.energy}/100。低精力会影响中单率，现在有不影响周转资金的休息安排，可以先恢复精力再经营。`, page('offwork', '查看休息活动'));
  const orientation = introductionAdvice(state, ui, null);
  if (orientation) return orientation;
  if (state.bids.length) return inquiryAdvice(state, ui.filters);
  const growth = ui.coachDeferredWeek === state.week ? null : growthOpportunity(state);
  if (growth) return { ...growth, nextAction: deferGrowth() };
  if (ui.page === 'inquiries') return inquiryAdvice(state, ui.filters);
  return note(state.orders.length ? '继续挑选合适的订单' : '从第一笔合适的订单开始', '先打开询盘；助理会比较报价的利润、中单机会、信用和垫资，挑出目前更适合的方案。', page('inquiries','开始挑选询盘'));
}

function actionButton(action) {
  if (!action) return '';
  if (action.command === 'end-week') return `<button type="button" class="button coach-action" data-action="end-week">${esc(action.label)}</button>`;
  return `<button type="button" class="button ${action.quiet ? 'quiet' : 'coach-action'}" data-ui="${action.ui}"${action.page ? ` data-page="${action.page}"` : ''}${action.tab ? ` data-coach-tab="${action.tab}"` : ''}${action.id != null ? ` data-id="${esc(action.id)}"` : ''}${action.choice ? ` data-choice="${esc(action.choice)}"` : ''}${action.action ? ` data-coach-action="${esc(action.action)}"` : ''}${action.form ? ` data-coach-form="${esc(action.form)}"` : ''}>${esc(action.label)}</button>`;
}

function card(state, advice, { extra = '', preview = false, progress = false, overview = false } = {}) {
  if (!advice) return '';
  const person = ASSISTANTS.find(item => item.id === state.assistant) ?? ASSISTANTS[0];
  return `<aside class="coach-card" aria-label="助理带教"${preview ? ' data-quote-preview="coach" tabindex="-1"' : ''}>
    <span class="portrait headshot coach-portrait" data-assistant-id="${esc(person.id)}" aria-hidden="true" style="background-image:url('${esc(person.portrait)}')"></span>
    <div class="coach-copy"><small class="coach-label">${esc(person.name)}的带教建议${overview ? '（发展总览）' : progress ? `（入门第 ${state.tutorial.step + 1} 步，共 5 步）` : ''}</small><h3>${esc(advice.title)}</h3><p>${esc(advice.text)}</p>
    ${advice.action || advice.nextAction || extra ? `<div class="coach-actions">${actionButton(advice.action)}${actionButton(advice.nextAction)}${extra}</div>` : ''}</div></aside>`;
}

export function pageCoach(state, ui) {
  if (!easy(state)) return '';
  const step = !state.tutorial.done && [0,1,3].includes(state.tutorial.step);
  const advice = pageAdvice(state, ui);
  const extra = advice?.introduction ? '<button type="button" class="button quiet" data-ui="coach-skip-intro">跳过介绍</button>' : step ? '<button type="button" class="button quiet" data-ui="skip-tutorial">跳过基础流程提示</button>' : '';
  return card(state, advice, { extra, progress: step, overview: ui.page === 'company' && ui.developmentOverview });
}

export function quoteCoach(state, inquiry, model) {
  if (!easy(state)) return '';
  if (state.bids.some(item => item.inquiryId === inquiry.id) || state.bids.length >= 3) return card(state, note('本周暂时无法再提交这笔报价', '待本周结算后再选择新机会，也可以先在询盘页撤回不再合适的报价。'), { preview: true });
  const recommended = verifyRecommendation(state, quoteRecommendation(state, inquiry));
  if (!recommended) return card(state, note('暂时不建议提交这笔报价', '请检查利润、交期、回款和现金预测。若资金不足，可以挑其他询盘，不必为了中单而降到亏损价。'), { preview: true });
  const { offer, config, cashFloor } = recommended;
  const applied = Object.entries(config).every(([name, value]) => name === 'brandUnitPrice' && !config.branded || String(model[name] ?? '') === String(value));
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
  const valid = choices.filter(choice => !choice.disabled && Math.max(0, -(choice.impact?.cash ?? 0), choice.cost ?? 0) <= Math.max(0, state.cash));
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
      'staff-poach': spendable(event.raise * 4) ? 'retain' : event.staffId === state.assistant ? 'defer' : 'release',
      'rival-sale': spendable(event.fee * 2) ? 'acquire' : 'pass',
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
  const chosen = ranked[0];
  if (-(chosen.impact?.cash ?? 0) > budget) reason += ' 这项支出会占用部分周转资金，请再核对现金与授信。';
  return { id: chosen.id, html: card(state, note(`建议：${chosen.label}`, reason)) };
}

function chosenReason(choice, preferred, budget) {
  const cost = Math.max(0, -(choice.impact?.cash ?? 0), choice.cost ?? 0);
  if (choice.id !== preferred || cost === 0) return cost > 0 ? '当前优先采用可负担的安排。请核对下方费用与影响，再确认处理。' : '当前选择不会新增立即支出。请根据后续报价和回款安排保留周转现金。';
  return `当前支出 ${cash(cost)} 处于预留后的现金余量 ${cash(budget)} 内，有机会改善后续经营条件；实际收益仍取决于新订单与市场变化。`;
}
