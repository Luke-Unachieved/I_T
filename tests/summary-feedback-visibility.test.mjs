import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { act, newGame } from '../v38/engine/game.js';
import { generateInquiries, quote } from '../v38/engine/quotes.js';
import { decisionInfo } from '../v38/engine/expansion.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const firstArt = {
  won:'assets/v38-feedback-order-won.webp',
  delivered:'assets/v38-feedback-delivered.webp',
  paid:'assets/v38-feedback-paid.webp',
};
const assetFor=(kind,variant)=>variant==='first'?firstArt[kind]:`assets/v38-feedback-${kind}-${variant}.webp`;

function step(state, action) {
  const next=act(state,action);
  assert.ifError(next.error);
  return next.state;
}

function dismissFixtureDecisions(state) {
  // Reach later states using actual engine-generated business outcomes, not
  // hand-written summary flags. Resolve encountered decisions through the
  // same engine, choosing the least immediate expenditure.
  let next=state;
  next.summary=null;
  while(next.events.length){
    const event=next.events[0];
    const choice=decisionInfo(next,event).choices.filter(item=>!item.disabled)
      .sort((a,b)=>Math.max(0,a.cost??0)-Math.max(0,b.cost??0))[0];
    assert.ok(choice);
    next=step(next,{type:'resolve-event',id:event.id,choice:choice.id});
  }
  return next;
}

function outcomeKinds(summary) {
  const weeks=summary.weeks??[summary];
  return [
    ...(weeks.some(week=>week.won.length)?['won']:[]),
    ...(weeks.some(week=>week.delivered.length)?['delivered']:[]),
    ...(weeks.some(week=>(week.cashBreakdown?.inflow?.customerPayment??0)>0)?['paid']:[]),
  ];
}

function assertActualVariant(fixture,settled,kind) {
  const previous=fixture.state;
  const weeks=settled.summary.weeks??[settled.summary];
  const orders=new Map(settled.orders.map(order=>[order.id,order]));
  const invoices=new Map(settled.receivables.map(invoice=>[invoice.id,invoice]));
  const records=kind==='won'?weeks.flatMap(week=>week.won.map(item=>orders.get(item.orderId))):
    kind==='delivered'?weeks.flatMap(week=>week.delivered.map(id=>orders.get(id))):
      weeks.flatMap(week=>week.collected.map(item=>invoices.get(item.id)).filter(invoice=>invoice?.status==='paid'&&invoice.paidWeek===week.week));
  assert.ok(records.length&&records.every(Boolean),'scenario must have actual business records for this image');
  const isFirst=kind==='won'?!previous.orders.length:
    kind==='delivered'?!previous.orders.some(order=>order.deliveredWeek):
      !previous.receivables.some(invoice=>invoice.status==='paid');
  const foreign=records.every(item=>(item.market&&item.market!=='domestic')||(item.currency&&item.currency!=='CNY'));
  const expected=isFirst?'first':foreign?'overseas':records.length>1?'multiple':'domestic';
  assert.equal(fixture.variants[kind],expected,'fixture actually produced the intended milestone/foreign/grouped business records');
}

