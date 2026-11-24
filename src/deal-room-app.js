import {cashRiskProjection} from './deal-room-cash-risk.js';
import {readRiskCheckpoint,putRiskCheckpoint,rollbackRiskCheckpoint,clearRiskCheckpoint} from './deal-room-risk-checkpoint.js';
import {cashRiskDialog,bankruptcyView} from './deal-room-bankruptcy-view.js';
import {SPECIALTY_MILESTONE} from './deal-room-specialty-calendar.js';
import {coreCalendarMilestone,coreCalendarActions,removedLiveWaits} from './deal-room-core-calendar.js';
import {netProfitAmount} from './deal-room-net-profit.js';
import {emptyMarketDesk,settledMarketDesk} from './deal-room-market-calendar.js';
import {inquiryBuyerHeading} from './deal-room-inquiry-layout.js';
import {orderReadSummary,orderReadReceipt,orderReadNext,openingOrderUnits} from './deal-room-order-read.js';
import {createOpeningGuide} from './deal-room-opening-guide.js';
import {prepareGameImages} from './deal-room-image-loading.js?v=28';
import {readCompanyName,bindCompanyName,companyNameView,companyTitleText} from './deal-room-company.js';
import {openingMarketProjection,openingMarketOrders} from './deal-room-opening-market.js';
import {prospectInbox} from './deal-room-prospects.js';
import {openingContractMilestone,openingOrders,openingFlow} from './deal-room-opening-calendar.js';
import {openingQuoteProjection,familiarBuyers,familiarQuoteProjection} from './deal-room-engine.js';
import {repeatContractMilestone,repeatParallelScope,repeatActiveOrders,isOrdinaryRepeatChoice} from './deal-room-repeat-calendar.js';
import {openingRepeatComicView} from './deal-room-opening-repeat-comics.js';
import {openingInspectionView} from './deal-room-opening-inspection-view.js';
import {openingMiraInesComicView} from './deal-room-mira-ines-comic-stages.js';
import {samirOpeningReceiptComic} from './deal-room-samir-receipt-comic.js';
import {workProductComicView} from './deal-room-workspace-product-comics.js';
import {officeIntroMode} from './deal-room-workspace-intro.js';
import {localizeBuyerDisplay} from './deal-room-prospect-locale.js';
import {WORKSPACE_DAY_COST,previewLiveWorkspaceSleep as previewWorkspaceSleep} from './deal-room-workspace-sleep.js';
import {adviserView,bindAdviser,readAdviserChoice,adviserWorkspaceAdvice,adviserPickerOpen} from './deal-room-adviser.js';
import {marketBook,canParkMarketOrder,parkedMarketOrders} from './deal-room-market.js';
import {marketView,bindMarket,marketReceiptText,marketAdviserQuote} from './deal-room-market-view.js';
let marketUI={};
import {warehouseView,bindWarehouse} from './deal-room-warehouse-view.js';
let warehouseOpen=false,warehouseUI={};
import {workspaceNavView,workspaceOfficeView,bindWorkspaceNav,showOrdersEnd,canEndOrderDay,showWarehouseShortcut} from './deal-room-workspace-nav.js';
import {propertyView,bindPropertyView} from './deal-room-property-view.js';
import {workspaceWeather,workspaceHubView,bindWorkspaceHub,workspaceTradingRecapAvailable,workspaceCooperationRecapAvailable,workspaceCaseGrowthLink,workspaceAccountExpansionDraft,workspaceSeriesRoutes} from './deal-room-workspace-hub.js';
import {PROPERTY_SCENE_ART,PROPERTY_CATALOGUE_ART,propertySceneArt} from './deal-room-property-art.js';
import {CAR_ART_BY_ID} from './deal-room-car-art.js';
import {workspaceOpeningInbox,workspaceActiveOrders,openingNextWorkday,workspaceCurrentMarketOrder,workspaceMarketQueue,workspaceFamiliarInbox,workspaceInboxIndex,workspaceOrdersIndex,workspaceInquiryFromRef} from './deal-room-workspace-index.js';
import {PROPERTY_CATALOG,propertyHoldings} from './deal-room-property.js';
import {outingsView,bindOutings,openOutings} from './deal-room-outings-view.js';
let workspaceOverride=null,propertyUI=null,outingsOpen=false,outingsUI={},sleepOpen=false,promotionUI={};
import {openProductReorder} from './deal-room-career-focus.js';
import {shopTrialView,shopShelfScene} from './deal-room-shop-trial.js';
import {exhibitionAvailable} from './deal-room-exhibition.js';
import {exhibitionView,bindExhibition} from './deal-room-exhibition-view.js';
let exhibitionOpen=false,exhibitionUI={};
import {annexView,bindAnnex} from './deal-room-annex-view.js';
let annexOpen=false,annexUI={};
import {officeAvailable} from './deal-room-office.js';
import {officeImprovementView,bindOfficeImprovement} from './deal-room-office-view.js';
let officeOpen=false,officeUI={};
import {quoteOptionExplanation,quoteCommitmentView,quoteBuyerBrief,quoteOpeningSelection,openingBuyerLineView,openingQuoteChoicesView} from './deal-room-quote-view.js';
import {lifeAvailable} from './deal-room-life.js';
import {lifeRoomView,bindLifeRoom} from './deal-room-life-view.js';
import {stockProcurementView} from './deal-room-stock-view.js';
import {revisionView,revisionArt} from './deal-room-revision-view.js';
import {roundReceivablesActive} from './deal-room-round-receivables.js';
import {roundCashView,roundProductionView,roundQuoteNote} from './deal-room-round-view.js';
import {cooperationChapter} from './deal-room-cooperation.js';
import {previewStudioAllocation} from './deal-room-allocation.js';
import {dealSaveCopies,loadDealSave,saveDealProgress} from './deal-room-save.js';
import {dealSaveView,bindDealSaveTools} from './deal-room-save-view.js';
import {launchBasis} from './deal-room-launch.js';
import {launchView} from './deal-room-launch-view.js';
import {studioProjectView} from './deal-room-studio-project-view.js';
import {studioProjectEligibility,studioProjectReview} from './deal-room-studio-project.js';
import {previewCatalogueOrder,previewFirstCatalogueOrder} from './deal-room-catalogue-order.js';
import {catalogueVersions} from './deal-room-design-catalogue.js';
import {previewCaseGrowth,previewCaseCalloff,previewApprovedCaseLamp,canCalloffCase,caseGrowthOffers} from './deal-room-case-growth.js';
import {caseGrowthView,caseClientLabel} from './deal-room-case-growth-view.js';
import {developmentView,SAMPLE_FACTORIES} from './deal-room-development.js';
import {retailWait,demandView,buyerWaitView} from './deal-room-demand.js';
import {linenFreightView} from './deal-room-linen-freight.js';
import {atelierRestockBasis,atelierRestockView} from './deal-room-atelier-restock.js';
import {tradingChapter,tradingChapterVisual} from './deal-room-trading-chapter.js';
import {businessHomeView,careerRecapView,projectDeskView,projectDeskPreview} from './deal-room-home.js';
import {buyerContact,collectionBoardView,collectionReceipt} from './deal-room-relationships.js';
import {selectedCollectionSeed,collectionView,COLLECTION_STYLES,collectionPitchView,previewCollectionPitch} from './deal-room-collection.js';
import {previewAccount,accountView,accountReceipt,accountCoverage} from './deal-room-account.js';
import {curationView,curationReceiptView,businessFeedback,playerStatusText,curationDemoModel,toggleCurationProduct} from './deal-room-curation-view.js';
import {createDealRoom,currentClient,openFirstBuyers,firstBuyerProjection,quoteOptions,previewOffer,reduceLiveDealRoom,previewCashRisk,bankruptcyStatus,businessOpportunities,normalizeDealRoom,careerOpportunity,previewSupplyPlan,clientProjects,CURATION_PRODUCTS,curationOffers,previewCuration} from './deal-room-engine.js';
import {sampleSelection,sampleSvg,developedQuoteSample} from './deal-room-samples.js';
import {supplyDraftView,supplyLotsView,supplyPlaybackFrames} from './deal-room-supply-view.js';
let personalRoomOpen=false,personalRoomUI={};
let openingInboxOpen=false,viewedFirstBuyer=null;
let studioAllocation='bedside',stockMode='small',shopTerms='regular',shopSceneMoment='';
let growthDraft=null;
let seriesMode=false,seriesLamp='standard';
let growthLampModel='standard',proposalOpen=false,proposalModel='standard',proposalBrightness=1;
let factoryChoice='studio',sampleBrightness=1;
let showCareerRecap=false,tradeEvidence='chain',tradeRecapReturnTab=null;
let collectionPitchOption='exclusive',collectionFocus='',receiptMode='delivered';
let collectionDraft={model:'private',style:'cream'};
let buyerDemo={open:false,room:'day',brightness:1};
let curationDraft=null,showcaseId=null,accountOption='pilot';
let supplyDraft=null,playback=null,playbackTimer=null;
function openStudioFromDesk(s,direction,table=false){
 const scope=studioProjectEligibility(s,direction);if(!scope.canOffer)return s;
 const fresh=!s.studioProjectPlans?.[direction]&&!s.studioProjectDrafts?.[direction]&&s.studioProject?.direction!==direction;
 let next=reduceDealRoom(s,direction==='independent'&&scope.briefs.includes('reading-drink')?{type:'OPEN_STUDIO_READING_PAIR'}:{type:'OPEN_STUDIO_PROJECT',direction});
 if(next===s||next.phase!=='studio-project'||!fresh)return next;
 if(!scope.briefs.includes(next.studioProject.briefId))next=reduceDealRoom(next,{type:'SET_STUDIO_PROJECT',field:'briefId',value:scope.briefs[0]});
 if(table)next=reduceDealRoom(next,{type:'SET_STUDIO_PROJECT',field:'layout',value:'table'});
 return next;
}
function finishPlayback(){clearTimeout(playbackTimer);playback=null;render();root.querySelector(".business h2")?.focus({preventScroll:true});}
function nextPlaybackFrame(){if(!playback)return;if(++playback.index>=playback.frames.length){finishPlayback();return;}render();playbackTimer=setTimeout(nextPlaybackFrame,1200);}
let revisionOpen=false,revisionScope='revision-nonexclusive';
function openingInboxView(quoteState,rows,expanded){
 const active=rows.find(c=>c.index===quoteState.clientIndex);
 const cards=expanded?rows.map(c=>{
  const s=firstBuyerProjection(quoteState,c.id),q=previewOffer(s,c.id==='samir'?'ready':c.id==='ines'?'season':'trial');
  const terms=c.id==='mira'?'小批交货付款，也可铺三家店':c.id==='samir'?(quoteOptions(s,!!s.openingQuoteV2).some(o=>o.id==='branded-opening')?'现货、定制都赶得上第 7 天开业':q.deliveryDay<=7?'现货赶得上第 7 天开业':'已赶不上开业，按常规补货'):(q.deliveryDay<=11?'第 11 天前到货，赶得上季度陈列':'已赶不上陈列，按常规备货');
  return `<button class="quote" data-first-buyer="${esc(c.id)}" aria-pressed="${c.id===active?.id}"><strong>${esc(c.name)} · ${esc(c.product)}</strong><span>${esc(terms)} · ${esc(q.title)}</span><small>货款 ${money(q.revenue)} · 先垫 ${money(Math.max(0,q.cost-q.deposit))} · 第 ${q.deliveryDay} 天交货 / 第 ${q.paymentDay} 天收齐</small></button>`;
 }).join(''):'';
 return `<section class="opening-inbox"><button class="quiet" id="opening-inbox-toggle" aria-expanded="${expanded}" aria-controls="first-buyer-list">${expanded?'收起询盘':'暂缓这封，看看其他询盘'}</button><div id="first-buyer-list" ${expanded?'':'hidden'}>${expanded?`<p class="brief">没签的询盘可以回来谈。客户的开业和陈列日期不会顺延。</p><div class="quotes" role="group" aria-label="未接的客户询盘">${cards}</div>`:''}</div></section>`;
}
function openingReceiptDelivery(state,contract){
 if(state.businessRound||state.clientProjectActive||contract.businessRound||contract.projectId||contract.clientId!=='samir')return '';
 if(contract.optionId==='branded-opening')return `定制杯第 ${contract.deliveryDay} 天交货，赶上了门店开业。`;
 if(contract.optionId==='ready'&&contract.deliveryDay<=7)return '这批现货赶上了门店开业。';
 if(['branded','ready'].includes(contract.optionId))return '这批货用作门店补货。';
 return '';
}
let state=createDealRoom(),selected='',event='',saveNotice='进度自动保存',saveAllowed=true;
const SAVE_KEY='trade-tycoon:deal-room:v1';
try{if(localStorage.getItem(SAVE_KEY+':reduced-motion')==='1')document.documentElement.classList.add('reduce-motion');}catch{}
let catalogueFocus='original';
let directionsOpen=false;
let deskPlan={};
let careerFocus='';try{const value=localStorage.getItem(SAVE_KEY+':focus');if(['stores','series','product'].includes(value))careerFocus=value;}catch{}
const savePanel={open:false,text:'',preview:null,message:''};
let dealStorage;try{dealStorage=localStorage;}catch{dealStorage={getItem(){throw new Error('浏览器未开放进度保存');}};}
const adviserUI={choice:readAdviserChoice(dealStorage,SAVE_KEY),choosing:null};
const loadedDeal=loadDealSave(dealStorage,SAVE_KEY);
const openingGuide=createOpeningGuide({storage:dealStorage,key:SAVE_KEY,saveStatus:loadedDeal.status});
const INTRO_KEY=SAVE_KEY+':office-welcome';
const OPENING_DRAFT_KEY=SAVE_KEY+':opening-draft:v1';
let openingDraftStorage;
try{openingDraftStorage=globalThis.sessionStorage;}catch{}
function clearOpeningDraft(){
 try{openingDraftStorage?.removeItem(OPENING_DRAFT_KEY);}catch{}
}
function openingDraftMatches(buyer,option){
 return openFirstBuyers(state).some(row=>row.id===buyer)&&
  quoteOptions(openingQuoteProjection(state,buyer),true).some(row=>row.id===option);
}
function rememberOpeningDraft(){
 if(!saveAllowed||!openingDraftStorage)return;
 const buyer=viewedFirstBuyer||currentClient(state)?.id;
 if(!openingDraftMatches(buyer,selected))return;
 try{
  if(dealStorage.getItem(SAVE_KEY)!==expectedSaveRaw){clearOpeningDraft();return;}
  openingDraftStorage.setItem(OPENING_DRAFT_KEY,JSON.stringify({version:1,engineVersion:state.version,raw:expectedSaveRaw,buyer,option:selected}));
 }catch{}
}
function resumeOpeningDraft(){
 if(!openingDraftStorage)return;
 try{
  const text=openingDraftStorage.getItem(OPENING_DRAFT_KEY);
  if(text===null)return;
  const draft=JSON.parse(text);
  if(!loadedDeal.ok||draft?.version!==1||draft.engineVersion!==state.version||draft.raw!==loadedDeal.raw||!openingDraftMatches(draft.buyer,draft.option)){
   clearOpeningDraft();return;
  }
  viewedFirstBuyer=draft.buyer;selected=draft.option;openingInboxOpen=false;workspaceOverride='inbox';
 }catch{clearOpeningDraft();}
}
let officeIntroSeen=false,lastOfficeSuggestion='';
try{officeIntroSeen=dealStorage.getItem(INTRO_KEY)==='1';}catch{}
function finishOfficeIntro(){officeIntroSeen=true;try{dealStorage.setItem(INTRO_KEY,'1');}catch{}}
// A different customer or destination is a new page, not a quote re-render.
function focusCustomerRoute(){
 const title=root.querySelector(workspaceOverride==='office'?'#ws-office-title':'.business h2')||
  root.querySelector('#ws-inbox-title, #ws-orders-title');
 title?.setAttribute?.('tabindex','-1');
 title?.focus?.({preventScroll:true});
 globalThis.scrollTo?.({top:0,left:0,behavior:'instant'});
}
function officeIntroAction(action){
 if(!['skip','open'].includes(action))return;
 finishOfficeIntro();
 const id=action==='open'?openFirstBuyers(state)[0]?.id:null;
 if(!id){render();root.querySelector('#ws-office-title')?.focus?.();return;}
 viewedFirstBuyer=null;selected='';openingInboxOpen=false;event='choosing';workspaceOverride='inbox';render();
 rememberOpeningDraft();focusCustomerRoute();
}
let expectedSaveRaw=loadedDeal.raw;
if(loadedDeal.status==='valid')state=loadedDeal.state;
if(state.collection?.status==='pitch'&&!previewCollectionPitch(state,'exclusive')?.valid)collectionPitchOption='retain';
else if(!loadedDeal.ok){saveAllowed=false;saveNotice='已有进度无法读取，原数据保留；本轮仅临时体验';}
const isCashRisky=s=>(cashRiskProjection(s,WORKSPACE_DAY_COST)?.shortfall??0)>0;
const isRiskCausative=(before,after)=>!!previewCashRisk(before,after);
let savedCashRisky=isCashRisky(state);
function save(){
 if(!saveAllowed)return;
 const result=saveDealProgress(dealStorage,state,{key:SAVE_KEY,expectedRaw:expectedSaveRaw});
 if(result.ok){
  expectedSaveRaw=result.raw;saveNotice='进度自动保存';
  const remainsRisky=isCashRisky(result.state);
  if(savedCashRisky&&!remainsRisky)clearRiskCheckpoint(dealStorage,SAVE_KEY,{expectedRaw:result.raw});
  savedCashRisky=remainsRisky;
 }
 else if(result.status==='conflict'){
  saveAllowed=false;saveNotice='其他页面已更新进度，本页已暂停自动保存';
  savePanel.conflict=true;savePanel.open=true;savePanel.message='请先下载当前页面的进度副本，再重新加载浏览器已保存的进度；两份进度不会自动合并。';
 }else{
  saveNotice=result.status==='corrupt'?'原始进度无法读取，已停止覆盖；请保留原始数据':'浏览器未能保存，本轮进度仅留在当前页面';
  if(result.status==='corrupt')saveAllowed=false;
 }
}
function bindSaveTools(){
 bindDealSaveTools(root,{panel:savePanel,storage:dealStorage,key:SAVE_KEY,getState:()=>state,getExpectedRaw:()=>expectedSaveRaw,render,download:downloadDealText,onReload:()=>{clearTimeout(playbackTimer);location.reload();},onRestored:()=>{clearRiskCheckpoint(dealStorage,SAVE_KEY);openingGuide.reset({fresh:false});clearOpeningDraft();clearTimeout(playbackTimer);location.reload();},onRestarted:()=>{clearRiskCheckpoint(dealStorage,SAVE_KEY);openingGuide.reset({fresh:true});clearOpeningDraft();clearTimeout(playbackTimer);for(const key of [INTRO_KEY,SAVE_KEY+':adviser',SAVE_KEY+':focus',SAVE_KEY+':company-name'])try{dealStorage.removeItem(key);}catch{}location.reload();}});
}
function downloadDealText(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}
const root=document.querySelector('#deal-room');
let pendingCashRisk=null,bankruptcyMessage='';
function reduceDealRoom(previous,action,onCommit){
 if(pendingCashRisk)return previous;
 const next=reduceLiveDealRoom(previous,action);
 const risk=previous===state&&next!==previous?previewCashRisk(previous,next):null;
 if(risk){
  pendingCashRisk={previous,next,risk,onCommit,focus:document.activeElement};
  showCashRisk();
  return previous;
 }
 return next;
}
function showCashRisk(){
 if(document.querySelector('#cash-risk-dialog')||!pendingCashRisk)return;
 document.body.insertAdjacentHTML('beforeend',cashRiskDialog(pendingCashRisk.risk,adviserUI.choice));
 const dialog=document.querySelector('#cash-risk-dialog');
 const note=dialog.querySelector('[role=status]');
 const cancel=()=>{
  const focus=pendingCashRisk?.focus;
  pendingCashRisk=null;dialog.remove();focus?.focus?.();
 };
 dialog.querySelector('[data-cash-risk-cancel]').onclick=cancel;
 dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
 dialog.querySelector('[data-cash-risk-confirm]').onclick=()=>{
  const {previous,next,onCommit}=pendingCashRisk??{};
  if(previous!==state){cancel();return;}
  if(saveAllowed&&!isCashRisky(previous)){
   const result=putRiskCheckpoint(dealStorage,SAVE_KEY,previous,{expectedRaw:expectedSaveRaw});
   if(!result.ok){note.textContent='没能保留本次操作前的进度。请先保存进度，再试一次。';return;}
  }else if(!saveAllowed){note.textContent='这页无法保存进度，暂不能继续这笔操作。';return;}
  pendingCashRisk=null;dialog.remove();state=next;onCommit?.();save();render();
 };
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 dialog.querySelector('[data-cash-risk-cancel]')?.focus?.();
}
function renderBankruptcy(status){
 const checkpoint=readRiskCheckpoint(dealStorage,SAVE_KEY,state,{isRisky:isCashRisky,isCausative:isRiskCausative});
 root.innerHTML=bankruptcyView(status,checkpoint.ok,bankruptcyMessage)+dealSaveView(savePanel,saveNotice);
 bindSaveTools();
 root.querySelector('[data-bankruptcy-new]')?.addEventListener('click',()=>root.querySelector('#deal-save-restart')?.click());
 root.querySelector('[data-bankruptcy-return]')?.addEventListener('click',()=>{
  const result=rollbackRiskCheckpoint(dealStorage,SAVE_KEY,{expectedRaw:expectedSaveRaw,currentState:state,isRisky:isCashRisky,isCausative:isRiskCausative});
  if(!result.ok){bankruptcyMessage='没能恢复操作前的进度。当前存档没有替换。';render();return;}
  clearOpeningDraft();location.reload();
 });
}

