#!/usr/bin/env python3
"""Explicit Changhua sale/presale scope. Never resumes national-v1 chunks."""
import calendar,collections,datetime,hashlib,json,os,pathlib,time,urllib.error,urllib.parse,urllib.request,zipfile
from moi_national_import import parse_archive,fingerprint

VERSION='changhua-sale-presale-through-2023-v1'
PROJECT_URL='https://niorteztdbuyusemsgwa.supabase.co'
FILES={'n_lvr_land_a.csv','n_lvr_land_b.csv'}
SEASONS=[f'{year}S{quarter}' for year in range(115,111,-1) for quarter in range(4,0,-1) if (year,quarter)<=(115,3)]
BASE='https://feature-real-price-public-se.good-m2-cc.pages.dev'

def plan(path,season):
    if season not in SEASONS:raise ValueError('Quarter outside authorized 2023 through 115S3 scope')
    year,quarter=map(int,season.split('S'));year+=1911;month=quarter*3
    period=f'{year}-{month:02d}-{calendar.monthrange(year,month)[1]}'
    digest=hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()
    with zipfile.ZipFile(path) as z:
        names=[x.filename for x in z.infolist()]
        if len(names)!=len(set(names)) or any(x.startswith(('/', '\\')) or '..' in pathlib.PurePosixPath(x).parts for x in names):raise ValueError('Unsafe or duplicate ZIP paths')
        selected=[x.split('/')[-1].lower() for x in names if x.split('/')[-1].lower() in FILES]
        if len(selected)!=len(set(selected)):raise ValueError('Duplicate scoped CSV names')
        if sum(x.file_size for x in z.infolist())>4_000_000_000:raise ValueError('Archive expansion bound exceeded')
    groups,issues,inventory=parse_archive(path,FILES)
    if {name for name,_ in groups}!=FILES:raise ValueError('Both Changhua sale/presale files required')
    for name,items in groups:
        for item in items:
            m=item['master']
            if m['county']!='彰化縣' or m['dataset_type'] not in ('sale','presale') or not m['source_key'].startswith(('n:a:','n:b:')):raise ValueError('Scope violation')
    return groups,{'version':VERSION,'scope':{'county':'彰化縣','datasets':['sale','presale']},'season':season,'period':period,'archive_sha256':digest,'inventory':inventory,'issues':issues,'batches':[],'import_complete':False,'complete':False,'unresolved_issues':sum(not x.get('resolved',False) for x in issues)}

def chunk_hash(report,name,batch):
    return fingerprint({'version':VERSION,'scope':report['scope'],'archive_sha256':report['archive_sha256'],'period':report['period'],'file':name,'items':batch})

def request(url,key=None,payload=None):
    headers={'User-Agent':'good-m2-changhua-import/1.0','Accept':'application/json'}
    if key:headers.update({'apikey':key,'Authorization':'Bearer '+key})
    if payload is not None:headers['Content-Type']='application/json'
    req=urllib.request.Request(url,headers=headers,data=None if payload is None else json.dumps(payload,ensure_ascii=False).encode())
    # No automatic retries: an RPC response can be lost after commit.
    try:
        with urllib.request.urlopen(req,timeout=20) as response:return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(json.dumps({'status':error.code,'body':error.read().decode(errors='replace')[:10000]})) from error

def preview_guard(url,key):
    request(url+'/rest/v1/moi_preview_transactions?select=id&limit=1',key)
    query=urllib.parse.urlencode({'county':'彰化縣','dataset':'sale','district':'彰化市','from':'2026-09-01','to':'2026-09-30'})
    result=request(BASE+'/api/public/real-price?'+query)
    if result.get('preview_sample') is not True or not isinstance(result.get('data'),list):raise RuntimeError('Preview guard failed')

