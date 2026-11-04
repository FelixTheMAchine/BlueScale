'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {UserRoundCheck,ShieldCheck,UserPlus,Trash2} from 'lucide-react';

type MemberCandidate={id:string;fullName:string;department:{name:string};user:{id:string;role:string}|null};
type AccountCandidate={id:string;name:string;memberId:string|null};
type AssignedMember={memberId:string;member:MemberCandidate};
type AssignedAccount={userId:string;user:AccountCandidate};
type Data={
 members:AssignedMember[];accounts:AssignedAccount[];
 candidates:MemberCandidate[];loginCandidates:AccountCandidate[];
};

export function EventCoordinators({eventId}:{eventId:string}){
 const [data,setData]=useState<Data|null>(null);
 const [chosenMember,setChosenMember]=useState('');
 const [chosenAccount,setChosenAccount]=useState('');
 const [search,setSearch]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(true);

 async function load(){
  try{
   const response=await fetch(`/api/events/${eventId}/coordinators`,{cache:'no-store'});
   const body=await response.json().catch(()=>({error:'Resposta inválida do servidor.'}));
   if(!response.ok)throw new Error(body.error||'Não foi possível carregar os coordenadores.');
   setData(body);
   setError('');
  }catch(err){setError(err instanceof Error?err.message:'Erro ao carregar coordenadores.');}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load()},[eventId]);

 async function change(selection:{memberId:string}|{userId:string},method:'POST'|'DELETE'){
  if(busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch(`/api/events/${eventId}/coordinators`,{
    method,headers:{'Content-Type':'application/json'},body:JSON.stringify(selection),
   });
   const body=await response.json().catch(()=>({error:'Resposta inválida do servidor.'}));
   if(!response.ok)throw new Error(body.error||'Não foi possível salvar a seleção.');
   setMessage(method==='DELETE'?'Coordenador retirado da festa.':
    body.accessGranted?'Coordenador salvo e acesso à festa autorizado.':
    'Coordenador salvo na festa. Para operar presença e trocas, também é necessário um login com perfil Coordenador.');
   setChosenMember('');setChosenAccount('');
   await load();
  }catch(err){setError(err instanceof Error?err.message:'Erro ao salvar coordenador.');}
  finally{setBusy(false);}
 }
 const appointed=data?.members||[];
 const linkedIds=new Set(appointed.map(m=>m.memberId));
 const filtered=data?.candidates.filter(m=>!linkedIds.has(m.id)&&
   (`${m.fullName} ${m.department.name}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))))||[];
 const activeAccessIds=new Set((data?.accounts||[]).map(a=>a.userId));
 const accountOptions=data?.loginCandidates.filter(a=>!activeAccessIds.has(a.id))||[];
 const unlinkedAccounts=(data?.accounts||[]).filter(a=>!a.user.memberId||!linkedIds.has(a.user.memberId));
 return <section className="panel p-5 md:p-6 space-y-4" aria-labelledby="coordinators-title">
  <header>
   <p className="eyebrow">ORGANIZAÇÃO DA FESTA</p>
   <h2 className="font-bold text-xl mt-1 flex gap-2 items-center" id="coordinators-title"><UserRoundCheck size={21}/>Coordenadores desta festa</h2>
   <p className="muted text-sm mt-2">Escolha diretamente qualquer membro ativo da equipe. Os nomes ficam salvos nesta festa, sem precisar criar uma conta primeiro.</p>
  </header>
  {loading&&<p className="muted text-sm" role="status">Carregando equipe...</p>}
  {error&&<p role="alert" className="text-sm text-red-600">{error} <button className="underline" onClick={()=>void load()}>Tentar novamente</button></p>}
  {message&&<p role="status" className="text-sm rounded-xl p-3 bg-[#2876ff15]">{message}</p>}
  <div>
   <h3 className="font-semibold text-sm mb-2">Designados para o evento ({appointed.length})</h3>
   <div className="space-y-2">
    {appointed.map(({memberId,member})=>{
     const canOperate=member.user?.role==='EVENT_COORDINATOR'&&activeAccessIds.has(member.user.id);
     return <div key={memberId} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border" style={{borderColor:'var(--border)'}}>
      <div><p className="font-semibold text-sm">{member.fullName}</p><p className="muted text-xs">{member.department.name} · {canOperate?'Login de coordenador ativo':'Designação salva — login não configurado'}</p></div>
      <button type="button" className="btn btn-secondary text-xs !py-2" disabled={busy} onClick={()=>void change({memberId},'DELETE')} aria-label={`Retirar ${member.fullName} dos coordenadores`}><Trash2 size={14}/>Retirar</button>
     </div>;
    })}
    {!appointed.length&&!loading&&<p className="muted text-sm">Nenhum membro designado. Selecione alguém abaixo.</p>}
   </div>
  </div>
  <div className="rounded-xl p-4 border space-y-3" style={{borderColor:'var(--border)'}}>
   <label htmlFor="coordinator-search" className="label">Buscar na equipe</label>
   <input id="coordinator-search" className="input" type="search" placeholder="Nome ou diretoria..." value={search} onChange={e=>{setSearch(e.target.value);setChosenMember('')}}/>
   <label htmlFor="coordinator-member-select" className="label">Membro que vai coordenar a festa</label>
   <div className="flex flex-col sm:flex-row gap-2">
    <select id="coordinator-member-select" className="input min-w-0 flex-1" value={chosenMember} disabled={busy||!data} onChange={e=>setChosenMember(e.target.value)}>
     <option value="">{filtered.length?'Selecione um membro...':'Nenhum membro disponível'}</option>
     {filtered.map(m=><option key={m.id} value={m.id}>{m.fullName} — {m.department.name}</option>)}
    </select>
    <button type="button" className="btn shrink-0" disabled={!chosenMember||busy} onClick={()=>void change({memberId:chosenMember},'POST')}><UserPlus size={16}/>{busy?'Salvando...':'Adicionar coordenador'}</button>
   </div>
   {data&&!data.candidates.length&&<p className="muted text-sm">Cadastre membros ativos em <Link className="underline" href="/membros">Equipe</Link> para poder selecioná-los.</p>}
  </div>
  <details className="rounded-xl border p-4 space-y-2" style={{borderColor:'var(--border)'}}>
   <summary className="cursor-pointer font-semibold text-sm flex items-center gap-2"><ShieldCheck size={17}/>Acesso ao painel de presença e trocas (opcional)</summary>
   <p className="muted text-xs mt-3">Designar alguém como coordenador organiza a festa. Para registrar presença ou autorizar trocas no aplicativo, essa pessoa precisa de uma conta com perfil <strong>Coordenador</strong> vinculada ao evento. Um administrador pode criá-la em <strong>Acessos</strong>, vinculando o membro quando possível.</p>
   {unlinkedAccounts.map(({userId,user})=><div key={userId} className="flex items-center justify-between gap-2 py-2"><span className="text-sm">{user.name} · acesso concedido</span><button type="button" disabled={busy} className="btn btn-secondary text-xs !py-2" onClick={()=>void change({userId},'DELETE')}>Revogar</button></div>)}
   <div className="flex flex-col sm:flex-row gap-2 mt-3">
    <select className="input flex-1" aria-label="Conta de coordenador disponível" value={chosenAccount} disabled={busy||!data} onChange={e=>setChosenAccount(e.target.value)}>
     <option value="">{accountOptions.length?'Selecionar conta autorizada...':'Nenhuma conta disponível'}</option>
     {accountOptions.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
    <button type="button" className="btn btn-secondary" disabled={!chosenAccount||busy} onClick={()=>void change({userId:chosenAccount},'POST')}>Autorizar login</button>
   </div>
   {data&&!data.loginCandidates.length&&<p className="muted text-xs mt-2">Não há contas com perfil Coordenador. Peça ao administrador para criar uma em Acessos. Os nomes designados acima ficam salvos normalmente.</p>}
  </details>
 </section>;
}
