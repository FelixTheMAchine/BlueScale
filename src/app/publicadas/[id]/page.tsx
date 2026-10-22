import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ensurePage } from '@/lib/page-auth';
import { formatInTimeZone } from 'date-fns-tz';
import { ArrowLeft, Download, FileSpreadsheet, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
const date = (d:Date) => formatInTimeZone(d,'America/Sao_Paulo','dd/MM/yyyy HH:mm');

export default async function PublishedEventPage({params}:{params:Promise<{id:string}>}){
  await ensurePage(['VIEWER']);
  const {id} = await params;
  const v = await prisma.scheduleVersion.findFirst({
    where: {eventId:id,status:'PUBLISHED',event:{status:{not:'CANCELLED'}}},
    orderBy: {number:'desc'},
    select: {
      number:true, publishedAt:true,
      event: {select:{name:true,location:true,startsAt:true,endsAt:true}},
      assignments: {
        select: {
          id:true,
          member:{select:{fullName:true,department:{select:{name:true}}}},
          shift:{select:{startsAt:true,endsAt:true,workstation:{select:{name:true}}}},
        },
      },
    },
  });
  if (!v) notFound();

  const assignments = [...v.assignments].sort((a,b) =>
    a.shift.startsAt.getTime()-b.shift.startsAt.getTime() ||
    a.shift.workstation.name.localeCompare(b.shift.workstation.name) ||
    a.member.fullName.localeCompare(b.member.fullName));
  return <div className="space-y-6">
    <Link href="/publicadas" className="muted flex items-center gap-2 text-sm"><ArrowLeft size={16}/>Voltar às publicações</Link>
    <div className="flex flex-wrap justify-between gap-4 items-center">
      <div>
        <p className="eyebrow">ESCALA OFICIAL · VERSÃO {v.number}</p>
        <h1 className="text-3xl font-black mt-2">{v.event.name}</h1>
        <p className="muted mt-2 text-sm">{v.event.location} · {date(v.event.startsAt)} a {date(v.event.endsAt)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a className="btn" href={`/api/publicadas/${id}/excel`}><FileSpreadsheet size={18}/>Baixar Excel</a>
        <a className="btn btn-secondary" href={`/api/publicadas/${id}/csv`}><Download size={18}/>CSV</a>
      </div>
    </div>
    <p className="panel p-4 flex items-start gap-3 text-sm"><ShieldCheck className="text-[#287aff] shrink-0" size={19}/>Consulta somente leitura. Nenhuma alteração nesta tela modifica a escala.</p>
    <div className="panel overflow-x-auto">
      <table className="table w-full">
        <thead><tr><th>Início</th><th>Fim</th><th>Posto</th><th>Membro</th><th>Diretoria</th></tr></thead>
        <tbody>{assignments.map(a=><tr key={a.id}>
          <td className="whitespace-nowrap">{date(a.shift.startsAt)}</td>
          <td className="whitespace-nowrap">{date(a.shift.endsAt)}</td>
          <td className="font-semibold">{a.shift.workstation.name}</td>
          <td>{a.member.fullName}</td>
          <td>{a.member.department.name}</td>
        </tr>)}</tbody>
      </table>
      {assignments.length===0&&<p className="p-6 text-sm muted">A escala foi publicada sem atribuições.</p>}
    </div>
  </div>;
}
