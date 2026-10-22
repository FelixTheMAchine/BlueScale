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
