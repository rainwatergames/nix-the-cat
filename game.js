/*! NIX THE CAT v1.0.0 — © 2026 Rainwater Games (Jeff Rainwater). All rights reserved. */
(function(){'use strict';
const VERSION='1.0.0';
const Q=new URLSearchParams(location.search),BOT=Q.has('bot'),ALLUNL=Q.get('unlock')==='all',BOTACC=clampN(+(Q.get('bot')||100),0,100)/100,BOTJIT=clampN(+(Q.get('jit')||0),0,200)/1000;
function clampN(x,a,b){return isNaN(x)?b:Math.max(a,Math.min(b,x));}
const $=id=>document.getElementById(id);
const cv=$('c');let g=cv.getContext('2d');
let W=360,H=640,DPR=1,bgCache=null,bgKey='';
function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';bgCache=null;}
addEventListener('resize',resize);resize();
const clamp=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t;
const LS={get(k,d){try{const v=localStorage.getItem('nix.'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('nix.'+k,JSON.stringify(v))}catch(e){}}};
const S=Object.assign({mv:80,sv:60,off:0,rf:false},LS.get('set',{}));
let BEST=LS.get('best',{});let HS=LS.get('hs',{});const WARD=Object.assign({cap:'black',hood:'black',shades:false,acc:''},LS.get('ward',{}));
const saveSet=()=>LS.set('set',S);

/* ================= AUDIO ENGINE (v0.4: pre-rendered original songs, OGG with MP3 fallback) ================= */
let ac=null,master,musicBus,sfxBus,PB=null;const BUF={},BUFP={};
const mf=n=>440*Math.pow(2,(n-69)/12);
const CAN_OGG=(()=>{try{return document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"')!=='';}catch(e){return false}})();
function initAudio(){
 if(ac){if(ac.state!=='running')ac.resume();return;}
 const AC=window.AudioContext||window.webkitAudioContext;ac=new AC({latencyHint:'interactive'});
 master=ac.createGain();master.gain.value=1;master.connect(ac.destination);
 musicBus=ac.createGain();musicBus.connect(master);
 const comp=ac.createDynamicsCompressor();comp.threshold.value=-10;comp.knee.value=6;comp.ratio.value=4;comp.attack.value=0.003;comp.release.value=0.15;
 sfxBus=ac.createGain();sfxBus.connect(comp);comp.connect(master);
 applyVol();loadSong(SONGS[G.sel]).catch(()=>{});}
function applyVol(){if(!ac)return;musicBus.gain.value=S.mv/100;sfxBus.gain.value=S.sv/100*0.8;}
function osc(type,f,t,t2){const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(t2);return o;}
function gain(v){const x=ac.createGain();x.gain.value=v;return x;}
function filt(type,f,q){const x=ac.createBiquadFilter();x.type=type;x.frequency.value=f;if(q!=null)x.Q.value=q;return x;}
function loadSong(s){if(BUF[s.id])return Promise.resolve(BUF[s.id]);if(BUFP[s.id])return BUFP[s.id];if(!ac)return Promise.reject(new Error('no audio'));
 const get=ext=>fetch('music/'+s.id+'.'+ext+'?v='+VERSION).then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer();}).then(b=>new Promise((res,rej)=>{const p=ac.decodeAudioData(b,res,rej);if(p&&p.catch)p.catch(rej);}));
 const p=(CAN_OGG&&window.NIX_FMT!=='mp3'?get('ogg').catch(()=>get('mp3')):get('mp3')).then(b=>{BUF[s.id]=b;delete BUFP[s.id];return b;},e=>{delete BUFP[s.id];throw e;});return BUFP[s.id]=p;}
function startPlayback(song,from,delay,loop){stopPlayback();const b=BUF[song.id];
 if(!b){loadSong(song).then(()=>{if(!PB&&(G.state==='title'||G.state==='select'||G.state==='results')&&SONGS[G.sel]===song)startPlayback(song,from,0.05,loop);}).catch(()=>{});return null;}
 const now=ac.currentTime,out=gain(0);out.connect(musicBus);out.gain.setValueAtTime(0,now);out.gain.linearRampToValueAtTime(1,now+(from>0?0.3:0.02));
 const src=ac.createBufferSource();src.buffer=b;src.connect(out);
 if(loop){src.loop=true;src.loopStart=song.loop[0];src.loopEnd=song.loop[1];}
 src.start(now+delay,Math.max(0,from));
 PB={song,startAt:now+delay-from,out,src,from,loop:!!loop};return PB;}
function stopPlayback(){if(!PB)return;const o=PB.out,s=PB.src,t=ac.currentTime;o.gain.cancelScheduledValues(t);o.gain.setValueAtTime(o.gain.value,t);o.gain.linearRampToValueAtTime(0,t+0.08);try{s.stop(t+0.12)}catch(e){}setTimeout(()=>{try{o.disconnect()}catch(e){}},400);PB=null;}
function pump(){}
setInterval(()=>{if(BOT&&G.state==='play'&&!G.paused&&PB)botTick(songT());},4);
let lastC=-1,lastP=0;
function audioNow(){const c=ac.currentTime,p=performance.now();if(c!==lastC){lastC=c;lastP=p;return c;}return c+Math.min(0.04,(p-lastP)/1000);}
const outLat=()=>(ac.outputLatency||ac.baseLatency||0);
function songT(){return audioNow()-PB.startAt-outLat()-S.off/1000;}
/* SFX */
function bell(f,v,t){t=t||ac.currentTime;[[1,1,0.3],[2.76,0.25,0.12],[5.4,0.08,0.06]].forEach(([m,a,d])=>{const o=osc('sine',f*m,t,t+d*5),gg=gain(0);gg.gain.setValueAtTime(0.0001,t);gg.gain.linearRampToValueAtTime(v*a,t+0.003);gg.gain.exponentialRampToValueAtTime(0.0005,t+d*4);o.connect(gg);gg.connect(sfxBus);});}
const HIV=[0,4,7,12,7,4];let hiI=0;
function hitSfx(n,k){if(!ac)return;const s=G.song,key=(s&&s.key)||60;bell(mf(key+12+HIV[(hiI++)%6]),k===0?0.09:0.06);}
function missSfx(){if(!ac)return;const t=ac.currentTime,o=osc('triangle',240,t,t+0.2),gg=gain(0);o.frequency.exponentialRampToValueAtTime(90,t+0.18);gg.gain.setValueAtTime(0.12,t);gg.gain.exponentialRampToValueAtTime(0.001,t+0.18);o.connect(gg);gg.connect(sfxBus);}
function uiSfx(){if(!ac)return;bell(mf(84),0.08);}
function tick(t,acc){const o=osc('square',acc?1760:1320,t,t+0.05),gg=gain(0);gg.gain.setValueAtTime(0.25,t);gg.gain.exponentialRampToValueAtTime(0.001,t+0.04);o.connect(gg);gg.connect(sfxBus);}
function meowSfx(t,p){if(!ac)return;p=p||1;const d=0.26,o=osc('sawtooth',520*p,t,t+d+0.05),f1=filt('bandpass',700,4),f2=filt('bandpass',1800,6),gg=gain(0);
 o.frequency.setValueAtTime(500*p,t);o.frequency.linearRampToValueAtTime(820*p,t+d*0.45);o.frequency.linearRampToValueAtTime(560*p,t+d);
 f1.frequency.setValueAtTime(400,t);f1.frequency.linearRampToValueAtTime(900,t+d*0.5);f1.frequency.linearRampToValueAtTime(550,t+d);f2.frequency.setValueAtTime(2300,t);f2.frequency.linearRampToValueAtTime(1100,t+d);
 gg.gain.setValueAtTime(0.0001,t);gg.gain.linearRampToValueAtTime(0.5,t+0.03);gg.gain.setValueAtTime(0.5,t+d*0.7);gg.gain.linearRampToValueAtTime(0.0001,t+d);o.connect(f1);o.connect(f2);f1.connect(gg);f2.connect(gg);gg.connect(sfxBus);}

/* ================= SONGS (music/songs.js, rendered offline) ================= */
const OUTFIT={kpop:'mic',viking:'horns',summer:'lei',goth:'cape'};
const SONGS=(window.NIX_SONGS||[]).map(s=>Object.assign(s,{lead:0,vr:s.id==='vr'?1:0,outfit:OUTFIT[s.id]||'',dance:OUTFIT[s.id]?s.id:''}));

/* ================= CHARTS (built from the songs' own note data) ================= */
const WIN=[0.08,0.13,0.19],LATE=0.015,WT=[1,0.97,0.85,0],JN=['PURRRFECT','GREAT','GOOD','MISS','SPLASH!'],JC=['#ffe66d','#7dff9b','#7dc7ff','#ff5a6e','#5ad1ff'],FEV=[15,25,30];
const DIFF=['EASY','NORMAL','HARD'],APPROACH=[1.75,1.4,1.0],WSC=[1.15,1,0.95];
const win=i=>WIN[i]*WSC[G.diff||0];
function secAt(song,t){for(const s of song.secs)if(t>=s[1]-1e-3&&t<s[2]-1e-3)return s[0];return'';}
function buildChart(song,diff){const spb=60/song.bpm,sd=spb/4,gap=[Math.max(0.5,spb*0.98),0.25,0.15][diff],holdMin=[0.5,0.4,0.3][diff],H2=diff===2;
 const PR={lead:5,stab:4,snare:3,kick:2,bass:1,hat:0},notes=[],slots=new Map();
 for(const [t,k,d,p] of song.chart){if(!(k in PR))continue;if(k==='hat'&&diff<2)continue;if(k==='bass'&&diff===0)continue;const sec=secAt(song,t);if(sec==='call'||!sec)continue;
  const idx=Math.round(t/sd);if(diff===0&&idx%2)continue;const c=slots.get(idx);if(!c||PR[k]>PR[c.k])slots.set(idx,{t,k,d,p,sec,idx});}
 const keys=[...slots.keys()].sort((a,b)=>a-b);let last=-9,busy=-9,hs=0,side=1,lastP=null,sinceSw=9,ks=1,lastDbl=-9,lastSw=-9;
 for(const i of keys){const e=slots.get(i);if(e.t-last<gap-1e-6)continue;
  const ov=e.t<busy;// Hard: taps on the free paw while a yarn hold is running
  if(ov&&!(H2&&e.k!=='lead'&&e.t-last>=Math.max(gap,spb*0.5)-1e-6&&e.t<busy-0.12))continue;
  const bar=Math.floor(e.idx/16),pos=e.idx%16,n={t:e.t,kind:'tap',r:hash(i)};const big=e.sec==='hook'||e.sec==='drop';
  if(e.k==='lead'){side=lastP!=null&&e.p!==lastP?(e.p>lastP?1:-1):-side;lastP=e.p;n.item='fish';
   if(e.d>=holdMin){const end=e.t+e.d-sd*0.5;if(end-e.t>=0.3){n.kind='hold';n.item='yarn';n.end=end;}}}
  else{lastP=null;if(e.k==='kick'||e.k==='bass'){ks=-ks;side=ks;n.item='mouse';}else if(e.k==='hat'){side=-side;n.item='butterfly';}else{side=-side;n.item=e.k==='snare'?'butterfly':'fish';}}
  if(ov){side=-hs;n.kind='tap';delete n.end;if(n.item==='yarn')n.item='fish';}
  if(!ov&&n.kind==='tap'&&sinceSw>=(H2?2:3)&&(e.k==='stab'||(e.k==='snare'&&(e.sec==='build'||(big&&(H2?pos%8===4:bar%2===1&&pos===12)))))){n.kind='swipe';n.item='laser';sinceSw=0;}else sinceSw++;
  n.side=side;notes.push(n);last=e.t;if(n.end){busy=n.end+gap*0.8;hs=side;}
  if(H2&&!ov&&n.kind==='tap'&&big&&(pos===0||pos===8)&&e.t-lastDbl>=spb*2-1e-6){lastDbl=e.t;n.dbl=1;const tw={t:e.t,kind:'tap',item:n.item==='mouse'?'fish':'mouse',side:-side,r:hash(i+0.5),dbl:1};n.pair=tw;tw.pair=n;notes.push(tw);}
  else if(H2&&!ov&&n.kind==='tap'&&n.item!=='mouse'&&e.t-lastSw>=spb*4&&hash(i*1.7)<0.5&&e.t>4){n.sw=1;lastSw=e.t;}}
 // Hard: cucumbers (don't touch!) on empty off-beats, never close to a real note on the same side
 if(H2){const real=notes.slice();for(const s of song.secs){if(!/hook|drop|verse/.test(s[0]))continue;for(let t0=s[1]+spb*2;t0<s[2]-spb*2;t0+=spb*4){
   for(let j=0;j<8;j++){const tt=t0+j*spb*0.5,sdc=hash(tt*3.3)<0.5?-1:1;if(real.some(m=>Math.abs(m.t-tt)<0.3&&(m.side===sdc||m.side===0)||(m.end&&m.side===sdc&&tt>m.t-0.3&&tt<m.end+0.3)))continue;notes.push({t:tt,kind:'tap',item:'cuke',side:sdc,decoy:1,r:hash(tt)});break;}}}}
 // call & response: Nix meows (baked into the song) then you tap it back
 let grp=-1,lastCall=-9,lastR=-9;const rgap=[0.3,0.2,0][diff];
 for(const [t,k] of song.chart){if(k==='call'){const f=t-lastCall>1.2;lastCall=t;notes.push({t,kind:'call',item:'meow',side:0,first:f});}
  else if(k==='resp'){if(t-lastR<rgap)continue;lastR=t;const f=!notes.some(m=>m.resp&&Math.abs(m.t-t)<1.2&&m.t<t);notes.push({t,kind:'tap',item:'note',side:0,resp:1,first:f,r:hash(t*100)});}}
 notes.sort((a,b)=>a.t-b.t);
 for(let i=0;i<notes.length;i++){const n=notes[i];if(n.resp&&n.first){const prev=notes.slice(0,i).reverse().find(m=>m.resp);n.first=!prev||n.t-prev.t>1.2;}}
 return notes;}
function tutChart(song){const b=60/song.bpm,B=4*b,at=(br,bt)=>br*B+bt*b,ns=[];
 [[2,1],[2,3],[3,1],[3,3]].forEach(([br,bt],i)=>ns.push({t:at(br,bt),kind:'tap',item:i%2?'fish':'mouse',side:i%2?1:-1,r:0.3+i*0.1,tip:i===0?'TAP the side the snack lands on!':null}));
 ns.push({t:at(4,1),kind:'hold',item:'yarn',side:-1,end:at(4,3),r:0.4,tip:'HOLD while the yarn unrolls…'});ns.push({t:at(5,1),kind:'hold',item:'yarn',side:1,end:at(5,3),r:0.6});
 [[6,1,-1],[6,3,1],[7,1,-1],[7,3,1]].forEach(([br,bt,sd],i)=>ns.push({t:at(br,bt),kind:'swipe',item:'laser',side:sd,r:0.2+i*0.2,tip:i===0?'SWIPE across the laser dot!':null}));
 [0,1,1.5,2].forEach((bt,i)=>{ns.push({t:at(8,bt),kind:'call',item:'meow',side:0,first:i===0,synth:1,tip:i===0?'Nix meows a rhythm…':null});ns.push({t:at(9,bt),kind:'tap',item:'note',side:0,resp:1,first:i===0,r:0.5,tip:i===0?'…now TAP it back!':null});});
 ns.sort((a,c)=>a.t-c.t);ns.end=at(10,1);return ns;}

/* ================= NIX (vector art) ================= */
const CAPS={black:{c:'#16161b',t:'#fff',n:'Black'},red:{c:'#d8283a',t:'#fff',n:'Red'},gold:{c:'#e8b830',t:'#1a1a1a',n:'Gold'},white:{c:'#eeeeee',t:'#111',n:'White'},rainbow:{c:'rainbow',t:'#fff',n:'Rainbow'},pink:{c:'#ff6fb5',t:'#fff',n:'Idol Pink'},headliner:{c:'#101014',t:'#ffd23a',n:'Headliner'}};
const HOODS={black:{c:'#1c1c24',n:'Black'},purple:{c:'#6b3fd1',n:'Purple'},teal:{c:'#13a3a0',n:'Teal'},red:{c:'#c2273a',n:'Red'},gold:{c:'#d9a521',n:'Gold'},pink:{c:'#e85a9e',n:'Idol Pink'},frost:{c:'#5b8fb8',n:'Frost'},sunset:{c:'#ff7a45',n:'Sunset'},velvet:{c:'#4a1030',n:'Velvet'}};
const ACCS={mic:{n:'Idol Mic',i:'🎤'},horns:{n:'Viking Horns',i:'🛡️'},lei:{n:'Flower Lei',i:'🌺'},cape:{n:'Gothic Cape',i:'🦇'}};
function shade(hex,a){const c=parseInt(hex.slice(1),16);return'rgb('+clamp((c>>16)+a,0,255)+','+clamp((c>>8&255)+a,0,255)+','+clamp((c&255)+a,0,255)+')';}
function hexA(hex,a){const c=parseInt(hex.slice(1),16);return'rgba('+(c>>16)+','+(c>>8&255)+','+(c&255)+','+a+')';}
function circ(x,y,r){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
function ell(x,y,rx,ry,rot){g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2);g.fill();}
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function ik(sx,sy,tx,ty,l1,l2,sd){const dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx),dd=Math.min(d,l1+l2-1),q=Math.acos(clamp((l1*l1+dd*dd-l2*l2)/(2*l1*dd),-1,1));
 const e1x=sx+Math.cos(a+q)*l1,e1y=sy+Math.sin(a+q)*l1,e2x=sx+Math.cos(a-q)*l1,e2y=sy+Math.sin(a-q)*l1,pk=sd*e1x+e1y*0.3>sd*e2x+e2y*0.3;
 return{ex:pk?e1x:e2x,ey:pk?e1y:e2y,hx:sx+Math.cos(a)*dd,hy:sy+Math.sin(a)*dd};}
function handT(pose,sd,b,bob,tm){
 switch(pose){case 'catchL':if(sd<0)return[-138,-52];return[sd*36,-60];case 'catchR':if(sd>0)return[138,-52];return[sd*36,-60];case 'catchC':return[sd*34,-6];case 'meow':return[sd*44,-96];case 'hitL':if(sd<0)return[-142,-196];break;case 'hitR':if(sd>0)return[142,-196];break;
  case 'roof':return[sd*112,-206+bob*22];case 'tip':return sd>0?[58,-214]:[-104,-46];
  case 'miss':return[sd*128,-150+Math.sin(tm*30+sd)*14];case 'shrug':return[sd*116,-136];
  case 'spin':return[sd*124,-72+Math.sin(b*Math.PI*2+sd)*12];
  case 'd_kpop':{const up=(Math.floor(b/2)%2?1:-1)===sd;return up?[sd*96,-236+bob*10]:[sd*76,-42];}
  case 'd_viking':{const act=(Math.floor(b)%2?1:-1)===sd;return act?[sd*96,-176+bob*120]:[sd*104,-150];}
  case 'd_summer':return[sd*(92+bob*14),-150-bob*70];
  case 'd_goth':return[sd*132,-96+Math.sin(b*Math.PI*0.5+sd)*30];}
 return[sd*30,-44-bob*6];}
const NC=new Map();let ncScale=0;
function cached(key,x0,y0,w,h,s,fn){const px=s*DPR;if(px!==ncScale){NC.clear();ncScale=px;}let c=NC.get(key);if(!c){if(NC.size>48)NC.clear();c=document.createElement('canvas');c.width=Math.ceil(w*px)+2;c.height=Math.ceil(h*px)+2;const og=g;g=c.getContext('2d');g.scale(px,px);g.translate(-x0,-y0);g.lineCap='round';g.lineJoin='round';fn();g=og;NC.set(key,c);}
 g.drawImage(c,x0,y0,(c.width)/px,(c.height)/px);}
const RIM='rgba(150,140,255,';
/* soft inner rim light: stroke the current path clipped to itself */
function rimPath(path,gx0,gy0,gx1,gy1,a,lw){g.save();g.clip(path);const lg=g.createLinearGradient(gx0,gy0,gx1,gy1);lg.addColorStop(0,RIM+'0)');lg.addColorStop(0.55,RIM+(a*0.25)+')');lg.addColorStop(1,RIM+a+')');g.strokeStyle=lg;g.lineWidth=lw;g.stroke(path);g.restore();}
function headPath(){const p=new Path2D();p.moveTo(0,-312);p.bezierCurveTo(74,-312,128,-280,131,-218);p.bezierCurveTo(135,-160,100,-121,0,-119);p.bezierCurveTo(-100,-121,-135,-160,-131,-218);p.bezierCurveTo(-128,-280,-74,-312,0,-312);p.closePath();return p;}
/* head without eyes/cap/ears (cached by mouth variant) */
function headRaw(m){const hp=headPath();
 const hg=g.createRadialGradient(-38,-262,12,0,-210,150);hg.addColorStop(0,'#3c3c4a');hg.addColorStop(0.55,'#1a1a22');hg.addColorStop(1,'#09090d');g.fillStyle=hg;g.fill(hp);
 rimPath(hp,-120,-300,110,-120,0.38,14);
 g.fillStyle='rgba(255,255,255,.06)';ell(-70,-150,34,20,0.3);ell(70,-150,34,20,-0.3);
 g.fillStyle='rgba(255,255,255,.07)';ell(-42,-282,40,16,-0.35);
 g.fillStyle='#f4a3b6';g.beginPath();g.moveTo(-13,-171);g.bezierCurveTo(-6,-176,6,-176,13,-171);g.bezierCurveTo(10,-163,4,-158,0,-157);g.bezierCurveTo(-4,-158,-10,-163,-13,-171);g.fill();
 g.fillStyle='rgba(255,255,255,.55)';ell(-4,-170,4,2);
 g.strokeStyle='#5c5c6c';g.lineWidth=2.6;
 if(m==='happy'){g.fillStyle='#3a0f1c';g.beginPath();g.moveTo(-14,-149);g.quadraticCurveTo(0,-126,14,-149);g.quadraticCurveTo(0,-143,-14,-149);g.fill();g.fillStyle='#f27d96';ell(0,-137,6,4);}
 else if(m==='miss'){g.beginPath();g.moveTo(-12,-140);g.bezierCurveTo(-6,-148,6,-148,12,-140);g.stroke();}
 else if(m==='shrug'){g.beginPath();g.moveTo(-11,-145);for(let i=1;i<=4;i++)g.lineTo(-11+i*5.5,-145+(i%2?-4:0));g.stroke();}
 else{g.beginPath();g.moveTo(0,-157);g.lineTo(0,-151);g.moveTo(-11,-146);g.quadraticCurveTo(-5,-142,0,-151);g.quadraticCurveTo(5,-142,11,-146);g.stroke();}
 g.strokeStyle='rgba(245,245,250,.9)';g.lineWidth=1.9;for(const sd of [-1,1])for(let k=0;k<3;k++){g.beginPath();g.moveTo(sd*60,-160+k*8);g.quadraticCurveTo(sd*108,-168+k*10,sd*(156-k*6),-176+k*17);g.stroke();}}
function capRaw(ck){g.translate(0,-7);const cap=CAPS[ck];let cc=cap.c;if(cc==='rainbow'){cc=g.createLinearGradient(-110,0,110,0);['#ff3d6e','#ff9a3d','#ffe63d','#5dff6b','#33c8ff','#9a5cff'].forEach((c,i)=>cc.addColorStop(i/5,c));}
 const dark=cap.c==='rainbow'?'#1a1a1a':shade(cap.c,-30);
 const cr=new Path2D();cr.moveTo(-114,-254);cr.bezierCurveTo(-120,-352,116,-356,112,-258);cr.quadraticCurveTo(0,-246,-114,-254);cr.closePath();
 g.fillStyle=cc;g.fill(cr);
 const sg=g.createLinearGradient(-110,-340,110,-250);sg.addColorStop(0,'rgba(255,255,255,.14)');sg.addColorStop(0.5,'rgba(255,255,255,0)');sg.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=sg;g.fill(cr);
 rimPath(cr,-100,-340,110,-250,0.32,8);
 g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=2;g.beginPath();g.moveTo(0,-330);g.quadraticCurveTo(-56,-318,-74,-256);g.moveTo(0,-330);g.quadraticCurveTo(56,-318,72,-258);g.stroke();
 g.fillStyle=dark;ell(0,-330,8,5);
 g.fillStyle=cap.t;g.font='900 50px "Arial Black",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';
 g.save();g.translate(0,-288);g.scale(1,0.92);g.fillText('N',-44,0);g.fillText('I',-6,0);g.fillText('X',36,0);g.restore();
 const br=new Path2D();br.moveTo(-150,-252);br.bezierCurveTo(-110,-276,70,-276,116,-256);br.bezierCurveTo(90,-238,20,-232,-40,-234);br.bezierCurveTo(-96,-236,-140,-240,-150,-252);br.closePath();
 const bg=g.createLinearGradient(0,-272,0,-232);bg.addColorStop(0,cap.c==='rainbow'?'#2a2a2a':shade(cap.c,-12));bg.addColorStop(1,cap.c==='rainbow'?'#0e0e0e':shade(cap.c,-46));g.fillStyle=bg;g.fill(br);
 g.strokeStyle=RIM+'.45)';g.lineWidth=2.5;g.beginPath();g.moveTo(-146,-252);g.bezierCurveTo(-106,-274,70,-274,114,-256);g.stroke();
 g.fillStyle='rgba(0,0,0,.25)';ell(-10,-231,96,5);}
function earRaw(){const e=new Path2D();e.moveTo(-34,18);e.bezierCurveTo(-30,-20,-6,-58,8,-74);e.bezierCurveTo(26,-50,40,-14,36,20);e.quadraticCurveTo(0,28,-34,18);e.closePath();
 const eg=g.createLinearGradient(0,-74,0,20);eg.addColorStop(0,'#2e2e3a');eg.addColorStop(1,'#0c0c10');g.fillStyle=eg;g.fill(e);rimPath(e,-30,20,36,-60,0.4,7);
 const pg=g.createLinearGradient(0,-50,0,14);pg.addColorStop(0,'#f7b3c2');pg.addColorStop(1,'#c96d84');g.fillStyle=pg;g.beginPath();g.moveTo(-18,12);g.bezierCurveTo(-14,-14,0,-40,8,-52);g.bezierCurveTo(20,-34,26,-8,24,14);g.quadraticCurveTo(2,20,-18,12);g.fill();}
function torsoRaw(hc){const bp=new Path2D();bp.moveTo(-60,-130);bp.bezierCurveTo(-104,-122,-114,-46,-92,-16);bp.bezierCurveTo(-60,4,60,4,92,-16);bp.bezierCurveTo(114,-46,104,-122,60,-130);bp.closePath();
 const bg=g.createLinearGradient(-60,-130,60,0);bg.addColorStop(0,shade(hc,26));bg.addColorStop(1,shade(hc,-14));g.fillStyle=bg;g.fill(bp);
 rimPath(bp,-100,-120,100,0,0.34,12);
 g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=3;g.beginPath();g.moveTo(-58,-86);g.quadraticCurveTo(-40,-70,-52,-40);g.moveTo(54,-92);g.quadraticCurveTo(34,-66,50,-34);g.moveTo(-30,-22);g.quadraticCurveTo(0,-14,30,-22);g.stroke();
 g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=4;g.beginPath();g.moveTo(-50,-92);g.quadraticCurveTo(-32,-74,-44,-44);g.moveTo(-24,-16);g.quadraticCurveTo(0,-9,24,-16);g.stroke();
 const cg=g.createLinearGradient(0,-142,0,-110);cg.addColorStop(0,shade(hc,30));cg.addColorStop(1,shade(hc,-6));g.fillStyle=cg;ell(0,-124,70,17);
 g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=2;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(i*17,-136);g.quadraticCurveTo(i*18,-124,i*17,-110);g.stroke();}
 }
function bellRaw(){g.strokeStyle='#8a6410';g.lineWidth=3;g.beginPath();g.arc(0,2,5,0,Math.PI*2);g.stroke();
 const bg=g.createRadialGradient(-6,10,2,0,18,20);bg.addColorStop(0,'#fff8c8');bg.addColorStop(0.35,'#f6c63a');bg.addColorStop(0.8,'#b07a10');bg.addColorStop(1,'#6a4500');g.fillStyle=bg;circ(0,19,17);
 g.strokeStyle='#7a5200';g.lineWidth=2;g.beginPath();g.moveTo(-16,15);g.quadraticCurveTo(0,19,16,15);g.stroke();
 g.fillStyle='#3a2600';circ(0,26,4);g.fillRect(-1.6,26,3.2,9);
 g.fillStyle='rgba(255,255,255,.9)';ell(-7,11,5,3,-0.6);g.fillStyle='rgba(255,255,255,.5)';circ(8,24,1.8);}
function footRaw(){const fg=g.createLinearGradient(0,-16,0,14);fg.addColorStop(0,'#2c2c38');fg.addColorStop(1,'#0a0a0e');g.fillStyle=fg;ell(0,0,30,15);
 g.strokeStyle=RIM+'.35)';g.lineWidth=2.5;g.beginPath();g.ellipse(0,0,28,13,0,Math.PI*1.1,Math.PI*1.9);g.stroke();
 g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=2;g.beginPath();g.moveTo(-8,4);g.lineTo(-8,12);g.moveTo(8,4);g.lineTo(8,12);g.stroke();}
function drawEyes(o){for(const sd of [-1,1]){const ex=sd*53,ey=-199;
  if(o.miss){g.strokeStyle='#f3efe6';g.lineWidth=7;g.beginPath();g.moveTo(ex+sd*15,ey-14);g.quadraticCurveTo(ex-sd*4,ey-4,ex-sd*13,ey);g.quadraticCurveTo(ex-sd*4,ey+4,ex+sd*15,ey+14);g.stroke();continue;}
  const sq=o.happy?0.82:1;g.save();g.translate(ex,ey);g.rotate(sd*0.1);g.scale(1,sq);
  g.fillStyle='rgba(0,0,0,.45)';ell(0,3,39,44);
  const sg=g.createRadialGradient(-6,-12,6,0,0,44);sg.addColorStop(0,'#ffffff');sg.addColorStop(0.7,'#ecebe6');sg.addColorStop(1,'#b9b9c4');g.fillStyle=sg;ell(0,0,36,41);
  g.save();g.beginPath();g.ellipse(0,0,36,41,0,0,Math.PI*2);g.clip();
  const ix=o.lx*13,iy=4+o.ly*6,ig=g.createRadialGradient(ix-4,iy-10,3,ix,iy,30);ig.addColorStop(0,'#c8f59a');ig.addColorStop(0.45,'#5cb43e');ig.addColorStop(0.85,'#2a6e22');ig.addColorStop(1,'#163e12');g.fillStyle=ig;ell(ix,iy,26,30);
  g.fillStyle='#050507';ell(ix+o.lx*2,iy+1,12,16);
  g.fillStyle='rgba(0,0,0,.12)';ell(0,-36,40,12);
  if(o.lid>0){g.fillStyle='#15151c';g.fillRect(-42,-44,84,88*o.lid);g.strokeStyle='#050508';g.lineWidth=4;g.beginPath();g.moveTo(-40,-44+88*o.lid);g.lineTo(40,-44+88*o.lid);g.stroke();}
  g.restore();
  if(o.lid<0.6){g.fillStyle='#fff';ell(ix-9,iy-12,7.5,9,-0.4);circ(ix+8,iy+9,3.4);}
  g.restore();}
 if(o.shades&&!o.miss){g.fillStyle='#07070a';for(const sd of [-1,1]){g.beginPath();g.ellipse(sd*54,-200,46,34,sd*0.08,0,Math.PI*2);g.fill();}
  g.fillRect(-14,-212,28,7);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=4;for(const sd of [-1,1]){g.beginPath();g.moveTo(sd*38,-214);g.lineTo(sd*26,-194);g.stroke();}}
 if(o.happy&&!o.miss){g.fillStyle='rgba(255,110,150,.28)';ell(-88,-160,20,10);ell(88,-160,20,10);}}
/* VR headset (VR Showdown only): plush white visor, grey cushion, four camera dots, side straps. No logos. */
function vrRaw(){g.lineCap='round';
 for(const sd of [-1,1]){const st=new Path2D();st.moveTo(sd*106,-214);st.quadraticCurveTo(sd*138,-222,sd*132,-262);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=22;g.stroke(st);g.strokeStyle='#e4e7ec';g.lineWidth=17;g.stroke(st);g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=5;g.save();g.translate(-sd*2,-3);g.stroke(st);g.restore();}
 g.fillStyle='rgba(0,0,0,.32)';rr(-122,-247,244,92,42);g.fill();
 g.fillStyle='#8e929c';rr(-118,-252,236,88,40);g.fill();
 const vp=new Path2D();vp.moveTo(-74,-258);vp.bezierCurveTo(-30,-264,30,-264,74,-258);vp.bezierCurveTo(116,-254,122,-238,120,-212);vp.bezierCurveTo(118,-186,108,-172,80,-170);vp.lineTo(28,-170);vp.quadraticCurveTo(0,-186,-28,-170);vp.lineTo(-80,-170);vp.bezierCurveTo(-108,-172,-118,-186,-120,-212);vp.bezierCurveTo(-122,-238,-116,-254,-74,-258);vp.closePath();
 const vg=g.createLinearGradient(0,-262,0,-170);vg.addColorStop(0,'#ffffff');vg.addColorStop(0.55,'#eef0f3');vg.addColorStop(1,'#c9cdd5');g.fillStyle=vg;g.fill(vp);
 g.save();g.clip(vp);g.strokeStyle='rgba(120,126,140,.45)';g.lineWidth=8;g.translate(0,4);g.stroke(vp);g.restore();
 g.fillStyle='rgba(255,255,255,.75)';ell(-52,-246,38,7,-0.08);
 g.fillStyle='#7d818b';g.beginPath();g.moveTo(-26,-171);g.quadraticCurveTo(0,-190,26,-171);g.quadraticCurveTo(0,-180,-26,-171);g.fill();
 for(const [cx,cy] of [[-96,-244],[96,-244],[-100,-188],[100,-188]]){g.fillStyle='#2a2d36';circ(cx,cy,6.5);g.fillStyle='#0d0e12';circ(cx,cy,4);g.fillStyle='rgba(255,255,255,.7)';circ(cx-1.6,cy-1.8,1.4);}}
function drawVR(A){cached('vr',-150,-275,300,115,1/(ncScale/DPR||1)*0+A.s,vrRaw);
 if(A.vrc){const ph=((A.beat%1)+1)%1,k=Math.pow(1-ph,3);if(k>0.02){g.save();g.globalAlpha=0.55*k;g.strokeStyle=A.vrc;g.shadowColor=A.vrc;g.shadowBlur=18;g.lineWidth=4;rr(-104,-246,208,64,30);g.stroke();g.restore();}}}
function drawNix(x,y,s,A){
 const b=A.beat,tm=A.time,ph=((b%1)+1)%1,bob=Math.pow(Math.cos(ph*Math.PI),2);let pose=A.pose;const sq=bob*(pose==='miss'?0.3:1);
 if(A.dance&&pose==='idle')pose='d_'+A.dance;let spin=false;if(A.fever&&(pose==='idle'||pose==='fever')||pose==='fever'){if(Math.floor(b/4)%2===1)spin=true;else pose='roof';}
 const hc=HOODS[A.hood].c,hap=A.happy>0,miss=pose==='miss';
 const hop=(A.happy>0&&A.happy<0.36)?Math.sin((0.36-A.happy)/0.36*Math.PI)*14:0,fv=A.fever?1.6:1;
 g.save();g.translate(x,y);g.scale(s,s);
 g.save();g.scale(1-hop*0.012,1);g.fillStyle='rgba(0,0,0,.22)';ell(0,2,spin?84:134,20);g.fillStyle='rgba(0,0,0,.3)';ell(0,2,spin?60:100,12);g.restore();
 if(spin){const c=Math.cos(b*Math.PI*1.5),sx=Math.sign(c||1)*Math.max(0.28,Math.abs(c));g.translate(0,-170);g.scale(sx,1);g.rotate(Math.sin(b*Math.PI*0.5)*0.12);g.translate(0,165);pose='spin';}
 if(A.wob>0){g.translate(Math.sin(tm*18)*10*A.wob,0);g.rotate(Math.sin(tm*30)*0.14*A.wob);}
 g.translate(0,-hop-(pose==='d_summer'?bob*12:0));
 const sqx=1+0.045*sq*fv,sqy=1-0.055*sq*fv;g.scale(sqx,sqy);
 g.lineCap='round';g.lineJoin='round';
 if(A.acc==='cape')capeBack(b,tm);
 const sw=Math.sin(tm*2.6+b*0.5)*(A.fever?1.4:1);
 const tl=new Path2D();tl.moveTo(60,-34);tl.bezierCurveTo(138,-26,150+sw*14,-110,118+sw*34,-160);tl.quadraticCurveTo(108+sw*40,-178,124+sw*44,-186);
 g.strokeStyle='#121218';g.lineWidth=20;g.stroke(tl);g.strokeStyle=RIM+'.2)';g.lineWidth=4;g.save();g.translate(3,-3);g.stroke(tl);g.restore();
 for(const sd of [-1,1]){let fx=sd*42,fy=-8;const lift=pose!=='spin'&&((Math.floor(b)%2===0)===(sd<0))?bob*6:0;if(pose==='spin'){fx=sd*90;fy=-30+Math.sin(b*Math.PI*2+sd)*12;}
  g.save();g.translate(fx,fy-lift);g.rotate(sd*0.12);cached('foot',-32,-17,64,34,s,footRaw);g.restore();}
 cached('t'+hc,-118,-150,236,156,s,()=>torsoRaw(hc));if(A.acc==='horns')cached('fur',-120,-150,240,60,s,furRaw);
 g.save();const nod=(pose==='tip'?6:0)+bob*(pose==='d_goth'?14:pose==='d_viking'?9:5),tilt=Math.sin(b*Math.PI)*0.06+(miss?Math.sin(tm*25)*0.12:0)+(pose==='shrug'?0.14:0);
 g.translate(0,-128+nod);g.rotate(tilt);const hs=1+0.02*sq*fv;g.scale(hs*1.01,2-hs);g.translate(0,128);
 const flat=(miss||pose==='shrug')?1:0;
 for(const sd of [-1,1]){const fr=((tm*0.45+(sd>0?0.43:0))%1.7),tw=fr<0.16?Math.sin(fr/0.16*Math.PI*2)*0.28:0;
  g.save();g.translate(sd*84,-276);g.scale(sd,1);g.rotate(0.36+flat*0.9+tw+(A.fever?bob*0.12:0));cached('ear',-38,-78,80,110,s,earRaw);g.restore();}
 const mv=hap&&!miss?'happy':miss?'miss':pose==='shrug'?'shrug':'n';
 cached('h'+mv,-164,-316,328,202,s,()=>headRaw(mv));
 const dk=Math.floor(tm/1.35),dv=hash(dk*7.3),dart=[-0.95,-0.55,-0.2,0.35,0.85][Math.floor(dv*5)],ldy=(hash(dk*3.1)-0.5)*0.8;
 const look=pose==='hitL'||pose==='catchL'?-1:pose==='hitR'||pose==='catchR'?1:clamp((A.look||0)*0.5+dart*0.8,-1,1);
 drawEyes({miss,happy:hap,shades:!!A.shades,lx:look,ly:ldy,lid:A.blink>0?1:pose==='tip'?0.38:A.cool?0.22:0});
 if(A.vr)drawVR({s,beat:b,vrc:A.vrc});
 if(A.acc)accFace(A.acc,b,tm);
 if(A.acc==='horns')cached('horns',-200,-420,400,150,s,hornsRaw);
 cached('c'+A.cap,-156,-372,276,140,s,()=>capRaw(A.cap));
 g.restore();
 const bs=Math.sin(ph*Math.PI*4)*(1-ph)*0.7+Math.sin(tm*3)*0.08;g.save();g.translate(0,-114);g.rotate(bs);cached('bell',-20,-6,40,44,s,bellRaw);g.restore();
 if(A.acc==='lei')cached('lei',-96,-140,192,52,s,leiRaw);if(A.acc==='cape')cached('collar',-110,-150,220,50,s,collarRaw);
 if(ph<0.22&&A.beat>0){const k=(0.22-ph)*60;g.fillStyle='#fff6b0';star(18-bs*20,-98,k,k*0.35);}
 for(const sd of [-1,1]){const shx=sd*74,shy=-108,[tx,ty]=handT(pose,sd,b,bob,tm),a=ik(shx,shy,tx,ty,52,52,sd);
  const ap=new Path2D();ap.moveTo(shx,shy);ap.quadraticCurveTo(a.ex,a.ey,a.hx,a.hy);
  g.strokeStyle=RIM+'.2)';g.lineWidth=37;g.stroke(ap);g.strokeStyle=shade(hc,-6);g.lineWidth=33;g.stroke(ap);g.strokeStyle=shade(hc,14);g.lineWidth=12;g.save();g.translate(-2,-3);g.stroke(ap);g.restore();
  const pg=g.createRadialGradient(a.hx-5,a.hy-6,2,a.hx,a.hy,18);pg.addColorStop(0,'#3a3a46');pg.addColorStop(1,'#0c0c10');g.fillStyle=pg;circ(a.hx,a.hy,14);
  if(a.hy<shy-30){g.fillStyle='#f4a3b6';ell(a.hx,a.hy+3,6,5);circ(a.hx-7,a.hy-6,3);circ(a.hx,a.hy-9,3);circ(a.hx+7,a.hy-6,3);}}
 g.restore();}
/* v1.0 stage outfits */
function capeBack(b,tm){const fl=Math.sin(tm*2.2)*10+Math.sin(b*Math.PI)*6;const cg=g.createLinearGradient(0,-260,0,0);cg.addColorStop(0,'#2a0a1c');cg.addColorStop(1,'#0a0208');g.fillStyle=cg;g.beginPath();g.moveTo(-70,-140);g.lineTo(-134,-250);g.lineTo(-96,-150);g.quadraticCurveTo(-150-fl,-60,-168-fl,6);g.quadraticCurveTo(0,26,168+fl,6);g.quadraticCurveTo(150+fl,-60,96,-150);g.lineTo(134,-250);g.lineTo(70,-140);g.closePath();g.fill();
 g.strokeStyle='#e0435f';g.lineWidth=3;g.globalAlpha=0.7;g.beginPath();g.moveTo(-134,-250);g.lineTo(-96,-150);g.quadraticCurveTo(-150-fl,-60,-168-fl,6);g.moveTo(134,-250);g.lineTo(96,-150);g.quadraticCurveTo(150+fl,-60,168+fl,6);g.stroke();g.globalAlpha=1;}
function collarRaw(){g.fillStyle='#3a0c22';g.beginPath();g.moveTo(-96,-130);g.quadraticCurveTo(0,-100,96,-130);g.lineTo(80,-112);g.quadraticCurveTo(0,-90,-80,-112);g.closePath();g.fill();g.fillStyle='#c0a060';circ(-56,-112,5);circ(56,-112,5);g.strokeStyle='#c0a060';g.lineWidth=2;g.beginPath();g.moveTo(-56,-112);g.quadraticCurveTo(0,-96,56,-112);g.stroke();}
function furRaw(){const fc=['#6b4a2e','#8a6440','#5a3b22'];for(let i=0;i<15;i++){const xx=-108+i*15.4,yy=-128+Math.abs(xx)*0.12+(i%2)*4;g.fillStyle=fc[i%3];ell(xx,yy,13,11);}g.fillStyle='rgba(255,240,210,.18)';for(let i=0;i<15;i+=2){const xx=-108+i*15.4;ell(xx-3,-134+Math.abs(xx)*0.12,6,3);}}
function hornsRaw(){for(const sd of [-1,1]){g.save();g.scale(sd,1);const hp=new Path2D();hp.moveTo(96,-300);hp.bezierCurveTo(150,-300,176,-340,170,-404);hp.bezierCurveTo(158,-360,140,-334,104,-326);hp.closePath();const hg=g.createLinearGradient(96,-300,170,-404);hg.addColorStop(0,'#c9b48a');hg.addColorStop(1,'#fff6e0');g.fillStyle=hg;g.fill(hp);g.strokeStyle='#3a2a18';g.lineWidth=3;g.stroke(hp);
 g.strokeStyle='rgba(90,60,30,.55)';g.lineWidth=2.5;for(let i=1;i<4;i++){const t=i/4,x0=lerp(100,170,t),y0=lerp(-312,-396,t);g.beginPath();g.moveTo(x0-8,y0+8);g.lineTo(x0+8,y0-4);g.stroke();}
 g.fillStyle='#a8a8b8';rr(86,-332,24,40,6);g.fill();g.fillStyle='#e8e8f0';circ(98,-300,4);circ(98,-322,4);g.restore();}}
function leiRaw(){const fc=['#ff5f8a','#ffd23a','#ff9a3d','#ff7fd0','#fff27a'];for(let i=0;i<13;i++){const u=i/12,xx=lerp(-82,82,u),yy=-126+Math.sin(u*Math.PI)*16;g.fillStyle=fc[i%5];for(let k=0;k<5;k++){const a=k*Math.PI*0.4;circ(xx+Math.cos(a)*6,yy+Math.sin(a)*6,5.2);}g.fillStyle='#fff6b0';circ(xx,yy,3);}g.fillStyle='#2bb24c';for(let i=0;i<12;i+=3){const u=(i+0.5)/12;ell(lerp(-82,82,u),-124+Math.sin(u*Math.PI)*16+8,6,3,0.6);}}
function accFace(a,b,tm){
 if(a==='mic'){g.strokeStyle='#ff8fd0';g.lineWidth=7;g.beginPath();g.moveTo(-116,-236);g.quadraticCurveTo(-124,-160,-60,-148);g.stroke();g.strokeStyle='#fff';g.lineWidth=2.5;g.stroke();g.fillStyle='#ff5fb7';g.shadowColor='#ff5fb7';g.shadowBlur=12;ell(-52,-148,15,11);g.shadowBlur=0;g.fillStyle='#ffd1ec';circ(-55,-151,5);g.fillStyle='#e8e8f0';circ(-116,-236,15);g.fillStyle='#ff5fb7';circ(-116,-236,8);
  const k=0.6+0.4*Math.sin(tm*6);g.fillStyle='#ffd1ec';g.globalAlpha=k;star(96,-276,13,4);g.globalAlpha=1;g.fillStyle='#ff5fb7';circ(96,-276,4);}
 if(a==='horns'){g.strokeStyle='rgba(80,170,255,.85)';g.lineWidth=6;for(const sd of [-1,1]){g.beginPath();g.moveTo(sd*40,-172);g.lineTo(sd*72,-176);g.moveTo(sd*44,-160);g.lineTo(sd*70,-162);g.stroke();}}
 if(a==='lei'){for(let k=0;k<5;k++){const ag=k*Math.PI*0.4+0.3;g.fillStyle='#ff5f8a';circ(104+Math.cos(ag)*10,-250+Math.sin(ag)*10,8);}g.fillStyle='#ffd23a';circ(104,-250,5);}
 if(a==='cape'){g.fillStyle='#08080c';for(const sd of [-1,1]){g.beginPath();g.moveTo(sd*82,-208);g.lineTo(sd*104,-222);g.lineTo(sd*84,-196);g.closePath();g.fill();}g.fillStyle='rgba(110,20,60,.9)';ell(0,-138,12,3.4);}}
function star(x,y,r,r2){g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr2=i%2?r2:r;g.lineTo(x+Math.cos(a)*rr2,y+Math.sin(a)*rr2);}g.closePath();g.fill();}

/* ================= SCENE ================= */
const THEMES=[{sky:['#1b1236','#5a2d6e','#f08a5d'],acc:'#ffb36b',acc2:'#c59bff',floor:['#24173c','#0f0a1c'],b:['#2a1a40','#120c22'],name:'lofi'},
 {sky:['#0b1522','#163a4a','#2a6a6a'],acc:'#2ef2c8',acc2:'#ffd23a',floor:['#1a242c','#0a0f14'],b:['#1b2a33','#0b1218'],name:'street'},
 {sky:['#05031a','#1e0a46','#6a0f6e'],acc:'#ff3fd6',acc2:'#33dcff',floor:['#140a2c','#05030f'],b:['#1a0c36','#0a0518'],name:'neon'},
 {sky:['#020617','#0b1f4a','#1fb5c9'],acc:'#22f0ff',acc2:'#ff2bd6',floor:['#08122a','#02040c'],b:['#0a1634','#040a1a'],name:'cyber'},
 {sky:['#140726','#3a0d5e','#ff7a3d'],acc:'#ffd23a',acc2:'#ff4f9a',floor:['#1e0c34','#0a0414'],b:['#2a1046','#12061f'],name:'arcade'},
 {sky:['#0d2a1a','#2f6b3a','#ffb347'],acc:'#ffd400',acc2:'#3ddc84',floor:['#1a2614','#0a1008'],b:['#1d3320','#0c160d'],name:'reggae'},
 {sky:['#14041f','#3d0c52','#ff5fa8'],acc:'#ff5fb7',acc2:'#9d7bff',floor:['#260a32','#0d0414'],b:['#2c0c3c','#14061e'],name:'kpop',custom:1},
 {sky:['#020812','#0a2232','#24585e'],acc:'#7dffd0',acc2:'#9ad7ff',floor:['#0f1c22','#05090c'],b:['#0d1b24','#060d12'],name:'viking',custom:1},
 {sky:['#2a0f45','#b8407a','#ffb347'],acc:'#ffd23a',acc2:'#ff5f8a',floor:['#4a2340','#1c0c1c'],b:['#3a1640','#1e0a24'],name:'summer',custom:1},
 {sky:['#040208','#170a22','#3a1440'],acc:'#e0435f',acc2:'#b8a6ff',floor:['#140a18','#060308'],b:['#120a18','#07040c'],name:'goth',custom:1}];
function star2(x,cx,cy,r){x.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,q=i%2?r*0.45:r;x.lineTo(cx+Math.cos(a)*q,cy+Math.sin(a)*q);}x.closePath();x.fill();}
function buildBg(th){const c=document.createElement('canvas');c.width=Math.round(W*DPR);c.height=Math.round(H*DPR);const x=c.getContext('2d');x.scale(DPR,DPR);const hz=H*0.565;
 let gr=x.createLinearGradient(0,0,0,hz);gr.addColorStop(0,th.sky[0]);gr.addColorStop(0.6,th.sky[1]);gr.addColorStop(1,th.sky[2]);x.fillStyle=gr;x.fillRect(0,0,W,hz);
 let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
 x.fillStyle='#fff';for(let i=0;i<70;i++){x.globalAlpha=0.15+rnd()*0.6;x.fillRect(rnd()*W,rnd()*hz*0.6,1.6,1.6);}x.globalAlpha=1;
 if(th.name==='lofi'){x.fillStyle='#ffe9c4';x.shadowColor='#ffd59a';x.shadowBlur=40;x.beginPath();x.arc(W*0.82,H*0.1,W*0.07,0,7);x.fill();x.shadowBlur=0;}
 if(th.name==='cyber'){x.strokeStyle='rgba(34,240,255,.35)';x.lineWidth=1;for(let i=0;i<9;i++){const yy=hz-i*i*2.2-2;x.globalAlpha=0.15+i*0.05;x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke();}x.globalAlpha=1;x.fillStyle='#ff2bd6';x.shadowColor='#ff2bd6';x.shadowBlur=30;x.beginPath();x.moveTo(W*0.5,H*0.06);x.lineTo(W*0.56,H*0.13);x.lineTo(W*0.5,H*0.2);x.lineTo(W*0.44,H*0.13);x.closePath();x.globalAlpha=0.55;x.fill();x.globalAlpha=1;x.shadowBlur=0;}
 if(th.name==='arcade'){const bx=W*0.8,by=H*0.1,br=W*0.07,bg2=x.createRadialGradient(bx-br*0.35,by-br*0.4,2,bx,by,br);bg2.addColorStop(0,'#ffffff');bg2.addColorStop(0.5,'#c9cdd8');bg2.addColorStop(1,'#5a5f70');x.fillStyle=bg2;x.shadowColor='#ffd23a';x.shadowBlur=30;x.beginPath();x.arc(bx,by,br,0,7);x.fill();x.shadowBlur=0;x.fillStyle='#ffd23a';for(let i=0;i<5;i++){x.globalAlpha=0.5;star2(x,W*(0.1+i*0.17),H*(0.05+(i%2)*0.05),6);}x.globalAlpha=1;}
 if(th.name==='reggae'){const cy2=H*0.12,r2=W*0.09;['#e8322b','#ffd400','#2bb24c'].forEach((c,i)=>{x.fillStyle=c;x.globalAlpha=0.85;x.beginPath();x.arc(W*0.8,cy2,r2*(1-i*0.3),0,7);x.fill();});x.globalAlpha=1;}
 if(th.name==='neon'){const r=W*0.32,cy=hz-H*0.05;const sg=x.createLinearGradient(0,cy-r,0,cy+r);sg.addColorStop(0,'#ffe14d');sg.addColorStop(0.6,'#ff3fd6');x.fillStyle=sg;x.beginPath();x.arc(W/2,cy,r,Math.PI,0);x.fill();x.fillStyle=th.sky[2];for(let i=0;i<6;i++)x.fillRect(W/2-r,cy-r*0.5+i*r*0.11,r*2,2+i*1.4);}
 if(th.custom)customBg(x,th,hz,rnd);else for(let L=0;L<2;L++){let px=-10;x.fillStyle=th.b[L];while(px<W){const bw=22+rnd()*44,bh=H*(0.06+rnd()*0.17)*(L?0.75:1.15);x.fillStyle=th.b[L];x.fillRect(px,hz-bh,bw,bh);
  if(L){for(let wy=hz-bh+8;wy<hz-6;wy+=12)for(let wx=px+5;wx<px+bw-6;wx+=10)if(rnd()<0.35){x.fillStyle=hexA(rnd()<0.5?th.acc:th.acc2,0.55);x.fillRect(wx,wy,4,6);}}px+=bw+3;}}
 if(th.name==='street'){const wy=hz-H*0.09;x.fillStyle='#3a2626';x.fillRect(0,wy,W,hz-wy);x.strokeStyle='#241616';x.lineWidth=2;for(let yy=wy;yy<hz;yy+=10){x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke();for(let xx=((yy-wy)/10%2)*12;xx<W;xx+=24){x.beginPath();x.moveTo(xx,yy);x.lineTo(xx,yy+10);x.stroke();}}
  
  x.save();x.font='900 30px Arial Black,Impact,sans-serif';x.lineWidth=5;x.strokeStyle='#111';x.translate(W*0.72,hz-H*0.025);x.rotate(0.1);x.strokeText('MEOW',0,0);x.fillStyle=th.acc;x.fillText('MEOW',0,0);x.restore();}
 gr=x.createLinearGradient(0,hz,0,H);gr.addColorStop(0,th.floor[0]);gr.addColorStop(1,th.floor[1]);x.fillStyle=gr;x.fillRect(0,hz,W,H-hz);
 x.fillStyle=th.acc;x.globalAlpha=0.7;x.fillRect(0,hz-1,W,2);x.globalAlpha=1;return c;}
