// Isolated QA copies only. Never edits a user's saved data or the source artifact.
import {readFile,writeFile} from 'node:fs/promises';
export function isolateDealPreview(html,key){
 if(!/^trade-tycoon:[a-z0-9-]+:v1$/.test(key)||key==='trade-tycoon:deal-room-offline:v1'||key==='trade-tycoon:deal-room:v1')throw new Error('Choose a distinct QA save key');
 const from='trade-tycoon:deal-room-offline:v1';
 if(html.split(from).length-1!==3)throw new Error('Unexpected standalone save-key declarations; inspect before creating QA copy');
 const result=html.replaceAll(from,key);
 if(!result.includes(`const DEAL_SAVE_KEY='${key}'`)||!result.includes(`const SAVE_KEY='${key}'`)||result.includes(from))throw new Error('QA key isolation failed');
 return result;
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){
 const [input,output,key]=process.argv.slice(2);if(!input||!output||!key||input===output)throw new Error('Use separate input and output plus QA key');
 await writeFile(output,isolateDealPreview(await readFile(input,'utf8'),key));
}
