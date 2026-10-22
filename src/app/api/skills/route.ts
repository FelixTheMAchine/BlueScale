import { prisma } from '@/lib/db';
import { ALL, fail, ok, requireRole } from '@/lib/api';
export async function GET(){try{await requireRole(ALL);return ok(await prisma.skill.findMany({orderBy:{name:'asc'}}));}catch(e){return fail(e)}}
