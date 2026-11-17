import test from 'node:test';import assert from 'node:assert/strict';
import {careerProjects} from '../src/deal-room-career-focus.js';
const base=()=>({phase:'review',cash:999999,history:[],contracts:[]});
const source=id=>({status:'paid',referrerId:id,referrerName:id,buyer:'买手店',products:['mira','ines'],packaging:'plain'});
const project=(s,id)=>careerProjects(s).find(p=>p.id===id);
test('signposts derive prerequisites not wealth and never alter state',()=>{const s=base(),before=structuredClone(s);const p=careerProjects(s);assert.equal(p.length,3);assert.deepEqual(p.map(x=>x.id),['stores','series','product']);assert.ok(p.every(x=>!x.done&&!x.actions.length));assert.doesNotMatch(JSON.stringify(p),/刷|攒钱|再赚|资金不足/);assert.deepEqual(s,before);});
test('three delivered stores are progress, six delivered stores complete the project',()=>{let s={...base(),accountHistory:[{stores:3,status:'paid'}]};let p=project(s,'stores');assert.equal(p.done,false);assert.deepEqual(p.actions,[{label:'谈余下三家的采购',type:'OPEN_ACCOUNT_EXPANSION'}]);s.accountHistory.push({stores:3,status:'paid'});p=project(s,'stores');assert.equal(p.done,true);assert.match(p.achievement,/6/);assert.deepEqual(p.actions,[]);});
test('two eligible cases remain player choices rather than selecting a customer',()=>{const s={...base(),curationHistory:[source('mira'),source('ines')],productDevelopment:{status:'active',factory:'studio'}};const stores=project(s,'stores'),product=project(s,'product');assert.deepEqual(stores.actions.map(a=>[a.type,a.referrerId]),[['START_ACCOUNT','mira'],['START_ACCOUNT','ines']]);assert.deepEqual(product.actions.map(a=>[a.type,a.referrerId]),[['OPEN_CASE_GROWTH','mira'],['OPEN_CASE_GROWTH','ines']]);assert.match(product.step,/还没有.*集团合作/);assert.equal(product.done,false);assert.equal(s.caseGrowthHistory,undefined);});
test('private label counts as a delivered series without claiming ownership',()=>{const s={...base(),collection:{status:'complete',model:'private',orders:[{status:'paid',buyer:'Northline',sets:80}]}};const p=project(s,'series');assert.equal(p.done,true);assert.doesNotMatch(p.title,/自有|自己的/);assert.match(p.step,/买方专用/);assert.equal(p.actions[0].type,'OPEN_COLLECTION');assert.equal(project({...s,collection:{status:'production',orders:[]}},'series').done,false);});
test('sample production is not adoption; approval is not delivered product',()=>{let s={...base(),supplyPlanHistory:[{}]};assert.equal(project(s,'product').actions[0].type,'START_DEVELOPMENT');s={...s,productDevelopment:{status:'active',factory:'studio'},curationHistory:[source('mira')],caseGrowthHistory:[{status:'paid',agreement:'private',referrerId:'mira',products:['mira','ines']}],caseLampApprovals:{mira:{model:'developed'}}};const p=project(s,'product');assert.equal(p.done,false);assert.match(p.step,/还要/);assert.equal(p.actions[0].referrerId,'mira');s.caseGrowthHistory.push({status:'paid',agreement:'private',referrerId:'mira',products:['mira'],approvedCaseLamp:true,quantity:60,productNames:['三档调光台灯']});assert.equal(project(s,'product').done,true);assert.match(project(s,'product').achievement,/60 件/);});
test('already developed group source counts, portfolio and unfulfilled contracts do not',()=>{const delivered={agreement:'private',status:'paid',products:['mira'],lampVersion:'developed',quantity:60};assert.equal(project({...base(),caseGrowthHistory:[delivered]},'product').done,true);for(const h of [{...delivered,agreement:'portfolio'},{...delivered,status:'production'},{...delivered,products:['ines']}])assert.equal(project({...base(),caseGrowthHistory:[h]},'product').done,false);});
test('active pages get no misleading shortcuts, standard sample never promises dimming',()=>{const s={...base(),curationHistory:[source('mira')],productDevelopment:{status:'active',factory:'line'},caseGrowthHistory:[{status:'paid',agreement:'private',referrerId:'mira',products:['mira']}]};assert.match(project(s,'product').step,/不能承诺客房调光/);assert.ok(careerProjects({...s,phase:'account'}).every(p=>p.actions.length===0));});
test('volume sample has a reachable paid adoption route instead of an impossible dimming goal',()=>{
 const s={...base(),productDevelopment:{status:'active',factory:'line'}};
 assert.equal(project(s,'product').done,false);assert.deepEqual(project(s,'product').actions,[{type:'OPEN_PRODUCT_REORDER',factory:'line',label:'找 Mira 谈量产样采购'}]);
 const paid={status:'paid',clientId:'mira',specification:'developed-line',quantity:180,product:'暖光标准台灯'};
 assert.equal(project({...s,contracts:[{...paid,status:'fulfilling'}]},'product').done,false);
 const p=project({...s,contracts:[paid]},'product');assert.equal(p.done,true);assert.match(p.achievement,/180 盏.*Mira/);assert.doesNotMatch(p.achievement,/调光|集团/);
});
test('unmet case prerequisite offers an actual path instead of an empty next stage',()=>{
 let s={...base(),supplyPlanHistory:[{}]};assert.equal(project(s,'stores').actions[0].type,'START_CLIENT_PROJECTS');assert.equal(project(s,'series').actions[0].type,'START_CLIENT_PROJECTS');
 s={...s,clientProjectSeason:1,clientProjectActive:false,contracts:[{status:'paid',projectId:'samir',clientId:'samir',clientName:'Samir · Nawa'}]};assert.deepEqual(project(s,'stores').actions,[{type:'START_CURATION',label:'Samir 的买手引荐',clientId:'samir'}]);
 assert.ok(careerProjects({...s,phase:'curating'}).every(p=>!p.actions.length));
});

