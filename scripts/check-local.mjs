// Run the exact dependency-free package check steps without starting npm.
// This makes no network request and does not change registry or security settings.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.scripts.test!=='node --test tests/*.test.mjs')throw Error('Test command changed: review the local runner before executing.');
const checks=pkg.scripts.check.split(/\s*&&\s*/),commands=[];
for(const line of checks){
 if(line==='npm test'){
  const tests=fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.test.mjs')).sort();
  if(!tests.length)throw Error('No tests found');
  commands.push(['--test',...tests.map(name=>'tests/'+name)]);
 }else{
  const match=/^node --check ([A-Za-z0-9_./-]+)$/.exec(line);
  if(!match)throw Error('Unsupported check step: '+line);
  const target=path.resolve(root,match[1]);
  if(!target.startsWith(root+path.sep)||!fs.statSync(target).isFile())throw Error('Unsafe or missing check input');
  commands.push(['--check',match[1]]);
 }
}
const temp=path.join(root,'.local-test-temp');fs.mkdirSync(temp,{recursive:true});
for(const args of commands){
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',env:{...process.env,TMP:temp,TEMP:temp}});
 if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
console.log('Local package-check steps passed; no npm process or network request.');
