import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const coach = '.workspace > .coach-card';
const storage = `JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`;
const saved = page => page.evaluate(storage);
const exists = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const clickCoach = (page, selector) => page.click(`${coach} ${selector}`);
const nav = (page, id) => page.click(`.nav [data-page="${id}"]`);

// Each tab needs to explain the underlying player-facing decision, not just
// say "this is the [tab] page" or point to another development tab.
const development = [
  ['finance','财务',/授信|贷款|借款|周转资金/],
  ['team','团队',/工资|薪资|员工|跟单|招聘|聘用/],
  ['certifications','资质',/认证|申请|出口|条件|资格/],
  ['markets','市场',/开拓|展会|参展|引荐|市场准入/],
  ['economy','宏观',/汇率|原材料|运费|消费|利率|成本/],
  ['rivalry','同行',/竞争|报价|竞争对手|经营状况/],
  ['partners','客户',/复购|客户关系|信用|交付|回款/],
  ['board-goals','年度目标',/年末|年度结算|业绩|营收|利润/],
  ['ventures','产业链',/仓库|产线|工厂|海外仓|投资/],
  ['listing','估值上市',/股权|股份|估值|上市|融资/],
  ['company-record','成就记事',/成就|里程碑|经营历程|成长记录|记事/],
];
const tourIds = ['orders', ...development.map(([key]) => key), 'offwork'];
const guideSelector = `${coach} [data-ui="page"][data-page="company"][data-coach-tab]`;

async function restartFromSave(page) {
  await page.send('Page.reload');
  await page.waitFor(exists('[data-ui="resume-save"]'));
  await page.click('[data-ui="resume-save"]');
}