function buildFixtures() {
  const fixtures=new Map();
  const keep=(name,state,kinds,active,action='end-week',variants={})=>
    fixtures.set(name,{state:structuredClone(state),kinds,active,action,variants:Object.fromEntries(kinds.map(kind=>[kind,variants[kind]??(name.startsWith('first-')?'first':'domestic')]))});
  let state=newGame({name:'结算首屏验收',seed:381,difficulty:'casual'});
  state.tutorial.done=true;
  state=step(state,{type:'bid',inquiryId:state.inquiries[0].id,source:'stock',ratio:80});
  for(const [name,kinds] of [
    ['first-won',['won']],['quiet',[]],['first-delivered',['delivered']],['first-paid',['paid']],
  ]){
    // Four-week advancement intentionally stops when a new bid is won.
    // Start just after the first win so the actual multiweek summary contains
    // both the first delivery and first payment, with the earlier delivery
    // correctly selected rather than skipping to payment.
    if(name==='quiet')keep('combined-first-delivery-paid',state,['delivered','paid'],'delivered','advance-four',{delivered:'first',paid:'first'});
    keep(name,state,kinds,kinds[0]??null);
    state=dismissFixtureDecisions(step(state,{type:'end-week'}));
  }
  // The second actual contract is later delivered and paid independently,
  // after the first contract's milestones are already complete.
  let multiple=structuredClone(state);
  for(const [inquiryId,source,ratio] of [['w5-3','factory',98],['w5-2','factory',93],['w4-4','factory',80]])
    multiple=step(multiple,{type:'bid',inquiryId,source,ratio});
  keep('multiple-won',multiple,['won'],'won','end-week',{won:'multiple'});

  // Reach an already mature export business using only seeded prerequisites
  // (capital, reputation, qualification delivery count). The certificate and
  // market opening, generated overseas inquiry, bid, shipment and payment
  // are real engine actions, with the prior domestic first milestones intact.
  let overseas=structuredClone(state);
  overseas.cash=200000;overseas.company.rep=88;overseas.year.deliveries=10;
  overseas=step(overseas,{type:'buy-cert',id:'export'});
  overseas=step(overseas,{type:'open-market',id:'se-asia'});
  overseas.inquiries=generateInquiries(overseas);
  assert.equal(overseas.inquiries.find(x=>x.id==='w5-1').market,'se-asia');
  overseas=step(overseas,{type:'bid',inquiryId:'w5-1',source:'factory',ratio:80});
  keep('overseas-won',overseas,['won'],'won','end-week',{won:'overseas'});
  for(let n=0;n<10;n++){
    const next=step(overseas,{type:'end-week'});
    if(next.summary.delivered.length)keep('overseas-delivered',overseas,['delivered'],'delivered','end-week',{delivered:'overseas'});
    if(next.summary.cashBreakdown.inflow.customerPayment)keep('overseas-paid',overseas,['paid'],'paid','end-week',{paid:'overseas'});
    overseas=dismissFixtureDecisions(next);
  }

  state=step(state,{type:'bid',inquiryId:'w5-3',source:'factory',ratio:98});
  keep('repeat-won',state,['won'],'won');
  for(let n=0;n<8;n++){
    const next=step(state,{type:'end-week'});
    if(next.summary.delivered.length)keep('repeat-delivered',state,['delivered'],'delivered');
    if(next.summary.cashBreakdown.inflow.customerPayment)keep('repeat-paid',state,['paid'],'paid');
    state=dismissFixtureDecisions(next);
  }
  // A second legitimate trajectory quotes one feasible profitable opportunity
  // per week. Week 7 coincides with its first payment; week 8 has three
  // ordinary outcomes. The preceding weeks are a reachability fixture only.
  state=newGame({name:'结算首屏验收',seed:381,difficulty:'casual'});
  state.tutorial.done=true;
  for(let n=0;n<14;n++){
    const candidates=[];
    for(const inquiry of state.inquiries)for(const source of ['stock','factory'])for(const ratio of [80,83,86,90,93,95,98,100]){
      const offer=quote(state,inquiry,{source,ratio,extraTerms:0});
      if(!offer.error&&offer.profit>100&&offer.workingCapital<state.cash/3)
        candidates.push({inquiryId:inquiry.id,source,ratio,score:offer.profit*offer.probability});
    }
    candidates.sort((a,b)=>b.score-a.score);
    if(candidates.length)state=step(state,{type:'bid',...candidates[0]});
    if(n===6)keep('combined-first-paid',state,['won','delivered','paid'],'paid','end-week',{paid:'first'});
    if(n===7)keep('combined-repeat',state,['won','delivered','paid'],'paid');
    if(n===13)keep('combined-multiple',state,['won','delivered','paid'],'paid','end-week',{delivered:'multiple',paid:'multiple'});
    state=dismissFixtureDecisions(step(state,{type:'end-week'}));
  }
  assert.equal(fixtures.size,15);
  return fixtures;
}

