import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';
import { act } from '../v38/engine/game.js';
import { coachTourIds, pageCoach } from '../v38/ui/coaching.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = {skip:process.env.V38_BROWSER !== '1', timeout:120_000};
const pause = () => new Promise(resolve=>setTimeout(resolve,410));
const selector = '.workspace > .coach-card';

// This is an actual deterministic engine-generated save, not a hand-edited
// profitable company. In production revision e8ddb80, start casual / 2026 /
// self-made / fang / seed 920, complete the assistant's preparation and full
// introduction, then follow its real recommended business actions and weekly
// settlement for 31 weeks. The saved state is the W32 pre-bid checkpoint after
// pending decisions and before any guided W32 development. All companies,
// clients, candidates and records are fictional game data. Preserve this state
// to catch the real operations → audit → market progression blocked by the old
// direct wage-savings-only threshold.
const fixture = JSON.parse(await readFile(new URL('./fixtures/hiring-seed920-w32.json', import.meta.url), 'utf8'));

test('the actual week-32 checkpoint supports independent hiring, audit and market decisions in later weeks', () => {
  let state=structuredClone(fixture);
  const ui={page:'inquiries',coachPrep:3,coachIntro:4,coachTour:{version:2,visited:coachTourIds,active:null,skipped:false},
    coachReview:{},filters:{category:'all',availability:'all'}};
  const advise=(tab,title)=>{
    const before=structuredClone(state);
    const html=pageCoach(state,ui);
    assert.match(html,title);
    assert.ok(html.includes(`data-page="company" data-coach-tab="${tab}"`));
    assert.deepEqual(state,before,'viewing advice cannot execute the next development action');
  };
  const apply=action=>{
    const result=act(state,action);
    assert.ifError(result.error);
    state=result.state;
  };
  // Exact real offers/decisions from a six-week continuation of this checkpoint.
  // Replay the already chosen ordinary business, but independently ask the
  // current coach about each new development step before executing it.
  advise('team',/建议聘用梁佳音/);
  apply({type:'hire',id:'liang'});
  assert.equal(state.cash,153553);
  assert.deepEqual(state.company.certs,['export']);
  for(const action of [
    {type:'bid',inquiryId:'w32-2',source:'factory',ratio:85,extraTerms:0,staffId:'',financing:'letter-of-credit'},
    {type:'bid',inquiryId:'w32-1',source:'factory',ratio:95,extraTerms:0,staffId:'fang',financing:'standard'},
    {type:'bid',inquiryId:'w32-5',source:'factory',ratio:80,extraTerms:0,staffId:'',financing:'standard'},
    {type:'end-week'}, {type:'dismiss-summary'},
    {type:'resolve-event',eventId:'event-434',choice:'defer'},
    {type:'resolve-event',eventId:'event-435',choice:'contact'},
    {type:'resolve-event',eventId:'event-436',choice:'contact'},
  ]) apply(action);
  assert.equal(state.week,33);
  advise('certifications',/取得验厂认证/);
  const beforeAudit=state.cash;
  apply({type:'buy-cert',id:'audit'});
  assert.equal(state.cash,beforeAudit-25000);
  assert.deepEqual(state.company.markets,['domestic','se-asia']);
  for(const action of [
    {type:'bid',inquiryId:'w33-5',source:'factory',ratio:95,extraTerms:0,staffId:'',financing:'standard'},
    {type:'bid',inquiryId:'w33-2',source:'factory',ratio:80,extraTerms:0,staffId:'',financing:'letter-of-credit'},
    {type:'bid',inquiryId:'w33-3',source:'stock',ratio:80,extraTerms:4,staffId:'',financing:'standard'},
    {type:'end-week'}, {type:'dismiss-summary'},
  ]) apply(action);
  assert.equal(state.week,34);
  advise('markets',/开拓日韩/);
  const beforeMarket=state.cash;
  apply({type:'referral',id:'east-asia'});
  assert.equal(state.cash,beforeMarket-6600);
  assert.ok(state.company.markets.includes('east-asia'));
  assert.equal(state.loan,0);
});

async function coach(page) {
  return page.evaluate(`(()=>({text:document.querySelector(${JSON.stringify(selector)})?.innerText,
    hire:!!document.querySelector(${JSON.stringify(selector+' [data-coach-action="hire"]')}),
    team:!!document.querySelector(${JSON.stringify(selector+' [data-page="company"][data-coach-tab="team"]')})}))()`);
}