async function startFreshFirstOrder(page) {
  await page.goto();
  await page.waitFor(exists('[data-form="new-game"]'));
  // Seed only the real opening form's random draw, not order results or game
  // state. The actual game runs to the first settlement with an actual bid.
  await page.evaluate(`(()=>{const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=381;return array;}return random(array);};const menu=document.querySelector('[name=difficulty]');menu.value='casual';menu.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await page.fill('[data-form="new-game"] [name="name"]','首次成交发展验收');
  await page.click('[data-form="new-game"] button[type="submit"]');
  assert.equal((await saved(page)).state.difficulty,'casual');
  assert.equal((await saved(page)).state.week,1);
  await clickCoach(page,'[data-page="inquiries"]');
  // Deterministic, valid actual inquiry: choose a different proposal ourselves
  // rather than relying on a particular future recommendation ranking.
  await page.click('article[data-inquiry-id="w1-7"] [data-ui=quote-open]');
  await page.waitFor(exists('dialog[open] form[data-form=quote]'));
  await page.click('dialog input[name=source][value=factory]:not(:disabled)');
  await page.evaluate('document.querySelector("dialog input[name=ratio]").focus()');
  for(let n=0;n<7;n++){
    await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
    await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
  }
  assert.equal(await page.evaluate('document.querySelector("dialog input[name=ratio]").value'),'93');
  await page.click('dialog form[data-form=quote] button[type=submit]');
  assert.equal((await saved(page)).state.bids.length,1);
  assert.equal((await saved(page)).state.bids[0].inquiryId,'w1-7');
  assert.equal((await saved(page)).state.bids[0].ratio,93);
  await nav(page,'offwork');
  await page.click('.week-controls [data-action=end-week]');
  await page.waitFor(exists('dialog[open] [data-ui=view-first-order]'));
  assert.equal((await saved(page)).state.week,2);
  assert.ok((await saved(page)).state.orders.length>=1);
  await page.click('dialog [data-ui=view-first-order]');
  assert.equal((await saved(page)).view.page,'orders');
  assert.equal((await saved(page)).view.coachLearning,false);
  assert.deepEqual((await saved(page)).view.coachTour.visited,[],'viewing actual first order is not an automatic lesson');
  await clickCoach(page,'[data-ui=coach-start-learning]');
  assert.equal((await saved(page)).view.coachLearning,true);
}

async function checkDevelopmentVisit(page, key, viewport, baseline) {
  const item = development.find(([id])=>id===key);
  assert.ok(item, key);
  const [id,label,concept] = item;
  const record = await saved(page);
  assert.equal(record.view.page,'company');
  assert.equal(record.view.developmentTab,id);
  assert.ok(record.view.coachTour.visited.includes(id), `real visit to ${label} must be recorded`);
  assert.equal(record.view.coachTour.active,id,`active introduction should explain ${label}`);
  assert.deepEqual(record.state,baseline,`viewing ${label} must not spend, hire, borrow, advance or change game progress`);
  const layout = await page.evaluate(`(()=>{const pressed=[...document.querySelectorAll('[data-ui=development-tab][aria-pressed=true]')];const panels=[...document.querySelectorAll('[data-development-panel]')];const menu=document.querySelector('.development-tabs');return {selected:pressed.map(x=>x.dataset.id),panels:panels.map(x=>x.dataset.developmentPanel),tabs:menu.querySelectorAll('button').length,overflow:document.documentElement.scrollWidth-innerWidth,menuOverflow:menu.scrollWidth-menu.clientWidth};})()`);
  assert.deepEqual(layout.selected,[id]);
  assert.deepEqual(layout.panels,[id]);
  assert.equal(layout.tabs,development.length);
  assert.ok(layout.overflow<=1&&layout.menuOverflow<=1,JSON.stringify(layout));
  const advice = await page.evaluate(`document.querySelector('${coach}').innerText`);
  assert.ok(advice.includes(label),`${label} needs an actual introduction, not another page's generic advice: ${advice}`);
  assert.match(advice,concept,`${label} must explain a real player-facing concept`);
  assert.doesNotMatch(advice,/undefined|NaN|\[object Object\]/);
  assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-skip-intro]`)),'tour remains optional during development');
  await page.evaluate(`document.querySelector('${coach}').scrollIntoView({block:'start'})`);
  await page.screenshot(`/tmp/v38-development-intro-${viewport.width}-${id}.png`);
  return advice;
}

for (const viewport of [{width:390,height:844,mobile:true},{width:320,height:568,mobile:true}]) {
  test(`fresh first order introduces each of the eleven real development sections at ${viewport.width}px`, {skip:!enabled,timeout:120_000}, async()=>{
    const browser=await launchBrowser(root);
    try {
      const page=await browser.page(viewport);
      await startFreshFirstOrder(page);
      const baseline=(await saved(page)).state;
      const introduced=new Set(['orders']);
      assert.ok((await saved(page)).view.coachTour.visited.includes('orders'));
      assert.ok(await page.evaluate(exists(guideSelector)));
      await clickCoach(page,'[data-page=company][data-coach-tab=finance]');
      await checkDevelopmentVisit(page,'finance',viewport,baseline);
      introduced.add('finance');
      if(viewport.width===390) {
        // Manually visit a later tab: it gets its own real explanation and is
        // not silently skipped, duplicated or mistaken for the next tab.
        await page.click('[data-ui=development-tab][data-id=listing]');
        await checkDevelopmentVisit(page,'listing',viewport,baseline);
        introduced.add('listing');
        assert.equal(await page.evaluate(`document.querySelector('${guideSelector}').dataset.coachTab`),'team');
      }
      let didReload=false;
      for(let step=0;step<development.length+2;step++) {
        const next=await page.evaluate(`document.querySelector('${guideSelector}')?.dataset.coachTab??null`);
        if(!next)break;
        assert.ok(!introduced.has(next),`intro unexpectedly repeats ${next}`);
        await clickCoach(page,`[data-page=company][data-coach-tab="${next}"]`);
        const explanation=await checkDevelopmentVisit(page,next,viewport,baseline);
        introduced.add(next);
        if(!didReload && introduced.size>=6){
          const view=(await saved(page)).view.coachTour;
          await restartFromSave(page);
          assert.deepEqual((await saved(page)).view.coachTour,view,'mid-tour progress and the currently explained page survive reload');
          assert.equal(await checkDevelopmentVisit(page,next,viewport,baseline),explanation);
          didReload=true;
        }
      }
      assert.ok(didReload);
      assert.deepEqual([...introduced].sort(),['orders',...development.map(([key])=>key)].sort());
      await clickCoach(page,'[data-page=offwork]');
      assert.equal((await saved(page)).view.page,'offwork');
      assert.ok(await page.evaluate(exists('[data-life-app-page=home]')));
      assert.deepEqual((await saved(page)).state,baseline);
      const complete=(await saved(page)).view.coachTour;
      assert.deepEqual([...complete.visited].sort(),[...tourIds].sort());
      assert.equal(complete.skipped,false);
      assert.equal(complete.active,'offwork');
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/精力|休息|娱乐/);
      await clickCoach(page,'[data-ui=coach-finish-intro]');
      assert.equal((await saved(page)).view.coachTour.active,null);
      assert.equal((await saved(page)).view.coachLearning,false);
      assert.deepEqual((await saved(page)).state,baseline);
      await nav(page,'office');
      assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-skip-intro]`)),false,'completed tour does not repeat on another page');
      assert.ok(await page.evaluate(exists(`${coach} .coach-action`)),'the normal weekly guide remains available');
      await restartFromSave(page);
      assert.deepEqual([...((await saved(page)).view.coachTour.visited)].sort(),[...tourIds].sort());
      assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-skip-intro]`)),false);
      assert.deepEqual((await saved(page)).state,baseline);
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}

// Reachability fixture for targeted skip/legacy/urgent tests. The contract is
// still generated by actual game actions; only the preceding play is omitted.
const firstOrderFixture = extra => `game=>{
  let s=game.newGame({difficulty:'casual',seed:381});
  const bid=game.act(s,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93});
  if(bid.error)throw Error(bid.error);
  const settlement=game.act(bid.state,{type:'end-week'});
  if(settlement.error||!settlement.state.orders.length)throw Error('missing first contract');
  s=settlement.state;s.summary=null;s.events=[];s.tutorial.done=true;
  ${extra??''}
  return s;
}`;

async function loadFirstOrder(page,extra='',firstPage='office',learning='begin') {
  await page.goto();
  await page.waitFor(exists('[data-form=new-game]'));
  await loadScenario(page,firstOrderFixture(extra));
  await nav(page,firstPage);
  if(learning==='begin')await clickCoach(page,'[data-ui=coach-start-learning]');
  if(learning==='interrupted'){
    // Seed a previously chosen learning session that is already interrupted
    // by a genuine pending task; no lesson should be counted prematurely.
    await page.evaluate(`(()=>{const record=${storage};record.view.coachLearning=true;localStorage.setItem(${JSON.stringify(SAVE_KEY)},JSON.stringify(record));})()`);
    await restartFromSave(page);
  }
}

test('skipping the development introduction never invents visits, expenses or repeated guidance', {skip:!enabled,timeout:120_000}, async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:320,height:568,mobile:true});
    await loadFirstOrder(page,'','orders');
    await clickCoach(page,'[data-page=company][data-coach-tab=finance]');
    const before=await saved(page);
    await clickCoach(page,'[data-ui=coach-skip-intro]');
    const after=await saved(page);
    assert.equal(after.view.coachTour.skipped,true);
    assert.equal(after.view.coachLearning,false);
    assert.deepEqual(after.view.coachTour.visited,before.view.coachTour.visited,'skipping must not fake unviewed sections');
    assert.deepEqual(after.state,before.state);
    await page.click('[data-ui=development-tab][data-id=markets]');
    assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-skip-intro]`)),false);
    await restartFromSave(page);
    assert.equal((await saved(page)).view.coachTour.skipped,true);
    assert.deepEqual((await saved(page)).view.coachTour.visited,before.view.coachTour.visited);
    await nav(page,'office');
    assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-skip-intro]`)),false);
    assert.ok(await page.evaluate(exists(`${coach} .coach-action`)));
    assert.deepEqual((await saved(page)).state,before.state);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});

test('ordinary business does not force a development tour; explicit learning can pause and resume without changing the company', {skip:!enabled,timeout:120_000}, async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:320,height:568,mobile:true});
    await loadFirstOrder(page,'','orders','none');
    const before=await saved(page);
    assert.equal(before.view.coachLearning,false);
    assert.deepEqual(before.view.coachTour.visited,[]);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-intro-next]`)),false);
    assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-start-learning]`)));
    // Merely opening finance or a different page to operate the company is
    // not counted as a tutorial visit and does not make the coach impose one.
    await nav(page,'company');await page.click('[data-ui=development-tab][data-id=finance]');
    assert.deepEqual((await saved(page)).view.coachTour.visited,[]);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-intro-next]`)),false);
    await nav(page,'orders');
    await clickCoach(page,'[data-ui=coach-start-learning]');
    assert.equal((await saved(page)).view.coachLearning,true);
    assert.deepEqual((await saved(page)).view.coachTour.visited,['orders']);
    await clickCoach(page,'[data-page=company][data-coach-tab=finance]');
    assert.deepEqual((await saved(page)).view.coachTour.visited,['orders','finance']);
    await clickCoach(page,'[data-ui=coach-pause-learning]');
    const paused=await saved(page);
    assert.equal(paused.view.coachLearning,false);
    assert.equal(paused.view.coachTour.skipped,false);
    assert.deepEqual(paused.view.coachTour.visited,['orders','finance']);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-intro-next]`)),false);
    assert.deepEqual(paused.state,before.state);
    await restartFromSave(page);
    assert.equal((await saved(page)).view.coachLearning,false);
    await nav(page,'office');
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-intro-next]`)),false);
    await clickCoach(page,'[data-ui=coach-start-learning]');
    await clickCoach(page,'[data-page=company][data-coach-tab=team]');
    assert.deepEqual((await saved(page)).view.coachTour.visited,['orders','finance','team']);
    assert.deepEqual((await saved(page)).state,before.state);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});

