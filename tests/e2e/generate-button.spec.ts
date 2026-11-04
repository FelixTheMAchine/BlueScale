import { test, expect } from '@playwright/test';

test('Gerar escala mantém destaque e explica quando faltam postos', async ({page}) => {
 test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, 'Necessita credenciais administrativas');
 await page.goto('/login');
 await page.getByLabel('E-mail ou usuário').fill(process.env.ADMIN_EMAIL!);
 await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();

 const startsAt=new Date(Date.now()+5*86400_000);
 startsAt.setUTCHours(15,0,0,0);
 const response=await page.request.post('/api/events',{data:{
  name:'Botão Gerar E2E '+Date.now(),location:'Campus',description:'Teste de visibilidade',
  startsAt:startsAt.toISOString(),
  endsAt:new Date(startsAt.getTime()+60*60000).toISOString(),
  maxMinutesPerMember:360,maxShiftsPerMember:4,minRestMinutes:0
 }});
 expect(response.status()).toBe(201);
 const id=(await response.json()).id;
 try {
  await page.goto('/eventos/'+id);
  const button=page.getByRole('button',{name:'Gerar escala'});
  await expect(button).toBeEnabled();
  await expect(button).toHaveCSS('background-color','rgb(38, 120, 255)');
  await expect(button).toHaveCSS('opacity','1');
  await button.click();
  await expect(page.getByRole('status')).toContainText('cadastre pelo menos um posto');
  await expect(page.getByText('Nenhum posto cadastrado.')).toBeVisible();
  // No schedule is created if the user clicks before configuring workstations.
  expect((await page.request.get('/api/events/'+id+'/schedule')).status()).toBe(404);
 } finally {
  expect((await page.request.delete('/api/events/'+id)).status()).toBe(200);
 }
});
