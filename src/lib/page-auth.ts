import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
export async function ensurePage(roles?:string[]) {const s=await getServerSession(authOptions);if(!s?.user)redirect('/login');if(roles&&!roles.includes(s.user.role))redirect('/');return s.user}
