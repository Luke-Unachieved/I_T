import {reduceDealRoom,quoteOptions} from './deal-room-engine.js';
import {hasLampDevelopmentCase,acceptedLampSample} from './deal-room-development.js';
import {accountCoverage,canExpandAccount,accountCollectionBasis} from './deal-room-account.js';
import {caseGrowthOffers} from './deal-room-case-growth.js';

/** Read-only signposts for existing projects, not promotions, rewards or new gates. */
export function careerProjects(state){
 const cases=(state.curationHistory||[]).filter(c=>c.status==='paid');
 const coverage=accountCoverage(state),orders=(state.collection?.orders||[]).filter(o=>o.status==='paid');
 const growth=(state.caseGrowthHistory||[]).filter(c=>c.status==='paid');
 const studioAdoption=(state.contracts||[]).find(c=>c.status==='paid'&&c.clientId==='mira'&&['developed-lamp','second-developed-lamp'].includes(c.optionId)&&c.specification==='developed-studio');
 const volumeAdoption=(state.contracts||[]).find(c=>c.status==='paid'&&c.clientId==='mira'&&c.specification==='developed-line');
 const adopted=growth.find(c=>c.agreement==='private'&&c.products?.includes('mira')&&(c.approvedCaseLamp||c.lampVersion==='developed'));
 const home=['review','complete'].includes(state.phase);
 const action=(type,label,referrerId)=>({label,type,...(referrerId?{referrerId}:{})});
 const byCase=(type,label,list)=>list.map(c=>action(type,`${c.referrerName||c.referrerId} · ${label}`,c.referrerId));
 const stores={id:'stores',title:'把组合铺到六家店',step:'先交付一份买手店组合，留下可递给连锁采购的案例。',done:coverage>=6,actions:[]};
 if(stores.done){stores.step='六家店的采购已交付并收齐货款。';stores.achievement=`连锁累计已供 ${coverage} 家店`;if(state.accountHistory?.length===2&&JSON.stringify(state.accountHistory[0].seriesSource)!==JSON.stringify(state.accountHistory[1].seriesSource)){stores.step='六家店已收货，首批三店与新增三店各有一套确认好的产品。';stores.achievement=state.accountHistory.map(a=>`${a.stores}店 · ${a.seriesSource?.label||'首批选品组合'}`).join('；');}}
 else if(canExpandAccount(state)){stores.step='首批三店已收货。新增三店沿用这款，还是选买手已看中的另一款？';stores.actions=[action('OPEN_ACCOUNT_EXPANSION','谈余下三家的采购')];}
 else if(!state.accountHistory?.length&&accountCollectionBasis(state)){stores.step='Northline 想把已确认系列带到门店。';stores.actions=[action('START_ACCOUNT_FROM_COLLECTION','用已确认系列谈门店合作')];}
 else if(cases.length&&!state.accountHistory?.length){stores.step='选择一份已交付案例，先谈连锁的付款与铺店规模。';stores.actions=byCase('START_ACCOUNT','递给连锁采购',cases);}
 const seriesAdoptions=growth.filter(c=>c.purpose==='studio-series');
 const series={id:'series',title:'让一份系列被买手采用',step:'先交付一份买手店组合，再谈系列设计和署名。',done:orders.length>0,actions:[]};
 if(series.done){series.step=state.collection.model==='private'?'买方专用系列已经交付，包装署名与权利按原约定保留。':'系列采购已交付，后续提案继续遵守已签设计范围。';series.achievement=seriesAdoptions.length?`工作室原稿已被概念店采用，${seriesAdoptions.length} 次采购已交付；署名保留。`:`${orders[0].buyer||'买手'} 的系列已交付并收齐货款`;}
 else if(state.collection){series.step=state.collection.status==='production'?'系列订单已签，先完成交付收款。':'样品已经备好。去和买手谈采用范围，谈成后完成交付。';}
 else if(cases.length){series.step='可以选择买方专用系列，或保留工作室设计；先看合作方式。';series.actions=[action('START_COLLECTION','看系列的两种合作方式')];}
 if(['sample','complete'].includes(state.collection?.status))series.actions=[action('OPEN_COLLECTION','看系列与买手合作')];
 const product={id:'product',title:'让新型号进入客户采购',step:'交付含台灯的买手组合，或完成熟客供货计划后，可以比较工厂新样。',done:!!adopted||!!volumeAdoption||!!studioAdoption,actions:[]};
 if(studioAdoption){product.step='验过的三档调光样已实际供给 Mira，货款已收齐。';product.achievement=`三档调光台灯 · ${studioAdoption.quantity} 盏已交付给 Mira，小批新款已被采用`; }
 else if(volumeAdoption){product.title='让量产新样进入客户采购';product.step='验过的标准暖光样已按整批成本供货，并收齐货款。';product.achievement=`${volumeAdoption.product||'暖光标准台灯'} · ${volumeAdoption.quantity} 盏已交付给 Mira，量产路线已落地`; }
 else if(adopted){product.step='集团收到新型号台灯，货款也收齐了。';product.achievement=`${adopted.productNames?.join('、')||'调光台灯'} · ${adopted.quantity} 件已交付并收齐货款`;}
 else if(!state.productDevelopment){if(hasLampDevelopmentCase(state)){product.step='你已交付过灯具组合，可以带着案例比较工厂新样；看完再决定是否出样。';product.actions=[action('START_CASE_DEVELOPMENT','带灯具案例看工厂新样')];}else if(state.supplyPlanHistory?.length){product.step='供货计划已经完成；可比较两家工厂的能力，再决定是否付出样费。';product.actions=[action('START_DEVELOPMENT','看看工厂的新样能力')];}}
 else if(['sampling','received'].includes(state.productDevelopment.status)){
  const d=state.productDevelopment,days=d.status==='sampling'?Math.max(0,d.sampleDay-state.day):0;
  product.step=days?'工厂会在第 '+d.sampleDay+' 天寄到实物。可先接旧款订单；已经用于交货的天数不用再等、再付日费。':'实物样已经到了。报价仍用旧款，直到你亲自确认新样。';
  if(!days||state.cash>=days*30)product.actions=[action('COLLECT_FIRST_SAMPLE',days?'等余下 '+days+' 天取样 · ¥'+days*30:'拆看已经到货的工厂样')];
  else product.step+=' 现在空等还差 ¥'+(days*30-state.cash)+'，也可以先做生意。';
 }else if(state.productDevelopment.status!=='active'){product.step='工厂正在准备新样，验过实物后再带去谈单。';}
 else if(state.productDevelopment.factory==='line'&&!acceptedLampSample(state,'studio')){product.title='让量产新样进入客户采购';product.step='带验过的暖光样找 Mira 谈 180 盏整批供货。不需要改成调光，也不能承诺客房调光。';product.actions=[{type:'OPEN_PRODUCT_REORDER',factory:'line',label:'找 Mira 谈量产样采购'}];}
 else if(!!acceptedLampSample(state,'studio')&&(state.contracts||[]).some(c=>c.clientId==='mira'&&c.status==='paid')){
  product.step='Mira 对小批调光灯感兴趣，带着实物样去谈 60 盏采购。';
  product.actions=[{type:'OPEN_PRODUCT_REORDER',factory:'studio',label:'找 Mira 谈调光样小批采购'}];
  const group=caseGrowthOffers(state).filter(c=>c.agreement==='private'&&c.sourceProducts.includes('mira'));
  if(group.length)product.actions.push(...byCase('OPEN_CASE_GROWTH','也可回访现有集团采购',group));
 }
 else{
  const offers=caseGrowthOffers(state),group=offers.filter(c=>c.agreement==='private'&&c.sourceProducts.includes('mira'));
  if(group.length){
   const approved=group.some(c=>state.caseLampApprovals?.[c.referrerId]);
   product.step=!!acceptedLampSample(state,'studio')?(approved?'客房双用途型号已批准，还要按门店余货安排采购、交付与收款。':'带调光样给集团采购试试，看看是否适合客房夜间使用。'):'已验的是标准暖光版，不能承诺客房调光；集团原目录仍可回访。';
   product.actions=byCase('OPEN_CASE_GROWTH','回访现有集团采购',group);
  }else{
   const candidates=offers.filter(c=>!c.agreement&&c.availableAgreements.includes('private')&&c.sourceProducts.includes('mira'));
   product.step=candidates.length?'样品已验，但还没有这份集团合作。选择一个台灯案例，先谈转介与合作范围。':'实物样已经备好。先交付一份台灯组合，再请买手介绍集团采购。';
   product.actions=byCase('OPEN_CASE_GROWTH','看看案例转介，尚未约定集团供货',candidates);
  }
 }
 // Both growth directions need a real introduction, not a dead-end prerequisite sentence.
 if(!cases.length&&state.supplyPlanHistory?.length){
  const intros=(state.contracts||[]).filter(c=>c.status==='paid'&&c.projectId);
  for(const p of [stores,series])if(!p.done&&!p.actions.length){
   if(!state.clientProjectSeason){p.step='先做一次客户新用途，完成后用这份案例争取买手合作。';p.actions=[action('START_CLIENT_PROJECTS','看看客户的新用途')];}
   else if(!state.clientProjectActive&&intros.length){p.step='已有客户用途案例，可以带给引荐的买手做组合。';p.actions=intros.map(c=>({type:'START_CURATION',label:`${c.clientName?.split(' · ')[0]||c.clientId} 的买手引荐`,clientId:c.projectId}));}
  }
 }
 // Home shortcuts never interrupt an active contract or invent a resume action.
 if(!home)for(const p of [stores,series,product]){p.actions=[];if(!p.done)p.step+=' 先处理当前页面，再回工作室继续。';}
 return [stores,series,product];
}

export function openProductReorder(state,factory){
 if(!['review','complete'].includes(state.phase)||state.clientProjectActive||!['studio','line'].includes(factory)||!acceptedLampSample(state,factory))return {state,selected:''};
 let next=reduceDealRoom(state,{type:state.supplyPlanHistory?.length?'CONTINUE_RETAIL_BUSINESS':'CONTINUE_BUSINESS'});if(next===state)return {state,selected:''};next=reduceDealRoom(next,{type:'SELECT_CLIENT',clientId:'mira'});
 const quote=next.phase==='negotiating'?quoteOptions(next).find(q=>q.specification==='developed-'+factory):null;return {state:next,selected:quote?.id||''};
}
