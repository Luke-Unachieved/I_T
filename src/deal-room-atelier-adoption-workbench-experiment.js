/** Isolated use-feedback experiment. Input is a paid lifecycle order, never a
 * proposal. No contract, cash, date, rights or inventory mutation. No persistence.
 * This is not a new customer request or a long-term economic strategy. */
const copy=x=>JSON.parse(JSON.stringify(x));
const supported=['mira','samir','ines'];
const initial={mira:{lightOn:false},samir:{lidOpen:false},ines:{unfolded:false}};
export function createAtelierWorkbench(order){
 if(!order||order.status!=='paid'||order.buyerId!=='atelier'||!order.id||!Array.isArray(order.products)||!order.products.length||new Set(order.products).size!==order.products.length||order.products.some(p=>!supported.includes(p))||!['plain','gift'].includes(order.packaging)||!Number.isSafeInteger(order.quantity)||order.quantity<=0||!order.versionId)return null;
 return {experimental:true,orderId:order.id,contract:copy(order),lead:order.lead&&order.products.includes(order.lead)?order.lead:order.products[0],boxOpen:false,
  completeGiftSets:order.packaging==='gift'?order.quantity:0,demonstrationSets:0,
  products:Object.fromEntries(order.products.map(p=>[p,copy(initial[p])])),feedback:order.packaging==='gift'?'打开已交付礼盒，查看实际采用的商品。':'可以调整陈列主推，演示实际采用的商品。'};
}
export function reduceAtelierWorkbench(model,action={}){
 if(!model)return model;
 const reject=feedback=>({...model,feedback});
 if(action.type==='OPEN_BOX'||action.type==='CLOSE_BOX'){
  if(model.contract.packaging!=='gift')return reject('这份合同采用开放陈列，没有礼盒。');
  const boxOpen=action.type==='OPEN_BOX';
  if(!boxOpen){return {...model,boxOpen:false,completeGiftSets:model.contract.quantity,demonstrationSets:0,products:Object.fromEntries(model.contract.products.map(p=>[p,copy(initial[p])])),feedback:'实际商品已收好，礼盒已重新封合；合同不变。'};}
  return {...model,boxOpen:true,completeGiftSets:model.contract.quantity-1,demonstrationSets:1,feedback:'礼盒已打开，可以逐件查看实际商品。'};
 }
 if(action.type==='SELECT_LEAD'||action.type==='DEMONSTRATE_PRODUCT'){
  const id=action.productId;if(!model.contract.products.includes(id))return reject('这件商品不在已交付合同中，不能展示为已采用。');
  if(action.type==='SELECT_LEAD'){
   if(model.contract.packaging!=='plain')return reject('礼赠按已确认组合装盒，不改变合同主推。');
   return {...model,lead:id,feedback:'陈列主推已调整，合同商品、数量与版本不变。'};
  }
  if(model.contract.packaging==='gift'&&!model.boxOpen)return reject('先打开礼盒，再查看里面的商品。');
  const prop=id==='mira'?'lightOn':id==='samir'?'lidOpen':'unfolded';
  return {...model,products:{...model.products,[id]:{...model.products[id],[prop]:!model.products[id][prop]}},feedback:id==='mira'?'查看实际台灯的开关效果。':id==='samir'?'查看实际杯盖的开合。':'查看实际桌布的展开与收拢。'};
 }
 return model;
}
