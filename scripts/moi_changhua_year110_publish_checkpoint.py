"""Persist one scoped report to the authorized branch; no credentials in reports."""
import collections,json,os,urllib.request
from pathlib import Path
BRANCH='feature/real-price-public-search-v1'
REPO='yungli-lee/good-m2-cc'
def api(path,payload=None,method=None):
    req=urllib.request.Request('https://api.github.com/repos/'+REPO+path,data=None if payload is None else json.dumps(payload).encode(),method=method,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','User-Agent':'good-m2-checkpoint/1.0','Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=20) as response:return json.load(response)
def main():
    if os.environ['GITHUB_REF']!='refs/heads/'+BRANCH:raise RuntimeError('Wrong branch')
    report=json.loads(Path(os.environ['MOI_REPORT_PATH']).read_text())
    safe={k:report.get(k) for k in ['version','scope','season','period','archive_sha256','inventory','batches','import_complete','complete','unresolved_issues','blocking_issues','authorized_quarantines']}
    safe['implementation_sha']=os.environ['GITHUB_SHA']
    safe['source_backup']='GitHub Actions artifact changhua-source-'+report['season']+'-'+os.environ['GITHUB_RUN_ID']+'-'+os.environ['GITHUB_RUN_ATTEMPT']
    safe['source_backup_retention_days']=90
    safe['long_term_backup_pending']=True
    safe['source_issue_counts']=dict(collections.Counter(x['reason'] for x in report.get('issues',[])))
    if 'error' in report:safe['error_type']=report['error']['type']
    head=api('/git/ref/heads/'+BRANCH)['object']['sha'];base=api('/git/commits/'+head)['tree']['sha']
    tree=api('/git/trees',{'base_tree':base,'tree':[{'path':'docs/moi-changhua-through-2023/'+report['season']+'.json','mode':'100644','type':'blob','content':json.dumps(safe,ensure_ascii=False,indent=2)+'\n'}]})['sha']
    commit=api('/git/commits',{'message':'docs: record scoped Changhua '+report['season']+' reconciliation','tree':tree,'parents':[head]})['sha']
    # A concurrent branch update makes this non-fast-forward and fails safely.
    api('/git/refs/heads/'+BRANCH,{'sha':commit,'force':False},'PATCH')
    print(json.dumps({'checkpoint_commit':commit,'season':report['season'],'complete':report['complete']}),flush=True)
if __name__=='__main__':main()

