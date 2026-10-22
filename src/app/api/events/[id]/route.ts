import { prisma } from '@/lib/db';
import { ALL, fail, ok, requireRole, HttpError } from '@/lib/api';
import { requireEventAccess } from '@/lib/event-access';
export async function GET(_req:Request,context:{params:Promise<{id:string}>}){try{const u=await requireRole(ALL);const {id}=await context.params;await requireEventAccess(u,id);
 const event=await prisma.event.findUnique({where:{id},include:{workstations:true,shifts:{include:{workstation:true,requirements:true},orderBy:{startsAt:'asc'}},availability:{select:{memberId:true,startAt:true,endAt:true,available:true}},schedules:{select:{id:true,status:true,number:true,revision:true},orderBy:{number:'desc'},take:5}}});
 if(!event) throw new HttpError(404,'Evento não encontrado');if(u.role==='MEMBER') return ok({...event,availability:event.availability.filter(a=>a.memberId===u.memberId),schedules:event.schedules.filter(a=>a.status==='PUBLISHED')});if(u.role==='EVENT_COORDINATOR')return ok({...event,availability:[]});return ok(event);
 }catch(e){return fail(e)}}
