import ExcelJS from 'exceljs';
import { formatInTimeZone } from 'date-fns-tz';
import { statusText } from './labels';
import type { Event, ScheduleVersion, ShiftAssignment, Confirmation, Member, Department, Shift, Workstation, ScheduleGeneration } from '@prisma/client';
type Row = ShiftAssignment & {confirmation:Confirmation|null;member:Member & {department:Department};shift:Shift & {workstation:Workstation}};
type Version=ScheduleVersion & {assignments:Row[];generations:ScheduleGeneration[]};
type EventReport=Event & {shifts:(Shift & {workstation:Workstation})[]};
const time=(d:Date)=>formatInTimeZone(d,'America/Sao_Paulo','dd/MM/yyyy HH:mm');
const duration=(a:Date,b:Date)=>Math.round((b.getTime()-a.getTime())/60000);
const colors=['2478FF','6C5CE7','0E9384','E58125','C0392B','2B7BBA'];
export async function makeWorkbook(event:EventReport,version:Version,stats:{total:number;available:number}) {
 const wb=new ExcelJS.Workbook();wb.creator='BlueScale · DAs';wb.created=new Date();wb.title=`BlueScale — ${event.name}`;
 const stations=[...new Set(event.shifts.map(s=>s.workstation.name))].sort();
 const stationColor=(name:string)=>colors[Math.max(0,stations.indexOf(name))%colors.length];
 const sheet=(name:string,heads:string[],rows:(string|number)[][])=>{
  const ws=wb.addWorksheet(name,{views:[{state:'frozen',ySplit:3}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1}});
  ws.mergeCells(1,1,1,heads.length);ws.getCell(1,1).value=`BLUESCALE  •  DAs  •  ${event.name.toUpperCase()}`;
  ws.getCell(1,1).font={name:'Aptos Display',size:16,bold:true,color:{argb:'FFFFFFFF'}};
  ws.getCell(1,1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF10203B'}};
  ws.mergeCells(2,1,2,heads.length);ws.getCell(2,1).value=`Versão ${version.number} · ${statusText[version.status]||version.status} · Gerado ${time(new Date())} · Brasília`;
  ws.getCell(2,1).font={size:10,color:{argb:'FF475569'}};
  ws.addRow(heads);for(const r of rows)ws.addRow(r);
  const header=ws.getRow(3);header.height=24;header.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1955B5'}};c.alignment={vertical:'middle'}});
  ws.autoFilter={from:{row:3,column:1},to:{row:3,column:heads.length}};
  ws.columns.forEach((col,i)=>{col.width=Math.min(55,Math.max(16,heads[i].length+8,...rows.map(r=>String(r[i]??'').length+2)))});
  ws.eachRow((row,index)=>{if(index>3){row.height=21;row.eachCell(c=>{c.alignment={vertical:'middle'};if(index%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F6FD'}};});}});
  ws.pageSetup.printTitlesRow='1:3';return ws;
 };
 const assignments=version.assignments.slice().sort((a,b)=>a.shift.startsAt.getTime()-b.shift.startsAt.getTime()||a.shift.workstation.name.localeCompare(b.shift.workstation.name));
 const unique=new Set(assignments.map(a=>a.memberId));
 const all=new Set(event.shifts.map(s=>s.id));const covered=event.shifts.filter(s=>assignments.filter(a=>a.shiftId===s.id).length>=s.minPeople).length;
 const summary=sheet('Resumo do Evento',['Indicador','Valor'],[
  ['Evento',event.name],['Local',event.location],['Início',time(event.startsAt)],['Fim',time(event.endsAt)],
  ['Total de membros cadastrados',stats.total],['Membros disponíveis',stats.available],['Pessoas escaladas',unique.size],['Disponíveis não escalados',Math.max(0,stats.available-unique.size)],['Turnos',all.size],['Turnos com cobertura mínima',covered],['Cobertura (%)',all.size?Math.round(100*covered/all.size):0],['Versão',version.number],...stations.map(s=>[`Legenda · ${s}`,`Posto ${stations.indexOf(s)+1}`])
 ]);
 stations.forEach((s,i)=>{const row=summary.getRow(16+i);row.getCell(1).font={bold:true,color:{argb:`FF${stationColor(s)}`}};});
 const geral=sheet('Escala Geral',['Início','Fim','Posto','Membro','Diretoria','Minutos','Confirmação'],assignments.map(a=>[time(a.shift.startsAt),time(a.shift.endsAt),a.shift.workstation.name,a.member.fullName,a.member.department.name,duration(a.shift.startsAt,a.shift.endsAt),a.confirmation?.status==='CONFIRMED'?'Confirmado':a.confirmation?.status==='DECLINED'?'Recusado':'Pendente']));
 geral.getColumn(3).eachCell((cell,n)=>{if(n>3&&typeof cell.value==='string'){cell.font={bold:true,color:{argb:`FF${stationColor(cell.value)}`}};}});
 const byMember=[...unique].map(id=>{const rows=assignments.filter(a=>a.memberId===id),m=rows[0].member;return [m.fullName,m.department.name,rows.map(r=>`${time(r.shift.startsAt)}: ${r.shift.workstation.name}`).join(' | '),rows.reduce((n,a)=>n+duration(a.shift.startsAt,a.shift.endsAt),0)] as (string|number)[]});
 sheet('Escala por Pessoa',['Membro','Diretoria','Turnos','Total (min)'],byMember);
 const posto=sheet('Escala por Posto',['Posto','Início','Fim','Mínimo','Alocados','Responsável'],event.shifts.map(s=>[s.workstation.name,time(s.startsAt),time(s.endsAt),s.minPeople,assignments.filter(a=>a.shiftId===s.id).length,'Gestão de Pessoas']));
 if(event.shifts.length)posto.addConditionalFormatting({ref:`E4:E${3+event.shifts.length}`,rules:[{type:'expression',priority:1,formulae:['E4<D4'],style:{fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FFFFE5E5'}}}}]});
 const uncovered=event.shifts.filter(s=>assignments.filter(a=>a.shiftId===s.id).length<s.minPeople);
 sheet('Pendências',['Posto','Início','Mínimo','Alocados','Situação'],uncovered.map(s=>[s.workstation.name,time(s.startsAt),s.minPeople,assignments.filter(a=>a.shiftId===s.id).length,'Cobertura insuficiente']));
 const buffer=await wb.xlsx.writeBuffer();return buffer;
}
