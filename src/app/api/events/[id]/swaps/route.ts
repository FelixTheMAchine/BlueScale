import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
const input=z.object({assignmentId:z.string(),targetId:z.string(),reason:z.string().trim().min(3).max(500)});
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const actor=await requireRole(['ADMIN','PEOPLE','EVENT_COORDINATOR','MEMBER']);const {id}=await params;await requireEventAccess(actor,id);
 return ok(await prisma.swapRequest.findMany({where:{assignment:{scheduleVersion:{eventId:id,status:'PUBLISHED'}},...(actor.role==='MEMBER'?{requesterId:actor.memberId||'__'}:{})},select:{id:true,status:true,createdAt:true,reason:true,requester:{select:{fullName:true}},target:{select:{fullName:true}},assignment:{select:{shift:{select:{startsAt:true,workstation:{select:{name:true}}}}}}},orderBy:{createdAt:'desc'},take:100}));}catch(e){return fail(e)}}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const actor=await requireRole(['ADMIN','PEOPLE','EVENT_COORDINATOR','MEMBER']);const {id}=await params;await requireEventAccess(actor,id);const data=input.parse(await jsonBody(req));
 const result=await prisma.$transaction(async tx=>{
  const a=await tx.shiftAssignment.findFirst({where:{id:data.assignmentId,scheduleVersion:{eventId:id,status:'PUBLISHED'}},include:{scheduleVersion:true}});
  if(!a)throw new HttpError(404,'Turno publicado não encontrado.');
  if(actor.memberId!==a.memberId)throw new HttpError(403,'Somente o escalado pode solicitar troca.');
  if(a.memberId===data.targetId)throw new HttpError(400,'Escolha outra pessoa.');
  const target=await tx.member.findUnique({where:{id:data.targetId}});if(!target||target.status!=='ACTIVE')throw new HttpError(400,'Substituto inválido.');
  const pending=await tx.swapRequest.findFirst({where:{assignmentId:a.id,status:'PENDING'}});if(pending)throw new HttpError(409,'Já há uma troca pendente neste turno.');
  const swap=await tx.swapRequest.create({data:{assignmentId:a.id,requesterId:a.memberId,targetId:data.targetId,reason:data.reason}});
  await tx.auditLog.create({data:{actorId:actor.id,action:'SWAP_REQUEST',entity:'SwapRequest',entityId:swap.id}});return {id:swap.id,status:swap.status};
 });return ok(result,201);
}catch(e){return fail(e)}}
