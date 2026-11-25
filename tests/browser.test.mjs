import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, dismissDecisions, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const content = 'document.body.innerText';

async function noOverflow(page, label) {
  const layout = await page.evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})`);
  assert.ok(layout.scroll <= layout.width + 1, `${label}: document exceeds viewport: ${JSON.stringify(layout)}`);
  assert.ok(layout.body <= layout.width + 1, `${label}: body exceeds viewport: ${JSON.stringify(layout)}`);
}

async function createCompany(page, name) {
  await page.goto();
  await page.waitFor(present('[data-form="new-game"]'));
  assert.equal(await page.evaluate(present('a[href="classic.html"], a[href="deal-room.html"], a[href="legacy-game.html"]')), false);
  const portraits = await page.evaluate('({mobile:innerWidth<=760,sizes:Array.from(document.querySelectorAll(".assistant-choice .portrait"),e=>({width:e.clientWidth,height:e.clientHeight}))})');
  assert.equal(portraits.sizes.length, 4);
  if (portraits.mobile) assert.ok(portraits.sizes.every(size => size.width >= 120 && Math.abs(size.height - size.width * 773 / 680) <= 2), JSON.stringify(portraits));
  await noOverflow(page, 'opening');
  await page.fill('[data-form="new-game"] [name="name"]', name);
  await page.click('[data-form="new-game"] button[type="submit"]');
  await page.waitFor(present('#page-title'));
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'iphone13', width: 390, height: 844, mobile: true }]) {
  test(`real Chromium ${viewport.name}: five-step tutorial, bid, summary and every page`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root);
    try {
      const page = await browser.page(viewport);
      await createCompany(page, `${viewport.name} 贸易验收`);
      assert.match(await page.evaluate('document.querySelector(".tutorial").innerText'), /1 \/ 5/);
      await noOverflow(page, 'office');
      const officeArt = await page.evaluate(`(()=>{const a=document.querySelector('.hero-art').getBoundingClientRect(), b=document.querySelector('.office-picture-note').getBoundingClientRect(), c=document.querySelector('.port-overlay').getBoundingClientRect(); const overlaps=(r,s)=>r.left<s.right&&s.left<r.right&&r.top<s.bottom&&s.top<r.bottom; return {ratio:a.width/a.height, captionOverlap:overlaps(a,b), portOverlap:overlaps(a,c), fit:getComputedStyle(document.querySelector('.hero-art img')).objectFit};})()`);
      assert.ok(Math.abs(officeArt.ratio - 1.5) < .01 && officeArt.fit === 'contain', `Office picture is cropped: ${JSON.stringify(officeArt)}`);
      assert.equal(officeArt.captionOverlap || officeArt.portOverlap, false, 'Office image must be free of text and port overlays');
      await page.click('[data-ui="macro-disclosure"] > summary');
      const overviewLayout = await page.evaluate('Array.from(document.querySelectorAll(".workspace > .kpi-grid, .macro-disclosure .kpi-grid")).map(grid => ({width: grid.clientWidth, scroll: grid.scrollWidth, cards: grid.children.length}))');
      assert.deepEqual(overviewLayout.map(grid => grid.cards), [5, 7]);
      assert.ok(overviewLayout.every(grid => grid.scroll <= grid.width + 1), JSON.stringify(overviewLayout));
      await page.click('[data-ui="macro-disclosure"] > summary');
      await page.click('[data-ui="page"][data-page="inquiries"]');
      assert.match(await page.evaluate('document.querySelector(".tutorial").innerText'), /2 \/ 5/);
      await page.waitFor(present('[data-ui="quote-open"]'));
      const productFrame = await page.evaluate('(() => { const {width, height} = document.querySelector(".inquiry-product .product-thumb").getBoundingClientRect(); return {width, height}; })()');
      assert.ok(productFrame.width >= 110 && productFrame.height >= 70, `Inquiry artwork is too small: ${JSON.stringify(productFrame)}`);
      await page.click('[data-ui="quote-open"]');
      await page.waitFor(present('dialog[open] [data-form="quote"]'));
      assert.match(await page.evaluate('document.querySelector("dialog .tutorial").innerText'), /3 \/ 5/);
      assert.ok(await page.evaluate(present('dialog [data-tour="cash-forecast"]')));
      await page.evaluate('(() => {const e=document.querySelector("dialog input[name=ratio]");e.value="80";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
      assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /100%/);
      await noOverflow(page, 'quote');
      await page.screenshot(`/tmp/trade-v38-phase1-${viewport.name}-quote.png`);
      await page.click('dialog [data-form="quote"] button[type="submit"]');
      await page.waitFor('!document.querySelector("dialog").open');
      assert.match(await page.evaluate('document.querySelector(".tutorial").innerText'), /4 \/ 5/);
      assert.match(await page.evaluate(content), /已提交报价/);
      await page.click('[data-action="end-week"]');
      await page.waitFor('document.querySelector("dialog[open] #modal-title")?.textContent.includes("本周小结")');
      assert.match(await page.evaluate('document.querySelector("dialog .tutorial").innerText'), /5 \/ 5/);
      const summary = await page.evaluate('document.querySelector("dialog").innerText');
      assert.match(summary, /米拉/);
      assert.match(summary, /每周结算会自动推进备货、运输和交付/);
      assert.doesNotMatch(summary, /\[object Object\]|NaN|undefined/);
      await noOverflow(page, 'summary');
      await page.click('[data-ui="finish-tutorial"]');
      assert.equal(await page.evaluate('document.querySelector(".tutorial") !== null'), false);
      if (viewport.mobile) {
        await page.click('dialog [data-ui="view-first-order"]');
        assert.equal(await page.evaluate('document.activeElement.id'), 'page-title');
        assert.match(await page.evaluate('document.querySelector("#page-title").textContent'), /订单/);
        assert.match(await page.evaluate(content), /米拉/);
      } else {
        await page.click('dialog [data-ui="close-dialog"]');
      }
      for (const id of ['office', 'inquiries', 'orders', 'company', 'offwork']) {
        await page.click(`[data-ui="page"][data-page="${id}"]`);
        await page.waitFor(present('#page-title'));
        await noOverflow(page, id);
        assert.equal(await page.evaluate(present('a[href="classic.html"], a[href="deal-room.html"], a[href="legacy-game.html"]')), false);
        assert.equal(await page.evaluate(present('[aria-label="经营指标"]')), id === 'office');
        assert.equal(await page.evaluate(present('[data-ui="macro-disclosure"]')), id === 'office');
        if (id !== 'office' && viewport.mobile) {
          assert.match(await page.evaluate('document.querySelector(".compact-cash").innerText'), /可用资金.*¥/);
          assert.equal(await page.evaluate('document.querySelector(".compact-cash").getClientRects().length > 0'), true);
        }
        assert.doesNotMatch(await page.evaluate(content), /\[object Object\]|NaN|undefined/);
      }
      const controls = await page.evaluate(`Array.from(document.querySelectorAll('nav button,.week-controls button')).filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.trim(),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))`);
      assert.ok(controls.length >= 7);
      for (const control of controls) assert.ok(control.height >= 44 && control.width >= 44, `Small main control: ${JSON.stringify(control)}`);
      await page.click('[data-ui="page"][data-page="office"]');
      await page.screenshot(`/tmp/trade-v38-phase1-${viewport.name}.png`);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}

test('real Chromium: development sections switch independently, wrap on mobile and restore with the save', { skip: !enabled, timeout: 120_000 }, async () => {
  const sections = ['finance', 'team', 'certifications', 'markets', 'economy', 'rivalry', 'partners', 'board-goals', 'ventures', 'listing', 'company-record'];
  for (const width of [1440, 390, 320]) {
    const browser = await launchBrowser(root);
    try {
      const page = await browser.page({ width, height: width === 1440 ? 900 : 720, mobile: width !== 1440 });
      await createCompany(page, '发展分区验收');
      await page.click('[data-ui="skip-tutorial"]');
      await page.click('[data-ui="page"][data-page="company"]');
      assert.equal(await page.evaluate('document.querySelector("#page-title").textContent'), '发展');
      assert.equal(await page.evaluate('document.querySelector(".nav [data-page=company]").innerText.trim()'), '发展');
      assert.equal(await page.evaluate('document.querySelector("[data-development-panel]").dataset.developmentPanel'), 'finance');
      const layout = await page.evaluate(`(()=>{const nav=document.querySelector(".development-tabs");return {width:nav.clientWidth,scroll:nav.scrollWidth,tabs:[...nav.querySelectorAll("button")].map(button=>({id:button.dataset.id,width:button.offsetWidth,height:button.offsetHeight}))}})()`);
      assert.deepEqual(layout.tabs.map(tab => tab.id), sections);
      assert.ok(layout.scroll <= layout.width + 1 && layout.tabs.every(tab => tab.width >= 44 && tab.height >= 44), JSON.stringify(layout));
      for (const section of sections) {
        await page.click(`[data-ui="development-tab"][data-id="${section}"]`);
        assert.equal(await page.evaluate('document.querySelector("[data-development-panel]").dataset.developmentPanel'), section);
        assert.deepEqual(await page.evaluate('[...document.querySelectorAll(".development-tab[aria-pressed=true]")].map(button=>button.dataset.id)'), [section]);
        assert.deepEqual(await page.evaluate('[...document.querySelectorAll(".growth-section,.strategy-section")].map(panel=>panel.id)'), section === 'finance' ? [] : [section]);
        assert.equal(await page.evaluate(present('[data-form="borrow"]')), section === 'finance');
        await noOverflow(page, `development ${section} ${width}px`);
      }
      await page.click('[data-ui="development-tab"][data-id="team"]');
      await page.screenshot(`/tmp/trade-v38-development-${width}.png`);
      await page.click('[data-ui="page"][data-page="office"]');
      await page.click('[data-ui="page"][data-page="company"]');
      assert.equal(await page.evaluate('document.querySelector("[data-development-panel]").dataset.developmentPanel'), 'team');
      await page.goto();
      await page.waitFor(present('[data-ui="resume-save"]'));
      await page.click('[data-ui="resume-save"]');
      await page.waitFor(present('[data-development-panel="team"]'));
      assert.deepEqual(await page.evaluate('[...document.querySelectorAll(".development-tab[aria-pressed=true]")].map(button=>button.dataset.id)'), ['team']);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  }
});

test('real Chromium: illustrated key-client decision and cash-emergency bankruptcy can be handled', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page, `(game)=>{let state=game.newGame({name:'客户漫画与风险验收',assistant:'fang',seed:381});state.tutorial.done=true;const inquiry=state.inquiries[0];state.relationships[inquiry.buyer.id]={deliveries:2,rep:30,buyer:inquiry.buyer,productId:inquiry.productId,market:'domestic'};state=game.act(state,{type:'bid',inquiryId:inquiry.id,source:'stock',ratio:80}).state;return game.endWeek(state);}`);
    for (let i = 0; i < 8 && !(await currentState(page)).events.some(item => item.type === 'key-client'); i++) {
      await page.click('[data-action="end-week"]');
      await page.waitFor(present('dialog[open]'));
      await page.click('dialog [data-ui="close-dialog"]');
      if (!(await currentState(page)).events.some(item => item.type === 'key-client')) await dismissDecisions(page);
    }
    await page.waitFor(present('dialog[open] .event-comic img'));
    await page.waitFor('document.querySelector("dialog .event-comic img")?.naturalWidth>0');
    assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /重点客户/);
    await noOverflow(page, 'key-client comic');
    await page.screenshot('/tmp/trade-v38-key-client-iphone13.png');
    await dismissDecisions(page);
    await loadScenario(page, `(game)=>{const state=game.newGame({name:'资金链风险验收',assistant:'fang',seed:381});state.tutorial.done=true;state.payables.push({id:'unfunded-factory',amount:500000,dueWeek:1,type:'supplier'});return game.endWeek(state);}`);
    assert.match(await page.evaluate(content), /资金链告急/);
    assert.ok((await currentState(page)).loan > 0);
    await page.click('[data-action="end-week"]');
    await page.waitFor('document.querySelector("dialog[open] #modal-title")?.textContent.includes("公司破产")');
    await noOverflow(page, 'bankruptcy');
    await page.screenshot('/tmp/trade-v38-bankruptcy-iphone13.png');
    await page.click('dialog [data-ui="restart"]');
    await page.waitFor(present('[data-form="new-game"]'));
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('real Chromium: all five era choices open actual games with the chosen origin and difficulty', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    for (const era of ['2001', '2008', '2018', '2021', '2026']) {
      await page.goto();
      if (era !== '2001') {
        await page.waitFor(present('[data-ui="prepare-new-game"]'));
        await page.click('[data-ui="prepare-new-game"]');
        await page.click('[data-ui="confirm-new-game"]');
      }
      await page.waitFor(present('[data-form="new-game"] select[name="era"]'));
      await page.evaluate(`(()=>{for(const [name,value] of [['era',${JSON.stringify(era)}],['origin','factory-heir'],['difficulty','casual']]){const e=document.querySelector('[data-form=new-game] [name='+name+']');e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
      await page.fill('[data-form="new-game"] [name="name"]', `${era} 时代开局验收`);
      await page.waitFor(`(() => {const image=document.querySelector('[data-era-art] img');return image?.complete && image.naturalWidth > 0 && image.getAttribute('src') === 'assets/v38-era-${era}.webp';})()`);
      await noOverflow(page, `${era} opening options`);
      await page.click('[data-form="new-game"] button[type="submit"]');
      await page.waitFor(present('#page-title'));
      const state = await currentState(page);
      assert.equal(state.era, era);
      assert.equal(state.startYear, Number(era));
      assert.equal(state.origin, 'factory-heir');
      assert.equal(state.difficulty, 'casual');
      assert.equal(state.ventures.factory['餐桌器具'], 1);
      await noOverflow(page, `${era} office`);
    }
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'iphone13', width: 390, height: 844, mobile: true }]) {
  test(`real Chromium ${viewport.name}: five industries, warehouse, brand quote, IPO, mortgage and outings`, { skip: !enabled, timeout: 180_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      await loadScenario(page, `(game,quotes)=>{const state=game.newGame({name:'产业与上市界面验收',assistant:'fang',seed:381});state.cash=3000000;state.week=105;state.year.number=3;state.company.rep=88;state.company.certs=['export','audit','supplier'];state.company.markets=['domestic','se-asia'];state.cumulativeRevenue=2600000;state.energy=10;state.history=Array.from({length:52},(_,i)=>({week:53+i,revenue:25000,profit:4000,cash:3000000,rep:88,inflow:25000,outflow:21000,receivables:0,orders:0,loan:0,macro:{...state.macro}}));state.year.records=[{number:1,revenue:1200000,profit:120000,deliveries:40,late:0},{number:2,revenue:1400000,profit:130000,deliveries:45,late:0}];state.tutorial.done=true;state.inquiries=quotes.generateInquiries(state);state.creditLine=game.creditLimit(state);return state;}`);
      await page.click('[data-ui="page"][data-page="company"]');
      await page.click('[data-ui="development-tab"][data-id="ventures"]');
      await page.click('[data-action="invest-venture"][data-id="warehouse"]');
      await page.click('form[data-form="invest-venture"]:has([name="id"][value="factory"]) button[type="submit"]');
      await page.click('form[data-form="invest-venture"]:has([name="id"][value="overseas"]) button[type="submit"]');
      await page.click('[data-action="invest-venture"][data-id="brand"]');
      await page.click('[data-action="invest-venture"][data-id="ecommerce"]');
      const built = await currentState(page);
      assert.equal(built.ventures.warehouse, 1);
      assert.ok(Object.keys(built.ventures.factory).length);
      assert.equal(built.ventures.overseas['se-asia'], 1);
      assert.equal(built.ventures.brand, 1);
      assert.equal(built.ventures.ecommerce, 1);
      for (const filename of ['v38-industry-factory.webp', 'v38-industry-ecommerce.webp']) {
        const imageSelector = `.venture-image img[src="assets/${filename}"]`;
        await page.evaluate(`document.querySelector(${JSON.stringify(imageSelector)}).scrollIntoView({block:'center'})`);
        await page.waitFor(`document.querySelector(${JSON.stringify(imageSelector)})?.naturalWidth > 0`);
      }
      await noOverflow(page, 'all industry cards');
      await page.click('[data-ui="page"][data-page="orders"]');
      await page.waitFor(present('form[data-form="purchase-stock"]'));
      await page.fill('form[data-form="purchase-stock"] [name="quantity"]', '72');
      const stockCash = (await currentState(page)).cash;
      await page.click('form[data-form="purchase-stock"] button[type="submit"]');
      const stocked = await currentState(page);
      assert.equal(stocked.inventory.reduce((sum, item) => sum + item.quantity, 0), 72);
      assert.ok(stocked.cash < stockCash);
      await noOverflow(page, 'stock purchase');
      await page.click('[data-ui="page"][data-page="inquiries"]');
      const quoteId = await page.evaluate('document.querySelector("[data-ui=quote-open]:not([disabled])").dataset.id');
      const inquiry = (await currentState(page)).inquiries.find(item => item.id === quoteId);
      await page.click(`[data-ui="quote-open"][data-id="${quoteId}"]`);
      await page.waitFor(present('dialog [name="branded"]'));
      await page.click('dialog [name="branded"]');
      await page.waitFor(present('dialog [name="brandUnitPrice"]'));
      await page.fill('dialog [name="brandUnitPrice"]', String(inquiry.targetPrice + 8));
      assert.equal(await page.evaluate(present('dialog [name="ratio"]')), false);
      assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /自有品牌/);
      await noOverflow(page, 'brand pricing');
      await page.screenshot(`/tmp/trade-v38-phase3-${viewport.name}-brand.png`);
      await page.click('dialog [data-form="quote"] button[type="submit"]');
      assert.equal((await currentState(page)).bids[0].branded, true);
      await page.click('[data-ui="page"][data-page="company"]');
      await page.click('[data-ui="development-tab"][data-id="listing"]');
      await page.click('[data-action="strategic-investment"]');
      assert.equal((await currentState(page)).listing.stage, 'funded');
      await page.click('[data-action="restructure"]');
      assert.equal((await currentState(page)).listing.stage, 'corporation');
      await page.click('[data-action="ipo"]');
      await page.waitFor('document.querySelector("dialog[open] #modal-title")?.textContent.includes("上市成功")');
      assert.equal((await currentState(page)).listing.stage, 'public');
      await page.waitFor('document.querySelector(\'dialog img[src="assets/v38-milestone-ipo.webp"]\')?.naturalWidth > 0');
      assert.equal(await page.evaluate('document.querySelector("dialog .dialog-header .eyebrow").textContent'), '企业里程碑');
      assert.equal(await page.evaluate(present('dialog .dialog-body .notice.negative:not([hidden])')), false);
      assert.equal(await page.evaluate(present('dialog button.primary[data-action="resolve-event"]')), true);
      await noOverflow(page, 'IPO celebration');
      await page.screenshot(`/tmp/trade-v38-phase3-${viewport.name}-ipo.png`);
      await dismissDecisions(page);
      await page.click('[data-ui="development-tab"][data-id="company-record"]');
      await page.evaluate('document.querySelector(".milestone-gallery").scrollIntoView({block:"center"})');
      await page.waitFor('document.querySelector(\'.milestone-gallery img[src="assets/v38-milestone-ipo.webp"]\')?.naturalWidth > 0');
      await page.click('#company-record details:has(.biography) > summary');
      assert.match(await page.evaluate('document.querySelector(".biography").innerText'), /完成上市/);
      await noOverflow(page, 'biography');
      await page.click('[data-ui="page"][data-page="offwork"]');
      await page.click('[data-action="buy-property"][data-id="city-flat"]');
      const beforeMortgage = await currentState(page);
      await page.click('[data-action="mortgage"][data-id="city-flat"]');
      const mortgaged = await currentState(page);
      assert.equal(mortgaged.cash, beforeMortgage.cash);
      assert.ok(mortgaged.creditLine > beforeMortgage.creditLine);
      await page.click('[data-action="buy-car"][data-id="hatch"]');
      assert.ok((await currentState(page)).life.cars.includes('hatch'));
      const tired = (await currentState(page)).energy;
      await page.click('#life-quick > summary');
      await page.click('[data-action="outing"][data-id="flower-market"]');
      assert.ok((await currentState(page)).energy > tired);
      await page.waitFor('document.querySelector(".outing-note img")?.naturalWidth>0');
      await noOverflow(page, 'lifestyle');
      await page.screenshot(`/tmp/trade-v38-phase3-${viewport.name}-life.png`);
      await page.click('[data-ui="page"][data-page="office"]');
      assert.match(await page.evaluate('document.querySelector(".port-overlay").getAttribute("aria-label")'), /海外 1 个市场.*仓库 1 级/);
      assert.equal(await page.evaluate('document.querySelectorAll(".port-ship").length'), 1);
      assert.equal(await page.evaluate('document.querySelectorAll(".port-warehouse").length'), 1);
      await page.waitFor('document.querySelector(".port-background img")?.naturalWidth > 0 && document.querySelector(".port-background")?.dataset.mediaState === "loaded"');
      await noOverflow(page, 'grown harbor');
      await page.screenshot(`/tmp/trade-v38-phase3-${viewport.name}-harbor.png`);
      assert.doesNotMatch(await page.evaluate(content), /NaN|undefined|\[object Object\]/);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}

test('real Chromium: first million-order and overseas-delivery artwork appears at settlement and in company records', { skip: !enabled, timeout: 120_000 }, async () => {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'iphone13', width: 390, height: 844, mobile: true }]) {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      await loadScenario(page, `(game,quotes)=>{let state=game.newGame({name:'成就插画验收',assistant:'fang',seed:381});state.cash=3000000;state.company.rep=88;state.year.deliveries=10;state.tutorial.done=true;state=game.act(state,{type:'buy-cert',id:'export'}).state;state=game.act(state,{type:'open-market',id:'se-asia'}).state;state.week=4;state.inquiries=quotes.generateInquiries(state);const inquiry=state.inquiries.find(item=>item.market==='se-asia');inquiry.quantity*=Math.ceil(1300000/(inquiry.quantity*inquiry.targetPrice*.8*state.macro.usd));inquiry.terms=3;return game.act(state,{type:'bid',inquiryId:inquiry.id,source:'stock',ratio:80}).state;}`);
      const files = { landmark: 'v38-milestone-million.webp', 'export-shipment': 'v38-milestone-export.webp' };
      const illustrated = [];
      for (let i = 0; i < 12 && illustrated.length < 2; i++) {
        await page.click('[data-action="end-week"]');
        const state = await currentState(page);
        for (const id of state.summary.illustratedMilestones ?? []) {
          const selector = `dialog .milestone-image img[src="assets/${files[id]}"]`;
          await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
          await page.waitFor(`document.querySelector(${JSON.stringify(selector)})?.naturalWidth > 0`);
          await noOverflow(page, 'milestone summary');
          assert.equal(await page.evaluate('document.querySelector("dialog").scrollWidth <= document.querySelector("dialog").clientWidth + 1'), true);
          await page.screenshot(`/tmp/trade-v38-milestone-${viewport.name}-${id}.png`);
          illustrated.push(id);
        }
        await dismissDecisions(page);
      }
      assert.deepEqual(illustrated, ['landmark', 'export-shipment']);
      await page.click('[data-ui="page"][data-page="company"]');
      await page.click('[data-ui="development-tab"][data-id="company-record"]');
      for (const filename of Object.values(files)) {
        const selector = `.milestone-gallery img[src="assets/${filename}"]`;
        await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
        await page.waitFor(`document.querySelector(${JSON.stringify(selector)})?.naturalWidth > 0`);
      }
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  }
});

