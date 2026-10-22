import { z } from 'zod';
export const memberSchema = z.object({
 identifier:z.string().trim().min(2).max(32),fullName:z.string().trim().min(3).max(120),
 email:z.email().transform(s=>s.toLowerCase()),departmentId:z.string().min(1),
 nickname:z.string().max(80).optional(),title:z.string().max(80).optional(),region:z.string().max(80).optional(),
 commute:z.enum(['NEAR','MEDIUM','FAR']).nullable().optional(),
 status:z.enum(['ACTIVE','INACTIVE','LEAVE']).default('ACTIVE'),
 preferredPeriod:z.enum(['EARLY','MIDDLE','LATE','ANY']).default('ANY'),
 skillIds:z.array(z.string()).default([])
});
export const eventSchema = z.object({
 name:z.string().min(3).max(120),description:z.string().max(1000).optional(),location:z.string().min(2).max(120),
 startsAt:z.iso.datetime({offset:true}),endsAt:z.iso.datetime({offset:true}),
 maxMinutesPerMember:z.number().int().min(30).max(1440).default(360),
 maxShiftsPerMember:z.number().int().min(1).max(20).default(4),
 minRestMinutes:z.number().int().min(0).max(720).default(0)
}).refine(d=>Date.parse(d.endsAt)>Date.parse(d.startsAt),{message:'Término deve ser posterior ao início.',path:['endsAt']}).refine(d=>Date.parse(d.endsAt)-Date.parse(d.startsAt)<=72*60*60*1000,{message:'MVP limitado a eventos de até 72 horas.',path:['endsAt']});
export const workstationSchema=z.object({name:z.string().min(2).max(80),description:z.string().max(500).optional(),
 minPeople:z.number().int().min(1).max(200),idealPeople:z.number().int().min(1).max(200),
 slotMinutes:z.number().int().min(15).max(480).default(90),priority:z.number().int().min(1).max(10).default(1),
 skillIds:z.array(z.string()).default([])
}).refine(d=>d.idealPeople>=d.minPeople,{message:'O ideal não pode ser inferior ao mínimo.',path:['idealPeople']});
export const availabilitySchema=z.object({memberId:z.string(),startAt:z.iso.datetime({offset:true}),endAt:z.iso.datetime({offset:true}),available:z.boolean().default(true)})
 .refine(d=>Date.parse(d.endAt)>Date.parse(d.startAt),{message:'Intervalo inválido.'});
