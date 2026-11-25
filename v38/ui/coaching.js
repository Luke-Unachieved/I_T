import { ASSISTANTS, BUYER_CREDITS } from '../data/core.js';
import { certProgress, marketProgress } from '../engine/expansion.js';
import { canExpedite, expediteFee, factorValue, forecast, netAssets } from '../engine/game.js';
import { LIFE_CATALOG } from '../engine/life.js';
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

// Reserve cash against existing commitments. Reuse the forecast while the immutable game state is unchanged.
function estimates(state) {
  if (activeCache.has(state)) return activeCache.get(state);
  const rows = forecast(state);
  const lowest = rows.reduce((best, row) => row.hypothetical < best.hypothetical ? row : best, rows[0]);
  const reserve = Math.max(5000, 4 * (1200 + state.staff.reduce((sum, person) => sum + person.salary, 0)));
  const result = { lowest, reserve, budget: Math.max(0, Math.min(state.cash, lowest.hypothetical) - reserve), quotes: new Map() };
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
const note = (title, text, action) => ({ title, text, action });

function inquiryAdvice(state, filter) {
  if (state.bids.length >= 3) return note('报价位用完了', '接下来等本周结算。如果发现更好的机会，可以先撤回原报价，再重新比较。');
  const best = bestInquiry(state, filter);
  if (best) {
    const { inquiry, recommendation: { offer } } = best;
    return note(`先看 ${inquiry.buyer.name} · ${inquiry.productName}`, `建议用${sourceNames[offer.source]}，预计中单率 ${percent(offer.probability)}、订单利润 ${cash(offer.profit)}。垫资约 ${cash(offer.workingCapital)}，目前仍能留出周转资金。`, { ui: 'quote-open', id: inquiry.id, label: '打开推荐询盘' });
  }
  return note('先别急着发新报价', '目前没有同时满足利润和周转资金预留的方案。可以调整筛选条件，或者先回收应收款再看新询盘。', page('orders', '查看回款'));
}

function orderAdvice(state) {
  const bills = state.receivables.filter(item => OPEN_RECEIVABLE.has(item.status));
  const { budget, lowest } = estimates(state);
  const trouble = state.orders.filter(item => ACTIVE_ORDER.has(item.status) && item.deliverWeek > item.dueWeek)
    .sort((a, b) => a.dueWeek - b.dueWeek);
  const urgent = trouble.find(order => canExpedite(state, order) && expediteFee(order) < order.total * .03 && state.cash >= expediteFee(order));
  if (urgent) return note(`留意 ${urgent.buyer.name} 的交期`, `预计晚交货。加急花费 ${cash(expediteFee(urgent))}，低于一周的合同逾期罚款 ${cash(urgent.total * .03)}，可以少损失一部分。`, focus('expedite', urgent.id, '查看加急操作'));
  if (!budget || lowest.hypothetical < 0) {
    const invoice = bills.filter(item => factorValue(state, item) > 0).sort((a, b) => factorValue(state, b) - factorValue(state, a))[0];
    if (invoice) return note('回款优先，别让现金卡住', `${invoice.buyer.name} 的应收款可以保理，立即到账 ${cash(factorValue(state, invoice))}，代价是放弃部分货款。资金紧张时可先考虑这一项。`, focus('factor', invoice.id, '查看保理操作'));
  }
  const due = bills.filter(item => item.dueWeek <= state.week && item.reminderWeek !== state.week).sort((a, b) => b.amount - a.amount)[0];
  if (due) return note(`先跟进 ${due.buyer.name} 的回款`, `${cash(due.amount)} 应收已经到期。催款能增加回款机会，但会略微影响关系；不要对还没到期的高信用客户频繁催款。`, focus('collect', due.id, '查看催款操作'));
  const debt = state.receivables.find(item => item.status === 'bad-debt' && !item.insuranceDueWeek && state.cash > estimates(state).reserve + Math.max(200, item.amount * .05));
  if (debt) return note('坏账可以尝试追回', `${debt.buyer.name} 有未获保险赔付的坏账。诉讼要先支出费用，且不保证全额追回。现金充足时可查看是否值得起诉。`, focus('sue', debt.id, '查看诉讼操作'));
  if (trouble.length) return note('先关注已出现的逾期风险', `${trouble[0].buyer.name} 的订单预计晚于合同交期。若暂时不能加急，优先留出现金应对罚款，慎选后续新单。`);
  return note(state.orders.length ? '现有订单按周推进' : '先拿到第一张订单', state.orders.length ? '交期、回款周和供应商费用会随周结算更新。当前不需要主动催款或付费加急。' : '提交盈利且垫资可承受的报价，本周结算中单后会自动进入生产和发运。', page('inquiries', '查看询盘'));
}

function developmentAdvice(state, tab) {
  const { budget, reserve, lowest } = estimates(state);
  if (tab === 'finance') {
    const room = Math.max(0, state.creditLine - state.loan);
    if (lowest.hypothetical < 0 || state.cash < 0) return room > 0
      ? note('先补现金缺口', `${week(lowest.week)} 的余额预计紧张，尚有 ${cash(room)} 授信。先看可用额度和利息，只借需要周转的部分。`, form('borrow', '查看借款'))
      : note('先变现或收回应收款', '授信已经不足，尽量避免新增垫资或非必要开支。', page('orders', '查看回款与库存'));
    if (state.loan > 0 && budget > 0) return note('有闲置现金时优先还款', `预留周转后，可考虑偿还 ${cash(Math.min(state.loan, budget))}，减少以后每周的利息支出。`, form('repay', '查看还款'));
    return note('保留周转资金，借款按需', `建议至少留出 ${cash(reserve)}。银行授信是应急工具，借款会产生利息；暂时不急着用满额度。`, page('company', '查看发展资质', 'certifications'));
  }
  if (tab === 'team') {
    const candidates = state.candidates.filter(person => !state.staff.some(staff => staff.id === person.id) && person.salary * 4 <= budget);
    const missing = ['sales', 'operations', 'finance'].find(role => !state.staff.some(person => person.role === role));
    const candidate = candidates.filter(person => person.role === missing).sort((a, b) => b.ability - a.ability || a.salary - b.salary)[0];
    if (candidate && state.staff.length < 18) return note(`可以考虑聘用 ${candidate.name}`, `这位候选人的能力为 ${candidate.ability}，周薪 ${cash(candidate.salary)}。补齐尚缺的岗位有助于经营，确认长期工资负担再聘用。`, focus('hire', candidate.id, '查看候选人'));
    return note('按业务规模增加员工', '业务员提高中单率、跟单员减少履约风险，财务能改善部分回款与利息成本。团队已齐或资金不足时，先做好当前订单。');
  }
  if (tab === 'certifications') {
    const next = certProgress(state, netAssets(state)).find(item => !item.owned);
    if (!next) return note('资质已全部取得', '可以继续开拓新市场，但每次都要比较开拓费、汇率和交货周期。', page('company', '查看市场', 'markets'));
    if (next.available && next.fee <= budget) return note(`下一步：取得${next.name}`, `已经满足条件，申请费 ${cash(next.fee)} 在建议的现金余量内，可解锁下一阶段业务。`, focus('buy-cert', next.id, '查看资质申请'));
    return note(`先准备${next.name}`, next.requirements.filter(item => !item.met).map(item => item.text).join('；') || '资格条件已达成，但要先积累足够的申请费用和周转资金。');
  }
  if (tab === 'markets' || tab === 'partners') {
    const next = marketProgress(state).filter(item => !item.opened && item.eligible && (item.canRefer ? item.referralFee : item.fee) <= budget).sort((a,b) => (a.canRefer ? a.referralFee : a.fee) - (b.canRefer ? b.referralFee : b.fee))[0];
    if (next) return note(`可先开拓${next.name}`, `比较已有资质和当前费用，这一市场的开拓成本较低。${next.canRefer ? `有熟客可以引荐，费用 ${cash(next.referralFee)}。` : `参展开拓费 ${cash(next.fee)}。`}`, tab === 'markets' ? focus(next.canRefer ? 'referral' : 'open-market', next.id, '查看市场方案') : page('company','查看市场方案','markets'));
    if (tab === 'partners') return note('维护老客户', '按时交货和顺利回款能积累客户关系。合作三次且关系稳定的客户可提供引荐。', page('orders', '查看订单与回款'));
    return note('先做熟悉的市场', '暂时没有资质和资金都合适的新市场，优先在已开拓市场积累利润和信誉。', page('company', '查看资质', 'certifications'));
  }
  if (tab === 'ventures') {
    const entry = ventureProgress(state).find(item => item.id === 'warehouse');
    const option = entry.options[0];
    if (option.available && option.level === 0 && option.nextCost <= budget * .6 && state.orders.length >= 6) return note('优先考虑自建仓库', `现有业务已积累一些订单。首级仓库投入 ${cash(option.nextCost)}，能缩短备货，并允许提前采购储备。`, focus('invest-venture', entry.id, '查看仓库项目'));
    return note('按订单类型逐步投入', '设施会占用现金并产生维护费。先积累稳定订单，再选最常经营的品类投产或建立海外仓，避免一下投入多个项目。');
  }
  if (tab === 'listing') {
    const next = ipoProgress(state, netAssets(state)).actions.find(item => item.current);
    if (!next) return note('上市目标已经完成', '接下来仍可经营并继续达成年度目标。', page('company', '查看年度目标', 'board-goals'));
    if (next.available && next.cost <= budget) return note(`当前可办理${next.label}`, `所需条件均满足。${next.cashIn ? `预计可引入 ${cash(next.cashIn)}，同时创始人持股会变化。` : `预计支出 ${cash(next.cost)}。`}`, focus(next.id, '', '查看申请条件'));
    return note(`先准备${next.label}`, next.requirements.filter(item => !item.met).map(item => item.text).join('；') || '已满足申办条件，仍建议留足订单周转资金。');
  }
  if (tab === 'board-goals') {
    const goal = state.year.goal;
    if (goal) return note('先盯住今年的经营目标', state.year.late > goal.maxLate || state.year.quality > goal.maxQuality ? '本年度已出现超过目标的交付或质量问题。先稳住现有业务，下年度继续争取四项目标。' : `距营收目标还有 ${cash(Math.max(0, goal.revenue-state.year.revenue))}，距利润目标还有 ${cash(Math.max(0, goal.profit-state.year.profit))}。按时交货也很重要。`, page('inquiries', '查看本周询盘'));
  }
  if (tab === 'economy') return note('先看成本再决定报价', `当前海运运价指数 ${state.macro.freight}，原料指数 ${state.macro.materials}。指数高于 100 时留意新报价成本，海外订单还需考虑汇率波动。`, page('inquiries','比较报价'));
  if (tab === 'rivalry') return note('别只追求比同行报价低', '对照同行营收和经营状态。报价过低虽然容易中单，也可能使利润不足；优先选择现金可承受的盈利订单。', page('inquiries','查看询盘'));
  return note('用小目标带动公司发展', '先达成首单交付、客户关系和年度盈利等里程碑，积累现金和信誉后再拓展产业。', page('company', '查看年度目标', 'board-goals'));
}

function offworkAdvice(state) {
  if (state.life.lastBreakWeek === state.week) return note('本周已安排休息', '这次活动已经结算，精力会随经营消耗。下周可以再次安排旅行或好友活动。');
  if (state.energy >= 85) return note('精力充足，先把预算用在经营', `当前精力 ${state.energy}/100。房产和车辆会占用现金，可等公司资金稳定后再选心仪项目。`);
  const { budget } = estimates(state);
  const options = LIFE_CATALOG.outings.filter(item => item.kind === 'quick' && item.price <= budget);
  const needed = Math.min(38, 100-state.energy);
  const selected = options.find(item => item.energy >= needed) ?? options.at(-1);
  return selected ? note(`推荐${selected.label}`, `费用 ${cash(selected.price)}，可恢复 ${Math.min(selected.energy,100-state.energy)} 点精力。精力低时中单率会受影响，先休息再继续经营。`, focus('outing', selected.id, '查看这项活动'))
    : note('精力需要恢复，但现金优先', `精力仅 ${state.energy}/100，建议在旅行与好友活动中先挑费用较低或免费的选项，避免大额非必要开支。`);
}

function pageAdvice(state, ui) {
  if (state.bankrupt) return null;
  if (state.events.length) return note('先处理本周待定事项', '助理会在事项内比较结果并推荐处理方式，解决后才能继续周结算。', { ui: 'show-event', label: '查看待定事项' });
  if (!state.tutorial.done && state.tutorial.step === 3 && state.bids.length) return note('首笔报价已提交', '可以继续比较其他询盘。想先看看第一笔报价的结果，就点「结束本周」。', focus('end-week', '', '查看结算按钮'));
  if (ui.page === 'inquiries') return inquiryAdvice(state, ui.filters);
  if (ui.page === 'orders') return orderAdvice(state);
  if (ui.page === 'company') return developmentAdvice(state, ui.developmentTab);
  if (ui.page === 'offwork') return offworkAdvice(state);
  const { lowest } = estimates(state);
  if (state.cash < 0 || lowest.hypothetical < 0) return note('先处理现金缺口', `目前最低预测余额出现在${week(lowest.week)}。先查看财务与到期回款，再增加订单。`, page('company','查看财务','finance'));
  if (state.bids.length) return note('本周已发出报价', `目前 ${state.bids.length}/3 笔已提交报价。若还有资金余量可再比较机会，否则点击「结束本周」等待结果。`, state.bids.length < 3 ? page('inquiries','比较其他询盘') : focus('end-week','','查看结算按钮'));
  const due = state.receivables.find(item => OPEN_RECEIVABLE.has(item.status) && item.dueWeek <= state.week && item.reminderWeek !== state.week);
  if (due) return note('先看看本周应收款', `${due.buyer.name} 的货款已到期，可以先跟进回款，再挑选新订单。`, page('orders','查看应收账款'));
  return note(state.orders.length ? '继续挑选合适的订单' : '从第一笔合适的订单开始', '先打开询盘；助理会比较报价的利润、中单机会、信用和垫资，挑出目前更适合的方案。', page('inquiries','开始挑选询盘'));
}

function actionButton(action) {
  if (!action) return '';
  return `<button type="button" class="button coach-action" data-ui="${action.ui}"${action.page ? ` data-page="${action.page}"` : ''}${action.tab ? ` data-coach-tab="${action.tab}"` : ''}${action.id != null ? ` data-id="${esc(action.id)}"` : ''}${action.action ? ` data-coach-action="${esc(action.action)}"` : ''}${action.form ? ` data-coach-form="${esc(action.form)}"` : ''}>${esc(action.label)}</button>`;
}

function card(state, advice, { extra = '', preview = false, progress = false } = {}) {
  if (!advice) return '';
  const person = ASSISTANTS.find(item => item.id === state.assistant) ?? ASSISTANTS[0];
  return `<aside class="coach-card" aria-label="助理带教"${preview ? ' data-quote-preview="coach" tabindex="-1"' : ''}>
    <span class="portrait coach-portrait" aria-hidden="true" style="background-image:url('${esc(person.portrait)}');background-position:${esc(person.portraitPosition)}"></span>
    <div class="coach-copy"><small class="coach-label">${esc(person.name)} · 助理带教${progress ? ` · 入门 ${state.tutorial.step + 1}/5` : ''}</small><h3>${esc(advice.title)}</h3><p>${esc(advice.text)}</p>
    ${advice.action || extra ? `<div class="coach-actions">${actionButton(advice.action)}${extra}</div>` : ''}</div></aside>`;
}

export function pageCoach(state, ui) {
  if (!easy(state)) return '';
  const step = !state.tutorial.done && [0,1,3].includes(state.tutorial.step);
  const extra = step ? '<button type="button" class="button quiet" data-ui="skip-tutorial">跳过基础流程提示</button>' : '';
  return card(state, pageAdvice(state, ui), { extra, progress: step });
}

export function quoteCoach(state, inquiry, model) {
  if (!easy(state)) return '';
  if (state.bids.some(item => item.inquiryId === inquiry.id) || state.bids.length >= 3) return card(state, note('本周暂时无法再提交这笔报价', '待本周结算后再选择新机会，也可以先在询盘页撤回不再合适的报价。'), { preview: true });
  const recommended = verifyRecommendation(state, quoteRecommendation(state, inquiry));
  if (!recommended) return card(state, note('暂时不建议提交这笔报价', '请检查利润、交期、回款和现金预测。若资金不足，可以挑其他询盘，不必为了中单而降到亏损价。'), { preview: true });
  const { offer, config, cashFloor } = recommended;
  const applied = Object.entries(config).every(([name, value]) => name === 'brandUnitPrice' && !config.branded || String(model[name] ?? '') === String(value));
  const price = offer.branded ? `自有品牌单价定为 ${offer.unitPrice}` : `按目标价的 ${offer.ratio}% 报价`;
  const terms = offer.extraTerms ? `在原账期基础上延长 ${offer.extraTerms} 周` : '沿用买家原账期';
  const financing = offer.financing === 'standard' ? '' : `，采用${financingNames[offer.financing] ?? '当前回款方式'}`;
  const staff = state.staff.find(person => person.id === offer.staffId);
  const text = `${price}，采用${sourceNames[offer.source]}，${terms}${financing}，${staff ? `由${staff.name}跟进` : '由你亲自跟进'}。预计中单率 ${percent(offer.probability)}，订单利润 ${cash(offer.profit)}，最低预测余额 ${cash(cashFloor)}。采用后仍需你确认提交。`;
  return card(state, note(applied ? '已采用当前建议方案' : '建议先用这套报价方案', text, applied ? null : { ui: 'coach-apply-quote', label: '采用助理方案' }), { preview: true });
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
