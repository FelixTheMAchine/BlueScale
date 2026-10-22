import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ALL, fail, HttpError, ok, requireRole } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
import { loadInputs } from '@/lib/scheduler/load';
import { assignmentError } from '@/lib/scheduler/core';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{
 const actor=await requireRole(ALL);const {id}=await params;await requireEventAccess(actor,id);
 const assignmentId=req.nextUrl.searchParams.get('assignmentId')||'';
 const a=await prisma.shiftAssignment.findFirst({where:{id:assignmentId,scheduleVersion:{eventId:id,status:'PUBLISHED'}},include:{scheduleVersion:true}});
 if(!a)throw new HttpError(404,'Atribuição não encontrada.');
 if(actor.role==='MEMBER'&&a.memberId!==actor.memberId)throw new HttpError(403,'Turno de outra pessoa.');
 const {members,slots,rules}=await prisma.$transaction(tx=>loadInputs(tx,id));const s=slots.find(s=>s.id===a.shiftId);
 if(!s)throw new HttpError(404,'Turno não encontrado.');
 const current=await prisma.shiftAssignment.findMany({where:{scheduleVersionId:a.scheduleVersionId},select:{memberId:true,shiftId:true}});
 const remaining=current.filter(x=>!(x.memberId===a.memberId&&x.shiftId===a.shiftId));
 return ok(members.filter(m=>m.id!==a.memberId&&!assignmentError(m,s,remaining,slots,rules)).map(m=>({id:m.id,name:m.name})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));
}catch(e){return fail(e)}}
