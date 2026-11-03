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
  const structural=data.minPeople!==current.minPeople||data.idealPeople!==current.idealPeople||data.slotMinutes!==current.slotMinutes||skillChanged;
  const scheduleCount=await tx.scheduleVersion.count({where:{eventId:id}});
  if(structural&&(scheduleCount||current.event.status==='PUBLISHED'))throw new HttpError(409,'Já existe escala para este evento. Renomeie o posto ou crie um novo evento para mudar turnos, equipe mínima ou habilitações.');
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
  await tx.auditLog.create({data:{actorId:actor.id,action:'UPDATE',entity:'Workstation',entityId:workstationId}});
  return {id:workstationId};
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