/* v1.0 venues: idol stage, fjord under the aurora, sunset beach, gothic cathedral */
function customBg(x,th,hz,rnd){const n=th.name;
 if(n==='kpop'){// arena stage: spotlights, LED heart screen, truss + risers
  x.save();x.globalCompositeOperation='lighter';for(let i=0;i<5;i++){const bx=W*(0.1+i*0.2),a=(i-2)*0.22;const gb=x.createLinearGradient(bx,0,bx,hz);gb.addColorStop(0,hexA(i%2?th.acc:th.acc2,0.28));gb.addColorStop(1,hexA(i%2?th.acc:th.acc2,0));x.fillStyle=gb;x.beginPath();x.moveTo(bx-6,0);x.lineTo(bx+6,0);x.lineTo(bx+Math.sin(a)*hz+40,hz);x.lineTo(bx+Math.sin(a)*hz-40,hz);x.fill();}x.restore();
  const sx=W*0.5,sy=H*0.12,sw=W*0.62,sh=H*0.17;x.fillStyle='#0a0312';x.fillRect(sx-sw/2-6,sy-6,sw+12,sh+12);x.fillStyle='#1c0828';x.fillRect(sx-sw/2,sy,sw,sh);
  for(let yy=0;yy<14;yy++)for(let xx=0;xx<24;xx++){const u=(xx+0.5)/24*2-1,v=(yy+0.5)/14*2-1,hx=u*1.25,hy=-v*1.35+0.25,hv=Math.pow(hx*hx+hy*hy-1,3)-hx*hx*hy*hy*hy<=0;x.fillStyle=hv?(yy<6?'#ff7fc8':'#ff3f9e'):'#3a1450';x.globalAlpha=hv?0.95:0.6;x.fillRect(sx-sw/2+xx*sw/24+1.5,sy+yy*sh/14+1.5,sw/24-3,sh/14-3);}x.globalAlpha=1;
  x.strokeStyle='#5a5070';x.lineWidth=3;x.beginPath();x.moveTo(0,H*0.085);x.lineTo(W,H*0.085);x.stroke();x.lineWidth=1;for(let i=0;i<W;i+=14){x.beginPath();x.moveTo(i,H*0.075);x.lineTo(i+7,H*0.095);x.lineTo(i+14,H*0.075);x.stroke();}
  for(let i=0;i<8;i++){x.fillStyle=i%2?th.acc:th.acc2;x.shadowColor=x.fillStyle;x.shadowBlur=10;x.beginPath();x.arc(W*(0.06+i*0.125),H*0.095,4,0,7);x.fill();}x.shadowBlur=0;
  for(let i=0;i<3;i++){const ry=hz-H*(0.03+i*0.03),rw=W*(0.95-i*0.22);x.fillStyle=['#2a0c3a','#320e46','#3c1254'][i];x.fillRect(W/2-rw/2,ry,rw,H*0.03);x.fillStyle=hexA(th.acc,0.8);x.fillRect(W/2-rw/2,ry,rw,2);}
  x.fillStyle='#ffd1ec';for(let i=0;i<26;i++){x.globalAlpha=0.3+rnd()*0.5;star2(x,rnd()*W,rnd()*hz*0.9,1.5+rnd()*2.5);}x.globalAlpha=1;}
 if(n==='viking'){// aurora over a fjord, mountains, longship
  x.save();x.globalCompositeOperation='lighter';for(let k=0;k<4;k++){const yb=H*(0.08+k*0.05),col=['#3dffb0','#2ad0ff','#7dffd0','#b07dff'][k];for(let i=0;i<W;i+=3){const yy=yb+Math.sin(i*0.012+k*1.7)*H*0.03+Math.sin(i*0.031+k)*H*0.012,hgt=H*(0.05+0.04*Math.sin(i*0.02+k*2)**2),gb=x.createLinearGradient(0,yy-hgt,0,yy);gb.addColorStop(0,hexA(col,0));gb.addColorStop(1,hexA(col,0.16));x.fillStyle=gb;x.fillRect(i,yy-hgt,3,hgt);}}x.restore();
  const mt=(base,amp,col,seed)=>{x.fillStyle=col;x.beginPath();x.moveTo(0,hz);for(let i=0;i<=W;i+=W/10){x.lineTo(i,hz-base-amp*Math.abs(Math.sin(i*0.017+seed))-amp*0.4*hash(i+seed));}x.lineTo(W,hz);x.fill();};
  mt(H*0.07,H*0.12,'#0e2230',1);x.fillStyle='rgba(230,245,255,.35)';for(let i=0;i<=W;i+=W/10){const py=hz-H*0.07-H*0.12*Math.abs(Math.sin(i*0.017+1))-H*0.048*hash(i+1);x.beginPath();x.moveTo(i-10,py+10);x.lineTo(i,py);x.lineTo(i+10,py+10);x.fill();}
  mt(H*0.03,H*0.06,'#081620',3);
  const wy=hz-H*0.035;x.fillStyle='#0a2a36';x.fillRect(0,wy,W,hz-wy);x.strokeStyle='rgba(125,255,208,.25)';x.lineWidth=1;for(let i=0;i<10;i++){const yy=wy+3+i*3,xx=rnd()*W;x.beginPath();x.moveTo(xx,yy);x.lineTo(xx+20+rnd()*40,yy);x.stroke();}
  const lx=W*0.72,ly=wy+4;x.fillStyle='#05090c';x.beginPath();x.moveTo(lx-46,ly-8);x.quadraticCurveTo(lx,ly+6,lx+46,ly-8);x.lineTo(lx+52,ly-20);x.lineTo(lx+40,ly-10);x.lineTo(lx-40,ly-10);x.lineTo(lx-52,ly-20);x.closePath();x.fill();x.fillRect(lx-1.5,ly-48,3,40);
  x.fillStyle='#b8322f';x.fillRect(lx-18,ly-44,36,28);x.fillStyle='#e8e0c8';for(let i=0;i<3;i++)x.fillRect(lx-18+i*12,ly-44,6,28);
  x.fillStyle='#e6f6ff';x.shadowColor='#bfe8ff';x.shadowBlur=30;x.beginPath();x.arc(W*0.2,H*0.07,W*0.045,0,7);x.fill();x.shadowBlur=0;}
 if(n==='summer'){// big striped sunset sun over the sea, palms
  const r=W*0.3,cy=hz-H*0.05;const sg=x.createLinearGradient(0,cy-r,0,cy);sg.addColorStop(0,'#fff27a');sg.addColorStop(1,'#ff5f8a');x.fillStyle=sg;x.shadowColor='#ffb347';x.shadowBlur=40;x.beginPath();x.arc(W/2,cy,r,Math.PI,0);x.fill();x.shadowBlur=0;x.fillStyle=th.sky[2];for(let i=0;i<5;i++)x.fillRect(W/2-r,cy-r*0.42+i*r*0.1,r*2,2+i*1.6);
  const wy=hz-H*0.05;const og=x.createLinearGradient(0,wy,0,hz);og.addColorStop(0,'#5a2a7a');og.addColorStop(1,'#2a1448');x.fillStyle=og;x.fillRect(0,wy,W,hz-wy);
  for(let i=0;i<14;i++){const yy=wy+3+i*3.2,w2=r*(1.4-i*0.07);x.fillStyle=hexA(i%2?'#ffd23a':'#ff8fb0',0.55-i*0.03);x.fillRect(W/2-w2/2+(rnd()-0.5)*20,yy,w2*(0.4+rnd()*0.4),1.6);}
  const palm=(px,sc,fl)=>{x.save();x.translate(px,hz);x.scale(sc*fl,sc);x.fillStyle='#1a0a1e';x.beginPath();x.moveTo(-6,0);x.quadraticCurveTo(20,-90,8,-180);x.lineTo(18,-180);x.quadraticCurveTo(32,-90,8,0);x.fill();
   for(let i=0;i<6;i++){const a=-Math.PI+0.2+i*0.55;x.beginPath();x.moveTo(13,-180);x.quadraticCurveTo(13+Math.cos(a)*50,-200+Math.sin(a)*30,13+Math.cos(a)*90,-170+Math.sin(a)*10+30);x.quadraticCurveTo(13+Math.cos(a)*50,-186+Math.sin(a)*30,13,-176);x.fill();}x.restore();};
  palm(W*0.06,H*0.0016,1);palm(W*0.95,H*0.0013,-1);palm(W*0.86,H*0.001,-1);}
 if(n==='goth'){// moon, cathedral with glowing rose window, bats
  x.fillStyle='#efe6ff';x.shadowColor='#b8a6ff';x.shadowBlur=50;x.beginPath();x.arc(W*0.8,H*0.2,W*0.11,0,7);x.fill();x.shadowBlur=0;x.fillStyle='rgba(120,100,160,.25)';for(const [a,b2,c] of [[-0.3,-0.2,0.25],[0.35,0.15,0.18],[0.05,0.4,0.15]]){x.beginPath();x.arc(W*0.8+a*W*0.14,H*0.2+b2*W*0.14,c*W*0.14,0,7);x.fill();}
  const cx=W/2,base=hz,cw=W*0.56;x.fillStyle='#07040b';x.fillRect(cx-cw/2,base-H*0.13,cw,H*0.13);
  const spire=(sx,w2,h2)=>{x.fillRect(sx-w2/2,base-h2,w2,h2);x.beginPath();x.moveTo(sx-w2/2-3,base-h2);x.lineTo(sx,base-h2-H*0.09);x.lineTo(sx+w2/2+3,base-h2);x.fill();};
  spire(cx-cw/2,W*0.1,H*0.2);spire(cx+cw/2,W*0.1,H*0.2);spire(cx,W*0.14,H*0.17);spire(cx-cw*0.25,W*0.05,H*0.15);spire(cx+cw*0.25,W*0.05,H*0.15);
  const rw=x.createRadialGradient(cx,base-H*0.12,2,cx,base-H*0.12,W*0.06);rw.addColorStop(0,'#ffd0a0');rw.addColorStop(0.5,'#e0435f');rw.addColorStop(1,'#5a0c2a');x.fillStyle=rw;x.beginPath();x.arc(cx,base-H*0.12,W*0.055,0,7);x.fill();x.strokeStyle='#07040b';x.lineWidth=2;for(let i=0;i<8;i++){const a=i*Math.PI/4;x.beginPath();x.moveTo(cx,base-H*0.12);x.lineTo(cx+Math.cos(a)*W*0.055,base-H*0.12+Math.sin(a)*W*0.055);x.stroke();}
  for(const wx of [-0.36,-0.2,0.2,0.36]){x.fillStyle=hexA('#b8a6ff',0.5);const px=cx+wx*cw,py=base-H*0.08;x.beginPath();x.moveTo(px-6,py+H*0.05);x.lineTo(px-6,py);x.quadraticCurveTo(px,py-14,px+6,py);x.lineTo(px+6,py+H*0.05);x.fill();}
  x.fillStyle='#0b0612';for(let i=0;i<7;i++){const bx=rnd()*W,by=H*(0.04+rnd()*0.25),bs=4+rnd()*5;x.beginPath();x.moveTo(bx,by);x.quadraticCurveTo(bx-bs,by-bs,bx-bs*2.2,by-bs*0.2);x.quadraticCurveTo(bx-bs,by,bx,by+bs*0.5);x.quadraticCurveTo(bx+bs,by,bx+bs*2.2,by-bs*0.2);x.quadraticCurveTo(bx+bs,by-bs,bx,by);x.fill();}
  for(let i=0;i<2;i++){const gx=i?W*0.93:W*0.07;x.fillStyle='#0a0610';x.fillRect(gx-10,hz-H*0.07,20,H*0.07);x.beginPath();x.arc(gx,hz-H*0.07,10,Math.PI,0);x.fill();x.fillStyle='#ffb36b';x.shadowColor='#ff9a3d';x.shadowBlur=16;x.fillRect(gx-2,hz-H*0.085,4,8);x.shadowBlur=0;}}}
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
let spotC=null,spotKey='';
function drawScene(th,beat,np){if(!bgCache||bgKey!==th.name){bgCache=buildBg(th);bgKey=th.name;}g.drawImage(bgCache,0,0,W,H);
 const ph=((beat%1)+1)%1,pulse=beat>0?Math.pow(1-ph,3):0,fl=S.rf?0.3:1,hz=H*0.565;
 const cx=np.x,cy=np.y-np.h*0.55,rR=np.h*0.85,sk=th.name+(rR|0);if(spotKey!==sk){spotKey=sk;spotC=document.createElement('canvas');const n=Math.ceil(rR*2*Math.min(DPR,1.5)/2)*2;spotC.width=spotC.height=n;const x=spotC.getContext('2d'),rg=x.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);rg.addColorStop(0,hexA(th.acc,0.75));rg.addColorStop(0.5,hexA(th.acc2,0.2));rg.addColorStop(1,hexA(th.acc2,0));x.fillStyle=rg;x.fillRect(0,0,n,n);}
 g.globalAlpha=0.66+0.33*pulse*fl;g.drawImage(spotC,cx-rR,cy-rR,rR*2,rR*2);g.globalAlpha=1;
 const bi=Math.floor(beat*2);for(let i=0;i<20;i++){const h=(0.25+0.75*hash(i+bi*13))*H*0.055*(0.5+pulse*fl);g.fillStyle=i%2?th.acc:th.acc2;g.globalAlpha=0.3;g.fillRect(i*W/20+2,hz-h,W/20-4,h);}g.globalAlpha=1;
 if(G.fever&&G.state==='play'&&!S.rf){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<4;i++){const a=Math.sin(beat*Math.PI*0.5+i*1.6)*0.6+(i<2?0.5:-0.5)+Math.PI/2,ox=i<2?0:W;g.fillStyle=hexA(i%2?th.acc:th.acc2,0.12);g.beginPath();g.moveTo(ox,0);g.lineTo(ox+Math.cos(a-0.08)*H,Math.sin(a-0.08)*H);g.lineTo(ox+Math.cos(a+0.08)*H,Math.sin(a+0.08)*H);g.fill();}g.restore();}}

