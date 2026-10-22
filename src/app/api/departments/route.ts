import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ALL, STAFF, HttpError, requireRole, fail, ok, jsonBody } from '@/lib/api';

const createDepartment = z.object({
  name: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(80),
}).strict();

export async function GET(){
  try{
    await requireRole(ALL);
    return ok(await prisma.department.findMany({orderBy:{name:'asc'},select:{id:true,name:true}}));
  }catch(e){return fail(e)}
}

export async function POST(req:NextRequest){
  try{
    const actor=await requireRole(STAFF);
    const {name}=createDepartment.parse(await jsonBody(req));
    const existing=await prisma.department.findFirst({
      where:{name:{equals:name,mode:'insensitive'}},
      select:{id:true,name:true},
    });
    if(existing)throw new HttpError(409, `A diretoria "${existing.name}" já está cadastrada.`);

    const created=await prisma.$transaction(async tx=>{
      const department=await tx.department.create({data:{name},select:{id:true,name:true}});
      await tx.auditLog.create({
        data:{actorId:actor.id,action:'CREATE',entity:'Department',entityId:department.id,details:{name:department.name}},
      });
      return department;
    });
    return ok(created,201);
  }catch(e){return fail(e)}
}
