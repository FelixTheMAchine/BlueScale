import { test, expect } from '@playwright/test';

test('Rota de ping leve funciona sem login e não pode ser cacheada',async({request})=>{
 const response=await request.get('/api/ping');
 expect(response.status()).toBe(200);
 expect((await response.json()).status).toBe('alive');
 expect(response.headers()['cache-control']).toContain('no-store');
});

test('Equipe completa: mais de 60 membros ativos, sem expor e-mail e dados privados',async({page})=>{
 test.skip(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD,'Conta de teste não configurada');
 await page.goto('/login');
 await page.getByLabel('E-mail ou usuário').fill(process.env.ADMIN_EMAIL!);
 await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();

 const departments=await (await page.request.get('/api/departments')).json();
 const prefix='perf'+Date.now().toString(36);
 // Old event and schedule pages loaded only the first 2 pages: 60 people.
 for(let start=0;start<61;start+=10){
  const results=await Promise.all(Array.from({length:Math.min(10,61-start)},(_,offset)=>{
   const i=start+offset;
   return page.request.post('/api/members',{data:{
    identifier:prefix+'-'+i,fullName:'Membro Teste Performance '+prefix+' '+String(i).padStart(2,'0'),
    email:prefix+'-'+i+'@example.com',departmentId:departments[0].id,
    preferredPeriod:'ANY',skillIds:[]
   }});
  }));
  expect(results.every(r=>r.status()===201)).toBe(true);
 }
 const response=await page.request.get('/api/members/active');
 expect(response.status()).toBe(200);
 const members=await response.json();
 const own=members.filter((m:{fullName:string})=>m.fullName.includes(prefix));
 expect(own).toHaveLength(61);
 expect(own[0].department.name).toBeTruthy();
 expect(own[0]).not.toHaveProperty('email');
 expect(own[0]).not.toHaveProperty('identifier');
 expect(own[0]).not.toHaveProperty('skills');

 const begins=new Date(Date.now()+7*24*60*60*1000);begins.setUTCHours(13,0,0,0);
 const event=await page.request.post('/api/events',{data:{
  name:'UI Performance '+prefix,location:'Campus',description:'Auditoria',
  startsAt:begins.toISOString(),endsAt:new Date(begins.getTime()+60*60000).toISOString(),
  maxMinutesPerMember:360,maxShiftsPerMember:4,minRestMinutes:0
 }});
 expect(event.status()).toBe(201);
 const id=(await event.json()).id;
 try{
  await page.goto('/eventos/'+id);
  await expect(page.getByText(own[60].fullName,{exact:true})).toBeVisible();
 }finally{
  const del=await page.request.delete('/api/events/'+id);
  expect(del.status()).toBe(200);
 }
});
