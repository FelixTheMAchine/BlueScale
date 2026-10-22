import { ensurePage } from '@/lib/page-auth';
import { ScheduleClient } from '@/components/schedule-client';
export default async function Page({params}:{params:Promise<{id:string}>}){const user=await ensurePage(['ADMIN','PEOPLE','EVENT_COORDINATOR']);const {id}=await params;return <ScheduleClient id={id} canEdit={['ADMIN','PEOPLE'].includes(user.role)}/>}
