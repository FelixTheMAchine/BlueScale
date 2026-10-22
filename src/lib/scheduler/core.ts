/** Motor determinístico do MVP: nunca flexibiliza restrições rígidas. Sem dependências de framework. */
export type Period = 'EARLY' | 'MIDDLE' | 'LATE' | 'ANY';
export type MemberInput = {
 id: string; name: string; active: boolean; commute?: 'NEAR'|'MEDIUM'|'FAR'|null;
 preferredPeriod?: Period; skillIds: string[]; availability: {start: string; end: string; available: boolean}[];
 historicalMinutes?: number;
};
export type SlotInput = {
 id: string; station: string; start: string; end: string; minPeople: number;
 idealPeople: number; skillIds: string[]; priority?: number;
};
export type Rules = { maxMinutesPerMember: number; maxShiftsPerMember: number; minRestMinutes: number };
export type AssignmentInput = { memberId: string; shiftId: string; locked?: boolean };
export type CoverageIssue = { shiftId: string; station: string; start: string; end: string; needed: number; assigned: number; individuallyEligible: number; reason: string };
export type SolveResult = { assignments: AssignmentInput[]; uncovered: CoverageIssue[]; complete: boolean; score: number };
const minutes = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000;
const inside = (start: string, end: string, outerStart: string, outerEnd: string) => start >= outerStart && end <= outerEnd;
const intersects = (a: SlotInput, b: SlotInput, rest: number) => {
 const a0 = Date.parse(a.start), a1 = Date.parse(a.end), b0 = Date.parse(b.start), b1 = Date.parse(b.end);
 return a0 < b1 + rest * 60000 && b0 < a1 + rest * 60000;
};
const availabilityCovers = (m: MemberInput, s: SlotInput) => {
 const positive = m.availability.some(a => a.available && inside(s.start, s.end, a.start, a.end));
 const negatives = m.availability.some(a => !a.available && a.start < s.end && a.end > s.start);
 return positive && !negatives;
};
export function baseEligible(m: MemberInput, s: SlotInput): boolean {
 return m.active && minutes(s.start, s.end) > 0 && availabilityCovers(m,s) && s.skillIds.every(k => m.skillIds.includes(k));
}
export function assignmentError(m: MemberInput, s: SlotInput, assigned: AssignmentInput[], slots: SlotInput[], rules: Rules): string | null {
 if (!baseEligible(m,s)) return 'Membro indisponível, inativo ou sem habilitação';
 const mine = assigned.filter(a => a.memberId === m.id);
 if (mine.some(a => a.shiftId === s.id)) return 'Atribuição duplicada';
 if (mine.length >= rules.maxShiftsPerMember) return 'Limite de turnos excedido';
 const map = new Map(slots.map(x => [x.id,x]));
 if (minutes(s.start,s.end) + mine.reduce((total,a)=> total + (map.has(a.shiftId) ? minutes(map.get(a.shiftId)!.start,map.get(a.shiftId)!.end) : 0),0) > rules.maxMinutesPerMember) return 'Limite de horas excedido';
 if (mine.some(a => {const x=map.get(a.shiftId);return x && intersects(x,s,rules.minRestMinutes)})) return 'Sobreposição ou intervalo insuficiente';
 return null;
}
export function validateSchedule(members: MemberInput[], slots: SlotInput[], rules: Rules, assigned: AssignmentInput[]): string[] {
 const errors: string[] = [], ms = new Map(members.map(m => [m.id,m])), ss = new Map(slots.map(s => [s.id,s]));
 const checked: AssignmentInput[] = [];
 for (const a of assigned) {
  const m = ms.get(a.memberId), s = ss.get(a.shiftId);
  if (!m || !s) { errors.push(`Atribuição desconhecida: ${a.memberId}/${a.shiftId}`);continue; }
  const error = assignmentError(m,s,checked,slots,rules);
  if (error) errors.push(`${m.name} - ${s.station}: ${error}`);
  checked.push(a);
 }
 for (const s of slots) if (assigned.filter(a=>a.shiftId===s.id).length > s.idealPeople) errors.push(`${s.station}: excede capacidade ideal`);
 return errors;
}
function preferenceCost(m: MemberInput, s: SlotInput, slots: SlotInput[], assigned: AssignmentInput[]) {
 const times = [...new Set(slots.map(x=>x.start))].sort();
 const at = times.indexOf(s.start), fraction = times.length <= 1 ? 0.5 : at/(times.length-1);
 const period: Period = fraction < 0.34 ? 'EARLY' : fraction > 0.66 ? 'LATE' : 'MIDDLE';
 const preference = m.preferredPeriod && m.preferredPeriod!=='ANY' && m.preferredPeriod!==period ? 16 : 0;
 const commute = m.commute==='FAR' ? fraction*12 : m.commute==='NEAR' ? (1-fraction)*3 : 0;
 const assignedMinutes = assigned.filter(a=>a.memberId===m.id).reduce((n,a)=> {const slot=slots.find(x=>x.id===a.shiftId);return n + (slot ? minutes(slot.start,slot.end) : 0)},0);
 const equity = ((m.historicalMinutes||0)+assignedMinutes)/30;
 return preference + commute + equity;
}
/** Ordena as vagas mais escassas primeiro e tenta cobrir mínimo antes do ideal. */
export function generateSchedule(members: MemberInput[], slots: SlotInput[], rules: Rules, locked: AssignmentInput[] = []): SolveResult {
 const errors = validateSchedule(members,slots,rules,locked);
 if (errors.length) throw new Error(`Atribuições travadas inválidas: ${errors.join('; ')}`);
 const assigned = locked.map(a=>({...a, locked:true}));
 const candidates = (s:SlotInput) => members.filter(m=>baseEligible(m,s));
 const ordered = [...slots].sort((a,b) => candidates(a).length - candidates(b).length || (b.priority||0) - (a.priority||0) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
 const fill = (ideal:boolean) => {
  for (const s of ordered) {
   const target = ideal ? s.idealPeople : s.minPeople;
   while (assigned.filter(a=>a.shiftId===s.id).length < target) {
    const pool = candidates(s).filter(m=>!assignmentError(m,s,assigned,slots,rules))
      .sort((a,b) => preferenceCost(a,s,slots,assigned)-preferenceCost(b,s,slots,assigned) || a.id.localeCompare(b.id));
    if (!pool.length) break;
    assigned.push({memberId:pool[0].id,shiftId:s.id});
   }
  }
 };
 fill(false);
 // A cobertura mínima tem precedência absoluta sobre alocações opcionais.
 fill(true);
 const uncovered: CoverageIssue[] = slots.filter(s=>assigned.filter(a=>a.shiftId===s.id).length < s.minPeople)
  .map(s=>({shiftId:s.id,station:s.station,start:s.start,end:s.end,needed:s.minPeople,
   assigned:assigned.filter(a=>a.shiftId===s.id).length,individuallyEligible:candidates(s).length,
   reason:'Faltam membros aptos considerando disponibilidade, competências e conflitos entre turnos.'}));
 const score = assigned.reduce((total,a)=> {const s=slots.find(s=>s.id===a.shiftId),m=members.find(m=>m.id===a.memberId);return total+(s&&m?preferenceCost(m,s,slots,assigned):0)},0);
 return {assignments:assigned,uncovered,complete:uncovered.length===0,score:Math.round(score)};
}
