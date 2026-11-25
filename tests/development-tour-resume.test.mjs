import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const enabled=process.env.V38_BROWSER==='1';
const coach='.workspace > .coach-card';
const tourNext=`${coach} [data-coach-intro-next]`;
const exists=selector=>`Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const storage=`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`;
const saved=page=>page.evaluate(storage);
const nav=(page,id)=>page.click(`.nav [data-page="${id}"]`);
const c=(page,selector)=>page.click(`${coach} ${selector}`);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const lessons=new Map([
  ['orders',['第一张订单',/备货|发运|交付|回款/]],
  ['finance',['财务',/授信|贷款|净资产|现金|还款/]],
  ['team',['团队',/工资|薪资|员工|跟单|招聘|聘用/]],
  ['certifications',['资质',/认证|申请|出口|条件|资格/]],
  ['markets',['市场',/开拓|展会|参展|引荐|市场准入/]],
  ['economy',['宏观',/汇率|原料|运费|消费|利率|成本/]],
  ['rivalry',['同行',/竞争|报价|经营状况|生意规模/]],
  ['partners',['客户',/复购|客户关系|信用|交付|回款/]],
  ['board-goals',['年度目标',/年末|年度结算|业绩|营收|利润/]],
  ['ventures',['产业链',/仓库|产线|工厂|海外仓|投资/]],
  ['listing',['估值上市',/股权|股份|估值|上市|融资/]],
  ['company-record',['成就记事',/成就|里程碑|经营历程|记事/]],
  ['offwork',['下班',/精力|休息|娱乐|旅行/]],
]);

async function reload(page){
  await page.send('Page.reload');await page.waitFor(exists('[data-ui=resume-save]'));await page.click('[data-ui=resume-save]');
}

async function beginLearning(page){
  // A pending genuine optional order task outranks the optional learning
  // mode. Deliberately defer it if necessary, then explicitly ask to learn.
  for(let n=0;n<6&&!await page.evaluate(exists(`${coach} [data-ui=coach-start-learning]`));n++){
    if(!await page.evaluate(exists(`${coach} [data-ui=coach-defer-task]`)))break;
    await c(page,'[data-ui=coach-defer-task]');
  }
  await c(page,'[data-ui=coach-start-learning]');
  assert.equal((await saved(page)).view.coachLearning,true);
}

async function startActualCompany(page,seed){
  await page.goto();await page.waitFor(exists('[data-form=new-game]'));
  // Only seed the ordinary opening random draw. Every quote, settlement and
  // contract below must arise from real player actions.
  await page.evaluate(`(()=>{const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=${seed};return array;}return random(array);};const menu=document.querySelector('[name=difficulty]');menu.value='casual';menu.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await page.fill('[data-form=new-game] input[name=name]',`独立引导验收${seed}`);
  await page.click('[data-form=new-game] button[type=submit]');
  assert.equal((await saved(page)).state.week,1);
}

async function firstContractThroughCoach(page){
  for(let i=0;i<60;i++){
    if(await page.evaluate(exists('dialog[open]'))){
      if(await page.evaluate(exists('dialog [data-ui=view-first-order]'))){
        await page.click('dialog [data-ui=view-first-order]');
        // A real pending decision may open immediately after the summary.
        continue;
      }
      if(await page.evaluate(exists('dialog [data-form=quote]'))){
        if(await page.evaluate(exists('dialog [data-ui=coach-apply-quote]')))
          await page.click('dialog [data-ui=coach-apply-quote]');
        assert.ok(await page.evaluate(exists('dialog [data-ui=coach-review-submit]')),'actual recommended quote must be reviewable');
        await page.click('dialog [data-ui=coach-review-submit]');
        await page.click('dialog form[data-form=quote] button[type=submit]:not(:disabled)');
        continue;
      }
      if(await page.evaluate(exists('dialog [data-action=resolve-event]'))){
        const chosen=await page.evaluate(exists('dialog [data-action=resolve-event].coach-action:not(:disabled)'))
          ?'dialog [data-action=resolve-event].coach-action:not(:disabled)':'dialog [data-action=resolve-event]:not(:disabled)';
        await page.click(chosen);continue;
      }
      await page.click('dialog [data-ui=close-dialog]');continue;
    }
    const record=await saved(page);
    if(record.state.orders.length){
      // An event immediately following a first-order summary can defer the
      // actual ledger visit. Take that real primary data view before counting
      // the order lesson, rather than merely entering the parent page.
      if(await page.evaluate(exists(`${coach} .coach-action[data-first-view]`))){
        await c(page,'.coach-action[data-first-view]');continue;
      }
      if(record.view.page!=='orders')await nav(page,'orders');
      return record.state.week;
    }
    const action=await page.evaluate(`(()=>{const el=document.querySelector('${coach} [data-ui=coach-settlement]')??document.querySelector('${coach} .coach-action:not(:disabled)');return el?{ui:el.dataset.ui,page:el.dataset.page??null,tab:el.dataset.coachTab??null,id:el.dataset.id??null,text:el.textContent.trim()}:null;})()`);
    assert.ok(action,`assistant stopped before first contract: ${JSON.stringify(record.view)}`);
    assert.ok(record.state.week<=8,'fixture opening failed to obtain a first order within eight weeks');
    if(action.ui==='coach-settlement'){
      await c(page,'[data-ui=coach-settlement]');await pause(430);
      await page.click('.week-controls [data-action=end-week]');
    }else{
      assert.ok(['page','quote-open','show-event','coach-review-cash','coach-review-orders'].includes(action.ui),JSON.stringify(action));
      const selector=`[data-ui="${action.ui}"]${action.page?`[data-page="${action.page}"]`:''}${action.tab?`[data-coach-tab="${action.tab}"]`:''}${action.id?`[data-id="${action.id}"]`:''}`;
      await c(page,selector);
    }
  }
  throw Error('assistant did not reach first actual contract');
}

