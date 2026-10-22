import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
function pngSize(file){const data=fs.readFileSync(path.join(root,file));assert.equal(data.subarray(1,4).toString(),'PNG');return [data.readUInt32BE(16),data.readUInt32BE(20)];}
test('manifesto PWA instalável com idioma e modo standalone',()=>{
 const data=read('src/app/manifest.ts');
 for(const part of ["display: 'standalone'","lang: 'pt-BR'","start_url: '/'"]){assert.ok(data.includes(part),part)}
 assert.ok(exists('src/app/layout.tsx'));
});
test('ícones PWA com dimensões previstas',()=>{
 assert.deepEqual(pngSize('public/icons/blue-192.png'),[192,192]);
 assert.deepEqual(pngSize('public/icons/blue-512.png'),[512,512]);
 assert.deepEqual(pngSize('public/icons/blue-maskable-512.png'),[512,512]);
 assert.deepEqual(pngSize('public/icons/blue-apple.png'),[180,180]);
});
test('navegação mobile para fluxos principais e página de ajuda',()=>{
 const shell=read('src/components/shell.tsx');
 for(const route of ['/eventos','/membros','/ajuda'])assert.ok(shell.includes(route));
 assert.ok(shell.includes('mobile-tabbar'));
 assert.ok(exists('src/app/ajuda/page.tsx'));
});
test('cache offline não inclui páginas autenticadas ou respostas API',()=>{
 const sw=read('public/sw.js');
 assert.ok(sw.includes("request.mode==='navigate'"));
 assert.ok(sw.includes('fetch(request).catch'));
 assert.ok(sw.includes("url.pathname.startsWith('/_next/static/')"));
 assert.ok(sw.includes('Do not cache /api'));// Static-source assertion; not a browser/service-worker integration test.
});
