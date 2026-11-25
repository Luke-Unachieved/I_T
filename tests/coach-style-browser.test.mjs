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
const base=`game=>{const s=game.newGame({name:'助理按钮验收',seed:381,difficulty:'casual'});return s;}`;
const orderFixture=`game=>{let s=game.newGame({seed:381,difficulty:'casual'});s=game.act(s,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93}).state;s=game.act(s,{type:'end-week'}).state;s.summary=null;s.inquiries=[];s.tutorial.done=true;return s;}`;
const eventFixture=`game=>{let s=game.newGame({seed:381,difficulty:'casual'});s=game.act(s,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93}).state;for(let i=0;i<10&&!s.events.length;i++){s=game.act(s,{type:'end-week'}).state;s.summary=null;}s.tutorial.done=true;return s;}`;

// Compare actual, rendered colors instead of a shared class name or a
// hard-coded theme token. Pointer moved away to test resting visual state.
async function appearance(page,selector) {
  await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
  await page.evaluate('new Promise(r=>requestAnimationFrame(r))');
  const value=await page.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b)return null;const s=getComputedStyle(b),r=b.getBoundingClientRect();return{label:b.textContent.trim(),className:b.className,visible:r.width>0&&r.height>0,height:r.height,palette:{background:s.backgroundColor,color:s.color,border:s.borderTopColor,weight:s.fontWeight}};})()`);
  assert.ok(value,`missing actual button: ${selector}`);
  assert.ok(value.visible&&value.height>=44,JSON.stringify(value));
  return value;
}

async function assertCoach(page,selector,reference) {
  const value=await appearance(page,selector);
  assert.match(value.className,/\bcoach-action\b/,value.label);
  assert.deepEqual(value.palette,reference.palette,`assistant button color mismatch: ${selector} / ${value.label}`);
  return value;
}

async function assertQuiet(page,selector,reference,quietReference) {
  const value=await appearance(page,selector);
  assert.match(value.className,/\bquiet\b/,value.label);
  assert.notDeepEqual(value.palette,reference.palette,`optional skip/defer should not look like a primary recommendation: ${value.label}`);
  assert.deepEqual(value.palette,quietReference.palette,`skip and defer use a consistent secondary palette: ${value.label}`);
}

async function assertGuide(page,selector=null) {
  const expected=selector===null?[]:Array.isArray(selector)?selector:[selector];
  const guide=await page.evaluate(`(()=>{const targets=[...document.querySelectorAll('.tutorial-target')],expected=${JSON.stringify(expected)};const focus=document.activeElement;return{matches:targets.length===expected.length&&expected.every(s=>targets.filter(t=>t.matches(s)).length===1),targets:targets.map(t=>({tag:t.tagName,label:t.textContent.trim().slice(0,72),disabled:t.matches(':disabled')||t.getAttribute('aria-disabled')==='true',hidden:Boolean(t.closest('[hidden]'))||!t.getClientRects().length,outline:getComputedStyle(t).outlineStyle,width:getComputedStyle(t).outlineWidth,meaningless:t.matches('h1,h2,h3,h4,.coach-label,.portrait,.coach-card')})),headingOutline:focus?.matches('h1[tabindex="-1"],h2[tabindex="-1"],h3[tabindex="-1"]')?getComputedStyle(focus).outlineStyle:null};})()`);
  assert.ok(guide.matches,`expected meaningful outline on ${selector??'no single equal suggestion'}: ${JSON.stringify(guide)}`);
  assert.ok(guide.targets.every(t=>!t.disabled&&!t.hidden&&!t.meaningless&&t.outline!=='none'&&parseFloat(t.width)>0),JSON.stringify(guide));
  assert.ok(guide.headingOutline===null||guide.headingOutline==='none',`focus for accessibility should not draw a fake heading instruction: ${JSON.stringify(guide)}`);
}

for(const viewport of [{width:320,height:568,mobile:true},{width:390,height:844,mobile:true}]){
  test(`assistant navigation, quote review, financial links, development and real decisions share consistent colors at ${viewport.width}px`,{skip:!enabled,timeout:120_000},async()=>{
    const browser=await launchBrowser(root,{scenarios:true});
    try{
      const page=await browser.page(viewport);
      const nav=id=>page.click(`.nav [data-page="${id}"]`);
      const c=selector=>page.click(`${coach} ${selector}`);
      await page.goto();
      await page.waitFor(exists('[data-form=new-game]'));
      await loadScenario(page,base);

      const reference=await appearance(page,`${coach} [data-page=inquiries]`);
      assert.match(reference.className,/\bcoach-action\b/);
      await assertGuide(page,`${coach} [data-page=inquiries]`);
      const quietReference=await appearance(page,`${coach} [data-ui=skip-tutorial]`);
      assert.notDeepEqual(reference.palette,quietReference.palette);
      await c('[data-page=inquiries]');
      await assertCoach(page,`${coach} [data-ui=quote-open]`,reference);
      await assertGuide(page,`${coach} [data-ui=quote-open]`);
      await assertQuiet(page,`${coach} [data-ui=coach-skip-inquiry]`,reference,quietReference);
      await c('[data-ui=quote-open]');
      await assertCoach(page,'dialog [data-ui=coach-apply-quote]',reference);
      await assertGuide(page,'dialog [data-ui=coach-apply-quote]');
      await page.click('dialog [data-ui=coach-apply-quote]');
      await assertCoach(page,'dialog [data-ui=coach-review-submit]',reference);
      await assertGuide(page,'dialog [data-ui=coach-review-submit]');
      const confirmReference=await appearance(page,'dialog form[data-form=quote] button[type=submit]');
      assert.match(confirmReference.className,/\bprimary\b/);
      assert.doesNotMatch(confirmReference.className,/\bcoach-action\b/);
      assert.deepEqual(confirmReference.palette,reference.palette,'solid gold recommendation and confirmation palette');
      await page.click('dialog [data-ui=coach-review-submit]');
      assert.ok(await page.evaluate('document.activeElement.matches("dialog form[data-form=quote] button[type=submit]")'));
      await assertCoach(page,'dialog form[data-form=quote] button[type=submit]',reference);
      await assertGuide(page,'dialog form[data-form=quote] button[type=submit]');
      assert.equal((await currentState(page)).bids.length,0);
      await page.click('dialog form[data-form=quote] button[type=submit]');
      assert.equal((await currentState(page)).bids.length,1);

      await assertCoach(page,`${coach} [data-page=office][data-coach-tab=cash-forecast]`,reference);
      await assertGuide(page,`${coach} [data-page=office][data-coach-tab=cash-forecast]`);
      await assertQuiet(page,`${coach} [data-ui=coach-skip-prep]`,reference,quietReference);
      await c('[data-page=office][data-coach-tab=cash-forecast]');
      await assertGuide(page,'.forecast-panel .forecast-scenarios');
      await assertCoach(page,`${coach} [data-page=company][data-coach-tab=finance]`,reference);
      await assertCoach(page,`${coach} [data-ui=coach-focus-forecast]`,reference);
      await c('[data-ui=coach-focus-forecast]');
      await assertGuide(page,'.forecast-panel .forecast-scenarios');
      await assertCoach(page,'.forecast-panel [data-ui=coach-review-next]',reference);
      await page.evaluate('document.querySelector(".forecast-panel [data-coach-tab=finance]").scrollIntoView({block:"center"})');
      await assertCoach(page,'.forecast-panel [data-page=company][data-coach-tab=finance]',reference);
      await page.screenshot(`/tmp/v38-coach-style-${viewport.width}-forecast.png`);
      await page.click('.forecast-panel [data-coach-tab=finance]');
      await assertCoach(page,`${coach} [data-page=offwork]`,reference);
      await assertGuide(page,`${coach} [data-page=offwork]`);
      await assertQuiet(page,`${coach} [data-ui=coach-skip-prep]`,reference,quietReference);
      await c('[data-page=offwork]');
      const settlementAction=await appearance(page,'.week-controls [data-action=end-week]');
      assert.match(settlementAction.className,/\bprimary\b/);
      assert.doesNotMatch(settlementAction.className,/\bcoach-action\b/);
      assert.deepEqual(settlementAction.palette,confirmReference.palette,'actual settlement uses the ordinary confirmation style');
      await new Promise(resolve=>setTimeout(resolve,450));
      await page.click('.week-controls [data-action=end-week]');
      await page.waitFor(exists('dialog.summary-dialog[open] [data-ui=view-first-order]'));
      await assertCoach(page,'dialog [data-ui=view-first-order]',reference);
      await assertGuide(page,'dialog [data-ui=view-first-order]');
      await page.click('dialog [data-ui=view-first-order]');
      await assertCoach(page,`${coach} [data-page=company][data-coach-tab=finance]`,reference);
      await c('[data-page=company][data-coach-tab=finance]');
      await assertCoach(page,`${coach} [data-page=company][data-coach-tab=team]`,reference);
      await assertGuide(page,`${coach} [data-page=company][data-coach-tab=team]`);
      await assertQuiet(page,`${coach} [data-ui=coach-skip-intro]`,reference,quietReference);
      await c('[data-page=company][data-coach-tab=team]');
      await assertCoach(page,`${coach} [data-page=company][data-coach-tab=certifications]`,reference);
      await page.screenshot(`/tmp/v38-coach-style-${viewport.width}-development.png`);

      // In a valid manually edited quote both "keep" and "adopt" are
      // legitimate positive choices. If the user deliberately makes a risky
      // draft, only the unsafe override remains a quieter alternative.
      await loadScenario(page,`game=>{const s=game.newGame({seed:381,difficulty:'casual'});s.tutorial.done=true;return s;}`);
      await nav('inquiries');
      await page.click('article[data-inquiry-id=w1-2] [data-ui=quote-open]');
      await page.click('dialog input[name=source][value=factory]:not(:disabled)');
      await page.evaluate('document.querySelector("dialog input[name=ratio]").focus()');
      await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
      await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
      assert.match(await page.evaluate('document.querySelector("dialog .coach-card h3").textContent'),/你的报价方案可保留/);
      await assertCoach(page,'dialog [data-ui=coach-review-submit]',reference);
      await assertCoach(page,'dialog [data-ui=coach-apply-quote]',reference);
      await assertGuide(page,'dialog [data-ui=coach-review-submit]');
      await page.click('dialog input[name=source][value=stock]:not(:disabled)');
      await page.evaluate('document.querySelector("dialog input[name=ratio]").focus()');
      await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
      await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
      assert.match(await page.evaluate('document.querySelector("dialog .coach-card h3").textContent'),/你的改动有经营风险/);
      await assertCoach(page,'dialog [data-ui=coach-apply-quote]',reference);
      await assertQuiet(page,'dialog [data-ui=coach-review-submit]',reference,quietReference);
      await assertGuide(page,'dialog [data-ui=coach-apply-quote]');
      await page.click('dialog [data-ui=close-dialog]');

      // The two quiet-week choices are both valid player preferences, not
      // a recommendation followed by a skip. Check them on both real pages.
      await loadScenario(page,`game=>{const s=game.newGame({seed:381,difficulty:'casual'});s.inquiries=[];s.tutorial.done=true;return s;}`);
      await nav('office');
      await assertCoach(page,`${coach} [data-ui=coach-leisure-menu]`,reference);
      await assertCoach(page,`${coach} [data-ui=coach-settlement]`,reference);
      await assertGuide(page);
      const quietState=await currentState(page);
      await c('[data-ui=coach-leisure-menu]');
      await assertGuide(page,['[data-ui=life-app][data-id=trips]','[data-ui=life-app][data-id=friends]']);
      await assertCoach(page,`${coach} [data-ui=coach-leisure-menu]`,reference);
      await assertCoach(page,`${coach} [data-ui=coach-settlement]`,reference);
      await page.evaluate(`document.querySelector('${coach}').scrollIntoView({block:'start'})`);
      await page.screenshot(`/tmp/v38-coach-style-${viewport.width}-offwork.png`);
      await c('[data-ui=coach-settlement]');
      assert.deepEqual(await currentState(page),quietState,'guidance to settlement is not actual settlement');
      assert.ok(await page.evaluate('document.activeElement.matches(".week-controls [data-action=end-week]")'));
      await assertCoach(page,'.week-controls [data-action=end-week]',reference);
      await assertGuide(page,'.week-controls [data-action=end-week]');

      // An actual pressed contextual next-action button must keep the same
      // appearance as the card it returns to, in both review regions.
      await loadScenario(page,orderFixture);await nav('office');
      await page.evaluate(`(()=>{const record=JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}));record.view.coachTour={version:2,visited:[],active:null,skipped:true};record.view.coachIntro=4;record.view.coachPrep=3;localStorage.setItem(${JSON.stringify(SAVE_KEY)},JSON.stringify(record));})()`);
      await page.send('Page.reload');await page.waitFor(exists('[data-ui=resume-save]'));await page.click('[data-ui=resume-save]');
      await assertCoach(page,`${coach} [data-ui=coach-review-orders]`,reference);
      await c('[data-ui=coach-review-orders]');
      await assertGuide(page,'#orders-delivery .order-section-body table');
      await assertCoach(page,'[data-ui=coach-review-next]',reference);
      await page.click('[data-ui=coach-review-next]');
      assert.ok(await page.evaluate(`document.activeElement.matches('${coach} .coach-action')`));
      await assertGuide(page,`${coach} [data-ui=coach-review-cash]`);
      await assertCoach(page,`${coach} [data-ui=coach-review-cash]`,reference);
      await c('[data-ui=coach-review-cash]');
      await assertCoach(page,'.forecast-panel [data-ui=coach-review-next]',reference);
      await assertGuide(page,'.forecast-panel .forecast-scenarios');

      // A tired player can choose the real rest suggestion or defer it.
      await loadScenario(page,`game=>{const s=game.newGame({seed:381,difficulty:'casual'});s.inquiries=[];s.energy=15;s.tutorial.done=true;return s;}`);
      await nav('office');
      await assertCoach(page,`${coach} [data-page=offwork]`,reference);
      await assertQuiet(page,`${coach} [data-ui=coach-defer-task]`,reference,quietReference);
      await c('[data-page=offwork]');
      await assertCoach(page,`${coach} [data-ui=coach-select-outing],${coach} [data-coach-action=outing]`,reference);
      await assertQuiet(page,`${coach} [data-ui=coach-defer-task]`,reference,quietReference);
      const leisure=await page.evaluate(`(()=>{const b=document.querySelector('${coach} [data-ui=coach-select-outing],${coach} [data-coach-action=outing]');return {id:b.dataset.id,choice:b.dataset.choice??null,detailed:b.dataset.ui==='coach-select-outing'};})()`);
      const beforeRest=await currentState(page);
      await c(leisure.detailed?'[data-ui=coach-select-outing]':'[data-coach-action=outing]');
      if(leisure.detailed){
        await assertCoach(page,`[data-outing-id="${leisure.id}"] button[type=submit]`,reference);
        await assertGuide(page,`[data-outing-id="${leisure.id}"] label:has(input[name=choiceId][value="${leisure.choice}"])`);
      }else{
        await assertCoach(page,`[data-action=outing][data-id="${leisure.id}"]`,reference);
        await assertGuide(page,`[data-action=outing][data-id="${leisure.id}"]`);
      }
      assert.deepEqual(await currentState(page),beforeRest);

      await loadScenario(page,`game=>{let s=game.newGame({seed:381,difficulty:'casual'});s.tutorial.done=true;const bought=game.act(s,{type:'buy-property',id:'city-flat'});if(bought.error)throw Error(bought.error);s=bought.state;s.cash=-2000;s.creditLine=game.creditLimit(s);return s;}`);
      await nav('office');
      await assertCoach(page,`${coach} [data-page=company][data-coach-tab=finance]`,reference);
      await c('[data-page=company][data-coach-tab=finance]');
      const beforeBorrow=await currentState(page);
      await assertCoach(page,`${coach} [data-coach-form=borrow]`,reference);
      await c('[data-coach-form=borrow]');
      await assertCoach(page,'form[data-form=borrow] button[type=submit]',reference);
      await assertGuide(page,'form[data-form=borrow] input[name=amount]');
      assert.deepEqual(await currentState(page),beforeBorrow);

      // Real engine-generated decision; do not fabricate a recommended
      // option. Test the action label that the player actually sees.
      await loadScenario(page,eventFixture);await nav('office');
      await assertCoach(page,`${coach} [data-ui=show-event]`,reference);
      await c('[data-ui=show-event]');
      await page.waitFor(exists('dialog[open] [data-action=resolve-event]'));
      const recommended=await page.evaluate('Array.from(document.querySelectorAll("dialog [data-action=resolve-event]")).find(x=>x.textContent.includes("助理推荐"))?.dataset.choice??null');
      assert.ok(recommended);
      const suggestion=`dialog [data-action=resolve-event][data-choice="${recommended}"]`;
      const other=`dialog [data-action=resolve-event]:not([data-choice="${recommended}"])`;
      await assertCoach(page,suggestion,reference);
      assert.notDeepEqual((await appearance(page,other)).palette,reference.palette);
      await assertGuide(page,suggestion);
      await page.evaluate(`document.querySelector(${JSON.stringify(suggestion)}).scrollIntoView({block:'center'})`);
      await page.screenshot(`/tmp/v38-coach-style-${viewport.width}-event.png`);
      // Full quote capacity genuinely disables another submission: there is
      // no meaningful control to highlight inside the view-only quote.
      await loadScenario(page,`game=>{let s=game.newGame({seed:381,difficulty:'casual'});s.tutorial.done=true;for(const inquiry of s.inquiries.slice(0,3)){const b=game.act(s,{type:'bid',inquiryId:inquiry.id,source:'stock',ratio:80});if(b.error)throw Error(b.error);s=b.state;}return s;}`);
      await nav('inquiries');
      await page.click('article[data-inquiry-id=w1-4] [data-ui=quote-open]');
      assert.ok(await page.evaluate('document.querySelector("dialog form[data-form=quote] button[type=submit]").disabled'));
      await assertGuide(page);

      // First delivery and payment summary navigation is an assistant
      // continuation in simple mode, with the actual receivable route.
      await loadScenario(page,`game=>{let s=game.newGame({seed:381,difficulty:'casual'});s.tutorial.done=true;const b=game.act(s,{type:'bid',inquiryId:s.inquiries[0].id,source:'stock',ratio:80});if(b.error)throw Error(b.error);s=b.state;for(let n=0;n<2;n++){const w=game.act(s,{type:'end-week'});s=w.state;s.summary=null;}return s;}`);
      for(const stage of ['pending','paid']){
        await nav('offwork');
        await new Promise(resolve=>setTimeout(resolve,450));
        await page.click('.week-controls [data-action=end-week]');
        const route=`dialog [data-ui=view-order-receivables][data-receipt-view=${stage}]`;
        await page.waitFor(exists(route));
        await assertCoach(page,route,reference);
        await assertGuide(page,route);
        const settled=await currentState(page);
        await page.click(route);
        const viewed=await currentState(page);
        assert.equal(viewed.week,settled.week);
        assert.equal(viewed.cash,settled.cash);
        assert.ok(await page.evaluate('document.querySelector("#orders-receivables").open'));
      }
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}

for (const [difficulty, width, height] of [['normal',320,568],['hard',390,844]]) {
  test(`${difficulty} basic tutorial highlights only its actual next step, not names or headings`, {skip:!enabled,timeout:120_000}, async()=>{
    const browser=await launchBrowser(root,{scenarios:true});
    try {
      const page=await browser.page({width,height,mobile:true});
      await page.goto();await page.waitFor(exists('[data-form=new-game]'));
      await loadScenario(page,`game=>game.newGame({difficulty:'${difficulty}',seed:381})`);
      await assertGuide(page,'.nav [data-page=inquiries]');
      await page.click('.nav [data-page=inquiries]');
      await assertGuide(page,'button[data-tour=quote]:not(:disabled)');
      await page.click('button[data-tour=quote]');
      await assertGuide(page,'dialog .quote-risk[data-tour=cash-forecast]');
      await page.click('dialog [data-ui=tutorial-next]');
      await assertGuide(page,'[data-ui=coach-settlement]');
      const before=(await currentState(page)).week;
      await page.click('[data-ui=coach-settlement]');
      await assertGuide(page,'.week-controls [data-action=end-week]');
      assert.equal((await currentState(page)).week,before);
      await page.click('.week-controls [data-action=end-week]');
      await page.waitFor(exists('dialog[open] [data-ui=finish-tutorial]'));
      await assertGuide(page,'dialog [data-ui=finish-tutorial]');
      await page.click('dialog [data-ui=finish-tutorial]');
      await assertGuide(page);
      await page.click('dialog [data-ui=close-dialog]');
      await page.click('.nav [data-page=inquiries]');
      await page.click('button[data-tour=quote]');
      const submit='dialog form[data-form=quote] button[type=submit]:not(:disabled)';
      await page.waitFor(exists(submit));
      await page.click(submit);
      await page.waitFor('!document.querySelector("dialog").open');
      assert.equal((await currentState(page)).bids.length,1);
      assert.ok(await page.evaluate('document.activeElement.matches(".inquiry-thread-name strong[tabindex=\\"-1\\"]")'));
      assert.equal(await page.evaluate('getComputedStyle(document.activeElement).outlineStyle'),'none','a restored buyer name is an announcement, not a clickable tutorial step');
      await assertGuide(page);
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}
