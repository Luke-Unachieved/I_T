// Build-time QA-only entry points. Production modules and existing saves are untouched.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeDealRoom} from '../src/deal-room-engine.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const production='trade-tycoon:deal-room:v1',offline='trade-tycoon:deal-room-offline:v1';
function once(text,from,to){if(text.split(from).length!==2)throw Error('Unexpected QA transform: '+from);return text.replace(from,to);}
export async function buildLightweightQA({key,seed,releasePath,qaPath}){
 if(!/^trade-tycoon:qa-[a-z0-9-]+:v1$/.test(key))throw Error('Distinct QA key required');
 for(const value of [releasePath,qaPath])if(!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(value))throw Error('Absolute same-origin directory required');
 if(releasePath===qaPath)throw Error('QA directory must differ from release');
 const canonical=normalizeDealRoom(seed);
 const names=['deal-room-app.js','deal-room-save.js','deal-room-save-view.js'];
 const files={};
 for(const name of names){
  let text=await readFile(path.join(root,'src',name),'utf8');
  if(name==='deal-room-app.js'){
   text=once(text,`const SAVE_KEY='${production}';`,`const SAVE_KEY='${key}';`);
   text=once(text,'const loadedDeal=loadDealSave(dealStorage,SAVE_KEY);',`const loadedDeal=loadDealSave(dealStorage,SAVE_KEY);\nif(loadedDeal.status==='empty')state=normalizeDealRoom(${JSON.stringify(canonical)});`);
  }else if(name==='deal-room-save.js'){
   text=once(text,`export const DEAL_SAVE_KEY='${production}';`,`export const DEAL_SAVE_KEY='${key}';`);
   text=once(text,`new Set([DEAL_SAVE_KEY,'${offline}'])`,'new Set([DEAL_SAVE_KEY])');
  }
  text=text.replace(/(from\s+['"])(\.\/[^'"\n]+)(['"])/g,(_,start,spec,end)=>{
   const target=spec.slice(2);return start+(names.includes(target)?'./'+target:releasePath+'/src/'+target)+end;
  });
  if(text.includes(production)||text.includes(offline))throw Error('Production save key leaked');
  files[name]=text;
 }
 // Use the module entry's styles. All asset URLs resolve against the same release.
 const entry = await readFile(path.join(root, 'deal-room.html'), 'utf8');
 const styles = [...entry.matchAll(/<link rel="stylesheet" href="(src\/deal-room[\w.-]*\.css)">/g)]
  .map(([, file]) => `<link rel="stylesheet" href="${releasePath}/${file}">`).join('');
 files['index.html']=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${releasePath}/"><title>贸易工作室 · 隔离验收</title>${styles}</head><body><main id="deal-room"></main><script type="module" src="${qaPath}/deal-room-app.js"></script></body></html>`;
 return {files,key,releasePath,qaPath,bytes:Object.values(files).reduce((n,s)=>n+Buffer.byteLength(s),0)};
}
// Local artifact creation only. No deploy, source mutation or existing-file replacement.
export async function writeLightweightQA(options,destination){
 const result=await buildLightweightQA(options);await mkdir(destination,{recursive:true});
 for(const [name,text] of Object.entries(result.files))await writeFile(path.join(destination,name),text,{flag:'wx'});
 return result;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const [config,destination]=process.argv.slice(2);if(!config||!destination)throw Error('Usage: node scripts/build-lightweight-qa.mjs config.json new-output-dir');
 const result=await writeLightweightQA(JSON.parse(await readFile(config,'utf8')),destination);console.log(JSON.stringify({key:result.key,files:Object.keys(result.files),bytes:result.bytes}));
}
