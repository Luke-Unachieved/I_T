import {adviserView,bindAdviser,readAdviserChoice} from './deal-room-adviser.js';
import {marketBook} from './deal-room-market.js';
import {marketView,bindMarket,marketReceiptText,marketAdviserQuote} from './deal-room-market-view.js';
let marketUI={};
import {warehouseView,bindWarehouse} from './deal-room-warehouse-view.js';
let warehouseOpen=false,warehouseUI={};
import {workspaceNavView,workspaceOfficeView,bindWorkspaceNav} from './deal-room-workspace-nav.js';
import {propertyView,bindPropertyView} from './deal-room-property-view.js';
import {workspaceWeather,workspaceHubView,bindWorkspaceHub} from './deal-room-workspace-hub.js';
import {PROPERTY_CATALOG,propertyHoldings} from './deal-room-property.js';
import {outingsView,bindOutings,openOutings} from './deal-room-outings-view.js';
let workspaceOverride=null,propertyUI=null,outingsOpen=false,outingsUI={},sleepOpen=false;
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
import {quoteOptionExplanation,quoteCommitmentView,quoteBuyerBrief} from './deal-room-quote-view.js';
import {LIFE_ITEMS,lifeAvailable} from './deal-room-life.js';
import {lifeRoomView,bindLifeRoom} from './deal-room-life-view.js';
import {stockProcurementView} from './deal-room-stock-view.js';
import {revisionView,revisionArt} from './deal-room-revision-view.js';
import {roundReceivablesActive} from './deal-room-round-receivables.js';
import {roundCashView,roundProductionView,roundQuoteNote} from './deal-room-round-view.js';
import {cooperationChapter} from './deal-room-cooperation.js';
import {previewStudioAllocation} from './deal-room-allocation.js';
import {loadDealSave,saveDealProgress} from './deal-room-save.js';
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
import {createDealRoom,currentClient,openFirstBuyers,firstBuyerProjection,quoteOptions,previewOffer,reduceDealRoom,businessOpportunities,normalizeDealRoom,careerOpportunity,previewSupplyPlan,clientProjects,CURATION_PRODUCTS,curationOffers,previewCuration} from './deal-room-engine.js';
import {sampleSelection,selectedSample,sampleSvg,developedQuoteSample} from './deal-room-samples.js';
import {supplyDraftView,supplyLotsView,supplyPlaybackFrames} from './deal-room-supply-view.js';
let personalRoomOpen=false,personalRoomUI={};
let openingInboxOpen=false,viewedFirstBuyer=null;
let studioAllocation='bedside',stockMode='small',shopTerms='regular',shopSceneMoment='';
let growthDraft=null;
let seriesMode=false,seriesLamp='standard';
let growthLampModel='standard',proposalOpen=false,proposalModel='standard',proposalBrightness=1;
let factoryChoice='studio',sampleBrightness=1;
let showCareerRecap=false,tradeEvidence='chain';
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
function openingShopSketch(state,client,offer){
 if(state?.phase!=='negotiating'||state.businessRound||state.clientProjectActive||!client||!offer||!Number.isSafeInteger(offer.deliveryDay)||!Number.isSafeInteger(offer.quantity))return '';
 const {id,quantity,deliveryDay}=offer,who=client.id;
 const scenes={mira:{trial:['one','一家店先试卖'],rollout:['three','三家店同步铺货']},samir:{ready:deliveryDay<=7?['open','现货赶开业']:['stock','现货常规补架'], 'branded-opening':['custom-open','定制赶开业'],branded:['custom-stock','定制留给后续补货'],promise:['miss','定制赶不上开业']},ines:{small:['pair','两家店先试卖'],season:deliveryDay<=11?['season','季度陈列备货']:['reserve','常规备货'],'all-now':deliveryDay<=11?['season','季度陈列 · 付款待谈']:['reserve','常规备货 · 付款待谈']}};
 const v=scenes[who]?.[id];if(!v)return '';const [mode,label]=v;
 const lamp=(x,y)=>`<g transform="translate(${x} ${y})"><ellipse cx="0" cy="1" rx="9" ry="2" fill="#7b7664" opacity=".35"/><path d="M0-15v13m-6 2h12" stroke="#725c43" stroke-width="2.1" stroke-linecap="round"/><path d="m-5-21 10 0 5 10h-20z" fill="#eac180" stroke="#97744d"/><path d="M-7-11H7" stroke="#fff0bf" stroke-width="2"/></g>`;
 const cup=(x,y)=>`<g transform="translate(${x} ${y})"><path d="M-4-15h8v3l2 2v12q-6 4-12 0v-12l2-2z" fill="#8aa9a0" stroke="#4c6b60"/><path d="M-4-17h8v3h-8z" fill="#4e665b"/><path d="M-3-9v8" stroke="#dfede0"/></g>`;
 const carton=(x,y,branded)=>`<g transform="translate(${x} ${y})"><path d="m0 1 10-4 12 3-10 5z" fill="#e0c49a"/><path d="m0 1 12 4v13L0 14z" fill="#b88f65"/><path d="m12 5 10-5v13l-10 5z" fill="#d6b58a"/>${branded?'<path d="m5 3 4 1v13l-4-1z" fill="#496858"/><path d="m5 3 10-5 4 1L9 4z" fill="#71876c"/>':'<path d="m4 7 5 1v4l-5-1z" fill="#f1e3c9"/>'}</g>`;
 const textile=(x,y,c)=>`<g transform="translate(${x} ${y})"><path d="m0 0 15-4 19 4-15 6L0 3z" fill="${c}" stroke="#776e58" stroke-width=".7"/><path d="m2 1 17 4 13-4" fill="none" stroke="#e9dfbd" stroke-width=".9"/></g>`;
 let art='';
 if(who==='mira'){
  const full=mode==='three';art=`<path d="M0 10h400v67H0z" fill="#d5dcce"/><path d="M0 74h400v27H0z" fill="#c0b7a4"/>${[0,1,2].map((n)=>`<g transform="translate(${7+n*129} 5)" class="window-bay ${full||n===0?'bay-lit':'bay-dormant'}" style="--bay-delay:${n*100}ms"><path d="M0 8 112 5l9 6v63H0z" fill="${full||n===0?'#b9bca8':'#b8c2b6'}"/><path d="M6 18h104v53H6z" fill="${full||n===0?'#ecdfbd':'#bac9bf'}"/><path d="M9 20h67v47H9z" fill="${full||n===0?'#d4c5ad':'#c6d0c5'}"/><path d="M11 23h61v2H11zm68-4h2v49h-2z" fill="#918b77" opacity=".6"/><path d="M6 70h109v5H6z" fill="#796953"/><path d="M10 58h58v4H10z" fill="#927855"/><path d="m92 35 11-1v34H88V35z" fill="#9eab98"/><path d="M97 39v23" stroke="#edf0de"/><path d="M0 11h120v9H0z" fill="${full||n===0?'#506b5d':'#859487'}"/>${full||n===0?`<g class="shop-stock">${lamp(31,56)}${lamp(55,55)}</g><path class="display-light" d="m24 49-8 8h30l-8-8m11 0-6 8h25l-7-8" fill="#fff2bc" opacity=".52"/>`:''}<path d="m13 26 10-2-9 12m35-12 13 0-18 24" fill="#f3f3df" opacity=".24"/></g>`).join('')}`;
 }else if(who==='samir'){
  const branded=id!=='ready',opening=mode==='open'||mode==='custom-open',miss=mode==='miss';
  art=`<rect width="400" height="100" fill="#deccb2"/><path d="M6 4h378l12 9v78H6z" fill="#ceb598"/><path d="M14 19h372v66H14z" fill="#b1bdb0"/><path d="M17 24h100v58H17z" fill="#718b7c"/><path d="M25 29h83v49H25z" fill="#b9c8b9"/><path d="M65 26v53" stroke="#789182" stroke-width="3"/><path d="m32 30 17 0-19 27m55-26 13-2-20 29" fill="#f6efcd" opacity=".27"/><path d="M15 9h371v14H15z" fill="#496557"/><path d="M126 27h168v49H126z" fill="#d4c8ae"/><path d="M133 57h151v3H133zm0 17h151v3H133z" fill="#91795a"/><path d="M301 27h72v46h-72z" fill="#a5ad94"/><path d="M301 54h72" stroke="#7c876f" stroke-width="3"/><path d="M0 86h400v14H0" fill="#b79571"/><g class="shop-stock">${(opening||miss?[144,165,186]:[144,167]).map(x=>cup(x,54)).join('')}${(branded?[222,247,283]:[237,261]).map(x=>carton(x,60,branded)).join('')}</g>${opening?'<g class="opening-pennant"><path d="M126 25q80 30 158 1" fill="none" stroke="#705c49"/><path d="m144 30 11 4-7 8zm25 7 12 2-7 9zm26 3 12 0-6 9zm27-1 12-1-5 10zm26-4 12-3-4 10z" fill="#c78862"/></g>':''}${miss?'<path d="M126 27h165v49H126z" fill="#d8d6bd" opacity=".52"/><g fill="none" stroke="#906a4e" stroke-width="2"><circle cx="209" cy="49" r="11"/><path d="M209 41v9l6 3"/></g>':''}`;
 }else{
  const trial=mode==='pair',season=mode==='season';art=`<rect width="400" height="100" fill="#dcd0bb"/><path d="M0 74 400 70v30H0" fill="#b7a48c"/><path d="M12 12h112v61H12z" fill="#a8bcb0"/><path d="M18 17h100v49H18z" fill="#d4ddc8"/><path d="M66 17v51M19 38h99" stroke="#93a995" stroke-width="3"/><path d="M160 12h226v65H160z" fill="#afa992"/><path d="M167 18h212v52H167z" fill="#d4c7a8"/><path d="M170 43h206m-206 24h206" stroke="#8e7657" stroke-width="3"/><path d="m24 63 79-3 31 10-82 7z" fill="#c3a079"/><path d="m24 63 28 14 82-7-4 11-76 9-28-13z" fill="#799585"/><path d="m26 70 29 13 73-8" fill="none" stroke="#e4ddbd" stroke-dasharray="4 2"/><path d="m35 80 2 11m76-12 1 8" stroke="#8c7458" stroke-width="3"/><g class="shop-stock">${(trial?[177,214]:[174,211,249,286,324]).map((x,i)=>[0,1,...(!trial?[2]:[])].map((k)=>textile(x,38-k*3,['#8da895','#bea180','#abc0ac'][(k+i)%3])).join('')).join('')}${!trial?[0,1,2,3].map(n=>textile(185+n*42,62,n%2?'#9cac9a':'#b89877')).join(''):''}</g>${season?'<g class="linen-banner"><path d="M337 8h16v29l-8-4-8 4z" fill="#a76e52"/><path d="M341 15h8m-8 4h8" stroke="#ead3ae"/></g>':''}`;
 }
 return `<figure class="opening-shop-sketch" data-shop="${who}" data-mode="${mode}" aria-label="客户用途预演：${label}"><svg viewBox="0 0 400 100" aria-hidden="true" focusable="false">${art}<path d="M3 92h394" stroke="#9b856a" stroke-width="1" opacity=".5"/></svg><figcaption>用途预演 · ${label}</figcaption></figure>`;
}

