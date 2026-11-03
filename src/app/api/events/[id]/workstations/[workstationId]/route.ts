import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { STAFF, fail, HttpError, jsonBody, ok, requireRole, sameOrigin } from '@/lib/api';
import { workstationSchema } from '@/lib/schemas';

type Context={params:Promise<{id:string;workstationId:string}>};

export async function PATCH(req:NextRequest,{params}:Context){try{
 const actor=await requireRole(STAFF);
 const {id,workstationId}=await params;
 const input=await jsonBody(req);
 const result=await prisma.$transaction(async tx=>{
  const current=await tx.workstation.findFirst({where:{id:workstationId,eventId:id},include:{event:{select:{status:true}},shifts:{include:{requirements:true},orderBy:{startsAt:'asc'}}}});
  if(!current)throw new HttpError(404,'Posto não encontrado.');
  if(['COMPLETED','CANCELLED'].includes(current.event.status))throw new HttpError(409,'Evento encerrado; postos bloqueados.');
  const previousSkills=current.shifts[0]?.requirements.map(r=>r.skillId)||[];
  const data=workstationSchema.parse({
   name:input.name??current.name,description:input.description??current.description??undefined,
   minPeople:input.minPeople??current.minPeople,idealPeople:input.idealPeople??current.idealPeople,
   slotMinutes:input.slotMinutes??current.slotMinutes,priority:input.priority??current.priority,
   skillIds:input.skillIds??previousSkills
  });
  const skillChanged=data.skillIds.length!==previousSkills.length||data.skillIds.some(s=>!previousSkills.includes(s));
  // Changing headcount does not change shift identities, times or assignments.
  // Only duration/skill changes invalidate existing schedules and stay locked.
  const demandChanged=data.minPeople!==current.minPeople||data.idealPeople!==current.idealPeople;
  const structural=data.slotMinutes!==current.slotMinutes||skillChanged;
  const scheduleCount=await tx.scheduleVersion.count({where:{eventId:id}});
  if(structural&&(scheduleCount||current.event.status==='PUBLISHED'))throw new HttpError(409,'Já existe escala para este evento. Duração do turno e habilitações não podem ser alteradas sem recriar os turnos. Mínimo e ideal podem ser editados livremente.');
  if(current.event.status==='PUBLISHED'&&data.priority!==current.priority)throw new HttpError(409,'Prioridade bloqueada após publicação.');
  const totalMinutes=(current.endsAt.getTime()-current.startsAt.getTime())/60000;
  if(Math.ceil(totalMinutes/data.slotMinutes)>200)throw new HttpError(400,'Máximo de 200 turnos por posto.');
  await tx.workstation.update({where:{id:workstationId},data:{name:data.name,description:data.description,minPeople:data.minPeople,idealPeople:data.idealPeople,slotMinutes:data.slotMinutes,priority:data.priority}});
  if(data.slotMinutes!==current.slotMinutes){
   await tx.shift.deleteMany({where:{workstationId}});
   const slots=[] as {eventId:string;workstationId:string;startsAt:Date;endsAt:Date;minPeople:number;idealPeople:number}[];
   for(let t=current.startsAt.getTime();t<current.endsAt.getTime();t+=data.slotMinutes*60000){
    slots.push({eventId:id,workstationId,startsAt:new Date(t),endsAt:new Date(Math.min(t+data.slotMinutes*60000,current.endsAt.getTime())),minPeople:data.minPeople,idealPeople:data.idealPeople});
   }
   for(const slot of slots){const shift=await tx.shift.create({data:slot});if(data.skillIds.length)await tx.shiftRequirement.createMany({data:data.skillIds.map(skillId=>({shiftId:shift.id,skillId}))});}
  }else{
   await tx.shift.updateMany({where:{workstationId},data:{minPeople:data.minPeople,idealPeople:data.idealPeople}});
   if(skillChanged){
    await tx.shiftRequirement.deleteMany({where:{shift:{workstationId}}});
    const shifts=await tx.shift.findMany({where:{workstationId},select:{id:true}});
    if(shifts.length&&data.skillIds.length)await tx.shiftRequirement.createMany({data:shifts.flatMap(s=>data.skillIds.map(skillId=>({shiftId:s.id,skillId})))});
   }
  }
  let warning:string|undefined;
  let uncoveredShifts:number|undefined;
  let overIdealShifts:number|undefined;
  if(demandChanged&&scheduleCount){
   // Keep published attendance, confirmations and allocations. Revalidate the
   // latest schedule's coverage so GP knows what still needs staffing.
   const latest=await tx.scheduleVersion.findFirst({
    where:{eventId:id,...(current.event.status==='PUBLISHED'?{status:'PUBLISHED' as const}:{})},
    orderBy:{number:'desc'},select:{id:true,status:true}
   });
   if(latest){
    const counts=await tx.shiftAssignment.groupBy({
     by:['shiftId'],where:{scheduleVersionId:latest.id,shiftId:{in:current.shifts.map(shift=>shift.id)}},
     _count:{_all:true}
    });
    const assigned=new Map(counts.map(count=>[count.shiftId,count._count._all]));
    uncoveredShifts=current.shifts.filter(shift=>(assigned.get(shift.id)||0)<data.minPeople).length;
    overIdealShifts=current.shifts.filter(shift=>(assigned.get(shift.id)||0)>data.idealPeople).length;
    warning=uncoveredShifts||overIdealShifts
     ? `Demanda salva. ${uncoveredShifts} turno(s) abaixo do mínimo e ${overIdealShifts} acima do ideal. Nenhuma pessoa foi retirada ou adicionada; revise a escala e, se necessário, gere e publique uma nova versão.`
     : 'Demanda salva. A escala existente e as pessoas atribuídas foram preservadas; confira a cobertura.';
   }
   // Concurrent editors must reload before saving changes to a draft.
   await tx.scheduleVersion.updateMany({where:{eventId:id,status:'DRAFT'},data:{revision:{increment:1}}});
  }
  await tx.auditLog.create({data:{actorId:actor.id,action:'UPDATE',entity:'Workstation',entityId:workstationId,details:{demandChanged,minPeople:data.minPeople,idealPeople:data.idealPeople,uncoveredShifts:uncoveredShifts??null,overIdealShifts:overIdealShifts??null}}});
  return {id:workstationId,warning,uncoveredShifts,overIdealShifts};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 return ok(result);
}catch(e){return fail(e)}}

export async function DELETE(req:NextRequest,{params}:Context){try{
 const actor=await requireRole(STAFF);sameOrigin(req);const {id,workstationId}=await params;
 await prisma.$transaction(async tx=>{
  const current=await tx.workstation.findFirst({where:{id:workstationId,eventId:id},include:{event:{select:{status:true}}}});
  if(!current)throw new HttpError(404,'Posto não encontrado.');
  if(['PUBLISHED','COMPLETED','CANCELLED'].includes(current.event.status))throw new HttpError(409,'Não é possível excluir postos de um evento publicado ou encerrado.');
  const schedules=await tx.scheduleVersion.count({where:{eventId:id}});
  if(schedules)throw new HttpError(409,'Este evento já possui uma escala gerada. Excluir o posto apagaria referências de turnos; crie outro evento para mudanças estruturais.');
  await tx.workstation.delete({where:{id:workstationId}});
  await tx.auditLog.create({data:{actorId:actor.id,action:'DELETE',entity:'Workstation',entityId:workstationId}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 return ok({removed:true});
}catch(e){return fail(e)}}
