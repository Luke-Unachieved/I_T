import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';
import { LIFE_CATALOG } from '../v38/engine/life.js';
import { factorValue, liquidationValue, expediteFee } from '../v38/engine/game.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const enabled=process.env.V38_BROWSER==='1';
const coach='.workspace > .coach-card';
const exists=selector=>`Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const storage=`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`;
const saved=page=>page.evaluate(storage);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const fresh=`game=>{const s=game.newGame({name:'助理操作验收',difficulty:'casual',seed:381});s.tutorial.done=true;return s;}`;
const viewports=[{width:320,height:568,mobile:true},{width:390,height:844,mobile:true}];

// Verify the physical click reaches the intended UI, not a covering panel or
// fixed navigation. Use genuine pointer events instead of element.click().
async function tap(page,selector,{double=false}={}){
  const point=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,hit:el===hit||el.contains(hit),disabled:Boolean(el.disabled),label:el.textContent.trim().slice(0,90)};})()`);
  assert.ok(point&&point.hit&&!point.disabled,`physical tap: ${selector} ${JSON.stringify(point)}`);
  const xy={x:point.x,y:point.y};
  await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',...xy});
  for(const clickCount of double?[1,2]:[1]){
    if(clickCount===2)await pause(70);
    await page.send('Input.dispatchMouseEvent',{type:'mousePressed',...xy,button:'left',clickCount});
    await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',...xy,button:'left',clickCount});
  }
}
const c=(page,selector,options)=>tap(page,`${coach} ${selector}`,options);
const nav=(page,id)=>tap(page,`.nav [data-page="${id}"]`);
async function visibleTarget(page,selector,{focus=true}={}){
  const value=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);return{focused:document.activeElement===el||el.contains(document.activeElement),actual:document.activeElement?.outerHTML.slice(0,180),visible:r.top>=-1&&r.bottom<=innerHeight+1&&r.left>=-1&&r.right<=innerWidth+1&&Boolean(h&&(el===h||el.contains(h))),disabled:Boolean(el.disabled),geometry:{x:r.x,y:r.y,w:r.width,h:r.height},highlight:el.classList.contains('tutorial-target')};})()`);
  assert.ok(value&&value.visible&&!value.disabled,`guidance target not physically visible/actionable: ${selector} ${JSON.stringify(value)}`);
  if(focus)assert.ok(value.focused,`guidance did not focus target: ${selector} ${JSON.stringify(value)}`);
  return value;
}
async function reload(page){
  await page.send('Page.reload');await page.waitFor(exists('[data-ui=resume-save]'));await tap(page,'[data-ui=resume-save]');
}
async function runFixture(viewport,name,body){
  const browser=await launchBrowser(root,{scenarios:true});
  let page;
  try{
    page=await browser.page(viewport);await page.goto();await page.waitFor(exists('[data-form=new-game]'));
    await body(page);assert.deepEqual(page.errors,[]);
  }catch(error){
    if(page)await page.screenshot(`/tmp/v38-cta-${viewport.width}-${name}-failure.png`).catch(()=>{});
    throw error;
  }finally{await browser.close();}
}
async function arrow(page,key,code){
  await page.evaluate('document.querySelector("dialog input[name=ratio]").focus()');
  await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key,code:key,windowsVirtualKeyCode:code});
  await page.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});
}

for(const viewport of viewports){
  test(`manual quote, filter, decline and restored draft respond to actual taps at ${viewport.width}px`,{skip:!enabled,timeout:120_000},()=>runFixture(viewport,'quote',async page=>{
    await loadScenario(page,fresh);await nav(page,'inquiries');
    const initial=await currentState(page);
    const categories=[...new Set(initial.inquiries.map(item=>item.category))];
    const absent=await page.evaluate(`[...document.querySelector('select[name=category]').options].map(o=>o.value).find(x=>x&&!${JSON.stringify(categories)}.includes(x))`);
    assert.ok(absent);
    await page.evaluate(`(()=>{const el=document.querySelector('select[name=category]');el.value=${JSON.stringify(absent)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await page.evaluate('document.querySelectorAll("article[data-inquiry-id]").length'),0);
    await c(page,'[data-ui=coach-all-inquiries]');
    assert.equal((await saved(page)).view.filters.category,'');
    assert.ok(await page.evaluate('document.querySelectorAll("article[data-inquiry-id]").length>0'));
    assert.deepEqual(await currentState(page),initial);
    const first=await page.evaluate(`document.querySelector('${coach} [data-ui=quote-open]').dataset.id`);
    await c(page,`[data-ui=coach-skip-inquiry][data-id="${first}"]`);
    assert.notEqual(await page.evaluate(`document.querySelector('${coach} [data-ui=quote-open]').dataset.id`),first);
    assert.ok((await saved(page)).view.coachDeclined.inquiries.includes(first));
    assert.deepEqual(await currentState(page),initial);
    await tap(page,'article[data-inquiry-id=w1-2] [data-ui=quote-open]');
    await tap(page,'dialog input[name=source][value=factory]');
    await arrow(page,'ArrowLeft',37);
    assert.match(await page.evaluate('document.querySelector("dialog .coach-card h3").textContent'),/你的报价方案可保留/);
    await tap(page,'dialog [data-ui=coach-review-submit]');
    await visibleTarget(page,'dialog form[data-form=quote] button[type=submit]');
    assert.equal((await currentState(page)).bids.length,0);
    await tap(page,'dialog [data-ui=coach-review-submit]',{double:true});
    assert.ok((await visibleTarget(page,'dialog form[data-form=quote] button[type=submit]',{focus:false})).highlight);
    assert.equal((await currentState(page)).bids.length,0);
    await tap(page,'dialog [data-ui=close-dialog]');
    assert.equal(await page.evaluate('document.querySelector("dialog").open'),false);
    await reload(page);
    await tap(page,'article[data-inquiry-id=w1-2] [data-ui=quote-open]');
    assert.equal(await page.evaluate('document.querySelector("dialog input[name=ratio]").value'),'99');
    assert.equal(await page.evaluate('document.querySelector("dialog input[name=source]:checked").value'),'factory');
    await tap(page,'dialog input[name=source][value=stock]');await arrow(page,'Home',36);
    assert.match(await page.evaluate('document.querySelector("dialog .coach-card h3").textContent'),/你的改动有经营风险/);
    await tap(page,'dialog [data-ui=coach-apply-quote]');
    assert.match(await page.evaluate('document.querySelector("dialog .coach-card h3").textContent'),/已采用当前建议方案/);
    await tap(page,'dialog [data-ui=coach-review-submit]');
    await visibleTarget(page,'dialog form[data-form=quote] button[type=submit]');
    assert.equal((await currentState(page)).bids.length,0);
    await tap(page,'dialog form[data-form=quote] button[type=submit]');
    const submitted=await currentState(page);assert.equal(submitted.bids.length,1);
    // No artificial wait between the confirmed action and a different CTA.
    await c(page,'[data-page=office][data-coach-tab=cash-forecast]');
    await visibleTarget(page,'.forecast-panel h2');
    assert.deepEqual(await currentState(page),submitted);
    await tap(page,'.forecast-panel [data-ui=page][data-coach-tab=finance]');
    assert.equal((await saved(page)).view.developmentTab,'finance');
    assert.deepEqual(await currentState(page),submitted);
    await page.screenshot(`/tmp/v38-cta-${viewport.width}-quote-finance.png`);
  }));
}

