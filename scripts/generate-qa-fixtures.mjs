// Normal reducer actions only: repeatable author/independent QA starting points.
// This script never writes browser storage or touches a player's save.
import {mkdir,writeFile} from 'node:fs/promises';
import {createGame,reduce,offers,nextStory,canStart} from '../src/engine.js';
import {isWeekend} from '../src/calendar.js';
const directory=new URL('../artifacts/qa-fixtures-v09/',import.meta.url);await mkdir(directory,{recursive:true});
for(const gender of ['male','female']){
 let state=createGame(gender==='male'?'海边来信':'晚风记事',gender),actions=[];
 function act(a){const r=reduce(state,a);if(!r.changed)throw Error(JSON.stringify(a)+': '+r.message);state=r.state;actions.push(a);}
 function chapters(stop){let e;while((e=nextStory(state))&&e.id!==stop){const preferred={first_credit:'together',first_contract:'pilot',direction:'brand',deadline:'reserve',team:'team',partnership:'regional',aftercare:'fieldcheck',legacy:'share'};act({type:'story',id:e.id,choice:preferred[e.id]});}}
 async function save(name){await writeFile(new URL(name+'-'+gender+'.json',directory),JSON.stringify(state,null,2));await writeFile(new URL(name+'-'+gender+'-actions.json',directory),JSON.stringify(actions,null,2));}
 for(let day=0;day<14;day++){
  chapters(state.startupOrders===2?'deadline':null);
  if(canStart(state)){act({type:'startup'});chapters();}
  if(isWeekend(state))act({type:'weekend-work'});
  const o=offers(state)[0];act({type:'accept',id:o.id});act({type:'tactic',id:o.need});act({type:'factory',id:'steady'});act({type:'ship',id:o.need==='speed'?'express':'qc'});
  if(state.startupOrders!==2)chapters();
  if(state.startupOrders===2){act({type:'evening'});act({type:'rest'});await save('early-founder-weekend');continue;}
  if(state.startupOrders===8){await save('late-founder');break;}
  act({type:'evening'});act({type:'rest'});
 }
}
console.log('Created normal-action QA saves and their reproducible action histories.');
