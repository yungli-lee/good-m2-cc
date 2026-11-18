#!/usr/bin/env python3
"""Offline guard tests: no network and no database writes."""
import importlib.util
import os
import pathlib
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("current_append", ROOT / "scripts/moi_production_current_append.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def record(id, key):
    return {"id": id, "county": "彰化縣", "dataset_type": "sale",
            "source_record_key": key, "transaction_date": "2026-11-11"}

class GuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.original_report = module.REPORT
        module.REPORT = pathlib.Path(self.temp.name) / "report.json"
        self.addCleanup(lambda: setattr(module, "REPORT", self.original_report))
        self.env = patch.dict(os.environ, {
            "MOI_STAGING_SUPABASE_SERVICE_ROLE_KEY": "staging-key",
            "MOI_PRODUCTION_SUPABASE_SERVICE_ROLE_KEY": "production-key",
            "MOI_APPEND_APPLY": "0",
            "MOI_STAGING_URL": module.STAGING,
            "MOI_PRODUCTION_URL": module.PRODUCTION
        })
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_dry_run_never_posts_to_production(self):
        def fake_api(base, key, table, params=None, payload=None):
            self.assertIsNone(payload)
            if base == module.STAGING:
                return [record(101, "n:a:101")] if params.get("offset") == 0 else []
            if "source_record_key" in params:
                return []
            if "id" in params:
                return []
            self.fail("Unexpected API")
        with patch.object(module, "api", side_effect=fake_api):
            module.main()
        import json
        report = json.loads(module.REPORT.read_text())
        self.assertEqual(report["pending_new"], 1)
        self.assertEqual(report["inserted"], 0)
        self.assertEqual(report["mode"], "dry_run")

    def test_id_collision_fails_closed(self):
        def fake_api(base, key, table, params=None, payload=None):
            self.assertIsNone(payload)
            if base == module.STAGING:
                return [record(101, "n:a:101")] if params.get("offset") == 0 else []
            if "source_record_key" in params:
                return []
            return [{"id": 101, "source_record_key": "different"}]
        with patch.object(module, "api", side_effect=fake_api):
            with self.assertRaisesRegex(RuntimeError, "ID collision"):
                module.main()

    def test_full_scan_fails_closed(self):
        original = module.SCAN_LIMIT
        module.SCAN_LIMIT = 1000
        self.addCleanup(lambda: setattr(module, "SCAN_LIMIT", original))
        def fake_api(base, key, table, params=None, payload=None):
            self.assertEqual(base, module.STAGING)
            return [record(i, f"n:a:{i}") for i in range(1000)]
        with patch.object(module, "api", side_effect=fake_api):
            with self.assertRaisesRegex(RuntimeError, "scan reached safety limit"):
                module.main()

if __name__ == "__main__":
    unittest.main()
