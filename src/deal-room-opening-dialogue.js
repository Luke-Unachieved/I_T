// Only use for attributed dialogue. Image captions describe the panel and stay unquoted.
export function openingDialogueQuote(speech){
 let text=typeof speech==='string'?speech.trim():'';
 const quotes={'“':'”','「':'」','『':'』','"':'"'};
 // Existing scenes may already include an outer style. Normalize the wrapper
 // without changing inner references or punctuation in the dialogue.
 while(text.length>1&&quotes[text[0]]&&text.endsWith(quotes[text[0]]))text=text.slice(1,-1).trim();
 return text?'“'+text+'”':'';
}

export function comicDialogueBlock(speaker,speech){
 const quoted=openingDialogueQuote(speech);
 return quoted?'<blockquote class="ws-opening-comic-voice"><p>'+quoted+'</p><footer>'+speaker+'</footer></blockquote>':'';
}
