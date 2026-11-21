const companyNameLimit=24;
const companyKey=key=>key+':company-name';
const cleanCompanyName=value=>typeof value==='string'&&value.trim().length<=companyNameLimit&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim():'';
const companyEsc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function readCompanyName(storage,key){
 try{return cleanCompanyName(storage.getItem(companyKey(key)));}catch{return '';}
}
export function companyNameView(name){
 const safe=companyEsc(cleanCompanyName(name));
 return '<details class="ws-company"><summary><strong>'+(safe||'给公司起个名字')+'</strong>'+(safe?'<small>改名</small>':'')+'</summary>'+
  '<form data-company-name><label for="ws-company-name">公司名称</label><input id="ws-company-name" name="company" value="'+safe+'" maxlength="'+companyNameLimit+'" required>'+
  '<button type="submit">保存名称</button><p>仅保存在本浏览器，不随存档导出。</p><p role="status" data-company-status></p></form></details>';
}
export function bindCompanyName(root,storage,key,render){
 const form=root.querySelector('[data-company-name]');
 if(!form)return;
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const name=cleanCompanyName(form.elements.company.value);
  const status=form.querySelector('[data-company-status]');
  if(!name){status.textContent='请输入 1 到 24 个字符。';return;}
  try{storage.setItem(companyKey(key),name);}catch{status.textContent='浏览器未能保存名称。';return;}
  render();root.querySelector('.ws-company > summary')?.focus?.({preventScroll:true});
 });
}
