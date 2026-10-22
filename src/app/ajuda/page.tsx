import Link from 'next/link';
import { ensurePage } from '@/lib/page-auth';
import { ArrowRight, CalendarDays, ClipboardCheck, Download, PartyPopper, Users, WandSparkles, CircleHelp } from 'lucide-react';
import { InstallApp } from '@/components/install-app';

export default async function HelpPage(){
 const user=await ensurePage();
 const canManage=['ADMIN','PEOPLE'].includes(user.role);
 const steps=canManage?[
  {title:'Cadastre a equipe',desc:'Adicione as pessoas uma vez. Nas próximas festas, a lista já estará pronta.',href:'/membros',link:'Abrir equipe',Icon:Users},
  {title:'Crie a festa',desc:'Informe nome, local, início e término. As regras avançadas ficam opcionais.',href:'/eventos',link:'Criar festa',Icon:CalendarDays},
  {title:'Defina os postos e disponibilidades',desc:'Selecione as funções, quantidades e quem pode trabalhar.',href:'/eventos',link:'Ver eventos',Icon:ClipboardCheck},
  {title:'Gere e confira a escala',desc:'Clique em Gerar escala. O BlueScale avisa se faltar alguém, sem forçar atribuições inválidas.',href:'/eventos',link:'Abrir escala',Icon:WandSparkles},
  {title:'Publique e baixe a planilha',desc:'Após revisar, publique e toque em Exportar Excel para compartilhar o arquivo.',href:'/eventos',link:'Ir para eventos',Icon:Download}
 ]:[
  {title:'Encontre seu evento',desc:'Abra a lista de festas e veja informações compartilhadas pela organização.',href:'/eventos',link:'Ver festas',Icon:CalendarDays},
  {title:'Veja seus turnos',desc:'Na área Meus turnos, confira seus horários e disponibilidades.',href:user.memberId?'/minha-escala':'/eventos',link:user.memberId?'Meus turnos':'Ver eventos',Icon:ClipboardCheck},
 ];
 return <div className="space-y-6 max-w-4xl mx-auto">
  <header className="hero-blue rounded-3xl p-6 md:p-9"><p className="eyebrow !text-[#b9d5ff] flex gap-2 items-center"><CircleHelp size={16}/>GUIA RÁPIDO</p><h1 className="text-3xl md:text-4xl font-black mt-3">Simples do começo ao fim.</h1><p className="mt-3 text-[#d2e4ff] text-sm md:text-base">Não precisa entender de planilhas, programação ou escalas para usar o BlueScale.</p></header>
  <section className="space-y-3" aria-label="Etapas para usar o BlueScale"><h2 className="text-xl font-extrabold">{canManage?'Organize a festa em 5 passos':'Encontre seus turnos'}</h2>
   {steps.map(({title,desc,href,link,Icon},index)=><div key={title} className="panel p-4 md:p-5 flex gap-3 sm:gap-4 items-start"><div className="shrink-0 w-11 h-11 rounded-xl bg-[#267dff17] text-[#387fe8] flex justify-center items-center"><Icon size={22}/></div><div className="flex-1 min-w-0"><p className="text-xs font-bold text-[#347cfa]">PASSO {index+1}</p><h3 className="font-extrabold mt-0.5">{title}</h3><p className="muted text-sm mt-1">{desc}</p><Link href={href} className="inline-flex mt-3 gap-2 items-center text-sm font-bold text-[#3480fd] min-h-9">{link}<ArrowRight size={16}/></Link></div></div>)}
  </section>
  <InstallApp/>
  <div className="panel p-5 flex gap-3 items-center"><PartyPopper size={23} className="text-[#3785ff] shrink-0"/><p className="text-sm"><strong>Importante:</strong> a escala é compartilhada somente depois da publicação. Prefira usar conexão com a internet para consultar informações atualizadas.</p></div>
 </div>;
}
