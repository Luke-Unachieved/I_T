export const saveFileEntry=(pasted,open)=>`<label for="deal-save-file">选择存档文件</label><input type="file" id="deal-save-file" accept=".json,application/json">
 <details class="deal-save-paste" ${open?'open':''}><summary>粘贴存档内容</summary><label for="deal-save-text">备份文件内容</label>
 <textarea id="deal-save-text" rows="3" spellcheck="false" >${pasted}</textarea>
 <button type="button" id="deal-save-preview">先查看恢复内容</button></details>`;

// Local read only. A superseded selection or removed screen cannot reopen an old preview.
export function bindSaveBackupFile(root,panel,preview,report,maxBytes){
 const paste=root.querySelector('.deal-save-paste');if(paste)paste.ontoggle=()=>{panel.pasteOpen=paste.open;};
 const file=root.querySelector('#deal-save-file');
 if(file)file.onchange=async()=>{
  const chosen=file.files?.[0],read=panel.fileRead={};
  if(!chosen)return;
  file.value='';panel.preview=null;panel.filesOpen=true;
  if(chosen.size>maxBytes){report('文件超过 5 MiB，无法导入。当前进度没变。');return;}
  try{
   const data=await chosen.text();
   if(panel.fileRead!==read||file.isConnected===false)return;
   preview(data);
  }catch{
   if(panel.fileRead===read&&file.isConnected!==false)report('读不到这个存档文件。当前进度没变。');
  }
 };
}