/* ================= GAME STATE ================= */
const G={state:'title',sel:LS.get('sel',0),d:LS.get('diff',1),song:null,notes:[],fever:false,paused:false,ft:[],version:VERSION};
window.__NIX=G;G.SONGS=null;
const N={pose:'idle',pt:0,wob:0,side:0,happy:0,bubble:'',bt:0,blink:0,bl:2,fixed:null,look:0.35,jump:0};
const IC={cuke:'#5fcf4a',fish:'#ff9f43',mouse:'#d6d3e6',butterfly:'#7dff9b',laser:'#ff3b4e',yarn:'#ff5fb7',note:'#ffe66d',meow:'#ffe66d'};
const PT=[],POPS=[],TAPS=[];let banner=null;const GS={};
const NIXH=()=>Math.min(H*0.37,W*0.8),NIXY=()=>H*0.68;
function nixPos(){const st=G.state;if(st==='play')return{x:W/2,y:NIXY()-Math.sin(clamp(N.jump,0,1)*Math.PI)*H*0.045,h:NIXH()};if(st==='title')return{x:W/2,y:H*0.715,h:Math.min(H*0.45,W*1.1)};
 if(st==='results')return{x:W/2,y:H*0.37,h:Math.min(H*0.3,W*0.8)};if(st==='career')return{x:W-Math.min(W*0.17,80),y:H*0.165,h:Math.min(H*0.14,W*0.33)};return{x:W/2,y:H*0.345,h:Math.min(H*0.27,W*0.75)};}
