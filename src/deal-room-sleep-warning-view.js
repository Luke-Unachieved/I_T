const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sleepWarningsView(q){
 const groups=q?.warningGroups??[];
 const group=(title,items)=>'<section class="sleep-warning" aria-label="'+esc(title)+'"><h4>'+esc(title)+'</h4><ul>'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section>';
 return groups.length?groups.map(g=>group(g.title,g.items)).join(''):q?.pending?.length?group('工作待办',q.pending):'';
}
