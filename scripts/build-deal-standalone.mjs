import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildDealHtml(){
 const read=async p=>(await readFile(path.join(root,p),'utf8')).replace(/\r\n?/g,'\n');
 const [studioProject,studioView,catalogueOrder,catalogue,focus,caseGrowth,caseGrowthUi,development,demand,home,relationships,collection,account,engine,samples,supply,curation,app]=await Promise.all(['src/deal-room-studio-project.js','src/deal-room-studio-project-view.js','src/deal-room-catalogue-order.js','src/deal-room-design-catalogue.js','src/deal-room-career-focus.js','src/deal-room-case-growth.js','src/deal-room-case-growth-view.js','src/deal-room-development.js','src/deal-room-demand.js','src/deal-room-home.js','src/deal-room-relationships.js','src/deal-room-collection.js','src/deal-room-account.js','src/deal-room-engine.js','src/deal-room-samples.js','src/deal-room-supply-view.js','src/deal-room-curation-view.js','src/deal-room-app.js'].map(read));
 let css=await read('src/deal-room.css')+'\n'+await read('src/deal-room-life.css')+'\n'+await read('src/deal-room-quote-view.css')+'\n'+await read('src/deal-room-office.css');
 for(const [raw,file] of [...css.matchAll(/url\(['"]?(\.\.\/assets\/[^)'" ]+)['"]?\)/g)].map(m=>[m[0],m[1]])){
  const bytes=await readFile(path.join(root,'src',file));css=css.replaceAll(raw,`url(data:image/webp;base64,${bytes.toString('base64')})`);
 }
 const launch=await read('src/deal-room-launch.js'),launchViewSource=await read('src/deal-room-launch-view.js');
 const scopedLaunch=`const {launchBasis,launchReview}=(()=>{${launch.replace(/^export /gm,'')}return {launchBasis,launchReview};})();`;
 const scopedLaunchView=`const {launchInvite,launchView}=(()=>{${launchViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {launchInvite,launchView};})();`;
 const scopedStudioProject=`const {studioProjectEligibility,studioProjectReview,previewStudioProjectOrder,groupProjectChange}=(()=>{${studioProject.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {studioProjectEligibility,studioProjectReview,previewStudioProjectOrder,groupProjectChange};})();`;
 const allocationSource=await read('src/deal-room-allocation.js'),allocationViewSource=await read('src/deal-room-allocation-view.js');
 const scopedAllocation=`const {previewStudioAllocation}=(()=>{${allocationSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {previewStudioAllocation};})();`;
 const scopedAllocationView=`const {allocationReceipt,allocationView}=(()=>{${allocationViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {allocationReceipt,allocationView};})();`;
 const groupUseSource=await read('src/deal-room-group-use-eligibility.js');
 const scopedGroupUse=`const {groupStudioPurchaseEligibility}=(()=>{${groupUseSource.replace(/^export /gm,'')}return {groupStudioPurchaseEligibility};})();`;
 const scopedStudioView=`const {studioProjectInvite,studioProjectView}=(()=>{${studioView.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {studioProjectInvite,studioProjectView};})();`;
 const scopedCatalogueOrder=`const {previewCatalogueOrder,previewFirstCatalogueOrder}=(()=>{${catalogueOrder.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {previewCatalogueOrder,previewFirstCatalogueOrder};})();`;
 const revisionSource=await read('src/deal-room-collection-revision.js'),revisionViewSource=await read('src/deal-room-revision-view.js');
 const scopedRevision=`const {revisionOpportunity,previewRevisionOrder,revisionCatalogueVersion}=(()=>{${revisionSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {revisionOpportunity,previewRevisionOrder,revisionCatalogueVersion};})();`;
 const revisionRelationshipsSource=await read('src/deal-room-revision-relationships.js');
 const scopedRevisionRelationships=`const {revisionRelationships,revisionRelationshipsView}=(()=>{${revisionRelationshipsSource.replace(/^export /gm,'')}return {revisionRelationships,revisionRelationshipsView};})();`;
 const scopedRevisionView=`const {revisionInvite,revisionView,revisionArt}=(()=>{${revisionViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {revisionInvite,revisionView,revisionArt};})();`;
 const scopedCatalogue=`const {catalogueVersions,catalogueProposal}=(()=>{${catalogue.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {catalogueVersions,catalogueProposal};})();`;
 const scopedCaseGrowth=`const {caseGrowthOffers,previewCaseGrowth,caseGrowthDemand,previewCaseCalloff,canCalloffCase,caseCalloffConsequence,canProposeCaseLamp,previewApprovedCaseLamp}=(()=>{${caseGrowth.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {caseGrowthOffers,previewCaseGrowth,caseGrowthDemand,previewCaseCalloff,canCalloffCase,caseCalloffConsequence,canProposeCaseLamp,previewApprovedCaseLamp};})();`;
 const scopedCaseGrowthUi=`const {caseGrowthInvite,caseGrowthView,caseClientLabel}=(()=>{${caseGrowthUi.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {caseGrowthInvite,caseGrowthView,caseClientLabel};})();`;
 const scopedDevelopment=`const {SAMPLE_FACTORIES,developmentOffer,developmentView,hasLampDevelopmentCase,acceptedLampSample,secondDevelopmentOffer,SECOND_SUPPLIER_ACTIONS,canonicalSecondSupplierAction,applySecondSupplierAction}=(()=>{${development.replace(/^export /gm,'')} return {SAMPLE_FACTORIES,developmentOffer,developmentView,hasLampDevelopmentCase,acceptedLampSample,secondDevelopmentOffer,SECOND_SUPPLIER_ACTIONS,canonicalSecondSupplierAction,applySecondSupplierAction};})();`;
 const scopedDemand=`const {retailDemand,retailWait,demandView,buyerWaitView}=(()=>{${demand.replace(/^export /gm,'')} return {retailDemand,retailWait,demandView,buyerWaitView};})();`;
 const scopedCollection=`const {collectionQuote,collectionView,COLLECTION_STYLES,collectionPitchOffers,previewCollectionPitch,collectionPitchView,collectionSeedChoices,selectedCollectionSeed}=(()=>{${collection.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {collectionQuote,collectionView,COLLECTION_STYLES,collectionPitchOffers,previewCollectionPitch,collectionPitchView,collectionSeedChoices,selectedCollectionSeed};})();`;
 const scopedRelationships=`const {buyerContact,collectionBoardView,collectionRelations,collectionReceipt}=(()=>{${relationships.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {buyerContact,collectionBoardView,collectionRelations,collectionReceipt};})();`;
 const scopedAccount=`const {previewAccount,accountView,accountReceipt,accountCoverage,canExpandAccount,accountCollectionBasis,accountRevisionBasis,accountSeriesReceipt,accountExpansionBases,accountHandover,paidSeriesStoreOrders}=(()=>{${account.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {previewAccount,accountView,accountReceipt,accountCoverage,canExpandAccount,accountCollectionBasis,accountRevisionBasis,accountSeriesReceipt,accountExpansionBases,accountHandover,paidSeriesStoreOrders};})();`;
 const scopedFocus=`const {careerProjects,openProductReorder}=(()=>{${focus.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {careerProjects,openProductReorder};})();`;
 const cooperation=await read('src/deal-room-cooperation.js'),cooperationViewSource=await read('src/deal-room-cooperation-view.js');
 const atelierRestockSource=await read('src/deal-room-atelier-restock.js');
 const scopedAtelierRestock=`const {ATELIER_RESTOCK_ACTIONS,canonicalAtelierRestock,applyAtelierRestock,atelierRestockBasis,atelierRestockProfit,atelierRestockInvite,atelierRestockView}=(()=>{${atelierRestockSource.replace(/^export /gm,'')}return {ATELIER_RESTOCK_ACTIONS,canonicalAtelierRestock,applyAtelierRestock,atelierRestockBasis,atelierRestockProfit,atelierRestockInvite,atelierRestockView};})();`;
 const tradeChapterSource=await read('src/deal-room-trading-chapter.js');
 const scopedTradingChapter=`const {tradingChapter,tradingChapterView,tradingChapterVisual}=(()=>{${tradeChapterSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {tradingChapter,tradingChapterView,tradingChapterVisual};})();`;
 const scopedCooperation=`const {cooperationChapter}=(()=>{${cooperation.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {cooperationChapter};})();`;
 const scopedCooperationView=`const {cooperationView}=(()=>{${cooperationViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {cooperationView};})();`;
 const stockSource=await read('src/deal-room-stock-procurement.js'),stockViewSource=await read('src/deal-room-stock-view.js');
 const scopedStock=`const {stockProcurementOpportunity,previewStockProcurement,previewStudioProjectFromStock,stockProcurementAccounting}=(()=>{${stockSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {stockProcurementOpportunity,previewStockProcurement,previewStudioProjectFromStock,stockProcurementAccounting};})();`;
 const scopedStockView=`const {stockProcurementInvite,stockProcurementView,stockStudioOption}=(()=>{${stockViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {stockProcurementInvite,stockProcurementView,stockStudioOption};})();`;
 const scopedHome=`const {businessHomeView,careerRecap,careerRecapView,projectDeskView,projectDeskPreview}=(()=>{${home.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {businessHomeView,careerRecap,careerRecapView,projectDeskView,projectDeskPreview};})();`;
 const scopedSupply=`const {supplyDraftView,supplyLotsView,supplyPlaybackFrames}=(()=>{${supply.replace(/^export /gm,'')} return {supplyDraftView,supplyLotsView,supplyPlaybackFrames};})();`;
 const scopedCuration=`const {curationView,curationReceiptView,businessFeedback,playerStatusText,curationDemoModel,curationDemoView,toggleCurationProduct}=(()=>{${curation.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {curationView,curationReceiptView,businessFeedback,playerStatusText,curationDemoModel,curationDemoView,toggleCurationProduct};})();`;
 const saveSource=await read('src/deal-room-save.js'),saveViewSource=await read('src/deal-room-save-view.js');
 const scopedSave=`const {DEAL_SAVE_KEY,DEAL_BACKUP_MAX_BYTES,encodeDealBackup,parseDealBackup,loadDealSave,saveDealProgress,restoreDealBackup}=(()=>{${saveSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {DEAL_SAVE_KEY,DEAL_BACKUP_MAX_BYTES,encodeDealBackup,parseDealBackup,loadDealSave,saveDealProgress,restoreDealBackup};})();`;
 const scopedSaveView=`const {dealSaveView,bindDealSaveTools}=(()=>{${saveViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {dealSaveView,bindDealSaveTools};})();`;
 const atlas=await readFile(path.join(root,'assets/deal-products-v1.webp'));
 const roundSource=await read('src/deal-room-round-receivables.js'),roundViewSource=await read('src/deal-room-round-view.js');
 const scopedRound=`const {roundReceivablesActive,roundReceivableSummary,previewRoundSigning,advanceRoundTime}=(()=>{${roundSource.replace(/^export /gm,'')} return {roundReceivablesActive,roundReceivableSummary,previewRoundSigning,advanceRoundTime};})();`;
 const scopedRoundView=`const {roundCashView,roundProductionView,roundQuoteNote}=(()=>{${roundViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')} return {roundCashView,roundProductionView,roundQuoteNote};})();`;
 const lifeSource=await read('src/deal-room-life.js'),lifeViewSource=await read('src/deal-room-life-view.js');
 const scopedLife=`const {LIFE_ACTION_KEYS,LIFE_ITEMS,lifeAvailable,lifePurchasePreview,canonicalLifeAction,applyLifeAction,lifeReadingLampBasis,lifeCatalogue,lifeLightLevel}=(()=>{${lifeSource.replace(/^export /gm,'')}return {LIFE_ACTION_KEYS,LIFE_ITEMS,lifeAvailable,lifePurchasePreview,canonicalLifeAction,applyLifeAction,lifeReadingLampBasis,lifeCatalogue,lifeLightLevel};})();`;
 const lifeArtSource=await read('src/deal-room-life-art.js');
 const scopedLifeArt=`const {paintedLifeRoomArt}=(()=>{${lifeArtSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {paintedLifeRoomArt};})();`;
 const scopedLifeView=`const {lifeRoomView,bindLifeRoom}=(()=>{${lifeViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {lifeRoomView,bindLifeRoom};})();`;
 const quoteViewSource=await read('src/deal-room-quote-view.js');
 const scopedQuoteView=`const {quoteOptionExplanation,quoteCommitmentView,quoteBuyerBrief}=(()=>{${quoteViewSource.replace(/^export /gm,'')}return {quoteOptionExplanation,quoteCommitmentView,quoteBuyerBrief};})();`;
 const officeSource=await read('src/deal-room-office.js'),officeViewSource=await read('src/deal-room-office-view.js');
 const scopedOffice=`const {OFFICE_ACTION_KEYS,OFFICE_IMPROVEMENT,officeAvailable,officePreview,canonicalOfficeAction,applyOfficeAction,officeCompletedWork}=(()=>{${officeSource.replace(/^export /gm,'')}return {OFFICE_ACTION_KEYS,OFFICE_IMPROVEMENT,officeAvailable,officePreview,canonicalOfficeAction,applyOfficeAction,officeCompletedWork};})();`;
 const scopedOfficeView=`const {officeImprovementView,bindOfficeImprovement}=(()=>{${officeViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {officeImprovementView,bindOfficeImprovement};})();`;
 const annexSource=await read('src/deal-room-annex.js'),annexViewSource=await read('src/deal-room-annex-view.js');
 const scopedAnnex=`const {ANNEX_PRICE,ANNEX_ACTION_KEYS,annexSamples,annexPreview,canonicalAnnexAction,applyAnnexAction}=(()=>{${annexSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {ANNEX_PRICE,ANNEX_ACTION_KEYS,annexSamples,annexPreview,canonicalAnnexAction,applyAnnexAction};})();`;
 const scopedAnnexView=`const {annexView,bindAnnex}=(()=>{${annexViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {annexView,bindAnnex};})();`;
 const spendingSource=await read('src/deal-room-spending.js');
 const scopedSpending=`const {spendingLiquidity,spendingLiquidityView}=(()=>{${spendingSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {spendingLiquidity,spendingLiquidityView};})();`;
 const shopSource=await read('src/deal-room-shop-trial.js');
 const scopedShop=`const {SHOP_TRIAL_ACTIONS,canonicalShopTrialAction,shopTrialAvailable,previewShopTrial,applyShopTrialAction,shopTrialAccounting,shopTrialInvite,shopTrialView,shopShelfScene}=(()=>{${shopSource.replace(/^export /gm,'')}return {SHOP_TRIAL_ACTIONS,canonicalShopTrialAction,shopTrialAvailable,previewShopTrial,applyShopTrialAction,shopTrialAccounting,shopTrialInvite,shopTrialView,shopShelfScene};})();`;
 const exhibitionSource=await read('src/deal-room-exhibition.js'),exhibitionViewSource=await read('src/deal-room-exhibition-view.js');
 const scopedExhibition=`const {EXHIBITION_THEMES,EXHIBITION_NOTES,EXHIBITION_ACTION_KEYS,exhibitionAvailable,exhibitionWorks,canonicalExhibitionAction,applyExhibitionAction}=(()=>{${exhibitionSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {EXHIBITION_THEMES,EXHIBITION_NOTES,EXHIBITION_ACTION_KEYS,exhibitionAvailable,exhibitionWorks,canonicalExhibitionAction,applyExhibitionAction};})();`;
 const scopedExhibitionView=`const {exhibitionView,bindExhibition}=(()=>{${exhibitionViewSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}return {exhibitionView,bindExhibition};})();`;
 let script=[scopedAtelierRestock,scopedShop,scopedExhibition,scopedExhibitionView,scopedSpending,scopedAnnex,scopedAnnexView,scopedOffice,scopedOfficeView,scopedQuoteView,scopedLife,scopedLifeArt,scopedLifeView,scopedRevision,scopedRevisionRelationships,scopedRevisionView,scopedRound,scopedRoundView,scopedCatalogue,scopedCaseGrowth,scopedLaunch,scopedLaunchView,scopedStudioProject,scopedAllocation,scopedAllocationView,scopedStock,scopedStockView,scopedGroupUse,scopedStudioView,scopedCatalogueOrder,scopedCaseGrowthUi,scopedDevelopment,scopedDemand,scopedCollection,scopedRelationships,scopedAccount,scopedFocus,scopedCooperation,scopedCooperationView,scopedTradingChapter,scopedHome,engine,scopedSave,scopedSaveView,samples,scopedSupply,scopedCuration,app].map(s=>s.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n').replaceAll('assets/deal-products-v1.webp',`data:image/webp;base64,${atlas.toString('base64')}`).replaceAll('trade-tycoon:deal-room:v1','trade-tycoon:deal-room-offline:v1').replace(/<\/script/gi,'<\\/script');
 for(const name of ['deal-life-folding.webp','deal-life-furniture.webp','deal-life-empty.webp'])script=script.replaceAll('assets/'+name,'data:image/webp;base64,'+(await readFile(path.join(root,'assets',name))).toString('base64'));
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>再开一单就下班 · 贸易工作室</title><style>${css}</style></head><body><main id="deal-room"></main><script>${script}</script></body></html>`;
}
export function modernManifest(html){
 const sha256=createHash('sha256').update(html).digest('hex');
 return {title:'再开一单就下班',edition:'modern-trade-workshop',channel:'development-candidate',entry:'再开一单就下班-开发候选.html',sha256,buildId:sha256.slice(0,12),bytes:Buffer.byteLength(html),saveKey:'trade-tycoon:deal-room-offline:v1',backupFormat:'deal-room',networkAssetsRequired:false,targetDeviceVerification:'Windows offline not yet verified'};
}
export const modernReadme=`再开一单就下班 · 现代外贸工作室 · 开发候选

打开同目录“再开一单就下班-开发候选.html”。这是现代外贸工作室，不是旧港口版，也不是可上架正式版。无需安装，图片和脚本在 HTML 内。

进度保存在当前浏览器与文件位置下，不会同步在线版。继续使用同一浏览器、同一位置；更新、移动文件或清理浏览器之前，先在“备份与恢复”下载自己的 JSON 备份。无痕模式或拒绝存储可能使进度无法保留，遇到保存警告请先保全备份。

恢复：把自己导出 JSON 的完整文本粘贴到恢复框，先查看内容，核对日期和资金后再确认。旧港口存档不兼容，不要改格式硬导入。恢复后可“取回恢复前进度”；异常原件单独保留，不会冒充有效存档。

“版本信息.json”的 SHA-256 与字节数只用来核对 HTML 身份，不代表设备兼容或游戏质量已验收。本包尚未完成 Windows 目标机离线打开、续档和恢复验证。

正式在线站、旧港口包与旧存档不由本包改动。
`;
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=path.resolve(process.argv[2]||path.join(root,'artifacts/deal-room'));await mkdir(dir,{recursive:true});const html=await buildDealHtml(),manifest=modernManifest(html),out=path.join(dir,manifest.entry);await writeFile(out,html);await writeFile(path.join(dir,'版本信息.json'),JSON.stringify(manifest,null,2)+'\n');await writeFile(path.join(dir,'先读我.txt'),modernReadme);console.log(out);
}
