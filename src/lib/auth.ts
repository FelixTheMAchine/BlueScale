import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { loginAllowed, loginFailed, loginSucceeded } from '@/lib/login-throttle';

export const authOptions: NextAuthOptions = {
  providers: [CredentialsProvider({
    name: 'Acesso BlueScale',
    credentials: {
      identifier: { label: 'E-mail ou usuário', type: 'text' },
      password: { label: 'Senha', type: 'password' },
      portal: { label: 'Área', type: 'text' },
    },
    async authorize(credentials) {
      const identifier = (credentials?.identifier || credentials?.email || '').trim().toLowerCase();
      const password = credentials?.password;
      const portal = credentials?.portal === 'members' ? 'members' : 'staff';
      if (!identifier || identifier.length > 254 || !password) return null;
      if (!await loginAllowed(identifier)) return null;

      const user = await prisma.user.findFirst({
        where: identifier.includes('@') ? { email: identifier } : { username: identifier },
      });

      // A área de membros aceita apenas VIEWER. VIEWER não autentica pelo painel de GP.
      // O controle de acesso é sempre reforçado pelo backend (requireRole e ensurePage).
      const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
      const portalMatches = !!user && (portal === 'members' ? user.role === 'VIEWER' : user.role !== 'VIEWER');
      if (!passwordMatches || !portalMatches) {
        await loginFailed(identifier);
        return null;
      }

      await loginSucceeded(identifier);
      return { id: user.id, name: user.name, email: user.email, role: user.role, memberId: user.memberId };
    },
  })],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: { signIn: '/login' },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.memberId = (user as { memberId?: string | null }).memberId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user = {
        ...session.user,
        id: String(token.id),
        role: String(token.role),
        memberId: token.memberId ? String(token.memberId) : null,
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
