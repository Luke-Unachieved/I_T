// Static artwork rendered by the game. Native loading and source selection stay intact.
const tracked = new WeakMap();
const imageState = 'data-deal-image';
const revealAfterMs = 90;

function trackImage(img){
 const key=(img.getAttribute('src')||'')+'\n'+(img.getAttribute('srcset')||'');
 if(!key.trim())return;
 const previous=tracked.get(img);
 if(previous?.key===key)return;
 previous?.stop();
 if(previous?.fallback&&img.getAttribute('alt')==='图片暂未显示'&&img.getAttribute('aria-hidden')==='true'){
  const {alt,hidden}=previous.fallback;
  if(alt===null)img.removeAttribute('alt');else img.setAttribute('alt',alt);
  if(hidden===null)img.removeAttribute('aria-hidden');else img.setAttribute('aria-hidden',hidden);
 }
 img.removeAttribute(imageState);
 const record={key,stop:()=>{},fallback:null};
 tracked.set(img,record);
 const current=()=>tracked.get(img)===record&&img.isConnected!==false;
 const set=value=>{if(value)img.setAttribute(imageState,value);else img.removeAttribute(imageState);};
 function fail(){
  if(!current())return;
  // Native broken-image alt remains useful. A decorative image stays hidden
  // from assistive technology even if given a visual fallback label.
  if(!img.getAttribute('alt')?.trim()){
   record.fallback={alt:img.getAttribute('alt'),hidden:img.getAttribute('aria-hidden')};
   img.setAttribute('aria-hidden','true');
   img.setAttribute('alt','图片暂未显示');
  }
  set('failed');
 }
 if(img.complete){
  if(img.naturalWidth===0)fail();
  return;
 }
 const clock=img.ownerDocument?.defaultView?.performance??globalThis.performance;
 const start=clock.now();
 set('loading');
 let resolving=false;
 const stop=()=>{img.removeEventListener('load',load);img.removeEventListener('error',error);};
 record.stop=stop;
 const error=()=>{stop();fail();};
 function load(){
  if(resolving)return;
  resolving=true;stop();
  if(!current())return;
  const finish=()=>{
   if(!current())return;
   if(img.complete&&img.naturalWidth===0){fail();return;}
   set(clock.now()-start>=revealAfterMs?'revealed':null);
  };
  // An unsupported decode() or rejected decode for a usable image must not
  // leave it stuck in the loading state or report a broken request.
  try{
   if(typeof img.decode==='function'){Promise.resolve(img.decode()).then(finish,finish);return;}
  }catch{/* Continue with the browser's successful load. */}
  finish();
 }
 img.addEventListener('load',load);
 img.addEventListener('error',error);
 if(img.complete){if(img.naturalWidth>0)load();else error();}
}

export function prepareGameImages(root){
 for(const img of root.querySelectorAll?.('img[src], img[srcset]')??[])trackImage(img);
}
