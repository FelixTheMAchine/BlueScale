/* Cache apenas da interface demonstrativa. Nunca armazene dados de membros aqui. */
const CACHE = 'bluescale-das-public-demo-v1';
const FILES = ['./','./index.html','./app.js','./style.css','./engine.js','./xlsx.js','./icons/blue-192.png','./icons/blue-512.png','./manifest.webmanifest'];
self.addEventListener('install', ev => ev.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate', ev => ev.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', ev => { const req=ev.request; if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return; const path=new URL(req.url).pathname; if(!FILES.some(f=>new URL(f,self.registration.scope).pathname===path))return; ev.respondWith(fetch(req).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(req,clone));}return response}).catch(()=>caches.match(req)));});