async function showTeam(page) {
  await page.click('.nav [data-page="company"]');
  await page.click('[data-ui="development-tab"][data-id="team"]');
}

async function showProperty(page) {
  await page.click('.nav [data-page="offwork"]');
  await page.click('[data-ui="life-app"][data-id="property"]');
}

test('a real week-32 hiring opportunity re-evaluates after voluntary spending and restored cash without automatic hiring', options, async () => {
  const browser = await launchBrowser(root, {scenarios:true});
  try {
    const page = await browser.page({width:390,height:844,mobile:true});
    await page.goto();
    await page.waitFor('!!document.querySelector("[data-form=new-game],[data-ui=resume-save]")');
    const record = { format:1, savedAt:'2026-11-25T00:00:00.000Z', state:fixture,
      view:{page:'inquiries',developmentTab:'team',developmentOverview:false,coachPrep:3,coachIntro:4,
        coachTour:{version:2,visited:coachTourIds,active:null,skipped:false}} };
    await page.evaluate(`localStorage.setItem(${JSON.stringify(SAVE_KEY)},${JSON.stringify(JSON.stringify(record))})`);
    await page.send('Page.reload');
    await page.waitFor('!!document.querySelector("[data-ui=resume-save]")');
    await page.click('[data-ui="resume-save"]');
    const before = await currentState(page);
    assert.deepEqual(before,fixture);
    assert.equal(before.week,32);
    assert.equal(before.cash,153553);
    assert.equal(before.staff.length,1);
    const recommendation = await coach(page);
    assert.equal(recommendation.team,true);
    assert.match(recommendation.text,/建议聘用梁佳音.*9 笔盈利海外交付.*37,840/s);
    assert.match(recommendation.text,/最低余额 ¥90,821.*经营资金 ¥25,894/s);
    await page.click(`${selector} [data-page="company"][data-coach-tab="team"]`);
    assert.equal((await coach(page)).hire,true);
    await page.click(`${selector} [data-coach-action="hire"]`);
    assert.deepEqual(await currentState(page),before,'the assistant only locates the hire button');
    assert.ok(await page.evaluate('document.activeElement.matches("button[data-action=hire][data-id=liang]")'));

    // A real optional player choice consumes money needed for the staged
    // expansion. The assistant must not reuse the old hiring recommendation.
    await showProperty(page);
    await page.click('[data-action="buy-property"][data-id="city-flat"]');
    assert.equal((await currentState(page)).cash,before.cash-62000);
    await pause();
    await showTeam(page);
    const afterPurchase = await coach(page);
    assert.equal(afterPurchase.hire,false);
    assert.match(afterPurchase.text,/暂缓聘用.*37,840.*不能.*承担/s);
    const spent = await currentState(page);
    assert.deepEqual(spent.staff,before.staff);
    assert.deepEqual(spent.company.certs,before.company.certs);
    assert.deepEqual(spent.company.markets,before.company.markets);

    // Selling the same actual asset restores sufficient funding without
    // changing the history of delivered business; the opportunity returns.
    await showProperty(page);
    await page.click('[data-action="sell-property"][data-id="city-flat"]');
    await pause();
    await showTeam(page);
    const afterSale = await coach(page);
    assert.equal(afterSale.hire,true);
    assert.match(afterSale.text,/建议聘用梁佳音.*37,840.*最低余额 ¥81,521/s);
    const funded = await currentState(page);
    assert.equal(funded.cash,144253);
    assert.deepEqual(funded.staff,before.staff);
    await page.click(`${selector} [data-coach-action="hire"]`);
    assert.deepEqual(await currentState(page),funded);
    await page.click('[data-coach-confirmation][data-action="hire"][data-id="liang"]');
    const hired = await currentState(page);
    assert.ok(hired.staff.some(person=>person.id==='liang'&&person.role==='operations'));
    assert.equal(hired.staff.length,funded.staff.length+1);
    assert.equal(hired.week,funded.week);
    assert.equal(hired.cash,funded.cash,'weekly payroll starts at settlement; later stages have not been purchased');
    assert.deepEqual(hired.company.certs,funded.company.certs,'the certificate requires its own later decision');
    assert.deepEqual(hired.company.markets,funded.company.markets,'the market requires its own later decision');
    assert.ok(hired.loan===funded.loan);
    assert.deepEqual(page.errors,[]);
  } finally { await browser.close(); }
});
