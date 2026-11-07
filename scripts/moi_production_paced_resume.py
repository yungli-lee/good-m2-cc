#!/usr/bin/env python3
"""One bounded, read/write continuation of the verified Changhua migration.

Safety: exactly 200 or fewer NEW masters, 20 per transaction, >=8s delay between
chunks, no other Production business tables, no publish gate changes. Fail closed
if read latency increases. Re-run manually only after reviewing site health.
"""
import datetime
import hashlib
import json
import os
import pathlib
import time
import urllib.parse
from moi_stage_to_production_transfer import (
    STAGING,PRODUCTION,api,select,get_all_details
)

LIMIT=20
MAX_NEW=int(os.environ.get("MOI_MAX_NEW","200"))
if MAX_NEW not in (200,1000,5000,10000):
    raise RuntimeError("Unsupported bounded transfer size")
PAUSE_SECONDS=8
MAX_HEALTH_LATENCY=6.0
REPORT=pathlib.Path("/tmp/moi-paced-resume-report.json")

def health(key):
    start=time.monotonic()
    state=api(PRODUCTION,key,"/rest/v1/moi_publication_state?select=enabled&id=eq.true&limit=1")
    elapsed=time.monotonic()-start
    if len(state)!=1 or state[0].get("enabled") is not False:
        raise RuntimeError("Unsafe publication state during transfer")
    if elapsed>MAX_HEALTH_LATENCY:
        raise RuntimeError(f"Production health latency high ({elapsed:.1f}s), stopping.")
    return round(elapsed,3)

def exact_prefix(base,key,cursor):
    # Basic indexed PK count for all rows through the last committed source ID.
    # Avoid source identity heuristics that might skip holes.
    import urllib.request, urllib.error
    u=base+"/rest/v1/moi_real_price_transactions?select=id&id=lte."+str(cursor)+"&limit=1"
    headers={"apikey":key,"Prefer":"count=exact","Accept":"application/json"}
    if key.startswith("eyJ"):headers["Authorization"]="Bearer "+key
    req=urllib.request.Request(u,headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req,timeout=35) as r:
                return int(r.headers["Content-Range"].split("/")[-1])
        except urllib.error.HTTPError as e:
            if e.code not in (429,500,502,503,504) or attempt==2:
                raise
        except (TimeoutError, OSError):
            if attempt==2:
                raise
        time.sleep((attempt+1)*5)
    raise RuntimeError("Prefix verification unavailable")

def main():
    stage=os.environ.get("MOI_STAGING_SUPABASE_SERVICE_ROLE_KEY","").strip()
    prod=os.environ.get("MOI_PRODUCTION_SUPABASE_SERVICE_ROLE_KEY","").strip()
    if not stage or not prod:raise RuntimeError("Staging and Production credentials required")
    status={"started_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"completed":False,
            "new_transactions":0,"new_details":0,"target_max_new":MAX_NEW,"publication_enabled":False}
    def save():REPORT.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n")
    save()
    before=health(prod)
    current=api(PRODUCTION,prod,"/rest/v1/moi_real_price_transactions?select=id&order=id.desc&limit=1")
    cursor=int(current[0]["id"]) if current else 0
    if cursor<=0:raise RuntimeError("Expected previously transferred source rows")
    stage_prefix=exact_prefix(STAGING,stage,cursor)
    prod_prefix=exact_prefix(PRODUCTION,prod,cursor)
    if stage_prefix!=prod_prefix:
        raise RuntimeError(f"Unsafe prefix gap: staging {stage_prefix}, Production {prod_prefix}")
    status.update({"resumed_after_id":cursor,"verified_prefix_count":prod_prefix,"preflight_latency_s":before})
    save()
    for chunk in range(MAX_NEW//LIMIT):
        health(prod)
        rows=select(stage,"moi_real_price_transactions",{
            "select":"*","id":"gt."+str(cursor),"order":"id.asc","limit":LIMIT
        })
        if not rows:break
        ids=[int(m["id"]) for m in rows]
        if len(ids)!=len(set(ids)) or ids!=sorted(ids) or any(
            m["county"]!="彰化縣" or m["dataset_type"] not in ("sale","presale") for m in rows
        ):
            raise RuntimeError("Unexpected source range")
        details=get_all_details(stage,ids)
        by_id={x:[] for x in ids}
        for d in details:
            if d["transaction_id"] not in by_id:raise RuntimeError("Orphan source detail")
            by_id[d["transaction_id"]].append(d)
        items=[{"master":m,"details":by_id[m["id"]]} for m in rows]
        digest=hashlib.sha256(json.dumps(items,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
        start=time.monotonic()
        result=api(PRODUCTION,prod,"/rest/v1/rpc/moi_import_transfer_chunk",
            {"p_batch_key":digest,"p_items":items})
        elapsed=time.monotonic()-start
        if result.get("status")!="verified" or result.get("masters")!=len(rows) or result.get("details")!=len(details):
            raise RuntimeError("Batch reconciliation failed")
        status["new_transactions"]+=len(rows)
        status["new_details"]+=len(details)
        status["last_source_id"]=ids[-1]
        status["last_write_latency_s"]=round(elapsed,3)
        save()
        cursor=ids[-1]
        print(json.dumps({"chunk":chunk+1,"cumulative":status["new_transactions"],
            "details":status["new_details"],"write_latency_s":round(elapsed,3)}),flush=True)
        # Stop after a slow write even if it committed; never let one retry
        # cascade into heavy load. A later run can reconcile the committed ID.
        if elapsed>MAX_HEALTH_LATENCY:
            raise RuntimeError(f"Slow Production write ({elapsed:.1f}s), stopping to protect website")
        if chunk<MAX_NEW//LIMIT-1:
            time.sleep(PAUSE_SECONDS)
    status["final_health_latency_s"]=health(prod)
    # Verify the full transferred prefix again after the last committed chunk.
    final_stage_prefix=exact_prefix(STAGING,stage,cursor)
    final_prod_prefix=exact_prefix(PRODUCTION,prod,cursor)
    if final_stage_prefix!=final_prod_prefix or final_prod_prefix!=prod_prefix+status["new_transactions"]:
        raise RuntimeError("Final source/Production master prefix reconciliation failed")
    status["verified_final_prefix_count"]=final_prod_prefix
    status["completed"]=True
    status["finished_at"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
    save()
    print(json.dumps({"status":"bounded_transfer_verified","new_transactions":status["new_transactions"],
        "new_details":status["new_details"],"publication_enabled":False}),flush=True)

if __name__=="__main__":main()