def verify_batch(url,key,batch,period):
    keys=[x['master']['source_key'] for x in batch]
    query=urllib.parse.urlencode({'select':'id,source_record_key,source_period_date,source_record_fingerprint','source_record_key':'in.('+','.join(keys)+')'})
    rows=request(url+'/rest/v1/moi_real_price_transactions?'+query,key)
    by_key={x['source_record_key']:x for x in rows}
    if len(by_key)!=len(batch):raise RuntimeError('Missing imported master')
    ids=[str(x['id']) for x in rows];details=[]
    for offset in range(0,1000000,1000):
        query=urllib.parse.urlencode({'select':'transaction_id,source_detail_key,source_row_hash','transaction_id':'in.('+','.join(ids)+')','order':'id','offset':offset,'limit':1000})
        page=request(url+'/rest/v1/moi_transaction_details?'+query,key);details.extend(page)
        if len(page)<1000:break
    else:raise RuntimeError('Detail pagination bound exceeded')
    by_id=collections.defaultdict(collections.Counter)
    for d in details:by_id[d['transaction_id']][(d['source_detail_key'],d['source_row_hash'])]+=1
    newer=0
    for item in batch:
        m=item['master'];stored=by_key[m['source_key']]
        if stored['source_period_date'] and stored['source_period_date']>period:newer+=1;continue
        if stored['source_record_fingerprint']!=m['source_fingerprint']:raise RuntimeError('Master fingerprint mismatch / legacy conflict')
        expected=collections.Counter((d['source_key'],d['fingerprint']) for d in item['details'])
        if by_id[stored['id']]!=expected:raise RuntimeError('Detail fingerprint reconciliation mismatch')
    return {'verified':len(batch),'preserved_newer':newer}

def main():
    path=os.environ['MOI_LOCAL_ZIP'];season=os.environ['MOI_SEASON']
    groups,report=plan(path,season)
    output=pathlib.Path(os.environ.get('MOI_REPORT_PATH','/tmp/changhua-report.json'))
    def save():output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    save()
    if os.environ.get('MOI_CHECK_ONLY')=='1':return
    url=os.environ.get('STAGING_SUPABASE_URL','').strip().rstrip('/');key=os.environ.get('STAGING_SUPABASE_SERVICE_ROLE_KEY','').strip()
    if url!=PROJECT_URL or not key:raise RuntimeError('Explicit staging destination required')
    try:
        if report['unresolved_issues']:raise RuntimeError('Unresolved scoped source exceptions; stop before writes')
        preview_guard(url,key)
        for name,items in groups:
            for start in range(0,len(items),100):
                batch=items[start:start+100];sha=chunk_hash(report,name,batch)
                entry={'file':name,'start':start,'chunk_sha256':sha,'expected_masters':len(batch),'expected_details':sum(len(x['details']) for x in batch),'status':'sending'}
                report['batches'].append(entry);save()
                began=time.monotonic()
                result=request(url+'/rest/v1/rpc/moi_import_national_chunk',key,{'p_archive_sha':report['archive_sha256'],'p_chunk_sha':sha,'p_file_name':VERSION+'/'+name,'p_source_period':report['period'],'p_items':batch})
                elapsed=time.monotonic()-began;entry.update({'response':result,'elapsed_seconds':round(elapsed,3),'status':'response_received'});save()
                if result.get('status') not in ('applied','already_applied') or result.get('processed')!=len(batch):raise RuntimeError('RPC reconciliation failed')
                if elapsed>20:raise RuntimeError('Batch exceeded 20 seconds; stop before next batch')
                entry['verification']=verify_batch(url,key,batch,report['period']);entry['status']='verified';save()
                print(json.dumps({'season':season,'file':name,'start':start,'processed':len(batch),'status':'verified'}),flush=True)
                if len(report['batches'])%10==0:preview_guard(url,key)
        preview_guard(url,key)
        report['import_complete']=True;report['complete']=True;save()
    except Exception as error:
        report['error']={'type':type(error).__name__,'message':str(error)};save();raise

if __name__=='__main__':main()
