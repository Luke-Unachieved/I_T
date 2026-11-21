const companyNameLimit=24;
const companyKey=key=>key+':company-name';
const cleanCompanyName=value=>typeof value==='string'&&value.trim().length<=companyNameLimit&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim():'';
const companyEsc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function readCompanyName(storage,key){
 try{return cleanCompanyName(storage.getItem(companyKey(key)));}catch{return '';}
}
const companyForm=safe=>'<form data-company-name><label for="ws-company-name">公司名称</label><input id="ws-company-name" name="company" value="'+safe+'" maxlength="'+companyNameLimit+'" required>'+
 '<button type="submit">保存名称</button><p role="status" data-company-status></p></form>';
export function companyNameView(name){
 const safe=companyEsc(cleanCompanyName(name));
 return safe?'<section class="ws-company ws-company-heading" aria-label="公司名称"><h2 id="ws-company-heading" tabindex="-1">'+safe+'</h2></section>':
  '<section class="ws-company ws-company-setup" aria-label="给公司起个名字">'+companyForm('')+'</section>';
}
export function companyRenameView(name){
 const safe=companyEsc(cleanCompanyName(name));
 return safe?'<details class="ws-company ws-company-edit"><summary>改公司名</summary>'+companyForm(safe)+'</details>':'';
}
export function bindCompanyName(root,storage,key,render){
 const form=root.querySelector('[data-company-name]');
 if(!form)return;
 const edit=root.querySelector('details.ws-company-edit');
 edit?.addEventListener('toggle',()=>{if(edit.open)form.elements.company.focus?.({preventScroll:true});});
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const name=cleanCompanyName(form.elements.company.value);
  const status=form.querySelector('[data-company-status]');
  if(!name){status.textContent='请输入 1 到 24 个字符。';return;}
  try{storage.setItem(companyKey(key),name);}catch{status.textContent='浏览器未能保存名称。';return;}
  render();root.querySelector('#ws-company-heading')?.focus?.();
 });
}
