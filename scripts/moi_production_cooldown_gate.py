#!/usr/bin/env python3
"""Fail-closed gate: at least two hours after last successful real transfer."""
import datetime as dt
import json
import os
import urllib.request

repo = os.environ["GITHUB_REPOSITORY"]
token = os.environ["GH_TOKEN"]
current = int(os.environ["GITHUB_RUN_ID"])
url = f"https://api.github.com/repos/{repo}/actions/workflows/moi-production-paced-resume.yml/runs?status=completed&per_page=100"
headers = {"Accept": "application/vnd.github+json",
           "X-GitHub-Api-Version": "2022-11-28",
           "Authorization": "Bearer " + token}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
        return json.load(r)

runs = get(url)["workflow_runs"]
now = dt.datetime.now(dt.timezone.utc)
decision = None
for run in runs:
    if run["id"] == current:
        continue
    if run["conclusion"] in ("failure", "cancelled", "timed_out", "action_required"):
        raise SystemExit("STOP: Previous Production workflow failed; manual review required.")
    if run["conclusion"] != "success":
        continue
    jobs = get(run["jobs_url"])["jobs"]
    transferred = any(j["name"] == "paced-resume" and j["conclusion"] == "success" for j in jobs)
    if not transferred:
        continue
    finished = dt.datetime.fromisoformat(run["updated_at"].replace("Z", "+00:00"))
    delta = (now-finished).total_seconds()
    if delta < 7200:
        decision = ("false", f"Cooldown: last successful import ended {int(delta)} seconds ago, must wait 7200")
    else:
        decision = ("true", f"Last import completed {int(delta)} seconds ago, cooldown satisfied")
    break
if decision is None:
    raise SystemExit("STOP: No previously verified transfer run found.")
print(decision[1])
with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
    f.write("proceed=" + decision[0] + "\n")
