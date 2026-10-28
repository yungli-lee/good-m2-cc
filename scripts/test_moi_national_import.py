import csv,io,tempfile,unittest,zipfile
from moi_national_import import parse_archive,date,number
class NationalImportTests(unittest.TestCase):
 def test_dates_and_numbers(self):
  self.assertEqual(date('1130229'),'2024-02-29')
  for value in ('1120229','1131301'):
   with self.assertRaises(ValueError):date(value)
  for value in ('NaN','-1','Infinity'):
   with self.assertRaises(ValueError):number(value)
 def test_join_multiplicity_rental_alias_and_invalid_share(self):
  def csvfile(rows):
   output=io.StringIO();w=csv.writer(output);w.writerows([rows[0],['description']*len(rows[0]),*rows[1:]]);return output.getvalue()
  files={
   'n_lvr_land_a.csv':[['編號','鄉鎮市區','交易標的','交易年月日','總價元'],['sale1','秀水鄉','房地(土地+建物)+車位','1130101','1000000']],
   'n_lvr_land_a_land.csv':[['編號','土地位置','地號','土地移轉面積平方公尺','權利人持分分子','權利人持分分母'],['sale1','測試段','00010000','50','4','1']],
   'n_lvr_land_a_park.csv':[['編號','車位類別','車位價格','車位面積平方公尺','車位所在樓層'],['sale1','坡道平面','0','','地下二樓'],['sale1','坡道平面','0','','地下二樓']],
   'a_lvr_land_c.csv':[['編號','鄉鎮市區','交易標的','租賃年月日','總額元','建物總面積平方公尺'],['rent1','士林區','租賃房屋+車位','1130102','20000','80']]
  }
  with tempfile.NamedTemporaryFile(suffix='.zip') as f:
   with zipfile.ZipFile(f.name,'w') as z:
    for name,rows in files.items():z.writestr(name,csvfile(rows))
   groups,issues,inventory=parse_archive(f.name)
  sale=next(items[0] for name,items in groups if name.startswith('n_'))
  self.assertEqual(sale['master']['county'],'彰化縣')
  self.assertEqual(len(sale['details']),3)
  self.assertEqual(sale['details'][0]['share_numerator'],None)
  self.assertEqual(sale['details'][0]['raw_record']['權利人持分分子'],'4')
  self.assertEqual(sale['details'][1]['parking_price'],'0')
  self.assertEqual(sale['details'][1]['area'],None)
  self.assertNotEqual(sale['details'][1]['source_key'],sale['details'][2]['source_key'])
  self.assertEqual(issues[0]['reason'],'invalid_official_share')
  rental=next(items[0] for name,items in groups if name.startswith('a_'))
  self.assertEqual(rental['master']['dataset_type'],'rental')
  self.assertEqual(rental['master']['building_sqm'],'80')
  self.assertEqual(rental['master']['amount_ntd'],'20000')
if __name__=='__main__':unittest.main()
