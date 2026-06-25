# Developer Automation Scripts

This folder contains small helper scripts for good.m2.cc development verification.

## `git-health-check.sh`

Shows the current git health snapshot:

- Current branch.
- Short git status.
- Last 3 commits.
- Files changed in the last commit.
- Last commit summary.
- Remote tracking status.

Run it before reporting work status or before asking for commit approval:

```bash
bash scripts/git-health-check.sh
```

## `verify-task.sh`

Runs the standard task verification sequence:

1. TypeScript check.
2. ESLint check.
3. Git health check.

If TypeScript or ESLint fails, the script stops and returns a non-zero exit code.

Run it after finishing a task and before reporting completion:

```bash
bash scripts/verify-task.sh
```

## Notes

- These scripts do not modify project files.
- These scripts do not commit or push.
- No npm script is registered for these helpers; run them with `bash`.

