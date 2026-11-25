import { act, newGame } from '../engine/game.js';
import { quote } from '../engine/quotes.js';
import { inquiriesPage, orderDisclosureIds, ordersPage, quoteDialog, stockPurchasePreview } from './trade.js';
import { growthSections } from './growth.js';
import { defaultLifeCollapsed, eraIllustration, lifeAppForOuting, lifeAppIds, lifeDisclosureIds, lifePanel, officeFeatures, optionDescription, scenarioFields } from './life-view.js';
import { companyPage, developmentTabs, dialogContent, esc, officePage, offworkPage, opening, saveWarning, saveWarningMessage, shell, tourTarget, yuan } from './shell.js';
import { strategySections } from './strategy.js';
import { readSave, SAVE_KEY, writeSave } from './save.js';
import { coachIntroIndex, quoteRecommendation, recordCoachVisit } from './coaching.js';

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
let dialogPointer;
let dismissedPointer;
let formPointer;
let ui = freshUi();
let stored = readSave();
let openingMode = stored.status === 'empty' ? 'form' : 'saved';
const lifeDisclosureVersion = 1;

function freshUi() {
  return {
    page: 'office', dialog: '', quoteId: '', quote: {}, quoteDefault: {}, quoteOrigin: null,
    quoteDrafts: new Map(), quoteDraftRestored: false, bankGuard: new Map(), actionGesture: null,
    filters: { category: '', availability: 'all' }, notice: '', tutorialStep: 0, showMacro: false,
    saveStatus: 'ready', developmentTab: 'finance', developmentOverview: false, lifeApp: 'home', lifeCollapsed: [...defaultLifeCollapsed], ordersCollapsed: [], coachIntro: 0, coachDeferredWeek: 0,
  };
}

const developmentViews = { ...growthSections, ...strategySections };
const validDevelopmentTab = id => developmentTabs.some(([key]) => key === id);

const pageViews = {
  office: current => officePage(current, officeFeatures(current)),
  inquiries: inquiriesPage,
  orders: ordersPage,
  company: (current, model) => companyPage(current, model.developmentTab, developmentViews[model.developmentTab]?.(current)),
  offwork: (current, model) => {
    const life = lifePanel(current, model.lifeCollapsed, model.lifeApp);
    return model.lifeApp === 'home' ? offworkPage(current, life, model.saveStatus) : life;
  },
};
const notices = {
  bid: '报价已提交，本周末开结果。', 'withdraw-bid': '已撤回报价。',
  expedite: '加急已安排，船期提前一周。', collect: '已发出催款提醒。', sue: '已付诉讼费，等待追回。', liquidate: '库存已清仓。',
  hire: '已办理入职。', 'dismiss-staff': '已办理离职。', 'buy-cert': '已取得认证。', 'open-market': '已进入新市场。',
  exhibit: '已报名参展。', referral: '已请客户引荐。', factor: '保理款已到账。',
  'invest-venture': '产业投资已完成。', 'strategic-investment': '战略投资款已到账。', restructure: '已完成股份制改造。',
  'purchase-stock': '采购已入库。', 'buy-property': '已买入房产。', 'sell-property': '房产出售款已到账。', mortgage: '已办理抵押，授信额度提高。',
  unmortgage: '已解除房产抵押。', 'buy-car': '已买入车辆。', 'sell-car': '卖车款已到账。', outing: '已结束这次活动。',
};

