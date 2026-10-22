import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){try{await requireRole(['ADMIN','PEOPLE']);const {id}=await params;return ok(await prisma.eventCoordinator.findMany({where:{eventId:id},include:{user:{select:{id:true,name:true,email:true}}}}));}catch(e){return fail(e)}}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const actor=await requireRole(['ADMIN','PEOPLE']);const {id}=await params;const {userId}=z.object({userId:z.string()}).parse(await jsonBody(req));
 const [event,user]=await Promise.all([prisma.event.findUnique({where:{id}}),prisma.user.findUnique({where:{id:userId}})]);
 if(!event||!user||user.role!=='EVENT_COORDINATOR')throw new HttpError(400,'Evento ou coordenador inválido.');
 await prisma.$transaction(async tx=>{await tx.eventCoordinator.upsert({where:{eventId_userId:{eventId:id,userId}},update:{},create:{eventId:id,userId}});await tx.auditLog.create({data:{actorId:actor.id,action:'COORDINATOR_ADD',entity:'Event',entityId:id,details:{userId}}});});return ok({saved:true});
 }catch(e){return fail(e)}}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const actor=await requireRole(['ADMIN','PEOPLE']);const {id}=await params;const {userId}=z.object({userId:z.string()}).parse(await jsonBody(req));await prisma.$transaction(async tx=>{await tx.eventCoordinator.deleteMany({where:{eventId:id,userId}});await tx.auditLog.create({data:{actorId:actor.id,action:'COORDINATOR_REMOVE',entity:'Event',entityId:id,details:{userId}}});});return ok({removed:true});}catch(e){return fail(e)}}
