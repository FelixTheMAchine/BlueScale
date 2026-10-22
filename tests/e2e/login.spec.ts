import {test,expect} from '@playwright/test';
test('usuário não autenticado é redirecionado para login',async({page})=>{
 await page.goto('/');await expect(page).toHaveURL(/\/login/);
 await expect(page.getByRole('heading',{name:'Acesse sua conta'})).toBeVisible();
});
test('administrador consegue abrir dashboard quando há banco e seed',async({page})=>{
 test.skip(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD,'Configure seed e credenciais em .env');
 await page.goto('/login');await page.getByLabel('E-mail').fill(process.env.ADMIN_EMAIL!);await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();await expect(page.getByText('Uma escala mais justa.')).toBeVisible();
});

test('portal de consulta usa login separado e bloqueia operações da GP',async({page})=>{
 test.skip(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD,'Necessita conta admin na base de CI.');
 await page.goto('/login');
 await expect(page.getByRole('link',{name:/Entrar como membro/i})).toBeVisible();

 await page.getByLabel('E-mail ou usuário').fill(process.env.ADMIN_EMAIL!);
 await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();
 const creation=await page.request.post('/api/users',{
   data:{name:'Visitante Teste',username:'visitante_e2e',email:'',password:'ConsultaSuperSeguraE2E123!',role:'VIEWER',memberId:null},
 });
 expect(creation.status()).toBe(201);

 await page.context().clearCookies();
 await page.goto('/login');
 await page.getByRole('link',{name:/Entrar como membro/i}).click();
  await expect(page).toHaveURL(/login.membros/);
 await page.getByLabel('E-mail ou usuário').fill('visitante_e2e');
 await page.getByLabel('Senha').fill('ConsultaSuperSeguraE2E123!');
 await page.getByRole('button',{name:'Consultar escalas publicadas'}).click();
  await expect(page).toHaveURL(/publicadas$/);
 await expect(page.getByRole('heading',{name:'Escalas publicadas'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Criar evento|Publicar escala/})).toHaveCount(0);

 expect((await page.request.get('/api/users')).status()).toBe(403);
 expect((await page.request.post('/api/events',{data:{}})).status()).toBe(403);
 expect((await page.request.get('/api/events')).status()).toBe(403);
 const unpublished=await page.request.get('/api/publicadas/nao-existe/excel');
 expect(unpublished.status()).toBe(404);
 await page.goto('/eventos');
  await expect(page).toHaveURL(/publicadas$/);
});

test('cadastro de membros carrega diretorias e permite incluir uma nova', async ({page}) => {
 test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, 'Precisa da conta admin no banco de testes');
 await page.goto('/login');
 await page.getByLabel('E-mail ou usuário').fill(process.env.ADMIN_EMAIL!);
 await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar no BlueScale'}).click();
 await expect(page.getByText('Uma escala mais justa.')).toBeVisible();

 await page.goto('/membros');
 await page.getByRole('button',{name:'Novo membro'}).click();
 const select=page.getByLabel('Diretoria *');
 await expect(select).toBeVisible();
 await expect(select.locator('option')).not.toHaveCount(1);
 await expect(select.locator('option',{hasText:'Gestão de Pessoas'})).toHaveCount(1);

 await page.getByRole('button',{name:'Nova diretoria'}).click();
 await page.getByRole('textbox',{name:'Nome da nova diretoria'}).fill('Operações E2E');
 await page.getByRole('button',{name:'Adicionar',exact:true}).click();
 await expect(select.locator('option',{hasText:'Operações E2E'})).toHaveCount(1);
 await expect(select).not.toHaveValue('');
});
