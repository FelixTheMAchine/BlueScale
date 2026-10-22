import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
export type Principal = {id:string;role:string;memberId:string|null};
export class HttpError extends Error {constructor(public status:number,message:string){super(message)}}
export async function requireRole(allowed:string[]):Promise<Principal> {
 const session=await getServerSession(authOptions);
 if (!session?.user) throw new HttpError(401,'Faça login para continuar.');
 const live=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true,role:true,memberId:true}});
 if(!live)throw new HttpError(401,'Conta não encontrada ou revogada.');
 if (!allowed.includes(live.role)) throw new HttpError(403,'Seu perfil não pode executar esta operação.');
 return {id:live.id,role:live.role,memberId:live.memberId};
}
export const STAFF=['ADMIN','PEOPLE'];
export const TEAM=['ADMIN','PEOPLE','EVENT_COORDINATOR'];
export const ALL=['ADMIN','PEOPLE','EVENT_COORDINATOR','MEMBER'];
export function sameOrigin(req:NextRequest) {
 const origin=req.headers.get('origin');
 const url=new URL(req.url);
 // Bloqueia requisições cross-site em endpoints que mudam estado.
 if(origin && new URL(origin).host!==url.host) throw new HttpError(403,'Origem inválida.');
}
export async function jsonBody(req:NextRequest) {
 sameOrigin(req);
 if (!req.headers.get('content-type')?.includes('application/json')) throw new HttpError(415,'Envie JSON.');
 return req.json();
}
export function fail(error:unknown) {
 if (error instanceof HttpError) return NextResponse.json({error:error.message},{status:error.status});
 if(error instanceof Prisma.PrismaClientKnownRequestError && (error.code==='P2002'||error.code==='P2034')) return NextResponse.json({error:error.code==='P2002'?'Registro duplicado (verifique e-mail, identificador ou posto).':'Edição concorrente; tente novamente após atualizar.'},{status:409});
 if (error instanceof ZodError) return NextResponse.json({error:'Dados inválidos',details:error.issues.map(i=>({path:i.path.join('.'),message:i.message}))},{status:400});
 console.error('Falha de requisição:',error instanceof Error?error.message:'erro desconhecido');
 return NextResponse.json({error:'Não foi possível completar a operação.'},{status:500});
}
export function ok(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export function verifyMember(principal:Principal,memberId:string){
 if(principal.role==='MEMBER' && principal.memberId!==memberId) throw new HttpError(403,'Sem acesso a outro membro.');
}