function zone(side){const h=NIXH();return side?{x:W/2+side*Math.min(W*0.335,175),y:NIXY()-h*0.13,r:Math.min(W*0.15,76)}:{x:W/2,y:NIXY()+h*0.17,r:Math.min(W*0.13,66)};}
function react(k,n){if(k===3){N.pose='miss';N.pt=0.55;N.wob=1;N.bubble='';return;}
 if(G.combo>0&&G.combo%25===0){N.pose='tip';N.pt=0.9;N.bubble=['YEAH!','PURRRFECT!','MEOW-VELOUS!','NIX IS LIT!'][(G.combo/25-1)%4];N.bt=1.1;return;}
 if(N.pose==='tip'&&N.pt>0)return;const sd=n&&n.side?n.side:((N.side^=1)?-1:1);
 N.pose=n&&n.side===0?'catchC':sd<0?'catchL':'catchR';N.pt=n&&n.kind==='hold'?Math.max(0.3,n.end-n.t):0.28;if(n&&n.kind==='swipe')N.jump=1;if(k===0)N.happy=0.35;}
function burst(n,k){const z=zone(n.side||0),c=IC[n.item]||'#fff',m=k===0?12:7;for(let i=0;i<m&&PT.length<140;i++){const a=Math.random()*Math.PI*2,sp=90+Math.random()*260;PT.push({x:z.x,y:z.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-160,l:0.45+Math.random()*0.3,c:i%3?c:'#fff',r:3+Math.random()*4,st:Math.random()<0.45});}
 if(n.kind!=='hold')POPS.push({n,x:z.x,y:z.y,t0:performance.now()});G.zf[(n.side||0)+1]=1;}
