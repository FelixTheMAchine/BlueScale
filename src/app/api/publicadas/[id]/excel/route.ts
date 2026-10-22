import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fail, HttpError, requireRole } from '@/lib/api';
import { makeWorkbook } from '@/lib/xlsx';

export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try {
    await requireRole(['VIEWER']);
    const {id}=await params;
    const event=await prisma.event.findFirst({
      where:{id,status:{not:'CANCELLED'},schedules:{some:{status:'PUBLISHED'}}},
      include:{
        shifts:{include:{workstation:true}},
        schedules:{
          where:{status:'PUBLISHED'},
          orderBy:{number:'desc'},take:1,
          include:{assignments:{include:{
            member:{include:{department:true}},confirmation:true,
            shift:{include:{workstation:true}},
          }},generations:{take:1,orderBy:{createdAt:'desc'}}},
        },
      },
    });
    if(!event?.schedules.length) throw new HttpError(404,'Escala publicada não encontrada.');
    const [total,available]=await Promise.all([
      prisma.member.count({where:{status:'ACTIVE'}}),
      prisma.memberAvailability.findMany({where:{eventId:id,available:true,member:{status:'ACTIVE'}},select:{memberId:true},distinct:['memberId']}),
    ]);
    const data=await makeWorkbook(event,event.schedules[0],{total,available:available.length});
    return new NextResponse(new Uint8Array(data),{
      headers:{
        'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':`attachment; filename="bluescale-publicada-${id.slice(0,8)}-v${event.schedules[0].number}.xlsx"`,
        'Cache-Control':'private, no-store',
        'X-Content-Type-Options':'nosniff',
      },
    });
  }catch(e){return fail(e);}
}
