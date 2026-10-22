import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { STAFF, fail, jsonBody, ok, requireRole, HttpError } from '@/lib/api';
import { memberSchema } from '@/lib/schemas';
export async function PATCH(req:NextRequest,context:{params:Promise<{id:string}>}){try{const u=await requireRole(STAFF);const {id}=await context.params;const data=memberSchema.partial().parse(await jsonBody(req));
 const current=await prisma.member.findUnique({where:{id}});if(!current) throw new HttpError(404,'Membro não encontrado');
 const member=await prisma.member.update({where:{id},data:{...Object.fromEntries(Object.entries(data).filter(([k])=>!['preferredPeriod','skillIds'].includes(k))),
 ...(data.preferredPeriod?{preference:{upsert:{create:{preferredPeriod:data.preferredPeriod},update:{preferredPeriod:data.preferredPeriod}}}}:{}),
 ...(data.skillIds?{skills:{deleteMany:{},create:data.skillIds.map(skillId=>({skillId}))}}:{})}});
 await prisma.auditLog.create({data:{actorId:u.id,action:'UPDATE',entity:'Member',entityId:id}});return ok({id:member.id});
 }catch(e){return fail(e)}}
