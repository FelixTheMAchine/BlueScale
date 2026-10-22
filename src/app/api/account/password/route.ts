import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { ALL, fail, HttpError, jsonBody, ok, requireRole } from '@/lib/api';
export async function POST(req:NextRequest){try{
 const actor=await requireRole([...ALL,'VIEWER']);
 const {currentPassword,newPassword}=z.object({currentPassword:z.string(),newPassword:z.string().min(12).max(128)}).parse(await jsonBody(req));
 if(currentPassword===newPassword)throw new HttpError(400,'Escolha uma senha diferente da atual.');
 const user=await prisma.user.findUnique({where:{id:actor.id}});
 if(!user||!await bcrypt.compare(currentPassword,user.passwordHash))throw new HttpError(403,'Senha atual incorreta.');
 const hash=await bcrypt.hash(newPassword,12);
 await prisma.$transaction(async tx=>{
  // Compare-and-swap evita que uma troca de senha simultânea seja silenciosamente sobrescrita.
  const updated=await tx.user.updateMany({where:{id:actor.id,passwordHash:user.passwordHash},data:{passwordHash:hash}});
  if(updated.count!==1)throw new HttpError(409,'Senha alterada em outro aparelho. Entre novamente.');
  await tx.auditLog.create({data:{actorId:actor.id,action:'PASSWORD_CHANGE',entity:'User',entityId:actor.id}});
 });return ok({saved:true});
}catch(e){return fail(e)}}
