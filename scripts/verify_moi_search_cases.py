#!/usr/bin/env python3
"""Public Preview regression: targeted Changhua roads, duplicate case and paging.

Read-only, no credentials and no database writes. Exit nonzero if a required
query is broken; do not confuse missing data with a successful check.
"""
import json, urllib.parse, urllib.request, urllib.error, unicodedata

BASE="https://feature-real-price-public-se.good-m2-cc.pages.dev"
BASE_ARGS={"dataset":"sale","county":"彰化縣","district":"秀水鄉","from":"2025-01-01","to":"2026-10-31"}

def get(road,page=1):
    params={**BASE_ARGS,"road":road,"page":page}
    url=BASE+"/api/public/real-price?"+urllib.parse.urlencode(params)
    req=urllib.request.Request(url,headers={"Accept":"application/json","User-Agent":"good-m2-regression/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=55) as response:
            if response.status!=200:raise RuntimeError(f"HTTP {response.status} road={road}")
            body=json.load(response)
    except urllib.error.HTTPError as exc:
        # Public response only; no credentials or private database data.
        raw=exc.read(2000).decode("utf-8","replace")
        raise RuntimeError(f"Preview HTTP {exc.code} road={road}: {raw[:500]}") from exc
    if body.get("preview_sample") is not True:raise RuntimeError("Expected staging Preview response")
    rows=body.get("data")
    if not isinstance(rows,list) or not isinstance(body.get("total"),int):raise RuntimeError(f"Malformed list road={road}")
    return body

def norm(value):
    return unicodedata.normalize("NFKC",str(value or "")).replace(" ","")

def main():
    report={"tests":[]}
    for road in ("古蒼","古蒼巷","安南","安南巷","彰鹿路"):
        result=get(road)
        if result["total"]<1:raise RuntimeError(f"Unexpected empty result for {road}")
        if any(road not in norm(r.get("location_display") or r.get("address_display")) for r in result["data"]):
            raise RuntimeError(f"Query returned unrelated address for {road}")
        report["tests"].append({"road":road,"total":result["total"],"page_rows":len(result["data"])})
    # A known official 2025/09/27 transaction must appear only once after
    # source-prefix deduplication; test across page boundaries, not only one page.
    first=get("古蒼")
    pages=(first["total"]+19)//20
    if pages>10:raise RuntimeError("Unreasonably broad test scope")
    rows=first["data"][:]
    for page in range(2,pages+1):rows.extend(get("古蒼",page)["data"])
    known=[r for r in rows if r.get("transaction_date")=="2025-09-27" and
           "古蒼巷5之8號" in norm(r.get("location_display") or r.get("address_display")) and
           int(r.get("total_price_ntd") or -1)==10800000]
    if len(known)!=1:raise RuntimeError(f"Known canonical 5之8 transaction count={len(known)}, expected=1")
    if len(rows)!=first["total"]:raise RuntimeError(f"Page total {len(rows)} != {first['total']}")
    if len({r["id"] for r in rows})!=len(rows):raise RuntimeError("Duplicate IDs across pages")
    report["duplicate_case_verified"]=True
    report["pagination_verified"]=True
    print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__=="__main__":main()
