import { STAFF_ROLES, tradePolicy } from '../data/expansion.js';
import { certProgress, marketProgress } from '../engine/expansion.js';
import { netAssets } from '../engine/game.js';
import { count, esc, yuan } from './shell.js';
import { imageFrame } from './media.js';
import { buyerPortrait } from './buyer-portrait.js';

const activeOrders = new Set(['procurement', 'production', 'transit']);
const mapPoints = {
  domestic: { x: 486, y: 127, dx: -8, dy: -20, side: 'end' },
  'se-asia': { x: 500, y: 179, dx: 12, dy: 22 },
  'east-asia': { x: 532, y: 117, dx: 11, dy: -15 },
  'middle-east': { x: 400, y: 141, dx: 15, dy: 4 },
  europe: { x: 340, y: 88, dx: 12, dy: -12 },
  'north-america': { x: 143, y: 105, dx: -14, dy: -14, side: 'end' },
  'latin-america': { x: 205, y: 220, dx: -12, dy: 15, side: 'end' },
  africa: { x: 351, y: 185, dx: -13, dy: 11, side: 'end' },
};

const areaPaths = [
  'M39 78 61 61 92 57 110 43 139 40 158 49 171 47 186 58 192 75 185 88 170 99 167 118 156 129 151 147 162 155 170 165 163 173 153 168 146 154 133 149 115 130 91 124 81 111 66 107 51 95Z',
  'M172 168 187 161 208 171 230 178 252 198 246 218 231 234 228 250 213 275 200 266 194 243 185 226 180 207 167 188Z',
  'M190 43 206 32 232 27 250 40 239 56 220 65 205 61Z',
  'M293 91 312 69 337 62 359 45 391 49 418 38 443 43 471 34 499 42 530 38 560 48 581 55 602 74 580 89 557 91 538 107 527 117 532 135 515 146 517 162 506 181 493 175 488 162 473 160 458 140 435 142 429 160 418 175 404 171 398 152 383 151 365 126 352 121 337 124 323 112 309 115 297 105Z',
  'M307 126 328 122 350 130 370 145 377 166 394 172 380 181 366 195 363 216 347 238 334 225 329 205 316 194 310 174 295 162 289 143Z',
  'M473 182 490 188 501 186 519 193 529 191 537 200 525 206 508 200 488 198Z',
  'M525 218 545 210 572 214 595 229 604 244 594 257 575 251 556 255 537 251 519 240Z',
  'M400 202 406 211 401 226 393 228 393 217Z M546 107 552 116 545 130 540 132 542 119Z M607 256 615 261 611 272 602 271Z',
];

const usd = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 1 });
const week = n => `第 ${count(n)} 周`;

function badge(text, variant = '') {
  return `<span class="badge${variant ? ` ${variant}` : ''}">${esc(text)}</span>`;
}

function button(action, id, label, variant = 'secondary', disabled = false) {
  return `<button type="button" class="button ${variant}" data-action="${action}" data-id="${esc(id)}"${disabled ? ' disabled' : ''}>${esc(label)}</button>`;
}

function staffPortrait(person) {
  if (typeof person.portrait === 'string' && /^assets\/[\w.-]+\.(?:webp|png|jpe?g|svg)$/i.test(person.portrait) &&
      /^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/.test(person.portraitPosition ?? '')) {
    return `<span class="portrait headshot" data-assistant-id="${esc(person.id)}" aria-hidden="true" style="background-image:url('${esc(person.portrait)}')"></span>`;
  }
  const initial = [...person.name][0];
  return imageFrame(person.portrait, { className: 'growth-headshot', fallback: initial }) || `<span class="growth-headshot placeholder-headshot" aria-hidden="true">${esc(initial)}</span>`;
}

function section(id, title, caption, body) {
  return `<section class="panel growth-section" id="${id}" aria-labelledby="${id}-title"><header class="panel-heading"><div><h2 id="${id}-title">${title}</h2><p>${caption}</p></div></header>${body}</section>`;
}