// Record a lesson only when its actual coach copy is rendered and its
// matching concrete panel is visible. A stored "visited" entry alone is
// insufficient, especially when an urgent task has interrupted teaching.
async function observeLesson(page,seen){
  const view=(await saved(page)).view;
  const key=view.coachTour.active;
  if(!key||seen.has(key))return;
  const [label,concept]=lessons.get(key);
  const displayed=await page.evaluate(`(()=>{const c=document.querySelector('${coach}');return{title:c.querySelector('h3').textContent,copy:c.querySelector('p').textContent,visible:c.getClientRects().length>0,panel:document.querySelector('[data-development-panel]')?.dataset.developmentPanel??null};})()`);
  assert.ok(displayed.visible&&displayed.title.includes('认识')&&displayed.title.includes(label),JSON.stringify({key,displayed}));
  assert.match(displayed.copy,concept);
  if(!['orders','offwork'].includes(key))assert.equal(displayed.panel,key);
  assert.ok(view.coachTour.visited.includes(key));
  seen.add(key);
}

async function followTour(page,seen,{interrupt=false}={}){
  let didInterrupt=false;
  for(let i=0;i<30;i++){
    // A real urgent optional business task can have priority. Let the player
    // deliberately defer that specific task; never silently count its page.
    if(!await page.evaluate(exists(tourNext))&&await page.evaluate(exists(`${coach} [data-ui=coach-defer-task]`))){
      const before=await saved(page);
      await c(page,'[data-ui=coach-defer-task]');
      assert.deepEqual((await saved(page)).state,before.state);
    }
    await observeLesson(page,seen);
    const view=(await saved(page)).view;
    if(interrupt&&!didInterrupt&&seen.size>=5&&seen.size<lessons.size){
      const before=(await saved(page)).state;
      await nav(page,'office');await reload(page);
      assert.deepEqual((await saved(page)).state,before);
      assert.ok(await page.evaluate(exists(tourNext)),'unseen introduction must survive navigation and refresh');
      didInterrupt=true;
    }
    const next=await page.evaluate(`(()=>{const el=document.querySelector('${tourNext}');return el?{ui:el.dataset.ui,page:el.dataset.page??null,tab:el.dataset.coachTab??null}:null;})()`);
    assert.ok(next,`unfinished tour lacks an onward control: ${JSON.stringify(view.coachTour)}`);
    const prior=(await saved(page)).state;
    if(next.ui==='coach-finish-intro'){
      assert.equal(seen.size,lessons.size);
      await page.click(tourNext);
      assert.deepEqual((await saved(page)).state,prior);
      break;
    }
    const destination=next.page==='company'?next.tab:next.page;
    assert.ok(!seen.has(destination),`assistant repeated an already displayed lesson: ${destination}`);
    await page.click(tourNext);
    assert.deepEqual((await saved(page)).state,prior,'continuing a lesson does not spend or settle');
    await observeLesson(page,seen);
    assert.ok(seen.has(destination),'the target is genuinely taught, not only marked as visited');
  }
  const completed=(await saved(page)).view.coachTour;
  assert.deepEqual([...seen].sort(),[...lessons.keys()].sort());
  assert.deepEqual([...completed.visited].sort(),[...lessons.keys()].sort());
  assert.equal(completed.active,null);
  assert.equal(completed.skipped,false);
  await nav(page,'office');await reload(page);
  assert.equal(await page.evaluate(exists(tourNext)),false,'finished tour must not replay');
}

