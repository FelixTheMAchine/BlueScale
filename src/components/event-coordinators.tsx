'use client';
import {useEffect,useState} from 'react';
type User={id:string;name:string;role:string};
type Assigned={userId:string;user:{name:string}};
export function EventCoordinators({eventId}:{eventId:string}){
 const [candidates,setCandidates]=useState<User[]>([]),[assigned,setAssigned]=useState<Assigned[]>([]),[chosen,setChosen]=useState(''),[message,setMessage]=useState('');
 async function load(){const [u,a]=await Promise.all([fetch('/api/users'),fetch(`/api/events/${eventId}/coordinators`)]);if(u.ok)setCandidates((await u.json()).filter((x:User)=>x.role==='EVENT_COORDINATOR'));if(a.ok)setAssigned(await a.json());}
 useEffect(()=>{void load()},[eventId]);
 async function change(userId:string,method:'POST'|'DELETE'){const r=await fetch(`/api/events/${eventId}/coordinators`,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({userId})});const data=await r.json();setMessage(r.ok?'Acesso atualizado.':data.error||'Erro ao salvar.');await load();}
 return <section className="panel p-5 space-y-3"><div><p className="eyebrow">PERMISSÕES</p><h2 className="font-bold text-lg">Coordenadores desta festa</h2><p className="muted text-xs mt-1">Somente quem estiver nesta lista consegue registrar presença e analisar trocas deste evento.</p></div>
 <div className="space-y-2">{assigned.map(c=><div key={c.userId} className="flex justify-between items-center gap-3"><span className="text-sm">{c.user.name}</span><button className="btn btn-secondary text-xs" onClick={()=>void change(c.userId,'DELETE')}>Retirar</button></div>)}{!assigned.length&&<p className="muted text-sm">Nenhum coordenador designado.</p>}</div>
 <div className="flex gap-2"><select aria-label="Escolher coordenador" className="input" value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Selecionar coordenador...</option>{candidates.filter(c=>!assigned.some(a=>a.userId===c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button disabled={!chosen} className="btn" onClick={()=>void change(chosen,'POST')}>Adicionar</button></div>{message&&<p role="status" className="text-sm">{message}</p>}</section>;
}
