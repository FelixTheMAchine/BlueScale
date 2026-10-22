import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TEAM, fail, requireRole, HttpError } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
import { makeWorkbook } from '@/lib/xlsx';
export async function GET(_req:NextRequest,context:{params:Promise<{id:string}>}){try{const u=await requireRole(TEAM);const {id}=await context.params;await requireEventAccess(u,id);
 const e=await prisma.event.findUnique({where:{id},include:{shifts:{include:{workstation:true}},schedules:{where:u.role==='EVENT_COORDINATOR'?{status:'PUBLISHED'}:{},orderBy:{number:'desc'},take:1,include:{assignments:{include:{member:{include:{department:true}},confirmation:true,shift:{include:{workstation:true}}}},generations:{take:1,orderBy:{createdAt:'desc'}}}}}});
 if(!e)throw new HttpError(404,'Evento não encontrado');if(!e.schedules.length)throw new HttpError(404,'Gere uma escala antes de exportar.');
 const [total,availability]=await Promise.all([prisma.member.count(),prisma.memberAvailability.findMany({where:{eventId:id,available:true,member:{status:'ACTIVE'}},select:{memberId:true},distinct:['memberId']})]);const buf=await makeWorkbook(e,e.schedules[0],{total,available:availability.length});return new NextResponse(new Uint8Array(buf),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="bluescale-evento-${id.slice(0,8)}-v${e.schedules[0].number}.xlsx"`,'Cache-Control':'private, no-store'}});
 }catch(e){return fail(e)}}
