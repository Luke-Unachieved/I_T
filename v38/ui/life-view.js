import { DIFFICULTIES, ERAS, ORIGINS } from '../data/strategy.js';
import { OUTING_COMPANIONS } from '../data/outing-catalog.js';
import { collateral, LIFE_CATALOG, lifeAssets, outingLockHint } from '../engine/life.js';
import { count, esc, yuan } from './shell.js';
import { imageFrame } from './media.js';

const choices = {
  era: { label: '时代剧本', rows: ERAS, defaultId: '2026' },
  origin: { label: '出身', rows: ORIGINS, defaultId: 'self-made' },
  difficulty: { label: '难度', rows: DIFFICULTIES, defaultId: 'normal' },
};

export function optionDescription(type, id) {
  return choices[type]?.rows.find(item => item.id === id)?.description;
}

export function eraIllustration(id = choices.era.defaultId) {
  const era = ERAS.find(item => item.id === id);
  if (!era) return '';
  return imageFrame(era.art, { className: 'era-art', alt: `${era.year} 年 · ${era.label}`, fallback: '插画未能加载，请重试', lazy: false, retry: true, autoRetry: 2 });
}

export function scenarioFields() {
  return `<fieldset class="scenario-settings"><legend>开局设定</legend><div data-era-art>${eraIllustration()}</div><div class="scenario-fields">${Object.entries(choices).map(([type, config]) => {
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
    const x = 18 + Math.floor(i / 4) * 19;
    const y = 125 - (i % 4) * 7;
    const color = order.total >= 1_000_000 ? '#ecc279' : ['#a8784e', '#78504a', '#bba471', '#846348'][Math.floor(i / 4) % 4];
    return `<g class="port-container" fill="${color}" stroke="#3d2e26"><rect x="${x}" y="${y}" rx="1" width="17" height="8"></rect><path d="M${x + 4} ${y + 2}v4m4-4v4m4-4v4" opacity=".45"></path></g>`;
  }).join('');
  const ships = Array.from({ length: Math.min(markets, 7) }, (_, i) => {
    const x = 263 + i * 47, y = 119 + (i % 2) * 10;
    return `<g class="port-ship" transform="translate(${x} ${y})" stroke="#54413a" stroke-linejoin="round"><path d="M-20-2H24L16 7h-29z" fill="#a67562"></path><path d="M-12-2v-5h8v5m4 0v-6h9v6m4 0v-9h5v9" fill="#d4b183"></path></g>`;
  }).join('');
  const buildings = Array.from({ length: warehouse }, (_, i) => `<g class="port-warehouse" transform="translate(${16 + i * 36} 57) scale(.75)" stroke="#574338" stroke-width="2"><path d="M-4 9 17-6 41 9v23H-4z" fill="#a47a58"></path><path d="M8 32V17h19v15m7-12h4" fill="#6c5140"></path></g>`).join('');
  return `<figure class="port-overlay" aria-label="港口：${esc(caption)}">
    <div class="port-vista"><svg class="port-backdrop" viewBox="0 0 590 146" aria-hidden="true">
      <defs><linearGradient id="port-sky" x2="0" y2="1"><stop stop-color="#d0aa76" stop-opacity=".14"></stop><stop offset="1" stop-color="#a27659" stop-opacity=".76"></stop></linearGradient><linearGradient id="port-sea" x2="0" y2="1"><stop stop-color="#866851"></stop><stop offset="1" stop-color="#443731"></stop></linearGradient></defs>
      <rect width="590" height="109" fill="url(#port-sky)"></rect><circle cx="481" cy="61" r="22" fill="#edbe82" opacity=".58"></circle>
      <path d="m0 99 102-37 92 19 65-21 35 19 46-8 63 12 36-4 50 11 101-10v30H0z" fill="#6f5246" opacity=".74"></path>
      <rect y="108" width="590" height="38" fill="url(#port-sea)"></rect><path d="M0 112h590m-552 13h135m-114 10h66m277-19h112m-126 21h137" stroke="#cba383" opacity=".48"></path>
      <path d="M0 73h135l130 73H0z" fill="#7c624d"></path><path d="M133 76V40l27-18h45m-51 5v50m-21-35h59v20m-5 0h9" fill="none" stroke="#523c30" stroke-width="3"></path>
    </svg>${imageFrame('assets/v38-port-background.webp', { className: 'port-background', alt: '' })}
    <svg class="port-art" viewBox="0 0 590 146" aria-hidden="true">${buildings}${containers}${ships}</svg></div>
    <figcaption class="port-caption"><strong>港口</strong><span>${esc(caption)}</span></figcaption>
  </figure>`;
}

function lifeButton(type, item, label, disabled = false, primary = false) {
  return `<button type="button" class="button ${primary ? 'primary' : 'secondary'}" data-action="${type}" data-id="${esc(item.id)}"${disabled ? ' disabled' : ''}>${esc(label)}</button>`;
}

const media = (asset, classes = '', alt = '') => imageFrame(asset, {
  className: classes, alt, fallback: '插画暂未加载', retry: classes !== 'outing-thumb',
});

function catalogueItem(item, controls, label = '') {
  return `<article class="life-card" data-life-id="${esc(item.id)}">${media(item.asset, 'life-art')}
    <div class="life-card-copy"><header class="panel-heading"><h3>${esc(item.label)}</h3>${label ? `<span class="badge">${esc(label)}</span>` : ''}</header>
    <p>${esc(item.description)}</p><div class="toolbar">${controls}</div></div>
  </article>`;
}

function propertyCards(state) {
  return LIFE_CATALOG.properties.map(item => {
    const owned = state.life.properties.find(property => property.id === item.id);
    const actions = owned ? [
      owned.pledged ? lifeButton('unmortgage', item, '解除抵押') : lifeButton('mortgage', item, `抵押 · 增加 ${yuan(Math.floor(item.price * 0.55))} 授信`),
      lifeButton('sell-property', item, `出售 · ${yuan(Math.floor(item.price * 0.85))}${owned.pledged ? '（需先解除抵押）' : ''}`, owned.pledged),
    ] : [lifeButton('buy-property', item, `买入 · ${yuan(item.price)}${state.cash < item.price ? '（现金不足）' : ''}`, state.cash < item.price, true)];
    const description = owned ? item.description : item.description.replace(/可抵押给银行。?$/, `购入后可抵押，增加 ${yuan(Math.floor(item.price * 0.55))} 授信额度。`);
    return catalogueItem({ ...item, description }, actions.join(''), owned ? (owned.pledged ? '已抵押' : '持有中') : '');
  }).join('');
}

function carCards(state) {
  return LIFE_CATALOG.cars.map(item => {
    const owned = state.life.cars.includes(item.id);
    return catalogueItem(item, owned ? lifeButton('sell-car', item, `卖车 · ${yuan(Math.floor(item.price * 0.65))}`)
      : lifeButton('buy-car', item, `买车 · ${yuan(item.price)}${state.cash < item.price ? '（现金不足）' : ''}`, state.cash < item.price, true), owned ? '持有中' : '');
  }).join('');
}

function quickOutingCard(state, item) {
  const resting = state.life.lastBreakWeek === state.week;
  const restore = Math.min(item.energy, 100 - state.energy);
  const cost = item.price ? yuan(item.price) : '免费';
  const label = resting ? '本周已安排休息' : state.cash < item.price ? '现金不足' : '安排这次活动';
  const summary = `${cost} · ${restore ? `精力 +${count(restore)}` : '精力已满'}`;
  return `<details class="life-card outing-card" data-life-id="${esc(item.id)}"><summary class="outing-card-summary">${media(item.asset, 'outing-thumb')}<span class="outing-card-label"><strong>${esc(item.label)}</strong><small>${esc(summary)}</small></span></summary><div class="life-card-copy">${media(item.asset, 'outing-detail-art')}<p>${esc(item.description)}</p><p>${esc(summary)}</p><div class="toolbar">${lifeButton('outing', item, label, resting || state.cash < item.price, true)}</div></div></details>`;
}

function companionField(state, activity) {
  const fixed = OUTING_COMPANIONS.find(person => person.id === activity.companionId);
  if (fixed) return `<p class="life-companion">和${esc(fixed.name)}一起</p><input type="hidden" name="companionId" value="${esc(fixed.id)}">`;
  const travel = activity.kind === 'trip';
  const people = travel ? [{ id: 'solo', name: '独自出发' }, ...OUTING_COMPANIONS] : OUTING_COMPANIONS;
  const selected = travel ? 'solo' : (people.some(person => person.id === state.assistant) ? state.assistant : people[0].id);
  return `<label class="form-field"><span>${travel ? '同行安排' : '想约谁'}</span><select name="companionId">
    ${people.map(person => `<option value="${esc(person.id)}"${person.id === selected ? ' selected' : ''}>${esc(person.name)}</option>`).join('')}</select></label>`;
}

function detailedOutingCard(state, activity) {
  const locked = outingLockHint(state, activity);
  const resting = state.life.lastBreakWeek === state.week;
  const available = activity.choices.find(choice => state.cash >= choice.price);
  const controls = locked ? `<p class="life-locked">${esc(locked)}</p>` : `<form class="outing-choice-form" data-form="outing" data-outing-id="${esc(activity.id)}">
    <input type="hidden" name="id" value="${esc(activity.id)}">${companionField(state, activity)}
    <fieldset><legend>${activity.kind === 'trip' ? '想记住哪一段' : '想怎么安排'}</legend><div class="outing-choices">${activity.choices.map(choice => {
      const restoration = Math.min(choice.energy, 100 - state.energy);
      return `<label class="outing-choice"><input type="radio" name="choiceId" value="${esc(choice.id)}" ${available?.id === choice.id ? 'checked' : ''}${resting || state.cash < choice.price ? ' disabled' : ''} required>
        <span><strong>${esc(choice.label)}</strong><small>${choice.price ? yuan(choice.price) : '免费'} · ${restoration ? `精力 +${count(restoration)}` : '精力已满'}${state.cash < choice.price ? ' · 现金不足' : ''}</small></span></label>`;
    }).join('')}</div></fieldset>
    <button class="button primary" type="submit"${resting || !available ? ' disabled' : ''}>${resting ? '本周已安排休息' : available ? '安排这次出行' : '现金不足'}</button>
    </form>`;
  const prices = [...new Set(activity.choices.map(choice => choice.price))].sort((a, b) => a - b);
  const priceLabels = prices.map(price => price ? yuan(price) : '免费');
  const fee = priceLabels.length === 1 ? priceLabels[0] : `${priceLabels.slice(0, -1).join('、')}或 ${priceLabels.at(-1)}`;
  const caption = `${fee}${activity.duration ? ` · ${activity.duration}` : ''}`;
  const header = `${media(activity.asset, 'outing-thumb')}
    <span class="outing-card-label"><strong>${esc(activity.label)}</strong><small>${locked ? '尚未开放' : esc(caption)}</small>${locked ? `<small class="life-locked">${esc(locked)}</small>` : ''}</span>`;
  if (locked) return `<article class="life-card outing-card locked-outing" data-life-id="${esc(activity.id)}"><div class="outing-card-summary">${header}</div></article>`;
  return `<details class="life-card outing-card" data-life-id="${esc(activity.id)}"><summary class="outing-card-summary">${header}</summary><div class="life-card-copy">${media(activity.asset, 'outing-detail-art')}<p>${esc(activity.description)}</p>${controls}</div></details>`;
}

const friendGroups = [
  ['streets', '街巷散步'], ['culture', '文化与手作'], ['meals', '茶饭与小聚'], ['outdoors', '港口与户外'],
  ...OUTING_COMPANIONS.map(person => [person.id, `与${person.name}的片段`]),
];

export const lifeDisclosureIds = friendGroups.map(([key]) => `life-friends-${key}`);
export const defaultLifeCollapsed = [...lifeDisclosureIds];
export const lifeAppIds = ['home', 'trips', 'friends', 'property', 'car'];

// The three fixed-choice outings belong with the thematically matching
// catalogues, without changing the game's outing definitions or rules.
const quickFriendGroups = { 'flower-market': 'streets', mending: 'culture' };
const outingApp = item => item?.kind === 'trip' || item?.id === 'night-bus' ? 'trips'
  : item?.kind === 'friend' || Object.hasOwn(quickFriendGroups, item?.id) ? 'friends' : null;
const outingsForApp = app => LIFE_CATALOG.outings.filter(item => outingApp(item) === app);
const outingCard = (state, item) => item.kind === 'quick' ? quickOutingCard(state, item) : detailedOutingCard(state, item);

export function lifeAppForOuting(id) {
  return outingApp(LIFE_CATALOG.outings.find(item => item.id === id));
}

function activityDetails(id, label, content, collapsed) {
  return `<details id="${id}" class="life-catalog-group" data-life-disclosure="${id}"${collapsed.includes(id) ? '' : ' open'}><summary>${esc(label)}</summary>${content}</details>`;
}

function activityGroup(id, label, items, state, collapsed) {
  if (!items.length) return '';
  return activityDetails(id, `${label} · ${count(items.length)} 项`, `<div class="life-grid outing-grid">${items.map(item => outingCard(state, item)).join('')}</div>`, collapsed);
}

function friendOutings(state, collapsed) {
  const friends = outingsForApp('friends');
  const open = friends.filter(item => !outingLockHint(state, item)).length;
  return `${open < friends.length ? `<p class="muted">另外 ${count(friends.length - open)} 段故事，和朋友相处后会陆续遇到。</p>` : ''}<div class="life-friend-groups">
      ${friendGroups.map(([key, label]) => activityGroup(`life-friends-${key}`, label, friends.filter(item => (quickFriendGroups[item.id] ?? item.group) === key), state, collapsed)).join('')}
    </div>`;
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
  const art = recent.choiceId ? recent.asset : recent.asset ?? outing?.asset;
  const price = Number.isSafeInteger(recent.price) ? recent.price : outing?.price;
  const speech = recent.dialogue ? `<blockquote><strong>${esc(recent.companionName)}：</strong>${esc(recent.dialogue)}</blockquote>` : '';
  const extra = recent.epilogue ? `<details class="outing-memory"><summary>${esc(recent.epilogue.title)}</summary>${media(recent.epilogue.asset, 'outing-art', recent.epilogue.alt)}<p>${esc(recent.epilogue.text)}</p>${recent.epilogue.dialogue ? `<blockquote><strong>${esc(recent.companionName)}：</strong>${esc(recent.epilogue.dialogue)}</blockquote>` : ''}</details>` : '';
  return `<article class="outing-note" id="latest-outing">${media(art, 'outing-art')}
    <h3 tabindex="-1">${esc(recent.label ?? outing?.label ?? '最近一次休息')}</h3>${recent.companionName ? `<p>${esc(recent.companionName)}${recent.choiceLabel ? ` · ${esc(recent.choiceLabel)}` : ''}</p>` : ''}<p>${esc(text)}</p>${speech}${extra}
    ${Number.isSafeInteger(price) ? `<p>支出 ${yuan(price)}${Number.isSafeInteger(recent.week) ? ` · 第 ${count(recent.week)} 周` : ''}</p>` : ''}
    ${recent.restored ? `<p class="positive">精力 +${count(recent.restored)}</p>` : '<p>精力已满。</p>'}</article>`;
}

function energyPanel(state) {
  return `<div class="life-energy"><div><label for="life-energy">精力 ${count(state.energy)} / 100</label><progress id="life-energy" max="100" value="${state.energy}"></progress></div><p>${state.life.lastBreakWeek === state.week ? '本周已经安排过休息。' : '旅行或约朋友都能恢复精力，每周选一次。'}</p></div>`;
}

const residenceScenes = {
  'studio-room': 'assets/deal-afterwork-original-room.webp',
  'city-flat': 'assets/deal-property-home-flat.webp',
  'harbor-home': 'assets/deal-property-home-harbor.webp',
  'city-loft': 'assets/v38-home-loft.webp',
  'hill-villa': 'assets/deal-property-home-villa.webp',
  'city-tower': 'assets/deal-property-home-tower.webp',
  'river-duplex': 'assets/v38-home-river-duplex.webp',
  'seaside-estate': 'assets/v38-home-seaside-estate.webp',
};

function appLauncher(id, label, description, asset) {
  return `<button type="button" class="button life-app-tile" data-ui="life-app" data-id="${id}">
    ${imageFrame(asset, { className: 'life-app-tile-art', alt: '', fallback: '图片暂未加载' })}
    <span class="life-app-tile-copy"><span><strong>${label}</strong><small>${esc(description)}</small></span><span class="life-app-chevron" aria-hidden="true">›</span></span>
  </button>`;
}

function lifeHome(state) {
  const lastOwned = state.life.properties.at(-1);
  const residence = LIFE_CATALOG.properties.find(item => item.id === lastOwned?.id);
  const room = residenceScenes[residence?.id] ?? residenceScenes['studio-room'];
  const friends = outingsForApp('friends');
  const unlocked = friends.filter(item => !outingLockHint(state, item)).length;
  const tripCount = outingsForApp('trips').length;
  return `<section class="life-app-home" data-life-app-page="home">
    <div class="life-app-home-scene">
      ${imageFrame(room, { className: 'life-app-room', alt: residence?.label ?? '下班后的港边起居室', fallback: '房间插画暂未加载', lazy: false, retry: true })}
      <div class="life-app-room-caption"><h2 id="life-app-title" tabindex="-1">${residence ? esc(residence.label) : '回家'}</h2>${residence ? '<small>最近购置的房产</small>' : ''}</div>
      ${energyPanel(state)}
    </div>
    <nav class="life-app-menu" aria-label="下班去处">
      <h2 class="life-app-menu-title">下班去处</h2>
      <div class="life-app-grid">
        ${appLauncher('trips', '旅行', `${count(tripCount)} 项行程`, 'assets/deal-outing-result-night-bus-rear-window.webp')}
        ${appLauncher('friends', '约朋友', `${count(friends.length)} 项活动，${count(unlocked)} 项已开放`, 'assets/deal-outing-reel-river-bench.webp')}
        ${appLauncher('property', '房产', `${count(LIFE_CATALOG.properties.length)} 种房产，已持有 ${count(state.life.properties.length)} 处`, 'assets/deal-property-home-harbor.webp')}
        ${appLauncher('car', '车行', `${count(LIFE_CATALOG.cars.length)} 款车型，已持有 ${count(state.life.cars.length)} 辆`, 'assets/deal-car-wagon.webp')}
      </div>
    </nav>
    ${outingResult(state.life.latestOuting)}
  </section>`;
}

function lifeAppPage(id, title, description, content) {
  return `<section class="life-app-page" data-life-app-page="${id}">
    <header class="life-app-header"><button type="button" class="button life-app-back" data-ui="life-app" data-id="home">← 返回下班</button>
      <div><h2 id="life-app-title" tabindex="-1">${title}</h2><p>${esc(description)}</p></div></header>
    ${content}
  </section>`;
}

export function lifePanel(state, collapsed = defaultLifeCollapsed, app = 'home') {
  if (!state.life) return '';
  const recent = state.life.latestOuting;
  const last = lifeAppForOuting(recent?.id) === app ? outingResult(recent) : '';
  switch (app) {
    case 'trips':
      return lifeAppPage(app, '旅行', '挑个目的地，和朋友一起，也可以独自出发。', `${energyPanel(state)}${last}<div class="life-grid outing-grid">${outingsForApp('trips').map(item => outingCard(state, item)).join('')}</div>`);
    case 'friends':
      return lifeAppPage(app, '约朋友', '约朋友相聚，留下一些共同的回忆。', `${energyPanel(state)}${last}${friendOutings(state, collapsed)}`);
    case 'property':
      return lifeAppPage(app, '房产', `生活资产 ${yuan(lifeAssets(state))}。房产抵押当前增加授信 ${yuan(collateral(state))}。`, `<div class="life-grid">${propertyCards(state)}</div>`);
    case 'car':
      return lifeAppPage(app, '车行', '买喜欢的车，手头吃紧时也可以卖掉。', `<div class="life-grid">${carCards(state)}</div>`);
    default:
      return lifeHome(state);
  }
}
