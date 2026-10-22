import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';
import { ALL, fail, ok, requireRole, HttpError } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
export async function GET(req:NextRequest,context:{params:Promise<{id:string}>}){try{const u=await requireRole(ALL);const {id}=await context.params;await requireEventAccess(u,id);
 const v=await prisma.scheduleVersion.findFirst({where:{eventId:id,...(u.role==='MEMBER'||u.role==='EVENT_COORDINATOR'||req.nextUrl.searchParams.get('view')==='published'?{status:'PUBLISHED' as const}:{})},orderBy:{number:'desc'},include:{assignments:{include:{confirmation:{select:{status:true}},attendance:{select:{status:true}},member:{select:{id:true,fullName:true,department:{select:{name:true}}}},shift:{include:{workstation:true}}}},generations:{orderBy:{createdAt:'desc'},take:1}}});
 if(!v) throw new HttpError(404,'Nenhuma escala disponível para este evento.');
 if(u.role==='MEMBER'){return ok({...v,assignments:v.assignments.filter(a=>a.memberId===u.memberId)});}
 return ok(v);
 }catch(e){return fail(e)}}
