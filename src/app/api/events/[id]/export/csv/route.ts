import { prisma } from '@/lib/db';
import { TEAM, fail, HttpError, requireRole } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
import { exportCsv } from '@/lib/csv';
import { formatInTimeZone } from 'date-fns-tz';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){try{
 const actor=await requireRole(TEAM);const {id}=await params;await requireEventAccess(actor,id);
 const e=await prisma.event.findUnique({where:{id},select:{name:true,schedules:{orderBy:{number:'desc'},take:1,include:{assignments:{include:{member:{select:{fullName:true,department:{select:{name:true}}}},confirmation:true,shift:{include:{workstation:true}}}}}}}});
 if(!e?.schedules.length)throw new HttpError(404,'Escala não encontrada.');
 const rows:(string|number)[][]=[['Início','Fim','Posto','Membro','Diretoria','Confirmação']];
 for(const a of e.schedules[0].assignments.sort((x,y)=>x.shift.startsAt.getTime()-y.shift.startsAt.getTime()))rows.push([
  formatInTimeZone(a.shift.startsAt,'America/Sao_Paulo','dd/MM/yyyy HH:mm'),formatInTimeZone(a.shift.endsAt,'America/Sao_Paulo','dd/MM/yyyy HH:mm'),a.shift.workstation.name,a.member.fullName,a.member.department.name,
  a.confirmation?.status==='CONFIRMED'?'Confirmado':a.confirmation?.status==='DECLINED'?'Recusado':'Pendente']);
 return new Response(exportCsv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="bluescale-${id.slice(0,8)}.csv"`,'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return fail(e)}}
