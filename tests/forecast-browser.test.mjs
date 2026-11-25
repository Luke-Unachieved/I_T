import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { forecast } from '../v38/engine/game.js';
import { yuan } from '../v38/ui/shell.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = { skip: process.env.V38_BROWSER !== '1', timeout: 120_000 };

async function checkForecast(page) {
  const state = await currentState(page);
  const rows = forecast(state);
  const readers = [row => row.cash];
  if (state.bids.length || rows.some(row => row.hypothetical !== row.cash)) readers.push(row => row.hypothetical);
  const expected = readers.map(read => {
    const lowest = rows.reduce((a, b) => read(a) <= read(b) ? a : b);
    return { risk: read(lowest) < 0, amounts: [yuan(Math.abs(read(lowest))), yuan(read(rows.at(-1)))], week: lowest.week };
  });
  const layout = await page.evaluate(`(() => {
    const cards = [...document.querySelectorAll('.forecast-scenario')].map(card => ({
      risk: card.classList.contains('forecast-scenario-risk'),
      amounts: [...card.querySelectorAll('dd')].map(dd => dd.childNodes[0].textContent),
      week: Number(card.querySelector('dd small').textContent.replace(/[^0-9]/g, ''))
    }));
    const axisFailures = [...document.querySelectorAll('.forecast-chart')].flatMap(chart => {
      const bounds = chart.getBoundingClientRect();
      const labels = [...chart.querySelectorAll('.forecast-x-axis span,.forecast-y-axis span')];
      return labels.flatMap((label, i) => {
        const rect = label.getBoundingClientRect();
        const overflow = rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1;
        const overlap = labels.slice(i + 1).some(other => {
          const second = other.getBoundingClientRect();
          return rect.left < second.right - 1 && rect.right > second.left + 1 && rect.top < second.bottom - 1 && rect.bottom > second.top + 1;
        });
        return overflow || overlap || parseFloat(getComputedStyle(label).fontSize) < 11 ? [label.textContent] : [];
      });
    });
    return { cards, axisFailures, noOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
      balanceLines: document.querySelectorAll('.forecast-chart-balance .chart-cash,.forecast-chart-balance .chart-hypothesis').length,
      flowBars: document.querySelectorAll('.forecast-chart-flow .chart-income,.forecast-chart-flow .chart-expense').length,
      detailRows: document.querySelector('.forecast-panel details.forecast-details tbody').children.length };
  })()`);
  assert.deepEqual(layout.cards, expected);
  assert.deepEqual(layout.axisFailures, []);
  assert.equal(layout.noOverflow, true);
  assert.equal(layout.balanceLines, expected.length);
  assert.equal(layout.flowBars, 24);
  assert.equal(layout.detailRows, 12);
}

test('forecast separates balance scenarios and weekly flows with readable axes', options, async () => {
  for (const width of [320, 850]) {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page({ width, height: 760, mobile: width < 500 });
      await page.goto();
      await page.waitFor('!!document.querySelector("[data-form=new-game]")');
      await loadScenario(page, `game => {const s=game.newGame({seed:381});s.tutorial.done=true;return s;}`);
      await checkForecast(page);
      await page.click('[data-ui=page][data-page=inquiries]');
      await page.click('[data-ui=quote-open]');
      await page.evaluate(`(()=>{const e=document.querySelector('dialog input[name=ratio]');e.value='80';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await page.click('dialog [data-form=quote] button[type=submit]');
      await page.click('[data-ui=page][data-page=office]');
      await checkForecast(page);
      await loadScenario(page, `game => {const s=game.newGame({seed:381});s.cash=1000;s.loan=s.creditLine;s.payables.push({id:'bill',amount:50000,dueWeek:1,type:'supplier'});s.tutorial.done=true;return s;}`);
      await checkForecast(page);
      assert.equal(await page.evaluate('!!document.querySelector(".forecast-risk-band")'), true);
      await loadScenario(page, `game => {const s=game.newGame({seed:381});s.cash=987654321012;s.creditLine=game.creditLimit(s);s.week=1041;s.tutorial.done=true;return s;}`);
      await checkForecast(page);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  }
});