function stat(label, value) {
  return `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

function nameOfRole(id) {
  return STAFF_ROLES[id]?.label ?? id;
}

function staffCard(person, state, candidate) {
  const assigned = state.orders.filter(order => order.staffId === person.id && activeOrders.has(order.status)).length +
    state.bids.filter(bid => bid.staffId === person.id).length;
  const blocked = state.staff.length >= 18 ? '办公室已满员' : state.cash < person.salary ? '现金不足以支付首周工资' : '';
  const dismissBlocked = person.id === state.assistant ? '创业搭档将一直协助经营' : assigned > 0 ? '还有经手的报价或订单' : '';
  return `<article class="growth-card"><header class="growth-person">${staffPortrait(person)}<div><h3>${esc(person.name)}</h3><p>${esc(nameOfRole(person.role))} · ${esc(person.trait)}</p></div></header>
    <dl class="key-values growth-metrics">${stat('能力', `${count(person.ability)} / 10`)}${stat('周薪', yuan(person.salary))}${stat('提成', percentage.format(person.commission ?? 0))}${candidate ? '' : stat('经手', `${assigned} / 3 单`)}</dl>
    <div class="toolbar">${candidate ? button('hire', person.id, '聘用', 'secondary', Boolean(blocked)) : button('dismiss-staff', person.id, '解聘', 'quiet', Boolean(dismissBlocked))}
      ${candidate && blocked ? `<small class="muted">${blocked}</small>` : !candidate && dismissBlocked ? `<small class="muted">${dismissBlocked}</small>` : ''}</div></article>`;
}

function teamSection(state) {
  const current = state.staff ?? [];
  const employed = new Set(current.map(person => person.name));
  const candidates = (state.candidates ?? []).filter(person => !employed.has(person.name));
  return section('team', '团队与人才市场', '业务员带来询盘，跟单员守交期，财务帮助回款。每位员工最多同时经手三单。',
    `<h3 class="growth-subheading">在职员工</h3>${current.length ? `<div class="growth-cards">${current.map(person => staffCard(person, state, false)).join('')}</div>` : '<p class="empty-state">目前由你独立经营。</p>'}
    <h3 class="growth-subheading">待聘人选</h3>${candidates.length ? `<div class="growth-cards">${candidates.map(person => staffCard(person, state, true)).join('')}</div>` : '<p class="empty-state">目前没有可聘人选，人才市场每四周更新。</p>'}`);
}

function certificationSection(state) {
  const certs = certProgress(state, netAssets(state));
  return section('certifications', '资质进度', '申请前可以看到交付、信誉和资产等条件。费用从公司现金支出。',
    `<div class="growth-cards">${certs.map(cert => `<article class="growth-card"><header class="growth-card-heading"><h3>${esc(cert.name)}</h3>${cert.owned ? badge('已取得', 'positive') : badge(cert.available ? '可申请' : cert.eligible ? '现金不足' : '未达条件', 'pending')}</header>
      <ul class="growth-checklist">${cert.requirements.map(requirement => `<li class="${requirement.met ? 'positive' : ''}"><span aria-hidden="true">${requirement.met ? '✓' : '◇'}</span><span><span class="visually-hidden">${requirement.met ? '已满足：' : '未满足：'}</span>${esc(requirement.text)}</span></li>`).join('')}</ul>
      <p class="trade-note">解锁 ${esc(cert.unlocks.join('、'))}</p>
      ${cert.owned ? '' : `<div class="toolbar">${button('buy-cert', cert.id, `申请 · ${yuan(cert.fee)}`, 'secondary', !cert.available)}</div>`}</article>`).join('')}</div>`);
}

function worldMap(markets) {
  return `<figure class="world-map"><svg viewBox="0 0 645 295" role="group" aria-label="全球贸易市场地图">
      <defs><pattern id="map-grid" width="54" height="46" patternUnits="userSpaceOnUse"><path d="M54 0H0v46" class="map-grid"></path></pattern></defs>
      <rect width="645" height="295" class="map-water"></rect><rect width="645" height="295" fill="url(#map-grid)"></rect>
      <g class="map-land" aria-hidden="true">${areaPaths.map(d => `<path d="${d}"></path>`).join('')}</g>
      ${markets.map(market => {
        const point = mapPoints[market.id];
        if (!point) return '';
        return `<a href="#market-${esc(market.id)}" class="map-marker${market.opened ? ' open' : ''}" aria-label="${esc(market.name)}，${market.opened ? '已开拓' : '未开拓'}"><circle cx="${point.x}" cy="${point.y}" r="17" class="map-hit"></circle><circle cx="${point.x}" cy="${point.y}" r="5" class="map-pin"></circle><text x="${point.x + point.dx}" y="${point.y + point.dy}" text-anchor="${point.side ?? 'start'}">${esc(market.name)}</text></a>`;
      }).join('')}</svg><figcaption><span class="positive">● 已开拓</span><span class="muted">○ 待开拓</span></figcaption>
    </figure><nav class="market-links" aria-label="查看市场详情">${markets.map(market => `<a class="button quiet" href="#market-${esc(market.id)}">${esc(market.name)}</a>`).join('')}</nav>`;
}

function marketCard(state, market) {
  const { opened, eligible, canPay, exhibition, exhibitFee, referralFee, referralBuyer, canRefer } = market;
  const inquiries = state.inquiries.filter(inquiry => inquiry.market === market.id);
  const policy = tradePolicy(state, market.id);
  const tariffs = Math.max(0, market.tariffRate + policy.tariffDelta);
  const condition = !eligible ? `先取得${market.certName}。` : canPay ? '资质与现金均已满足。' : `开拓需 ${yuan(market.fee)}，当前现金不足。`;
  const perks = market.id === 'domestic' ? '各品类' : market.categories.join('、');
  const activity = inquiries.length ? `<p>本周有 ${count(inquiries.length)} 条询盘。</p><ul class="market-inquiries">${inquiries.slice(0, 3).map(inquiry => `<li>${esc(inquiry.productName)} · ${count(inquiry.quantity)} ${esc(inquiry.unit)}<small>${week(inquiry.dueWeek)}交货</small></li>`).join('')}</ul>` : '<p class="muted">本周暂无询盘。</p>';
  const referralTip = referralBuyer ? `${referralBuyer.name}可以引荐，费用 ${yuan(referralFee)}。` : '买家累计合作三次且关系达到 25，可获得客户引荐。';
  return `<article class="growth-card market-card" id="market-${esc(market.id)}"><header class="growth-card-heading"><h3>${esc(market.name)}</h3>${opened ? badge('已开拓', 'positive') : badge('待开拓', 'pending')}</header>
    <dl class="key-values growth-metrics">${stat('结算', market.currency)}${stat('额外船期', `${count(market.shippingWeeks + policy.delayWeeks)} 周`)}${stat('关税', percentage.format(tariffs))}</dl>
    <p class="muted">偏好品类：${esc(perks)}</p>${opened ? activity : `<p class="muted">${esc(condition)}</p>`}
    ${opened && market.id === 'domestic' && !exhibition ? '' : `<div class="toolbar">${opened
      ? exhibition ? badge(`展会持续至${week(exhibition.untilWeek)}`, 'positive') : button('exhibit', market.id, `参加展会 · ${yuan(exhibitFee)}`, 'secondary', state.cash < exhibitFee)
      : `${button('open-market', market.id, `参展开拓 · ${yuan(market.fee)}`, 'secondary', !(eligible && canPay))}${button('referral', market.id, `客户引荐 · ${yuan(referralFee)}`, 'quiet', !canRefer)}`}</div>`}
    ${opened ? '' : `<small class="muted">${esc(referralTip)}</small>`}</article>`;
}

function marketsSection(state) {
  const markets = marketProgress(state);
  return section('markets', '全球市场', '点地图查看当地币种、船期、开拓条件和本周询盘。',
    `${worldMap(markets)}<div class="growth-cards market-cards">${markets.map(market => marketCard(state, market)).join('')}</div>`);
}

function macroSection(state) {
  const m = state.macro ?? {};
  const policies = state.policies ?? m.policies ?? [];
  const moneyRates = [
    ['美元兑人民币', m.usd ?? m.rates?.USD ?? m.fx?.USD], ['欧元兑人民币', m.eur ?? m.rates?.EUR ?? m.fx?.EUR],
  ];
  return section('economy', '汇率、航线与政策', '外币回款按收款当周汇率折算。运价和原料价格会改变新报价。',
    `<dl class="key-values growth-metrics">${moneyRates.map(([label, value]) => stat(label, Number.isFinite(value) ? usd.format(value) : '—')).join('')}${stat('海运运价指数', count(m.freight ?? 100))}${stat('原料指数', count(m.materials ?? 100))}${stat('消费景气', count(m.consumer ?? 100))}</dl>
    ${Array.isArray(policies) && policies.length ? `<ul class="growth-checklist">${policies.map(policy => `<li><span aria-hidden="true">◆</span><span>${esc(policy.title ?? policy.name ?? policy.text)}${policy.untilWeek ? ` · 持续至${week(policy.untilWeek)}` : ''}</span></li>`).join('')}</ul>` : '<p class="muted growth-note">本周没有生效的临时政策。</p>'}`);
}

function rivalrySection(state) {
  const annualSales = state.history.slice(-52).reduce((sum, item) => sum + item.revenue, 0);
  const own = { name: state.company.name, style: '本公司', annualSales, health: state.company.rep, active: true, own: true };
  const rivals = [...state.rivals, own].sort((a, b) => Number(b.active) - Number(a.active) || b.annualSales - a.annualSales);
  const headers = ['排名', '公司', '经营风格', '近 52 周营收', '状态'];
  const rows = rivals.map((rival, index) => {
    const status = rival.status === 'failed' ? '已倒闭' : rival.status === 'acquired' ? '已收购' : rival.own ? '本公司' : `经营规模 ${count(rival.scale)} 级 · 经营状况 ${count(rival.health)}/100`;
    return [rival.active ? count(index + 1) : '—', rival.name, rival.style, yuan(rival.annualSales), status];
  });
  return section('rivalry', '同行排行', '营收、市况和各家公司的经营会随周结算变化。',
    `<div class="table-wrap"><table class="data-table" aria-label="同行排行"><thead><tr>${headers.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map((row, i) => `<tr${rivals[i].own ? ' class="rival-own"' : ''}>${row.map((value, col) => `<td data-label="${headers[col]}"${col === 3 ? ' class="number"' : ''}>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
}

function relationshipsSection(state) {
  const partners = Object.values(state.relationships ?? {}).filter(item => item.deliveries >= 3).sort((a, b) => b.deliveries - a.deliveries);
  return section('partners', '重点客户', '同一买家完成三次交付后成为重点客户。关系越好，越可能带来复购和更好的账期。',
    partners.length ? `<div class="growth-cards">${partners.map(partner => {
      const buyer = partner.buyer ?? {};
      const artwork = imageFrame(partner.comic ?? buyer.comic, { className: 'growth-comic', fallback: '客户插画暂时无法显示', retry: true });
      return `<article class="growth-card"><header class="growth-person">${buyerPortrait(buyer, 'growth-headshot')}<div><h3>${esc(buyer.name ?? partner.name ?? '重点客户')}</h3><p>${esc(buyer.type ?? '')}</p></div></header>
        <dl class="key-values growth-metrics">${stat('累计交付', `${count(partner.deliveries)} 笔`)}${stat('关系', `${count(partner.rep)} / 100`)}</dl>
        ${artwork ? `<details><summary>查看合作漫画</summary>${artwork}</details>` : ''}</article>`;
    }).join('')}</div>` : '<p class="empty-state">目前还没有达到三次交付的客户。可以在询盘里留意熟客复购。</p>');
}

export const growthSections = {
  team: teamSection,
  certifications: certificationSection,
  markets: marketsSection,
  economy: macroSection,
  rivalry: rivalrySection,
  partners: relationshipsSection,
};
