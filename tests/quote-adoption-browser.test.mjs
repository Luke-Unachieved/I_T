import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { quoteRecommendation, coachQuoteFilters } from '../v38/ui/coaching.js';
import { SAVE_KEY } from '../v38/ui/save.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const options={skip:process.env.V38_BROWSER!=='1',timeout:120_000};
const exists=selector=>`Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const storage=`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`;
const adopt='dialog [data-ui=coach-apply-quote]';
const review='dialog [data-ui=coach-review-submit]';

async function touch(page,point){
  await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function visibleButtonPoint(page, selector) {
  const point = await page.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b)throw Error('Missing touch target');const r=b.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,hit:document.elementFromPoint(x,y)?.closest('button')===b};})()`);
  assert.equal(point.hit, true, `the actual touch must hit ${selector}`);
  return { x: point.x, y: point.y };
}
async function editOrdinaryPrice(page) {
  await page.evaluate('document.querySelector("dialog [name=ratio]").focus()');
  await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  assert.equal((await modelFromForm(page)).ratio,80);
}
async function modelFromForm(page){
  return page.evaluate(`(()=>{const f=document.querySelector('dialog form[data-form=quote]');const e=f.elements;return{source:e.source.value,ratio:e.ratio?Number(e.ratio.value):null,extraTerms:Number(e.extraTerms.value),staffId:e.staffId?.value??'',financing:e.financing?.value??'standard',branded:e.branded?.checked??false,brandUnitPrice:e.brandUnitPrice?Number(e.brandUnitPrice.value):null};})()`);
}
function expectedForm(config){
  return {...config,ratio:config.branded?null:config.ratio,brandUnitPrice:config.branded?config.brandUnitPrice:null};
}
async function assertReviewVisible(page){
  const result=await page.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(review)});const r=b.getBoundingClientRect();const header=document.querySelector('dialog .trade-header').getBoundingClientRect();const title=document.querySelector('dialog .coach-card h3');const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{title:title.textContent,body:document.querySelector('dialog .coach-card p').textContent,reachable:r.top>=header.bottom&&r.bottom<=innerHeight&&hit?.closest('button')===b,focused:document.activeElement===b};})()`);
  assert.equal(result.title,'已采用当前建议方案');
  assert.match(result.body,/报价表已填入，尚未提交/);
  assert.equal(result.reachable,true,'the changed card must not disappear behind the sticky buyer header');
  return result;
}

for(const {width,height,brand} of [{width:320,height:568,brand:false},{width:390,height:844,brand:true}]){
  test(`touching adopt on a scrolled edited quote visibly confirms exact ${brand?'overseas branded':'domestic'} plan at ${width}px`,options,async()=>{
    const browser=await launchBrowser(root,{scenarios:true});
    try{
      const page=await browser.page({width,height,mobile:true});
      await page.goto();await page.waitFor(exists('[data-form=new-game]'));
      await loadScenario(page,brand?`game=>{let s=game.newGame({difficulty:'casual',seed:381});s.cash=1000000;s.company.rep=95;s.company.certs=['export','audit','supplier','brand'];s.company.markets=['domestic','se-asia'];s.ventures.brand=3;s=game.act(s,{type:'end-week'}).state;s.summary=null;s.events=[];s.tutorial.done=true;return s;}`:`game=>{const s=game.newGame({difficulty:'casual',seed:381});s.tutorial.done=true;return s;}`);
      await page.click('.nav [data-page=inquiries]');
      if(brand){
        const s=await currentState(page);
        const inquiry=s.inquiries.find(item=>item.id==='w2-4');
        assert.ok(inquiry&&inquiry.currency==='USD');
        // Explicitly select the actual product category before opening this
        // eligible thread (the plan must use the same persisted filter).
        await page.evaluate(`(()=>{const field=document.querySelector('[data-ui=inquiry-filter][name=category]');field.value=${JSON.stringify(inquiry.category)};field.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await page.click('article[data-inquiry-id=w2-4] [data-ui=quote-open]');
      }else await page.click('.coach-card [data-ui=quote-open]');
      const state=await currentState(page);
      const saved=await page.evaluate(storage);
      const inquiry=state.inquiries.find(item=>item.id===saved.view.quote.id);
      const expected=quoteRecommendation(state,inquiry,coachQuoteFilters(state,saved.view));
      assert.ok(expected);
      assert.equal(expected.config.branded,brand);

      // Change the actual standard-price slider, making the manually edited
      // assistant explanation longer. Then scroll until only its adopt button
      // is just below the sticky header, as on a real phone.
      await editOrdinaryPrice(page);
      await page.waitFor(exists(adopt));
      const target=await page.evaluate(`(()=>{const d=document.querySelector('dialog');const b=d.querySelector('[data-ui=coach-apply-quote]');const h=d.querySelector('.trade-header');let r=b.getBoundingClientRect();d.scrollTop+=r.top-h.getBoundingClientRect().bottom-6;r=b.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,hit:document.elementFromPoint(x,y)?.closest('button')===b,scroll:d.scrollTop};})()`);
      assert.ok(target.hit&&target.scroll>100,'actual visible old adopt control just under sticky title');
      await touch(page,{x:target.x,y:target.y});
      const response=await assertReviewVisible(page);
      assert.equal(response.focused,true);
      assert.deepEqual(await modelFromForm(page),expectedForm(expected.config));
      assert.deepEqual((await page.evaluate(storage)).view.quote.proposal,expected.config);
      assert.deepEqual(await currentState(page),state,'adopting affects draft, not game state or bids');
      await page.screenshot(`/tmp/v38-adopt-visible-${width}.png`);

      // The current accepted draft is recoverable, with no need to tap adopt
      // again. The next arrow leads to the real confirmation, not a submission.
      await page.send('Page.reload');
      await page.waitFor(exists('[data-ui=resume-save]'));
      await page.click('[data-ui=resume-save]');
      assert.ok(await page.evaluate(exists(review)));
      assert.deepEqual(await modelFromForm(page),expectedForm(expected.config));
      await assertReviewVisible(page);
      await page.click(review);
      assert.ok(await page.evaluate('document.activeElement.matches("dialog form[data-form=quote] button[type=submit]:not(:disabled)")'));
      assert.equal((await currentState(page)).bids.length,0);
      await page.click('dialog form[data-form=quote] button[type=submit]');
      const submitted=await currentState(page);
      assert.equal(submitted.bids.length,1);
      const bid=submitted.bids[0];
      for(const field of ['inquiryId','source','ratio','extraTerms','financing','branded','unitPrice','total','profit','commission']) assert.equal(bid[field],expected.offer[field],field);
      assert.equal(bid.staffId??'',expected.offer.staffId??'');
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}

