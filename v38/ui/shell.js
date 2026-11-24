import { ASSISTANTS } from '../data/core.js';
import { decisionInfo } from '../engine/expansion.js';
import { forecast, creditLimit, netAssets } from '../engine/game.js';
import { nationalRank, valuation } from '../engine/strategy.js';
import { imageFrame } from './media.js';

const fmt = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
export const count = value => fmt.format(Number.isFinite(value) ? value : 0);
export const yuan = value => `${value < 0 ? '−' : ''}¥${count(Math.abs(value ?? 0))}`;
const contractPrice = bid => bid.price ? `${bid.currency === 'USD' ? 'US$' : bid.currency === 'EUR' ? '€' : '¥'}${count(bid.price)}${bid.unit ? ` / ${bid.unit}` : ''}` : '—';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const pages = [
  ['office', '办公室', 'M3 22h18M5 22V7l7-4 7 4v15m-9 0v-6h4v6m-6-11h2m4 0h2'],
  ['inquiries', '询盘', 'M3 4h18v16H3zM3 5l9 7 9-7'],
  ['orders', '订单', 'M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0 8 4 8-4m-8 4v10m-4-16 8 4'],
  ['company', '公司', 'M3 22h18M6 22V9h4m0 13V3h8v19m-5-14h2m-2 4h2m-2 4h2'],
  ['offwork', '下班', 'M18 15.5A7.5 7.5 0 0 1 8.5 6 8.2 8.2 0 1 0 18 15.5zM17 3v5m-2.5-2.5h5'],
];
const captions = {
  office: '本周经营与现金安排', inquiries: '挑选询盘，并比较报价的利润和风险', orders: '跟进生产、交付、收款和库存',
  company: '管理授信、经营趋势和年度业绩', offwork: '结束这一周，安排接下来的经营',
};

export const assistantFor = id => ASSISTANTS.find(person => person.id === id) ?? ASSISTANTS[0];
const icon = path => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"></path></svg>`;
const portrait = person => `<span class="portrait" aria-hidden="true" style="background-image:url('${esc(person.portrait)}');background-position:${esc(person.portraitPosition)}"></span>`;
const weekLabel = week => `第 ${count(week)} 周`;
const yearWeek = week => `第 ${Math.floor((week - 1) / 52) + 1} 年 · 第 ${(week - 1) % 52 + 1} 周`;
const classicLinks = () => `<div class="classic-links"><a href="classic.html">玩经典版（V37）</a><a href="legacy-game.html">玩旧版</a></div>`;
const openOrders = state => state.orders.filter(order => !['settled', 'cancelled', 'bad-debt', 'closed', 'paid', 'delivered'].includes(order.stage ?? order.status));
const openInvoice = bill => bill.status === 'open' || bill.status === 'overdue';
const moneyDue = state => state.receivables.reduce((sum, bill) => sum + (openInvoice(bill) ? bill.remaining ?? bill.amount : 0), 0);
const history4 = state => state.history.slice(-4).reduce((sum, row) => sum + row.profit, 0);

export function opening(notice = '', settings = '') {
  return `<main class="opening">
    ${imageFrame('assets/deal-office-original-desktop.webp', { className: 'opening-art', fallback: '办公室插画暂时无法显示', alt: '', lazy: false, retry: true })}
    <section class="opening-card" aria-labelledby="opening-title">
      <p class="eyebrow">贸易工作室 · V38</p>
      <h1 id="opening-title">再开一单就下班</h1>
      <p>从一人工作室起步。每周报价、交货、收款，把生意慢慢做大。</p>
      <p class="session-warning" data-session-warning="opening">本局只在当前页面运行。刷新或关闭页面会结束本局。</p>
      ${notice ? `<p class="notice negative" role="alert">${esc(notice)}</p>` : ''}
      <form data-form="new-game" class="opening-form" novalidate>
        <div class="form-field"><label for="opening-company-name">公司名</label><input id="opening-company-name" name="name" type="text" placeholder="例如：海港贸易工作室" maxlength="32" required autocomplete="off" aria-describedby="new-game-error"><p class="negative" id="new-game-error" data-field-error role="alert" hidden></p></div>
        <fieldset class="assistant-grid"><legend>选择一位助理</legend>
          ${ASSISTANTS.map((person, i) => `<label class="assistant-choice"><input type="radio" name="assistant" value="${esc(person.id)}"${i === 0 ? ' checked' : ''}>${portrait(person)}<span><strong>${esc(person.name)}</strong><small>${esc(person.description)}</small></span></label>`).join('')}
        </fieldset>
        ${settings}
        <button class="button primary" type="submit">创立工作室</button>
      </form>
      ${classicLinks()}
    </section>
  </main>`;
}

