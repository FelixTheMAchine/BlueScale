/* BlueScale DAs — Demo engine (browser + Node). Dados locais, nenhuma conta ou servidor. */
(function(root){
'use strict';
const DAY=86400000, HOUR=3600000, MIN=60000;
const departments=['Gestão de Pessoas','Eventos','Financeiro','E-sports','Marketing','DGE'];
const posts=[{id:'portaria',name:'Portaria',min:2,skill:null,priority:2,color:'#55a9ff'},{id:'bilheteria',name:'Bilheteria',min:2,skill:'caixa',priority:3,color:'#ad91ff'},{id:'bar',name:'Bar',min:3,skill:'bar',priority:4,color:'#34d8cf'},{id:'organizacao',name:'Organização',min:2,skill:null,priority:3,color:'#ffbc69'},{id:'apoio',name:'Apoio',min:2,skill:'apoio',priority:1,color:'#fe7d99'}];
const parse=(local)=>{const v=new Date(local+':00-03:00').getTime();return Number.isFinite(v)?v:NaN};
const shortTime=(ms)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(ms);
const shortDate=(ms)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'short'}).format(ms);
const dateTime=(ms)=>`${shortDate(ms)} • ${shortTime(ms)}`;
const nextSaturday=()=>{const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(Date.now());let date=new Date(today+'T12:00:00Z');let diff=(6-date.getUTCDay()+7)%7||7;date.setUTCDate(date.getUTCDate()+diff);return date.toISOString().slice(0,10)};
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
function seed(){const d=nextSaturday(), start=`${d}T20:00`, end=new Date(Date.parse(d+'T12:00:00Z')+DAY).toISOString().slice(0,10)+'T04:00';
 const first=['Alice','Bruno','Camila','Daniel','Elisa','Felipe','Giovana','Henrique','Isabela','João'];const last=['Almeida','Barbosa','Castro','Duarte','Esteves','Ferreira'];
 const members=Array.from({length:60},(_,i)=>({id:'M'+String(i+1).padStart(3,'0'),name:first[i%10]+' '+last[Math.floor(i/10)],dept:departments[i%6],email:'demo'+(i+1)+'@example.com',active:true,commute:['FAR','MEDIUM','NEAR'][i%3],period:['EARLY','LATE','MIDDLE','ANY'][i%4],skills:[...(i%6===0||i%7===0?['caixa']:[]),...(i%5===0||i%4===0?['bar']:[]),...(i%3!==1?['apoio']:[]),...(i===0?['fechamento']:[])],available:i<56,availStart:i>=40&&i<48?3:0,availEnd:i>=48&&i<56?4:8,historical:i%5*90}));
 return {schema:1,created:Date.now(),theme:'dark',accent:'electric',maxMinutes:270,maxShifts:3,minRest:0,members,events:[{id:'EV-DEMO',name:'Festa da Atlética',location:'Centro de Eventos • Demo',start,end,posts:posts.map(p=>({...p})),slotMinutes:90,status:'OPEN',assignments:[],revision:0,generated:false,includeConflict:true}],selected:'EV-DEMO'};
}
const getSlots=(ev)=>{const from=parse(ev.start),to=parse(ev.end);if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>48*HOUR)return [];
 const duration=Math.max(15,Math.min(240,Number(ev.slotMinutes)||90))*MIN;
 return ev.posts.flatMap(p=>{const arr=[];for(let t=from,i=0;t<to;t+=duration,i++)arr.push({id:p.id+'-'+i,postId:p.id,post:p.name,start:t,end:Math.min(to,t+duration),min:Number(p.min)||1,skill:p.skill,priority:p.priority||1,closingRequired:Boolean(ev.includeConflict&&p.id==='bar'&&t+duration>=to)});return arr});};
const overlap=(a,b,rest)=>a.start<b.end+rest*MIN&&b.start<a.end+rest*MIN;
function issueFor(m,s,arr,slots,rules){if(!m||!m.active)return 'Pessoa inativa ou não encontrada';if(!m.available)return 'Sem disponibilidade informada';
 const dayStart=Math.min(...slots.map(z=>z.start));const spanStart=dayStart+Number(m.availStart||0)*HOUR,spanEnd=dayStart+Number(m.availEnd??8)*HOUR;
 if(s.start<spanStart||s.end>spanEnd)return 'Fora da disponibilidade informada';if(s.skill&&!m.skills.includes(s.skill))return 'Não possui a competência exigida';if(s.closingRequired&&!m.skills.includes('fechamento'))return 'Não habilitado para o fechamento especializado';
 const mine=arr.filter(a=>a.memberId===m.id).map(a=>slots.find(z=>z.id===a.slotId)).filter(Boolean);
 if(mine.some(x=>x.id===s.id))return 'Membro já atribuído';
 if(mine.length >= Number(rules.maxShifts||3))return 'Limite de turnos atingido';
 if(mine.reduce((sum,x)=>sum+x.end-x.start, s.end-s.start)>Number(rules.maxMinutes||270)*MIN)return 'Limite de horas excedido';
 if(mine.some(x=>overlap(x,s,Number(rules.minRest||0))))return 'Turnos simultâneos ou intervalo insuficiente';return null;}
