import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  // NUNCA altera a senha de administradores existentes a cada reinicialização.
  const existingAdmin = await db.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  if (existingAdmin) {
    console.log('Bootstrap: administrador existente; nenhum dado alterado.');
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Defina ADMIN_EMAIL válido nas variáveis privadas do serviço.');
  }
  if (!password || password.length < 12 || password === 'INSIRA_SENHA_FORTE_AQUI_12+') {
    throw new Error('Defina ADMIN_PASSWORD segura (12 ou mais caracteres) nas variáveis privadas do serviço.');
  }
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new Error('Já existe um usuário com ADMIN_EMAIL sem perfil de administrador; configure outra conta.');
  }

  await db.user.create({
    data: {
      name: 'Administração BlueScale',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
    },
  });
  console.log('Bootstrap: conta inicial de administração criada; base sem dados fictícios.');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