function sparkline(series) {
  const values = series.slice(-12);
  if (values.length < 2) return '';
  const max = Math.max(...values), min = Math.min(...values);
  const coords = values.map((n, i) => `${i * 74 / (values.length - 1) + 2},${24 - ((n - min) / (max - min || 1)) * 20}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 78 28" aria-hidden="true"><polyline points="${coords}" fill="none" vector-effect="non-scaling-stroke"></polyline></svg>`;
}

function kpi(title, value, previous, series, format = count, lowerBetter = false) {
  const delta = Number.isFinite(previous) ? value - previous : 0;
  const change = lowerBetter ? -delta : delta;
  const trend = !Number.isFinite(previous) ? '暂无上周数据' : change ? `${change > 0 ? '▲' : '▼'} ${format(Math.abs(change))}` : '持平';
  return `<article class="kpi-card"><span>${esc(title)}</span><strong class="kpi-value">${format(value)}</strong><small class="kpi-trend ${change > 0 ? 'positive' : change < 0 ? 'negative' : ''}">${trend}</small>${sparkline(series)}</article>`;
}

function indicators(state) {
  const previous = state.history.at(-1);
  const profitPrev = state.history.length ? state.history.slice(-5, -1).reduce((sum, row) => sum + row.profit, 0) : undefined;
  const by = property => state.history.slice(-11).map(row => row[property] ?? 0);
  const amount = moneyDue(state), active = openOrders(state).length, profit = history4(state);
  const trailingProfit = state.history.slice(-12).map((_, i, rows) => rows.slice(Math.max(0, i - 3), i + 1).reduce((sum, row) => sum + row.profit, 0));
  const priorCash = previous?.week === state.week - 1 ? state.history.at(-2)?.cash : previous?.cash;
  return `<section class="kpi-grid" aria-label="经营指标">
    ${kpi('可用资金', state.cash, priorCash, [...by('cash'), state.cash], yuan)}
    ${kpi('应收账款', amount, state.history.at(-2)?.receivables, [...by('receivables'), amount], yuan)}
    ${kpi('待交付订单', active, state.history.at(-2)?.orders, [...by('orders'), active])}
    ${kpi('近 4 周净利', profit, profitPrev, trailingProfit, yuan)}
    ${kpi('公司信誉', state.company.rep, state.history.at(-2)?.rep, [...by('rep'), state.company.rep])}
  </section>`;
}

const fxValue = value => new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);

function macroIndicators(state, ui) {
  const metrics = [
    ['美元兑人民币', 'usd', fxValue], ['欧元兑人民币', 'eur', fxValue],
    ['海运运价', 'freight'], ['原料价格', 'materials'], ['消费景气', 'consumer'],
  ].filter(([, key]) => Number.isFinite(state.macro[key]));
  if (!metrics.length) return '';
  const rankSeries = state.history.map(row => row.rank).filter(Number.isFinite).slice(-11);
  const valuesSeries = state.history.map(row => row.valuation).filter(Number.isFinite).slice(-11);
  const rank = nationalRank(state), value = valuation(state, netAssets(state));
  return `<details class="macro-disclosure" data-ui="macro-disclosure"${ui.showMacro ? ' open' : ''}><summary>市场指数与公司地位</summary><div class="kpi-grid" aria-label="市场指数与公司地位">${metrics.map(([title, key, format]) => {
    const values = state.history.slice(-11).map(row => row.macro?.[key]).filter(Number.isFinite);
    return kpi(title, state.macro[key], values.at(-2), [...values, state.macro[key]], format);
  }).join('')}${kpi('全国排名', rank, rankSeries.at(-2), [...rankSeries, rank], count, true)}${kpi('企业估值', value, valuesSeries.at(-2), [...valuesSeries, value], yuan)}</div></details>`;
}

function weekControls(state) {
  const stopped = state.bankrupt ? ' disabled' : '';
  return `<div class="week-controls">
    ${state.events.length ? '<button type="button" class="button primary" data-ui="show-event">处理待定事项</button>' : `<button type="button" class="button primary" data-action="end-week" data-tour="end-week"${stopped}>结束本周 <span aria-hidden="true">→</span></button>`}
    <button type="button" class="button secondary" data-action="advance-four"${state.events.length ? ' disabled' : stopped}>连推四周</button>
  </div>`;
}

