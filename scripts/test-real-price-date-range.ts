import assert from 'node:assert/strict';
import {parseSearchDate} from '../lib/real-price/date-range.ts';
assert.equal(parseSearchDate('1100101'),'2021-01-01');
assert.equal(parseSearchDate('1131231'),'2024-12-31');
assert.equal(parseSearchDate('１１３０２２９'),'2024-02-29');
assert.equal(parseSearchDate('2024-02-29'),'2024-02-29');
for(const value of ['1120229','1130230','1131301','1130001','2024-02-30','110101','abc']) assert.equal(parseSearchDate(value),null);
console.log('Date range regression cases passed');
