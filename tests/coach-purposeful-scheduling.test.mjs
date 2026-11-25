import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const enabled=process.env.V38_BROWSER==='1';
const coach='.workspace > .coach-card';
const exists=selector=>`Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const storage=`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`;
const saved=page=>page.evaluate(storage);
const c=(page,selector)=>page.click(`${coach} ${selector}`);

async function actualQuote(page){
  if(await page.evaluate(exists('dialog [data-ui=coach-apply-quote]')))await page.click('dialog [data-ui=coach-apply-quote]');
  await page.click('dialog [data-ui=coach-review-submit]');
  await page.click('dialog form[data-form=quote] button[type=submit]:not(:disabled)');
}

for(const viewport of [{width:320,height:568,mobile:true},{width:390,height:844,mobile:true}]){
  test(`ordinary simple-mode coaching pursues actual business without forced educational detours at ${viewport.width}px`,{skip:!enabled,timeout:120_000},async()=>{
    const browser=await launchBrowser(root);
    try{
      const page=await browser.page(viewport);
      await page.goto();await page.waitFor(exists('[data-form=new-game]'));
      await page.evaluate('(()=>{const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{if(a instanceof Uint32Array&&a.length===1){a[0]=381;return a;}return random(a);};})()');
      await page.fill('[name=name]','按经营需要引导验收');
      await page.click('[data-form=new-game] button[type=submit]');
      assert.equal((await saved(page)).state.difficulty,'casual');
      await c(page,'[data-page=inquiries]');await c(page,'[data-ui=quote-open]');await actualQuote(page);
      const first=await saved(page);
      assert.equal(first.state.bids.length,1);assert.equal(first.view.coachLearning,false);assert.equal(first.view.coachPrep,0);
      assert.ok(await page.evaluate(exists(`${coach} .coach-action[data-ui=quote-open]`)), 'continue a useful next bid rather than tour unrelated pages');
      assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-start-learning].quiet`)), 'learning remains explicitly available');
      assert.equal(await page.evaluate(exists(`${coach} [data-coach-tab=cash-forecast]`)),false);
      await c(page,'[data-ui=coach-start-learning]');assert.equal((await saved(page)).view.coachLearning,true);
      await c(page,'[data-page=office][data-coach-tab=cash-forecast]');assert.equal((await saved(page)).view.coachPrep,1);
      await c(page,'[data-ui=coach-pause-learning]');assert.equal((await saved(page)).view.coachLearning,false);
      assert.equal(await page.evaluate(exists('.forecast-panel [data-coach-tab=finance]')),false,'paused learning cannot leave a forced lesson below the graph');
      assert.deepEqual((await saved(page)).state,first.state,'learning and pausing never change business');
      assert.ok(await page.evaluate(exists(`${coach} [data-page=inquiries]`)));
      await page.send('Page.reload');await page.waitFor(exists('[data-ui=resume-save]'));await page.click('[data-ui=resume-save]');
      assert.equal((await saved(page)).view.coachLearning,false);assert.equal((await saved(page)).view.coachPrep,1);
      assert.ok(await page.evaluate(exists(`${coach} [data-page=inquiries]`)), 'refresh resumes business not a paused tour');
      await c(page,'[data-page=inquiries]');
      for(let i=0;i<2;i++){await c(page,'[data-ui=quote-open]');await actualQuote(page);}
      assert.equal((await saved(page)).state.bids.length,3);
      const ready=await saved(page);
      assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-settlement].coach-action`)), 'no remaining profitable quote slot: direct settlement is a real option');
      assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-leisure-menu].coach-action`)));
      assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-review-cash].coach-action`)),false,'read-only cash review is not a forced tour');
      await c(page,'[data-ui=coach-settlement]');
      assert.equal((await saved(page)).state.week,ready.state.week);
      await page.click('.week-controls [data-action=end-week]');
      assert.equal((await saved(page)).state.week,2);
      if(await page.evaluate(exists('dialog [data-ui=view-first-order]')))await page.click('dialog [data-ui=view-first-order]');
      else await page.click('dialog [data-ui=close-dialog]');
      while(await page.evaluate(exists('dialog [data-action=resolve-event]'))){
        const selector=await page.evaluate(exists('dialog [data-action=resolve-event].coach-action:not(:disabled)'))?'dialog [data-action=resolve-event].coach-action:not(:disabled)':'dialog [data-action=resolve-event]:not(:disabled)';await page.click(selector);
      }
      const post=await saved(page);
      assert.ok(post.state.orders.length>0);assert.equal(post.view.coachLearning,false);assert.deepEqual(post.view.coachTour.visited,[]);
      assert.equal(await page.evaluate(exists(`${coach} [data-coach-intro-next]`)),false,'first contract does not require a 13-page checklist');
      await page.click('.nav [data-page=company]');
      assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-start-learning]`)), 'all lessons can still be started voluntarily');
      await c(page,'[data-ui=coach-start-learning]');assert.equal((await saved(page)).view.coachLearning,true);
      assert.ok(await page.evaluate(exists(`${coach} [data-coach-intro-next]`)));
      await c(page,'[data-ui=coach-pause-learning]');assert.equal((await saved(page)).view.coachLearning,false);
      assert.equal(await page.evaluate(exists(`${coach} [data-coach-intro-next]`)),false);
      assert.deepEqual((await saved(page)).state,post.state);
      await page.screenshot(`/tmp/v38-purposeful-coaching-${viewport.width}.png`);
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}

test('routine progress review is optional; genuine overdue work takes priority over quoting or learning',{skip:!enabled,timeout:90_000},async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:390,height:844,mobile:true});await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'bid',inquiryId:'w1-1',source:'stock',ratio:80}).state;for(let i=0;i<3;i++){s=game.act(s,{type:'end-week'}).state;s.summary=null;s.events=[];}s.inquiries=[];s.tutorial.done=true;const invoice=s.receivables[0];invoice.status='overdue';invoice.originalDueWeek=s.week-1;invoice.dueWeek=s.week+5;s.cash=150000;s.creditLine=game.creditLimit(s);return s;}`);
    const before=await currentState(page),invoice=before.receivables.find(x=>x.status==='overdue');assert.ok(invoice);
    await page.click('.nav [data-page=office]');
    assert.ok(await page.evaluate(exists(`${coach} .coach-action[data-page=orders][data-coach-tab=orders-receivables]`)), 'genuine overdue work before everything else');
    assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-start-learning]`)),false,'urgent real work does not compete with tutorial');
    await c(page,'[data-page=orders][data-coach-tab=orders-receivables]');await c(page,'[data-coach-action=collect]');await page.click(`[data-action=collect][data-id="${invoice.id}"]`);
    const after=await currentState(page);assert.equal(after.receivables.find(x=>x.id===invoice.id).reminderWeek,after.week);
    await page.click('.nav [data-page=office]');
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-action=collect]`)),false);
    assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-settlement].coach-action`)), 'once actual work is done, permit quiet-week choice');
    assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-review-orders].quiet,${coach} [data-ui=coach-review-cash].quiet`)));
    assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-review-orders].coach-action`)),false);
    await c(page,'[data-ui=coach-settlement]');await page.click('.week-controls [data-action=end-week]');assert.equal((await currentState(page)).week,after.week+1);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});
