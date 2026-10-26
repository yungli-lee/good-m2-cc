#!/usr/bin/env python3
"""MOI open-data ZIP -> staging RAW CSV rows. Never touches production."""
import csv, hashlib, io, json, os, re, sys, time, urllib.request, urllib.parse, zipfile
from datetime import datetime, timezone

SOURCE = os.getenv("MOI_SOURCE_URL","https://plvr.land.moi.gov.tw/Download?type=zip&fileName=lvr_landcsv.zip")
CHECK_ONLY=os.getenv("MOI_CHECK_ONLY")=="1"
SUPABASE_URL=os.getenv("STAGING_SUPABASE_URL","").rstrip("/")
KEY=os.getenv("STAGING_SUPABASE_SERVICE_ROLE_KEY","")
if not CHECK_ONLY and (not SUPABASE_URL or not KEY):raise RuntimeError("Staging credentials required")
MAX_ROWS=int(os.getenv("MOI_BATCH_ROWS","400"))
if not (1<=MAX_ROWS<=1500): raise ValueError("MOI_BATCH_ROWS outside safe range")

def request(url,data=None):
    headers={"User-Agent":"good-m2-cc-m o i-import/1.0".replace(" ",""),"Accept":"application/json"}
    if data is not None:
        headers.update({"apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
        req=urllib.request.Request(url,json.dumps(data,ensure_ascii=False).encode(),headers=headers,method="POST")
    else: req=urllib.request.Request(url,headers=headers)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req,timeout=180) as resp:return resp.read()
        except Exception:
            if attempt==4:raise
            time.sleep(min(2**attempt*3,30))

def imported_files(digest):
    """Already fully imported files from this exact archive; safe resumable bootstrap."""
    params=urllib.parse.urlencode({"archive_sha256":"eq."+digest,"select":"file_name,expected_rows,imported_rows"})
    url=SUPABASE_URL+"/rest/v1/moi_raw_csv_files?"+params
    headers={"apikey":KEY,"Authorization":"Bearer "+KEY,"Accept":"application/json"}
    req=urllib.request.Request(url,headers=headers)
    with urllib.request.urlopen(req,timeout=90) as resp:
        values=json.loads(resp.read())
    return {f["file_name"]:f for f in values}

def encoding_csv(raw):
    for enc in ("utf-8-sig","cp950","big5"):
        try:return raw.decode(enc)
        except UnicodeDecodeError:continue
    raise ValueError("Unknown CSV encoding")

def kind_for(name):
    base=name.lower()
    if "_land.csv" in base:return "land"
    if "_build.csv" in base:return "building"
    if "_park.csv" in base:return "parking"
    if re.search(r"_lvr_land_[abc]\.csv$",base):return "master"
    return "other"

def main():
    archive=open(os.environ["MOI_LOCAL_ZIP"],"rb").read() if os.getenv("MOI_LOCAL_ZIP") else request(SOURCE)
    digest=hashlib.sha256(archive).hexdigest()
    if not zipfile.is_zipfile(io.BytesIO(archive)):raise ValueError("MOI response is not ZIP")
    totals={"files":0,"rows":0,"sha256":digest,"at":datetime.now(timezone.utc).isoformat()}
    existing={} if CHECK_ONLY else imported_files(digest)
    totals["skipped_complete_files"]=0
    totals["total_expected_files"]=0
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        if z.testzip() is not None:raise ValueError("ZIP CRC failed")
        names=[n for n in z.namelist() if n.lower().endswith(".csv") and not n.endswith("/")]
        if not names:raise ValueError("ZIP contains no CSV")
        totals["total_expected_files"]=len(names)
        for filename in sorted(names):
            csvdata=list(csv.reader(io.StringIO(encoding_csv(z.read(filename)))))
            if len(csvdata)<2:continue
            headers=csvdata[0]
            # Official files: header row followed by English descriptions, then data rows.
            descriptions=csvdata[1]
            if len(set(headers))!=len(headers) or any(len(x)!=len(headers) for x in csvdata):
                raise ValueError(f"Layout mismatch: {filename}")
            rows=csvdata[2:]
            if CHECK_ONLY:
                totals["files"]+=1
                totals["rows"]+=len(rows)
                continue
            previous=existing.get(filename)
            if previous and previous["expected_rows"]==len(rows) and previous["imported_rows"]==len(rows):
                totals["skipped_complete_files"]+=1
                totals["files"]+=1
                totals["rows"]+=len(rows)
                print(f"{filename}: already complete ({len(rows)})",flush=True)
                continue
            parts=filename.split("/")[-1].split("_")
            region=parts[0] if parts else ""
            dataset=parts[3].split(".")[0] if len(parts)>3 else ""
            batch=[]
            def flush():
                if not batch and rows:return
                data={"p_archive_sha":digest,"p_file_name":filename,"p_dataset":dataset,
                      "p_region":region,"p_kind":kind_for(filename),"p_headers":headers,
                      "p_descriptions":descriptions,"p_expected":len(rows),"p_rows":batch}
                response=request(SUPABASE_URL+"/rest/v1/rpc/moi_raw_append",data)
                result=json.loads(response)
                if "file_id" not in result:raise ValueError(f"Unexpected API response {result}")
                batch.clear()
            if not rows:
                # Empty files intentionally registered using a zero-row batch.
                flush()
            for line,values in enumerate(rows,start=3):
                fields=dict(zip(headers,values))
                record_id=fields.get("編號") or fields.get("序號")
                batch.append({"line":line,"id":record_id,"fields":fields})
                if len(batch)>=MAX_ROWS:flush()
            flush()
            totals["files"]+=1
            totals["rows"]+=len(rows)
            print(f"{filename}: {len(rows)}",flush=True)
    if totals["files"]!=totals["total_expected_files"]:
        raise RuntimeError("Import manifest count mismatch")
    if CHECK_ONLY:
        print(json.dumps(totals,ensure_ascii=False),flush=True)
        return
    final=imported_files(digest)
    missing=[name for name in names if name not in final or final[name]["expected_rows"]!=final[name]["imported_rows"]]
    if missing:
        raise RuntimeError("RAW archive not fully imported: "+", ".join(missing[:20]))
    totals["verified_complete_files"]=len(names)
    totals["verified_rows"]=sum(final[name]["imported_rows"] for name in names)
    if totals["verified_rows"]!=totals["rows"]:
        raise RuntimeError(f"RAW row total mismatch: {totals['verified_rows']} != {totals['rows']}")
    print(json.dumps(totals,ensure_ascii=False),flush=True)

if __name__=="__main__":main()
