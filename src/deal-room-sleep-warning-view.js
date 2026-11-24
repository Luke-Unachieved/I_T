const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sleepWarningsView(q){
 const groups=q?.reminderGroups??[];
 if(!groups.length)return '';
 const counts=groups.map(({title,items})=>title==='订单待办'
  ?items.length+' 项订单待办':items.length+' 封询盘今天截止');
 const items=groups.flatMap(group=>group.items).map(x=>'<li>'+esc(x)+'</li>').join('');
 return '<details class="sleep-reminder"><summary><span>'+esc(counts.join('，'))+
  '</span><span class="sleep-reminder-toggle"><span class="sleep-expand">展开详情</span><span class="sleep-collapse">收起详情</span></span></summary>'+
  '<ul>'+items+'</ul></details>';
}
