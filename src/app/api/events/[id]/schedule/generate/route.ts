import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { STAFF, fail, ok, requireRole, HttpError, sameOrigin } from '@/lib/api';
import { solveSchedule } from '@/lib/scheduler/optimize';
import { loadInputs } from '@/lib/scheduler/load';
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){try{const u=await requireRole(STAFF);sameOrigin(req);const {id}=await context.params;
 const result=await prisma.$transaction(async tx=>{
  const {event,members,slots,rules}=await loadInputs(tx,id);
  if(!slots.length)throw new HttpError(400,'Cadastre ao menos um posto primeiro.');
  if(['COMPLETED','CANCELLED'].includes(event.status))throw new HttpError(409,'Evento não aceita escalas.');
  const existing=await tx.scheduleVersion.findFirst({where:{eventId:id,status:'DRAFT'},orderBy:{number:'desc'},include:{assignments:true}});
  const locked=existing?.assignments.filter(a=>a.locked).map(a=>({memberId:a.memberId,shiftId:a.shiftId,locked:true}))||[];
  const result=await solveSchedule(members,slots,rules,locked);
  const version=existing||await tx.scheduleVersion.create({data:{eventId:id,number:(await tx.scheduleVersion.aggregate({where:{eventId:id},_max:{number:true}}))._max.number!+1 || 1}});
  if(existing){await tx.shiftAssignment.deleteMany({where:{scheduleVersionId:version.id}});await tx.scheduleVersion.update({where:{id:version.id},data:{revision:{increment:1}}});}
  if(result.assignments.length)await tx.shiftAssignment.createMany({data:result.assignments.map(a=>({scheduleVersionId:version.id,memberId:a.memberId,shiftId:a.shiftId,locked:!!a.locked}))});
  await tx.scheduleGeneration.create({data:{eventId:id,scheduleVersionId:version.id,uncovered:result.uncovered as unknown as Prisma.InputJsonValue,algorithm:result.algorithm}});
  await tx.event.update({where:{id},data:{status:'GENERATED'}});
  await tx.auditLog.create({data:{actorId:u.id,action:'GENERATE',entity:'ScheduleVersion',entityId:version.id,details:{uncovered:result.uncovered.length}}});
  return {versionId:version.id,revision:version.revision+(existing?1:0),...result};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});return ok(result);
 }catch(e){return fail(e)}}
