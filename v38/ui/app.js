import { act, newGame } from '../engine/game.js';
import { quote } from '../engine/quotes.js';
import { inquiriesPage, ordersPage, quoteDialog, stockPurchasePreview } from './trade.js';
import { growthPanel } from './growth.js';
import { lifePanel, officeFeatures, optionDescription, scenarioFields } from './life-view.js';
import { companyPage, dialogContent, esc, officePage, offworkPage, opening, shell, tourTarget, yuan } from './shell.js';
import { strategyPanel } from './strategy.js';

const mount = document.querySelector('#v38-root');
const dialog = document.createElement('dialog');
dialog.className = 'dialog';
dialog.setAttribute('aria-labelledby', 'modal-title');
dialog.setAttribute('aria-describedby', 'dialog-notice');
const bankStatus = document.createElement('p');
bankStatus.className = 'visually-hidden';
bankStatus.setAttribute('role', 'status');
bankStatus.setAttribute('aria-atomic', 'true');
mount.after(dialog, bankStatus);

let state;
let focusAfterDialog;
let ui = freshUi();

function freshUi() {
  return {
    page: 'office', dialog: '', quoteId: '', quote: {}, quoteDefault: {}, quoteOrigin: null,
    quoteDrafts: new Map(), quoteDraftRestored: false, bankGuard: new Map(),
    filters: { category: '', availability: 'all' }, notice: '', tutorialStep: 0, showMacro: false,
  };
}

const pageViews = {
  office: current => officePage(current, officeFeatures(current)),
  inquiries: inquiriesPage,
  orders: ordersPage,
  company: (current, model) => companyPage(current, `${growthPanel(current, model)}${strategyPanel(current)}`),
  offwork: current => offworkPage(current, lifePanel(current)),
};
const notices = {
  bid: '报价已提交，本周末开结果。', 'withdraw-bid': '已撤回报价。',
  expedite: '加急已安排，船期提前一周。', collect: '已发出催款提醒。', sue: '已付诉讼费，等待追回。', liquidate: '库存已清仓。',
  hire: '已办理入职。', 'dismiss-staff': '已办理离职。', 'buy-cert': '已取得认证。', 'open-market': '已进入新市场。',
  exhibit: '已报名参展。', referral: '已请客户引荐。', factor: '保理款已到账。',
  'invest-venture': '产业投资已完成。', 'strategic-investment': '战略投资款已到账。', restructure: '已完成股份制改造。', ipo: '成功上市。可以继续经营。',
  'purchase-stock': '采购已入库。', 'buy-property': '已买入房产。', 'sell-property': '房产出售款已到账。', mortgage: '已办理抵押，授信额度提高。',
  unmortgage: '已解除房产抵押。', 'buy-car': '已买入车辆。', 'sell-car': '卖车款已到账。', outing: '已结束这次活动。',
};

function render() {
  if (!state) {
    mount.innerHTML = opening(ui.notice, scenarioFields());
  } else {
    ui.tutorialStep = state.tutorial.done ? -1 : state.tutorial.step;
    const view = pageViews[ui.page];
    mount.innerHTML = shell(state, ui, view(state, ui));
  }
  renderDialog();
  highlightTutorial();
}

function renderDialog() {
  if (!state || !ui.dialog) {
    if (dialog.open) dialog.close();
    delete dialog.dataset.view;
    dialog.replaceChildren();
    return;
  }
  const isQuote = ui.dialog === 'quote';
  const detail = isQuote ? ui.quoteId : ui.dialog === 'event' ? state.events[0]?.id : ui.dialog === 'summary' ? state.summary?.week : '';
  const view = `${ui.dialog}:${detail ?? ''}`;
  const entering = !dialog.open || dialog.dataset.view !== view;
  const top = entering ? 0 : dialog.scrollTop;
  const summaryTop = entering ? 0 : dialog.querySelector('.summary-scroll')?.scrollTop ?? 0;
  const headingId = isQuote ? 'quote-title' : 'modal-title';
  dialog.dataset.view = view;
  dialog.setAttribute('aria-labelledby', headingId);
  dialog.innerHTML = `${ui.notice && isQuote ? `<p class="notice negative" id="dialog-notice" role="alert">${esc(ui.notice)}</p>` : '<span id="dialog-notice" hidden></span>'}${dialogContent(state, ui, isQuote ? quoteDialog(state, ui) : '')}`;
  const heading = dialog.querySelector(`#${headingId}`);
  if (heading) {
    heading.tabIndex = -1;
    if (entering) heading.setAttribute('autofocus', '');
  }
  dialog.classList.toggle('quote-dialog', isQuote);
  dialog.classList.toggle('summary-dialog', ui.dialog === 'summary');
  if (!dialog.open) dialog.showModal();
  if (entering) heading?.focus({ preventScroll: true });
  dialog.scrollTop = top;
  const summaryScroller = dialog.querySelector('.summary-scroll');
  if (summaryScroller) summaryScroller.scrollTop = summaryTop;
}

