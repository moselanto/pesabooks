# PesaBooks — Supabase backend

Database schema, RLS, RPC functions, and Edge Functions for PesaBooks.

## Layout

```
supabase/
  migrations/          # ordered SQL migrations (0001 → 0006)
  functions/
    etims-worker/      # drains queued eTIMS submissions to KRA OSCU (cron)
    whatsapp-webhook/  # WhatsApp Cloud API: phone → tenant → intent → create_invoice
    mpesa-daraja/      # M-Pesa C2B + STK callbacks → transactions + billing
```

## Deploy (summary — see the full runbook)

```bash
# 1. Database
supabase link --project-ref <PROJECT_REF>
supabase db push                       # applies migrations 0001 → 0006

# 2. Secrets (see each function for the full list)
supabase secrets set OPENAI_API_KEY=... KRA_OSCU_BASE_URL=... WORKER_SECRET=... \
  WA_PHONE_NUMBER_ID=... WA_ACCESS_TOKEN=... WA_VERIFY_TOKEN=... WA_APP_SECRET=... \
  DARAJA_CONSUMER_KEY=... DARAJA_CONSUMER_SECRET=... DARAJA_PASSKEY=... DARAJA_SHORTCODE=...

# 3. Functions
supabase functions deploy etims-worker
supabase functions deploy whatsapp-webhook
supabase functions deploy mpesa-daraja

# 4. Cron — schedule etims-worker every minute (pg_cron + pg_net), see migration notes.
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge Functions automatically.

## Migration order

| Order | File | Adds |
|---|---|---|
| 1 | `0001_init.sql` | Enums, tables, indexes, helpers, RLS + policies |
| 2 | `0002_functions.sql` | `create_business_with_owner`, `create_invoice` |
| 3 | `0003_recon_functions.sql` | `confirm_transaction`, `confirm_all_suggested` |
| 4 | `0004_etims_worker.sql` | `etims_submissions.next_attempt_at`, `claim_etims_batch` |
| 5 | `0005_whatsapp.sql` | `wa_sessions`, `resolve_wa_business` |
| 6 | `0006_daraja.sql` | `mpesa_shortcodes`, `stk_requests`, `resolve_shortcode` |
