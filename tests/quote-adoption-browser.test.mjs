import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
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
      await page.evaluate('document.querySelector("dialog [name=ratio]").focus()');
      await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
      await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
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