function reg(k,dt,n,tail){G.cnt[k]++;G.units++;G.wsum+=WT[k];const unit=1e6/G.total;
 if(k<3){G.combo++;if(G.combo>G.maxCombo)G.maxCombo=G.combo;if(G.fever)G.bonus+=Math.round(unit*0.2*WT[k]);if(!G.fever&&!G.tut&&G.combo>=FEV[G.diff]){G.fever=true;G.fevers++;banner={t:'FEVER!',c:'#ff3fd6',t0:performance.now()};}if(!tail){burst(n,k);hitSfx(n,k);react(k,n);}}
 else{G.combo=0;G.fever=false;react(3);missSfx();}
 G.score=Math.round(unit*G.wsum)+G.bonus;G.jd={k,t0:performance.now(),el:(k===1||k===2)?(dt<0?'EARLY':'LATE'):'',side:n?n.side||0:0};}
function judgeK(dt){const a=Math.abs(dt-LATE);return a<=win(0)?0:a<=win(1)?1:a<=win(2)?2:3;}
function hitNote(n,dt,pid){n.hit=true;if(BOT)G.dts.push(dt);const k=judgeK(dt);reg(k,dt,n);if(n.kind==='hold'&&k<3){n.holding=true;n.pid=pid;G.held[pid]=n;}else{n.done=true;if(n.kind==='hold')reg(3,0,n,true);}}
function press(side,pid,x,y){if(G.state!=='play'||G.paused)return;const t=songT(),w=win(2);TAPS.push({x,y,t0:performance.now()});
 for(let i=G.ni;i<G.notes.length;i++){const n=G.notes[i];if(n.t>t+w+LATE)break;if(n.hit||n.kind==='call'||n.decoy)continue;if(Math.abs(t-n.t-LATE)>w+LATE)continue;if(G.diff>0&&n.side&&n.side!==side)continue;
  if(n.kind==='swipe'&&G.diff>0&&String(pid)[0]!=='k'){GS[pid]={x,y,t,n};setTimeout(()=>{if(GS[pid]&&GS[pid].n===n)delete GS[pid];},400);return;}
  hitNote(n,t-n.t,pid);return;}
 for(let i=G.ni;i<G.notes.length;i++){const n=G.notes[i];if(n.t>t+0.12)break;if(!n.decoy||n.hit)continue;if(Math.abs(n.t-t)>0.12||(G.diff>0&&n.side!==side))continue;splash(n);return;}}
function splash(n){n.hit=n.done=true;G.combo=0;G.fever=false;G.splashes=(G.splashes||0)+1;N.pose='miss';N.pt=0.5;N.wob=1;missSfx();const z=zone(n.side);for(let i=0;i<14&&PT.length<140;i++){const a=Math.random()*Math.PI*2,sp=80+Math.random()*220;PT.push({x:z.x,y:z.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-120,l:0.5,c:i%2?'#5ad1ff':'#bff4ff',r:3+Math.random()*3});}G.jd={k:4,t0:performance.now(),el:'',side:n.side};}
function release(pid){delete GS[pid];const n=G.held&&G.held[pid];
 if(n&&n.holding){const t=songT();n.holding=false;n.done=true;delete G.held[pid];if(n.end-t>0.15)reg(3,0,n,true);else reg(0,0,n,true);}}
cv.addEventListener('pointerdown',e=>{if(G.state!=='play')return;e.preventDefault();press(e.clientX<W/2?-1:1,e.pointerId,e.clientX,e.clientY);});
cv.addEventListener('pointermove',e=>{const gs=GS[e.pointerId];if(!gs)return;if(Math.hypot(e.clientX-gs.x,e.clientY-gs.y)>26){delete GS[e.pointerId];if(!gs.n.hit){hitNote(gs.n,gs.t-gs.n.t,e.pointerId);G.swipeFx={x0:gs.x,y0:gs.y,x1:e.clientX,y1:e.clientY,t0:performance.now()};}}});
addEventListener('pointerup',e=>release(e.pointerId));addEventListener('pointercancel',e=>release(e.pointerId));
const KEYS={d:-1,f:-1,' ':0,j:1,k:1};addEventListener('keydown',e=>{const l=KEYS[e.key];if(l!=null&&!e.repeat)press(l||1,'k'+e.key,W/2,H/2);if(e.key==='Escape'&&G.state==='play')pauseGame();});addEventListener('keyup',e=>{if(KEYS[e.key]!=null)release('k'+e.key);});
function showLoad(on){let o=$('ldMsg');if(on&&!o){o=document.createElement('div');o.id='ldMsg';o.style.cssText='position:fixed;left:50%;top:46%;transform:translate(-50%,-50%);z-index:60;background:#14101fee;color:#fff;padding:14px 22px;border-radius:16px;font:800 16px system-ui';o.textContent='🎵 Loading song…';document.body.appendChild(o);}if(!on&&o)o.remove();}
function startGame(o){o=o||{};initAudio();const tut=!!(o.tut||(!LS.get('tut',0)&&!G.test&&!BOT&&!o.noTut&&!Q.has('song')));const ps=tut?SONGS[0]:SONGS[G.sel];
 if(!BUF[ps.id]){showLoad(true);loadSong(ps).then(()=>{showLoad(false);startGame(o);}).catch(()=>{showLoad(false);banner={t:'LOAD FAILED',c:'#ff5a6e',t0:performance.now()};});return;}
 G.tut=tut;G.song=ps;G.diff=tut?0:G.d;let notes=tut?tutChart(ps):buildChart(ps,G.diff),from=0;const endT=tut?notes.end:ps.dur;
 if(o.from){from=o.from;notes=notes.filter(n=>n.t>=from+1.5);}
 if(BOT)botPrep(notes);G.notes=notes;G.total=Math.max(1,notes.filter(n=>n.kind!=='call'&&!n.decoy).length+notes.filter(n=>n.kind==='hold').length);
 Object.assign(G,{cnt:[0,0,0,0],wsum:0,units:0,combo:0,maxCombo:0,score:0,bonus:0,fever:false,fevers:0,ni:0,held:{},zf:[0,0,0],jd:null,paused:false,ft:[],result:null,endT,life:0,cue:0,swipeFx:null,afterTut:o.afterTut,dts:[],splashes:0,pendingHS:null});
 G.cues=[];for(const n of notes){if(n.kind==='call'&&n.first)G.cues.push({t:n.t-0.9,txt:'🐱 NIX SAYS…',c:'#ffe66d'});if(n.resp&&n.first)G.cues.push({t:n.t-1.1,txt:'YOUR TURN!',c:'#7dff9b'});}
 Object.assign(N,{pose:'idle',pt:0,wob:0,fixed:null,bubble:'',happy:0,jump:0});PT.length=0;POPS.length=0;banner=null;show('play');
 const first=notes.find(n=>n.kind!=='call'),delay=Math.max(0.35,APPROACH[G.diff]+0.25-((first?first.t:9)-from));startPlayback(ps,from,delay);
 if(tut)for(const n of notes)if(n.synth)meowSfx(PB.startAt+n.t+outLat(),1+(n.t*7%2)*0.06);
 if(G.test==='fever'&&!tut)G.combo=G.maxCombo=FEV[G.diff]-2;}
function finishTut(){stopPlayback();if(!G.nosave)LS.set('tut',1);const go=G.test!=='tutorial';banner={t:'READY!',c:'#7dff9b',t0:performance.now()};
 if(go)setTimeout(()=>startGame({noTut:1}),700);else{show('select');}}
function updatePlay(t,dt){const ns=G.notes;while(G.ni<ns.length&&ns[G.ni].done)G.ni++;
 for(let i=G.ni;i<ns.length;i++){const n=ns[i];if(n.t>t+0.3)break;if(n.done)continue;
  if(n.kind==='call'){if(t>=n.t){n.hit=n.done=true;N.pose='meow';N.pt=0.22;N.bubble='MEOW!';N.bt=0.28;const np=nixPos();PT.push({x:np.x+(Math.random()-0.5)*30,y:np.y-np.h*0.62,vx:(Math.random()-0.5)*60,vy:-120,l:0.9,c:'#ffe66d',r:9,nt:1});}continue;}
  if(n.decoy){if(t-n.t>0.15){n.hit=n.done=true;}continue;}
  if(!n.hit){if(BOT&&!n.bs&&t>=n.t+(n.bj||0))hitNote(n,t-n.t,'bot'+i);else if(t-n.t>win(2)+LATE){n.hit=n.done=true;reg(3,0,n);if(n.kind==='hold')reg(3,0,n,true);}}
  else if(n.holding&&t>=n.end){n.holding=false;n.done=true;delete G.held[n.pid];reg(0,0,n,true);}}
 while(G.cue<G.cues.length&&t>=G.cues[G.cue].t){const c=G.cues[G.cue++];banner={t:c.txt,c:c.c,t0:performance.now(),small:1};}
 for(let k=0;k<3;k++)G.zf[k]=Math.max(0,G.zf[k]-dt*4);
 const tgt=G.combo>=50?3:G.combo>=25?2:G.combo>=10?1:0;G.life+=(tgt-G.life)*Math.min(1,dt*3);
 if(t>G.endT){if(G.tut)finishTut();else finish();}}
function botTick(t){const ns=G.notes;for(let i=G.ni;i<ns.length;i++){const n=ns[i];if(n.t-0.3>t)break;if(!n.hit&&n.kind!=='call'&&!n.decoy&&!n.bs&&t>=n.t+(n.bj||0))hitNote(n,t-n.t,'bot'+i);}}
function gauss(u,v){return Math.sqrt(-2*Math.log(Math.max(1e-9,u)))*Math.cos(2*Math.PI*v);}
function botPrep(notes){let i=0;for(const n of notes){if(n.kind==='call'||n.decoy)continue;i++;n.bs=hash(i*7.77+0.13)>=BOTACC;n.bj=BOTJIT?clamp(gauss(hash(i*3.31+0.7),hash(i*5.17+0.2))*BOTJIT,-0.18,0.18):0;}}
function pauseGame(){if(G.state!=='play'||G.paused)return;G.paused=true;ac.suspend();$('pause').classList.remove('hide');$('hud').classList.add('hide');}
function resumeGame(){G.paused=false;ac.resume();$('pause').classList.add('hide');$('hud').classList.remove('hide');}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();else checkVersion();});

/* ================= HIGH SCORES (local top 10 per song + difficulty) ================= */
const esc=x=>String(x).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fmtD=s=>{const m=/^(\d+)-(\d+)-(\d+)$/.exec(s||'');return m?MON[+m[2]-1]+' '+(+m[3]):'';};
function hsList(id,d){return HS[id+'_'+d]||[];}
function hsQual(id,d,sc){const l=hsList(id,d);return sc>0&&(l.length<10||sc>l[l.length-1].score);}
function hsAdd(id,d,e){const l=hsList(id,d).concat([e]);l.sort((a,b)=>b.score-a.score||a.ts-b.ts);HS[id+'_'+d]=l.slice(0,10);if(!G.nosave)LS.set('hs',HS);return HS[id+'_'+d].indexOf(e);}
const cleanName=v=>(String(v||'').toUpperCase().replace(/[^A-Z0-9 ]/g,'').trim().slice(0,8))||'NIX';
function hsTable(l,hi){if(!l.length)return '<div class="hsE">No high scores yet — be the first! 🐾</div>';
 return '<table class="hs"><tr><th>#</th><th>NAME</th><th>SCORE</th><th>GRADE</th><th>ACC</th><th>COMBO</th><th>DATE</th></tr>'+l.map((e,i)=>`<tr${i===hi?' class="me"':''}><td>${i+1}</td><td>${esc(e.name)}</td><td>${e.score.toLocaleString()}</td><td>${e.grade}${e.fc?'★':''}</td><td>${(+e.acc).toFixed(1)}%</td><td>${e.combo}</td><td>${fmtD(e.date)}</td></tr>`).join('')+'</table>';}
function saveHS(){const p=G.pendingHS;if(!p)return;G.pendingHS=null;const inp=$('rName');p.e.name=cleanName(inp?inp.value:LS.get('name','NIX'));if(!G.nosave)LS.set('name',p.e.name);
 const ix=hsAdd(p.id,p.d,p.e);$('rHS').innerHTML='<div class="hsT">🏆 HIGH SCORES · '+esc(p.name)+' · '+DIFF[p.d]+'</div><div class="hsW">'+hsTable(hsList(p.id,p.d),ix)+'</div>';
 const me=$('rHS').querySelector('.me');if(me)me.scrollIntoView({block:'nearest'});G.hsSaved={id:p.id,d:p.d,ix};}
function showHSResult(acc,grade,fc){const id=G.song.id,d=G.diff,e={name:'',score:G.score,grade,acc:+acc.toFixed(1),combo:G.maxCombo,fc,date:today(),ts:Date.now()};G.hsSaved=null;
 if(!G.tut&&hsQual(id,d,G.score)){G.pendingHS={id,d,e,name:G.song.name};const last=LS.get('name','');
  $('rHS').innerHTML=`<div class="hsT">🏆 NEW HIGH SCORE! Enter your name</div><div class="row"><input id="rName" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(last)}" placeholder="NIX"><button id="rSave" class="big" style="padding:8px 16px;font-size:15px">SAVE</button></div>`;
  const inp=$('rName');inp.oninput=()=>{const v=inp.value.toUpperCase().replace(/[^A-Z0-9 ]/g,'');if(v!==inp.value)inp.value=v;};inp.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();uiSfx();saveHS();}};$('rSave').onclick=()=>{uiSfx();saveHS();};}
 else{G.pendingHS=null;const l=hsList(id,d);$('rHS').innerHTML=l.length?'<div class="hsT">🏆 HIGH SCORES · '+esc(G.song.name)+' · '+DIFF[d]+'</div><div class="hsW">'+hsTable(l,-1)+'</div>':'';}}
let hsSel={s:0,d:1};
function renderScores(){$('hsSongs').innerHTML=SONGS.map((s,i)=>`<button data-i="${i}" class="${i===hsSel.s?'on':''}" title="${esc(s.name)}">${s.icon}${s.hard?'<i>🔥</i>':''}</button>`).join('');
 $('hsDiffs').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.d===hsSel.d));const s=SONGS[hsSel.s];
 $('hsName').textContent=s.name+' · '+DIFF[hsSel.d];$('hsList').innerHTML=hsTable(hsList(s.id,hsSel.d),G.hsSaved&&G.hsSaved.id===s.id&&G.hsSaved.d===hsSel.d?G.hsSaved.ix:-1);
 $('hsSongs').querySelectorAll('button').forEach(b=>b.onclick=()=>{uiSfx();hsSel.s=+b.dataset.i;renderScores();});}
function openScores(){hsSel={s:G.sel,d:G.d};G.scoresBack=G.state==='select'?'select':'title';show('scores');}

/* ================= CAREER (v1.0) =================
 Nix rises from alley busker to stadium headliner. Each venue has gigs (song + difficulty), each gig has 3 stars:
 clear it, reach a grade, and a special challenge. Stars open venues; venues unlock songs, outfits and the next stage. */
const CH=[
 {id:'alley',n:'Alley Busker',ic:'🗑️',v:'The Back Alley',need:0,rw:[],gigs:[['lofi',0,'B',['combo',25]],['reggae',0,'B',['combo',30]],['funk',0,'B',['acc',85]]]},
 {id:'cafe',n:'Corner Café',ic:'☕',v:'The Purring Bean',need:5,rw:['song:kpop','hood:pink','acc:mic'],gigs:[['kpop',0,'A',['combo',40]],['lofi',1,'B',['combo',50]],['reggae',1,'B',['fever',1]],['hype',0,'A',['nomiss']]]},
 {id:'roof',n:'Rooftop Party',ic:'🌆',v:'Skyline Rooftop',need:12,rw:['cap:pink'],gigs:[['funk',1,'A',['combo',60]],['hype',1,'B',['fever',2]],['kpop',1,'B',['acc',90]],['salsa',1,'B',['combo',50]]]},
 {id:'club',n:'Neon Club',ic:'🪩',v:'Club Nine Lives',need:20,rw:['song:viking','acc:horns','hood:frost'],gigs:[['viking',1,'B',['combo',60]],['vr',1,'B',['fever',2]],['dnb',1,'B',['acc',88]],['pinball',1,'A',['combo',60]]]},
 {id:'fest',n:'Summer Fest',ic:'🌴',v:'Catnip Beach Fest',need:30,rw:['song:summer','acc:lei','hood:sunset'],gigs:[['summer',1,'B',['combo',60]],['punk',1,'B',['acc',88]],['salsa',2,'B',['nosplash']],['hype',2,'B',['combo',80]]]},
 {id:'arena',n:'Arena Tour',ic:'🏟️',v:'Whisker Arena',need:42,rw:['song:goth','acc:cape','hood:velvet'],gigs:[['goth',1,'B',['fever',2]],['kpop',2,'B',['nosplash']],['viking',2,'B',['combo',80]],['vr',2,'A',['acc',90]],['dnb',2,'B',['nomiss']]]},
 {id:'stadium',n:'Stadium Headliner',ic:'🏆',v:'Nine Lives Stadium',need:56,rw:['cap:headliner'],gigs:[['summer',2,'B',['combo',100]],['goth',2,'B',['nosplash']],['punk',2,'A',['combo',100]],['pinball',2,'A',['acc',92]],['funk',2,'S',['nomiss'],'ENCORE']]}];
