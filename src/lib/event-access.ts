import { prisma } from '@/lib/db';
import { HttpError, type Principal } from '@/lib/api';
import type { Prisma } from '@prisma/client';
/** Security boundary for event-scoped coordinator permissions. */
export async function requireEventAccess(user:Principal,eventId:string,mode:'read'|'operate'='read',tx:Prisma.TransactionClient|typeof prisma=prisma){
 if(user.role==='ADMIN'||user.role==='PEOPLE')return;
 if(user.role==='MEMBER'){
  if(mode==='operate')throw new HttpError(403,'Sem permissão para gerenciar este evento.');
  const event=await tx.event.findUnique({where:{id:eventId},select:{status:true}});
  if(!event||!['OPEN','GENERATED','PUBLISHED'].includes(event.status))throw new HttpError(403,'Evento indisponível para membros.');
  return;
 }
 if(user.role==='EVENT_COORDINATOR'){
  const assigned=await tx.eventCoordinator.findUnique({where:{eventId_userId:{eventId,userId:user.id}},select:{eventId:true}});
  if(!assigned)throw new HttpError(403,'Você não está designado para este evento.');
  return;
 }
 throw new HttpError(403,'Acesso negado.');
}