for(const [seed,viewport] of [[17,{width:320,height:568,mobile:true}],[2026,{width:390,height:844,mobile:true}],[919,{width:320,height:568,mobile:true}]]){
  test(`actual coached opening seed ${seed} reaches and displays every development lesson`,{skip:!enabled,timeout:180_000},async()=>{
    const browser=await launchBrowser(root);
    try{
      const page=await browser.page(viewport);
      await startActualCompany(page,seed);
      await firstContractThroughCoach(page);
      assert.equal((await saved(page)).view.coachLearning,true,'the initial teaching round continues through the first genuine contract');
      const seen=new Set();
      // New seed routes include an intentional out-of-order/manual visit.
      await observeLesson(page,seen);
      await nav(page,'company');await page.click('[data-ui=development-tab][data-id=listing]');
      await observeLesson(page,seen);
      await page.click('[data-ui=development-tab][data-id=economy]');
      await observeLesson(page,seen);
      await followTour(page,seen,{interrupt:true});
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}

// Genuine first awarded contract and existing bank loan; only the capital
// is increased as a reachability fixture for a justified optional repayment.
const loanFixture=`game=>{let s=game.newGame({difficulty:'casual',seed:381});const bid=game.act(s,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93});if(bid.error)throw Error(bid.error);s=game.act(bid.state,{type:'end-week'}).state;s.summary=null;s.events=[];s.cash=160000;s.creditLine=game.creditLimit(s);const loan=game.act(s,{type:'borrow',amount:6000});if(loan.error)throw Error(loan.error);s=loan.state;s.tutorial.done=true;s.inquiries=[];return s;}`;

for(const [viewport,repay] of [[{width:320,height:568,mobile:true},false],[{width:390,height:844,mobile:true},true]]){
  test(`interrupted development tour keeps optional finance task, defer and onward lessons at ${viewport.width}px`,{skip:!enabled,timeout:120_000},async()=>{
    const browser=await launchBrowser(root,{scenarios:true});
    try{
      const page=await browser.page(viewport);
      await page.goto();await page.waitFor(exists('[data-form=new-game]'));
      await loadScenario(page,loanFixture);await nav(page,'orders');
      await beginLearning(page);
      const original=(await saved(page)).state,seen=new Set();
      await observeLesson(page,seen);
      assert.deepEqual([...seen],['orders']);

      // Same destination as the real financial opportunity: a single clear
      // educational + actionable route, not two competing identical controls.
      await nav(page,'company');
      assert.equal(await page.evaluate(`document.querySelectorAll('${coach} [data-page=company][data-coach-tab=finance]').length`),1);
      assert.ok(await page.evaluate(exists(`${tourNext}[data-coach-tab=finance]`)));
      assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-defer-task]`)));
      await page.click(tourNext);await observeLesson(page,seen);
      assert.deepEqual([...seen],['orders','finance']);
      assert.ok(await page.evaluate(exists(`${coach} [data-coach-form=repay]`)));
      assert.ok(await page.evaluate(exists(`${tourNext}[data-coach-tab=team]`)));
      assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-defer-task]`)));
      assert.match(await page.evaluate(`document.querySelector('${coach} p').textContent`),/净资产.*贷款.*还款/s);

      // This was the reported dead end: manually leave the active lesson
      // while the optional repayment remains genuinely recommended.
      await nav(page,'company');await reload(page);
      assert.deepEqual((await saved(page)).view.coachTour.visited,['orders','finance']);
      assert.equal((await saved(page)).view.coachTour.active,null);
      assert.ok(await page.evaluate(exists(`${coach} [data-page=company][data-coach-tab=finance]:not([data-coach-intro-next])`)));
      assert.ok(await page.evaluate(exists(`${tourNext}[data-coach-tab=team]`)));
      assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-defer-task]`)));
      await page.screenshot(`/tmp/v38-intro-resume-${viewport.width}-overview.png`);
      await page.click(tourNext);await observeLesson(page,seen);
      assert.deepEqual([...seen],['orders','finance','team']);

      // Revisit a *previously* taught financial page. Neither completing nor
      // deferring this optional business decision should be a tutorial gate.
      await page.click('[data-ui=development-tab][data-id=finance]');
      assert.deepEqual((await saved(page)).view.coachTour.visited,['orders','finance','team']);
      assert.ok(await page.evaluate(exists(`${coach} [data-coach-form=repay]`)));
      assert.ok(await page.evaluate(exists(`${tourNext}[data-coach-tab=certifications]`)));
      assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-defer-task]`)));
      assert.deepEqual((await saved(page)).state,original);
      if(repay){
        await c(page,'[data-coach-form=repay]');
        assert.ok(await page.evaluate('document.activeElement.matches("form[data-form=repay] input[name=amount]")'));
        await page.fill('form[data-form=repay] input[name=amount]','1000');
        await page.click('form[data-form=repay] button[type=submit]');
        const after=(await saved(page)).state;
        assert.equal(after.loan,original.loan-1000);
        assert.equal(after.cash,original.cash-1000);
        assert.ok(await page.evaluate(exists(`${tourNext}[data-coach-tab=certifications]`)));
      }
      const baseline=(await saved(page)).state;
      if(await page.evaluate(exists(`${coach} [data-ui=coach-defer-task]`))){
        await c(page,'[data-ui=coach-defer-task]');
        assert.ok((await saved(page)).view.coachDeclined.tasks.some(id=>id.startsWith('growth:repay:')));
      }else{
        assert.equal(repay,true,'the non-spending route must expose the actual optional defer');
        assert.equal(await page.evaluate(exists(`${coach} [data-coach-form=repay]`)),false,'a remaining recommendation must still be deferrable');
      }
      assert.ok(await page.evaluate(exists(`${tourNext}[data-coach-tab=certifications]`)));
      assert.deepEqual((await saved(page)).state,baseline);
      await followTour(page,seen,{interrupt:true});
      assert.deepEqual((await saved(page)).state,baseline,'all remaining development lessons require no spending or actual business actions');
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}

