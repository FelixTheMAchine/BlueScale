import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { STAFF, fail, HttpError, ok, requireRole, sameOrigin } from '@/lib/api';

// Editing a published schedule creates a new DRAFT. Published attendance,
// confirmations and assignments must never be mutated by editing the draft.
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{
 const actor=await requireRole(STAFF);sameOrigin(req);
 const {id}=await params;
 const result=await prisma.$transaction(async tx=>{
  const event=await tx.event.findUnique({where:{id},select:{status:true}});
  if(!event)throw new HttpError(404,'Evento não encontrado.');
  if(['CANCELLED','COMPLETED'].includes(event.status))throw new HttpError(409,'Evento encerrado. Não é possível editar a escala.');
  const draft=await tx.scheduleVersion.findFirst({where:{eventId:id,status:'DRAFT'},orderBy:{number:'desc'},select:{id:true,number:true,revision:true}});
  if(draft)return {id:draft.id,number:draft.number,revision:draft.revision,existing:true};
  const published=await tx.scheduleVersion.findFirst({where:{eventId:id,status:'PUBLISHED'},orderBy:{number:'desc'},include:{assignments:{where:{shift:{workstation:{archivedAt:null}}}}}});
  if(!published)throw new HttpError(409,'Publique uma escala antes de criar uma revisão.');
  const nextNumber=(await tx.scheduleVersion.aggregate({where:{eventId:id},_max:{number:true}}))._max.number!+1;
  const next=await tx.scheduleVersion.create({data:{eventId:id,number:nextNumber,status:'DRAFT'}});
  if(published.assignments.length){
   await tx.shiftAssignment.createMany({data:published.assignments.map(a=>({
    scheduleVersionId:next.id,memberId:a.memberId,shiftId:a.shiftId,locked:a.locked
   }))});
  }
  await tx.auditLog.create({data:{actorId:actor.id,action:'START_EDIT',entity:'ScheduleVersion',entityId:next.id,details:{sourcePublishedVersionId:published.id,assignments:published.assignments.length}}});
  return {id:next.id,number:next.number,revision:next.revision,existing:false};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 return ok(result);
}catch(e){return fail(e)}}
