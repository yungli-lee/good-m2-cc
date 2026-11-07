#!/usr/bin/env python3
"""Per-run verified MOI Production transfer report."""
import datetime
import json
import os
import pathlib

p=pathlib.Path("/tmp/moi-paced-resume-report.json")
s=json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
n=int(s.get("new_transactions",0))
d=int(s.get("new_details",0))
prior=s.get("verified_prefix_count")
after=s.get("verified_final_prefix_count")
finished=bool(s.get("completed"))
valid=finished and after is not None and prior is not None and after-int(prior)==n
exhausted=bool(s.get("source_exhausted"))
state="完整完成／來源已搬完" if valid and exhausted else ("本輪5,000筆完整成功" if valid and n==5000 else "未完成／須檢查執行日誌")
lines=[
"# 彰化縣實價登錄 Production 續傳稽核報告",
"",
f"- GitHub Run：{os.environ.get('GITHUB_RUN_ID','未提供')}",
f"- 建立時間 UTC：{datetime.datetime.now(datetime.timezone.utc).isoformat()}",
f"- 匯入狀態：{state}",
f"- 本輪交易新增：{n:,} 筆",
f"- 本輪土地建物車位明細新增：{d:,} 筆",
f"- 匯入前交易前綴驗證數：{prior}",
f"- 匯入後交易前綴驗證數：{after}",
f"- 寫入前後主表核對：{'通過' if valid else '未驗證通過'}",
f"- 本輪匯入上限：{s.get('target_max_new','未知')} 筆",
f"- Staging 來源已無待續資料：{'是' if exhausted else '否／尚未確認'}",
f"- 最後來源 ID：{s.get('last_source_id','未提供')}",
f"- 前置查詢耗時：{s.get('preflight_latency_s','未提供')} 秒",
f"- 最後一次寫入耗時：{s.get('last_write_latency_s','未提供')} 秒",
f"- 最終健康檢查耗時：{s.get('final_health_latency_s','未執行')} 秒",
"- 批次策略：每次20筆、至少8秒間隔、超過6秒延遲立即停止",
"- 下一輪：成功後至少間隔2小時；任何異常應停止自動匯入",
"- 公開查詢：仍維持不開放",
"",
"資料完全性僅指目前 Staging 已取得資料；不等同於官方歷年交易資料已完全補齊。",
]
pathlib.Path("/tmp/moi-production-import-report.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
print("\n".join(lines))
