#!/usr/bin/env python3
"""Bounded, idempotent current Changhua Stage -> Production append.

Never runs historical prefix comparison. Uses official source_record_key to
check identity; uses the existing transactional Production RPC to preserve
master and detail records together. Fails closed if IDs or keys conflict.
Only the most recent bounded staging rows are considered, not full history.
"""
import datetime
import hashlib
import json
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request

STAGING = "https://niorteztdbuyusemsgwa.supabase.co"
PRODUCTION = "https://rlbuadkmylulieoryzal.supabase.co"
REPORT = pathlib.Path(os.getenv("MOI_REPORT_PATH", "/tmp/moi-production-current-append.json"))
SCAN_LIMIT = 4000
BATCH = 30

def api(base, key, table, params=None, payload=None):
    qs = ("?" + urllib.parse.urlencode(params)) if params else ""
    headers = {"apikey": key, "Accept": "application/json", "User-Agent": "good-m2-current-append/1.0"}
    if key.startswith("eyJ"):
        headers["Authorization"] = "Bearer " + key
    if payload is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        base + "/rest/v1/" + table + qs,
        data=json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None,
        headers=headers,
        method="POST" if payload is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.load(resp)

def batches(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]

def main():
    stage = os.getenv("MOI_STAGING_SUPABASE_SERVICE_ROLE_KEY", "").strip()
    prod = os.getenv("MOI_PRODUCTION_SUPABASE_SERVICE_ROLE_KEY", "").strip()
    apply = os.getenv("MOI_APPEND_APPLY", "0") == "1"
    if not stage or not prod:
        raise RuntimeError("Both Staging and Production service credentials are required")
    if os.getenv("MOI_STAGING_URL", STAGING).rstrip("/") != STAGING or os.getenv("MOI_PRODUCTION_URL", PRODUCTION).rstrip("/") != PRODUCTION:
        raise RuntimeError("Refusing an unexpected database destination")

    report = {"started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "mode": "apply" if apply else "dry_run",
              "scope": "most recent 4000 Staging Changhua current-source rows",
              "scanned": 0, "current_source_rows": 0, "existing": 0,
              "pending_new": 0, "inserted": 0, "verified": 0,
              "source_date_min": None, "source_date_max": None, "completed": False}
    def save():
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    save()

    # Bounded window by descending ingestion id. Report is explicitly scoped:
    # scanning 4000 newest rows is NOT proof that the whole archive is complete.
    recent = []
    for offset in range(0, SCAN_LIMIT, 1000):
        page = api(STAGING, stage, "moi_real_price_transactions",
                   {"select": "*", "order": "id.desc", "offset": offset, "limit": 1000})
        recent.extend(page)
        if len(page) < 1000:
            break
    report["scanned"] = len(recent)
    current = [r for r in recent if r.get("county") == "彰化縣"
               and r.get("dataset_type") in ("sale", "presale")
               and str(r.get("source_record_key") or "").startswith(("n:a:", "n:b:"))]
    report["current_source_rows"] = len(current)
    keys = [r["source_record_key"] for r in current]
    if len(keys) != len(set(keys)):
        raise RuntimeError("Duplicate current-source identity in Staging")
    dates = sorted(str(r["transaction_date"]) for r in current if r.get("transaction_date"))
    if dates:
        report["source_date_min"], report["source_date_max"] = dates[0], dates[-1]
    save()

    existing = {}
    for group in batches(current, 50):
        terms = ",".join(r["source_record_key"] for r in group)
        rows = api(PRODUCTION, prod, "moi_real_price_transactions",
                   {"select": "id,source_record_key", "source_record_key": "in.(" + terms + ")", "limit": 100})
        for row in rows:
            existing[row["source_record_key"]] = row["id"]
    new = [r for r in current if r["source_record_key"] not in existing]
    report["existing"], report["pending_new"] = len(current) - len(new), len(new)
    save()
    if not new:
        report["completed"] = True
        save()
        print(json.dumps(report, ensure_ascii=False))
        return

    # Existing Production RPC uses staging IDs. Reject any ID collision with
    # a different source identity rather than incorrectly attaching details.
    for group in batches(new, 50):
        ids = ",".join(str(int(r["id"])) for r in group)
        rows = api(PRODUCTION, prod, "moi_real_price_transactions",
                   {"select": "id,source_record_key", "id": "in.(" + ids + ")", "limit": 100})
        if rows:
            raise RuntimeError("Production ID collision: use a source-key based RPC before applying")

    if not apply:
        report["completed"] = True
        report["message"] = "Dry run only. No Production writes."
        save()
        print(json.dumps(report, ensure_ascii=False))
        return

    # Fail closed on every unexpected RPC response; no deletes or updates.
    for group in batches(list(reversed(new)), BATCH):
        ids = [int(r["id"]) for r in group]
        details = []
        for offset in range(0, 20000, 1000):
            page = api(STAGING, stage, "moi_transaction_details",
                       {"select": "*", "transaction_id": "in.(" + ",".join(map(str, ids)) + ")",
                        "order": "id.asc", "offset": offset, "limit": 1000})
            details.extend(page)
            if len(page) < 1000:
                break
        else:
            raise RuntimeError("Detail pagination safety limit reached")
        by_id = {id_: [] for id_ in ids}
        for d in details:
            if d["transaction_id"] not in by_id:
                raise RuntimeError("Orphan detail row")
            by_id[d["transaction_id"]].append(d)
        items = [{"master": r, "details": by_id[int(r["id"])]} for r in group]
        digest = hashlib.sha256(json.dumps(items, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        outcome = api(PRODUCTION, prod, "rpc/moi_import_transfer_chunk",
                      payload={"p_batch_key": digest, "p_items": items})
        if outcome.get("status") != "verified" or outcome.get("masters") != len(group) or outcome.get("details") != len(details):
            raise RuntimeError("Production atomic import RPC rejected or mismatched batch")
        report["inserted"] += len(group)
        save()

    for group in batches(new, 50):
        rows = api(PRODUCTION, prod, "moi_real_price_transactions",
                   {"select": "source_record_key",
                    "source_record_key": "in.(" + ",".join(r["source_record_key"] for r in group) + ")",
                    "limit": 100})
        report["verified"] += len(rows)
        save()
    if report["verified"] != len(new):
        raise RuntimeError("Post-append source identity verification failed")
    report["completed"] = True
    save()
    print(json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    main()