test('rapid same-point touch adoption keeps the receipt in view and never advances or submits by itself',options,async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:390,height:844,mobile:true});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    await loadScenario(page,`game=>{const s=game.newGame({difficulty:'casual',seed:381});s.tutorial.done=true;return s;}`);
    await page.click('.nav [data-page=inquiries]',{waitForCoach:false});
    await page.waitFor(exists('.workspace > .coach-card [data-ui=quote-open]'));
    await page.click('.workspace > .coach-card [data-ui=quote-open]',{waitForCoach:false});
    await page.waitFor(exists(adopt));
    const before=await currentState(page);
    const saved=await page.evaluate(storage);
    const inquiry=before.inquiries.find(item=>item.id===saved.view.quote.id);
    const expected=quoteRecommendation(before,inquiry,coachQuoteFilters(before,saved.view));
    assert.ok(expected);
    const point=await visibleButtonPoint(page,adopt);
    await page.evaluate(`(()=>{window.__adoptClicks=[];document.addEventListener('click',e=>{window.__adoptClicks.push({target:e.target.closest('button')?.dataset.ui,trusted:e.isTrusted});},true);})()`);
    const start=performance.now();
    // Deliver genuine successive touch gestures at the original screen point.
    // Do not wait for the coach between them; the next CTA occupies that area.
    for(let i=0;i<7;i++){await touch(page,point);if(i<6)await pause(18);}
    await page.waitFor(exists(review),5000);
    assert.ok(performance.now()-start<6000,'rapid adoption must complete without a sustained main-thread stall');
    assert.equal((await page.evaluate('window.__adoptClicks'))[0].target,'coach-apply-quote');
    assert.equal((await page.evaluate('window.__adoptClicks'))[0].trusted,true);
    assert.equal(await page.evaluate(exists('dialog [data-coach-pending]')),false);
    const result=await assertReviewVisible(page);
    assert.equal(result.focused,true,'an accidental second tap must not jump to the submit area');
    assert.deepEqual(await modelFromForm(page),expectedForm(expected.config));
    assert.deepEqual((await page.evaluate(storage)).view.quote.proposal,expected.config);
    assert.deepEqual(await currentState(page),before);
    // A later deliberate tap of the visible second action must still work.
    await pause(450);
    await touch(page,await visibleButtonPoint(page,review));
    assert.ok(await page.evaluate('document.activeElement.matches("dialog form[data-form=quote] button[type=submit]:not(:disabled)")'));
    assert.deepEqual(await currentState(page),before);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});

