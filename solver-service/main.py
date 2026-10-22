"""Authenticated internal MILP HTTP service. Not exposed to public internet."""
import os
import hmac
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from solver import optimize
app=FastAPI(title='BlueScale Solver',docs_url=None,redoc_url=None,openapi_url=None)
class Payload(BaseModel):
    members:list[dict]
    slots:list[dict]
    rules:dict
    locked:list[dict]=[]
@app.get('/health')
def health(): return {'healthy':True,'optimizer':'SciPy MILP'}
@app.post('/solve')
def solve(body:Payload,authorization:str|None=Header(None)):
    token=os.getenv('SOLVER_SERVICE_TOKEN')
    if not token or not authorization or not hmac.compare_digest(authorization,'Bearer '+token):
        raise HTTPException(status_code=401,detail='Não autorizado')
    if len(body.members)>1000 or len(body.slots)>500 or len(body.locked)>500:
        raise HTTPException(status_code=413,detail='Evento excede limite do serviço')
    try:return optimize(body.model_dump())
    except (RuntimeError,ValueError) as e:raise HTTPException(status_code=422,detail=str(e)) from e
