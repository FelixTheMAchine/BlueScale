import { ensurePage } from '@/lib/page-auth';
import { UsersAdmin } from '@/components/users-admin';
export default async function UsersPage(){await ensurePage(['ADMIN']);return <UsersAdmin/>}
