import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import { makeWorkbook } from '../src/lib/xlsx';
// Fábricas deliberadamente pequenas: esta suíte roda só após instalar ExcelJS.
describe('Excel',()=>{
 it('gera cinco abas com cabeçalhos e sem telefone',async()=>{
  const start=new Date('2026-10-24T23:00:00Z'),end=new Date('2026-10-25T00:30:00Z');
  const w={id:'w',name:'Portaria'},s={id:'s',workstation:w,startsAt:start,endsAt:end,minPeople:1},m={id:'m',fullName:'Ana Exemplo',phone:'NÃO EXPORTAR',department:{name:'Eventos'}};
  const e={id:'e',name:'Evento Demo',location:'Lugar fictício',startsAt:start,endsAt:end,shifts:[s]};
  const v={number:1,status:'DRAFT',assignments:[{memberId:'m',shiftId:'s',member:m,shift:s}],generations:[]};
  const raw=await makeWorkbook(e as never,v as never,{total:60,available:30});
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(raw));
  expect(wb.worksheets.map(x=>x.name)).toEqual(['Resumo do Evento','Escala Geral','Escala por Pessoa','Escala por Posto','Pendências']);
  expect(wb.getWorksheet('Escala Geral')?.getCell('D4').value).toBe('Ana Exemplo');
  const content=JSON.stringify(wb.worksheets.map(ws=>ws.getSheetValues()));expect(content).not.toContain('NÃO EXPORTAR');
 });
});
