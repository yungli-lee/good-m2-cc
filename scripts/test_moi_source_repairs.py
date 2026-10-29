import csv,io,unittest,zipfile
from moi_national_import import read_csv,master,date,detail

HEADERS=['鄉鎮市區','交易標的','土地位置建物門牌','土地移轉總面積平方公尺','都市土地使用分區','非都市土地使用分區','非都市土地使用編定','交易年月日','交易筆棟數','移轉層次','總樓層數','建物型態','主要用途','主要建材','建築完成年月','建物移轉總面積平方公尺','建物現況格局-房','建物現況格局-廳','建物現況格局-衛','建物現況格局-隔間','有無管理組織','總價元','單價元平方公尺','車位類別','車位移轉總面積平方公尺','車位總價元','備註','編號','建案名稱','棟及號','解約情形']
ROW=['竹山鎮','房地(土地+建物)+車位','南投縣竹山鎮建國路','117.58','住','','','1131013','土地1建物1車位2','三層','7','華廈(10層含以下有電梯)','見其他登記事項','鋼筋混凝土造','','297.52','6','4','4','有','無','17100000','66306','坡道平面','75.82','2400000','A7、A8兩戶客變為一戶。','RPQNMLOJJIJGFDM58DB','雙星280(I期)','A棟7','8號','']
def parse(row):
    text=io.StringIO();writer=csv.writer(text);writer.writerow(HEADERS);writer.writerow(['English']*len(HEADERS));writer.writerow(row)
    data=io.BytesIO()
    with zipfile.ZipFile(data,'w') as z:z.writestr('m_lvr_land_b.csv',text.getvalue())
    data.seek(0);issues=[]
    with zipfile.ZipFile(data) as z:rows=list(read_csv(z,'m_lvr_land_b.csv',issues))
    return rows,issues
class SourceRepairTests(unittest.TestCase):
    def test_exact_reviewed_source_and_note(self):
        rows,issues=parse(ROW)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0][1]['棟及號'],'A棟7,8號')
        self.assertEqual(rows[0][1]['備註'],ROW[26])
        self.assertTrue(issues[0]['resolved'])
        self.assertEqual(issues[0]['original_values'],ROW)
    def test_unreviewed_width_error_stays_quarantined(self):
        row=ROW[:];row[27]='UNKNOWN'
        rows,issues=parse(row)
        self.assertEqual(rows,[])
        self.assertEqual(issues[0]['reason'],'csv_width_mismatch')
        self.assertNotIn('resolved',issues[0])
    def test_official_invalid_dates_are_not_invented(self):
        for raw in ['40408','41208']:
            with self.assertRaises(ValueError):date(raw)
    def test_missing_district_exact_address_resolution_keeps_raw(self):
        raw={'編號':'RPQNMLSLPHLGFAE68CB','鄉鎮市區':'','交易標的':'房地(土地+建物)','土地位置建物門牌':'高雄市鼓山區馬卡道路','交易年月日':'1150726'}
        result=master(raw,'e','b',[])
        self.assertEqual(result['district'],'鼓山區')
        self.assertEqual(result['raw_record']['鄉鎮市區'],'')
        other=dict(raw,編號='UNKNOWN')
        with self.assertRaises(ValueError):master(other,'e','b',[])
    def test_unaffected_payload_keeps_chunk_identity(self):
        raw={'編號':'UNCHANGED','鄉鎮市區':'彰化市','交易標的':'土地','交易年月日':'1130101'}
        self.assertNotIn('source_resolutions',master(raw,'n','a',[]))
    def test_invalid_share_keeps_raw_not_numeric_guess(self):
        raw={'權利人持分分子':'2','權利人持分分母':'1'}
        parsed=detail(raw,'land','n_lvr_land_a_land.csv',3)
        self.assertEqual(parsed['warning'],'invalid_official_share')
        self.assertIsNone(parsed['share_numerator'])
        self.assertEqual(parsed['raw_record'],raw)
if __name__=='__main__':unittest.main()
