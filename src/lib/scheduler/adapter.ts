import type { Prisma } from '@prisma/client';
import type { MemberInput, SlotInput, Rules } from './core';
export const eventQuery = {
 shifts:{include:{workstation:true,requirements:true},orderBy:[{startsAt:'asc' as const},{workstation:{name:'asc' as const}}]},
 availability:{},
} satisfies Prisma.EventInclude;
export type LoadedMember = Prisma.MemberGetPayload<{include:{skills:true;availability:true;preference:true}}>;
export type LoadedShift = Prisma.ShiftGetPayload<{include:{workstation:true;requirements:true}}>;
export function adapt(members:LoadedMember[], shifts:LoadedShift[],rules:Rules) {
 const ms:MemberInput[]=members.map(m=>({id:m.id,name:m.fullName,active:m.status==='ACTIVE',commute:m.commute,
 preferredPeriod:(m.preference?.preferredPeriod||'ANY') as MemberInput['preferredPeriod'],skillIds:m.skills.map(s=>s.skillId),
 availability:m.availability.map(a=>({start:a.startAt.toISOString(),end:a.endAt.toISOString(),available:a.available}))}));
 const ss:SlotInput[]=shifts.map(s=>({id:s.id,station:s.workstation.name,start:s.startsAt.toISOString(),end:s.endsAt.toISOString(),
 minPeople:s.minPeople,idealPeople:s.idealPeople,skillIds:s.requirements.map(r=>r.skillId),priority:s.workstation.priority}));
 return {members:ms,slots:ss,rules};
}
