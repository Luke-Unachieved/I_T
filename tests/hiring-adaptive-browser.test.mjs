import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';
import { act, forecast, netAssets } from '../v38/engine/game.js';
import { quoteCapacity } from '../v38/engine/quotes.js';
import { certProgress, decisionInfo, marketProgress } from '../v38/engine/expansion.js';
import { coachQuoteFilters, coachTourIds, eventCoach, pageCoach, quoteRecommendation, recordCoachReview } from '../v38/ui/coaching.js';
import { operatingReserve } from '../v38/ui/development-planner.js';

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

const buttons=html=>Array.from(html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs),match=>({
  ...Object.fromEntries(Array.from(match[1].matchAll(/([\w-]+)="([^"]*)"/g),([,name,value])=>[name,value])),
  label:match[2].replace(/<[^>]*>/g,'').replace(/&amp;/g,'&'),
}));

test('the actual week-32 checkpoint supports separate hiring, audit and market decisions under adaptive team capacity', {timeout:90000}, () => {
  let state=structuredClone(fixture);
  const ui={page:'inquiries',coachPrep:3,coachIntro:4,coachLearning:false,coachTour:{version:2,visited:coachTourIds,active:null,skipped:false},
    coachReview:{},filters:{category:'all',availability:'all'}};
  const trace=[],quotedByWeek={};
  const priorMarkets=new Set(state.company.markets);
  const apply=(action)=>{
    const before=state;
    const result=act(state,action);
    assert.ifError(result.error,JSON.stringify(action));
    state=result.state;
    trace.push({week:before.week,type:action.type,id:action.id,cashBefore:before.cash,cashAfter:state.cash});
    if(action.type==='hire'){
      assert.equal(state.cash,before.cash);
      assert.deepEqual(state.company.certs,before.company.certs);
      assert.deepEqual(state.company.markets,before.company.markets);
      assert.ok(quoteCapacity(state)>quoteCapacity(before));
    }
    if(action.type==='buy-cert'){
      const cert=certProgress(before,netAssets(before)).find(item=>item.id===action.id);
      assert.ok(cert?.available);
      assert.equal(state.cash,before.cash-cert.fee);
      assert.deepEqual(state.company.markets,before.company.markets);
    }
    if(['referral','open-market'].includes(action.type)){
      const market=marketProgress(before).find(item=>item.id===action.id);
      assert.ok(market?.eligible);
      assert.equal(state.cash,before.cash-(action.type==='referral'?market.referralFee:market.fee));
    }
    if(['hire','buy-cert','referral','open-market'].includes(action.type)){
      assert.equal(state.loan,before.loan);
      assert.ok(Math.min(state.cash,...forecast(state).flatMap(row=>[row.cash,row.hypothetical]))>=operatingReserve(state));
    }
  };
  // Do not force the old three-quote trace or any exact certification week.
  // Follow the current coach after every real state change; a strategic
  // expansion may reasonably be deferred or select a different market.
  for(let turns=0;turns<500&&state.week<fixture.week+10&&!state.company.markets.some(id=>!priorMarkets.has(id));turns++){
    if(state.summary){apply({type:'dismiss-summary'});continue;}
    if(state.events.length){
      const event=state.events[0],info=decisionInfo(state,event);
      const suggested=eventCoach(state,event,info.choices)?.id;
      const legal=info.choices.filter(choice=>!choice.disabled&&!act(state,{type:'resolve-event',eventId:event.id,choice:choice.id}).error);
      const choice=suggested??(legal.length===1?legal[0].id:null);
      assert.ok(choice,`No genuine event action for ${event.title}`);
      apply({type:'resolve-event',eventId:event.id,choice});continue;
    }
    const snapshot=structuredClone(state),html=pageCoach(state,ui),offers=buttons(html);
    assert.deepEqual(state,snapshot,'viewing current advice must not automatically act');
    const main=offers.find(button=>button.class?.split(' ').includes('coach-action'));
    assert.ok(main,`No primary recommendation at week ${state.week}`);
    // Quiet leisure and settlement are voluntary alternatives; choose the
    // actual settlement control when the current coach has no urgent work.
    const settlement=offers.find(button=>button['data-ui']==='coach-settlement');
    const action=settlement&&main['data-ui']==='coach-leisure-menu'?settlement:main;
    const route=action['data-ui'],id=action['data-id'];
    if(route==='page'){
      ui.page=action['data-page'];
      if(ui.page==='company'){
        ui.developmentTab=action['data-coach-tab']??ui.developmentTab;
        ui.developmentOverview=!action['data-coach-tab'];
      }
      if(ui.page==='office'&&action['data-coach-tab']==='cash-forecast')recordCoachReview(state,ui,'cash');
    }else if(route==='coach-review-cash'||route==='coach-focus-forecast'){
      ui.page='office';assert.ok(recordCoachReview(state,ui,'cash'));
    }else if(route==='coach-review-orders'){
      ui.page='orders';assert.ok(recordCoachReview(state,ui,id));
    }else if(route==='coach-target'){
      const type=action['data-coach-action']??action['data-coach-form'];
      assert.ok(type);
      apply({type,id,...(action['data-coach-amount']?{amount:Number(action['data-coach-amount'])}:{}),
        ...(action['data-choice']?{target:action['data-choice']}:{}),...(type==='withdraw-bid'?{inquiryId:id}:{}),
        ...(type==='liquidate'?{productId:id}:{})});
      const section={expedite:'orders-delivery',collect:'orders-receivables',sue:'orders-receivables',factor:'orders-receivables',liquidate:'orders-inventory'}[type];
      if(section&&ui.page==='orders')recordCoachReview(state,ui,section);
    }else if(route==='quote-open'){
      const inquiry=state.inquiries.find(item=>item.id===id);
      const offer=quoteRecommendation(state,inquiry,coachQuoteFilters(state,ui));
      assert.ok(offer?.offer.profit>0&&offer.cashFloor>=operatingReserve(state));
      assert.ok(state.bids.length<quoteCapacity(state));
      apply({type:'bid',inquiryId:id,...offer.config});
      quotedByWeek[state.week]=(quotedByWeek[state.week]??0)+1;
    }else if(route==='coach-select-outing')apply({type:'outing',id,choiceId:action['data-choice']});
    else if(route==='coach-settlement'){
      ui.page='offwork';apply({type:'end-week'});ui.page='inquiries';
    }else assert.fail(`Unexpected primary assistant route ${route} at week ${state.week}`);
  }
  const hired=trace.find(item=>item.type==='hire');
  const audit=trace.find(item=>item.type==='buy-cert'&&item.id==='audit');
  const market=trace.find(item=>['referral','open-market'].includes(item.type)&&!priorMarkets.has(item.id));
  assert.ok(hired&&audit&&market,`Staged progression did not complete: ${JSON.stringify(trace.filter(item=>['hire','buy-cert','referral','open-market'].includes(item.type)))}`);
  assert.ok(hired.week<audit.week&&audit.week<market.week,'each stage is independently recommended in a later week');
  assert.ok(Object.values(quotedByWeek).some(count=>count>3),'the actual continuation exercises more than three legal quotes');
  assert.ok(state.company.certs.includes('audit')&&state.company.markets.some(id=>!priorMarkets.has(id)));
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
