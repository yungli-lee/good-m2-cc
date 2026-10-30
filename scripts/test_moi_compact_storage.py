import copy
import unittest
from moi_compact_storage_trial import compact_item


class CompactStorageTests(unittest.TestCase):
    def test_query_fields_notes_fingerprints_and_invalid_shares_survive(self):
        item = {'master': {'source_key': 'n:a:ABC', 'source_fingerprint': 'original',
                          'address_display': '完整門牌', 'amount_ntd': '100',
                          'raw_record': {'備註': ' 原文；\n第二行 ', 'unused': 'large'}},
                'details': [
                    {'detail_type': 'land', 'section': '甲段', 'parcel': '00010002',
                     'share_numerator': None, 'share_denominator': None,
                     'fingerprint': 'original-detail', 'warning': 'invalid_official_share',
                     'raw_record': {'權利人持分分子': '7', '權利人持分分母': '5', 'unused': 'large'}},
                    {'detail_type': 'parking', 'parking_price': '0', 'parking_floor': '地下二樓',
                     'warning': None, 'raw_record': {'車位價格': '0', 'unused': 'large'}}]}
        original = copy.deepcopy(item)
        result = compact_item(item, 'a'*64)
        self.assertEqual(item, original)
        self.assertEqual(result['master']['raw_record']['備註'], ' 原文；\n第二行 ')
        self.assertEqual(result['master']['source_fingerprint'], 'original')
        self.assertEqual(result['details'][0]['raw_record'], {'權利人持分分子': '7', '權利人持分分母': '5'})
        self.assertEqual(result['details'][0]['parcel'], '00010002')
        self.assertEqual(result['details'][1]['parking_price'], '0')
        self.assertEqual(result['details'][1]['parking_floor'], '地下二樓')
        self.assertEqual(result['details'][1]['raw_record'], {})

    def test_no_note_does_not_create_one_and_bad_archive_hash_is_rejected(self):
        item = {'master': {'raw_record': {}}, 'details': []}
        self.assertNotIn('備註', compact_item(item, '0'*64)['master']['raw_record'])
        with self.assertRaises(ValueError):
            compact_item(item, 'unverified')


if __name__ == '__main__':
    unittest.main()
