/* BlueScale: offline fallback, without storing account data or authenticated pages. */
const CACHE = 'bluescale-static-v1';
const OFFLINE = '/offline.html';
const STATIC_ASSETS = [OFFLINE, '/icons/blue-192.png', '/icons/blue-512.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));
});
self.addEventListener('fetch', event => {
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match(OFFLINE)));
  return;
 }
 const url=new URL(request.url);
 if(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/icons/')){
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(request,copy));}
   return response;
  })));
 }
 // Do not cache /api, /login, session responses, member or event content.
});