const money=n=>`¥${Number(n).toLocaleString('zh-CN')}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const orderPhase=s=>(roundReceivablesActive(s)&&['portfolio','fulfilling'].includes(s.phase))|| (s.phase==='market'?['preparing','transit','receivable','paid','legacy-preparing','legacy-transit','legacy-receivable'].includes(s.market?.status):['fulfilling','paid','supply','collection','collection-revision','stock-procurement','atelier-restock','linen-freight','studio-project','launch','account','curation','curation-fulfillment','planning-fulfillment','shop-trial','development','supplier-development','case-growth'].includes(s.phase));
const tabsNow=()=>state.phase==='outing-trip'?'afterwork':propertyUI?(propertyUI.kind==='office'?'development':'afterwork'):outingsOpen||personalRoomOpen?'afterwork':workspaceOverride|| (orderPhase(state)?'orders':state.phase==='curating'?'development':state.phase==='market'?'inbox':'office');
function directAction(a){const n=reduceDealRoom(state,a);if(n===state)return false;state=n;save();render();return true;}
let viewedFamiliarBuyer=null,openingMarketUI=null,workspaceOpeningOrder=null,workspaceOrderDetail=false,workspaceMailDesk=false,workspaceMarketOrderList=false,workspaceAccountPayments=false;
function workspaceNavigate(tab,ref){
 if(state.phase==='outing-trip')return;
 // Back to the office leaves a completed/unsigned familiar-customer list.
 // Any live commitment or opt-in challenge keeps its own return rules.
 if(tab==='office'&&state.phase==='portfolio'&&!state.clientProjectActive&&!roundReceivablesActive(state)&&!repeatActiveOrders(state).length){
  const next=reduceDealRoom(state,{type:'BACK_FROM_CLIENTS'});
  if(next!==state){state=next;save();}
 }
 if(tab==='afterwork'&&ref==='orders-end'){
  if(tabsNow()!=='orders'||!canEndOrderDay(state))return;
  if(state.phase==='account'&&state.account?.status==='paid'){state=reduceDealRoom(state,{type:'CLOSE_ACCOUNT'});save();}
 }
 // Leaving a finished receipt or empty draft for another workspace area should
 // also exit the procurement desk. Preserve receipt history; never close an
 // in-flight, queued, or specialized equipment order from navigation.
 if(['office','afterwork','development'].includes(tab)&&(emptyMarketDesk(state)||
    settledMarketDesk(state)&&[undefined,'prospect','neighborhood'].includes(state.market.active.kind))){
   const closed=reduceDealRoom(state,{type:'CLOSE_MARKET'});
   if(closed!==state){state=closed;save();}
 }
 if(openFirstBuyers(state).length){clearOpeningDraft();viewedFirstBuyer=null;selected='';}
 if(tradeRecapReturnTab){tradeRecapReturnTab=null;showCareerRecap=false;tradeEvidence='chain';}
 warehouseOpen=false;propertyUI=null;outingsOpen=false;personalRoomOpen=false;sleepOpen=false;
 if(tab==='inbox')viewedFirstBuyer=null;
 if(tab==='development'){promotionUI.hubPromotionOpen=ref==='promotion';promotionUI.ledgerDetail=false;}
 workspaceAccountPayments=tab==='orders'&&ref==='account-payments'&&state.phase==='account'&&state.account?.status==='paid';
 workspaceMailDesk=false;viewedFamiliarBuyer=null;openingMarketUI=null;workspaceOpeningOrder=null;workspaceOrderDetail=false;workspaceMarketOrderList=tab==='orders';workspaceOverride=tab;
 const id=tab==='inbox'?workspaceInquiryFromRef(state,ref):null;
 if(id&&openWorkspaceMail(id))return;
 render();
 if(workspaceAccountPayments)root.querySelector('.ws-receipt-archive>summary')?.focus?.();
 if(tab==='development'&&ref==='promotion')root.querySelector('[data-hub-promotion]>summary')?.focus?.({preventScroll:true});
}
function openWorkspaceMail(id){
 const draft=state.phase==='market'&&state.market?.status==='draft';
 const canSwitch=canParkMarketOrder(state)||state.phase==='market'&&state.market?.status==='paid';
 const next=draft?state:reduceDealRoom(state,canSwitch?{type:'SWITCH_MARKET_ORDER_V1',orderId:0}:{type:'OPEN_MARKET'});
 if(next===state&&!draft)return false;
 marketUI=id?{prospectId:id}:{};
 workspaceMailDesk=id?'inbox':'orders';
 if(next!==state){state=next;save();}
 render();
 root.querySelector(id?'[data-prospect-heading]':'#market-search')?.focus?.({preventScroll:true});
 return true;
}
function resetCaseQuote(){growthDraft=null;seriesMode=false;seriesLamp=state.collection?.lampVersion||'standard';growthLampModel='standard';proposalOpen=false;proposalModel='standard';}
function openWorkspaceCaseGrowth(){
 const link=workspaceCaseGrowthLink(state);
 if(!link)return;
 if(link.type!=='resume'){
  const next=reduceDealRoom(state,{type:link.type,referrerId:link.referrerId});
  if(next===state)return;
  state=next;resetCaseQuote();save();
 }
 workspaceOverride=null;event='arriving';render();focusCustomerRoute();
}
function openRecap(route){showCareerRecap=route;tradeEvidence='chain';event='';render();root.querySelector('.career-recap h3')?.focus();root.querySelector('.career-recap')?.scrollIntoView({block:'nearest'});}
let lastRenderedTab=null;
function render(){
 savePanel.copies=dealSaveCopies(dealStorage,SAVE_KEY,{unreadable:loadedDeal.status==='corrupt'||saveNotice.startsWith('原始进度无法读取')});
 const failure=bankruptcyStatus(state);if(failure){renderBankruptcy(failure);return;}
 const currentTab=tabsNow();
 if(lastRenderedTab!==null&&lastRenderedTab!==currentTab)adviserUI.choosing=false;
 lastRenderedTab=currentTab;
 const productDetailsOpen=root.querySelector('.curation-product-details')?.open;
 renderCurrentPage();
 for(const button of root.querySelectorAll('[data-specialty-milestone]'))button.onclick=()=>{
  const action={type:SPECIALTY_MILESTONE,task:button.dataset.specialtyMilestone,checkedDay:Number(button.dataset.specialtyDay)};
  const next=reduceDealRoom(state,action);if(next===state)return;
  state=next;save();if(action.task==='shop-trial-settle')shopSceneMoment='settle';render();
 };
 for(const button of root.querySelectorAll('[data-round-milestone]'))button.onclick=()=>{
  directAction({type:'ROUND_CALENDAR_V1',clientId:button.dataset.roundMilestone,checkedDay:Number(button.dataset.roundDay)});
 };
 const productDetails=root.querySelector('.curation-product-details');
 if(productDetails&&typeof productDetailsOpen==='boolean')productDetails.open=productDetailsOpen;
 const tab=tabsNow(),shippingDetail=!!root.querySelector('.ws-carafe-panel');
 if(tab==='inbox'&&viewedFirstBuyer&&openingQuoteProjection(state,viewedFirstBuyer)){
  const desk=root.querySelector('.workspace.ws-opening-inquiry'),header=root.querySelector('.ws-opening-inquiry .client-head'),choices=desk?.querySelector?.('.sample-stage');
  if(choices&&header?.after&&desk?.remove){(header.parentElement?.querySelector(':scope > .inquiry-comic, :scope > .opening-quote-chat, :scope > .brief')??header).after(choices);desk.remove();}
 }
 const nested=warehouseOpen||personalRoomOpen||outingsOpen||officeOpen||annexOpen||exhibitionOpen||propertyUI!==null||state.phase==='outing-trip';
 const chrome=shippingDetail||warehouseOpen?'detail':nested||tab==='inbox'?'tabs':'main';
 if(root.dataset)root.dataset.workspaceChrome=chrome;
 if(typeof root.insertAdjacentHTML==='function'){
  root.insertAdjacentHTML('afterbegin',workspaceNavView(tab,state,workspaceWeather(state.day),chrome,readCompanyName(dealStorage,SAVE_KEY)));
  if(!nested&&!shippingDetail&&(tab==='office'||tab==='orders'&&(workspaceMarketOrderList||!orderPhase(state)))&&['review','complete','market'].includes(state.phase)){
   showWarehouseShortcut(root,tab);
   root.querySelector('[data-open-warehouse]')?.addEventListener?.('click',()=>{warehouseOpen=true;render();root.querySelector('#wh-title')?.focus?.();});
  }
  if(!nested&&tab==='orders'&&!root.querySelector('[data-first-opening-order-detail]'))showOrdersEnd(root,state,adviserUI.choice);
  bindWorkspaceNav(root,workspaceNavigate);
 }
 bindAdviser(root,adviserUI,dealStorage,render,SAVE_KEY,workspaceNavigate);
 localizeBuyerDisplay(root);
 prepareGameImages(root);
 openingGuide.update(root,state,{tab,adviserId:adviserUI.choice,picker:adviserPickerOpen(state,adviserUI),nested:nested||shippingDetail||!!savePanel.open,detail:openingOrders(state).find(c=>c.clientId===workspaceOpeningOrder)});
}
function openWorkspaceAccount(next,resume=false){
 if(!next||next===state&&!resume)return;
 if(next!==state){state=next;save();}
 workspaceOverride=null;showcaseId=null;accountOption='pilot';event='arriving';render();
 root.querySelector('.business h2')?.focus({preventScroll:true});
}
function renderCurrentPage(){
 if(!warehouseOpen&&openingMarketUI){
  const projected=openingMarketProjection(state,openingMarketUI.orderId);
  if(projected&&(openingMarketUI.orderId!==0||prospectInbox(projected).some(row=>row.person.id===openingMarketUI.prospectId))){
   const ui=openingMarketUI,back=ui.orderId===0?'inbox':'orders',quote=marketAdviserQuote(projected,ui);
   root.innerHTML=adviserView(projected,{place:'采购台',quote,back,view:ui.orderId===0?'inquiry':'order'},adviserUI)+marketView(projected,{...ui,back,adviserId:adviserUI.choice})+dealSaveView(savePanel,saveNotice);
   root.querySelector('[data-workspace-market-order-list]')?.addEventListener('click',()=>workspaceNavigate('orders'));
   bindMarket(root,projected,ui,render,action=>{
    if(action.type==='CLOSE_MARKET'){workspaceNavigate(back);return;}
    const next=reduceDealRoom(state,{type:'OPENING_MARKET_ACTION_V1',orderId:ui.orderId,action});
    if(next===state)return;
    state=next;save();
    if(action.type==='DISMISS_PROSPECT_V1'){workspaceNavigate('inbox');return;}
    openingMarketUI={orderId:null};workspaceOverride='orders';render();
   },{onProspectBack:()=>workspaceNavigate('inbox')});
   bindSaveTools();return;
  }
  openingMarketUI=null;
 }
 if(!warehouseOpen&&workspaceOverride==='inbox'&&!viewedFirstBuyer&&openingFlow(state)&&(openFirstBuyers(state).length||prospectInbox(openingMarketProjection(state,0)).length)){
  root.innerHTML=adviserView(state,{place:'工作室',identityOnly:true},adviserUI)+workspaceOpeningInbox(state,adviserUI.choice)+dealSaveView(savePanel,saveNotice);
  root.querySelectorAll('[data-first-buyer]').forEach(b=>b.onclick=()=>{viewedFirstBuyer=b.dataset.firstBuyer;selected='';openingInboxOpen=false;event='choosing';render();rememberOpeningDraft();focusCustomerRoute();});
  root.querySelectorAll('[data-opening-promotion-letter]').forEach(b=>b.onclick=()=>{
   openingMarketUI={orderId:0,prospectId:b.dataset.openingPromotionLetter};render();root.querySelector('[data-prospect-heading]')?.focus?.();
  });bindSaveTools();return;
 }
 if(!warehouseOpen&&tabsNow()==='orders'&&(state.openingParallel&&openingFlow(state)||repeatParallelScope(state)&&(repeatActiveOrders(state).length||openingMarketOrders(state).length||state.phase==='paid'))){
  const familiar=repeatParallelScope(state);
  const order=familiar?repeatActiveOrders(state).find(c=>c.clientId===workspaceOpeningOrder)??state.contracts.findLast(c=>c.businessRound===state.businessRound&&c.clientId===workspaceOpeningOrder)
   :openingOrders(state).find(c=>c.clientId===workspaceOpeningOrder);
  if(!order){
   root.innerHTML=adviserView(state,{place:'订单列表',orderList:'opening'},adviserUI)+workspaceActiveOrders(state)+dealSaveView(savePanel,saveNotice);
   root.querySelectorAll('[data-workspace-order-detail]').forEach(b=>b.onclick=()=>{workspaceOpeningOrder=b.dataset.workspaceOrderDetail;render();root.querySelector('.business h2')?.focus?.();});
   root.querySelectorAll('[data-opening-market-order]').forEach(b=>b.onclick=()=>{
    openingMarketUI={orderId:b.dataset.openingMarketOrder==='current'?null:Number(b.dataset.openingMarketOrder)};
    render();root.querySelector('.market-panel h2')?.focus?.();
   });
   root.querySelector('[data-finish-familiar]')?.addEventListener('click',()=>{if(directAction({type:'NEXT_CLIENT'}))workspaceNavigate('inbox');});
   root.querySelector('[data-finish-opening]')?.addEventListener('click',()=>{if(directAction({type:'NEXT_CLIENT'}))workspaceNavigate('office');});
  }else{
   const due=familiar?repeatContractMilestone(state,order.clientId):openingContractMilestone(state,order.clientId);
   const projected={...state,phase:order.status==='paid'?'paid':'fulfilling',contracts:familiar?[...state.contracts.filter(c=>c!==order),order]:[order]};
   const comic=familiar?openingRepeatComicView(projected,order.optionId):openingMiraInesComicView(projected)||samirOpeningReceiptComic(projected)||openingInspectionView(projected);
   const read=orderReadSummary({...order,status:order.status==='fulfilling'?'transit':order.status,buyer:order.clientName,unit:openingOrderUnits[order.clientId]});
   root.innerHTML=adviserView(state,{place:'订单',identityOnly:true},adviserUI)+`<section class="business ws-opening-signed ws-carafe ws-order-detail"${familiar?'':' data-first-opening-order-detail'}><button type="button" class="ws-control ws-control--back" data-workspace-open="orders">← 订单列表</button>${read}
   ${comic}${orderReadNext(due?(state.day>=due.day?`<button type="button" class="primary ws-control ws-control--main" data-opening-specific-milestone>${due.delivery?(due.sameDay?'确认交货并收款':'确认交货'):(order.deposit?'收取尾款':'收取货款')}</button>`:`<p class="ws-order-detail-note">第 ${due.day} 天${due.delivery?'交货':'收款'}。</p><button type="button" data-workspace-open="inbox">去收件箱</button>`):orderReadReceipt(order.received??order.revenue,order.netProfit))}${openingNextWorkday(state)}</section>`+dealSaveView(savePanel,saveNotice);
   root.querySelector('[data-opening-specific-milestone]')?.addEventListener('click',()=>directAction({type:familiar?(due.delivery?'DELIVER_REPEAT_ORDER_V1':'COLLECT_REPEAT_ORDER_V1'):(due.delivery?'DELIVER_OPENING_ORDER_V1':'COLLECT_OPENING_ORDER_V1'),clientId:order.clientId,checkedDay:state.day}));
  }
  root.querySelector('[data-opening-next-day]')?.addEventListener('click',()=>{
   const q=previewWorkspaceSleep(state);if(q.valid&&!q.pending.length)directAction({type:'SLEEP_TO_NEXT_DAY',checkedDay:q.checkedDay,acknowledgePending:false});
  });
  bindSaveTools();return;
 }
 if(!warehouseOpen&&workspaceOverride==='orders'&&!workspaceOrderDetail&&state.phase==='fulfilling'&&(!state.businessRound||repeatContractMilestone(state))){
  root.innerHTML=adviserView(state,{place:'订单列表',orderList:'opening'},adviserUI)+workspaceActiveOrders(state)+dealSaveView(savePanel,saveNotice);
  root.querySelector('[data-workspace-order-detail]')?.addEventListener('click',()=>{workspaceOrderDetail=true;render();root.querySelector('.business h2')?.focus?.({preventScroll:true});});bindSaveTools();return;
 }
 if(!warehouseOpen&&workspaceOverride==='inbox'&&!viewedFamiliarBuyer&&(familiarBuyers(state).length||repeatParallelScope(state))){
  root.innerHTML=adviserView(state,{place:'工作室',identityOnly:true},adviserUI)+workspaceFamiliarInbox(state,adviserUI.choice)+dealSaveView(savePanel,saveNotice);
  root.querySelectorAll('[data-familiar-buyer]').forEach(b=>b.onclick=()=>{viewedFamiliarBuyer=b.dataset.familiarBuyer;selected='';render();focusCustomerRoute();});
  root.querySelectorAll('[data-opening-promotion-letter]').forEach(b=>b.onclick=()=>{openingMarketUI={orderId:0,prospectId:b.dataset.openingPromotionLetter};render();root.querySelector('[data-prospect-heading]')?.focus?.();});
  bindSaveTools();return;
 }
 if(!warehouseOpen&&workspaceOverride==='inbox'&&!workspaceMailDesk&&!viewedFamiliarBuyer&&!viewedFirstBuyer&&(['review','complete'].includes(state.phase)||state.phase==='market'||orderPhase(state))){
  root.innerHTML=adviserView(state,{place:'工作室',identityOnly:true},adviserUI)+workspaceInboxIndex(state,adviserUI.choice)+dealSaveView(savePanel,saveNotice);
  root.querySelectorAll('[data-workspace-inbox-desk]').forEach(b=>b.onclick=()=>openWorkspaceMail(b.dataset.workspaceInboxDesk));bindSaveTools();return;
 }
 if(!warehouseOpen&&workspaceOverride==='orders'&&!workspaceMailDesk&&state.phase==='market'&&state.market.status==='draft'&&parkedMarketOrders(state).length){
  root.innerHTML=adviserView(state,{place:'订单列表'},adviserUI)+workspaceMarketQueue(state)+dealSaveView(savePanel,saveNotice);
  root.querySelectorAll('[data-workspace-queued-order]').forEach(b=>b.onclick=()=>{workspaceMarketOrderList=false;directAction({type:'SWITCH_MARKET_ORDER_V1',orderId:Number(b.dataset.workspaceQueuedOrder)});});
  root.querySelector('[data-workspace-products]')?.addEventListener('click',()=>openWorkspaceMail());
  bindSaveTools();return;
 }
 if(!warehouseOpen&&workspaceOverride==='orders'&&!workspaceMailDesk&&(!orderPhase(state)||workspaceAccountPayments&&state.phase==='account'&&state.account?.status==='paid')){
  root.innerHTML=adviserView(state,{place:'订单列表'},adviserUI)+workspaceOrdersIndex(state,{expandReceipts:workspaceAccountPayments})+dealSaveView(savePanel,saveNotice);
  root.querySelector('[data-workspace-products]')?.addEventListener('click',()=>openWorkspaceMail());
  bindSaveTools();return;
 }
 if(warehouseOpen){

  root.innerHTML=adviserView(state,{place:'自有仓库'},adviserUI)+warehouseView(state,warehouseUI,{weather:workspaceWeather(state.day)})+dealSaveView(savePanel,saveNotice);
  const dispatch=(a,onCommit)=>{const n=reduceDealRoom(state,a,onCommit);if(n===state)return;state=n;onCommit?.();save();render();};
  bindWarehouse(root,state,warehouseUI,render,dispatch,()=>{warehouseOpen=false;render();root.querySelector('[data-open-warehouse]')?.focus?.();});bindSaveTools();return;
 }
 if(state.phase==='outing-trip'||outingsOpen){
  root.innerHTML=adviserView(state,{place:'出门',identityOnly:true},adviserUI)+outingsView(state,outingsUI)+dealSaveView(savePanel,saveNotice);
  bindOutings(root,state,outingsUI,render,directAction,()=>{outingsOpen=false;workspaceOverride='afterwork';render();});bindSaveTools();return;
 }
 if(propertyUI){
  root.innerHTML=adviserView(state,{place:propertyUI.kind==='office'?'工作室布置':'生活'},adviserUI)+propertyView(state,propertyUI,{artById:{...PROPERTY_CATALOGUE_ART,...CAR_ART_BY_ID},detailArtById:{...PROPERTY_SCENE_ART,...CAR_ART_BY_ID}})+dealSaveView(savePanel,saveNotice);
  bindPropertyView(root,state,propertyUI,{render,dispatch:directAction,onBack:()=>{propertyUI=null;render();},getState:()=>state});bindSaveTools();return;
 }
 if(workspaceOverride==='development'||workspaceOverride==='afterwork'&&!personalRoomOpen){
  const dev=workspaceOverride==='development';
  root.innerHTML=adviserView(state,{place:dev?'发展':'下班',identityOnly:!dev||promotionUI.ledgerDetail},adviserUI)+workspaceHubView(state,workspaceOverride,lifeAvailable(state),sleepOpen,promotionUI,{adviserId:adviserUI.choice})+dealSaveView(savePanel,saveNotice);
  bindWorkspaceHub(root,{promotion:dev?{state,ui:promotionUI,render,dispatch:directAction}:null,onProperty:kind=>{propertyUI={kind};render();},onReferral:(clientId,first)=>{const next=reduceDealRoom(state,{type:first?'START_OPENING_CURATION':'START_CURATION',clientId});if(next===state)return;workspaceOverride=null;curationDraft=null;buyerDemo={open:false,room:'day',brightness:1};state=next;save();render();},onAccountCase:id=>openWorkspaceAccount(reduceDealRoom(state,{type:'START_ACCOUNT',referrerId:id})),onAccountExpansion:()=>openWorkspaceAccount(workspaceAccountExpansionDraft(state)),onSeries:id=>openWorkspaceAccount(workspaceSeriesRoutes(state).find(r=>r.id===id)?.next,true),onTradeRecap:()=>{if(!workspaceTradingRecapAvailable(state))return;tradeRecapReturnTab='development';workspaceOverride=null;openRecap('trade');},onCooperationRecap:()=>{if(!workspaceCooperationRecapAvailable(state))return;tradeRecapReturnTab='development';workspaceOverride=null;openRecap('cooperation');},onCaseGrowth:openWorkspaceCaseGrowth,onProductReorder:factory=>{const opened=openProductReorder(state,factory);if(opened.state===state)return;state=opened.state;selected=opened.selected;workspaceOverride=null;event='arriving';save();render();focusCustomerRoute();},onHome:()=>{personalRoomOpen=true;personalRoomUI={};render();},onOuting:section=>{openOutings(outingsUI,section);outingsOpen=true;render();},onSleep:()=>{sleepOpen=true;render();},onLiquidate:expectedProceeds=>directAction({type:'LIQUIDATE_PERSONAL_ASSETS_V1',checkedDay:state.day,expectedProceeds}),onBankruptcy:()=>{sleepOpen=false;if(directAction({type:'DECLARE_BANKRUPTCY_V1',checkedDay:state.day}))root.querySelector('#bankruptcy-title')?.focus?.();},onSleepCancel:()=>{sleepOpen=false;render();},onSleepConfirm:()=>{sleepOpen=false;if(!directAction({type:'SLEEP_TO_NEXT_DAY',checkedDay:state.day,acknowledgePending:true}))render();}});
  bindSaveTools();return;
 }
 if(workspaceOverride==='office'){
  const h=propertyHoldings(state), office=PROPERTY_CATALOG.find(x=>x.id===h?.active?.office);
  const intro=officeIntroMode(state,loadedDeal.status,officeIntroSeen,adviserUI.choice,adviserPickerOpen(state,adviserUI)),advice=adviserWorkspaceAdvice(state,adviserUI);
  const adviceKey=adviserUI.choice&&advice[0]?.text?adviserUI.choice+':'+advice[0].text:'';
  const companyName=readCompanyName(dealStorage,SAVE_KEY);
  root.innerHTML=companyNameView(companyName)+adviserView(state,{place:'办公室',identityOnly:true},adviserUI)+workspaceOfficeView(state,{intro,adviserId:adviserUI.choice,companyName,officeName:office?.name,officeId:office?.id,art:propertySceneArt(office?.id),weather:workspaceWeather(state.day),advice})+dealSaveView(savePanel,saveNotice);
  root.querySelectorAll('[data-workspace-intro]').forEach(b=>b.onclick=()=>officeIntroAction(b.dataset.workspaceIntro));
  if(!intro&&adviceKey&&adviceKey!==lastOfficeSuggestion)root.querySelector('.ws-original-note .ws-note-face')?.classList.add('ws-note-react');
  lastOfficeSuggestion=adviceKey;
  bindCompanyName(root,dealStorage,SAVE_KEY,render);
  bindSaveTools();return;
 }
 if(personalRoomOpen){
  const id=propertyHoldings(state).active.home,home=PROPERTY_CATALOG.find(x=>x.id===id);
  const model={area:!home||id==='home-starter'?'旧码头 · 工作室':'我的住处',name:home?.name,homeId:id||'home-starter',weather:workspaceWeather(state.day),art:id&&id!=='home-starter'?propertySceneArt(id):'',sleep:previewWorkspaceSleep(state)};
  root.innerHTML=adviserView(state,{place:'住处'},adviserUI)+lifeRoomView(state,personalRoomUI,model)+dealSaveView(savePanel,saveNotice);
  bindLifeRoom(root,{getState:()=>state,getUI:()=>personalRoomUI,setUI:next=>{personalRoomUI=next;render();},dispatch:directAction,
   onSleepConfirm:()=>{const q=previewWorkspaceSleep(state);if(!personalRoomUI.sleepOpen||!q.valid)return;personalRoomOpen=false;personalRoomUI={};workspaceOverride='office';directAction({type:'SLEEP_TO_NEXT_DAY',checkedDay:q.checkedDay,acknowledgePending:true});},
   close:()=>{personalRoomOpen=false;personalRoomUI={};workspaceOverride='afterwork';render();root.querySelector('[data-workspace-home]')?.focus?.();}});
  bindSaveTools();return;
 }
 if(state.phase==='market'&&workspaceMarketOrderList&&orderPhase(state)&&state.market?.active){
  const a=state.market.active;
  root.innerHTML=adviserView(state,{place:'订单列表',orderList:'market'},adviserUI)+workspaceCurrentMarketOrder(a,state.market.status,state)+dealSaveView(savePanel,saveNotice);
  root.querySelector('[data-workspace-current-market-order]')?.addEventListener('click',()=>{workspaceMarketOrderList=false;render();});
  root.querySelectorAll('[data-workspace-queued-order]').forEach(b=>b.onclick=()=>{workspaceMarketOrderList=false;directAction({type:'SWITCH_MARKET_ORDER_V1',orderId:Number(b.dataset.workspaceQueuedOrder)});});bindSaveTools();return;
 }
 if(state.phase==='market'){
  const quote=marketAdviserQuote(state,marketUI),back=workspaceMailDesk;
  root.innerHTML=adviserView(state,{place:'采购台',quote,back,view:state.market.status==='draft'&&(marketUI.prospectId||quote)?'inquiry':null},adviserUI)+marketView(state,{...marketUI,back,adviserId:adviserUI.choice})+dealSaveView(savePanel,saveNotice);
  const dispatchMarket=action=>{
   const next=reduceDealRoom(state,action);if(next===state)return;
   state=next;workspaceMarketOrderList=false;
   if(action.type==='SWITCH_MARKET_ORDER_V1'){workspaceOverride='inbox';workspaceMailDesk=false;marketUI={};}
   else if(action.type==='DISMISS_PROSPECT_V1'){workspaceOverride='inbox';workspaceMailDesk=false;marketUI={};}
   else if(action.type==='CLOSE_MARKET'){workspaceOverride=workspaceMailDesk==='orders'?'orders':'inbox';workspaceMailDesk=false;marketUI={};}
   else if(orderPhase(state))workspaceOverride='orders';
   save();render();
   if(action.type==='CLOSE_MARKET'||action.type==='DISMISS_PROSPECT_V1')root.querySelector(workspaceOverride==='orders'?'[data-workspace-products]':'#ws-inbox-title')?.focus({preventScroll:true});
  };
  root.querySelector('[data-workspace-market-order-list]')?.addEventListener('click',()=>{workspaceMarketOrderList=true;workspaceOverride='orders';render();});
  bindMarket(root,state,marketUI,render,dispatchMarket,workspaceMailDesk==='inbox'?{onProspectBack:()=>workspaceNavigate('inbox')}:undefined);bindSaveTools();return;
 }
 if(state.phase==='linen-freight'){
  root.innerHTML=adviserView(state,{place:'展陈配送'},adviserUI)+linenFreightView(state)+dealSaveView(savePanel,saveNotice);
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const next=reduceDealRoom(state,{type:b.dataset.action});if(next===state)return;state=next;save();render();const target=root.querySelector(state.phase==='linen-freight'?'.business h2':'[data-action="OPEN_LINEN_FREIGHT"]');target?.focus({preventScroll:true});});
  bindSaveTools();return;
 }

 if(exhibitionOpen&&exhibitionAvailable(state)){
  root.innerHTML=adviserView(state,{place:'展览',compact:true},adviserUI)+exhibitionView(state,exhibitionUI)+dealSaveView(savePanel,saveNotice);
  bindExhibition(root,{getState:()=>state,getUI:()=>exhibitionUI,setUI:next=>{exhibitionUI=next;render();},dispatch:action=>{const next=reduceDealRoom(state,action);if(next!==state){state=next;save();}render();},close:()=>{exhibitionOpen=false;exhibitionUI={};annexOpen=true;render();root.querySelector('#open-private-exhibition')?.focus();}});bindSaveTools();return;
 }
 if(annexOpen&&officeAvailable(state)&&state.officeImprovement){
  root.innerHTML=adviserView(state,{place:'侧间',compact:true},adviserUI)+annexView(state,annexUI)+dealSaveView(savePanel,saveNotice);
  if(state.officeAnnex){root.querySelector('.annex-panel')?.insertAdjacentHTML('beforeend','<p><button id="open-private-exhibition">布置私人小展</button></p>');root.querySelector('#open-private-exhibition')?.addEventListener('click',()=>{exhibitionOpen=true;exhibitionUI={};render();root.querySelector('[data-exhibition-close]')?.focus();});}
  bindAnnex(root,{getState:()=>state,getUI:()=>annexUI,setUI:next=>{annexUI=next;render();},dispatch:action=>{const next=reduceDealRoom(state,action);if(next!==state){state=next;save();}render();},close:()=>{annexOpen=false;annexUI={};render();root.querySelector('#open-office-annex')?.focus();}});bindSaveTools();return;
 }
 if(officeOpen&&officeAvailable(state)){
  root.innerHTML=adviserView(state,{place:'工作室布置'},adviserUI)+officeImprovementView(state,officeUI)+dealSaveView(savePanel,saveNotice);
  bindOfficeImprovement(root,state,officeUI,action=>{const next=reduceDealRoom(state,action);if(next!==state){state=next;save();}render();},render,()=>{officeOpen=false;officeUI={};render();root.querySelector('#open-office-improvement')?.focus();});
  bindSaveTools();return;
 }


 const familiarDraftState=viewedFamiliarBuyer?familiarQuoteProjection(state,viewedFamiliarBuyer,3):null;
 const openingBuyers=openFirstBuyers(state),openingDraftState=viewedFirstBuyer?openingQuoteProjection(state,viewedFirstBuyer):state.phase==='negotiating'&&!state.businessRound&&!state.clientProjectActive?openingQuoteProjection(state,currentClient(state)?.id):null,quoteState=openingDraftState??familiarDraftState??state;
 const viewPhase=openingDraftState||familiarDraftState?'negotiating':state.phase;
 const roundActive=roundReceivablesActive(state);
 const opportunities=businessOpportunities(state),career=careerOpportunity(state),projects=clientProjects(state),referrals=curationOffers(state);
 const hubTradeRecap=tradeRecapReturnTab&&(showCareerRecap==='trade'?workspaceTradingRecapAvailable(state):showCareerRecap==='cooperation'&&workspaceCooperationRecapAvailable(state));
 const viewingCase=!hubTradeRecap&&!supplyDraft&&['review','complete'].includes(state.phase)?(state.curationHistory||[]).find(c=>c.referrerId===showcaseId):null;
 const home=hubTradeRecap||(!viewingCase&&!supplyDraft&&['review','complete'].includes(state.phase));
 const receipt=collectionReceipt(state,collectionFocus);
 const pitchVisual=state.collection?.status==='pitch'?previewCollectionPitch(state,collectionPitchOption):state.collection?.active;
 const revisionAtelier=state.collectionRevision?.active?.buyerId==='atelier'||(!state.collectionRevision?.exclusiveBuyer&&state.collectionRevision?.orders?.some(o=>o.buyerId==='northline'&&o.status==='paid'));
 const contact=state.phase==='atelier-restock'?{name:'Élise',company:'Atelier',role:'独家系列的原买手',mood:state.atelierRestock?.status==='draft'?0:2,column:0,label:'同版实物补货'}:state.phase==='collection-revision'?{name:revisionAtelier?'Élise':'Adrian',company:revisionAtelier?'Atelier':'Northline',role:'买手合作',mood:0,column:revisionAtelier?0:1,label:'独立新版本洽谈'}:receipt?{...receipt.buyer,mood:2,label:receiptMode==='delivered'?'已交付合作':'确认的设计'}:buyerContact(state,pitchVisual);
 const seedPreview=selectedCollectionSeed(state,collectionDraft);
 const collectionVisual=state.phase==='collection'?{...state.collection,...(seedPreview?{products:seedPreview.products,lampVersion:seedPreview.lampVersion||'standard'}:{}),buyer:pitchVisual?.scope==='whole-exclusive'?pitchVisual.buyer+' · 独家系列':pitchVisual?.scope==='buyer-sleeve'?pitchVisual.buyer+' · 专用纸套':state.collection.model==='own'&&state.collection.exclusiveBuyer?(state.collection.exclusiveBuyer==='atelier'?'Atelier':'Northline')+' · 独家系列':state.collection.model==='own'||(state.collection.status==='draft'&&collectionDraft.model==='own')?'工作室 · 自有系列':'Northline · 专用系列',referrerName:'工作室',anchor:(seedPreview?.products||state.collection.products)[0],quantity:pitchVisual?.sets||0,quantityLabel:pitchVisual?null:'设计样品',packaging:'plain',...(receipt?{buyer:receipt.buyer.company+' · '+(receipt.scope==='whole-exclusive'?'独家系列':receipt.scope==='buyer-sleeve'?'专用纸套':receipt.scope==='private-label'?'买方专用系列':'工作室系列'),products:receipt.products,quantity:receipt.sets,quantityLabel:receiptMode==='delivered'?receipt.sets+' 件 · 已交付':'确认时的设计',status:receiptMode==='delivered'?'paid':'draft',anchor:null,lampVersion:receipt.lampVersion}: {})}:null;
 const accountVisual=state.phase==='account'?{...state.account,anchor:state.account.products[0],quantity:state.account.sets||previewAccount(state,state.account.expansion?'remaining':accountOption)?.sets,packaging:'plain'}:null;
 if(state.phase==='case-growth'&&state.caseGrowth.status==='draft'&&!growthDraft){
  const basis=state.curationHistory.find(c=>c.referrerId===state.caseGrowth.referrerId),agreement=state.caseGrowth.agreement||caseGrowthOffers(state).find(c=>c.referrerId===basis.referrerId)?.availableAgreements?.[0]||'portfolio';
  growthDraft={agreement,products:[...((state.caseGrowthHistory||[]).findLast(c=>c.referrerId===basis.referrerId)?.products||basis.products)],packaging:agreement==='private'?basis.packaging:'plain',terms:'delivery'};
 }

 const allocationQuote=state.phase==='studio-project'&&!(state.caseGrowthHistory||[]).some(h=>h.status==='paid'&&h.allocationVersion===1&&h.referrerId===state.studioProject.referrerId)?previewStudioAllocation(state,studioAllocation):null;
 const studioVisual=state.phase==='studio-project'?{products:studioProjectReview(state,state.studioProject).products||[],buyer:state.studioProject.direction==='independent'?'工作室主题陈列':'集团场所方案',referrerName:state.curationHistory.find(c=>c.referrerId===state.studioProject.referrerId)?.referrerName||'原合作客户',status:'draft',packaging:'plain',quantity:1,quantityLabel:'实物方案',lampVersion:state.studioProject.lampVersion,...(allocationQuote?.available?{products:allocationQuote.products,quantityLabel:null,productQuantities:allocationQuote.productQuantities}:{})}:null;
 const growthQuote=state.phase==='case-growth'?(state.caseGrowth.status==='draft'?(seriesMode?(state.caseGrowth.agreement?previewCatalogueOrder(state,{lampVersion:seriesLamp}):previewFirstCatalogueOrder(state,{referrerId:state.caseGrowth.referrerId,lampVersion:seriesLamp})):growthLampModel==='developed'&&growthDraft.agreement==='private'&&growthDraft.products.length===1&&growthDraft.products[0]==='mira'?previewApprovedCaseLamp(state,{terms:growthDraft.terms}):(growthDraft.products.length===1?previewCaseCalloff:previewCaseGrowth)(state,growthDraft)):state.caseGrowth.active):null;
 const growthVisual=growthQuote?{products:growthDraft?.products||[],...growthQuote,...(seriesMode&&!Number.isFinite(growthQuote.quantity)?{quantityLabel:'设计样品'}:{}),...(proposalOpen?{products:['mira'],productNames:[proposalModel==='developed'?'三档调光台灯':'标准固定亮度灯'],lampVersion:proposalModel==='developed'?'developed':undefined,quantity:1,quantityLabel:'设计样品'}:{}),buyer:caseClientLabel(state.caseGrowth.referrerId,growthQuote.agreement),status:state.caseGrowth.status==='paid'&&growthQuote.agreement==='portfolio'?'paid':'draft',referrerName:growthQuote.agreement==='private'?'客户内部':'工作室案例册',anchor:null}:null;
 const launchSource=state.phase==='launch-project'?launchBasis(state):null;
 const launchVisual=launchSource?{...launchSource,referrerName:'已签买方',status:state.launchProject.status==='handed'?'paid':'draft',packaging:'plain',quantity:launchSource.sets,quantityLabel:'已交付实物'}:null;
 const tradeRecap=home&&showCareerRecap&&(showCareerRecap==='trade'||showCareerRecap===true&&!state.collection)?tradingChapter(state):null;
 const recapChapter=home&&showCareerRecap?cooperationChapter(state):null;
 const splitStores=recapChapter?.facts.some(f=>f.kind==='generic-then-series-stores'),mixedVersions=recapChapter?.facts.some(f=>f.kind==='mixed-approved-version-stores');
 const recapVisual=tradeRecap?tradingChapterVisual(tradeRecap,tradeEvidence):recapChapter?.closed?{products:[...state.collection.products],referrerName:'工作室',anchor:null,buyer:recapChapter.relation.buyerId==='northline'?(recapChapter.facts.some(f=>f.kind==='generic-stores-separate-handover')?'Northline · 系列陈列已交接，六店另供通用商品':splitStores?'Northline · 三店通用组合，三店系列商品':mixedVersions?'Northline · 两批门店各按确认版本交付':'Northline · 同版系列六店交付'):recapChapter.relation.buyerId==='atelier'?'Atelier · 独家系列完成交接':recapChapter.facts.some(f=>f.kind==='use-delivered')?'工作室原稿 · 已用于实际合作':'工作室原稿 · 已被客户采用',status:'paid',packaging:'plain',quantityLabel:splitStores?'后三家的系列作品':'已交付的作品',lampVersion:state.collection.lampVersion}:null;
 const stockVisual=state.phase==='stock-procurement'?{products:['mira'],buyer:'集团采购 · 新增阅读位',referrerName:state.curationHistory?.find(c=>c.referrerId===state.stockProcurement?.referrerId)?.referrerName||'客户',status:state.stockProcurement?.status==='paid'?'paid':'draft',packaging:'plain',quantity:12,quantityLabel:'本次确认数量',lampVersion:'developed'}:null;
 const shelfMoment=shopSceneMoment;shopSceneMoment='';
 const shopVisual=state.phase==='shop-trial'?{products:['mira'],buyer:'街角小店 · 四天陈列',referrerName:'工作室通用库存',status:'draft',packaging:'plain',quantity:12,quantityLabel:'送去陈列数量',lampVersion:'developed'}:null;
 const restockBasis=state.phase==='atelier-restock'?atelierRestockBasis(state):null;
 const restockVisual=restockBasis?{products:restockBasis.products,lampVersion:restockBasis.lampVersion,referrerName:'Élise',buyer:'Atelier · 原版补货',status:'draft',packaging:'plain',quantityLabel:state.atelierRestock.sets?state.atelierRestock.sets+' 套':'沿用首单实物'}:null;
 const curationBrief=restockVisual||shopVisual||stockVisual||recapVisual||launchVisual||studioVisual||growthVisual||collectionVisual||accountVisual||viewingCase||(!supplyDraft&&(['curating','curation-fulfillment'].includes(state.phase)||state.feedback?.kind==='curation-paid')?state.curation:null);
 if(state.phase==='curating'&&!curationDraft)curationDraft={products:[state.curation.anchor,CURATION_PRODUCTS.find(p=>p.id!==state.curation.anchor).id],quantity:60,packaging:'plain'};
 const demo=state.phase==='curating'?curationDemoModel(curationBrief,curationDraft,buyerDemo):null;
 const buyerScene=!!curationBrief&&curationBrief.status==='paid'&&!['stock-procurement','shop-trial'].includes(state.phase);
 const cq=state.phase==='curating'?previewCuration(state,curationDraft,{cadence:true}):curationBrief;
 const client=['development','supplier-development'].includes(state.phase)?null:(['shop-trial','stock-procurement','studio-project','launch-project','collection-revision'].includes(state.phase)?null:currentClient(quoteState))||(supplyDraft?{...career.clients.find(c=>c.id===supplyDraft.clientId),country:'供货安排'}:state.feedback?.kind==='supply-complete'?{id:state.supplyPlan.clientId,name:state.supplyPlan.clientName,product:state.supplyPlan.product,country:'本次供货'}:null),options=quoteOptions(quoteState,!!openingDraftState);
 const planVisual=supplyDraft?previewSupplyPlan(state,supplyDraft):(state.phase==='planning-fulfillment'||state.feedback?.kind==='supply-complete')?state.supplyPlan:null;if(!options.some(o=>o.id===selected))selected=options[0]?.id||'';
 const counterRelevant=(!openingDraftState||state.history.at(-1)?.clientId===client?.id)&&state.feedback?.kind==='counter'&&(state.history.at(-1)?.optionId===selected||(state.phase==='studio-project'||state.phase==='case-growth'&&proposalOpen&&proposalModel==='standard'&&state.history.at(-1)?.type==='APPROVE_CASE_LAMP'));
 const mood=(['fulfilling','paid','planning-fulfillment'].includes(state.phase)||state.feedback?.kind==='supply-complete')?2:counterRelevant?1:0;
 const contract=state.openingParallel&&openingFlow(state)?(state.phase==='paid'?openingOrders(state).find(c=>c.clientId===currentClient(state)?.id&&c.status==='paid'):openingContractMilestone(state)?.contract):state.contracts.at(-1);
 const openingContract=!!contract&&!state.businessRound&&!state.clientProjectActive&&!contract.businessRound&&!contract.projectId;
 const openingPaid=openingContract&&!openingDraftState&&!familiarDraftState&&state.phase==='paid'&&contract.status==='paid';
 const repeatMilestone=repeatContractMilestone(state);
 const openingMilestone=openingContractMilestone(state)||repeatMilestone;
 const openingSigned=!!openingMilestone&&!roundActive&&!openingDraftState&&!familiarDraftState;
 const openingBalanceLabel=contract?.deposit>0?'尾款':'货款';
 const repeatComic=openingRepeatComicView(state,selected);
 const classicOrderRead=openingSigned||openingPaid||state.phase==='paid'&&!!repeatComic;
 const standardInquiryRead=viewPhase==='negotiating'&&Boolean(openingDraftState||familiarDraftState)&&!roundActive;
 const openingComic=(openingPaid||openingSigned)?openingMiraInesComicView(state)||(openingPaid?samirOpeningReceiptComic(state):''):'';
 const deliveryNote=openingPaid&&!openingComic?openingReceiptDelivery(state,contract):'';
 const openingIdentity=openingPaid||openingSigned||viewPhase==='negotiating'&&!state.businessRound&&!state.clientProjectActive;
 const [openingName,openingCompany]=(openingIdentity?client?.name||contract?.clientName||'':'').split(' · ');
 const feedbackText=state.phase==='paid'&&state.feedback.kind==='paid'&&contract?`${contract.clientName.split(' · ')[0]}的货款已收齐，这单净赚 ${money(contract.netProfit)}。`:state.feedback.kind==='welcome'?'有客户来问价，先看看数量和交期。':restockBasis?(state.atelierRestock.status==='draft'?'Élise 邀你沿用首单的实物和包装。':state.atelierRestock.status==='paid'?'Atelier 已收到补货，货款已结清。':state.feedback.message):quoteState!==state?'先看看这位客户的需求，还没有签单。':viewPhase==='negotiating'&&selected==='developed-lamp'?'把验过的新样摆出来，再和客户确认这批订单。':state.phase==='collection-revision'&&state.feedback.kind==='revision'&&state.collectionRevision?.status!=='draft'?'继续看看潮汐系列的样品和订单。':roundActive&&viewPhase==='portfolio'&&state.businessSigned>=2?(state.contracts.some(c=>c.roundReceivable&&c.businessRound===state.businessRound&&c.status==='receivable')?'本轮两批已交付；未到账的尾款仍在客户名下。':'本轮两单尾款已收齐，可以回工作室。'):roundActive?state.feedback.message:receipt?(receiptMode==='delivered'?receipt.buyer.company+' 已收到这批产品。':'看看确认的设计与交到客户手上的成品。'):recapVisual?'已交付的作品与承诺留在这里，继续经营由你决定。':state.phase==='studio-project'?state.feedback.message:['WAIT_FOR_BUYER','WAIT_FOR_RETAIL','PAUSE_FOR_BUYER'].includes(state.history.at(-1)?.type)?state.feedback.message:state.retailPlanning&&viewPhase==='portfolio'?'看看哪些门店需要补货，或回工作室经营其他业务。':state.collection?.status==='pitch'?(state.collection.pitchBuyer==='northline'?'买方想改成自有品牌线。先核清能授权的范围。':'买方希望主题陈列独家。可以拆开原系列与买方专用纸套来谈。'):home&&!showCareerRecap&&state.market?.status==='paid'&&state.feedback?.kind==='market-paid'?marketReceiptText(state):businessFeedback(state,{viewingCase,supplyDraft});
 const marketLedger=state.marketHistory?.length?marketBook(state):null;
 const completedCooperations=(marketLedger?.receipts.length||0)+(state.linenFreight?.status==='paid'?1:0)+(state.atelierRestock?.status==='paid'?1:0)+(state.stockProcurement?.status==='paid'?1:0)+(state.collectionRevision?.orders||[]).filter(o=>o.status==='paid').length+state.contracts.filter(c=>c.status==='paid').length+(state.supplyPlanHistory||[]).length+(state.curationHistory||[]).length+(state.caseGrowthHistory||[]).filter(c=>c.status==='paid').length+(state.accountHistory||[]).length+(state.collection?.orders||[]).filter(c=>c.status==='paid').length;
 const repeatDraft=!!state.businessRound&&!state.clientProjectActive&&!roundActive&&viewPhase==='negotiating'&&isOrdinaryRepeatChoice(selected)&&client?.id;
 const p=selected?previewOffer(repeatDraft&&!familiarDraftState?(familiarQuoteProjection(state,client.id,3)??quoteState):quoteState,selected):null,paid=state.contracts.filter(c=>c.status==='paid');
 const quoteLampSample=developedQuoteSample(state,selected,sampleBrightness);
 root.innerHTML=`<header><div class="brand"><small>再开一单就下班</small><h1>${companyTitleText(readCompanyName(dealStorage,SAVE_KEY))}</h1></div><div class="wallet"><span>第 ${state.day} 天</span><strong>${money(state.cash)}</strong><small>可用资金</small></div></header>
 ${adviserView(state,{place:showCareerRecap?'收工':home?'工作室':'业务',quote:viewPhase==='negotiating'?p:null,view:viewPhase==='negotiating'?'inquiry':null,accountOption,orderFocus:true,identityOnly:openingPaid||openingSigned},adviserUI)}
 ${openingSigned||openingPaid||state.phase==='curating'||accountVisual?'':shopVisual?shopShelfScene(state,shopTerms,shelfMoment):`<section class="workspace ${viewPhase==='negotiating'?'ws-opening-inquiry':''} ${['curating','curation-fulfillment'].includes(state.phase)?'ws-referral-workspace':''} ${state.officeImprovement&&!buyerScene?'office-upgraded-workspace':''} ${esc(event)} ${buyerScene?'buyer-scene':''} ${collectionVisual||restockBasis||growthVisual?.designStyle?'collection-mode':''} ${demo?.open?'demo-active demo-'+demo.room:''}" style="--demo-glow:${demo?.glow||0};--demo-lamp:${[.75,.95,1.12][demo?.level??1]}" aria-label="${tradeRecap?'已交付贸易成果':buyerScene?'已交付买手店陈列':'现代贸易工作空间'}"><div class="room-light"></div>${`<div class="desk-label">${tradeRecap?esc(recapVisual.buyer)+' · 已交货并收款':buyerScene?esc(curationBrief.buyer)+' · 你的组合已上新':completedCooperations?'合作交付 · '+completedCooperations+' 笔已回款':'今天，从一笔好生意开始'}</div>`}
 ${restockBasis?`<div class="collection-sleeve style-${restockBasis.style}"><strong>Atelier · 原版独家</strong><span>${COLLECTION_STYLES[restockBasis.style]}</span></div>`:''}${collectionVisual?`<div class="collection-sleeve style-${esc((receipt&&receiptMode==='delivered'?receipt.style:null)||pitchVisual?.style||state.collection.style||collectionDraft.style)}"><strong>${collectionVisual.buyer}</strong><span>${COLLECTION_STYLES[(receipt&&receiptMode==='delivered'?receipt.style:null)||pitchVisual?.style||state.collection.style||collectionDraft.style]}</span></div>`:''}
 ${growthVisual?.designStyle?`<div class="collection-sleeve style-${esc(growthVisual.designStyle)}"><strong>工作室系列 · 署名保留</strong><span>${COLLECTION_STYLES[growthVisual.designStyle]}</span></div>`:''}
 ${client?`<div class="customer-call" aria-label="${esc(client.name)}${mood===2?'已确认合作':mood===1?'正在回谈':'正在看样品'}"><div class="customer-face mood-${mood}" style="--face-x:${['mira','samir','ines'].indexOf(client.id)*50}%;--face-y:${mood*50}%"></div><span>${esc(client.name.split(' · ')[0])}<i>${mood===2?'已确认':mood===1?'回谈中':'看样中'}</i></span></div>`:''}
 <div class="sample-stage ${state.phase==='fulfilling'?'sample-confirmed':''} ${curationBrief?'curation-stage':''} ${curationBrief&&cq.packaging==='gift'?'curation-gift':''}" aria-label="产品样品">${['development','supplier-development'].includes(state.phase)?`<div class="sample-piece picked single">${sampleSvg('lamp')}<span>${esc(SAMPLE_FACTORIES[state.phase==='supplier-development'?state.secondSupplier.factory:state.productDevelopment?.factory||factoryChoice].title)} · 工厂样品</span></div>`:state.phase==='collection-revision'?revisionArt(revisionOpen,state.collectionRevision?.products||[]):curationBrief?CURATION_PRODUCTS.filter(p=>state.phase==='curating'||cq.products.includes(p.id)).map(product=>`<button class="sample-piece curation-sample ${(cq.products||[]).includes(product.id)?'picked':''}" data-curation-product="${product.id}" aria-pressed="${(cq.products||[]).includes(product.id)}" ${state.phase!=='curating'||product.id===curationBrief.anchor?'disabled':''}>${sampleSvg(product.kind,cq.packaging==='gift')}<span>${esc(tradeRecap&&tradeEvidence==='model'?tradeRecap.model.product:product.id==='mira'&&cq.lampVersion==='developed'?'三档调光台灯':product.name)}${product.id===curationBrief.anchor?' · 案例产品':''}<small>${state.phase==='curating'?`¥${product.id==='mira'&&cq.lampVersion==='developed'?75:product.price} / 件`:cq.productQuantities?cq.productQuantities[product.id]+' 件':cq.quantityLabel||cq.quantity+' 件'}</small></span></button>`).join(''):home&&careerFocus==='product'&&state.productDevelopment?.status==='active'?[state.productDevelopment,...(state.secondSupplier?.status==='active'?[state.secondSupplier]:[])].map(sample=>`<div class="sample-piece picked ${state.secondSupplier?.status==='active'?'':'single'}">${sampleSvg('lamp')}<span>${sample.factory==='line'?'暖光标准台灯 · 量产留样':'三档调光台灯 · 工作室留样'}</span></div>`).join(''):state.clientProjectSeason&&!client?`<div class="project-display">${projects.map(p=>`<div class="project-piece ${p.completed?'project-done':''}">${sampleSvg(p.id==='mira'?'lamp':p.id==='samir'?'cup':'linen',p.specification==='branded')}<strong>${esc(p.title)}</strong><span>${p.completed?(p.onTime?'专题已亮相 ✓':'常规补货 ✓'):p.openForProject?`第 ${p.deadline} 天`:'转常规补货'}</span></div>`).join('')}</div>`:planVisual?planVisual.lots.map((lot,i)=>`<div class="sample-piece plan-batch"><div class="batch-quantity">${lot.quantity} 件${planVisual.completed?' ✓':''}</div>${sampleSvg(client?.id==='mira'?'lamp':client?.id==='samir'?'cup':'linen')}<span>第 ${i+1} 批 · 第 ${lot.deliveryDay} 天交货</span></div>`).join(''):viewPhase==='negotiating'&&client&&!state.businessRound?openingQuoteChoicesView(quoteState,client,options,selected):quoteLampSample||`<div class="sample-piece picked single">${sampleSvg(client?.id==='mira'?'lamp':client?.id==='samir'?'cup':'linen',p?.specification==='branded'||contract?.optionId==='branded'||contract?.optionId==='branded-opening')}<span>${esc(client?.product||'合作落地')}</span></div>`}</div>
 ${`<div class="cooperation-seals" aria-label="已完成的客户合作">${[...new Set(paid.map(c=>c.clientId))].map(id=>{const rows=paid.filter(c=>c.clientId===id),introduced=(state.curationHistory||[]).filter(c=>c.status==='paid'&&c.referrerId===id).length+(state.caseGrowthHistory||[]).filter(c=>c.status==='paid'&&c.referrerId===id).length;return `<span title="${esc(rows[0].clientName)}">${esc(rows[0].clientName.split(' · ')[0])}<b>${rows.length} 单${introduced?` · 引荐合作 ${introduced}`:""}${(state.supplyPlanHistory||[]).filter(p=>p.clientId===id).length?` · ${(state.supplyPlanHistory||[]).filter(p=>p.clientId===id).length} 委托`:""} ✓</b></span>`;}).join('')}${(marketLedger?.buyers||[]).map(b=>`<span title="这位买方已结清的订单">${esc(b.name)}<b>${b.count} 单 ✓</b></span>`).join('')}</div>`}
 ${businessMotionView(state,event)}
 ${`<div class="activity ${state.phase==='curating'&&!cq.valid?'quote-over':''}" role="status">${state.phase==='curating'?`<strong>${cq.products.length} 款 × ${curationDraft.quantity} 套 · ${money(cq.revenue)} / ${money(curationBrief.budget)}</strong><span>${esc(cq.valid?'这组搭配，买手的预算够用。':cq.reason)}</span><button id="adjust-curation">调套数 / 包装 ↓</button>`:esc(playerStatusText(state.feedback?.kind==='counter'&&!counterRelevant?'换了这份方案，看看报价和付款安排。':feedbackText||'一位海外客户发来了采购需求。'))}</div>`}</section>`}
 <section class="business ${openingPaid||state.phase==='paid'&&repeatComic?'ws-opening-paid ws-carafe ws-order-detail':openingSigned?'ws-opening-signed ws-carafe ws-order-detail':viewPhase==='negotiating'?'ws-work-quote ws-opening-inquiry'+(standardInquiryRead?' inquiry-read':''):['curating','curation-fulfillment'].includes(state.phase)?'ws-referral-business':accountVisual?'ws-account-business':''}">${viewPhase==='negotiating'?'<button type="button" class="quiet ws-opening-back ws-control ws-control--back" data-workspace-open="inbox">← 收件箱</button>':''}${classicOrderRead?orderReadSummary({...contract,status:contract.status==='fulfilling'?'transit':contract.status,buyer:contract.clientName,unit:openingOrderUnits[contract.clientId]}):standardInquiryRead?inquiryBuyerHeading({avatar:`<span class="client-avatar customer-face" aria-hidden="true" style="--face-x:${['mira','samir','ines'].indexOf(client?.id)*50}%;--face-y:${mood*50}%"></span>`,name:(client?.name??'').split(' · ')[0],organization:(client?.name??'').split(' · ')[1]||client?.country,product:client?.product,status:counterRelevant?'待重新确认':options.find(o=>o.id===selected)?.accepted===false?'待客户确认':'可签约'}):`<div class="client-head${openingName?' opening-customer-head':''}">${contact?`<span class="client-avatar buyer-portrait buyer-mood-${contact.mood}" role="img" aria-label="${esc(contact.name)}" style="--buyer-x:${contact.column*100}%;--buyer-y:${contact.mood*50}%"></span>`:['mira','samir','ines'].includes(client?.id)?`<span class="client-avatar customer-face" aria-hidden="true" style="--face-x:${['mira','samir','ines'].indexOf(client.id)*50}%;--face-y:${mood*50}%"></span>`:`<span class="client-avatar" aria-hidden="true">${esc(client?.name?.slice(0,1)||'✓')}</span>`}<div>${openingName?`<h2 tabindex="-1">${esc(openingName)}</h2><small class="opening-customer-company">${esc(openingCompany||client?.country||'')}</small>${viewPhase==='negotiating'&&client?.product?`<small class="opening-customer-company inquiry-product">${esc(client.product)}</small>`:''}`:`${accountVisual?'':`<div class="deal-contact-meta"><small>${esc(recapVisual?'这段合作的成果':contact?contact.role:state.phase==='case-growth'?'案例客户合作':['development','supplier-development'].includes(state.phase)?'供应商合作':state.phase==='collection'?'系列设计合作':state.phase==='account'?'来自你的已交付案例':curationBrief?'由 '+curationBrief.referrerName.split(' · ')[0]+' 引荐':client?.country||'合作记录')}</small>${contact&&!recapVisual&&state.phase!=='curating'?`<span class="deal-contact-state">${esc(contact.label)}</span>`:''}</div>`}<h2 tabindex="-1">${esc((contact?contact.name:null)||curationBrief?.buyer||(viewPhase==='negotiating'&&client?.name?client.name.replace(' · ','（')+ (client.name.includes(' · ')?'）':''):client?.name)||(['development','supplier-development'].includes(state.phase)?'工作室的下一版产品':viewPhase==='portfolio'?(roundActive&&state.businessSigned>=2?'本轮交付与回款':state.clientProjectActive?(projects.filter(p=>!p.completed).length===1?'最后一份计划，怎么交付？':'还有 '+projects.filter(p=>!p.completed).length+' 份计划，先安排谁？'):'这次，主动选客户'):'合作正在长大'))}</h2>${contact?`<span class="deal-contact-company">${esc(contact.company)}</span>`:''}`}</div>${accountVisual||(openingName&&viewPhase==='negotiating')?'':`<span class="product">${esc(restockBasis?'同版实物补货':tradeRecap?'供货实绩':recapVisual?'作品与合作':state.phase==='collection'?'包装与署名':state.phase==='account'?'连锁采购':state.phase==='stock-procurement'?'客户补缺供货':shopVisual?'门店陈列':curationBrief?'跨品类选品':openingSigned||openingPaid?contract.product+(openingSigned&&contract.clientId==='samir'?(['branded','branded-opening'].includes(contract.optionId)?' · 定制包装':contract.optionId==='ready'?' · 无印字现货':''):''):client?.product||'贸易工作室')}</span>`}</div>`}
 ${openingBuyers.length>1&&workspaceOverride!=='inbox'?openingInboxView(quoteState,openingBuyers,openingInboxOpen):''}
 ${curationReceiptView(state)}
 ${roundCashView(state)}
 ${state.phase==='atelier-restock'?atelierRestockView(state):state.phase==='shop-trial'?shopTrialView(state,shopTerms):state.phase==='stock-procurement'?stockProcurementView(state,stockMode):state.phase==='collection-revision'?revisionView(state,revisionScope):state.phase==='launch-project'?launchView(state):state.phase==='studio-project'?studioProjectView(state,studioAllocation):state.phase==='case-growth'?caseGrowthView(state,growthDraft,{lampModel:growthLampModel,proposalOpen,proposalModel,brightness:proposalBrightness,catalogueMode:seriesMode,catalogueLamp:seriesLamp}):['development','supplier-development'].includes(state.phase)?developmentView(state,factoryChoice,sampleBrightness):home?(showCareerRecap?careerRecapView(state,{route:typeof showCareerRecap==='string'?showCareerRecap:'auto',evidence:tradeEvidence}):businessHomeView(state,{career,referrals,focus:careerFocus,directionsOpen})):state.phase==='collection'?(state.collection.status==='pitch'?collectionPitchView(state,collectionPitchOption):collectionView(state,collectionDraft,{board:collectionBoardView(state,collectionFocus,catalogueFocus,receiptMode)})):state.phase==='account'?accountView(state,accountOption):viewingCase?`<h3>从你的样品桌，到了买手店</h3><p class="brief">${(viewingCase.productNames||viewingCase.products.map(id=>CURATION_PRODUCTS.find(p=>p.id===id).name)).map(esc).join('、')}，每种 ${viewingCase.quantity} 件，${viewingCase.packaging==='gift'?'整组礼盒':'常规包装'}。</p><div class="offer"><div><small>这次净赚</small><strong>${netProfitAmount(viewingCase.netProfit)}</strong></div><div><small>交付</small><strong>第 ${viewingCase.deliveryDay} 天</strong></div></div><button id="close-showcase" class="primary">回到工作室 →</button>`:state.phase==='curating'?curationView(curationBrief,curationDraft,cq,(state.secondSupplier?.status==='active'&&state.secondSupplier.factory==='studio'?state.secondSupplier:state.productDevelopment),demo,state.cash):state.phase==='curation-fulfillment'?`<h3>买手确认了你的整组搭配</h3><p class="brief">${cq.products.length} 种产品，每种 ${cq.quantity} 件，${cq.packaging==='gift'?'组合礼盒':'常规包装'}。第 ${cq.deliveryDay} 天交货，第 ${cq.paymentDay} 天收齐。</p><button class="primary" data-action="FULFIL_CURATION">等到第 ${cq.paymentDay} 天收款 →</button>`:supplyDraft?supplyDraftView(career,supplyDraft,previewSupplyPlan(state,supplyDraft)):state.phase==='planning-fulfillment'?`<h3>让跟单按约执行</h3><p class="brief">${esc(state.supplyPlan.clientName)} · 总计 ${state.supplyPlan.totalQuantity} 件。你已确定供货与收款承诺，两批不再反复签约。</p>${supplyLotsView(state.supplyPlan)}<p class="opportunity">下一节点：第 ${state.supplyPlan.events[state.supplyPlan.eventIndex].day} 天，${{start:'安排第二批生产',delivery:'按约交货',payment:'收齐尾款'}[state.supplyPlan.events[state.supplyPlan.eventIndex].kind]}。</p><button class="primary" data-action="FULFIL_SUPPLY_PLAN">交给跟单，按约执行到收齐 →</button>`:viewPhase==='portfolio'?`${projectDeskView(state,deskPlan)}${state.clientProjectActive?'<button class="back-clients" data-action="PAUSE_CLIENT_PROJECTS">← 先做别的业务，保留专题日期</button>':''}${!state.clientProjectActive&&!roundActive?'<button class="back-clients" data-action="BACK_FROM_CLIENTS">← 回工作室做其他业务</button>':''}<p class="brief">${state.clientProjectActive?'':roundActive?(state.businessSigned>=2?'':'每次先交付一批，尾款可以留在账上；看现有现金能否安排下一单。'):state.retailPlanning?'先看门店余货。需要补货的客户可以谈，刚铺货的门店先卖现有产品。':'老客户带着新需求回来了。继续深做一位，或换另一位，都由你决定。'}</p><div class="opportunities">${(state.clientProjectActive||(roundActive&&state.businessSigned>=2)?[]:opportunities).map(c=>`<button data-client="${c.id}" class="customer-opportunity" ${c.available?'':'disabled'}><span class="mini-face" style="--face-x:${['mira','samir','ines'].indexOf(c.id)*50}%"></span><span><strong>${esc(c.name)}</strong><small>${esc(c.product)}${state.clientProjectActive?` · ${esc(c.title)}`:` · 上单 ${c.basis.quantity} 件`}</small>${state.clientProjectActive?`<b class="project-date">第 ${c.deadline} 天前交货</b><small>${c.available?`最快第 ${Math.min(...c.options.map(o=>o.deliveryDay))} 天交货 · ${c.options.some(o=>o.projectOnTime)?'还赶得上专题':'只能常规补货'}`:esc(c.reason)}</small>`:''}${c.available?`<p>${esc(c.consequence)}</p>`:''}${demandView(c.demand)}${!c.available&&!state.clientProjectActive&&(!c.demand||(roundActive&&c.demand.ready))?`<small>${esc(c.reason)}</small>`:''}</span></button>`).join('')}</div>${buyerWaitView(state)}`:viewPhase==='negotiating'?`${state.businessRound&&!familiarDraftState?`<button class="back-clients" data-action="BACK_TO_CLIENTS">← 先看看其他客户</button>`:''}${!state.businessRound?openingBuyerLineView(client,quoteState)+'<details class="inquiry-details opening-quote-context"><summary>客户要求</summary>':`${repeatComic}<p class="brief">${esc(quoteBuyerBrief(quoteState,client,selected))}</p>`}<ul class="requirements">${(['developed-lamp','second-developed-lamp'].includes(selected)?['按验过的新样制作',(selected==='second-developed-lamp'?state.secondSupplier:state.productDevelopment).factory==='studio'?'这单 60 盏，交货付款':'180 盏起订，三成定金，交货后七天付清']:client.requirements).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${!state.businessRound?'</details>':''}${!state.businessRound?quoteOpeningSelection(quoteState,client,p,options,selected):`<div class="quotes" role="group" aria-label="报价方案">${options.map(o=>`<button class="quote ${o.id===selected?'chosen':''}" data-select="${esc(o.id)}" aria-pressed="${o.id===selected}"><strong>${esc(o.title)}</strong><span>${esc(quoteOptionExplanation(state,o))}</span></button>`).join('')}</div>`}

 ${p?`${quoteCommitmentView(state,p,{roundActive,client,opening:!state.businessRound,openingDesk:openingBuyers.length>0,quantityLabel:client.id==='samir'?p.quantity+' 只':client.id==='mira'?p.quantity+' 盏':client.id==='ines'?p.quantity+' 条':null,counterMessage:counterRelevant?state.feedback.message:''})}`:''}`:
 openingSigned?`${repeatMilestone?repeatComic:openingComic||(contract.clientId==='samir'?openingInspectionView(state):'')}
 <p>${state.day>openingMilestone.day?'约定日期已过，请处理这笔订单。':state.day<openingMilestone.day?'尚未到约定日期。':''}</p>${state.day<openingMilestone.day?'':`<button type="button" class="primary ws-control ws-control--main" data-opening-milestone>${openingMilestone.sameDay?'确认交货并收款':openingMilestone.delivery?'确认交货':'收取'+openingBalanceLabel} <span aria-hidden="true">→</span></button>`}`:
 state.phase==='fulfilling'&&roundActive?roundProductionView(state):state.phase==='fulfilling'?`<h3>谈成了，现在交给跟单</h3><p>${esc(contract.clientName)}：${contract.quantity} ${({mira:"盏",samir:"只",ines:"条"})[contract.clientId]||"件"}</p><div class="fulfil-track"><span class="done">合同确认</span><span class="moving">安排交付</span><span>第 ${contract.paymentDay} 天回款</span></div><p class="brief">预计净赚 ${netProfitAmount(contract.netProfit)}。到约定日期后，在这里办交货和收款。</p><button class="primary" data-action="ADVANCE">等到第 ${contract.paymentDay} 天收款 <span>→</span></button>`:
 state.phase==='paid'?`${openingPaid?`${openingComic}${orderReadReceipt(contract.received??contract.revenue,contract.netProfit)}${deliveryNote?`<p class="ws-opening-paid-delivery">${esc(deliveryNote)}</p>`:''}`:`${repeatComic?orderReadReceipt(contract.received??contract.revenue,contract.netProfit):`<div class="receipt"><small>货款已收齐</small><strong class="ws-net-result">${netProfitAmount(contract.netProfit)}</strong><span>这单净赚 · ${esc(contract.clientName)}</span></div>`}${repeatComic||workProductComicView(contract)}`}<button class="primary" data-action="NEXT_CLIENT">${state.businessRound?'安排下一笔合作':paid.length===3?'回工作室，看看新机会':'看看下一位客户'} <span aria-hidden="true">→</span></button>${openingPaid&&!openingComic?workProductComicView(contract):''}`:
 `${state.feedback?.kind==='supply-complete'?`<h3>整份供货安排，已按约完成</h3>${supplyLotsView(state.supplyPlan)}<p class="brief">${esc(state.supplyPlan.clientName)}的两批货已交齐。这次净赚 ${netProfitAmount(state.supplyPlan.netProfit)}，日常支出 ${money(state.supplyPlan.operatingCostPaid)}。你确定的付款条件和数量，已经变成实际交付。</p>`:''}<p class="brief">${state.feedback?.kind==='curation-paid'?`买手收到的是你选的 ${state.curation.products.length} 种产品、${state.curation.quantity} 套组合。新的采购合作从这份案例开始。`:state.feedback?.kind==='projects-complete'?`三份计划已交付，${projects.filter(p=>p.onTime).length} 份赶上专题。时间花在哪里，留下的客户案例就不同。`:state.phase==='review'?'这一轮由你选的合作已经收齐。下一轮可以深做原来的客户，也可以换个方向。':'三位客户都实际合作过了。现在不用按名单轮流接单，试着把合作做深。'}</p><div class="receipt"><small>累计净赚</small><strong class="ws-net-result">${netProfitAmount((marketLedger?.net||0)+paid.reduce((n,c)=>n+c.netProfit,0)+(state.supplyPlanHistory||[]).reduce((n,p)=>n+p.netProfit,0)+(state.curationHistory||[]).reduce((n,p)=>n+p.netProfit,0)+(state.accountHistory||[]).reduce((n,p)=>n+p.netProfit,0)+(state.collection?.orders||[]).reduce((n,p)=>n+p.netProfit,0)-(state.collection?.sampleCost||0))}</strong><span>${paid.length+(marketLedger?.receipts.length||0)} 笔订单 · ${(state.supplyPlanHistory||[]).length} 份供货安排 · ${(state.curationHistory||[]).length} 份选品委托${state.accountHistory?.length?' · 1 份连锁采购':''}已收齐 · 第 ${state.day} 天</span></div><button class="primary" data-action="CONTINUE_BUSINESS">${state.phase==='review'?'继续经营':'选择下一笔合作'} <span>→</span></button>`}
 ${!home&&!viewingCase&&!supplyDraft&&['review','complete'].includes(state.phase)&&state.curationHistory?.length?`<aside class="supply-invite"><h3>${state.collection?(state.collection.model==='own'?'工作室自己的系列':'Northline 专用系列'):'客户想把你的组合，做成自己的系列'}</h3><button class="primary" data-action="${state.collection?'OPEN_COLLECTION':'START_COLLECTION'}">${state.collection?'查看系列与买手合作':'看看贴牌合作，或自己出样'} →</button></aside>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&['review','complete'].includes(state.phase)&&state.accountHistory?.length?`<details class="case-gallery"><summary>连锁供货案例 · ${accountCoverage(state)} 家店</summary>${state.accountHistory.map(accountReceipt).join('')}<p>这次净赚 ${netProfitAmount(state.account.netProfit)}</p></details>`:''}
 ${!home&&!supplyDraft&&['review','complete'].includes(state.phase)&&state.curationHistory?.length&&!state.accountHistory?.length?`<aside class="supply-invite"><h3>把买手店案例，递给连锁采购</h3><div class="referral-choices">${(viewingCase?[viewingCase]:state.curationHistory).map(c=>`<button data-account-case="${c.referrerId}"><strong>递出这组 ${c.products.length} 款案例</strong><small>${c.products.map(id=>CURATION_PRODUCTS.find(p=>p.id===id).name).join(' · ')}</small></button>`).join('')}</div></aside>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&['review','complete'].includes(state.phase)&&state.curationHistory?.length?`<details class="case-gallery"><summary>我的买手案例 · ${state.curationHistory.length} 份</summary>${state.curationHistory.map(c=>`<button data-showcase="${c.referrerId}"><strong>${esc(c.buyer)}</strong><small>${c.products.length} 款 · ${c.quantity} 套 · ${c.packaging==='gift'?'礼盒':'常规包装'}</small></button>`).join('')}</details>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&['complete','review'].includes(state.phase)&&referrals.length?`<aside class="supply-invite"><h3>让做过的案例带来新客户</h3><div class="referral-choices">${referrals.map(r=>`<button data-referrer="${r.id}"><strong>${esc(r.referrerName.split(' · ')[0])} 的引荐</strong><small>${r.onTime?'专题选品':'门店补货'} · 从${esc(r.product)}搭起</small></button>`).join('')}</div></aside>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&!state.clientProjectSeason&&state.supplyPlanHistory?.length&&['complete','review'].includes(state.phase)?`<aside class="supply-invite"><h3>熟客的新计划</h3><p>灯光橱窗、城市快闪、餐桌专题。三份用途各有日期，决定先接谁，让你的产品真正亮相。</p><button class="primary" data-action="START_CLIENT_PROJECTS">打开三份客户计划 →</button></aside>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&!roundActive&&career.eligible&&['complete','portfolio','review'].includes(state.phase)?`<aside class="supply-invite"><h3>${state.careerMilestone?'继续接整份供货委托':'客户愿意把下一轮供货交给你'}</h3><p>${esc(career.reason)}不必一批批重复接单，先谈好两批的数量与付款承诺。</p><button class="primary" id="open-supply">看看供货安排 →</button></aside>`:''}
 </section><footer><button id="motion" aria-pressed="${document.documentElement.classList.contains('reduce-motion')}">${document.documentElement.classList.contains('reduce-motion')?'开启动效':'关闭动效'}</button></footer>${dealSaveView(savePanel,saveNotice)}`;
 bindSaveTools();

 if(home&&officeAvailable(state)&&!showCareerRecap){
  const place=root.querySelector('.business');
  if(!root.querySelector('#open-office-improvement'))place?.insertAdjacentHTML('beforeend',`<p class="office-entry"><button id="open-office-improvement">${state.officeImprovement?'看看自己的窗边工作室':'给工作室换个布置 · 可选'}</button></p>`);
  if(state.officeImprovement){if(!root.querySelector('#open-office-annex'))place?.insertAdjacentHTML('beforeend',`<p class="office-entry"><button id="open-office-annex">${state.officeAnnex?'去样品会客室':'想要一间样品会客室 · 先参观'}</button></p>`);root.querySelector('#open-office-annex')?.addEventListener('click',()=>{annexOpen=true;annexUI={};render();root.querySelector('[data-annex-close]')?.focus();});}
  root.querySelector('#open-office-improvement')?.addEventListener('click',()=>{officeOpen=true;officeUI={};render();root.querySelector('[data-office-close]')?.focus();});
 }
 if(home&&lifeAvailable(state)&&!showCareerRecap){
  const place=root.querySelector('.business');
  if(!root.querySelector('#open-personal-life'))place?.insertAdjacentHTML('beforeend','<p class="personal-life-entry"><button id="open-personal-life">下班回家</button></p>');
  root.querySelector('#open-personal-life')?.addEventListener('click',()=>{personalRoomOpen=true;personalRoomUI={};render();root.querySelector('[data-life-close]')?.focus();});
 }
 if(playback){
  const f=playback.frames[playback.index],plan=state.supplyPlan;
  [...root.children].forEach(el=>el.inert=true);
  root.insertAdjacentHTML('beforeend',`<section class="team-playback" role="dialog" aria-modal="true" aria-label="跟单执行回放"><div class="team-playback-card"><small>第 ${f.day} 天 · ${playback.index+1} / ${playback.frames.length}</small><div class="team-stage step-${esc(f.kind)}"><span class="team-person">跟单</span><div class="team-product">${sampleSvg(plan.clientId==='mira'?'lamp':plan.clientId==='samir'?'cup':'linen')}</div><span class="team-client mini-face" style="--face-x:${['mira','samir','ines'].indexOf(plan.clientId)*50}%"></span></div><h2>${esc(f.title)}</h2><p>${esc(f.detail)}</p><button id="skip-playback">直接看收款结果 →</button></div></section>`);
  const skip=root.querySelector('#skip-playback');skip.onclick=finishPlayback;skip.onkeydown=e=>{if(e.key==='Escape')finishPlayback();};skip.focus({preventScroll:true});
 }

 root.querySelector('#finish-session')?.addEventListener('click',()=>openRecap(true));
 root.querySelector('#finish-trading')?.addEventListener('click',()=>openRecap('trade'));
 root.querySelectorAll('[data-trade-evidence]').forEach(b=>b.onclick=()=>{const key=b.dataset.tradeEvidence;if(!tradeRecap||!['chain','model'].includes(key))return;tradeEvidence=key;render();root.querySelector(`[data-trade-evidence="${key}"]`)?.focus({preventScroll:true});});
 root.querySelector('#resume-work')?.addEventListener('click',()=>{const target=tradeRecapReturnTab?(showCareerRecap==='cooperation'?'[data-growth-cooperation-recap]':'[data-growth-trade-recap]'):showCareerRecap==='trade'?'#finish-trading':'#finish-session';if(tradeRecapReturnTab){workspaceOverride=tradeRecapReturnTab;tradeRecapReturnTab=null;}showCareerRecap=false;tradeEvidence='chain';render();root.querySelector(target)?.focus();});
 root.querySelectorAll('[data-wait-buyer],[data-pause-buyer]').forEach(b=>b.onclick=()=>{const buyer=b.dataset.waitBuyer||b.dataset.pauseBuyer;state=reduceDealRoom(state,{type:b.dataset.pauseBuyer?'PAUSE_FOR_BUYER':'WAIT_FOR_BUYER',clientId:buyer});event='arriving';save();render();const target=root.querySelector(`[data-client="${buyer}"]`);target?.focus();target?.scrollIntoView({block:'nearest'});});
 root.querySelectorAll('[data-factory]').forEach(b=>b.onclick=()=>{factoryChoice=b.dataset.factory;event='choosing';renderKeepingChoiceFocus(b,'data-factory');});
 root.querySelectorAll('[data-light]').forEach(b=>b.onclick=()=>{sampleBrightness=Number(b.dataset.light);event='';render();root.querySelector(`[data-light="${sampleBrightness}"]`)?.focus({preventScroll:true});});
 root.querySelectorAll('[data-catalogue-version]').forEach(b=>b.onclick=()=>{catalogueFocus=b.dataset.catalogueVersion;render();root.querySelector('.design-catalogue')?.setAttribute('open','');});
 root.querySelectorAll('[data-receipt-mode]').forEach(b=>b.onclick=()=>{receiptMode=b.dataset.receiptMode;event='sample-change';render();root.querySelector(`[data-receipt-mode="${receiptMode}"]`)?.focus({preventScroll:true});});
 root.querySelectorAll('[data-view-buyer]').forEach(b=>b.onclick=()=>{collectionFocus=b.dataset.viewBuyer;event='';render();const panel=root.querySelector('.buyer-case');if(panel){panel.setAttribute('tabindex','-1');panel.focus({preventScroll:true});panel.scrollIntoView({block:'nearest'});}});
 root.querySelector('[data-close-buyer]')?.addEventListener('click',()=>{const old=collectionFocus;collectionFocus='';render();root.querySelector(`[data-view-buyer="${old}"]`)?.focus();});
 root.querySelectorAll('[data-collection-source]').forEach(b=>b.onclick=()=>{collectionDraft.sourceId=b.dataset.collectionSource;event='sample-change';renderKeepingChoiceFocus(b,'data-collection-source');});
 root.querySelectorAll('[data-collection-model]').forEach(b=>b.onclick=()=>{collectionDraft.model=b.dataset.collectionModel;if(collectionDraft.model==='private'&&collectionDraft.style==='botanical')collectionDraft.style='cream';event='sample-change';renderKeepingChoiceFocus(b,'data-collection-model');});
 root.querySelectorAll('[data-collection-style]').forEach(b=>b.onclick=()=>{collectionDraft.style=b.dataset.collectionStyle;event='sample-change';renderKeepingChoiceFocus(b,'data-collection-style');});
 root.querySelectorAll('[data-collection-buyer]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'OPEN_COLLECTION_PITCH',buyerId:b.dataset.collectionBuyer});collectionPitchOption=previewCollectionPitch(state,'exclusive')?.valid?'exclusive':'retain';save();event='replying';render();root.querySelector('.business h2')?.focus({preventScroll:true});root.querySelector('.business h2')?.scrollIntoView({block:'nearest'});});
 root.querySelectorAll('[data-pitch-option]').forEach(b=>b.onclick=()=>{collectionPitchOption=b.dataset.pitchOption;event='sample-change';renderKeepingChoiceFocus(b,'data-pitch-option');});
 root.querySelectorAll('[data-account-case]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'START_ACCOUNT',referrerId:b.dataset.accountCase});showcaseId=null;accountOption='pilot';event='arriving';save();render();});
 root.querySelectorAll('[data-account-expansion-basis]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'SET_ACCOUNT_EXPANSION_BASIS',basisId:b.dataset.accountExpansionBasis});event='sample-change';save();render();root.querySelector(`[data-account-expansion-basis="${b.dataset.accountExpansionBasis}"]`)?.focus({preventScroll:true});});
 root.querySelectorAll('[data-account-option]').forEach(b=>b.onclick=()=>{accountOption=b.dataset.accountOption;event='choosing';renderKeepingChoiceFocus(b,'data-account-option');});
 root.querySelectorAll('[data-showcase]').forEach(b=>b.onclick=()=>{showcaseId=b.dataset.showcase;event='shop-received';render();root.querySelector('.workspace')?.scrollIntoView({block:'start'});});
 root.querySelector('#close-showcase')?.addEventListener('click',()=>{showcaseId=null;event='';render();});
 root.querySelectorAll('[data-launch-lead],[data-launch-arrangement]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'SET_LAUNCH',field:b.dataset.launchLead?'lead':'arrangement',value:b.dataset.launchLead||b.dataset.launchArrangement});event='sample-change';save();render();root.querySelector('.launch-scene')?.scrollIntoView({block:'nearest'});});
 root.querySelectorAll('[data-career-focus]').forEach(b=>b.onclick=()=>{directionsOpen=true;careerFocus=b.dataset.careerFocus;try{localStorage.setItem(SAVE_KEY+':focus',careerFocus);}catch{}event='sample-change';render();root.querySelector('.career-focus h3')?.scrollIntoView({block:'nearest'});});
 root.querySelectorAll('[data-studio-direction]').forEach(b=>b.onclick=()=>{state=openStudioFromDesk(state,b.dataset.studioDirection,true);save();event='arriving';render();root.querySelector('.business h2')?.scrollIntoView({block:'nearest'});});
 root.querySelectorAll('[data-studio-allocation]').forEach(b=>b.onclick=()=>{studioAllocation=b.dataset.studioAllocation;event='sample-change';render();root.querySelector(`[data-studio-allocation="${studioAllocation}"]`)?.focus({preventScroll:true});});
 root.querySelectorAll('[data-studio-field]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'SET_STUDIO_PROJECT',field:b.dataset.studioField,value:b.dataset.studioValue});save();event='sample-change';render();});
 root.querySelectorAll('[data-career-action]').forEach(b=>b.onclick=()=>{directionsOpen=false;let action={type:b.dataset.careerAction};if(b.dataset.careerDirection)action.direction=b.dataset.careerDirection;if(b.dataset.careerReferrer)action.referrerId=b.dataset.careerReferrer;if(b.dataset.careerClient)action.clientId=b.dataset.careerClient;if(action.type==='OPEN_STUDIO_PROJECT')state=openStudioFromDesk(state,action.direction);else if(action.type==='OPEN_PRODUCT_REORDER'){const opened=openProductReorder(state,b.dataset.careerFactory);state=opened.state;selected=opened.selected;}else state=reduceDealRoom(state,action);resetCaseQuote();accountOption='pilot';showcaseId=null;event='arriving';save();render();root.querySelector('.business h2')?.scrollIntoView({block:'nearest'});});
 root.querySelectorAll('[data-growth-case]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'OPEN_CASE_GROWTH',referrerId:b.dataset.growthCase});resetCaseQuote();event='arriving';save();render();});
 root.querySelector('#close-catalogue-proposal')?.addEventListener('click',()=>{proposalOpen=false;render();restoreReturnFocus('#toggle-catalogue-proposal');});
 root.querySelector('#toggle-catalogue-proposal')?.addEventListener('click',()=>{proposalOpen=!proposalOpen;render();root.querySelector('#toggle-catalogue-proposal')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-proposal-model]').forEach(b=>b.onclick=()=>{proposalModel=b.dataset.proposalModel;event='sample-change';renderKeepingChoiceFocus(b,'data-proposal-model');});
 root.querySelectorAll('[data-proposal-light]').forEach(b=>b.onclick=()=>{proposalBrightness=Number(b.dataset.proposalLight);event='';renderKeepingChoiceFocus(b,'data-proposal-light');});
 root.querySelectorAll('[data-growth-model]').forEach(b=>b.onclick=()=>{growthLampModel=b.dataset.growthModel;event='sample-change';renderKeepingChoiceFocus(b,'data-growth-model');});
 root.querySelector('#open-series-proposal')?.addEventListener('click',()=>{seriesMode=true;seriesLamp=state.collection?.lampVersion||'standard';event='sample-change';render();});
 root.querySelector('#close-series-proposal')?.addEventListener('click',()=>{seriesMode=false;event='';render();restoreReturnFocus('#open-series-proposal');});
 root.querySelectorAll('[data-series-lamp]').forEach(b=>b.onclick=()=>{seriesLamp=b.dataset.seriesLamp;event='sample-change';renderKeepingChoiceFocus(b,'data-series-lamp');});
 root.querySelector('#wait-series-stock')?.addEventListener('click',()=>{const products=catalogueVersions(state).find(v=>v.id==='original')?.products||[];state=reduceDealRoom(state,{type:'WAIT_CASE_GROWTH',products});save();render();});
 root.querySelectorAll('[data-growth-route]').forEach(b=>b.onclick=()=>{const basis=state.curationHistory.find(c=>c.referrerId===state.caseGrowth.referrerId);growthDraft={agreement:b.dataset.growthRoute,products:[...basis.products],packaging:b.dataset.growthRoute==='private'?basis.packaging:'plain',terms:'delivery'};event='sample-change';renderKeepingChoiceFocus(b,'data-growth-route');});
 root.querySelectorAll('[data-growth-calloff]').forEach(b=>b.onclick=()=>{const basis=state.curationHistory.find(c=>c.referrerId===state.caseGrowth.referrerId);growthDraft.products=b.dataset.growthCalloff==='all'?[...basis.products]:[b.dataset.growthCalloff];event='sample-change';renderKeepingChoiceFocus(b,'data-growth-calloff');});
 root.querySelectorAll('[data-growth-product]').forEach(b=>b.onclick=()=>{const id=b.dataset.growthProduct;growthDraft.products=growthDraft.products.includes(id)?growthDraft.products.filter(p=>p!==id):[...growthDraft.products,id];event='sample-change';renderKeepingChoiceFocus(b,'data-growth-product');});
 root.querySelectorAll('[data-growth-pack]').forEach(b=>b.onclick=()=>{growthDraft.packaging=b.dataset.growthPack;event='sample-change';renderKeepingChoiceFocus(b,'data-growth-pack');});
 root.querySelectorAll('[data-growth-terms]').forEach(b=>b.onclick=()=>{growthDraft.terms=b.dataset.growthTerms;event='choosing';renderKeepingChoiceFocus(b,'data-growth-terms');});
 root.querySelectorAll('[data-opening-referrer]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'START_OPENING_CURATION',clientId:b.dataset.openingReferrer});curationDraft=null;buyerDemo={open:false,room:'day',brightness:1};event='arriving';save();render();root.querySelector('.workspace')?.scrollIntoView({block:'start'});});
 root.querySelectorAll('[data-referrer]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'START_CURATION',clientId:b.dataset.referrer});curationDraft=null;buyerDemo={open:false,room:'day',brightness:1};event='arriving';save();render();root.querySelector('.workspace')?.scrollIntoView({block:'start'});});
 root.querySelector('#adjust-curation')?.addEventListener('click',()=>root.querySelector('.curation-controls')?.scrollIntoView({block:'start'}));
 root.querySelectorAll('[data-curation-product]').forEach(b=>b.onclick=()=>{if(state.phase!=='curating'||b.disabled)return;const id=b.dataset.curationProduct;curationDraft=toggleCurationProduct(curationDraft,id,state.curation.anchor);event='sample-change';renderKeepingChoiceFocus(b,'data-curation-product');});
 root.querySelector('#toggle-buyer-demo')?.addEventListener('click',()=>{buyerDemo.open=!buyerDemo.open;event='';render();root.querySelector('#toggle-buyer-demo')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-demo-room]').forEach(b=>b.onclick=()=>{buyerDemo.room=b.dataset.demoRoom;event='';render();root.querySelector(`[data-demo-room="${buyerDemo.room}"]`)?.focus({preventScroll:true});});
 root.querySelectorAll('[data-demo-light]').forEach(b=>b.onclick=()=>{buyerDemo.brightness=Number(b.dataset.demoLight);event='';render();root.querySelector(`[data-demo-light="${buyerDemo.brightness}"]`)?.focus({preventScroll:true});});
 root.querySelectorAll('[data-lamp-version]').forEach(b=>b.onclick=()=>{curationDraft.lampVersion=b.dataset.lampVersion;event='sample-change';renderKeepingChoiceFocus(b,'data-lamp-version');});
 root.querySelectorAll('[data-curation-quantity]').forEach(b=>b.onclick=()=>{curationDraft.quantity=Number(b.dataset.curationQuantity);event='choosing';renderKeepingChoiceFocus(b,'data-curation-quantity');});
 root.querySelectorAll('[data-curation-pack]').forEach(b=>b.onclick=()=>{curationDraft.packaging=b.dataset.curationPack;event='sample-change';renderKeepingChoiceFocus(b,'data-curation-pack');});
 root.querySelector('#open-supply')?.addEventListener('click',()=>{supplyDraft={clientId:career.clients[0].id,firstBatch:'small',payment:'delivery'};render();});
 root.querySelector('#close-supply')?.addEventListener('click',()=>{supplyDraft=null;render();restoreReturnFocus('#open-supply');});
 root.querySelector('#supply-client')?.addEventListener('change',e=>{supplyDraft.clientId=e.target.value;render();});
 root.querySelectorAll('[data-plan-first]').forEach(b=>b.onclick=()=>{supplyDraft.firstBatch=b.dataset.planFirst;renderKeepingChoiceFocus(b,'data-plan-first');});
 root.querySelectorAll('[data-plan-payment]').forEach(b=>b.onclick=()=>{supplyDraft.payment=b.dataset.planPayment;renderKeepingChoiceFocus(b,'data-plan-payment');});
 root.querySelectorAll('[data-desk-client]').forEach(b=>b.onclick=()=>{deskPlan={clientId:b.dataset.deskClient,optionId:b.dataset.deskOption};render();root.querySelector(`[data-desk-client="${deskPlan.clientId}"][data-desk-option="${deskPlan.optionId}"]`)?.focus({preventScroll:true});});
 root.querySelector('#use-desk-plan')?.addEventListener('click',()=>{if(!projectDeskPreview(state,deskPlan.clientId,deskPlan.optionId))return;state=reduceDealRoom(state,{type:'SELECT_CLIENT',clientId:deskPlan.clientId});workspaceOverride=null;selected=deskPlan.optionId;event='arriving';save();render();});
 root.querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>{const next=reduceDealRoom(state,{type:'SELECT_CLIENT',clientId:b.dataset.client});if(next===state)return;state=next;workspaceOverride=null;selected='';event='arriving';save();render();});
 root.querySelector('#opening-inbox-toggle')?.addEventListener('click',()=>{openingInboxOpen=!openingInboxOpen;render();root.querySelector('#opening-inbox-toggle')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-first-buyer]').forEach(b=>b.onclick=()=>{viewedFirstBuyer=b.dataset.firstBuyer;selected='';openingInboxOpen=false;event='choosing';render();rememberOpeningDraft();focusCustomerRoute();});
 root.querySelectorAll('[data-sample]').forEach(b=>b.onclick=()=>{selected=sampleSelection(b.dataset.sample,selected==='branded'?'restock':'opening',options.some(o=>o.id==='branded-opening'));event='sample-change';rememberOpeningDraft();renderKeepingChoiceFocus(b,'data-sample');});
 root.querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{const sample=b.dataset.repair==='plain'?'plain':'custom';selected=sample==='plain'?sampleSelection('plain'):sampleSelection('custom','restock');event='sample-change';rememberOpeningDraft();render();root.querySelector(`[data-sample="${sample}"]`)?.focus({preventScroll:true});});
 root.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=b.dataset.select;event='choosing';rememberOpeningDraft();renderKeepingChoiceFocus(b,'data-select');});
 root.querySelectorAll('[data-revision-open]').forEach(b=>b.onclick=()=>{revisionOpen=!revisionOpen;renderKeepingChoiceFocus(b,'data-revision-open');});
 root.querySelectorAll('[data-revision-scope]').forEach(b=>b.onclick=()=>{revisionScope=b.dataset.revisionScope;renderKeepingChoiceFocus(b,'data-revision-scope');});
 root.querySelectorAll('[data-revision-sign]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'SIGN_COLLECTION_REVISION',buyerId:b.dataset.buyer,scope:b.dataset.scope});save();render();});
 root.querySelector('[data-shop-shelf-toggle]')?.addEventListener('click',e=>{shopTerms=e.currentTarget.dataset.shopShelfToggle;event='';render();root.querySelector('[data-shop-shelf-toggle]')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-shop-terms]').forEach(b=>b.addEventListener('click',()=>{shopTerms=b.dataset.shopTerms;render();root.querySelector('[data-shop-terms="'+shopTerms+'"]')?.focus();}));
 root.querySelectorAll('[data-stock-mode]').forEach(b=>b.onclick=()=>{stockMode=b.dataset.stockMode;renderKeepingChoiceFocus(b,'data-stock-mode');});
 root.querySelector('[data-opening-milestone]')?.addEventListener('click',()=>{
  const repeatDue=repeatContractMilestone(state),due=openingContractMilestone(state)||repeatDue;if(!due)return;
  const type=repeatDue?(due.delivery?'DELIVER_REPEAT_ORDER_V1':'COLLECT_REPEAT_ORDER_V1'):(due.delivery?'DELIVER_OPENING_ORDER_V1':'COLLECT_OPENING_ORDER_V1');
  if(directAction({type,clientId:due.clientId,checkedDay:state.day}))root.querySelector('.business h2')?.focus?.({preventScroll:true});
 });
 const milestone=coreCalendarMilestone(state);
 const hasNightLink=()=>Boolean(root.querySelector('[data-workspace-open="afterwork"]'))||tabsNow()==='orders'&&canEndOrderDay(state);
 // Reuse the actual contract action, not an alternate clock. Before the due
 // date the same position tells the player which night to progress to.
 for(const button of root.querySelectorAll('[data-action]')){
  let type=button.dataset.action;
  if(type==='FULFIL_SUPPLY_PLAN'){type='ADVANCE_SUPPLY_PLAN';button.dataset.action=type;}
  if(removedLiveWaits.has(type)){
   const note=document.createElement('p');note.className='brief';note.textContent='可在「下班」结束今天，到约定日期后再办。';button.replaceWith(note);continue;
  }
  if(!coreCalendarActions.has(type))continue;
  if(milestone?.type!==type){button.remove();continue;}
  if(state.day<milestone.day){
   const note=document.createElement('p');note.className='brief';note.textContent='第 '+milestone.day+' 天可以'+milestone.label+'。';
   const leave=document.createElement('button');leave.type='button';leave.dataset.workspaceOpen='afterwork';leave.textContent='去下班';if(hasNightLink())button.replaceWith(note);else button.replaceWith(note,leave);
  }else button.textContent=milestone.label;
 }
 if(milestone?.type==='RECEIVE_OWN_COLLECTION_V1'&&!root.querySelector('[data-action="RECEIVE_OWN_COLLECTION_V1"]')){
  const target=root.querySelector('.business');
  if(target)target.insertAdjacentHTML('beforeend',state.day>=milestone.day?'<button class="primary" type="button" data-action="RECEIVE_OWN_COLLECTION_V1">'+milestone.label+'</button>':'<p class="brief">第 '+milestone.day+' 天到样。</p>'+(hasNightLink()?'':'<button type="button" data-workspace-open="afterwork">去下班</button>'));
 }
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const previousState=state;let type=b.dataset.action;if(type==='OPEN_STOCK_PROCUREMENT'&&state.phase==='studio-project')state=reduceDealRoom(state,{type:'KEEP_STUDIO_PROJECT'});if(type==='SIGN_CASE_GROWTH'&&growthDraft.products.length===1)type=growthLampModel==='developed'&&growthDraft.products[0]==='mira'&&growthDraft.agreement==='private'?'SIGN_APPROVED_CASE_LAMP':'SIGN_CASE_CALLOFF';if(type==='WAIT_CASE_GROWTH'&&growthDraft.products.length===1)type='WAIT_CASE_CALLOFF';state=reduceDealRoom(state,['SIGN_STUDIO_ALLOCATION','WAIT_STUDIO_ALLOCATION'].includes(type)?{type,allocation:studioAllocation}:type==='RESTORE_GROUP_SPEC'?{type,briefId:b.dataset.briefId}:type==='SIGN_FIRST_CATALOGUE_ORDER'?{type,referrerId:state.caseGrowth.referrerId,lampVersion:seriesLamp}:type==='SIGN_CATALOGUE_ORDER'?{type,lampVersion:seriesLamp}:type==='APPROVE_CASE_LAMP'?{type,model:proposalModel}:type==='SIGN_APPROVED_CASE_LAMP'?{type,terms:growthDraft.terms}:['WAIT_CASE_GROWTH','WAIT_CASE_CALLOFF'].includes(type)?{type,products:growthDraft.products}:['SIGN_CASE_GROWTH','SIGN_CASE_CALLOFF'].includes(type)?{type,...growthDraft}:type==='COMMISSION_SAMPLE'?{type,factory:factoryChoice}:type==='SIGN_COLLECTION_PITCH'?{type,optionId:collectionPitchOption}:type==='SIGN_COLLECTION'?(seedPreview?{type:'SIGN_OWN_COLLECTION_FROM_CASE',referrerId:seedPreview.referrerId,style:collectionDraft.style}:{type,model:collectionDraft.model,style:collectionDraft.style}):type==='SIGN_ACCOUNT'?{type,optionId:accountOption}:type==='PROPOSE'?(openingDraftState?{type:'SIGN_OPENING_QUOTE_V2',clientId:client.id,optionId:selected}:repeatDraft?{type:'SIGN_FAMILIAR_QUOTE_V3',clientId:client.id,optionId:selected}:familiarDraftState&&client?.id==='mira'&&['developed-lamp','second-developed-lamp'].includes(selected)?{type:'SIGN_FAMILIAR_SAMPLE_V1',clientId:client.id,optionId:selected}:{type,optionId:selected}):type==='SIGN_SHOP_TRIAL'?{type,terms:shopTerms}:type==='SIGN_STOCK_PROCUREMENT'?{type,factoryMode:stockMode}:type==='START_SUPPLY_PLAN'?{type,...supplyDraft}:type==='SIGN_CURATION'?(curationDraft.lampVersion==='developed'?{type:'SIGN_CURATION_SAMPLE_V2',products:curationDraft.products,quantity:curationDraft.quantity,packaging:curationDraft.packaging,lampVersion:'developed'}:{type:'SIGN_CURATION_V2',products:curationDraft.products,quantity:curationDraft.quantity,packaging:curationDraft.packaging}):{type});if(type==='CLOSE_ACCOUNT'&&state!==previousState){save();workspaceNavigate('office');return;}if(state!==previousState&&state.phase==='review'&&workspaceOverride==='orders'){workspaceOverride=null;workspaceOrderDetail=false;workspaceOpeningOrder=null;}if(state!==previousState&&['SIGN_SHOP_TRIAL','SETTLE_SHOP_TRIAL'].includes(type))shopSceneMoment=type==='SIGN_SHOP_TRIAL'?'send':'settle';if(type==='PROPOSE'&&state!==previousState){clearOpeningDraft();openingInboxOpen=false;viewedFamiliarBuyer=null;if(state.feedback?.kind==='counter'&&workspaceOverride==='inbox'&&openFirstBuyers(state).length){viewedFirstBuyer=client?.id??null;}else{viewedFirstBuyer=null;}if(state.feedback?.kind==='accepted'&&state.phase==='fulfilling'){workspaceOverride='orders';workspaceOrderDetail=true;workspaceOpeningOrder=client?.id??null;}}if(type==='NEXT_CLIENT'&&state!==previousState){if(state.phase==='portfolio'){workspaceOverride=null;workspaceOrderDetail=false;workspaceOpeningOrder=null;}if(openFirstBuyers(state).length){const officeEntry=root.dataset?.workspaceEntry==='office';workspaceOverride=officeEntry?'inbox':null;viewedFirstBuyer=officeEntry?currentClient(state)?.id||null:null;}else if(!previousState.businessRound&&!previousState.clientProjectActive&&previousState.phase==='paid'&&state.phase==='complete'){workspaceOverride='office';workspaceOrderDetail=false;viewedFirstBuyer=null;}}if(type==='APPROVE_CASE_LAMP'&&state.caseLampApprovals?.[state.caseGrowth.referrerId]){proposalOpen=false;growthLampModel='developed';growthDraft.products=['mira'];}if(type==='CLOSE_CASE_GROWTH'){growthDraft=null;seriesMode=false;}if(type==='BACK_FROM_CURATION')curationDraft=null;if(['BACK_FROM_COLLECTION','START_COLLECTION'].includes(type))delete collectionDraft.sourceId;if(type==='START_SUPPLY_PLAN'&&state.phase==='planning-fulfillment')supplyDraft=null;save();if(type==='FULFIL_SUPPLY_PLAN'&&state.feedback?.kind==='supply-complete'&&!document.documentElement.classList.contains('reduce-motion')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){playback={frames:supplyPlaybackFrames(state.supplyPlan),index:0};clearTimeout(playbackTimer);playbackTimer=setTimeout(nextPlaybackFrame,1200);}event=['FULFIL_CASE_GROWTH','FULFIL_CURATION','FULFIL_ACCOUNT_EXPANSION','FULFIL_ACCOUNT','FULFIL_COLLECTION'].includes(type)?'shop-received':type==='PROPOSE'?(state.phase==='fulfilling'?'signing':'replying'):['ADVANCE','FULFIL_SUPPLY_PLAN'].includes(type)?'receiving':'arriving';if(state===previousState)event='';else if(state.feedback?.kind==='round-delivered')event='delivering';else if(/-signed$/.test(state.feedback?.kind||''))event='signing';else if(/-paid$/.test(state.feedback?.kind||''))event='receiving';render();if(type==='NEXT_CLIENT'&&state!==previousState){focusCustomerRoute();return;}const target=root.querySelector(state.feedback?.kind==='counter'?'.business [data-prospect-reply], .business .counter':'.business h2');if(target&&!playback){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',behavior:'auto'});}});
 root.querySelector('#motion').onclick=()=>{document.documentElement.classList.toggle('reduce-motion');try{localStorage.setItem(SAVE_KEY+':reduced-motion',document.documentElement.classList.contains('reduce-motion')?'1':'0');}catch{}render();root.querySelector('#motion')?.focus({preventScroll:true});};
}
if(root?.dataset?.workspaceEntry==='office'&&state.phase!=='outing-trip'){
 if(state.phase==='market'&&state.market?.status==='draft')workspaceOverride='inbox';
 else if(!orderPhase(state)&&!['curating','portfolio'].includes(state.phase))workspaceOverride='office';
}
resumeOpeningDraft();
render();

// Restore the same semantic control after replacing the rendered subtree.
function renderKeepingChoiceFocus(button, attribute) {
 const value=button.getAttribute(attribute);
 const matching=()=>[...root.querySelectorAll(`[${attribute}]`)].filter(node=>node.getAttribute(attribute)===value);
 const occurrence=matching().indexOf(button);
 render();
 const next=matching();
 const target=next[occurrence]||next[0];
 if(target&&!target.disabled){
  // A restored control must not be trapped in a newly collapsed section.
  let parent=target.parentElement;
  while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
  target.focus({preventScroll:true});
 }
}

function restoreReturnFocus(selector){
 const target=root.querySelector(selector);
 if(!target||target.disabled)return;
 let parent=target.parentElement;
 while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
 target.focus({preventScroll:true});
}


// Decorative business gestures only: no timers, input blocking or economy changes.
function businessMotionView(state,event){
 if(!['signing','receiving','shop-received','delivering'].includes(event))return '';
 const kind=state.feedback?.kind||'';
 const paid=['paid','stock-paid','revision-paid','case-growth-paid','account-paid','collection-paid','curation-paid','round-receipt','round-complete','supply-complete'].includes(kind);
 const mode=event==='signing'?'signature':paid?'receipt':kind==='round-delivered'?'delivery':'';
 if(!mode)return '';
 const label={signature:'已签约',delivery:'已交货',receipt:'已到账'}[mode];
 return '<div class="business-gesture gesture-'+mode+'" aria-hidden="true">'+
  (mode==='delivery'?'<img src="assets/deal-warehouse-carton-paint.webp" alt="" width="42" height="38">':'')+
  '<b>'+label+'</b></div>';
}