function highlightTutorial() {
  mount.querySelector('.tutorial-target')?.classList.remove('tutorial-target');
  dialog.querySelector('.tutorial-target')?.classList.remove('tutorial-target');
  if (!state || state.tutorial.done) return;
  const target = tourTarget(state.tutorial.step);
  const container = dialog.open ? dialog : mount;
  container.querySelector(`[data-tour="${target}"]`)?.classList.add('tutorial-target');
}

function advanceTutorial(step, done = false) {
  if (state.tutorial.done) return;
  const result = act(state, { type: 'tutorial', step, done });
  if (!result.error) state = result.state;
}

function modalAfterAction() {
  if (state.bankrupt) return 'bankruptcy';
  if (state.summary) return 'summary';
  if (state.events.length) return 'event';
  return '';
}

function perform(action, trigger, onError) {
  const beforeWeek = state.week;
  const beforeEvents = state.events.length;
  const result = act(state, action);
  if (result.error) {
    if (onError) {
      onError(result.error);
      return false;
    }
    ui.notice = result.error;
    if (ui.dialog === 'quote' || ui.dialog === 'event') renderDialog();
    else render();
    return false;
  }
  state = result.state;
  const finance = bankConfirmation(action);
  ui.notice = finance || notices[action.type] || '';
  switch (action.type) {
    case 'bid':
      if (state.tutorial.step <= 2) advanceTutorial(3);
      ui.dialog = '';
      break;
    case 'end-week':
    case 'advance-four':
      if (state.tutorial.step === 3) advanceTutorial(4);
      focusAfterDialog = focusKey(trigger);
      ui.dialog = modalAfterAction();
      break;
    case 'resolve-event':
      ui.dialog = modalAfterAction();
      break;
    default:
      if (state.week !== beforeWeek || state.bankrupt || state.events.length > beforeEvents) {
        focusAfterDialog = focusKey(trigger);
        ui.dialog = modalAfterAction();
      }
      break;
  }
  render();
  if (finance) bankStatus.textContent = finance;
  if (!ui.dialog) restoreFocus(focusKey(trigger));
  return true;
}

function focusKey(element) {
  return element instanceof HTMLElement && (element.hasAttribute('data-ui') || element.hasAttribute('data-action'))
    ? { ui: element.dataset.ui, action: element.dataset.action, id: element.dataset.id, page: element.dataset.page }
    : undefined;
}

function focusTarget(key) {
  if (!key) return undefined;
  return [...mount.querySelectorAll('[data-ui],[data-action]')].find(element => (
    element.dataset.ui === key.ui && element.dataset.action === key.action && element.dataset.id === key.id && element.dataset.page === key.page
  ));
}

const restoreFocus = key => focusTarget(key)?.focus({ preventScroll: true });

function quoteRow(id) {
  return mount.querySelector(`[data-inquiry-id="${CSS.escape(id)}"]`);
}

function returnFromQuote(weeklyTarget = false) {
  const origin = ui.quoteOrigin;
  ui.quoteOrigin = null;
  if (!origin) return;
  const trigger = focusTarget(origin.key);
  const row = quoteRow(origin.id);
  const offset = trigger ? origin.triggerTop : origin.rowTop;
  const anchor = trigger ?? row;
  const top = anchor && Number.isFinite(offset) ? window.scrollY + anchor.getBoundingClientRect().top - offset : origin.top;
  window.scrollTo({ left: origin.left, top: Math.max(0, top), behavior: 'instant' });
  const fallback = row?.querySelector('strong') ?? row;
  if (!trigger && fallback) fallback.tabIndex = -1;
  const focus = weeklyTarget ? mount.querySelector('[data-tour="end-week"]') : trigger ?? fallback;
  focus?.focus({ preventScroll: true });
}

function retainDraft() {
  const changed = Object.keys(ui.quoteDefault).some(key => ui.quote[key] !== ui.quoteDefault[key]);
  if (changed) ui.quoteDrafts.set(ui.quoteId, { ...ui.quote });
  else ui.quoteDrafts.delete(ui.quoteId);
  return changed;
}

