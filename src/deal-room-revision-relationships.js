/** Derive the promise attached to this specific version, never all customer ties. */
export function revisionRelationships(state,proposedScope='revision-nonexclusive'){
 const r=state.collectionRevision;if(!r)return null;
 const active=r.status==='production'?r.active:null;
 const scope=r.exclusiveBuyer?'revision-exclusive':active?.scope||(r.orders||[]).find(o=>o.status==='paid')?.scope||proposedScope;
 const committed=!!r.exclusiveBuyer||!!active||(r.orders||[]).some(o=>o.status==='paid');
 const exclusive=scope==='revision-exclusive';
 return {committed,exclusive,clients:['northline','atelier'].map(id=>{
  const paid=(r.orders||[]).filter(o=>o.buyerId===id&&o.status==='paid'),pending=active?.buyerId===id?active:null;
  const blocked=exclusive&&id==='atelier';
  return {id,name:id==='northline'?'Northline':'Atelier',status:paid.length?'delivered':pending?'signed':blocked?(committed?'excluded':'would-exclude'):'proposal',sets:paid.reduce((n,o)=>n+o.sets,0),oldOrders:(state.collection?.orders||[]).filter(o=>o.buyerId===id&&o.status==='paid').length};
 })};
}
export function revisionRelationshipsView(state,scope){
 const m=revisionRelationships(state,scope);if(!m)return '';
 const labels={delivered:'潮汐版 · 已交付',signed:'潮汐版 · 已签待交',excluded:'此版不能再提案','would-exclude':'签后此版不能提案',proposal:'此版仍可提案 · 未签'};
 return `<section class="revision-relationships ${m.exclusive?'exclusive':'reusable'}" aria-label="潮汐版的客户合作范围"><small>${m.committed?'这份承诺已经留下':'签约前 · 只看这版的去向'}</small><div class="revision-client-pair">${m.clients.map(c=>`<article class="revision-client ${c.status}"><strong>${c.name}</strong><span class="version-token">潮汐分格</span><b>${labels[c.status]}</b>${c.sets?`<span>${c.sets} 套实际交付</span>`:''}<small>${c.oldOrders?'旧版合作仍按原合同保留':'旧版权利不由本次选择改变'}</small></article>`).join('')}</div></section>`;
}
