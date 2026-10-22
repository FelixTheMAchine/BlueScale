import type { Prisma } from '@prisma/client';
import { adapt } from './adapter';
export async function loadInputs(tx: Prisma.TransactionClient, eventId: string) {
 const [event, members, shifts] = await Promise.all([
  tx.event.findUniqueOrThrow({where:{id:eventId}}),
  tx.member.findMany({where:{status:'ACTIVE'},include:{skills:true,preference:true,availability:{where:{eventId}}}}),
  tx.shift.findMany({where:{eventId},include:{workstation:true,requirements:true},orderBy:[{startsAt:'asc'},{workstation:{name:'asc'}}]})
 ]);
 const overlaps=await tx.shiftAssignment.findMany({where:{scheduleVersion:{status:'PUBLISHED'},shift:{eventId:{not:eventId},startsAt:{lt:event.endsAt},endsAt:{gt:event.startsAt}}},select:{memberId:true,shift:{select:{startsAt:true,endsAt:true}}}});
 const inputs=adapt(members,shifts,{maxMinutesPerMember:event.maxMinutesPerMember,maxShiftsPerMember:event.maxShiftsPerMember,minRestMinutes:event.minRestMinutes});
 // Histórico confirmado de outros eventos (não usar dados futuros ou versões arquivadas).
 const history=await tx.shiftAssignment.findMany({where:{scheduleVersion:{status:'PUBLISHED',eventId:{not:eventId}},shift:{endsAt:{lte:event.startsAt}}},select:{memberId:true,shift:{select:{startsAt:true,endsAt:true}}}});
 const sums=new Map<string,number>();
 for(const a of history)sums.set(a.memberId,(sums.get(a.memberId)||0)+Math.round((a.shift.endsAt.getTime()-a.shift.startsAt.getTime())/60000));
 for(const m of inputs.members)m.historicalMinutes=sums.get(m.id)||0;
 for(const a of overlaps){const m=inputs.members.find(m=>m.id===a.memberId);if(m)m.availability.push({start:a.shift.startsAt.toISOString(),end:a.shift.endsAt.toISOString(),available:false});}
 return {event,...inputs};
}