let CAR=Object.assign({st:{}},LS.get('career',{}));
const gid=(c,j)=>CH[c].id+':'+j,popc=m=>(m&1)+(m>>1&1)+(m>>2&1),CMAX=CH.reduce((a,c)=>a+c.gigs.length*3,0);
const LOCKSONG={};CH.forEach((c,i)=>c.rw.forEach(r=>{const [t,k]=r.split(':');if(t==='song')LOCKSONG[k]=i;}));
function carStars(){let n=0;for(const k in CAR.st)n+=popc(CAR.st[k]);return n;}
function chR(i){return ALLUNL||G.careerAll||carStars()>=CH[i].need;}
function chLast(){let l=0;for(let i=0;i<CH.length;i++)if(chR(i))l=i;return l;}
const songLocked=s=>LOCKSONG[s.id]!=null&&!chR(LOCKSONG[s.id]);
const gigSong=gg=>SONGS.find(s=>s.id===gg[0]);
function goalTxt(gg,k){if(k===0)return'Clear it (60%+ accuracy)';if(k===1)return'Grade '+gg[2]+' or better';const [t,v]=gg[3];return t==='combo'?v+'+ combo':t==='acc'?v+'%+ accuracy':t==='nomiss'?'No misses (full combo)':t==='fever'?'Hit FEVER '+(v>1?v+' times':'once'):'Never touch a 🥒';}
function gigEval(gg,r){let m=0;if(r.acc>=60)m|=1;if(GR[r.grade]>=GR[gg[2]])m|=2;const [t,v]=gg[3];const ok=t==='combo'?r.maxCombo>=v:t==='acc'?r.acc>=v:t==='nomiss'?r.fc:t==='fever'?r.fevers>=v:r.splashes===0&&r.acc>=60;if(ok)m|=4;return m;}
function carNext(){const last=chLast();for(let i=0;i<=last;i++)for(let j=0;j<CH[i].gigs.length;j++)if(!CAR.st[gid(i,j)])return{c:i,j};
 for(let i=last;i>=0;i--)for(let j=0;j<CH[i].gigs.length;j++)if(popc(CAR.st[gid(i,j)]||0)<3)return{c:i,j};return null;}
const starStr=m=>[1,2,4].map(b=>m&b?'★':'☆').join('');
function rwName(r){const [t,k]=r.split(':');return t==='song'?'🎵 '+(SONGS.find(s=>s.id===k)||{name:k}).name:itemName(r);}
function nextLine(){const n=carNext();if(!n)return'👑 Every star earned — LEGEND!';const gg=CH[n.c].gigs[n.j],s=gigSong(gg);return'NEXT: '+s.icon+' '+s.name+' · '+DIFF[gg[1]][0]+DIFF[gg[1]].slice(1).toLowerCase();}
function renderCareer(){const tot=carStars(),last=chLast(),nx=CH[last+1],nxt=carNext();if(!G.cgSel&&nxt)G.cgSel=nxt;
 const pct=nx?clamp((tot-CH[last].need)/(nx.need-CH[last].need),0,1)*100:100;
 $('cTop').innerHTML=`<div class="cRank">${CH[last].ic} ${CH[last].n.toUpperCase()}</div><div class="cBar"><i style="width:${pct}%"></i></div><div class="cSub">★ ${tot} / ${CMAX}${nx?` · ${Math.max(0,nx.need-tot)} more ★ opens ${nx.n}`:' · all venues open'}</div>`+(G.careerAll?'<div class="cSub" style="color:#ffe66d">TEST MODE: all venues open · not saved</div>':'');
 $('cMap').innerHTML=CH.map((c,i)=>{const r=chR(i),cs=c.gigs.reduce((a,_,j)=>a+popc(CAR.st[gid(i,j)]||0),0);
  return `<div class="ch${r?'':' lock'}${i===last?' cur':''}"><div class="chH"><span class="chI">${r?c.ic:'🔒'}</span><div class="chT"><b>${i+1} · ${c.n.toUpperCase()}</b><small>${c.v}${r?` · ★ ${cs}/${c.gigs.length*3}`:` · needs ${c.need} ★`}</small></div></div>`+
  (r?`<div class="gigs">${c.gigs.map((gg,j)=>{const s=gigSong(gg),m=CAR.st[gid(i,j)]||0,isN=nxt&&nxt.c===i&&nxt.j===j,sel=G.cgSel&&G.cgSel.c===i&&G.cgSel.j===j;
   return `<div class="gig${isN?' next':''}${sel?' on':''}" data-c="${i}" data-j="${j}"><span class="gI">${s.icon}</span><div class="gT"><b>${gg[4]?'👑 '+gg[4]+' · ':''}${s.name}</b><small>${DIFF[gg[1]]}${isN?' · <em>▶ NEXT</em>':''}</small></div><span class="gS">${starStr(m)}</span></div>`;}).join('')}</div>`
   :(c.rw.length?`<div class="chR">Unlocks: ${c.rw.map(rwName).join(' · ')}</div>`:''))+'</div>';}).join('');
 $('cMap').querySelectorAll('.gig').forEach(el=>el.onclick=()=>{uiSfx();G.cgSel={c:+el.dataset.c,j:+el.dataset.j};renderCareer();});
 const sel=G.cgSel;if(sel){const gg=CH[sel.c].gigs[sel.j],s=gigSong(gg),m=CAR.st[gid(sel.c,sel.j)]||0;
  $('cGig').innerHTML=`<div class="cgH">${s.icon} <b>${s.name}</b> <span>${DIFF[gg[1]]} · ${CH[sel.c].v}</span></div>`+[0,1,2].map(k=>`<div class="cgL${m&(1<<k)?' ok':''}">${m&(1<<k)?'★':'☆'} ${goalTxt(gg,k)}</div>`).join('')+`<button class="big" id="cPlay">▶ PLAY GIG</button>`;
  $('cPlay').onclick=()=>{uiSfx();playGig(sel.c,sel.j);};}
 if(!renderCareer.sc){renderCareer.sc=1;requestAnimationFrame(()=>{const e=$('cMap').querySelector('.gig.on')||$('cMap').querySelector('.ch.cur');if(e)e.scrollIntoView({block:'center'});});}}
function playGig(c,j){const gg=CH[c].gigs[j],idx=SONGS.findIndex(s=>s.id===gg[0]);if(!G.fp)G.fp={sel:G.sel,d:G.d};G.gig={c,j};G.sel=idx;G.d=gg[1];startGame();}
/* ================= RESULTS / UNLOCKS ================= */
function gradeOf(acc,fc){const g=acc>=96||(fc&&acc>=93)?'S':acc>=88?'A':acc>=75?'B':'C';return fc&&g!=='S'?'A':g;}
const GR={S:4,A:3,B:2,C:1};
function bestG(id,d){const b=BEST[id+'_'+d];return b?GR[b.grade]:0;}
function anyG(min,d){return SONGS.some(s=>(d==null?[0,1,2]:[d]).some(dd=>bestG(s.id,dd)>=min));}
const anyFC=()=>Object.values(BEST).some(b=>b.fc);
const CORE=()=>SONGS.filter(s=>['lofi','funk','hype'].includes(s.id));function allG(min){return CORE().every(s=>[0,1,2].some(d=>bestG(s.id,d)>=min));}
const UNL={cap:{black:[()=>true,'Default'],red:[()=>anyG(2),'Get B or better'],gold:[()=>anyG(4),'Get an S'],white:[anyFC,'Full Combo any song'],rainbow:[()=>allG(4),'S on the 3 starter songs']},
 hood:{black:[()=>true,'Default'],purple:[()=>anyG(3),'Get A or better'],teal:[()=>allG(2),'B+ on the 3 starter songs'],red:[()=>anyG(3,2),'A+ on HARD'],gold:[()=>anyG(4,2),'S on HARD']},
 shades:[()=>anyG(4),'Get an S']};
UNL.acc={};CH.forEach((c,i)=>c.rw.forEach(r=>{const [t,k]=r.split(':');if(t!=='song')UNL[t][k]=[()=>chR(i),'Reach '+c.n+' in Career']}));
const isU=(t,k)=>ALLUNL||G.tryAll||(t==='shades'?UNL.shades[0]():UNL[t][k][0]());
function unlockedList(){const l=[];for(const t of ['cap','hood','acc'])for(const k in UNL[t])if(isU(t,k))l.push(t+':'+k);if(isU('shades'))l.push('shades');for(const id in LOCKSONG)if(chR(LOCKSONG[id]))l.push('song:'+id);return l;}
function itemName(x){if(x==='shades')return'😎 Shades';const [t,k]=x.split(':');if(t==='song')return'🎵 '+(SONGS.find(s=>s.id===k)||{name:k}).name;if(t==='acc')return ACCS[k].i+' '+ACCS[k].n;return t==='cap'?'🧢 '+CAPS[k].n+' Cap':'🧥 '+HOODS[k].n+' Hoodie';}
function finish(){if(G.state!=='play')return;const fc=G.cnt[3]===0,acc=G.wsum/G.total*100,grade=gradeOf(acc,fc),key=G.song.id+'_'+G.diff,old=BEST[key];
 const before=unlockedList();let nb=false;if(!old||G.score>old.score){BEST[key]={score:G.score,acc:+acc.toFixed(2),grade:old&&GR[old.grade]>GR[grade]?old.grade:grade,fc:fc||(old&&old.fc)||false,combo:Math.max(G.maxCombo,old?old.combo:0)};nb=true;}
 else{old.fc=old.fc||fc;if(GR[grade]>GR[old.grade])old.grade=grade;}
 let car=null;if(G.gig){const gc=G.gig.c,gj=G.gig.j,gg=CH[gc].gigs[gj],k=gid(gc,gj),o=CAR.st[k]||0,was=CH.map((_,i)=>chR(i)),got=gigEval(gg,{acc,grade,fc,maxCombo:G.maxCombo,fevers:G.fevers,splashes:G.splashes});CAR.st[k]=o|got;car={gg,o,got,now:o|got,opened:CH.map((c,i)=>!was[i]&&chR(i)?c:null).filter(Boolean)};}
 const after=unlockedList();let fresh=after.filter(x=>!before.includes(x));
 if(G.nosave)CAR=JSON.parse(JSON.stringify(G.realCar));else if(car)LS.set('career',CAR);
 if(G.nosave){BEST=JSON.parse(JSON.stringify(G.realBest));if(G.test==='results'&&!fresh.length)fresh=[['cap:gold','hood:gold','cap:rainbow','shades'].find(x=>!before.includes(x))||'cap:gold'];}else LS.set('best',BEST);
 G.result={acc,grade,fc,nb,fresh};const sg=G.song;setTimeout(()=>{if(G.state==='results'&&ac)startPlayback(sg,sg.preview,0.05,true);},1200);
 stopPlayback();show('results');
 $('rGrade').textContent=grade;$('rGrade').style.color={S:'#ffe66d',A:'#7dff9b',B:'#7dc7ff',C:'#ff9a6e'}[grade];
 $('rSong').textContent=G.song.name+' · '+DIFF[G.diff];$('rSongs').textContent=G.gig?'CAREER ▸':'SONGS ▸';$('rScore').textContent=G.score.toLocaleString();
 $('rStats').innerHTML=`<div>Purrrfect<b>${G.cnt[0]}</b></div><div>Great<b>${G.cnt[1]}</b></div><div>Good<b>${G.cnt[2]}</b></div><div>Miss<b>${G.cnt[3]}</b></div><div>Accuracy<b>${acc.toFixed(1)}%</b></div><div>Max Combo<b>${G.maxCombo}</b></div>`+(G.splashes?`<div>🥒 Splashes<b>${G.splashes}</b></div>`:'');
 showHSResult(acc,grade,fc);
 const names=fresh.map(itemName);
 const show1=fresh.filter(x=>!x.startsWith('song:')).sort((a,b)=>(a.startsWith('cap')?0:a.startsWith('hood')?1:2)-(b.startsWith('cap')?0:b.startsWith('hood')?1:2))[0];
 N.preview=null;if(show1){N.preview=Object.assign({},WARD);if(show1==='shades')N.preview.shades=true;else{const [t,k]=show1.split(':');N.preview[t]=t==='acc'?k:k;}N.previewName=itemName(show1);N.previewItem=show1;}
 $('rNew').innerHTML=(nb&&!G.nosave?'⭐ NEW BEST! ':'')+(fc?'🔥 FULL COMBO! ':'')+(car?`<div class="cRes">🎤 ${CH[G.gig.c].v.toUpperCase()} · <b>${starStr(car.now)}</b>${popc(car.now)>popc(car.o)?` <em>+${popc(car.now)-popc(car.o)} ★</em>`:''}<small>${[0,1,2].map(k=>(car.got&(1<<k)?'✅ ':'⬜ ')+goalTxt(car.gg,k)).join(' · ')}</small>${car.opened.map(c=>`<div class="cOpen">🎉 NEW VENUE: ${c.ic} ${c.n.toUpperCase()}!</div>`).join('')}</div>`:'')+(names.length?'<br>Unlocked: '+names.join(', ')+'<br><button class="big" id="rWear" style="margin-top:6px;padding:6px 16px;font-size:14px">👕 WEAR '+N.previewName.toUpperCase()+'</button>':'');
 if($('rWear'))$('rWear').onclick=()=>{initAudio();uiSfx();Object.assign(WARD,N.preview);if(!G.nosave)LS.set('ward',WARD);$('rWear').textContent='✅ WEARING IT!';$('rWear').disabled=true;N.pose='tip';N.pt=0.8;};
 N.fixed={S:'roof',A:'tip',B:'idle',C:'shrug'}[grade];N.happy=grade==='S'||grade==='A'?99:0;N.bubble={S:'NIX IS A LEGEND!',A:'Smooth moves!',B:'Not bad, human.',C:'...mrrp? Again!'}[grade];N.bt=999;}

