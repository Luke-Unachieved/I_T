const tradeAdvisers=Object.freeze({fang:'方文斌',liang:'梁佳音',tao:'陶乐',xu:'许明珊'});
const html=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function tradeAdviserHint(id,line){
 if(!Object.hasOwn(tradeAdvisers,id)||!line)return '';
 return '<aside class="ws-trade-hint"><i class="adviser-face adviser-'+id+'" aria-hidden="true"></i><div><strong>'+
  tradeAdvisers[id]+'</strong><p>'+html(line)+'</p></div></aside>';
}
