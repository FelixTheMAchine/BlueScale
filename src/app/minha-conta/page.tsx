import { ensurePage } from '@/lib/page-auth';
import { AccountSettings } from '@/components/account-settings';
export default async function AccountPage(){const u=await ensurePage();return <AccountSettings name={u.name||'Usuário'} linked={!!u.memberId}/>}