test('an active save with the completed old four-step introduction only introduces the new development sections', {skip:!enabled,timeout:120_000}, async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:390,height:844,mobile:true});
    await loadFirstOrder(page,'','office','none');
    const baseline=(await saved(page)).state;
    await page.evaluate(`(()=>{const record=${storage};delete record.view.coachTour;delete record.view.coachLearning;record.view.coachIntro=4;record.view.coachPrep=3;localStorage.setItem(${JSON.stringify(SAVE_KEY)},JSON.stringify(record));})()`);
    await restartFromSave(page);
    const migrated=(await saved(page)).view.coachTour;
    assert.deepEqual([...migrated.visited].sort(),['orders','finance','team','offwork'].sort());
    assert.equal(migrated.skipped,false);
    assert.equal((await saved(page)).view.coachLearning,false,'old save does not automatically start the new lessons');
    await clickCoach(page,'[data-ui=coach-start-learning]');
    const seen=new Set(migrated.visited);
    for(let step=0;step<development.length;step++){
      const next=await page.evaluate(`document.querySelector('${guideSelector}')?.dataset.coachTab??null`);
      if(!next)break;
      assert.ok(!seen.has(next),`old completed step ${next} should not play again`);
      await clickCoach(page,`[data-page=company][data-coach-tab="${next}"]`);
      seen.add(next);
      assert.deepEqual((await saved(page)).state,baseline);
    }
    assert.deepEqual([...seen].sort(),[...tourIds].sort());
    assert.deepEqual([...(await saved(page)).view.coachTour.visited].sort(),[...tourIds].sort());
    await clickCoach(page,'[data-ui=coach-finish-intro]');
    assert.equal((await saved(page)).view.coachTour.active,null);
    await nav(page,'office');
    assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-skip-intro]`)),false);
    assert.deepEqual((await saved(page)).state,baseline);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});

test('cash urgency takes precedence over an unfinished introduction and only taught tabs are recorded', {skip:!enabled,timeout:120_000}, async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:320,height:568,mobile:true});
    // Valid owned collateral keeps a real bank route available. Only the
    // current cash shortfall is seeded so actual urgency can be reproduced.
    await loadFirstOrder(page,`
      const purchase=game.act(s,{type:'buy-property',id:'city-flat'});
      if(purchase.error)throw Error(purchase.error);s=purchase.state;
      s.cash=-2000;s.creditLine=game.creditLimit(s);
    `,'office','interrupted');
    const urgent=await saved(page);
    assert.ok(urgent.state.creditLine>10000);
    assert.deepEqual(urgent.view.coachTour.visited,[]);
    assert.ok(await page.evaluate(exists(`${coach} [data-page=company][data-coach-tab=finance]`)));
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/现金.*负|现金缺口|筹款/);
    await clickCoach(page,'[data-page=company][data-coach-tab=finance]');
    assert.deepEqual((await saved(page)).view.coachTour.visited,[],'an urgent cash action is not the finance introduction');
    await clickCoach(page,'[data-coach-form=borrow]');
    assert.equal((await saved(page)).state.loan,urgent.state.loan);
    assert.equal((await saved(page)).state.cash,urgent.state.cash);
    await page.fill('form[data-form=borrow] input[name=amount]','10000');
    await page.click('form[data-form=borrow] button[type=submit]');
    const resolved=await saved(page);
    assert.equal(resolved.state.cash,urgent.state.cash+10000);
    assert.equal(resolved.state.loan,urgent.state.loan+10000);
    assert.equal(resolved.state.week,urgent.state.week);
    assert.equal(resolved.view.coachTour.skipped,false);
    assert.equal(resolved.view.coachTour.active,'finance');
    assert.deepEqual(resolved.view.coachTour.visited,['finance']);
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/财务|授信/);
    assert.ok(await page.evaluate(exists(`${coach} [data-page=orders]`)),'after the emergency, continue the first unvisited real lesson');
    await clickCoach(page,'[data-page=orders]');
    const resumed=await saved(page);
    assert.ok(resumed.view.coachTour.visited.includes('orders'));
    assert.deepEqual(resumed.state,resolved.state);
    assert.equal(resumed.view.coachTour.skipped,false);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});

test('an actual pending weekly decision interrupts teaching, then the visited tab is introduced when resolved', {skip:!enabled,timeout:120_000}, async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try{
    const page=await browser.page({width:390,height:844,mobile:true});
    // Deterministically reach a real engine-generated event while preserving
    // an unfinished tour; no synthetic event options are inserted.
    await loadFirstOrder(page,`
      for(let i=0;i<10&&!s.events.length;i++){
        const progressed=game.act(s,{type:'end-week'});if(progressed.error)throw Error(progressed.error);
        s=progressed.state;s.summary=null;
      }
      if(!s.events.length)throw Error('missing actual decision');
    `,'office','none');
    const pending=await saved(page);
    assert.ok(pending.state.events.length);
    assert.ok(await page.evaluate(exists(`${coach} [data-ui=show-event]`)));
    await nav(page,'company');
    await page.click('[data-ui=development-tab][data-id=markets]');
    assert.equal((await saved(page)).view.developmentTab,'markets');
    assert.deepEqual((await saved(page)).view.coachTour.visited,[]);
    assert.ok(await page.evaluate(exists(`${coach} [data-ui=show-event]`)));
    // Restore the already chosen learning mode on the tab where the pending
    // decision interrupted it. The real save restore opens the event modal
    // immediately; navigation under that modal is intentionally unavailable.
    await page.evaluate(`(()=>{const record=${storage};record.view.coachLearning=true;localStorage.setItem(${JSON.stringify(SAVE_KEY)},JSON.stringify(record));})()`);
    await restartFromSave(page);
    await page.waitFor(exists('dialog[open] [data-action=resolve-event]'));
    assert.equal((await saved(page)).view.coachLearning,true);
    assert.equal((await saved(page)).view.developmentTab,'markets');
    assert.deepEqual((await saved(page)).view.coachTour.visited,[]);
    assert.deepEqual((await saved(page)).state,pending.state,'opening the event cannot resolve itself');
    const choice='dialog[open] [data-action=resolve-event][data-choice=pass]';
    assert.ok(await page.evaluate(exists(choice)),'fixture uses the actual supplier invitation and its no-cost alternative');
    await page.click(choice);
    const after=await saved(page);
    assert.equal(after.state.events.length,pending.state.events.length-1);
    assert.equal(after.state.week,pending.state.week);
    assert.equal(after.state.cash,pending.state.cash);
    assert.deepEqual(after.view.coachTour.visited,['markets']);
    assert.equal(after.view.coachTour.active,'markets');
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/市场/);
    assert.ok(await page.evaluate(exists(`${coach} [data-page=orders]`)));
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});
