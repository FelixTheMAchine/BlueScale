'use client';
import { useEffect, useState } from 'react';
import { Download, Smartphone, Share2, CheckCircle2 } from 'lucide-react';

type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export function InstallApp(){
 const [ready,setReady]=useState<InstallEvent|null>(null);
 const [installed,setInstalled]=useState(false);
 useEffect(()=>{
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||('standalone' in navigator && (navigator as Navigator & {standalone?:boolean}).standalone);
  setInstalled(!!isStandalone);
  const onPrompt=(ev:Event)=>{ev.preventDefault();setReady(ev as InstallEvent)};
  const onInstalled=()=>{setReady(null);setInstalled(true)};
  window.addEventListener('beforeinstallprompt',onPrompt);
  window.addEventListener('appinstalled',onInstalled);
  return ()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled)};
 },[]);
 const install=async()=>{
  if(!ready)return;
  await ready.prompt();
  const choice=await ready.userChoice;
  if(choice.outcome==='accepted')setReady(null);
 };
 return <section className="panel p-5 md:p-6" aria-label="Instalar o aplicativo no celular">
  <div className="flex items-center gap-3"><span className="bg-[#2b78f618] text-[#347df5] p-3 rounded-xl"><Smartphone size={24}/></span><div><h2 className="font-extrabold text-lg">BlueScale na tela inicial</h2><p className="text-sm muted">Abra direto pelo ícone, como seus outros aplicativos.</p></div></div>
  {installed?<p className="flex items-center gap-2 font-semibold text-green-600 mt-4"><CheckCircle2 size={19}/>O BlueScale já está aberto como aplicativo.</p>:ready?<button className="btn mt-5 w-full sm:w-auto" onClick={()=>void install()}><Download size={18}/>Instalar aplicativo</button>:<div className="space-y-3 mt-4 text-sm"><p><strong>Android:</strong> abra o menu do Chrome (⋮) e toque em “Instalar app” ou “Adicionar à tela inicial”.</p><p className="flex gap-2"><Share2 size={17} className="shrink-0 mt-0.5"/><span><strong>iPhone:</strong> abra pelo Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</span></p><p className="muted text-xs">A instalação depende do navegador, de uma conexão HTTPS e de o aplicativo estar publicado. Algumas opções não aparecem no ambiente local.</p></div>}
 </section>;
}
