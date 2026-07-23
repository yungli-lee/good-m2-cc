# Staging audit_action — before

Verification status: **PRESENT_BEFORE_TEST**

| Enum label | Present before test | Sort order |
|---|---|---:|
| `inquiry_email_sent` | YES | 71 |
| `inquiry_email_failed` | YES | 72 |
| `email_test_sent` | YES | 73 |
| `email_test_failed` | YES | 74 |

The reconciliation therefore tested idempotency rather than filling a staging
schema gap.
