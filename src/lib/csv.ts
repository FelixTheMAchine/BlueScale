/** Parser CSV simples RFC 4180 para importação delimitada por vírgula ou ponto e vírgula. */
export function parseCsv(text: string): string[][] {
 const sample=text.split(/\r?\n/,1)[0]||'';
 const sep=sample.includes(';')?';':',';
 const rows:string[][]=[],row:string[]=[];let field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(quoted&&text[i+1]==='"'){field+='"';i++;}
   else quoted=!quoted;
  } else if(c===sep&&!quoted){row.push(field.trim());field='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))rows.push([...row]);row.length=0;field='';}
  else field+=c;
 }
 if(quoted)throw new Error('CSV com aspas não fechadas.');row.push(field.trim());if(row.some(Boolean))rows.push(row);return rows;
}
/** CSV export: neutraliza fórmulas que softwares de planilha executariam. */
export function safeCsvCell(value:unknown):string {
 let text=String(value??'');
 if(/^[\s\t\r\n]*[=+\-@]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
export function exportCsv(rows:(string|number)[][]){return '\uFEFF'+rows.map(row=>row.map(safeCsvCell).join(';')).join('\r\n')+'\r\n'}