const steps = [
  ['看询盘', '打开「询盘」，先看看客户要什么、希望什么时候到货。'],
  ['算价', '点一笔询盘的「算价」，比较现货仓和工厂，再试着调整报价。'],
  ['看现金预测', '留意「若中单」的最低现金。利润够，手里的钱也要撑到回款。'],
  ['结束本周', '现在结束本周，可以查看收支，但不会有报价结果。想看中单结果，可以先去「询盘」提交一笔报价。'],
  ['看本周小结', '这里汇总中单、交付和收支。关掉小结后就可以继续经营。'],
];
const tour = ['inquiries', 'quote', 'cash-forecast', 'end-week', 'week-summary'];
export const tourTarget = step => tour[step];

function tutorialNote(state, inDialog = false) {
  const step = state.tutorial.step;
  if (state.tutorial.done || inDialog !== (step === 2 || step === 4)) return '';
  const [title, defaultText] = steps[step] ?? steps[0];
  const text = step === 3 && state.bids.length
    ? `你已经提交 ${count(state.bids.length)} 笔报价。点「结束本周」查看结果。`
    : defaultText;
  const person = assistantFor(state.assistant);
  return `<aside class="tutorial" aria-label="新手引导"><div><small>新手引导 ${step + 1} / ${steps.length} · ${esc(person.name)}</small><h2>${title}</h2><p>${text}</p></div><div class="tutorial-controls">
    ${step === 2 ? '<button type="button" class="button secondary" data-ui="tutorial-next">稍后报价，继续引导</button>' : ''}
    ${step === 4 ? '<button type="button" class="button primary" data-ui="finish-tutorial">完成引导</button>' : '<button type="button" class="button quiet" data-ui="skip-tutorial">跳过引导</button>'}
  </div></aside>`;
}

