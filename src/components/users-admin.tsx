'use client';
import { useEffect, useState } from 'react';

type User = { id:string; name:string; email:string|null; username:string|null; role:string; memberId:string|null };
type Member = { id:string; fullName:string };
const roles = [
  ['ADMIN','Administrador (acesso total)'],
  ['PEOPLE','Gestão de Pessoas'],
  ['EVENT_COORDINATOR','Coordenador'],
  ['MEMBER','Membro operacional'],
  ['VIEWER','Consulta — só escalas publicadas'],
];
const initial = {name:'',email:'',username:'',role:'VIEWER',memberId:'',password:''};

export function UsersAdmin() {
  const [users,setUsers] = useState<User[]>([]);
  const [members,setMembers] = useState<Member[]>([]);
  const [form,setForm] = useState(initial);
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  async function reload() {
    const [u,m] = await Promise.all([fetch('/api/users'),fetch('/api/members?page=1')]);
    if(u.ok) setUsers(await u.json());
    if(m.ok) {
      const first = (await m.json()).data || [];
      const more = await fetch('/api/members?page=2');
      setMembers([...first,...(more.ok?(await more.json()).data:[])]);
    }
  }
  useEffect(()=>{ void reload(); },[]);

  async function adjust(user:User,role?:string) {
    const newPassword = role ? undefined : window.prompt('Nova senha provisória com 12 caracteres ou mais para '+user.name+':');
    if(!role && (!newPassword || newPassword.length<12))return;
    if(role && !window.confirm('Alterar permissão de '+user.name+' para '+role+'?'))return;
    setBusy(true);
    try {
      const r=await fetch('/api/users/'+user.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(role?{role}:{password:newPassword})});
      const data=await r.json();
      setMessage(r.ok?'Acesso atualizado.':data.error||'Não foi possível salvar.');
      await reload();
    } finally { setBusy(false); }
  }

  async function create(e:React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload={...form,memberId:form.role==='MEMBER'?(form.memberId||null):null};
      const res=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Não foi possível criar.');
      setMessage('Conta criada: '+(data.username||data.email)+'. Entregue a senha diretamente ao titular e peça para trocá-la.');
      setForm(initial);
      await reload();
    } catch(e) {setMessage(e instanceof Error?e.message:'Falha ao salvar.');}
    finally {setBusy(false);}
  }

  return <div className="space-y-6">
    <div>
      <p className="eyebrow">ACESSO CONTROLADO</p><h1 className="text-3xl font-black mt-2">Pessoas com login</h1>
      <p className="muted mt-2 text-sm">Contas de consulta só visualizam as escalas já publicadas. Administradores possuem acesso total.</p>
    </div>
    {message&&<p role="status" className="panel p-4">{message}</p>}
    <section className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
      <form onSubmit={create} className="panel p-5 space-y-3">
        <h2 className="font-bold text-xl">Criar novo acesso</h2>
        <label className="label" htmlFor="new-name">Nome</label>
        <input id="new-name" required className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <label className="label" htmlFor="new-username">Usuário (opcional)</label>
        <input id="new-username" className="input" autoCapitalize="none" spellCheck={false} placeholder="admin ou membro01" pattern="[A-Za-z][A-Za-z0-9._-]{2,29}" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
        <label className="label" htmlFor="new-email">E-mail (opcional se houver usuário)</label>
        <input id="new-email" type="email" className="input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <p className="muted text-xs">Informe um usuário, um e-mail ou ambos. Contas sem e-mail utilizam identificador interno que não recebe mensagens.</p>
        <label className="label" htmlFor="new-role">Permissão</label>
        <select id="new-role" className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value,memberId:''})}>
          {roles.map(([id,name])=><option value={id} key={id}>{name}</option>)}
        </select>
        {form.role==='MEMBER'&&<>
          <label className="label" htmlFor="new-member">Membro vinculado</label>
          <select id="new-member" className="input" value={form.memberId} onChange={e=>setForm({...form,memberId:e.target.value})}>
            <option value="">Selecione o membro...</option>{members.map(m=><option value={m.id} key={m.id}>{m.fullName}</option>)}
          </select>
        </>}
        {form.role==='VIEWER'&&<p className="text-xs rounded-xl p-3 bg-[#2a79fb18]">Somente leitura: a conta entra por <strong>“Entrar como membro”</strong> e nunca acessa rascunhos ou ferramentas de edição.</p>}
        <label className="label" htmlFor="new-password">Senha provisória (mínimo de 12 caracteres)</label>
        <input id="new-password" className="input" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
        <button disabled={busy} className="btn w-full">{busy?'Criando...':'Criar conta'}</button>
        <p className="muted text-xs">O sistema armazena somente o hash da senha. Oriente a pessoa a alterá-la no primeiro acesso.</p>
      </form>
      <section className="panel p-5">
        <h2 className="font-bold text-xl">Contas ativas</h2>
        <div className="space-y-2 mt-4">
          {users.map(u=><div key={u.id} className="rounded-xl border p-3" style={{borderColor:'var(--border)'}}>
            <p className="font-bold">{u.name}</p>
            <p className="muted text-xs">{u.username&&'@'+u.username}{u.username&&u.email?' · ':''}{u.email}</p>
            <div className="flex gap-2 flex-wrap items-center mt-2">
              <select aria-label={'Permissão de '+u.name} className="input !w-auto !min-h-9 text-xs" value={u.role} disabled={busy} onChange={e=>void adjust(u,e.target.value)}>
                {roles.map(([role,label])=><option value={role} key={role}>{label}</option>)}
              </select>
              <button className="btn btn-secondary text-xs" disabled={busy} onClick={()=>void adjust(u)}>Redefinir senha</button>
            </div>
          </div>)}
          {!users.length&&<p className="muted">Nenhum usuário encontrado.</p>}
        </div>
      </section>
    </section>
  </div>;
}
