// Independent QA fixtures, constructed solely through normal canonical actions.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../../src/deal-room-engine.js';
import {encodeDealBackup} from '../../src/deal-room-save.js';
const seed=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/deal-group-day169-actions.json',import.meta.url)));
const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,type);return n;};
let s=seed.reduce((s,a)=>reduceDealRoom(s,a),createDealRoom());for(const type of ['CLOSE_STUDIO_PROJECT','OPEN_STOCK_PROCUREMENT'])s=act(s,type);s=act(s,'SIGN_STOCK_PROCUREMENT',{factoryMode:'batch'});for(const type of ['FULFIL_STOCK_PROCUREMENT','CLOSE_STOCK_PROCUREMENT'])s=act(s,type);
const out=process.argv[2]||'/tmp/shop-trial-qa';fs.mkdirSync(out,{recursive:true});
function save(name,state){assert.deepEqual(normalizeDealRoom(state),state);fs.writeFileSync(path.join(out,name+'.json'),encodeDealBackup(state));console.log(name, 'day',state.day,'cash',state.cash,'stock',state.stockProcurement.remaining);}
save('01-home-48-lamps',s);s=act(s,'OPEN_SHOP_TRIAL');save('02-preview-no-charge',s);
for(const terms of ['regular','shelf']){let branch=act(s,'SIGN_SHOP_TRIAL',{terms});save('03-'+terms+'-reserved',branch);branch=act(act(branch,'SETTLE_SHOP_TRIAL'),'CLOSE_SHOP_TRIAL');save('04-'+terms+'-settled',branch);branch=act(branch,'OPEN_STUDIO_PROJECT',{direction:'independent'});branch=act(branch,'REVISE_STUDIO_PROJECT');branch=act(branch,'SET_STUDIO_PROJECT',{field:'lampVersion',value:'developed'});branch=act(branch,'REVIEW_STUDIO_PROJECT');save('05-'+terms+'-forty-set-order',branch);}
