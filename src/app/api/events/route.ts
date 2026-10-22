import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ALL, STAFF, fail, jsonBody, ok, requireRole } from '@/lib/api';
import { eventSchema } from '@/lib/schemas';
export async function GET(){try{const u=await requireRole(ALL);
 const where=u.role==='EVENT_COORDINATOR'?{coordinators:{some:{userId:u.id}}}:u.role==='MEMBER'?{status:{in:['OPEN','GENERATED','PUBLISHED'] as ('OPEN'|'GENERATED'|'PUBLISHED')[]}}:{};
 return ok(await prisma.event.findMany({where,orderBy:{startsAt:'desc'},take:60,include:{_count:{select:{workstations:true,shifts:true}}}}));}catch(e){return fail(e)}}
export async function POST(req:NextRequest){try{const u=await requireRole(STAFF);const data=eventSchema.parse(await jsonBody(req));
 const e=await prisma.event.create({data:{...data,startsAt:new Date(data.startsAt),endsAt:new Date(data.endsAt),status:'OPEN'}});
 await prisma.auditLog.create({data:{actorId:u.id,action:'CREATE',entity:'Event',entityId:e.id}});return ok({id:e.id},201);
 }catch(e){return fail(e)}}