test('real Chromium: preserved classic and legacy pages both boot at their distinct URLs', { skip: !enabled, timeout: 60_000 }, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page();
    await page.goto('classic.html');
    await page.waitFor(present('#deal-room button'));
    assert.equal(await page.evaluate(present('#v38-root')), false);
    assert.doesNotMatch(await page.evaluate(content), /正在打开工作室/);
    await page.goto('legacy-game.html');
    await page.waitFor(present('#trade-app #start-form'));
    assert.equal(await page.evaluate(present('#v38-root')), false);
    assert.match(await page.evaluate(content), /开张，接第一笔生意/);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('real Chromium: a funded 52-week calendar displays annual settlement and can continue', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page();
    await createCompany(page, '全年经营验收');
    await loadScenario(page, `(game)=>{const state=game.newGame({name:'全年经营验收',assistant:'fang',seed:381});state.cash=200000;state.tutorial.done=true;return state;}`);
    await page.click('[data-ui="page"][data-page="company"]');
    await page.fill('[data-form="borrow"] [name="amount"]', '20000');
    await page.click('[data-form="borrow"] button[type="submit"]');
    assert.match(await page.evaluate(content), /220,000/);
    let annual = false;
    for (let i = 0; i < 60 && (await currentState(page)).week < 53; i++) {
      await page.click('[data-action="advance-four"]');
      await page.waitFor(present('dialog[open]'));
      const text = await page.evaluate('document.querySelector("dialog").innerText');
      assert.doesNotMatch(text, /公司破产|NaN|undefined/);
      annual ||= /年度结算.*第 1 年/.test(text);
      await dismissDecisions(page);
    }
    assert.ok(annual);
    assert.match(await page.evaluate(content), /第 2 年 · 第 1 周/);
    await page.click('[data-action="end-week"]');
    await page.waitFor(present('dialog[open]'));
    assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /第 53 周/);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'iphone13', width: 390, height: 844, mobile: true }]) {
  test(`real Chromium ${viewport.name}: hire, certify, open a market, insure export and factor its invoice`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      await loadScenario(page, `(game)=>{const state=game.newGame({name:'扩张界面验收',assistant:'fang',seed:381});state.cash=300000;state.company.rep=75;state.year.deliveries=10;state.tutorial.done=true;return state;}`);
      await page.click('[data-ui="page"][data-page="company"]');
      await page.click('[data-ui="development-tab"][data-id="team"]');
      const initial = await currentState(page);
      const candidate = initial.candidates.find(person => person.role === 'sales');
      await page.click(`[data-action="hire"][data-id="${candidate.id}"]`);
      assert.equal((await currentState(page)).staff.length, initial.staff.length + 1);
      await page.click('[data-ui="development-tab"][data-id="certifications"]');
      await page.click('[data-action="buy-cert"][data-id="export"]');
      assert.ok((await currentState(page)).company.certs.includes('export'));
      await page.click('[data-ui="development-tab"][data-id="markets"]');
      await page.click('[data-action="open-market"][data-id="se-asia"]');
      assert.ok((await currentState(page)).company.markets.includes('se-asia'));
      await noOverflow(page, 'expanded company');
      await page.screenshot(`/tmp/trade-v38-phase2-${viewport.name}-company.png`);
      await page.click('[data-action="end-week"]');
      await page.waitFor(present('dialog[open]'));
      await dismissDecisions(page);
      await loadScenario(page, `(game,quotes)=>{const state=${JSON.stringify(await currentState(page))};const inquiry=state.inquiries.find(item=>item.market==='se-asia'&&!quotes.quote(state,item,{source:'stock',ratio:80}).error);if(!inquiry)throw Error('Missing eligible export inquiry');inquiry.terms=3;return state;}`);
      const inquiry = (await currentState(page)).inquiries.find(item => item.market === 'se-asia');
      await page.click('[data-ui="page"][data-page="inquiries"]');
      await page.click(`[data-ui="quote-open"][data-id="${inquiry.id}"]`);
      await page.waitFor(present('dialog[open] [data-form="quote"]'));
      await page.evaluate(`(()=>{for(const [name,value] of [['ratio','80'],['financing','insured'],['staffId',${JSON.stringify(candidate.id)}]]){const e=document.querySelector('dialog [name='+name+']');e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
      const quotation = await page.evaluate('document.querySelector("dialog").innerText');
      assert.match(quotation, /出口信用保险/);
      assert.match(quotation, /退税/);
      assert.doesNotMatch(quotation, /NaN|undefined|\[object Object\]/);
      await noOverflow(page, 'insured export quotation');
      await page.screenshot(`/tmp/trade-v38-phase2-${viewport.name}-quote.png`);
      await page.click('dialog [data-form="quote"] button[type="submit"]');
      await page.waitFor('!document.querySelector("dialog").open');
      for (let i = 0; i < 14 && !(await currentState(page)).receivables.some(item => item.status === 'open' || item.status === 'overdue'); i++) {
        await page.click('[data-action="end-week"]');
        await page.waitFor(present('dialog[open]'));
        await dismissDecisions(page);
      }
      const before = await currentState(page);
      const invoice = before.receivables.find(item => item.status === 'open' || item.status === 'overdue');
      assert.ok(invoice, 'Real delivered export should produce an invoice');
      await page.click('[data-ui="page"][data-page="orders"]');
      assert.match(await page.evaluate(content), /退税/);
      await page.click(`[data-action="factor"][data-id="${invoice.id}"]`);
      const factored = await currentState(page);
      assert.equal(factored.receivables.find(item => item.id === invoice.id).status, 'factored');
      assert.ok(factored.cash > before.cash);
      assert.match(await page.evaluate(content), /保理款已到账/);
      await page.click('#orders-receivables details:has(table[aria-label="最近回款"]) > summary');
      assert.match(await page.evaluate('document.querySelector("table[aria-label=最近回款]").innerText'), /保理到账/);
      await noOverflow(page, 'export orders and factoring');
      await page.screenshot(`/tmp/trade-v38-phase2-${viewport.name}-orders.png`);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}
