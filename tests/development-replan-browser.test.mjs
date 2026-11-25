import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const enabled=process.env.V38_BROWSER==='1';
const coach='.workspace > .coach-card';
const visible=selector=>`Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const saved=page=>page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`);
const overview=page=>page.click('.nav [data-page=company]');

// Isolate an established, debt-free company with actual-shaped factory
// contracts and a proven production history. Historical data is a fixture;
// every page visit and subsequent deferral uses real visible browser controls.
function matureFactoryCompany(game) {
  const initial=game.newGame({difficulty:'casual',seed:381});
  const won=game.act(game.act(initial,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93}).state,{type:'end-week'}).state.orders[0];
  if(!won)throw Error('Expected factory contract');
  initial.week=13;initial.cash=1500000;initial.company.rep=90;initial.inquiries=[];initial.tutorial.done=true;
  initial.orders=Array.from({length:24},(_,i)=>{
    const week=Math.floor(i/2)+1;
    return {...structuredClone(won),id:`historical-${i}`,productId:i%2?'carafe':'umbrella',staffId:null,status:'settled',contractWeek:week,deliveredWeek:week,dueWeek:week+1,deliverWeek:week,expectedPayWeek:week,productionLeft:0,shippingLeft:0,total:250000,foreignTotal:250000,cost:200000,shipping:2000,deposit:50000,workingCapital:152000,profit:48000,probability:1};
  });
  initial.history=Array.from({length:12},(_,i)=>({week:i+1,cash:1500000,loan:0,receivables:0,orders:0,profit:80000,revenue:500000,inflow:500000,outflow:420000,rep:90,macro:{...initial.macro},rank:1,valuation:1500000}));
  initial.cumulativeRevenue=6000000;initial.year.deliveries=24;initial.year.revenue=6000000;initial.year.profit=960000;
  return initial;
}

async function getRecommendation(page) {
  return page.evaluate(`(()=>{const c=document.querySelector('${coach}');const defer=c.querySelector('[data-ui=coach-defer-task]');return {title:c.querySelector('h3').textContent,key:defer?.dataset.id??null,route:c.querySelector('[data-coach-tab]')?.dataset.coachTab??null,text:c.innerText};})()`);
}

for(const viewport of [{width:390,height:844,mobile:true},{width:320,height:568,mobile:true}]) {
  test(`development rechecks the next safe candidate after same-week deferrals, including local tabs at ${viewport.width}px`,{skip:!enabled,timeout:120000},async()=>{
    const browser=await launchBrowser(root,{scenarios:true});
    try {
      const page=await browser.page(viewport);
      await page.goto();
      await page.waitFor(visible('[data-form=new-game]'));
      await loadScenario(page,`(${matureFactoryCompany.toString()})`);
      await overview(page);
      await page.evaluate(`(()=>{const key=${JSON.stringify(SAVE_KEY)},record=JSON.parse(localStorage.getItem(key));record.view.coachTour={version:2,visited:[],active:null,skipped:true};record.view.coachPrep=3;localStorage.setItem(key,JSON.stringify(record));})()`);
      await page.send('Page.reload');
      await page.waitFor(visible('[data-ui=resume-save]'));
      await page.click('[data-ui=resume-save]');
      const before=await currentState(page);
      assert.equal(before.loan,0);
      const first=await getRecommendation(page);
      assert.ok(first.key?.startsWith('growth:'),first.text);
      assert.notEqual(first.route,'team','this fixture has stronger initial candidates from two factory categories and an export certificate');

      // Opening the team tab deliberately must compare the locally justified
      // hire even when it sits outside the global three-candidate shortlist.
      await page.click('[data-ui=development-tab][data-id=team]');
      const local=await getRecommendation(page);
      await page.screenshot(`/tmp/v38-replan-team-local-${viewport.width}.png`);
      assert.match(local.title,/建议聘用/,`eligible local hire omitted: ${local.text}`);
      assert.ok(local.key?.startsWith('growth:hire:'),local.text);
      const hireKey=local.key;
      assert.ok(await page.evaluate(visible(`${coach} [data-coach-action=hire]`)));
      assert.deepEqual(await currentState(page),before);

      // Do not spend or advance. Say "not this week" to each other
      // recommended project and ensure the assistant compares what remains.
      await overview(page);
      const declined=[];
      for(let i=0;i<4;i++){
        const next=await getRecommendation(page);
        if(next.key===hireKey)break;
        assert.ok(next.key?.startsWith('growth:'),`remaining hire never compared after ${declined.join(', ')}: ${next.text}`);
        assert.ok(!declined.includes(next.key),'a declined action must not be repeated');
        declined.push(next.key);
        await page.click(`${coach} [data-ui=coach-defer-task]`);
        assert.deepEqual(await currentState(page),before,'deferring does not execute or spend');
      }
      assert.equal((await getRecommendation(page)).key,hireKey,'remaining locally verified hire should become the next global recommendation');
      await page.screenshot(`/tmp/v38-replan-next-hire-${viewport.width}.png`);
      assert.deepEqual((await saved(page)).view.coachDeclined.tasks,declined);
      await page.send('Page.reload');
      await page.waitFor(visible('[data-ui=resume-save]'));
      await page.click('[data-ui=resume-save]');
      assert.equal((await getRecommendation(page)).key,hireKey,'reload preserves declines, but not a frozen obsolete shortlist');
      await page.click(`${coach} [data-coach-tab=team]`);
      assert.equal((await getRecommendation(page)).key,hireKey);
      await page.click(`${coach} [data-ui=coach-defer-task]`);
      assert.ok(!(await getRecommendation(page)).key?.startsWith('growth:hire:'),'declined hire stays available as a manual choice, not an enforced recommendation');
      assert.match((await getRecommendation(page)).text,/本周选择暂缓.*仍可自行办理/);
      assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
      assert.deepEqual(await currentState(page),before);
      assert.deepEqual(page.errors,[]);
    } finally {await browser.close();}
  });
}

