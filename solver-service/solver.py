"""BlueScale MILP: strict constraints, lexicographic coverage then weighted fairness.

SciPy HiGHS instead of OR-Tools CP-SAT because it is a verified available
mixed-integer backend in the test environment. Deploy independently.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from itertools import combinations
import numpy as np
from scipy import sparse
from scipy.optimize import milp, Bounds, LinearConstraint


def duration(start, end):
    return round((datetime.fromisoformat(end.replace('Z', '+00:00')) - datetime.fromisoformat(start.replace('Z', '+00:00'))).total_seconds() / 60)


def valid_for(member, shift):
    if not member.get('active') or duration(shift['start'], shift['end']) <= 0:
        return False
    if any(skill not in member['skillIds'] for skill in shift['skillIds']):
        return False
    positive = any(a['available'] and a['start'] <= shift['start'] and a['end'] >= shift['end'] for a in member['availability'])
    negative = any(not a['available'] and a['start'] < shift['end'] and a['end'] > shift['start'] for a in member['availability'])
    return positive and not negative


def conflicts(first, second, rest):
    a0 = datetime.fromisoformat(first['start'].replace('Z', '+00:00')).timestamp()
    a1 = datetime.fromisoformat(first['end'].replace('Z', '+00:00')).timestamp()
    b0 = datetime.fromisoformat(second['start'].replace('Z', '+00:00')).timestamp()
    b1 = datetime.fromisoformat(second['end'].replace('Z', '+00:00')).timestamp()
    return a0 < b1 + rest * 60 and b0 < a1 + rest * 60


def period_cost(member, shift, index, total):
    fraction = index / max(1, total - 1)
    period = 'EARLY' if fraction < .34 else 'LATE' if fraction > .66 else 'MIDDLE'
    pref = 20 if member.get('preferredPeriod', 'ANY') not in ('ANY', period, None) else 0
    commute = 12 * fraction if member.get('commute') == 'FAR' else 3 * (1 - fraction) if member.get('commute') == 'NEAR' else 0
    history = member.get('historicalMinutes', 0) / 100
    return pref + commute + history


def optimize(data):
    members = sorted(data['members'], key=lambda m: m['id'])
    shifts = sorted(data['slots'], key=lambda s: (s['start'], s['id']))
    rules = data['rules'];locked = data.get('locked') or []
    candidates = [(i, j) for i, m in enumerate(members) for j, s in enumerate(shifts) if valid_for(m, s)]
    pair_to_col = {p: k for k, p in enumerate(candidates)}
    n = len(candidates);slots_n = len(shifts);members_n = len(members)
    # Variables: binary eligible edges, uncovered integers, and absolute deviation hours.
    U = n; DPOS = n + slots_n; DNEG = DPOS + members_n; count = DNEG + members_n
    lb = np.zeros(count); ub = np.full(count, np.inf);integral = np.zeros(count)
    integral[:U + slots_n] = 1; ub[:U] = 1
    for j, s in enumerate(shifts): ub[U + j] = s['minPeople']
    for k in range(DPOS, count): ub[k] = 50000
    locked_keys = {(a['memberId'], a['shiftId']) for a in locked}
    for key in locked_keys:
        key_tuple = next(((i, j) for i,m in enumerate(members) for j,s in enumerate(shifts) if m['id'] == key[0] and s['id'] == key[1]), None)
        if key_tuple not in pair_to_col: raise ValueError('Atribuição travada é inelegível: %s/%s' % key)
        col=pair_to_col[key_tuple];lb[col] = ub[col] = 1
    rows=[];lows=[];highs=[]
    def row(coeff, lower=-np.inf, upper=np.inf):
        rows.append(coeff);lows.append(lower);highs.append(upper)
    for j, s in enumerate(shifts):
        edge={pair_to_col[(i, j)]:1.0 for i in range(members_n) if (i,j) in pair_to_col}
        row({**edge,U+j:1.0},s['minPeople'],np.inf)
        row(edge,-np.inf,s['idealPeople'])
    for i, m in enumerate(members):
        own=[(pair_to_col[(i,j)],j) for j in range(slots_n) if (i,j) in pair_to_col]
        row({col:1.0 for col,_ in own},-np.inf,rules['maxShiftsPerMember'])
        row({col:duration(shifts[j]['start'],shifts[j]['end']) for col,j in own},-np.inf,rules['maxMinutesPerMember'])
        for (col1,j),(col2,k) in combinations(own,2):
            if conflicts(shifts[j],shifts[k],rules['minRestMinutes']):row({col1:1.0,col2:1.0},-np.inf,1.0)
    # Relative equity via deviation from mean historical+expected hours; linearized L1.
    historical_avg = sum(m.get('historicalMinutes',0) for m in members) / max(1,members_n)
    expected = sum(s['minPeople']*duration(s['start'],s['end']) for s in shifts) / max(1,members_n)
    target = historical_avg + expected
    for i,m in enumerate(members):
        own={pair_to_col[(i,j)]:duration(shifts[j]['start'],shifts[j]['end']) for j in range(slots_n) if (i,j) in pair_to_col}
        # (worked+history) - target = positiveDeviation-negativeDeviation.
        row({**own,DPOS+i:-1.0,DNEG+i:1.0}, target - m.get('historicalMinutes',0),target-m.get('historicalMinutes',0))
    def constraints(extra=None):
        all_rows=rows + ([extra] if extra else [])
        A=sparse.lil_matrix((len(all_rows), count),dtype=float)
        for ri, coefficients in enumerate(all_rows):
            for ci, val in coefficients.items():A[ri,ci]=val
        return LinearConstraint(A.tocsr(),np.array(lows + ([0] if extra else [])),np.array(highs + ([0] if extra else [])))
    objective=np.zeros(count);objective[U:U+slots_n]=1
    primary=milp(objective, integrality=integral,bounds=Bounds(lb,ub),constraints=constraints(),options={'time_limit':18,'mip_rel_gap':0.0})
    if primary.x is None or primary.status != 0:
        raise RuntimeError('Nenhuma solução ótima comprovada para cobertura (status %s)' % primary.status)
    min_uncovered=int(round(sum(primary.x[U:U+slots_n])))
    final_objective=np.zeros(count)
    unique_starts=sorted(set(s['start'] for s in shifts))
    for (i,j), col in pair_to_col.items():
        final_objective[col]=period_cost(members[i],shifts[j],unique_starts.index(shifts[j]['start']),len(unique_starts)) + (col+1)/1000000
    for i in range(members_n):final_objective[DPOS+i]=final_objective[DNEG+i]=.2
    # Prefer minimum coverage gap lexicographically, then soft criteria.
    extra={U+j:1.0 for j in range(slots_n)}
    A=sparse.lil_matrix((len(rows)+1,count),dtype=float)
    for ri,c in enumerate(rows):
        for ci,v in c.items():A[ri,ci]=v
    for ci,v in extra.items():A[len(rows),ci]=v
    res=milp(final_objective,integrality=integral,bounds=Bounds(lb,ub),constraints=LinearConstraint(A.tocsr(),lows+[min_uncovered],highs+[min_uncovered]),options={'time_limit':18,'mip_rel_gap':0.0})
    if res.x is None or res.status != 0:res=primary
    assignments=[{'memberId':members[i]['id'],'shiftId':shifts[j]['id'],'locked':(members[i]['id'],shifts[j]['id']) in locked_keys} for (i,j),col in pair_to_col.items() if res.x[col]>.5]
    uncovered=[]
    for s in shifts:
        assigned=sum(a['shiftId']==s['id'] for a in assignments)
        if assigned<s['minPeople']:
            eligible=sum(valid_for(m,s) for m in members)
            uncovered.append({'shiftId':s['id'],'station':s['station'],'start':s['start'],'end':s['end'],'needed':s['minPeople'],'assigned':assigned,'individuallyEligible':eligible,'reason':'Cobertura mínima inviável com as restrições obrigatórias.'})
    return {'assignments':assignments,'uncovered':uncovered,'complete':not uncovered,'score':round(float(res.fun or 0)),'algorithm':'scipy-milp-v1','optimal':res.status==0}