async function assertFirstScreen(page,kind,variant,caseName,viewport) {
  const region='.summary-feedback';
  const active=`[data-summary-feedback="${kind}"]:not([hidden])`;
  await page.waitFor(present(active));
  const imageSelector=`${active} .summary-feedback-art img`;
  await page.waitFor(`(()=>{const image=document.querySelector(${JSON.stringify(imageSelector)});return image?.naturalWidth>0&&image.closest('.media-frame')?.dataset.mediaState==='loaded'&&Number(getComputedStyle(image).opacity)>.9;})()`);
  // Decode and paint without ever scrolling the summary or image. The former
  // regression test scrolled a card into view before measuring it.
  await page.evaluate(`(async()=>{await document.querySelector(${JSON.stringify(imageSelector)}).decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()`);
  const layout=await page.evaluate(`(()=>{const region=document.querySelector(${JSON.stringify(region)}),scroller=document.querySelector('.summary-scroll'),body=scroller.querySelector('.dialog-body'),card=region.querySelector(${JSON.stringify(active)}),frame=card.querySelector('.media-frame'),image=frame.querySelector('img'),r=frame.getBoundingClientRect(),clip=scroller.getBoundingClientRect(),b=body.getBoundingClientRect(),style=getComputedStyle(image);return {selected:region.dataset.feedbackActive,visibleCards:[...region.querySelectorAll('[data-summary-feedback]')].filter(x=>x.getBoundingClientRect().height>0).map(x=>x.dataset.summaryFeedback),scroll:scroller.scrollTop,width:r.width,bodyWidth:b.width,height:r.height,nw:image.naturalWidth,nh:image.naturalHeight,fullyVisible:r.top>=Math.max(0,clip.top)-1&&r.bottom<=Math.min(innerHeight,clip.bottom)+1&&r.left>=0&&r.right<=innerWidth+1,fit:style.objectFit,variant:card.dataset.feedbackArt,asset:image.getAttribute('data-media-src'),loaded:frame.dataset.mediaState};})()`);
  assert.equal(layout.selected,kind,JSON.stringify(layout));
  assert.deepEqual(layout.visibleCards,[kind]);
  assert.equal(layout.scroll,0,'selected art must be visible when the summary opens, not after a test scroll');
  assert.ok(layout.width>layout.bodyWidth*.8,`illustration must be prominent, not the previous 112px thumbnail: ${JSON.stringify(layout)}`);
  assert.ok(layout.fullyVisible,JSON.stringify(layout));
  assert.ok(Math.abs(layout.height-layout.width*layout.nh/layout.nw)<1.5,JSON.stringify(layout));
  assert.equal(layout.fit,'contain');
  assert.equal(layout.variant,variant,`actual kind and cohort determine artwork: ${caseName}`);
  assert.equal(layout.asset,assetFor(kind,variant));
  assert.equal(layout.loaded,'loaded');
    await page.screenshot(`/tmp/v38-summary-visibility-${viewport.width}-${caseName}-${kind}-${variant}.png`);
}

