# NDOS Deployment Guide

This guide explains how to deploy NEOMARC Digital Operating System (NDOS) to Cloudflare Workers and Supabase independently of Lovable.

## Architecture
- **Browser** (React / Tailwind CSS / TanStack Start)
- **Cloudflare Workers** (Application Hosting / SSR / Server Functions)
- **Supabase** (PostgreSQL / Auth / Storage / pg_cron)
- **OpenAI API** (AI Receipt & Expense Analysis)

## Step 1: Install Prerequisites
Make sure you have installed:
- Git
- Node.js & npm (or Bun)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Wrangler (Cloudflare CLI)](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## Step 2: Clone the Repository
```bash
git clone <your-repository-url>
cd neomarc-nexus
```

## Step 3: Create a Supabase Project
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Note down your **Project URL**, **Anon Key** (Publishable), and **Service Role Key** (Secret).

## Step 4: Login to Supabase CLI
```bash
supabase login
```

## Step 5: Link the Project
Find your Project Ref in the project settings (it looks like `abcdefghijklmnopqr`)
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

## Step 6: Check Migrations
Verify what will be applied to your fresh database:
```bash
supabase db push --dry-run
```

## Step 7: Apply Migrations
```bash
supabase db push
```

## Step 8: Configure Supabase Auth
In the Supabase Dashboard under Authentication -> URL Configuration:
- Set your Site URL to your production domain (e.g., `https://app.neomarc.com` or your `.workers.dev` URL).
- Add any necessary redirect URLs.

## Step 9: Configure Google OAuth
If you use Google OAuth, configure the OAuth credentials in Google Cloud Console. Set the authorized redirect URI to `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback`. In Supabase, enable Google under Authentication Providers and add your Client ID and Client Secret.

## Step 10: Verify Storage Buckets
Ensure that your required buckets (e.g. for receipts and documents) are created and that RLS policies are applied correctly. The migrations should handle this.

## Step 11: Install Application Dependencies
```bash
bun install
# or
npm install
```

## Step 12: Login to Cloudflare
```bash
npx wrangler login
```

## Step 13: Verify Cloudflare Account
```bash
npx wrangler whoami
```

## Step 14: Set Cloudflare Variables & Secrets
Set up your environment variables for production. 
First, add your public variables to your `wrangler.jsonc` (or using `wrangler secret put` for everything):

```bash
npx wrangler secret put VITE_SUPABASE_URL
npx wrangler secret put VITE_SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put AUTOMATION_RUNNER_SECRET
npx wrangler secret put OPENAI_API_KEY
```

For local development, create a `.env.local` based on `.env.example`.

## Step 15: Build the Project
```bash
bun run build
# or
npm run build
```

## Step 16: Deploy to Cloudflare Workers
```bash
bun run deploy
# or
npm run deploy
```

## Step 17: Access Your App
Open the deployed URL (e.g., `https://neomarc-ndos.<your-account>.workers.dev`).

## Step 18: Connect a Custom Domain
In the Cloudflare Dashboard, go to your Worker -> Triggers -> Custom Domains. Add your custom domain (e.g., `app.neomarc.com`). Ensure DNS records are configured in Cloudflare.

## Step 19: Update Supabase Auth URLs
Update your Supabase Auth Site URL and redirect URIs to point to the new custom domain.

## Step 20: Run the NDOS UAT Workflow
Follow the production test checklist to ensure all major functions (Auth, CRM, Properties, Sales, Commissions, etc.) are working properly.

---

### Production Test Checklist
- **Authentication**: Register, Login, Logout, Google login, Role access.
- **CRM**: Create lead, Lead automation, Follow-up.
- **Property**: Estate, Property/plot, Reservation.
- **Sales**: Create sale, Payment plan, Payment, Receipt.
- **Commission**: Direct commission, Referral, Approval, Paid.
- **Documentation**: Upload, View, Version, Private access.
- **Expenses**: Create expense, AI extraction (via OpenAI), Approval.
- **Automation**: Scheduled job, Run, Retry, Nightly operation.
- **Security**: Role restrictions, RLS, unauthorized API block.
