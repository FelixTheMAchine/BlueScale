import { test, expect } from '@playwright/test';

test('Editar escala cria rascunho, enquanto Presente/Ausente/Atrasado ficam na versão publicada', async ({page})=>{
 test.skip(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD,'Necessita conta de teste');
 await page.goto('/login');
 await page.getByLabel('E-mail ou usuário').fill(process.env.ADMIN_EMAIL!);
 await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();

 const token=Date.now().toString(36);
 const departments=await (await page.request.get('/api/departments')).json();
 const m=await page.request.post('/api/members',{data:{
  identifier:'editattendance'+token,fullName:'Escalado Teste '+token,
  email:'editattendance'+token+'@example.com',
  departmentId:departments[0].id,preferredPeriod:'ANY',skillIds:[]
 }});
 expect(m.status()).toBe(201);
 const memberId=(await m.json()).id;
 const start=new Date(Date.now()+9*86400_000);start.setUTCHours(16,0,0,0);
 const end=new Date(start.getTime()+60*60000);
 const eventResponse=await page.request.post('/api/events',{data:{
  name:'Editar Presença '+token,location:'Campus',description:'Teste de navegação',
  startsAt:start.toISOString(),endsAt:end.toISOString(),
  maxMinutesPerMember:360,maxShiftsPerMember:4,minRestMinutes:0
 }});
 expect(eventResponse.status()).toBe(201);
 const eventId=(await eventResponse.json()).id;
 expect((await page.request.post('/api/events/'+eventId+'/workstations',{data:{
  name:'Credenciamento',minPeople:1,idealPeople:1,slotMinutes:60,priority:1,skillIds:[]
 }})).status()).toBe(201);
 expect((await page.request.post('/api/events/'+eventId+'/availability',{data:{
  memberId,startAt:start.toISOString(),endAt:end.toISOString(),available:true
 }})).status()).toBe(200);
 expect((await page.request.post('/api/events/'+eventId+'/schedule/generate',{data:{}})).status()).toBe(200);
 const draft=await (await page.request.get('/api/events/'+eventId+'/schedule')).json();
 expect(draft.assignments).toHaveLength(1);
 expect((await page.request.post('/api/events/'+eventId+'/schedule/publish',{data:{
  versionId:draft.id,revision:draft.revision,acceptIncomplete:false
 }})).status()).toBe(200);
 const publishedId=draft.assignments[0].id;
 expect((await page.request.post('/api/assignments/'+publishedId+'/attendance',{data:{status:'PRESENT'}})).status()).toBe(200);

 await page.goto('/eventos/'+eventId+'/escala');
 const editButton=page.getByRole('button',{name:'Editar escala'});
 await expect(editButton).toBeVisible();
 await expect(page.getByRole('button',{name:'Presente'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ausente'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Atrasado'})).toBeVisible();
 await editButton.click();
 await expect(page.getByRole('button',{name:'Publicar escala'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Controle de presença'})).toBeVisible();
 const current=await (await page.request.get('/api/events/'+eventId+'/schedule')).json();
 expect(current.status).toBe('DRAFT');
 expect(current.id).not.toBe(draft.id);
 expect(current.assignments).toHaveLength(1);
 expect(current.assignments[0].id).not.toBe(publishedId);
 await page.getByRole('button',{name:'Remover atribuição'}).click();
 await expect(page.getByRole('status')).toContainText('Escala atualizada e validada');
 const after=await (await page.request.get('/api/events/'+eventId+'/schedule')).json();
 expect(after.assignments).toHaveLength(0);

 // A published version, including its attendance mark, is unchanged.
 await page.getByRole('button',{name:'Controle de presença'}).click();
 await expect(page.getByRole('button',{name:'Presente'})).toBeVisible();
 const published=await (await page.request.get('/api/events/'+eventId+'/schedule?view=published')).json();
 expect(published.id).toBe(draft.id);
 expect(published.assignments).toHaveLength(1);
 expect(published.assignments[0].id).toBe(publishedId);
 expect(published.assignments[0].attendance?.status).toBe('PRESENT');
 await page.getByRole('button',{name:'Ausente'}).click();
 await expect(page.getByRole('status')).toContainText('Presença registrada');
 const changed=await (await page.request.get('/api/events/'+eventId+'/schedule?view=published')).json();
 expect(changed.assignments[0].attendance.status).toBe('ABSENT');
 await page.getByRole('button',{name:'Voltar à edição'}).click();
 await expect(page.getByRole('button',{name:'Publicar escala'})).toBeVisible();
});
