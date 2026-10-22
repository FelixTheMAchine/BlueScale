import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { fromZonedTime } from 'date-fns-tz';
const db=new PrismaClient();
async function main(){
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(), password=process.env.ADMIN_PASSWORD;
 if(!email||!password||password.length<12||password==='INSIRA_SENHA_FORTE_AQUI_12+')throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD segura (>=12 caracteres) no .env.');
 const admin=await db.user.upsert({where:{email},update:{passwordHash:await bcrypt.hash(password,12),role:'ADMIN'},create:{email,name:'Administração BlueScale',passwordHash:await bcrypt.hash(password,12),role:'ADMIN'}});
 if(process.env.NODE_ENV==='production'&&process.env.ALLOW_DEMO_SEED!=='YES_I_UNDERSTAND'){console.log('Base nova: criada somente a conta de administração. Seed fictício omitido em produção.');return;}
 const names=['Gestão de Pessoas','Eventos','Financeiro','E-sports','Marketing','DGE'];
 const departments=await Promise.all(names.map(name=>db.department.upsert({where:{name},update:{},create:{name}})));
 const skills=await Promise.all(['Operação de caixa','Bar treinado','Apoio operacional','Fechamento especializado'].map(name=>db.skill.upsert({where:{name},update:{},create:{name}})));
 const first=['Alice','Bruno','Camila','Daniel','Elisa','Felipe','Giovana','Henrique','Isabela','João'];const last=['Almeida','Barbosa','Castro','Duarte','Esteves','Ferreira'];
 let created=0;
 for(let i=0;i<60;i++){
  const fullName=`${first[i%10]} ${last[Math.floor(i/10)]}`;const identifier=`DEMO-${String(i+1).padStart(3,'0')}`;
  const member=await db.member.upsert({where:{identifier},update:{},create:{identifier,fullName,email:`demo.membro${i+1}@example.com`,departmentId:departments[i%6].id,
   commute:i%3===0?'FAR':i%3===1?'MEDIUM':'NEAR',region:i%3===0?'Região externa':i%3===1?'Centro ampliado':'Entorno',
   preference:{create:{preferredPeriod:i%4===0?'EARLY':i%4===1?'LATE':i%4===2?'MIDDLE':'ANY'}},
   skills:{create:i%6===0?[{skillId:skills[0].id},{skillId:skills[1].id}]:i%5===0?[{skillId:skills[1].id}]:[{skillId:skills[2].id}]}}});
  if(member)created++;
 }
 // Próximo sábado local, início 20h e término 04h do domingo.
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const base=new Date(`${today}T12:00:00Z`);const diff=(6-base.getUTCDay()+7)%7||7;base.setUTCDate(base.getUTCDate()+diff);const saturday=base.toISOString().slice(0,10);base.setUTCDate(base.getUTCDate()+1);const sunday=base.toISOString().slice(0,10);
 const startsAt=fromZonedTime(`${saturday}T20:00:00`,'America/Sao_Paulo');const endsAt=fromZonedTime(`${sunday}T04:00:00`,'America/Sao_Paulo');
 let event=await db.event.findFirst({where:{name:'Festa Demo BlueScale'}});
 if(!event)event=await db.event.create({data:{name:'Festa Demo BlueScale',description:'Cenário fictício para validação do MVP',location:'Centro de Eventos Fictício',startsAt,endsAt,status:'OPEN',maxMinutesPerMember:270,maxShiftsPerMember:3,minRestMinutes:0}});
 const all=await db.member.findMany({where:{identifier:{startsWith:'DEMO-'}},orderBy:{identifier:'asc'}});
 await db.memberSkill.upsert({where:{memberId_skillId:{memberId:all[0].id,skillId:skills[3].id}},update:{},create:{memberId:all[0].id,skillId:skills[3].id}});
 for(let i=0;i<all.length;i++){
  const m=all[i];const previous=await db.memberAvailability.count({where:{memberId:m.id,eventId:event.id}});if(previous)continue;
  if(i>=56)continue; // 4 indisponíveis
  const aStart=i>=40&&i<48?new Date(startsAt.getTime()+3*60*60000):startsAt;
  const aEnd=i>=48&&i<56?new Date(startsAt.getTime()+4*60*60000):endsAt;
  await db.memberAvailability.create({data:{memberId:m.id,eventId:event.id,startAt:aStart,endAt:aEnd,available:true}});
 }
 const demoPassword=process.env.DEMO_PASSWORD;
 if(process.env.NODE_ENV!=='production' && demoPassword && demoPassword.length>=12){
  const accounts=[{email:'gp.bluescale@example.com',name:'Gestão de Pessoas Demo',role:'PEOPLE' as const,memberId:null},
   {email:'coord.bluescale@example.com',name:'Coordenação Demo',role:'EVENT_COORDINATOR' as const,memberId:null},
   {email:'membro.bluescale@example.com',name:'Alice Demo',role:'MEMBER' as const,memberId:all[0].id}];
  const hash=await bcrypt.hash(demoPassword,12);
  for(const account of accounts)await db.user.upsert({where:{email:account.email},update:{passwordHash:hash,role:account.role,memberId:account.memberId},create:{...account,passwordHash:hash}});
 }
 const stations=[['Portaria',2,2,null],['Bilheteria',2,2,skills[0].id],['Bar',3,3,skills[1].id],['Organização',2,2,null],['Apoio',2,2,skills[2].id]] as const;
 for(const [name,minPeople,idealPeople,skillId] of stations){const exists=await db.workstation.findFirst({where:{eventId:event.id,name}});if(exists)continue;
  const w=await db.workstation.create({data:{eventId:event.id,name,minPeople,idealPeople,slotMinutes:90,startsAt,endsAt}});
  for(let ms=startsAt.getTime();ms<endsAt.getTime();ms+=90*60000){const shift=await db.shift.create({data:{eventId:event.id,workstationId:w.id,startsAt:new Date(ms),endsAt:new Date(Math.min(ms+90*60000,endsAt.getTime())),minPeople,idealPeople}});
   if(skillId)await db.shiftRequirement.create({data:{shiftId:shift.id,skillId}});
   // Cenário de conflito garantido: só um membro domina o fechamento especializado, mínimo de três no Bar.
   if(name==='Bar' && ms+90*60000>=endsAt.getTime())await db.shiftRequirement.create({data:{shiftId:shift.id,skillId:skills[3].id}});}
 }
 console.log(`Seed OK: admin ${admin.email}, ${created} membros fictícios, ${stations.length} postos, evento ${event.id}`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
