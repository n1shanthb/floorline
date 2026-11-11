"""Replay actual executed WASM operations through unchanged Phase 0 Coin.

Only normalized economic fields R/T/F/C are compared: real byte-cost H/K and
unobservable U/Q are NOT asserted equal to abstract Python storage/transport.
"""
import hashlib
import json
from pathlib import Path
import sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/'research'))
from model import Coin,Config,Reject,SCALE

data=json.loads((ROOT/'evidence/SANDBOX_RESULTS.json').read_text())
assert data['error'] is None, 'Runtime suite must pass before claiming parity'
coin=Coin(Config(initial_price=SCALE,markup_bps=500,tax_bps=2000,creator_fee_bps=100),
          reserve=10*SCALE,storage=SCALE,operational=5*SCALE)
coin.advance_time(1)
digest=hashlib.sha256()
rows=[e for e in data['evidence'] if e['name'].startswith('random_')]
assert len(rows)==64
def check(row,where):
    expected={'R':str(coin.r),'T':str(coin.t),'F':str(coin.f),'C':str(coin.c)}
    actual={k:row[where][k] for k in expected}
    assert actual==expected, json.dumps({'name':row['name'],'where':where,'expected':expected,'actual':actual})
for e in rows:
    check(e,'before')
    try:
        args=e['args']
        if e['method']=='mint':coin.mint('alice',int(e['deposit']),int(args['min_tokens']),int(args['deadline_ns']))
        elif e['method']=='redeem':coin.redeem('alice',int(args['amount']),int(args['min_near']),int(args['deadline_ns']))
        elif e['method']=='contribute':coin.contribute(int(e['deposit']))
        else:raise AssertionError('Unexpected method')
    except Reject:
        assert e['expected_failure'], e['name']
    else:
        assert not e['expected_failure'], e['name']
    check(e,'after')
    digest.update(json.dumps([e['name'],e['after']['R'],e['after']['T'],e['after']['F'],e['after']['C']]).encode())
result={'status':'PASS','scope':'64 actual WASM randomized economic operations, R/T/F/C only',
        'operations':len(rows),'failing_seeds':[], 'generator_seed':'0x464c4f4f',
        'trace_sha256':digest.hexdigest(),'wasm_sha256':data['normal_wasm_sha256'],
        'reference_model_sha256':hashlib.sha256((ROOT.parent/'research/model.py').read_bytes()).hexdigest(),
        'full_storage_transport_state_parity':'NOT CLAIMED: byte costs and environment-observed cash differ'}
(ROOT/'evidence/WASM_MODEL_PARITY.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