/* ================= RENDER ================= */
let lastF=performance.now(),uiBeat=0;
function frame(now){const dt=Math.min(0.05,(now-lastF)/1000);lastF=now;requestAnimationFrame(frame);
 const st=G.state;let t=0,beat=0,th=THEMES[SONGS[G.sel].theme];
 if(PB&&ac){t=songT();beat=t/(60/PB.song.bpm);th=THEMES[PB.song.theme];}else{uiBeat+=dt*1.5;beat=uiBeat;}
 if(st==='play'&&!G.paused){updatePlay(t,dt);G.ft.push(dt*1000);if(G.ft.length>4000)G.ft.shift();}
 if(N.pt>0){N.pt-=dt;if(N.pt<=0)N.pose='idle';}N.jump=Math.max(0,N.jump-dt*3.2);N.wob=Math.max(0,N.wob-dt*2.2);N.happy-=dt;N.bt-=dt;N.bl-=dt;if(N.bl<0){N.blink=0.12;N.bl=2+Math.random()*3;}N.blink-=dt;
 const P0=performance.now();g.setTransform(DPR,0,0,DPR,0,0);const np=nixPos();drawScene(th,beat,np);if(st==='play')drawLife(th,beat);const P1=performance.now();
 const pose=N.fixed||(st==='play'&&G.fever&&N.pose==='idle'?'fever':N.pose);
 const wr=st==='results'&&N.preview?N.preview:WARD;
 if(st==='play')drawZones(t,beat);
 drawNix(np.x,np.y,np.h/350,{beat,time:now/1000,pose,wob:N.wob,fever:st==='play'&&G.fever,cap:wr.cap,hood:wr.hood,shades:wr.shades,blink:N.blink,happy:N.happy,look:st==='play'?0:0.35,acc:N.preview&&st==='results'?wr.acc:(st==='play'||st==='results')&&G.song&&G.song.outfit?G.song.outfit:wr.acc,dance:st==='play'&&G.song&&!G.tut?G.song.dance:'',cool:st==='title',vr:(st==='play'||st==='results')&&G.song&&G.song.vr,vrc:G.song&&G.song.vr?THEMES[G.song.theme].acc:null});
 if(st==='results'&&N.preview){const pt=$('results').querySelector('.panel').getBoundingClientRect().top,ly=Math.max(np.y-np.h*0.55,Math.min(np.y+14,pt-20)),txt='✨ NEW: '+N.previewName.replace(/^\S+ /,'').toUpperCase()+' ✨';g.font='900 14px "Arial Black",system-ui';const w=g.measureText(txt).width+24,pp=1+0.05*Math.sin(now/120);g.save();g.translate(W/2,ly);g.scale(pp,pp);g.fillStyle='#ffe66d';rr(-w/2,-14,w,28,14);g.fill();g.fillStyle='#14101f';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,0,1);g.restore();}
 if(N.bubble&&N.bt>0)bubble(np.x+np.h*0.28,np.y-np.h*1.02,N.bubble);
 const P2=performance.now();if(st==='play')drawPlay(t,dt);const P3=performance.now();if(st==='play'){const pr=G.prof||(G.prof=[0,0,0,0]);pr[0]+=P1-P0;pr[1]+=P2-P1;pr[2]+=P3-P2;pr[3]++;}
 if(banner){const a=(now-banner.t0)/1000,L=banner.small?1.1:1.4;if(a>L)banner=null;else{g.save();g.globalAlpha=Math.min(1,(L-a)*3);g.translate(W/2,H*(banner.small?0.2:0.2));const s=1+Math.max(0,0.3-a)*2;g.scale(s,s);g.font=banner.small?'900 30px "Arial Black",Impact,sans-serif':'900 44px "Arial Black",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=8;g.strokeStyle='#000';g.strokeText(banner.t,0,0);g.fillStyle=banner.c;g.fillText(banner.t,0,0);g.restore();}}}
function bubble(x,y,txt){g.font='900 15px "Arial Black",system-ui';const w=g.measureText(txt).width+22;x=clamp(x,w/2+6,W-w/2-6);g.fillStyle='#fff';rr(x-w/2,y-17,w,34,15);g.fill();g.beginPath();g.moveTo(x-18,y+14);g.lineTo(x-28,y+28);g.lineTo(x-6,y+15);g.fill();g.fillStyle='#14101f';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,x,y+1);}
/* --- stage comes alive with your combo --- */
function catSil(x,y,s,col,bob,eyeC,paw){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=col;ell(0,-20,17,22);g.save();g.translate(0,-48+bob*4);circ(0,0,15);g.beginPath();g.moveTo(-14,-5);g.lineTo(-11,-22);g.lineTo(-2,-12);g.fill();g.beginPath();g.moveTo(14,-5);g.lineTo(11,-22);g.lineTo(2,-12);g.fill();
 g.fillStyle=eyeC;ell(-5.5,-1,2.6,3.2);ell(5.5,-1,2.6,3.2);g.restore();g.strokeStyle=col;g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(14,-6);g.quadraticCurveTo(34,-10,28,-34+bob*6);g.stroke();
 if(paw){g.beginPath();g.moveTo(-10,-34);g.lineTo(-20,-62+bob*10);g.stroke();}g.restore();}
function drawLife(th,beat){const L=G.life,ph=((beat%1)+1)%1,pulse=Math.pow(1-ph,3),hz=H*0.565,fl=S.rf?0.3:1;if(L<0.02)return;
 // string lights
 const a1=clamp(L,0,1);for(let s=0;s<2;s++){const x0=s?W*0.5:-10,x1=s?W+10:W*0.5,yy=H*0.255;g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=1.5;g.beginPath();for(let i=0;i<=12;i++){const u=i/12,x=lerp(x0,x1,u),y=yy+Math.sin(u*Math.PI)*24;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
  for(let i=1;i<12;i++){const u=i/12,x=lerp(x0,x1,u),y=yy+Math.sin(u*Math.PI)*24+4,on=(i+s+Math.floor(beat))%2===0;g.globalAlpha=a1*(on?0.6+0.4*pulse*fl:0.35);g.fillStyle=[th.acc,th.acc2,'#ffe66d'][i%3];circ(x,y,4);g.globalAlpha=a1*(on?0.25:0.1)*fl;circ(x,y,10);}}g.globalAlpha=1;
 // alley cats join on the rooftops
 const a2=clamp(L-1,0,1);if(a2>0.01){g.globalAlpha=a2;const b=Math.abs(Math.sin(beat*Math.PI));catSil(W*0.11,hz+2,0.9,'#0c0914',b,'#ffe66d',G.fever);catSil(W*0.89,hz+2,-0.9,'#0c0914',1-b,'#7dff9b',G.fever);
  catSil(W*0.27,hz-H*0.11,0.6,'#100c1c',b,'#ff9f43',false);g.globalAlpha=1;}
 // crowd at the front
 const a3=clamp(L-2,0,1);if(a3>0.01){g.globalAlpha=a3;for(let i=0;i<7;i++){const x=W*(0.04+i*0.153),bb=Math.abs(Math.sin(beat*Math.PI+i*0.8));catSil(x,H+18-bb*10,0.85,i%2?'#07050d':'#0e0a18',bb,i%2?th.acc:th.acc2,true);}g.globalAlpha=1;
  if(!S.rf){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<2;i++){const x=i?W*0.85:W*0.15,a=Math.sin(beat*Math.PI*0.5+i*2)*0.35;g.fillStyle=hexA(i?th.acc:th.acc2,0.09*a3);g.beginPath();g.moveTo(x,H);g.lineTo(x+Math.sin(a-0.12)*H,H-Math.cos(a-0.12)*H);g.lineTo(x+Math.sin(a+0.12)*H,H-Math.cos(a+0.12)*H);g.fill();}g.restore();}}}
/* --- paw zones --- */
function drawZones(t,beat){const ph=((beat%1)+1)%1,pulse=Math.pow(1-ph,4);const near={'-1':9,'0':9,'1':9};
 for(let i=G.ni;i<G.notes.length;i++){const n=G.notes[i];if(n.t-t>1.2)break;if(n.hit||n.kind==='call'||n.decoy)continue;const k=String(n.side||0);near[k]=Math.min(near[k],n.t-t);}
 for(const sd of [-1,0,1]){const z=zone(sd),act=near[sd]<APPROACH[G.diff];if(sd===0&&!act&&G.zf[1]<0.05)continue;
  g.save();g.translate(z.x,z.y);const fl=G.zf[sd+1];g.globalAlpha=sd===0?0.85:0.5+0.5*(act?1:0.3);
  g.fillStyle=hexA(sd===0?'#ffe66d':'#ffffff',0.07+0.12*fl+0.05*pulse);g.beginPath();g.arc(0,0,z.r*(1+0.04*pulse),0,7);g.fill();
  g.strokeStyle=sd===0?'#ffe66d':'rgba(255,255,255,.75)';g.lineWidth=3+fl*3;g.setLineDash([10,8]);g.lineDashOffset=-beat*8;g.beginPath();g.arc(0,0,z.r,0,7);g.stroke();g.setLineDash([]);
  paw(0,6,z.r*0.42,'rgba(255,255,255,'+(0.18+fl*0.4)+')',1);g.restore();}}
/* --- items flying in to Nix --- */
function itemPos(n,p,t){if(n.sw&&p<0.75){const a=itemPos0(Object.assign({},n,{side:-n.side}),p,t),b=itemPos0(n,p,t),k=clamp((p-0.35)/0.3,0,1),e=k*k*(3-2*k);return{x:lerp(a.x,b.x,e),y:lerp(a.y,b.y,e),ang:b.ang};}return itemPos0(n,p,t);}
function itemPos0(n,p,t){const z=zone(n.side||0),sd=n.side||0,r=n.r||0.5,q=clamp(p,0,1.3);let x,y,ang=0;
 switch(n.item){
  case 'mouse':case 'yarn':{const sx=W/2+(sd||1)*(W/2+50),fy=H*0.9-r*H*0.04;x=lerp(sx,z.x,Math.min(1,q));const hop=clamp((q-0.72)/0.28,0,1);y=lerp(fy,z.y,hop)-Math.sin(hop*Math.PI)*H*0.06;if(q>1){x=z.x;y=z.y;}ang=(x-sx)/18*(n.item==='yarn'?1:0);break;}
  case 'fish':{const sx=W/2+(sd||1)*(W*0.62),sy=H*(0.14+r*0.1);x=lerp(sx,z.x,q);y=lerp(sy,z.y,q)-Math.sin(Math.min(1,q)*Math.PI)*H*0.12;ang=-(sd||1)*(0.6-q*1.2);break;}
  case 'cuke':case 'butterfly':{const sx=W/2+(sd||1)*W*(0.18+r*0.25),sy=-30;x=lerp(sx,z.x,q)+Math.sin(q*9+r*6)*28*(1-Math.min(1,q));y=lerp(sy,z.y,q);break;}
  case 'laser':{const sx=sd<0?-20:W+20,sy=H*(0.28+r*0.22);x=lerp(sx,z.x,q);y=lerp(sy,z.y,q)+Math.sin(q*Math.PI*3)*44*(1-Math.min(1,q));break;}
  default:{const np=nixPos();x=lerp(np.x+(r-0.5)*60,z.x,q)+Math.sin(q*7+r*5)*18*(1-Math.min(1,q));y=lerp(np.y-np.h*0.6,z.y,q);}}
 return{x,y,ang};}
function fishD(s,c){g.fillStyle=c;ell(0,0,22*s,11*s);g.beginPath();g.moveTo(16*s,0);g.lineTo(34*s,-12*s);g.lineTo(34*s,12*s);g.fill();g.fillStyle='rgba(255,255,255,.45)';ell(-4*s,-4*s,12*s,3.5*s);g.fillStyle='#14101f';circ(-12*s,-2*s,2.8*s);g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2*s;g.beginPath();g.arc(-4*s,0,8*s,-1,1);g.stroke();}
function drawItem(n,x,y,s,ang,tm){const c=IC[n.item];g.save();g.translate(x,y);
 if(n.item!=='laser'){g.fillStyle='rgba(0,0,0,.28)';ell(0,22*s,18*s,5*s);}
 switch(n.item){
  case 'fish':g.rotate(ang);fishD(s,c);break;
  case 'mouse':{const b=Math.abs(Math.sin(tm*22))*3*s,dir=n.side>0?-1:1;g.scale(dir,1);g.translate(0,-b);g.fillStyle=c;ell(0,0,20*s,13*s);circ(13*s,-6*s,9*s);g.fillStyle='#f4a3b6';circ(12*s,-15*s,6*s);circ(4*s,-14*s,5*s);g.fillStyle='#14101f';circ(18*s,-7*s,2.2*s);g.fillStyle='#f4a3b6';circ(22*s,-4*s,2.4*s);
   g.strokeStyle='#f4a3b6';g.lineWidth=2.5*s;g.beginPath();g.moveTo(-19*s,2*s);g.quadraticCurveTo(-34*s,-8*s,-36*s,6*s);g.stroke();break;}
  case 'butterfly':{const f=0.35+0.65*Math.abs(Math.sin(tm*14+(n.r||0)*9));for(const sd of [-1,1]){g.save();g.scale(sd*f,1);g.fillStyle=c;ell(11*s,-7*s,12*s,10*s,0.5);g.fillStyle='#33e1ff';ell(9*s,9*s,8*s,7*s,-0.4);g.fillStyle='rgba(255,255,255,.5)';circ(12*s,-8*s,3.5*s);g.restore();}g.fillStyle='#14101f';ell(0,0,3*s,13*s);break;}
  case 'laser':{g.globalCompositeOperation='lighter';const rg=g.createRadialGradient(0,0,0,0,0,26*s);rg.addColorStop(0,'rgba(255,255,255,1)');rg.addColorStop(0.25,'rgba(255,60,80,.95)');rg.addColorStop(1,'rgba(255,0,40,0)');g.fillStyle=rg;circ(0,0,26*s);g.globalCompositeOperation='source-over';
   g.fillStyle='#fff';g.font='900 '+(13*s|0)+'px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText('⟷',0,-30*s);break;}
  case 'yarn':{g.rotate(ang);g.fillStyle=c;circ(0,0,19*s);g.strokeStyle='rgba(120,0,60,.55)';g.lineWidth=2.2*s;for(let i=-2;i<=2;i++){g.beginPath();g.ellipse(0,0,19*s,Math.abs(i)*5*s+2,i*0.5,0,7);g.stroke();}g.fillStyle='rgba(255,255,255,.35)';circ(-6*s,-7*s,5*s);break;}
  case 'cuke':{g.rotate(Math.sin(tm*6+(n.r||0)*9)*0.5);g.fillStyle='#2f8a2a';ell(0,0,11*s,27*s);g.fillStyle=c;ell(-2*s,-1*s,8*s,24*s);g.fillStyle='rgba(255,255,255,.5)';for(const [dx,dy] of [[-3,-14],[3,-4],[-4,6],[2,15]])circ(dx*s,dy*s,1.8*s);g.fillStyle='#d9ffb0';ell(0,-25*s,6*s,3*s);g.rotate(-Math.sin(tm*6+(n.r||0)*9)*0.5);
   g.fillStyle='#ff3b4e';circ(17*s,-20*s,10*s);g.strokeStyle='#fff';g.lineWidth=3*s;g.beginPath();g.moveTo(12*s,-25*s);g.lineTo(22*s,-15*s);g.moveTo(22*s,-25*s);g.lineTo(12*s,-15*s);g.stroke();break;}
  case 'note':{g.fillStyle=c;g.shadowColor=c;g.shadowBlur=12;g.font='900 '+(40*s|0)+'px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText('♪',0,0);g.shadowBlur=0;break;}}
 g.restore();}
function drawPlay(t,dt){const ap=APPROACH[G.diff],now=performance.now(),ns=G.notes,tm=now/1000,base=Math.min(W/412,1.15)*1.25;
 for(let i=G.ni;i<ns.length;i++){const n=ns[i];if(n.t-t>ap)break;if(n.kind==='call'||(n.done&&!n.holding))continue;
  const p=1-(n.t-t)/ap,z=zone(n.side||0);
  if(n.kind==='hold'){// string of yarn trailing back along its path
   const pe=1-(n.end-t)/ap,ph=n.holding?1:Math.min(1,p);g.strokeStyle=IC.yarn;g.lineWidth=7*base;g.lineCap='round';g.globalAlpha=n.holding?0.95:0.6;g.beginPath();
   for(let s=0;s<=14;s++){const pp=lerp(Math.max(0,pe),ph,s/14),q=itemPos(n,pp,t);s?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);}g.stroke();g.globalAlpha=1;
   if(n.holding){const pr=clamp((t-n.t)/(n.end-n.t),0,1);g.strokeStyle='#ffe66d';g.lineWidth=6;g.beginPath();g.arc(z.x,z.y,z.r+6,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);g.stroke();drawItem(n,z.x,z.y,base*(1.1+0.06*Math.sin(tm*30)),tm*12,tm);
    if(Math.random()<0.3)PT.push({x:z.x+(Math.random()-0.5)*40,y:z.y,vx:(Math.random()-0.5)*80,vy:-140,l:0.4,c:IC.yarn,r:3});continue;}}
  if(n.hit)continue;
  // timing ring
  const rem=n.t-t;if(n.decoy){}else if(rem<0.75&&rem>-0.05){const k=clamp(rem/0.75,0,1);g.strokeStyle=hexA(IC[n.item]||'#ffffff',0.85*(1-k)+0.15);g.lineWidth=3;g.beginPath();g.arc(z.x,z.y,z.r*(1+1.6*k),0,7);g.stroke();}
  const q=itemPos(n,p,t);if(n.dbl&&n.side>0&&n.pair&&!n.pair.hit&&rem<0.9&&rem>-0.05){const q2=itemPos(n.pair,p,t);g.strokeStyle='rgba(255,230,109,'+(0.25+0.5*(1-clamp(rem/0.9,0,1)))+')';g.lineWidth=4;g.setLineDash([8,8]);g.beginPath();g.moveTo(q2.x,q2.y);g.lineTo(q.x,q.y);g.stroke();g.setLineDash([]);}
  if(n.sw&&p>0.25&&p<0.8){g.save();g.globalAlpha=Math.sin((p-0.25)/0.55*Math.PI);g.font='900 '+(22*base|0)+'px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ffe66d';g.strokeStyle='#000';g.lineWidth=4;g.strokeText('⇄',q.x,q.y-34*base);g.fillText('⇄',q.x,q.y-34*base);g.restore();}
  if(n.item==='laser'){const q2=itemPos(n,p-0.08,t);g.strokeStyle='rgba(255,40,70,.5)';g.lineWidth=6*base;g.beginPath();g.moveTo(q2.x,q2.y);g.lineTo(q.x,q.y);g.stroke();}
  g.globalAlpha=p>1?clamp(1-(p-1)*8,0,1):clamp(p*5,0,1);drawItem(n,q.x,q.y,base*lerp(0.75,1.1,clamp(p,0,1)),q.ang,tm);g.globalAlpha=1;}
 // caught items pop
 for(let i=POPS.length-1;i>=0;i--){const pp=POPS[i],a=(now-pp.t0)/1000;if(a>0.35){POPS.splice(i,1);continue;}g.globalAlpha=1-a/0.35;drawItem(pp.n,pp.x,pp.y-a*60,base*(1.1+a*1.4),0,tm);g.globalAlpha=1;}
 if(G.swipeFx){const a=(now-G.swipeFx.t0)/1000;if(a>0.3)G.swipeFx=null;else{const s=G.swipeFx;g.strokeStyle='rgba(255,255,255,'+(1-a/0.3)+')';g.lineWidth=8*(1-a/0.3)+1;g.beginPath();g.moveTo(s.x0,s.y0);g.lineTo(s.x1+(s.x1-s.x0)*2,s.y1+(s.y1-s.y0)*2);g.stroke();}}
 for(let i=TAPS.length-1;i>=0;i--){const tp=TAPS[i],a=(now-tp.t0)/1000;if(a>0.3){TAPS.splice(i,1);continue;}g.strokeStyle='rgba(255,255,255,'+(0.6*(1-a/0.3))+')';g.lineWidth=3;g.beginPath();g.arc(tp.x,tp.y,14+a*90,0,7);g.stroke();}
 // particles
 for(let i=PT.length-1;i>=0;i--){const p=PT[i];p.l-=dt;if(p.l<=0){PT.splice(i,1);continue;}if(!p.nt)p.vy+=600*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;g.globalAlpha=Math.min(1,p.l*2.5);g.fillStyle=p.c;if(p.nt){g.font='900 26px system-ui';g.textAlign='center';g.fillText('♪',p.x,p.y);}else if(p.st)star(p.x,p.y,p.r*1.6,p.r*0.6);else circ(p.x,p.y,p.r);}g.globalAlpha=1;
 // HUD
 g.textAlign='left';g.textBaseline='top';g.fillStyle='#fff';g.font='900 22px "Arial Black",system-ui';g.fillText(G.score.toString().padStart(7,'0'),62,14);
 g.font='700 11px system-ui';g.fillStyle='#cbb8ff';g.fillText(G.tut?'TUTORIAL · '+G.song.name.toUpperCase():G.song.name.toUpperCase()+' · '+DIFF[G.diff],62,42);
 const prog=clamp(t/G.endT,0,1);g.fillStyle='rgba(255,255,255,.15)';g.fillRect(62,58,W*0.45,4);g.fillStyle='#7dff6b';g.fillRect(62,58,W*0.45*prog,4);
 const acc=G.units?G.wsum/G.units*100:100;g.textAlign='right';g.fillStyle='#fff';g.font='800 13px system-ui';g.fillText(acc.toFixed(1)+'%',W-62,20);
 if(G.combo>=3){g.textAlign='center';g.textBaseline='middle';const cy=H*0.115,pop=G.jd?Math.max(0,0.15-(now-G.jd.t0)/1000)*2:0;g.save();g.translate(W/2,cy);g.scale(1+pop,1+pop);g.font='900 40px "Arial Black",Impact,sans-serif';g.lineWidth=6;g.strokeStyle='#000';g.strokeText(G.combo,0,0);g.fillStyle=G.fever?'#ff3fd6':'#fff';g.fillText(G.combo,0,0);g.font='800 12px system-ui';g.fillStyle=G.fever?'#ffb3f0':'#cbb8ff';
  g.fillText(G.fever?'🔥 FEVER COMBO 🔥':G.combo>=50?'COMBO · THE CROWD IS HERE!':G.combo>=25?'COMBO · ALLEY CATS JOINED!':G.combo>=10?'COMBO · LIGHTS ON!':'COMBO',0,28);g.restore();}
 // tips (tutorial + first-time hints)
 let tip=null;if(G.tut){for(let i=0;i<ns.length;i++){const n=ns[i];if(n.tip&&n.t-ap-0.3<=t)tip=n.tip;}if(t>ns.end-0.6)tip="You're ready! 🎉";}
 else if(G.units<3&&t<8)tip=G.diff===0?'Tap when snacks land in Nix\u2019s paw rings!':'Tap the LEFT or RIGHT ring as snacks land!';
 if(tip){g.textAlign='center';g.textBaseline='middle';g.font='900 17px "Arial Black",system-ui';const w=Math.min(W-20,g.measureText(tip).width+28);g.fillStyle='rgba(20,16,31,.85)';rr(W/2-w/2,H*0.155,w,36,18);g.fill();g.fillStyle='#ffe66d';g.fillText(tip,W/2,H*0.155+19);}
 if(G.jd){const a=(now-G.jd.t0)/1000;if(a<0.5){g.save();g.globalAlpha=1-a*2;g.textAlign='center';g.textBaseline='middle';const jy=Math.min(H*0.25,nixPos().y-nixPos().h*1.09-30);g.translate(W/2+(G.jd.side||0)*Math.min(W*0.2,110),jy-a*18);const s=1+Math.max(0,0.1-a)*3;g.scale(s,s);g.font='900 24px "Arial Black",Impact,sans-serif';g.lineWidth=6;g.strokeStyle='#000';g.strokeText(JN[G.jd.k],0,0);g.fillStyle=JC[G.jd.k];g.fillText(JN[G.jd.k],0,0);if(G.jd.el){g.font='800 11px system-ui';g.fillStyle=G.jd.el==='EARLY'?'#7dc7ff':'#ffb36b';g.fillText(G.jd.el,0,20);}g.restore();}}
 if(G.fever){g.fillStyle=hexA('#ff3fd6',S.rf?0.1:0.12+0.1*Math.sin(t*12));g.fillRect(0,0,6,H);g.fillRect(W-6,0,6,H);}}
function paw(x,y,r,col,sy){g.fillStyle=col;ell(x,y+r*0.25*sy,r*0.5,r*0.38*sy);for(const [dx,dy] of [[-0.55,-0.25],[-0.2,-0.55],[0.2,-0.55],[0.55,-0.25]])ell(x+dx*r,y+dy*r*sy,r*0.17,r*0.2*sy);}

/* ================= UI ================= */
const SCR=['title','select','settings','wardrobe','results','scores','career'];
function show(s){if(G.state==='results'&&s!=='results'&&G.pendingHS)saveHS();if(s!=='play'&&G.state==='play')stopPlayback();if((s==='title'||s==='select')&&G.state!=='title'&&G.state!=='select'||s==='select')N.fixed=null;
 if(s!=='results'){N.fixed=null;N.bubble='';N.preview=null;}G.state=s;for(const k of SCR)$(k).classList.toggle('hide',k!==s);$('hud').classList.toggle('hide',s!=='play');$('pause').classList.add('hide');
 if(s==='select'){if(G.fp){G.sel=G.fp.sel;G.d=G.fp.d;G.fp=null;}G.gig=null;renderSongs();preview();}if(s==='career'){renderCareer.sc=0;renderCareer();}if(s==='wardrobe')renderWard();if(s==='scores')renderScores();if(s==='settings')syncSet();if(s==='title'){$('bCarN').textContent=nextLine();N.bubble='';if(ac&&!PB)startPlayback(SONGS[G.sel],SONGS[G.sel].preview,0.05,true);}}
function preview(){if(!ac)return;const s=SONGS[G.sel];if(PB&&PB.song===s)return;startPlayback(s,s.preview,0.05,true);}
function updMore(){const e=$('songs');const m=e.scrollHeight>e.clientHeight+4&&e.scrollTop+e.clientHeight<e.scrollHeight-6;e.classList.toggle('more',m);$('sMore').classList.toggle('hide',!m);}
function renderSongs(){document.querySelectorAll('.diffs button').forEach(b=>b.classList.toggle('on',+b.dataset.d===G.d));
 $('songs').innerHTML=SONGS.map((s,i)=>{const b=BEST[s.id+'_'+G.d];const top=hsList(s.id,G.d)[0];const lk=songLocked(s);return `<div class="card${i===G.sel?' on':''}${s.hard?' hard':''}${lk?' lock':''}" data-i="${i}"><div style="font-size:26px">${s.icon}</div><div style="flex:1;min-width:0"><div style="font:900 15px 'Arial Black',system-ui">${s.name}${s.hard?' <span class="htag">🔥 HARD</span>':''}</div><div style="font:600 12px system-ui;opacity:.75">${lk?'🔒 Career: reach '+CH[LOCKSONG[s.id]].n:s.genre+' · '+s.bpm+' BPM · '+buildChart(s,G.d).length+' notes'}</div></div><div style="text-align:right;font:800 12px system-ui">${b?`<div style="font:900 20px 'Arial Black';color:#ffe66d">${b.grade}${b.fc?'<small style="font-size:11px"> FC</small>':''}</div>🏆 ${b.score.toLocaleString()}${top?'<div style="opacity:.7;font-size:10px">'+esc(top.name)+'</div>':''}`:'<span style="opacity:.5">NEW</span>'}</div></div>`;}).join('');
 $('songs').querySelectorAll('.card').forEach(c=>c.onclick=()=>{initAudio();G.sel=+c.dataset.i;LS.set('sel',G.sel);uiSfx();renderSongs();preview();});
 updMore();const oc=$('songs').querySelector('.card.on');if(oc&&!renderSongs.did){renderSongs.did=1;oc.scrollIntoView({block:'nearest'});}$('sInfo').textContent=['Relaxed: tap either side, generous timing.','Left/right paws, yarn holds, laser swipes.','Doubles, switch-ups, holds + taps — and DON\'T touch the 🥒!'][G.d]+(SONGS[G.sel].hard?' 🔥 Hard level.':'');if(songLocked(SONGS[G.sel]))$('sInfo').textContent='🔒 Reach '+CH[LOCKSONG[SONGS[G.sel].id]].n+' in Career to unlock this song.';}
document.querySelectorAll('.diffs button').forEach(b=>b.onclick=()=>{G.d=+b.dataset.d;LS.set('diff',G.d);uiSfx();renderSongs();});
document.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{initAudio();uiSfx();show(b.dataset.to);});
$('bHS').onclick=$('sHS').onclick=()=>{initAudio();uiSfx();openScores();};$('hsBack').onclick=()=>{uiSfx();show(G.scoresBack||'title');};
$('hsDiffs').querySelectorAll('button').forEach(b=>b.onclick=()=>{uiSfx();hsSel.d=+b.dataset.d;renderScores();});
$('bPlay').onclick=()=>{initAudio();uiSfx();show('select');};$('bSet').onclick=()=>{initAudio();show('settings');};$('bWard').onclick=()=>{initAudio();show('wardrobe');};
$('bGo').onclick=()=>{const s=SONGS[G.sel];if(songLocked(s)){$('sInfo').textContent='🔒 Reach '+CH[LOCKSONG[s.id]].n+' in Career to unlock '+s.name+'.';uiSfx();return;}G.gig=null;uiSfx();startGame();};$('bTut')&&($('bTut').onclick=()=>{uiSfx();startGame({tut:1});});$('rRetry').onclick=()=>startGame();$('bCar').onclick=()=>{initAudio();uiSfx();show('career');};$('rSongs').onclick=()=>show(G.gig?'career':'select');
$('bPause').onclick=pauseGame;$('pRes').onclick=resumeGame;$('pRetry').onclick=()=>{ac.resume();startGame();};$('pQuit').onclick=()=>{ac.resume();G.paused=false;show('select');};
function syncSet(){$('sMv').value=S.mv;$('sSv').value=S.sv;$('sOffV').textContent=(S.off>0?'+':'')+S.off+' ms';$('sRf').checked=S.rf;}
$('sMv').oninput=e=>{S.mv=+e.target.value;applyVol();saveSet();};$('sSv').oninput=e=>{S.sv=+e.target.value;applyVol();saveSet();};$('sSv').onchange=()=>uiSfx();
document.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{S.off=clamp(S.off+ +b.dataset.o,-300,300);saveSet();syncSet();});
$('sRf').onchange=e=>{S.rf=e.target.checked;saveSet();};
// calibration
let cal=null;$('sCal').onclick=()=>{initAudio();stopPlayback();const t0=ac.currentTime+0.6,iv=0.5;cal={t0,iv,d:[]};for(let i=0;i<16;i++)tick(t0+i*iv,i%4===0);$('calBox').classList.remove('hide');$('calMsg').textContent='Tap the button on every beep (16 beeps)…';
 setTimeout(()=>{if(!cal)return;const d=cal.d.slice().sort((a,b)=>a-b);if(d.length>=6){S.off=Math.round(d[d.length>>1]);saveSet();syncSet();$('calMsg').textContent='Offset set to '+S.off+' ms. 👍';}else $('calMsg').textContent='Not enough taps — try again.';cal=null;},16*500+1200);};
$('calTap').onpointerdown=e=>{e.preventDefault();if(!cal)return;const t=audioNow()-outLat(),k=Math.round((t-cal.t0)/cal.iv);if(k<0||k>15)return;cal.d.push((t-(cal.t0+k*cal.iv))*1000);bell(mf(84),0.05);};
function renderWard(){const sw=(t,k,o)=>{const u=isU(t,k),on=WARD[t]===k,bg=o.c==='rainbow'?'linear-gradient(90deg,#ff3d6e,#ffe63d,#5dff6b,#33c8ff,#9a5cff)':o.c;return `<div class="witem${on?' on':''}${u?'':' lock'}" data-t="${t}" data-k="${k}"><div class="sw" style="background:${bg}"></div>${u?o.n:'🔒 '+o.n}</div>`;};
 $('wCaps').innerHTML=Object.entries(CAPS).map(([k,o])=>sw('cap',k,o)).join('');$('wHoods').innerHTML=Object.entries(HOODS).map(([k,o])=>sw('hood',k,o)).join('');
 const su=isU('shades');$('wExtra').innerHTML=`<div class="witem${WARD.shades?' on':''}${su?'':' lock'}" data-t="shades"><div class="sw" style="background:#08080a;display:flex;align-items:center;justify-content:center">😎</div>${su?'Shades':'🔒 Shades'}</div>`;
 $('wExtra').innerHTML+=Object.entries(ACCS).map(([k,o])=>{const u=isU('acc',k),on=WARD.acc===k;return `<div class="witem${on?' on':''}${u?'':' lock'}" data-t="acc" data-k="${k}"><div class="sw" style="background:#2a2040;display:flex;align-items:center;justify-content:center">${o.i}</div>${u?o.n:'🔒 '+o.n}</div>`;}).join('');
 $('wHint').textContent=G.tryAll?'TEST MODE: everything unlocked to try on — not saved.':'Tap a locked item to see how to earn it.';
 document.querySelectorAll('.witem').forEach(el=>el.onclick=()=>{const t=el.dataset.t,k=el.dataset.k;if(!isU(t,k)){$('wHint').textContent='🔒 '+(t==='shades'?UNL.shades[1]:UNL[t][k][1]);return;}uiSfx();if(t==='shades')WARD.shades=!WARD.shades;else if(t==='acc')WARD.acc=WARD.acc===k?'':k;else WARD[t]=k;if(!G.tryAll)LS.set('ward',WARD);N.pose='tip';N.pt=0.7;renderWard();});}

/* ================= VERSION / SW / ICONS ================= */
function checkVersion(){fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(j=>{if(j.v&&j.v!==VERSION&&G.state!=='play'){const k='nix.reload.'+j.v;if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,1);location.reload();}}}).catch(()=>{});}
checkVersion();setInterval(checkVersion,5*60*1000);
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js?v='+VERSION).catch(()=>{});
window.__nixIcon=(size,mask)=>{const c=document.createElement('canvas');c.width=c.height=size;const og=g;g=c.getContext('2d');const gr=g.createRadialGradient(size/2,size*0.45,0,size/2,size/2,size*0.7);gr.addColorStop(0,'#7a3fd1');gr.addColorStop(1,'#14101f');g.fillStyle=gr;g.fillRect(0,0,size,size);
 const sc=size/(mask?420:330);drawNix(size/2,size*0.56+215*sc,sc,{beat:0.5,time:0,pose:'idle',wob:0,cap:'black',hood:'black',blink:0,happy:0,look:-0.5});g=og;return c.toDataURL('image/png');};