for(const viewport of viewports){
  test(`consecutive overdue reminder and expedite reveal actual folded controls at ${viewport.width}px`,{skip:!enabled,timeout:120_000},()=>runFixture(viewport,'orders',async page=>{
    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'bid',inquiryId:'w1-1',source:'stock',ratio:80}).state;for(let n=0;n<3;n++){s=game.act(s,{type:'end-week'}).state;s.summary=null;s.events=[];}const invoice=s.receivables[0];invoice.status='overdue';invoice.originalDueWeek=s.week-1;invoice.dueWeek=s.week+5;s.cash=150000;s.creditLine=game.creditLimit(s);s=game.act(s,{type:'bid',inquiryId:'w3-1',source:'factory',ratio:86}).state;s=game.act(s,{type:'end-week'}).state;s.summary=null;s.events=[];s.orders.find(o=>o.status==='procurement').dueWeek=s.week;s.tutorial.done=true;s.inquiries=[];return s;}`);
    const before=await currentState(page),invoice=before.receivables.find(item=>item.status==='overdue'),order=before.orders.find(item=>item.status==='procurement');
    assert.ok(invoice&&order);
    await nav(page,'orders');
    for(const section of ['orders-delivery','orders-receivables']){
      await tap(page,`#${section} > summary`);
      await page.waitFor(`!document.getElementById(${JSON.stringify(section)}).open&&${storage}.view.ordersCollapsed.includes(${JSON.stringify(section)})`);
    }
    await nav(page,'offwork');await c(page,'[data-page=orders][data-coach-tab=orders-receivables]');
    await c(page,`[data-coach-action=collect][data-id="${invoice.id}"]`);
    const collect=`[data-action=collect][data-id="${invoice.id}"]`;
    await visibleTarget(page,collect);
    assert.ok(await page.evaluate('document.querySelector("#orders-receivables").open'));
    assert.deepEqual(await currentState(page),before);
    await tap(page,collect);
    const reminded=await currentState(page);
    assert.equal(reminded.receivables.find(item=>item.id===invoice.id).reminderWeek,before.week);
    assert.equal(reminded.cash,before.cash);
    await c(page,`[data-coach-action=expedite][data-id="${order.id}"]`);
    const expedite=`[data-action=expedite][data-id="${order.id}"]`;
    await visibleTarget(page,expedite);
    assert.ok(await page.evaluate('document.querySelector("#orders-delivery").open'));
    assert.deepEqual(await currentState(page),reminded);
    await page.screenshot(`/tmp/v38-cta-${viewport.width}-expedite.png`);
    await tap(page,expedite);
    const accelerated=await currentState(page);
    assert.ok(accelerated.orders.find(item=>item.id===order.id).expedited);
    assert.equal(accelerated.cash,reminded.cash-expediteFee(order));
    assert.equal(accelerated.week,before.week);
    await reload(page);assert.deepEqual(await currentState(page),accelerated);
  }));

  test(`leisure guidance alternate app routes, real recommended rest and footer at ${viewport.width}px`,{skip:!enabled,timeout:120_000},()=>runFixture(viewport,'leisure',async page=>{
    await loadScenario(page,`game=>{const s=game.newGame({difficulty:'casual',seed:381});s.inquiries=[];s.tutorial.done=true;return s;}`);
    const quiet=await currentState(page);
    await c(page,'[data-ui=coach-leisure-menu]');await visibleTarget(page,'[data-ui=life-app][data-id=trips]');
    await tap(page,'[data-ui=life-app][data-id=friends]');await c(page,'[data-ui=coach-leisure-menu]');
    await visibleTarget(page,'#life-friends-streets > summary');
    assert.deepEqual(await currentState(page),quiet);
    await tap(page,'[data-ui=life-app][data-id=home]');await tap(page,'[data-ui=life-app][data-id=property]');
    await c(page,'[data-ui=coach-leisure-menu]');
    assert.equal((await saved(page)).view.lifeApp,'home');
    await visibleTarget(page,'[data-ui=life-app][data-id=trips]');assert.deepEqual(await currentState(page),quiet);
    await loadScenario(page,`game=>{const s=game.newGame({difficulty:'casual',seed:381});s.inquiries=[];s.energy=15;s.tutorial.done=true;return s;}`);
    const tired=await currentState(page);
    await c(page,'[data-page=offwork]');
    const activity=await page.evaluate(`(()=>{const el=document.querySelector('${coach} [data-ui=coach-select-outing],${coach} [data-coach-action=outing]');return el?{id:el.dataset.id,choice:el.dataset.choice??null,detailed:el.dataset.ui==='coach-select-outing'}:null;})()`);
    assert.ok(activity);
    const item=LIFE_CATALOG.outings.find(x=>x.id===activity.id);
    const selected=activity.detailed?item.choices.find(x=>x.id===activity.choice):item;
    assert.ok(selected);
    await c(page,activity.detailed?'[data-ui=coach-select-outing]':'[data-coach-action=outing]');
    const submit=activity.detailed?`[data-outing-id="${item.id}"] button[type=submit]`:`[data-action=outing][data-id="${item.id}"]`;
    if(activity.detailed)await visibleTarget(page,`[data-outing-id="${item.id}"] input[name=choiceId][value="${selected.id}"]`);
    else await visibleTarget(page,submit);
    assert.deepEqual(await currentState(page),tired);
    await tap(page,submit);
    const rested=await currentState(page);
    assert.equal(rested.cash,tired.cash-selected.price);
    assert.equal(rested.energy,Math.min(100,tired.energy+selected.energy));
    assert.equal(rested.life.latestOuting.id,item.id);assert.equal(rested.life.lastBreakWeek,tired.week);
    await tap(page,'#latest-outing [data-ui=coach-review-next]');
    await visibleTarget(page,`${coach} [data-ui=coach-settlement]`);
    assert.deepEqual(await currentState(page),rested);
    await c(page,'[data-ui=coach-settlement]');await visibleTarget(page,'.week-controls [data-action=end-week]');
    assert.deepEqual(await currentState(page),rested);
    await page.screenshot(`/tmp/v38-cta-${viewport.width}-footer.png`);
    await tap(page,'.week-controls [data-action=end-week]');
    await page.waitFor(exists('dialog.summary-dialog[open]'));
    assert.equal((await currentState(page)).week,rested.week+1);
  }));
}

