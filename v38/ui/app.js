import { act, newGame } from '../engine/game.js';
import { quote } from '../engine/quotes.js';
import { inquiriesPage, ordersPage, quoteDialog } from './trade.js';
import { growthPanel } from './growth.js';
import { companyPage, dialogContent, esc, officePage, offworkPage, opening, shell, tourTarget } from './shell.js';

const mount = document.querySelector('#v38-root');
const dialog = document.createElement('dialog');
dialog.className = 'dialog';
dialog.setAttribute('aria-labelledby', 'modal-title');
dialog.setAttribute('aria-describedby', 'dialog-notice');
mount.after(dialog);

let state;
let focusAfterDialog;
let ui = freshUi();

function freshUi() {
  return { page: 'office', dialog: '', quoteId: '', quote: {}, filters: { category: '', availability: 'all' }, notice: '', tutorialStep: 0, showMacro: false };
}

const pageViews = {
  office: officePage,
  inquiries: inquiriesPage,
  orders: ordersPage,
  company: (current, model) => companyPage(current, growthPanel(current, model)),
  offwork: offworkPage,
};
const notices = {
  bid: '报价已提交，本周末开结果。', 'withdraw-bid': '已撤回报价。', borrow: '借款已到账。', repay: '已还款。',
  expedite: '加急已安排，船期提前一周。', collect: '已发出催款提醒。', sue: '已付诉讼费，等待追回。', liquidate: '库存已清仓。',
  hire: '已办理入职。', 'dismiss-staff': '已办理离职。', 'buy-cert': '已取得认证。', 'open-market': '已进入新市场。',
  exhibit: '已报名参展。', referral: '已请客户引荐。', factor: '保理款已到账。',
};

function render() {
  if (!state) {
    mount.innerHTML = opening(ui.notice);
  } else {
    ui.tutorialStep = state.tutorial.done ? -1 : state.tutorial.step;
    const view = pageViews[ui.page];
    mount.innerHTML = shell(state, ui, view(state, ui.page !== 'office' && ui.page !== 'offwork' ? ui : undefined));
  }
  renderDialog();
  highlightTutorial();
}

function renderDialog() {
  if (!state || !ui.dialog) {
    if (dialog.open) dialog.close();
    dialog.replaceChildren();
    return;
  }
  const isQuote = ui.dialog === 'quote';
  dialog.setAttribute('aria-labelledby', isQuote ? 'quote-title' : 'modal-title');
  dialog.innerHTML = `${ui.notice && isQuote ? `<p class="notice negative" id="dialog-notice" role="alert">${esc(ui.notice)}</p>` : '<span id="dialog-notice" hidden></span>'}${dialogContent(state, ui, isQuote ? quoteDialog(state, ui) : '')}`;
  dialog.classList.toggle('quote-dialog', isQuote);
  if (!dialog.open) dialog.showModal();
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

function perform(action, trigger) {
  const result = act(state, action);
  if (result.error) {
    ui.notice = result.error;
    if (ui.dialog === 'quote' || ui.dialog === 'event') renderDialog();
    else render();
    return false;
  }
  state = result.state;
  ui.notice = notices[action.type] ?? '';
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
      break;
  }
  render();
  if (!ui.dialog) restoreFocus(focusKey(trigger));
  return true;
}

function focusKey(element) {
  return element instanceof HTMLElement && (element.hasAttribute('data-ui') || element.hasAttribute('data-action'))
    ? { ui: element.dataset.ui, action: element.dataset.action, id: element.dataset.id, page: element.dataset.page }
    : undefined;
}

function restoreFocus(key) {
  if (!key) return;
  const item = [...mount.querySelectorAll('[data-ui],[data-action]')].find(element => (
    element.dataset.ui === key.ui && element.dataset.action === key.action && element.dataset.id === key.id && element.dataset.page === key.page
  ));
  item?.focus({ preventScroll: true });
}

function dismissDialog() {
  if (ui.dialog === 'bankruptcy') return;
  if (ui.dialog === 'summary') {
    if (state.tutorial.step === 4) advanceTutorial(4, true);
    state = act(state, { type: 'dismiss-summary' }).state;
    ui.dialog = modalAfterAction();
  } else {
    ui.dialog = '';
  }
  ui.notice = '';
  render();
  if (!ui.dialog) {
    restoreFocus(focusAfterDialog);
    focusAfterDialog = undefined;
  }
}

function openQuote(button) {
  const inquiry = state.inquiries.find(item => item.id === button.dataset.id);
  if (!inquiry) return;
  const choices = ['stock', 'factory', 'inventory'];
  const proposal = { ratio: 100, extraTerms: 0, staffId: null, financing: 'standard' };
  proposal.source = choices.find(source => !quote(state, inquiry, { ...proposal, source }).error) ?? 'stock';
  ui.quoteId = inquiry.id;
  ui.quote = proposal;
  ui.dialog = 'quote';
  ui.notice = '';
  focusAfterDialog = focusKey(button);
  if (state.tutorial.step < 2) advanceTutorial(2);
  renderDialog();
  highlightTutorial();
}

function refreshQuote() {
  const next = document.createElement('template');
  next.innerHTML = quoteDialog(state, ui);
  for (const output of dialog.querySelectorAll('[data-quote-preview]')) {
    const key = output.dataset.quotePreview;
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
      advanceTutorial(3);
      if (ui.dialog === 'quote' && state.bids.length) dismissDialog();
      else render();
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

function submit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (form.dataset.form === 'new-game') {
    if (!data.name?.trim()) {
      form.elements.name.setCustomValidity('请输入公司名。');
      form.elements.name.reportValidity();
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
  if (form.dataset.form === 'quote') {
    const proposal = { ...ui.quote, ...data };
    proposal.ratio = Number(proposal.ratio);
    proposal.extraTerms = Number(proposal.extraTerms);
    const submitted = perform({ type: 'bid', inquiryId: ui.quoteId, ...proposal });
    if (submitted) {
      restoreFocus(focusAfterDialog);
      focusAfterDialog = undefined;
    }
    return;
  }
  perform({ type: form.dataset.form, ...data });
}

function input(event) {
  const control = event.target;
  if (control.name === 'name') control.setCustomValidity('');
  if (!state || control.dataset.ui !== 'quote-input') return;
  if (!['source', 'ratio', 'extraTerms', 'staffId', 'financing'].includes(control.name)) return;
  if (control.type === 'radio' && !control.checked) return;
  ui.quote[control.name] = ['ratio', 'extraTerms'].includes(control.name) ? Number(control.value) : control.value;
  refreshQuote();
}

function change(event) {
  const control = event.target;
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
