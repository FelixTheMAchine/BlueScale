import { prisma } from '@/lib/db';
import { fail, ok, requireRole, TEAM } from '@/lib/api';

// The scheduling UI needs only names and departments, not emails, skills,
// preferences or a paginated member list that silently cuts off after 60.
export async function GET(){try{
 await requireRole(TEAM);
 const people=await prisma.member.findMany({
  where:{status:'ACTIVE'},
  select:{id:true,fullName:true,department:{select:{name:true}}},
  orderBy:[{fullName:'asc'},{id:'asc'}],
 });
 return ok(people);
}catch(e){return fail(e)}}
