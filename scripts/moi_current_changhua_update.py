#!/usr/bin/env python3
"""Current official MOI archive -> new Changhua sale/presale masters + details, staging ONLY.

New source IDs only; updates/corrections to previously seen IDs require a separate
reconciliation pass. Fail closed on capacity, source format or verification errors.
"""
import collections, datetime, hashlib, json, os, pathlib, urllib.parse, urllib.request
from moi_national_import import parse_archive, fingerprint

STAGING = "https://niorteztdbuyusemsgwa.supabase.co"
FILES = {"n_lvr_land_a.csv", "n_lvr_land_b.csv"}
MAX_NEW = 2000
CAPACITY_BYTES = 6_800_000_000
BATCH_SIZE = 50

def api(path, key, payload=None):
    headers={"apikey":key,"Authorization":"Bearer "+key,"Accept":"application/json","User-Agent":"good-m2-current-changhua/1.0"}
    if payload is not None:headers["Content-Type"]="application/json"
    req=urllib.request.Request(STAGING+path,data=None if payload is None else json.dumps(payload,ensure_ascii=False).encode(),headers=headers,method="POST" if payload is not None else "GET")
    with urllib.request.urlopen(req,timeout=90) as response:return json.load(response)

def preflight(key):
    info=api("/rest/v1/rpc/moi_current_import_capacity_guard",key,{})
    if not isinstance(info,dict) or not isinstance(info.get("database_bytes"),int):
        raise RuntimeError("Missing valid staging database capacity guard")
    if info["database_bytes"]>=CAPACITY_BYTES:raise RuntimeError("Staging database over current-import capacity limit")
    return info["database_bytes"]

def existing_records(key,keys):
    found={}
    for start in range(0,len(keys),100):
        batch=keys[start:start+100]
        query=urllib.parse.urlencode({"select":"source_record_key","source_record_key":"in.("+",".join(batch)+")","limit":200})
        rows=api("/rest/v1/moi_real_price_transactions?"+query,key)
        for row in rows:found[row["source_record_key"]]=True
    return found

def main():
    if os.getenv("STAGING_SUPABASE_URL","").strip().rstrip("/")!=STAGING:
        raise RuntimeError("Only the approved staging project is writable")
    key=os.getenv("STAGING_SUPABASE_SERVICE_ROLE_KEY","")
    if not key:raise RuntimeError("Staging service credential missing")
    archive=pathlib.Path(os.environ["MOI_LOCAL_ZIP"])
    groups,issues,inventory=parse_archive(archive,FILES)
    if not groups:raise RuntimeError("Missing Changhua master CSV")
    if any(issue.get("reason")=="csv_width_mismatch" for issue in issues):
        raise RuntimeError("Current archive has malformed CSV widths; preserve and investigate before importing")
    for name,items in groups:
        for item in items:
            m=item["master"]
            if m["county"]!="彰化縣" or m["dataset_type"] not in ("sale","presale") or not m["source_key"].startswith(("n:a:","n:b:")):
                raise RuntimeError("Current archive escaped authorized Changhua sale/presale scope")
    full=[item for _,items in groups for item in items]
    keys=[item["master"]["source_key"] for item in full]
    if len(keys)!=len(set(keys)):raise RuntimeError("Duplicate official source IDs")
    report={"archive_sha256":hashlib.sha256(archive.read_bytes()).hexdigest(),
            "scope":"Changhua current sales and presales, new source keys only",
            "source_records":len(full),"source_issues":len(issues),
            "unresolved_source_issues":sum(not x.get("resolved",False) for x in issues),
            "source_inventory":inventory,"imported_new":0,"preserved_existing":0}
    report_file=pathlib.Path(os.getenv("MOI_REPORT_PATH","/tmp/moi-current-changhua-report.json"))
    def save():report_file.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    save()
    if report["unresolved_source_issues"]:
        raise RuntimeError("Unresolved source issues: quarantine report; no unsafe publication")
    initial_bytes=preflight(key)
    existing=existing_records(key,keys)
    selected=[item for item in full if item["master"]["source_key"] not in existing]
    report["preserved_existing"]=len(full)-len(selected)
    report["pending_new"]=len(selected)
    save()
    if len(selected)>MAX_NEW:
        raise RuntimeError("New-record count exceeds bounded daily import, review before writing")
    if not selected:
        report.update({"completed":True,"database_bytes_before":initial_bytes,"message":"No new source IDs"});save()
        print(json.dumps({"status":"no_new_records","records_checked":len(full)},ensure_ascii=False),flush=True)
        return
    period=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    for start in range(0,len(selected),BATCH_SIZE):
        if preflight(key)>=CAPACITY_BYTES:
            raise RuntimeError("Capacity guard reached during import")
        batch=selected[start:start+BATCH_SIZE]
        digest=fingerprint({"version":"current-changhua-new-only-v1","source":report["archive_sha256"],"keys":[x["master"]["source_key"] for x in batch]})
        response=api("/rest/v1/rpc/moi_import_national_chunk",key,{
            "p_archive_sha":report["archive_sha256"],"p_chunk_sha":digest,
            "p_file_name":"current-changhua-new-only-v1",
            "p_source_period":period,"p_items":batch})
        if response.get("status") not in ("applied","already_applied") or response.get("processed")!=len(batch):
            raise RuntimeError("RPC response reconciliation failure")
        # Count only confirmed new records; an idempotent retry is safe.
        report["imported_new"]+=len(batch);save()
    after=existing_records(key,[x["master"]["source_key"] for x in selected])
    if len(after)!=len(selected):raise RuntimeError("Post-write source identity reconciliation failed")
    report.update({"completed":True,"verified_new":len(after),"database_bytes_before":initial_bytes})
    save()
    print(json.dumps({"status":"verified","new_records":len(after),"source_records":len(full),"source_issues":len(issues)},ensure_ascii=False),flush=True)

if __name__=="__main__":main()
