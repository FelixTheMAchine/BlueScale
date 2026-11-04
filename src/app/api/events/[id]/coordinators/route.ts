import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { STAFF, fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';

type Context={params:Promise<{id:string}>};
const nomination=z.union([
 z.object({memberId:z.string().min(1)}).strict(),
 z.object({userId:z.string().min(1)}).strict(),
]);

// Both Gestão de Pessoas and administrators can choose the coordinator.
// Do not fetch /api/users here: that endpoint is intentionally ADMIN-only.
export async function GET(_req:NextRequest,{params}:Context){try{
 await requireRole(STAFF);const {id}=await params;
 const event=await prisma.event.findUnique({where:{id},select:{id:true}});
 if(!event)throw new HttpError(404,'Evento não encontrado.');
 const [members,accounts,candidates,loginCandidates]=await Promise.all([
  prisma.eventCoordinatorMember.findMany({
   where:{eventId:id},orderBy:{assignedAt:'asc'},
   select:{memberId:true,member:{select:{id:true,fullName:true,department:{select:{name:true}},user:{select:{id:true,role:true}}}}},
  }),
  prisma.eventCoordinator.findMany({
   where:{eventId:id},orderBy:{assignedAt:'asc'},
   select:{userId:true,user:{select:{id:true,name:true,memberId:true}}},
  }),
  prisma.member.findMany({
   where:{status:'ACTIVE'},orderBy:{fullName:'asc'},
   select:{id:true,fullName:true,department:{select:{name:true}},user:{select:{id:true,role:true}}},
  }),
  prisma.user.findMany({where:{role:'EVENT_COORDINATOR'},orderBy:{name:'asc'},select:{id:true,name:true,memberId:true}}),
 ]);
 return ok({members,accounts,candidates,loginCandidates});
}catch(e){return fail(e)}}

export async function POST(req:NextRequest,{params}:Context){try{
 const actor=await requireRole(STAFF);const {id}=await params;
 const choice=nomination.parse(await jsonBody(req));
 const result=await prisma.$transaction(async tx=>{
  const event=await tx.event.findUnique({where:{id},select:{status:true}});
  if(!event)throw new HttpError(404,'Evento não encontrado.');
  if(['CANCELLED','COMPLETED'].includes(event.status))throw new HttpError(409,'Evento encerrado; não é possível alterar coordenadores.');
  if('memberId' in choice){
   const member=await tx.member.findUnique({where:{id:choice.memberId},select:{id:true,status:true,user:{select:{id:true,role:true}}}});
   if(!member||member.status!=='ACTIVE')throw new HttpError(400,'Selecione um membro ativo da equipe.');
   await tx.eventCoordinatorMember.upsert({
    where:{eventId_memberId:{eventId:id,memberId:member.id}},
    update:{},create:{eventId:id,memberId:member.id},
   });
   // A nominated person with an actual coordinator login gets event-scoped
   // access. Nominating an ordinary member never silently elevates their role.
   const linkedCoordinator=member.user?.role==='EVENT_COORDINATOR'?member.user:null;
   if(linkedCoordinator)await tx.eventCoordinator.upsert({
    where:{eventId_userId:{eventId:id,userId:linkedCoordinator.id}},
    update:{},create:{eventId:id,userId:linkedCoordinator.id},
   });
   await tx.auditLog.create({data:{actorId:actor.id,action:'COORDINATOR_MEMBER_ADD',entity:'Event',entityId:id,details:{memberId:member.id}}});
   return {saved:true,accessGranted:Boolean(linkedCoordinator)};
  }
  const user=await tx.user.findUnique({where:{id:choice.userId},select:{id:true,role:true}});
  if(!user||user.role!=='EVENT_COORDINATOR')throw new HttpError(400,'Selecione uma conta com perfil Coordenador.');
  await tx.eventCoordinator.upsert({
   where:{eventId_userId:{eventId:id,userId:user.id}},update:{},create:{eventId:id,userId:user.id},
  });
  await tx.auditLog.create({data:{actorId:actor.id,action:'COORDINATOR_ADD',entity:'Event',entityId:id,details:{userId:user.id}}});
  return {saved:true,accessGranted:true};
 });
 return ok(result);
}catch(e){return fail(e)}}

export async function DELETE(req:NextRequest,{params}:Context){try{
 const actor=await requireRole(STAFF);const {id}=await params;
 const choice=nomination.parse(await jsonBody(req));
 await prisma.$transaction(async tx=>{
  const event=await tx.event.findUnique({where:{id},select:{status:true}});
  if(!event)throw new HttpError(404,'Evento não encontrado.');
  if(['CANCELLED','COMPLETED'].includes(event.status))throw new HttpError(409,'Evento encerrado; não é possível alterar coordenadores.');
  if('memberId' in choice){
   const member=await tx.member.findUnique({where:{id:choice.memberId},select:{user:{select:{id:true,role:true}}}});
   await tx.eventCoordinatorMember.deleteMany({where:{eventId:id,memberId:choice.memberId}});
   if(member?.user?.role==='EVENT_COORDINATOR')await tx.eventCoordinator.deleteMany({where:{eventId:id,userId:member.user.id}});
   await tx.auditLog.create({data:{actorId:actor.id,action:'COORDINATOR_MEMBER_REMOVE',entity:'Event',entityId:id,details:{memberId:choice.memberId}}});
  }else{
   await tx.eventCoordinator.deleteMany({where:{eventId:id,userId:choice.userId}});
   await tx.auditLog.create({data:{actorId:actor.id,action:'COORDINATOR_REMOVE',entity:'Event',entityId:id,details:{userId:choice.userId}}});
  }
 });
 return ok({removed:true});
}catch(e){return fail(e)}}
