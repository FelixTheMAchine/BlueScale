import { prisma } from '@/lib/db';
import { ALL, requireRole, fail, ok } from '@/lib/api';
export async function GET(){try{await requireRole(ALL);return ok(await prisma.department.findMany({orderBy:{name:'asc'}}));}catch(e){return fail(e)}}
