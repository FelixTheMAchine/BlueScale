import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { STAFF, fail, ok, requireRole, jsonBody, HttpError } from '@/lib/api';
import { workstationSchema } from '@/lib/schemas';
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){try{const u=await requireRole(STAFF);const {id}=await context.params;const data=workstationSchema.parse(await jsonBody(req));
 const event=await prisma.event.findUnique({where:{id}});if(!event) throw new HttpError(404,'Evento não encontrado');
 if(event.status==='PUBLISHED'||event.status==='COMPLETED'||event.status==='CANCELLED') throw new HttpError(409,'Evento bloqueado para novos postos.');
 const ws=await prisma.$transaction(async tx=>{
  if((event.endsAt.getTime()-event.startsAt.getTime())/(data.slotMinutes*60000)>200) throw new HttpError(400,'Máximo de 200 turnos por posto.');
  const w=await tx.workstation.create({data:{eventId:id,name:data.name,description:data.description,minPeople:data.minPeople,idealPeople:data.idealPeople,slotMinutes:data.slotMinutes,priority:data.priority,startsAt:event.startsAt,endsAt:event.endsAt}});
  const slots:{eventId:string;workstationId:string;startsAt:Date;endsAt:Date;minPeople:number;idealPeople:number}[]=[];
  for(let t=event.startsAt.getTime();t<event.endsAt.getTime();t+=data.slotMinutes*60000){slots.push({eventId:id,workstationId:w.id,startsAt:new Date(t),endsAt:new Date(Math.min(t+data.slotMinutes*60000,event.endsAt.getTime())),minPeople:data.minPeople,idealPeople:data.idealPeople});}
  for (const s of slots){const shift=await tx.shift.create({data:s});if(data.skillIds.length) await tx.shiftRequirement.createMany({data:data.skillIds.map(skillId=>({shiftId:shift.id,skillId}))});}
  await tx.auditLog.create({data:{actorId:u.id,action:'CREATE',entity:'Workstation',entityId:w.id}});
  return w;
 });return ok({id:ws.id,shiftsCreated:Math.ceil((event.endsAt.getTime()-event.startsAt.getTime())/(data.slotMinutes*60000))},201);
 }catch(e){return fail(e)}}
