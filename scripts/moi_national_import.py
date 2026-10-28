#!/usr/bin/env python3
"""Official archive -> national masters + all available detail rows, staging only."""
import collections, csv, datetime, hashlib, io, json, os, re, sys, zipfile
from decimal import Decimal
csv.field_size_limit(8*1024*1024)
COUNTIES=dict(zip('abcdefghijkmnopqtuvwxz',['臺北市','臺中市','基隆市','臺南市','高雄市','新北市','宜蘭縣','桃園市','嘉義市','新竹縣','苗栗縣','南投縣','彰化縣','新竹市','雲林縣','嘉義縣','屏東縣','花蓮縣','臺東縣','金門縣','澎湖縣','連江縣']))
KINDS={'land':'land','build':'building','park':'parking'}
def fingerprint(raw):return hashlib.sha256(json.dumps(raw,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def number(value,integer=False):
    value=(value or '').strip()
    if not value:return None
    n=Decimal(value)
    if not n.is_finite() or n<0 or (integer and n!=int(n)):raise ValueError('invalid nonnegative number')
    return str(n)
def date(value):
    value=(value or '').strip()
    if not re.fullmatch(r'\d{6,7}',value):raise ValueError('invalid ROC date')
    value=value.zfill(7)
    return datetime.date(int(value[:-4])+1911,int(value[-4:-2]),int(value[-2:])).isoformat()
def decode(data):
    for encoding in ('utf-8-sig','cp950','big5'):
        try:return data.decode(encoding)
        except UnicodeDecodeError:pass
    raise ValueError('unknown encoding')
def read_csv(z,name):
    rows=list(csv.reader(io.StringIO(decode(z.read(name)))))
    if len(rows)<2:raise ValueError('missing CSV headers: '+name)
    headers=rows[0]
    if len(set(headers))!=len(headers):raise ValueError('duplicate headers: '+name)
    for index,row in enumerate(rows[2:],3):
        if len(row)!=len(headers):raise ValueError(f'CSV width {name}:{index}')
        if any('\x00' in value for value in row):raise ValueError(f'NUL in {name}:{index}')
        yield index,dict(zip(headers,row))
def detail(raw,kind,name,index):
    warning=None
    num=number(raw.get('權利人持分分子'),True);den=number(raw.get('權利人持分分母'),True)
    if (num is None)!=(den is None) or (den is not None and (Decimal(den)<=0 or Decimal(num)>Decimal(den))):
        warning='invalid_official_share';num=den=None
    area=raw.get({'land':'土地移轉面積平方公尺','building':'建物移轉面積平方公尺','parking':'車位面積平方公尺'}[kind])
    # Rental files use rental-specific field names in some editions.
    if area is None:area=raw.get({'land':'土地面積平方公尺','building':'建物面積平方公尺','parking':'車位面積平方公尺'}[kind])
    return {'warning':warning,'detail_type':kind,'source_key':f'{name}:{index}','fingerprint':fingerprint(raw),'area':number(area),
        'section':raw.get('土地位置'),'parcel':raw.get('地號'),'building_number':raw.get('建號'),'raw_record':raw,
        'share_numerator':num,'share_denominator':den,'parking_type':raw.get('車位類別'),
        'parking_price':number(raw.get('車位價格'),True),'parking_floor':raw.get('車位所在樓層')}
def master(raw,region,code,details):
    target=raw.get('交易標的','')
    if target.startswith('房地'):category='house_land'
    elif target.startswith('租賃房屋'):category='building'
    elif target=='土地':category='land'
    elif target=='車位':category='parking'
    elif target=='建物':category='building'
    else:raise ValueError('unknown target '+target)
    rid=raw.get('編號') or raw.get('序號')
    if not rid or not raw.get('鄉鎮市區'):raise ValueError('missing identity')
    ages=[number(d['raw_record'].get('屋齡')) for d in details if d['detail_type']=='building' and d['raw_record'].get('屋齡')]
    return {'source_key':f'{region}:{code}:{rid}','county':COUNTIES[region],'district':raw['鄉鎮市區'],
        'dataset_type':{'a':'sale','b':'presale','c':'rental'}[code],'target_category':category,
        'transaction_date':date(raw.get('交易年月日') or raw.get('租賃年月日')),
        'address_display':raw.get('土地位置建物門牌'),'amount_ntd':number(raw.get('總價元') or raw.get('總額元')),
        'land_sqm':number(raw.get('土地移轉總面積平方公尺') or raw.get('土地面積平方公尺')),
        'building_sqm':number(raw.get('建物移轉總面積平方公尺') or raw.get('建物總面積平方公尺')),
        'unit_price':number(raw.get('單價元平方公尺')),'parking_price':number(raw.get('車位總價元') or raw.get('車位總額元')),
        'building_type':raw.get('建物型態'),'floor_display':raw.get('移轉層次') or raw.get('租賃層次'),
        'community_name':raw.get('建案名稱'),'building_age':ages[0] if ages and len(set(ages))==1 else None,
        'land_section':next((d['section'] for d in details if d['section']),None),
        'raw_record':raw,'source_fingerprint':fingerprint(raw)}
def parse_archive(path):
    groups=[];issues=[];inventory=[]
    with zipfile.ZipFile(path) as z:
        if z.testzip() is not None:raise ValueError('ZIP CRC failed')
        names={name.split('/')[-1].lower():name for name in z.namelist()}
        for base,name in sorted(names.items()):
            match=re.fullmatch(r'([a-z])_lvr_land_([abc])\.csv',base)
            if not match:continue
            region,code=match.groups()
            if region not in COUNTIES:raise ValueError('unknown county '+region)
            masters=list(read_csv(z,name));details=collections.defaultdict(list);available=[]
            ids=[r.get('編號') or r.get('序號') for _,r in masters]
            idset=set(ids)
            if len(idset)!=len(ids):raise ValueError('duplicate source IDs in '+base)
            for suffix,kind in KINDS.items():
                db=base[:-4]+'_'+suffix+'.csv'
                if db not in names:continue
                available.append(kind)
                for index,raw in read_csv(z,names[db]):
                    rid=raw.get('編號') or raw.get('序號')
                    if rid not in idset:issues.append({'file':db,'row':index,'reason':'orphan_detail'});continue
                    try:
                        parsed=detail(raw,kind,db,index)
                        details[rid].append(parsed)
                        if parsed['warning']:issues.append({'file':db,'row':index,'reason':parsed['warning'],'record_id':rid})
                    except Exception as e:raise ValueError(f'{db}:{index}: {e}') from e
            items=[]
            for index,raw in masters:
                rid=raw.get('編號') or raw.get('序號')
                try:items.append({'master':master(raw,region,code,details[rid]),'details':details[rid]})
                except Exception as e:issues.append({'file':base,'row':index,'reason':str(e),'record_id':rid})
            inventory.append({'file':base,'source_masters':len(masters),'valid_masters':len(items),'detail_types_available':available,'linked_details':sum(len(x['details']) for x in items)})
            groups.append((base,items))
    if not groups:raise ValueError('archive has no master CSV')
    return groups,issues,inventory

def main():
    path=os.environ['MOI_LOCAL_ZIP'];period=os.environ['MOI_SOURCE_PERIOD'];datetime.date.fromisoformat(period)
    digest=hashlib.sha256(open(path,'rb').read()).hexdigest()
    groups,issues,inventory=parse_archive(path)
    report={'archive_sha256':digest,'period':period,'inventory':inventory,'issues':issues}
    output=os.getenv('MOI_REPORT_PATH','/tmp/moi-national-report.json')
    with open(output,'w') as f:json.dump(report,f,ensure_ascii=False)
    print(json.dumps({'validated_masters':sum(len(x) for _,x in groups),'linked_details':sum(i['linked_details'] for i in inventory),'issues':len(issues),'archive_sha256':digest}),flush=True)
    if os.getenv('MOI_CHECK_ONLY')=='1':return
    from moi_auto_raw_import import request,SUPABASE_URL
    if SUPABASE_URL!='https://niorteztdbuyusemsgwa.supabase.co':raise RuntimeError('staging only')
    report['batches']=[]
    for name,items in groups:
        for start in range(0,len(items),100):
            batch=items[start:start+100]
            chunk=fingerprint({'version':'national-v1','period':period,'file':name,'items':batch})
            result=json.loads(request(SUPABASE_URL+'/rest/v1/rpc/moi_import_national_chunk',{'p_archive_sha':digest,'p_chunk_sha':chunk,'p_file_name':name,'p_source_period':period,'p_items':batch}))
            if result.get('status') not in ('applied','already_applied') or result.get('processed')!=len(batch):raise RuntimeError('batch reconciliation failed')
            report['batches'].append(result)
        print(json.dumps({'file':name,'processed':len(items),'details':sum(len(x['details']) for x in items)}),flush=True)
    report['complete']=not issues
    with open(output,'w') as f:json.dump(report,f,ensure_ascii=False)
    print(json.dumps({'archive_processed':digest,'complete':report['complete'],'issues':len(issues)}),flush=True)
    if issues:print('::warning::Source exceptions quarantined in report; coverage remains incomplete',flush=True)
if __name__=='__main__':main()