function dismissDialog({ weeklyTarget = false } = {}) {
  if (ui.dialog === 'bankruptcy') return;
  ui.notice = '';
  const wasQuote = ui.dialog === 'quote';
  if (wasQuote) {
    if (retainDraft()) ui.notice = '已保留这条询盘的草稿。重新打开「算价」可接着改。';
    if (state.tutorial.step === 2) advanceTutorial(1);
  }
  if (ui.dialog === 'summary') {
    if (state.tutorial.step === 4) advanceTutorial(4, true);
    state = act(state, { type: 'dismiss-summary' }).state;
    ui.dialog = modalAfterAction();
  } else {
    ui.dialog = '';
  }
  render();
  if (!ui.dialog) {
    if (wasQuote) returnFromQuote(weeklyTarget);
    else restoreFocus(focusAfterDialog);
    focusAfterDialog = undefined;
  }
}

function openQuote(button) {
  const inquiry = state.inquiries.find(item => item.id === button.dataset.id);
  if (!inquiry) return;
  const choices = ['stock', 'factory', 'inventory'];
  const proposal = { ratio: 100, extraTerms: 0, staffId: null, financing: 'standard', branded: false, brandUnitPrice: inquiry.targetPrice };
  proposal.source = choices.find(source => !quote(state, inquiry, { ...proposal, source }).error) ?? 'stock';
  const draft = ui.quoteDrafts.get(inquiry.id);
  ui.quoteId = inquiry.id;
  ui.quoteDefault = proposal;
  ui.quote = { ...proposal, ...draft };
  ui.quoteDraftRestored = Boolean(draft);
  ui.dialog = 'quote';
  ui.notice = '';
  ui.quoteOrigin = {
    id: inquiry.id, key: focusKey(button), left: window.scrollX, top: window.scrollY,
    triggerTop: button.getBoundingClientRect().top, rowTop: quoteRow(inquiry.id)?.getBoundingClientRect().top,
  };
  if (state.tutorial.step < 2) advanceTutorial(2);
  renderDialog();
  highlightTutorial();
}

function refreshQuote(updatePriceControl = false) {
  const next = document.createElement('template');
  next.innerHTML = quoteDialog(state, ui);
  for (const output of dialog.querySelectorAll('[data-quote-preview]')) {
    const key = output.dataset.quotePreview;
    if (key === 'price-control' && !updatePriceControl) continue;
    const replacement = next.content.querySelector(`[data-quote-preview="${key}"]`);
    if (replacement) output.replaceWith(replacement);
  }
  highlightTutorial();
}

function selectPage(page) {
  if (!Object.hasOwn(pageViews, page)) return;
  ui.page = page;
  ui.notice = '';
  if (page === 'inquiries' && state.tutorial.step === 0) advanceTutorial(1);
  render();
  mount.querySelector('#page-title')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function restart() {
  state = undefined;
  ui = freshUi();
  focusAfterDialog = undefined;
  bankStatus.textContent = '';
  render();
  mount.querySelector('[name="name"]')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

dialog.addEventListener('cancel', event => {
  event.preventDefault();
  dismissDialog();
});

function actionFrom(element) {
  const { action: type, id, quantity, ...fields } = element.dataset;
  let details = fields;
  if (type === 'withdraw-bid') details = { inquiryId: id };
  if (type === 'liquidate') details = { productId: id, quantity: Number(quantity) };
  return { type, id, ...details };
}

function click(event) {
  const control = event.target.closest('button[data-ui],button[data-action]');
  if (!state || !control || control.disabled) return;
  if (control.dataset.action) {
    perform(actionFrom(control), control);
    return;
  }
  switch (control.dataset.ui) {
    case 'page': selectPage(control.dataset.page); break;
    case 'quote-open': openQuote(control); break;
    case 'close-dialog': dismissDialog(); break;
    case 'skip-tutorial':
    case 'finish-tutorial':
      advanceTutorial(state.tutorial.step, true);
      render();
      break;
    case 'tutorial-next':
      if (ui.dialog !== 'quote' || state.tutorial.step !== 2) break;
      advanceTutorial(3);
      dismissDialog({ weeklyTarget: true });
      break;
    case 'show-event':
      focusAfterDialog = focusKey(control);
      ui.dialog = 'event';
      ui.notice = '';
      renderDialog();
      break;
    case 'request-restart':
      focusAfterDialog = focusKey(control);
      ui.dialog = 'restart';
      renderDialog();
      break;
    case 'restart': restart(); break;
    default: break;
  }
}

const bankForms = new Set(['borrow', 'repay']);

function bankConfirmation(action) {
  if (action.type === 'borrow') return `借款已到账 ${yuan(action.amount)}。`;
  if (action.type === 'repay') return `已还款 ${yuan(action.amount)}。`;
  return '';
}

function fieldFeedback(form, field, message = '') {
  const output = form.querySelector('[data-field-error]');
  if (output) {
    output.textContent = message;
    output.hidden = !message;
  }
  if (message) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  } else field.removeAttribute('aria-invalid');
}

function submitBank(form, type) {
  if (performance.now() - (ui.bankGuard.get(type) ?? -Infinity) < 450) return;
  const input = form.elements.amount;
  const amount = input.valueAsNumber;
  const max = Number(input.max);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    fieldFeedback(form, input, '请输入大于 0 的整数金额。');
    return;
  }
  if (amount > max) {
    fieldFeedback(form, input, `${type === 'borrow' ? '最多还能借' : '最多可还'} ${yuan(max)}，请减少金额。`);
    return;
  }
  if (perform({ type, amount }, undefined, error => fieldFeedback(form, input, error))) {
    ui.bankGuard.set(type, performance.now());
    const next = mount.querySelector(`[data-form="${type}"] [name="amount"]`);
    if (next) {
      next.value = '';
      next.focus({ preventScroll: true });
    }
  }
}

