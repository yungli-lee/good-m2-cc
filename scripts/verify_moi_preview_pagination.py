"""Public Preview acceptance; IDs only come from same-site public responses."""
import json
import math
import time
import urllib.parse
from verify_moi_public_preview import read, main as verify_history


def listing(**filters):
    started = time.monotonic()
    result = read('/api/public/real-price?' + urllib.parse.urlencode(filters, doseq=True))
    rows = result['data']
    assert result['preview_sample'] is True
    assert len(rows) <= 20
    assert all(r['county'] == '彰化縣' and r['dataset_type'] == filters['dataset'] for r in rows)
    order = [(r['transaction_date'], r['id']) for r in rows]
    assert order == sorted(order, reverse=True)
    print(json.dumps({'check': filters, 'rows': len(rows), 'total': result['total'],
                      'seconds': round(time.monotonic() - started, 3),
                      'details': sum(len(r.get('details', [])) for r in rows),
                      'parking': sum(d['detail_type'] == 'parking' for r in rows for d in r.get('details', [])),
                      'notes': sum(bool(r.get('official_note')) for r in rows)}, ensure_ascii=False), flush=True)
    return result


def main():
    first = listing(dataset='sale', county='彰化縣', page=1)
    second = listing(dataset='sale', county='彰化縣', page=2)
    assert first['total'] == second['total']
    assert not ({r['id'] for r in first['data']} & {r['id'] for r in second['data']})
    last_page = math.ceil(first['total'] / 20)
    last = listing(dataset='sale', county='彰化縣', page=last_page)
    assert last['total'] == first['total'] and len(last['data']) == (first['total'] - 1) % 20 + 1
    empty = listing(dataset='sale', county='彰化縣', page=last_page + 1)
    assert empty['total'] == first['total'] and not empty['data']
    sale = listing(dataset='sale', county='彰化縣', district='秀水鄉', **{'from': '2026-08-01', 'to': '2026-08-31'})
    assert sale['data'] and all(r['district'] == '秀水鄉' and '2026-08-01' <= r['transaction_date'] <= '2026-08-31' for r in sale['data'])
    assert any(d['detail_type'] == 'parking' for r in sale['data'] for d in r['details'])
    assert any(r['official_note'] for r in sale['data'])
    listing(dataset='presale', county='彰化縣', page=1)
    verify_history()


if __name__ == '__main__':
    main()  # First HTTP error stops this run; no automatic retries.
