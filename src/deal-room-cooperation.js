import {accountCollectionBasis,canExpandAccount,paidSeriesStoreOrders} from './deal-room-account.js';
import {catalogueVersions} from './deal-room-design-catalogue.js';
import {launchBasis,launchReview} from './deal-room-launch.js';
import {caseGrowthOffers} from './deal-room-case-growth.js';
import {studioProjectEligibility} from './deal-room-studio-project.js';

/** Derived chapter signpost for canonical engine state, not a save validator,
 * score, new order, reward or assertion that the whole game is complete.
 * nextAction is null when the player still has a genuine customer choice.
 */
export function cooperationChapter(state){
 const c=state.collection,home=['review','complete'].includes(state.phase);
 const result={relation:null,stage:'proposal',facts:[],step:'先确定一份系列的合作方式，不需要把所有路线都做一遍。',nextAction:null,closed:false};
 const next=(type,label,fields={})=>({type,label,...fields});
 if(!c){if(home&&(state.curationHistory||[]).some(o=>o.status==='paid'))result.nextAction=next('START_COLLECTION','看这份系列如何合作');return result;}
 const paid=(c.orders||[]).filter(o=>o.status==='paid'),active=c.status==='production'?c.active:null;
 const route=c.model==='private'?'private':c.model==='own'&&c.exclusiveBuyer?'exclusive':c.model==='own'?'independent':null;
 if(!route){result.step='合作范围尚未确认。';return result;}
 const buyerId=route==='private'?'northline':route==='exclusive'?c.exclusiveBuyer:null;
 const matches=o=>o&&(route==='private'?o.buyerId==='northline-private':route==='exclusive'?o.buyerId===buyerId&&o.scope==='whole-exclusive':o.scope!=='whole-exclusive'&&['atelier','northline'].includes(o.buyerId));
 const deliveries=paid.filter(matches),signed=matches(active);
 result.relation={route,buyerId,scope:route==='private'?'private-label':route==='exclusive'?'whole-exclusive':'retained-original'};
 if(route!=='independent'&&!signed&&!deliveries.length){result.step='没有这位买方已签范围的交付依据。';return result;}
 if(!deliveries.length){
  result.stage=signed?'contract':'proposal';result.step=signed?'先完成已经签下的系列采购，尚不能把签约当作交付。':'原稿已经备好，下一步让买手确认采用范围。';
  if(signed){result.facts.push({kind:'contract',buyerId,scope:result.relation.scope});if(state.phase==='collection')result.nextAction=next('FULFIL_COLLECTION','完成已签系列交付');}
  else if(home&&['sample','complete'].includes(c.status))result.nextAction=next('OPEN_COLLECTION','和买手谈采用范围');
  return result;
 }
 result.stage='delivery';result.facts.push(...deliveries.map(o=>({kind:'series-delivered',buyerId:o.buyerId,scope:o.scope||result.relation.scope,sets:o.sets,paymentDay:o.paymentDay})));
 const close=step=>{result.stage='closed';result.closed=true;result.step=step;result.nextAction=null;return result;};
 if(route==='independent'){
  const original=catalogueVersions(state).find(v=>v.id==='original'&&v.reusable);
  if(!original){result.step='先核清原稿可复用范围，不替已有合同放开限制。';return result;}
  const adoptions=(state.caseGrowthHistory||[]).filter(o=>o.status==='paid'&&o.agreement==='portfolio'&&o.designVersion==='original'&&o.purpose==='studio-series'&&o.designStyle===original.style);
  for(const o of adoptions)result.facts.push({kind:'original-adopted',referrerId:o.referrerId,quantity:o.quantity});
  const use=(state.caseGrowthHistory||[]).find(o=>o.status==='paid'&&o.purpose==='studio-project'&&['independent','group'].includes(o.studioDirection)&&studioProjectEligibility(state,o.studioDirection).valid&&studioProjectEligibility(state,o.studioDirection).referrerId===o.referrerId);
  if(adoptions.length){
   if(use)result.facts.push({kind:'use-delivered',direction:use.studioDirection,briefId:use.studioBrief,quantity:use.quantity});
   const sleeveOnly=deliveries.every(o=>o.scope==='buyer-sleeve');
   close(sleeveOnly?'买手的专用纸套已交付，概念店也已完成工作室原稿采购。这段合作已兑现，新的用途可以另行选择。':'买手采购已交付，概念店也已完成工作室原稿采用。这段合作已兑现，新的用途可以另行选择。');
   const directions=['independent','group'].filter(d=>studioProjectEligibility(state,d).canOffer);
   if(home&&directions.length===1){
    const direction=directions[0],e=studioProjectEligibility(state,direction),onlyDelivered=e.briefs.length===1&&(state.caseGrowthHistory||[]).some(h=>h.status==='paid'&&h.purpose==='studio-project'&&h.studioDirection===direction&&h.referrerId===e.referrerId&&h.studioBrief===e.briefs[0]);
    result.nextAction=next('OPEN_STUDIO_PROJECT',onlyDelivered?'可选 · 回访已确认方案':'可选 · 继续提出新的用途',{direction});
    if(onlyDelivered)result.step=result.step.replace('新的用途可以另行选择。','已交付的用途方案保留，后续按实际需求再谈补货。');
   }
   else if(home&&directions.length>1)result.nextAction=next('OPEN_COLLECTION','回看系列与买手合作');
   return result;
  }
  const offers=caseGrowthOffers(state).filter(o=>o.agreement==='portfolio');
  result.step=offers.length===1?'沿已建立的概念店关系，提出可合法复用的原稿。':'先选择实际合作的概念店联系人，不把转介自动算成采用。';
  if(home&&offers.length===1)result.nextAction=next('OPEN_CASE_GROWTH','向现有概念店提案',{referrerId:offers[0].referrerId});
  if(!offers.length){const unchosen=caseGrowthOffers(state).filter(o=>!o.agreement&&o.availableAgreements?.includes('portfolio'));if(unchosen.length===1){result.step='这份已交付案例可以带来合作；先选择合作方式，尚未约定为概念店或集团采购。';if(home)result.nextAction=next('OPEN_CASE_GROWTH','先看案例的合作方式',{referrerId:unchosen[0].referrerId});}}
  return result;
 }
 const launch=launchBasis(state),handed=launch?.buyerId===buyerId&&launch.scope===result.relation.scope&&state.launchProject?.status==='handed'&&launchReview(state,state.launchProject).valid;
 if(buyerId==='atelier'&&!handed){result.step='向已经签约的这位买方交接实物与陈列，不重新问归属。';if(home&&launch?.buyerId===buyerId)result.nextAction=next('OPEN_LAUNCH_PROJECT','和原买方完成上市交接');return result;}
 if(handed)result.facts.push({kind:'launch-handed',buyerId,day:state.launchProject.handedDay});
 if(buyerId==='atelier')return close('Atelier 已收到独家系列和上市陈列，原稿继续按这份独家约定供货。');
 const accounts=paidSeriesStoreOrders(state);
 // A missing seriesSource alone is not evidence of a generic first order.
 // Generic pilots originate in a paid buyer case, not another approved series.
 const history=state.accountHistory||[],pilot=history[0];
 const genericFromPaidCase=a=>a?.status==='paid'&&!a.seriesSource&&a.buyer==='Northline · 区域连锁采购'&&
  (state.curationHistory||[]).some(source=>source.status==='paid'&&source.referrerId===a.referrerId&&source.referrerName===a.referrerName&&
   Array.isArray(source.products)&&JSON.stringify(source.products)===JSON.stringify(a.products)&&
   (source.lampVersion||'standard')===(a.lampVersion||'standard')&&source.paymentDay<=a.signedDay);
 const genericPilot=genericFromPaidCase(pilot)&&pilot.optionId==='pilot'&&pilot.stores===3&&!pilot.expansion;
 const stores=accounts.reduce((n,a)=>n+a.stores,0),mixed=new Set(accounts.map(a=>JSON.stringify(a.seriesSource))).size>1;
 if(stores)result.facts.push(mixed?{kind:'mixed-approved-version-stores',buyerId,stores,batches:accounts.map(a=>({stores:a.stores,seriesSource:JSON.parse(JSON.stringify(a.seriesSource))}))}:{kind:'same-version-stores',buyerId,stores});
 if(stores>=6)return close(mixed?'Northline 已采用的不同版本分别交付给两批门店，六家店的合作已兑现；首批没有被改款。':'Northline 已确认的系列按同一版本铺到六家门店。这段合作已兑现，上市陈列仍可按需要查看。');
 if(genericPilot&&history.length===2&&accounts.length===1&&accounts[0]===history[1]&&accounts[0].expansion===true&&accounts[0].optionId==='remaining'&&accounts[0].stores===3&&accounts[0].buyer===pilot.buyer&&accounts[0].signedDay>=pilot.paymentDay){
  result.facts.push({kind:'generic-then-series-stores',genericStores:pilot.stores,seriesStores:stores});
  close('六家门店都已收货：首批三家选了通用组合，后三家收到已确认的系列。两批各按自己的合同交付。');
  if(!handed&&home&&launch?.buyerId===buyerId)result.nextAction=next('OPEN_LAUNCH_PROJECT','可选 · 为系列布置上市陈列');
  return result;
 }
 // Consuming all six store slots with generic goods cannot turn them into
 // series sales. The separately fulfilled series can finish at its own buyer handover.
 const last=history[1];
 const allGeneric=history.length===1&&genericFromPaidCase(pilot)&&!pilot.expansion&&pilot.stores===6&&['funded','rollout'].includes(pilot.optionId)||
  history.length===2&&genericPilot&&genericFromPaidCase(last)&&last.expansion===true&&last.optionId==='remaining'&&last.stores===3&&last.referrerId===pilot.referrerId&&last.signedDay>=pilot.paymentDay;
 if(handed&&!stores&&allGeneric){
  result.facts.push({kind:'generic-stores-separate-handover',genericStores:6,seriesStores:0});
  close('这套系列的成品与上市陈列都已交给 Northline。六家门店另买的是通用商品，没有把那批货算进系列。');
  if(home)result.nextAction=next('OPEN_LAUNCH_PROJECT','可选 · 回看已交接的陈列');return result;
 }
 if(genericPilot&&home&&canExpandAccount(state)&&accountCollectionBasis(state)){
  result.step='首批三家已收到通用组合。余下三家可以沿用它，也可以改用 Northline 已确认的系列。';
  result.nextAction=next('OPEN_ACCOUNT_EXPANSION','看看余下三家的供货方案');return result;
 }
 result.step=stores===3?'已确认版本已经铺到三店，下一步可谈余下三店；首批合同保持不变。':'把 Northline 已确认的版本带到门店，继续同一份合作。';
 if(home&&stores===3&&canExpandAccount(state))result.nextAction=next('OPEN_ACCOUNT_EXPANSION','沿原版本谈余下三店');
 else if(home&&!state.accountHistory?.length&&accountCollectionBasis(state))result.nextAction=next('START_ACCOUNT_FROM_COLLECTION','用已确认版本谈门店采购');
 else if(state.phase==='account'&&state.account?.status==='fulfilling'&&state.account.seriesSource)result.nextAction=next(state.account.expansion?'FULFIL_ACCOUNT_EXPANSION':'FULFIL_ACCOUNT','完成已签门店交付');
 else if(state.accountHistory?.length&&!stores){
  result.step=handed?'专用系列与上市陈列已交接。此前铺店的通用商品单独记账，不混作同一批货。':'已铺店的是通用商品；这份专用系列可向原买方交接陈列，不重新采购。';
  if(home&&launch?.buyerId===buyerId)result.nextAction=next('OPEN_LAUNCH_PROJECT',handed?'回看已交接的陈列':'和原买方完成上市交接');
 }
 return result;
}
