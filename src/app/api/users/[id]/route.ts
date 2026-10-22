import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
const schema=z.object({role:z.enum(['ADMIN','PEOPLE','EVENT_COORDINATOR','MEMBER']).optional(),password:z.string().min(12).max(128).optional()}).strict().refine(s=>s.role!==undefined||s.password!==undefined);
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const actor=await requireRole(['ADMIN']);const {id}=await params;const data=schema.parse(await jsonBody(req));if(id===actor.id&&data.role&&data.role!=='ADMIN')throw new HttpError(409,'Não retire sua própria permissão de administrador.');
 const user=await prisma.$transaction(async tx=>{
  const old=await tx.user.findUnique({where:{id}});if(!old)throw new HttpError(404,'Usuário não encontrado.');
  if(old.role==='ADMIN'&&data.role&&data.role!=='ADMIN'){
   const adminCount=await tx.user.count({where:{role:'ADMIN'}});if(adminCount<=1)throw new HttpError(409,'Mantenha ao menos um administrador.');
  }
  if(data.role==='MEMBER'&&!old.memberId)throw new HttpError(400,'Conta sem membro vinculado.');
  const result=await tx.user.update({where:{id},data:{...(data.role?{role:data.role}:{}),...(data.password?{passwordHash:await bcrypt.hash(data.password,12)}:{})},select:{id:true,role:true,name:true}});
  await tx.auditLog.create({data:{actorId:actor.id,action:'USER_UPDATE',entity:'User',entityId:id,details:{roleChanged:!!data.role,passwordReset:!!data.password}}});return result;
 });return ok(user);
 }catch(e){return fail(e)}}
