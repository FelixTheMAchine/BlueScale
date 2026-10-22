import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{
 const actor=await requireRole(['ADMIN','PEOPLE','EVENT_COORDINATOR','MEMBER']);const {id}=await params;
 const {status,reason}=z.object({status:z.enum(['CONFIRMED','DECLINED']),reason:z.string().trim().max(500).optional()}).parse(await jsonBody(req));
 if(status==='DECLINED'&&!reason)throw new HttpError(400,'Explique brevemente a recusa.');
 const assignment=await prisma.shiftAssignment.findUnique({where:{id},include:{scheduleVersion:{select:{status:true,eventId:true}},confirmation:true}});
 if(!assignment||assignment.scheduleVersion.status!=='PUBLISHED')throw new HttpError(404,'Turno publicado não encontrado.');
 if(actor.memberId!==assignment.memberId)throw new HttpError(403,'Somente a pessoa escalada pode confirmar ou recusar seu turno.');
 const result=await prisma.$transaction(async tx=>{
  const active=await tx.shiftAssignment.findUnique({where:{id},include:{scheduleVersion:true}});
  if(!active||active.scheduleVersion.status!=='PUBLISHED')throw new HttpError(409,'A escala foi alterada. Atualize a tela.');
  await tx.confirmation.upsert({where:{assignmentId:id},create:{assignmentId:id,memberId:actor.memberId!,status,reason:status==='DECLINED'?reason:null},update:{status,reason:status==='DECLINED'?reason:null}});
  await tx.auditLog.create({data:{actorId:actor.id,action:status,entity:'ShiftAssignment',entityId:id}});
  return {saved:true,status};
 });return ok(result);
}catch(e){return fail(e)}}
