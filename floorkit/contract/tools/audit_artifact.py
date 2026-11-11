"""Read-only source/export/integrity evidence; no RPC or credential reads."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parent.parent
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def leb(data,pos):
    value=shift=0
    while True:
        byte=data[pos];pos+=1;value|=(byte&127)<<shift
        if byte<128:return value,pos
        shift+=7
def string(data,pos):
    length,pos=leb(data,pos)
    return data[pos:pos+length].decode(),pos+length
def inspect(data):
    assert data[:8]==b'\0asm\x01\0\0\0'
    pos=8;exports=[];imports=[]
    while pos<len(data):
        section=data[pos];length,start=leb(data,pos+1);end=start+length
        if section==7:
            count,p=leb(data,start)
            for _ in range(count):
                name,p=string(data,p);kind=data[p];p+=1;index,p=leb(data,p)
                exports.append({'name':name,'kind':kind,'index':index})
        if section==2:
            count,p=leb(data,start)
            for _ in range(count):
                module,p=string(data,p);name,p=string(data,p);kind=data[p];p+=1
                assert kind==0, 'Review nonfunction import parser before accepting'
                _,p=leb(data,p);imports.append({'module':module,'name':name})
        pos=end
    return exports,imports
def base58(data):
    alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    n=int.from_bytes(data,'big');out=''
    while n:n,r=divmod(n,58);out=alphabet[r]+out
    return '1'*(len(data)-len(data.lstrip(b'\0')))+out

artifacts={}
for filename in ['floorkit.wasm','floorkit-fault.wasm','receiver.wasm']:
    path=ROOT/'artifacts'/filename
    digest=hashlib.sha256(path.read_bytes()).digest()
    exports,imports=inspect(path.read_bytes())
    artifacts[filename]={'sha256':digest.hex(),'near_code_hash':base58(digest),'bytes':path.stat().st_size,
                         'exports':exports,'imports':imports}
normal=artifacts['floorkit.wasm']
privileged_imports=[]
for forbidden in ['promise_batch_action_deploy_contract','promise_batch_action_add_key_with_full_access',
                  'promise_batch_action_add_key_with_function_call','promise_batch_action_delete_account',
                  'promise_batch_action_use_global_contract','promise_batch_action_deploy_global_contract']:
    if forbidden in [i['name'] for i in normal['imports']]:privileged_imports.append(forbidden)
protected=json.loads((REPO/'floorkit/research/REPOSITORY_SAFETY.json').read_text())['protected_sha256']
research=json.loads((ROOT/'evidence/INTEGRITY.json').read_text())['phase0_sha256']
changed=[p for p,h in {**protected,**research}.items() if sha(REPO/p)!=h]
assert not changed,changed
paths=[]
for pattern in ['src/*.rs','tests/*.rs','examples/*.rs','tools/*.py','tools/*.mjs','receiver/src/*.rs']:
    paths.extend(ROOT.glob(pattern))
paths.extend(ROOT/p for p in ['Cargo.toml','Cargo.lock','receiver/Cargo.toml','receiver/Cargo.lock','build.ps1','check.ps1','start-sandbox.sh','stop-sandbox.py','.gitignore','.gitattributes'])
result={'compiler':'rustc 1.99.1 (58cf8f9c3 2026-10-13)','near_sdk':'5.30.1','uint':'0.9.5','borsh':'1.8.1',
        'artifacts':artifacts,'source_sha256':{str(p.relative_to(ROOT)):sha(p) for p in sorted(paths)},
        'protected_preexisting_files':len(protected),'protected_phase0_files':len(research),
        'protected_files_unchanged':not changed,'changes':changed,
        'immutable':'NOT PROVEN: local disposable full-access keys retained; no public deployment',
        'initial_import_absence_assertion':'FAILED: promise_batch_action_deploy_contract is retained by SDK generic Promise dispatch; absence is NOT established',
        'privileged_imports_present':privileged_imports,
        'bytecode_action_reachability':'BLOCKED: import list is not a formal reachability proof. Source constructs only native transfer and bounded function-call actions; independent review still required',
        'review_scope':'Source action sites plus generated import/export inspection; not independent audit or formal compiler verification'}
(ROOT/'evidence/ARTIFACT_AUDIT.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('source_sha256','artifacts')},indent=2))
print(json.dumps({k:{n:a[n] for n in ['sha256','near_code_hash','bytes']} for k,a in artifacts.items()},indent=2))
