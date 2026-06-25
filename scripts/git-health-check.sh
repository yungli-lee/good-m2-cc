#!/usr/bin/env bash

echo "======================================"
echo " good.m2.cc Git Health Check"
echo "======================================"

echo
echo "===== CURRENT BRANCH ====="
git branch --show-current

echo
echo "===== GIT STATUS ====="
git status -sb

echo
echo "===== LAST 3 COMMITS ====="
git log --oneline -3

echo
echo "===== FILES IN LAST COMMIT ====="
git diff --name-only HEAD~1 HEAD

echo
echo "===== LAST COMMIT SUMMARY ====="
git show --stat --oneline HEAD

echo
echo "===== REMOTE STATUS ====="
git branch -vv

