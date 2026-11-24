const advisers={liang:'梁佳音',fang:'方文斌',tao:'陶乐',xu:'许明珊'};
const amount=n=>'¥'+Number(n).toLocaleString('zh-CN');
export function cashRiskDialog(risk,adviserId){
 const warning='这笔钱付出去，可能就不够维持接下来的工作室开支了。';
 const name=advisers[adviserId];
 return `<dialog id="cash-risk-dialog" class="cash-risk-dialog" aria-labelledby="cash-risk-title" aria-describedby="cash-risk-amount">
 <h2 id="cash-risk-title">这笔支出有风险</h2>
 <div class="cash-risk-voice">${name?`<i class="adviser-face adviser-${adviserId}" aria-hidden="true"></i><p>“${warning}” <span class="cash-risk-speaker">${name}</span></p>`:`<p>${warning}</p>`}</div>
 <p id="cash-risk-amount">操作后剩 ${amount(risk.cash)}，预计还差 ${amount(risk.shortfall)} 才能维持日常开支。</p>
 <p role="status"></p>
 <div class="cash-risk-actions"><button class="ws-control ws-control--main" type="button" data-cash-risk-cancel>取消</button><button class="ws-control ws-control--secondary" type="button" data-cash-risk-confirm>仍然继续</button></div>
 </dialog>`;
}
export function bankruptcyView(status,canReturn,message){
 return `<section class="ws-office cash-risk-ending" aria-labelledby="bankruptcy-title">
 <p>第 ${status.day} 天 · 游戏结束</p>
 <h1 id="bankruptcy-title" tabindex="-1">工作室破产了</h1>
 <p>手头只剩 ${amount(status.cash)}，付不起今天的 ${amount(status.dailyCost)} 工作室开支。</p>
 <div class="cash-risk-actions">${canReturn?'<button class="ws-control ws-control--main" type="button" data-bankruptcy-return>返回破产操作前</button>':''}
 <button class="ws-control ws-control--secondary" type="button" data-bankruptcy-new>开始新游戏</button></div>
 <p role="status">${message}</p></section>`;
}
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cashRescueView(insolvency,liquidation,collectible=0){
 const owned=liquidation?.assets??[],hasHome=owned.some(a=>a.kind==='home');
 const assetTitle=owned.length>1?'变卖房车':hasHome?'变卖住房':'变卖车辆';
 const settlement=owned.length?`<details class="cash-rescue-sale"><summary>${assetTitle} · 可收回 ${amount(liquidation.proceeds)}</summary><ul>${owned.map(a=>`<li>${escape(a.name)} · ${amount(a.proceeds)}</li>`).join('')}</ul><p>变卖后手头有 ${amount(liquidation.cashAfter)}。住处将搬到${escape(liquidation.starterHomeName)}。${liquidation.cashAfter<insolvency.dailyCost?'这仍不够支付今天的开支。':''}</p><p>变卖不会推进日期。</p><button class="ws-control ws-control--main" type="button" data-bankruptcy-liquidate="${liquidation.proceeds}">确认${assetTitle}</button></details>`:'';
 return `<section class="ws-hub-card ws-hub-night cash-risk-rescue" aria-label="工作室开支">
 <p>手头只剩 ${amount(insolvency.cash)}，今天的工作室开支还差 ${amount(insolvency.shortfall)}。</p>
 ${collectible>0?`<p>还有 ${amount(collectible)} 货款可以收取。先去订单收款，不会推进日期。</p><button type="button" class="ws-control ws-control--main" data-workspace-open="orders">去订单收款</button>`:'<p>暂不结账，今天还可以继续处理生意。</p>'}${settlement}
 <button type="button" class="ws-control ws-control--secondary" data-workspace-bankruptcy>结账并结束游戏</button></section>`;
}
