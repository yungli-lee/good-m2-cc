#!/usr/bin/env bash

set -e

echo "======================================"
echo " good.m2.cc Task Verification"
echo "======================================"

echo
echo "===== TYPESCRIPT ====="
npx tsc --noEmit

echo
echo "===== ESLINT ====="
npx eslint .

echo
echo "===== GIT HEALTH CHECK ====="
bash scripts/git-health-check.sh

