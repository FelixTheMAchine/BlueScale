import { ensurePage } from '@/lib/page-auth';
import { MySchedule } from '@/components/my-schedule';
export default async function Page(){const u=await ensurePage();return <MySchedule memberId={u.memberId}/>}
