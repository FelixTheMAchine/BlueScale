import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{
 const actor=await requireRole(['ADMIN','PEOPLE','EVENT_COORDINATOR']);const {id}=await params;
 const {status}=z.object({status:z.enum(['PRESENT','ABSENT','LATE'])}).parse(await jsonBody(req));
 const assignment=await prisma.shiftAssignment.findUnique({where:{id},include:{scheduleVersion:{select:{eventId:true,status:true}}}});
 if(!assignment||assignment.scheduleVersion.status!=='PUBLISHED')throw new HttpError(404,'Atribuição publicada não encontrada.');
 await requireEventAccess(actor,assignment.scheduleVersion.eventId,'operate');
 await prisma.$transaction(async tx=>{await tx.attendance.upsert({where:{assignmentId:id},create:{assignmentId:id,memberId:assignment.memberId,status},update:{status,recordedAt:new Date()}});await tx.auditLog.create({data:{actorId:actor.id,action:'ATTENDANCE_'+status,entity:'ShiftAssignment',entityId:id}})});
 return ok({saved:true,status});
}catch(e){return fail(e)}}
