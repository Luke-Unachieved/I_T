// Apertures traced on the original desk crop (358:242) or full property artwork
// (3:2); fit="slice" matches the centred object-fit:cover background at any width.
// Split panes and conservative lower edges protect foreground furniture/people.
const wFrames=Object.freeze({
 starter:['M36.7 2.5 41 4V18.7L36.7 17.8Z M43 4.3 51.7 7.4V21L43 19Z M53.2 7.7 59.8 10V22.8L53.2 21.4Z M37 20 41 21V62L37 62.5Z M43 21.5 51.7 23.5V61.7L43 62Z M53.2 24 59.6 25.4V61L53.2 61.5Z',358,242],
 'office-window':['M69 1 76 0V4L69 5Z M78 0H89.5V3.2L78 4Z M69 8 76 7V27L67 29Z M78 6.5 89.5 5V27L78 28Z'],
 'office-city':['M30 .5H42V35.5H30Z M46.7 .5H95.8V36.4L47.8 35.6Z M48.4 38.5H82L80 52.4H49Z'],
 'office-loft':['M71 15 75 11V19L71 22Z M77 10 84 4.4V14L77 18Z M72 25 75 23V30L72 33Z M77 22 84 18V27L77 30Z M88.5 14 95 10V20L88.5 23Z M88.5 27 95 23V32L88.5 35Z M71 38 84 30V47L71 49Z'],
 'office-river':['M30.7 3 38.1 1.4V43H30.7Z M41 .9H69L72 8 78 12 76 18 82 22 78 30 84 36 89 38 89 52H52L49 45 41 42Z'],
 'office-sky':['M42 18 46 18.4V49L42 50Z M49 19 59.6 16V51L49 50Z M62.5 15 83 10V51L62.5 51Z M86.5 9.4 98.3 5.4V47L86.5 51Z'],
 'office-terrace':['M68 18 82 8 96 4V37L72 39 65 35Z M72 41 95 39V44L76 46Z'],
 'office-wide':['M59 23 62.8 21V44L59 42Z M64.6 21 67.8 19.5V50L64.6 48Z M69.2 18.8 75 16.1V50L69.2 49Z M77.1 15.7 84 12V52L77.1 51Z M86.7 11.5 96.4 7V49L86.7 50Z'],
 'office-yard':['M60.7 12 69.4 10V47L60.7 49Z M74 13 98 4V46L87 46 83 42 74 40Z']
});
const wRows=Array.from({length:72},(_,i)=>{const x=(i*47.3+3)%100,y=(i*28.73+5)%100;return [x.toFixed(2),y.toFixed(2)];});
const wRain=wRows.map(([x,y])=>`M${x} ${y}l-.85 3.6`).join(' ');
const wSnow=wRows.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i%3===0?.49:.3}"/>`).join('');
export function officeWeatherView(officeId,weather){
 const key=officeId==null||officeId===''||officeId==='office-starter'?'starter':officeId;
 if(!Object.hasOwn(wFrames,key)||!['晴','阴','雨','雪'].includes(weather))return '';
 const [d,width=3,height=2]=wFrames[key],id='office-weather-mask-'+key;
 const overlay=weather==='晴'?'#f7de8b':weather==='阴'?'#545c66':weather==='雨'?'#53667a':'#e7edf0';
 const opacity=weather==='晴'?.045:weather==='阴'?.22:weather==='雨'?.24:.21;
 const particles=weather==='雨'?`<g class="ws-weather-rain"><path d="${wRain}" fill="none" stroke="#f0f3ef" stroke-width=".28" opacity=".86"/></g>`:weather==='雪'?`<g class="ws-weather-snow" fill="#fffdf1">${wSnow}</g>`:'';
 return `<svg class="ws-office-weather" aria-hidden="true" focusable="false" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice"><svg width="${width}" height="${height}" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="100" height="100" fill="${overlay}" opacity="${opacity}"/>${particles}</g></svg></svg>`;
}
