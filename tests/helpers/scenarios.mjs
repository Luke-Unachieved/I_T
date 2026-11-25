export async function loadScenario(page, expression, { firstViews } = {}) {
  // Controlled operating fixtures model an older save whose existing sections
  // are familiar; first-time milestones can explicitly request an empty list.
  await page.evaluate(`(async()=>{const app=await import('/v38/ui/app.js');const game=await import('/v38/engine/game.js');const quotes=await import('/v38/engine/quotes.js');const state=await (${expression})(game,quotes);app.__scenarioForTest(state,${JSON.stringify(firstViews)});})()`);
  await page.coachReady();
}

export async function currentState(page) {
  return page.evaluate("import('/v38/ui/app.js').then(app=>app.__stateForTest())");
}

export async function dismissDecisions(page) {
  for (let attempts = 0; attempts < 20; attempts++) {
    if (!await page.evaluate('Boolean(document.querySelector("dialog[open]"))')) return;
    if (await page.evaluate('Boolean(document.querySelector("dialog[open] [data-action=resolve-event]"))')) {
      const choice = await page.evaluate('Array.from(document.querySelectorAll("dialog[open] [data-action=resolve-event]")).at(-1).dataset.choice');
      await page.click(`dialog[open] [data-action="resolve-event"][data-choice=${JSON.stringify(choice)}]`);
    } else if (await page.evaluate('Boolean(document.querySelector("dialog[open] [data-ui=close-dialog]"))')) {
      await page.click('dialog[open] [data-ui="close-dialog"]');
    } else return;
  }
  throw new Error('Decision dialog loop exceeded 20 choices');
}
