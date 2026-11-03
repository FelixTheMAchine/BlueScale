import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ALL, STAFF, fail, ok, requireRole, HttpError, jsonBody, sameOrigin } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
import { eventSchema } from '@/lib/schemas';
export async function GET(_req:Request,context:{params:Promise<{id:string}>}){try{const u=await requireRole(ALL);const {id}=await context.params;await requireEventAccess(u,id);
 const event=await prisma.event.findUnique({where:{id},include:{workstations:true,shifts:{include:{workstation:true,requirements:true},orderBy:{startsAt:'asc'}},availability:{select:{memberId:true,startAt:true,endAt:true,available:true}},schedules:{select:{id:true,status:true,number:true,revision:true},orderBy:{number:'desc'},take:5}}});
 if(!event) throw new HttpError(404,'Evento não encontrado');if(u.role==='MEMBER') return ok({...event,availability:event.availability.filter(a=>a.memberId===u.memberId),schedules:event.schedules.filter(a=>a.status==='PUBLISHED')});if(u.role==='EVENT_COORDINATOR')return ok({...event,availability:[]});return ok(event);
 }catch(e){return fail(e)}}

/** Edits that would invalidate existing slots or published assignments are blocked. */
export async function PATCH(req:NextRequest,context:{params:Promise<{id:string}>}){try{
 const actor=await requireRole(STAFF);const {id}=await context.params;
 const data=eventSchema.parse(await jsonBody(req));
 const current=await prisma.event.findUnique({where:{id},include:{_count:{select:{shifts:true,schedules:true}}}});
 if(!current)throw new HttpError(404,'Evento não encontrado.');
 if(current.status==='CANCELLED'||current.status==='COMPLETED')throw new HttpError(409,'Evento encerrado não pode ser editado.');
 const startsAt=new Date(data.startsAt),endsAt=new Date(data.endsAt);
 const timeChanged=+startsAt!==+current.startsAt||+endsAt!==+current.endsAt;
 if(timeChanged&&current._count.shifts)throw new HttpError(409,'Para alterar horários, remova os postos antes. Os turnos existentes não podem ser deslocados silenciosamente.');
 const rulesChanged=data.maxMinutesPerMember!==current.maxMinutesPerMember||data.maxShiftsPerMember!==current.maxShiftsPerMember||data.minRestMinutes!==current.minRestMinutes;
 if(rulesChanged&&current._count.schedules)throw new HttpError(409,'Não é possível alterar limites após a geração de escalas.');
 const updated=await prisma.event.update({where:{id},data:{name:data.name,description:data.description,location:data.location,startsAt,endsAt,maxMinutesPerMember:data.maxMinutesPerMember,maxShiftsPerMember:data.maxShiftsPerMember,minRestMinutes:data.minRestMinutes}});
 await prisma.auditLog.create({data:{actorId:actor.id,action:'UPDATE',entity:'Event',entityId:id}});
 return ok({id:updated.id});
}catch(e){return fail(e)}}

/** Unsheduled events can be deleted. Events with schedules are cancelled, preserving audit history. */
export async function DELETE(req:NextRequest,context:{params:Promise<{id:string}>}){try{
 const actor=await requireRole(STAFF);sameOrigin(req);const {id}=await context.params;
 const result=await prisma.$transaction(async tx=>{
  const existing=await tx.event.findUnique({where:{id},include:{_count:{select:{schedules:true}}}});
  if(!existing)throw new HttpError(404,'Evento não encontrado.');
  if(existing._count.schedules){
   await tx.event.update({where:{id},data:{status:'CANCELLED'}});
   await tx.auditLog.create({data:{actorId:actor.id,action:'CANCEL',entity:'Event',entityId:id}});
   return {removed:true,preservedHistory:true};
  }
  await tx.event.delete({where:{id}});
  await tx.auditLog.create({data:{actorId:actor.id,action:'DELETE',entity:'Event',entityId:id}});
  return {removed:true,preservedHistory:false};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 return ok(result);
}catch(e){return fail(e)}}
