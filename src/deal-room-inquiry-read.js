// View preference only: reading a letter never accepts it or changes a save.
const storyIds=new Set(['mira','samir','ines']);
const positive=n=>Number.isSafeInteger(n)&&n>0;
export function inquiryReadKey(state,row){
 const id=row?.person?.id;
 if(typeof id==='string'&&/^\d{3}$/.test(id)){
  if(positive(row.promotion?.campaignId))return 'promo:'+row.promotion.campaignId+':'+id;
  if(positive(row.previous?.paidDay))return 'repeat:'+id+':'+row.previous.paidDay+':'+row.repeatNumber;
  return positive(row.replyBy)?'weekly:'+id+':'+row.replyBy:null;
 }
 if(!storyIds.has(row?.id))return null;
 if(!state.businessRound)return 'opening:'+row.id;
 const purchases=(state.contracts??[]).filter(c=>c.clientId===row.id&&c.status==='paid');
 const previous=purchases.at(-1);
 return 'familiar:'+row.id+':'+(previous?.paidDay??previous?.paymentDay??0)+':'+purchases.length;
}
// Capacity exceeds the number of distinct letter versions in a live 4,096-action save.
const readLimit=32768;
export function createInquiryReads(storage,key){
 const storageKey=key+':inquiries-read:v1';
 const load=()=>{try{
  const text=storage.getItem(storageKey);
  if(!text||text.length>2800000)return [];
  const list=JSON.parse(text);
  return Array.isArray(list)?list.filter(x=>typeof x==='string'&&/^[a-z0-9:]{1,80}$/.test(x)).slice(-readLimit):[];
 }catch{return [];}};
 let keys=new Set(load());
 return {
  has:(state,row)=>keys.has(inquiryReadKey(state,row)),
  open:(state,row)=>{
   const id=inquiryReadKey(state,row);
   if(!id||keys.has(id))return;
   keys=new Set([...new Set([...load(),...keys,id])].slice(-readLimit));
   try{storage.setItem(storageKey,JSON.stringify([...keys]));}catch{}
  },
  clear:()=>{
   keys.clear();
   try{storage.removeItem(storageKey);}catch{}
  }
 };
}
