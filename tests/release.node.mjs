import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSchedule,validateSchedule} from '../src/lib/scheduler/core.ts';
import {safeCsvCell,exportCsv} from '../src/lib/csv.ts';
const start='2026-11-01T20:00:00.000Z';
const end='2026-11-02T06:00:00.000Z';
const iso=n=>new Date(Date.parse(start)+n*60000).toISOString();
test('CSV não contém fórmula executável',()=>{
 for(const payload of ['=1+1','+SUM(A1)','-1+2','@cmd','  =WEBSERVICE("x")'])assert.ok(safeCsvCell(payload).startsWith('"\''),payload);
 assert.equal(safeCsvCell('Pessoa "Teste"'),'"Pessoa ""Teste"""');
 assert.ok(exportCsv([['Membro','Posto'],['DAs','=5+5']]).startsWith('\uFEFF'));
});
test('gerador não viola restrições em 60 cenários variáveis com 30 turnos',()=>{
 const rules={maxMinutesPerMember:240,maxShiftsPerMember:3,minRestMinutes:0};
 for(let scenario=0;scenario<60;scenario++){
  const members=Array.from({length:60},(_,i)=>({id:String(i),name:`Pessoa ${i}`,active:(i+scenario)%13!==0,skillIds:i%3===0?['BAR']:[],preferredPeriod:['EARLY','LATE','ANY'][i%3],commute:['FAR','MEDIUM','NEAR'][i%3],
   availability:(i+scenario)%8===0?[]:[{start:iso(0),end:iso(600),available:true}],historicalMinutes:i%4*90}));
  const slots=Array.from({length:30},(_,i)=>({id:String(i),start:iso(Math.floor(i/5)*90),end:iso((Math.floor(i/5)+1)*90),station:`Posto ${i%5}`,minPeople:i%7===0?3:2,idealPeople:3,skillIds:i%5===1?['BAR']:[],priority:1}));
  const a=generateSchedule(members,slots,rules);
  assert.deepEqual(validateSchedule(members,slots,rules,a.assignments),[],`scenario=${scenario}`);
  assert.equal(a.complete,a.uncovered.length===0);
  for(const s of slots){const count=a.assignments.filter(x=>x.shiftId===s.id).length;assert.ok(count<=s.idealPeople);}
 }
});
