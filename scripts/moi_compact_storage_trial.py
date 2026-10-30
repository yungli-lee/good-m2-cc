#!/usr/bin/env python3
"""Offline-only storage projection; never connects to a database or imports rows.

Retains every normalized field and original fingerprint. Complete official rows
remain in the input ZIP; this projection is NOT permission to remove live data.
"""
import argparse
import collections
import copy
import hashlib
import json
import re
from pathlib import Path

from moi_national_import import parse_archive


def compact_item(item, archive_sha256):
    if not re.fullmatch(r'[a-f0-9]{64}', archive_sha256):
        raise ValueError('invalid archive SHA256')
    result = copy.deepcopy(item)
    original = item['master'].get('raw_record') or {}
    raw = {'_moi_storage_version': 1, '_moi_archive_sha256': archive_sha256}
    # The API reads this exact key. Keep official text, whitespace and newlines.
    if '備註' in original:
        raw['備註'] = original['備註']
    result['master']['raw_record'] = raw
    for source, detail in zip(item['details'], result['details']):
        original = source.get('raw_record') or {}
        retained = {}
        # A null normalized share must not hide the official invalid value.
        if source.get('warning') == 'invalid_official_share':
            retained = {key: original[key] for key in
                        ('權利人持分分子', '權利人持分分母') if key in original}
        detail['raw_record'] = retained
    return result


def encoded_size(value):
    return len(json.dumps(value, ensure_ascii=False, sort_keys=True,
                          separators=(',', ':')).encode('utf-8'))


def benchmark(path):
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    groups, issues, inventory = parse_archive(path)
    totals = collections.Counter()
    for _, items in groups:
        for item in items:
            compact = compact_item(item, digest)
            totals['masters'] += 1
            totals['details'] += len(item['details'])
            totals['full_master_payload_bytes'] += encoded_size(item['master'])
            totals['compact_master_payload_bytes'] += encoded_size(compact['master'])
            totals['full_detail_payload_bytes'] += sum(map(encoded_size, item['details']))
            totals['compact_detail_payload_bytes'] += sum(map(encoded_size, compact['details']))
            assert {k: v for k, v in item['master'].items() if k != 'raw_record'} == {
                k: v for k, v in compact['master'].items() if k != 'raw_record'}
            assert item['master']['raw_record'].get('備註') == compact['master']['raw_record'].get('備註')
            for before, after in zip(item['details'], compact['details']):
                assert {k: v for k, v in before.items() if k != 'raw_record'} == {
                    k: v for k, v in after.items() if k != 'raw_record'}
                if before.get('warning') == 'invalid_official_share':
                    for key in ('權利人持分分子', '權利人持分分母'):
                        assert before['raw_record'].get(key) == after['raw_record'].get(key)
    before = totals['full_master_payload_bytes'] + totals['full_detail_payload_bytes']
    after = totals['compact_master_payload_bytes'] + totals['compact_detail_payload_bytes']
    return {'mode': 'offline_only_no_database_writes', 'archive_sha256': digest,
            'source_files': len(inventory), **totals,
            'payload_reduction_percent': round(100 * (before-after) / before, 2),
            'source_issue_counts': dict(collections.Counter(x['reason'] for x in issues)),
            'normalized_fields_and_fingerprints_unchanged': True,
            'physical_disk_savings_measured': False,
            'layout_or_schema_changed': False,
            'live_import_enabled': False,
            'requirements_before_live_use': [
                'durable original ZIP backup with checksum and restore verification',
                'archive-to-source provenance manifest',
                'versioned import chunk hashes; never reuse full-raw chunk identity',
                'read-path equivalence checks and bounded staging pilot',
                'existing 7GB guard and newer-source preservation remain enforced']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    report = benchmark(args.archive)
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
