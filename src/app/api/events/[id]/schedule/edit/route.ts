import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { STAFF, fail, ok, requireRole, HttpError, jsonBody } from '@/lib/api';
import { loadInputs } from '@/lib/scheduler/load';
import { validateSchedule } from '@/lib/scheduler/core';
const schema=z.object({versionId:z.string(),revision:z.number().int().min(0),operation:z.enum(['assign','unassign','lock','unlock']),memberId:z.string(),shiftId:z.string()});
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){try{const u=await requireRole(STAFF);const {id}=await context.params;const data=schema.parse(await jsonBody(req));
 const result=await prisma.$transaction(async tx=>{
  const version=await tx.scheduleVersion.findFirst({where:{id:data.versionId,eventId:id},include:{assignments:true}});
  if(!version)throw new HttpError(404,'Versão não encontrada');if(version.status!=='DRAFT')throw new HttpError(409,'Versão publicada é imutável.');
  if(version.revision!==data.revision)throw new HttpError(409,'Escala alterada por outra pessoa. Atualize antes de editar.');
  const {members,slots,rules}=await loadInputs(tx,id);
  if(!slots.some(s=>s.id===data.shiftId)||!members.some(m=>m.id===data.memberId))throw new HttpError(400,'Membro ou turno inválido');
  const current=version.assignments.map(a=>({memberId:a.memberId,shiftId:a.shiftId,locked:a.locked}));
  const i=current.findIndex(a=>a.memberId===data.memberId&&a.shiftId===data.shiftId);
  if(data.operation==='assign'){if(i>=0)throw new HttpError(409,'Atribuição já existe');current.push({memberId:data.memberId,shiftId:data.shiftId,locked:false});}
  if(data.operation==='unassign'){if(i<0)throw new HttpError(404,'Atribuição não existe');if(current[i].locked)throw new HttpError(409,'Destrave a atribuição antes de remover.');current.splice(i,1);}
  if(['lock','unlock'].includes(data.operation)){if(i<0)throw new HttpError(404,'Atribuição não existe');current[i].locked=data.operation==='lock';}
  const errors=validateSchedule(members,slots,rules,current);if(errors.length)throw new HttpError(409,errors.join('; '));
  const updated=await tx.scheduleVersion.updateMany({where:{id:version.id,revision:version.revision,status:'DRAFT'},data:{revision:{increment:1}}});
  if(updated.count!==1)throw new HttpError(409,'Edição concorrente. Atualize a página.');
  await tx.shiftAssignment.deleteMany({where:{scheduleVersionId:version.id}});
  if(current.length)await tx.shiftAssignment.createMany({data:current.map(a=>({...a,scheduleVersionId:version.id}))});
  await tx.auditLog.create({data:{actorId:u.id,action:data.operation.toUpperCase(),entity:'ScheduleVersion',entityId:version.id,details:{memberId:data.memberId,shiftId:data.shiftId}}});
  return {revision:version.revision+1,uncovered:slots.filter(s=>current.filter(a=>a.shiftId===s.id).length<s.minPeople).map(s=>({shiftId:s.id,station:s.station,needed:s.minPeople,assigned:current.filter(a=>a.shiftId===s.id).length}))};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});return ok(result);
 }catch(e){return fail(e)}}
