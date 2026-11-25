import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const options={skip:process.env.V38_BROWSER!=='1',timeout:120_000};
const coach='.workspace > .coach-card';
const saveKey=JSON.stringify(SAVE_KEY);
const saved=page=>page.evaluate(`JSON.parse(localStorage.getItem(${saveKey}))`);
const exists=selector=>`Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const c=(page,selector)=>page.click(`${coach} ${selector}`);
const nav=(page,id)=>page.click(`.nav [data-page=${id}]`);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function settle(page){
  if((await saved(page)).view.page!=='offwork')await nav(page,'offwork');
  await pause(430);await page.click('.week-controls [data-action=end-week]');
  await page.waitFor(exists('dialog.summary-dialog[open]'));
}
async function dismissEvents(page){
  for(let i=0;i<20&&await page.evaluate(exists('dialog[open]'));i++){
    const selector=await page.evaluate(exists('dialog [data-action=resolve-event].coach-action:not(:disabled)'))?'dialog [data-action=resolve-event].coach-action:not(:disabled)':'dialog [data-action=resolve-event]:not(:disabled)';
    if(!await page.evaluate(exists(selector)))break;
    await pause(430);await page.click(selector);
  }
  assert.equal(await page.evaluate(exists('dialog[open]')),false);
}
async function assertRecord(page,label,id,width){
  await page.screenshot(`/tmp/v38-first-record-${width}-${id}.png`);
  const record=await page.evaluate(`(()=>{const t=document.querySelector('table[aria-label=${JSON.stringify(label)}]');const row=t?.querySelector('tbody tr');const link=t?.closest('.table-wrap')?.previousElementSibling?.querySelector('[data-ui=coach-review-next]');const r=row?.getBoundingClientRect();const dock=document.querySelector('.nav')?.getBoundingClientRect();return {open:!!t&&!t.closest('details:not([open])'),focused:document.activeElement===t,outlined:t?.classList.contains('tutorial-target'),rowVisible:!!r&&r.top>=0&&r.top+Math.min(60,r.height)<dock.top,linkVisible:!!link&&link.getBoundingClientRect().top>=0&&link.getBoundingClientRect().bottom<dock.top};})()`);
  assert.deepEqual(record,{open:true,focused:true,outlined:true,rowVisible:true,linkVisible:true},`${label} data and onward action should both be visible on the actual phone`);
  assert.ok((await saved(page)).view.coachFirstViews.includes(id));
}

for(const width of [320,390])test(`first real data views are primary once, show the actual records and preserve progress at ${width}px`,options,async()=>{
  const browser=await launchBrowser(root);
  try{
    const page=await browser.page({width,height:width===320?568:844,mobile:true});
    await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    await page.evaluate(`(()=>{const prior=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{if(a instanceof Uint32Array&&a.length===1){a[0]=381;return a;}return prior(a);};const field=document.querySelector('[name=difficulty]');field.value='casual';field.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await page.fill('[data-form=new-game] input[name=name]','首轮关键账表验收');
    await page.click('[data-form=new-game] button[type=submit]');
    assert.equal((await saved(page)).view.coachLearning,true);
    assert.deepEqual((await saved(page)).view.coachFirstViews,[]);
    assert.equal(await page.evaluate(exists(`${coach} [data-ui=skip-tutorial],${coach} [data-ui^=coach-skip-prep],${coach} [data-ui=coach-skip-intro]`)),false);
    await nav(page,'inquiries');await page.click('article[data-inquiry-id=w1-1] [data-ui=quote-open]');
    await page.evaluate('document.querySelector("dialog [name=ratio]").focus()');
    await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
    await page.click('dialog form[data-form=quote] button[type=submit]');
    assert.equal((await saved(page)).state.bids.length,1);
    assert.ok(await page.evaluate(exists(`${coach} .coach-action[data-ui=coach-review-cash]`)));
    await nav(page,'office');
    assert.equal((await saved(page)).view.coachPrep,0);
    assert.deepEqual((await saved(page)).view.coachFirstViews,[]);
    assert.equal(await page.evaluate(exists('.forecast-panel [data-coach-tab=finance]')),false);
    await page.send('Page.reload');await page.waitFor(exists('[data-ui=resume-save]'));await page.click('[data-ui=resume-save]');
    assert.equal((await saved(page)).view.coachPrep,0);
    assert.ok(await page.evaluate(exists(`${coach} .coach-action[data-ui=coach-review-cash]`)));
    await c(page,'[data-ui=coach-review-cash]');
    assert.ok(await page.evaluate('document.activeElement.matches(".forecast-chart-balance")'));
    assert.equal((await saved(page)).view.coachPrep,1);
    assert.deepEqual((await saved(page)).view.coachFirstViews,['cash']);
    assert.ok(await page.evaluate(exists('.forecast-panel [data-coach-tab=finance]')));
    await c(page,'[data-ui=coach-pause-learning]');
    assert.equal((await saved(page)).view.coachLearning,false);
    assert.equal(await page.evaluate(exists(`${coach} .coach-action[data-ui=coach-review-cash]`)),false,'already viewed cash does not force another visit after pause');

    await settle(page);
    assert.ok((await saved(page)).state.orders.length);
    if(width===320){
      // The direct first-order summary route must show the actual row, not
      // the top-level Orders heading with the record off-screen.
      await page.click('dialog [data-ui=view-first-order]');
    }else{
      await page.click('dialog [data-ui=close-dialog]');await dismissEvents(page);
      assert.ok(await page.evaluate(exists(`${coach} .coach-action[data-ui=coach-review-orders][data-first-view=orders-delivery]`)));
      await c(page,'[data-first-view=orders-delivery]');
    }
    await assertRecord(page,'待交付订单','orders-delivery',width);
    const original=(await saved(page)).state;
    await page.click('[data-ui=coach-review-next]');assert.deepEqual((await saved(page)).state,original);

    // Advance real business without additional bids. Reject the optional
    // summary shortcut; the assistant must still suggest the first data view.
    for(let n=0;n<8;n++){
      const record=await saved(page);
      if(record.state.receivables.some(x=>x.status==='paid'))break;
      await settle(page);await page.click('dialog [data-ui=close-dialog]');await dismissEvents(page);
      const after=await saved(page);
      if(after.state.receivables.some(x=>['open','overdue'].includes(x.status))&&!after.view.coachFirstViews.includes('receivables-open')){
        assert.ok(await page.evaluate(exists(`${coach} .coach-action[data-first-view=receivables-open]`)));
        await c(page,'[data-first-view=receivables-open]');
        await assertRecord(page,'未结应收账款','receivables-open',width);
      }
    }
    assert.ok((await saved(page)).state.receivables.some(x=>x.status==='paid'));
    assert.ok(await page.evaluate(exists(`${coach} .coach-action[data-first-view=receivables-paid]`)));
    await c(page,'[data-first-view=receivables-paid]');
    await assertRecord(page,'最近回款','receivables-paid',width);
    const final=(await saved(page)).view.coachFirstViews;
    assert.deepEqual(final.filter(x=>['cash','orders-delivery','receivables-open','receivables-paid'].includes(x)),['cash','orders-delivery','receivables-open','receivables-paid']);
    assert.equal(await page.evaluate(exists(`${coach} [data-first-view=receivables-paid]`)),false);
    await page.send('Page.reload');await page.waitFor(exists('[data-ui=resume-save]'));await page.click('[data-ui=resume-save]');
    assert.deepEqual((await saved(page)).view.coachFirstViews,final);
    assert.equal(await page.evaluate(exists(`${coach} [data-first-view=receivables-paid]`)),false);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});