export function shell(state, ui, content, extraIndicators = '') {
  const [, title] = pages.find(([key]) => key === ui.page) ?? pages[0];
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="工作室导航">
      <div class="brand"><span>贸易工作室</span><strong>再开一单就下班</strong></div>
      <nav class="nav" aria-label="经营页面">${pages.map(([key, name, path]) => `<button type="button" class="nav-button${key === ui.page ? ' active' : ''}" data-ui="page" data-page="${key}"${key === ui.page ? ' aria-current="page"' : ''}${key === 'inquiries' ? ' data-tour="inquiries"' : ''}>${icon(path)}<span>${name}</span></button>`).join('')}</nav>
      <dl class="side-stats"><div><dt>公司</dt><dd>${esc(state.company.name)}</dd></div><div><dt>经营时间</dt><dd>${yearWeek(state.week)}</dd></div><div><dt>可用资金</dt><dd>${yuan(state.cash)}</dd></div></dl>
      ${weekControls(state)}
    </aside>
    <main class="workspace" id="work-area" aria-labelledby="page-title">
      <header class="page-header"><div><p class="eyebrow">${esc(state.company.name)} · ${yearWeek(state.week)}</p><h1 id="page-title" tabindex="-1">${title}</h1><p>${captions[ui.page]}</p></div><span class="badge">V38</span></header>
      <div class="app-notices" aria-live="polite" aria-atomic="true">${ui.notice ? `<p class="notice" role="status">${esc(ui.notice)}</p>` : ''}${state.cash < 0 && !state.bankrupt ? `<div class="notice negative" role="alert"><strong>资金链告急</strong><p>还差 ${yuan(-state.cash)}。可以到订单页清仓，或到公司页借款。连续两周资金为负会破产。</p></div>` : ''}${state.events.length ? `<p class="notice">有 ${count(state.events.length)} 件事需要你决定。<button type="button" class="button quiet" data-ui="show-event">查看事项</button></p>` : ''}</div>
      ${indicators(state)}${macroIndicators(state, ui)}${extraIndicators}
      ${tutorialNote(state)}
      <div class="page-content">${content}</div>
    </main>
  </div>`;
}

function shortYuan(n) {
  const magnitude = Math.abs(n);
  return magnitude >= 10_000 ? `${n < 0 ? '−' : ''}${Number((magnitude / 10_000).toFixed(1))} 万` : `${n < 0 ? '−' : ''}${count(magnitude)}`;
}

export function forecastPanel(rows, state) {
  const totalLow = rows.reduce((low, row) => (row.hypothetical ?? row.cash) < (low.hypothetical ?? low.cash) ? row : low, rows[0]);
  const low = totalLow.hypothetical ?? totalLow.cash;
  const width = 680, height = 248, left = 61, right = 24, top = 35, bottom = 38;
  const span = width - left - right;
  const high = Math.max(1, ...rows.flatMap(row => [row.inflow, row.cash, row.hypothetical ?? row.cash]));
  const floor = Math.min(0, ...rows.flatMap(row => [-row.outflow, row.cash, row.hypothetical ?? row.cash]));
  const x = i => left + (i + .5) * span / rows.length;
  const y = n => top + (high - n) * (height - top - bottom) / (high - floor);
  const path = get => rows.map((row, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)} ${y(get(row)).toFixed(2)}`).join(' ');
  const line = row => row.cash;
  const hypothetical = row => row.hypothetical ?? row.cash;
  const showHypothesis = rows.some(row => hypothetical(row) !== line(row));
  const guides = [...new Set([high, high * .5, 0, floor])];
  const zero = y(0);
  const lowX = x(rows.indexOf(totalLow)), lowY = y(low);
  const lowTextX = Math.max(100, Math.min(width - 68, lowX));
  const assumption = showHypothesis ? ' 虚线假设已提交的报价全部中单。' : '';
  return `<section class="panel forecast-panel" data-tour="cash-forecast"><header class="panel-heading"><div><h2>未来 12 周现金预测</h2><p>根据手头的订单、报价和开支推算，不计还未报价的新单。${assumption}</p></div><span class="badge${low < 0 ? ' negative' : ''}">${low < 0 ? '预计资金缺口' : '最低余额'} ${yuan(Math.abs(low))}</span></header>
    <figure class="chart forecast-chart" aria-label="未来十二周现金收支图">
      <svg class="forecast-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="最低现金 ${yuan(low)}，出现在${weekLabel(totalLow.week)}">
        ${guides.map(value => `<line class="chart-grid${value === 0 ? ' chart-axis' : ''}" x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}"></line><text class="chart-label" x="${left - 9}" y="${y(value) + 4}" text-anchor="end">${shortYuan(value)}</text>`).join('')}
        ${rows.map((row, i) => `<rect class="chart-income" x="${x(i) - 11}" y="${y(row.inflow)}" width="9" height="${Math.max(0, zero - y(row.inflow))}" rx="1.5"></rect><rect class="chart-expense" x="${x(i) + 2}" y="${zero}" width="9" height="${Math.max(0, y(-row.outflow) - zero)}" rx="1.5"></rect><text class="chart-label" x="${x(i)}" y="${height - 11}" text-anchor="middle">${i % 2 === 0 || i === rows.length - 1 ? count(row.week) : ''}</text>`).join('')}
        <path d="${path(line)}" class="chart-cash" fill="none"></path>${showHypothesis ? `<path d="${path(hypothetical)}" class="chart-hypothesis" fill="none" stroke-dasharray="5 4"></path>` : ''}
        <circle class="chart-point${low < 0 ? ' chart-low' : ''}" cx="${lowX}" cy="${lowY}" r="4"></circle><text class="chart-label${low < 0 ? ' chart-low' : ''}" x="${lowTextX}" y="${lowY < 48 ? lowY + 20 : lowY - 8}" text-anchor="middle">${shortYuan(low)}</text>
      </svg>
      <figcaption class="chart-legend"><span class="positive">▉ ＋现金流入</span><span class="negative">▉ −支出</span><span>━ 预计余额</span>${showHypothesis ? '<span class="pending">┄ 若中单</span>' : ''}</figcaption>
    </figure>
    <details class="forecast-details"><summary>查看逐周明细</summary>${table(['周次', '现金流入', '支出', '周末现金', ...(showHypothesis ? ['若中单'] : [])], rows.map(row => [weekLabel(row.week), yuan(row.inflow), yuan(row.outflow), yuan(row.cash), ...(showHypothesis ? [yuan(hypothetical(row))] : [])]))}</details>
    ${state ? fundingSchedule(state, rows.at(-1).week) : ''}
  </section>`;
}

function fundingSchedule(state, horizon) {
  const inRange = week => week >= state.week && week <= horizon;
  const types = { 'export-refund': '出口退税', insurance: '保险赔款' };
  const rows = state.queue.filter(item => types[item.type] && inRange(item.dueWeek)).map(item => ({
    label: types[item.type], week: item.dueWeek, amount: yuan(item.amount), note: '已排入到账计划',
  }));
  const financing = { 'letter-of-credit': '信用证尾款', insured: '已投保应收' };
  for (const invoice of state.receivables) {
    if (invoice.status === 'factored' && invoice.paidWeek >= state.week - 3) {
      rows.push({ label: '保理到账', week: invoice.paidWeek, amount: yuan(invoice.paidAmount), note: '已到账，应收已移出后续预测' });
    } else if (openInvoice(invoice) && financing[invoice.financing] && inRange(invoice.dueWeek)) {
      rows.push({ label: financing[invoice.financing], week: invoice.dueWeek, amount: yuan(invoice.amount), note: '按当前账期与汇率列示' });
    }
  }
  for (const order of openOrders(state)) {
    if (financing[order.financing] && inRange(order.expectedPayWeek)) {
      rows.push({ label: financing[order.financing], week: order.expectedPayWeek, amount: yuan(order.total - order.deposit), note: '订单交付后生成应收' });
    }
  }
  if (!rows.length) return '';
  rows.sort((a, b) => a.week - b.week);
  return `<details class="forecast-details"><summary>融资与退税计划</summary>${table(['项目', '预计周次', '人民币金额', '状态'], rows.map(row => [row.label, weekLabel(row.week), row.amount, row.note]))}</details>`;
}

function table(headers, rows, empty = '暂无记录。') {
  if (!rows.length) return `<p class="empty">${esc(empty)}</p>`;
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(label => `<th scope="col">${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((value, i) => `<td data-label="${esc(headers[i])}">${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function adviserTip(state, rows) {
  const creditLeft = Math.max(0, (state.creditLine ?? creditLimit(state)) - state.loan);
  const risk = rows.find(row => row.hypothetical < 0);
  if (state.events.length) return '桌上还有要你拿主意的事。先做决定，再结算本周。';
  if (state.cash < 0) return `手头资金转负了。先清仓或筹钱，可用授信还剩 ${yuan(creditLeft)}。`;
  if (risk) return `${weekLabel(risk.week)}的现金可能变负。先对比垫款和回款时间，别让新订单挤住周转。`;
  if (!state.bids.length) return '这周还没发报价。先看交期，再挑一个垫款撑得住的方案。';
  return '报价已经发出。周末一起看结果，记得留足接下来的采购款和运费。';
}

export function officePage(state, feature = {}) {
  const rows = forecast(state);
  const person = assistantFor(state.assistant);
  const open = openOrders(state).length;
  const due = state.receivables.filter(item => openInvoice(item) && item.dueWeek <= state.week).length;
  return `<section class="hero panel">${imageFrame(feature.officeImage ?? person.office, { className: 'hero-art', fallback: '办公室插画暂时无法显示', alt: '', lazy: false, retry: true })}<div class="hero-copy"><p>${Number.isSafeInteger(feature.year) ? `${feature.year} 年 · ` : ''}${yearWeek(state.week)} · ${['晴间多云', '晴', '微风', '阵雨'][state.week % 4]}</p><h2>${esc(state.company.name)}</h2><p>${esc(person.name)}已就位。把本周的生意一单一单理清。</p></div>${feature.port ?? ''}</section>
    <div class="office-grid"><section class="panel"><header class="panel-heading"><div><h2>本周待办</h2><p>结算前看一下手上的事。</p></div></header><div class="todo-list">
      <button type="button" data-ui="page" data-page="inquiries"><span><strong>${count(state.inquiries.length)} 条询盘</strong><small>已提交 ${count(state.bids.length)} / 3 个报价</small></span><span aria-hidden="true">→</span></button>
      <button type="button" data-ui="page" data-page="orders"><span><strong>${count(open)} 笔待交付订单</strong><small>${due ? `本周 ${count(due)} 笔待收款` : '查看交付、回款与库存'}</small></span><span aria-hidden="true">→</span></button>
    </div></section>
    <section class="panel adviser"><header class="panel-heading"><div><h2>助理建议</h2><p>${esc(person.name)}</p></div>${portrait(person)}</header><p class="adviser-note">${adviserTip(state, rows)}</p></section></div>
    ${forecastPanel(rows, state)}
    <section class="panel"><header class="panel-heading"><h2>经营动态</h2></header>${state.log.length ? `<ol class="activity-list">${state.log.slice(0, 10).map(item => `<li><span class="badge">${weekLabel(item.week)}</span><p>${esc(item.text)}</p></li>`).join('')}</ol>` : '<p class="empty">开张第一周，等你发出首笔报价。</p>'}</section>`;
}

export function companyPage(state, extra = '') {
  const limit = state.creditLine ?? creditLimit(state);
  const remaining = Math.max(0, limit - state.loan);
  const payable = Math.max(0, Math.min(state.cash, state.loan));
  const year = state.year;
  return `<div class="company-grid"><section class="panel"><header class="panel-heading"><div><h2>银行授信</h2><p>按周计息。到期款遇到资金不足时，系统会先动用剩余授信。</p></div></header>
    <dl class="key-values"><div><dt>总额度</dt><dd>${yuan(limit)}</dd></div><div><dt>已借款</dt><dd>${yuan(state.loan)}</dd></div><div><dt>可用额度</dt><dd>${yuan(remaining)}</dd></div></dl>
    <div class="finance-forms">
      ${financeForm('borrow', '借款', remaining, '暂无可用额度')}
      ${financeForm('repay', '还款', payable, state.loan > 0 ? '现金不足' : '没有未还借款')}
    </div></section>
    <section class="panel"><header class="panel-heading"><div><h2>信誉与净资产</h2><p>按时交付能积累信誉。信誉影响哪些询盘可以报价、中单机会和授信额度。</p></div></header><dl class="key-values"><div><dt>信誉</dt><dd>${count(state.company.rep)} / 100</dd></div><div><dt>净资产</dt><dd>${yuan(netAssets(state))}</dd></div></dl><progress max="100" value="${state.company.rep}" aria-label="公司信誉"></progress></section></div>
    <section class="panel"><header class="panel-heading"><h2>年度经营</h2></header>${table(['年度', '营收', '净利', '交付', '逾期'], [...(year.records ?? []), year].slice(-8).map(row => [`第 ${count(row.number)} 年`, yuan(row.revenue), yuan(row.profit), `${count(row.deliveries)} 单`, `${count(row.late)} 单`]))}</section>
    ${extra}
    <section class="panel"><header class="panel-heading"><h2>最近 12 周</h2></header>${recentTrends(state.history)}${table(['周次', '营收', '净利', '周末现金', '信誉'], state.history.slice(-12).reverse().map(row => [weekLabel(row.week), yuan(row.revenue), yuan(row.profit), yuan(row.cash), count(row.rep)]), '结算后，这里会列出每周经营记录。')}</section>`;
}

function financeForm(type, label, max, unavailable) {
  const placeholder = max ? `例如：${count(Math.min(5000, max))}` : unavailable;
  const disabled = max ? '' : ' disabled';
  return `<form data-form="${type}" class="toolbar" novalidate>
    <div class="form-field"><label for="${type}-amount">${label}金额</label><input id="${type}-amount" type="number" name="amount" min="1" max="${max}" step="1" placeholder="${esc(placeholder)}" required aria-describedby="${type}-error"${disabled}><p class="negative" id="${type}-error" data-field-error role="alert" hidden></p></div>
    <button type="submit" class="button secondary"${disabled}>${label}</button>
  </form>`;
}

function recentTrends(history) {
  if (history.length < 2) return '';
  return `<div class="company-grid" aria-label="经营趋势">${[['周末现金', 'cash'], ['周净利', 'profit']].map(([title, key]) => {
    const values = history.slice(-12).map(row => row[key]);
    return kpi(title, values.at(-1), values.at(-2), values, yuan);
  }).join('')}</div>`;
}

export function offworkPage(state, extra = '') {
  const pending = state.bids.length ? `还有 ${count(state.bids.length)} 笔报价等本周结算。` : '这周没有待出结果的报价。';
  return `<section class="panel"><header class="panel-heading"><div><h2>收好这周的账本</h2><p>${pending}</p></div></header><p>结算会推进生产、运输和回款，同时扣除本周开支。</p><div class="toolbar"><button type="button" class="button primary" data-action="end-week"${state.events.length || state.bankrupt ? ' disabled' : ''}>结束本周 →</button><button type="button" class="button secondary" data-action="advance-four"${state.events.length || state.bankrupt ? ' disabled' : ''}>连推四周</button></div></section>
  ${extra}<section class="panel"><header class="panel-heading"><h2>离开本局</h2></header><p class="session-warning" data-session-warning="leaving">进入经典版或重新开局会结束本局。刷新或关闭页面也会结束本局。</p>${classicLinks()}<button type="button" class="button quiet" data-ui="request-restart">重新开局</button></section>`;
}

const cashLabels = {
  inflow: {
    deposit: '客户定金', customerPayment: '客户回款', borrowing: '银行借款', factoring: '应收保理',
    refundRebate: '出口退税', insuranceRecovery: '保险赔款', legalRecovery: '诉讼追回',
    inventorySale: '清仓收入', capital: '融资款', other: '其他流入',
  },
  outflow: {
    supplier: '采购款', freight: '运输费', fixed: '固定开支', payroll: '工资', interest: '借款利息',
    repayment: '还款', commission: '员工提成', expedite: '加急费', orderFees: '履约支出',
    insurance: '保险费', refund: '退还定金', decision: '事件支出', legal: '诉讼费', other: '其他支出',
  },
};

function summaryCash(weeks) {
  const amounts = { inflow: {}, outflow: {} };
  for (const week of weeks) {
    for (const direction of ['inflow', 'outflow']) {
      for (const [key, value] of Object.entries(week.cashBreakdown?.[direction] ?? {})) {
        if (!Number.isFinite(value) || value <= 0) continue;
        const item = Object.hasOwn(cashLabels[direction], key) ? key : 'other';
        amounts[direction][item] = (amounts[direction][item] ?? 0) + value;
      }
    }
  }
  const rows = Object.entries(cashLabels).flatMap(([direction, labels]) => {
    const isInflow = direction === 'inflow';
    return Object.entries(labels).filter(([key]) => amounts[direction][key]).map(([key, label]) => [
      isInflow ? '流入' : '支出', label, `${isInflow ? '+' : '−'}${yuan(amounts[direction][key])}`,
    ]);
  });
  return {
    breakdown: rows.length ? `<details class="forecast-details summary-breakdown"><summary>查看现金收支明细</summary>${table(['方向', '项目', '金额'], rows)}</details>` : '',
    borrowing: amounts.inflow.borrowing,
  };
}

function summaryContent(summary, tutorial, firstOrder) {
  const multiWeek = (summary.weeks?.length ?? 0) > 1;
  const weeks = multiWeek ? summary.weeks : [summary];
  const won = weeks.flatMap(row => row.won);
  const lost = weeks.flatMap(row => row.lost);
  const delivered = weeks.flatMap(row => row.delivered).length;
  const inflow = weeks.reduce((sum, row) => sum + row.inflow, 0);
  const outflow = weeks.reduce((sum, row) => sum + row.outflow, 0);
  const messages = weeks.flatMap(row => row.messages ?? []);
  const buyerName = bid => bid.buyer?.name ?? bid.buyer;
  const cash = summaryCash(weeks);
  return `<header class="dialog-header"><div><p class="eyebrow">${multiWeek ? `${weekLabel(weeks[0].week)}至${weekLabel(summary.week)}` : weekLabel(summary.week)}</p><h2 id="modal-title" tabindex="-1">${multiWeek ? '经营小结' : '本周小结'}</h2></div></header>
    <div class="summary-scroll"><div class="dialog-body"><dl class="key-values summary-totals"><div><dt>中单</dt><dd>${count(won.length)} 笔</dd></div><div><dt>交付</dt><dd>${count(delivered)} 笔</dd></div><div><dt>现金流入</dt><dd class="positive">+${yuan(inflow)}</dd></div><div><dt>现金支出</dt><dd class="negative">−${yuan(outflow)}</dd></div></dl>
    ${cash.borrowing ? `<p>现金流入中含银行借款 ${yuan(cash.borrowing)}。</p>` : ''}${cash.breakdown}
    ${won.length ? `<h3>中单通知</h3>${table(['买家', '成交价'], won.map(bid => [buyerName(bid), contractPrice(bid)]))}` : ''}
    ${firstOrder ? '<p>每周结算会自动推进备货、运输和交付。到「订单」可以查看交期和预计回款。</p>' : ''}
    ${lost.length ? `<h3>未中单</h3>${table(['买家', '胜出同行', '成交价'], lost.map(bid => [buyerName(bid), bid.winner, contractPrice(bid)]))}` : ''}
    ${messages.length ? `<ul class="summary-messages">${messages.map(message => `<li>${esc(message)}</li>`).join('')}</ul>` : ''}
    ${summary.annual ? `<section class="annual-summary"><h3>年度结算 · 第 ${count(summary.annual.number)} 年</h3><p>营收 ${yuan(summary.annual.revenue)} · 净利 ${yuan(summary.annual.profit)} · 交付 ${count(summary.annual.deliveries)} 单 · 逾期 ${count(summary.annual.late)} 单</p>${annualGoalResult(summary.annual.goal)}</section>` : ''}
    </div><div data-tour="week-summary">${tutorial}</div></div>`;
}

function annualGoalResult(goal) {
  if (!goal) return '';
  return `<h4>年度目标</h4><ul>${goal.criteria.map(item => `<li>${item.met ? '✓' : '○'} ${esc(item.text)}</li>`).join('')}</ul>
  ${goal.met ? `<p class="positive">全部达成。现金 +${yuan(goal.bonusCash)}，信誉 +${count(goal.bonusRep)}。</p>` : '<p>本年度的部分目标还未达成。</p>'}`;
}

function eventContent(state, event, notice) {
  const { context, choices } = decisionInfo(state, event);
  const comic = /^assets\/[\w.-]+\.(?:webp|png|jpe?g|svg)$/i.test(event.comic ?? '')
    ? `<img class="event-comic" src="${esc(event.comic)}" alt="${esc(event.comicAlt ?? '客户插画')}" loading="lazy" decoding="async">` : '';
  const button = (choice, description = '') => `<button type="button" class="button secondary" data-action="resolve-event" data-id="${esc(event.id)}" data-choice="${esc(choice.id)}"${description}${choice.disabled ? ' disabled' : ''}>${esc(choice.label)}</button>`;
  const explained = choices.some(choice => choice.details.length);
  const decisionList = explained ? `<ul class="decision-choices" aria-label="处理方式">${choices.map((choice, i) => {
    const descriptionId = `decision-option-${i + 1}`;
    const details = choice.details.length ? `<ul class="decision-detail" id="${descriptionId}">${choice.details.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : '';
    return `<li class="decision-option">${button(choice, details ? ` aria-describedby="${descriptionId}"` : '')}${details}</li>`;
  }).join('')}</ul>` : '';
  return `<header class="dialog-header"><div><p class="eyebrow">需要决定</p><h2 id="modal-title" tabindex="-1">${esc(event.title)}</h2></div></header>
    <div class="dialog-body">${comic}<p>${esc(event.text ?? event.description)}</p>
    ${context.length ? `<ul class="decision-context" aria-label="涉及业务">${context.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}
    ${notice ? `<p role="alert" class="notice negative">${esc(notice)}</p>` : ''}${decisionList}</div>
    ${explained ? '' : `<footer class="dialog-footer">${choices.map(choice => button(choice)).join('')}</footer>`}`;
}

export function dialogContent(state, ui, quote) {
  if (ui.dialog === 'quote') return `${quote}${tutorialNote(state, true)}`;
  if (ui.dialog === 'summary' && state.summary) {
    const firstOrder = state.orders[0];
    const weeks = state.summary.weeks ?? [state.summary];
    const wonFirstOrder = firstOrder && weeks.some(week => week.won.some(bid => bid.orderId === firstOrder.id));
    return `${summaryContent(state.summary, tutorialNote(state, true), wonFirstOrder)}<footer class="dialog-footer">
      <button type="button" class="button ${wonFirstOrder ? 'secondary' : 'primary'}" data-ui="close-dialog">继续经营</button>
      ${wonFirstOrder ? '<button type="button" class="button primary" data-ui="view-first-order">查看订单</button>' : ''}
    </footer>`;
  }
  if (ui.dialog === 'event' && state.events.length) return eventContent(state, state.events[0], ui.notice);
  if (ui.dialog === 'bankruptcy') return `<header class="dialog-header"><div><p class="eyebrow">${weekLabel(state.week - 1)} · 本局结束</p><h2 id="modal-title" tabindex="-1">公司破产</h2></div></header><div class="dialog-body"><p>连续两周资金为负，授信已无法覆盖到期支出。</p><p>期末现金 <strong class="negative">${yuan(state.cash)}</strong></p></div><footer class="dialog-footer"><button type="button" class="button primary" data-ui="restart">重新开局</button></footer>`;
  if (ui.dialog === 'restart') return '<header class="dialog-header"><h2 id="modal-title" tabindex="-1">重新开局？</h2></header><div class="dialog-body"><p data-session-warning="restart">重新开局会结束本局，当前进度无法恢复。</p></div><footer class="dialog-footer"><button type="button" class="button secondary" data-ui="close-dialog">继续本局</button><button type="button" class="button primary" data-ui="restart">重新开局</button></footer>';
  return '';
}
