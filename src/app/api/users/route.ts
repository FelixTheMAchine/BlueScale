import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
const create=z.object({name:z.string().trim().min(2).max(100),email:z.email().transform(s=>s.toLowerCase()),
 role:z.enum(['ADMIN','PEOPLE','EVENT_COORDINATOR','MEMBER']),memberId:z.string().nullable().optional(),
 password:z.string().min(12).max(128)}).strict();
export async function GET(){try{await requireRole(['ADMIN']);return ok(await prisma.user.findMany({select:{id:true,name:true,email:true,role:true,memberId:true,createdAt:true},orderBy:{name:'asc'}}));}catch(e){return fail(e)}}
export async function POST(req:NextRequest){try{const actor=await requireRole(['ADMIN']);const data=create.parse(await jsonBody(req));
 if(data.role==='MEMBER'&&!data.memberId)throw new HttpError(400,'Vincule o login a um membro.');
 if(data.memberId){const member=await prisma.member.findUnique({where:{id:data.memberId}});if(!member||member.status!=='ACTIVE')throw new HttpError(400,'Membro não encontrado ou inativo.');}
 const user=await prisma.$transaction(async tx=>{const u=await tx.user.create({data:{name:data.name,email:data.email,role:data.role,memberId:data.memberId||null,passwordHash:await bcrypt.hash(data.password,12)}});
 await tx.auditLog.create({data:{actorId:actor.id,action:'USER_CREATE',entity:'User',entityId:u.id,details:{role:u.role}}});return {id:u.id,email:u.email,role:u.role};});return ok(user,201);
 }catch(e){return fail(e)}}
