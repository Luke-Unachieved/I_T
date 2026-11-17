import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildReworkHtml(){
 const read=p=>readFile(path.join(root,p),'utf8');
 let [engine,app,css,svg]=await Promise.all(['src/rework-opening.js','src/rework-app.js','src/rework-style.css','assets/rework-harbor.svg'].map(read));
 for(const asset of ['rework-harbor-painted.webp','rework-cargo-boat.webp','rework-warehouse-annex.webp','rework-express-dock.webp']){const bytes=await readFile(path.join(root,'assets',asset));svg=svg.replaceAll('/assets/'+asset,'data:image/webp;base64,'+bytes.toString('base64'));}
 engine=engine.replace(/^export /gm,'').replace("trade-tycoon:opening:v1","trade-tycoon:standalone:v1");
 app=app.replace(/^import[^\n]+\n/,'').replace(/\nfetch\(new URL\('\.\.\/assets\/rework-harbor\.svg'[\s\S]*$/,'\n');
 app=app.replace("harborArt=''",`harborArt=EMBEDDED_HARBOR.replace('<svg ', '<svg class="harbor-art" role="group" aria-label="仓库、货船与客户港口" ')`);
 app=app.replace("isolatedTrial?'rework.html?trial=1':'rework.html'","isolatedTrial?'?trial=1':'?'");
 const script=`const EMBEDDED_HARBOR=${JSON.stringify(svg)};\n${engine}\n${app}`.replace(/<\/script/gi,'<\\/script');
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>再开一单就下班</title><style>${css}</style></head><body><main id="opening"></main><script>${script}</script></body></html>`;
}
export function portableManifest(html){
 const sha256=createHash('sha256').update(html).digest('hex');
 return {title:'再开一单就下班',channel:'candidate',buildId:sha256.slice(0,12),entry:'再开一单就下班.html',sha256,bytes:Buffer.byteLength(html),saveFormat:'independent-rework-v1',networkAssetsRequired:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=path.resolve(process.argv[2]||path.join(root,'artifacts/rework'));await mkdir(dir,{recursive:true});
 const output=path.join(dir,'再开一单就下班.html'),html=await buildReworkHtml();await writeFile(output,html);
 await writeFile(path.join(dir,'版本信息.json'),JSON.stringify(portableManifest(html),null,2)+'\n');
 await writeFile(path.join(dir,'开始试玩.txt'),'再开一单就下班\n\n解压后，用 Chrome 或 Edge 打开“再开一单就下班.html”即可。无需安装，不依赖网络图片或脚本。\n\n当前内容：从首单、投资到挑选客户，接着经营熟客回头单；选择付款条件、扩建双泊位，靠真实复购解锁三成定金。熟客后续需求有常规、急补与集中采购，可提前查看下批数量和条款。\n\n进度保存在当前浏览器中，不与在线版同步。请保留文件位置并使用同一浏览器；无痕模式、禁用存储或清理浏览器数据可能丢失进度。界面出现保存失败提示时请勿关闭。\n\n备份：展开页面底部“进度备份与恢复”，点击“下载进度备份”。换浏览器、移动游戏文件或更新版本前先备份。恢复时选择自己导出的备份，核对天数及现金，再确认替换；不要导入来历不明的文件。原版旧游戏存档与本重做版不通用。\n\n版本信息.json记录此HTML的内容编号、大小和SHA-256。它用于核对文件，不表示商店审核或平台验收通过。\n\n这是独立重做候选版，原在线版和原存档不受影响。\n');
 console.log(output);
}
