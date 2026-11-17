// Designer audit: enumerates actual quotes; not a playtest or human preference model.
import {createDealRoom,reduceDealRoom,previewCuration,curationOffers} from '../../src/deal-room-engine.js';
const act=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,optionId)=>act(act(act(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT');
let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(act(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');
s=act(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=act(act(s,'FULFIL_SUPPLY_PLAN'),'START_CLIENT_PROJECTS');
for(const clientId of ['mira','samir','ines'])s=finish(act(s,'SELECT_CLIENT',{clientId}),'project-series');
const products=['mira','samir','ines'];
for(const brief of curationOffers(s)){
 const draftState=act(s,'START_CURATION',{clientId:brief.id}),quotes=[];
 for(let mask=1;mask<8;mask++)for(const quantity of [40,60])for(const packaging of ['plain','gift']){
  const selected=products.filter((_,i)=>mask&(1<<i));const q=previewCuration(draftState,{products:selected,quantity,packaging});
  if(q.valid)quotes.push({products:selected.join('+'),quantity,packaging,profit:q.netProfit,days:q.paymentDay-s.day,requiredCash:q.cost-q.deposit+q.operatingCost});
 }
 quotes.sort((a,b)=>b.profit-a.profit);
 console.log(JSON.stringify({referrer:brief.id,buyer:brief.buyer,day:s.day,cash:s.cash,quotes},null,2));
}
