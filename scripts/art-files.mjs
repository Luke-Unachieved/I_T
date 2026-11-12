import {readdir} from 'node:fs/promises';
import path from 'node:path';
// Keep every nested production WebP in portable builds, not only expansion/.
// Returned names are relative to assets/art; symlink traversal is never used.
export async function artworkFiles(root){
 const base=path.join(root,'assets/art');
 async function visit(relative=''){
  const entries=await readdir(path.join(base,relative),{withFileTypes:true});
  const result=[];
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name,'en'))){
   if(entry.isSymbolicLink())throw new Error('Symlink art is not supported');
   const name=relative?relative+'/'+entry.name:entry.name;
   if(entry.isDirectory())result.push(...await visit(name));
   else if(entry.isFile()&&entry.name.endsWith('.webp'))result.push(name);
  }
  return result;
 }
 return visit();
}
