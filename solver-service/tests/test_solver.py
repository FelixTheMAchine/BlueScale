import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]))
from solver import optimize, valid_for, conflicts, duration

def case():
    start='2026-11-01T00:00:00.000Z'; mid='2026-11-01T01:30:00.000Z'; end='2026-11-01T03:00:00.000Z'
    full=[{'start':start,'end':end,'available':True}]
    return {'members':[{'id':x,'name':x,'active':True,'skillIds':[], 'availability':full,'preferredPeriod':'ANY','historicalMinutes':0} for x in ['a','b']],
            'slots':[{'id':'one','start':start,'end':mid,'station':'Portaria','minPeople':1,'idealPeople':1,'skillIds':[]},
                     {'id':'two','start':mid,'end':end,'station':'Bar','minPeople':1,'idealPeople':1,'skillIds':[]}],
            'rules':{'maxMinutesPerMember':180,'maxShiftsPerMember':2,'minRestMinutes':0},'locked':[]}

def assert_hard(data,result):
    assigned=result['assignments']
    for a in assigned:
        member=next(m for m in data['members'] if m['id']==a['memberId'])
        slot=next(s for s in data['slots'] if s['id']==a['shiftId'])
        assert valid_for(member,slot)
    for member in data['members']:
        mine=[next(s for s in data['slots'] if s['id']==a['shiftId']) for a in assigned if a['memberId']==member['id']]
        assert len(mine)<=data['rules']['maxShiftsPerMember']
        assert sum(duration(s['start'],s['end']) for s in mine)<=data['rules']['maxMinutesPerMember']
        for i,s in enumerate(mine):
            for other in mine[i+1:]:assert not conflicts(s,other,data['rules']['minRestMinutes'])

def test_two_slots_no_overlap():
    d=case();r=optimize(d);assert r['complete'];assert len(r['assignments'])==2;assert_hard(d,r)

def test_infeasible_reports_gap():
    d=case();d['members']=d['members'][:1];d['rules']['maxShiftsPerMember']=1
    r=optimize(d);assert not r['complete'];assert len(r['uncovered'])==1;assert_hard(d,r)

def test_skill_and_absence():
    d=case();d['slots'][0]['skillIds']=['manager'];d['members'][0]['skillIds']=['manager'];d['members'][0]['availability']=[{'start':d['slots'][1]['start'],'end':d['slots'][1]['end'],'available':True}]
    r=optimize(d);assert not r['complete'];assert_hard(d,r)

def test_locked_preservation():
    d=case();d['locked']=[{'memberId':'a','shiftId':'one','locked':True}]
    r=optimize(d);assert any(a['memberId']=='a' and a['shiftId']=='one' for a in r['assignments']);assert_hard(d,r)

def test_locked_invalid_raises():
    d=case();d['members'][0]['active']=False;d['locked']=[{'memberId':'a','shiftId':'one'}]
    try:optimize(d)
    except ValueError:return
    assert False,'Deveria rejeitar trava inválida'

def test_optimization_beats_arbitrary_on_commute():
    d=case();d['members'][0]['commute']='FAR';d['members'][0]['preferredPeriod']='EARLY'
    d['members'][1]['commute']='NEAR';d['members'][1]['preferredPeriod']='LATE'
    d['rules']['maxShiftsPerMember']=1
    r=optimize(d);assert_hard(d,r)
    assert {'memberId':'a','shiftId':'one','locked':False} in r['assignments']

def test_randomized_constraints():
    import random
    for seed in range(18):
        rng=random.Random(seed);d=case()
        d['members']=[{'id':str(i),'name':str(i),'active':rng.random()>.15,'skillIds':['bar'] if rng.random()>.5 else [],'availability':[{'start':d['slots'][0]['start'],'end':d['slots'][-1]['end'],'available':rng.random()>.2}], 'preferredPeriod':rng.choice(['ANY','EARLY','LATE']), 'historicalMinutes':rng.randrange(0,180,30)} for i in range(5)]
        d['slots'][1]['skillIds']=['bar']
        d['rules']['maxShiftsPerMember']=rng.choice([1,2]);d['rules']['maxMinutesPerMember']=rng.choice([90,180])
        r=optimize(d);assert_hard(d,r)
