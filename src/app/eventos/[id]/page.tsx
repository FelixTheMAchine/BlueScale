import { ensurePage } from '@/lib/page-auth';
import { EventDetail } from '@/components/event-detail';
export default async function Page({params}:{params:Promise<{id:string}>}){const user=await ensurePage(['ADMIN','PEOPLE','EVENT_COORDINATOR']);const {id}=await params;return <EventDetail id={id} canManage={['ADMIN','PEOPLE'].includes(user.role)}/>}