function submit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (form.dataset.form === 'new-game') {
    if (!data.name?.trim()) {
      fieldFeedback(form, form.elements.name, '请给公司起个名字。');
      return;
    }
    const seed = new Uint32Array(1);
    crypto.getRandomValues(seed);
    state = newGame({ ...data, seed: seed[0] });
    ui = freshUi();
    render();
    mount.querySelector('#page-title')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    return;
  }
  if (!state) return;
  if (bankForms.has(form.dataset.form)) {
    submitBank(form, form.dataset.form);
    return;
  }
  if (form.dataset.form === 'quote') {
    const proposal = { ...ui.quote, ...data };
    proposal.ratio = Number(proposal.ratio);
    proposal.extraTerms = Number(proposal.extraTerms);
    proposal.branded = form.elements.branded?.checked ?? false;
    proposal.brandUnitPrice = Number(proposal.brandUnitPrice);
    const submitted = perform({ type: 'bid', inquiryId: ui.quoteId, ...proposal });
    if (submitted) {
      ui.quoteDrafts.delete(ui.quoteId);
      returnFromQuote(!state.tutorial.done && state.tutorial.step === 3);
    }
    return;
  }
  perform({ type: form.dataset.form, ...data });
}

function input(event) {
  const control = event.target;
  const form = control.form;
  if (form?.dataset.form === 'new-game' && control.name === 'name') fieldFeedback(form, control);
  if (form && bankForms.has(form.dataset.form) && control.name === 'amount') {
    ui.bankGuard.delete(form.dataset.form);
    bankStatus.textContent = '';
    fieldFeedback(form, control);
  }
  if (!state || !control.dataset.ui) return;
  if (control.dataset.ui === 'stock-input') {
    const form = control.closest('form[data-form="purchase-stock"]');
    const output = form?.querySelector('[data-stock-preview]');
    if (output) output.innerHTML = stockPurchasePreview(state, form.elements.productId.value, Number(form.elements.quantity.value));
    return;
  }
  if (control.dataset.ui !== 'quote-input') return;
  if (!['source', 'ratio', 'extraTerms', 'staffId', 'financing', 'branded', 'brandUnitPrice'].includes(control.name)) return;
  if (control.type === 'radio' && !control.checked) return;
  if (control.name === 'branded') ui.quote.branded = control.checked;
  else ui.quote[control.name] = ['ratio', 'extraTerms', 'brandUnitPrice'].includes(control.name) ? Number(control.value) : control.value;
  refreshQuote(control.name === 'branded');
}

function change(event) {
  const control = event.target;
  if (control.dataset.ui === 'scenario-option') {
    const description = document.getElementById(control.getAttribute('aria-describedby'));
    if (description) description.textContent = optionDescription(control.name, control.value) ?? '';
    return;
  }
  if (!state || control.dataset.ui !== 'inquiry-filter' || !Object.hasOwn(ui.filters, control.name)) return;
  ui.filters[control.name] = control.value;
  render();
  mount.querySelector(`[data-ui="inquiry-filter"][name="${control.name}"]`)?.focus({ preventScroll: true });
}

for (const root of [mount, dialog]) {
  root.addEventListener('click', click);
  root.addEventListener('submit', submit);
  root.addEventListener('input', input);
  root.addEventListener('change', change);
}

mount.addEventListener('toggle', event => {
  if (event.target.matches('details[data-ui="macro-disclosure"]')) ui.showMacro = event.target.open;
}, { capture: true });

render();
mount.removeAttribute('aria-busy');
