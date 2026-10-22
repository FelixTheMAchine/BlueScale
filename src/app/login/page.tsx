'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LockKeyhole } from 'lucide-react';
import Image from 'next/image';
const loginSchema=z.object({email:z.email('Informe um e-mail válido.'),password:z.string().min(1,'Informe a senha.')});
type LoginInput=z.infer<typeof loginSchema>;
export default function Login(){const router=useRouter();const [error,setError]=useState('');
 const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<LoginInput>({resolver:zodResolver(loginSchema)});
 async function submit(form:LoginInput){setError('');try{const result=await signIn('credentials',{email:form.email,password:form.password,redirect:false});if(result?.error){setError('E-mail ou senha incorretos.');return;}router.push('/');router.refresh();}catch{setError('Falha de conexão. Tente novamente.')}}
 return <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b172d]"><div className="w-full max-w-[430px] bg-white text-[#1a2a49] rounded-3xl p-8 md:p-10 shadow-2xl"><Image src="/bluescale-das-logo.png" alt="BlueScale — por DAs" width={230} height={230} priority className="mb-4 h-28 w-auto object-contain object-left"/><p className="eyebrow">BEM-VINDO AO BLUESCALE</p><h1 className="font-black text-3xl mt-2">Acesse sua conta</h1><p className="text-[#71809c] text-sm mt-3 mb-8">Organize pessoas. Simplifique eventos.</p>
 <form onSubmit={handleSubmit(submit)} className="space-y-4"><div><label htmlFor="email" className="label">E-mail</label><input className="input" type="email" id="email" autoComplete="username" {...register('email')}/>{errors.email&&<p role="alert" className="text-xs text-red-600 mt-1">{errors.email.message}</p>}</div><div><label htmlFor="password" className="label">Senha</label><input className="input" type="password" id="password" autoComplete="current-password" {...register('password')}/>{errors.password&&<p role="alert" className="text-xs text-red-600 mt-1">{errors.password.message}</p>}</div>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={isSubmitting} className="btn w-full mt-3" type="submit"><LockKeyhole size={18}/>{isSubmitting?'Verificando...':'Entrar no BlueScale'}</button></form><p className="text-xs mt-8 text-center text-[#71809c]">Acesso exclusivo para membros e gestores autorizados.</p></div></div>
}