test('actual paid Mira studio-model delivery completes adoption without inventing group approval',()=>{
 const s={...base(),productDevelopment:{status:'active',factory:'studio'}},paid={clientId:'mira',status:'paid',optionId:'developed-lamp',specification:'developed-studio',quantity:60};
 const before=structuredClone(s),p=project({...s,contracts:[paid]},'product');assert.equal(p.done,true);assert.match(p.achievement,/60 盏.*Mira/);assert.doesNotMatch(p.step+p.achievement,/集团|批准/);assert.deepEqual(s,before);
 for(const c of [{...paid,status:'fulfilling'},{...paid,status:'receivable'},{...paid,specification:'standard'},{...paid,optionId:'repeat-small'},{...paid,clientId:'ines'}])assert.equal(project({...s,contracts:[c]},'product').done,false);
 const line=project({...s,contracts:[{...paid,specification:'developed-line'}]},'product');assert.doesNotMatch(line.achievement,/三档调光/);
});
test('accepted studio sample offers real existing Mira small-batch route, not compulsory group setup',()=>{
 const s={...base(),productDevelopment:{status:'active',factory:'studio'},contracts:[{clientId:'mira',status:'paid',optionId:'trial',specification:'standard'}]},p=project(s,'product');assert.equal(p.done,false);assert.equal(p.actions[0].type,'OPEN_PRODUCT_REORDER');assert.equal(p.actions[0].factory,'studio');assert.match(p.actions[0].label,/Mira.*小批/);assert.match(p.step,/60 盏/);assert.doesNotMatch(p.step,/还需要.*集团|集团.*已批准/);assert.equal(s.caseGrowthHistory,undefined);
 assert.equal(project({...s,phase:'fulfilling'},'product').actions.length,0);
});
test('paid studio adoption recognizes either supplier identity without accepting wrong client, spec or unpaid order',()=>{
 for(const optionId of ['developed-lamp','second-developed-lamp']){
  const s={...base(),productDevelopment:{status:'active',factory:optionId==='developed-lamp'?'studio':'line'},...(optionId==='second-developed-lamp'?{secondSupplier:{status:'active',factory:'studio'}}:{})};
  const paid={clientId:'mira',status:'paid',optionId,specification:'developed-studio',quantity:60};const before=structuredClone(s);
  const p=project({...s,contracts:[paid]},'product');assert.equal(p.done,true);assert.match(p.achievement,/60 盏已交付给 Mira/);assert.deepEqual(p.actions,[]);assert.deepEqual(s,before);
  for(const c of [{...paid,status:'fulfilling'},{...paid,status:'receivable'},{...paid,clientId:'samir'},{...paid,specification:'standard'},{...paid,optionId:'made-up'}])assert.equal(project({...s,contracts:[c]},'product').done,false);
 }
});
test('career signposts report outcomes and next business steps rather than defensive developer explanations',()=>{
 const states=[{...base(),accountHistory:[{stores:3,status:'paid',seriesSource:{label:'原款'}},{stores:3,status:'paid',seriesSource:{label:'潮汐版'}}]},
 {...base(),caseGrowthHistory:[{status:'paid',agreement:'private',products:['mira'],lampVersion:'developed',quantity:60}]},
 {...base(),productDevelopment:{status:'active',factory:'studio'}}];
 for(const s of states){const before=structuredClone(s),text=JSON.stringify(careerProjects(s));assert.doesNotMatch(text,/没有改写首批承诺|不只是获得批准|冒认为集团批准|未验样品不能当作已采用|旧目录不会自动换款/);assert.deepEqual(s,before);}
 assert.match(project(states[0],'stores').achievement,/3店 · 原款；3店 · 潮汐版/);
 assert.match(project(states[1],'product').step,/集团收到.*货款也收齐/);
 assert.match(project(states[2],'product').step,/台灯组合.*介绍集团采购/);
});
