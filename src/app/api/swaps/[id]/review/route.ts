import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
import { loadInputs } from '@/lib/scheduler/load';
import { validateSchedule } from '@/lib/scheduler/core';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{
 const actor=await requireRole(['ADMIN','PEOPLE','EVENT_COORDINATOR']);const {id}=await params;
 const {decision,revision}=z.object({decision:z.enum(['APPROVED','REJECTED']),revision:z.number().int().nonnegative()}).parse(await jsonBody(req));
 const result=await prisma.$transaction(async tx=>{
  const swap=await tx.swapRequest.findUnique({where:{id},include:{assignment:{include:{scheduleVersion:{include:{assignments:true}}}}}});
  if(!swap||swap.status!=='PENDING')throw new HttpError(409,'Pedido inexistente ou já analisado.');
  const version=swap.assignment.scheduleVersion;
  await requireEventAccess(actor,version.eventId,'operate',tx);
  if(version.status!=='PUBLISHED')throw new HttpError(409,'A escala não está mais publicada.');
  if(version.revision!==revision)throw new HttpError(409,'Escala alterada em outro aparelho. Atualize e tente novamente.');
  if(decision==='APPROVED'){
   if(!swap.targetId)throw new HttpError(400,'Escolha um substituto para aprovação.');
   const {members,slots,rules}=await loadInputs(tx,version.eventId);
   const proposed=version.assignments.filter(a=>a.id!==swap.assignmentId).map(a=>({memberId:a.memberId,shiftId:a.shiftId}));
   proposed.push({memberId:swap.targetId,shiftId:swap.assignment.shiftId});
   const errors=validateSchedule(members,slots,rules,proposed);
   if(errors.length)throw new HttpError(409,`Troca inviável: ${errors.join('; ')}`);
   const changed=await tx.scheduleVersion.updateMany({where:{id:version.id,revision:version.revision,status:'PUBLISHED'},data:{revision:{increment:1}}});
   if(changed.count!==1)throw new HttpError(409,'Conflito entre edições. Atualize.');
   // Não reusar a confirmação de outra pessoa e invalidar solicitações antigas.
   await tx.swapRequest.updateMany({where:{assignmentId:swap.assignmentId,status:'PENDING',id:{not:id}},data:{status:'CANCELLED'}});
   await tx.confirmation.deleteMany({where:{assignmentId:swap.assignmentId}});
   await tx.attendance.deleteMany({where:{assignmentId:swap.assignmentId}});
   await tx.shiftAssignment.update({where:{id:swap.assignmentId},data:{memberId:swap.targetId,locked:false}});
  }
  await tx.swapRequest.update({where:{id},data:{status:decision}});
  await tx.auditLog.create({data:{actorId:actor.id,action:'SWAP_'+decision,entity:'SwapRequest',entityId:id,details:{versionId:version.id,from:swap.requesterId,to:decision==='APPROVED'?swap.targetId:null}}});
  return {status:decision,revision:version.revision+(decision==='APPROVED'?1:0)};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});return ok(result);
}catch(e){return fail(e)}}
