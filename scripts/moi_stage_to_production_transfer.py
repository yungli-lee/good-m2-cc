#!/usr/bin/env python3
"""Copy existing Changhua official transactions/details staging -> production.

- HTTPS Supabase Data API; no local database dumps, credentials never printed.
- Production-only real-price tables; never touches existing property/CRM tables.
- 30-master transactional chunks, source identity + source detail hash verified by RPC.
- Idempotent after interruption and capped to an initial source high-watermark.
- All staging raw_record JSONB fields are preserved without lossy conversion.
"""
import datetime, hashlib, json, os, pathlib, time, urllib.error, urllib.parse, urllib.request

STAGING="https://niorteztdbuyusemsgwa.supabase.co"
PRODUCTION="https://rlbuadkmylulieoryzal.supabase.co"
LIMIT=30
REPORT=pathlib.Path("/tmp/moi-production-transfer-report.json")

def api(base,key,path,payload=None,prefer=None):
    headers={"apikey":key,"Authorization":"Bearer "+key,"Accept":"application/json","User-Agent":"good-m2-verified-transfer/1.0"}
    if payload is not None:headers["Content-Type"]="application/json"
    if prefer:headers["Prefer"]=prefer
    req=urllib.request.Request(base+path,data=None if payload is None else json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode(),headers=headers,method="POST" if payload is not None else "GET")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req,timeout=90) as resp:
                raw=resp.read()
                return json.loads(raw) if raw else []
        except urllib.error.HTTPError as error:
            msg=error.read(1000).decode("utf-8","replace")
            if error.code not in (429,500,502,503,504) or attempt==3:raise RuntimeError(f"HTTP {error.code}: {msg[:250]}") from error
        except (TimeoutError, OSError):
            if attempt==3:raise
        time.sleep(2**attempt*3)
    raise RuntimeError("API did not respond")

def select(source_key,table,params):
    return api(STAGING,source_key,"/rest/v1/"+table+"?"+urllib.parse.urlencode(params))

def get_all_details(key,ids):
    if not ids:return []
    rows=[];offset=0
    while True:
        page=select(key,"moi_transaction_details",{
            "select":"*","transaction_id":"in.("+",".join(map(str,ids))+")",
            "order":"id.asc","offset":offset,"limit":1000
        })
        rows.extend(page)
        if len(page)<1000:break
        offset+=len(page)
        if offset>15000:raise RuntimeError("Unbounded package detail set")
    return rows

def source_totals(key,high):
    # Verified snapshot counts: new transactions added afterward are outside high-watermark.
    mx=select(key,"moi_real_price_transactions",{"select":"id","order":"id.desc","limit":1})
    if high is None:high=mx[0]["id"] if mx else 0
    return high

def main():
    stage_key=os.environ.get("MOI_STAGING_SUPABASE_SERVICE_ROLE_KEY","").strip()
    prod_key=(os.environ.get("MOI_PRODUCTION_SUPABASE_SERVICE_ROLE_KEY") or
              os.environ.get("PRODUCTION_SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not stage_key or not prod_key:raise RuntimeError("Staging AND Production service credentials required; nothing copied")
    high=source_totals(stage_key,None)
    report={"started_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source_high_watermark":high,
            "copied_master_rows":0,"copied_detail_rows":0,"completed":False,"destination":"Production real-price isolated tables"}
    def save():REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    save()
    cursor=0
    while True:
        masters=select(stage_key,"moi_real_price_transactions",{
            "select":"*","id":"gt."+str(cursor),"and":"(id.lte."+str(high)+")",
            "order":"id.asc","limit":LIMIT
        })
        if not masters:break
        ids=[int(m["id"]) for m in masters]
        if ids!=sorted(ids) or any(m["county"]!="彰化縣" or m["dataset_type"] not in ("sale","presale") for m in masters):
            raise RuntimeError("Unexpected source order or scope")
        details=get_all_details(stage_key,ids)
        by_id={id_:[] for id_ in ids}
        for d in details:
            if d["transaction_id"] not in by_id:raise RuntimeError("Orphan source detail")
            by_id[d["transaction_id"]].append(d)
        items=[{"master":m,"details":by_id[m["id"]]} for m in masters]
        digest=hashlib.sha256(json.dumps(items,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
        response=api(PRODUCTION,prod_key,"/rest/v1/rpc/moi_import_transfer_chunk",{"p_batch_key":digest,"p_items":items})
        if response.get("status")!="verified" or response.get("masters")!=len(masters) or response.get("details")!=len(details):
            raise RuntimeError("Production RPC rejected source-to-destination reconciliation")
        report["copied_master_rows"]+=len(masters)
        report["copied_detail_rows"]+=len(details)
        cursor=ids[-1];report["last_source_id"]=cursor
        save()
        if report["copied_master_rows"]%300==0:
            print(json.dumps({"master_rows":report["copied_master_rows"],"detail_rows":report["copied_detail_rows"]}),flush=True)
    # Use a source high-watermark that ensures late inserts don't corrupt the initial snapshot.
    response=api(PRODUCTION,prod_key,"/rest/v1/rpc/moi_finalize_transfer_sequences",
       {"p_expected_masters":report["copied_master_rows"],"p_expected_details":report["copied_detail_rows"]})
    if not response.get("complete"):raise RuntimeError("Production transfer totals not verified")
    report["completed"]=True
    report["finished_at"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
    save()
    print(json.dumps({"status":"verified_complete","masters":report["copied_master_rows"],"details":report["copied_detail_rows"]}),flush=True)

if __name__=="__main__":main()
