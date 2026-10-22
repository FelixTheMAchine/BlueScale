import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { fail, HttpError, requireRole } from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { formatInTimeZone } from 'date-fns-tz';

const time=(d:Date)=>formatInTimeZone(d,'America/Sao_Paulo','dd/MM/yyyy HH:mm');

export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    await requireRole(['VIEWER']);
    const {id}=await params;
    const v=await prisma.scheduleVersion.findFirst({
      where:{eventId:id,status:'PUBLISHED',event:{status:{not:'CANCELLED'}}},
      orderBy:{number:'desc'},
      select:{number:true,assignments:{
        select:{
          member:{select:{fullName:true,department:{select:{name:true}}}},
          shift:{select:{startsAt:true,endsAt:true,workstation:{select:{name:true}}}},
        },
      }},
    });
    if(!v)throw new HttpError(404,'Escala publicada não encontrada.');
    const rows:(string|number)[][]=[['Início','Fim','Posto','Membro','Diretoria']];
    for(const a of v.assignments.sort((a,b)=>a.shift.startsAt.getTime()-b.shift.startsAt.getTime())){
      rows.push([time(a.shift.startsAt),time(a.shift.endsAt),a.shift.workstation.name,a.member.fullName,a.member.department.name]);
    }
    return new Response(exportCsv(rows),{
      headers:{
        'Content-Type':'text/csv; charset=utf-8',
        'Content-Disposition':`attachment; filename="bluescale-publicada-${id.slice(0,8)}-v${v.number}.csv"`,
        'Cache-Control':'private, no-store',
        'X-Content-Type-Options':'nosniff',
      },
    });
  }catch(e){return fail(e);}
}
