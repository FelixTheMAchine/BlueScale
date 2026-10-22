import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ensurePage } from '@/lib/page-auth';
import { formatInTimeZone } from 'date-fns-tz';
import { CalendarDays, FileSpreadsheet, Eye, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
const fmt = (value:Date) => formatInTimeZone(value,'America/Sao_Paulo','dd/MM/yyyy · HH:mm');

export default async function PublishedSchedulesPage(){
  await ensurePage(['VIEWER']);
  // A consulta nunca seleciona rascunhos, eventos cancelados ou dados de contato.
  const events = await prisma.event.findMany({
    where: { status: { not: 'CANCELLED' }, schedules: { some: { status: 'PUBLISHED' } } },
    select: {
      id: true, name: true, location: true, startsAt: true, endsAt: true,
      schedules: {
        where: { status: 'PUBLISHED' }, take: 1, orderBy: { number: 'desc' },
        select: { number: true, publishedAt: true, _count: { select: { assignments: true } } },
      },
    },
    orderBy: { startsAt: 'desc' },
    take: 100,
  });

  return <div className="space-y-7">
    <header className="flex gap-4 items-center">
      <div className="rounded-2xl p-3 bg-[#2678ff18] text-[#287aff]"><FileSpreadsheet size={30}/></div>
      <div><p className="eyebrow">PORTAL DOS MEMBROS</p><h1 className="text-3xl font-black mt-1">Escalas publicadas</h1><p className="muted text-sm mt-2">Veja os horários oficiais e baixe as planilhas sem modificar nada.</p></div>
    </header>
    <div className="panel p-4 flex gap-3 items-start">
      <ShieldCheck size={21} className="text-[#2678ff] shrink-0"/>
      <p className="text-sm">Esta área é <strong>somente leitura</strong>. Alterações, disponibilidade, trocas, rascunhos e informações privadas não aparecem aqui.</p>
    </div>
    {events.length ? <div className="grid md:grid-cols-2 gap-4">
      {events.map(e => {
        const schedule = e.schedules[0];
        return <div key={e.id} className="panel p-5 space-y-4">
          <div><span className="pill">PUBLICADA · VERSÃO {schedule.number}</span><h2 className="font-extrabold text-xl mt-3">{e.name}</h2>
            <p className="muted text-sm mt-2"><CalendarDays size={16} className="inline mr-1"/>{fmt(e.startsAt)} até {fmt(e.endsAt)}</p>
            <p className="muted text-sm mt-1">{e.location}</p>
            <p className="muted text-xs mt-2">{schedule._count.assignments} atribuições na escala oficial</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link className="btn" href={`/publicadas/${e.id}`}><Eye size={17}/>Visualizar</Link>
            <a className="btn btn-secondary" href={`/api/publicadas/${e.id}/excel`}><FileSpreadsheet size={17}/>Baixar Excel</a>
          </div>
        </div>;
      })}
    </div> : <div className="panel p-10 text-center space-y-2">
      <FileSpreadsheet size={35} className="mx-auto text-[#3478ee]"/>
      <h2 className="text-lg font-bold">Nenhuma escala publicada ainda</h2>
      <p className="muted text-sm">Quando a Gestão de Pessoas publicar uma escala, ela aparecerá aqui automaticamente.</p>
    </div>}
  </div>;
}
