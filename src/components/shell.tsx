import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { roleText } from '@/lib/labels';
import { LogOut, UserRound, CalendarDays, LayoutDashboard, Users, ShieldCheck, CircleHelp, Sparkles, KeyRound, Settings2, FileSpreadsheet, Download } from 'lucide-react';

export async function Shell({children}:{children:React.ReactNode}){
 const session=await getServerSession(authOptions);
 if(!session)return <>{children}</>;

 if(session.user.role==='VIEWER') return <div className="min-h-screen bg-[#f4f7fc]">
   <header className="bg-[#0e1b33] text-white shadow-md">
     <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center gap-3">
       <Link href="/publicadas" className="flex items-center gap-3">
         <Image src="/icons/blue-192.png" alt="BlueScale DAs" width={40} height={40} className="rounded-xl"/>
         <span className="font-extrabold text-xl">Blue<span className="text-[#79afff]">Scale</span><small className="block text-[10px] tracking-wider text-[#a5b5d0]">ÁREA DOS MEMBROS · DAs</small></span>
       </Link>
       <Link href="/api/auth/signout" aria-label="Sair da conta" className="p-3 rounded-xl border border-[#32425a]"><LogOut size={18}/></Link>
     </div>
   </header>
   <nav className="bg-white border-b" aria-label="Área de consulta">
     <div className="max-w-5xl mx-auto px-4 py-3 flex gap-5 text-sm font-semibold">
       <Link href="/publicadas" className="flex gap-2 items-center"><FileSpreadsheet size={18} color="#2776e4"/>Escalas publicadas</Link>
       <Link href="/minha-conta" className="flex gap-2 items-center"><Settings2 size={18}/>Minha senha</Link>
     </div>
   </nav>
   <main className="max-w-5xl mx-auto px-4 py-7 pb-16">{children}</main>
   <footer className="max-w-5xl mx-auto p-4 text-xs text-[#64748b] flex gap-2 items-center"><Download size={15}/>Somente leitura: você pode consultar e baixar, mas não modificar a escala oficial.</footer>
 </div>;
 const canManage=['ADMIN','PEOPLE'].includes(session.user.role);
 const links=[
  {href:'/',label:'Início',icon:LayoutDashboard},
  {href:'/eventos',label:'Eventos',icon:CalendarDays},
  ...(canManage?[{href:'/membros',label:'Equipe',icon:Users}]:[]),
  ...(session.user.role==='ADMIN'?[{href:'/usuarios',label:'Acessos',icon:KeyRound}]:[]),
  ...(session.user.memberId?[{href:'/minha-escala',label:'Meus turnos',icon:UserRound}]:[]),
  {href:'/minha-conta',label:'Configurações',icon:Settings2},
  {href:'/ajuda',label:'Como usar',icon:CircleHelp}
 ];
 const mobileLinks=[
  {href:'/',label:'Início',icon:LayoutDashboard},
  {href:'/eventos',label:'Eventos',icon:CalendarDays},
  canManage?{href:'/membros',label:'Equipe',icon:Users}:session.user.memberId?{href:'/minha-escala',label:'Turnos',icon:UserRound}:{href:'/ajuda',label:'Ajuda',icon:CircleHelp},
  ...(session.user.role==='ADMIN'?[{href:'/usuarios',label:'Acessos',icon:KeyRound}]:[]),
  {href:'/ajuda',label:'Ajuda',icon:CircleHelp}
 ].filter((link,index,all)=>all.findIndex(candidate=>candidate.href===link.href)===index);
 return <div className="min-h-screen lg:flex">
  <aside className="hidden lg:flex lg:w-[258px] shrink-0 bg-[#0e1b33] text-white lg:min-h-screen p-6 flex-col">
   <Link href="/" className="flex items-center gap-3 pb-8"><Image src="/icons/blue-192.png" alt="Emblema BlueScale DAs" width={42} height={42} className="rounded-xl"/><span className="text-2xl font-extrabold tracking-tight">Blue<span className="text-[#74b2ff]">Scale</span><small className="block text-[10px] uppercase tracking-[.22em] text-[#90a8ca] font-bold">por DAs · GP</small></span></Link>
   <nav className="flex flex-col gap-2" aria-label="Navegação principal">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className="flex items-center gap-3 rounded-xl py-3 px-3 text-sm font-medium text-[#c1d0e8] hover:bg-[#263957] hover:text-white focus-visible:bg-[#263957]"><Icon size={18}/>{label}</Link>)}</nav>
   <p className="mt-auto text-[#74b2ff] font-bold text-xs tracking-[.3em] pl-1">DAs</p>
   <div className="mt-3 rounded-2xl bg-[#172b4a] p-4"><div className="text-[10px] tracking-[.15em] font-bold text-[#9bb9e5] uppercase flex items-center gap-2"><Sparkles size={15}/>Simples, do início ao fim</div><p className="text-sm mt-2 text-[#d7e4fb]">Cadastre, gere, revise e compartilhe sem planilha manual.</p></div>
   <div className="flex items-center gap-3 pt-5 mt-5 border-t border-[#2b3d58]"><ShieldCheck size={21} className="text-[#5da3ff]"/><div className="min-w-0"><p className="text-sm font-semibold truncate">{session.user.name}</p><p className="text-xs text-[#9bb0cb]">{roleText[session.user.role]||session.user.role}</p></div><Link href="/api/auth/signout" aria-label="Sair da conta" className="ml-auto text-[#c3d2e7]"><LogOut size={19}/></Link></div>
  </aside>
  <header className="lg:hidden flex items-center justify-between gap-3 bg-[#0e1b33] text-white px-4 py-3 sticky top-0 z-30 shadow-md">
   <Link href="/" className="flex items-center gap-2 min-h-10"><Image src="/icons/blue-192.png" alt="Emblema BlueScale DAs" width={38} height={38} className="rounded-xl"/><span className="text-xl font-extrabold">Blue<span className="text-[#79afff]">Scale</span></span></Link>
   <div className="flex gap-2 items-center"><span className="text-xs text-[#afbfda] max-w-28 truncate" title={session.user.name||''}>{session.user.name}</span><Link href="/api/auth/signout" className="flex items-center justify-center w-11 h-11 rounded-xl border border-[#32425a]" aria-label="Sair da conta"><LogOut size={19}/></Link></div>
  </header>
  <main className="min-w-0 flex-1 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 xl:p-12 lg:pb-12 max-w-[1540px] mx-auto w-full" id="conteudo-principal">{children}</main>
  <nav className="mobile-tabbar lg:hidden" aria-label="Navegação do aplicativo">{mobileLinks.map(({href,label,icon:Icon})=><Link key={href} href={href} className="mobile-tab" aria-label={label}><Icon size={22} aria-hidden="true"/><span>{label}</span></Link>)}</nav>
 </div>;
}