async function tapVisible(page,selector) {
  // Real pointer gesture at the already-visible choice. Unlike the generic
  // click helper this intentionally does not scroll the element into view.
  const geometry=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect(),clip=document.querySelector('.summary-scroll').getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,visible:r.width>0&&r.height>=44&&r.top>=clip.top-1&&r.bottom<=clip.bottom+1&&document.elementFromPoint(x,y)?.closest('button')===el,pressed:el.getAttribute('aria-pressed')};})()`);
  assert.ok(geometry.visible,JSON.stringify(geometry));
  await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:geometry.x,y:geometry.y});
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:geometry.x,y:geometry.y,button:'left',clickCount:1});
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:geometry.x,y:geometry.y,button:'left',clickCount:1});
}

for(const viewport of [{width:320,height:568,mobile:true},{width:390,height:844,mobile:true}]){
  test(`all first and repeat weekly rewards are visible immediately and combined outcomes switch without state changes at ${viewport.width}px`,{skip:!enabled,timeout:180_000},async()=>{
    const browser=await launchBrowser(root,{scenarios:true});
    try{
      const page=await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form=new-game]'));
      for(const [name,fixture] of buildFixtures()){
        await loadScenario(page,`game=>(${JSON.stringify(fixture.state)})`);
        await page.click('.nav [data-page=offwork]');
        await new Promise(resolve=>setTimeout(resolve,450)); // deliberate distinct weekly gesture
        await page.click(`.week-controls [data-action="${fixture.action}"]`);
        await page.waitFor(present('dialog.summary-dialog[open]'));
        const settled=await currentState(page);
        assert.deepEqual(outcomeKinds(settled.summary),fixture.kinds,`engine result: ${name}`);
        for(const kind of fixture.kinds)assertActualVariant(fixture,settled,kind);
        // At this point no summary control or image has been scrolled.
        assert.equal(await page.evaluate('document.querySelector(".summary-scroll").scrollTop'),0);
        if(fixture.kinds.length){
          await assertFirstScreen(page,fixture.active,fixture.variants[fixture.active],name,viewport);
          if(fixture.kinds.length>1){
            const choices=await page.evaluate('Array.from(document.querySelectorAll(".summary-feedback-choice")).map(x=>({id:x.dataset.id,pressed:x.getAttribute("aria-pressed"),controls:x.getAttribute("aria-controls")}))');
            assert.deepEqual(choices.map(x=>x.id),fixture.kinds);
            assert.deepEqual(choices.filter(x=>x.pressed==='true').map(x=>x.id),[fixture.active]);
            assert.ok(choices.every(x=>x.controls===`summary-feedback-${x.id}`));
            for(const kind of fixture.kinds.filter(kind=>kind!==fixture.active)){
              await tapVisible(page,`[data-ui=summary-feedback-select][data-id="${kind}"]`);
              await assertFirstScreen(page,kind,fixture.variants[kind],name+'-switched',viewport);
              assert.deepEqual(await currentState(page),settled,'changing celebration image must never execute an engine action');
              assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll(".summary-feedback-choice[aria-pressed=true]")).map(x=>x.dataset.id)'),[kind]);
            }
            await tapVisible(page,`[data-ui=summary-feedback-select][data-id="${fixture.active}"]`);
            await assertFirstScreen(page,fixture.active,fixture.variants[fixture.active],name+'-returned',viewport);
            assert.deepEqual(await currentState(page),settled);
            if(name==='combined-repeat'){
              // Refresh with an actual unresolved weekly summary. Its saved
              // business result must reopen with the same default focal
              // outcome, rather than replaying settlement or losing the art.
              await tapVisible(page,'[data-ui=summary-feedback-select][data-id=won]');
              assert.deepEqual(await currentState(page),settled);
              await page.send('Page.reload');
              await page.waitFor(present('[data-ui=resume-save]'));
              await page.click('[data-ui=resume-save]');
              await page.waitFor(present('dialog.summary-dialog[open]'));
              assert.deepEqual(await currentState(page),settled);
              await assertFirstScreen(page,fixture.active,fixture.variants[fixture.active],name+'-resumed',viewport);
            }
          }else assert.equal(await page.evaluate(present('.summary-feedback-choices')),false,'single outcome has no unnecessary switcher');
        }else{
          assert.equal(await page.evaluate(present('.summary-feedback')),false,'no fake celebration on a quiet week');
          await page.screenshot(`/tmp/v38-summary-visibility-${viewport.width}-quiet.png`);
        }
        assert.ok(await page.evaluate(`(()=>{const footer=document.querySelector('dialog .dialog-footer'),r=footer.getBoundingClientRect();return r.bottom<=innerHeight+1&&[...footer.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect();return q.height>=44&&document.elementFromPoint(q.x+q.width/2,q.y+q.height/2)?.closest('button')===b;});})()`),'result actions remain visible');
        await page.click('dialog [data-ui=close-dialog]');
        const continued=await currentState(page);
        assert.equal(continued.cash,settled.cash);
        assert.equal(continued.week,settled.week,'continuing after the summary cannot advance a second week');
      }
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}
