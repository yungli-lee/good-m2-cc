#!/usr/bin/env python3
"""One-shot official-download diagnostic; no credentials and no database writes."""
import json, os, socket, ssl, sys, urllib.error, urllib.request, urllib.parse, zipfile, io
url=os.getenv("MOI_SOURCE_URL","https://plvr.land.moi.gov.tw/Download?type=zip&fileName=lvr_landcsv.zip")
parsed=urllib.parse.urlsplit(url)
if parsed.scheme!="https" or parsed.hostname not in {"plvr.land.moi.gov.tw"}:
    sys.exit("Refusing unexpected download host")
result={"host":parsed.hostname,"path":parsed.path,"http_status":None,"content_type":None,"zip":False}
try:
    result["dns"]=list(dict.fromkeys(x[4][0] for x in socket.getaddrinfo(parsed.hostname,443,type=socket.SOCK_STREAM)))
except OSError as e:
    print(json.dumps({**result,"stage":"dns","error":str(e)},ensure_ascii=False))
    sys.exit(2)
try:
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; good-m2-cc-open-data/1.0)","Accept":"application/zip,application/octet-stream,*/*"})
    with urllib.request.urlopen(req,timeout=60) as response:
        result["http_status"]=response.status
        result["final_host"]=urllib.parse.urlsplit(response.url).hostname
        result["content_type"]=response.headers.get("Content-Type")
        result["content_length"]=response.headers.get("Content-Length")
        signature=response.read(8)
        result["zip"]=signature.startswith((b"PK\\x03\\x04",b"PK\\x05\\x06"))
        result["signature_hex"]=signature[:4].hex()
except urllib.error.HTTPError as e:
    print(json.dumps({**result,"stage":"http","http_status":e.code,"error":str(e)},ensure_ascii=False))
    sys.exit(3)
except Exception as e:
    print(json.dumps({**result,"stage":"tls_or_connection","error":str(e)},ensure_ascii=False))
    sys.exit(4)
print(json.dumps(result,ensure_ascii=False))
if not result["zip"]:sys.exit("Official endpoint returned non-ZIP data")
