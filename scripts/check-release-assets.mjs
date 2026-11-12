import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'assets/release-art-manifest.json'),'utf8'));
const issues=[],ids=new Set(),paths=new Set();let saved=0,reviewed=0;
for(const a of manifest.rasterAssets){
 if(ids.has(a.id)||paths.has(a.path))issues.push(`Duplicate asset: ${a.id}`);ids.add(a.id);paths.add(a.path);
 const target=path.resolve(root,a.path);
 if(!target.startsWith(path.join(root,'assets/art')+path.sep)||!a.path.endsWith('.webp')){issues.push(`Invalid artwork path: ${a.id}`);continue;}
 try{const info=await stat(target);if(!info.isFile()||!info.size)throw Error('empty');saved++;}catch{issues.push(`Missing file: ${a.id}`);}
 if(a.reviewed&&['verified-existing','verified'].includes(a.integration))reviewed++;else issues.push(`Not visually reviewed and integrated: ${a.id}`);
}
console.log(JSON.stringify({target:manifest.rasterAssets.length,saved,reviewed,ready:issues.length===0,issues},null,2));
if(issues.length)process.exitCode=1;
