#!/usr/bin/env python3
"""Phase 2G Adversarial Security Test"""
import os, json, subprocess, uuid
from datetime import datetime

def curl(m, u, d=None, h=None, t=15):
    c = ["curl","-s","-w","\n%{http_code}","-X",m,u]
    if d: c += ["-H","Content-Type: application/json","-d",json.dumps(d)]
    if h:
        for k,v in h.items(): c += ["-H",f"{k}: {v}"]
    c += ["--max-time",str(t)]
    r = subprocess.run(c, capture_output=True, text=True)
    l = r.stdout.strip().rsplit("\n",1)
    b,s = (l if len(l)==2 else (r.stdout.strip(), r.returncode))
    return {"sc":int(s) if s.isdigit() else None,"b":b,"ts":datetime.utcnow().isoformat()}

B = os.environ.get("BACKEND_URL","https://devos-backend-f3ub.onrender.com")
P = f"{B}/api/v1"
R = {"ts":datetime.utcnow().isoformat(),"b":B,"t":[],"s":{"p":0,"f":0,"b":0}}

print(f"Phase 2G Adversarial Test - {B}\n")

r = curl("POST",f"{P}/auth/register",{"email":f"ua-{uuid.uuid4().hex[:6]}@t.local","password":"T123!","name":"A"})
TA = json.loads(r["b"]).get("data",{}).get("token") if r["sc"]==200 else None
print(f"A reg: {'OK' if r['sc']==200 else 'FAIL'} {r['sc']}")
if not TA: sys.exit(1)

r = curl("POST",f"{P}/auth/register",{"email":f"ub-{uuid.uuid4().hex[:6]}@t.local","password":"T456!","name":"B"})
TB = json.loads(r["b"]).get("data",{}).get("token") if r["sc"]==200 else None
print(f"B reg: {'OK' if r['sc']==200 else 'FAIL'} {r['sc']}")
if not TB: sys.exit(1)

r = curl("POST",f"{P}/projects",{"name":f"PA-{uuid.uuid4().hex[:4]}","repo":f"https://github.com/a/{uuid.uuid4().hex[:6]}"},h={"Authorization":f"Bearer {TA}"})
PA = json.loads(r["b"]).get("data",{}).get("project",{}).get("id") if r["sc"]==200 else None
print(f"ProjA: {'OK' if r['sc']==200 else 'FAIL'} {r['sc']}")

r = curl("POST",f"{P}/projects",{"name":f"PB-{uuid.uuid4().hex[:4]}","repo":f"https://github.com/b/{uuid.uuid4().hex[:6]}"},h={"Authorization":f"Bearer {TB}"})
PB = json.loads(r["b"]).get("data",{}).get("project",{}).get("id") if r["sc"]==200 else None
print(f"ProjB: {'OK' if r['sc']==200 else 'FAIL'} {r['sc']}")

print("\n--- CROSS-USER ---")
if PB:
    r = curl("GET",f"{P}/projects/{PB}",h={"Authorization":f"Bearer {TA}"})
    ok=r["sc"] in [403,404]; R["t"].append({"n":"A→B","r":"OK" if ok else "FAIL","d":str(r["sc"])}); R["s"]["b" if ok else "f"]+=1
    print(f"A→B: {'BLOCKED' if ok else 'GRANTED'} {r['sc']}")
if PA:
    r = curl("GET",f"{P}/projects/{PA}",h={"Authorization":f"Bearer {TB}"})
    ok=r["sc"] in [403,404]; R["t"].append({"n":"B→A","r":"OK" if ok else "FAIL","d":str(r["sc"])}); R["s"]["b" if ok else "f"]+=1
    print(f"B→A: {'BLOCKED' if ok else 'GRANTED'} {r['sc']}")

print("\n--- PATH TRAVERSAL ---")
if PA and TA:
    r = curl("POST",f"{P}/executions",{"cmd":"echo","args":["T"],"pid":PA,"wd":"../../../etc","type":"COMMAND","ws":PA},h={"Authorization":f"Bearer {TA}"})
    ok=r["sc"] in [400,403,422]; R["t"].append({"n":"PathTrav","r":"OK" if ok else "FAIL","d":str(r["sc"])}); R["s"]["b" if ok else "f"]+=1
    print(f"../..: {'BLOCKED' if ok else 'OK' if r['sc']==200 else '?'} {r['sc']}")

print("\n--- BLOCKED CMDS ---")
if PA and TA:
    for cmd,args,desc in [("rm",["-rf","/"],"rm-rf"),("shutdown",["-h","now"],"shutdown")]:
        r = curl("POST",f"{P}/executions",{"cmd":cmd,"args":args,"pid":PA,"wd":".","type":"COMMAND","ws":PA},h={"Authorization":f"Bearer {TA}"})
        ok=r["sc"] in [400,403,422] or "BLOCKED" in r["b"]; R["t"].append({"n":f"Blk:{desc}","r":"OK" if ok else "FAIL","d":str(r["sc"])}); R["s"]["b" if ok else "f"]+=1
        print(f"{desc}: {'BLOCKED' if ok else 'NOT BLOCKED'} {r['sc']}")

print("\n--- SECRET LEAK ---")
if PA and TA:
    r = curl("POST",f"{P}/executions",{"cmd":"env","args":[],"pid":PA,"wd":".","type":"COMMAND","ws":PA},h={"Authorization":f"Bearer {TA}"})
    body=r["b"]; leaked=any(p in body for p in ['DATABASE_URL','PASSWORD','SECRET','TOKEN','API_KEY','PRIVATE_KEY'])
    ok=r["sc"] in [400,403,422] or "BLOCKED" in body or not leaked; R["t"].append({"n":"SecretLeak","r":"OK" if ok else "FAIL","d":str(r["sc"])}); R["s"]["b" if ok else "f"]+=1
    print(f"env: {'SAFE' if ok else 'LEAKED'} {r['sc']}")

s=R["s"]; print(f"\n{'='*40}\nSUMMARY: PASS:{s['p']} FAIL:{s['f']} BLOCKED:{s['b']}\n{'='*40}")
with open(f"phase2g_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json",'w') as f: json.dump(R,f,indent=2)
if s['f']>0:
    print("\n⚠️ CRITICAL:"); 
    for t in R["t"]:
        if "FAIL" in t.get("r",""): print(f"  - {t['n']}: {t['d']}")
