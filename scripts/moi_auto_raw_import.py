#!/usr/bin/env python3
"""MOI open-data ZIP -> staging RAW CSV rows. Never touches production."""
import csv, hashlib, io, json, os, re, sys, time, urllib.request, zipfile
from datetime import datetime, timezone

SOURCE = os.getenv("MOI_SOURCE_URL","https://plvr.land.moi.gov.tw/Download?type=zip&fileName=lvr_landcsv.zip")
SUPABASE_URL=os.environ["STAGING_SUPABASE_URL"].rstrip("/")
KEY=os.environ["STAGING_SUPABASE_SERVICE_ROLE_KEY"]
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
    if re.search(r"_lvr_land_[abc]\\.csv$",base):return "master"
    return "other"

def main():
    archive=request(SOURCE)
    digest=hashlib.sha256(archive).hexdigest()
    if not zipfile.is_zipfile(io.BytesIO(archive)):raise ValueError("MOI response is not ZIP")
    totals={"files":0,"rows":0,"sha256":digest,"at":datetime.now(timezone.utc).isoformat()}
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        if z.testzip() is not None:raise ValueError("ZIP CRC failed")
        names=[n for n in z.namelist() if n.lower().endswith(".csv") and not n.endswith("/")]
        if not names:raise ValueError("ZIP contains no CSV")
        for filename in sorted(names):
            csvdata=list(csv.reader(io.StringIO(encoding_csv(z.read(filename)))))
            if len(csvdata)<2:continue
            headers=csvdata[0]
            # Official files: header row followed by English descriptions, then data rows.
            descriptions=csvdata[1]
            if len(set(headers))!=len(headers) or any(len(x)!=len(headers) for x in csvdata):
                raise ValueError(f"Layout mismatch: {filename}")
            rows=csvdata[2:]
            parts=filename.split("/")[-1].split("_")
            region=parts[0] if parts else ""
            dataset=parts[3] if len(parts)>3 else ""
            batch=[]
            def flush():
                if not batch:return
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
    print(json.dumps(totals,ensure_ascii=False),flush=True)

if __name__=="__main__":main()
