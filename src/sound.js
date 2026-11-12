// Original, short procedural feedback. No audio files, network, microphone or music loop.
const TONES={tap:[392],order:[392,494,587],story:[330,440,523],date:[349,440,523],morning:[294,392],evening:[392,330],ending:[294,392,494,587]};
let enabled=false,context=null;
export const soundEnabled=()=>enabled;
export function setSoundEnabled(value){enabled=!!value;if(!enabled&&context){const old=context;context=null;old.close().catch(()=>{});}return enabled;}
export function playSound(kind='tap'){
 if(!enabled)return false;
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!Context)return false;
 try{
  context??=new Context();
  const play=()=>{if(!enabled)return;const now=context.currentTime;for(const [i,hz] of (TONES[kind]||TONES.tap).entries()){
   const oscillator=context.createOscillator(),gain=context.createGain(),start=now+i*.085;
   oscillator.type='sine';oscillator.frequency.value=hz;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+.22);
   oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.24);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }};
  if(context.state==='suspended')context.resume().then(play).catch(()=>{});else play();return true;
 }catch{return false;}
}
