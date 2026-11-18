// Check the modern raster inventory, not the unrelated legacy gallery. A matching
// hash or a note claiming generation is not itself evidence of rights clearance.
import {readFile, readdir, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const rootPath=fileURLToPath(new URL('../',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const assetPath=/^assets\/deal-[a-z0-9-]+\.webp$/;
const sourcePath=/^src\/deal-room(?:-[a-z0-9-]+)?\.(?:css|js)$/;
const notePath=/^assets\/deal-[a-z0-9-]+\.source\.md$/;
const reviewPath=/^docs\/rework\/art-evidence\/[a-zA-Z0-9._-]+\.(?:md|json)$/;
const digest=/^[a-f0-9]{64}$/;

export async function auditModernArt(dir=rootPath){
 const root=await realpath(dir),problems=[],rows=[],listed=new Set(),references=new Map();
 async function load(rel){
  const full=await realpath(path.join(root,rel));if(!full.startsWith(root+path.sep))throw Error('path outside project');return readFile(full);
 }
 const {assets}=JSON.parse(await load('docs/rework/MODERN_ASSET_PROVENANCE.json'));
 if(!Array.isArray(assets)||!assets.length)throw Error('Modern art inventory missing or empty.');
 for(const a of assets){
  const file=a?.file;
  if(typeof file!=='string'||!assetPath.test(file)||listed.has(file)){problems.push('Invalid or duplicate modern asset: '+String(file));continue}listed.add(file);
  const row={file,bytesMatch:false,hashMatch:false,webpHeader:false,sourceNote:false,documentedReview:false};
  try{
   const b=await load(file);
   row.bytesMatch=Number.isSafeInteger(a.bytes)&&b.length===a.bytes;
   row.hashMatch=digest.test(a.sha256)&&sha(b)===a.sha256;
   row.webpHeader=b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'&&b.readUInt32LE(4)===b.length-8;
  }catch(e){problems.push(file+': cannot read asset ('+e.message+')')}
  if(!row.bytesMatch||!row.hashMatch||!row.webpHeader)problems.push(file+': byte count, SHA-256 or WebP container mismatch');
  const refs=a.references;
  if(!Array.isArray(refs)||!refs.length||new Set(refs).size!==refs.length)problems.push(file+': missing/duplicate source references');
  for(const f of Array.isArray(refs)?refs:[]){
   if(typeof f!=='string'||!sourcePath.test(f)){problems.push(file+': invalid modern source path');continue}
   if(!references.has(f)){
    try{references.set(f,new Set((await load(f)).toString('utf8').match(/assets\/[a-z0-9-]+\.webp/g)||[]))}
    catch(e){references.set(f,new Set());problems.push(f+': '+e.message)}
   }
   if(!references.get(f).has(file))problems.push(file+': not referenced in '+f);
  }
  if(a.sourceDocument){
   try{if(!notePath.test(a.sourceDocument)||a.sourceDocument!==file.replace(/\.webp$/,'.source.md'))throw Error('source note is not for this asset');row.sourceNote=(await load(a.sourceDocument)).length>0}
   catch(e){problems.push(file+': '+e.message)}
   if(!row.sourceNote)problems.push(file+': source note unavailable');
  }
  // A later human review may refer to a project-owned nonprivate memo. The
  // checker verifies only that memo and art bytes, never legal sufficiency.
  const r=a.releaseReview;
  if(r){
   if(r.status==='recorded'&&r.assetSha256===a.sha256&&reviewPath.test(r.record||'')&&digest.test(r.recordSha256||'')){
    try{row.documentedReview=sha(await load(r.record))===r.recordSha256}catch{}
   }
   if(!row.documentedReview)problems.push(file+': recorded review does not match this asset and memo');
  }
  rows.push(row);
 }
 for(const name of await readdir(path.join(root,'assets')))if(assetPath.test('assets/'+name)&&!listed.has('assets/'+name))problems.push('Unlisted modern asset: assets/'+name);
 for(const [source,files] of references)for(const file of files)if(!listed.has(file))problems.push('Unlisted art reference '+file+' in '+source);
 const pending=rows.filter(r=>!r.documentedReview).map(r=>r.file);
 return {scope:'modern-workshop-raster-assets',assets:rows.length,integrity:problems.length?'failed':'matched',sourceNotes:rows.filter(r=>r.sourceNote).length,documentedReviews:rows.length-pending.length,pendingHumanReview:pending,problems,rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(args.length>1||args.some(v=>v!=='--integrity-only'))throw Error('Only --integrity-only is supported.');
 const r=await auditModernArt();console.log(JSON.stringify(r,null,2));
 process.exitCode=r.problems.length?1:(!args.length&&r.pendingHumanReview.length?2:0);
}
