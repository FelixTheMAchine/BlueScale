import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ALL, STAFF, fail, jsonBody, ok, requireRole, HttpError } from '@/lib/api';
import { memberSchema } from '@/lib/schemas';
export async function GET(req:NextRequest){try{const u=await requireRole(ALL);const page=Math.max(1,Math.min(1000,Number(req.nextUrl.searchParams.get('page')||1))),q=(req.nextUrl.searchParams.get('q')||'').slice(0,80);
 const where={...(u.role==='MEMBER'?{id:u.memberId||'NO_MEMBER'}:{}),...(q?{OR:[{fullName:{contains:q,mode:'insensitive' as const}},{identifier:{contains:q,mode:'insensitive' as const}}]}:{})};
 const [data,total]=await Promise.all([prisma.member.findMany({where,select:{id:true,identifier:true,fullName:true,email:true,status:true,commute:true,department:{select:{name:true}},preference:{select:{preferredPeriod:true}}},take:30,skip:(page-1)*30,orderBy:{fullName:'asc'}}),prisma.member.count({where})]);return ok({data:['EVENT_COORDINATOR','MEMBER'].includes(u.role)?data.map(({email,commute,preference,...item})=>item):data,total,page});
 }catch(e){return fail(e)}}
export async function POST(req:NextRequest){try{const u=await requireRole(STAFF);const data=memberSchema.parse(await jsonBody(req));
 const collision=await prisma.member.findFirst({where:{OR:[{identifier:data.identifier},{email:data.email}]}});if(collision) throw new HttpError(409,'E-mail ou identificador já cadastrado. Mesclagem automática é proibida.');
 const member=await prisma.member.create({data:{identifier:data.identifier,fullName:data.fullName,email:data.email,departmentId:data.departmentId,
 status:data.status,nickname:data.nickname,title:data.title,region:data.region,commute:data.commute,
 preference:{create:{preferredPeriod:data.preferredPeriod}},skills:{create:data.skillIds.map(skillId=>({skillId}))}}});
 await prisma.auditLog.create({data:{actorId:u.id,action:'CREATE',entity:'Member',entityId:member.id}});return ok({id:member.id},201);
 }catch(e){return fail(e)}}
