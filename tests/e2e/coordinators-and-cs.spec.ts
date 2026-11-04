import {test,expect} from '@playwright/test';

test('GP seleciona coordenadores da equipe mesmo sem ser ADMIN, e nome persiste',async({page})=>{
 test.skip(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD,'Credenciais de teste necessárias');

 await page.goto('/login');
 await page.getByLabel('E-mail ou usuário').fill(process.env.ADMIN_EMAIL!);
 await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();

 const token=Date.now().toString(36);
 const department=(await (await page.request.get('/api/departments')).json())[0];
 const member=await page.request.post('/api/members',{data:{
  identifier:'coord'+token,fullName:'Coordenador de Festa '+token,
  email:'coord'+token+'@example.com',departmentId:department.id,
  preferredPeriod:'ANY',skillIds:[]
 }});
 expect(member.status()).toBe(201);
 const memberId=(await member.json()).id;
 const start=new Date(Date.now()+7*86400000);start.setUTCHours(16,0,0,0);
 const event=await page.request.post('/api/events',{data:{
  name:'Coordenador Festa '+token,description:'Teste de coordenador',location:'Campus',
  startsAt:start.toISOString(),endsAt:new Date(start.getTime()+3600000).toISOString(),
  maxMinutesPerMember:360,maxShiftsPerMember:4,minRestMinutes:0
 }});
 expect(event.status()).toBe(201);
 const id=(await event.json()).id;

 const username='people'+token;
 const password='Gp#E2e'+token+'ABC';
 const people=await page.request.post('/api/users',{data:{
  name:'GP Teste '+token,username,email:'',role:'PEOPLE',password
 }});
 expect(people.status()).toBe(201);
 await page.context().clearCookies();
 await page.goto('/login');
 await page.getByLabel('E-mail ou usuário').fill(username);
 await page.getByLabel('Senha').fill(password);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();

 // This used to fail with 403 and leave the selector empty.
 expect((await page.request.get('/api/users')).status()).toBe(403);
 const options=await page.request.get('/api/events/'+id+'/coordinators');
 expect(options.status()).toBe(200);
 expect((await options.json()).candidates.find((m:{id:string})=>m.id===memberId)).toBeTruthy();

 await page.goto('/eventos/'+id);
 await expect(page.getByRole('heading',{name:'Coordenadores desta festa'})).toBeVisible();
 await page.getByLabel('Buscar na equipe').fill('Coordenador de Festa '+token);
 await page.getByLabel('Membro que vai coordenar a festa').selectOption(memberId);
 await page.getByRole('button',{name:'Adicionar coordenador'}).click();
 await expect(page.getByRole('status')).toContainText('Coordenador salvo na festa');
 await expect(page.getByText('Designação salva — login não configurado')).toBeVisible();

 await page.reload();
 await expect(page.getByText('Coordenador de Festa '+token,{exact:true})).toBeVisible();
 const assignments=await (await page.request.get('/api/events/'+id+'/coordinators')).json();
 expect(assignments.members.some((m:{memberId:string})=>m.memberId===memberId)).toBe(true);
 await page.getByRole('button',{name:'Retirar Coordenador de Festa '+token+' dos coordenadores'}).click();
 await expect(page.getByText('Nenhum membro designado. Selecione alguém abaixo.')).toBeVisible();
 const after=await (await page.request.get('/api/events/'+id+'/coordinators')).json();
 expect(after.members.some((m:{memberId:string})=>m.memberId===memberId)).toBe(false);
});

test('menus sem corações; grafite do coldzera aparece como detalhe na página inicial',async({page})=>{
 test.skip(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD,'Credenciais de teste necessárias');
 await page.goto('/login');
 await page.getByLabel('E-mail ou usuário').fill(process.env.ADMIN_EMAIL!);
 await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();

 const desktop=page.locator('nav[aria-label="Navegação principal"]');
 await expect(desktop.locator('svg text')).toHaveCount(0);
 const art=page.getByRole('img',{name:'Arte inspirada no grafite da AWP alada do coldzera na Mirage'});
 await expect(art).toBeVisible();
 await expect(art).toHaveAttribute('src','/coldzera-graffiti.svg');
 await expect(page.getByText('MIRAGE · 2016')).toBeVisible();
 const asset=await page.request.get('/coldzera-graffiti.svg');
 expect(asset.status()).toBe(200);
 expect(await asset.text()).toContain('Grafite inspirado na AWP alada de coldzera');

 await page.setViewportSize({width:390,height:844});
 const mobile=page.locator('nav[aria-label="Navegação do aplicativo"]');
 await expect(mobile.locator('svg text')).toHaveCount(0);
 await expect(art).toBeVisible();
});