test('a late recommendation for an earlier filter/quote cannot replace the current manually edited draft',options,async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:390,height:844,mobile:true});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    // The Worker still performs its real computation. Intercept only delivery
    // of its result so an old request can finish while a different quote is
    // open, independently of CPU speed or test-runner scheduling.
    await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
      const NativeWorker=window.Worker;
      window.__heldCoachMessages=[];window.__holdCoachMessages=false;
      window.Worker=class extends NativeWorker{
        constructor(...args){super(...args);this.addEventListener('message',event=>{
          if(!window.__holdCoachMessages||window.__releasingCoachMessage)return;
          event.stopImmediatePropagation();
          window.__heldCoachMessages.push({worker:this,data:event.data});
        },true);}
      };
      window.__releaseCoachMessage=()=>{
        const next=window.__heldCoachMessages.shift();if(!next)return false;
        window.__releasingCoachMessage=true;
        try{next.worker.dispatchEvent(new MessageEvent('message',{data:next.data}));}
        finally{window.__releasingCoachMessage=false;}
        return true;
      };
    })()`});
    await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    await loadScenario(page,`game=>{const s=game.newGame({difficulty:'casual',seed:381});s.tutorial.done=true;return s;}`);
    await page.click('.nav [data-page=inquiries]');
    const state=await currentState(page);
    const original=state.inquiries.find(item=>item.id==='w1-5');
    const current=state.inquiries.find(item=>item.id==='w1-7');
    assert.ok(original&&current&&original.category!==current.category);
    const before=await page.evaluate(storage);
    const recommendation=inquiry=>quoteRecommendation(state,inquiry,coachQuoteFilters(state,{...before.view,filters:{...before.view.filters,category:inquiry.category}}));
    const oldPlan=recommendation(original);
    const currentPlan=recommendation(current);
    assert.ok(oldPlan&&currentPlan&&currentPlan.config.ratio!==80);
    assert.notDeepEqual(oldPlan.config,currentPlan.config);
    const setCategory=inquiry=>page.evaluate(`(()=>{const f=document.querySelector('[data-ui=inquiry-filter][name=category]');f.value=${JSON.stringify(inquiry.category)};f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const open=inquiry=>page.click(`article[data-inquiry-id=${inquiry.id}] [data-ui=quote-open]`,{waitForCoach:false});
    const pending='dialog [data-coach-pending]';
    await page.evaluate('window.__holdCoachMessages=true');
    await setCategory(original);
    await open(original);
    await page.waitFor(exists(pending),5000);
    assert.equal(await page.evaluate(exists(adopt)),false,'pending old recommendation must not show an active adoption control');
    await editOrdinaryPrice(page);
    await page.waitFor('window.__heldCoachMessages.length>0',10000);
    await page.click('dialog [data-ui=close-dialog]',{waitForCoach:false});
    await setCategory(current);
    await open(current);
    await page.waitFor(exists(pending),5000);
    await editOrdinaryPrice(page);
    assert.equal(await page.evaluate(exists(adopt)),false,'while the different quote is pending there is still no adoption control');
    const edited=await modelFromForm(page);
    const editedView=(await page.evaluate(storage)).view;
    assert.equal(editedView.quote.id,current.id);
    assert.equal(editedView.quote.proposal.ratio,80);
    assert.equal(editedView.filters.category,current.category);
    assert.ok(editedView.drafts.some(([id,config])=>id===original.id&&config.ratio===80));
    // Deliver an actual reply from the earlier request while holding all
    // other replies. A stale result cannot modify the new quote or its draft.
    assert.equal(await page.evaluate('window.__releaseCoachMessage()'),true);
    assert.deepEqual(await modelFromForm(page),edited);
    assert.deepEqual((await page.evaluate(storage)).view,editedView);
    assert.equal(await page.evaluate(exists(adopt)),false);
    await page.evaluate('window.__holdCoachMessages=false;while(window.__releaseCoachMessage()){}');
    await page.waitFor(exists(adopt),15000);
    assert.equal(await page.evaluate(exists(pending)),false);
    assert.deepEqual(await modelFromForm(page),edited,'arriving advice cannot silently change a manual edit');
    await page.evaluate(`document.querySelector(${JSON.stringify(adopt)}).scrollIntoView({block:'center'})`);
    await touch(page,await visibleButtonPoint(page,adopt));
    await page.waitFor(exists(review),5000);
    const accepted=await assertReviewVisible(page);
    assert.equal(accepted.focused,true);
    assert.deepEqual(await modelFromForm(page),expectedForm(currentPlan.config));
    const final=(await page.evaluate(storage)).view;
    assert.equal(final.quote.id,current.id);
    assert.deepEqual(final.quote.proposal,currentPlan.config);
    assert.ok(final.drafts.some(([id,config])=>id===original.id&&config.ratio===80));
    assert.deepEqual(await currentState(page),state);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});
