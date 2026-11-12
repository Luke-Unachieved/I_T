import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {artworkFiles} from '../scripts/art-files.mjs';
async function fixture(t,names){
 const root=await mkdtemp(path.join(os.tmpdir(),'trade-art-list-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'assets/art'),{recursive:true});
 for(const name of names){const file=path.join(root,'assets/art',name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,'listing fixture, not an artwork');}
 return root;
}
test('portable artwork discovery includes scene, relationship, product and expression folders',async t=>{
 const names=['portrait.webp','expansion/xu.webp','expressions/xia.webp','relationships/xia-key-0.webp','scenes/startup.webp','products/hinge.webp'];
 const root=await fixture(t,names);assert.deepEqual((await artworkFiles(root)).sort(),names.sort());
});
test('original PNG and provenance text are not accidentally embedded as production art',async t=>{
 const root=await fixture(t,['original.png','notes.md','scenes/a.webp']);assert.deepEqual(await artworkFiles(root),['scenes/a.webp']);
});
test('artwork order is stable and paths remain relative to the asset root',async t=>{
 const root=await fixture(t,['z.webp','a/nested/b.webp','a/a.webp']);assert.deepEqual(await artworkFiles(root),['a/a.webp','a/nested/b.webp','z.webp']);
});
test('artwork symlinks are rejected instead of bundling arbitrary external files',async t=>{
 const root=await fixture(t,['safe.webp']);
 try{await symlink(path.join(root,'assets/art/safe.webp'),path.join(root,'assets/art/link.webp'));}catch(error){
  if(process.platform==='win32'&&error.code==='EPERM'){t.skip('Windows does not permit this file-symlink test fixture; no symlink-creation privilege was requested.');return;}throw error;
 }
 await assert.rejects(artworkFiles(root),/Symlink art/);
});

test('artwork directory links and Windows junctions are rejected without traversing them',async t=>{
 const root=await fixture(t,['real/safe.webp']);
 try{await symlink(path.join(root,'assets/art/real'),path.join(root,'assets/art/link-dir'),process.platform==='win32'?'junction':'dir');}catch(error){
  if(process.platform==='win32'&&error.code==='EPERM'){t.skip('Windows does not permit this directory-junction fixture; production rejection remains unchanged, integration coverage unavailable here.');return;}throw error;
 }
 await assert.rejects(artworkFiles(root),/Symlink art/);
});
