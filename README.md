# Photo Scout

## Cron Jobs

Configured in `vercel.json`:

| Job | Path | Schedule |
|-----|------|----------|
| Profile Sweep | `/api/cron/sweep-profiles` | Every 6 hours (0:00, 6:00, 12:00, 18:00 UTC) |
| Opportunity Scanner | `/api/cron/scan-opportunities` | Every hour on the hour |

### Environment Variables

- **`CRON_SECRET`** — Required. Set this in your Vercel project environment variables. Vercel sends this as an `Authorization: Bearer <CRON_SECRET>` header on cron requests. Your cron route handlers should verify this header to prevent unauthorized access.
