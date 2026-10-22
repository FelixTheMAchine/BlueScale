'use client';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Plus, UploadCloud, RefreshCcw, Search } from 'lucide-react';
type Dep={id:string;name:string};type Skill={id:string;name:string};type Member={id:string;identifier:string;fullName:string;email:string;status:string;department:{name:string};preference?:{preferredPeriod:string}};
const initial={identifier:'',fullName:'',email:'',departmentId:'',preferredPeriod:'ANY',commute:null as null | 'NEAR' | 'MEDIUM' | 'FAR',skillIds:[] as string[]};
export function MembersClient(){const[deps,setDeps]=useState<Dep[]>([]),[skills,setSkills]=useState<Skill[]>([]),[rows,setRows]=useState<Member[]>([]),[query,setQuery]=useState(''),[form,setForm]=useState(initial),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const [deptDraft,setDeptDraft]=useState(''),[deptError,setDeptError]=useState(''),[deptLoading,setDeptLoading]=useState(true),[deptSaving,setDeptSaving]=useState(false),[showDeptForm,setShowDeptForm]=useState(false);
 async function refresh(q=query){const r=await fetch(`/api/members?q=${encodeURIComponent(q)}`);if(r.ok)setRows((await r.json()).data||[])}
 async function loadDepartments(){
  setDeptLoading(true);setDeptError('');
  try{
   const response=await fetch('/api/departments',{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Não foi possível carregar as diretorias.');
   if(!Array.isArray(data))throw new Error('Resposta inválida ao carregar as diretorias.');
   setDeps(data);
  }catch(err){setDeptError(err instanceof Error?err.message:'Falha de conexão com as diretorias.');}
  finally{setDeptLoading(false);}
 }
 async function createDepartment(){
  const name=deptDraft.trim();
  if(name.length<2||name.length>80){setDeptError('Informe o nome da diretoria (2 a 80 caracteres).');return;}
  setDeptSaving(true);setDeptError('');
  try{
   const response=await fetch('/api/departments',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name}),
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Não foi possível criar a diretoria.');
   const newDep=result as Dep;
   setDeps(current=>[...current.filter(d=>d.id!==newDep.id),newDep].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));
   setForm(current=>({...current,departmentId:newDep.id}));
   setDeptDraft('');setShowDeptForm(false);
  }catch(err){setDeptError(err instanceof Error?err.message:'Falha ao cadastrar diretoria.');}
  finally{setDeptSaving(false);}
 }
 useEffect(()=>{void loadDepartments();void fetch('/api/skills').then(r=>r.ok?r.json():[]).then(data=>setSkills(Array.isArray(data)?data:[])).catch(()=>setSkills([]));void fetch('/api/members').then(r=>r.ok?r.json():{data:[]}).then(x=>setRows(x.data||[])).catch(()=>setRows([]));},[]);
 async function add(e:FormEvent){e.preventDefault();setBusy(true);setMsg('');try{const res=await fetch('/api/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const body=await res.json();if(!res.ok)throw new Error(body.error);setForm(initial);setOpen(false);setMsg('Membro cadastrado com sucesso.');await refresh();}catch(err){setMsg(err instanceof Error?err.message:'Erro ao cadastrar');}finally{setBusy(false)}}
 async function upload(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setBusy(true);setMsg('');try{const f=new FormData();f.set('file',file);const res=await fetch('/api/members/import',{method:'POST',body:f});const b=await res.json();if(!res.ok)throw new Error(b.error);setMsg(`${b.created} cadastrados. ${b.duplicates.length} duplicados ignorados. ${b.invalid.length} inválidos.`);await refresh();}catch(err){setMsg(err instanceof Error?err.message:'Erro ao importar')}finally{setBusy(false);e.target.value=''}}
 return <div className="space-y-5"><div className="flex justify-between gap-3 flex-wrap"><div><p className="eyebrow">EQUIPE</p><h1 className="text-3xl font-black mt-1">Membros</h1><p className="muted mt-2 text-sm">Pessoas, diretorias e preferências em ordem.</p></div><div className="flex gap-2 flex-wrap"><label className="btn btn-secondary cursor-pointer"><UploadCloud size={17}/>Importar CSV / XLSX<input type="file" accept=".csv,.xlsx" onChange={upload} className="sr-only" disabled={busy}/></label><button onClick={()=>setOpen(!open)} className="btn"><Plus size={18}/>Novo membro</button></div></div>
 {msg&&<p role="status" className="panel p-3 text-sm">{msg}</p>}
 {open&&<form onSubmit={add} className="panel p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><div><label className="label">Identificador *</label><input className="input" required value={form.identifier} onChange={e=>setForm({...form,identifier:e.target.value})}/></div><div><label className="label">Nome completo *</label><input className="input" required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></div><div><label className="label">E-mail *</label><input className="input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div className="space-y-2">
 <label className="label" htmlFor="member-department">Diretoria *</label>
 <select id="member-department" className="input" required disabled={deptLoading} value={form.departmentId} onChange={e=>setForm({...form,departmentId:e.target.value})}>
  <option value="">{deptLoading?'Carregando diretorias...':deps.length?'Selecione uma diretoria':'Nenhuma diretoria disponível'}</option>
  {deps.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
 </select>
 <div className="flex items-center flex-wrap gap-2">
  <button type="button" className="btn btn-secondary text-xs" disabled={busy||deptSaving} onClick={()=>{setShowDeptForm(current=>!current);setDeptError('')}}>
   <Plus size={15}/>Nova diretoria
  </button>
  <button type="button" className="text-xs underline" disabled={deptLoading} onClick={()=>void loadDepartments()}>Atualizar lista</button>
 </div>
 {showDeptForm&&<div className="flex items-center gap-2">
  <input aria-label="Nome da nova diretoria" className="input min-w-0 flex-1" type="text" maxLength={80} value={deptDraft} placeholder="Ex.: Comunicação" onChange={e=>setDeptDraft(e.target.value)}/>
  <button type="button" className="btn" disabled={deptSaving||deptDraft.trim().length<2} onClick={()=>void createDepartment()}>{deptSaving?'Salvando...':'Adicionar'}</button>
 </div>}
 {deptError&&<p role="alert" className="text-xs text-red-700">{deptError}</p>}
 {!deptLoading&&!deps.length&&!deptError&&<p className="text-xs muted">Não há diretorias cadastradas. Use "Nova diretoria" para adicionar a primeira.</p>}
 </div><div><label className="label">Preferência de horário</label><select className="input" value={form.preferredPeriod} onChange={e=>setForm({...form,preferredPeriod:e.target.value})}><option value="ANY">Sem preferência</option><option value="EARLY">Cedo</option><option value="MIDDLE">Intermediário</option><option value="LATE">Tarde</option></select></div><div><label className="label">Distância aproximada (opcional)</label><select className="input" value={form.commute||''} onChange={e=>setForm({...form,commute:(e.target.value||null) as typeof form.commute})}><option value="">Não informar</option><option value="NEAR">Perto</option><option value="MEDIUM">Média</option><option value="FAR">Longe</option></select></div><div className="sm:col-span-2"><span className="label">Habilitações</span><div className="flex flex-wrap gap-3">{skills.map(skill=><label key={skill.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.skillIds.includes(skill.id)} onChange={e=>setForm({...form,skillIds:e.target.checked?[...form.skillIds,skill.id]:form.skillIds.filter(k=>k!==skill.id)})}/>{skill.name}</label>)}</div></div><div className="flex items-end"><button disabled={busy} className="btn w-full">Salvar membro</button></div></form>}
 <div className="panel overflow-hidden"><div className="px-5 py-4 flex gap-3 items-center"><div className="flex items-center gap-2 border rounded-xl px-3 flex-1 max-w-[440px]" style={{borderColor:'var(--border)'}}><Search size={18} className="muted"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&refresh()} placeholder="Pesquisar por nome ou matrícula..." className="bg-transparent p-3 flex-1 outline-none text-sm"/></div><button className="btn btn-secondary" aria-label="Pesquisar" onClick={()=>refresh()}><RefreshCcw size={17}/></button></div><div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>Identificador</th><th>Diretoria</th><th>Preferência</th><th>Status</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td><strong>{m.fullName}</strong><p className="muted text-xs mt-1">{m.email}</p></td><td className="font-mono">{m.identifier}</td><td>{m.department.name}</td><td>{({EARLY:'Cedo',MIDDLE:'Intermediário',LATE:'Tarde',ANY:'Indiferente'} as Record<string,string>)[m.preference?.preferredPeriod||'ANY']}</td><td><span className="pill">{m.status==='ACTIVE'?'Ativo':m.status}</span></td></tr>)}</tbody></table>{!rows.length&&<p className="p-6 muted text-sm">Nenhum membro encontrado.</p>}</div></div>
 </div>}
