import { generateSchedule, validateSchedule, baseEligible, type AssignmentInput, type MemberInput, type Rules, type SlotInput, type SolveResult } from './core';

export type OptimizedResult=SolveResult&{algorithm:string;optimal:boolean;fallbackReason?:string};
/** Optional private MILP service: reply always checked with TS hard constraint validator. */
export async function solveSchedule(members:MemberInput[],slots:SlotInput[],rules:Rules,locked:AssignmentInput[]):Promise<OptimizedResult>{
 const url=process.env.SOLVER_SERVICE_URL;
 const token=process.env.SOLVER_SERVICE_TOKEN;
 if(url&&token){
  try{
   const res=await fetch(new URL('/solve',url),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({members,slots,rules,locked}),signal:AbortSignal.timeout(45000),cache:'no-store'});
   if(!res.ok)throw new Error(`solver_http_${res.status}`);
   const result=await res.json() as OptimizedResult;
   if(!Array.isArray(result.assignments)||!Array.isArray(result.uncovered))throw new Error('Formato inválido do solver');
   // Security: never trust a microservice with permission to bypass hard constraints.
   const errors=validateSchedule(members,slots,rules,result.assignments);
   if(errors.length)throw new Error(`Solução inválida: ${errors.join('; ')}`);
   if(locked.some(l=>!result.assignments.some(a=>a.memberId===l.memberId&&a.shiftId===l.shiftId)))throw new Error('Solver removeu atribuição travada');
   const uncovered=slots.filter(s=>result.assignments.filter(a=>a.shiftId===s.id).length<s.minPeople)
    .map(s=>({shiftId:s.id,station:s.station,start:s.start,end:s.end,needed:s.minPeople,assigned:result.assignments.filter(a=>a.shiftId===s.id).length,
     individuallyEligible:members.filter(m=>baseEligible(m,s)).length,
     reason:'Cobertura mínima não alcançada pelas restrições de segurança e disponibilidade.'}));
   return {...result,complete:!uncovered.length,uncovered,algorithm:'scipy-milp-v1',optimal:result.optimal===true};
  }catch(e){
   const fallback=generateSchedule(members,slots,rules,locked);
   return {...fallback,algorithm:'deterministic-greedy-v1',optimal:false,fallbackReason:e instanceof Error?e.message:'Serviço de otimização indisponível'};
  }
 }
 return {...generateSchedule(members,slots,rules,locked),algorithm:'deterministic-greedy-v1',optimal:false};
}
