import csv,io,json,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
import moi_changhua_year111_backfill as scoped
from moi_national_import import fingerprint

class ScopedTests(unittest.TestCase):
    def archive(self,folder,invalid=False):
        path=Path(folder)/'test.zip'
        with zipfile.ZipFile(path,'w') as z:
            for name in ['n_lvr_land_a.csv','n_lvr_land_b.csv','a_lvr_land_a.csv','n_lvr_land_c.csv']:
                data=io.StringIO();writer=csv.writer(data)
                writer.writerow(['編號','鄉鎮市區','交易標的','交易年月日','備註']);writer.writerow(['id','district','target','date','note'])
                writer.writerow([name[0]+'X','秀水鄉','土地','1120101',' 原文； '])
                if invalid and name=='n_lvr_land_a.csv':writer.writerow(['MALFORMED'])
                z.writestr(name,data.getvalue())
        return path
    def test_only_county_and_two_datasets(self):
        with tempfile.TemporaryDirectory() as folder:
            groups,report=scoped.plan(self.archive(folder),'111S1')
        self.assertEqual({name for name,_ in groups},scoped.FILES)
        self.assertEqual({x['master']['county'] for _,items in groups for x in items},{'彰化縣'})
        self.assertEqual(report['period'],'2022-03-31');self.assertEqual(report['unresolved_issues'],0)
        self.assertEqual(groups[0][1][0]['master']['raw_record']['備註'],' 原文； ')
    def test_earlier_or_future_quarters_rejected(self):
        for season in ['110S4','112S1','111S0','national']:
            with self.assertRaises(ValueError):scoped.plan('unused',season)
    def test_new_chunk_identity_includes_scope(self):
        with tempfile.TemporaryDirectory() as folder:
            groups,report=scoped.plan(self.archive(folder),'111S1')
        name,batch=groups[0]
        old=fingerprint({'version':'national-v1','period':report['period'],'file':name,'items':batch})
        self.assertNotEqual(scoped.chunk_hash(report,name,batch),old)
        self.assertEqual(scoped.chunk_hash(report,name,batch),scoped.chunk_hash(report,name,batch))
    def test_unresolved_scoped_row_is_not_complete(self):
        with tempfile.TemporaryDirectory() as folder:
            _,report=scoped.plan(self.archive(folder,True),'111S1')
        self.assertEqual(report['unresolved_issues'],1);self.assertFalse(report['complete'])
    def test_requests_never_automatically_retry(self):
        with patch('urllib.request.urlopen',side_effect=TimeoutError('uncertain')) as send:
            with self.assertRaises(TimeoutError):scoped.request(scoped.PROJECT_URL+'/rest/v1/rpc/test','not-a-real-key',{})
        self.assertEqual(send.call_count,1)
    def test_detail_fingerprint_failure_is_fatal(self):
        with tempfile.TemporaryDirectory() as folder:
            groups,report=scoped.plan(self.archive(folder),'111S1')
        batch=groups[0][1]
        rows=[{'id':1,'source_record_key':batch[0]['master']['source_key'],'source_period_date':report['period'],'source_record_fingerprint':batch[0]['master']['source_fingerprint']}]
        with patch.object(scoped,'request',side_effect=[rows,[{'transaction_id':1,'source_detail_key':'extra','source_row_hash':'x'}]]):
            with self.assertRaises(RuntimeError):scoped.verify_batch(scoped.PROJECT_URL,'test',batch,report['period'])
class QuarantineTests(unittest.TestCase):
    def report(self):
        return {'season':'111S4','archive_sha256':'506fd6cffffde253223a531d85bd13f36b857bb729941d694a59f57b5f3862bc','unresolved_issues':1,'issues':[{'file':'n_lvr_land_a.csv','row':3156,'record_id':'RPSNMLOKIIHGFDN58DA','reason':'day is out of range for month','raw_record':{'交易年月日':'1091000'}}]}
    def test_exact_exception_remains_unresolved(self):
        r=self.report();scoped.apply_authorized_quarantine(r)
        self.assertEqual(r['blocking_issues'],0);self.assertEqual(r['unresolved_issues'],1)
        self.assertEqual(r['issues'][0]['raw_record']['交易年月日'],'1091000')
    def test_unknown_exception_is_blocking(self):
        for field,value in [('season','111S3'),('archive_sha256','changed')]:
            r=self.report();r[field]=value;scoped.apply_authorized_quarantine(r);self.assertEqual(r['blocking_issues'],1)
        r=self.report();r['issues'][0]['record_id']='other';scoped.apply_authorized_quarantine(r);self.assertEqual(r['blocking_issues'],1)
if __name__=='__main__':unittest.main()
