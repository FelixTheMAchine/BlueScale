import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { STAFF, fail, ok, requireRole, HttpError, jsonBody } from '@/lib/api';
import { loadInputs } from '@/lib/scheduler/load';
import { validateSchedule } from '@/lib/scheduler/core';
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){try{const u=await requireRole(STAFF);const {id}=await context.params;const {versionId,revision,acceptIncomplete}=z.object({versionId:z.string(),revision:z.number().int(),acceptIncomplete:z.boolean().default(false)}).parse(await jsonBody(req));
 const result=await prisma.$transaction(async tx=>{
  const v=await tx.scheduleVersion.findFirst({where:{id:versionId,eventId:id,status:'DRAFT'},include:{assignments:true}});
  if(!v)throw new HttpError(409,'A escala não é mais um rascunho');if(v.revision!==revision)throw new HttpError(409,'Versão desatualizada.');
  const {members,slots,rules}=await loadInputs(tx,id);const assigned=v.assignments.map(a=>({memberId:a.memberId,shiftId:a.shiftId}));
  const errors=validateSchedule(members,slots,rules,assigned);if(errors.length)throw new HttpError(409,errors.join('; '));
  const uncovered=slots.filter(s=>assigned.filter(a=>a.shiftId===s.id).length<s.minPeople);
  if(uncovered.length&&!acceptIncomplete)throw new HttpError(409,`Existem ${uncovered.length} turnos descobertos. Publicação exige confirmação explícita.`);
  await tx.scheduleVersion.updateMany({where:{eventId:id,status:'PUBLISHED'},data:{status:'ARCHIVED'}});
  const updated=await tx.scheduleVersion.updateMany({where:{id:v.id,revision},data:{status:'PUBLISHED',publishedAt:new Date(),revision:{increment:1}}});
  if(updated.count!==1)throw new HttpError(409,'Conflito de publicação.');
  await tx.event.update({where:{id},data:{status:'PUBLISHED'}});
  await tx.auditLog.create({data:{actorId:u.id,action:'PUBLISH',entity:'ScheduleVersion',entityId:v.id,details:{uncovered:uncovered.length}}});
  return {published:true,uncovered:uncovered.length};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});return ok(result);
 }catch(e){return fail(e)}}
