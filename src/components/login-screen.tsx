'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, ArrowLeft, BookOpenText, ShieldCheck } from 'lucide-react';

export function LoginScreen({ members = false }: { members?: boolean }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        identifier: identifier.trim(),
        password,
        portal: members ? 'members' : 'staff',
        redirect: false,
      });
      if (result?.error || !result?.ok) {
        setError(members ? 'Usuário ou senha inválidos para a área de membros.' : 'Usuário ou senha incorretos.');
        return;
      }
      router.replace(members ? '/publicadas' : '/');
      router.refresh();
    } catch {
      setError('Sem conexão. Verifique a internet e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b172d]">
    <div className="w-full max-w-[440px] bg-white text-[#1a2a49] rounded-3xl p-7 md:p-10 shadow-2xl">
      <Image src="/bluescale-das-logo.png" alt="BlueScale por DAs" width={220} height={170} priority className="mb-5 h-28 w-auto object-contain object-left" />
      <p className="eyebrow">{members ? 'PORTAL DE CONSULTA' : 'BEM-VINDO AO BLUESCALE'}</p>
      <h1 className="font-black text-3xl mt-2">{members ? 'Área dos membros' : 'Acesse sua conta'}</h1>
      <p className="text-[#71809c] text-sm mt-3 mb-7">
        {members ? 'Veja e baixe apenas escalas publicadas. Nenhuma alteração é permitida.' : 'Organize pessoas. Simplifique eventos.'}
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="identifier" className="label">E-mail ou usuário</label>
          <input id="identifier" className="input" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={members ? 'Seu usuário de consulta' : 'admin ou e-mail'} />
        </div>
        <div>
          <label htmlFor="password" className="label">Senha</label>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="btn w-full mt-3" type="submit">
          <LockKeyhole size={18} />{busy ? 'Verificando...' : members ? 'Consultar escalas publicadas' : 'Entrar no BlueScale'}
        </button>
      </form>

      {members ? <div className="mt-7 space-y-3">
        <p className="text-xs text-center text-[#71809c] flex items-center justify-center gap-1"><ShieldCheck size={15}/> Somente leitura. Solicite seu acesso à GP.</p>
        <Link href="/login" className="btn btn-secondary w-full justify-center"><ArrowLeft size={17}/>Voltar ao acesso da gestão</Link>
      </div> : <div className="mt-7 space-y-3">
        <div className="border-t border-[#d7e3f2] pt-5">
          <Link href="/login/membros" className="btn btn-secondary w-full justify-center">
            <BookOpenText size={19} />Entrar como membro
          </Link>
          <p className="text-xs mt-2 text-center text-[#71809c]">Consulte somente as planilhas que já foram publicadas.</p>
        </div>
        <p className="text-xs mt-5 text-center text-[#71809c]">Acesso da gestão restrito às contas autorizadas.</p>
      </div>}
    </div>
  </div>;
}
