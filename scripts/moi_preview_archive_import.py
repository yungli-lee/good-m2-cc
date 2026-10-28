#!/usr/bin/env python3
"""Expose a validated regional archive's master rows in staging Preview only."""
import csv, datetime, hashlib, io, json, os, re, zipfile, urllib.request, urllib.parse
from moi_auto_raw_import import KEY
from moi_auto_raw_import import encoding_csv, request, SUPABASE_URL


def parse_date(value):
    value=value.strip()
    if not re.fullmatch(r"\d{7}",value):raise ValueError("Invalid ROC transaction date: "+value)
    return datetime.date(int(value[:3])+1911,int(value[3:5]),int(value[5:])).isoformat()


def numeric(value):
    if not value:return None
    from decimal import Decimal
    number=Decimal(value)
    if not number.is_finite() or number<0:raise ValueError("Invalid nonnegative amount/area")
    return str(number)


def main():
    if SUPABASE_URL!="https://niorteztdbuyusemsgwa.supabase.co":raise RuntimeError("Staging only")
    region=os.environ["MOI_REGION_FILTER"].lower()
    # This first trial intentionally limits geography; expand only after reconciliation.
    if region!="n":raise ValueError("First historical trial is Changhua only")
    archive=open(os.environ["MOI_LOCAL_ZIP"],"rb").read()
    source=hashlib.sha256(archive).hexdigest()
    items=[]
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        if z.testzip() is not None:raise ValueError("ZIP CRC failed")
        for name in sorted(z.namelist()):
            if not re.fullmatch(r"n_lvr_land_a\.csv",name.split("/")[-1].lower()):continue
            code=name.split("/")[-1].lower().split("_")[-1][0]
            dataset={"a":"sale","b":"presale","c":"rental"}[code]
            rows=list(csv.reader(io.StringIO(encoding_csv(z.read(name)))))
            if len(rows)<2:raise ValueError("Missing CSV layout")
            headers=rows[0]
            for line,values in enumerate(rows[2:],3):
                if len(values)!=len(headers):raise ValueError("CSV width mismatch")
                raw=dict(zip(headers,values))
                record_id=raw.get("編號") or raw.get("序號")
                if not record_id:raise ValueError("Missing source ID")
                target=raw.get("交易標的","")
                category="house_land" if "土地" in target and "建物" in target else "land" if target=="土地" else "building" if target=="建物" else "parking" if target=="車位" else None
                if not category:raise ValueError("Unsupported target: "+target)
                master={"source_key":f"n:{code}:{record_id}","county":"彰化縣","district":raw["鄉鎮市區"],"dataset_type":dataset,
                    "transaction_date":parse_date(raw["交易年月日"]),"target_category":category,
                    "address_display":raw.get("土地位置建物門牌"),"amount_ntd":numeric(raw.get("總價元") or raw.get("總額元")),
                    "land_sqm":numeric(raw.get("土地移轉總面積平方公尺") or raw.get("土地出租面積平方公尺")),
                    "building_sqm":numeric(raw.get("建物移轉總面積平方公尺") or raw.get("建物出租面積平方公尺")),
                    "building_type":raw.get("建物型態"),"raw_record":raw,
                    "source_fingerprint":hashlib.sha256(json.dumps(raw,ensure_ascii=False,sort_keys=True).encode()).hexdigest()}
                items.append({"master":master,"details":[]})
    if not items:raise ValueError("No regional master rows")
    keys=[x["master"]["source_key"] for x in items]
    if len(set(keys))!=len(keys):raise ValueError("Duplicate master source keys; reconcile before importing")
    # Complete validation of every master before the first write.
    print(json.dumps({"validated_masters":len(items),"archive_sha256":source}),flush=True)
    existing=set()
    offset=0
    while True:
        params=urllib.parse.urlencode({"select":"source_record_key","county":"eq.彰化縣","dataset_type":"eq.sale","order":"id","offset":offset,"limit":1000})
        req=urllib.request.Request(SUPABASE_URL+"/rest/v1/moi_real_price_transactions?"+params,headers={"apikey":KEY,"Authorization":"Bearer "+KEY})
        with urllib.request.urlopen(req,timeout=90) as response: page=json.load(response)
        existing.update(row["source_record_key"] for row in page)
        if len(page)<1000:break
        offset+=len(page)
    original=len(items)
    items=[item for item in items if item["master"]["source_key"] not in existing]
    print(json.dumps({"existing_masters_preserved":original-len(items),"new_masters":len(items)}),flush=True)
    accepted=0
    for offset in range(0,len(items),100):
        chunk=items[offset:offset+100]
        digest=hashlib.sha256(json.dumps(chunk,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        result=json.loads(request(SUPABASE_URL+"/rest/v1/rpc/moi_append_verified_chunk",{
            "p_source_sha256":source,"p_chunk_sha256":digest,"p_file_name":"historical-preview-changhua-master-v1","p_items":chunk}))
        if result.get("status") not in ("appended","already_applied"):raise RuntimeError("Unexpected append response")
        accepted+=len(chunk)
        print(json.dumps({"processed":accepted,"total":len(items),"status":result["status"]}),flush=True)
    print(json.dumps({"preview_masters_processed":accepted,"archive_sha256":source,"detail_coverage":"pending"}),flush=True)

if __name__=="__main__":main()
