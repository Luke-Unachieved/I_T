import {encodeDealBackup,loadDealSave,restoreDealBackup,DEAL_SAVE_KEY} from './deal-room-save.js';
const escapeSave=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dealSaveView(panel){
 return `<details class="deal-save-tools" ${panel.open?'open':''}><summary>备份与恢复</summary><div class="deal-save-body">${panel.conflict?`<p role="alert">本页副本尚未保存，浏览器里已有其他页面更新的进度。</p><button id="deal-save-reload">重新加载已保存进度</button>${panel.reloadConfirm?'<p>重新加载会放弃本页尚未保存的变化。请先下载本页副本。</p><button id="deal-save-reload-confirm">放弃本页变化并重新加载</button><button id="deal-save-reload-cancel">暂不重新加载</button>':''}`:''}<button id="deal-save-download">下载当前进度 JSON</button><button id="deal-save-raw">保留浏览器原始进度</button><div class="deal-save-copies"><small>恢复时保留的副本</small><button id="deal-save-before">取回恢复前进度</button><button id="deal-save-unreadable">取回异常进度原件</button></div><label for="deal-save-text">恢复进度备份</label><textarea id="deal-save-text" rows="3" spellcheck="false" placeholder="在这里粘贴本游戏导出的 JSON">${escapeSave(panel.text)}</textarea><button id="deal-save-preview">先查看恢复内容</button>${panel.preview?`<div class="deal-save-confirm" role="group" aria-label="确认替换进度"><p>将恢复到第 ${panel.preview.summary.day} 天 · 可用资金 ¥${panel.preview.summary.cash}。确认后替换当前浏览器进度；原始数据会先保留。</p><button id="deal-save-confirm">确认替换当前进度</button><button id="deal-save-cancel">取消</button></div>`:''}<p role="status">${escapeSave(panel.message)}</p></div></details>`;
}
/** Bind only explicit clicks. download receives bytes from this game's save only;
 * no file input, upload, network or permissions are used here.
 */
export function bindDealSaveTools(root,{panel,storage,getState,render,onRestored,onReload,download,key=DEAL_SAVE_KEY}){
 const details=root.querySelector('.deal-save-tools');if(details)details.ontoggle=()=>{panel.open=details.open;};
 const text=root.querySelector('#deal-save-text');if(text)text.oninput=()=>{panel.text=text.value;};
 const on=(id,fn)=>{const b=root.querySelector(id);if(b)b.onclick=fn;};
 const report=message=>{panel.message=message;panel.open=true;render();};
 on('#deal-save-reload',()=>{if(!panel.conflict)return;panel.reloadConfirm=true;report('重新加载前，请先保留本页副本。');});
 on('#deal-save-reload-cancel',()=>{panel.reloadConfirm=false;report('已取消重新加载，本页副本仍保留，自动保存仍暂停。');});
 on('#deal-save-reload-confirm',()=>{if(panel.conflict&&panel.reloadConfirm)onReload?.();});
 on('#deal-save-download',()=>{try{download(encodeDealBackup(getState()),'贸易工作室-进度备份.json','application/json');report('已发起备份下载，请保留下载的文件。');}catch(e){report('当前页面的进度无法导出为有效备份，请先保留浏览器原始进度。');}});
 on('#deal-save-raw',()=>{const old=loadDealSave(storage,key);if(typeof old.raw!=='string'){report(old.status==='empty'?'浏览器还没有已保存进度。':'无法读取原始进度，请勿清理浏览器数据。');return;}try{download(old.raw,'贸易工作室-原始进度.txt','text/plain');report('已发起原始数据下载；此文本不是经过验证的恢复备份。');}catch(e){report('原始数据未能下载，请勿清理浏览器数据。');}});
 for(const [id,copy,label] of [['#deal-save-before','before-restore','恢复前进度'],['#deal-save-unreadable','unreadable-backup','异常进度原件']])on(id,()=>{
  const saved=loadDealSave(storage,key,{copy});
  if(saved.status==='empty'){report('浏览器没有保留这份'+label+'，未修改当前进度。');return;}
  if(typeof saved.raw!=='string'){report('暂时无法读取这份副本，请勿清理浏览器数据。');return;}
  try{
   if(saved.status==='valid'){
    download(encodeDealBackup(saved.state),'贸易工作室-'+label+'-可恢复.json','application/json');
    report('已发起'+label+'下载，可用下载的 JSON 查看恢复内容；尚未替换当前进度。');
   }else{
    download(saved.raw,'贸易工作室-'+label+'-原文.txt','text/plain');
    report('这份副本无法验证，已发起原文下载供保全；不是可直接恢复的备份。');
   }
  }catch{report('未能导出这份副本，浏览器保留的数据未删除。');}
 });
 on('#deal-save-preview',()=>{const p=restoreDealBackup(storage,panel.text,{key});panel.preview=p.needsConfirmation?{...p,text:panel.text}:null;report(p.needsConfirmation?'请核对天数与资金，再决定是否替换。':(p.status==='unavailable'?'浏览器暂时无法读取进度，未作修改。':p.error?.includes('5 MiB')?'备份超过 5 MiB，请检查是否粘贴了正确文件。':'这段内容不是有效备份，请粘贴本游戏导出的完整 JSON。当前进度未修改。'));});
 on('#deal-save-cancel',()=>{panel.preview=null;report('已取消，当前进度未替换。');});
 on('#deal-save-confirm',()=>{
  const p=panel.preview;if(!p||p.text!==panel.text){panel.preview=null;report('备份文本已变化，请重新查看恢复内容。');return;}
  const result=restoreDealBackup(storage,p.text,{key,confirmed:true,expectedRaw:p.expectedRaw});
  panel.preview=null;
  if(!result.ok){report(result.status==='failed'?'浏览器未能保存恢复进度，请保留原始数据后重试。':'未恢复：'+result.error);return;}
  panel.text='';panel.message='进度已恢复并保存。';onRestored(result.state);
 });
}