for(const viewport of viewports){
  test(`actual cash emergency mortgage, bank, asset sale, factoring and inventory routes at ${viewport.width}px`,{skip:!enabled,timeout:120_000},()=>runFixture(viewport,'funding',async page=>{
    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'buy-property',id:'city-flat'}).state;s=game.act(s,{type:'borrow',amount:17500}).state;s.cash=-1000;s.creditLine=game.creditLimit(s);s.inquiries=[];s.tutorial.done=true;return s;}`);
    const before=await currentState(page);
    await c(page,'[data-page=offwork]');await c(page,'[data-coach-action=mortgage]');
    const mortgage='[data-action=mortgage][data-id=city-flat]';
    await visibleTarget(page,mortgage);
    assert.equal((await saved(page)).view.lifeApp,'property');
    assert.deepEqual(await currentState(page),before);
    // A second deliberate positioning tap on the already-selected app.
    await c(page,'[data-coach-action=mortgage]');await visibleTarget(page,mortgage);
    await tap(page,mortgage,{double:true});
    const mortgaged=await currentState(page);
    assert.equal(mortgaged.cash,before.cash);
    assert.equal(mortgaged.creditLine-before.creditLine,34100);
    assert.ok(mortgaged.life.properties.find(item=>item.id==='city-flat').pledged);
    await c(page,'[data-page=company][data-coach-tab=finance]');
    assert.equal((await saved(page)).view.developmentTab,'finance');
    await c(page,'[data-coach-form=borrow]');
    await visibleTarget(page,'form[data-form=borrow] input[name=amount]');
    assert.equal(await page.evaluate('document.querySelector("form[data-form=borrow] input[name=amount]").value'),'1000');
    assert.deepEqual(await currentState(page),mortgaged);
    await tap(page,'form[data-form=borrow] button[type=submit]');
    const borrowed=await currentState(page);
    assert.equal(borrowed.cash,0);assert.equal(borrowed.loan,mortgaged.loan+1000);
    assert.equal(borrowed.week,before.week);
    await reload(page);assert.deepEqual(await currentState(page),borrowed);

    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'buy-car',id:'hatch'}).state;s=game.act(s,{type:'borrow',amount:10000}).state;s.cash=-5000;s.creditLine=game.creditLimit(s);s.inquiries=[];s.tutorial.done=true;return s;}`);
    const holding=await currentState(page);
    await c(page,'[data-page=offwork]');await c(page,'[data-coach-action=sell-car]');
    await visibleTarget(page,'[data-action=sell-car][data-id=hatch]');
    assert.equal((await saved(page)).view.lifeApp,'car');assert.deepEqual(await currentState(page),holding);
    await tap(page,'[data-action=sell-car][data-id=hatch]');
    const sold=await currentState(page);
    assert.equal(sold.cash,holding.cash+Math.floor(LIFE_CATALOG.cars.find(item=>item.id==='hatch').price*.65));
    assert.deepEqual(sold.life.cars,[]);

    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s=game.act(s,{type:'bid',inquiryId:'w1-1',source:'stock',ratio:80}).state;for(let n=0;n<3;n++){s=game.act(s,{type:'end-week'}).state;s.summary=null;s.events=[];}s.cash=-1000;s.creditLine=game.creditLimit(s);s.inquiries=[];s.tutorial.done=true;return s;}`);
    const receivable=await currentState(page),invoice=receivable.receivables.find(item=>item.status==='open');
    const payout=factorValue(receivable,invoice);assert.ok(payout>0);
    await c(page,'[data-page=orders][data-coach-tab=orders-receivables]');
    await c(page,`[data-coach-action=factor][data-id="${invoice.id}"]`);
    const factor=`[data-action=factor][data-id="${invoice.id}"]`;
    await visibleTarget(page,factor);assert.deepEqual(await currentState(page),receivable);
    await tap(page,factor);
    const factored=await currentState(page);
    assert.equal(factored.cash,receivable.cash+payout);
    assert.equal(factored.receivables.find(item=>item.id===invoice.id).status,'factored');

    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});s.cash=200000;s=game.act(s,{type:'invest-venture',id:'warehouse'}).state;s=game.act(s,{type:'purchase-stock',productId:s.inquiries[0].productId,quantity:96}).state;s.cash=-1000;s.loan=100000;s.creditLine=game.creditLimit(s);s.inquiries=[];s.tutorial.done=true;return s;}`);
    const inventory=await currentState(page),product=inventory.inventory[0].productId;
    const quantity=inventory.inventory.filter(item=>item.productId===product).reduce((sum,item)=>sum+item.quantity,0);
    const value=liquidationValue(inventory,product,quantity);assert.ok(value>0);
    await c(page,'[data-page=orders][data-coach-tab=orders-inventory]');
    await c(page,`[data-coach-action=liquidate][data-id="${product}"]`);
    const liquidation=`[data-action=liquidate][data-id="${product}"]`;
    await visibleTarget(page,liquidation);assert.deepEqual(await currentState(page),inventory);
    await page.screenshot(`/tmp/v38-cta-${viewport.width}-inventory.png`);
    await tap(page,liquidation);
    const emptied=await currentState(page);
    assert.equal(emptied.cash,inventory.cash+value);
    assert.ok(!emptied.inventory.some(item=>item.productId===product&&item.quantity>0));
  }));
}
