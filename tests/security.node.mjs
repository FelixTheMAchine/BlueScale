import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
test('coordenador autorizado somente pelo vínculo no evento',()=>{
 const access=read('src/lib/event-access.ts');
 assert.match(access,/eventCoordinator\.findUnique/);assert.match(access,/userId:user\.id/);
 for(const path of ['src/app/api/events/[id]/route.ts','src/app/api/events/[id]/schedule/route.ts','src/app/api/events/[id]/export/route.ts','src/app/api/events/[id]/swaps/route.ts'])
  assert.match(read(path),/requireEventAccess\(/,path);
});
test('edição e publicação usam revisão e transação serializável',()=>{
 for(const p of ['src/app/api/events/[id]/schedule/edit/route.ts','src/app/api/events/[id]/schedule/publish/route.ts','src/app/api/swaps/[id]/review/route.ts']){
  const s=read(p);assert.match(s,/revision/);assert.match(s,/Serializable/);assert.match(s,/updateMany/);
 }
});
test('backend valida competências e disponibilidade nas trocas',()=>{
 const s=read('src/app/api/swaps/[id]/review/route.ts');assert.match(s,/validateSchedule/);assert.match(s,/loadInputs/);
});
test('identidade DAs presente no PWA, Android e login',()=>{
 for(const p of ['src/components/login-screen.tsx','src/components/shell.tsx','android-live/app/src/main/AndroidManifest.xml'])assert.match(read(p),/DAs|bluescale-das/i);
 for(const p of ['public/icons/blue-192.png','public/icons/blue-512.png','android-live/app/src/main/res/drawable/app_icon.png']){
  const b=fs.readFileSync(p);assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
});
test('Android online somente HTTPS e sem bridge de JS',()=>{
 const java=read('android-live/app/src/main/java/br/com/das/bluescale/MainActivity.java');
 assert.match(java,/https.*getScheme/);assert.match(java,/handler\.cancel\(\)/);assert.match(java,/MIXED_CONTENT_NEVER_ALLOW/);
 assert.doesNotMatch(java,/addJavascriptInterface/);
 assert.match(read('android-live/app/src/main/AndroidManifest.xml'),/usesCleartextTraffic="false"/);
});
test('sem seed fictício em produção por padrão',()=>{
 const seed=read('prisma/seed.ts');assert.match(seed,/NODE_ENV==='production'/);assert.match(seed,/YES_I_UNDERSTAND/);
});
test('dados pessoais e login protegidos',()=>{
 const auth=read('src/lib/auth.ts');assert.match(auth,/loginAllowed/);assert.match(auth,/loginFailed/);
 const workbook=read('src/lib/xlsx.ts');assert.doesNotMatch(workbook,/a\.member\.phone|a\.member\.region/);
});

test('trocas usam revisão da escala publicada mesmo havendo rascunho',()=>{
 assert.match(read('src/components/swap-admin.tsx'),/view=published/);
 assert.match(read('src/app/api/events/[id]/schedule/route.ts'),/EVENT_COORDINATOR/);
});

test('consultas de membros não têm acesso a rascunhos ou rotas de escrita',()=>{
 const api=read('src/lib/api.ts');
 assert.doesNotMatch(api.match(/export const ALL=\\[[^;]+;/)?.[0]||'','VIEWER');
 const auth=read('src/lib/auth.ts');
 assert.match(auth,/user\\.role === 'VIEWER'/);
 assert.match(auth,/portal === 'members'/);
 const view=read('src/app/publicadas/page.tsx');
 assert.match(view,/status: 'PUBLISHED'/);
 const detail=read('src/app/publicadas/[id]/page.tsx');
 assert.match(detail,/status:'PUBLISHED'/);
 for(const path of ['src/app/api/publicadas/[id]/excel/route.ts','src/app/api/publicadas/[id]/csv/route.ts']) {
  const src=read(path);
  assert.match(src,/requireRole\\(\\['VIEWER'\\]\\)/);
  assert.match(src,/status:'PUBLISHED'/);
  assert.match(src,/Cache-Control/);
  assert.doesNotMatch(src,/export async function POST|export async function PATCH|export async function PUT|export async function DELETE/);
 }
});
