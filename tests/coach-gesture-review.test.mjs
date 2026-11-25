import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const options={skip:process.env.V38_BROWSER!=='1',timeout:120_000};
const coach='.workspace > .coach-card';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const exists=selector=>`Boolean(document.querySelector(${JSON.stringify(selector)}))`;
async function tap(page,point,clickCount=1){
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount});
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount});
}
async function pointFor(page,selector){
  return page.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});b.scrollIntoView({block:'center',behavior:'instant'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
}

for(const width of [320,390])test(`guided review opens and focuses the only recent paid record at ${width}px`,options,async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width,height:width===320?568:844,mobile:true});
    await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    // Run a real contract all the way to customer payment; no open invoices
    // remain, so the relevant table is in its normally collapsed history.
    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'bid',inquiryId:s.inquiries[0].id,source:'stock',ratio:80}).state;for(let n=0;n<10&&!s.receivables.some(x=>x.status==='paid');n++){s=game.act(s,{type:'end-week'}).state;while(s.events.length){const e=s.events[0];const r=e.choices.map(c=>game.act(s,{type:'resolve-event',eventId:e.id,choice:c.id})).find(r=>!r.error);if(!r)throw Error('event');s=r.state;}s=game.act(s,{type:'dismiss-summary'}).state;}if(!s.receivables.some(x=>x.status==='paid'))throw Error('no actual paid invoice');s.inquiries=[];s.tutorial.done=true;return s;}`);
    await page.click(`${coach} [data-ui=coach-skip-intro]`);
    const before=await currentState(page);
    await page.click(`${coach} [data-ui=coach-review-orders][data-id=orders-receivables]`);
    const evidence=await page.evaluate(`(()=>{const table=document.querySelector('#orders-receivables table[aria-label="最近回款"]');const link=document.querySelector('#orders-receivables [data-ui=coach-review-next]');const rect=link.getBoundingClientRect();return {hidden:!!table.closest('details:not([open])'),focused:document.activeElement===table,highlighted:table.classList.contains('tutorial-target'),returnVisible:rect.top>=0&&rect.bottom<document.querySelector('.nav').getBoundingClientRect().top};})()`);
    assert.deepEqual(evidence,{hidden:false,focused:true,highlighted:true,returnVisible:true});
    assert.deepEqual(await currentState(page),before);
    await page.screenshot(`/tmp/v38-visible-paid-review-${width}.png`);
    await page.click('#orders-receivables [data-ui=coach-review-next]');
    assert.ok(await page.evaluate(`document.activeElement.matches('${coach} .coach-action')`));
    assert.deepEqual(await currentState(page),before);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});

test('two rapidly tapped consecutive decisions never auto-resolve the second, and the guard visibly explains the retry',options,async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:390,height:844,mobile:true});
    await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    // Two independently queued buyer requests use the same actual event
    // definition and operate on a real awarded contract. Their identical
    // labels/positions reproduce the no-response seen in the live 16-week run.
    await loadScenario(page,`async game=>{const {TRADE_EVENTS}=await import('/v38/data/events.js');let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'bid',inquiryId:s.inquiries[0].id,source:'stock',ratio:80}).state;s=game.act(s,{type:'end-week'}).state;s.summary=null;s.cash=120000;s.inquiries=[];s.events=['first','second'].map(id=>({...TRADE_EVENTS.find(item=>item.id==='add-order'),id,code:'add-order',type:'trade-event',orderId:s.orders[0].id}));s.tutorial.done=true;return s;}`);
    await page.click(`${coach} [data-ui=show-event]`);
    const selector='dialog [data-action=resolve-event].coach-action';
    const point=await pointFor(page,selector);
    await tap(page,point);
    assert.equal(await page.evaluate(`document.elementFromPoint(${point.x},${point.y})?.closest('button')?.dataset.id`),'second','actual next event button is at the same point');
    await tap(page,point,2);
    assert.deepEqual((await currentState(page)).events.map(e=>e.id),['second']);
    const feedback=await page.evaluate(`(()=>{const b=document.querySelector('dialog .gesture-feedback');const r=b?.getBoundingClientRect();return {text:b?.textContent,role:b?.getAttribute('role'),hitSafe:b&&getComputedStyle(b).pointerEvents==='none',visible:r&&r.top>=0&&r.bottom<=innerHeight};})()`);
    assert.deepEqual(feedback,{text:'上一项已处理，请稍候再确认这一项。',role:'status',hitSafe:true,visible:true});
    await page.screenshot('/tmp/v38-rapid-event-feedback-390.png');
    await pause(450);
    await page.click(selector);
    assert.deepEqual((await currentState(page)).events,[]);
    assert.equal(await page.evaluate(exists('dialog .gesture-feedback')),false);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});

test('a newly exposed assistant navigation accepts an immediate same-position separate tap after a real operation',options,async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:320,height:568,mobile:true});
    await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    const fixture=`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93}).state;for(let n=0;n<10&&!s.receivables.some(x=>x.status==='open');n++){s=game.act(s,{type:'end-week'}).state;s.summary=null;s.events=[];}const bill=s.receivables.find(x=>x.status==='open');bill.status='overdue';bill.originalDueWeek=s.week-1;bill.dueWeek=s.week+2;s.cash=160000;s.loan=6000;s.creditLine=game.creditLimit(s);s.inquiries=[];s.energy=100;s.tutorial.done=true;return s;}`;
    const prepare=async()=>{await loadScenario(page,fixture);await page.click(`${coach} [data-page=orders]`);await page.click(`${coach} [data-coach-action=collect]`);};
    await prepare();
    await page.click('[data-action=collect]');
    const destination=`${coach} [data-page=company][data-coach-tab=finance]`;
    const future=await page.evaluate(`document.querySelector(${JSON.stringify(destination)}).getBoundingClientRect().toJSON()`);
    // Replay the identical state. The real invoice button and the following
    // finance recommendation overlap on a small screen after guided scrolling.
    await prepare();
    const point=await page.evaluate(`(()=>{const b=document.querySelector('[data-action=collect]');let r=b.getBoundingClientRect();scrollBy(0,r.y+r.height/2-${future.y+future.height/2});r=b.getBoundingClientRect();const left=Math.max(r.left,${future.left}),right=Math.min(r.right,${future.right});const top=Math.max(r.top,${future.top}),bottom=Math.min(r.bottom,${future.bottom});if(right<=left||bottom<=top)throw Error('expected actual control overlap');return{x:(left+right)/2,y:(top+bottom)/2};})()`);
    await tap(page,point);
    assert.equal(await page.evaluate(`document.elementFromPoint(${point.x},${point.y})?.closest('button')?.dataset.page`),'company');
    const collected=await currentState(page);
    assert.ok(collected.receivables.some(item=>item.reminderWeek===collected.week));
    await tap(page,point);
    assert.ok(await page.evaluate(exists('.nav [data-page=company][aria-current=page]')),'distinct assistant navigation must not be ignored');
    assert.deepEqual(await currentState(page),collected,'the navigation never performs the proposed repayment');
    assert.equal(await page.evaluate(exists('.gesture-feedback')),false);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});
