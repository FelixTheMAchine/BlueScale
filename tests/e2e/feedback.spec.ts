import { test, expect } from '@playwright/test';

test('feedback 1.1: edita/desativa membros e edita/remove postos e eventos sem escala', async ({ page }) => {
 test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, 'Necessita credenciais administrativas no ambiente de testes');
 await page.goto('/login');
 await page.getByLabel('E-mail ou usuário').fill(process.env.ADMIN_EMAIL!);
 await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();

 const token=Date.now().toString(36);
 const depsResponse=await page.request.get('/api/departments');
 expect(depsResponse.ok()).toBeTruthy();
 const departments=await depsResponse.json();
 expect(departments.length).toBeGreaterThan(0);

 const createdMember=await page.request.post('/api/members',{data:{
  identifier:'e2e'+token,fullName:'Teste Presença BlueScale',email:'e2e'+token+'@example.com',
  departmentId:departments[0].id,preferredPeriod:'ANY',skillIds:[],
 }});
 expect(createdMember.status()).toBe(201);
 const memberId=(await createdMember.json()).id;
 const changedMember=await page.request.patch('/api/members/'+memberId,{data:{fullName:'Teste Atualizado BlueScale',status:'INACTIVE'}});
 expect(changedMember.status()).toBe(200);
 const members=await (await page.request.get('/api/members?q=e2e'+token)).json();
 expect(members.data.find((m:{id:string;status:string})=>m.id===memberId)?.status).toBe('INACTIVE');

 const now=new Date();now.setUTCDate(now.getUTCDate()+3);now.setUTCHours(15,0,0,0);
 const later=new Date(now.getTime()+2*60*60*1000);
 const base={name:'Evento E2E '+token,description:'Teste automático',location:'Campus',
  startsAt:now.toISOString(),endsAt:later.toISOString(),maxMinutesPerMember:360,maxShiftsPerMember:4,minRestMinutes:0};
 const createEvent=await page.request.post('/api/events',{data:base});
 expect(createEvent.status()).toBe(201);
 const eventId=(await createEvent.json()).id;
 const createStation=await page.request.post('/api/events/'+eventId+'/workstations',{data:{
  name:'Portaria',minPeople:1,idealPeople:2,slotMinutes:60,priority:1,skillIds:[],
 }});
 expect(createStation.status()).toBe(201);
 const stationId=(await createStation.json()).id;
 const modifyStation=await page.request.patch('/api/events/'+eventId+'/workstations/'+stationId,{data:{
  name:'Portaria principal',minPeople:2,idealPeople:3,slotMinutes:30,priority:1,skillIds:[],
 }});
 expect(modifyStation.status()).toBe(200);
 const eventAfterStationEdit=await (await page.request.get('/api/events/'+eventId)).json();
 expect(eventAfterStationEdit.workstations.find((w:{id:string;name:string})=>w.id===stationId)?.name).toBe('Portaria principal');
 expect(eventAfterStationEdit.shifts).toHaveLength(4);

 // Event times must remain locked while shifts exist.
 const forbiddenEdit=await page.request.patch('/api/events/'+eventId,{data:{...base,endsAt:new Date(later.getTime()+3600000).toISOString()}});
 expect(forbiddenEdit.status()).toBe(409);
 expect((await page.request.delete('/api/events/'+eventId+'/workstations/'+stationId)).status()).toBe(200);
 expect((await page.request.patch('/api/events/'+eventId,{data:{...base,location:'Ginásio'}})).status()).toBe(200);
 expect((await page.request.delete('/api/events/'+eventId)).status()).toBe(200);
 expect((await page.request.get('/api/events/'+eventId)).status()).toBe(404);
});
