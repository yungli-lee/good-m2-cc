# Staging baseline

Identity status: **CONFIRMED**

## Environment identity

| Field | Value |
|---|---|
| Staging project ref | `niorteztdbuyusemsgwa` |
| Production project ref | `rlbuadkmylulieoryzal` |
| Staging differs from Production | YES |

## Aggregate row counts

| Table | Row count |
|---|---:|
| `people` | 8 |
| `inquiries` | 6 |
| `properties` | 16 |

No row contents or personal data are included.

## Migration baseline

The staging ledger is synchronized through `202607020102`. Seven later local
migrations are not recorded:

1. `202607040101_people_scoped_access`
2. `202607060101_content_image_fit`
3. `202607060201_home_cms_v1`
4. `202607060202_home_cms_page_key_extensible`
5. `202607070101_email_diagnostics_audit_actions`
6. `202607170201_site_pages_eyebrow`
7. `202607190101_site_pages_multi_reminders`

## Functional-test gate

**STAGING_DATA_SAFETY_CONFIRMATION_REQUIRED**

The aggregate counts do not establish that the rows are test-only. Do not send
email until data ownership, recipient, sender/provider, and non-delivery to
Production customers are explicitly confirmed.
