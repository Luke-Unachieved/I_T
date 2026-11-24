import {encodeDealBackup,loadDealSave,restoreDealBackup,restartDealProgress,DEAL_SAVE_KEY,DEAL_BACKUP_MAX_BYTES} from './deal-room-save.js';
import {saveFileEntry,bindSaveBackupFile} from './deal-room-save-file.js';
const escapeSave=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dealSaveView(panel,saveNotice='进度自动保存'){
 const warning=saveNotice&&saveNotice!=='进度自动保存';
 return `<details class="deal-save-tools" ${panel.open?'open':''}><summary>游戏存档${warning?`<span class="deal-save-alert" role="status">${escapeSave(saveNotice)}</span>`:''}</summary><div class="deal-save-body">
 ${warning?'':'<p class="deal-save-head">进度会自动保存在这个浏览器里。</p>'}
 ${panel.conflict?`<section class="deal-save-conflict" aria-label="存档冲突"><p role="alert">另一个页面保存了新进度，这一页的改动还没保存。</p><button type="button" id="deal-save-reload">载入已保存的进度</button>${panel.reloadConfirm?'<p>载入后会丢掉这一页没保存的改动。要留住它们，先下载备份。</p><div class="deal-save-actions"><button type="button" id="deal-save-reload-confirm">放弃本页改动，载入存档</button><button type="button" id="deal-save-reload-cancel">暂不重新加载</button></div>':''}</section>`:''}
 <section class="deal-save-section deal-save-restart" aria-label="重新开始游戏">
 ${panel.restart?`<p>从第 1 天重新开始，启动资金 ¥5,000。${panel.restart.summary?'当前进度会留作重开前备份。':''}${panel.restart.summary&&panel.restart.hasPrior?' 之前的重开备份会被替换。':''}</p><div class="deal-save-actions"><button type="button" id="deal-save-restart-cancel">取消</button><button type="button" id="deal-save-restart-confirm">确认重新开始</button></div>`:'<button type="button" id="deal-save-restart">重新开始</button>'}
 </section>
 <details class="deal-save-files" ${panel.filesOpen||panel.preview?'open':''}><summary>存档文件</summary><div class="deal-save-file-grid">
 <section class="deal-save-section deal-save-export" aria-labelledby="deal-save-export-title">
 <h3 id="deal-save-export-title">备份当前进度</h3><p>换设备前请备份。关掉页面不会过天，也不会扣钱。</p>
 <div class="deal-save-actions"><button type="button" id="deal-save-download">下载当前存档</button></div>
 ${panel.copies?.length?`<details class="deal-save-copies"><summary>旧档与异常存档</summary><div class="deal-save-actions">${panel.copies.includes('restart')?'<button type="button" id="deal-save-before-restart">下载重开前的存档</button>':''}${panel.copies.includes('restore')?'<button type="button" id="deal-save-before">下载导入前的存档</button>':''}${panel.copies.includes('raw')?'<button type="button" id="deal-save-raw">下载无法读取的存档</button>':''}${panel.copies.includes('unreadable')?'<button type="button" id="deal-save-unreadable">下载旧的异常存档</button>':''}</div></details>`:''}</section>
 <section class="deal-save-section deal-save-restore" aria-labelledby="deal-save-restore-title">
 <h3 id="deal-save-restore-title">恢复进度</h3>
 ${saveFileEntry(panel.fromFile?'':escapeSave(panel.text),panel.pasteOpen)}
 ${panel.preview?`<div class="deal-save-confirm" role="group" aria-label="确认替换进度"><p>将恢复到第 ${panel.preview.summary.day} 天 · 可用资金 ¥${panel.preview.summary.cash}。确认会替换这个浏览器里的进度。替换前会保留旧档。</p><div class="deal-save-actions"><button type="button" id="deal-save-confirm">确认替换当前进度</button><button type="button" id="deal-save-cancel">取消</button></div></div>`:''}</section>
 </div></details><p class="deal-save-status" role="status">${escapeSave(panel.message)}</p></div></details>`;
}
export function bindDealSaveTools(root,{panel,storage,getState,render,onRestored,onReload,onRestarted,getExpectedRaw,download,key=DEAL_SAVE_KEY}){
 const details=root.querySelector('.deal-save-tools');if(details)details.ontoggle=()=>{panel.open=details.open;};
 const files=root.querySelector('.deal-save-files');if(files)files.ontoggle=()=>{panel.filesOpen=files.open;};
 const text=root.querySelector('#deal-save-text');if(text)text.oninput=()=>{panel.fileRead=null;panel.fromFile=false;panel.text=text.value;};
 const on=(id,fn)=>{const b=root.querySelector(id);if(b)b.onclick=fn;};
 const report=message=>{panel.message=message;panel.open=true;render();};
 on('#deal-save-reload',()=>{if(!panel.conflict)return;panel.reloadConfirm=true;panel.filesOpen=true;report('想留住这页的改动，请先下载备份。');});
 on('#deal-save-reload-cancel',()=>{panel.reloadConfirm=false;report('没有载入存档。这一页没改，自动保存仍暂停。');});
 on('#deal-save-reload-confirm',()=>{if(panel.conflict&&panel.reloadConfirm)onReload?.();});
 on('#deal-save-restart',()=>{
  panel.restart=null;
  if(panel.conflict){report('另一个页面保存了新进度。请先载入那份存档，再重新开始。');return;}
  const p=restartDealProgress(storage,{key});
  if(!p.needsConfirmation){report(p.error);return;}
  if(getExpectedRaw&&p.raw!==getExpectedRaw()){report('另一个页面保存了新进度。请先刷新这一页，再重新开始。');return;}
  panel.preview=null;panel.fileRead=null;panel.restart=p;report('');
  root.querySelector('#deal-save-restart-cancel')?.focus?.();
 });
 on('#deal-save-restart-cancel',()=>{panel.restart=null;report('已取消，当前进度未改。');root.querySelector('#deal-save-restart')?.focus?.();});
 on('#deal-save-restart-confirm',()=>{
  if(!panel.restart||panel.conflict)return;
  const out=restartDealProgress(storage,{key,confirmed:true,expectedRaw:panel.restart.raw});
  panel.restart=null;
  if(!out.ok){report(out.error);return;}
  onRestarted?.();
 });
 on('#deal-save-download',()=>{try{download(encodeDealBackup(getState()),'贸易工作室-进度备份.json','application/json');report('已发起下载，请保留文件。');}catch(e){report('暂时无法下载当前存档。若浏览器里的存档已损坏，可在「旧档与异常存档」下载原件。');}});
 on('#deal-save-raw',()=>{const old=loadDealSave(storage,key);if(typeof old.raw!=='string'){report(old.status==='empty'?'浏览器还没有已保存进度。':'无法读取原始进度，请勿清理浏览器数据。');return;}try{download(old.raw,'贸易工作室-原始进度.txt','text/plain');report('已发起原始数据下载；不能直接恢复。');}catch(e){report('原始数据未能下载，请勿清理浏览器数据。');}});
 for(const [id,copy,label] of [['#deal-save-before-restart','before-restart','重开前的存档'],['#deal-save-before','before-restore','导入前的存档'],['#deal-save-unreadable','unreadable-backup','异常进度原件']])on(id,()=>{
  const saved=loadDealSave(storage,key,{copy});
  if(saved.status==='empty'){report('浏览器没有保留这份'+label+'，未修改当前进度。');return;}
  if(typeof saved.raw!=='string'){report('暂时无法读取这份副本，请勿清理浏览器数据。');return;}
  try{
   if(saved.status==='valid'){
    download(encodeDealBackup(saved.state),'贸易工作室-'+label+'-可恢复.json','application/json');
    report('已发起'+label+'下载，可用下载的备份预览要恢复的进度；尚未替换当前进度。');
   }else{
    download(saved.raw,'贸易工作室-'+label+'-原文.txt','text/plain');
    report('这份存档无法验证。可以下载原文件留底，但不能直接恢复。');
   }
  }catch{report('未能导出这份副本，浏览器保留的数据未删除。');}
 });
 const preview=(data=panel.text)=>{panel.fileRead=null;panel.filesOpen=true;const p=restoreDealBackup(storage,data,{key});if(p.needsConfirmation&&data!==panel.text){panel.fromFile=true;panel.text=data;}panel.preview=p.needsConfirmation?{...p,text:data}:null;report(p.needsConfirmation?'请核对天数与资金，再决定是否替换。':(p.status==='unavailable'?'浏览器暂时无法读取进度，未作修改。':p.error?.includes('5 MiB')?'这份备份太大，请确认粘贴的是本游戏导出的存档。':'不是有效备份，请使用本游戏导出的存档。当前进度未修改。'));}
 on('#deal-save-preview',()=>{if(panel.fromFile){panel.text=text.value;panel.fromFile=false;}preview();});
 bindSaveBackupFile(root,panel,preview,report,DEAL_BACKUP_MAX_BYTES);
 on('#deal-save-cancel',()=>{panel.fileRead=null;panel.preview=null;report('已取消，当前进度未替换。');});
 on('#deal-save-confirm',()=>{
  const p=panel.preview;if(!p||p.text!==panel.text){panel.preview=null;report('备份文本已变化，请重新查看恢复内容。');return;}
  const result=restoreDealBackup(storage,p.text,{key,confirmed:true,expectedRaw:p.expectedRaw});
  panel.preview=null;
  if(!result.ok){report(result.status==='failed'?'浏览器未能保存恢复进度，请保留原始数据后重试。':'未恢复：'+result.error);return;}
  panel.text='';panel.message='进度已恢复并保存。';onRestored(result.state);
 });
}
