import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,clientProjects,businessOpportunities,previewOffer,careerOpportunity,curationOffers} from '../src/deal-room-engine.js';
const a=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
const base=()=>{let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});return a(s,'FULFIL_SUPPLY_PLAN');};
const begin=()=>a(base(),'START_CLIENT_PROJECTS');
test('客户项目显式启动且仅一次；旧日志原样可恢复',()=>{
 const old=base();assert.deepEqual(normalizeDealRoom(old),old);const s=begin();assert.equal(clientProjects(s).length,3);assert.equal(a(s,'START_CLIENT_PROJECTS'),s);assert.equal(careerOpportunity(s).eligible,false);assert.deepEqual(normalizeDealRoom(s),s);assert.equal(a(createDealRoom(),'START_CLIENT_PROJECTS').clientProjectSeason,undefined);
});
test('先后顺序真实改变用途与报价；已签合同锁定',()=>{
 const s=begin(),early=a(s,'SELECT_CLIENT',{clientId:'samir'}),q=previewOffer(early,'project-series');assert.equal(q.projectOnTime,true);assert.equal(q.revenue,5200);
 const after=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'project-series');const late=a(after,'SELECT_CLIENT',{clientId:'samir'}),ql=previewOffer(late,'project-series');assert.equal(ql.projectOnTime,false);assert.equal(ql.revenue,4600);
 const signed=a(early,'PROPOSE',{optionId:'project-series'});assert.equal(a(signed,'BACK_TO_CLIENTS'),signed);const paid=a(signed,'ADVANCE');assert.equal(paid.contracts.at(-1).revenue,5200);assert.equal(paid.contracts.at(-1).projectOnTime,true);
});
test('每客户仅一计划；完成后留下实际专题与补货结果，不无限再刷',()=>{
 let s=begin();for(const id of ['mira','samir','ines']){s=finish(a(s,'SELECT_CLIENT',{clientId:id}),'project-series');assert.deepEqual(normalizeDealRoom(s),s);if(s.phase==='portfolio')assert.equal(businessOpportunities(s).find(x=>x.id===id).available,false);}
 assert.equal(s.phase,'review');assert.equal(s.clientProjectActive,false);assert.equal(a(s,'START_CLIENT_PROJECTS'),s);assert.equal(clientProjects(s).filter(p=>p.completed).length,3);assert.equal(clientProjects(s).filter(p=>p.onTime).length,1);
});
test('用途覆盖与总利润存在可见取舍，不是大单路线全面压倒',()=>{
 const routes=[];for(const ids of [['mira','samir','ines'],['mira','ines','samir'],['samir','mira','ines'],['samir','ines','mira'],['ines','mira','samir'],['ines','samir','mira']])for(let mask=0;mask<8;mask++){
 let s=begin(),cash=s.cash;for(let i=0;i<3;i++)s=finish(a(s,'SELECT_CLIENT',{clientId:ids[i]}),mask&(1<<i)?'project-series':'project-focus');routes.push({net:s.cash-cash,cases:clientProjects(s).filter(p=>p.onTime).length});}
 const all=routes.filter(r=>r.cases===3);assert.ok(all.length);assert.ok(Math.max(...routes.map(r=>r.net))>Math.max(...all.map(r=>r.net)));
});
test('签约前公开对其他专题的影响，过期说明不再承诺保开场',()=>{
 const s=a(begin(),'SELECT_CLIENT',{clientId:'mira'});assert.match(previewOffer(s,'project-series').opportunityNote,/城市快闪开场、周末餐桌专题只能/);assert.match(previewOffer(s,'project-focus').opportunityNote,/仍有/);
 const next=finish(s,'project-series'),samir=businessOpportunities(next).find(x=>x.id==='samir');assert.match(samir.consequence,/门店日常补货/);assert.doesNotMatch(samir.consequence,/现货保住/);
});

test('末项不捏造后续机会，已经错过的专题不归咎当前选择',()=>{
 let s=finish(a(begin(),'SELECT_CLIENT',{clientId:'mira'}),'project-series');s=a(s,'SELECT_CLIENT',{clientId:'samir'});assert.doesNotMatch(previewOffer(s,'project-focus').opportunityNote,/这单收齐后/);s=finish(s,'project-series');s=a(s,'SELECT_CLIENT',{clientId:'ines'});assert.match(previewOffer(s,'project-focus').opportunityNote,/都落地/);assert.doesNotMatch(previewOffer(s,'project-focus').opportunityNote,/仍有其他/);
});

test('专题做完一项可暂停，用已有案例与普通订单，不重置专题日期',()=>{
 let s=finish(a(begin(),'SELECT_CLIENT',{clientId:'mira'}),'project-focus');const start=s.clientProjectSeason.startDay,records=structuredClone(s.contracts),cash=s.cash,day=s.day;
 s=a(s,'PAUSE_CLIENT_PROJECTS');assert.equal(s.phase,'review');assert.equal(s.clientProjectActive,false);assert.equal(s.cash,cash);assert.equal(s.day,day);assert.deepEqual(s.contracts,records);assert.equal(curationOffers(s).some(p=>p.id==='mira'),true);
 assert.equal(a(s,'PAUSE_CLIENT_PROJECTS'),s);assert.equal(a(s,'START_CLIENT_PROJECTS'),s);
 s=a(s,'CONTINUE_BUSINESS');s=a(s,'SELECT_CLIENT',{clientId:'mira'});s=finish(s,'repeat-small');assert.equal(s.contracts.at(-1).projectId,undefined);
 if(s.phase==='portfolio')s=a(s,'BACK_FROM_CLIENTS');
 const later=s.day;s=a(s,'RESUME_CLIENT_PROJECTS');assert.equal(s.phase,'portfolio');assert.equal(s.clientProjectActive,true);assert.equal(s.clientProjectSeason.startDay,start);assert.equal(s.day,later);assert.equal(clientProjects(s).filter(p=>p.completed).length,1);assert.deepEqual(normalizeDealRoom(s),s);
});
test('专题暂停不撤销已签合同，恢复不能重开已完成季',()=>{
 const initial=begin(),neg=a(initial,'SELECT_CLIENT',{clientId:'mira'}),signed=a(neg,'PROPOSE',{optionId:'project-focus'});assert.equal(a(neg,'PAUSE_CLIENT_PROJECTS'),neg);assert.equal(a(signed,'PAUSE_CLIENT_PROJECTS'),signed);assert.equal(a(initial,'RESUME_CLIENT_PROJECTS'),initial);assert.equal(a(base(),'RESUME_CLIENT_PROJECTS').clientProjectSeason,undefined);
 let done=initial;for(const id of ['mira','samir','ines'])done=finish(a(done,'SELECT_CLIENT',{clientId:id}),'project-focus');assert.equal(a(done,'RESUME_CLIENT_PROJECTS'),done);assert.deepEqual(normalizeDealRoom(done),done);
});

test('工作室显示剩余专题数量和真实恢复入口',async()=>{
 const {businessHomeView}=await import('../src/deal-room-home.js');
 const s=a(finish(a(begin(),'SELECT_CLIENT',{clientId:'mira'}),'project-focus'),'PAUSE_CLIENT_PROJECTS');
 const html=businessHomeView(s,{career:careerOpportunity(s),referrals:curationOffers(s)});
 assert.match(html,/还有 2 项未完成/);assert.match(html,/data-action="RESUME_CLIENT_PROJECTS"/);
});