function render() {
  if (!state) {
    mount.innerHTML = opening(ui.notice, scenarioFields(), stored, openingMode);
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
    if (dialog.open) {
      dismissedPointer = dialogPointer && { ...dialogPointer, at: performance.now() };
      dialogPointer = undefined;
      dialog.close();
      // Quote/summary dismissal may restore its page position later in the
      // same handler. Capture the final underlying position before another tap.
      const dismissed = dismissedPointer;
      if (dismissed) queueMicrotask(() => Object.assign(dismissed, scrollPosition()));
    }
    delete dialog.dataset.view;
    dialog.replaceChildren();
    return;
  }
  const isQuote = ui.dialog === 'quote';
  const detail = isQuote ? ui.quoteId : ui.dialog === 'event' ? state.events[0]?.id : ui.dialog === 'summary' ? state.summary?.week : '';
  const view = `${ui.dialog}:${detail ?? ''}`;
  const entering = !dialog.open || dialog.dataset.view !== view;
  if (entering) dialogPointer = undefined;
  const top = entering ? 0 : dialog.scrollTop;
  const summaryTop = entering ? 0 : dialog.querySelector('.summary-scroll')?.scrollTop ?? 0;
  const headingId = isQuote ? 'quote-title' : 'modal-title';
  dialog.dataset.view = view;
  dialog.setAttribute('aria-labelledby', headingId);
  dialog.innerHTML = `${ui.notice && isQuote ? `<p class="notice negative" id="dialog-notice" role="alert">${esc(ui.notice)}</p>` : '<span id="dialog-notice" hidden></span>'}${saveWarning(ui.saveStatus)}${dialogContent(state, ui, isQuote ? quoteDialog(state, ui) : '')}`;
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

function savedView() {
  const active = new Set(state.inquiries.filter(inquiry => !state.bids.some(bid => bid.inquiryId === inquiry.id)).map(inquiry => inquiry.id));
  ui.quoteDrafts = new Map([...ui.quoteDrafts].filter(([id]) => active.has(id)));
  return {
    page: ui.page, filters: ui.filters, showMacro: ui.showMacro, developmentTab: ui.developmentTab, developmentOverview: ui.developmentOverview, lifeApp: ui.lifeApp, lifeCollapsed: ui.lifeCollapsed, lifeDisclosureVersion, ordersCollapsed: ui.ordersCollapsed,
    coachIntro: coachIntroIndex(ui.coachIntro), coachDeferredWeek: ui.coachDeferredWeek,
    drafts: [...ui.quoteDrafts],
    quote: ui.dialog === 'quote' && active.has(ui.quoteId) ? { id: ui.quoteId, proposal: ui.quote } : null,
  };
}

function setSaveStatus(status) {
  ui.saveStatus = status;
  for (const element of document.querySelectorAll('[data-save-warning]')) {
    element.hidden = status === 'ready';
    element.querySelector('[data-save-message]').textContent = saveWarningMessage(status);
    element.querySelector('[data-ui="reload-save"]').hidden = status !== 'conflict';
  }
  const indicator = mount.querySelector('[data-save-indicator]');
  if (indicator) indicator.textContent = status === 'ready' ? '已自动存档' : '当前进度尚未存档';
}

function saveProgress() {
  if (!state) return;
  const next = writeSave(state, savedView(), stored.raw);
  if (next.status === 'ready') stored = next;
  setSaveStatus(next.status);
}

function rereadOpening() {
  stored = readSave();
  openingMode = stored.status === 'empty' ? 'form' : 'saved';
  ui.notice = '';
  render();
}

function quoteDefaults(inquiry) {
  const choices = ['stock', 'factory', 'inventory'];
  const proposal = { ratio: 100, extraTerms: 0, staffId: null, financing: 'standard', branded: false, brandUnitPrice: inquiry.targetPrice };
  proposal.source = choices.find(source => !quote(state, inquiry, { ...proposal, source }).error) ?? 'stock';
  return proposal;
}

function normalizeProposal(value) {
  if (!value || typeof value !== 'object') return {};
  const proposal = {};
  for (const key of ['ratio', 'extraTerms', 'brandUnitPrice']) {
    if (Number.isFinite(value[key])) proposal[key] = value[key];
  }
  for (const key of ['source', 'financing', 'staffId']) {
    if (typeof value[key] === 'string' || (key === 'staffId' && value[key] === null)) proposal[key] = value[key];
  }
  if (typeof value.branded === 'boolean') proposal.branded = value.branded;
  return proposal;
}

function resumeSaved() {
  stored = readSave();
  if (stored.status !== 'ready') {
    openingMode = stored.status === 'empty' ? 'form' : 'saved';
    render();
    return;
  }
  try {
    state = stored.record.state;
    const view = stored.record.view ?? {};
    ui = freshUi();
    if (Object.hasOwn(pageViews, view.page)) ui.page = view.page;
    if (validDevelopmentTab(view.developmentTab)) ui.developmentTab = view.developmentTab;
    ui.developmentOverview = view.developmentOverview === true;
    ui.coachIntro = coachIntroIndex(view.coachIntro);
    if (Number.isInteger(view.coachDeferredWeek)) ui.coachDeferredWeek = view.coachDeferredWeek;
    if (lifeAppIds.includes(view.lifeApp)) ui.lifeApp = view.lifeApp;
    if (Array.isArray(view.lifeCollapsed)) {
      ui.lifeCollapsed = lifeDisclosureIds.filter(id =>
        view.lifeCollapsed.includes(id) || (view.lifeDisclosureVersion !== lifeDisclosureVersion && defaultLifeCollapsed.includes(id)));
    }
    if (Array.isArray(view.ordersCollapsed)) ui.ordersCollapsed = orderDisclosureIds.filter(id => view.ordersCollapsed.includes(id));
    if (typeof view.filters?.category === 'string') ui.filters.category = view.filters.category;
    if (typeof view.filters?.availability === 'string') ui.filters.availability = view.filters.availability;
    ui.showMacro = view.showMacro === true;
    if (Array.isArray(view.drafts)) {
      for (const entry of view.drafts) {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
        ui.quoteDrafts.set(entry[0], normalizeProposal(entry[1]));
      }
    }
    ui.dialog = modalAfterAction();
    if (!ui.dialog && view.quote?.id) {
      const inquiry = state.inquiries.find(item => item.id === view.quote.id && !state.bids.some(bid => bid.inquiryId === item.id));
      if (inquiry) {
        ui.page = 'inquiries';
        ui.dialog = 'quote';
        ui.quoteId = inquiry.id;
        ui.quoteDefault = quoteDefaults(inquiry);
        ui.quote = { ...ui.quoteDefault, ...normalizeProposal(view.quote.proposal) };
        ui.quoteDraftRestored = true;
      }
    }
    if (!ui.dialog && recordCoachVisit(state, ui)) saveProgress();
    render();
    if (!ui.dialog) mount.querySelector('#page-title')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch {
    // A partially damaged record can fail deeper than the format checks.
    // Leave the stored bytes untouched and allow an explicit recovery choice.
    state = undefined;
    ui = freshUi();
    stored = { status: 'invalid', raw: stored.raw };
    openingMode = 'saved';
    render();
  }
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
      ui.quoteDrafts.delete(ui.quoteId);
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
  if (!ui.dialog) recordCoachVisit(state, ui);
  saveProgress();
  render();
  if (finance) bankStatus.textContent = finance;
  if (!ui.dialog && action.type === 'outing') {
    const result = mount.querySelector('#latest-outing');
    result?.scrollIntoView({ block: 'start', behavior: 'instant' });
    result?.querySelector('h3')?.focus({ preventScroll: true });
  } else if (!ui.dialog) restoreFocus(focusKey(trigger));
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
  if (!origin) {
    // A restored quote no longer has a viewport anchor from the previous tab.
    const row = quoteRow(ui.quoteId);
    const trigger = row?.querySelector('[data-ui="quote-open"]');
    const fallback = row?.querySelector('strong') ?? row;
    if (!trigger && fallback) fallback.tabIndex = -1;
    const focus = weeklyTarget ? mount.querySelector('[data-tour="end-week"]') : trigger ?? fallback;
    focus?.scrollIntoView({ block: 'center', behavior: 'instant' });
    focus?.focus({ preventScroll: true });
    return;
  }
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

function dismissDialog({ weeklyTarget = false, viewOrders = false } = {}) {
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
    if (viewOrders) {
      ui.page = 'orders';
      revealOrderSections(['orders-delivery']);
      focusAfterDialog = undefined;
    }
  } else {
    ui.dialog = '';
  }
  if (!ui.dialog) recordCoachVisit(state, ui);
  saveProgress();
  render();
  if (viewOrders) window.scrollTo(0, 0);
  if (!ui.dialog) {
    if (wasQuote) returnFromQuote(weeklyTarget);
    else if (viewOrders) mount.querySelector('#page-title')?.focus({ preventScroll: true });
    else restoreFocus(focusAfterDialog);
    focusAfterDialog = undefined;
  }
}

function openQuote(button) {
  const inquiry = state.inquiries.find(item => item.id === button.dataset.id);
  if (!inquiry) return;
  const proposal = quoteDefaults(inquiry);
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
  saveProgress();
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

function applyRecommendedQuote() {
  if (state.difficulty !== 'casual' || ui.dialog !== 'quote') return;
  const inquiry = state.inquiries.find(item => item.id === ui.quoteId);
  const recommendation = quoteRecommendation(state, inquiry);
  if (!recommendation || recommendation.cashFloor == null || recommendation.cashFloor < 0) return;
  ui.quote = { ...ui.quote, ...recommendation.config };
  saveProgress();
  renderDialog();
  dialog.querySelector('[data-quote-preview="coach"]')?.focus({ preventScroll: true });
}

function revealCoachTarget(control) {
  const { coachAction, coachForm, id, choice } = control.dataset;
  if (ui.page === 'offwork') {
    const app = coachAction === 'outing' ? lifeAppForOuting(id)
      : ['buy-property', 'sell-property', 'mortgage', 'unmortgage'].includes(coachAction) ? 'property'
      : ['buy-car', 'sell-car'].includes(coachAction) ? 'car' : null;
    if (app) selectLifeApp(app, false);
  }
  const targetForm = coachForm && [...mount.querySelectorAll('form[data-form]')].find(item => item.dataset.form === coachForm && (!id || item.elements.id?.value === id));
  if (targetForm && choice) {
    const selector = targetForm.elements.target;
    if (!selector || ![...selector.options].some(option => option.value === choice && !option.disabled)) return;
    selector.value = choice;
  }
  const target = coachForm
    ? targetForm?.querySelector('[name="amount"],[name="target"],button[type="submit"]')
    : [...mount.querySelectorAll('button[data-action]')].find(item => item.dataset.action === coachAction && (!id || item.dataset.id === id) && !item.disabled);
  if (!target || target.disabled) return;
  revealParentDetails(target);
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'center' });
}

function reviewRecommendedQuote() {
  if (ui.dialog !== 'quote') return;
  const submit = dialog.querySelector('form[data-form="quote"] button[type="submit"]');
  if (!submit || submit.disabled) return;
  submit.focus({ preventScroll: true });
  submit.scrollIntoView({ block: 'center' });
}

function revealRecommendedOuting(control) {
  if (ui.page !== 'offwork') return;
  const app = lifeAppForOuting(control.dataset.id);
  if (!app) return;
  selectLifeApp(app, false);
  const outing = [...mount.querySelectorAll('form[data-form="outing"]')].find(item => item.dataset.outingId === control.dataset.id);
  const choice = outing && [...outing.querySelectorAll('input[name="choiceId"]')].find(item => item.value === control.dataset.choice && !item.disabled);
  if (!choice) return;
  revealParentDetails(choice);
  choice.checked = true;
  choice.focus({ preventScroll: true });
  choice.scrollIntoView({ block: 'center' });
}

function selectPage(page) {
  if (!Object.hasOwn(pageViews, page)) return;
  ui.page = page;
  ui.notice = '';
  if (page === 'inquiries' && state.tutorial.step === 0) advanceTutorial(1);
  recordCoachVisit(state, ui);
  saveProgress();
  render();
  mount.querySelector('#page-title')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function selectDevelopmentTab(id) {
  if (ui.page !== 'company' || !validDevelopmentTab(id) || (ui.developmentTab === id && !ui.developmentOverview)) return;
  ui.developmentTab = id;
  ui.developmentOverview = false;
  ui.notice = '';
  recordCoachVisit(state, ui);
  saveProgress();
  render();
  mount.querySelector(`[data-ui="development-tab"][data-id="${id}"]`)?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function selectLifeApp(app, focus = true) {
  if (ui.page !== 'offwork' || !lifeAppIds.includes(app) || ui.lifeApp === app) return;
  ui.lifeApp = app;
  ui.notice = '';
  saveProgress();
  render();
  if (focus) {
    mount.querySelector('#life-app-title')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

function revealOrderSections(ids) {
  const count = ui.ordersCollapsed.length;
  ui.ordersCollapsed = ui.ordersCollapsed.filter(id => !ids.includes(id));
  return ui.ordersCollapsed.length !== count;
}

function revealParentDetails(target) {
  const revealedOrders = [], revealedLife = [];
  for (let section = target.closest('details'); section; section = section.parentElement?.closest('details')) {
    section.open = true;
    if (section.dataset.orderDisclosure) revealedOrders.push(section.dataset.orderDisclosure);
    if (section.dataset.lifeDisclosure) revealedLife.push(section.dataset.lifeDisclosure);
  }
  const lifeCount = ui.lifeCollapsed.length;
  ui.lifeCollapsed = ui.lifeCollapsed.filter(id => !revealedLife.includes(id));
  const ordersChanged = revealOrderSections(revealedOrders);
  if (ordersChanged || ui.lifeCollapsed.length !== lifeCount) saveProgress();
}

function restart() {
  state = undefined;
  ui = freshUi();
  stored = readSave();
  openingMode = 'form';
  focusAfterDialog = undefined;
  bankStatus.textContent = '';
  render();
  mount.querySelector('[name="name"]')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

dialog.addEventListener('cancel', event => {
  event.preventDefault();
  dialogPointer = undefined;
  dismissDialog();
});

function actionFrom(element) {
  const { action: type, id, quantity, ...fields } = element.dataset;
  let details = fields;
  if (type === 'withdraw-bid') details = { inquiryId: id };
  if (type === 'liquidate') details = { productId: id, quantity: Number(quantity) };
  return { type, id, ...details };
}

function scrollPosition() {
  return {
    scrollX: window.scrollX, scrollY: window.scrollY,
    dialogScroll: dialog.open ? dialog.scrollTop : 0,
    summaryScroll: dialog.open ? dialog.querySelector('.summary-scroll')?.scrollTop ?? 0 : 0,
  };
}

function repeatedPoint(event, prior) {
  if (!prior || event.detail <= 0 || performance.now() - prior.at >= 400 ||
      Math.hypot(event.clientX - prior.x, event.clientY - prior.y) > 8) return false;
  if (!Number.isFinite(prior.x) || !Number.isFinite(prior.y)) return false;
  const current = scrollPosition();
  return event.detail > 1 || Object.keys(current).every(key => Math.abs(current[key] - prior[key]) < 1);
}

function rememberActionGesture(key, pointer) {
  ui.actionGesture = { key, at: performance.now(), x: pointer?.clientX, y: pointer?.clientY, ...scrollPosition() };
}

function performGuarded(action, trigger, pointer) {
  const key = action.type === 'invest-venture' ? `venture:${action.id}:${action.target ?? ''}` : null;
  const prior = ui.actionGesture;
  // A retained investment submit can fire twice from repeated keyboard/form
  // submissions; real pointer gestures are checked by their screen position.
  if (key && !pointer && prior?.key === key && performance.now() - prior.at < 450) return false;
  const accepted = perform(action, trigger);
  if (accepted) rememberActionGesture(key, pointer);
  return accepted;
}

function click(event) {
  // A modal can disappear between two taps, revealing an unrelated action at
  // the same screen point. Ignore only the immediate repeated pointer gesture.
  if (event.currentTarget === mount && !dialog.open && dismissedPointer && event.detail > 0) {
    if (repeatedPoint(event, dismissedPointer)) {
      event.preventDefault();
      return;
    }
    dismissedPointer = undefined;
  }
  const prior = ui.actionGesture;
  if (event.detail > 0 && prior && Number.isFinite(prior.x) && Number.isFinite(prior.y)) {
    // Successful operations can remove a row or expose a different button
    // before the second tap. Scrolling to another control is a separate action.
    if (repeatedPoint(event, prior)) {
      event.preventDefault();
      return;
    }
    prior.x = undefined;
    prior.y = undefined;
  }
  const pointer = event.detail > 0 ? { clientX: event.clientX, clientY: event.clientY } : undefined;
  const submitter = event.target.closest('button[type="submit"]');
  formPointer = pointer && submitter?.form ? { ...pointer, form: submitter.form, at: performance.now() } : undefined;
  const control = event.target.closest('button[data-ui],button[data-action]');
  if (!control || control.disabled) return;
  if (!state) {
    switch (control.dataset.ui) {
      case 'resume-save': resumeSaved(); break;
      case 'reread-save': rereadOpening(); break;
      case 'prepare-new-game': openingMode = 'confirm'; render(); break;
      case 'confirm-new-game': openingMode = 'form'; render(); break;
      case 'cancel-new-game': openingMode = 'saved'; render(); break;
      default: break;
    }
    return;
  }
  if (control.dataset.action) {
    performGuarded(actionFrom(control), control, pointer);
    return;
  }
  switch (control.dataset.ui) {
    case 'page': {
      if (control.dataset.page === 'company') {
        const targeted = validDevelopmentTab(control.dataset.coachTab);
        if (targeted) ui.developmentTab = control.dataset.coachTab;
        ui.developmentOverview = !targeted;
      }
      if (control.dataset.page === 'offwork') ui.lifeApp = 'home';
      const directOrder = control.dataset.page === 'orders' && control.dataset.orderSections;
      if (control.dataset.page === 'orders') {
        const directed = directOrder || control.dataset.coachTab || (control.classList.contains('coach-action') ? 'orders-delivery' : '');
        revealOrderSections(directed.split(' '));
      }
      selectPage(control.dataset.page);
      if (directOrder) {
        const section = document.getElementById(directOrder);
        section?.scrollIntoView({ block: 'start', behavior: 'instant' });
        section?.querySelector('summary')?.focus({ preventScroll: true });
      }
      break;
    }
    case 'life-app': selectLifeApp(control.dataset.id); break;
    case 'coach-target': revealCoachTarget(control); break;
    case 'coach-apply-quote': applyRecommendedQuote(); break;
    case 'coach-review-submit': reviewRecommendedQuote(); break;
    case 'coach-select-outing': revealRecommendedOuting(control); break;
    case 'coach-all-inquiries':
      if (ui.page === 'inquiries') { ui.filters.category = ''; ui.filters.availability = 'all'; saveProgress(); render(); }
      break;
    case 'coach-defer-growth':
      if (state.difficulty === 'casual') { ui.coachDeferredWeek = state.week; selectPage('inquiries'); }
      break;
    case 'coach-skip-intro':
      if (state.difficulty === 'casual') {
        ui.coachIntro = 4;
        saveProgress();
        render();
      }
      break;
    case 'development-tab': selectDevelopmentTab(control.dataset.id); break;
    case 'quote-open': openQuote(control); break;
    case 'close-dialog': dismissDialog(); break;
    case 'view-first-order':
      if (ui.dialog === 'summary') dismissDialog({ viewOrders: true });
      break;
    case 'skip-tutorial':
    case 'finish-tutorial':
      advanceTutorial(state.tutorial.step, true);
      saveProgress();
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
    case 'retry-save': saveProgress(); break;
    case 'reload-save':
      if (window.confirm('放弃本页未保存的进度，重新读取本机存档？')) window.location.reload();
      break;
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

function submitBank(form, type, pointer) {
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
    rememberActionGesture(null, pointer);
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
  const pointer = formPointer?.form === form && performance.now() - formPointer.at < 400 ? formPointer : undefined;
  formPointer = undefined;
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
    saveProgress();
    render();
    mount.querySelector('#page-title')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    rememberActionGesture(null, pointer);
    return;
  }
  if (!state) return;
  if (bankForms.has(form.dataset.form)) {
    submitBank(form, form.dataset.form, pointer);
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
      returnFromQuote(!state.tutorial.done && state.tutorial.step === 3);
    }
    return;
  }
  performGuarded({ type: form.dataset.form, ...data }, undefined, pointer);
}

function input(event) {
  if (event.isTrusted) {
    ui.actionGesture = null;
    formPointer = undefined;
  }
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
  saveProgress();
  refreshQuote(control.name === 'branded');
}

function change(event) {
  const control = event.target;
  if (control.dataset.ui === 'scenario-option') {
    const description = document.getElementById(control.getAttribute('aria-describedby'));
    if (description) description.textContent = optionDescription(control.name, control.value) ?? '';
    if (control.name === 'era') {
      const preview = control.closest('.scenario-settings')?.querySelector('[data-era-art]');
      if (preview) preview.innerHTML = eraIllustration(control.value);
    }
    return;
  }
  if (!state || control.dataset.ui !== 'inquiry-filter' || !Object.hasOwn(ui.filters, control.name)) return;
  ui.filters[control.name] = control.value;
  saveProgress();
  render();
  mount.querySelector(`[data-ui="inquiry-filter"][name="${control.name}"]`)?.focus({ preventScroll: true });
}

dialog.addEventListener('click', event => {
  dialogPointer = event.detail > 0 ? { x: event.clientX, y: event.clientY } : undefined;
}, { capture: true });

for (const root of [mount, dialog]) {
  root.addEventListener('click', click);
  root.addEventListener('submit', submit);
  root.addEventListener('input', input);
  root.addEventListener('change', change);
}

mount.addEventListener('toggle', event => {
  if (state && event.target.matches('details[data-ui="macro-disclosure"]') && ui.showMacro !== event.target.open) {
    ui.showMacro = event.target.open;
    saveProgress();
  }
  const id = event.target.dataset.lifeDisclosure;
  if (state && lifeDisclosureIds.includes(id)) {
    const collapsed = !event.target.open;
    if (ui.lifeCollapsed.includes(id) !== collapsed) {
      ui.lifeCollapsed = collapsed ? [...ui.lifeCollapsed, id] : ui.lifeCollapsed.filter(key => key !== id);
      saveProgress();
    }
  }
  const orderId = event.target.dataset.orderDisclosure;
  if (state && orderDisclosureIds.includes(orderId)) {
    const collapsed = !event.target.open;
    if (ui.ordersCollapsed.includes(orderId) !== collapsed) {
      ui.ordersCollapsed = collapsed ? [...ui.ordersCollapsed, orderId] : ui.ordersCollapsed.filter(key => key !== orderId);
      saveProgress();
    }
  }
}, { capture: true });

window.addEventListener('storage', event => {
  if (event.key !== SAVE_KEY && event.key !== null) return;
  if (state && event.newValue !== stored.raw) setSaveStatus('conflict');
  else if (!state && openingMode === 'saved') rereadOpening();
});

render();
mount.removeAttribute('aria-busy');
