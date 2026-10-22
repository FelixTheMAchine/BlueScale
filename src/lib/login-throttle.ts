import crypto from 'node:crypto';
import { prisma } from './db';
/** 8 unsuccessful logins / 15 minute window, backed by shared DB across app instances. */
const WINDOW_MS=15*60_000, MAX_ATTEMPTS=8;
const keyFor=(email:string)=>crypto.createHmac('sha256',process.env.NEXTAUTH_SECRET||'').update(email).digest('hex');
export async function loginAllowed(email:string){
 const row=await prisma.loginThrottle.findUnique({where:{key:keyFor(email)}});
 return !row?.blockedUntil||row.blockedUntil.getTime()<=Date.now();
}
export async function loginFailed(email:string){
 const key=keyFor(email), now=new Date();const row=await prisma.loginThrottle.findUnique({where:{key}});
 if(!row||now.getTime()-row.windowStarted.getTime()>WINDOW_MS){
  await prisma.loginThrottle.upsert({where:{key},create:{key,attempts:1,windowStarted:now},update:{attempts:1,windowStarted:now,blockedUntil:null}});
 }else{
  const attempts=row.attempts+1;
  await prisma.loginThrottle.update({where:{key},data:{attempts,blockedUntil:attempts>=MAX_ATTEMPTS?new Date(now.getTime()+WINDOW_MS):row.blockedUntil}});
 }
}
export async function loginSucceeded(email:string){await prisma.loginThrottle.deleteMany({where:{key:keyFor(email)}});}
