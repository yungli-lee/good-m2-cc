#!/usr/bin/env python3
"""Official archive -> national masters + all available detail rows, staging only."""
import collections, csv, datetime, hashlib, io, json, os, re, sys, zipfile
from decimal import Decimal
csv.field_size_limit(8*1024*1024)
COUNTIES=dict(zip('abcdefghijkmnopqtuvwxz',['臺北市','臺中市','基隆市','臺南市','高雄市','新北市','宜蘭縣','桃園市','嘉義市','新竹縣','苗栗縣','南投縣','彰化縣','新竹市','雲林縣','嘉義縣','屏東縣','花蓮縣','臺東縣','金門縣','澎湖縣','連江縣']))
KINDS={'land':'land','build':'building','park':'parking'}
# Exact official source rows reviewed against the preserved quarterly archives.
# Only these four row hashes may join the unquoted comma inside 棟及號.
REVIEWED_UNIT_COMMAS={
    ('e_lvr_land_b.csv','250ed6977b42e075204f00897649e28ba81a62e99720b446d133572d8ef1db9d'),
    ('m_lvr_land_b.csv','e39545278a912e393e38cc0d45ad5b0a692d42b61d05e0ddd082b59ed861972a'),
    ('a_lvr_land_b.csv','18c3808dd52385b8fdd244a9801f3a956714efbd54547c95cf878f673a748674'),
    ('h_lvr_land_b.csv','bddfdb7519d4bc9ac4b1df0a93af674fc90acf9145426bb0eec451ab0953ff1d'),
}
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
def read_csv(z,name,issues=None):
    rows=list(csv.reader(io.StringIO(decode(z.read(name)))))
    if len(rows)<2:raise ValueError('missing CSV headers: '+name)
    headers=rows[0]
    if len(set(headers))!=len(headers):raise ValueError('duplicate headers: '+name)
    for index,row in enumerate(rows[2:],3):
        if len(row)!=len(headers):
            if len(row)==len(headers)+1 and headers[-3:]==['建案名稱','棟及號','解約情形'] and (name.split('/')[-1].lower(),fingerprint(row)) in REVIEWED_UNIT_COMMAS:
                original=row[:];column=headers.index('棟及號')
                row=row[:column]+[','.join(row[column:column+2])]+row[column+2:]
                if issues is not None:issues.append({'file':name,'row':index,'reason':'reviewed_unit_comma_repaired','resolved':True,'disposition':'joined_exact_reviewed_unit_field','original_values':original,'repaired_values':row})
            else:
                if issues is None:raise ValueError(f'CSV width {name}:{index}')
                issues.append({'file':name,'row':index,'reason':'csv_width_mismatch','expected_columns':len(headers),'actual_columns':len(row),'headers':headers,'original_values':row})
                continue
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
    district=raw.get('鄉鎮市區');resolutions=[]
    if not district and (region,code,rid)==('e','b','RPQNMLSLPHLGFAE68CB') and raw.get('土地位置建物門牌','').startswith('高雄市鼓山區'):
        district='鼓山區';resolutions.append('district_from_explicit_official_address')
    if not rid or not district:raise ValueError('missing identity')
    ages=[number(d['raw_record'].get('屋齡')) for d in details if d['detail_type']=='building' and d['raw_record'].get('屋齡')]
    result={'source_key':f'{region}:{code}:{rid}','county':COUNTIES[region],'district':district,
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
    if resolutions:result['source_resolutions']=resolutions
    return result
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
            masters=list(read_csv(z,name,issues));details=collections.defaultdict(list);available=[]
            ids=[r.get('編號') or r.get('序號') for _,r in masters]
            idset=set(ids)
            if len(idset)!=len(ids):raise ValueError('duplicate source IDs in '+base)
            for suffix,kind in KINDS.items():
                db=base[:-4]+'_'+suffix+'.csv'
                if db not in names:continue
                available.append(kind)
                for index,raw in read_csv(z,names[db],issues):
                    rid=raw.get('編號') or raw.get('序號')
                    if rid not in idset:issues.append({'file':db,'row':index,'reason':'orphan_detail'});continue
                    try:
                        parsed=detail(raw,kind,db,index)
                        details[rid].append(parsed)
                        if parsed['warning']:issues.append({'file':db,'row':index,'reason':parsed['warning'],'record_id':rid,'resolved':True,'disposition':'raw_preserved_normalized_share_null'})
                    except Exception as e:raise ValueError(f'{db}:{index}: {e}') from e
            items=[]
            for index,raw in masters:
                rid=raw.get('編號') or raw.get('序號')
                try:
                    parsed=master(raw,region,code,details[rid])
                    items.append({'master':parsed,'details':details[rid]})
                    for resolution in parsed.get('source_resolutions',[]):issues.append({'file':base,'row':index,'reason':resolution,'record_id':rid,'resolved':True,'disposition':'raw_unchanged_normalized_district_from_address'})
                except Exception as e:issues.append({'file':base,'row':index,'reason':str(e),'record_id':rid,'disposition':'quarantined_no_invented_identity_or_date','raw_record':raw})
            source_rows=max(0,sum(1 for _ in csv.reader(io.StringIO(decode(z.read(name)))))-2)
            inventory.append({'file':base,'source_masters':source_rows,'parsed_masters':len(masters),'valid_masters':len(items),'detail_types_available':available,'linked_details':sum(len(x['details']) for x in items)})
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
    selected=None
    if os.getenv('MOI_ONLY_SOURCE_KEYS'):
        selected=json.loads(os.environ['MOI_ONLY_SOURCE_KEYS'])
        if not isinstance(selected,list) or not 1<=len(selected)<=100 or any(not isinstance(key,str) or not re.fullmatch(r'[a-z]:[abc]:[A-Za-z0-9]+',key) for key in selected):raise ValueError('invalid selected source keys')
        selected=set(selected)
        found={item['master']['source_key'] for _,items in groups for item in items}
        if selected-found:raise ValueError('selected source keys missing from validated archive')
        report['import_scope']='selected_source_keys';report['selected_source_keys']=sorted(selected)
    else:report['import_scope']='full_archive'
    from moi_auto_raw_import import request,SUPABASE_URL
    if SUPABASE_URL!='https://niorteztdbuyusemsgwa.supabase.co':raise RuntimeError('staging only')
    report['batches']=[]
    for name,items in groups:
        if selected is not None:items=[item for item in items if item['master']['source_key'] in selected]
        for start in range(0,len(items),100):
            batch=items[start:start+100]
            chunk=fingerprint({'version':'national-v1','period':period,'file':name,'items':batch})
            result=json.loads(request(SUPABASE_URL+'/rest/v1/rpc/moi_import_national_chunk',{'p_archive_sha':digest,'p_chunk_sha':chunk,'p_file_name':name,'p_source_period':period,'p_items':batch}))
            if result.get('status') not in ('applied','already_applied') or result.get('processed')!=len(batch):raise RuntimeError('batch reconciliation failed')
            report['batches'].append(result)
        print(json.dumps({'file':name,'processed':len(items),'details':sum(len(x['details']) for x in items)}),flush=True)
    report['source_validation_complete']=not any(not issue.get('resolved',False) for issue in issues)
    report['import_complete']=True
    report['complete']=report['source_validation_complete'] and selected is None
    report['unresolved_issues']=sum(not issue.get('resolved',False) for issue in issues)
    with open(output,'w') as f:json.dump(report,f,ensure_ascii=False)
    print(json.dumps({'archive_processed':digest,'complete':report['complete'],'import_scope':report['import_scope'],'issues':len(issues),'unresolved_issues':report['unresolved_issues']}),flush=True)
    if report['unresolved_issues']:print('::warning::Source exceptions quarantined in report; coverage remains incomplete',flush=True)
if __name__=='__main__':main()
