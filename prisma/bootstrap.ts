import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const RESERVED_EMAIL = 'admin@accounts.bluescale.invalid';

async function main() {
  const existingAdmin = await db.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (!existingAdmin) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Configure ADMIN_EMAIL válido para a primeira conta.');
    }
    if (!password || password.length < 12) throw new Error('Configure ADMIN_PASSWORD (12+ caracteres).');
    await db.user.create({
      data: { name: 'Administração BlueScale', email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' },
    });
    console.log('Bootstrap: primeira conta administrativa criada.');
  } else {
    console.log('Bootstrap: administrador existente mantido.');
  }

  // Catálogo real de diretorias; cadastro inicial sem membros, eventos ou escalas fictícios.
  // Só preenche se nenhuma diretoria foi configurada. Não altera catálogos já existentes.
  if ((await db.department.count()) === 0) {
    const defaultDepartments = [
      'Gestão de Pessoas',
      'Eventos',
      'Financeiro',
      'Publicidade',
      'E-sports',
      'DGE',
      'Presidência',
    ];
    for (const name of defaultDepartments) {
      await db.department.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    console.log('Bootstrap: catálogo inicial de diretorias disponível; nenhum membro fictício criado.');
  } else {
    console.log('Bootstrap: diretorias existentes preservadas.');
  }

  // Novo administrador universal. Gerado uma única vez e nunca redefine senha
  // em reinicializações posteriores. Variável temporária deve ser apagada depois.
  const universalPassword = process.env.UNIVERSAL_ADMIN_PASSWORD;
  if (universalPassword) {
    if (universalPassword.length < 16 || universalPassword.length > 128) {
      throw new Error('UNIVERSAL_ADMIN_PASSWORD exige 16 a 128 caracteres.');
    }
    const existing = await db.user.findFirst({
      where: { OR: [{ username: 'admin' }, { email: RESERVED_EMAIL }] },
      select: { username: true, role: true },
    });
    if (!existing) {
      await db.user.create({
        data: {
          name: 'Administrador Universal',
          email: RESERVED_EMAIL,
          username: 'admin',
          passwordHash: await bcrypt.hash(universalPassword, 12),
          role: 'ADMIN',
        },
      });
      console.log('Bootstrap: login admin criado com permissão universal; nenhuma conta anterior foi alterada.');
    } else if (existing.username === 'admin' && existing.role === 'ADMIN') {
      console.log('Bootstrap: login admin já existe; senha preservada.');
    } else {
      throw new Error('Identificador admin reservado já está sendo usado por outra conta.');
    }
  }
  // Conta de consulta exclusiva: sem acesso à GP, rascunhos ou ações de escrita.
  // Provisionada uma única vez, depois a variável pode ser desativada.
  const viewerSecret = process.env.INITIAL_VIEWER_PASSWORD;
  if (process.env.ENABLE_INITIAL_VIEWER === 'true') {
    if (!viewerSecret || viewerSecret.length < 16 || viewerSecret.length > 128) {
      throw new Error('INITIAL_VIEWER_PASSWORD deve ter 16 a 128 caracteres.');
    }
    const viewerEmail = 'consulta@accounts.bluescale.invalid';
    const existingViewer = await db.user.findFirst({
      where: { OR: [{ username: 'consulta' }, { email: viewerEmail }] },
      select: { username: true, role: true },
    });
    if (!existingViewer) {
      await db.user.create({
        data: {
          name: 'Consulta BlueScale',
          username: 'consulta',
          email: viewerEmail,
          role: 'VIEWER',
          passwordHash: await bcrypt.hash(viewerSecret, 12),
        },
      });
      console.log('Bootstrap: conta consulta (somente leitura) criada.');
    } else if (existingViewer.username === 'consulta' && existingViewer.role === 'VIEWER') {
      console.log('Bootstrap: conta consulta já existe; senha mantida.');
    } else {
      throw new Error('Identificador consulta reservado já existe com papel incorreto.');
    }
  }

}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
