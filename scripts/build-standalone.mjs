import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {artworkFiles} from './art-files.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'artifacts/standalone-v101');
const imports=/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g;
const cache=new Map(),chunks=[];
const data=async p=>'data:'+({'.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream')+';base64,'+(await readFile(path.join(root,p))).toString('base64');
const allArt=await artworkFiles(root);
const requiredExpansion=['xu-qingchuan-v1.webp','gu-yuning-v1.webp','cheng-jianshan-v1.webp','shared-office-presentation-v1.webp','product-quality-table-v1.webp','brand-packaging-series-v1.webp','aftercare-verification-desk-v1.webp'];
for(const name of requiredExpansion)if(!allArt.includes('expansion/'+name))throw new Error('Required expansion artwork not yet available: '+name);
// Cafe and seaside remain CSS-only. Office also appears as a meaningful workspace image.
const cssOnly=new Set(['evening-cafe-v1.webp','seaside-evening-v1.webp']);
const requiredVisuals=['scenes/startup-studio-v1.webp','scenes/expanded-studio-v1.webp','scenes/weekend-street-v1.webp','scenes/home-rest-v1.webp','products/hinge-v1.webp','products/tool-v1.webp','products/handle-v1.webp'];
for(const name of requiredVisuals)if(!allArt.includes(name))throw new Error('Required contextual artwork not yet available: '+name);
for(const name of ['relationships/cheng-key-memory-0-v1.webp','relationships/xu-key-memory-0-v1.webp','relationships/cheng-key-memory-1-v1.webp','relationships/xu-key-memory-1-v1.webp','relationships/gu-key-memory-0-v1.webp','relationships/gu-key-memory-1-v1.webp','relationships/xia-key-memory-0-v1.webp','relationships/zhou-key-memory-0-v1.webp','relationships/tang-key-memory-0-v1.webp','relationships/shen-key-memory-0-v1.webp'])if(!allArt.includes(name))throw new Error('Required relationship artwork not yet available: '+name);
for(const name of ['xia','zhou','tang','shen','lu','xu','gu','cheng'].map(id=>`expressions/${id}-expression-v1.webp`))if(!allArt.includes(name))throw new Error('Required familiar expression not yet available: '+name);
const artNames=allArt.filter(name=>!cssOnly.has(name));
const art=Object.fromEntries(await Promise.all(artNames.map(async name=>[name,await data('assets/art/'+name)])));
const logo=await data('assets/mark.svg');
async function compile(file){
 if(cache.has(file))return cache.get(file);
 let source=await readFile(file,'utf8'),bindings=[];
 for(const m of [...source.matchAll(imports)]){
  if(!m[2].startsWith('./'))throw new Error('Only local project modules are supported');
  const dependency=path.resolve(path.dirname(file),m[2]);
  if(!dependency.startsWith(root+path.sep))throw new Error('Module outside project');
  bindings.push(`const {${m[1]}}=${await compile(dependency)};`);
 }
 source=source.replace(imports,'');
 const exported=[...source.matchAll(/\bexport\s+(?:const|function)\s+(\w+)/g)].map(m=>m[1]);
 source=source.replace(/\bexport\s+(const|function)\s+/g,'$1 ');
 if(path.basename(file)==='app.js'){
  source=source.replaceAll('src="assets/art/${artwork}"','src="${__ART[artwork]}"').replaceAll('src="assets/mark.svg"',`src="${logo}"`).replace("const KEY='trade-tycoon:v1'", "const KEY='trade-tycoon:standalone:v1'");
  source='const __ART='+JSON.stringify(art)+';\n'+source;
 }
 const name='__module'+cache.size;cache.set(file,name);
 chunks.push(`const ${name}=(()=>{\n${bindings.join('\n')}\n${source}\nreturn {${exported.join(',')}};\n})();`);return name;
}
await compile(path.join(root,'src/app.js'));
let css=await readFile(path.join(root,'src/style.css'),'utf8');
// Repeated artwork uses one embedded CSS variable per resource, not repeated base64.
const assetPattern=/url\(['"]?\.\.\/(assets\/[^)'"\s]+)['"]?\)/g;
const embedded=new Map();
for(const m of css.matchAll(assetPattern))if(!embedded.has(m[1]))embedded.set(m[1],{name:'--embedded-art-'+embedded.size,value:await data(m[1])});
css=css.replace(assetPattern,(_,asset)=>`var(${embedded.get(asset).name})`);
css=':root{'+[...embedded.values()].map(item=>`${item.name}:url('${item.value}')`).join(';')+'}\n'+css;
let html=await readFile(path.join(root,'index.html'),'utf8');
const js=chunks.join('\n').replace(/<\/script/gi,'<\\/script');
html=html.replace('href="assets/mark.svg"',`href="${logo}"`).replace('<link rel="stylesheet" href="src/style.css">',`<style>${css}</style>`).replace('<script type="module" src="src/app.js"></script>',`<script>${js}</script>`);
if(/(?:src|href)=["'](?:src|assets)\//.test(html)||/url\(['"]?\.\.\//.test(html))throw new Error('Unbundled local resource');
new Function(js); // Syntax validation only; do not execute the game in the builder.
await mkdir(out,{recursive:true});
const filename='外贸达人养成记-v1.0.1.html';await writeFile(path.join(out,filename),html);
const manifest={version:'1.0.1',filename,size:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),modules:cache.size,artworkCount:allArt.length,networkDependencies:0};
await writeFile(path.join(out,'build-manifest.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(out,'启动说明.txt'),'外贸达人养成记 v1.0.1\n使用现代浏览器打开 HTML。换位置、浏览器或设备前请导出备份。详见发行包启动与存档说明及发行说明。\n');
console.log(JSON.stringify({...manifest,directory:out}));
