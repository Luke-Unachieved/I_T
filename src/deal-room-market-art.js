// Original code-native product studies. Only trusted shape fragments are accepted;
// neither a save file nor user input supplies drawing markup, paint or URLs.
import {MARKET_PIECES_A} from './deal-room-market-pieces-a.js';
import {MARKET_PIECES_B} from './deal-room-market-pieces-b.js';
const plates=Object.freeze({...MARKET_PIECES_A,...MARKET_PIECES_B});
const families=Object.freeze({
 '餐桌器具':'table','咖啡与餐厨':'kitchen','家居布艺':'linen',
 '桌面办公':'desk','差旅用品':'travel','家居陈列':'home'
});
export function marketPlate(product){
 if(!product||!Object.hasOwn(plates,product.id))return '';
 const family=Object.hasOwn(families,product.category)?families[product.category]:'table';
 // All contexts have the human-readable product name alongside this decorative image.
 return `<span class="market-plate mk-${family}" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" focusable="false"><ellipse cx="60" cy="76" rx="37" ry="4" fill="#665a43" opacity=".13"/><g fill="none" stroke="#403f37" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${plates[product.id]}</g></svg></span>`;
}
