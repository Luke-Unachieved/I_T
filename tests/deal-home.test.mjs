import test from 'node:test';import assert from 'node:assert/strict';import {businessHomeView,careerRecap,careerRecapView,careerFocusView} from '../src/deal-room-home.js';
const state={contracts:[{status:'paid',netProfit:100}],curationHistory:[{referrerId:'mira',buyer:'Atelier',products:['mira','samir'],quantity:60,netProfit:200}],collection:{model:'own',sampleCost:30,orders:[{netProfit:70}]}};
const context={career:{eligible:true,reason:'已可谈供货'},referrals:[{id:'samir',referrerName:'Samir · Nawa',product:'杯',onTime:false,buyer:'Northline · 连锁门店采购'}]};
test('home presents actual business routes once, not a mandatory next task stack',()=>{const html=businessHomeView(state,context);assert.equal((html.match(/data-action="CONTINUE_BUSINESS"/g)||[]).length,1);assert.equal((html.match(/id="open-supply"/g)||[]).length,1);assert.match(html,/data-action="OPEN_COLLECTION"/);assert.match(html,/data-referrer="samir"/);assert.match(html,/data-account-case="mira"/);assert.match(html,/¥340/);assert.match(html,/合作档案/);});
test('early work does not pretend later routes are unlocked and explains the real prerequisite',()=>{const html=businessHomeView({contracts:[]},{career:{eligible:false,reason:'同一客户两次返单'},referrals:[]});assert.doesNotMatch(html,/START_COLLECTION|OPEN_COLLECTION|open-supply|data-account-case/);assert.match(html,/同一客户两次返单/);});
test('completed chain procurement becomes an archive rather than a duplicate invitation',()=>{const completed={...state,accountHistory:[{netProfit:300,stores:3,products:['mira','samir'],sets:300,deliveryDay:100,paymentDay:102}],account:{stores:3,products:['mira','samir'],sets:300,deliveryDay:100,paymentDay:102}};const html=businessHomeView(completed,context);assert.doesNotMatch(html,/data-account-case/);assert.match(html,/连锁已供 3 店/);assert.match(html,/¥640/);});

test('recap derives actual work without invented promotions, returns or new state',()=>{const s={day:132,cash:45080,contracts:[{clientId:'mira',status:'paid'},{clientId:'mira',status:'paid'},{clientId:'samir',status:'fulfilling'}],collection:{model:'own',orders:[{scope:'buyer-sleeve'}]},accountHistory:[],curationHistory:[]};const before=JSON.stringify(s),r=careerRecap(s);assert.equal(r.clients,1);assert.equal(r.paid,2);assert.equal(r.openDesign,true);assert.match(r.designs,/原稿留下/);assert.match(careerRecapView(s),/可用资金 ¥45,080/);assert.equal(JSON.stringify(s),before);});
test('private and exclusive design recap does not falsely claim free reuse',()=>{for(const collection of [{model:'private',orders:[{}]},{model:'own',exclusiveBuyer:'northline',orders:[{}]}]){const r=careerRecap({...state,day:1,cash:5000,collection});assert.equal(r.openDesign,false);}});

test('home net includes separately disclosed retail waiting office expense',()=>{assert.match(businessHomeView({...state,retailOperatingCost:60},context),/¥280/);});

test('case customer earnings subtract separately recorded waiting expense',()=>{assert.match(businessHomeView({...state,caseGrowthHistory:[{netProfit:1900}],caseGrowthOperatingCost:90},context),/¥2,150/);});

test('focused series next step is before optional ordinary business and completed projects do not invent new goals',()=>{
 const current={phase:'review',contracts:[],curationHistory:[{status:'paid',referrerId:'mira',products:['mira']}],collection:{status:'sample',model:'own',orders:[]}};const html=businessHomeView(current,{career:{eligible:false,reason:''},referrals:[],focus:'series'});assert.ok(html.indexOf('data-career-action="OPEN_COLLECTION"')<html.indexOf('class="other-business"'));assert.match(html,/样品已经备好/);assert.match(html,/<details class="other-business" >/);assert.doesNotMatch(careerFocusView(current,'series'),/再赚|再完成两单/);
 const complete={...current,accountHistory:[{stores:6}],caseGrowthHistory:[{status:'paid',agreement:'private',products:['mira'],approvedCaseLamp:true,quantity:60}],collection:{...current.collection,orders:[{status:'paid',buyer:'Atelier'}]}};const view=careerFocusView(complete,'series');assert.match(view,/这几项合作已经做成/);assert.doesNotMatch(view,/可以换个方向/);assert.match(view,/data-career-action="OPEN_COLLECTION"/);
});

test('opening deliveries offer one optional assortment before repeat supply, without inventing paid cases',async()=>{
 const {createDealRoom,reduceDealRoom}=await import('../src/deal-room-engine.js');let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const action of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,action);
 const html=businessHomeView(s,{career:{eligible:false,reason:'供货尚待返单'},referrals:[]});assert.match(html,/第一份选品委托/);assert.equal((html.match(/data-opening-referrer=/g)||[]).length,3);assert.ok(html.indexOf('data-opening-referrer')<html.indexOf('CONTINUE_BUSINESS'));assert.match(html,/<details class="other-business" >/);assert.doesNotMatch(html,/已交付案例|data-account-case/);
});


test('unused sources for one actual buyer are product choices, not additional customers',()=>{
 const s={contracts:[],curationHistory:[{referrerId:'mira',status:'paid',buyer:'Atelier · 生活方式买手店',products:['mira','samir'],quantity:40,netProfit:100}]};
 const referrals=[{id:'samir',referrerName:'Samir · Nawa',product:'保温杯',buyer:'Atelier · 生活方式买手店'},{id:'ines',referrerName:'Inês · Casa',product:'棉麻桌布',buyer:'Atelier · 生活方式买手店'}];
 const before=structuredClone(s),html=businessHomeView(s,{career:{eligible:false,reason:''},referrals});
 assert.equal((html.match(/Atelier · 再做组合/g)||[]).length,1);
 assert.equal((html.match(/买手组合选品/g)||[]).length,1);
 for(const id of ['samir','ines'])assert.equal((html.match(new RegExp(`data-referrer="${id}"`,'g'))||[]).length,1);
 assert.match(html,/主推 保温杯/);assert.match(html,/主推 棉麻桌布/);assert.match(html,/来源：Samir 的已交付案例/);
 assert.doesNotMatch(html,/案例带来的新客户|份引荐可谈/);assert.deepEqual(s,before);
 // No nested disclosure per referrer or per buyer.
 assert.match(html,/<section class="business-route"><small>买手组合选品/);
});
test('buyer groups keep separate actual companies and require paid combinations before claiming repeat work',()=>{
 const referrals=[{id:'samir',referrerName:'Samir',product:'杯',buyer:'Atelier · 生活方式买手店'},{id:'ines',referrerName:'Inês',product:'布',buyer:'Northline · 连锁门店采购'}];
 const s={contracts:[],curationHistory:[{status:'production',buyer:'Atelier · 生活方式买手店',products:['samir'],netProfit:0}]};
 const html=businessHomeView(s,{career:{eligible:false,reason:''},referrals});
 assert.match(html,/Atelier · 洽谈组合/);assert.match(html,/Northline · 洽谈组合/);assert.doesNotMatch(html,/再做组合/);
 assert.equal((html.match(/买手组合选品/g)||[]).length,2);
});
