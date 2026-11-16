import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildReworkHtml(){
 const read=p=>readFile(path.join(root,p),'utf8');
 let [engine,app,css,svg]=await Promise.all(['src/rework-opening.js','src/rework-app.js','src/rework-style.css','assets/rework-harbor.svg'].map(read));
 engine=engine.replace(/^export /gm,'').replace("trade-tycoon:opening:v1","trade-tycoon:standalone:v1");
 app=app.replace(/^import[^\n]+\n/,'').replace(/\nfetch\(new URL\('\.\.\/assets\/rework-harbor\.svg'[\s\S]*$/,'\n');
 app=app.replace("harborArt=''",`harborArt=EMBEDDED_HARBOR.replace('<svg ', '<svg class="harbor-art" role="group" aria-label="仓库、货船与客户港口" ')`);
 app=app.replace("isolatedTrial?'rework.html?trial=1':'rework.html'","isolatedTrial?'?trial=1':'?'");
 const script=`const EMBEDDED_HARBOR=${JSON.stringify(svg)};\n${engine}\n${app}`.replace(/<\/script/gi,'<\\/script');
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>再开一单就下班</title><style>${css}</style></head><body><main id="opening"></main><script>${script}</script></body></html>`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=path.resolve(process.argv[2]||path.join(root,'artifacts/rework'));await mkdir(dir,{recursive:true});
 const output=path.join(dir,'再开一单就下班.html');await writeFile(output,await buildReworkHtml());
 await writeFile(path.join(dir,'开始试玩.txt'),'再开一单就下班\n\n解压后，用 Chrome 或 Edge 打开“再开一单就下班.html”即可。无需安装，不依赖网络图片或脚本。\n\n当前内容：三程经营，从首单到投资扩张，再从四位客户中挑两位合作。\n\n进度保存在当前浏览器中，不与在线版同步。请保留文件位置并使用同一浏览器；无痕模式、禁用存储或清理浏览器数据可能丢失进度。界面出现保存失败提示时请勿关闭。\n\n这是独立重做候选版，原在线版和原存档不受影响。\n');
 console.log(output);
}
