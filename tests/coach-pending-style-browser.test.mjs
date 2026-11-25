import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const enabled=process.env.V38_BROWSER==='1';
const pending='.workspace > .coach-card.coach-planning[data-coach-pending]';
const failed='.workspace > .coach-card.coach-planning[data-coach-error]';
const present=selector=>`Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const state=page=>page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})).state`);

async function startup(page) {
  await page.goto();
  await page.waitFor(present('[data-form=new-game]'));
  await page.evaluate('(()=>{const native=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{if(a instanceof Uint32Array&&a.length===1){a[0]=381;return a;}return native(a);};})()');
  await page.fill('[name=name]','助理等待状态验收');
  await page.click('[data-form=new-game] button[type=submit]',{waitForCoach:false});
}

async function cardLayout(page,selector) {
  return page.evaluate(`(()=>{const card=document.querySelector(${JSON.stringify(selector)});if(!card)return null;const r=card.getBoundingClientRect(),style=getComputedStyle(card),notice=card.querySelector('[role=status]'),nav=document.querySelector('.nav'),b=nav?.querySelector('[data-page=inquiries]'),n=b?.getBoundingClientRect();return {height:r.height,width:r.width,left:r.left,right:r.right,position:style.position,busy:card.getAttribute('aria-busy'),text:card.innerText,status:notice?.innerText??'',overflow:document.documentElement.scrollWidth>innerWidth+1,navHit:!n||b.contains(document.elementFromPoint(n.x+n.width/2,n.y+n.height/2))};})()`);
}

for(const viewport of [{width:320,height:568,mobile:true},{width:390,height:844,mobile:true}]) {
  test(`delayed assistant is a compact non-blocking card and preserves the visible inquiry position at ${viewport.width}px`,{skip:!enabled,timeout:120000},async()=>{
    const browser=await launchBrowser(root);
    try{
      const page=await browser.page(viewport);
      // Delay only the delivery of actual worker replies so a player-visible
      // waiting state can be examined deterministically. The real planner,
      // game state and every rendered recommendation are unchanged.
      await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const Native=window.Worker;window.Worker=class extends Native{addEventListener(type,listener,options){if(type==='message'&&typeof listener==='function')return super.addEventListener(type,event=>setTimeout(()=>listener.call(this,event),2500),options);return super.addEventListener(type,listener,options);}};})()`});
      await startup(page);
      await page.waitFor(present(pending));
      const initial=await cardLayout(page,pending);
      assert.ok(initial&&initial.width<=viewport.width&&initial.height<=220&&!initial.overflow&&initial.position==='static'&&initial.navHit,JSON.stringify(initial));
      assert.equal(initial.busy,'true');
      assert.match(initial.text,/正在|计算|规划/);
      assert.match(initial.status,/继续|浏览|操作/);
      assert.ok(!await page.evaluate(present(`${pending} .coach-action`)),'do not display a stale gold recommendation while waiting');
      await page.screenshot(`/tmp/v38-coach-pending-${viewport.width}.png`);

      // Navigation is an ordinary real click before work has returned.
      await page.click('.nav [data-page=inquiries]',{waitForCoach:false});
      await page.waitFor(present('.inquiry-inbox'));
      await page.waitFor(present(pending));
      assert.match(await page.evaluate('document.querySelector("#page-title").innerText'),/询盘/);
      const before=await state(page);
      const row='article[data-inquiry-id="w1-1"]';
      await page.evaluate(`document.querySelector(${JSON.stringify(row)}).scrollIntoView({block:'center',behavior:'instant'})`);
      const y=await page.evaluate(`document.querySelector(${JSON.stringify(row)}).getBoundingClientRect().top`);
      await page.screenshot(`/tmp/v38-coach-pending-inquiry-${viewport.width}.png`);
      await page.coachReady();
      const afterY=await page.evaluate(`document.querySelector(${JSON.stringify(row)}).getBoundingClientRect().top`);
      assert.ok(Math.abs(afterY-y)<=24,`the busy assistant must not displace a letter already in view: ${y}→${afterY}`);
      assert.deepEqual(await state(page),before,'only advice was computed');

      await page.click(`${row} [data-ui=quote-open]`,{waitForCoach:false});
      await page.waitFor(present('dialog[open] .coach-planning[data-coach-pending]'));
      const opened=await state(page);
      assert.deepEqual({...opened,tutorial:before.tutorial},before,'opening a quote may advance its tutorial marker, but never its actual business');
      const modal=await page.evaluate(`(()=>{const c=document.querySelector('dialog .coach-planning'),r=c.getBoundingClientRect(),dialog=c.closest('dialog').getBoundingClientRect(),form=c.parentElement.querySelector('form[data-form=quote]');return {width:r.width,height:r.height,left:r.left,right:r.right,dialogLeft:dialog.left,dialogRight:dialog.right,choiceEnabled:!document.querySelector('dialog input[name=ratio]').disabled,submitEnabled:!document.querySelector('dialog form[data-form=quote] button[type=submit]').disabled};})()`);
      assert.ok(modal.height<=220&&modal.left>=modal.dialogLeft&&modal.right<=modal.dialogRight+1&&modal.choiceEnabled&&modal.submitEnabled,JSON.stringify(modal));
      await page.screenshot(`/tmp/v38-coach-pending-quote-${viewport.width}.png`);
      await page.coachReady();
      assert.deepEqual(await state(page),opened,'worker completion cannot alter the player state');
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });

  test(`assistant failure has a clear retry button without looking like a blocking warning at ${viewport.width}px`,{skip:!enabled,timeout:90000},async()=>{
    const browser=await launchBrowser(root);
    try{
      const page=await browser.page(viewport);
      // Simulate one transient browser worker startup failure; retry uses the
      // real original Worker class and receives a genuine recommendation.
      await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const Native=window.Worker;let fail=true;window.Worker=function(...args){if(fail){fail=false;throw Error('temporary worker unavailable');}return new Native(...args);};})()`});
      await startup(page);
      await page.waitFor(present(failed));
      const before=await state(page),card=await cardLayout(page,failed);
      assert.ok(card&&card.height<=230&&card.position==='static'&&card.navHit&&!card.overflow,JSON.stringify(card));
      assert.match(card.text,/助理.*暂|助理.*未|助理.*失败|助理.*重试/s);
      const retry=`${failed} [data-ui=coach-retry]`;
      const button=await page.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(retry)}),r=b.getBoundingClientRect(),s=getComputedStyle(b),x=r.x+r.width/2,y=r.y+r.height/2;return{width:r.width,height:r.height,hit:b.contains(document.elementFromPoint(x,y)),fill:s.backgroundColor,border:s.borderTopColor,style:s.borderTopStyle,enabled:!b.disabled};})()`);
      assert.ok(button.hit&&button.enabled&&button.width>=44&&button.height>=44&&button.style==='solid'&&button.fill!=='rgba(0, 0, 0, 0)'&&button.border!=='rgba(0, 0, 0, 0)',JSON.stringify(button));
      await page.screenshot(`/tmp/v38-coach-error-${viewport.width}.png`);
      await page.click(retry);
      await page.waitFor(present('.workspace > .coach-card .coach-action'));
      assert.ok(!await page.evaluate(present(failed)));
      assert.deepEqual(await state(page),before,'retrying the assistant never advances or spends');
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}
