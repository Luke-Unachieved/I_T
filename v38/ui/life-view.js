import { DIFFICULTIES, ERAS, ORIGINS } from '../data/strategy.js';
import { collateral, LIFE_CATALOG, lifeAssets } from '../engine/life.js';
import { count, esc, yuan } from './shell.js';

const choices = {
  era: { label: '时代剧本', rows: ERAS, defaultId: '2026' },
  origin: { label: '出身', rows: ORIGINS, defaultId: 'self-made' },
  difficulty: { label: '难度', rows: DIFFICULTIES, defaultId: 'normal' },
};

export function optionDescription(type, id) {
  if (type === 'difficulty' && id === 'normal') return '初始资金、回款风险和同行竞争均为标准。';
  return choices[type]?.rows.find(item => item.id === id)?.description;
}

export function scenarioFields() {
  return `<fieldset class="scenario-settings"><legend>开局设定</legend><div class="scenario-fields">${Object.entries(choices).map(([type, config]) => {
    const noteId = `opening-${type}-note`;
    return `<label class="form-field"><span>${config.label}</span><select name="${type}" data-ui="scenario-option" aria-describedby="${noteId}">
      ${config.rows.map(row => `<option value="${esc(row.id)}"${row.id === config.defaultId ? ' selected' : ''}>${esc(row.year ? `${row.year} · ${row.label}` : row.label)}</option>`).join('')}
    </select><small id="${noteId}">${esc(optionDescription(type, config.defaultId))}</small></label>`;
  }).join('')}</div></fieldset>`;
}

const offices = ['assets/deal-office-window-v1.webp', 'assets/deal-property-office-wide.webp'];

export function officeFeatures(state) {
  const warehouse = state.ventures?.warehouse ?? 0;
  const scale = (state.company.certs.includes('audit') ? 1 : 0) + (state.company.certs.includes('supplier') ? 1 : 0);
  const era = ERAS.find(item => item.id === state.era);
  const year = era ? era.year + Math.floor((state.week - 1) / 52) : undefined;
  return { officeImage: offices[scale - 1], port: portScene(state, warehouse), year };
}

function portScene(state, warehouse) {
  const cargo = state.orders.filter(order => order.status === 'transit');
  cargo.sort((a, b) => (b.total >= 1_000_000) - (a.total >= 1_000_000));
  const inTransit = cargo.length;
  const markets = state.company.markets.filter(market => market !== 'domestic').length;
  const caption = `在途 ${count(inTransit)} 单 · 海外 ${count(markets)} 个市场${warehouse ? ` · 仓库 ${warehouse} 级` : ''}${cargo.some(order => order.total >= 1_000_000) ? ' · 地标订单在途' : ''}`;
  const containers = cargo.slice(0, 36).map((order, i) => {
    const x = 35 + Math.floor(i / 4) * 25;
    const y = 98 - (i % 4) * 10;
    const color = order.total >= 1_000_000 ? '#ecc279' : ['#a8784e', '#78504a', '#bba471', '#846348'][Math.floor(i / 4) % 4];
    return `<g fill="${color}" stroke="#3d2e26"><rect x="${x}" y="${y}" rx="1" width="21" height="9"></rect><path d="M${x + 4} ${y + 2}v5m4-5v5m4-5v5m4-5v5" opacity=".45"></path></g>`;
  }).join('');
  const ships = Array.from({ length: Math.min(markets, 7) }, (_, i) => {
    const x = 257 + i * 49, y = 117 + (i % 2) * 9;
    return `<g transform="translate(${x} ${y})" stroke="#54413a" stroke-linejoin="round"><path d="M-20-2H24L16 7h-29z" fill="#a67562"></path><path d="M-12-2v-5h8v5m4 0v-6h9v6m4 0v-9h5v9" fill="#d4b183"></path></g>`;
  }).join('');
  const buildings = Array.from({ length: warehouse }, (_, i) => `<g transform="translate(${382 + i * 43} 74)" stroke="#574338" stroke-width="2"><path d="M-4 9 17-6 41 9v23H-4z" fill="#a47a58"></path><path d="M8 32V17h19v15m7-12h4" fill="#6c5140"></path></g>`).join('');
  return `<figure class="port-overlay" aria-label="港口：${esc(caption)}">
    <svg class="port-art" viewBox="0 0 590 146" aria-hidden="true">
      <defs><linearGradient id="port-sky" x2="0" y2="1"><stop stop-color="#d0aa76" stop-opacity=".14"></stop><stop offset="1" stop-color="#a27659" stop-opacity=".76"></stop></linearGradient><linearGradient id="port-sea" x2="0" y2="1"><stop stop-color="#866851"></stop><stop offset="1" stop-color="#443731"></stop></linearGradient></defs>
      <rect width="590" height="109" fill="url(#port-sky)"></rect><circle cx="481" cy="61" r="22" fill="#edbe82" opacity=".58"></circle>
      <path d="m0 99 102-37 92 19 65-21 35 19 46-8 63 12 36-4 50 11 101-10v30H0z" fill="#6f5246" opacity=".74"></path>
      <rect y="108" width="590" height="38" fill="url(#port-sea)"></rect><path d="M0 112h590m-552 13h135m-114 10h66m277-19h112m-126 21h137" stroke="#cba383" opacity=".48"></path>
      <path d="M0 104h240l12 12H0z" fill="#7c624d"></path><path d="M166 104V60l27-24h45m-51 5v62m-21-41h59v25m-5 0h9" fill="none" stroke="#523c30" stroke-width="3"></path>
      ${buildings}${containers}${ships}
    </svg><figcaption class="port-caption">${esc(caption)}</figcaption>
  </figure>`;
}

