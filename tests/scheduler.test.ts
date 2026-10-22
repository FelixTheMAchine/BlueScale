import { describe, it, expect } from 'vitest';
import { generateSchedule, validateSchedule } from '../src/lib/scheduler/core';
import { parseCsv } from '../src/lib/csv';
const start='2026-10-24T20:00:00.000Z',end='2026-10-24T21:30:00.000Z';
const rules={maxMinutesPerMember:180,maxShiftsPerMember:2,minRestMinutes:0};
const m=(id:string)=>({id,name:id,active:true,skillIds:['caixa'],preferredPeriod:'ANY' as const,commute:'NEAR' as const,availability:[{start,end:'2026-10-25T05:00:00.000Z',available:true}]});
const s=(id:string)=>({id,station:'Caixa',start,end,minPeople:1,idealPeople:1,skillIds:['caixa']});
describe('motor de escala MVP',()=>{
 it('nunca produz atribuição inválida em cenários variados',()=>{
  for(let seed=1;seed<100;seed++){
   const members=Array.from({length:seed%8+1},(_,i)=>({...m(String(i)),active:(seed+i)%5!==0}));
   const slots=Array.from({length:seed%6+1},(_,i)=>({...s(String(i)),start:new Date(Date.parse(start)+i*90*60000).toISOString(),end:new Date(Date.parse(end)+i*90*60000).toISOString()}));
   const result=generateSchedule(members,slots,rules);
   expect(validateSchedule(members,slots,rules,result.assignments)).toEqual([]);
  }
 });
 it('identifica falta de pessoal sem inventar nomes',()=>{
  const result=generateSchedule([m('1')],[{...s('1'),minPeople:2,idealPeople:2}],rules);
  expect(result.uncovered[0].assigned).toBe(1);
 });
 it('rejeita atribuição travada não habilitada',()=>{
  expect(()=>generateSchedule([{...m('1'),skillIds:[]}],[s('1')],rules,[{memberId:'1',shiftId:'1'}])).toThrow();
 });
 it('CSV compreende nomes com vírgulas e separadores',()=>{
  expect(parseCsv('identificador;nome;email;diretoria\n1;"Silva, Ana";a@example.com;GP')).toHaveLength(2);
  expect(parseCsv('1,"Ana, Silva",a@example.com,GP')[0][1]).toBe('Ana, Silva');
 });
});
describe('fases futuras não contabilizadas como concluídas',()=>{
 it.todo('aprovação de troca de escala sob concorrência');
 it.todo('teste end-to-end de 2 administradores concorrentes');
 it.todo('regeneração com solver CP-SAT e equidade histórica');
});
