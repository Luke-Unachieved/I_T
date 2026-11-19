import {propertyEntriesView,bindPropertyEntries} from './deal-room-property-view.js';
import {previewWorkspaceSleep} from './deal-room-workspace-sleep.js';
const wsEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function workspaceWeather(day){return ['晴','晴','阴','雨','晴','雪','阴'][(Math.imul(day,1597334677)>>>0)%7];}
export function workspaceHubView(state,tab,lifeEnabled,sleepOpen=false){
 const dev=tab==='development';
 const leads='<details open><summary>客户机会</summary><p>客户来信在询盘里处理。</p><button type="button" data-workspace-open="inbox">去询盘</button></details>';
 const q=previewWorkspaceSleep(state);
 const confirm=sleepOpen?'<section class="ws-section" aria-label="睡前确认"><h3>睡前看一眼</h3>'+(q.pending.length?'<ul>'+q.pending.map(x=>'<li>'+wsEsc(x)+'</li>').join('')+'</ul>':'')+(q.reason?'<p>'+wsEsc(q.reason)+'</p>':'<p>工作室开支 ¥'+q.cost+'，确认后进入第 '+q.nextDay+' 天。</p><button type="button" data-workspace-sleep-confirm>进入第 '+q.nextDay+' 天</button>')+'<button type="button" data-workspace-sleep-cancel>先不睡</button></section>':'';
 const rest='<div class="ws-rest"><button type="button" data-workspace-home '+(lifeEnabled?'':'disabled title="先把开场订单结清"')+'>回家</button><button type="button" data-workspace-outing="trips">旅行</button><button type="button" data-workspace-outing="friends">约朋友</button><button type="button" data-workspace-sleep>睡到明天</button></div>'+confirm;
 return '<section class="ws-office"><h2>'+(dev?'发展':'下班')+'</h2>'+(dev?'':rest)+propertyEntriesView(state,dev?'development':'offwork')+(dev?leads:'')+'</section>';
}
export function bindWorkspaceHub(root,{onHome,onOuting,onProperty,onSleep,onSleepConfirm,onSleepCancel}){
 root.querySelector('[data-workspace-sleep]')?.addEventListener('click',onSleep);
 root.querySelector('[data-workspace-sleep-confirm]')?.addEventListener('click',onSleepConfirm);
 root.querySelector('[data-workspace-sleep-cancel]')?.addEventListener('click',onSleepCancel);
 bindPropertyEntries(root,onProperty);
 root.querySelector('[data-workspace-home]')?.addEventListener('click',onHome);
 root.querySelectorAll('[data-workspace-outing]').forEach(b=>b.addEventListener('click',()=>onOuting(b.dataset.workspaceOuting)));
}
