import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'artifacts/data-v2');
const modules=new Map(),chunks=[];
async function compile(file){
 if(modules.has(file))return modules.get(file);
 let source=await readFile(file,'utf8');const imports=/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g,bindings=[];
 for(const match of [...source.matchAll(imports)]){
  if(!match[2].startsWith('./'))throw new Error('Only local modules');
  bindings.push(`const {${match[1]}}=${await compile(path.resolve(path.dirname(file),match[2]))};`);
 }
 source=source.replace(imports,'');const exports=[...source.matchAll(/\bexport\s+(?:const|function)\s+(\w+)/g)].map(m=>m[1]);
 source=source.replace(/\bexport\s+(const|function)\s+/g,'$1 ');
 const name='module'+modules.size;modules.set(file,name);chunks.push(`const ${name}=(()=>{${bindings.join('\n')}\n${source}\nreturn {${exports.join(',')}};})();`);return name;
}
await compile(path.join(root,'src/trade-app.js'));
new Function(chunks.join('\n')); // Validate the assembled script without running browser code.
let html=await readFile(path.join(root,'trade.html'),'utf8');
const css=await readFile(path.join(root,'src/trade-style.css'),'utf8');
const mark='data:image/svg+xml;base64,'+(await readFile(path.join(root,'assets/mark.svg'))).toString('base64');
html=html.replace('href="assets/mark.svg"',`href="${mark}"`).replace('<link rel="stylesheet" href="src/trade-style.css">',`<style>${css}</style>`).replace('<script type="module" src="src/trade-app.js"></script>',`<script>(()=>{${chunks.join('\n')}\n})();</script>`);
await mkdir(out,{recursive:true});await writeFile(path.join(out,'index.html'),html);await writeFile(path.join(out,'.nojekyll'),'');
// Keep the pre-rework game, including its original standalone storage key.
await copyFile(path.join(root,'artifacts/standalone-v101/外贸达人养成记-v1.0.1.html'),path.join(out,'classic.html'));
await writeFile(path.join(out,'release-manifest.json'),JSON.stringify({version:'2.0.0',mode:'data-trade-v2',title:'外贸达人养成记',legacy:'classic.html',saveKey:'trade-tycoon:data:v2',legacySaveKeys:['trade-tycoon:v1','trade-tycoon:standalone:v1'],sha256:createHash('sha256').update(html).digest('hex'),bytes:Buffer.byteLength(html)},null,2));
console.log(JSON.stringify({out,bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex')}));