for(const viewport of [{width:390,height:844,mobile:true},{width:320,height:568,mobile:true}]) {
  test(`material cash changes invalidate an acknowledged forecast but minor leisure does not at ${viewport.width}px`,{skip:!enabled,timeout:120000},async()=>{
    const browser=await launchBrowser(root,{scenarios:true});
    try {
      const page=await browser.page(viewport);
      await page.goto();
      await page.waitFor(visible('[data-form=new-game]'));
      await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93}).state;s=game.act(s,{type:'end-week'}).state;s.summary=null;s.events=[];s.inquiries=[];s.tutorial.done=true;s.cash=90000;return s;}`);
      const nav=id=>page.click(`.nav [data-page=${id}]`);
      await nav('office');
      await page.evaluate(`(()=>{const key=${JSON.stringify(SAVE_KEY)},record=JSON.parse(localStorage.getItem(key));record.view.coachTour={version:2,visited:[],active:null,skipped:true};record.view.coachPrep=3;localStorage.setItem(key,JSON.stringify(record));})()`);
      await page.send('Page.reload');await page.waitFor(visible('[data-ui=resume-save]'));await page.click('[data-ui=resume-save]');
      // Acknowledge the actual awarded order and its existing forecast.
      for(let i=0;i<6;i++){
        const next=await page.evaluate(`(()=>{const b=document.querySelector('${coach} [data-ui=coach-review-orders],${coach} [data-ui=coach-review-cash]');return b?{ui:b.dataset.ui,id:b.dataset.id??null}:null;})()`);
        if(!next)break;
        await page.click(`${coach} [data-ui=${next.ui}]${next.id?'[data-id='+next.id+']':''}`);
        if(await page.evaluate(visible('[data-ui=coach-review-next]')))await page.click('[data-ui=coach-review-next]');
      }
      await nav('office');
      const initial=await saved(page);
      assert.equal(initial.state.cash,90000);
      assert.ok(initial.view.coachReview.cash);
      assert.match(await page.evaluate('document.querySelector(".forecast-panel").innerText'),/¥77,513/);
      assert.ok(!await page.evaluate(visible(`${coach} [data-ui=coach-review-cash]`)));
      await page.screenshot(`/tmp/v38-replan-cash-before-${viewport.width}.png`);
      // An actual large discretionary expense without changing contract IDs
      // cut the future cash minimum by ¥62,000. This must not reuse the old
      // forecast acknowledgement; no new loan or expenditure is mandatory.
      await nav('offwork');
      await page.click('[data-ui=life-app][data-id=property]');
      await page.click('[data-action=buy-property][data-id=city-flat]');
      const spent=await currentState(page);
      assert.equal(spent.cash,28000);
      assert.equal(spent.loan,initial.state.loan);
      assert.deepEqual(spent.orders,initial.state.orders);
      await nav('office');
      assert.match(await page.evaluate('document.querySelector(".forecast-panel").innerText'),/¥15,513/);
      const changed=await getRecommendation(page);
      await page.screenshot(`/tmp/v38-replan-cash-after-${viewport.width}.png`);
      assert.match(changed.title,/重新核对现金预测/,`stale forecast acknowledgement: ${changed.text}`);
      assert.match(changed.text,/¥77,513.*¥15,513/);
      await page.click(`${coach} [data-ui=coach-review-cash]`);
      assert.ok(await page.evaluate(visible('.forecast-panel [data-ui=coach-review-next]')));
      const reviewed=await saved(page);
      assert.equal(reviewed.view.coachReview.cash.balance,28000);
      assert.equal(reviewed.view.coachReview.cash.floor,15513);
      assert.deepEqual(reviewed.state,spent,'reviewing the changed forecast must not spend or borrow');
      await page.click('.forecast-panel [data-ui=coach-review-next]');
      assert.ok(!await page.evaluate(visible(`${coach} [data-ui=coach-review-cash]`)));
      // Returning from a small ¥240 outing is not another forced review;
      // the prior acknowledged cash remains the comparison baseline.
      await nav('offwork');
      await page.click('[data-ui=life-app][data-id=friends]');
      await page.click('#life-friends-streets > summary');
      await page.click('[data-life-id=flower-market] > summary');
      await page.click('[data-action=outing][data-id=flower-market]');
      assert.equal((await currentState(page)).cash,27760);
      await nav('office');
      assert.ok(!await page.evaluate(visible(`${coach} [data-ui=coach-review-cash]`)), 'small discretionary spending should not repeat the forecast review');
      assert.deepEqual((await saved(page)).view.coachReview.cash,reviewed.view.coachReview.cash);
      await page.send('Page.reload'); await page.waitFor(visible('[data-ui=resume-save]')); await page.click('[data-ui=resume-save]');
      assert.ok(!await page.evaluate(visible(`${coach} [data-ui=coach-review-cash]`)),'unchanged acknowledgement survives reload');
      assert.equal((await currentState(page)).cash,27760);
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}
