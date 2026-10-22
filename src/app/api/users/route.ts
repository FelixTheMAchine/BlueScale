import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';

const username = z.string().trim().regex(/^[A-Za-z][A-Za-z0-9._-]{2,29}$/, 'Usuário: 3 a 30 caracteres, começando por letra.').transform(x => x.toLowerCase());
const create = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.union([z.email(), z.literal('')]).optional(),
  username: z.union([username, z.literal('')]).optional(),
  role: z.enum(['ADMIN', 'PEOPLE', 'EVENT_COORDINATOR', 'MEMBER', 'VIEWER']),
  memberId: z.string().nullable().optional(),
  password: z.string().min(12).max(128),
}).strict().refine(x => !!x.email || !!x.username, { message: 'Informe e-mail ou nome de usuário.' });

const INTERNAL_DOMAIN = '@accounts.bluescale.invalid';

export async function GET() {
  try {
    await requireRole(['ADMIN']);
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, username: true, role: true, memberId: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    return ok(users.map(u => ({ ...u, email: u.email.endsWith(INTERNAL_DOMAIN) ? null : u.email })));
  } catch (e) { return fail(e); }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole(['ADMIN']);
    const data = create.parse(await jsonBody(req));
    if (data.role === 'MEMBER' && !data.memberId) throw new HttpError(400, 'Vincule o login de um membro a seu cadastro.');
    if (data.role === 'VIEWER' && data.memberId) throw new HttpError(400, 'A conta de consulta é independente e somente leitura.');

    if (data.memberId) {
      const member = await prisma.member.findUnique({ where: { id: data.memberId } });
      if (!member || member.status !== 'ACTIVE') throw new HttpError(400, 'Membro não encontrado ou inativo.');
    }

    const loginName = data.username || null;
    const mail = data.email?.trim().toLowerCase() || (loginName ? loginName + INTERNAL_DOMAIN : '');
    if (!mail || (data.email && mail.endsWith(INTERNAL_DOMAIN))) throw new HttpError(400, 'E-mail reservado para o sistema.');
    const hash = await bcrypt.hash(data.password, 12);
    const user = await prisma.$transaction(async tx => {
      const u = await tx.user.create({
        data: { name: data.name, email: mail, username: loginName, role: data.role, memberId: data.memberId || null, passwordHash: hash },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'USER_CREATE', entity: 'User', entityId: u.id, details: { role: u.role, username: u.username } } });
      return { id: u.id, username: u.username, email: data.email || null, role: u.role };
    });
    return ok(user, 201);
  } catch (e) { return fail(e); }
}