function lifeButton(type, item, label, disabled = false, primary = false) {
  return `<button type="button" class="button ${primary ? 'primary' : 'secondary'}" data-action="${type}" data-id="${esc(item.id)}"${disabled ? ' disabled' : ''}>${esc(label)}</button>`;
}

const media = (asset, classes = '') => /^assets\/[\w.-]+\.(?:webp|png|jpe?g|svg)$/i.test(asset ?? '') ? `<img class="${classes}" src="${esc(asset)}" alt="" loading="lazy" decoding="async">` : '';

function catalogueItem(item, controls, label = '') {
  return `<article class="life-card" data-life-id="${esc(item.id)}">${media(item.asset, 'life-art')}
    <div class="life-card-copy"><header class="panel-heading"><h3>${esc(item.label)}</h3>${label ? `<span class="badge">${esc(label)}</span>` : ''}</header>
    <p>${esc(item.description)}</p><div class="toolbar">${controls}</div></div>
  </article>`;
}

function panel(id, title, description, content) {
  return `<section id="${id}" class="panel"><header class="panel-heading"><div><h2>${title}</h2><p>${description}</p></div></header>${content}</section>`;
}

function propertyCards(state) {
  return LIFE_CATALOG.properties.map(item => {
    const owned = state.life.properties.find(property => property.id === item.id);
    const actions = owned ? [
      owned.pledged ? lifeButton('unmortgage', item, '解除抵押') : lifeButton('mortgage', item, `抵押 · 增加 ${yuan(Math.floor(item.price * 0.55))} 授信`),
      lifeButton('sell-property', item, `出售 · ${yuan(Math.floor(item.price * 0.85))}`, owned.pledged),
    ] : [lifeButton('buy-property', item, `买入 · ${yuan(item.price)}`, state.cash < item.price, true)];
    return catalogueItem(item, actions.join(''), owned ? (owned.pledged ? '已抵押' : '持有中') : '');
  }).join('');
}

function carCards(state) {
  return LIFE_CATALOG.cars.map(item => {
    const owned = state.life.cars.includes(item.id);
    return catalogueItem(item, owned ? lifeButton('sell-car', item, `卖车 · ${yuan(Math.floor(item.price * 0.65))}`)
      : lifeButton('buy-car', item, `买车 · ${yuan(item.price)}`, state.cash < item.price, true), owned ? '持有中' : '');
  }).join('');
}

function outingCards(state) {
  const resting = state.life.lastBreakWeek === state.week;
  return LIFE_CATALOG.outings.map(item => {
    const restore = Math.min(item.energy, 100 - state.energy);
    const label = resting ? '本周已安排休息' : `安排 · ${item.price ? yuan(item.price) : '免费'}${restore ? ` · 精力 +${count(restore)}` : ''}`;
    return catalogueItem(item, lifeButton('outing', item, label, resting || state.cash < item.price, true), item.weeks ? `推进 ${item.weeks} 周` : '');
  }).join('');
}

const outingScenes = {
  'flower-market': '花市的小桶漏了水。朋友陪你把花一路捧回家，刚好插满门口的陶罐。',
  mending: '缝完最后一针，你拎起旧布包试了试。松了好几周的提手终于结实了。',
  'night-bus': '夜班车沿海湾拐了一个弯。港口的灯在后窗渐渐远去，你把账本留在了包里。',
};

function outingResult(recent) {
  if (!recent) return '';
  const outing = LIFE_CATALOG.outings.find(item => item.id === recent.id);
  const text = outingScenes[recent.id] ?? recent.text ?? '你给自己留出了一点休息的时间。';
  return `<article class="outing-note">${media(recent.asset ?? outing?.asset, 'outing-art')}
    <h3>${esc(recent.label ?? outing?.label ?? '最近一次休息')}</h3><p>${esc(text)}</p>
    ${outing ? `<p>支出 ${yuan(outing.price)}${Number.isSafeInteger(recent.week) ? ` · 第 ${count(recent.week)} 周` : ''}</p>` : ''}
    ${recent.restored ? `<p class="positive">精力 +${count(recent.restored)}</p>` : '<p>精力已满。</p>'}</article>`;
}

export function lifePanel(state) {
  if (!state.life) return '';
  const energy = `<div class="life-energy"><div><label for="life-energy">精力 ${count(state.energy)} / 100</label><progress id="life-energy" max="100" value="${state.energy}"></progress></div><p>${state.energy < 35 ? '精力偏低，本周报价的中单率略降。出门走走可以恢复。' : '连周经营会消耗精力；旅行或约朋友可以恢复。'}</p></div>`;
  const last = outingResult(state.life.latestOuting);
  return `${panel('life-rest', '旅行与好友', '给自己留一点下班时间。', `${energy}${last}<div class="life-grid">${outingCards(state)}</div>`)}
    ${panel('life-property', '房产', `生活资产 ${yuan(lifeAssets(state))}。房产抵押当前增加授信 ${yuan(collateral(state))}。`, `<div class="life-grid">${propertyCards(state)}</div>`)}
    ${panel('life-car', '车行', '买喜欢的车，手头吃紧时也可以卖掉。', `<div class="life-grid">${carCards(state)}</div>`)}`;
}
