import { netAssets } from '../engine/game.js';
import { ACHIEVEMENTS, biography, ipoProgress, nationalRank, ventureProgress } from '../engine/strategy.js';
import { count, esc, yuan } from './shell.js';

const stages = [
  { id: 'private', label: '独立经营' },
  { id: 'funded', label: '战略投资' },
  { id: 'corporation', label: '股份制公司' },
  { id: 'public', label: '已上市' },
];
const stakes = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });

function section(id, title, explanation, content) {
  return `<section class="panel strategy-section" id="${id}" aria-labelledby="${id}-title"><header class="panel-heading"><div><h2 id="${id}-title">${title}</h2><p>${explanation}</p></div></header>${content}</section>`;
}

function badge(label, status = '') {
  return `<span class="badge${status ? ` ${status}` : ''}">${esc(label)}</span>`;
}

function stat(label, value) {
  return `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

function image(path, className) {
  return typeof path === 'string' && /^assets\/[\w.-]+\.(?:webp|png|jpe?g|svg)$/i.test(path)
    ? `<img class="${className}" src="${esc(path)}" alt="" loading="lazy" decoding="async">` : '';
}

function goalMeasure(label, actual, threshold, format, limit = false) {
  const met = limit ? actual <= threshold : actual >= threshold;
  const progress = limit ? '' : `<progress max="${Math.max(1, threshold)}" value="${Math.max(0, Math.min(actual, threshold))}" aria-label="${esc(label)}进度"></progress>`;
  return `<li><div><strong>${label}</strong>${badge(met ? '当前达标' : '尚未达标', met ? 'positive' : 'pending')}</div>
    <p>${format(actual)} <span class="muted">${limit ? '／上限 ' : '／目标 '}${format(threshold)}</span></p>${progress}</li>`;
}

function boardSection(state) {
  const { year } = state;
  const goal = year.goal;
  if (!goal) return '';
  const rows = [
    goalMeasure('营收', year.revenue, goal.revenue, yuan),
    goalMeasure('净利润', year.profit, goal.profit, yuan),
    goalMeasure('逾期交付', year.late, goal.maxLate, n => `${count(n)} 单`, true),
    goalMeasure('重大质量事故', year.quality ?? 0, goal.maxQuality, n => `${count(n)} 起`, true),
  ];
  const prior = year.records?.at(-1);
  const bonus = [goal.bonusCash ? `现金 +${yuan(goal.bonusCash)}` : '', goal.bonusRep ? `信誉 +${count(goal.bonusRep)}` : ''].filter(Boolean).join('，');
  return section('board-goals', `第 ${count(year.number)} 年经营目标`, '四项都满足后，年度结算会发放奖励。',
    `<ul class="goal-grid">${rows.join('')}</ul>${bonus ? `<p class="growth-note">年度达标奖励：${esc(bonus)}。</p>` : ''}
      ${prior?.goal ? `<p class="growth-note">第 ${count(prior.number)} 年目标${prior.goal.met ? '已达成' : '未全部达成'}。</p>` : ''}`);
}

function levelName(level) {
  return level ? `${count(level)} 级` : '尚未投入';
}

function optionCaption(option) {
  const price = option.nextCost == null ? '已升满' : `升至 ${option.level + 1} 级 · ${yuan(option.nextCost)}`;
  return `${option.label} · ${levelName(option.level)} · ${price}`;
}

function singletonInvestment(venture, option) {
  if (!option) return '<p class="muted">当前没有可投入的项目。</p>';
  const ongoing = option.nextCost == null;
  return `<div class="toolbar"><span class="badge">${levelName(option.level)}</span>${ongoing ? badge('已升满', 'positive') : `<button type="button" class="button secondary" data-action="invest-venture" data-id="${esc(venture.id)}"${option.available ? '' : ' disabled'}>${option.level ? '升级' : '投入'} · ${yuan(option.nextCost)}</button>`}</div>
    ${option.reason && !ongoing ? `<p class="trade-note">${esc(option.reason)}</p>` : ''}`;
}

function targetedInvestment(venture) {
  const available = venture.options.some(option => option.available && option.nextCost != null);
  const form = available ? `<form class="venture-form" data-form="invest-venture"><input type="hidden" name="id" value="${esc(venture.id)}"><label class="form-field">
      <span>${venture.id === 'factory' ? '商品品类' : '市场'}</span><select name="target" required>
      ${venture.options.map(option => `<option value="${esc(option.target)}"${option.available && option.nextCost != null ? '' : ' disabled'}>${esc(optionCaption(option))}</option>`).join('')}
      </select></label><button type="submit" class="button secondary">投入或升级</button></form>`
    : `<p class="trade-note">${venture.options.every(option => option.nextCost == null) ? '所有项目均已升满。' : '目前没有符合条件的投入。'}</p>`;
  return `${form}
    <details><summary>查看各项进度与条件</summary><ul class="growth-checklist">${venture.options.map(option => `<li><span aria-hidden="true">${option.level ? '✓' : '◇'}</span><span>${esc(optionCaption(option))}${option.reason && option.nextCost != null ? ` · ${esc(option.reason)}` : ''}</span></li>`).join('')}</ul></details>`;
}

function venturesSection(state) {
  return section('ventures', '产业链布局', '每项最多升到 3 级。设施投入从现金支付，之后可能产生维护费或经营收益。',
    `<div class="growth-cards strategy-cards">${ventureProgress(state).map(venture => {
      const single = !venture.options.some(option => option.target != null);
      const warehouse = venture.id === 'warehouse' && venture.options[0]?.level;
      return `<article class="growth-card venture-card">${image(venture.asset, 'venture-image')}<h3>${esc(venture.label)}</h3><p class="muted">${esc(venture.description)}</p>
        <p class="trade-note">每级每周维护 ${yuan(venture.upkeep)}</p>
        ${single ? singletonInvestment(venture, venture.options[0]) : targetedInvestment(venture)}
        ${warehouse ? '<div><button type="button" class="button quiet" data-ui="page" data-page="orders">去订单页采购库存 →</button></div>' : ''}</article>`;
    }).join('')}</div>`);
}

function listingAction(action, index, activeIndex) {
  const finished = index < activeIndex;
  const status = finished ? badge('已完成', 'positive') : action.available ? badge('可以办理', 'positive') : badge(action.current ? '待达条件' : '等待上一步', 'pending');
  return `<article class="growth-card"><header class="growth-card-heading"><h3>${esc(action.label)}</h3>${status}</header>
    ${!finished ? `<ul class="growth-checklist">${action.requirements.map(requirement => `<li class="${requirement.met ? 'positive' : ''}"><span aria-hidden="true">${requirement.met ? '✓' : '◇'}</span><span><span class="visually-hidden">${requirement.met ? '已满足：' : '未满足：'}</span>${esc(requirement.text)}</span></li>`).join('')}</ul>
    <div class="toolbar"><button type="button" class="button ${action.available ? 'primary' : 'secondary'}" data-action="${esc(action.id)}"${action.available ? '' : ' disabled'}>
      ${esc(action.label)}${action.cost ? ` · 支出 ${yuan(action.cost)}` : action.cashIn ? ` · 融资 ${yuan(action.cashIn)}` : ''}</button></div>` : ''}</article>`;
}

function listingSection(state) {
  const listing = ipoProgress(state, netAssets(state));
  const index = stages.findIndex(stage => stage.id === listing.stage);
  const activeStage = stages[Math.max(0, index)];
  return section('listing', '估值与上市', '估值基于最近 52 周利润和净资产。获得投资、完成股份制改造，再申请上市。',
    `<dl class="key-values strategy-finance">${stat('公司估值', yuan(listing.valuation))}${stat('创始人持股', `${stakes.format(listing.stake)}%`)}${stat('全国营收名次', `约第 ${count(nationalRank(state))} 位`)}${stat('公司阶段', activeStage.label)}</dl>
    ${listing.stage === 'public' ? '<p class="notice strategy-win">公司已上市。可以继续经营并扩展全球市场。</p>' : ''}
    <div class="growth-cards listing-cards">${listing.actions.map((action, i) => listingAction(action, i, Math.max(0, index))).join('')}</div>`);
}

function chronicleDate(week) {
  return `第 ${count(Math.floor((week - 1) / 52) + 1)} 年 · 第 ${count((week - 1) % 52 + 1)} 周`;
}

function recordSection(state) {
  const earned = new Set(state.achievements);
  const achievements = ACHIEVEMENTS.map(item => {
    const won = earned.has(item.id);
    return `<article class="growth-card achievement"><header class="growth-card-heading"><h3>${esc(item.label)}</h3>${badge(won ? '已获得' : '未解锁', won ? 'positive' : '')}</header><p class="muted">${esc(item.description)}</p></article>`;
  }).join('');
  const history = [...(state.chronicle ?? [])].sort((a, b) => b.week - a.week);
  const chronicle = history.length ? `<ol class="activity-list strategy-timeline">${history.map(event => `<li>${badge(chronicleDate(event.week))}<p>${esc(event.text)}</p></li>`).join('')}</ol>` : '<p class="empty-state">重要经营节点会收录进这里。</p>';
  const story = biography(state);
  return section('company-record', '成就与企业记事', '查看里程碑和历程，留一份公司的经营传记。',
    `<details class="strategy-details"><summary>成就　${count(earned.size)} / ${count(ACHIEVEMENTS.length)}</summary><div class="growth-cards achievement-cards">${achievements}</div></details>
     <details class="strategy-details"><summary>企业大事记　${count(history.length)} 条</summary>${chronicle}</details>
     <details class="strategy-details"><summary>企业传记</summary><div class="biography">${story.length ? story.map(paragraph => `<p>${esc(paragraph)}</p>`).join('') : '<p class="muted">公司刚起步，传记会随经营历程增长。</p>'}</div></details>`);
}

export function strategyPanel(state) {
  return `<nav class="growth-shortcuts toolbar" aria-label="公司长线经营"><a class="button quiet" href="#board-goals">年度目标</a><a class="button quiet" href="#ventures">产业链</a><a class="button quiet" href="#listing">估值上市</a><a class="button quiet" href="#company-record">成就记事</a></nav>
    ${boardSection(state)}${venturesSection(state)}${listingSection(state)}${recordSection(state)}`;
}
