import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ALL, fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
export async function GET(){try{const actor=await requireRole(ALL);if(!actor.memberId)throw new HttpError(404,'Conta sem perfil de membro vinculado.');return ok(await prisma.member.findUnique({where:{id:actor.memberId},select:{commute:true,commuteMin:true,preference:{select:{preferredPeriod:true,enjoyAfterShift:true}}}}));}catch(e){return fail(e)}}
export async function POST(req:NextRequest){try{const actor=await requireRole(ALL);if(!actor.memberId)throw new HttpError(404,'Conta sem perfil de membro vinculado.');
 const data=z.object({preferredPeriod:z.enum(['EARLY','MIDDLE','LATE','ANY']),enjoyAfterShift:z.boolean(),commute:z.enum(['NEAR','MEDIUM','FAR']).nullable(),commuteMin:z.number().int().min(0).max(480).nullable()}).parse(await jsonBody(req));
 await prisma.$transaction(async tx=>{await tx.member.update({where:{id:actor.memberId!},data:{commute:data.commute,commuteMin:data.commuteMin}});
  await tx.memberPreference.upsert({where:{memberId:actor.memberId!},create:{memberId:actor.memberId!,preferredPeriod:data.preferredPeriod,enjoyAfterShift:data.enjoyAfterShift},update:{preferredPeriod:data.preferredPeriod,enjoyAfterShift:data.enjoyAfterShift}});
  await tx.auditLog.create({data:{actorId:actor.id,action:'PREFERENCES_UPDATE',entity:'Member',entityId:actor.memberId!}});});return ok({saved:true});
}catch(e){return fail(e)}}
