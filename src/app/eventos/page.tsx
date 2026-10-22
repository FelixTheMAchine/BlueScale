import { ensurePage } from '@/lib/page-auth';
import { EventsClient } from '@/components/events-client';
export default async function EventsPage(){const u=await ensurePage();return <EventsClient canCreate={['ADMIN','PEOPLE'].includes(u.role)}/>}
