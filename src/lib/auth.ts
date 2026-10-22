import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { loginAllowed, loginFailed, loginSucceeded } from '@/lib/login-throttle';
export const authOptions: NextAuthOptions = {
 providers: [CredentialsProvider({name:'Acesso BlueScale',credentials:{email:{label:'E-mail',type:'email'},password:{label:'Senha',type:'password'}},
 async authorize(credentials) {
  if (!credentials?.email || !credentials.password) return null;
  const email=credentials.email.trim().toLowerCase();
  if(!await loginAllowed(email))return null;
  const user=await prisma.user.findUnique({where:{email}});
  if (!user || !await bcrypt.compare(credentials.password,user.passwordHash)){await loginFailed(email);return null;}
  await loginSucceeded(email);
  return {id:user.id,name:user.name,email:user.email,role:user.role,memberId:user.memberId};
 }})],
 session:{strategy:'jwt',maxAge:60*60*8},
 pages:{signIn:'/login'},
 callbacks:{jwt:async({token,user})=>{if(user){token.id=user.id;token.role=(user as {role:string}).role;token.memberId=(user as {memberId?:string}).memberId;}return token;},
 session:async({session,token})=>{session.user={...session.user,id:String(token.id),role:String(token.role),memberId:token.memberId?String(token.memberId):null};return session;}},
 secret:process.env.NEXTAUTH_SECRET,
};
