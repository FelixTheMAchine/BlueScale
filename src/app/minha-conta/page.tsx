import { ensurePage } from '@/lib/page-auth';
import { AccountSettings } from '@/components/account-settings';
export default async function AccountPage(){const u=await ensurePage(['ADMIN','PEOPLE','EVENT_COORDINATOR','MEMBER','VIEWER']);return <AccountSettings name={u.name||'Usuário'} linked={u.role==='VIEWER'?false:!!u.memberId}/>}
