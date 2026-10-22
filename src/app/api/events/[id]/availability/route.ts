import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { fail, ok, requireRole, verifyMember, jsonBody, HttpError } from '@/lib/api';
import { availabilitySchema } from '@/lib/schemas';
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){try{const u=await requireRole(['ADMIN','PEOPLE','MEMBER']);const {id}=await context.params;const data=availabilitySchema.parse(await jsonBody(req));verifyMember(u,data.memberId);
 const event=await prisma.event.findUnique({where:{id}});if(!event)throw new HttpError(404,'Evento não encontrado');
 if(['PUBLISHED','COMPLETED','CANCELLED'].includes(event.status))throw new HttpError(409,'Coleta de disponibilidade encerrada.');
 const start=new Date(data.startAt),end=new Date(data.endAt);if(start<event.startsAt||end>event.endsAt)throw new HttpError(400,'Disponibilidade precisa estar dentro do evento.');
 // Cada envio substitui a disponibilidade do membro neste evento (operações atômicas).
 await prisma.$transaction(async tx=>{await tx.memberAvailability.deleteMany({where:{memberId:data.memberId,eventId:id}});await tx.memberAvailability.create({data:{memberId:data.memberId,eventId:id,startAt:start,endAt:end,available:data.available}});
  await tx.auditLog.create({data:{actorId:u.id,action:'AVAILABILITY',entity:'Event',entityId:id}});});return ok({saved:true});
 }catch(e){return fail(e)}}