test('an actual overdue customer blocks teaching without falsely recording tabs, then the handled order releases all lessons',{skip:!enabled,timeout:120_000},async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:390,height:844,mobile:true});
    await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    // Actual contract and delivered invoice, with a seeded delayed payment
    // to reproduce a real order priority in an unfinished introduction.
    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'bid',inquiryId:'w1-1',source:'stock',ratio:80}).state;for(let n=0;n<3;n++){s=game.act(s,{type:'end-week'}).state;s.summary=null;s.events=[];}const invoice=s.receivables[0];invoice.status='overdue';invoice.originalDueWeek=s.week-1;invoice.dueWeek=s.week+3;s.cash=150000;s.creditLine=game.creditLimit(s);s.inquiries=[];s.tutorial.done=true;return s;}`);
    const before=(await currentState(page)),invoice=before.receivables.find(item=>item.status==='overdue');
    await nav(page,'company');
    // A player who already opted into learning before the payment became
    // overdue should continue learning after the real urgent work is done.
    await page.evaluate(`(()=>{const record=${storage};record.view.coachLearning=true;localStorage.setItem(${JSON.stringify(SAVE_KEY)},JSON.stringify(record));})()`);
    await reload(page);
    for(const tab of ['team','listing','markets']){
      await page.click(`[data-ui=development-tab][data-id="${tab}"]`);
      assert.deepEqual((await saved(page)).view.coachTour.visited,[]);
      assert.equal(await page.evaluate(exists(tourNext)),false);
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/逾期/);
    }
    await reload(page);
    assert.deepEqual((await saved(page)).view.coachTour.visited,[]);
    await c(page,'[data-page=orders][data-coach-tab=orders-receivables]');
    await c(page,`[data-coach-action=collect][data-id="${invoice.id}"]`);
    assert.deepEqual((await saved(page)).state,before);
    assert.deepEqual((await saved(page)).view.coachTour.visited,[]);
    await page.click(`[data-action=collect][data-id="${invoice.id}"]`);
    const resolved=(await saved(page)).state;
    assert.equal(resolved.receivables.find(item=>item.id===invoice.id).reminderWeek,before.week);
    assert.equal(resolved.cash,before.cash);
    assert.equal(resolved.week,before.week);
    const seen=new Set();
    await observeLesson(page,seen);
    assert.deepEqual([...seen],['orders'],'only the actual displayed order lesson counts after actual work');
    await followTour(page,seen,{interrupt:true});
    assert.deepEqual((await saved(page)).state,resolved);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});