function openingInboxView(quoteState,rows,expanded){
 const active=rows.find(c=>c.index===quoteState.clientIndex);
 const cards=expanded?rows.map(c=>{
  const s=firstBuyerProjection(quoteState,c.id),q=previewOffer(s,c.id==='samir'?'ready':c.id==='ines'?'season':'trial');
  const terms=c.id==='mira'?'小批交货付款，也可铺三家店':c.id==='samir'?(quoteOptions(s).some(o=>o.id==='branded-opening')?'现货、定制都赶得上第 7 天开业':q.deliveryDay<=7?'现货赶得上第 7 天开业':'已赶不上开业，按常规补货'):(q.deliveryDay<=11?'第 11 天前到货，赶得上季度陈列':'已赶不上陈列，按常规备货');
  return `<button class="quote" data-first-buyer="${esc(c.id)}" aria-pressed="${c.id===active?.id}"><strong>${esc(c.name)} · ${esc(c.product)}</strong><span>${esc(terms)} · ${esc(q.title)}</span><small>货款 ${money(q.revenue)} · 先垫 ${money(Math.max(0,q.cost-q.deposit))} · 第 ${q.deliveryDay} 天交货 / 第 ${q.paymentDay} 天收齐</small></button>`;
 }).join(''):'';
 return `<section class="opening-inbox"><button class="quiet" id="opening-inbox-toggle" aria-expanded="${expanded}" aria-controls="first-buyer-list">${expanded?'收起询盘':'暂缓这封，看看其他询盘'}</button><div id="first-buyer-list" ${expanded?'':'hidden'}>${expanded?`<p class="brief">没签的询盘可以回来谈。客户的开业和陈列日期不会顺延。</p><div class="quotes" role="group" aria-label="未接的客户询盘">${cards}</div>`:''}</div></section>`;
}
function openingLifeGoal(state,contract,paid){
 if(state.phase!=='paid'||paid.length!==1||!contract||contract.businessRound||contract.projectId||state.businessRound||state.clientProjectActive)return '';
 const chair=LIFE_ITEMS.find(item=>item.id==='chair');
 return chair?`<p class="brief opening-life-goal">三位客户的首单都收齐后，就能回家选购。<strong>${esc(chair.name)} · ${money(chair.price)}</strong></p>`:'';
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
let expectedSaveRaw=loadedDeal.raw;
if(loadedDeal.status==='valid')state=loadedDeal.state;
if(state.collection?.status==='pitch'&&!previewCollectionPitch(state,'exclusive')?.valid)collectionPitchOption='retain';
else if(!loadedDeal.ok){saveAllowed=false;saveNotice='已有进度无法读取，原数据保留；本轮仅临时体验';}
function save(){
 if(!saveAllowed)return;
 const result=saveDealProgress(dealStorage,state,{key:SAVE_KEY,expectedRaw:expectedSaveRaw});
 if(result.ok){expectedSaveRaw=result.raw;saveNotice='进度自动保存';}
 else if(result.status==='conflict'){
  saveAllowed=false;saveNotice='其他页面已更新进度，本页已暂停自动保存';
  savePanel.conflict=true;savePanel.open=true;savePanel.message='请先下载当前页面的进度副本，再重新加载浏览器已保存的进度；两份进度不会自动合并。';
 }else{
  saveNotice=result.status==='corrupt'?'原始进度无法读取，已停止覆盖；请保留原始数据':'浏览器未能保存，本轮进度仅留在当前页面';
  if(result.status==='corrupt')saveAllowed=false;
 }
}
function bindSaveTools(){
 bindDealSaveTools(root,{panel:savePanel,storage:dealStorage,key:SAVE_KEY,getState:()=>state,render,download:downloadDealText,onReload:()=>{clearTimeout(playbackTimer);location.reload();},onRestored:()=>{clearTimeout(playbackTimer);location.reload();}});
}
function downloadDealText(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}
const root=document.querySelector('#deal-room');
const money=n=>`¥${Number(n).toLocaleString('zh-CN')}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const orderPhase=s=>s.phase==='market'?['preparing','transit','receivable','paid'].includes(s.market?.status):['fulfilling','paid','supply','collection','collection-revision','stock-procurement','atelier-restock'].includes(s.phase);
const tabsNow=()=>state.phase==='outing-trip'?'afterwork':propertyUI?(propertyUI.kind==='office'?'development':'afterwork'):outingsOpen||personalRoomOpen?'afterwork':workspaceOverride|| (orderPhase(state)?'orders':state.phase==='market'?'inbox':'office');
function directAction(a){const n=reduceDealRoom(state,a);if(n===state)return false;state=n;save();render();return true;}
function workspaceNavigate(tab){
 if(state.phase==='outing-trip')return;
 warehouseOpen=false;propertyUI=null;outingsOpen=false;personalRoomOpen=false;sleepOpen=false;
 workspaceOverride=tab;render();
}
function render(){
 renderCurrentPage();
 if(typeof root.insertAdjacentHTML==='function'){
  root.insertAdjacentHTML('afterbegin',workspaceNavView(tabsNow()));
  bindWorkspaceNav(root,workspaceNavigate);
 }
 if(!warehouseOpen&&['review','complete','market'].includes(state.phase)){
  root.insertAdjacentHTML?.('afterbegin','<div class="wh-shortcut"><button type="button" data-open-warehouse>自有仓库</button></div>');
  root.querySelector('[data-open-warehouse]')?.addEventListener?.('click',()=>{warehouseOpen=true;render();root.querySelector('#wh-title')?.focus?.();});
 }
 bindAdviser(root,adviserUI,dealStorage,render,SAVE_KEY);
}
function renderCurrentPage(){
 if(warehouseOpen){

  root.innerHTML=adviserView(state,{place:'自有仓库'},adviserUI)+warehouseView(state,warehouseUI)+`<p class="save-state" role="status">${esc(saveNotice)}</p>`+dealSaveView(savePanel);
  const dispatch=a=>{const n=reduceDealRoom(state,a);if(n===state)return;state=n;save();render();};
  bindWarehouse(root,state,warehouseUI,render,dispatch,()=>{warehouseOpen=false;render();root.querySelector('[data-open-warehouse]')?.focus?.();});bindSaveTools();return;
 }
 if(state.phase==='outing-trip'||outingsOpen){
  root.innerHTML=adviserView(state,{place:'生活'},adviserUI)+outingsView(state,outingsUI)+dealSaveView(savePanel);
  bindOutings(root,state,outingsUI,render,directAction,()=>{outingsOpen=false;workspaceOverride='afterwork';render();});bindSaveTools();return;
 }
 if(propertyUI){
  root.innerHTML=adviserView(state,{place:propertyUI.kind==='office'?'工作室布置':'生活'},adviserUI)+propertyView(state,propertyUI)+dealSaveView(savePanel);
  bindPropertyView(root,state,propertyUI,{render,dispatch:directAction,onBack:()=>{propertyUI=null;render();},getState:()=>state});bindSaveTools();return;
 }
 if(workspaceOverride==='development'||workspaceOverride==='afterwork'&&!personalRoomOpen){
  const dev=workspaceOverride==='development';
  root.innerHTML=adviserView(state,{place:dev?'工作室布置':'生活'},adviserUI)+workspaceHubView(state,workspaceOverride,lifeAvailable(state),sleepOpen)+dealSaveView(savePanel);
  bindWorkspaceHub(root,{onProperty:kind=>{propertyUI={kind};render();},onHome:()=>{personalRoomOpen=true;personalRoomUI={};render();},onOuting:section=>{openOutings(outingsUI,section);outingsOpen=true;render();},onSleep:()=>{sleepOpen=true;render();},onSleepCancel:()=>{sleepOpen=false;render();},onSleepConfirm:()=>{sleepOpen=false;if(!directAction({type:'SLEEP_TO_NEXT_DAY',checkedDay:state.day,acknowledgePending:true}))render();}});
  bindSaveTools();return;
 }
 if(workspaceOverride==='office'){
  const h=propertyHoldings(state), office=PROPERTY_CATALOG.find(x=>x.id===h?.active?.office);
  root.innerHTML=adviserView(state,{place:'工作室'},adviserUI)+workspaceOfficeView(state,{officeName:office?.name,weather:workspaceWeather(state.day)})+dealSaveView(savePanel);
  bindSaveTools();return;
 }
 if(state.phase==='market'){
  const quote=marketAdviserQuote(state,marketUI);
  root.innerHTML=adviserView(state,{place:'采购台',quote},adviserUI)+marketView(state,marketUI)+`<p class="save-state" role="status">${esc(saveNotice)}</p>`+dealSaveView(savePanel);
  const dispatchMarket=action=>{
   const next=reduceDealRoom(state,action);if(next===state)return;
   state=next;if(action.type==='CLOSE_MARKET'){marketUI={};workspaceOverride='inbox';}else if(orderPhase(state))workspaceOverride='orders';save();render();
   if(action.type==='CLOSE_MARKET')root.querySelector('[data-action="OPEN_MARKET"]')?.focus({preventScroll:true});
  };
  bindMarket(root,state,marketUI,render,dispatchMarket);bindSaveTools();return;
 }
 if(state.phase==='linen-freight'){
  root.innerHTML=adviserView(state,{place:'展陈配送'},adviserUI)+linenFreightView(state)+`<p class="save-state" role="status">${esc(saveNotice)}</p>`+dealSaveView(savePanel);
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const next=reduceDealRoom(state,{type:b.dataset.action});if(next===state)return;state=next;save();render();const target=root.querySelector(state.phase==='linen-freight'?'.business h2':'[data-action="OPEN_LINEN_FREIGHT"]');target?.focus({preventScroll:true});});
  bindSaveTools();return;
 }

 if(exhibitionOpen&&exhibitionAvailable(state)){
  root.innerHTML=adviserView(state,{place:'展览'},adviserUI)+exhibitionView(state,exhibitionUI)+`<p class="save-state" role="status">${esc(saveNotice)}</p>`+dealSaveView(savePanel);
  bindExhibition(root,{getState:()=>state,getUI:()=>exhibitionUI,setUI:next=>{exhibitionUI=next;render();},dispatch:action=>{const next=reduceDealRoom(state,action);if(next!==state){state=next;save();}render();},close:()=>{exhibitionOpen=false;exhibitionUI={};annexOpen=true;render();root.querySelector('#open-private-exhibition')?.focus();}});bindSaveTools();return;
 }
 if(annexOpen&&officeAvailable(state)&&state.officeImprovement){
  root.innerHTML=adviserView(state,{place:'侧间'},adviserUI)+annexView(state,annexUI)+`<p class="save-state" role="status">${esc(saveNotice)}</p>`+dealSaveView(savePanel);
  if(state.officeAnnex){root.querySelector('.annex-panel')?.insertAdjacentHTML('beforeend','<p><button id="open-private-exhibition">给自己办一场三件作品的小展 →</button></p>');root.querySelector('#open-private-exhibition')?.addEventListener('click',()=>{exhibitionOpen=true;exhibitionUI={};render();root.querySelector('[data-exhibition-close]')?.focus();});}
  bindAnnex(root,{getState:()=>state,getUI:()=>annexUI,setUI:next=>{annexUI=next;render();},dispatch:action=>{const next=reduceDealRoom(state,action);if(next!==state){state=next;save();}render();},close:()=>{annexOpen=false;annexUI={};render();root.querySelector('#open-office-annex')?.focus();}});bindSaveTools();return;
 }
 if(officeOpen&&officeAvailable(state)){
  root.innerHTML=adviserView(state,{place:'工作室布置'},adviserUI)+officeImprovementView(state,officeUI)+`<p class="save-state" role="status">${esc(saveNotice)}</p>`+dealSaveView(savePanel);
  bindOfficeImprovement(root,state,officeUI,action=>{const next=reduceDealRoom(state,action);if(next!==state){state=next;save();}render();},render,()=>{officeOpen=false;officeUI={};render();root.querySelector('#open-office-improvement')?.focus();});
  bindSaveTools();return;
 }
 if(personalRoomOpen&&lifeAvailable(state)){
  root.innerHTML=adviserView(state,{place:'生活'},adviserUI)+lifeRoomView(state,personalRoomUI)+`<p class="save-state" role="status">${esc(saveNotice)}</p>`+dealSaveView(savePanel);
  bindLifeRoom(root,{getState:()=>state,getUI:()=>personalRoomUI,setUI:next=>{personalRoomUI=next;render();},dispatch:action=>{const next=reduceDealRoom(state,action);if(next!==state){state=next;save();}render();},close:()=>{personalRoomOpen=false;personalRoomUI={};render();root.querySelector('#open-personal-life')?.focus();}});
  bindSaveTools();
  return;
 }
 personalRoomOpen=false;

 const openingBuyers=openFirstBuyers(state),quoteState=viewedFirstBuyer?firstBuyerProjection(state,viewedFirstBuyer):state;
 const roundActive=roundReceivablesActive(state);
 const opportunities=businessOpportunities(state),career=careerOpportunity(state),projects=clientProjects(state),referrals=curationOffers(state);
 const viewingCase=!supplyDraft&&['review','complete'].includes(state.phase)?(state.curationHistory||[]).find(c=>c.referrerId===showcaseId):null;
 const home=!viewingCase&&!supplyDraft&&['review','complete'].includes(state.phase);
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
 const tradeRecap=home&&showCareerRecap&&(showCareerRecap==='trade'||!state.collection)?tradingChapter(state):null;
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
 const cq=state.phase==='curating'?previewCuration(state,curationDraft):curationBrief;
 const client=['development','supplier-development'].includes(state.phase)?null:(['shop-trial','stock-procurement','studio-project','launch-project','collection-revision'].includes(state.phase)?null:currentClient(quoteState))||(supplyDraft?{...career.clients.find(c=>c.id===supplyDraft.clientId),country:'供货安排'}:state.feedback?.kind==='supply-complete'?{id:state.supplyPlan.clientId,name:state.supplyPlan.clientName,product:state.supplyPlan.product,country:'本次供货'}:null),options=quoteOptions(quoteState);
 const planVisual=supplyDraft?previewSupplyPlan(state,supplyDraft):(state.phase==='planning-fulfillment'||state.feedback?.kind==='supply-complete')?state.supplyPlan:null;if(!options.some(o=>o.id===selected))selected=options[0]?.id||'';
 const counterRelevant=quoteState===state&&state.feedback?.kind==='counter'&&(state.history.at(-1)?.optionId===selected||(state.phase==='studio-project'||state.phase==='case-growth'&&proposalOpen&&proposalModel==='standard'&&state.history.at(-1)?.type==='APPROVE_CASE_LAMP'));
 const mood=(['fulfilling','paid','planning-fulfillment'].includes(state.phase)||state.feedback?.kind==='supply-complete')?2:counterRelevant?1:0;
 const feedbackText=restockBasis?(state.atelierRestock.status==='draft'?'Élise 邀你沿用首单的实物和包装。':state.atelierRestock.status==='paid'?'Atelier 已收到补货，货款已结清。':state.feedback.message):quoteState!==state?'先看看这位客户的需求，还没有签单。':state.phase==='negotiating'&&selected==='developed-lamp'?'把验过的新样摆出来，再和客户确认这批订单。':state.phase==='collection-revision'&&state.feedback.kind==='revision'&&state.collectionRevision?.status!=='draft'?'继续看看潮汐系列的样品和订单。':roundActive&&state.phase==='portfolio'&&state.businessSigned>=2?(state.contracts.some(c=>c.roundReceivable&&c.businessRound===state.businessRound&&c.status==='receivable')?'本轮两批已交付；未到账的尾款仍在客户名下。':'本轮两单尾款已收齐，可以回工作室。'):roundActive?state.feedback.message:receipt?(receiptMode==='delivered'?receipt.buyer.company+' 已收到这批产品。':'看看确认的设计与交到客户手上的成品。'):recapVisual?'已交付的作品与承诺留在这里，继续经营由你决定。':state.phase==='studio-project'?state.feedback.message:['WAIT_FOR_BUYER','WAIT_FOR_RETAIL','PAUSE_FOR_BUYER'].includes(state.history.at(-1)?.type)?state.feedback.message:state.retailPlanning&&state.phase==='portfolio'?'看看哪些门店需要补货，或回工作室经营其他业务。':state.collection?.status==='pitch'?(state.collection.pitchBuyer==='northline'?'买方想改成自有品牌线。先核清能授权的范围。':'买方希望主题陈列独家。可以拆开原系列与买方专用纸套来谈。'):home&&!showCareerRecap&&state.market?.status==='paid'&&state.feedback?.kind==='market-paid'?marketReceiptText(state):businessFeedback(state,{viewingCase,supplyDraft});
 const marketLedger=state.marketHistory?.length?marketBook(state):null;
 const completedCooperations=(marketLedger?.receipts.length||0)+(state.linenFreight?.status==='paid'?1:0)+(state.atelierRestock?.status==='paid'?1:0)+(state.stockProcurement?.status==='paid'?1:0)+(state.collectionRevision?.orders||[]).filter(o=>o.status==='paid').length+state.contracts.filter(c=>c.status==='paid').length+(state.supplyPlanHistory||[]).length+(state.curationHistory||[]).length+(state.caseGrowthHistory||[]).filter(c=>c.status==='paid').length+(state.accountHistory||[]).length+(state.collection?.orders||[]).filter(c=>c.status==='paid').length;
 const p=selected?previewOffer(quoteState,selected):null,contract=state.contracts.at(-1),paid=state.contracts.filter(c=>c.status==='paid');
 const quoteLampSample=developedQuoteSample(state,selected,sampleBrightness);
 root.innerHTML=`<header><div class="brand"><small>再开一单就下班</small><h1>我的贸易工作室</h1></div><div class="wallet"><span>第 ${state.day} 天</span><strong>${money(state.cash)}</strong><small>可用资金</small></div></header>
 ${adviserView(state,{place:showCareerRecap?'收工':home?'工作室':'业务',quote:state.phase==='negotiating'?p:null},adviserUI)}
 ${shopVisual?shopShelfScene(state,shopTerms,shelfMoment):`<section class="workspace ${state.officeImprovement&&!buyerScene?'office-upgraded-workspace':''} ${accountVisual?.seriesSource?'account-version-scene':''} ${esc(event)} ${buyerScene?'buyer-scene':''} ${collectionVisual||restockBasis||growthVisual?.designStyle||accountVisual?.seriesSource?'collection-mode':''} ${demo?.open?'demo-active demo-'+demo.room:''}" style="--demo-glow:${demo?.glow||0};--demo-lamp:${[.75,.95,1.12][demo?.level??1]}" aria-label="${tradeRecap?'已交付贸易成果':buyerScene?'已交付买手店陈列':'现代贸易工作空间'}"><div class="room-light"></div><div class="desk-label">${tradeRecap?esc(recapVisual.buyer)+' · 已交货并收款':buyerScene?esc(curationBrief.buyer)+' · 你的组合已上新':completedCooperations?'合作交付 · '+completedCooperations+' 笔已回款':'今天，从一笔好生意开始'}</div>
 ${restockBasis?`<div class="collection-sleeve style-${restockBasis.style}"><strong>Atelier · 原版独家</strong><span>${COLLECTION_STYLES[restockBasis.style]}</span></div>`:''}${collectionVisual?`<div class="collection-sleeve style-${esc((receipt&&receiptMode==='delivered'?receipt.style:null)||pitchVisual?.style||state.collection.style||collectionDraft.style)}"><strong>${collectionVisual.buyer}</strong><span>${COLLECTION_STYLES[(receipt&&receiptMode==='delivered'?receipt.style:null)||pitchVisual?.style||state.collection.style||collectionDraft.style]}</span></div>`:''}
 ${accountVisual?.seriesSource?`<div class="collection-sleeve style-${esc(accountVisual.seriesSource.style)}"><strong>${esc(accountVisual.seriesSource.label)}</strong><span>${accountVisual.seriesSource.style==='tidal-grid'?'潮汐波线 · 分格内托':COLLECTION_STYLES[accountVisual.seriesSource.style]} · ${esc(accountVisual.seriesSource.signature)}</span></div>`:''}
 ${growthVisual?.designStyle?`<div class="collection-sleeve style-${esc(growthVisual.designStyle)}"><strong>工作室系列 · 署名保留</strong><span>${COLLECTION_STYLES[growthVisual.designStyle]}</span></div>`:''}
 ${client?`<div class="customer-call" aria-label="${esc(client.name)}${mood===2?'已确认合作':mood===1?'正在回谈':'正在看样品'}"><div class="customer-face mood-${mood}" style="--face-x:${['mira','samir','ines'].indexOf(client.id)*50}%;--face-y:${mood*50}%"></div><span>${esc(client.name.split(' · ')[0])}<i>${mood===2?'已确认':mood===1?'回谈中':'看样中'}</i></span></div>`:''}
 <div class="sample-stage ${state.phase==='fulfilling'?'sample-confirmed':''} ${curationBrief?'curation-stage':''} ${curationBrief&&cq.packaging==='gift'?'curation-gift':''}" aria-label="产品样品">${['development','supplier-development'].includes(state.phase)?`<div class="sample-piece picked single">${sampleSvg('lamp')}<span>${esc(SAMPLE_FACTORIES[state.phase==='supplier-development'?state.secondSupplier.factory:state.productDevelopment?.factory||factoryChoice].title)} · 工厂样品</span></div>`:state.phase==='collection-revision'?revisionArt(revisionOpen,state.collectionRevision?.products||[]):curationBrief?CURATION_PRODUCTS.filter(p=>state.phase==='curating'||cq.products.includes(p.id)).map(product=>`<button class="sample-piece curation-sample ${(cq.products||[]).includes(product.id)?'picked':''}" data-curation-product="${product.id}" aria-pressed="${(cq.products||[]).includes(product.id)}" ${state.phase!=='curating'||product.id===curationBrief.anchor?'disabled':''}>${sampleSvg(product.kind,cq.packaging==='gift')}<span>${esc(tradeRecap&&tradeEvidence==='model'?tradeRecap.model.product:product.id==='mira'&&cq.lampVersion==='developed'?'三档调光台灯':product.name)}${product.id===curationBrief.anchor?' · 案例产品':''}<small>${state.phase==='curating'?`¥${product.id==='mira'&&cq.lampVersion==='developed'?75:product.price} / 件`:cq.productQuantities?cq.productQuantities[product.id]+' 件':cq.quantityLabel||cq.quantity+' 件'}</small></span></button>`).join(''):home&&careerFocus==='product'&&state.productDevelopment?.status==='active'?[state.productDevelopment,...(state.secondSupplier?.status==='active'?[state.secondSupplier]:[])].map(sample=>`<div class="sample-piece picked ${state.secondSupplier?.status==='active'?'':'single'}">${sampleSvg('lamp')}<span>${sample.factory==='line'?'暖光标准台灯 · 量产留样':'三档调光台灯 · 工作室留样'}</span></div>`).join(''):state.clientProjectSeason&&!client?`<div class="project-display">${projects.map(p=>`<div class="project-piece ${p.completed?'project-done':''}">${sampleSvg(p.id==='mira'?'lamp':p.id==='samir'?'cup':'linen',p.specification==='branded')}<strong>${esc(p.title)}</strong><span>${p.completed?(p.onTime?'专题已亮相 ✓':'常规补货 ✓'):p.openForProject?`第 ${p.deadline} 天`:'转常规补货'}</span></div>`).join('')}</div>`:planVisual?planVisual.lots.map((lot,i)=>`<div class="sample-piece plan-batch"><div class="batch-quantity">${lot.quantity} 件${planVisual.completed?' ✓':''}</div>${sampleSvg(client?.id==='mira'?'lamp':client?.id==='samir'?'cup':'linen')}<span>第 ${i+1} 批 · 第 ${lot.deliveryDay} 天交货</span></div>`).join(''):state.phase==='negotiating'&&client?.id!=='samir'&&!state.businessRound?options.filter(o=>o.accepted).map(o=>`<button class="sample-piece ${(selected===o.id||(selected==='all-now'&&o.id==='season'))?'picked':''}" data-select="${o.id}" aria-pressed="${selected===o.id||(selected==='all-now'&&o.id==='season')}">${sampleSvg(client.id==='mira'?'lamp':'linen')}<span>${client.id==='mira'?(o.id==='trial'?'1 家店试卖':'3 家店铺货'):(o.id==='small'?'两店试卖':'季度备货')} · ${o.quantity}${client.id==='mira'?'盏':'条'}</span></button>`).join(''):client?.id==='samir'&&state.phase==='negotiating'&&!state.businessRound?['plain','custom'].map(k=>`<button class="sample-piece ${selectedSample(selected)===k?'picked':''}" data-sample="${k}" aria-pressed="${selectedSample(selected)===k}">${sampleSvg('cup',k==='custom')}<span>${k==='plain'?'无印字现货':'定制包装'}</span></button>`).join(''):quoteLampSample||`<div class="sample-piece picked single">${sampleSvg(client?.id==='mira'?'lamp':client?.id==='samir'?'cup':'linen',p?.specification==='branded'||contract?.optionId==='branded'||contract?.optionId==='branded-opening')}<span>${esc(client?.product||'合作落地')}</span></div>`}</div>
 <div class="cooperation-seals" aria-label="已完成的客户合作">${[...new Set(paid.map(c=>c.clientId))].map(id=>{const rows=paid.filter(c=>c.clientId===id),introduced=(state.curationHistory||[]).filter(c=>c.status==='paid'&&c.referrerId===id).length+(state.caseGrowthHistory||[]).filter(c=>c.status==='paid'&&c.referrerId===id).length;return `<span title="${esc(rows[0].clientName)}">${esc(rows[0].clientName.split(' · ')[0])}<b>${rows.length} 单${introduced?` · 引荐合作 ${introduced}`:""}${(state.supplyPlanHistory||[]).filter(p=>p.clientId===id).length?` · ${(state.supplyPlanHistory||[]).filter(p=>p.clientId===id).length} 委托`:""} ✓</b></span>`;}).join('')}${(marketLedger?.buyers||[]).map(b=>`<span title="这位买方已结清的订单">${esc(b.name)}<b>${b.count} 单 ✓</b></span>`).join('')}</div>
 ${businessMotionView(state,event)}
 <div class="activity ${state.phase==='curating'&&!cq.valid?'quote-over':''}" role="status">${state.phase==='curating'?`<strong>${cq.products.length} 款 × ${curationDraft.quantity} 套 · ${money(cq.revenue)} / ${money(curationBrief.budget)}</strong><span>${esc(cq.valid?'这组搭配，买手的预算够用。':cq.reason)}</span><button id="adjust-curation">调套数 / 包装 ↓</button>`:esc(playerStatusText(state.feedback?.kind==='counter'&&!counterRelevant?'换了这份方案，看看报价和付款安排。':feedbackText||'一位海外客户发来了采购需求。'))}</div></section>`}
 <section class="business"><div class="client-head">${contact?`<span class="client-avatar buyer-portrait buyer-mood-${contact.mood}" role="img" aria-label="${contact.name} · ${contact.label}" style="--buyer-x:${contact.column*100}%;--buyer-y:${contact.mood*50}%"></span>`:`<span class="client-avatar" aria-hidden="true">${esc(client?.name?.slice(0,1)||'✓')}</span>`}<div><small>${esc(recapVisual?'这段合作的成果':contact?contact.role+' · '+contact.label:state.phase==='case-growth'?'案例客户合作':['development','supplier-development'].includes(state.phase)?'供应商合作':state.phase==='collection'?'系列设计合作':state.phase==='account'?'来自你的已交付案例':curationBrief?'由 '+curationBrief.referrerName.split(' · ')[0]+' 引荐':client?.country||'合作记录')}</small><h2 tabindex="-1">${esc((contact?contact.name+' · '+contact.company:null)||curationBrief?.buyer||client?.name||(['development','supplier-development'].includes(state.phase)?'工作室的下一版产品':state.phase==='portfolio'?(roundActive&&state.businessSigned>=2?'本轮交付与回款':state.clientProjectActive?(projects.filter(p=>!p.completed).length===1?'最后一份计划，怎么交付？':'还有 '+projects.filter(p=>!p.completed).length+' 份计划，先安排谁？'):'这次，主动选客户'):'合作正在长大'))}</h2></div><span class="product">${esc(restockBasis?'同版实物补货':tradeRecap?'供货实绩':recapVisual?'作品与合作':state.phase==='collection'?'包装与署名':state.phase==='account'?'连锁采购':state.phase==='stock-procurement'?'客户补缺供货':shopVisual?'门店陈列':curationBrief?'跨品类选品':client?.product||'贸易工作室')}</span></div>
 ${openingBuyers.length>1?openingInboxView(quoteState,openingBuyers,openingInboxOpen):''}
 ${curationReceiptView(state)}
 ${roundCashView(state)}
 ${state.phase==='atelier-restock'?atelierRestockView(state):state.phase==='shop-trial'?shopTrialView(state,shopTerms):state.phase==='stock-procurement'?stockProcurementView(state,stockMode):state.phase==='collection-revision'?revisionView(state,revisionScope):state.phase==='launch-project'?launchView(state):state.phase==='studio-project'?studioProjectView(state,studioAllocation):state.phase==='case-growth'?caseGrowthView(state,growthDraft,{lampModel:growthLampModel,proposalOpen,proposalModel,brightness:proposalBrightness,catalogueMode:seriesMode,catalogueLamp:seriesLamp}):['development','supplier-development'].includes(state.phase)?developmentView(state,factoryChoice,sampleBrightness):home?(showCareerRecap?careerRecapView(state,{route:showCareerRecap==='trade'?'trade':'auto',evidence:tradeEvidence}):businessHomeView(state,{career,referrals,focus:careerFocus,directionsOpen})):state.phase==='collection'?(state.collection.status==='pitch'?collectionPitchView(state,collectionPitchOption):collectionView(state,collectionDraft,{board:collectionBoardView(state,collectionFocus,catalogueFocus,receiptMode)})):state.phase==='account'?accountView(state,accountOption):viewingCase?`<h3>从你的样品桌，到了买手店</h3><p class="brief">${(viewingCase.productNames||viewingCase.products.map(id=>CURATION_PRODUCTS.find(p=>p.id===id).name)).map(esc).join('、')}，每种 ${viewingCase.quantity} 件，${viewingCase.packaging==='gift'?'整组礼盒':'常规包装'}。</p><div class="offer"><div><small>这次净赚</small><strong>${money(viewingCase.netProfit)}</strong></div><div><small>交付</small><strong>第 ${viewingCase.deliveryDay} 天</strong></div></div><button id="close-showcase" class="primary">回到工作室 →</button>`:state.phase==='curating'?curationView(curationBrief,curationDraft,cq,(state.secondSupplier?.status==='active'&&state.secondSupplier.factory==='studio'?state.secondSupplier:state.productDevelopment),demo,state.cash):state.phase==='curation-fulfillment'?`<h3>买手确认了你的整组搭配</h3><p class="brief">${cq.products.length} 种产品，每种 ${cq.quantity} 件，${cq.packaging==='gift'?'组合礼盒':'常规包装'}。第 ${cq.deliveryDay} 天交货，第 ${cq.paymentDay} 天收齐。</p><button class="primary" data-action="FULFIL_CURATION">让团队交付这组产品 →</button>`:supplyDraft?supplyDraftView(career,supplyDraft,previewSupplyPlan(state,supplyDraft)):state.phase==='planning-fulfillment'?`<h3>让跟单按约执行</h3><p class="brief">${esc(state.supplyPlan.clientName)} · 总计 ${state.supplyPlan.totalQuantity} 件。你已确定供货与收款承诺，两批不再反复签约。</p>${supplyLotsView(state.supplyPlan)}<p class="opportunity">下一节点：第 ${state.supplyPlan.events[state.supplyPlan.eventIndex].day} 天，${{start:'安排第二批生产',delivery:'按约交货',payment:'收齐尾款'}[state.supplyPlan.events[state.supplyPlan.eventIndex].kind]}。</p><button class="primary" data-action="FULFIL_SUPPLY_PLAN">交给跟单，按约执行到收齐 →</button>`:state.phase==='portfolio'?`${projectDeskView(state,deskPlan)}${state.clientProjectActive?'<button class="back-clients" data-action="PAUSE_CLIENT_PROJECTS">← 先做别的业务，保留专题日期</button>':''}${!state.clientProjectActive&&!roundActive?'<button class="back-clients" data-action="BACK_FROM_CLIENTS">← 回工作室做其他业务</button>':''}<p class="brief">${state.clientProjectActive?'':roundActive?(state.businessSigned>=2?'':'每次先交付一批，尾款可以留在账上；看现有现金能否安排下一单。'):state.retailPlanning?'先看门店余货。需要补货的客户可以谈，刚铺货的门店先卖现有产品。':'老客户带着新需求回来了。继续深做一位，或换另一位，都由你决定。'}</p><div class="opportunities">${(state.clientProjectActive||(roundActive&&state.businessSigned>=2)?[]:opportunities).map(c=>`<button data-client="${c.id}" class="customer-opportunity" ${c.available?'':'disabled'}><span class="mini-face" style="--face-x:${['mira','samir','ines'].indexOf(c.id)*50}%"></span><span><strong>${esc(c.name)}</strong><small>${esc(c.product)}${state.clientProjectActive?` · ${esc(c.title)}`:` · 上单 ${c.basis.quantity} 件`}</small>${state.clientProjectActive?`<b class="project-date">第 ${c.deadline} 天前交货</b><small>${c.available?`最快第 ${Math.min(...c.options.map(o=>o.deliveryDay))} 天交货 · ${c.options.some(o=>o.projectOnTime)?'还赶得上专题':'只能常规补货'}`:esc(c.reason)}</small>`:''}${c.available?`<p>${esc(c.consequence)}</p>`:''}${demandView(c.demand)}${!c.available&&!state.clientProjectActive&&(!c.demand||(roundActive&&c.demand.ready))?`<small>${esc(c.reason)}</small>`:''}</span></button>`).join('')}</div>${buyerWaitView(state)}`:state.phase==='negotiating'?`${state.businessRound?`<button class="back-clients" data-action="BACK_TO_CLIENTS">← 先看看其他客户</button>`:''}<p class="brief">${esc(quoteBuyerBrief(quoteState,client,selected))}</p><ul class="requirements">${(['developed-lamp','second-developed-lamp'].includes(selected)?['按验过的新样制作',(selected==='second-developed-lamp'?state.secondSupplier:state.productDevelopment).factory==='studio'?'这单 60 盏，交货付款':'180 盏起订，三成定金，交货后七天付清']:client.requirements).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${client.id==='samir'&&!state.businessRound?`<div class="sample-proposal">${openingShopSketch(quoteState,client,p)}<small>桌上的样品，就是这次给客户的方案</small><h3>${selectedSample(selected)==='plain'?'无印字现货 · '+p.quantity+' 只':'定制包装 · '+p.quantity+' 只'}</h3><p>${selected==='branded-opening'?`定制包装第 ${p.deliveryDay} 天到，赶上第 7 天开业；第 ${p.paymentDay} 天收齐货款。`:selected==='branded'?'用途已改为后续补货，定制包装保留。':selected==='promise'?'为开业准备定制包装。':p.deliveryDay<=7?'先保开业交付，包装从简。':'这批已赶不上开业，现货按常规补货交付。'}</p>${selected==='promise'?`<div class="repair"><button data-repair="plain">${quoteState.day+options[0].deliveryDays<=7?'保留开业日期，改现货':'改无印字现货，做常规补货'}</button><button data-repair="restock">保留定制，改后续补货</button></div>`:''}</div>`:!state.businessRound?`<div class="sample-proposal">${openingShopSketch(quoteState,client,p)}<small>${client.id==='mira'?'本次供货规模':'给两家店试卖，还是备足一季？'}</small><h3>${p.quantity} ${client.id==='mira'?'盏台灯':'条桌布'}</h3><p>${client.id==='mira'?quoteOptionExplanation(quoteState,p):(selected==='small'?'先试卖，交货收款。':selected==='all-now'?'季度备货，要求全款预付。':'季度备货，先收三成定金。')}</p>${client.id==='ines'&&selected!=='small'?`<div class="terms" role="group" aria-label="付款条件"><button data-select="season" aria-pressed="${selected==='season'}">先付 30%</button><button data-select="all-now" aria-pressed="${selected==='all-now'}">试谈全款预付</button></div>`:''}</div>`:`<div class="quotes" role="group" aria-label="报价方案">${options.map(o=>`<button class="quote ${o.id===selected?'chosen':''}" data-select="${esc(o.id)}" aria-pressed="${o.id===selected}"><strong>${esc(o.title)}</strong><span>${esc(quoteOptionExplanation(state,o))}</span></button>`).join('')}</div>`}

 ${p?`${quoteCommitmentView(state,p,{roundActive,client,counterMessage:counterRelevant?state.feedback.message:''})}`:''}`:
 state.phase==='fulfilling'&&roundActive?roundProductionView(state):state.phase==='fulfilling'?`<h3>谈成了，现在交给跟单</h3><p>${esc(contract.clientName)} · ${contract.quantity} 件</p><div class="fulfil-track"><span class="done">合同确认</span><span class="moving">安排交付</span><span>第 ${contract.paymentDay} 天回款</span></div><p class="brief">预计净赚 ${money(contract.netProfit)}。常规跟单自动处理，不用逐日催货。</p><button class="primary" data-action="ADVANCE">跟进这笔生意 <span>→</span></button>`:
 state.phase==='paid'?`<div class="receipt"><small>${contract.optionId==='branded-opening'?`开业定制杯第 ${contract.deliveryDay} 天交付，货款已收齐`:'合作落地，货款收齐'}</small><strong>+ ${money(contract.netProfit)}</strong><span>这单净赚 · ${esc(contract.clientName)}</span></div>${openingLifeGoal(state,contract,paid)}<button class="primary" data-action="NEXT_CLIENT">${state.businessRound?'安排下一笔合作':paid.length===3?'回工作室，看看新机会':'看看下一位客户'} <span>→</span></button>`:
 `${state.feedback?.kind==='supply-complete'?`<h3>整份供货安排，已按约完成</h3>${supplyLotsView(state.supplyPlan)}<p class="brief">${esc(state.supplyPlan.clientName)}的两批货已交齐。这次净赚 ${money(state.supplyPlan.netProfit)}，日常支出 ${money(state.supplyPlan.operatingCostPaid)}。你确定的付款条件和数量，已经变成实际交付。</p>`:''}<p class="brief">${state.feedback?.kind==='curation-paid'?`买手收到的是你选的 ${state.curation.products.length} 种产品、${state.curation.quantity} 套组合。新的采购合作从这份案例开始。`:state.feedback?.kind==='projects-complete'?`三份计划已交付，${projects.filter(p=>p.onTime).length} 份赶上专题。时间花在哪里，留下的客户案例就不同。`:state.phase==='review'?'这一轮由你选的合作已经收齐。下一轮可以深做原来的客户，也可以换个方向。':'三位客户都实际合作过了。现在不用按名单轮流接单，试着把合作做深。'}</p><div class="receipt"><small>累计净赚</small><strong>${money((marketLedger?.net||0)+paid.reduce((n,c)=>n+c.netProfit,0)+(state.supplyPlanHistory||[]).reduce((n,p)=>n+p.netProfit,0)+(state.curationHistory||[]).reduce((n,p)=>n+p.netProfit,0)+(state.accountHistory||[]).reduce((n,p)=>n+p.netProfit,0)+(state.collection?.orders||[]).reduce((n,p)=>n+p.netProfit,0)-(state.collection?.sampleCost||0))}</strong><span>${paid.length+(marketLedger?.receipts.length||0)} 笔订单 · ${(state.supplyPlanHistory||[]).length} 份供货安排 · ${(state.curationHistory||[]).length} 份选品委托${state.accountHistory?.length?' · 1 份连锁采购':''}已收齐 · 第 ${state.day} 天</span></div><button class="primary" data-action="CONTINUE_BUSINESS">${state.phase==='review'?'继续经营':'选择下一笔合作'} <span>→</span></button>`}
 ${!home&&!viewingCase&&!supplyDraft&&['review','complete'].includes(state.phase)&&state.curationHistory?.length?`<aside class="supply-invite"><h3>${state.collection?(state.collection.model==='own'?'工作室自己的系列':'Northline 专用系列'):'客户想把你的组合，做成自己的系列'}</h3><button class="primary" data-action="${state.collection?'OPEN_COLLECTION':'START_COLLECTION'}">${state.collection?'查看系列与买手合作':'看看贴牌合作，或自己出样'} →</button></aside>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&['review','complete'].includes(state.phase)&&state.accountHistory?.length?`<details class="case-gallery"><summary>连锁供货案例 · ${accountCoverage(state)} 家店</summary>${state.accountHistory.map(accountReceipt).join('')}<p>这次净赚 ${money(state.account.netProfit)}</p></details>`:''}
 ${!home&&!supplyDraft&&['review','complete'].includes(state.phase)&&state.curationHistory?.length&&!state.accountHistory?.length?`<aside class="supply-invite"><h3>把买手店案例，递给连锁采购</h3><div class="referral-choices">${(viewingCase?[viewingCase]:state.curationHistory).map(c=>`<button data-account-case="${c.referrerId}"><strong>递出这组 ${c.products.length} 款案例</strong><small>${c.products.map(id=>CURATION_PRODUCTS.find(p=>p.id===id).name).join(' · ')}</small></button>`).join('')}</div></aside>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&['review','complete'].includes(state.phase)&&state.curationHistory?.length?`<details class="case-gallery"><summary>我的买手案例 · ${state.curationHistory.length} 份</summary>${state.curationHistory.map(c=>`<button data-showcase="${c.referrerId}"><strong>${esc(c.buyer)}</strong><small>${c.products.length} 款 · ${c.quantity} 套 · ${c.packaging==='gift'?'礼盒':'常规包装'}</small></button>`).join('')}</details>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&['complete','review'].includes(state.phase)&&referrals.length?`<aside class="supply-invite"><h3>让做过的案例带来新客户</h3><div class="referral-choices">${referrals.map(r=>`<button data-referrer="${r.id}"><strong>${esc(r.referrerName.split(' · ')[0])} 的引荐</strong><small>${r.onTime?'专题选品':'门店补货'} · 从${esc(r.product)}搭起</small></button>`).join('')}</div></aside>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&!state.clientProjectSeason&&state.supplyPlanHistory?.length&&['complete','review'].includes(state.phase)?`<aside class="supply-invite"><h3>熟客的新计划</h3><p>灯光橱窗、城市快闪、餐桌专题。三份用途各有日期，决定先接谁，让你的产品真正亮相。</p><button class="primary" data-action="START_CLIENT_PROJECTS">打开三份客户计划 →</button></aside>`:''}
 ${!home&&!viewingCase&&!supplyDraft&&!roundActive&&career.eligible&&['complete','portfolio','review'].includes(state.phase)?`<aside class="supply-invite"><h3>${state.careerMilestone?'继续接整份供货委托':'客户愿意把下一轮供货交给你'}</h3><p>${esc(career.reason)}不必一批批重复接单，先谈好两批的数量与付款承诺。</p><button class="primary" id="open-supply">看看供货安排 →</button></aside>`:''}
 </section><footer><span>${esc(saveNotice)}</span><button id="motion" aria-pressed="${document.documentElement.classList.contains('reduce-motion')}">减少动态</button></footer>${dealSaveView(savePanel)}`;
 bindSaveTools();

 if(home&&officeAvailable(state)&&!showCareerRecap){
  const place=root.querySelector('.business');
  if(!root.querySelector('#open-office-improvement'))place?.insertAdjacentHTML('beforeend',`<p class="office-entry"><button id="open-office-improvement">${state.officeImprovement?'看看自己的窗边工作室':'给工作室换个布置 · 可选'}</button></p>`);
  if(state.officeImprovement){if(!root.querySelector('#open-office-annex'))place?.insertAdjacentHTML('beforeend',`<p class="office-entry"><button id="open-office-annex">${state.officeAnnex?'去样品会客室':'想要一间样品会客室 · 先参观'}</button></p>`);root.querySelector('#open-office-annex')?.addEventListener('click',()=>{annexOpen=true;annexUI={};render();root.querySelector('[data-annex-close]')?.focus();});}
  root.querySelector('#open-office-improvement')?.addEventListener('click',()=>{officeOpen=true;officeUI={};render();root.querySelector('[data-office-close]')?.focus();});
 }
 if(home&&lifeAvailable(state)&&!showCareerRecap){
  const place=root.querySelector('.business');
  if(!root.querySelector('#open-personal-life'))place?.insertAdjacentHTML('beforeend','<p class="personal-life-entry"><button id="open-personal-life">下班回家 · 可选</button><small>赚到的钱，也可以花在自己的生活里。</small></p>');
  root.querySelector('#open-personal-life')?.addEventListener('click',()=>{personalRoomOpen=true;personalRoomUI={};render();root.querySelector('[data-life-close]')?.focus();});
 }
 if(playback){
  const f=playback.frames[playback.index],plan=state.supplyPlan;
  [...root.children].forEach(el=>el.inert=true);
  root.insertAdjacentHTML('beforeend',`<section class="team-playback" role="dialog" aria-modal="true" aria-label="跟单执行回放"><div class="team-playback-card"><small>第 ${f.day} 天 · ${playback.index+1} / ${playback.frames.length}</small><div class="team-stage step-${esc(f.kind)}"><span class="team-person">跟单</span><div class="team-product">${sampleSvg(plan.clientId==='mira'?'lamp':plan.clientId==='samir'?'cup':'linen')}</div><span class="team-client mini-face" style="--face-x:${['mira','samir','ines'].indexOf(plan.clientId)*50}%"></span></div><h2>${esc(f.title)}</h2><p>${esc(f.detail)}</p><button id="skip-playback">直接看收款结果 →</button></div></section>`);
  const skip=root.querySelector('#skip-playback');skip.onclick=finishPlayback;skip.onkeydown=e=>{if(e.key==='Escape')finishPlayback();};skip.focus({preventScroll:true});
 }
 const openRecap=route=>{showCareerRecap=route;tradeEvidence='chain';event='';render();root.querySelector('.career-recap h3')?.focus();root.querySelector('.career-recap')?.scrollIntoView({block:'nearest'});};
 root.querySelector('#finish-session')?.addEventListener('click',()=>openRecap(true));
 root.querySelector('#finish-trading')?.addEventListener('click',()=>openRecap('trade'));
 root.querySelectorAll('[data-trade-evidence]').forEach(b=>b.onclick=()=>{const key=b.dataset.tradeEvidence;if(!tradeRecap||!['chain','model'].includes(key))return;tradeEvidence=key;render();root.querySelector(`[data-trade-evidence="${key}"]`)?.focus({preventScroll:true});});
 root.querySelector('#resume-work')?.addEventListener('click',()=>{const target=showCareerRecap==='trade'?'#finish-trading':'#finish-session';showCareerRecap=false;tradeEvidence='chain';render();root.querySelector(target)?.focus();});
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
 root.querySelectorAll('[data-career-action]').forEach(b=>b.onclick=()=>{directionsOpen=false;let action={type:b.dataset.careerAction};if(b.dataset.careerDirection)action.direction=b.dataset.careerDirection;if(b.dataset.careerReferrer)action.referrerId=b.dataset.careerReferrer;if(b.dataset.careerClient)action.clientId=b.dataset.careerClient;if(action.type==='OPEN_STUDIO_PROJECT')state=openStudioFromDesk(state,action.direction);else if(action.type==='OPEN_PRODUCT_REORDER'){const opened=openProductReorder(state,b.dataset.careerFactory);state=opened.state;selected=opened.selected;}else state=reduceDealRoom(state,action);growthDraft=null;seriesMode=false;seriesLamp=state.collection?.lampVersion||'standard';growthLampModel='standard';proposalOpen=false;proposalModel='standard';accountOption='pilot';showcaseId=null;event='arriving';save();render();root.querySelector('.business h2')?.scrollIntoView({block:'nearest'});});
 root.querySelectorAll('[data-growth-case]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'OPEN_CASE_GROWTH',referrerId:b.dataset.growthCase});growthDraft=null;seriesMode=false;seriesLamp=state.collection?.lampVersion||'standard';growthLampModel='standard';proposalOpen=false;proposalModel='standard';event='arriving';save();render();});
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
 root.querySelector('#use-desk-plan')?.addEventListener('click',()=>{if(!projectDeskPreview(state,deskPlan.clientId,deskPlan.optionId))return;state=reduceDealRoom(state,{type:'SELECT_CLIENT',clientId:deskPlan.clientId});selected=deskPlan.optionId;event='arriving';save();render();});
 root.querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'SELECT_CLIENT',clientId:b.dataset.client});selected='';event='arriving';save();render();});
 root.querySelector('#opening-inbox-toggle')?.addEventListener('click',()=>{openingInboxOpen=!openingInboxOpen;render();root.querySelector('#opening-inbox-toggle')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-first-buyer]').forEach(b=>b.onclick=()=>{viewedFirstBuyer=b.dataset.firstBuyer;selected='';openingInboxOpen=false;event='choosing';render();root.querySelector('.business h2')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-sample]').forEach(b=>b.onclick=()=>{selected=sampleSelection(b.dataset.sample,selected==='branded'?'restock':'opening',options.some(o=>o.id==='branded-opening'));event='sample-change';renderKeepingChoiceFocus(b,'data-sample');});
 root.querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{const sample=b.dataset.repair==='plain'?'plain':'custom';selected=sample==='plain'?sampleSelection('plain'):sampleSelection('custom','restock');event='sample-change';render();root.querySelector(`[data-sample="${sample}"]`)?.focus({preventScroll:true});});
 root.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=b.dataset.select;event='choosing';renderKeepingChoiceFocus(b,'data-select');});
 root.querySelectorAll('[data-revision-open]').forEach(b=>b.onclick=()=>{revisionOpen=!revisionOpen;renderKeepingChoiceFocus(b,'data-revision-open');});
 root.querySelectorAll('[data-revision-scope]').forEach(b=>b.onclick=()=>{revisionScope=b.dataset.revisionScope;renderKeepingChoiceFocus(b,'data-revision-scope');});
 root.querySelectorAll('[data-revision-sign]').forEach(b=>b.onclick=()=>{state=reduceDealRoom(state,{type:'SIGN_COLLECTION_REVISION',buyerId:b.dataset.buyer,scope:b.dataset.scope});save();render();});
 root.querySelector('[data-shop-shelf-toggle]')?.addEventListener('click',e=>{shopTerms=e.currentTarget.dataset.shopShelfToggle;event='';render();root.querySelector('[data-shop-shelf-toggle]')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-shop-terms]').forEach(b=>b.addEventListener('click',()=>{shopTerms=b.dataset.shopTerms;render();root.querySelector('[data-shop-terms="'+shopTerms+'"]')?.focus();}));
 root.querySelectorAll('[data-stock-mode]').forEach(b=>b.onclick=()=>{stockMode=b.dataset.stockMode;renderKeepingChoiceFocus(b,'data-stock-mode');});
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const previousState=state;let type=b.dataset.action;if(type==='OPEN_STOCK_PROCUREMENT'&&state.phase==='studio-project')state=reduceDealRoom(state,{type:'KEEP_STUDIO_PROJECT'});if(type==='SIGN_CASE_GROWTH'&&growthDraft.products.length===1)type=growthLampModel==='developed'&&growthDraft.products[0]==='mira'&&growthDraft.agreement==='private'?'SIGN_APPROVED_CASE_LAMP':'SIGN_CASE_CALLOFF';if(type==='WAIT_CASE_GROWTH'&&growthDraft.products.length===1)type='WAIT_CASE_CALLOFF';state=reduceDealRoom(state,['SIGN_STUDIO_ALLOCATION','WAIT_STUDIO_ALLOCATION'].includes(type)?{type,allocation:studioAllocation}:type==='RESTORE_GROUP_SPEC'?{type,briefId:b.dataset.briefId}:type==='SIGN_FIRST_CATALOGUE_ORDER'?{type,referrerId:state.caseGrowth.referrerId,lampVersion:seriesLamp}:type==='SIGN_CATALOGUE_ORDER'?{type,lampVersion:seriesLamp}:type==='APPROVE_CASE_LAMP'?{type,model:proposalModel}:type==='SIGN_APPROVED_CASE_LAMP'?{type,terms:growthDraft.terms}:['WAIT_CASE_GROWTH','WAIT_CASE_CALLOFF'].includes(type)?{type,products:growthDraft.products}:['SIGN_CASE_GROWTH','SIGN_CASE_CALLOFF'].includes(type)?{type,...growthDraft}:type==='COMMISSION_SAMPLE'?{type,factory:factoryChoice}:type==='SIGN_COLLECTION_PITCH'?{type,optionId:collectionPitchOption}:type==='SIGN_COLLECTION'?(seedPreview?{type:'SIGN_OWN_COLLECTION_FROM_CASE',referrerId:seedPreview.referrerId,style:collectionDraft.style}:{type,model:collectionDraft.model,style:collectionDraft.style}):type==='SIGN_ACCOUNT'?{type,optionId:accountOption}:type==='PROPOSE'?(quoteState!==state?{type:'PROPOSE_OPENING_QUOTE',clientId:client.id,optionId:selected}:{type,optionId:selected}):type==='SIGN_SHOP_TRIAL'?{type,terms:shopTerms}:type==='SIGN_STOCK_PROCUREMENT'?{type,factoryMode:stockMode}:type==='START_SUPPLY_PLAN'?{type,...supplyDraft}:type==='SIGN_CURATION'?(curationDraft.lampVersion==='developed'?{type:'SIGN_CURATION_SAMPLE',products:curationDraft.products,quantity:curationDraft.quantity,packaging:curationDraft.packaging,lampVersion:'developed'}:{type,products:curationDraft.products,quantity:curationDraft.quantity,packaging:curationDraft.packaging}):{type});if(state!==previousState&&['SIGN_SHOP_TRIAL','SETTLE_SHOP_TRIAL'].includes(type))shopSceneMoment=type==='SIGN_SHOP_TRIAL'?'send':'settle';if(type==='PROPOSE'&&state!==previousState){viewedFirstBuyer=null;openingInboxOpen=false;}if(type==='APPROVE_CASE_LAMP'&&state.caseLampApprovals?.[state.caseGrowth.referrerId]){proposalOpen=false;growthLampModel='developed';growthDraft.products=['mira'];}if(type==='CLOSE_CASE_GROWTH'){growthDraft=null;seriesMode=false;}if(type==='BACK_FROM_CURATION')curationDraft=null;if(['BACK_FROM_COLLECTION','START_COLLECTION'].includes(type))delete collectionDraft.sourceId;if(type==='START_SUPPLY_PLAN'&&state.phase==='planning-fulfillment')supplyDraft=null;save();if(type==='FULFIL_SUPPLY_PLAN'&&state.feedback?.kind==='supply-complete'&&!document.documentElement.classList.contains('reduce-motion')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){playback={frames:supplyPlaybackFrames(state.supplyPlan),index:0};clearTimeout(playbackTimer);playbackTimer=setTimeout(nextPlaybackFrame,1200);}event=['FULFIL_CASE_GROWTH','FULFIL_CURATION','FULFIL_ACCOUNT_EXPANSION','FULFIL_ACCOUNT','FULFIL_COLLECTION'].includes(type)?'shop-received':type==='PROPOSE'?(state.phase==='fulfilling'?'signing':'replying'):['ADVANCE','FULFIL_SUPPLY_PLAN'].includes(type)?'receiving':'arriving';if(state===previousState)event='';else if(state.feedback?.kind==='round-delivered')event='delivering';else if(/-signed$/.test(state.feedback?.kind||''))event='signing';else if(/-paid$/.test(state.feedback?.kind||''))event='receiving';render();const target=root.querySelector(state.feedback?.kind==='counter'?'.counter':'.business h2');if(target&&!playback){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',behavior:'auto'});}});
 root.querySelector('#motion').onclick=()=>{document.documentElement.classList.toggle('reduce-motion');try{localStorage.setItem(SAVE_KEY+':reduced-motion',document.documentElement.classList.contains('reduce-motion')?'1':'0');}catch{}render();root.querySelector('#motion')?.focus({preventScroll:true});};
}
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
 return `<div class="business-gesture gesture-${mode}" aria-hidden="true"><svg viewBox="0 0 180 120" focusable="false"><ellipse class="gesture-shadow" cx="90" cy="108" rx="62" ry="6" fill="#493d32" opacity=".18"/>${mode==='delivery'?'<g class="gesture-parcel"><path d="M35 45 85 22 142 46 92 72z" fill="#dabd85"/><path d="M35 45v44l57 25V72z" fill="#ae8658"/><path d="M92 72v42l50-25V46z" fill="#c49d65"/><path d="m62 33 57 27v21" fill="none" stroke="#f4e2b8" stroke-width="11"/><path d="m106 89 9-4" stroke="#f7ead3" stroke-width="5"/></g>':`<g class="gesture-paper"><path d="M48 12h70l15 16v75H48z" fill="#fff7e8" stroke="#b9a07a" stroke-width="2"/><path d="M118 12v17h15" fill="#e8d4af"/><path d="M61 42h48m-48 10h40m-40 10h44" stroke="#c5b99f" stroke-width="3"/>${mode==='signature'?'<path class="gesture-ink" d="m62 85 12-10-4 14 14-13-3 11 14-5 15 2" fill="none" stroke="#365546" stroke-width="3" stroke-linecap="round"/>':'<g class="gesture-stamp"><circle cx="91" cy="83" r="16" fill="#e3ecdb" stroke="#466a51" stroke-width="2"/><path d="m82 83 6 6 13-14" fill="none" stroke="#466a51" stroke-width="3"/></g>'}</g>${mode==='receipt'?'<g class="gesture-coin"><circle cx="137" cy="54" r="14" fill="#d6ab58" stroke="#fff0be" stroke-width="3"/><path d="m132 47 5 7 5-7m-5 7v8m-6-6h12" fill="none" stroke="#77572c" stroke-width="2"/></g>':''}`}</svg></div>`;
}
