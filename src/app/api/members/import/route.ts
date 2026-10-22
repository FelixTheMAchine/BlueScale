import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { STAFF, fail, ok, requireRole, HttpError, sameOrigin } from '@/lib/api';
import { memberSchema } from '@/lib/schemas';
import { parseCsv } from '@/lib/csv';
const str=(x:unknown)=>String(x??'').trim();
export async function POST(req:NextRequest){try{const u=await requireRole(STAFF);sameOrigin(req);const data=await req.formData();const f=data.get('file');if(!(f instanceof File))throw new HttpError(400,'Arquivo ausente.');if(f.size>1_500_000)throw new HttpError(413,'Máximo de 1,5 MB.');
 let records: string[][]=[];
 if(f.name.toLowerCase().endsWith('.csv')){const text=(await f.text()).replace(/^\uFEFF/,'');records=parseCsv(text);}
 else if(f.name.toLowerCase().endsWith('.xlsx')){const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(await f.arrayBuffer()));const ws=wb.worksheets[0];if(!ws)throw new HttpError(400,'Planilha vazia.');ws.eachRow(r=>records.push([1,2,3,4].map(i=>str(r.getCell(i).text))));}
 else throw new HttpError(400,'Envie CSV ou XLSX.');
 // Colunas: identificador,nome,email,diretoria. Cabeçalho opcional.
 if(records.length&&/identificador|matr[ií]cula/i.test(records[0][0]))records=records.slice(1);
 if(records.length>500)throw new HttpError(413,'Limite de 500 registros por importação.');
 const departments=await prisma.department.findMany();const ids=new Map(departments.map(d=>[d.name.toLowerCase(),d.id]));
 const duplicates:{line:number;identifier:string}[]=[],invalid:{line:number;reason:string}[]=[],createdIds:string[]=[];
 // Intencionalmente não mescla registros: duplicados exigem decisão humana.
 for(let i=0;i<records.length;i++){
  const [identifier,fullName,email,department]=records[i];const depId=ids.get(str(department).toLowerCase());
  const parsed=memberSchema.safeParse({identifier,fullName,email,departmentId:depId});
  if(!parsed.success){invalid.push({line:i+2,reason:'Campos inválidos ou diretoria não cadastrada'});continue;}
  try{const found=await prisma.member.findFirst({where:{OR:[{identifier:parsed.data.identifier},{email:parsed.data.email}]},select:{id:true}});if(found){duplicates.push({line:i+2,identifier:parsed.data.identifier});continue;}
   const m=await prisma.member.create({data:{identifier:parsed.data.identifier,fullName:parsed.data.fullName,email:parsed.data.email,departmentId:parsed.data.departmentId,preference:{create:{preferredPeriod:'ANY'}}}});createdIds.push(m.id);
  }catch{duplicates.push({line:i+2,identifier:parsed.data.identifier});}
 }
 await prisma.auditLog.create({data:{actorId:u.id,action:'IMPORT',entity:'Member',entityId:'batch',details:{created:createdIds.length,duplicates:duplicates.length,invalid:invalid.length}}});return ok({created:createdIds.length,duplicates,invalid});
 }catch(e){return fail(e)}}
