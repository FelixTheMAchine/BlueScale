import { ensurePage } from '@/lib/page-auth';
import { MembersClient } from '@/components/members-client';
export default async function MembersPage(){await ensurePage(['ADMIN','PEOPLE']);return <MembersClient/>}
