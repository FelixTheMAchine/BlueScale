import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import { prisma } from './db';

/** Autorização no servidor com papel atual do banco, nunca só papel obsoleto do JWT. */
export async function ensurePage(roles?: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, username: true, role: true, memberId: true },
  });
  if (!user) redirect('/login');

  if (user.role === 'VIEWER' && !roles?.includes('VIEWER')) redirect('/publicadas');
  if (roles && !roles.includes(user.role)) redirect(user.role === 'VIEWER' ? '/publicadas' : '/');
  return user;
}