function errors(state,ev,assigned,slots=getSlots(ev)){const errs=[];
 for(let i=0;i<assigned.length;i++){const a=assigned[i],s=slots.find(x=>x.id===a.slotId),m=state.members.find(x=>x.id===a.memberId);if(!s){errs.push('Turno inexistente');continue;}const error=issueFor(m,s,assigned.slice(0,i),slots,state);if(error)errs.push(`${m?.name||a.memberId}: ${error}`);}
 for(const s of slots){const c=assigned.filter(a=>a.slotId===s.id).length;if(c>s.min)errs.push(`${s.post}: acima da capacidade ${s.min}`);}return errs;}
function desirability(m,s,slots,arr,weights){const times=[...new Set(slots.map(x=>x.start))].sort((a,b)=>a-b),idx=times.indexOf(s.start),f=times.length>1?idx/(times.length-1):0.5,period=f<.34?'EARLY':f>.66?'LATE':'MIDDLE';
 const pref=m.period==='ANY'||m.period===period?0:26;
 const commute=m.commute==='FAR'?Math.round(18*f):m.commute==='NEAR'?Math.round(6*(1-f)):0;
 const minutesWorked=arr.filter(a=>a.memberId===m.id).reduce((n,a)=>{const z=slots.find(x=>x.id===a.slotId);return n+(z?z.end-z.start:0)/MIN},0);
 const equity=((Number(m.historical)||0)+minutesWorked)/40;
 return pref*(weights?.period??.25)+commute*(weights?.commute??.20)+equity*(weights?.equity??.35);}
function generate(state,ev,{preserveLocked=true}={}){const slots=getSlots(ev),locked=preserveLocked?ev.assignments.filter(a=>a.locked):[],invalid=errors(state,ev,locked,slots);if(invalid.length)throw new Error('Atribuições travadas inválidas: '+invalid[0]);
 const arr=locked.map(x=>({...x}));const eligible=(s)=>state.members.filter(m=>!issueFor(m,s,[],slots,state));
 const sorted=[...slots].sort((a,b)=>eligible(a).length-eligible(b).length || b.priority-a.priority || a.start-b.start || a.id.localeCompare(b.id));
 for(const s of sorted){while(arr.filter(a=>a.slotId===s.id).length<s.min){const choices=eligible(s).filter(m=>!issueFor(m,s,arr,slots,state)).sort((a,b)=>desirability(a,s,slots,arr)-desirability(b,s,slots,arr)||a.id.localeCompare(b.id));if(!choices.length)break;arr.push({slotId:s.id,memberId:choices[0].id,locked:false,confirmed:false});}}
 const invalidAfter=errors(state,ev,arr,slots);if(invalidAfter.length)throw new Error('Validação de segurança: '+invalidAfter[0]);return arr;}
function coverage(ev,slots=getSlots(ev)){const need=slots.reduce((n,s)=>n+s.min,0),filled=slots.reduce((n,s)=>n+Math.min(s.min,ev.assignments.filter(a=>a.slotId===s.id).length),0),issues=slots.filter(s=>ev.assignments.filter(a=>a.slotId===s.id).length<s.min).map(s=>({...s,have:ev.assignments.filter(a=>a.slotId===s.id).length}));return {need,filled,percent:need?Math.round(100*filled/need):0,issues};}
function stats(state,ev){const slots=getSlots(ev),coverageData=coverage(ev,slots),ids=new Set(ev.assignments.map(a=>a.memberId));const hours=state.members.filter(m=>ids.has(m.id)).map(m=>ev.assignments.filter(a=>a.memberId===m.id).reduce((n,a)=>{const s=slots.find(z=>z.id===a.slotId);return n+(s?s.end-s.start:0)/HOUR},0));return {...coverageData,people:ids.size,slots:slots.length,average:hours.length?hours.reduce((a,b)=>a+b,0)/hours.length:0,available:state.members.filter(m=>m.available&&m.active).length};}
root.BlueScaleEngine={seed,getSlots,parse,shortTime,shortDate,dateTime,uid,issueFor,errors,generate,coverage,stats,departments,posts};
if(typeof module!=='undefined'&&module.exports)module.exports=root.BlueScaleEngine;
})(typeof window!=='undefined'?window:globalThis);
