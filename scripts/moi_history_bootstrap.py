#!/usr/bin/env python3
"""Backfill official historic season ZIPs into staging RAW, resumable by file rows."""
import datetime, os, subprocess, sys
START_YEAR=int(os.getenv("MOI_HISTORY_START_YEAR","101"))
CURRENT_YEAR=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).year-1911
START_SEASON=int(os.getenv("MOI_HISTORY_START_SEASON","3"))
END_YEAR=int(os.getenv("MOI_HISTORY_END_YEAR",str(CURRENT_YEAR)))
END_SEASON=int(os.getenv("MOI_HISTORY_END_SEASON",str((datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).month-1)//3+1)))
if not (101<=START_YEAR<=END_YEAR<=CURRENT_YEAR and 1<=START_SEASON<=4 and 1<=END_SEASON<=4):
    raise SystemExit("Invalid historic season range")
for year in range(START_YEAR,END_YEAR+1):
    for quarter in range(1,5):
        if (year,quarter)<(START_YEAR,START_SEASON) or (year,quarter)>(END_YEAR,END_SEASON):
            continue
        season=f"{year}S{quarter}"
        url=f"https://plvr.land.moi.gov.tw/DownloadSeason?season={season}&type=zip&fileName=lvr_landcsv.zip"
        print(f"Backfilling {season}",flush=True)
        env=os.environ.copy()
        env["MOI_SOURCE_URL"]=url
        subprocess.run([sys.executable,"scripts/moi_auto_raw_import.py"],env=env,check=True)
print("All requested available seasons imported",flush=True)
