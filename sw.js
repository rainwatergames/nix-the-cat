/*! NIX THE CAT — © 2026 Rainwater Games (Jeff Rainwater). All rights reserved. */
// Network-first that bypasses the HTTP cache (GitHub Pages sends max-age=600) so new deploys show up on first open; cache is offline fallback only.
const V='0.6.1';const C='nixcat-v'+V;
const F=['./','index.html','game.js?v='+V,'music/songs.js?v='+V,'install.js?v='+V,'manifest.webmanifest','icon-192.png?v='+V+'-2','icon-512.png?v='+V+'-2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'no-cache'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>{const old=k.filter(x=>x!==C);return Promise.all(old.map(x=>caches.delete(x))).then(()=>self.clients.claim()).then(()=>{
 if(old.length)return self.clients.matchAll({type:'window'}).then(cs=>Promise.all(cs.map(c=>c.navigate(c.url).catch(()=>{}))));});}));});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==location.origin)return;
 if(/version\.json$/.test(u.pathname)){e.respondWith(fetch(req,{cache:'no-store'}));return;}
 const core=req.mode==='navigate'||/(\/|index\.html|game\.js|songs\.js|install\.js|sw\.js|manifest\.webmanifest)$/.test(u.pathname);
 const p=req.mode==='navigate'?fetch(u.href,{cache:'no-cache',credentials:'same-origin'}):fetch(req,core?{cache:'no-cache'}:{});
 e.respondWith(p.then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(req,cp));}return res;})
  .catch(()=>caches.match(req,{ignoreSearch:req.mode==='navigate'}).then(m=>m||caches.match('index.html'))));});
