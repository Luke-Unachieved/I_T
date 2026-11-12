import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceArtwork,productArtwork,personalArtwork,familiarPortrait} from '../src/visuals.js';
import {createGame,reduce} from '../src/engine.js';
test('visual selectors do not invent business growth or change progress',()=>{
 const s=createGame();const before=JSON.stringify(s);assert.match(workspaceArtwork(s).art,/harbor-office/);assert.equal(personalArtwork(s),null);assert.equal(JSON.stringify(s),before);
 assert.match(workspaceArtwork({...s,stage:'founder',warehouse:1}).art,/startup-studio/);assert.match(workspaceArtwork({...s,stage:'founder',warehouse:2}).art,/expanded-studio/);
});
test('product artwork uses fixed known paths, never an imported filename',()=>{
 assert.equal(productArtwork('hinge'),'products/hinge-v1.webp');assert.equal(productArtwork('../secret'),null);assert.equal(productArtwork('constructor'),null);
});
test('weekend illustrations follow the recorded choice and are not reused as todays event tomorrow',()=>{
 let s=createGame();s.day=6;assert.equal(personalArtwork(s),null);s=reduce(s,{type:'weekend-time',id:'walk'}).state;assert.match(personalArtwork(s).art,/weekend-street/);s=reduce(s,{type:'rest'}).state;assert.equal(personalArtwork(s),null);
});

test('familiar expressions follow three chats and never require romance or change progress',()=>{
 for(const gender of ['male','female'])for(const id of ['xia','zhou','tang','shen','lu','xu','gu','cheng']){const s=createGame('朋友',gender);assert.equal(familiarPortrait(s,id),null);s.relations[id].chats=2;assert.equal(familiarPortrait(s,id),null);s.relations[id].chats=3;const before=JSON.stringify(s);assert.equal(familiarPortrait(s,id),`expressions/${id}-expression-v1.webp`);s.relations[id].status='closed';assert.equal(familiarPortrait(s,id),`expressions/${id}-expression-v1.webp`);s.relations[id].status='friend';assert.equal(JSON.stringify(s),before);}
});
test('unearned expression art and forged identifiers do not invent files',()=>{
 const s=createGame();for(const id of ['xu','gu','cheng','lu','shen','tang']){s.relations[id].chats=2;assert.equal(familiarPortrait(s,id),null);}assert.equal(familiarPortrait(s,'constructor'),null);assert.equal(familiarPortrait(s,'../secret'),null);assert.equal(familiarPortrait(null,'xia'),null);
});
