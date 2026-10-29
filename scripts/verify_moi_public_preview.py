"""Verify the public Preview API using only public responses, without DB credentials."""
import json,urllib.request,urllib.parse

BASE='https://feature-real-price-public-se.good-m2-cc.pages.dev'
def read(path,payload=None):
    data=None if payload is None else json.dumps(payload).encode()
    request=urllib.request.Request(BASE+path,data=data,headers={'Accept':'application/json','Content-Type':'application/json','User-Agent':'good-m2-preview-ci/1.0'})
    with urllib.request.urlopen(request,timeout=25) as response:return json.load(response)

def main():
    # Administrative area/date filters are public test inputs. No private DB
    # identifiers, exact addresses, credentials or Supabase rows are sent here.
    query=urllib.parse.urlencode({'dataset':'sale','county':'彰化縣','district':'彰化市','from':'2026-09-01','to':'2026-09-30','page':1})
    listing=read('/api/public/real-price?'+query)
    rows=listing.get('data')
    if listing.get('preview_sample') is not True or not isinstance(rows,list) or not rows:raise RuntimeError('public Preview did not return staging transaction results')
    if any(not '2026-09-01'<=row['transaction_date']<='2026-09-30' for row in rows):raise RuntimeError('public Preview date filter mismatch')
    result={'public_query_verified':True,'returned_rows':len(rows),'history_response_verified':False,'history_verified':False,'cross_period_history_verified':False}
    try:
        # IDs originate exclusively from the same publicly accessible listing
        # API. This is the application's public list -> history request flow.
        ids=[row['id'] for row in rows]
        histories=read('/api/public/real-price-history',{'ids':ids}).get('histories',{})
        if not isinstance(histories,dict):raise RuntimeError('invalid public history response')
        for entries in histories.values():
            if len(entries)<2:raise RuntimeError('a history button would have fewer than two entries')
            dates=[entry['transaction_date'] for entry in entries]
            if dates!=sorted(dates,reverse=True):raise RuntimeError('history is not ordered by transaction date')
        result['history_response_verified']=True
        result['history_verified']=bool(histories)
        result['history_groups']=len(histories)
        result['cross_period_history_verified']=any(entry['transaction_date']<'2026-09-01' for entries in histories.values() for entry in entries)
    except Exception as error:
        # History remains separately unverified; don't misreport a working
        # primary public query as broken because a new optional feature failed.
        result['history_error']=type(error).__name__
    with open('/tmp/moi-preview-verification.json','w') as output:json.dump(result,output)
    print(json.dumps(result),flush=True)  # Counts/booleans only; never addresses or IDs.
if __name__=='__main__':main()
