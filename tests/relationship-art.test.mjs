import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/engine.js';
import {relationshipArtwork} from '../src/album.js';
const scene=(id,branch)=>{const s=createGame('回忆',id==='xu'?'male':'female');s.relations[id].dates=3;s.dialogueMemories[id].date[2]={day:8,response:1,branch,scene:'当时的场景',line:'当时的回应',reply:'当时的回答'};return s;};
test('relationship artwork follows only a saved completed third-scene branch',()=>{
 for(const id of ['xia','zhou','tang','shen','lu','xu','cheng','gu'])for(const branch of [0,1]){const s=scene(id,`date:${id}:${branch}`),before=JSON.stringify(s);assert.equal(relationshipArtwork(s,id),`relationships/${id}-key-memory-${branch}-v1.webp`);assert.equal(JSON.stringify(s),before);}
});
test('legacy or cancelled dates never invent branch art from an earlier response',()=>{
 const s=scene('xu',null);s.dialogueMemories.xu.date[0]={response:0};assert.equal(relationshipArtwork(s,'xu'),null);s.dialogueMemories.xu.date[2]=null;assert.equal(relationshipArtwork(s,'xu'),null);s.dialogueMemories.xu.date[2]={branch:'date:xu:0'};s.relations.xu.dates=2;assert.equal(relationshipArtwork(s,'xu'),null);
});
test('missing and invalid variants cannot borrow artwork from another branch or person',()=>{
 const s=scene('xu','date:xu:9');assert.equal(relationshipArtwork(s,'xu'),null);s.dialogueMemories.xu.date[2].branch='date:cheng:0';assert.equal(relationshipArtwork(s,'xu'),null);assert.equal(relationshipArtwork(s,'constructor'),null);s.dialogueMemories.xu.date[2].branch=3;assert.equal(relationshipArtwork(s,'xu'),null);
});
test('historical branch is not recalculated after later changes or ending the relationship',()=>{
 const s=scene('cheng','date:cheng:0');s.dialogueMemories.cheng.date[0]={response:1};s.relations.cheng.status='closed';assert.match(relationshipArtwork(s,'cheng'),/cheng-key-memory-0/);
});

test('original character illustrations unlock only the accepted matching branch',()=>{
 for(const id of ['xia','zhou','tang','shen','lu'])for(const branch of [0,1]){const s=scene(id,`date:${id}:${branch}`);assert.equal(relationshipArtwork(s,id),`relationships/${id}-key-memory-${branch}-v1.webp`);s.dialogueMemories[id].date[2].branch=`date:${id}:9`;assert.equal(relationshipArtwork(s,id),null);}
});
