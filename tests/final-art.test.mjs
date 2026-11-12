import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGame} from '../src/engine.js';
import {relationshipArtwork} from '../src/album.js';
const ids=['memory-xia-1','memory-zhou-1','memory-tang-1','memory-shen-1','memory-lu-0','memory-lu-1'];
const root=new URL('../',import.meta.url);
test('all six final illustrations are saved and match their reviewed production hashes',async()=>{
 const manifest=JSON.parse(await readFile(new URL('assets/release-art-manifest.json',root),'utf8'));
 for(const id of ids){
  const a=manifest.rasterAssets.find(x=>x.id===id);assert.ok(a);assert.equal(a.reviewed,true);
  const bytes=await readFile(new URL(a.path,root));assert.equal(bytes.length,a.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert.ok(['code-ready','verified'].includes(a.integration));assert.equal(a.width,1536);assert.equal(a.height,1024);
 }
});
test('new illustrations do not invent an unrecorded or cancelled third date',()=>{
 for(const key of ids){
  const [,id,branch]=key.split('-'),s=createGame('历史回忆');
  s.relations[id].dates=3;s.dialogueMemories[id].date[0]={response:Number(branch)};
  assert.equal(relationshipArtwork(s,id),null);
  s.dialogueMemories[id].date[2]={branch:null};assert.equal(relationshipArtwork(s,id),null);
  s.dialogueMemories[id].date[2]={branch:`date:${id}:${branch}`};s.relations[id].dates=2;assert.equal(relationshipArtwork(s,id),null);
 }
});
test('ending a relationship preserves earned artwork without changing saved state',()=>{
 for(const key of ids){
  const [,id,branch]=key.split('-'),s=createGame('历史回忆');s.relations[id].dates=3;s.relations[id].status='closed';
  s.dialogueMemories[id].date[2]={branch:`date:${id}:${branch}`};const before=JSON.stringify(s);
  assert.equal(relationshipArtwork(s,id),`relationships/${id}-key-memory-${branch}-v1.webp`);
  assert.equal(JSON.stringify(s),before);
 }
});
