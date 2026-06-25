# PesaBooks

The AI bookkeeper that lives in your WhatsApp. PesaBooks turns everyday M-Pesa
payments into legal KRA (eTIMS) invoices and proper books — automatically — for
Kenyan small businesses.

## Stack

- **Next.js 14 (App Router)** + TypeScript
- Plain CSS (M-Pesa-green design system in `app/globals.css`)
- Supabase (Postgres + RLS) and Edge Functions for the backend (separate setup)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 to see the landing page.

## Structure

```
app/
  layout.tsx            # root layout + metadata
  page.tsx              # landing page
  globals.css           # design system + hero styles
  _components/
    Hero.tsx            # landing hero (WhatsApp-first pitch)
```

## Backend

The database schema, RLS policies, RPC functions, and Edge Functions
(eTIMS worker, WhatsApp webhook, M-Pesa Daraja callback) are documented
separately and deploy to Supabase. See the deploy runbook.