G.SONGS=SONGS;G.buildChart=buildChart;$('songs').addEventListener('scroll',updMore,{passive:true});
const TEST=Q.get('test'),SID={lofi:0,funk:1,hiphop:1,strut:1,hype:2,edm:2,dnb:3,drumandbass:3,punk:4,rock:4,salsa:5,latin:5,vr:6,vrshowdown:6,synthwave:6,cyber:6,pinball:7,pinballgoat:7,goat:7,arcade:7,reggae:8,streamers:8,streamersbestreamin:8,kpop:9,clawsout:9,'claws-out':9,viking:10,ragnapurr:10,nordic:10,summer:11,catnipsummer:11,poppunk:11,goth:12,blackcatrequiem:12,numetal:12,gothic:12},DID={easy:0,normal:1,hard:2},qs=(Q.get('song')||'').toLowerCase(),qd=(Q.get('diff')||'').toLowerCase();
const GIGQ=(Q.get('gig')||'').match(/^(\d+)-(\d+)$/),GIG=GIGQ&&CH[+GIGQ[1]]&&CH[+GIGQ[1]].gigs[+GIGQ[2]]?{c:+GIGQ[1],j:+GIGQ[2]}:null;
G.test=TEST||(GIG?'gig':null);G.nosave=!!G.test;G.realBest=JSON.parse(JSON.stringify(BEST));G.realCar=JSON.parse(JSON.stringify(CAR));
if(TEST==='career'||GIG){G.careerAll=true;if(TEST==='career'){const demo=[7,7,3,7,3,1,0,7,5,1,3];let q=0;for(let i=0;i<CH.length;i++)for(let j=0;j<CH[i].gigs.length;j++)if(q<demo.length)CAR.st[gid(i,j)]=demo[q++];}}
if(TEST==='careerfresh')CAR={st:{}};
G.CH=CH;G.gradeOf=gradeOf;G.WT=WT;G.WIN=WIN;G.WSC=WSC;G.LATE=LATE;G.carStars=carStars;
if(qs in SID)G.sel=SID[qs];else if(TEST==='fever')G.sel=2;else if(TEST==='callresponse')G.sel=1;if(qd in DID)G.d=DID[qd];
function tapToStart(){const o=document.createElement('div');o.id='tapGo';o.style.cssText='position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#14101fcc;color:#fff;font:900 34px "Arial Black",system-ui;text-align:center;cursor:pointer';
 o.innerHTML='<div>▶ TAP TO PLAY</div><div style="font:700 16px system-ui;margin-top:10px;opacity:.85">'+(GIG?'🎤 CAREER GIG · '+CH[GIG.c].v+'<br>':'')+(TEST==='tutorial'?'Tutorial':SONGS[G.sel].name+' · '+DIFF[G.d])+(TEST==='fever'?' · FEVER TEST':TEST==='callresponse'?' · MEOW CALL & RESPONSE':'')+'</div>';
 o.onclick=()=>{o.remove();if(GIG)playGig(GIG.c,GIG.j);else if(TEST==='tutorial')startGame({tut:1});else if(TEST==='callresponse'){const c=SONGS[G.sel].secs.find(x=>x[0]==='call');startGame({from:Math.max(0,c[1]-3)});}else startGame();};document.body.appendChild(o);}
if(GIG){const gg=CH[GIG.c].gigs[GIG.j];G.sel=SONGS.findIndex(s=>s.id===gg[0]);G.d=gg[1];}
if(TEST==='wardrobe'){G.tryAll=true;show('wardrobe');}
else if(TEST==='career'||TEST==='careerfresh')show('career');
else if(TEST==='careerresult'){G.careerAll=false;CAR={st:{'alley:1':7}};G.gig={c:0,j:0};G.sel=0;G.d=0;show('title');const ch=buildChart(SONGS[0],0);G.song=SONGS[0];G.diff=0;G.notes=ch;G.total=ch.filter(n=>n.kind!=='call').length+ch.filter(n=>n.kind==='hold').length;G.cnt=[G.total-3,2,1,0];G.wsum=G.total-3+2*WT[1]+WT[2];G.units=G.total;G.bonus=Math.round(1e6*0.12);G.score=Math.round(1e6*G.wsum/G.total)+G.bonus;G.maxCombo=G.total;G.fevers=2;G.splashes=0;G.state='play';finish();}
else if(TEST==='highscores'){const s=SONGS[G.sel],k=s.id+'_'+G.d;if(!HS[k]||!HS[k].length){const nm=['JEF','NIX','ACE','MEOW','PURR','CAT','KIT','TOM','ZOE','AL'];HS[k]=nm.map((n,i)=>({name:n,score:Math.round(1080000-i*61000-i*i*900),grade:i<2?'S':i<6?'A':'B',acc:+(99.2-i*2.1).toFixed(1),combo:400-i*31,fc:i===0,date:today(),ts:i}));}show('title');openScores();}
else if(TEST==='results'){show('title');const ch=buildChart(SONGS[G.sel],G.d);G.song=SONGS[G.sel];G.diff=G.d;G.notes=ch;G.total=ch.length+ch.filter(n=>n.end).length;G.total=ch.filter(n=>n.kind!=='call').length+ch.filter(n=>n.kind==='hold').length;G.cnt=[G.total-4,3,1,0];G.wsum=G.total-4+2.7+0.7;G.units=G.total;G.bonus=Math.round(1e6*0.12);G.score=Math.round(1e6*G.wsum/G.total)+G.bonus;G.maxCombo=G.total;G.state='play';finish();}
else if(qs||GIG||TEST==='fever'||TEST==='tutorial'||TEST==='callresponse'){show('title');tapToStart();}
else show('title');
requestAnimationFrame(frame);
})();
